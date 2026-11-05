import SwiftUI

/// Zone tiles matching the web VehicleStage — Emblem full-width, Mirrors|Bumper equal halves.
struct VehicleStageView: View {
    @EnvironmentObject var garage: GarageStore

    private var zones: [ZoneKind] { garage.settings.car.kitZones }
    private var singleZone: Bool { zones.count == 1 }

    private let columns = [
        GridItem(.flexible(), spacing: 8),
        GridItem(.flexible(), spacing: 8),
    ]

    var body: some View {
        VStack(spacing: 10) {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(zones) { zone in
                    let wide = zone == .emblem || singleZone
                    zoneTile(zone, wide: wide)
                        .gridCellColumns(wide ? 2 : 1)
                }
            }

            Text(stageCaption)
                .font(.caption2)
                .tracking(0.6)
                .foregroundStyle(.secondary)
                .frame(maxWidth: .infinity)
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

        Button {
            if case .zone(let z) = garage.target, z == zone {
                garage.target = .all
            } else {
                garage.target = .zone(zone)
            }
        } label: {
            VStack(spacing: 8) {
                Group {
                    if zone == .emblem {
                        EmblemStageGlyph(controller: controller)
                    } else if zone == .mirrors {
                        CellsStageGlyph(count: 9, controller: controller)
                    } else {
                        DotsStageGlyph(count: 5, controller: controller)
                    }
                }
                .frame(maxWidth: .infinity)
                .frame(height: wide ? 92 : 72)
                .frame(minHeight: wide ? 92 : 72)

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
            .padding(.horizontal, 12)
            .padding(.top, 12)
            .padding(.bottom, 10)
            .frame(maxWidth: .infinity, alignment: .top)
            .background(Color(white: 0.07), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(
                        hot ? shinnoRed : (selected ? shinnoRed.opacity(0.8) : Color.white.opacity(0.08)),
                        lineWidth: 1
                    )
            )
            .shadow(color: hot || selected ? shinnoRed.opacity(0.28) : .clear, radius: 12)
            .opacity(dimmed ? 0.45 : 1)
        }
        .buttonStyle(.plain)
    }

    private func statusColor(_ controller: PairedController?) -> Color {
        guard let controller else { return Color.white.opacity(0.25) }
        if !controller.power { return Color.white.opacity(0.28) }
        return Color(
            red: Double(controller.color.r) / 255,
            green: Double(controller.color.g) / 255,
            blue: Double(controller.color.b) / 255
        )
    }

    private func statusLine(_ controller: PairedController?) -> String {
        guard let controller else { return "Empty" }
        if !controller.power { return "Off" }
        if let effectId = controller.effectId {
            return EffectsCatalog.named(effectId, car: garage.settings.car) ?? "Mode"
        }
        return "On"
    }
}

private struct EmblemStageGlyph: View {
    var controller: PairedController?

