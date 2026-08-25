import Combine
import CoreBluetooth
import Foundation
import SwiftUI

enum ZoneKind: String, CaseIterable, Identifiable, Codable {
    case emblem, mirrors, bumper, grille, custom
    var id: String { rawValue }
    var title: String {
        switch self {
        case .emblem: return "Emblem"
        case .mirrors: return "Mirrors"
        case .bumper: return "Bumper"
        case .grille: return "Grille"
        case .custom: return "Other"
        }
    }

    /// Zones shown in pickers. Grille is parked until we have a badge kit to test.
    static var assignable: [ZoneKind] {
        // [.emblem, .mirrors, .bumper, .grille, .custom]
        [.emblem, .mirrors, .bumper, .custom]
    }
}

enum CarKind: String, CaseIterable, Identifiable, Codable {
    case q50, q60, q70
    var id: String { rawValue }
    var title: String {
        switch self {
        case .q50: return "Q50"
        case .q60: return "Q60"
        case .q70: return "Q70"
        }
    }
    var enabled: Bool { self == .q50 }
    var pickerLabel: String { enabled ? title : "\(title) — soon" }
}

enum ControlTarget: Equatable, Hashable {
    case all
    case zone(ZoneKind)

    var title: String {
        switch self {
        case .all: return "All lights"
        case .zone(let zone): return zone.title
        }
    }
}

struct AppSettings: Codable, Equatable {
    var autoAdd = true
    var autoConnect = true
    var rememberDevices = true
    var car: CarKind = .q50
}

struct ScenePreset: Identifiable {
    let id: String
    let name: String
    let color: RGB
    let brightness: Int
    let power: Bool
    let effectId: Int?
    let effectSpeed: Int?
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
    @Published var target: ControlTarget = .all
    @Published var lastError: String?
    @Published var settings = AppSettings()

    let hub = BleHub()

    var selected: [PairedController] {
        switch target {
        case .all:
            return controllers
        case .zone(let zone):
            return controllers.filter { $0.zone == zone }
        }
    }

    static let scenes: [ScenePreset] = [
        .init(id: "night", name: "Night", color: RGB(r: 220, g: 232, b: 255), brightness: 28, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "red", name: "Red", color: RGB(r: 196, g: 18, b: 32), brightness: 86, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "white", name: "White", color: RGB(r: 255, g: 252, b: 245), brightness: 100, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "show", name: "Show", color: RGB(r: 255, g: 32, b: 48), brightness: 100, power: true, effectId: 212, effectSpeed: 42),
        .init(id: "ice", name: "Ice", color: RGB(r: 40, g: 210, b: 255), brightness: 72, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "stealth", name: "Off", color: RGB(r: 0, g: 0, b: 0), brightness: 0, power: false, effectId: nil, effectSpeed: nil),
    ]

    private static let storageKey = "shinno-garage-v1"
    private static let settingsKey = "shinno-settings-v1"
    private var bag = Set<AnyCancellable>()

    init() {
        loadSettings()
        load()
        hub.onReady = { [weak self] in
            guard let self else { return }
            if self.settings.autoConnect {
                self.restoreConnections()
            }
        }
        hub.onConnected = { [weak self] id in
            guard let self, let index = self.controllers.firstIndex(where: { $0.id == id }) else { return }
            self.controllers[index].connected = true
            self.pushLastLook(id)
        }
        hub.onDisconnected = { [weak self] id in
            guard let self, let index = self.controllers.firstIndex(where: { $0.id == id }) else { return }
            self.controllers[index].connected = false
        }
        hub.$discovered
            .sink { [weak self] list in
                guard let self else { return }
                Task { await self.adopt(list) }
            }
            .store(in: &bag)
        $controllers
            .dropFirst()
            .sink { [weak self] _ in
                self?.persist()
            }
            .store(in: &bag)
        $settings
            .dropFirst()
            .sink { [weak self] _ in
                self?.persistSettings()
            }
            .store(in: &bag)
        if hub.bluetoothReady, settings.autoConnect {
            restoreConnections()
        }
    }

    func persist() {
        guard settings.rememberDevices else {
            UserDefaults.standard.removeObject(forKey: Self.storageKey)
            return
        }
        let rows = controllers.map(PersistedController.init)
        if let data = try? JSONEncoder().encode(rows) {
            UserDefaults.standard.set(data, forKey: Self.storageKey)
        }
    }

    func persistSettings() {
        if let data = try? JSONEncoder().encode(settings) {
            UserDefaults.standard.set(data, forKey: Self.settingsKey)
        }
        persist()
    }

