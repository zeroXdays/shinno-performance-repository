import Combine
@preconcurrency import CoreBluetooth
import Foundation

enum BluetoothState: Equatable {
    case waiting
    case poweredOn
    case poweredOff
    case unauthorized
    case unsupported
    case resetting

    var title: String {
        switch self {
        case .waiting: return "Waiting for Bluetooth"
        case .poweredOn: return "Bluetooth on"
        case .poweredOff: return "Bluetooth is off"
        case .unauthorized: return "Bluetooth access is off"
        case .unsupported: return "Bluetooth LE is not available"
        case .resetting: return "Bluetooth is restarting"
        }
    }

    var detail: String {
        switch self {
        case .waiting:
            return "Shinno Sync is waiting for Bluetooth so it can find your lighting devices."
        case .poweredOn:
            return "Shinno Sync scans continuously for the lighting devices that ship with Shinno RGB kits."
        case .poweredOff:
            return "Turn Bluetooth on in iOS Settings to find and control your Shinno lighting devices."
        case .unauthorized:
            return "Allow Bluetooth for Shinno Sync in iOS Settings. The app uses it only to talk to your lighting devices."
        case .unsupported:
            return "This iPhone cannot use Bluetooth Low Energy, which Shinno Sync needs to control the kits."
        case .resetting:
            return "Bluetooth is restarting. Scanning will resume automatically."
        }
    }
}

final class BleHub: NSObject, ObservableObject {
    @Published var discovered: [CBPeripheral] = []
    @Published var scanning = false
    @Published var bluetoothReady = false
    @Published var bluetoothState: BluetoothState = .waiting
    @Published var status = "Waiting for Bluetooth"

    private var central: CBCentralManager!
    private var writeChars: [UUID: CBCharacteristic] = [:]
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var connectWaiters: [UUID: CheckedContinuation<Void, Error>] = [:]
    private var lastWrite: [UUID: Date] = [:]
    private var shouldReconnect: Set<UUID> = []
    private var retryWork = Set<UUID>()
    private var lastConnectAttempt: [UUID: Date] = [:]

    var onReady: (() -> Void)?
    var onConnected: ((UUID) -> Void)?
    var onDisconnected: ((UUID) -> Void)?

    override init() {
        super.init()
        central = CBCentralManager(
            delegate: self,
            queue: .main,
            options: [CBCentralManagerOptionRestoreIdentifierKey: "com.shinnoperformance.lights.central"]
        )
    }

    func startScan() {
        guard central.state == .poweredOn else { return }
        if !scanning {
            scanning = true
            status = "Scanning for devices"
            central.scanForPeripherals(
                withServices: nil,
                options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
            )
        } else if central.isScanning == false {
            central.scanForPeripherals(
                withServices: nil,
                options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
            )
        }
    }

    func remember(_ ids: [UUID]) {
        shouldReconnect.formUnion(ids)
    }

    func restore(_ ids: [UUID]) {
        guard central.state == .poweredOn else {
            remember(ids)
            return
        }
        remember(ids)
        let retrieved = central.retrievePeripherals(withIdentifiers: ids)
        for peripheral in retrieved {
            peripherals[peripheral.identifier] = peripheral
            peripheral.delegate = self
            connectIfNeeded(peripheral)
        }
        for peripheral in peripherals.values where ids.contains(peripheral.identifier) {
            connectIfNeeded(peripheral)
        }
    }

    private func connectIfNeeded(_ peripheral: CBPeripheral) {
        guard shouldReconnect.contains(peripheral.identifier) else { return }
        guard central.state == .poweredOn else { return }
        peripherals[peripheral.identifier] = peripheral
        peripheral.delegate = self
        switch peripheral.state {
        case .connected, .connecting:
            return
        default:
            if let last = lastConnectAttempt[peripheral.identifier], Date().timeIntervalSince(last) < 3 {
                return
            }
            lastConnectAttempt[peripheral.identifier] = Date()
            central.connect(peripheral, options: nil)
        }
    }

