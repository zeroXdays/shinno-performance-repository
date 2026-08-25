import { looksLikeController } from "@/lib/protocol";
import type { BleTransport, DiscoveredDevice } from "./types";

interface BluetoothRemoteGATTCharacteristic {
  writeValueWithoutResponse?(data: BufferSource): Promise<void>;
  writeValue(data: BufferSource): Promise<void>;
}

interface BluetoothRemoteGATTService {
  getCharacteristic(uuid: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}

interface BluetoothRemoteGATTServer {
  connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(uuid: string): Promise<BluetoothRemoteGATTService>;
  getPrimaryServices(): Promise<BluetoothRemoteGATTService[]>;
}

interface BluetoothDevice {
  id: string;
  name?: string;
  gatt?: BluetoothRemoteGATTServer;
  addEventListener(type: "gattserverdisconnected", listener: () => void): void;
}

interface RequestDeviceOptions {
  filters?: Array<{ namePrefix?: string; services?: string[] }>;
  optionalServices?: string[];
  acceptAllDevices?: boolean;
}

declare global {
  interface Navigator {
    bluetooth?: {
      requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
      getDevices?: () => Promise<BluetoothDevice[]>;
    };
  }
}

const WRITE_CANDIDATES = [
  "0000fff3-0000-1000-8000-00805f9b34fb",
  "0000ffe1-0000-1000-8000-00805f9b34fb",
  "0000ffe9-0000-1000-8000-00805f9b34fb",
];

const SERVICE_CANDIDATES = [
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
  "0000ffe5-0000-1000-8000-00805f9b34fb",
];

export function isChooserCancel(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const err = error as { name?: string; message?: string };
  const message = err.message ?? "";
  return (
    err.name === "NotFoundError" ||
    /cancel/i.test(message) ||
    /chooser/i.test(message)
  );
}

export function webBluetoothAvailable(): boolean {
  return typeof navigator !== "undefined" && Boolean(navigator.bluetooth);
}

export class WebBluetoothTransport implements BleTransport {
  kind = "web-bluetooth" as const;
  private chars = new Map<string, BluetoothRemoteGATTCharacteristic>();
  private devices = new Map<string, BluetoothDevice>();

  async scan(onFound: (device: DiscoveredDevice) => void): Promise<void> {
    if (!navigator.bluetooth) {
      throw new Error("Web Bluetooth is not available in this browser.");
    }
    const device = await navigator.bluetooth.requestDevice({
      filters: [
        { namePrefix: "ELK-" },
        { namePrefix: "MELK" },
        { namePrefix: "LEDBLE" },
        { namePrefix: "LED-" },
        { namePrefix: "JACKYLED" },
      ],
      optionalServices: SERVICE_CANDIDATES,
    });
    if (!looksLikeController(device.name) && device.name) {
      // Still allow — some devices advertise a custom name after pairing.
    }
    this.devices.set(device.id, device);
    onFound({
      id: device.id,
      name: device.name || "Shinno device",
      transport: "web-bluetooth",
    });
  }

  stopScan(): void {
    // Chrome pairing is a one-shot picker.
  }

  async adoptGranted(): Promise<DiscoveredDevice[]> {
    const getDevices = navigator.bluetooth?.getDevices;
    if (!getDevices) return [];
    const devices = await getDevices();
    const found: DiscoveredDevice[] = [];
    for (const device of devices) {
      this.devices.set(device.id, device);
      found.push({
        id: device.id,
        name: device.name || "Shinno device",
        transport: "web-bluetooth",
      });
    }
    return found;
  }

  async connect(id: string): Promise<void> {
    let device = this.devices.get(id);
    if (!device) {
      const granted = await this.adoptGranted();
      if (granted.some((item) => item.id === id)) device = this.devices.get(id);
    }
    if (!device?.gatt) throw new Error("Device is no longer available. Scan again.");
    const server = await device.gatt.connect();
    const characteristic = await resolveWriteCharacteristic(server);
    this.chars.set(id, characteristic);
  }

  async disconnect(id: string): Promise<void> {
    const device = this.devices.get(id);
    device?.gatt?.disconnect();
    this.chars.delete(id);
  }

  async write(id: string, payload: Uint8Array): Promise<void> {
    const characteristic = this.chars.get(id);
    if (!characteristic) throw new Error("Not connected.");
    const buffer = payload.buffer.slice(
      payload.byteOffset,
      payload.byteOffset + payload.byteLength,
    ) as ArrayBuffer;
    if (characteristic.writeValueWithoutResponse) {
      await characteristic.writeValueWithoutResponse(buffer);
      return;
    }
    await characteristic.writeValue(buffer);
  }
}

async function resolveWriteCharacteristic(
  server: BluetoothRemoteGATTServer,
): Promise<BluetoothRemoteGATTCharacteristic> {
  for (const serviceUuid of SERVICE_CANDIDATES) {
    try {
      const service = await server.getPrimaryService(serviceUuid);
      for (const charUuid of WRITE_CANDIDATES) {
        try {
          return await service.getCharacteristic(charUuid);
        } catch {
          continue;
        }
      }
      const all = await service.getCharacteristics();
      if (all[0]) return all[0];
    } catch {
      continue;
    }
  }
  const services = await server.getPrimaryServices();
  for (const service of services) {
    const chars = await service.getCharacteristics();
    if (chars[0]) return chars[0];
  }
  throw new Error("Could not find a writable LED characteristic on this device.");
}
