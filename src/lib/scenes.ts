import type { Rgb } from "./protocol";
import type { ZoneKind } from "./catalog";

export interface Scene {
  id: string;
  name: string;
  blurb: string;
  color: Rgb;
  brightness: number;
  power: boolean;
  effectId?: number;
  effectSpeed?: number;
  /** Optional per-zone overrides. Unlisted zones follow the scene defaults. */
  zones?: Partial<Record<ZoneKind, { color?: Rgb; brightness?: number; power?: boolean }>>;
}

export const SCENES: Scene[] = [
  {
    id: "night-drive",
    name: "Night drive",
    blurb: "Low cool white so the car stays OEM+ after dark.",
    color: { r: 220, g: 232, b: 255 },
    brightness: 28,
    power: true,
  },
  {
    id: "infiniti-red",
    name: "Infiniti red",
    blurb: "The house color. All zones locked together.",
    color: { r: 196, g: 18, b: 32 },
    brightness: 86,
    power: true,
  },
  {
    id: "oem-white",
    name: "OEM white",
    blurb: "Crisp daytime running look.",
    color: { r: 255, g: 252, b: 245 },
    brightness: 100,
    power: true,
  },
  {
    id: "show",
    name: "Show",
    blurb: "Full output for a meet or photos.",
    color: { r: 255, g: 32, b: 48 },
    brightness: 100,
    power: true,
    effectId: 0x8a,
    effectSpeed: 42,
  },
  {
    id: "ice",
    name: "Ice",
    blurb: "Cyan-white for night photos.",
    color: { r: 40, g: 210, b: 255 },
    brightness: 72,
    power: true,
  },
  {
    id: "stealth",
    name: "Stealth",
    blurb: "Everything off. One tap when you park.",
    color: { r: 0, g: 0, b: 0 },
    brightness: 0,
    power: false,
  },
];

export function rgbToCss(rgb: Rgb, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function rgbToHex(rgb: Rgb): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}
