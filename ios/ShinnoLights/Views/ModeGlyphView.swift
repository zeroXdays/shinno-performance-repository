import SwiftUI

/// Animated LED glyph for each mode tile — mirrors web `ModeGlyph`
/// (path + per-LED sampler + palette strip) so tiles are visually distinct.
struct ModeGlyphView: View {
    var effect: LedEffect
    var speed: Int
    var animate: Bool = true
    var active: Bool = false
    /// Colour strip + direction cue under the LEDs (mode grid). Compact playing bar can hide it.
    var showsLegend: Bool = true

    private let ledCount = 20

    var body: some View {
        let motion = EffectPreview.motion(for: effect)
        let palette = EffectPreview.palette(for: effect)
        let reversed = effect.name.contains("Back") || effect.name.contains("Backward")
            || effect.name.contains("Close") || effect.group == .runback

        VStack(spacing: showsLegend ? 5 : 0) {
            TimelineView(.animation(minimumInterval: animate ? 1.0 / 18.0 : 60)) { timeline in
                GeometryReader { geo in
                    let size = geo.size
                    let points = EffectPreview.pathPoints(motion: motion, ledCount: ledCount, in: size)
                    let period = EffectPreview.periodMs(speed: speed, motion: motion)
                    // Phase-shift by mode id so neighbouring tiles don't lock-step into the same picture.
                    let phase = Double(effect.id % 17) * (period / 17)
                    let elapsedMs: Double = {
                        if !animate { return period * 0.18 + phase }
                        return timeline.date.timeIntervalSinceReferenceDate * 1000 + phase
                    }()
                    let dim = active || !animate ? 1.0 : 0.92
                    let ledR = min(size.width, size.height) * 0.042

                    ZStack {
                        if points.count >= 2 {
                            Path { path in
                                path.move(to: points[0])
                                for point in points.dropFirst() { path.addLine(to: point) }
                            }
                            .stroke(Color.white.opacity(0.14), style: StrokeStyle(lineWidth: 2.2, lineCap: .round, lineJoin: .round))
                        }

                        ForEach(0..<points.count, id: \.self) { index in
                            let rgb = EffectPreview.sampleLed(
                                effect: effect,
                                index: index,
                                count: ledCount,
                                elapsedMs: elapsedMs,
                                speed: speed
                            )
                            let color = Color(
                                red: Double(rgb.r) / 255 * dim,
                                green: Double(rgb.g) / 255 * dim,
                                blue: Double(rgb.b) / 255 * dim
                            )
                            Circle()
                                .fill(color)
                                .frame(width: ledR * 2, height: ledR * 2)
                                .shadow(color: color.opacity(0.75), radius: ledR * 0.55)
                                .position(points[index])
                        }
                    }
                }
            }
            .aspectRatio(1, contentMode: .fit)

            if showsLegend {
                HStack(spacing: 2) {
                    ForEach(Array(palette.enumerated()), id: \.offset) { _, rgb in
                        RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                            .fill(rgb.color)
                    }
                }
                .frame(height: 8)
                .clipShape(RoundedRectangle(cornerRadius: 2.5, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 2.5, style: .continuous)
                        .stroke(Color.white.opacity(0.12), lineWidth: 0.5)
                )
                .padding(.horizontal, 4)

                Image(systemName: reversed ? "arrow.left" : "arrow.right")
                    .font(.system(size: 8, weight: .bold))
                    .foregroundStyle(Color.white.opacity(reversed ? 0.4 : 0.2))
            }
        }
        .id(effect.id)
    }
}
