import SwiftUI

/// Per-mode LED preview — same contract as web `ModeGlyph`:
/// path shape from motion, LED colours from `sampleLed`, colour strip from palette.
struct ModeGlyphView: View {
    var effect: LedEffect
    var speed: Int
    var animate: Bool = true
    var active: Bool = false
    var showsLegend: Bool = true
    /// Denser tile for the Modes grid (3-up) without losing colour identity.
    var compact: Bool = false

    private var ledCount: Int { compact ? 14 : 18 }

    var body: some View {
        let motion = EffectPreview.motion(for: effect)
        let palette = EffectPreview.palette(for: effect)
        let reversed = effect.name.contains("Back")
            || effect.name.contains("Backward")
            || effect.name.contains("Close")
            || effect.group == .runback

        VStack(spacing: showsLegend ? (compact ? 3 : 6) : 0) {
            ZStack {
                RoundedRectangle(cornerRadius: compact ? 8 : 10, style: .continuous)
                    .fill(palette.first?.color.opacity(0.14) ?? Color.white.opacity(0.04))

                TimelineView(.animation(minimumInterval: animate ? 1.0 / 16.0 : 120)) { timeline in
                    GeometryReader { geo in
                        let size = geo.size
                        let points = EffectPreview.pathPoints(motion: motion, ledCount: ledCount, in: size)
                        let period = EffectPreview.periodMs(speed: speed, motion: motion)
                        let phase = Double(effect.id % 19) * (period / 19)
                        let elapsedMs = animate
                            ? timeline.date.timeIntervalSinceReferenceDate * 1000 + phase
                            : period * 0.22 + phase
                        let ledR = max(compact ? 2.8 : 3.5, min(size.width, size.height) * (compact ? 0.055 : 0.048))

                        ZStack {
                            if points.count >= 2 {
                                Path { path in
                                    path.move(to: points[0])
                                    for point in points.dropFirst() { path.addLine(to: point) }
                                }
                                .stroke(
                                    Color.white.opacity(0.16),
                                    style: StrokeStyle(lineWidth: compact ? 1.6 : 2, lineCap: .round, lineJoin: .round)
                                )
                            }

                            ForEach(Array(points.enumerated()), id: \.offset) { index, point in
                                let rgb = EffectPreview.sampleLed(
                                    effect: effect,
                                    index: index,
                                    count: ledCount,
                                    elapsedMs: elapsedMs,
                                    speed: speed
                                )
                                Circle()
                                    .fill(rgb.color.opacity(active || !animate ? 1 : 0.95))
                                    .frame(width: ledR * 2.15, height: ledR * 2.15)
                                    .position(point)
                            }
                        }
                    }
                }
                .padding(compact ? 4 : 6)
            }
            .aspectRatio(compact ? 1.25 : 1.05, contentMode: .fit)
            .clipShape(RoundedRectangle(cornerRadius: compact ? 8 : 10, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: compact ? 8 : 10, style: .continuous)
                    .stroke(Color.white.opacity(0.08), lineWidth: 1)
            )

            if showsLegend {
                HStack(spacing: compact ? 2 : 3) {
                    ForEach(Array(palette.enumerated()), id: \.offset) { _, rgb in
                        RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                            .fill(rgb.color)
                    }
                }
                .frame(height: compact ? 7 : 12)
                .clipShape(RoundedRectangle(cornerRadius: 2.5, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                        .stroke(Color.white.opacity(0.18), lineWidth: 0.5)
                )
                .padding(.horizontal, 1)

                if !compact {
                    HStack(spacing: 4) {
                        Image(systemName: reversed ? "arrow.left" : "arrow.right")
                            .font(.system(size: 9, weight: .bold))
                        Text(reversed ? "Back" : "Fwd")
                            .font(.system(size: 9, weight: .semibold))
                        Spacer(minLength: 0)
                        Text(shortPaletteLabel(palette))
                            .font(.system(size: 9, weight: .medium, design: .monospaced))
                            .lineLimit(1)
                            .minimumScaleFactor(0.7)
                    }
                    .foregroundStyle(Color.white.opacity(0.45))
                    .padding(.horizontal, 2)
                }
            }
        }
        .id("mode-glyph-\(effect.id)-\(effect.name)-\(compact)")
    }

    private func shortPaletteLabel(_ palette: [RGB]) -> String {
        if palette.count >= 7 { return "7-col" }
        if palette.count == 1 {
            let c = palette[0]
            if c.r > 200 && c.g < 80 { return "Red" }
            if c.g > 180 && c.r < 80 { return "Green" }
            if c.b > 200 && c.r < 100 { return "Blue" }
            if c.r > 200 && c.g > 180 && c.b < 80 { return "Yellow" }
            if c.g > 180 && c.b > 180 { return "Cyan" }
            if c.r > 140 && c.b > 180 { return "Purple" }
            if c.r > 240 && c.g > 240 { return "White" }
            return "Solid"
        }
        let letters: [String] = palette.map { c in
            if c.r > 200 && c.g < 80 { return "R" }
            if c.g > 180 && c.r < 80 && c.b < 120 { return "G" }
            if c.b > 200 && c.r < 100 { return "B" }
            if c.r > 200 && c.g > 180 && c.b < 80 { return "Y" }
            if c.g > 180 && c.b > 180 && c.r < 100 { return "C" }
            if c.r > 140 && c.b > 180 && c.g < 100 { return "P" }
            if c.r > 240 && c.g > 240 { return "W" }
            if c.r + c.g + c.b < 40 { return "K" }
            return "·"
        }
        return letters.joined(separator: "-")
    }
}
