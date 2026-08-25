import { EFFECTS, type EffectGroup, type LedEffect } from "./effects.ts";
import type { Rgb } from "./frames.ts";

const RED: Rgb = { r: 255, g: 28, b: 28 };
const GREEN: Rgb = { r: 36, g: 220, b: 72 };
const BLUE: Rgb = { r: 40, g: 90, b: 255 };
const YELLOW: Rgb = { r: 255, g: 220, b: 32 };
const CYAN: Rgb = { r: 48, g: 214, b: 255 };
const PURPLE: Rgb = { r: 168, g: 48, b: 255 };
const WHITE: Rgb = { r: 255, g: 252, b: 245 };
const AMBER: Rgb = { r: 255, g: 150, b: 24 };

export const RAINBOW: Rgb[] = [RED, AMBER, YELLOW, GREEN, CYAN, BLUE, PURPLE];

const LETTER: Record<string, Rgb> = {
  R: RED,
  G: GREEN,
  B: BLUE,
  Y: YELLOW,
  C: CYAN,
  P: PURPLE,
  W: WHITE,
};

const WORD: Record<string, Rgb> = {
  Red: RED,
  Green: GREEN,
  Blue: BLUE,
  Yellow: YELLOW,
  Cyan: CYAN,
  Purple: PURPLE,
  White: WHITE,
};

type Motion =
  | "auto"
  | "magic"
  | "fade"
  | "tail"
  | "water"
  | "curtain"
  | "run"
  | "flow"
  | "jump"
  | "strobe"
  | "flush"
  | "wave"
  | "race"
  | "gradual"
  | "marquee"
  | "energy";

export function effectById(id: number): LedEffect | undefined {
  return EFFECTS.find((effect) => effect.id === id);
}

export function rgbCss(rgb: Rgb, alpha = 1): string {
  return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
}

export function paletteFor(id: number): Rgb[] {
  return paletteFromName(effectById(id)?.name ?? "");
}

function paletteFromName(name: string): Rgb[] {
  const flow = name.match(/^([WRGBYCP])-([WRGBYCP])-([WRGBYCP])/);
  if (flow) return [LETTER[flow[1]], LETTER[flow[2]], LETTER[flow[3]]];

  const six = name.match(/6-Color to (\w+)/);
  if (six && WORD[six[1]]) {
    const target = WORD[six[1]];
    return [...RAINBOW.filter((c) => c !== target), target];
  }

  const inBg = name.match(/7-Color in (\w+)/);
  if (inBg && WORD[inBg[1]]) return [WORD[inBg[1]], ...RAINBOW];

  const dot = name.match(/^(\w+)-Dot in (\w+)/);
  if (dot && WORD[dot[1]] && WORD[dot[2]]) return [WORD[dot[2]], WORD[dot[1]]];

  if (name.includes("B-P-C-Y")) return [BLUE, PURPLE, CYAN, YELLOW];
  if (name.includes("B-G-C-Y")) return [BLUE, GREEN, CYAN, YELLOW];
  if (name.includes("R-G-B")) return [RED, GREEN, BLUE];
  if (name.includes("Y-C-P")) return [YELLOW, CYAN, PURPLE];
  if (name.includes("R-G ")) return [RED, GREEN];
  if (name.includes("G-B ")) return [GREEN, BLUE];
  if (name.includes("Y-B ")) return [YELLOW, BLUE];
  if (name.includes("Y-C ")) return [YELLOW, CYAN];
  if (name.includes("C-P ")) return [CYAN, PURPLE];
  if (name.includes("R-Y ")) return [RED, YELLOW];
  if (name.includes("R-P ")) return [RED, PURPLE];
  if (name.includes("G-C ")) return [GREEN, CYAN];
  if (name.includes("G-Y ")) return [GREEN, YELLOW];
  if (name.includes("B-P ")) return [BLUE, PURPLE];
  if (name.includes("7-Color") || name.includes("Magic") || name.includes("Auto Play") || name.includes("Energy")) {
    return RAINBOW;
  }

  const single = name.match(/^(Red|Green|Blue|Yellow|Cyan|Purple|White)\b/);
  if (single) return [WORD[single[1]]];
  return RAINBOW;
}

