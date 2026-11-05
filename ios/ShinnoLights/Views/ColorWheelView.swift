import SwiftUI

struct ColorWheelView: View {
    var color: RGB
    /// Continuous drag — keep this light (UI + throttled colour-only BLE).
    var onChange: (RGB) -> Void
    /// Finger up — commit a full solid-colour write (safe for LEDDMX).
    var onCommit: ((RGB) -> Void)? = nil

    var body: some View {
        VStack(spacing: 14) {
            GeometryReader { geo in
                let size = min(geo.size.width, geo.size.height)
                ZStack {
                    HexCell()
                        .fill(color.color)
                        .blur(radius: 22)
                        .opacity(0.55)
                        .scaleEffect(1.08)
                    HexCell()
                        .fill(
                            AngularGradient(
                                colors: [.red, .yellow, .green, .cyan, .blue, .purple, .red],
                                center: .center
                            )
                        )
                    HexCell()
                        .fill(
                            RadialGradient(
                                colors: [.white, .white.opacity(0)],
                                center: .center,
                                startRadius: 0,
                                endRadius: size * 0.38
                            )
                        )
                    HexCell()
                        .stroke(.white.opacity(0.35), lineWidth: 1.4)
                    HexCell()
                        .fill(color.color)
                        .frame(width: size * 0.3, height: size * 0.3)
                        .shadow(color: color.color.opacity(0.85), radius: 16)
                }
                .frame(width: size, height: size)
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            onChange(colorAt(value.location, size: size))
                        }
                        .onEnded { value in
                            let rgb = colorAt(value.location, size: size)
                            onChange(rgb)
                            onCommit?(rgb)
                        }
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .aspectRatio(1, contentMode: .fit)
            .padding(.horizontal, 36)

            Text(color.hex)
                .font(.system(.body, design: .monospaced))
                .tracking(2)
                .foregroundStyle(.secondary)
        }
    }
}

struct HexCell: Shape {
    func path(in rect: CGRect) -> Path {
        let w = rect.width
        let h = rect.height
        let pts = [
            CGPoint(x: w * 0.50, y: 0),
            CGPoint(x: w * 0.933, y: h * 0.25),
            CGPoint(x: w * 0.933, y: h * 0.75),
            CGPoint(x: w * 0.50, y: h),
            CGPoint(x: w * 0.067, y: h * 0.75),
            CGPoint(x: w * 0.067, y: h * 0.25),
        ]
        var path = Path()
        path.move(to: pts[0])
        for p in pts.dropFirst() { path.addLine(to: p) }
        path.closeSubpath()
        return path
    }
}

private func colorAt(_ location: CGPoint, size: CGFloat) -> RGB {
    let center = CGPoint(x: size / 2, y: size / 2)
    let dx = location.x - center.x
    let dy = location.y - center.y
    let dist = hypot(dx, dy) / (size / 2)
    var hue = atan2(dy, dx) * 180 / .pi + 90
    if hue < 0 { hue += 360 }
    let sat = min(dist / hexRadius(hue), 1)
    return hsv(h: hue, s: sat, v: 1)
}

private func hexRadius(_ angle: Double) -> Double {
    let sector = (angle.truncatingRemainder(dividingBy: 60) + 60).truncatingRemainder(dividingBy: 60)
    let phi = (sector - 30) * .pi / 180
    return cos(.pi / 6) / cos(phi)
}

private func hsv(h: Double, s: Double, v: Double) -> RGB {
    let c = v * s
    let x = c * (1 - abs((h / 60).truncatingRemainder(dividingBy: 2) - 1))
    let m = v - c
    let rgb: (Double, Double, Double)
    switch h {
    case 0..<60: rgb = (c, x, 0)
    case 60..<120: rgb = (x, c, 0)
    case 120..<180: rgb = (0, c, x)
    case 180..<240: rgb = (0, x, c)
    case 240..<300: rgb = (x, 0, c)
    default: rgb = (c, 0, x)
    }
    return RGB(
        r: Int(((rgb.0 + m) * 255).rounded()),
        g: Int(((rgb.1 + m) * 255).rounded()),
        b: Int(((rgb.2 + m) * 255).rounded())
    )
}

private extension RGB {
    var hex: String {
        String(format: "#%02X%02X%02X", r, g, b)
    }
}
