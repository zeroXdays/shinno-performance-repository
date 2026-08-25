import SwiftUI

struct ContentView: View {
    @EnvironmentObject var garage: GarageStore
    @State private var tab = 0

    var body: some View {
        TabView(selection: $tab) {
            GarageScreen()
                .tabItem { Label("Garage", systemImage: "car.side.fill") }
                .tag(0)
            ColorScreen()
                .tabItem { Label("Color", systemImage: "paintpalette.fill") }
                .tag(1)
            ScanScreen()
                .tabItem { Label("Scan", systemImage: "dot.radiowaves.left.and.right") }
                .tag(2)
        }
        .tint(Color(red: 0.88, green: 0.02, blue: 0))
    }
}

struct GarageScreen: View {
    @EnvironmentObject var garage: GarageStore

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(alignment: .leading, spacing: 18) {
                    Text("SHINNO")
                        .font(.system(size: 28, weight: .semibold, design: .default))
                        .tracking(8)
                    Text("Lights for Q50 / Q60")
                        .foregroundStyle(.secondary)
                    SceneRow()
                    ForEach($garage.controllers) { $controller in
                        VStack(alignment: .leading, spacing: 8) {
                            HStack {
                                Circle()
                                    .fill(controller.power ? controller.color.color : .gray)
                                    .frame(width: 10, height: 10)
                                TextField("Name", text: $controller.name)
                                Spacer()
                                Text(controller.connected ? "Linked" : "Idle")
                                    .font(.caption)
                                    .foregroundStyle(.secondary)
                            }
                            Picker("Zone", selection: $controller.zone) {
                                ForEach(ZoneKind.allCases) { zone in
                                    Text(zone.title).tag(zone)
                                }
                            }
                            Text(controller.advertisedName)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                        .padding()
                        .background(.ultraThinMaterial, in: RoundedRectangle(cornerRadius: 18))
                    }
                    if garage.controllers.isEmpty {
                        ContentUnavailableView(
                            "No controllers",
                            systemImage: "car.side",
                            description: Text("Scan for the ELK boxes that shipped with your Shinno RGB kits. Lotus Lantern lists serials. This app groups them as one car.")
                        )
                    }
                }
                .padding()
            }
            .background(Color.black.ignoresSafeArea())
            .navigationBarHidden(true)
        }
    }
}

struct SceneRow: View {
    @EnvironmentObject var garage: GarageStore

    var body: some View {
        ScrollView(.horizontal, showsIndicators: false) {
            HStack {
                ForEach(GarageStore.scenes) { scene in
                    Button {
                        garage.apply(scene)
                    } label: {
                        VStack(alignment: .leading, spacing: 8) {
                            Capsule().fill(scene.color.color).frame(width: 36, height: 6)
                            Text(scene.name).foregroundStyle(.white)
                        }
                        .padding()
                        .frame(width: 130, alignment: .leading)
                        .background(Color.white.opacity(0.08), in: RoundedRectangle(cornerRadius: 16))
                    }
                }
            }
        }
    }
}

struct ColorScreen: View {
    @EnvironmentObject var garage: GarageStore

    var live: PairedController? { garage.selected.first }

    var body: some View {
        VStack(spacing: 20) {
            HStack {
                VStack(alignment: .leading) {
                    Text(garage.target == nil ? "All zones" : live?.name ?? "Zone")
                        .foregroundStyle(.secondary)
                    Text("Color")
                        .font(.title.bold())
                }
                Spacer()
                Toggle("Power", isOn: Binding(
                    get: { live?.power ?? false },
                    set: { garage.setPower($0) }
                ))
                .labelsHidden()
                .tint(Color(red: 0.88, green: 0.02, blue: 0))
            }
            ColorWheelView(color: live?.color ?? RGB(r: 196, g: 18, b: 32)) { garage.setColor($0) }
            VStack(alignment: .leading) {
                HStack {
                    Text("Brightness")
                    Spacer()
                    Text("\(live?.brightness ?? 80)%")
                }
                Slider(
                    value: Binding(
                        get: { Double(live?.brightness ?? 80) },
                        set: { garage.setBrightness(Int($0)) }
                    ),
                    in: 1...100
                )
            }
            HStack {
                ForEach([RGB(r: 196, g: 18, b: 32), RGB(r: 255, g: 252, b: 245), RGB(r: 40, g: 210, b: 255), RGB(r: 255, g: 150, b: 30)], id: \.self) { swatch in
                    Button { garage.setColor(swatch) } label: {
                        Circle().fill(swatch.color).frame(width: 28, height: 28)
                    }
                }
            }
            Spacer()
        }
        .padding()
        .background(Color.black.ignoresSafeArea())
    }
}

struct ScanScreen: View {
    @EnvironmentObject var garage: GarageStore

    var body: some View {
        NavigationStack {
            List {
                Section {
                    Button(garage.hub.scanning ? "Scanning…" : "Scan for Shinno boxes") {
                        garage.hub.startScan()
                    }
                    Text(garage.hub.status)
                        .font(.caption)
                        .foregroundStyle(.secondary)
                }
                Section("Nearby") {
                    ForEach(garage.hub.discovered, id: \.identifier) { peripheral in
                        HStack {
                            VStack(alignment: .leading) {
                                Text(peripheral.name ?? "ELK controller")
                                Text(peripheral.identifier.uuidString)
                                    .font(.caption2)
                                    .foregroundStyle(.secondary)
                            }
                            Spacer()
                            Button("Add") {
                                Task { await garage.pair(peripheral) }
                            }
                        }
                    }
                }
            }
            .navigationTitle("Scan")
        }
    }
}
