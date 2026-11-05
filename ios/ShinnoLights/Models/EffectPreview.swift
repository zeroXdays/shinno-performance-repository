import Foundation
import CoreGraphics

/// LED strip preview sampler — mirrors `src/lib/protocol/preview.ts` so Modes
/// glyphs match the web animations (palette + motion from the effect name).
enum EffectPreview {
    enum Motion {
        case auto, magic, fade, tail, water, curtain, run, flow
        case jump, strobe, flush, wave, race, gradual, marquee, energy, trans
    }

    private static let red = RGB(r: 255, g: 28, b: 28)
    private static let green = RGB(r: 36, g: 220, b: 72)
    private static let blue = RGB(r: 40, g: 90, b: 255)
    private static let yellow = RGB(r: 255, g: 220, b: 32)
    private static let cyan = RGB(r: 48, g: 214, b: 255)
    private static let purple = RGB(r: 168, g: 48, b: 255)
    private static let white = RGB(r: 255, g: 252, b: 245)
    private static let amber = RGB(r: 255, g: 150, b: 24)
    private static let black = RGB(r: 0, g: 0, b: 0)

    static let rainbow: [RGB] = [red, amber, yellow, green, cyan, blue, purple]

    // MARK: - Public

    static func motion(for effect: LedEffect) -> Motion {
        let name = effect.name
        if name.contains("Auto Play") { return .auto }
        if name.contains("Magic") || name.contains("Dreaming") || name.contains("Flutter")
            || name.contains("Follow Spot") || name.contains("Swab") { return .magic }
        if name.contains("Energy") { return .energy }
        if name.contains("Strobe") { return .strobe }
        if name.contains("Jump") || name.contains("Hop") { return .jump }
        if name.contains("Gradual") { return .gradual }
        if name.contains("Marquee") { return .marquee }
        if name.contains("Flush") { return .flush }
        if name.contains("Wave") { return .wave }
        if name.contains("Race") || name.contains("Horse Race") { return .race }
        if name.contains("Trailing") { return .tail }
        if name.contains("Streaming") { return .water }
        switch effect.group {
        case .trans: return .trans
        case .tail: return .tail
        case .water: return .water
        case .curtain: return .curtain
        case .flow: return .flow
        case .run, .runback: return .run
        case .basic: return .fade
        }
    }

    static func palette(for effect: LedEffect) -> [RGB] {
        let colors = paletteFromName(effect.name)
        return colors.isEmpty ? rainbow : colors
    }

    static func periodMs(speed: Int, motion: Motion) -> Double {
        let ui = Double(speed)
        let t = 1 - min(100, max(0, ui)) / 100
        switch motion {
        case .strobe: return 280 + t * 1100
        case .race: return 1100 + t * 2600
        case .flush: return 380 + t * 1400
        case .run, .tail, .marquee, .magic: return 420 + t * 1400
        case .jump, .water, .curtain, .wave, .energy: return 700 + t * 1800
        case .flow, .trans, .fade, .gradual: return 1400 + t * 3200
        case .auto: return 2200 + t * 4800
        }
    }

