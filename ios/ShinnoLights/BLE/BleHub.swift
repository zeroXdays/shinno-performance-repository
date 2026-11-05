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
            return "Shinno Sync needs Bluetooth permission to find your lighting devices. Tap Allow when iOS asks."
        case .poweredOn:
            return "Shinno Sync scans for Shinno RGB kits, including G37 emblem controllers that advertise as ELK-BLEDDM."
        case .poweredOff:
            return "Turn Bluetooth on in iOS Settings to find and control your Shinno lighting devices."
        case .unauthorized:
            return "Allow Bluetooth for Shinno Sync in iOS Settings → Shinno Sync. The app uses it only to talk to your lighting devices."
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
    /// Local names from advertisements — `peripheral.name` is often nil until connect.
    @Published var advertisedNames: [UUID: String] = [:]

    private var central: CBCentralManager!
    private var writeChars: [UUID: CBCharacteristic] = [:]
    private var writableByUUID: [UUID: [CBUUID: CBCharacteristic]] = [:]
    private var notifyChars: [UUID: CBCharacteristic] = [:]
    private var handshook: Set<UUID> = []
    private var handshakePending: Set<UUID> = []
    private var peripherals: [UUID: CBPeripheral] = [:]
    private var connectWaiters: [UUID: CheckedContinuation<Void, Error>] = [:]
    private var lastWrite: [UUID: Date] = [:]
    private var shouldReconnect: Set<UUID> = []
    private var retryWork = Set<UUID>()
    private var lastConnectAttempt: [UUID: Date] = [:]
    private let restoreId = "com.shinnoperformance.lights.central"

    var onReady: (() -> Void)?
    var onConnected: ((UUID) -> Void)?
    var onDisconnected: ((UUID) -> Void)?

    override init() {
        super.init()
        // Creating CBCentralManager is what triggers the iOS Bluetooth permission sheet.
        // Avoid restore-identifier on first launch — it can skip the prompt on some iOS builds.
        createCentral(withRestore: CBCentralManager.authorization == .allowedAlways)
    }

    private func createCentral(withRestore: Bool) {
        var options: [String: Any] = [
            CBCentralManagerOptionShowPowerAlertKey: true,
        ]
        if withRestore {
            options[CBCentralManagerOptionRestoreIdentifierKey] = restoreId
        }
        central = CBCentralManager(delegate: self, queue: .main, options: options)
        applyAuthorization()
    }

    /// Re-create the central manager so iOS shows the permission dialog if still notDetermined.
    func requestBluetoothAccess() {
        applyAuthorization()
        switch CBCentralManager.authorization {
        case .notDetermined:
            // Tear down and rebuild — first CBCentralManager init is what presents the system sheet.
            central = nil
            createCentral(withRestore: false)
            status = "Allow Bluetooth when iOS asks"
        case .denied, .restricted:
            bluetoothState = .unauthorized
            status = BluetoothState.unauthorized.detail
        case .allowedAlways:
            if central.state == .poweredOn {
                startScan()
            } else {
                createCentral(withRestore: true)
            }
        @unknown default:
            createCentral(withRestore: false)
        }
    }

    private func applyAuthorization() {
        switch CBCentralManager.authorization {
        case .denied, .restricted:
            bluetoothState = .unauthorized
            scanning = false
            bluetoothReady = false
            status = BluetoothState.unauthorized.detail
        case .notDetermined:
            bluetoothState = .waiting
            bluetoothReady = false
            status = "Allow Bluetooth when iOS asks"
        case .allowedAlways:
            break
        @unknown default:
            break
        }
    }

    func displayName(for id: UUID) -> String {
        if let ad = advertisedNames[id], !ad.isEmpty { return ad }
        if let live = peripherals[id]?.name, !live.isEmpty { return live }
        if let found = discovered.first(where: { $0.identifier == id })?.name, !found.isEmpty {
            return found
        }
        return "Shinno lighting device"
    }

    func startScan() {
        applyAuthorization()
        guard CBCentralManager.authorization != .denied,
              CBCentralManager.authorization != .restricted
        else {
            bluetoothState = .unauthorized
            status = BluetoothState.unauthorized.detail
            return
        }
        if CBCentralManager.authorization == .notDetermined {
            requestBluetoothAccess()
            return
        }
        guard central.state == .poweredOn else {
            status = bluetoothState.detail
            return
        }
        scanning = true
        if central.isScanning {
            central.stopScan()
        }
        // Allow duplicates — first ads are often nameless; LED-DMX / BLEDDM
        // usually only put the local name on a later advertisement.
        central.scanForPeripherals(
            withServices: nil,
            options: [CBCentralManagerScanOptionAllowDuplicatesKey: true]
        )
        refreshStatus()
    }

    func refreshStatus() {
        guard bluetoothState == .poweredOn else {
            status = bluetoothState.detail
            return
        }
        let n = discovered.count
        if n == 0 {
            status = "Scanning for ELK-BLEDDM / ELK-BLEDOM kits…"
        } else {
            status = "Found \(n) nearby · keep kits powered"
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
        writableByUUID[id] = nil
        notifyChars[id] = nil
        handshook.remove(id)
        handshakePending.remove(id)
        advertisedNames[id] = nil
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
                guard let hub = self else { return }
                guard let waiter = hub.connectWaiters.removeValue(forKey: peripheralId) else { return }
                waiter.resume(throwing: BleError.timeout)
            }
        }
    }

    func peripheral(id: UUID) -> CBPeripheral? {
        peripherals[id]
    }

    func writableUUIDs(for id: UUID) -> [CBUUID] {
        guard let map = writableByUUID[id] else { return [] }
        return Array(map.keys)
    }

    func write(_ peripheral: CBPeripheral, frames: [Data], prefer preferUUID: CBUUID? = nil) {
        let map = writableByUUID[peripheral.identifier] ?? [:]
        let characteristic =
            (preferUUID.flatMap { map[$0] })
            ?? writeChars[peripheral.identifier]
            ?? map[ElkProtocol.fff3]
            ?? map[ElkProtocol.ffe1]
            ?? map.values.first
        guard let characteristic else { return }

        let name = displayName(for: peripheral.identifier)
        let isLeddmx = ElkProtocol.isLeddmxName(name) || characteristic.uuid == ElkProtocol.ffe1
        // LED+LAMP uses write-with-response by default; withoutResponse is often ignored.
        let writeType: CBCharacteristicWriteType = {
            if isLeddmx, characteristic.properties.contains(.write) {
                return .withResponse
            }
            if characteristic.properties.contains(.writeWithoutResponse) {
                return .withoutResponse
            }
            return .withResponse
        }()

        ensureLeddmxReady(peripheral)

        // LEDDMX / FFE0 kits need ~50–80ms between writes or they drop frames.
        // Hold command frames until the 2A handshake has been sent (~0.45s).
        let gap = isLeddmx ? 0.08 : 0.04
        let lead: Double = {
            guard isLeddmx else { return 0 }
            return handshook.contains(peripheral.identifier) ? 0 : 0.5
        }()
        for (index, frame) in frames.enumerated() {
            let delay = lead + gap * Double(index)
            DispatchQueue.main.asyncAfter(deadline: .now() + delay) { [weak peripheral] in
                guard let peripheral else { return }
                if writeType == .withoutResponse, !peripheral.canSendWriteWithoutResponse {
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.05) {
                        peripheral.writeValue(frame, for: characteristic, type: writeType)
                    }
                } else {
                    peripheral.writeValue(frame, for: characteristic, type: writeType)
                }
            }
        }
        lastWrite[peripheral.identifier] = Date()
    }

    /// LEDDMX ignores commands until the 2A handshake (+ notify) lands after connect.
    private func ensureLeddmxReady(_ peripheral: CBPeripheral) {
        let id = peripheral.identifier
        guard ElkProtocol.isLeddmxName(displayName(for: id)) else { return }
        guard !handshook.contains(id), !handshakePending.contains(id) else { return }
        guard let characteristic = writeChars[id] ?? writableByUUID[id]?[ElkProtocol.ffe1] else { return }

        handshakePending.insert(id)
        let notify = notifyChars[id] ?? characteristic
        if notify.properties.contains(.notify) || notify.properties.contains(.indicate) {
            peripheral.setNotifyValue(true, for: notify)
        }

        let writeType: CBCharacteristicWriteType =
            characteristic.properties.contains(.write) ? .withResponse : .withoutResponse

        // Match LED+LAMP: wait ~300ms after GATT is up, then auth + status probe.
        DispatchQueue.main.asyncAfter(deadline: .now() + 0.3) { [weak self, weak peripheral] in
            guard let self, let peripheral else { return }
            peripheral.writeValue(ElkProtocol.leddmxHandshake(), for: characteristic, type: writeType)
            DispatchQueue.main.asyncAfter(deadline: .now() + 0.1) { [weak self] in
                peripheral.writeValue(ElkProtocol.leddmxStatusQuery, for: characteristic, type: writeType)
                self?.handshook.insert(id)
                self?.handshakePending.remove(id)
            }
        }
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
        applyAuthorization()
        bluetoothReady = central.state == .poweredOn
        switch central.state {
        case .poweredOn:
            bluetoothState = .poweredOn
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
            if CBCentralManager.authorization == .notDetermined {
                bluetoothState = .waiting
                status = "Allow Bluetooth when iOS asks"
            } else {
                scanning = false
                bluetoothState = .waiting
                status = BluetoothState.waiting.detail
            }
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
        peripherals[peripheral.identifier] = peripheral
        peripheral.delegate = self

        let localName = advertisementData[CBAdvertisementDataLocalNameKey] as? String
        let name = localName ?? peripheral.name
        if let name, !name.isEmpty {
            advertisedNames[peripheral.identifier] = name
        }
        let resolved = advertisedNames[peripheral.identifier] ?? name
        let matchesName = ElkProtocol.looksLikeController(resolved)
        let matchesService = ElkProtocol.advertisesLedService(advertisementData)
        // Keep weak LED/DMX hits too — G37 emblems sometimes advertise oddly.
        let weakHit = ElkProtocol.looksLikeLedKit(resolved)
        guard matchesName || matchesService || weakHit else {
            if shouldReconnect.contains(peripheral.identifier) {
                connectIfNeeded(peripheral)
            }
            return
        }
        let already = discovered.contains(where: { $0.identifier == peripheral.identifier })
        if !already {
            discovered.append(peripheral)
            refreshStatus()
        }
        if shouldReconnect.contains(peripheral.identifier) {
            connectIfNeeded(peripheral)
        }
    }

    func centralManager(_ central: CBCentralManager, didConnect peripheral: CBPeripheral) {
        let name = displayName(for: peripheral.identifier)
        status = "Connected \(name)"
        peripheral.discoverServices(nil)
    }

    func centralManager(_ central: CBCentralManager, didFailToConnect peripheral: CBPeripheral, error: Error?) {
        connectWaiters.removeValue(forKey: peripheral.identifier)?.resume(throwing: error ?? BleError.timeout)
        scheduleRetry(peripheral)
    }

    func centralManager(_ central: CBCentralManager, didDisconnectPeripheral peripheral: CBPeripheral, error: Error?) {
        writeChars[peripheral.identifier] = nil
        writableByUUID[peripheral.identifier] = nil
        notifyChars[peripheral.identifier] = nil
        handshook.remove(peripheral.identifier)
        handshakePending.remove(peripheral.identifier)
        onDisconnected?(peripheral.identifier)
        if shouldReconnect.contains(peripheral.identifier) {
            let name = displayName(for: peripheral.identifier)
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
        // Wait until every service has reported characteristics, then pick the
        // write char that matches the kit dialect (LED-DMX → FFE1, BLEDDM → FFF3).
        guard peripheral.services?.allSatisfy({ $0.characteristics != nil }) == true else { return }

        var map: [CBUUID: CBCharacteristic] = [:]
        for service in peripheral.services ?? [] {
            for characteristic in service.characteristics ?? [] {
                let writable = characteristic.properties.contains(.writeWithoutResponse)
                    || characteristic.properties.contains(.write)
                guard writable else { continue }
                map[characteristic.uuid] = characteristic
            }
        }
        writableByUUID[peripheral.identifier] = map

        // Prefer FFE1 for notify when present (LEDDMX / LEDBLE).
        for service in peripheral.services ?? [] {
            if let ffe1 = service.characteristics?.first(where: { $0.uuid == ElkProtocol.ffe1 }) {
                notifyChars[peripheral.identifier] = ffe1
            }
        }

        let name = displayName(for: peripheral.identifier)
        let model = ElkProtocol.resolve(name: name, writable: Array(map.keys))
        let preferred = [model.writeUUID, ElkProtocol.fff3, ElkProtocol.ffe1]
        let match = preferred.compactMap { map[$0] }.first
            ?? map.values.first

        if let match {
            writeChars[peripheral.identifier] = match
            if ElkProtocol.isLeddmxName(name) {
                ensureLeddmxReady(peripheral)
            }
            onConnected?(peripheral.identifier)
            connectWaiters.removeValue(forKey: peripheral.identifier)?.resume()
        } else if connectWaiters[peripheral.identifier] != nil {
            connectWaiters.removeValue(forKey: peripheral.identifier)?.resume(throwing: BleError.noCharacteristic)
        }
    }

    func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
        _ = peripheral
    }
}