    func pair(_ peripheral: CBPeripheral) async {
        let name = peripheral.name ?? "Shinno device"
        if controllers.contains(where: { $0.id == peripheral.identifier }) {
            do {
                try await hub.connect(peripheral)
                lastError = nil
            } catch {
                lastError = error.localizedDescription
            }
            return
        }
        let used = Set(controllers.map(\.zone))
        let zone = Self.guessZone(name, used: used)
        let model = ElkProtocol.detect(name: name)
        do {
            try await hub.connect(peripheral)
            lastError = nil
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

    func adopt(_ peripherals: [CBPeripheral]) async {
        guard settings.autoAdd else { return }
        for peripheral in peripherals {
            await pair(peripheral)
        }
    }

    func restoreConnections() {
        hub.restore(controllers.map(\.id))
    }

    func pushLastLook(_ id: UUID) {
        guard let index = controllers.firstIndex(where: { $0.id == id }),
              let peripheral = hub.peripheral(id: id)
        else { return }
        let controller = controllers[index]
        let model = ElkProtocol.detect(name: controller.advertisedName)
        var frames = [ElkProtocol.power(model, on: controller.power)]
        if controller.power {
            frames.append(ElkProtocol.color(model, rgb: controller.color))
            frames.append(ElkProtocol.brightness(model, percent: controller.brightness))
            if let effect = controller.effectId {
                frames.append(ElkProtocol.effect(model, id: effect))
                frames.append(ElkProtocol.speed(model, percent: controller.effectSpeed))
            }
        }
        hub.write(peripheral, frames: frames)
    }

    func connect(_ id: UUID) async {
        guard let peripheral = hub.peripheral(id: id) ?? hub.discovered.first(where: { $0.identifier == id }) else {
            lastError = "That device is not nearby. Power it and wait for Scan to find it."
            return
        }
        do {
            try await hub.connect(peripheral)
            lastError = nil
        } catch {
            lastError = error.localizedDescription
        }
    }

    func disconnect(_ id: UUID) {
        hub.disconnect(id)
        if let index = controllers.firstIndex(where: { $0.id == id }) {
            controllers[index].connected = false
        }
    }

    func forget(_ id: UUID) {
        hub.forget(id)
        controllers.removeAll { $0.id == id }
        persist()
    }

    func forgetAll() {
        for controller in controllers {
            hub.forget(controller.id)
        }
        controllers.removeAll()
        persist()
    }

    func rename(_ id: UUID, _ name: String) {
        guard let index = controllers.firstIndex(where: { $0.id == id }) else { return }
        controllers[index].name = name
    }

    func setZone(_ id: UUID, _ zone: ZoneKind) {
        guard let index = controllers.firstIndex(where: { $0.id == id }) else { return }
        controllers[index].zone = zone
        if controllers[index].name == ZoneKind.emblem.title
            || controllers[index].name == ZoneKind.mirrors.title
            || controllers[index].name == ZoneKind.bumper.title
            || controllers[index].name == ZoneKind.custom.title
            || controllers[index].name == ZoneKind.grille.title
        {
            controllers[index].name = zone.title
        }
    }

    func setCar(_ car: CarKind) {
        guard car.enabled else { return }
        settings.car = car
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
                ElkProtocol.speed(model, percent: controller.effectSpeed),
            ])
        }
    }

    func setEffectSpeed(_ percent: Int) {
        mutate { controller, peripheral, model in
            controller.effectSpeed = percent
            hub.write(peripheral, frames: [ElkProtocol.speed(model, percent: percent)])
        }
    }

    func apply(_ scene: ScenePreset) {
        mutate { controller, peripheral, model in
            controller.power = scene.power
            controller.color = scene.color
            controller.brightness = scene.brightness
            controller.effectId = scene.effectId
            if let speed = scene.effectSpeed {
                controller.effectSpeed = speed
            }
            var frames = [ElkProtocol.power(model, on: scene.power)]
            if scene.power {
                frames.append(ElkProtocol.color(model, rgb: scene.color))
                frames.append(ElkProtocol.brightness(model, percent: scene.brightness))
                if let effect = scene.effectId {
                    frames.append(ElkProtocol.effect(model, id: effect))
                    frames.append(ElkProtocol.speed(model, percent: scene.effectSpeed ?? controller.effectSpeed))
                }
            }
            hub.write(peripheral, frames: frames)
        }
    }

    private func mutate(_ body: (inout PairedController, CBPeripheral, ModelProfile) -> Void) {
        var wrote = false
        for index in controllers.indices {
            let id = controllers[index].id
            if case .zone(let zone) = target, controllers[index].zone != zone { continue }
            guard let peripheral = hub.peripheral(id: id) else { continue }
            let model = ElkProtocol.detect(name: controllers[index].advertisedName)
            body(&controllers[index], peripheral, model)
            wrote = true
        }
        if !wrote, !controllers.isEmpty {
            lastError = "No linked device for this zone. Open Scan, add the device, then try again."
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

    private func load() {
        guard settings.rememberDevices else { return }
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let rows = try? JSONDecoder().decode([PersistedController].self, from: data)
        else { return }
        controllers = rows.map(\.controller)
    }

    private func loadSettings() {
        guard let data = UserDefaults.standard.data(forKey: Self.settingsKey),
              let decoded = try? JSONDecoder().decode(AppSettings.self, from: data)
        else { return }
        settings = decoded
        if !settings.car.enabled {
            settings.car = .q50
        }
    }
}

private struct PersistedController: Codable {
    var id: UUID
    var name: String
    var advertisedName: String
    var zone: ZoneKind
    var modelId: String
    var power: Bool
    var color: RGB
    var brightness: Int
    var effectId: Int?
    var effectSpeed: Int

    init(_ controller: PairedController) {
        id = controller.id
        name = controller.name
        advertisedName = controller.advertisedName
        zone = controller.zone
        modelId = controller.modelId
        power = controller.power
        color = controller.color
        brightness = controller.brightness
        effectId = controller.effectId
        effectSpeed = controller.effectSpeed
    }

    var controller: PairedController {
        PairedController(
            id: id,
            name: name,
            advertisedName: advertisedName,
            zone: zone == .grille ? .custom : zone,
            modelId: modelId,
            power: power,
            color: color,
            brightness: brightness,
            effectId: effectId,
            effectSpeed: effectSpeed,
            connected: false
        )
    }
}
