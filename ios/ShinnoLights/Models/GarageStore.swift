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

    /// Zones shown in pickers for a car. Grille is parked until we have a badge kit to test.
    static func assignable(for car: CarKind) -> [ZoneKind] {
        car.kitZones + [.custom]
    }

    /// Fallback when car is unknown — prefer assignable(for:).
    static var assignable: [ZoneKind] {
        assignable(for: .q50)
    }
}

enum CarKind: String, CaseIterable, Identifiable, Codable {
    case q50, g37, q60, q70
    var id: String { rawValue }
    var title: String {
        switch self {
        case .q50: return "Q50"
        case .g37: return "G37"
        case .q60: return "Q60"
        case .q70: return "Q70"
        }
    }
    var enabled: Bool { self == .q50 || self == .g37 }
    var pickerLabel: String { enabled ? title : "\(title) — soon" }

    /// Kit zones offered for this car. G37 is emblem-only until mirrors/bumper kits land.
    var kitZones: [ZoneKind] {
        switch self {
        case .g37:
            return [.emblem]
        case .q50, .q60, .q70:
            return [.emblem, .mirrors, .bumper]
        }
    }
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
    @Published var activePathId: String?
    @Published var activePathZones: [ZoneKind] = []
    @Published var pathSpeed: Int = 55

    let hub = BleHub()
    private var pathTimer: Timer?
    private var pathStepIndex = 0
    private var colorWriteWork: DispatchWorkItem?
    /// Kits saved per car so Q50 and G37 can both stay in the garage.
    private var garageByCar: [CarKind: [PairedController]] = [:]

    var selected: [PairedController] {
        switch target {
        case .all:
            return controllers
        case .zone(let zone):
            return controllers.filter { $0.zone == zone }
        }
    }

    func deviceCount(for car: CarKind) -> Int {
        if car == settings.car { return controllers.count }
        return garageByCar[car]?.count ?? 0
    }

    static let scenes: [ScenePreset] = [
        .init(id: "night", name: "Night", color: RGB(r: 220, g: 232, b: 255), brightness: 28, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "red", name: "Red", color: RGB(r: 196, g: 18, b: 32), brightness: 86, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "white", name: "White", color: RGB(r: 255, g: 252, b: 245), brightness: 100, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "violet", name: "Violet", color: RGB(r: 150, g: 40, b: 255), brightness: 78, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "ice", name: "Ice", color: RGB(r: 40, g: 210, b: 255), brightness: 72, power: true, effectId: nil, effectSpeed: nil),
        .init(id: "amber", name: "Amber", color: RGB(r: 255, g: 150, b: 30), brightness: 68, power: true, effectId: nil, effectSpeed: nil),
    ]

