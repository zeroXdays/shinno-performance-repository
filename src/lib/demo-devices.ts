/**
 * ============================================================================
 * DEMO DEVICES — preview/testing without real BLE
 * ============================================================================
 * Seeds fake paired kit-zone controllers so Color, Modes, and Paths are usable
 * in the browser when no hardware is present. Zone count follows kitZonesForCar
 * (Q50: emblem/mirrors/bumper; G37: emblem only).
 *
 * Easy remove later:
 *   1. Set DEMO_DEVICES_ENABLED = false, OR
 *   2. Delete this file and strip every `demo-devices` / `seedDemoDevices` /
 *      `DEMO` import + UI button (ScanPanel / DeviceList).
 * ============================================================================
 */

import { createController, defaultName, type Controller } from "./controller";
import { kitZonesForCar, type CarId, type ZoneKind } from "./catalog";

/** Flip to false (or delete this module) to strip the demo path entirely. */
export const DEMO_DEVICES_ENABLED = true;

export function isDemoDeviceId(id: string): boolean {
  return id.startsWith("demo-");
}

export function isDemoController(controller: Pick<Controller, "id">): boolean {
  return isDemoDeviceId(controller.id);
}

/** Build fake paired zone devices for this car (connected, powered). */
export function buildDemoControllers(car: CarId): Controller[] {
  const zones: ZoneKind[] = kitZonesForCar(car);
  return zones.map((zone) => {
    const base = createController({
      id: `demo-${zone}`,
      advertisedName: "DEMO ELK-BLEDOM",
      zone,
      modelId: "elk-bledom",
      transport: "web-bluetooth",
      customName: `${defaultName(zone)} (Demo)`,
    });
    return {
      ...base,
      connection: "connected" as const,
      wantConnected: true,
      power: true,
      color: { r: 196, g: 18, b: 32 },
      brightness: 80,
      effectSpeed: 50,
    };
  });
}
