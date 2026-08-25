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

export type Motion =
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
  | "energy"
  | "trans";

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
  if (inBg && WORD[inBg[1]]) {
    const bg = WORD[inBg[1]];
    return [bg, ...RAINBOW.filter((c) => c !== bg)];
  }

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

export function motionFor(effect: LedEffect | undefined): Motion {
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
  if (group === "trans") return "trans";
  if (group === "tail") return "tail";
  if (group === "water") return "water";
  if (group === "curtain") return "curtain";
  if (group === "flow") return "flow";
  if (group === "run" || group === "runback") return "run";
  return "fade";
}

function reversed(name: string, group: EffectGroup): boolean {
  // Flush Close/Open are spatial (ends↔center), not a reversed timeline.
  if (name.includes("Flush") && (name.includes("Close") || name.includes("Open"))) return false;
  return group === "runback" || name.includes("Back") || name.includes("Close");
}

/**
 * ELK firmware speed byte: 0 = fastest, 100 = slowest.
 * Higher slider values MUST produce a longer period (slower motion).
 * Never invert with (1 - t).
 */
export function effectPeriodMs(speed: number, group: EffectGroup | Motion): number {
  const t = Math.min(100, Math.max(0, speed)) / 100;
  if (group === "strobe" || group === "race") return 280 + t * 1100;
  if (group === "flush") return 380 + t * 1400;
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

function sampleTrans(colors: Rgb[], s: number, u: number, name: string): Rgb {
  const toTarget = name.includes("6-Color to");
  const target = colors[colors.length - 1] ?? WHITE;
  const goal = 0.72;
  let local = s;
  let palette = colors;
  if (toTarget && colors.length > 1) {
    if (s >= goal) return target;
    local = s / goal;
    palette = colors.slice(0, -1);
  }
  if (palette.length === 0) return target;
  if (palette.length === 1) return palette[0];

  const pos = u * palette.length;
  const i = Math.floor(pos) % palette.length;
  const t = pos - Math.floor(pos);
  const from = palette[i];
  const to = palette[(i + 1) % palette.length];
  const edge = 0.18;
  const arrive = Math.max(0, Math.min(1, (t - local) / edge + 0.5));
  const mixed = mix(from, to, arrive);
  const front = Math.max(0, 1 - Math.abs(local - t) / 0.09);
  return scale(mixed, 0.38 + arrive * 0.52 + front * 0.28);
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
    if (effect?.name.includes("7-Color in")) {
      const bg = colors[0];
      const pack = colors.slice(1);
      if (!head || pack.length === 0) return bg;
      return cycle(pack, u * pack.length, false);
    }
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
    // One traveling wash per period — not a full-frame blink.
    const wash = 0.18 + 0.82 * Math.pow(0.5 - 0.5 * Math.cos(u * Math.PI * 2), 1.15);
    return scale(cycle(colors, u, true), wash);
  }
  if (motion === "wave") {
    return scale(cycle(colors, u, true), pulse(u));
  }
  if (motion === "magic") {
    const spark = 0.55 + 0.45 * pulse((u * 6) % 1);
    return scale(cycle(colors, u * 2, true), spark);
  }
  if (motion === "energy") {
    return scale(cycle(colors, u, true), 0.2 + pulse(u) * 0.8);
  }
  if (motion === "trans") {
    return sampleTrans(colors, 0.5, u, effect?.name ?? "");
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

export function sampleLed(
  id: number,
  index: number,
  count: number,
  elapsedMs: number,
  speed: number,
): Rgb {
  const effect = effectById(id);
  const colors = paletteFor(id);
  const motion = motionFor(effect);
  const group = effect?.group ?? "basic";
  const period = effectPeriodMs(speed, motion);
  let u = period <= 0 ? 0 : (elapsedMs / period) % 1;
  if (effect && reversed(effect.name, group)) u = (1 - u + 1) % 1;
  const s = count <= 1 ? 0 : index / (count - 1);
  const dist = Math.min(Math.abs(s - u), Math.abs(s - u + 1), Math.abs(s - u - 1));
  const base = cycle(colors, u, motion !== "jump" && motion !== "race" && motion !== "strobe");

  if (motion === "strobe") {
    const on = u < 0.42 || (u > 0.5 && u < 0.62);
    return on ? cycle(colors, s, false) : { r: 0, g: 0, b: 0 };
  }
  if (motion === "jump" || motion === "race") {
    return cycle(colors, u + s * 0.02, false);
  }
  if (motion === "tail" || motion === "marquee") {
    const trail = Math.max(0, 1 - dist / 0.28);
    return scale(cycle(colors, u, false), 0.06 + trail * trail * 0.94);
  }
  if (motion === "run" || motion === "magic") {
    if (effect?.name.includes("7-Color in")) {
      const bg = colors[0];
      const pack = colors.slice(1);
      let nearest = 1;
      let color = bg;
      for (let i = 0; i < pack.length; i++) {
        const headU = (u + i / Math.max(pack.length, 1)) % 1;
        const d = Math.min(Math.abs(s - headU), Math.abs(s - headU + 1), Math.abs(s - headU - 1));
        if (d < nearest) {
          nearest = d;
          color = pack[i];
        }
      }
      return nearest < 0.07 ? color : bg;
    }
    const head = dist < 0.07 ? 1 : Math.max(0.08, 1 - dist / 0.18);
    if (effect?.name.includes("Dot") || effect?.name.includes(" in ")) {
      return dist < 0.08 ? (colors[1] ?? WHITE) : colors[0];
    }
    return scale(cycle(colors, u, false), head);
  }
  if (motion === "water" || motion === "wave") {
    const ripple = 0.2 + 0.8 * (0.5 + 0.5 * Math.sin((s + u) * Math.PI * 4));
    return scale(cycle(colors, s + u, true), ripple);
  }
  if (motion === "curtain") {
    const open = 1 - Math.abs(u * 2 - 1);
    const fromCenter = Math.abs(s - 0.5) * 2;
    const lit = effect?.name.includes("Close") ? fromCenter >= 1 - open : fromCenter <= open;
    return scale(cycle(colors, u, true), lit ? 1 : 0.07);
  }
  if (motion === "trans") {
    return sampleTrans(colors, s, u, effect?.name ?? "");
  }
  if (motion === "flow" || motion === "fade" || motion === "gradual") {
    return cycle(colors, (s + u) % 1, true);
  }
  if (motion === "flush") {
    const name = effect?.name ?? "";
    const band = 0.34;
    let trail: number;
    if (name.includes("Close")) {
      const fromEnd = Math.min(s, 1 - s) * 2;
      trail = Math.max(0, 1 - Math.abs(fromEnd - u) / band);
    } else if (name.includes("Open")) {
      const fromCenter = Math.abs(s - 0.5) * 2;
      trail = Math.max(0, 1 - Math.abs(fromCenter - u) / band);
    } else {
      trail = Math.max(0, 1 - dist / band);
    }
    return scale(cycle(colors, u, true), 0.06 + Math.pow(trail, 1.2) * 0.94);
  }
  if (motion === "energy") {
    const breath = pulse(u);
    const ridge = Math.pow(Math.max(0, 1 - dist / 0.5), 1.55);
    return scale(cycle(colors, u, true), Math.min(1, 0.12 + breath * 0.55 + ridge * 0.33));
  }
  if (motion === "auto") {
    return scale(cycle(colors, s + u, true), 0.25 + 0.75 * (1 - dist / 0.5));
  }
  return scale(base, 0.35 + 0.65 * (1 - dist / 0.45));
}

