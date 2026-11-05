import SwiftUI

@main
struct ShinnoLightsApp: App {
    @StateObject private var garage = GarageStore()
    @Environment(\.scenePhase) private var scenePhase

    var body: some Scene {
        WindowGroup {
            PurchaseGateView {
                ContentView()
                    .environmentObject(garage)
            }
            .preferredColorScheme(.dark)
            .tint(Color(red: 0.88, green: 0.02, blue: 0))
        }
        .onChange(of: scenePhase) { _, phase in
            if phase == .active {
                garage.hub.requestBluetoothAccess()
                garage.hub.startScan()
                if garage.settings.autoConnect {
                    garage.restoreConnections()
                }
            }
        }
    }
}