    /// Per-LED sample used by Mode glyphs (same contract as web `sampleLed`).
    static func sampleLed(
        effect: LedEffect,
        index: Int,
        count: Int,
        elapsedMs: Double,
        speed: Int
    ) -> RGB {
        let colors = palette(for: effect)
        let motion = motion(for: effect)
        let period = periodMs(speed: speed, motion: motion)
        var u = period <= 0 ? 0 : (elapsedMs / period).truncatingRemainder(dividingBy: 1)
        if u < 0 { u += 1 }
        let rev = reversed(name: effect.name, group: effect.group)
        if rev && motion != .magic && motion != .race {
            u = (1 - u).truncatingRemainder(dividingBy: 1)
            if u < 0 { u += 1 }
        }
        let s = count <= 1 ? 0.0 : Double(index) / Double(count - 1)
        let dist = min(abs(s - u), abs(s - u + 1), abs(s - u - 1))

        switch motion {
        case .strobe:
            let on = u < 0.42 || (u > 0.5 && u < 0.62)
            return on ? cycle(colors, s, smooth: false) : black
        case .jump:
            return cycle(colors, u + s * 0.02, smooth: false)
        case .race:
            return sampleRace(colors, s: s, elapsedMs: elapsedMs, period: period, reverse: rev)
        case .magic:
            return sampleMagic(colors, s: s, u: u, reverse: rev)
        case .tail, .marquee:
            let trail = max(0, 1 - dist / 0.28)
            return scale(cycle(colors, u, smooth: false), 0.06 + trail * trail * 0.94)
        case .run:
            if effect.name.contains("7-Color in") || effect.name.contains("7 COLOR ON") {
                let bg = colors[0]
                let pack = Array(colors.dropFirst())
                var nearest = 1.0
                var color = bg
                for (i, c) in pack.enumerated() {
                    let headU = (u + Double(i) / Double(max(pack.count, 1))).truncatingRemainder(dividingBy: 1)
                    let d = min(abs(s - headU), abs(s - headU + 1), abs(s - headU - 1))
                    if d < nearest {
                        nearest = d
                        color = c
                    }
                }
                return nearest < 0.07 ? color : bg
            }
            let head = dist < 0.07 ? 1.0 : max(0.08, 1 - dist / 0.18)
            if effect.name.contains("Dot") || effect.name.contains(" in ") || effect.name.contains(" ON ") {
                let bg = colors[0]
                let fg = colors.count > 1 ? colors[1] : white
                return dist < 0.08 ? fg : bg
            }
            return scale(cycle(colors, u, smooth: false), head)
        case .water, .wave:
            let ripple = 0.2 + 0.8 * (0.5 + 0.5 * sin((s + u) * .pi * 4))
            return scale(cycle(colors, s + u, smooth: true), ripple)
        case .curtain:
            let open = 1 - abs(u * 2 - 1)
            let fromCenter = abs(s - 0.5) * 2
            let lit = effect.name.contains("Close") ? fromCenter >= 1 - open : fromCenter <= open
            return scale(cycle(colors, u, smooth: true), lit ? 1 : 0.07)
        case .trans:
            return sampleTrans(colors, s: s, u: u, name: effect.name)
        case .flow, .fade, .gradual:
            return cycle(colors, (s + u).truncatingRemainder(dividingBy: 1), smooth: true)
        case .flush:
            let band = 0.34
            let trail: Double
            if effect.name.contains("Close") {
                let fromEnd = min(s, 1 - s) * 2
                trail = max(0, 1 - abs(fromEnd - u) / band)
            } else if effect.name.contains("Open") {
                let fromCenter = abs(s - 0.5) * 2
                trail = max(0, 1 - abs(fromCenter - u) / band)
            } else {
                trail = max(0, 1 - dist / band)
            }
            return scale(cycle(colors, u, smooth: true), 0.06 + pow(trail, 1.2) * 0.94)
        case .energy:
            let breath = pulse(u)
            let ridge = pow(max(0, 1 - dist / 0.5), 1.55)
            return scale(cycle(colors, u, smooth: true), min(1, 0.12 + breath * 0.55 + ridge * 0.33))
        case .auto:
            return scale(cycle(colors, s + u, smooth: true), 0.25 + 0.75 * (1 - dist / 0.5))
        }
    }

