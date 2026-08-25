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
    name: "Night",
    blurb: "",
    color: { r: 220, g: 232, b: 255 },
    brightness: 28,
    power: true,
  },
  {
    id: "infiniti-red",
    name: "Red",
    blurb: "",
    color: { r: 196, g: 18, b: 32 },
    brightness: 86,
    power: true,
  },
  {
    id: "oem-white",
    name: "White",
    blurb: "",
    color: { r: 255, g: 252, b: 245 },
    brightness: 100,
    power: true,
  },
  {
    id: "show",
    name: "Show",
    blurb: "",
    color: { r: 255, g: 32, b: 48 },
    brightness: 100,
    power: true,
    effectId: 212,
    effectSpeed: 42,
  },
  {
    id: "ice",
    name: "Ice",
    blurb: "",
    color: { r: 40, g: 210, b: 255 },
    brightness: 72,
    power: true,
  },
  {
    id: "amber",
    name: "Amber",
    blurb: "",
    color: { r: 255, g: 150, b: 30 },
    brightness: 68,
    power: true,
  },
];

export function rgbToCss(rgb: Rgb, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function rgbToHex(rgb: Rgb): string {
  const h = (n: number) => Math.round(n).toString(16).padStart(2, "0");
  return `#${h(rgb.r)}${h(rgb.g)}${h(rgb.b)}`;
}

export function hexToRgb(hex: string): Rgb | null {
  const raw = hex.trim().replace(/^#/, "");
  if (!/^[0-9a-fA-F]{3}$/.test(raw) && !/^[0-9a-fA-F]{6}$/.test(raw)) return null;
  const full = raw.length === 3 ? [...raw].map((ch) => ch + ch).join("") : raw;
  return {
    r: Number.parseInt(full.slice(0, 2), 16),
    g: Number.parseInt(full.slice(2, 4), 16),
    b: Number.parseInt(full.slice(4, 6), 16),
  };
}