    private func scheduleRetry(_ peripheral: CBPeripheral) {
        let id = peripheral.identifier
        guard shouldReconnect.contains(id) else { return }
        guard !retryWork.contains(id) else { return }
        retryWork.insert(id)
        DispatchQueue.main.asyncAfter(deadline: .now() + 4) { [weak self] in
            guard let self else { return }
            self.retryWork.remove(id)
            guard self.shouldReconnect.contains(id) else { return }
            if let live = self.peripherals[id] {
                self.connectIfNeeded(live)
            } else {
                self.connectIfNeeded(peripheral)
            }
        }
    }

    func forget(_ id: UUID) {
        shouldReconnect.remove(id)
        if let peripheral = peripherals[id] {
            central.cancelPeripheralConnection(peripheral)
        }
        writeChars[id] = nil
        discovered.removeAll { $0.identifier == id }
    }

    func disconnect(_ id: UUID) {
        shouldReconnect.remove(id)
        if let peripheral = peripherals[id] {
            central.cancelPeripheralConnection(peripheral)
        }
    }

    func connect(_ peripheral: CBPeripheral) async throws {
        peripherals[peripheral.identifier] = peripheral
        peripheral.delegate = self
        shouldReconnect.insert(peripheral.identifier)
        if peripheral.state == .connected, writeChars[peripheral.identifier] != nil {
            return
        }
        let peripheralId = peripheral.identifier
        try await withCheckedThrowingContinuation { (continuation: CheckedContinuation<Void, Error>) in
            connectWaiters[peripheralId] = continuation
            central.connect(peripheral, options: nil)
            DispatchQueue.main.asyncAfter(deadline: .now() + 10) { [weak self] in
                guard let self, let waiter = self.connectWaiters.removeValue(forKey: peripheralId) else { return }
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
        case .timeout: return "The device did not accept the connection. Keep it powered and close, then try Add again."
        case .noCharacteristic: return "No writable LED characteristic was found on this device."
        }
    }
}

extension BleHub: CBCentralManagerDelegate {
    func centralManagerDidUpdateState(_ central: CBCentralManager) {
        bluetoothReady = central.state == .poweredOn
        switch central.state {
        case .poweredOn:
            bluetoothState = .poweredOn
            status = "Scanning for devices"
            onReady?()
            startScan()
        case .poweredOff:
            scanning = false
            bluetoothState = .poweredOff
            status = BluetoothState.poweredOff.detail
        case .unauthorized:
            scanning = false
            bluetoothState = .unauthorized
            status = BluetoothState.unauthorized.detail
        case .unsupported:
            scanning = false
            bluetoothState = .unsupported
            status = BluetoothState.unsupported.detail
        case .resetting:
            scanning = false
            bluetoothState = .resetting
            status = BluetoothState.resetting.detail
        default:
            scanning = false
            bluetoothState = .waiting
            status = BluetoothState.waiting.detail
        }
    }

    func centralManager(_ central: CBCentralManager, willRestoreState dict: [String: Any]) {
        let restored = dict[CBCentralManagerRestoredStatePeripheralsKey] as? [CBPeripheral] ?? []
        for peripheral in restored {
            peripherals[peripheral.identifier] = peripheral
            peripheral.delegate = self
            connectIfNeeded(peripheral)
        }
        startScan()
    }

    func centralManager(_ central: CBCentralManager, didDiscover peripheral: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
        let name = peripheral.name ?? (advertisementData[CBAdvertisementDataLocalNameKey] as? String)
        guard ElkProtocol.looksLikeController(name) else { return }
        if !discovered.contains(where: { $0.identifier == peripheral.identifier }) {
            discovered.append(peripheral)
        }
        peripherals[peripheral.identifier] = peripheral
        peripheral.delegate = self
        if shouldReconnect.contains(peripheral.identifier) {
            connectIfNeeded(peripheral)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let name = peripheral.name ?? "device"
        status = "Connected \(name)"
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectWaiters.removeValue(forKey: peripheral.identifier)?.resume(throwing: error ?? BleError.timeout)
        scheduleRetry(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        writeChars[peripheral.identifier] = nil
        onDisconnected?(peripheral.identifier)
        if shouldReconnect.contains(peripheral.identifier) {
            let name = peripheral.name ?? "device"
            status = "Reconnecting \(name)"
            central.connect(peripheral, options: nil)
        }
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
