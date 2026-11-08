import SwiftUI

/// Zone tiles — Emblem always full-width on top; Mirrors | Bumper share the row beneath.
struct VehicleStageView: View {
    @EnvironmentObject var garage: GarageStore
    /// Modes tab uses a shorter stage so the mode grid stays on-screen.
    var compact: Bool = false

    private var zones: [ZoneKind] { garage.settings.car.kitZones }
    private var hasEmblem: Bool { zones.contains(.emblem) }
    private var sideZones: [ZoneKind] { zones.filter { $0 != .emblem } }

    var body: some View {
        VStack(spacing: compact ? 6 : 8) {
            if hasEmblem {
                zoneTile(.emblem, wide: true)
            }

            if !sideZones.isEmpty {
                HStack(spacing: compact ? 6 : 8) {
                    ForEach(sideZones) { zone in
                        zoneTile(zone, wide: false)
                    }
                }
            } else if !hasEmblem {
                HStack(spacing: compact ? 6 : 8) {
                    ForEach(zones) { zone in
                        zoneTile(zone, wide: false)
                    }
                }
            }

            if !compact {
                Text(stageCaption)
                    .font(.caption2)
                    .tracking(0.6)
                    .foregroundStyle(.secondary)
                    .frame(maxWidth: .infinity)
            }
        }
    }

    private var stageCaption: String {
        let focus: String = {
            switch garage.target {
            case .all: return "All lights"
            case .zone(let zone): return zone.title
            }
        }()
        return "\(focus) · Tap a zone"
    }

    @ViewBuilder
    private func zoneTile(_ zone: ZoneKind, wide: Bool) -> some View {
        let controller = garage.controllers.first { $0.zone == zone }
        let selected: Bool = {
            if case .zone(let z) = garage.target { return z == zone }
            return false
        }()
        let hot = garage.activePathZones.contains(zone)
        let dimmed: Bool = {
            if case .zone = garage.target { return !selected }
            return false
        }()
        let glyphH: CGFloat = {
            if compact { return wide ? 52 : 40 }
            return wide ? 88 : 68
        }()

        Button {
            if case .zone(let z) = garage.target, z == zone {
                garage.target = .all
            } else {
                garage.target = .zone(zone)
            }
        } label: {
            VStack(spacing: compact ? 5 : 8) {
                Group {
                    let effect = liveEffect(for: controller)
                    if zone == .emblem {
                        EmblemStageGlyph(controller: controller, effect: effect)
                    } else if zone == .mirrors {
                        CellsStageGlyph(count: 9, controller: controller, effect: effect)
                    } else {
                        DotsStageGlyph(count: 5, controller: controller, effect: effect)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: glyphH)

                HStack(spacing: 6) {
                    Circle()
                        .fill(statusColor(controller))
                        .frame(width: 6, height: 6)
                    Text(zone.title.uppercased())
                        .font(.caption2.weight(.semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.85))
                        .lineLimit(1)
                        .minimumScaleFactor(0.85)
                    Spacer(minLength: 0)
                    Text(statusLine(controller))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                        .minimumScaleFactor(0.8)
                }
            }
            .padding(.horizontal, compact ? 10 : 12)
            .padding(.top, compact ? 8 : 12)
            .padding(.bottom, compact ? 8 : 10)
            .frame(maxWidth: .infinity, alignment: .top)
            .background(Color(white: 0.07), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .stroke(
                        hot ? shinnoRed : (selected ? shinnoRed.opacity(0.8) : Color.white.opacity(0.08)),
                        lineWidth: 1
                    )
            )
            .shadow(color: hot || selected ? shinnoRed.opacity(0.28) : .clear, radius: 10)
            .opacity(dimmed ? 0.45 : 1)
        }
        .buttonStyle(.plain)
    }

    private func statusColor(_ controller: PairedController?) -> Color {
        guard let controller else { return Color.white.opacity(0.25) }
        if !controller.power { return Color.white.opacity(0.28) }
        return controller.connected ? Color(red: 0.25, green: 0.85, blue: 0.45) : shinnoRed
    }

    private func statusLine(_ controller: PairedController?) -> String {
        guard let controller else { return "Empty" }
        if !controller.power { return "Off" }
        if let id = controller.effectId,
           let effect = EffectsCatalog.effects(for: garage.settings.car).first(where: { $0.id == id }) {
            return effect.name
        }
        return controller.connected ? "On" : "Away"
    }

    private func liveEffect(for controller: PairedController?) -> LedEffect? {
        guard let id = controller?.effectId else { return nil }
        return EffectsCatalog.effects(for: garage.settings.car).first { $0.id == id }
    }
}


private struct EmblemStageGlyph: View {
    var controller: PairedController?
    var effect: LedEffect?

    /// Matches `Emblem.png` pixel aspect so the LED ring can hug the chrome oval.
    private static let emblemAspect: CGFloat = 520.0 / 282.0

