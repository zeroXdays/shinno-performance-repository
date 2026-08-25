import type { ZoneKind } from "./catalog";
import type { Rgb } from "./protocol";
import type { ConnectionState, TransportKind } from "./ble/types";

export interface Controller {
  id: string;
  advertisedName: string;
  customName: string;
  zone: ZoneKind;
  modelId: string;
  transport: TransportKind;
  connection: ConnectionState;
  error?: string;
  power: boolean;
  color: Rgb;
  brightness: number;
  effectId?: number;
  effectSpeed: number;
  lastSeen: number;
}

export type TabId = "garage" | "color" | "effects" | "scan";

export const STORAGE_KEY = "shinno-lights-v1";

export function createController(partial: {
  id: string;
  advertisedName: string;
  zone: ZoneKind;
  modelId: string;
  transport: TransportKind;
  customName?: string;
}): Controller {
  return {
    id: partial.id,
    advertisedName: partial.advertisedName,
    customName: partial.customName ?? defaultName(partial.zone),
    zone: partial.zone,
    modelId: partial.modelId,
    transport: partial.transport,
    connection: "disconnected",
    power: true,
    color: { r: 196, g: 18, b: 32 },
    brightness: 80,
    effectSpeed: 50,
    lastSeen: Date.now(),
  };
}

export function defaultName(zone: ZoneKind): string {
  switch (zone) {
    case "emblem":
      return "Front emblem";
    case "mirrors":
      return "Side mirrors";
    case "bumper":
      return "Bumper";
    case "grille":
      return "Grille badge";
    default:
      return "Extra zone";
  }
}

export function guessZone(name: string, used: Set<ZoneKind>): ZoneKind {
  const upper = name.toUpperCase();
  if (upper.includes("MR") || upper.includes("MIRROR")) return "mirrors";
  if (upper.includes("BP") || upper.includes("BUMP")) return "bumper";
  if (upper.includes("GB") || upper.includes("GRILLE") || upper.includes("MELK")) {
    return used.has("grille") ? "custom" : "grille";
  }
  if (upper.includes("EM") || upper.includes("EMBLEM")) return "emblem";
  const order: ZoneKind[] = ["emblem", "mirrors", "bumper", "grille", "custom"];
  return order.find((zone) => !used.has(zone)) ?? "custom";
}

export function persistable(controllers: Controller[]): unknown {
  return controllers.map((c) => ({
    id: c.id,
    advertisedName: c.advertisedName,
    customName: c.customName,
    zone: c.zone,
    modelId: c.modelId,
    transport: c.transport,
    power: c.power,
    color: c.color,
    brightness: c.brightness,
    effectId: c.effectId,
    effectSpeed: c.effectSpeed,
  }));
}
