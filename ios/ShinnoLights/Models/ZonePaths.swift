import Foundation

struct ZonePath: Identifiable, Equatable {
    let id: String
    let name: String
    let blurb: String
    let steps: [[ZoneKind]]
    let restOff: Bool
    let swatch: RGB
}

enum ZonePaths {
    static let all: [ZonePath] = [
        .init(
            id: "around",
            name: "Around",
            blurb: "Mirrors → emblem → bumper → emblem → mirrors",
            steps: [[.mirrors], [.emblem], [.bumper], [.emblem], [.mirrors]],
            restOff: true,
            swatch: RGB(r: 196, g: 18, b: 32)
        ),
        .init(
            id: "emblem-bumper",
            name: "Emblem–bumper",
            blurb: "Emblem ↔ front bumper (fog-light zone)",
            steps: [[.emblem], [.bumper], [.emblem], [.bumper]],
            restOff: false,
            swatch: RGB(r: 40, g: 210, b: 255)
        ),
        .init(
            id: "wings",
            name: "Wings",
            blurb: "Mirrors flare, then the rest of the car",
            steps: [[.mirrors], [.mirrors, .emblem], [.emblem, .bumper], [.bumper]],
            restOff: true,
            swatch: RGB(r: 150, g: 40, b: 255)
        ),
        .init(
            id: "pulse",
            name: "Pulse",
            blurb: "All paired zones breathe together",
            steps: [[.emblem, .mirrors, .bumper], []],
            restOff: true,
            swatch: RGB(r: 255, g: 150, b: 30)
        ),
        .init(
            id: "sweep",
            name: "Sweep",
            blurb: "One zone at a time across the garage",
            steps: [[.mirrors], [.emblem], [.bumper]],
            restOff: false,
            swatch: RGB(r: 80, g: 255, b: 90)
        ),
    ]

    static func named(_ id: String) -> ZonePath? {
        all.first { $0.id == id }
    }

    /// Paths whose steps only use kit zones for this car (G37 emblem-only keeps Pulse).
    static func forCar(_ car: CarKind) -> [ZonePath] {
        let allowed = Set(car.kitZones)
        return all.compactMap { path in
            let steps = path.steps.map { step in step.filter { allowed.contains($0) } }
            let lostStep = zip(path.steps, steps).contains { original, clipped in
                !original.isEmpty && clipped.isEmpty
            }
            guard !lostStep, steps.contains(where: { !$0.isEmpty }) else { return nil }
            return ZonePath(
                id: path.id,
                name: path.name,
                blurb: path.blurb,
                steps: steps,
                restOff: path.restOff,
                swatch: path.swatch
            )
        }
    }

    static func named(_ id: String, for car: CarKind) -> ZonePath? {
        forCar(car).first { $0.id == id }
    }

    static func stepMs(speed: Int) -> Double {
        let t = 1 - Double(min(100, max(0, speed))) / 100
        return 220 + t * 780
    }

    static func dimBrightness(_ brightness: Int) -> Int {
        max(4, Int((Double(brightness) * 0.12).rounded()))
    }
}