function motionFor(effect: LedEffect | undefined): Motion {
  const name = effect?.name ?? "";
  const group = effect?.group ?? "basic";
  if (name.includes("Auto Play")) return "auto";
  if (name.includes("Magic")) return "magic";
  if (name.includes("Energy")) return "energy";
  if (name.includes("Strobe")) return "strobe";
  if (name.includes("Jump")) return "jump";
  if (name.includes("Gradual")) return "gradual";
  if (name.includes("Marquee")) return "marquee";
  if (name.includes("Flush")) return "flush";
  if (name.includes("Wave")) return "wave";
  if (name.includes("Race")) return "race";
  if (group === "trans") return "fade";
  if (group === "tail") return "tail";
  if (group === "water") return "water";
  if (group === "curtain") return "curtain";
  if (group === "flow") return "flow";
  if (group === "run" || group === "runback") return "run";
  return "fade";
}

function reversed(name: string, group: EffectGroup): boolean {
  return group === "runback" || name.includes("Back") || name.includes("Close");
}

/** ELK speed byte: 0 is fastest, 100 is slowest. */
export function effectPeriodMs(speed: number, group: EffectGroup | Motion): number {
  const t = Math.min(100, Math.max(0, speed)) / 100;
  if (group === "strobe" || group === "race" || group === "flush") return 220 + t * 900;
  if (group === "run" || group === "runback" || group === "tail" || group === "marquee" || group === "magic") {
    return 420 + t * 1400;
  }
  if (group === "jump" || group === "water" || group === "curtain" || group === "wave" || group === "energy") {
    return 700 + t * 1800;
  }
  if (group === "flow" || group === "trans" || group === "fade" || group === "gradual") return 1400 + t * 3200;
  if (group === "auto") return 2200 + t * 4800;
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

function pulse(u: number): number {
  return 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
}

export function sampleEffect(id: number, elapsedMs: number, speed: number): Rgb {
  const effect = effectById(id);
  const colors = paletteFor(id);
  const motion = motionFor(effect);
  const group = effect?.group ?? "basic";
  const period = effectPeriodMs(speed, motion);
  let u = period <= 0 ? 0 : (elapsedMs / period) % 1;
  if (effect && reversed(effect.name, group)) u = (1 - u + 1) % 1;

  if (motion === "strobe") {
    const on = u < 0.42 || (u > 0.5 && u < 0.62);
    if (!on) return { r: 0, g: 0, b: 0 };
    return cycle(colors, u, false);
  }
  if (motion === "jump" || motion === "race") {
    return cycle(colors, u, false);
  }
  if (motion === "tail") {
    const head = Math.pow(Math.max(0, 1 - ((u * 1.35) % 1) / 0.22), 1.8);
    return scale(cycle(colors, u, false), 0.06 + head * 0.94);
  }
  if (motion === "water") {
    const ripple = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(u * Math.PI * 4));
    return scale(cycle(colors, u, true), ripple);
  }
  if (motion === "curtain") {
    const gate = 1 - Math.abs(u * 2 - 1);
    return scale(cycle(colors, u, true), 0.05 + gate * 0.95);
  }
  if (motion === "run" || motion === "marquee") {
    const head = (u * 6) % 1 < 0.22;
    if (effect?.name.includes("Dot") || effect?.name.includes(" in ")) {
      const bg = colors[0];
      const fg = colors[1] ?? WHITE;
      return head ? fg : bg;
    }
    if (colors.length === 1) return scale(colors[0], head ? 1 : 0.1);
    return cycle(colors, u, false);
  }
  if (motion === "flow") {
    return cycle(colors, u, true);
  }
  if (motion === "flush") {
    const flash = u % 0.2 < 0.08 ? 1 : 0.15 + pulse(u) * 0.4;
    return scale(cycle(colors, u, false), flash);
  }
  if (motion === "wave") {
    return scale(cycle(colors, u, true), pulse(u));
  }
  if (motion === "magic") {
    const spark = 0.55 + 0.45 * pulse((u * 6) % 1);
    return scale(cycle(colors, u * 2, true), spark);
  }
  if (motion === "energy") {
    const beat = u % 0.14 < 0.05 ? 1 : 0.25 + pulse(u) * 0.5;
    return scale(cycle(colors, u * 3, false), beat);
  }
  if (motion === "auto") {
    const scene = Math.floor(((elapsedMs / (period * 0.35)) % 4));
    if (scene === 1) return cycle(colors, u, false);
    if (scene === 2) return scale(cycle(colors, u, true), pulse(u));
    if (scene === 3) {
      const on = u < 0.5;
      return on ? cycle(colors, u, false) : { r: 0, g: 0, b: 0 };
    }
    return cycle(colors, u, true);
  }
  return cycle(colors, u, true);
}
