import Combine
import CoreBluetooth
import Foundation
import SwiftUI

enum ZoneKind: String, CaseIterable, Identifiable, Codable {
    case emblem, mirrors, bumper, grille, custom
    var id: String { rawValue }
    var title: String {
        switch self {
        case .emblem: return "Front emblem"
        case .mirrors: return "Side mirrors"
        case .bumper: return "Bumper"
        case .grille: return "Grille badge"
        case .custom: return "Custom"
        }
    }

    /// Zones shown in pickers. Grille is parked until we have a badge kit to test.
    static var assignable: [ZoneKind] {
        // [.emblem, .mirrors, .bumper, .grille, .custom]
        [.emblem, .mirrors, .bumper, .custom]
    }
}

struct ScenePreset: Identifiable {
    let id: String
    let name: String
    let color: RGB
    let brightness: Int
    let power: Bool
    let effectId: Int?
}

struct PairedController: Identifiable, Equatable {
    let id: UUID
    var name: String
    var advertisedName: String
    var zone: ZoneKind
    var modelId: String
    var power: Bool
    var color: RGB
    var brightness: Int
    var effectId: Int?
    var effectSpeed: Int
    var connected: Bool
}

@MainActor
final class GarageStore: ObservableObject {
    @Published var controllers: [PairedController] = []
    @Published var target: UUID?
    @Published var lastError: String?

    let hub = BleHub()

    var selected: [PairedController] {
        if let target {
            return controllers.filter { $0.id == target }
        }
        return controllers
    }

    static let scenes: [ScenePreset] = [
        .init(id: "night", name: "Night drive", color: RGB(r: 220, g: 232, b: 255), brightness: 28, power: true, effectId: nil),
        .init(id: "red", name: "Infiniti red", color: RGB(r: 196, g: 18, b: 32), brightness: 86, power: true, effectId: nil),
        .init(id: "white", name: "OEM white", color: RGB(r: 255, g: 252, b: 245), brightness: 100, power: true, effectId: nil),
        .init(id: "show", name: "Show", color: RGB(r: 255, g: 32, b: 48), brightness: 100, power: true, effectId: 212),
        .init(id: "ice", name: "Ice", color: RGB(r: 40, g: 210, b: 255), brightness: 72, power: true, effectId: nil),
        .init(id: "stealth", name: "Stealth", color: RGB(r: 0, g: 0, b: 0), brightness: 0, power: false, effectId: nil),
    ]

    func pair(_ peripheral: CBPeripheral) async {
        let name = peripheral.name ?? "ELK controller"
        if controllers.contains(where: { $0.id == peripheral.identifier }) { return }
        let used = Set(controllers.map(\.zone))
        let zone = Self.guessZone(name, used: used)
        let model = ElkProtocol.detect(name: name)
        do {
            try await hub.connect(peripheral)
            controllers.append(
                PairedController(
                    id: peripheral.identifier,
                    name: zone.title,
                    advertisedName: name,
                    zone: zone,
                    modelId: model.id,
                    power: true,
                    color: RGB(r: 196, g: 18, b: 32),
                    brightness: 80,
                    effectId: nil,
                    effectSpeed: 50,
                    connected: true
                )
            )
        } catch {
            lastError = error.localizedDescription
        }
    }

    func setPower(_ on: Bool) {
        mutate { controller, peripheral, model in
            controller.power = on
            hub.write(peripheral, frames: [ElkProtocol.power(model, on: on)])
        }
    }

    func setColor(_ rgb: RGB) {
        mutate { controller, peripheral, model in
            controller.color = rgb
            controller.power = true
            controller.effectId = nil
            hub.write(peripheral, frames: [
                ElkProtocol.power(model, on: true),
                ElkProtocol.color(model, rgb: rgb),
                ElkProtocol.brightness(model, percent: controller.brightness),
            ])
        }
    }

    func setBrightness(_ percent: Int) {
        mutate { controller, peripheral, model in
            controller.brightness = percent
            hub.write(peripheral, frames: [
                ElkProtocol.brightness(model, percent: percent),
                ElkProtocol.color(model, rgb: controller.color),
            ])
        }
    }

    func setEffect(_ id: Int) {
        mutate { controller, peripheral, model in
            controller.effectId = id
            controller.power = true
            hub.write(peripheral, frames: [
                ElkProtocol.power(model, on: true),
                ElkProtocol.effect(model, id: id),
            ])
        }
    }

    func apply(_ scene: ScenePreset) {
        mutate { controller, peripheral, model in
            controller.power = scene.power
            controller.color = scene.color
            controller.brightness = scene.brightness
            controller.effectId = scene.effectId
            var frames = [ElkProtocol.power(model, on: scene.power)]
            if scene.power {
                frames.append(ElkProtocol.color(model, rgb: scene.color))
                frames.append(ElkProtocol.brightness(model, percent: scene.brightness))
                if let effect = scene.effectId {
                    frames.append(ElkProtocol.effect(model, id: effect))
                }
            }
            hub.write(peripheral, frames: frames)
        }
    }

    private func mutate(_ body: (inout PairedController, CBPeripheral, ModelProfile) -> Void) {
        for index in controllers.indices {
            let id = controllers[index].id
            if let target, target != id { continue }
            guard let peripheral = hub.peripheral(id: id) else { continue }
            let model = ElkProtocol.detect(name: controllers[index].advertisedName)
            body(&controllers[index], peripheral, model)
        }
    }

    static func guessZone(_ name: String, used: Set<ZoneKind>) -> ZoneKind {
        let upper = name.uppercased()
        if upper.contains("MR") { return .mirrors }
        if upper.contains("BP") { return .bumper }
        // Grille badge kits often advertise MELK / GB — park until we have a kit to test:
        // if upper.contains("GB") || upper.contains("MELK") { return used.contains(.grille) ? .custom : .grille }
        if upper.contains("EM") { return .emblem }
        return [.emblem, .mirrors, .bumper, /* .grille, */ .custom].first { !used.contains($0) } ?? .custom
    }
}

