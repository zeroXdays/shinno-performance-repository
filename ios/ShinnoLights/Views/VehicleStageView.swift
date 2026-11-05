import SwiftUI

/// Zone tiles matching the web VehicleStage — shown even before devices are paired.
struct VehicleStageView: View {
    @EnvironmentObject var garage: GarageStore

    private var zones: [ZoneKind] { garage.settings.car.kitZones }
    private var singleZone: Bool { zones.count == 1 }

    var body: some View {
        VStack(spacing: 10) {
            LazyVGrid(
                columns: singleZone
                    ? [GridItem(.flexible())]
                    : [GridItem(.flexible()), GridItem(.flexible())],
                spacing: 8
            ) {
                ForEach(zones) { zone in
                    zoneTile(zone)
                        .gridCellColumns(zone == .emblem || singleZone ? (singleZone ? 1 : 2) : 1)
                }
            }

            Text(stageCaption)
                .font(.caption2)
                .tracking(0.6)
                .foregroundStyle(.secondary)
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
    private func zoneTile(_ zone: ZoneKind) -> some View {
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
                ZStack {
                    if zone == .emblem {
                        EmblemStageGlyph(controller: controller)
                            .frame(height: singleZone ? 118 : 96)
                    } else if zone == .mirrors {
                        CellsStageGlyph(count: 9, controller: controller)
                            .frame(height: 72)
                    } else {
                        DotsStageGlyph(count: 5, controller: controller)
                            .frame(height: 72)
                    }
                }
                .frame(maxWidth: .infinity)

                HStack(spacing: 6) {
                    Circle()
                        .fill(statusColor(controller))
                        .frame(width: 6, height: 6)
                    Text(zone.title.uppercased())
                        .font(.caption2.weight(.semibold))
                        .tracking(1.2)
                        .foregroundStyle(.white.opacity(0.85))
                    Spacer(minLength: 0)
                    Text(statusLine(controller))
                        .font(.caption2)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
            }
            .padding(.horizontal, 12)
            .padding(.vertical, 12)
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
        if controller.effectId != nil { return "Mode" }
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
                        ).opacity(0.45)
                    )
                    .blur(radius: 18)
                    .frame(width: 140, height: 70)
            }

            // LED ring
            TimelineView(.animation(minimumInterval: 1 / 20)) { timeline in
                Canvas { context, size in
                    let cx = size.width / 2
                    let cy = size.height / 2
                    let rx = size.width * 0.42
                    let ry = size.height * 0.36
                    let n = 28
                    let t = timeline.date.timeIntervalSinceReferenceDate
                    for i in 0..<n {
                        let a = -Double.pi / 2 + (Double(i) / Double(n)) * Double.pi * 2
                        let x = cx + cos(a) * rx
                        let y = cy + sin(a) * ry
                        let rgb: RGB = {
                            guard on, let controller else {
                                return RGB(r: 60, g: 60, b: 60)
                            }
                            if let effectId = controller.effectId {
                                // Simple chase when a mode is active
                                let lit = Int((t * Double(max(8, controller.effectSpeed)) / 12).truncatingRemainder(dividingBy: Double(n)))
                                if i == lit {
                                    return controller.color
                                }
                                return RGB(r: max(20, controller.color.r / 5), g: max(20, controller.color.g / 5), b: max(20, controller.color.b / 5))
                            }
                            return controller.color
                        }()
                        let rect = CGRect(x: x - 3.2, y: y - 2.1, width: 6.4, height: 4.2)
                        context.fill(
                            Path(ellipseIn: rect),
                            with: .color(
                                on
                                    ? Color(red: Double(rgb.r) / 255, green: Double(rgb.g) / 255, blue: Double(rgb.b) / 255)
                                    : Color.white.opacity(0.16)
                            )
                        )
                    }
                }
            }

            Image("Emblem")
                .resizable()
                .scaledToFit()
                .frame(maxWidth: 150, maxHeight: 78)
                .shadow(color: .black.opacity(0.7), radius: 8, y: 4)

            // Glossy sheen
            Ellipse()
                .fill(
                    RadialGradient(
                        colors: [Color.white.opacity(0.18), .clear],
                        center: UnitPoint(x: 0.28, y: 0.22),
                        startRadius: 2,
                        endRadius: 60
                    )
                )
                .frame(width: 120, height: 60)
                .blendMode(.softLight)
                .allowsHitTesting(false)
        }
        .frame(maxWidth: .infinity)
    }
}

private struct CellsStageGlyph: View {
    var count: Int
    var controller: PairedController?

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        let cols = 3
        let rows = max(1, Int(ceil(Double(count) / Double(cols))))
        VStack(spacing: 4) {
            ForEach(0..<rows, id: \.self) { row in
                HStack(spacing: 4) {
                    ForEach(0..<cols, id: \.self) { col in
                        let index = row * cols + col
                        if index < count {
                            RoundedRectangle(cornerRadius: 3, style: .continuous)
                                .fill(
                                    on
                                        ? Color(red: Double(color.r) / 255, green: Double(color.g) / 255, blue: Double(color.b) / 255)
                                        : Color.white.opacity(0.14)
                                )
                                .frame(width: 18, height: 14)
                                .shadow(color: on ? Color(red: Double(color.r) / 255, green: Double(color.g) / 255, blue: Double(color.b) / 255).opacity(0.6) : .clear, radius: 4)
                        }
                    }
                }
            }
        }
    }
}

private struct DotsStageGlyph: View {
    var count: Int
    var controller: PairedController?

    var body: some View {
        let on = controller?.power == true
        let color = controller?.color ?? RGB(r: 196, g: 18, b: 32)
        HStack(spacing: 8) {
            ForEach(0..<count, id: \.self) { _ in
                Circle()
                    .fill(
                        on
                            ? Color(red: Double(color.r) / 255, green: Double(color.g) / 255, blue: Double(color.b) / 255)
                            : Color.white.opacity(0.16)
                    )
                    .frame(width: 12, height: 12)
                    .shadow(color: on ? Color(red: Double(color.r) / 255, green: Double(color.g) / 255, blue: Double(color.b) / 255).opacity(0.55) : .clear, radius: 4)
            }
        }
    }
}
