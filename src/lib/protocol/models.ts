export type TemplateByte = number | "r" | "g" | "b" | "i" | "v" | "w" | "c";

export interface ModelProfile {
  id: string;
  prefixes: string[];
  writeUuid: string;
  readUuid: string;
  /** Brightness payload uses 0–100 (`i`). */
  brightnessScale: "percent";
  commands: {
    turnOn: TemplateByte[];
    turnOff: TemplateByte[];
    color: TemplateByte[];
    brightness: TemplateByte[];
    effect: TemplateByte[];
    effectSpeed: TemplateByte[];
    white?: TemplateByte[];
  };
}

const FFF3 = "0000fff3-0000-1000-8000-00805f9b34fb";
const FFF4 = "0000fff4-0000-1000-8000-00805f9b34fb";
const FFE1 = "0000ffe1-0000-1000-8000-00805f9b34fb";
const FFE2 = "0000ffe2-0000-1000-8000-00805f9b34fb";

/** Profiles taken from dave-code-ruiz/elkbledom models.json (ELK / MELK / LEDBLE). */
export const MODELS: ModelProfile[] = [
  {
    id: "ELK-BLEDOM",
    prefixes: ["ELK-BLEDOM"],
    writeUuid: FFF3,
    readUuid: FFF4,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 4, 4, 240, 0, 1, 255, 0, 239],
      turnOff: [126, 4, 4, 0, 0, 0, 255, 0, 239],
      color: [126, 7, 5, 3, "r", "g", "b", 10, 239],
      brightness: [126, 4, 1, "i", 1, 255, 2, 1, 239],
      effect: [126, 7, 3, "v", 3, 255, 255, 0, 239],
      effectSpeed: [126, 7, 2, "v", 0, 0, 0, 0, 239],
      white: [126, 7, 1, "i", 0, 0, 0, 0, 239],
    },
  },
  {
    id: "ELK-BLEDOB",
    prefixes: ["ELK-BLEDOB", "ELK-BLEDOM0E"],
    writeUuid: FFF3,
    readUuid: FFF4,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 7, 4, 255, 0, 1, 2, 1, 239],
      turnOff: [126, 7, 4, 0, 0, 0, 2, 1, 239],
      color: [126, 7, 5, 3, "r", "g", "b", 10, 239],
      brightness: [126, 4, 1, "i", 1, 255, 2, 1, 239],
      effect: [126, 7, 3, "v", 3, 255, 255, 0, 239],
      effectSpeed: [126, 7, 2, "v", 0, 0, 0, 0, 239],
      white: [126, 7, 1, "i", 0, 0, 0, 0, 239],
    },
  },
  {
    id: "ELK-BLEDDM",
    prefixes: ["ELK-BLEDDM"],
    writeUuid: FFF3,
    readUuid: FFF4,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 4, 4, 240, 0, 1, 255, 0, 239],
      turnOff: [126, 4, 4, 0, 0, 0, 255, 0, 239],
      color: [126, 0, 5, 3, "r", "g", "b", 0, 239],
      brightness: [126, 4, 1, "i", 255, 0, 255, 0, 239],
      effect: [126, 0, 3, "v", 3, 0, 0, 0, 239],
      effectSpeed: [126, 0, 2, "v", 0, 0, 0, 0, 239],
    },
  },
  {
    id: "ELK-BLE",
    prefixes: ["ELK-BLE", "ELK-BTC"],
    writeUuid: FFF3,
    readUuid: FFF4,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 0, 4, 240, 0, 1, 255, 0, 239],
      turnOff: [126, 0, 4, 0, 0, 0, 255, 0, 239],
      color: [126, 0, 5, 3, "r", "g", "b", 0, 239],
      brightness: [126, 4, 1, "i", 255, 0, 255, 0, 239],
      effect: [126, 0, 3, "v", 3, 0, 0, 0, 239],
      effectSpeed: [126, 0, 2, "v", 0, 0, 0, 0, 239],
    },
  },
  {
    id: "MELK",
    prefixes: ["MELK-OA21", "MELK-OA10", "MELK-OC10", "MELK-OF10", "MELK-OG10", "MELK"],
    writeUuid: FFF3,
    readUuid: FFF4,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 4, 4, 240, 0, 1, 255, 0, 239],
      turnOff: [126, 4, 4, 0, 0, 0, 255, 0, 239],
      color: [126, 0, 5, 3, "r", "g", "b", 0, 239],
      brightness: [126, 4, 1, "i", 1, 255, 255, 0, 239],
      effect: [126, 5, 3, "v", 6, 255, 255, 0, 239],
      effectSpeed: [126, 4, 2, "v", 255, 255, 255, 0, 239],
    },
  },
  {
    id: "LEDBLE",
    prefixes: ["LEDBLE", "LED-", "JACKYLED"],
    writeUuid: FFE1,
    readUuid: FFE2,
    brightnessScale: "percent",
    commands: {
      turnOn: [126, 0, 4, 1, 0, 0, 0, 0, 239],
      turnOff: [126, 0, 4, 0, 0, 0, 255, 0, 239],
      color: [126, 0, 5, 3, "r", "g", "b", 0, 239],
      brightness: [126, 4, 1, "i", 255, 0, 255, 0, 239],
      effect: [126, 0, 3, "v", 3, 0, 0, 0, 0, 239],
      effectSpeed: [126, 0, 2, "v", 0, 0, 0, 0, 239],
    },
  },
];

export const FALLBACK_MODEL = MODELS[0];

export const WRITE_UUIDS = Array.from(new Set(MODELS.map((m) => m.writeUuid)));
export const SERVICE_UUIDS = [
  "0000fff0-0000-1000-8000-00805f9b34fb",
  "0000ffe0-0000-1000-8000-00805f9b34fb",
];

export function detectModel(advertisedName: string | null | undefined): ModelProfile {
  const name = (advertisedName ?? "").toUpperCase();
  if (!name) return FALLBACK_MODEL;
  let best: ModelProfile | undefined;
  let bestLen = -1;
  for (const model of MODELS) {
    for (const prefix of model.prefixes) {
      if (name.startsWith(prefix) && prefix.length > bestLen) {
        best = model;
        bestLen = prefix.length;
      }
    }
  }
  return best ?? FALLBACK_MODEL;
}

export function looksLikeController(advertisedName: string | null | undefined): boolean {
  const name = (advertisedName ?? "").toUpperCase();
  return MODELS.some((model) => model.prefixes.some((prefix) => name.startsWith(prefix)));
}
