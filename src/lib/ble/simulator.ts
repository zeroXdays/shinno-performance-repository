import { looksLikeController } from "@/lib/protocol";
import type { BleTransport, DiscoveredDevice } from "./types";

const DEMO: DiscoveredDevice[] = [
  { id: "sim-emblem", name: "ELK-BLEDOM-EM01", rssi: -41, transport: "simulator" },
  { id: "sim-mirrors", name: "ELK-BLEDOM-MR22", rssi: -47, transport: "simulator" },
  { id: "sim-bumper", name: "ELK-BLEDOB-BP08", rssi: -52, transport: "simulator" },
  { id: "sim-grille", name: "MELK-OA10-GB14", rssi: -58, transport: "simulator" },
];

export class SimulatorTransport implements BleTransport {
  kind = "simulator" as const;
  private scanning = false;
  private connected = new Set<string>();
  lastWrites = new Map<string, Uint8Array>();

  async scan(onFound: (device: DiscoveredDevice) => void): Promise<void> {
    this.scanning = true;
    for (const device of DEMO) {
      if (!this.scanning) return;
      await delay(40);
      if (looksLikeController(device.name)) onFound(device);
    }
  }

  stopScan(): void {
    this.scanning = false;
  }

  async connect(id: string): Promise<void> {
    await delay(80);
    this.connected.add(id);
  }

  async disconnect(id: string): Promise<void> {
    this.connected.delete(id);
  }

  async write(id: string, payload: Uint8Array): Promise<void> {
    if (!this.connected.has(id)) throw new Error("Simulator is not connected.");
    this.lastWrites.set(id, payload);
    await delay(8);
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
