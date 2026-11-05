import type { ZoneKind } from "./catalog";
import type { Rgb } from "./protocol";
import type { ConnectionState, TransportKind } from "./ble/types";
import { getSettings } from "./settings";

export interface Controller {
  id: string;
  advertisedName: string;
  customName: string;
  zone: ZoneKind;
  modelId: string;
  transport: TransportKind;
  connection: ConnectionState;
  wantConnected: boolean;
  error?: string;
  power: boolean;
  color: Rgb;
  brightness: number;
  effectId?: number;
  effectSpeed: number;
  lastSeen: number;
}

export type TabId = "devices" | "color" | "effects" | "scan";

export const STORAGE_KEY = "shinno-lights-v1";
export const CAR_STORAGE_KEY = "shinno-car";

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
    wantConnected: false,
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
      return "Emblem";
    case "mirrors":
      return "Mirrors";
    case "bumper":
      return "Bumper";
    case "grille":
      return "Grille";
    default:
      return "Other";
  }
}

export function guessZone(
  name: string,
  used: Set<ZoneKind>,
  preferred: ZoneKind[] = ["emblem", "mirrors", "bumper"],
): ZoneKind {
  const upper = name.toUpperCase();
  const allowed = new Set<ZoneKind>([...preferred, "custom"]);
  if (
    (upper.includes("MR") || upper.includes("MIRROR")) &&
    allowed.has("mirrors")
  ) {
    return "mirrors";
  }
  if ((upper.includes("BP") || upper.includes("BUMP")) && allowed.has("bumper")) {
    return "bumper";
  }
  // Grille badge kits often advertise MELK / GB — park until we have a kit to test:
  // if (upper.includes("GB") || upper.includes("GRILLE") || upper.includes("MELK")) {
  //   return used.has("grille") ? "custom" : "grille";
  // }
  if ((upper.includes("EM") || upper.includes("EMBLEM")) && allowed.has("emblem")) {
    return "emblem";
  }
  const order: ZoneKind[] = [...preferred, /* "grille", */ "custom"];
  return order.find((zone) => allowed.has(zone) && !used.has(zone)) ?? "custom";
}

export function persistable(controllers: Controller[]): unknown {
  const remember = getSettings().rememberConnect;
  return controllers.map((c) => ({
    id: c.id,
    advertisedName: c.advertisedName,
    customName: c.customName,
    zone: c.zone,
    modelId: c.modelId,
    transport: "web-bluetooth",
    power: c.power,
    color: c.color,
    brightness: c.brightness,
    effectId: c.effectId,
    effectSpeed: c.effectSpeed,
    wantConnected: remember && (c.wantConnected || c.connection === "connected"),
  }));
}

export function hydrateControllers(raw: unknown): Controller[] {
  if (!Array.isArray(raw)) return [];
  const next: Controller[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const item = row as Partial<Controller> & { wantConnected?: boolean };
    if (typeof item.id !== "string" || typeof item.advertisedName !== "string") continue;
    // Legacy simulator / demo preview ids — drop.
    if (
      item.id.startsWith("sim-") ||
      item.id.startsWith("demo-") ||
      (item as { transport?: string }).transport === "simulator"
    ) {
      continue;
    }
    next.push({
      ...createController({
        id: item.id,
        advertisedName: item.advertisedName,
        zone: (item.zone as ZoneKind) === "grille" ? "custom" : ((item.zone as ZoneKind) ?? "custom"),
        modelId: item.modelId ?? "elk-bledom",
        transport: "web-bluetooth",
        customName: item.customName,
      }),
      power: item.power ?? true,
      color: item.color ?? { r: 196, g: 18, b: 32 },
      brightness: item.brightness ?? 80,
      effectId: item.effectId,
      effectSpeed: item.effectSpeed ?? 50,
      wantConnected: item.wantConnected !== false,
      connection: "disconnected",
    });
  }
  return next;
}