    /// Layout path for a Mode glyph — same shapes as web `pathFor`.
    static func pathPoints(motion: Motion, ledCount: Int, in size: CGSize) -> [CGPoint] {
        let w = size.width
        let h = size.height
        switch motion {
        case .water, .wave:
            return (0..<ledCount).map { i in
                let t = Double(i) / Double(max(1, ledCount - 1))
                return CGPoint(x: w * (0.1 + t * 0.8), y: h * (0.5 + sin(t * .pi * 3) * 0.18))
            }
        case .curtain:
            let half = ledCount / 2
            let left = (0..<half).map { i in
                CGPoint(x: w * 0.18, y: h * (0.14 + Double(i) / Double(max(1, half - 1)) * 0.72))
            }
            let right = (0..<half).map { i in
                CGPoint(x: w * 0.82, y: h * (0.14 + Double(i) / Double(max(1, half - 1)) * 0.72))
            }
            return left + right
        case .run, .tail, .marquee, .flow, .fade, .gradual, .flush, .trans:
            return (0..<ledCount).map { i in
                let t = Double(i) / Double(max(1, ledCount - 1))
                return CGPoint(x: w * (0.1 + t * 0.8), y: h * 0.5)
            }
        default:
            let inset = min(w, h) * 0.16
            let rw = w - inset * 2
            let rh = h - inset * 2
            let perim = 2 * (rw + rh)
            return (0..<ledCount).map { i in
                var d = Double(i) / Double(ledCount) * perim
                if d < rw { return CGPoint(x: inset + d, y: inset) }
                d -= rw
                if d < rh { return CGPoint(x: inset + rw, y: inset + d) }
                d -= rh
                if d < rw { return CGPoint(x: inset + rw - d, y: inset + rh) }
                d -= rw
                return CGPoint(x: inset, y: inset + rh - d)
            }
        }
    }

    // MARK: - Palette from name (Lotus + LEDDMX)

    private static func paletteFromName(_ name: String) -> [RGB] {
        // Lotus W-R-W / letter flow
        if let m = name.range(of: #"^([WRGBYCP])-([WRGBYCP])-([WRGBYCP])"#, options: .regularExpression) {
            let parts = String(name[m]).split(separator: "-").map(String.init)
            if parts.count == 3, let a = letter[parts[0]], let b = letter[parts[1]], let c = letter[parts[2]] {
                return [a, b, c]
            }
        }

        // DMX flow: "WH RD WH", "RD WH RD"
        if let tokens = dmxTriplet(name) { return tokens }

        // Lotus "6-Color to Red"
        if let m = name.range(of: #"6-Color to (\w+)"#, options: .regularExpression) {
            let word = String(name[m]).replacingOccurrences(of: "6-Color to ", with: "")
            if let target = wordColor[word] {
                return rainbow.filter { $0 != target } + [target]
            }
        }

        // DMX "Forward 6 Colors RD"
        if name.contains("6 Colors"), let target = firstDmxToken(in: name) {
            return rainbow.filter { $0 != target } + [target]
        }

        // Lotus "7-Color in Red"
        if let m = name.range(of: #"7-Color in (\w+)"#, options: .regularExpression) {
            let word = String(name[m]).replacingOccurrences(of: "7-Color in ", with: "")
            if let bg = wordColor[word] {
                return [bg] + rainbow.filter { $0 != bg }
            }
        }

        // DMX "7 COLOR ON RD"
        if name.uppercased().contains("7 COLOR ON"), let bg = firstDmxToken(in: name) {
            return [bg] + rainbow.filter { $0 != bg }
        }

        // Lotus "Red-Dot in Blue"
        if let m = name.range(of: #"^(\w+)-Dot in (\w+)"#, options: .regularExpression) {
            let bits = String(name[m]).replacingOccurrences(of: "-Dot in ", with: " ").split(separator: " ")
            if bits.count == 2, let fg = wordColor[String(bits[0])], let bg = wordColor[String(bits[1])] {
                return [bg, fg]
            }
        }

        // DMX "GN ON RD" / "WH ON VT"
        if name.uppercased().contains(" ON "),
           let pair = dmxOnPair(name) {
            return [pair.bg, pair.fg]
        }

        if name.contains("B-P-C-Y") { return [blue, purple, cyan, yellow] }
        if name.contains("B-G-C-Y") { return [blue, green, cyan, yellow] }
        if name.contains("R-G-B") || name.contains("RD/GN/BU") || name.contains("R G B") {
            return [red, green, blue]
        }
        if name.contains("Y-C-P") || name.contains("YE/CN/VT") || name.contains("Y C P") {
            return [yellow, cyan, purple]
        }
        if name.contains("R-G ") || name.contains("RD/GN") { return [red, green] }
        if name.contains("G-B ") || name.contains("GN/BU") { return [green, blue] }
        if name.contains("Y-B ") || name.contains("YE/BU") { return [yellow, blue] }
        if name.contains("Y-C ") || name.contains("YE/CN") { return [yellow, cyan] }
        if name.contains("C-P ") || name.contains("CN/VT") { return [cyan, purple] }
        if name.contains("R-Y ") || name.contains("RD/YE") { return [red, yellow] }
        if name.contains("R-P ") || name.contains("RD/VT") { return [red, purple] }
        if name.contains("G-C ") || name.contains("GN/CN") { return [green, cyan] }
        if name.contains("G-Y ") || name.contains("GN/YE") { return [green, yellow] }
        if name.contains("B-P ") || name.contains("BU/VT") { return [blue, purple] }
        if name.contains("BK/WH") { return [black, white] }
        if name.contains("7-Color") || name.contains("7 Colors") || name.contains("7 COLORS")
            || name.contains("Magic") || name.contains("Dreaming") || name.contains("Auto Play")
            || name.contains("Energy") || name.contains("Flutter") || name.contains("Follow Spot")
            || name.contains("Swab") {
            return rainbow
        }

        if let single = firstDmxToken(in: name) { return [single] }
        if let m = name.range(of: #"^(Red|Green|Blue|Yellow|Cyan|Purple|White)\b"#, options: .regularExpression) {
            let word = String(name[m])
            if let c = wordColor[word] { return [c] }
        }
        return rainbow
    }

