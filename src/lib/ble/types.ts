export type TransportKind = "web-bluetooth";

export type ConnectionState = "disconnected" | "connecting" | "connected" | "error";

export interface DiscoveredDevice {
  id: string;
  name: string;
  rssi?: number;
  transport: TransportKind;
}

export interface BleTransport {
  kind: TransportKind;
  scan(onFound: (device: DiscoveredDevice) => void): Promise<void>;
  stopScan(): void;
  connect(id: string): Promise<void>;
  disconnect(id: string): Promise<void>;
  write(id: string, payload: Uint8Array): Promise<void>;
}
