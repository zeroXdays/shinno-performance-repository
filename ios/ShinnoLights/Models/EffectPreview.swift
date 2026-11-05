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
        // Prefer exact tables so Modes tiles never fall through to rainbow by accident.
        if let named = fixedPaletteByName[effect.name], !named.isEmpty { return named }
        if let byId = fixedPaletteById[effect.id], !byId.isEmpty { return byId }
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
            // Chunky hard bands along the wave — R-G-B stays R/G/B, never a rainbow smear.
            let ripple = 0.4 + 0.6 * (0.5 + 0.5 * sin((s + u) * .pi * 4))
            let band = colors.count <= 1
                ? colors[0]
                : colors[wrap(Int(floor((s * 0.85 + u) * Double(colors.count))), colors.count)]
            return scale(band, ripple)
        case .curtain:
            let open = 1 - abs(u * 2 - 1)
            let fromCenter = abs(s - 0.5) * 2
            let lit = effect.name.contains("Close") ? fromCenter >= 1 - open : fromCenter <= open
            return scale(cycle(colors, u, smooth: allowSmooth(colors)), lit ? 1 : 0.07)
        case .trans:
            return sampleTrans(colors, s: s, u: u, name: effect.name)
        case .flow, .fade, .gradual:
            return cycle(colors, (s + u).truncatingRemainder(dividingBy: 1), smooth: allowSmooth(colors) && motion != .flow)
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
            return scale(cycle(colors, u, smooth: allowSmooth(colors)), 0.06 + pow(trail, 1.2) * 0.94)
        case .energy:
            let breath = pulse(u)
            let ridge = pow(max(0, 1 - dist / 0.5), 1.55)
            return scale(cycle(colors, u, smooth: allowSmooth(colors)), min(1, 0.12 + breath * 0.55 + ridge * 0.33))
        case .auto:
            return scale(cycle(colors, s + u, smooth: allowSmooth(colors)), 0.25 + 0.75 * (1 - dist / 0.5))
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

    /// Exact colour stops keyed by Lotus effect id (web ModeGlyph parity).
    private static let fixedPaletteById: [Int: [RGB]] = [
        0: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // Auto Play
        1: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // Magic Forward
        2: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // Magic Back
        3: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Trans
        4: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Trans Back
        5: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Trans
        6: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Trans Back
        7: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Trans
        8: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Trans Back
        9: [RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 28, b: 28)], // 6-Color to Red
        10: [RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 28, b: 28)], // 6-Color to Red Back
        11: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 36, g: 220, b: 72)], // 6-Color to Green
        12: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 36, g: 220, b: 72)], // 6-Color to Green Back
        13: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 40, g: 90, b: 255)], // 6-Color to Blue
        14: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 40, g: 90, b: 255)], // 6-Color to Blue Back
        15: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 48, g: 214, b: 255)], // 6-Color to Cyan
        16: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 48, g: 214, b: 255)], // 6-Color to Cyan Back
        17: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 220, b: 32)], // 6-Color to Yellow
        18: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 220, b: 32)], // 6-Color to Yellow Back
        19: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 6-Color to Purple
        20: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 6-Color to Purple Back
        21: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // 6-Color to White
        22: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // 6-Color to White Back
        23: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Tail
        24: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Tail Back
        25: [RGB(r: 255, g: 28, b: 28)], // Red Tail
        26: [RGB(r: 255, g: 28, b: 28)], // Red Tail Back
        27: [RGB(r: 36, g: 220, b: 72)], // Green Tail
        28: [RGB(r: 36, g: 220, b: 72)], // Green Tail Back
        29: [RGB(r: 40, g: 90, b: 255)], // Blue Tail
        30: [RGB(r: 40, g: 90, b: 255)], // Blue Tail Back
        31: [RGB(r: 255, g: 220, b: 32)], // Yellow Tail
        32: [RGB(r: 255, g: 220, b: 32)], // Yellow Tail Back
        33: [RGB(r: 48, g: 214, b: 255)], // Cyan Tail
        34: [RGB(r: 48, g: 214, b: 255)], // Cyan Tail Back
        35: [RGB(r: 168, g: 48, b: 255)], // Purple Tail
        36: [RGB(r: 168, g: 48, b: 255)], // Purple Tail Back
        37: [RGB(r: 255, g: 252, b: 245)], // White Tail
        38: [RGB(r: 255, g: 252, b: 245)], // White Tail Back
        39: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Water
        40: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Water Back
        41: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Water
        42: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Water Back
        43: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Water
        44: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Water Back
        45: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // R-G Water
        46: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // R-G Water Back
        47: [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // G-B Water
        48: [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // G-B Water Back
        49: [RGB(r: 255, g: 220, b: 32), RGB(r: 40, g: 90, b: 255)], // Y-B Water
        50: [RGB(r: 255, g: 220, b: 32), RGB(r: 40, g: 90, b: 255)], // Y-B Water Back
        51: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Y-C Water
        52: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Y-C Water Back
        53: [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // C-P Water
        54: [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // C-P Water Back
        55: [RGB(r: 255, g: 252, b: 245)], // White Water
        56: [RGB(r: 255, g: 252, b: 245)], // White Water Back
        57: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Close
        58: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Open
        59: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Close
        60: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Open
        61: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Close
        62: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Open
        63: [RGB(r: 255, g: 28, b: 28)], // Red Close
        64: [RGB(r: 255, g: 28, b: 28)], // Red Open
        65: [RGB(r: 36, g: 220, b: 72)], // Green Close
        66: [RGB(r: 36, g: 220, b: 72)], // Green Open
        67: [RGB(r: 40, g: 90, b: 255)], // Blue Close
        68: [RGB(r: 40, g: 90, b: 255)], // Blue Open
        69: [RGB(r: 255, g: 220, b: 32)], // Yellow Close
        70: [RGB(r: 255, g: 220, b: 32)], // Yellow Open
        71: [RGB(r: 48, g: 214, b: 255)], // Cyan Close
        72: [RGB(r: 48, g: 214, b: 255)], // Cyan Open
        73: [RGB(r: 168, g: 48, b: 255)], // Purple Close
        74: [RGB(r: 168, g: 48, b: 255)], // Purple Open
        75: [RGB(r: 255, g: 252, b: 245)], // White Close
        76: [RGB(r: 255, g: 252, b: 245)], // White Open
        77: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Race
        78: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Race Back
        79: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Race
        80: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Race Back
        81: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Race
        82: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Race Back
        83: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Wave
        84: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Wave Back
        85: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Wave
        86: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Wave Back
        87: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Wave
        88: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Wave Back
        89: [RGB(r: 255, g: 28, b: 28)], // Red Running
        90: [RGB(r: 255, g: 28, b: 28)], // Red Run Back
        91: [RGB(r: 36, g: 220, b: 72)], // Green Running
        92: [RGB(r: 36, g: 220, b: 72)], // Green Run Back
        93: [RGB(r: 40, g: 90, b: 255)], // Blue Running
        94: [RGB(r: 40, g: 90, b: 255)], // Blue Run Back
        95: [RGB(r: 255, g: 220, b: 32)], // Yellow Running
        96: [RGB(r: 255, g: 220, b: 32)], // Yellow Run Back
        97: [RGB(r: 48, g: 214, b: 255)], // Cyan Running
        98: [RGB(r: 48, g: 214, b: 255)], // Cyan Run Back
        99: [RGB(r: 168, g: 48, b: 255)], // Purple Running
        100: [RGB(r: 168, g: 48, b: 255)], // Purple Run Back
        101: [RGB(r: 255, g: 252, b: 245)], // White Running
        102: [RGB(r: 255, g: 252, b: 245)], // White Run Back
        103: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Running
        104: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Run Back
        105: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Running
        106: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Run Back
        107: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Running
        108: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Run Back
        109: [RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 220, b: 32)], // B-P-C-Y Running
        110: [RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 220, b: 32)], // B-P-C-Y Run Back
        111: [RGB(r: 40, g: 90, b: 255), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 220, b: 32)], // B-G-C-Y Running
        112: [RGB(r: 40, g: 90, b: 255), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 220, b: 32)], // B-G-C-Y Run Back
        113: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28)], // Red-Dot in White Running
        114: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28)], // Red-Dot in White Run Back
        115: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Red Running
        116: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Red Run Back
        117: [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // Blue-Dot in Green Running
        118: [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // Blue-Dot in Green Run Back
        119: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in Blue Running
        120: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in Blue Run Back
        121: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Cyan-Dot in Yellow Running
        122: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Cyan-Dot in Yellow Run Back
        123: [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Purple-Dot in Cyan Running
        124: [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Purple-Dot in Cyan Run Back
        125: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // White-Dot in Purple Running
        126: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // White-Dot in Purple Run Back
        127: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245)], // White-Dot in Red Running
        128: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245)], // White-Dot in Red Run Back
        129: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Red Running
        130: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Red Run Back
        131: [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Green Running
        132: [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Green Run Back
        133: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Blue Running
        134: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Blue Run Back
        135: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Yellow Running
        136: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Yellow Run Back
        137: [RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Cyan Running
        138: [RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in Cyan Run Back
        139: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255)], // 7-Color in Purple Running
        140: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255)], // 7-Color in Purple Run Back
        141: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in White Running
        142: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color in White Run Back
        143: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245)], // W-R-W Flow
        144: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245)], // W-R-W Flow Back
        145: [RGB(r: 255, g: 252, b: 245), RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245)], // W-G-W Flow
        146: [RGB(r: 255, g: 252, b: 245), RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245)], // W-G-W Flow Back
        147: [RGB(r: 255, g: 252, b: 245), RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 252, b: 245)], // W-B-W Flow
        148: [RGB(r: 255, g: 252, b: 245), RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 252, b: 245)], // W-B-W Flow Back
        149: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245)], // W-Y-W Flow
        150: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245)], // W-Y-W Flow Back
        151: [RGB(r: 255, g: 252, b: 245), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 252, b: 245)], // W-C-W Flow
        152: [RGB(r: 255, g: 252, b: 245), RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 252, b: 245)], // W-C-W Flow Back
        153: [RGB(r: 255, g: 252, b: 245), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // W-P-W Flow
        154: [RGB(r: 255, g: 252, b: 245), RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245)], // W-P-W Flow Back
        155: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28)], // R-W-R Flow
        156: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 28, b: 28)], // R-W-R Flow Back
        157: [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245), RGB(r: 36, g: 220, b: 72)], // G-W-G Flow
        158: [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245), RGB(r: 36, g: 220, b: 72)], // G-W-G Flow Back
        159: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 40, g: 90, b: 255)], // B-W-B Flow
        160: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 40, g: 90, b: 255)], // B-W-B Flow Back
        161: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 220, b: 32)], // Y-W-Y Flow
        162: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 220, b: 32)], // Y-W-Y Flow Back
        163: [RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 48, g: 214, b: 255)], // C-W-C Flow
        164: [RGB(r: 48, g: 214, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 48, g: 214, b: 255)], // C-W-C Flow Back
        165: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 168, g: 48, b: 255)], // P-W-P Flow
        166: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 252, b: 245), RGB(r: 168, g: 48, b: 255)], // P-W-P Flow Back
        167: [RGB(r: 40, g: 90, b: 255), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Blue Running
        168: [RGB(r: 40, g: 90, b: 255), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Blue Run Back
        169: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Red Running
        170: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)], // Green-Dot in Red Run Back
        171: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 28, b: 28)], // Red-Dot in Blue Running
        172: [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 28, b: 28)], // Red-Dot in Blue Run Back
        173: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Cyan-Dot in Yellow Running
        174: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)], // Cyan-Dot in Yellow Run Back
        175: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in Purple Running
        176: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in Purple Run Back
        177: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245)], // White-Dot in Yellow Running
        178: [RGB(r: 168, g: 48, b: 255), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in Purple Run Back
        179: [RGB(r: 255, g: 252, b: 245), RGB(r: 255, g: 220, b: 32)], // Yellow-Dot in White Running
        180: [RGB(r: 255, g: 220, b: 32), RGB(r: 255, g: 252, b: 245)], // White-Dot in Yellow Run Back
        181: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Flush
        182: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Flush Back
        183: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Flush
        184: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Flush Back
        185: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Flush
        186: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Flush Back
        187: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Flush Close
        188: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Flush Open
        189: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Flush Close
        190: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Flush Open
        191: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Flush Close
        192: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Flush Open
        193: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Jump
        194: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Jump
        195: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Jump
        196: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Strobe
        197: [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)], // R-G-B Strobe
        198: [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)], // Y-C-P Strobe
        199: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Gradual
        200: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 220, b: 32)], // R-Y Gradual
        201: [RGB(r: 255, g: 28, b: 28), RGB(r: 168, g: 48, b: 255)], // R-P Gradual
        202: [RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255)], // G-C Gradual
        203: [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 220, b: 32)], // G-Y Gradual
        204: [RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // B-P Gradual
        205: [RGB(r: 255, g: 28, b: 28)], // Red Marquee
        206: [RGB(r: 36, g: 220, b: 72)], // Green Marquee
        207: [RGB(r: 40, g: 90, b: 255)], // Blue Marquee
        208: [RGB(r: 255, g: 220, b: 32)], // Yellow Marquee
        209: [RGB(r: 48, g: 214, b: 255)], // Cyan Marquee
        210: [RGB(r: 168, g: 48, b: 255)], // Purple Marquee
        211: [RGB(r: 255, g: 252, b: 245)], // White Marquee
        212: [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)], // 7-Color Energy
    ]

    /// LEDDMX / G37 names (same ids, different labels).
    private static let fixedPaletteByName: [String: [RGB]] = [
        "Auto Play": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Dreaming": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Dreaming": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward 6 Colors RD": [RGB(r: 255, g: 28, b: 28)],
        "Backward 6 Colors RD": [RGB(r: 255, g: 28, b: 28)],
        "Forward 6 Colors GN": [RGB(r: 36, g: 220, b: 72)],
        "Backward 6 Colors GN": [RGB(r: 36, g: 220, b: 72)],
        "Forward 6 Colors BU": [RGB(r: 40, g: 90, b: 255)],
        "Backward 6 Colors BU": [RGB(r: 40, g: 90, b: 255)],
        "Forward 6 Colors CN": [RGB(r: 48, g: 214, b: 255)],
        "Backward 6 Colors CN": [RGB(r: 48, g: 214, b: 255)],
        "Forward 6 Colors YE": [RGB(r: 255, g: 220, b: 32)],
        "Backward 6 Colors YE": [RGB(r: 255, g: 220, b: 32)],
        "Forward 6 Colors VT": [RGB(r: 168, g: 48, b: 255)],
        "Backward 6 Colors VT": [RGB(r: 168, g: 48, b: 255)],
        "Forward 6 Colors WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward 6 Colors WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Trailing 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Trailing 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Trailing RD": [RGB(r: 255, g: 28, b: 28)],
        "Backward Trailing RD": [RGB(r: 255, g: 28, b: 28)],
        "Forward Trailing GN": [RGB(r: 36, g: 220, b: 72)],
        "Backward Trailing GN": [RGB(r: 36, g: 220, b: 72)],
        "Forward Trailing BU": [RGB(r: 40, g: 90, b: 255)],
        "Backward Trailing BU": [RGB(r: 40, g: 90, b: 255)],
        "Forward Trailing YE": [RGB(r: 255, g: 220, b: 32)],
        "Backward Trailing YE": [RGB(r: 255, g: 220, b: 32)],
        "Forward Trailing CN": [RGB(r: 48, g: 214, b: 255)],
        "Backward Trailing CN": [RGB(r: 48, g: 214, b: 255)],
        "Forward Trailing VT": [RGB(r: 168, g: 48, b: 255)],
        "Backward Trailing VT": [RGB(r: 168, g: 48, b: 255)],
        "Forward Trailing WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Trailing WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Streaming 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Streaming 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Streaming RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward Streaming RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward Streaming YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Streaming YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Streaming RD/GN": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)],
        "Backward Streaming RD/GN": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72)],
        "Forward Streaming GN/BU": [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward Streaming GN/BU": [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward Streaming YE/BU": [RGB(r: 255, g: 220, b: 32), RGB(r: 40, g: 90, b: 255)],
        "Backward Streaming YE/BU": [RGB(r: 255, g: 220, b: 32), RGB(r: 40, g: 90, b: 255)],
        "Forward Streaming YE/CN": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)],
        "Backward Streaming YE/CN": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255)],
        "Forward Streaming CN/VT": [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Streaming CN/VT": [RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Streaming BK/WH": [RGB(r: 0, g: 0, b: 0), RGB(r: 255, g: 252, b: 245)],
        "Backward Streaming BK/WH": [RGB(r: 0, g: 0, b: 0), RGB(r: 255, g: 252, b: 245)],
        "Open Curtain 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Open Curtain RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Close Curtain RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Open Curtain YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Follow Spot 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Follow Spot 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Follow Spot RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward Follow Spot RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward Follow Spot YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Follow Spot YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Flutter 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Flutter 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Flutter RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward Flutter RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward Flutter YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Flutter YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Hop 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Hop RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Hop YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Strobe 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Strobe RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Strobe YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Gradual 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Gradual RD/YE": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 220, b: 32)],
        "Gradual RD/VT": [RGB(r: 255, g: 28, b: 28), RGB(r: 168, g: 48, b: 255)],
        "Gradual GN/CN": [RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255)],
        "Gradual GN/YE": [RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 220, b: 32)],
        "Gradual BU/VT": [RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain RD": [RGB(r: 255, g: 28, b: 28)],
        "Close Curtain GN": [RGB(r: 36, g: 220, b: 72)],
        "Close Curtain BU": [RGB(r: 40, g: 90, b: 255)],
        "Close Curtain YE": [RGB(r: 255, g: 220, b: 32)],
        "Close Curtain CN": [RGB(r: 48, g: 214, b: 255)],
        "Close Curtain VT": [RGB(r: 168, g: 48, b: 255)],
        "Close Curtain WH": [RGB(r: 255, g: 252, b: 245)],
        "Open Curtain RD": [RGB(r: 255, g: 28, b: 28)],
        "Open Curtain GN": [RGB(r: 36, g: 220, b: 72)],
        "Open Curtain BU": [RGB(r: 40, g: 90, b: 255)],
        "Open Curtain YE": [RGB(r: 255, g: 220, b: 32)],
        "Open Curtain CN": [RGB(r: 48, g: 214, b: 255)],
        "Open Curtain VT": [RGB(r: 168, g: 48, b: 255)],
        "Open Curtain WH": [RGB(r: 255, g: 252, b: 245)],
        "Horse Race RD": [RGB(r: 255, g: 28, b: 28)],
        "Horse Race GN": [RGB(r: 36, g: 220, b: 72)],
        "Horse Race BU": [RGB(r: 40, g: 90, b: 255)],
        "Horse Race YE": [RGB(r: 255, g: 220, b: 32)],
        "Horse Race CN": [RGB(r: 48, g: 214, b: 255)],
        "Horse Race VT": [RGB(r: 168, g: 48, b: 255)],
        "Horse Race WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Run RD": [RGB(r: 255, g: 28, b: 28)],
        "Backward Run RD": [RGB(r: 255, g: 28, b: 28)],
        "Forward Run GN": [RGB(r: 36, g: 220, b: 72)],
        "Backward Run GN": [RGB(r: 36, g: 220, b: 72)],
        "Forward Run BU": [RGB(r: 40, g: 90, b: 255)],
        "Backward Run BU": [RGB(r: 40, g: 90, b: 255)],
        "Forward Run YE": [RGB(r: 255, g: 220, b: 32)],
        "Backward Run YE": [RGB(r: 255, g: 220, b: 32)],
        "Forward Run CN": [RGB(r: 48, g: 214, b: 255)],
        "Backward Run CN": [RGB(r: 48, g: 214, b: 255)],
        "Forward Run VT": [RGB(r: 168, g: 48, b: 255)],
        "Backward Run VT": [RGB(r: 168, g: 48, b: 255)],
        "Forward Run WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Run WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Run 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Run 7 Colors": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Run RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Backward Run RD/GN/BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255)],
        "Forward Run YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Run YE/CN/VT": [RGB(r: 255, g: 220, b: 32), RGB(r: 48, g: 214, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Run BU/YE/VT": [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 220, b: 32), RGB(r: 168, g: 48, b: 255)],
        "Forward Run GN/BU/YE": [RGB(r: 36, g: 220, b: 72), RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 220, b: 32)],
        "Backward Run BU/YE/VT": [RGB(r: 40, g: 90, b: 255), RGB(r: 255, g: 220, b: 32), RGB(r: 168, g: 48, b: 255)],
        "Forward Run RD/GN/WH": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245)],
        "Backward Run RD/GN/WH": [RGB(r: 255, g: 28, b: 28), RGB(r: 36, g: 220, b: 72), RGB(r: 255, g: 252, b: 245)],
        "Forward Run GN ON RD": [RGB(r: 36, g: 220, b: 72)],
        "Backward Run GN ON RD": [RGB(r: 36, g: 220, b: 72)],
        "Forward Run BU ON GN": [RGB(r: 40, g: 90, b: 255)],
        "Backward Run BU ON GN": [RGB(r: 40, g: 90, b: 255)],
        "Forward Run YE ON BU": [RGB(r: 255, g: 220, b: 32)],
        "Backward Run YE ON BU": [RGB(r: 255, g: 220, b: 32)],
        "Forward Run CN ON YE": [RGB(r: 48, g: 214, b: 255)],
        "Backward Run CN ON YE": [RGB(r: 48, g: 214, b: 255)],
        "Forward Run VT ON CN": [RGB(r: 168, g: 48, b: 255)],
        "Backward Run VT ON CN": [RGB(r: 168, g: 48, b: 255)],
        "Forward Run WH ON VT": [RGB(r: 255, g: 252, b: 245)],
        "Backward Run WH ON VT": [RGB(r: 255, g: 252, b: 245)],
        "Forward Run WH ON RD": [RGB(r: 255, g: 252, b: 245)],
        "Backward Run WH ON RD": [RGB(r: 255, g: 252, b: 245)],
        "Forward Run 7 COLOR ON RD": [RGB(r: 255, g: 28, b: 28)],
        "Backward Run 7 COLOR ON RD": [RGB(r: 255, g: 28, b: 28)],
        "Forward Run 7 COLOR ON GN": [RGB(r: 36, g: 220, b: 72)],
        "Backward Run 7 COLOR ON GN": [RGB(r: 36, g: 220, b: 72)],
        "Forward Run 7 COLOR ON BU": [RGB(r: 40, g: 90, b: 255)],
        "Backward Run 7 COLOR ON BU": [RGB(r: 40, g: 90, b: 255)],
        "Forward Run 7 COLOR ON YE": [RGB(r: 255, g: 220, b: 32)],
        "Backward Run 7 COLOR ON YE": [RGB(r: 255, g: 220, b: 32)],
        "Forward Run 7 COLOR ON CN": [RGB(r: 48, g: 214, b: 255)],
        "Backward Run 7 COLOR ON CN": [RGB(r: 48, g: 214, b: 255)],
        "Forward Run 7 COLOR ON VT": [RGB(r: 168, g: 48, b: 255)],
        "Backward Run 7 COLOR ON VT": [RGB(r: 168, g: 48, b: 255)],
        "Forward Run 7 COLOR ON WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Run 7 COLOR ON WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH RD WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH RD WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH GN WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH GN WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH BU WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH BU WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH YE WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH YE WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH CN WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH CN WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow WH VT WH": [RGB(r: 255, g: 252, b: 245)],
        "Backward Flow WH VT WH": [RGB(r: 255, g: 252, b: 245)],
        "Forward Flow RD WH RD": [RGB(r: 255, g: 28, b: 28)],
        "Backward Flow RD WH RD": [RGB(r: 255, g: 28, b: 28)],
        "Forward Flow GN WH GN": [RGB(r: 36, g: 220, b: 72)],
        "Backward Flow GN WH GN": [RGB(r: 36, g: 220, b: 72)],
        "Forward Flow BU WH BU": [RGB(r: 40, g: 90, b: 255)],
        "Backward Flow BU WH BU": [RGB(r: 40, g: 90, b: 255)],
        "Forward Flow YE WH YE": [RGB(r: 255, g: 220, b: 32)],
        "Backward Flow YE WH YE": [RGB(r: 255, g: 220, b: 32)],
        "Forward Flow CN WH CN": [RGB(r: 48, g: 214, b: 255)],
        "Backward Flow CN WH CN": [RGB(r: 48, g: 214, b: 255)],
        "Forward Flow VT WH VT": [RGB(r: 168, g: 48, b: 255)],
        "Backward Flow VT WH VT": [RGB(r: 168, g: 48, b: 255)],
        "Forward Run GN ON BU": [RGB(r: 36, g: 220, b: 72)],
        "Backward Run GN ON BU": [RGB(r: 36, g: 220, b: 72)],
        "Forward Run RD ON BU": [RGB(r: 255, g: 28, b: 28)],
        "Backward Run RD ON BU": [RGB(r: 255, g: 28, b: 28)],
        "Forward Run YE ON VT": [RGB(r: 255, g: 220, b: 32)],
        "Backward Run YE ON VT": [RGB(r: 255, g: 220, b: 32)],
        "Forward Run WH ON YE": [RGB(r: 255, g: 252, b: 245)],
        "Backward Run WH ON YE": [RGB(r: 255, g: 252, b: 245)],
        "Forward Run YE ON WH": [RGB(r: 255, g: 220, b: 32)],
        "Backward Run YE ON WH": [RGB(r: 255, g: 220, b: 32)],
        "Forward Swab 7 COLORS": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Swab 7 COLORS": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Swab RD GN BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Swab RD GN BU": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Forward Swab YE CN VT": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Backward Swab YE CN VT": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Open Curtain Swab 7 COLORS": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain Swab 7 COLORS": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Open Curtain Swab R G B": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain Swab R G B": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Open Curtain Swab Y C P": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
        "Close Curtain Swab Y C P": [RGB(r: 255, g: 28, b: 28), RGB(r: 255, g: 150, b: 24), RGB(r: 255, g: 220, b: 32), RGB(r: 36, g: 220, b: 72), RGB(r: 48, g: 214, b: 255), RGB(r: 40, g: 90, b: 255), RGB(r: 168, g: 48, b: 255)],
    ]

    // MARK: - Palette from name (Lotus + LEDDMX)

    private static func paletteFromName(_ name: String) -> [RGB] {
        // Exact leading letter-codes first — bulletproof for Lotus names like
        // "R-G-B Water", "Y-B Water", "W-R-W Flow Back".
        if let codes = leadingLetterCodePalette(name) { return codes }

        if let codes = letterCodes(in: name) { return codes }
        if let codes = spacedLetterCodes(in: name) { return codes }
        if let codes = dmxSlashCodes(in: name) { return codes }
        if let tokens = dmxSpaceCodes(in: name) { return tokens }

        if let m = name.range(of: #"6-Color to (Red|Green|Blue|Yellow|Cyan|Purple|White)"#, options: [.regularExpression, .caseInsensitive]) {
            let word = String(name[m]).components(separatedBy: " ").last ?? ""
            if let target = wordColor[word.capitalized] {
                return rainbow.filter { $0 != target } + [target]
            }
        }
        if name.contains("6 Colors"), let target = firstDmxColorToken(in: name) {
            return rainbow.filter { $0 != target } + [target]
        }

        if let m = name.range(of: #"7-Color in (Red|Green|Blue|Yellow|Cyan|Purple|White)"#, options: [.regularExpression, .caseInsensitive]) {
            let word = String(name[m]).components(separatedBy: " ").last ?? ""
            if let bg = wordColor[word.capitalized] {
                return [bg] + rainbow.filter { $0 != bg }
            }
        }
        if name.uppercased().contains("7 COLOR ON"), let bg = firstDmxColorToken(in: name) {
            return [bg] + rainbow.filter { $0 != bg }
        }

        if let m = name.range(
            of: #"(Red|Green|Blue|Yellow|Cyan|Purple|White)-Dot in (Red|Green|Blue|Yellow|Cyan|Purple|White)"#,
            options: [.regularExpression, .caseInsensitive]
        ) {
            let bits = String(name[m]).replacingOccurrences(of: "-Dot in ", with: " ", options: .caseInsensitive)
                .split(separator: " ")
                .map { String($0).capitalized }
            if bits.count == 2, let fg = wordColor[bits[0]], let bg = wordColor[bits[1]] {
                return [bg, fg]
            }
        }
        if let pair = dmxOnPair(name) {
            return [pair.bg, pair.fg]
        }

        if name.contains("BK/WH") { return [black, white] }

        if name.contains("7-Color") || name.contains("7 Colors") || name.contains("7 COLORS")
            || name.contains("Magic") || name.contains("Dreaming") || name.contains("Auto Play")
            || name.contains("Energy") || name.contains("Flutter") || name.contains("Follow Spot")
            || name.contains("Swab") {
            return rainbow
        }

        if let m = name.range(
            of: #"\b(Red|Green|Blue|Yellow|Cyan|Purple|White)\b"#,
            options: [.regularExpression, .caseInsensitive]
        ) {
            let word = String(name[m]).capitalized
            if let c = wordColor[word] { return [c] }
        }
        if let single = firstDmxColorToken(in: name) { return [single] }
        return rainbow
    }

    /// Longest leading `R-G-B` / `Y-B` / `W-R-W` token → exact stops.
    private static func leadingLetterCodePalette(_ name: String) -> [RGB]? {
        let tokens: [(String, [RGB])] = [
            ("B-P-C-Y", [blue, purple, cyan, yellow]),
            ("B-G-C-Y", [blue, green, cyan, yellow]),
            ("R-G-B", [red, green, blue]),
            ("Y-C-P", [yellow, cyan, purple]),
            ("W-R-W", [white, red, white]),
            ("W-G-W", [white, green, white]),
            ("W-B-W", [white, blue, white]),
            ("W-Y-W", [white, yellow, white]),
            ("W-C-W", [white, cyan, white]),
            ("W-P-W", [white, purple, white]),
            ("R-W-R", [red, white, red]),
            ("G-W-G", [green, white, green]),
            ("B-W-B", [blue, white, blue]),
            ("Y-W-Y", [yellow, white, yellow]),
            ("C-W-C", [cyan, white, cyan]),
            ("P-W-P", [purple, white, purple]),
            ("R-G", [red, green]),
            ("G-B", [green, blue]),
            ("Y-B", [yellow, blue]),
            ("Y-C", [yellow, cyan]),
            ("C-P", [cyan, purple]),
            ("R-Y", [red, yellow]),
            ("R-P", [red, purple]),
            ("G-C", [green, cyan]),
            ("G-Y", [green, yellow]),
            ("B-P", [blue, purple]),
        ].sorted { $0.0.count > $1.0.count }

        for (token, colors) in tokens {
            if name == token { return colors }
            if name.hasPrefix(token + " ") { return colors }
        }
        return nil
    }

    /// Smooth RGB-lerp only for true rainbow (7+) — otherwise R→G invents yellow.
    private static func allowSmooth(_ colors: [RGB]) -> Bool {
        colors.count >= 7
    }

    /// "Y-B", "R-G-B", "W-R-W" — character scan (no regex word-boundary pitfalls).
    private static func letterCodes(in name: String) -> [RGB]? {
        let allowed = Set("WRGBYCP")
        let chars = Array(name)
        var best: [RGB]?
        var i = 0
        while i < chars.count {
            let ch = chars[i]
            guard allowed.contains(ch), let first = letterRGB[String(ch)] else {
                i += 1
                continue
            }
            if i > 0 {
                let prev = chars[i - 1]
                if prev == "-" || allowed.contains(prev) || prev.isLetter || prev.isNumber {
                    i += 1
                    continue
                }
            }
            var colors = [first]
            var j = i + 1
            while j + 1 < chars.count, chars[j] == "-", allowed.contains(chars[j + 1]),
                  let next = letterRGB[String(chars[j + 1])] {
                colors.append(next)
                j += 2
            }
            if colors.count >= 2 {
                let ended = j >= chars.count || chars[j] == " " || (!allowed.contains(chars[j]) && chars[j] != "-")
                if ended, best == nil || colors.count > (best?.count ?? 0) {
                    best = colors
                }
            }
            i += 1
        }
        return best
    }

    private static func spacedLetterCodes(in name: String) -> [RGB]? {
        let tokens = name.split(whereSeparator: \.isWhitespace).map(String.init)
        guard tokens.count >= 2 else { return nil }
        // Leading run of single-letter colour codes: "R G B Trans"
        var colors: [RGB] = []
        for token in tokens {
            guard token.count == 1, let c = letterRGB[token] else { break }
            colors.append(c)
        }
        return colors.count >= 2 ? colors : nil
    }

    private static func dmxSlashCodes(in name: String) -> [RGB]? {
        let upper = name.uppercased()
        let keys = ["WH", "RD", "GN", "BU", "YE", "CN", "VT", "BK"]
        let tokens = upper.split(whereSeparator: { $0 == " " || $0 == "/" }).map(String.init)
        // Find a slash-run inside the original uppercased string.
        for key in keys {
            guard let start = upper.range(of: key + "/") else { continue }
            var colors: [RGB] = []
            var idx = start.lowerBound
            while idx < upper.endIndex {
                let rest = upper[idx...]
                guard let hit = keys.first(where: { rest.hasPrefix($0) }), let rgb = dmxRGB[hit] else { break }
                colors.append(rgb)
                idx = upper.index(idx, offsetBy: hit.count)
                if idx < upper.endIndex, upper[idx] == "/" {
                    idx = upper.index(after: idx)
                    continue
                }
                break
            }
            if colors.count >= 2 { return colors }
        }
        _ = tokens
        return nil
    }

    private static func dmxSpaceCodes(in name: String) -> [RGB]? {
        let upper = name.uppercased()
        let keys: Set<String> = ["WH", "RD", "GN", "BU", "YE", "CN", "VT", "BK"]
        let tokens = upper.split(whereSeparator: \.isWhitespace).map(String.init)
        var best: [RGB]?
        var i = 0
        while i < tokens.count {
            guard keys.contains(tokens[i]), let first = dmxRGB[tokens[i]] else {
                i += 1
                continue
            }
            var colors = [first]
            var j = i + 1
            while j < tokens.count, keys.contains(tokens[j]), let next = dmxRGB[tokens[j]] {
                colors.append(next)
                j += 1
            }
            if colors.count >= 2, best == nil || colors.count > (best?.count ?? 0) {
                best = colors
            }
            i = max(j, i + 1)
        }
        return best
    }

    private static func firstDmxColorToken(in name: String) -> RGB? {
        let tokens = name.uppercased().split(whereSeparator: \.isWhitespace).map(String.init)
        for token in tokens {
            if let rgb = dmxRGB[token] { return rgb }
            // "RD/GN/BU" handled elsewhere; lone token may still be "RD,"
            let cleaned = token.trimmingCharacters(in: CharacterSet.alphanumerics.inverted)
            if let rgb = dmxRGB[cleaned] { return rgb }
        }
        return nil
    }

    private static func dmxOnPair(_ name: String) -> (fg: RGB, bg: RGB)? {
        let tokens = name.uppercased().split(whereSeparator: \.isWhitespace).map(String.init)
        guard let on = tokens.firstIndex(of: "ON"),
              on > 0, on + 1 < tokens.count,
              let fg = dmxRGB[tokens[on - 1]],
              let bg = dmxRGB[tokens[on + 1]] else { return nil }
        return (fg, bg)
    }

    // Inline colour maps so static init order cannot leave empty tables.
    private static let letterRGB: [String: RGB] = [
        "R": RGB(r: 255, g: 28, b: 28),
        "G": RGB(r: 36, g: 220, b: 72),
        "B": RGB(r: 40, g: 90, b: 255),
        "Y": RGB(r: 255, g: 220, b: 32),
        "C": RGB(r: 48, g: 214, b: 255),
        "P": RGB(r: 168, g: 48, b: 255),
        "W": RGB(r: 255, g: 252, b: 245),
    ]

    private static let wordColor: [String: RGB] = [
        "Red": RGB(r: 255, g: 28, b: 28),
        "Green": RGB(r: 36, g: 220, b: 72),
        "Blue": RGB(r: 40, g: 90, b: 255),
        "Yellow": RGB(r: 255, g: 220, b: 32),
        "Cyan": RGB(r: 48, g: 214, b: 255),
        "Purple": RGB(r: 168, g: 48, b: 255),
        "White": RGB(r: 255, g: 252, b: 245),
    ]

    private static let dmxRGB: [String: RGB] = [
        "RD": RGB(r: 255, g: 28, b: 28),
        "GN": RGB(r: 36, g: 220, b: 72),
        "BU": RGB(r: 40, g: 90, b: 255),
        "YE": RGB(r: 255, g: 220, b: 32),
        "CN": RGB(r: 48, g: 214, b: 255),
        "VT": RGB(r: 168, g: 48, b: 255),
        "WH": RGB(r: 255, g: 252, b: 245),
        "BK": RGB(r: 0, g: 0, b: 0),
    ]

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

        // Hard colour stops only. Mixing R→G invents yellow and every Trans tile
        // starts looking like the same rainbow wash.
        let pos = u * Double(palette.count)
        let i = wrap(Int(floor(pos)), palette.count)
        let t = pos - floor(pos)
        let from = palette[i]
        let to = palette[wrap(i + 1, palette.count)]
        let edge = 0.18
        let arrive = max(0, min(1, (t - local) / edge + 0.5))
        let chosen = arrive < 0.5 ? from : to
        let front = max(0, 1 - abs(local - t) / 0.09)
        return scale(chosen, 0.45 + (arrive < 0.5 ? 1 - arrive : arrive) * 0.4 + front * 0.2)
    }
}