    private static let letter: [String: RGB] = [
        "R": red, "G": green, "B": blue, "Y": yellow, "C": cyan, "P": purple, "W": white,
    ]

    private static let wordColor: [String: RGB] = [
        "Red": red, "Green": green, "Blue": blue, "Yellow": yellow,
        "Cyan": cyan, "Purple": purple, "White": white,
    ]

    private static let dmxToken: [String: RGB] = [
        "RD": red, "GN": green, "BU": blue, "YE": yellow,
        "CN": cyan, "VT": purple, "WH": white, "BK": black,
        "R": red, "G": green, "B": blue, "Y": yellow, "C": cyan, "P": purple, "W": white,
    ]

    private static func firstDmxToken(in name: String) -> RGB? {
        let upper = name.uppercased()
        let keys = dmxToken.keys.sorted { $0.count > $1.count }
        for key in keys {
            // Prefer tokens that appear as standalone colour codes.
            if upper.range(of: #"\b\#(key)\b"#, options: .regularExpression) != nil {
                return dmxToken[key]
            }
        }
        return nil
    }

    private static func dmxTriplet(_ name: String) -> [RGB]? {
        let upper = name.uppercased()
        guard let match = upper.range(
            of: #"\b(WH|RD|GN|BU|YE|CN|VT|BK)\s+(WH|RD|GN|BU|YE|CN|VT|BK)\s+(WH|RD|GN|BU|YE|CN|VT|BK)\b"#,
            options: .regularExpression
        ) else { return nil }
        let parts = String(upper[match]).split(separator: " ").map(String.init)
        guard parts.count == 3,
              let a = dmxToken[parts[0]],
              let b = dmxToken[parts[1]],
              let c = dmxToken[parts[2]] else { return nil }
        return [a, b, c]
    }

    private static func dmxOnPair(_ name: String) -> (fg: RGB, bg: RGB)? {
        let upper = name.uppercased()
        guard let match = upper.range(
            of: #"\b(WH|RD|GN|BU|YE|CN|VT|BK|[RGBYCP])\s+ON\s+(WH|RD|GN|BU|YE|CN|VT|BK|[RGBYCP])\b"#,
            options: .regularExpression
        ) else { return nil }
        let parts = String(upper[match]).replacingOccurrences(of: " ON ", with: " ").split(separator: " ").map(String.init)
        guard parts.count == 2, let fg = dmxToken[parts[0]], let bg = dmxToken[parts[1]] else { return nil }
        return (fg, bg)
    }

    // MARK: - Sampling helpers

