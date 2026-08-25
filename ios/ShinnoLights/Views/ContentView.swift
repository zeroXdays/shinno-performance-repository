import CoreBluetooth
import SwiftUI
import UIKit

private let shinnoRed = Color(red: 0.88, green: 0.02, blue: 0)

struct ContentView: View {
    @EnvironmentObject var garage: GarageStore
    @State private var tab: AppTab = .color
    @State private var showSettings = false

    var body: some View {
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
        .safeAreaInset(edge: .top, spacing: 0) {
            VStack(spacing: 0) {
                ShinnoHeader(showSettings: $showSettings)
                if garage.hub.bluetoothState == .poweredOff
                    || garage.hub.bluetoothState == .unauthorized
                    || garage.hub.bluetoothState == .unsupported
                {
                    BluetoothBanner(state: garage.hub.bluetoothState)
                }
                if let error = garage.lastError {
                    Button {
                        garage.lastError = nil
                    } label: {
                        Text(error)
                            .font(.footnote)
                            .foregroundStyle(.white)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.horizontal, 16)
                            .padding(.vertical, 8)
                            .background(Color.red.opacity(0.35))
                    }
                    .buttonStyle(.plain)
                }
            }
            .background(Color.black)
        }
        .background(Color.black.ignoresSafeArea())
        .sheet(isPresented: $showSettings) {
            SettingsView()
                .environmentObject(garage)
        }
        .onAppear { garage.hub.startScan() }
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
            VStack(alignment: .leading, spacing: 2) {
                Text("SHINNO")
                    .font(.system(size: 18, weight: .semibold))
                    .tracking(4)
                Text("Lights")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
            Spacer()
            Menu {
                ForEach(CarKind.allCases) { car in
                    Button(car.pickerLabel) {
                        garage.setCar(car)
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

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(state.title)
                .font(.subheadline.weight(.semibold))
            Text(state.detail)
                .font(.footnote)
                .foregroundStyle(.secondary)
            if state == .poweredOff || state == .unauthorized {
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
        ScrollView {
            VStack(spacing: 20) {
                if garage.controllers.isEmpty {
                    EmptyGarageCard(
                        tab: $tab,
                        title: "No devices yet",
                        detail: "Scan to add the lighting devices on your car, then set color here."
                    )
                } else {
                    HStack {
                        Menu {
                            Button("All lights") { garage.target = .all }
                            ForEach(ZoneKind.assignable) { zone in
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
                    ColorWheelView(color: live?.color ?? RGB(r: 196, g: 18, b: 32)) { garage.setColor($0) }
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
            }
            .padding()
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

struct ModesScreen: View {
    @EnvironmentObject var garage: GarageStore
    @Binding var tab: AppTab
    @State private var group: EffectGroup = .basic
    @State private var query = ""

    var items: [LedEffect] {
        let q = query.trimmingCharacters(in: .whitespacesAndNewlines).lowercased()
        if q.isEmpty { return EffectsCatalog.inGroup(group) }
        return EffectsCatalog.all.filter { $0.name.lowercased().contains(q) }
    }

    var live: PairedController? { garage.selected.first }

    var body: some View {
        VStack(spacing: 12) {
            if garage.controllers.isEmpty {
                EmptyGarageCard(
                    tab: $tab,
                    title: "No devices yet",
                    detail: "Add lighting devices on Scan before running modes."
                )
                Spacer()
            } else {
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(garage.target.title)
                            .font(.caption)
                            .foregroundStyle(.secondary)
                        Text(EffectsCatalog.named(live?.effectId) ?? "Pick a mode")
                            .font(.headline)
                    }
                    Spacer()
                }
                VStack(alignment: .leading, spacing: 4) {
                    HStack {
                        Text("Speed")
                        Spacer()
                        Text("\(live?.effectSpeed ?? 50)")
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
                            get: { Double(live?.effectSpeed ?? 50) },
                            set: { garage.setEffectSpeed(Int($0)) }
                        ),
                        in: 0...100
                    )
                    .tint(shinnoRed)
                }
                TextField("Search Auto Play, curtain, water…", text: $query)
                    .textFieldStyle(.roundedBorder)
                    .textInputAutocapitalization(.never)
                ScrollView(.horizontal, showsIndicators: false) {
                    HStack(spacing: 8) {
                        ForEach(EffectGroup.allCases) { item in
                            Button {
                                group = item
                                query = ""
                            } label: {
                                Text(item.title)
                                    .font(.caption)
                                    .padding(.horizontal, 10)
                                    .padding(.vertical, 6)
                                    .background(
                                        query.isEmpty && group == item ? Color.white : Color.white.opacity(0.1),
                                        in: Capsule()
                                    )
                                    .foregroundStyle(query.isEmpty && group == item ? .black : .white)
                            }
                        }
                    }
                }
                if items.isEmpty {
                    Text("No modes match.")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, maxHeight: .infinity)
                } else {
                    ScrollView {
                        LazyVGrid(columns: [GridItem(.flexible()), GridItem(.flexible()), GridItem(.flexible())], spacing: 8) {
                            ForEach(items) { effect in
                                Button {
                                    garage.setEffect(effect.id)
                                } label: {
                                    Text(effect.name)
                                        .font(.caption)
                                        .multilineTextAlignment(.center)
                                        .frame(maxWidth: .infinity, minHeight: 64)
                                        .padding(6)
                                        .background(
                                            RoundedRectangle(cornerRadius: 12)
                                                .stroke(
                                                    live?.effectId == effect.id ? shinnoRed : Color.white.opacity(0.12),
                                                    lineWidth: live?.effectId == effect.id ? 2 : 1
                                                )
                                        )
                                }
                                .foregroundStyle(.white)
                            }
                        }
                        .padding(.bottom, 12)
                    }
                }
            }
        }
        .padding()
        .background(Color.black.ignoresSafeArea())
    }
}

struct ScanScreen: View {
    @EnvironmentObject var garage: GarageStore

    var unpaired: [CBPeripheralLite] {
        garage.hub.discovered
            .filter { peripheral in
                !garage.controllers.contains { $0.id == peripheral.identifier }
            }
            .map { CBPeripheralLite(id: $0.identifier, name: $0.name ?? "Shinno device") }
    }

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Text(garage.hub.status)
                        .font(.subheadline)
                        .foregroundStyle(.secondary)
                    if garage.hub.bluetoothState == .poweredOn {
                        Label("Scanning continuously", systemImage: "antenna.radiowaves.left.and.right")
                            .font(.footnote)
                            .foregroundStyle(.secondary)
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
                            if garage.hub.bluetoothState == .poweredOff || garage.hub.bluetoothState == .unauthorized {
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
                        Text("No new devices yet. Power the kits on the car. Shinno Lights keeps looking.")
                            .foregroundStyle(.secondary)
                    }
                    ForEach(unpaired) { item in
                        HStack {
                            VStack(alignment: .leading, spacing: 2) {
                                Text(item.name)
                                Text("Bluetooth")
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
                            Text("Added")
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
            .navigationTitle("Scan")
            .onAppear { garage.hub.startScan() }
        }
    }
}

private struct CBPeripheralLite: Identifiable {
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
                                    ForEach(ZoneKind.assignable) { zone in
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
