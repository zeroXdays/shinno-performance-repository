import CoreBluetooth
import SwiftUI
import UIKit

let shinnoRed = Color(red: 196 / 255, green: 18 / 255, blue: 32 / 255)

struct ContentView: View {
    @EnvironmentObject var garage: GarageStore
    @State private var tab: AppTab = .color
    @State private var showSettings = false

    var body: some View {
        // Header sits in the main stack (not safeAreaInset) so Color/Modes
        // stage tiles can never draw underneath the logo bar.
        VStack(spacing: 0) {
            VStack(spacing: 0) {
                ShinnoHeader(showSettings: $showSettings)
                if garage.hub.bluetoothState == .poweredOff
                    || garage.hub.bluetoothState == .unauthorized
                    || garage.hub.bluetoothState == .unsupported
                    || garage.hub.bluetoothState == .waiting
                {
                    BluetoothBanner(state: garage.hub.bluetoothState) {
                        garage.hub.requestBluetoothAccess()
                    }
                }
                if let error = garage.lastError {
                    Button {
                        garage.lastError = nil
                    } label: {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.white)
                            .multilineTextAlignment(.center)
                            .frame(maxWidth: .infinity)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.35))
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color.black)

            TabView(selection: $tab) {
                ColorScreen(tab: $tab)
                    .tabItem { Label("Color", systemImage: "paintpalette.fill") }
                    .tag(AppTab.color)
                ModesScreen(tab: $tab)
                    .tabItem { Label("Modes", systemImage: "sparkles") }
                    .tag(AppTab.modes)
                ScanScreen()
                    .tabItem { Label("Scan", systemImage: "dot.radiowaves.left.and.right") }
                    .tag(AppTab.scan)
                DevicesScreen(tab: $tab)
                    .tabItem { Label("Devices", systemImage: "cpu") }
                    .tag(AppTab.devices)
            }
            .tint(shinnoRed)
        }
        .background(Color.black.ignoresSafeArea())
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(garage)
        }
        .onAppear { garage.hub.startScan() }
        .onChange(of: tab) { _, _ in
            garage.hub.startScan()
        }
    }
}

enum AppTab: Hashable {
    case color, modes, scan, devices
}

struct ShinnoHeader: View {
    @EnvironmentObject var garage: GarageStore
    @Binding var showSettings: Bool

    var body: some View {
        HStack(spacing: 12) {
            HStack(spacing: 8) {
                Image("ShinnoLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 28)
                Text("SYNC")
                    .font(.caption.weight(.semibold))
                    .tracking(2)
                    .foregroundStyle(.white.opacity(0.6))
            }
            Spacer()
            Menu {
                ForEach(CarKind.allCases) { car in
                    let count = garage.deviceCount(for: car)
                    let detail: String = {
                        if !car.enabled { return car.pickerLabel }
                        if count == 0 { return "\(car.title) · empty" }
                        return "\(car.title) · \(count)"
                    }()
                    Button {
                        garage.setCar(car)
                    } label: {
                        HStack {
                            Text(detail)
                            if car == garage.settings.car {
                                Image(systemName: "checkmark")
                            }
                        }
                    }
                    .disabled(!car.enabled)
                }
            } label: {
                Label(garage.settings.car.title, systemImage: "car.side.fill")
                    .font(.subheadline)
                    .padding(.horizontal, 10)
                    .padding(.vertical, 6)
                    .background(.white.opacity(0.08), in: Capsule())
            }
            .accessibilityLabel("Garage · \(garage.settings.car.title)")
            .accessibilityHint("Switch vehicles. Each car keeps its own paired kits.")
            Button {
                showSettings = true
            } label: {
                Image(systemName: "gearshape.fill")
                    .font(.body)
                    .padding(8)
            }
            .accessibilityLabel("Settings")
        }
        .padding(.horizontal, 16)
        .padding(.vertical, 10)
        .background(Color.black.opacity(0.9))
    }
}

struct BluetoothBanner: View {
    var state: BluetoothState
    var onAllow: (() -> Void)? = nil

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(state.title)
                .font(.subheadline.weight(.semibold))
            Text(state.detail)
                .font(.footnote)
                .foregroundStyle(.secondary)
            if state == .waiting {
                Button("Allow Bluetooth") {
                    onAllow?()
                }
                .buttonStyle(.borderedProminent)
                .tint(shinnoRed)
            } else if state == .poweredOff || state == .unauthorized {
                Button("Open Settings") {
                    if let url = URL(string: UIApplication.openSettingsURLString) {
                        UIApplication.shared.open(url)
                    }
                }
                .buttonStyle(.borderedProminent)
                .tint(shinnoRed)
            }
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(12)
        .background(Color.white.opacity(0.08))
    }
}

