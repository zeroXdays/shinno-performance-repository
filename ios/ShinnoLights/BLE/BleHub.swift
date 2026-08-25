import Combine
import CoreBluetooth
import Foundation

final class BleHub: NSObject, ObservableObject {
    @Published var discovered: [CBPeripheral] = []
    @Published var scanning = false
    @Published var bluetoothReady = false
    @Published var status = "Waiting for Bluetooth"

    private var central: CBCentralManager!
    private var writeChars: [UUID: CBCharacteristic] = [:]
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var connectWaiters: [UUID: CheckedContinuation<Void, Error>] = [:]
    private var lastWrite: [UUID: Date] = [:]

    var onReady: (() -> Void)?
    var onConnected: ((UUID) -> Void)?

    override init() {
        super.init()
        central = CBCentralManager(delegate: self, queue: .main)
    }

    func startScan() {
        guard central.state == .poweredOn else { return }
        if !scanning {
            scanning = true
            status = "Scanning for devices"
            central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: false])
        }
    }

    func restore(_ ids: [UUID]) {
        guard central.state == .poweredOn else { return }
        for peripheral in central.retrievePeripherals(withIdentifiers: ids) {
            peripherals[peripheral.identifier] = peripheral
            peripheral.delegate = self
            if peripheral.state != .connected {
                central.connect(peripheral, options: nil)
            }
        }
    }

    func stopScan() {
        central.stopScan()
        scanning = false
        if status == "Scanning for devices" {
            status = discovered.isEmpty ? "No devices nearby" : "Scan complete"
        }
    }

    func connect(_ peripheral: CBPeripheral) async throws {
        peripherals[peripheral.identifier] = peripheral
        peripheral.delegate = self
        if peripheral.state == .connected, writeChars[peripheral.identifier] != nil {
            return
        }
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connectWaiters[peripheral.identifier] = continuation
            central.connect(peripheral, options: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self, let waiter = self.connectWaiters.removeValue(forKey: peripheral.identifier) else { return }
                waiter.resume(throwing: BleError.timeout)
            }
        }
    }

    func peripheral(id: UUID) -> CBPeripheral? {
        peripherals[id]
    }

    func write(_ peripheral: CBPeripheral, frames: [Data]) {
        guard let characteristic = writeChars[peripheral.identifier] else { return }
        for (index, frame) in frames.enumerated() {
            let delay = 0.022 * Double(index)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) {
                peripheral.writeValue(frame, for: characteristic, type: .withoutResponse)
            }
        }
        lastWrite[peripheral.identifier] = Date()
    }
}

enum BleError: LocalizedError {
    case timeout
    case noCharacteristic

    var errorDescription: String? {
        switch self {
        case .timeout: return "The controller did not accept the connection."
        case .noCharacteristic: return "No writable LED characteristic was found."
        }
    }
}

extension BleHub: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        bluetoothReady = central.state == .poweredOn
        if bluetoothReady {
            status = "Bluetooth on"
            onReady?()
            startScan()
        } else {
            scanning = false
            status = "Turn Bluetooth on"
        }
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
        guard ElkProtocol.looksLikeController(name) else { return }
        if !discovered.contains(where: { $0.identifier == peripheral.identifier }) {
            discovered.append(peripheral)
        }
        peripherals[peripheral.identifier] = peripheral
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        status = "Connected \(peripheral.name ?? "controller")"
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectWaiters.removeValue(forKey: peripheral.identifier)?.resume(throwing: error ?? BleError.timeout)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        writeChars[peripheral.identifier] = nil
        status = "Reconnecting \(peripheral.name ?? "controller")"
        central.connect(peripheral, options: nil)
    }
}

extension BleHub: CBPeripheralDelegate {
    func peripheral(_ peripheral: CBPeripheral, didDiscoverServices error: Error?) {
        peripheral.services?.forEach { peripheral.discoverCharacteristics(nil, for: $0) }
    }

    func peripheral(_ peripheral: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
        let preferred = [ElkProtocol.fff3, ElkProtocol.ffe1]
        if let match = service.characteristics?.first(where: { preferred.contains($0.uuid) })
            ?? service.characteristics?.first(where: { $0.properties.contains(.writeWithoutResponse) || $0.properties.contains(.write) })
        {
            writeChars[peripheral.identifier] = match
            onConnected?(peripheral.identifier)
            connectWaiters.removeValue(forKey: peripheral.identifier)?.resume()
        } else if peripheral.services?.allSatisfy({ $0.characteristics != nil }) == true, writeChars[peripheral.identifier] == nil {
            connectWaiters.removeValue(forKey: peripheral.identifier)?.resume(throwing: BleError.noCharacteristic)
        }
    }
}