    var body: some View {
        let on = controller?.power == true
        let glow = on ? (controller?.color ?? RGB(r: 196, g: 18, b: 32)) : nil

        ZStack {
            if let glow {
                Ellipse()
                    .fill(
                        Color(
                            red: Double(glow.r) / 255,
                            green: Double(glow.g) / 255,
                            blue: Double(glow.b) / 255
                        ).opacity(0.4)
                    )
                    .blur(radius: 14)
                    .frame(width: 120, height: 56)
            }

            TimelineView(.animation(minimumInterval: (on && controller?.effectId != nil) ? 1 / 20 : 60)) { timeline in
                Canvas { context, size in
                    let cx = size.width / 2
                    let cy = size.height / 2
                    let rx = min(size.width * 0.38, size.height * 0.9)
                    let ry = size.height * 0.34
                    let n = 28
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    let chasing = on && controller?.effectId != nil
                    for i in 0..<n {
                        let a = -Double.pi / 2 + (Double(i) / Double(n)) * Double.pi * 2
                        let x = cx + cos(a) * rx
                        let y = cy + sin(a) * ry
                        let rgb: RGB = {
                            guard on, let controller else {
                                return RGB(r: 60, g: 60, b: 60)
                            }
                            if chasing {
                                let lit = Int((t * Double(max(8, controller.effectSpeed)) / 12)
                                    .truncatingRemainder(dividingBy: Double(n)))
                                if i == lit { return controller.color }
                                return RGB(
                                    r: max(20, controller.color.r / 5),
                                    g: max(20, controller.color.g / 5),
                                    b: max(20, controller.color.b / 5)
                                )
                            }
                            return controller.color
                        }()
                        let rect = CGRect(x: x - 2.8, y: y - 1.8, width: 5.6, height: 3.6)
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

            Image("Emblem")
                .resizable()
                .scaledToFit()
                .padding(.horizontal, 28)
                .padding(.vertical, 10)
                .shadow(color: .black.opacity(0.7), radius: 6, y: 3)

            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [Color.white.opacity(0.16), .clear],
                        center: UnitPoint(x: 0.28, y: 0.22),
                        startRadius: 2,
                        endRadius: 50
                    )
                )
                .padding(18)
                .blendMode(.softLight)
                .allowsHitTesting(false)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .clipped()
    }
}

/// Equal-size square cells in one flush horizontal row.
private struct CellsStageGlyph: View {
    var count: Int
    var controller: PairedController?

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        let animate = on && controller?.effectId != nil
        TimelineView(.animation(minimumInterval: animate ? 1 / 20 : 60)) { timeline in
            GeometryReader { geo in
                let n = max(1, count)
                let spacing = max(3, geo.size.width * 0.02)
                let totalSpacing = spacing * CGFloat(n - 1)
                let side = min(
                    (geo.size.width - totalSpacing) / CGFloat(n),
                    geo.size.height * 0.55
                )
                let tNow = timeline.date.timeIntervalSinceReferenceDate
                HStack(spacing: spacing) {
                    ForEach(0..<n, id: \.self) { i in
                        let lit: Bool = {
                            guard animate else { return on }
                            let speed = Double(max(8, controller?.effectSpeed ?? 50))
                            let head = Int((tNow * speed / 14).truncatingRemainder(dividingBy: Double(n)))
                            return i == head
                        }()
                        let fill: Color = {
                            if !on { return Color.white.opacity(0.16) }
                            if animate && !lit {
                                return Color(
                                    red: Double(color.r) / 255,
                                    green: Double(color.g) / 255,
                                    blue: Double(color.b) / 255
                                ).opacity(0.22)
                            }
                            return Color(
                                red: Double(color.r) / 255,
                                green: Double(color.g) / 255,
                                blue: Double(color.b) / 255
                            )
                        }()
                        RoundedRectangle(cornerRadius: 2, style: .continuous)
                            .fill(fill)
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

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        let animate = on && controller?.effectId != nil
        TimelineView(.animation(minimumInterval: animate ? 1 / 20 : 60)) { timeline in
            GeometryReader { geo in
                let n = max(1, count)
                let spacing = max(8, geo.size.width * 0.05)
                let totalSpacing = spacing * CGFloat(n - 1)
                let side = min(12, (geo.size.width - totalSpacing) / CGFloat(n), geo.size.height * 0.4)
                let tNow = timeline.date.timeIntervalSinceReferenceDate
                HStack(spacing: spacing) {
                    ForEach(0..<n, id: \.self) { i in
                        let lit: Bool = {
                            guard animate else { return on }
                            let speed = Double(max(8, controller?.effectSpeed ?? 50))
                            let head = Int((tNow * speed / 14).truncatingRemainder(dividingBy: Double(n)))
                            return i == head
                        }()
                        let fill: Color = {
                            if !on { return Color.white.opacity(0.16) }
                            if animate && !lit {
                                return Color(
                                    red: Double(color.r) / 255,
                                    green: Double(color.g) / 255,
                                    blue: Double(color.b) / 255
                                ).opacity(0.22)
                            }
                            return Color(
                                red: Double(color.r) / 255,
                                green: Double(color.g) / 255,
                                blue: Double(color.b) / 255
                            )
                        }()
                        Circle()
                            .fill(fill)
                            .frame(width: side, height: side)
                    }
                }
                .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .center)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }
}
