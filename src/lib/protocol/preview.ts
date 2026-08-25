import { EFFECTS, type LedEffect } from "./effects.ts";
import type { Rgb } from "./frames.ts";

const RED: Rgb = { r: 255, g: 28, b: 28 };
const GREEN: Rgb = { r: 36, g: 220, b: 72 };
const BLUE: Rgb = { r: 40, g: 90, b: 255 };
const AMBER: Rgb = { r: 255, g: 150, b: 24 };
const ICE: Rgb = { r: 48, g: 214, b: 255 };
const VIOLET: Rgb = { r: 168, g: 48, b: 255 };
const WHITE: Rgb = { r: 255, g: 252, b: 245 };
const YELLOW: Rgb = { r: 255, g: 220, b: 32 };

export const RAINBOW: Rgb[] = [RED, AMBER, YELLOW, GREEN, ICE, BLUE, VIOLET];

const PALETTES: Record<number, Rgb[]> = {
  0x80: [RED],
  0x81: [GREEN],
  0x82: [BLUE],
  0x83: [AMBER],
  0x84: [ICE],
  0x85: [VIOLET],
  0x86: [WHITE],
  0x87: [RED, GREEN, BLUE],
  0x8a: RAINBOW,
  0x8b: [RED],
  0x8c: [GREEN],
  0x8d: [BLUE],
  0x8e: [AMBER],
  0x91: [WHITE],
  0x92: RAINBOW,
  0x93: RAINBOW,
  0x94: [RED, { r: 40, g: 0, b: 0 }, RED],
  0x95: [GREEN, { r: 0, g: 40, b: 0 }, GREEN],
  0x96: [BLUE, { r: 0, g: 0, b: 40 }, BLUE],
  0x9a: [RED, GREEN],
  0x9b: [RED, BLUE],
  0x9c: [GREEN, BLUE],
  0x9d: RAINBOW,
};

export function effectById(id: number): LedEffect | undefined {
  return EFFECTS.find((effect) => effect.id === id);
}

export function paletteFor(id: number): Rgb[] {
  return PALETTES[id] ?? [RED];
}

export function rgbCss(rgb: Rgb, alpha = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

/** ELK speed byte: 0 is fastest, 100 is slowest. */
export function effectPeriodMs(speed: number, group: LedEffect["group"]): number {
  const t = Math.min(100, Math.max(0, speed)) / 100;
  if (group === "blink") return 180 + t * 900;
  if (group === "jump") return 500 + t * 1600;
  if (group === "fade") return 1200 + t * 2800;
  return 900 + t * 2200;
}

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  const u = Math.min(1, Math.max(0, t));
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u),
  };
}

function scale(rgb: Rgb, amount: number): Rgb {
  const a = Math.min(1, Math.max(0, amount));
  return {
    r: Math.round(rgb.r * a),
    g: Math.round(rgb.g * a),
    b: Math.round(rgb.b * a),
  };
}

function cycle(colors: Rgb[], u: number, smooth: boolean): Rgb {
  if (colors.length === 1) return colors[0];
  const wrapped = ((u % 1) + 1) % 1;
  const pos = wrapped * colors.length;
  const i = Math.floor(pos) % colors.length;
  const next = colors[(i + 1) % colors.length];
  if (!smooth) return colors[i];
  return mix(colors[i], next, pos - i);
}

export function sampleEffect(id: number, elapsedMs: number, speed: number): Rgb {
  const effect = effectById(id);
  const colors = paletteFor(id);
  const group = effect?.group ?? "fade";
  const period = effectPeriodMs(speed, group);
  const u = period <= 0 ? 0 : (elapsedMs / period) % 1;

  if (group === "breathe") {
    const pulse = 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
    const color = colors.length === 1 ? colors[0] : cycle(colors, u, true);
    return scale(color, pulse);
  }
  if (group === "fade") {
    return cycle(colors, u, true);
  }
  if (group === "jump") {
    return cycle(colors, u, false);
  }
  const on = u < 0.42 || (u > 0.5 && u < 0.62);
  if (!on) return { r: 0, g: 0, b: 0 };
  return cycle(colors, u, false);
}
