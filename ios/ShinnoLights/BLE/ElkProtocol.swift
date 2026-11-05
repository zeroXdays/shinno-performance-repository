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
    /// LEDDMX brightness nibble: percent × 32 / 100.
    case value32
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

    /// ELK-BLEDDM chip (FFF3) — power frames confirmed via ATT sniff.
    static let elkBleddm = ModelProfile(
        id: "ELK-BLEDDM",
        prefixes: ["ELK-BLEDDM"],
        writeUUID: fff3,
        turnOn: [0x7E, 0x04, 0x04, 0xF0, 0x00, 0x01, 0xFF, 0x00, 0xEF],
        turnOff: [0x7E, 0x04, 0x04, 0x00, 0x00, 0x00, 0xFF, 0x00, 0xEF],
        color: [.byte(0x7E), .byte(0x00), .byte(0x05), .byte(0x03), .red, .green, .blue, .byte(0x00), .byte(0xEF)],
        brightness: [.byte(0x7E), .byte(0x04), .byte(0x01), .value, .byte(0xFF), .byte(0x00), .byte(0xFF), .byte(0x00), .byte(0xEF)],
        effect: [.byte(0x7E), .byte(0x00), .byte(0x03), .value, .byte(0x03), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)],
        effectSpeed: [.byte(0x7E), .byte(0x00), .byte(0x02), .value, .byte(0x00), .byte(0x00), .byte(0x00), .byte(0x00), .byte(0xEF)]
    )

    /// G37 emblem kits advertising as LEDDMX-00-* / LEDDMX-03-* ("LED LAMP" app).
    /// Frames are `7B FF … BF` on FFE1. Q50 ELK/MELK profiles above are unchanged.
    static let ledDmx = ModelProfile(
        id: "LEDDMX-00",
        prefixes: ["LEDDMX-00", "LEDDMX-03", "LEDDMX-", "LEDDMX", "LED-DMX", "LED_DMX", "LED DMX"],
        writeUUID: ffe1,
        // LED+LAMP decompile: power uses 01/00 (not 03/02).
        turnOn: [0x7B, 0xFF, 0x04, 0x01, 0xFF, 0xFF, 0xFF, 0xFF, 0xBF],
        turnOff: [0x7B, 0xFF, 0x04, 0x00, 0xFF, 0xFF, 0xFF, 0xFF, 0xBF],
        color: [.byte(0x7B), .byte(0xFF), .byte(0x07), .red, .green, .blue, .byte(0x00), .byte(0xFF), .byte(0xBF)],
        brightness: [.byte(0x7B), .byte(0xFF), .byte(0x01), .value32, .value, .byte(0x00), .byte(0xFF), .byte(0xFF), .byte(0xBF)],
        effect: [.byte(0x7B), .byte(0xFF), .byte(0x03), .value, .byte(0xFF), .byte(0xFF), .byte(0xFF), .byte(0xFF), .byte(0xBF)],
        effectSpeed: [.byte(0x7B), .byte(0xFF), .byte(0x02), .value, .byte(0xFF), .byte(0x00), .byte(0xFF), .byte(0xFF), .byte(0xBF)]
    )

    /// Default LED+LAMP password used in the 2A handshake after connect.
    static let leddmxPassword: [UInt8] = [0xA1, 0x23, 0x45, 0x67]

    /// `2A 02 … AF` auth frame — required or LEDDMX ignores every later command.
    static func leddmxHandshake(date: Date = Date()) -> Data {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = .current
        let comps = calendar.dateComponents([.weekday, .hour, .minute], from: date)
        // Java Calendar: SUN=1…SAT=7 → weekIndex {7,1,2,3,4,5,6}
        let weekday = comps.weekday ?? 1
        let weekIndex = [7, 1, 2, 3, 4, 5, 6][weekday - 1]
        let hour = comps.hour ?? 0
        let minute = comps.minute ?? 0
        let tb = UInt8(((weekIndex & 0x07) << 5) | (hour & 0x1F))
        var bytes: [UInt8] = [0x2A, 0x02]
        bytes.append(contentsOf: leddmxPassword)
        bytes.append(tb)
        bytes.append(UInt8(clamping: minute))
        bytes.append(0xAF)
        return Data(bytes)
    }

    /// Password-status / notify-enable probe used by LED+LAMP after the handshake.
    static let leddmxStatusQuery = Data([0x2A, 0x05, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xAF])

    static func isLeddmxName(_ name: String?) -> Bool {
        let upper = normalizeName(name)
        return upper.contains("LEDDMX")
            || upper.contains("LED-DMX")
            || upper.contains("LED_DMX")
            || upper.contains("LED DMX")
    }

    static func isElkFamilyName(_ name: String?) -> Bool {
        let upper = normalizeName(name)
        if isLeddmxName(upper) { return false }
        return upper.hasPrefix("ELK-")
            || upper.hasPrefix("MELK")
            || upper.hasPrefix("LEDBLE")
            || upper.hasPrefix("JACKY")
            || upper.hasPrefix("XSL-")
            || (upper.hasPrefix("LED-") && !upper.contains("DMX"))
            || upper.contains("BLEDOM")
            || upper.contains("BLEDOB")
            || upper.contains("BLEDDM")
    }

    /// Q50 ↔ ELK/MELK kits · G37 ↔ LEDDMX emblem kits only.
    static func allowed(for car: CarKind, name: String?) -> Bool {
        switch car {
        case .g37:
            return isLeddmxName(name)
        case .q50, .q60, .q70:
            return isElkFamilyName(name)
        }
    }

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
        prefixes: ["MELK-OF21", "MELK-OA21", "MELK-OA10", "MELK-OC10", "MELK-OF10", "MELK-OG10", "MELK"],
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

    /// Longest-prefix first so LED-DMX / ELK-BLEDDM beat shorter LED- / ELK-BLE catch-alls.
    static let all = [ledDmx, elkBledom, elkBledob, elkBleddm, elkBle, melk, ledble]

    static func isDmxFamily(_ name: String?) -> Bool {
        isLeddmxName(name) || normalizeName(name).contains("BLEDDM")
    }

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
            if upper.contains("LEDDMX") || upper.contains("LED-DMX") || upper.contains("LED_DMX") || upper.contains("LED DMX") {
                return ledDmx
            }
            if upper.contains("BLEDDM") {
                return elkBleddm
            }
            if upper.contains("DMX") {
                return ledDmx
            }
            if upper.contains("BLEDOB") { return elkBledob }
            if upper.contains("BLEDOM") { return elkBledom }
            if upper.contains("MELK") { return melk }
            if upper.contains("LEDBLE") || upper.hasPrefix("LED-") { return ledble }
        }
        return best
    }

    /// Pick the dialect that matches both the advertised name and the writable GATT chars we found.
    static func resolve(name: String?, writable: [CBUUID]) -> ModelProfile {
        let detected = detect(name: name)
        if writable.isEmpty || writable.contains(detected.writeUUID) {
            return detected
        }
        if isDmxFamily(name) {
            // LEDDMX-00 always wants FFE1 + 7B frames; only fall back to BLEDDM if FFE1 is missing.
            if writable.contains(ffe1) { return ledDmx }
            if writable.contains(fff3) { return elkBleddm }
        }
        if writable.contains(fff3) {
            if detected.id == "LEDBLE" || detected.id.hasPrefix("LEDDMX") { return elkBleddm }
            return detected
        }
        if writable.contains(ffe1) { return detected.id == "ELK-BLEDDM" ? ledDmx : (detected.writeUUID == ffe1 ? detected : ledble) }
        return detected
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
            "LEDBLE", "LED-", "LED_", "LED DMX", "LEDDMX", "DMX",
            "JACKY", "SP110", "LEDNET", "XSL-",
        ]
        return loose.contains { upper.contains($0) }
    }

    /// Broader LED-kit heuristic for Scan (still rejects phones / audio / watches).
    static func looksLikeLedKit(_ name: String?) -> Bool {
        let upper = normalizeName(name)
        guard !upper.isEmpty else { return false }
        if looksLikeController(upper) { return true }
        let reject = ["IPHONE", "IPAD", "WATCH", "AIRPOD", "MACBOOK", "GALAXY", "PIXEL", "BEATS", "SOUNDBAR"]
        if reject.contains(where: { upper.contains($0) }) { return false }
        return upper.contains("LED") || upper.contains("DMX") || upper.contains("ELK") || upper.contains("MELK")
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
        // UI + kits: 1 = slow, 100 = fast (do not invert — Shinno/MELK/BLEDDM expect higher = faster).
        encode(model.effectSpeed, rgb: RGB(r: 0, g: 0, b: 0), value: UInt8(clamping: min(100, max(0, percent))))
    }

    private static func encode(_ slots: [FrameSlot], rgb: RGB, value: UInt8) -> Data {
        Data(slots.map { slot in
            switch slot {
            case .byte(let byte): return byte
            case .red: return UInt8(clamping: rgb.r)
            case .green: return UInt8(clamping: rgb.g)
            case .blue: return UInt8(clamping: rgb.b)
            case .value: return value
            case .value32:
                let pct = Int(value)
                return UInt8(clamping: (pct * 32) / 100)
            }
        })
    }
}