struct EmptyGarageCard: View {
    @Binding var tab: AppTab
    var title: String
    var detail: String

    var body: some View {
        VStack(spacing: 12) {
            Image(systemName: "dot.radiowaves.left.and.right")
                .font(.largeTitle)
                .foregroundStyle(shinnoRed)
            Text(title)
                .font(.headline)
            Text(detail)
                .font(.subheadline)
                .foregroundStyle(.secondary)
                .multilineTextAlignment(.center)
            Button("Go to Scan") { tab = .scan }
                .buttonStyle(.borderedProminent)
                .tint(shinnoRed)
        }
        .frame(maxWidth: .infinity)
        .padding(24)
    }
}

struct ColorScreen: View {
    @EnvironmentObject var garage: GarageStore
    @Binding var tab: AppTab

    var live: PairedController? { garage.selected.first }
    var powerOn: Bool {
        garage.selected.isEmpty ? false : garage.selected.allSatisfy(\.power)
    }

    var body: some View {
        VStack(spacing: 0) {
            VehicleStageView()
                .environmentObject(garage)
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 4)

            if garage.controllers.isEmpty {
                EmptyGarageCard(
                    tab: $tab,
                    title: "No devices yet",
                    detail: "Scan to add the lighting devices on your car, then set color here."
                )
                .frame(maxWidth: .infinity, maxHeight: .infinity)
                .padding(.horizontal, 16)
            } else {
                ScrollView(showsIndicators: false) {
                    VStack(spacing: 20) {
                        HStack {
                            Menu {
                                Button("All lights") { garage.target = .all }
                                ForEach(ZoneKind.assignable(for: garage.settings.car)) { zone in
                                    Button(zone.title) { garage.target = .zone(zone) }
                                }
                            } label: {
                                VStack(alignment: .leading, spacing: 2) {
                                    Text(garage.target.title)
                                        .foregroundStyle(.secondary)
                                    Text("Color")
                                        .font(.title.bold())
                                }
                            }
                            Spacer()
                            Toggle("Power", isOn: Binding(
                                get: { powerOn },
                                set: { garage.setPower($0) }
                            ))
                            .labelsHidden()
                            .tint(shinnoRed)
                            .accessibilityLabel(powerOn ? "Turn off" : "Turn on")
                        }
                        ColorWheelView(
                            color: live?.color ?? RGB(r: 196, g: 18, b: 32),
                            onChange: { garage.setColor($0, delivery: .live) },
                            onCommit: { garage.setColor($0, delivery: .commit) }
                        )
                        VStack(alignment: .leading) {
                            HStack {
                                Text("Brightness")
                                Spacer()
                                Text("\(live?.brightness ?? 80)%")
                                    .monospacedDigit()
                                    .foregroundStyle(.secondary)
                            }
                            Slider(
                                value: Binding(
                                    get: { Double(live?.brightness ?? 80) },
                                    set: { garage.setBrightness(Int($0)) }
                                ),
                                in: 1...100
                            )
                            .tint(shinnoRed)
                        }
                        HStack(spacing: 8) {
                            ForEach(Self.swatches, id: \.self) { swatch in
                                Button { garage.setColor(swatch) } label: {
                                    HexCell()
                                        .fill(swatch.color)
                                        .frame(width: 28, height: 28)
                                        .overlay(
                                            HexCell()
                                                .stroke(.white.opacity(live?.color == swatch ? 0.95 : 0.22), lineWidth: live?.color == swatch ? 2 : 1)
                                        )
                                        .shadow(color: live?.color == swatch ? swatch.color.opacity(0.7) : .clear, radius: 6)
                                }
                                .accessibilityLabel("Color swatch")
                            }
                        }
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            ForEach(GarageStore.scenes) { scene in
                                Button {
                                    garage.apply(scene)
                                } label: {
                                    VStack(spacing: 6) {
                                        HexCell()
                                            .fill(scene.color.r + scene.color.g + scene.color.b == 0 ? Color.white.opacity(0.12) : scene.color.color)
                                            .frame(width: 22, height: 22)
                                            .overlay(HexCell().stroke(.white.opacity(0.28), lineWidth: 1))
                                        Text(scene.name)
                                            .font(.caption)
                                            .foregroundStyle(.white.opacity(0.85))
                                    }
                                    .frame(maxWidth: .infinity)
                                    .padding(.vertical, 10)
                                    .background(.white.opacity(0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(.white.opacity(0.1), lineWidth: 1)
                                    )
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                    .padding(16)
                }
            }
        }
        .background(Color.black.ignoresSafeArea())
    }

    private static let swatches: [RGB] = [
        RGB(r: 196, g: 18, b: 32),
        RGB(r: 255, g: 252, b: 245),
        RGB(r: 40, g: 210, b: 255),
        RGB(r: 255, g: 150, b: 30),
        RGB(r: 150, g: 40, b: 255),
        RGB(r: 80, g: 255, b: 90),
        RGB(r: 255, g: 80, b: 160),
        RGB(r: 20, g: 80, b: 255),
    ]
}

private enum ModesBrowser: Hashable {
    case paths
    case group(EffectGroup)
}

struct ModesScreen: View {
    @EnvironmentObject var garage: GarageStore
    @Binding var tab: AppTab
    @State private var browser: ModesBrowser = .paths
    @State private var query = ""

    /// Prefer the dialect of a linked kit so G37/LEDDMX never shows Lotus ids.
    private var effectCar: CarKind {
        if garage.controllers.contains(where: { ElkProtocol.isLeddmxName($0.advertisedName) }) {
            return .g37
        }
        return garage.settings.car
    }

    var items: [LedEffect] {
        let catalog = EffectsCatalog.effects(for: effectCar)
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if !q.isEmpty { return catalog.filter { $0.name.lowercased().contains(q) } }
        if case .group(let group) = browser { return EffectsCatalog.inGroup(group, car: effectCar) }
        return []
    }

    var live: PairedController? { garage.selected.first }
    var activePath: ZonePath? { ZonePaths.named(garage.activePathId ?? "") }
    var speed: Int {
        garage.activePathId == nil ? (live?.effectSpeed ?? 50) : garage.pathSpeed
    }
    var hasDevices: Bool { !garage.controllers.isEmpty }

    var body: some View {
        VStack(spacing: 0) {
            VehicleStageView()
                .environmentObject(garage)
                .padding(.horizontal, 16)
                .padding(.top, 16)
                .padding(.bottom, 10)

            VStack(spacing: 12) {
                if !hasDevices {
                    HStack(spacing: 10) {
                        Text("Add kits on Scan to run modes on the car.")
                            .font(.caption)
                            .foregroundStyle(Color.white.opacity(0.55))
                            .frame(maxWidth: .infinity, alignment: .leading)
                        Button("Scan") { tab = .scan }
                            .font(.caption.weight(.semibold))
                            .padding(.horizontal, 12)
                            .padding(.vertical, 7)
                            .background(shinnoRed, in: Capsule())
                            .foregroundStyle(.white)
                    }
                    .padding(12)
                    .background(Color(white: 0.06), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }

                if let path = activePath {
                    VStack(alignment: .leading, spacing: 8) {
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text("Zone path")
                                    .font(.caption2)
                                    .foregroundStyle(shinnoRed)
                                Text(path.name)
                                    .font(.headline)
                                Text(path.blurb)
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Stop") { garage.stopPath() }
                                .buttonStyle(.bordered)
                        }
                        HStack(spacing: 8) {
                            ForEach(garage.settings.car.kitZones, id: \.self) { zone in
                                Text(zone.title)
                                    .font(.caption2)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(
                                        garage.activePathZones.contains(zone) ? shinnoRed.opacity(0.25) : Color.white.opacity(0.06),
                                        in: Capsule()
                                    )
                                    .overlay(
                                        Capsule().stroke(
                                            garage.activePathZones.contains(zone) ? shinnoRed.opacity(0.7) : Color.white.opacity(0.08),
                                            lineWidth: 1
                                        )
                                    )
                            }
                        }
                    }
                    .padding(12)
                    .background(Color.white.opacity(0.05), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                } else {
                    ModePlayingBar(
                        effect: EffectsCatalog.effects(for: effectCar).first { $0.id == live?.effectId },
                        speed: speed,
                        powered: live?.power == true
                    )
                }

                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text(garage.activePathId == nil ? "Speed" : "Path speed")
                        Spacer()
                        Text("\(speed)")
                            .monospacedDigit()
                            .foregroundStyle(.secondary)
                    }
                    HStack {
                        Text("Slow")
                        Spacer()
                        Text("Fast")
                    }
                    .font(.caption2)
                    .foregroundStyle(.tertiary)
                    .textCase(.uppercase)
                    Slider(
                        value: Binding(
                            get: { Double(speed) },
                            set: {
                                if garage.activePathId != nil || browser == .paths {
                                    garage.pathSpeed = Int($0)
                                } else if hasDevices {
                                    garage.setEffectSpeed(Int($0))
                                } else {
                                    garage.pathSpeed = Int($0)
                                }
                            }
                        ),
                        in: 0...100
                    )
                    .tint(shinnoRed)
                    .disabled(!hasDevices && garage.activePathId == nil)
                }

                if browser != .paths {
                    TextField("Search Auto Play, curtain, water…", text: $query)
                        .textFieldStyle(.roundedBorder)
                        .textInputAutocapitalization(.never)
                } else {
                    Text("Phone-timed zone chases across Emblem, Mirrors, and Bumper. Built-in modes stay on one device.")
                        .font(.caption)
                        .foregroundStyle(Color.white.opacity(0.65))
                }

                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        modeChip("Paths", selected: query.isEmpty && browser == .paths) {
                            browser = .paths
                            query = ""
                        }
                        ForEach(EffectGroup.allCases) { item in
                            modeChip(item.title, selected: query.isEmpty && browser == .group(item)) {
                                browser = .group(item)
                                query = ""
                            }
                        }
                    }
                }

                if browser == .paths && query.isEmpty {
                    ScrollView(showsIndicators: false) {
                        LazyVGrid(
                            columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                            spacing: 10
                        ) {
                            ForEach(ZonePaths.forCar(garage.settings.car)) { path in
                                Button {
                                    guard hasDevices else {
                                        tab = .scan
                                        return
                                    }
                                    if garage.activePathId == path.id {
                                        garage.stopPath()
                                    } else {
                                        garage.startPath(path.id)
                                    }
                                } label: {
                                    VStack(alignment: .leading, spacing: 8) {
                                        HexCell()
                                            .fill(path.swatch.color)
                                            .frame(width: 22, height: 22)
                                            .overlay(HexCell().stroke(.white.opacity(0.4), lineWidth: 1))
                                        Text(path.name)
                                            .font(.subheadline.weight(.semibold))
                                            .foregroundStyle(.white)
                                            .lineLimit(1)
                                        Text(path.blurb)
                                            .font(.caption2)
                                            .foregroundStyle(Color.white.opacity(0.68))
                                            .multilineTextAlignment(.leading)
                                            .lineLimit(3)
                                            .fixedSize(horizontal: false, vertical: true)
                                        Spacer(minLength: 0)
                                    }
                                    .frame(maxWidth: .infinity, minHeight: 116, alignment: .topLeading)
                                    .padding(12)
                                    .background(Color(white: 0.09), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                                            .stroke(
                                                garage.activePathId == path.id ? shinnoRed : Color.white.opacity(0.2),
                                                lineWidth: 1
                                            )
                                    )
                                    .opacity(hasDevices ? 1 : 0.72)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(10)
                        .background(Color(white: 0.05), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 16, style: .continuous)
                                .stroke(shinnoRed.opacity(0.35), lineWidth: 1)
                        )
                        .padding(.bottom, 8)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else if items.isEmpty {
                    Text("No modes match.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView(showsIndicators: false) {
                        LazyVGrid(
                            columns: [
                                GridItem(.flexible(), spacing: 8),
                                GridItem(.flexible(), spacing: 8),
                                GridItem(.flexible(), spacing: 8),
                            ],
                            spacing: 8
                        ) {
                            ForEach(items) { effect in
                                Button {
                                    guard hasDevices else {
                                        tab = .scan
                                        return
                                    }
                                    garage.setEffect(effect.id)
                                } label: {
                                    VStack(spacing: 6) {
                                        ModeGlyphView(
                                            effect: effect,
                                            speed: speed,
                                            // Always preview-animate like the web ModeGlyph —
                                            // freezing at t=0 makes every tile look like the same RGB bar.
                                            animate: true,
                                            active: hasDevices && live?.power == true && live?.effectId == effect.id
                                        )
                                            .aspectRatio(1, contentMode: .fit)
                                            .frame(maxWidth: .infinity)
                                            .opacity(hasDevices && live?.effectId != nil && live?.effectId != effect.id ? 0.72 : 1)
                                        Text(effect.name)
                                            .font(.caption2)
                                            .foregroundStyle(Color.white.opacity(0.75))
                                            .multilineTextAlignment(.center)
                                            .lineLimit(2)
                                            .minimumScaleFactor(0.85)
                                            .frame(minHeight: 28, alignment: .top)
                                    }
                                    .padding(6)
                                    .frame(maxWidth: .infinity)
                                    .background(Color(white: 0.05), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                                    .overlay(
                                        RoundedRectangle(cornerRadius: 12, style: .continuous)
                                            .stroke(
                                                live?.effectId == effect.id && garage.activePathId == nil
                                                    ? shinnoRed.opacity(0.7)
                                                    : Color.white.opacity(0.08),
                                                lineWidth: live?.effectId == effect.id && garage.activePathId == nil ? 2 : 1
                                            )
                                    )
                                    .opacity(hasDevices ? 1 : 0.72)
                                }
                                .buttonStyle(.plain)
                            }
                        }
                        .padding(.bottom, 12)
                    }
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
            .padding(.horizontal, 16)
            .padding(.bottom, 8)
            .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .top)
        }
        .background(Color.black.ignoresSafeArea())
    }

    private func modeChip(_ title: String, selected: Bool, action: @escaping () -> Void) -> some View {
        Button(action: action) {
            Text(title)
                .font(.caption.weight(selected ? .semibold : .regular))
                .padding(.horizontal, 10)
                .padding(.vertical, 6)
                .background(selected ? shinnoRed : Color.white.opacity(0.1), in: Capsule())
                .overlay(
                    Capsule().stroke(selected ? shinnoRed : Color.white.opacity(0.18), lineWidth: 1)
                )
                .foregroundStyle(.white)
        }
        .buttonStyle(.plain)
    }
}

/// Compact live preview above the modes browser — matches web PlayingBar.
private struct ModePlayingBar: View {
    var effect: LedEffect?
    var speed: Int
    var powered: Bool

    var body: some View {
        VStack(spacing: 6) {
            if let effect, powered {
                ModeGlyphView(effect: effect, speed: speed)
                    .frame(width: 96, height: 96)
            } else {
                Text(effect == nil ? "Pick a mode" : "Power off")
                    .font(.caption)
                    .foregroundStyle(Color.white.opacity(0.35))
                    .frame(width: 96, height: 96)
            }
            Text(effect?.name ?? "Paths run across zones")
                .font(.caption)
                .foregroundStyle(Color.white.opacity(0.5))
                .lineLimit(1)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 8)
        .background(Color(white: 0.04), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        .overlay(
            RoundedRectangle(cornerRadius: 14, style: .continuous)
                .stroke(Color.white.opacity(0.08), lineWidth: 1)
        )
    }
}

/// Animated LED glyph for each mode tile — same sampler + paths as web ModeGlyph.
struct ModeGlyphView: View {
    var effect: LedEffect
    var speed: Int
    /// When false, freeze on a static preview frame.
    var animate: Bool = true
    /// Currently playing on a linked kit — full brightness; others stay readable.
    var active: Bool = false

    private let ledCount = 20

    var body: some View {
        let motion = EffectPreview.motion(for: effect)
        TimelineView(.animation(minimumInterval: animate ? 1.0 / 20.0 : 60)) { timeline in
            Canvas { context, size in
                let points = EffectPreview.pathPoints(motion: motion, ledCount: ledCount, in: size)
                if points.count >= 2 {
                    var stroke = Path()
                    stroke.move(to: points[0])
                    for point in points.dropFirst() { stroke.addLine(to: point) }
                    context.stroke(stroke, with: .color(Color.white.opacity(0.12)), lineWidth: 2.2)
                }
                let elapsedMs = animate
                    ? timeline.date.timeIntervalSinceReferenceDate * 1000
                    : EffectPreview.periodMs(speed: speed, motion: motion) * 0.18
                let dim = active || !animate ? 1.0 : 0.85
                let ledR = min(size.width, size.height) * 0.033
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
                    // Soft glow so tails/runs read like the web drop-shadow glyphs.
                    context.fill(
                        Path(ellipseIn: CGRect(
                            x: point.x - ledR * 1.8,
                            y: point.y - ledR * 1.8,
                            width: ledR * 3.6,
                            height: ledR * 3.6
                        )),
                        with: .color(color.opacity(0.22))
                    )
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
    }
}

struct ScanScreen: View {
    @EnvironmentObject var garage: GarageStore

    var unpaired: [CBPeripheralLite] {
        garage.hub.discovered
            .filter { peripheral in
                let name = garage.hub.displayName(for: peripheral.identifier)
                guard ElkProtocol.allowed(for: garage.settings.car, name: name) else { return false }
                return !garage.controllers.contains { $0.id == peripheral.identifier }
            }
            .map {
                CBPeripheralLite(
                    id: $0.identifier,
                    name: garage.hub.displayName(for: $0.identifier)
                )
            }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(garage.hub.status)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if garage.hub.bluetoothState == .poweredOn {
                        HStack {
                            Label(
                                garage.hub.scanning ? "Looking for kits" : "Scan paused",
                                systemImage: "antenna.radiowaves.left.and.right"
                            )
                            .font(.footnote)
                            .foregroundStyle(.secondary)
                            Spacer()
                            Button("Rescan") {
                                garage.hub.startScan()
                            }
                            .font(.footnote.weight(.semibold))
                            .tint(shinnoRed)
                        }
                    }
                }

                if garage.hub.bluetoothState != .poweredOn {
                    Section {
                        VStack(alignment: .leading, spacing: 10) {
                            Text(garage.hub.bluetoothState.title)
                                .font(.headline)
                            Text(garage.hub.bluetoothState.detail)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            if garage.hub.bluetoothState == .waiting {
                                Button("Allow Bluetooth") {
                                    garage.hub.requestBluetoothAccess()
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(shinnoRed)
                            } else if garage.hub.bluetoothState == .poweredOff || garage.hub.bluetoothState == .unauthorized {
                                Button("Open Settings") {
                                    if let url = URL(string: UIApplication.openSettingsURLString) {
                                        UIApplication.shared.open(url)
                                    }
                                }
                            }
                        }
                        .padding(.vertical, 4)
                    }
                }

                Section("Nearby") {
                    if unpaired.isEmpty, garage.hub.bluetoothState == .poweredOn {
                        Text("No kits yet. Power the lighting boxes, stand near the car, then tap Rescan.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(unpaired) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                Text(modelHint(item.name))
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Add") {
                                if let peripheral = garage.hub.discovered.first(where: { $0.identifier == item.id }) {
                                    Task { await garage.pair(peripheral) }
                                }
                            }
                            .buttonStyle(.borderedProminent)
                            .tint(shinnoRed)
                        }
                    }
                    ForEach(garage.controllers) { controller in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(controller.name)
                                Text(controller.advertisedName)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Text(controller.connected ? "Connected" : "Added")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Scan")
            .onAppear {
                garage.hub.requestBluetoothAccess()
                garage.hub.startScan()
            }
        }
    }

    private func modelHint(_ name: String) -> String {
        "Bluetooth · tap Add to pair"
    }
}

struct CBPeripheralLite: Identifiable {
    let id: UUID
    let name: String
}

struct DevicesScreen: View {
    @EnvironmentObject var garage: GarageStore
    @Binding var tab: AppTab

    var body: some View {
        NavigationStack {
            Group {
                if garage.controllers.isEmpty {
                    ContentUnavailableView {
                        Label("No devices", systemImage: "cpu")
                    } description: {
                        Text("Scan to add the lighting devices on your car. Assign Emblem, Mirrors, or Bumper after they join.")
                    } actions: {
                        Button("Go to Scan") { tab = .scan }
                            .buttonStyle(.borderedProminent)
                            .tint(shinnoRed)
                    }
                } else {
                    List {
                        ForEach(garage.controllers) { controller in
                            VStack(alignment: .leading, spacing: 10) {
                                HStack {
                                    Circle()
                                        .fill(controller.connected ? (controller.power ? controller.color.color : .gray) : Color.white.opacity(0.25))
                                        .frame(width: 10, height: 10)
                                    TextField("Name", text: Binding(
                                        get: { controller.name },
                                        set: { garage.rename(controller.id, $0) }
                                    ))
                                    Button("Remove", role: .destructive) {
                                        garage.forget(controller.id)
                                    }
                                }
                                Picker("Zone", selection: Binding(
                                    get: { controller.zone },
                                    set: { garage.setZone(controller.id, $0) }
                                )) {
                                    ForEach(ZoneKind.assignable(for: garage.settings.car)) { zone in
                                        Text(zone.title).tag(zone)
                                    }
                                }
                                HStack {
                                    Text(controller.advertisedName)
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                    Spacer()
                                    Text(controller.connected ? "Connected" : "Disconnected")
                                        .font(.caption)
                                        .foregroundStyle(.secondary)
                                }
                                HStack {
                                    Button(controller.connected ? "Disconnect" : "Connect") {
                                        if controller.connected {
                                            garage.disconnect(controller.id)
                                        } else {
                                            Task { await garage.connect(controller.id) }
                                        }
                                    }
                                    .buttonStyle(.bordered)
                                    Spacer()
                                }
                            }
                            .padding(.vertical, 4)
                        }
                        .onDelete { indexSet in
                            let ids = indexSet.map { garage.controllers[$0].id }
                            ids.forEach { garage.forget($0) }
                        }
                        Button("Clear all", role: .destructive) {
                            garage.forgetAll()
                        }
                    }
                }
            }
            .navigationTitle("Devices")
        }
    }
}
