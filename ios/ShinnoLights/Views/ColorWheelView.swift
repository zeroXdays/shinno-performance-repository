import SwiftUI
import UIKit

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
                let wheel = HexWheelRaster.image(side: size)
                let knob = location(for: color, size: size)

                ZStack {
                    HexCell()
                        .fill(color.color)
                        .blur(radius: 22)
                        .opacity(0.45)
                        .scaleEffect(1.06)

                    Image(uiImage: wheel)
                        .resizable()
                        .interpolation(.high)
                        .frame(width: size, height: size)
                        .clipShape(HexCell())

                    HexCell()
                        .stroke(.white.opacity(0.35), lineWidth: 1.4)

                    // Selected colour chip — matches the sampled wheel under the finger.
                    HexCell()
                        .fill(color.color)
                        .frame(width: size * 0.28, height: size * 0.28)
                        .shadow(color: color.color.opacity(0.85), radius: 14)

                    // Drag knob on the wheel face.
                    HexCell()
                        .fill(color.color)
                        .overlay(HexCell().stroke(.white, lineWidth: 2))
                        .frame(width: 18, height: 18)
                        .position(knob)
                        .shadow(color: .black.opacity(0.35), radius: 3)
                }
                .frame(width: size, height: size)
                .contentShape(HexCell())
                .gesture(
                    DragGesture(minimumDistance: 0)
                        .onChanged { value in
                            let clamped = clampToHex(value.location, size: size)
                            onChange(colorAt(clamped, size: size))
                        }
                        .onEnded { value in
                            let clamped = clampToHex(value.location, size: size)
                            let rgb = colorAt(clamped, size: size)
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

/// Pre-rasterised hex HSV disk so paint pixels match `colorAt` / drag math.
private enum HexWheelRaster {
    private static var cached: UIImage?

    static func image(side: CGFloat) -> UIImage {
        if let cached { return cached }

        // Fixed working resolution — sharp enough when scaled to the view.
        let dim = 320
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        format.opaque = false
        let renderer = UIGraphicsImageRenderer(
            size: CGSize(width: dim, height: dim),
            format: format
        )
        let image = renderer.image { ctx in
            let cg = ctx.cgContext
            let half = CGFloat(dim) / 2
            for y in 0..<dim {
                for x in 0..<dim {
                    let dx = CGFloat(x) + 0.5 - half
                    let dy = CGFloat(y) + 0.5 - half
                    let dist = hypot(dx, dy) / half
                    var hue = Double(atan2(dy, dx) * 180 / .pi + 90)
                    if hue < 0 { hue += 360 }
                    let edge = hexRadius(hue)
                    if Double(dist) > edge + 0.002 { continue }
                    let sat = min(Double(dist) / edge, 1)
                    let rgb = hsv(h: hue, s: sat, v: 1)
                    cg.setFillColor(
                        UIColor(
                            red: CGFloat(rgb.r) / 255,
                            green: CGFloat(rgb.g) / 255,
                            blue: CGFloat(rgb.b) / 255,
                            alpha: 1
                        ).cgColor
                    )
                    cg.fill(CGRect(x: x, y: y, width: 1, height: 1))
                }
            }
        }
        cached = image
        return image
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

private func clampToHex(_ location: CGPoint, size: CGFloat) -> CGPoint {
    let center = CGPoint(x: size / 2, y: size / 2)
    let dx = location.x - center.x
    let dy = location.y - center.y
    let dist = hypot(dx, dy)
    if dist < 0.5 { return center }
    var hue = atan2(dy, dx) * 180 / .pi + 90
    if hue < 0 { hue += 360 }
    let maxDist = (size / 2) * hexRadius(hue)
    if dist <= maxDist { return location }
    let scale = maxDist / dist
    return CGPoint(x: center.x + dx * scale, y: center.y + dy * scale)
}

private func location(for color: RGB, size: CGFloat) -> CGPoint {
    let hsv = rgbToHsv(color)
    let r = (size / 2) * hsv.s * hexRadius(hsv.h)
    let rad = (hsv.h - 90) * .pi / 180
    return CGPoint(
        x: size / 2 + cos(rad) * r,
        y: size / 2 + sin(rad) * r
    )
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

private func rgbToHsv(_ rgb: RGB) -> (h: Double, s: Double, v: Double) {
    let r = Double(rgb.r) / 255
    let g = Double(rgb.g) / 255
    let b = Double(rgb.b) / 255
    let maxV = max(r, g, b)
    let minV = min(r, g, b)
    let d = maxV - minV
    var h = 0.0
    if d != 0 {
        if maxV == r {
            h = ((g - b) / d).truncatingRemainder(dividingBy: 6)
        } else if maxV == g {
            h = (b - r) / d + 2
        } else {
            h = (r - g) / d + 4
        }
        h *= 60
        if h < 0 { h += 360 }
    }
    let s = maxV == 0 ? 0 : d / maxV
    return (h, s, maxV)
}

private extension RGB {
    var hex: String {
        String(format: "#%02X%02X%02X", r, g, b)
    }
}
