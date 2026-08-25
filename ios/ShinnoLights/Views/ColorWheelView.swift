import SwiftUI

struct ColorWheelView: View {
    var color: RGB
    var onChange: (RGB) -> Void

    var body: some View {
        GeometryReader { geo in
            let size = min(geo.size.width, geo.size.height)
            ZStack {
                Circle()
                    .fill(
                        AngularGradient(
                            colors: [.red, .yellow, .green, .cyan, .blue, .purple, .red],
                            center: .center
                        )
                    )
                Circle()
                    .fill(RadialGradient(colors: [.white, .white.opacity(0)], center: .center, startRadius: 0, endRadius: size * 0.38))
                Circle()
                    .fill(color.color)
                    .frame(width: size * 0.28, height: size * 0.28)
                    .shadow(color: color.color.opacity(0.8), radius: 18)
            }
            .frame(width: size, height: size)
            .gesture(
                DragGesture(minimumDistance: 0).onChanged { value in
                    let center = CGPoint(x: size / 2, y: size / 2)
                    let dx = value.location.x - center.x
                    let dy = value.location.y - center.y
                    let sat = min(hypot(dx, dy) / (size / 2), 1)
                    var hue = atan2(dy, dx) * 180 / .pi + 90
                    if hue < 0 { hue += 360 }
                    onChange(hsv(h: hue, s: sat, v: 1))
                }
            )
            .frame(maxWidth: .infinity, maxHeight: .infinity)
        }
        .aspectRatio(1, contentMode: .fit)
        .padding(.horizontal, 28)
    }
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
