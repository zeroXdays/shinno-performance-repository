import CoreBluetooth
import SwiftUI

struct RGB: Equatable, Codable, Hashable {
    var r: Int
    var g: Int
    var b: Int

    var color: Color {
        Color(red: Double(r) / 255, green: Double(g) / 255, blue: Double(b) / 255)
    }
}

enum FrameSlot: Equatable, Hashable {
    case byte(UInt8)
    case red
    case green
    case blue
    case value
}

struct ModelProfile: Equatable, Hashable {
    let id: String
    let prefixes: [String]
    let writeUUID: CBUUID
    let turnOn: [UInt8]
    let turnOff: [UInt8]
    let color: [FrameSlot]
    let brightness: [FrameSlot]
    let effect: [FrameSlot]
    let effectSpeed: [FrameSlot]
}

enum ElkProtocol {
    static let fff0 = CBUUID(string: "FFF0")
    static let fff3 = CBUUID(string: "FFF3")
    static let ffe0 = CBUUID(string: "FFE0")
    static let ffe1 = CBUUID(string: "FFE1")

    /// Q50 / common strip kits.
    static let elkBledom = ModelProfile(
        id: "ELK-BLEDOM",
        prefixes: ["ELK-BLEDOM"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x04, 0x04, 0xF0, 0x00, 0x01, 0xFF, 0x00, 0xEF],
        turnOff: [0x7E, 0x04, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x07), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x0A), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0x01), .byte(0xFF), .byte(0x02), .byte(0x01), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x07), .byte(0x03), .value, .byte(0x03), .byte(0xFF), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x07), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    static let elkBledob = ModelProfile(
        id: "ELK-BLEDOB",
        prefixes: ["ELK-BLEDOB", "ELK-BLEDOM0E"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x07, 0x04, 0xFF, 0x00, 0x01, 0x02, 0x01, 0xEF],
        turnOff: [0x7E, 0x07, 0x04, 0x00, 0x00, 0x00, 0x02, 0x01, 0xEF],
        color: [.byte(0x7E), .byte(0x07), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x0A), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0x01), .byte(0xFF), .byte(0x02), .byte(0x01), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x07), .byte(0x03), .value, .byte(0x03), .byte(0xFF), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x07), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    /// G37 emblem kits advertise as ELK-BLEDDM (often read as “LED DMX”).
    static let elkBleddm = ModelProfile(
        id: "ELK-BLEDDM",
        prefixes: ["ELK-BLEDDM", "LED-DMX", "LEDDMX", "LED DMX"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x04, 0x04, 0xF0, 0x00, 0x01, 0xFF, 0x00, 0xEF],
        turnOff: [0x7E, 0x04, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x00), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x00), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0xFF), .byte(0x00), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x00), .byte(0x03), .value, .byte(0x03), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x00), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    static let elkBle = ModelProfile(
        id: "ELK-BLE",
        prefixes: ["ELK-BLE", "ELK-BTC"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x00, 0x04, 0xF0, 0x00, 0x01, 0xFF, 0x00, 0xEF],
        turnOff: [0x7E, 0x00, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x00), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x00), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0xFF), .byte(0x00), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x00), .byte(0x03), .value, .byte(0x03), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x00), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    static let melk = ModelProfile(
        id: "MELK",
        prefixes: ["MELK-OA21", "MELK-OA10", "MELK-OC10", "MELK-OF10", "MELK-OG10", "MELK"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x04, 0x04, 0xF0, 0x00, 0x01, 0xFF, 0x00, 0xEF],
        turnOff: [0x7E, 0x04, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x00), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x00), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0x01), .byte(0xFF), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x05), .byte(0x03), .value, .byte(0x06), .byte(0xFF), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x04), .byte(0x02), .value, .byte(0xFF), .byte(0xFF), .byte(0xFF), .byte(0x00), .byte(0xEF)]
    )

    static let ledble = ModelProfile(
        id: "LEDBLE",
        prefixes: ["LEDBLE", "LED-", "JACKYLED"],
        writeUUID: ffe1,
        turnOn: [0x7E, 0x00, 0x04, 0x01, 0x00, 0x00, 0x00, 0x00, 0xEF],
        turnOff: [0x7E, 0x00, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x00), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x00), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0xFF), .byte(0x00), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x00), .byte(0x03), .value, .byte(0x03), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x00), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    /// Longest-prefix first so ELK-BLEDDM / ELK-BLEDOM beat the shorter ELK-BLE catch-all.
    static let all = [elkBledom, elkBledob, elkBleddm, elkBle, melk, ledble]

    static func detect(name: String?) -> ModelProfile {
        let upper = normalizeName(name)
        var best = elkBledom
        var bestLen = -1
        for model in all {
            for prefix in model.prefixes where upper.hasPrefix(prefix) && prefix.count > bestLen {
                best = model
                bestLen = prefix.count
            }
        }
        // Containment fallback for names that embed the chip id mid-string.
        if bestLen < 0 {
            if upper.contains("BLEDDM") || upper.contains("LED-DMX") || upper.contains("LEDDMX") || upper.contains("LED DMX") {
                return elkBleddm
            }
            if upper.contains("BLEDOB") { return elkBledob }
            if upper.contains("BLEDOM") { return elkBledom }
            if upper.contains("MELK") { return melk }
            if upper.contains("LEDBLE") || upper.hasPrefix("LED-") { return ledble }
        }
        return best
    }

    static func looksLikeController(_ name: String?) -> Bool {
        let upper = normalizeName(name)
        guard !upper.isEmpty else { return false }
        if all.contains(where: { model in
            model.prefixes.contains { upper.hasPrefix($0) }
        }) {
            return true
        }
        let loose = [
            "ELK-", "ELK~", "BLEDOM", "BLEDOB", "BLEDDM", "MELK",
            "LEDBLE", "LED-", "LED DMX", "LEDDMX", "JACKY", "SP110", "LEDNET", "XSL-",
        ]
        return loose.contains { upper.contains($0) }
    }

    /// True when the advertisement includes a known LED service (name can be empty until connect).
    static func advertisesLedService(_ advertisementData: [String: Any]) -> Bool {
        let services = advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID] ?? []
        let known: Set<CBUUID> = [fff0, ffe0, fff3, ffe1]
        if services.contains(where: { known.contains($0) }) { return true }
        let overflow = advertisementData[CBAdvertisementDataOverflowServiceUUIDsKey] as? [CBUUID] ?? []
        return overflow.contains(where: { known.contains($0) })
    }

    static func normalizeName(_ name: String?) -> String {
        (name ?? "").trimmingCharacters(in: .whitespacesAndNewlines).uppercased()
    }

    static func power(_ model: ModelProfile, on: Bool) -> Data {
        Data(on ? model.turnOn : model.turnOff)
    }

    static func color(_ model: ModelProfile, rgb: RGB) -> Data {
        encode(model.color, rgb: rgb, value: 0)
    }

    static func brightness(_ model: ModelProfile, percent: Int) -> Data {
        encode(model.brightness, rgb: RGB(r: 0, g: 0, b: 0), value: UInt8(clamping: min(100, max(0, percent))))
    }

    static func effect(_ model: ModelProfile, id: Int) -> Data {
        encode(model.effect, rgb: RGB(r: 0, g: 0, b: 0), value: UInt8(clamping: id))
    }

    static func speed(_ model: ModelProfile, percent: Int) -> Data {
        encode(model.effectSpeed, rgb: RGB(r: 0, g: 0, b: 0), value: UInt8(clamping: min(100, max(0, 100 - percent))))
    }

    private static func encode(_ slots: [FrameSlot], rgb: RGB, value: UInt8) -> Data {
        Data(slots.map { slot in
            switch slot {
            case .byte(let byte): return byte
            case .red: return UInt8(clamping: rgb.r)
            case .green: return UInt8(clamping: rgb.g)
            case .blue: return UInt8(clamping: rgb.b)
            case .value: return value
            }
        })
    }
}
