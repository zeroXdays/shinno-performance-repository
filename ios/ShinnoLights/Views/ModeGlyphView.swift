import SwiftUI

/// Clean web-style ModeGlyph: crisp LED dots on a path + thin palette strip.
/// Colours come from EffectPreview (named stops like R-G-B / Y-B / 7-Color).
struct ModeGlyphView: View {
    var effect: LedEffect
    var speed: Int
    var animate: Bool = true
    var active: Bool = false
    var showsLegend: Bool = true
    var compact: Bool = false

    private var ledCount: Int { compact ? 16 : 20 }

    var body: some View {
        let motion = EffectPreview.motion(for: effect)
        let palette = EffectPreview.palette(for: effect)

        VStack(spacing: showsLegend ? (compact ? 4 : 5) : 0) {
            TimelineView(.animation(minimumInterval: animate ? 1.0 / 18.0 : 120)) { timeline in
                Canvas { context, size in
                    let points = EffectPreview.pathPoints(motion: motion, ledCount: ledCount, in: size)
                    let period = EffectPreview.periodMs(speed: speed, motion: motion)
                    let phase = Double(effect.id % 19) * (period / 19)
                    let elapsedMs = animate
                        ? timeline.date.timeIntervalSinceReferenceDate * 1000 + phase
                        : period * 0.22 + phase
                    let dim = active || !animate ? 1.0 : 0.92
                    let ledR = max(compact ? 2.4 : 2.8, min(size.width, size.height) * (compact ? 0.038 : 0.034))

                    if points.count >= 2 {
                        var stroke = Path()
                        stroke.move(to: points[0])
                        for point in points.dropFirst() { stroke.addLine(to: point) }
                        context.stroke(
                            stroke,
                            with: .color(Color.white.opacity(0.12)),
                            style: StrokeStyle(lineWidth: compact ? 1.5 : 2.0, lineCap: .round, lineJoin: .round)
                        )
                    }

                    for (index, point) in points.enumerated() {
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
                        // Crisp LED only — no wide halos that tint the card muddy colours.
                        context.fill(
                            Path(ellipseIn: CGRect(
                                x: point.x - ledR,
                                y: point.y - ledR,
                                width: ledR * 2,
                                height: ledR * 2
                            )),
                            with: .color(color)
                        )
                    }
                }
            }
            .aspectRatio(compact ? 1.15 : 1.0, contentMode: .fit)

            if showsLegend {
                HStack(spacing: 2) {
                    ForEach(Array(palette.enumerated()), id: \.offset) { _, rgb in
                        RoundedRectangle(cornerRadius: 1.5, style: .continuous)
                            .fill(rgb.color)
                    }
                }
                .frame(height: compact ? 5 : 7)
                .clipShape(RoundedRectangle(cornerRadius: 2, style: .continuous))
                .padding(.horizontal, 2)
            }
        }
        .id("mode-glyph-\(effect.id)-\(compact)")
    }
}