    private static let storageKey = "shinno-garage-v1"
    private static let garageByCarKey = "shinno-garage-by-car-v1"
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
        // Forward hub BLE publishes so Scan/Devices refresh even when adopt
        // does not change the controllers array.
        hub.objectWillChange
            .receive(on: DispatchQueue.main)
            .sink { [weak self] _ in
                self?.objectWillChange.send()
            }
            .store(in: &bag)
        hub.$discovered
            .receive(on: DispatchQueue.main)
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
            UserDefaults.standard.removeObject(forKey: Self.garageByCarKey)
            return
        }
        garageByCar[settings.car] = controllers
        let encoded = Dictionary(
            uniqueKeysWithValues: garageByCar.map { car, rows in
                (car.rawValue, rows.map(PersistedController.init))
            }
        )
        if let data = try? JSONEncoder().encode(encoded) {
            UserDefaults.standard.set(data, forKey: Self.garageByCarKey)
        }
        // Keep legacy key in sync for the active car (older builds / migrations).
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
        let name = hub.displayName(for: peripheral.identifier)
        guard ElkProtocol.allowed(for: settings.car, name: name) else {
            // Known kit for the other car — stay quiet and skip; Scan already hides it.
            return
        }
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
        let zone = Self.guessZone(name, used: used, preferred: settings.car.kitZones)
        do {
            try await hub.connect(peripheral)
            let model = ElkProtocol.resolve(
                name: name,
                writable: hub.writableUUIDs(for: peripheral.identifier)
            )
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
            let name = hub.displayName(for: peripheral.identifier)
            guard ElkProtocol.allowed(for: settings.car, name: name) else { continue }
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
        writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
            var frames = [ElkProtocol.power(model, on: controller.power)]
            if controller.power {
                if let effect = controller.effectId {
                    frames.append(ElkProtocol.effect(model, id: effect))
                    frames.append(ElkProtocol.speed(model, percent: controller.effectSpeed))
                } else {
                    // LEDDMX stays in Dreaming until pattern 0 (Off) is written.
                    if ElkProtocol.isLedDmx(model) {
                        frames.append(ElkProtocol.effect(model, id: ElkProtocol.ledDmxPatternOff))
                    }
                    frames.append(ElkProtocol.color(model, rgb: controller.color))
                    frames.append(ElkProtocol.brightness(model, percent: controller.brightness))
                }
            }
            return frames
        }
    }

    /// Resolve the kit dialect from the live GATT map and write. DMX emblems get
    /// both LED-DMX (FFE1) and BLEDDM (FFF3) payloads when both chars exist.
    private func writeFrames(
        to peripheral: CBPeripheral,
        advertisedName: String,
        build: (ModelProfile) -> [Data]
    ) {
        let writable = hub.writableUUIDs(for: peripheral.identifier)
        let model = ElkProtocol.resolve(name: advertisedName, writable: writable)
        hub.write(peripheral, frames: build(model), prefer: model.writeUUID)
        // LEDDMX-00 uses a different framing (7B…BF) than ELK — do not dual-write BLEDDM.
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
        guard car != settings.car else { return }
        // Park the outgoing car's kits, then load the other car's saved garage.
        garageByCar[settings.car] = controllers
        for controller in controllers {
            hub.disconnect(controller.id)
        }
        stopPath()
        settings.car = car
        controllers = garageByCar[car] ?? []
        if case .zone(let zone) = target, !car.kitZones.contains(zone), zone != .custom {
            target = .all
        }
        persist()
        if settings.autoConnect {
            restoreConnections()
        }
    }

    func setPower(_ on: Bool) {
        mutate { controller, peripheral, _ in
            controller.power = on
            writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                [ElkProtocol.power(model, on: on)]
            }
        }
    }

    enum ColorDelivery {
        /// Colour-wheel drag: UI + throttled colour-only BLE (no power/pattern spam).
        case live
        /// Swatch / finger-up: full solid-colour sequence once.
        case commit
    }

    func setColor(_ rgb: RGB, delivery: ColorDelivery = .commit) {
        stopPath()
        // Update UI / state immediately.
        for index in controllers.indices where matchesTarget(controllers[index]) {
            controllers[index].color = rgb
            controllers[index].power = true
            controllers[index].effectId = nil
        }
        colorWriteWork?.cancel()

        switch delivery {
        case .live:
            // UI only while dragging. LEDDMX locks up if we stream BLE on every tick;
            // swatches / finger-up use `.commit` (same path that already works).
            break
        case .commit:
            colorWriteWork?.cancel()
            colorWriteWork = nil
            mutate { controller, peripheral, _ in
                let brightness = controller.brightness
                let color = controller.color
                writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                    solidColorFrames(model: model, rgb: color, brightness: brightness)
                }
            }
        }
    }

    private func matchesTarget(_ controller: PairedController) -> Bool {
        switch target {
        case .all: return true
        case .zone(let zone): return controller.zone == zone
        }
    }

    func setBrightness(_ percent: Int) {
        mutate { controller, peripheral, _ in
            controller.brightness = percent
            let color = controller.color
            let effectId = controller.effectId
            writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                if effectId == nil {
                    return solidColorFrames(model: model, rgb: color, brightness: percent)
                }
                return [
                    ElkProtocol.brightness(model, percent: percent),
                ]
            }
        }
    }

    /// Solid colour for LEDDMX must leave music + built-in pattern modes first.
    private func solidColorFrames(model: ModelProfile, rgb: RGB, brightness: Int) -> [Data] {
        var frames: [Data] = [ElkProtocol.power(model, on: true)]
        if ElkProtocol.isLedDmx(model) {
            frames.append(ElkProtocol.ledDmxMicOff)
            frames.append(ElkProtocol.effect(model, id: ElkProtocol.ledDmxPatternOff))
        }
        frames.append(ElkProtocol.color(model, rgb: rgb))
        frames.append(ElkProtocol.brightness(model, percent: brightness))
        return frames
    }

    func setEffect(_ id: Int) {
        stopPath()
        colorWriteWork?.cancel()
        mutate { controller, peripheral, _ in
            controller.effectId = id
            controller.power = true
            let speed = controller.effectSpeed
            writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                var frames: [Data] = [ElkProtocol.power(model, on: true)]
                if ElkProtocol.isLedDmx(model) {
                    frames.append(ElkProtocol.ledDmxMicOff)
                }
                frames.append(ElkProtocol.effect(model, id: id))
                frames.append(ElkProtocol.speed(model, percent: speed))
                return frames
            }
        }
    }

    func startPath(_ id: String) {
        guard let path = ZonePaths.named(id, for: settings.car) else { return }
        guard !controllers.isEmpty else {
            lastError = "Add devices on Scan before running a zone path."
            return
        }
        let covered = Set(path.steps.flatMap { $0 })
        guard controllers.contains(where: { covered.contains($0.zone) }) else {
            let labels = settings.car.kitZones.map(\.title).joined(separator: ", ")
            lastError = "Assign \(labels) on Devices so this path has somewhere to go."
            return
        }
        stopPath()
        target = .all
        activePathId = path.id
        pathStepIndex = 0
        applyPathStep(path)
        scheduleNextPathStep()
    }

    private func scheduleNextPathStep() {
        pathTimer?.invalidate()
        let interval = ZonePaths.stepMs(speed: pathSpeed) / 1000
        pathTimer = Timer.scheduledTimer(withTimeInterval: interval, repeats: false) { [weak self] _ in
            Task { @MainActor in
                guard let self else { return }
                guard let live = ZonePaths.named(self.activePathId ?? "", for: self.settings.car) else { return }
                self.pathStepIndex = (self.pathStepIndex + 1) % live.steps.count
                self.applyPathStep(live)
                self.scheduleNextPathStep()
            }
        }
    }

    func stopPath() {
        pathTimer?.invalidate()
        pathTimer = nil
        activePathId = nil
        activePathZones = []
        pathStepIndex = 0
    }

    private func applyPathStep(_ path: ZonePath) {
        let hot = path.steps[pathStepIndex]
        activePathZones = hot
        let color = controllers.first(where: { hot.contains($0.zone) })?.color
            ?? controllers.first?.color
            ?? RGB(r: 196, g: 18, b: 32)
        for index in controllers.indices {
            let id = controllers[index].id
            guard let peripheral = hub.peripheral(id: id) else { continue }
            let lit = hot.contains(controllers[index].zone)
            controllers[index].effectId = nil
            controllers[index].color = color
            let brightness = controllers[index].brightness
            let name = controllers[index].advertisedName
            if lit {
                controllers[index].power = true
                writeFrames(to: peripheral, advertisedName: name) { model in
                    solidColorFrames(model: model, rgb: color, brightness: brightness)
                }
            } else if path.restOff {
                controllers[index].power = false
                writeFrames(to: peripheral, advertisedName: name) { model in
                    [ElkProtocol.power(model, on: false)]
                }
            } else {
                controllers[index].power = true
                writeFrames(to: peripheral, advertisedName: name) { model in
                    solidColorFrames(
                        model: model,
                        rgb: color,
                        brightness: ZonePaths.dimBrightness(brightness)
                    )
                }
            }
        }
    }

    func setEffectSpeed(_ percent: Int) {
        mutate { controller, peripheral, _ in
            controller.effectSpeed = percent
            writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                [ElkProtocol.speed(model, percent: percent)]
            }
        }
    }

    func apply(_ scene: ScenePreset) {
        mutate { controller, peripheral, _ in
            controller.power = scene.power
            controller.color = scene.color
            controller.brightness = scene.brightness
            controller.effectId = scene.effectId
            if let speed = scene.effectSpeed {
                controller.effectSpeed = speed
            }
            let brightness = controller.brightness
            let effectSpeed = controller.effectSpeed
            writeFrames(to: peripheral, advertisedName: controller.advertisedName) { model in
                if scene.power, let effect = scene.effectId {
                    return [
                        ElkProtocol.power(model, on: true),
                        ElkProtocol.effect(model, id: effect),
                        ElkProtocol.speed(model, percent: scene.effectSpeed ?? effectSpeed),
                    ]
                }
                if scene.power {
                    return solidColorFrames(model: model, rgb: scene.color, brightness: brightness)
                }
                return [ElkProtocol.power(model, on: false)]
            }
        }
    }

    private func mutate(_ body: (inout PairedController, CBPeripheral, ModelProfile) -> Void) {
        var wrote = false
        for index in controllers.indices {
            let id = controllers[index].id
            if case .zone(let zone) = target, controllers[index].zone != zone { continue }
            guard let peripheral = hub.peripheral(id: id) else { continue }
            let model = ElkProtocol.resolve(
                name: controllers[index].advertisedName,
                writable: hub.writableUUIDs(for: id)
            )
            body(&controllers[index], peripheral, model)
            wrote = true
        }
        if !wrote, !controllers.isEmpty {
            lastError = "No linked device for this zone. Open Scan, add the device, then try again."
        }
    }

    static func guessZone(_ name: String, used: Set<ZoneKind>, preferred: [ZoneKind] = [.emblem, .mirrors, .bumper]) -> ZoneKind {
        let upper = name.uppercased()
        let allowed = Set(preferred + [.custom])
        if upper.contains("MR"), allowed.contains(.mirrors) { return .mirrors }
        if upper.contains("BP"), allowed.contains(.bumper) { return .bumper }
        // Grille badge kits often advertise MELK / GB — park until we have a kit to test:
        // if upper.contains("GB") || upper.contains("MELK") { return used.contains(.grille) ? .custom : .grille }
        if upper.contains("EM"), allowed.contains(.emblem) { return .emblem }
        // G37 emblem kits advertise ELK-BLEDDM / LED-DMX — park on Emblem when that zone is offered.
        if (upper.contains("BLEDDM")
            || upper.contains("LED-DMX")
            || upper.contains("LED_DMX")
            || upper.contains("LEDDMX")
            || upper.contains("LED DMX")
            || upper.contains("DMX")),
           allowed.contains(.emblem), !used.contains(.emblem)
        {
            return .emblem
        }
        return (preferred + [/* .grille, */ .custom]).first { allowed.contains($0) && !used.contains($0) } ?? .custom
    }

    private func load() {
        guard settings.rememberDevices else { return }

        if let data = UserDefaults.standard.data(forKey: Self.garageByCarKey),
           let encoded = try? JSONDecoder().decode([String: [PersistedController]].self, from: data)
        {
            var loaded: [CarKind: [PairedController]] = [:]
            for (raw, rows) in encoded {
                guard let car = CarKind(rawValue: raw), car.enabled else { continue }
                loaded[car] = rows.map(\.controller)
            }
            garageByCar = loaded
            controllers = garageByCar[settings.car] ?? []
            return
        }

        // Legacy single-list garage → park under the active car.
        guard let data = UserDefaults.standard.data(forKey: Self.storageKey),
              let rows = try? JSONDecoder().decode([PersistedController].self, from: data)
        else { return }
        let list = rows.map(\.controller)
        garageByCar[settings.car] = list
        controllers = list
        persist()
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
