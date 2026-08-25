import SwiftUI

@main
struct ShinnoLightsApp: App {
    @StateObject private var garage = GarageStore()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(garage)
                .preferredColorScheme(.dark)
        }
    }
}