    var body: some View {
        let on = controller?.power == true
        let glow = on ? (controller?.color ?? RGB(r: 196, g: 18, b: 32)) : nil

        GeometryReader { geo in
            let size = geo.size
            // Shrink the badge a touch so LEDs can sit just outside it (not under it).
            let hPad = max(22 as CGFloat, size.width * 0.12)
            let vPad = max(8 as CGFloat, size.height * 0.10)
            let availW = max(1, size.width - hPad * 2)
            let availH = max(1, size.height - vPad * 2)
            let fitByHeight = availW / availH > Self.emblemAspect
            let fitW = fitByHeight ? availH * Self.emblemAspect : availW
            let fitH = fitByHeight ? availH : availW / Self.emblemAspect
            // Ring just outside the fitted emblem — same center, same aspect.
            let ledW: CGFloat = 5.2
            let ledH: CGFloat = 3.4
            let gap: CGFloat = 5
            let edgePad = max(ledW, ledH) / 2 + 1
            let cx = size.width / 2
            let cy = size.height / 2
            let rx = min(fitW / 2 + gap, size.width / 2 - edgePad)
            let ry = min(fitH / 2 + gap, size.height / 2 - edgePad)

            ZStack {
                if let glow {
                    Ellipse()
                        .fill(
                            Color(
                                red: Double(glow.r) / 255,
                                green: Double(glow.g) / 255,
                                blue: Double(glow.b) / 255
                            ).opacity(0.22)
                        )
                        .blur(radius: 10)
                        .frame(width: fitW * 0.72, height: fitH * 0.72)
                }

                Image("Emblem")
                    .resizable()
                    .scaledToFit()
                    .frame(width: fitW, height: fitH)

                TimelineView(.animation(minimumInterval: (on && effect != nil) ? 1 / 20 : 60)) { timeline in
                    Canvas { context, _ in
                        let n = 28
                        let elapsedMs = timeline.date.timeIntervalSinceReferenceDate * 1000
                        let speed = controller?.effectSpeed ?? 50
                        for i in 0..<n {
                            let a = -Double.pi / 2 + (Double(i) / Double(n)) * Double.pi * 2
                            let x = cx + cos(a) * rx
                            let y = cy + sin(a) * ry
                            let rgb: RGB = {
                                guard on, let controller else {
                                    return RGB(r: 60, g: 60, b: 60)
                                }
                                if let effect {
                                    return EffectPreview.sampleLed(
                                        effect: effect,
                                        index: i,
                                        count: n,
                                        elapsedMs: elapsedMs,
                                        speed: speed
                                    )
                                }
                                return controller.color
                            }()
                            let rect = CGRect(x: x - ledW / 2, y: y - ledH / 2, width: ledW, height: ledH)
                            context.fill(
                                Path(ellipseIn: rect),
                                with: .color(
                                    on
                                        ? Color(
                                            red: Double(rgb.r) / 255,
                                            green: Double(rgb.g) / 255,
                                            blue: Double(rgb.b) / 255
                                        )
                                        : Color.white.opacity(0.16)
                                )
                            )
                        }
                    }
                }
            }
            .frame(width: size.width, height: size.height)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Equal-size square cells in one flush horizontal row.
private struct CellsStageGlyph: View {
    var count: Int
    var controller: PairedController?
    var effect: LedEffect?

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        let animate = on && effect != nil
        TimelineView(.animation(minimumInterval: animate ? 1 / 20 : 60)) { timeline in
            GeometryReader { geo in
                let n = max(1, count)
                let spacing = max(3, geo.size.width * 0.02)
                let totalSpacing = spacing * CGFloat(n - 1)
                let side = min(
                    (geo.size.width - totalSpacing) / CGFloat(n),
                    geo.size.height * 0.55
                )
                let elapsedMs = timeline.date.timeIntervalSinceReferenceDate * 1000
                let speed = controller?.effectSpeed ?? 50
                HStack(spacing: spacing) {
                    ForEach(0..<n, id: \.self) { i in
                        let rgb: RGB = {
                            if !on { return RGB(r: 40, g: 40, b: 40) }
                            if let effect {
                                return EffectPreview.sampleLed(
                                    effect: effect,
                                    index: i,
                                    count: n,
                                    elapsedMs: elapsedMs,
                                    speed: speed
                                )
                            }
                            return color
                        }()
                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                            .fill(
                                on
                                    ? Color(
                                        red: Double(rgb.r) / 255,
                                        green: Double(rgb.g) / 255,
                                        blue: Double(rgb.b) / 255
                                    )
                                    : Color.white.opacity(0.16)
                            )
                            .frame(width: side, height: side)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}

/// Equal-size bumper dots in the shared half-width slot.
private struct DotsStageGlyph: View {
    var count: Int
    var controller: PairedController?
    var effect: LedEffect?

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        let animate = on && effect != nil
        TimelineView(.animation(minimumInterval: animate ? 1 / 20 : 60)) { timeline in
            GeometryReader { geo in
                let n = max(1, count)
                let spacing = max(8, geo.size.width * 0.05)
                let totalSpacing = spacing * CGFloat(n - 1)
                let side = min(12, (geo.size.width - totalSpacing) / CGFloat(n), geo.size.height * 0.4)
                let elapsedMs = timeline.date.timeIntervalSinceReferenceDate * 1000
                let speed = controller?.effectSpeed ?? 50
                HStack(spacing: spacing) {
                    ForEach(0..<n, id: \.self) { i in
                        let rgb: RGB = {
                            if !on { return RGB(r: 40, g: 40, b: 40) }
                            if let effect {
                                return EffectPreview.sampleLed(
                                    effect: effect,
                                    index: i,
                                    count: n,
                                    elapsedMs: elapsedMs,
                                    speed: speed
                                )
                            }
                            return color
                        }()
                        Circle()
                            .fill(
                                on
                                    ? Color(
                                        red: Double(rgb.r) / 255,
                                        green: Double(rgb.g) / 255,
                                        blue: Double(rgb.b) / 255
                                    )
                                    : Color.white.opacity(0.16)
                            )
                            .frame(width: side, height: side)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