    private static func reversed(name: String, group: EffectGroup) -> Bool {
        if name.contains("Flush") && (name.contains("Close") || name.contains("Open")) { return false }
        return group == .runback || name.contains("Back") || name.contains("Backward") || name.contains("Close")
    }

    private static func wrap(_ i: Int, _ n: Int) -> Int {
        guard n > 0 else { return 0 }
        let m = i % n
        return m < 0 ? m + n : m
    }

    private static func mix(_ a: RGB?, _ b: RGB?, _ t: Double) -> RGB {
        let left = a ?? black
        let right = b ?? left
        let u = min(1, max(0, t))
        return RGB(
            r: Int((Double(left.r) + (Double(right.r) - Double(left.r)) * u).rounded()),
            g: Int((Double(left.g) + (Double(right.g) - Double(left.g)) * u).rounded()),
            b: Int((Double(left.b) + (Double(right.b) - Double(left.b)) * u).rounded())
        )
    }

    private static func scale(_ rgb: RGB, _ amount: Double) -> RGB {
        let a = min(1, max(0, amount))
        return RGB(
            r: Int((Double(rgb.r) * a).rounded()),
            g: Int((Double(rgb.g) * a).rounded()),
            b: Int((Double(rgb.b) * a).rounded())
        )
    }

    private static func cycle(_ colors: [RGB], _ u: Double, smooth: Bool) -> RGB {
        guard !colors.isEmpty else { return black }
        if colors.count == 1 { return colors[0] }
        var wrapped = u.truncatingRemainder(dividingBy: 1)
        if wrapped < 0 { wrapped += 1 }
        let pos = wrapped * Double(colors.count)
        let i = wrap(Int(floor(pos)), colors.count)
        let next = colors[wrap(i + 1, colors.count)]
        if !smooth { return colors[i] }
        return mix(colors[i], next, pos - floor(pos))
    }

    private static func pulse(_ u: Double) -> Double {
        0.08 + 0.92 * (0.5 - 0.5 * cos(u * .pi * 2))
    }

    private static func sampleMagic(_ colors: [RGB], s: Double, u: Double, reverse: Bool) -> RGB {
        let along = reverse ? 1 - s : s
        return cycle(colors, along - u, smooth: false)
    }

    private static func sampleRace(
        _ colors: [RGB],
        s: Double,
        elapsedMs: Double,
        period: Double,
        reverse: Bool
    ) -> RGB {
        guard !colors.isEmpty else { return black }
        if colors.count == 1 { return colors[0] }
        let takeovers = period <= 0 ? 0 : elapsedMs / period
        let i = Int(floor(takeovers))
        let t = takeovers - floor(takeovers)
        let from = colors[wrap(i, colors.count)]
        let to = colors[wrap(i + 1, colors.count)]
        let pos = reverse ? 1 - s : s
        let edge = 0.05
        if pos < t - edge { return to }
        if pos > t + edge { return from }
        let blend = (pos - (t - edge)) / (edge * 2)
        return mix(to, from, blend)
    }

    private static func sampleTrans(_ colors: [RGB], s: Double, u: Double, name: String) -> RGB {
        let toTarget = name.contains("6-Color to") || name.contains("6 Colors")
        let target = colors.last ?? white
        let goal = 0.72
        var local = s
        var palette = colors
        if toTarget && colors.count > 1 {
            if s >= goal { return target }
            local = s / goal
            palette = Array(colors.dropLast())
        }
        if palette.isEmpty { return target }
        if palette.count == 1 { return palette[0] }

        let pos = u * Double(palette.count)
        let i = Int(floor(pos)) % palette.count
        let t = pos - floor(pos)
        let from = palette[i]
        let to = palette[(i + 1) % palette.count]
        let edge = 0.18
        let arrive = max(0, min(1, (t - local) / edge + 0.5))
        let mixed = mix(from, to, arrive)
        let front = max(0, 1 - abs(local - t) / 0.09)
        return scale(mixed, 0.38 + arrive * 0.52 + front * 0.28)
    }
}
