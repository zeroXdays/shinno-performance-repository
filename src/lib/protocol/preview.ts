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
  const colors = paletteFromName(effectById(id)?.name ?? "").filter(
    (color): color is Rgb => Boolean(color) && Number.isFinite(color.r),
  );
  return colors.length > 0 ? colors : RAINBOW;
}

const DMX: Record<string, Rgb> = {
  RD: RED,
  GN: GREEN,
  BU: BLUE,
  YE: YELLOW,
  CN: CYAN,
  VT: PURPLE,
  WH: WHITE,
  BK: { r: 0, g: 0, b: 0 },
  R: RED,
  G: GREEN,
  B: BLUE,
  Y: YELLOW,
  C: CYAN,
  P: PURPLE,
  W: WHITE,
};

function firstDmxToken(name: string): Rgb | undefined {
  const upper = name.toUpperCase();
  const keys = Object.keys(DMX).sort((a, b) => b.length - a.length);
  for (const key of keys) {
    if (new RegExp(`\\b${key}\\b`).test(upper)) return DMX[key];
  }
  return undefined;
}

function letterCodes(name: string): Rgb[] | undefined {
  // Character scan — same as iOS. Avoid regex `\b` pitfalls around hyphens.
  const allowed = new Set("WRGBYCP");
  const chars = [...name];
  let best: Rgb[] | undefined;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (!allowed.has(ch) || !LETTER[ch]) continue;
    if (i > 0) {
      const prev = chars[i - 1];
      if (prev === "-" || allowed.has(prev) || /[A-Za-z0-9]/.test(prev)) continue;
    }
    const colors: Rgb[] = [LETTER[ch]];
    let j = i + 1;
    while (j + 1 < chars.length && chars[j] === "-" && allowed.has(chars[j + 1]) && LETTER[chars[j + 1]]) {
      colors.push(LETTER[chars[j + 1]]);
      j += 2;
    }
    if (colors.length >= 2) {
      const ended =
        j >= chars.length || chars[j] === " " || (!allowed.has(chars[j]) && chars[j] !== "-");
      if (ended && (!best || colors.length > best.length)) best = colors;
    }
  }
  return best;
}

function spacedLetterCodes(name: string): Rgb[] | undefined {
  const match = name.match(/\b[WRGBYCP](?:\s+[WRGBYCP])+\b/);
  if (!match) return undefined;
  const parts = match[0].split(/\s+/);
  const colors = parts.map((p) => LETTER[p]).filter(Boolean);
  return colors.length === parts.length && colors.length >= 2 ? colors : undefined;
}

function dmxSlashCodes(name: string): Rgb[] | undefined {
  const match = name.toUpperCase().match(/\b(?:WH|RD|GN|BU|YE|CN|VT|BK)(?:\/(?:WH|RD|GN|BU|YE|CN|VT|BK))+\b/);
  if (!match) return undefined;
  const parts = match[0].split("/");
  const colors = parts.map((p) => DMX[p]).filter(Boolean);
  return colors.length === parts.length && colors.length > 0 ? colors : undefined;
}

function dmxSpaceCodes(name: string): Rgb[] | undefined {
  const match = name
    .toUpperCase()
    .match(/\b(?:WH|RD|GN|BU|YE|CN|VT|BK)(?:\s+(?:WH|RD|GN|BU|YE|CN|VT|BK)){1,2}\b/);
  if (!match) return undefined;
  const parts = match[0].split(/\s+/);
  const colors = parts.map((p) => DMX[p]).filter(Boolean);
  return colors.length === parts.length && colors.length >= 2 ? colors : undefined;
}

function leadingLetterCodePalette(name: string): Rgb[] | undefined {
  const tokens: [string, Rgb[]][] = [
    ["B-P-C-Y", [BLUE, PURPLE, CYAN, YELLOW]],
    ["B-G-C-Y", [BLUE, GREEN, CYAN, YELLOW]],
    ["R-G-B", [RED, GREEN, BLUE]],
    ["Y-C-P", [YELLOW, CYAN, PURPLE]],
    ["W-R-W", [WHITE, RED, WHITE]],
    ["W-G-W", [WHITE, GREEN, WHITE]],
    ["W-B-W", [WHITE, BLUE, WHITE]],
    ["W-Y-W", [WHITE, YELLOW, WHITE]],
    ["W-C-W", [WHITE, CYAN, WHITE]],
    ["W-P-W", [WHITE, PURPLE, WHITE]],
    ["R-W-R", [RED, WHITE, RED]],
    ["G-W-G", [GREEN, WHITE, GREEN]],
    ["B-W-B", [BLUE, WHITE, BLUE]],
    ["Y-W-Y", [YELLOW, WHITE, YELLOW]],
    ["C-W-C", [CYAN, WHITE, CYAN]],
    ["P-W-P", [PURPLE, WHITE, PURPLE]],
    ["R-G", [RED, GREEN]],
    ["G-B", [GREEN, BLUE]],
    ["Y-B", [YELLOW, BLUE]],
    ["Y-C", [YELLOW, CYAN]],
    ["C-P", [CYAN, PURPLE]],
    ["R-Y", [RED, YELLOW]],
    ["R-P", [RED, PURPLE]],
    ["G-C", [GREEN, CYAN]],
    ["G-Y", [GREEN, YELLOW]],
    ["B-P", [BLUE, PURPLE]],
  ].sort((a, b) => b[0].length - a[0].length);
  for (const [token, colors] of tokens) {
    if (name === token || name.startsWith(token + " ")) return colors;
  }
  return undefined;
}

function paletteFromName(name: string): Rgb[] {
  const leading = leadingLetterCodePalette(name);
  if (leading) return leading;
  const letters = letterCodes(name);
  if (letters) return letters;
  const spaced = spacedLetterCodes(name);
  if (spaced) return spaced;
  const slash = dmxSlashCodes(name);
  if (slash) return slash;
  const spacedDmx = dmxSpaceCodes(name);
  if (spacedDmx) return spacedDmx;

  const six = name.match(/6-Color to (Red|Green|Blue|Yellow|Cyan|Purple|White)/i);
  if (six && WORD[six[1]]) {
    const target = WORD[six[1]];
    return [...RAINBOW.filter((c) => c !== target), target];
  }
  if (name.includes("6 Colors")) {
    const target = firstDmxToken(name);
    if (target) return [...RAINBOW.filter((c) => c !== target), target];
  }

  const inBg = name.match(/7-Color in (Red|Green|Blue|Yellow|Cyan|Purple|White)/i);
  if (inBg && WORD[inBg[1]]) {
    const bg = WORD[inBg[1]];
    return [bg, ...RAINBOW.filter((c) => c !== bg)];
  }
  if (name.toUpperCase().includes("7 COLOR ON")) {
    const bg = firstDmxToken(name);
    if (bg) return [bg, ...RAINBOW.filter((c) => c !== bg)];
  }

  const dot = name.match(
    /(Red|Green|Blue|Yellow|Cyan|Purple|White)-Dot in (Red|Green|Blue|Yellow|Cyan|Purple|White)/i,
  );
  if (dot && WORD[dot[1]] && WORD[dot[2]]) return [WORD[dot[2]], WORD[dot[1]]];

  const onPair = name.toUpperCase().match(/\b(WH|RD|GN|BU|YE|CN|VT|BK)\s+ON\s+(WH|RD|GN|BU|YE|CN|VT|BK)\b/);
  if (onPair) return [DMX[onPair[2]], DMX[onPair[1]]];

  if (name.includes("B-P-C-Y")) return [BLUE, PURPLE, CYAN, YELLOW];
  if (name.includes("B-G-C-Y")) return [BLUE, GREEN, CYAN, YELLOW];
  if (name.includes("BK/WH")) return [{ r: 0, g: 0, b: 0 }, WHITE];

  if (
    name.includes("7-Color") ||
    name.includes("7 Colors") ||
    name.includes("7 COLORS") ||
    name.includes("Magic") ||
    name.includes("Dreaming") ||
    name.includes("Auto Play") ||
    name.includes("Energy") ||
    name.includes("Flutter") ||
    name.includes("Follow Spot") ||
    name.includes("Swab")
  ) {
    return RAINBOW;
  }

  const single = name.match(/\b(Red|Green|Blue|Yellow|Cyan|Purple|White)\b/i);
  if (single) {
    const key = single[1][0].toUpperCase() + single[1].slice(1).toLowerCase();
    if (WORD[key]) return [WORD[key]];
  }
  const dmxSingle = firstDmxToken(name);
  if (dmxSingle) return [dmxSingle];
  return RAINBOW;
}

export function motionFor(effect: LedEffect | undefined): Motion {
  const name = effect?.name ?? "";
  const group = effect?.group ?? "basic";
  if (name.includes("Auto Play")) return "auto";
  if (
    name.includes("Magic") ||
    name.includes("Dreaming") ||
    name.includes("Flutter") ||
    name.includes("Follow Spot") ||
    name.includes("Swab")
  ) {
    return "magic";
  }
  if (name.includes("Energy")) return "energy";
  if (name.includes("Strobe")) return "strobe";
  if (name.includes("Jump") || name.includes("Hop")) return "jump";
  if (name.includes("Gradual")) return "gradual";
  if (name.includes("Marquee")) return "marquee";
  if (name.includes("Flush")) return "flush";
  if (name.includes("Wave")) return "wave";
  if (name.includes("Race") || name.includes("Horse Race")) return "race";
  if (name.includes("Trailing")) return "tail";
  if (name.includes("Streaming")) return "water";
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
  return (
    group === "runback" ||
    name.includes("Back") ||
    name.includes("Backward") ||
    name.includes("Close")
  );
}

/**
 * UI speed: 0 = slow, 100 = fast.
 * encodeEffectSpeed sends the same scale to the kit.
 */
export function effectPeriodMs(speed: number, group: EffectGroup | Motion): number {
  const ui = Number.isFinite(speed) ? speed : 50;
  const t = 1 - Math.min(100, Math.max(0, ui)) / 100;
  if (group === "strobe") return 280 + t * 1100;
  if (group === "race") return 1100 + t * 2600;
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

function allowSmooth(colors: Rgb[]): boolean {
  // Only true rainbow blends — RGB-lerp of R→G invents yellow and looks like rainbow.
  return colors.length >= 7;
}

function sampleTrans(colors: Rgb[], s: number, u: number, name: string): Rgb {
  const toTarget = name.includes("6-Color to") || name.includes("6 Colors");
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

  // Hard stops only so R-G-B Trans stays red/green/blue — never a muddy rainbow wash.
  const pos = u * palette.length;
  const i = wrap(Math.floor(pos), palette.length);
  const t = pos - Math.floor(pos);
  const from = palette[i];
  const to = palette[wrap(i + 1, palette.length)];
  const edge = 0.18;
  const arrive = Math.max(0, Math.min(1, (t - local) / edge + 0.5));
  const chosen = arrive < 0.5 ? from : to;
  const front = Math.max(0, 1 - Math.abs(local - t) / 0.09);
  return scale(chosen, 0.45 + (arrive < 0.5 ? 1 - arrive : arrive) * 0.4 + front * 0.2);
}

function wrap(i: number, n: number): number {
  if (n <= 0 || !Number.isFinite(i)) return 0;
  const m = i % n;
  return m < 0 ? m + n : m;
}

function mix(a: Rgb | undefined, b: Rgb | undefined, t: number): Rgb {
  const left = a ?? { r: 0, g: 0, b: 0 };
  const right = b ?? left;
  const u = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0));
  return {
    r: Math.round(left.r + (right.r - left.r) * u),
    g: Math.round(left.g + (right.g - left.g) * u),
    b: Math.round(left.b + (right.b - left.b) * u),
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
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  if (colors.length === 1) return colors[0];
  const wrapped = ((u % 1) + 1) % 1;
  const pos = wrapped * colors.length;
  const i = wrap(Math.floor(pos), colors.length);
  const next = colors[wrap(i + 1, colors.length)];
  if (!smooth) return colors[i] ?? next ?? { r: 0, g: 0, b: 0 };
  return mix(colors[i], next, pos - i);
}

function pulse(u: number): number {
  return 0.08 + 0.92 * (0.5 - 0.5 * Math.cos(u * Math.PI * 2));
}

function sampleMagic(colors: Rgb[], s: number, u: number, reverse: boolean): Rgb {
  // Rainbow occupies the whole ring and rotates forever — no dark gap, no hold.
  const along = reverse ? 1 - s : s;
  return cycle(colors, along - u, false);
}

function sampleRace(colors: Rgb[], s: number, elapsedMs: number, period: number, reverse: boolean): Rgb {
  // Solid field; the next color runs through and takes over.
  if (colors.length === 0) return { r: 0, g: 0, b: 0 };
  if (colors.length === 1) return colors[0];
  const elapsed = Number.isFinite(elapsedMs) ? elapsedMs : 0;
  const takeovers = period <= 0 ? 0 : elapsed / period;
  const i = Math.floor(takeovers);
  const t = takeovers - i;
  const from = colors[wrap(i, colors.length)];
  const to = colors[wrap(i + 1, colors.length)];
  const pos = reverse ? 1 - s : s;
  const edge = 0.05;
  if (pos < t - edge) return to ?? from ?? { r: 0, g: 0, b: 0 };
  if (pos > t + edge) return from ?? to ?? { r: 0, g: 0, b: 0 };
  const blend = (pos - (t - edge)) / (edge * 2);
  return mix(to, from, blend);
}

export function sampleEffect(id: number, elapsedMs: number, speed: number): Rgb {
  const effect = effectById(id);
  const colors = paletteFor(id);
  const motion = motionFor(effect);
  const group = effect?.group ?? "basic";
  const period = effectPeriodMs(speed, motion);
  let u = period <= 0 ? 0 : (elapsedMs / period) % 1;
  const rev = Boolean(effect && reversed(effect.name, group));
  if (rev && motion !== "magic" && motion !== "race") u = (1 - u + 1) % 1;

  if (motion === "strobe") {
    const on = u < 0.42 || (u > 0.5 && u < 0.62);
    if (!on) return { r: 0, g: 0, b: 0 };
    return cycle(colors, u, false);
  }
  if (motion === "jump") {
    return cycle(colors, u, false);
  }
  if (motion === "race") {
    const takeovers = period <= 0 ? 0 : elapsedMs / period;
    const i = Math.floor(takeovers);
    const t = takeovers - i;
    if (colors.length < 2) return colors[0] ?? { r: 0, g: 0, b: 0 };
    return mix(colors[wrap(i, colors.length)], colors[wrap(i + 1, colors.length)], t);
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
    return cycle(colors, rev ? -u : u, false);
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
  const rev = Boolean(effect && reversed(effect.name, group));
  if (rev && motion !== "magic" && motion !== "race") u = (1 - u + 1) % 1;
  const s = count <= 1 ? 0 : index / (count - 1);
  const dist = Math.min(Math.abs(s - u), Math.abs(s - u + 1), Math.abs(s - u - 1));
  const base = cycle(colors, u, motion !== "jump" && motion !== "race" && motion !== "strobe");

  if (motion === "strobe") {
    const on = u < 0.42 || (u > 0.5 && u < 0.62);
    return on ? cycle(colors, s, false) : { r: 0, g: 0, b: 0 };
  }
  if (motion === "jump") {
    return cycle(colors, u + s * 0.02, false);
  }
  if (motion === "race") {
    return sampleRace(colors, s, elapsedMs, period, rev);
  }
  if (motion === "magic") {
    return sampleMagic(colors, s, u, rev);
  }
  if (motion === "tail" || motion === "marquee") {
    const trail = Math.max(0, 1 - dist / 0.28);
    return scale(cycle(colors, u, false), 0.06 + trail * trail * 0.94);
  }
  if (motion === "run") {
    const name = effect?.name ?? "";
    if (name.includes("7-Color in") || name.includes("7 COLOR ON")) {
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
    if (name.includes("Dot") || name.includes(" in ") || name.includes(" ON ")) {
      return dist < 0.08 ? (colors[1] ?? WHITE) : colors[0];
    }
    return scale(cycle(colors, u, false), head);
  }
  if (motion === "water" || motion === "wave") {
    const ripple = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin((s + u) * Math.PI * 4));
    return scale(cycle(colors, s + u, allowSmooth(colors)), ripple);
  }
  if (motion === "curtain") {
    const open = 1 - Math.abs(u * 2 - 1);
    const fromCenter = Math.abs(s - 0.5) * 2;
    const lit = effect?.name.includes("Close") ? fromCenter >= 1 - open : fromCenter <= open;
    return scale(cycle(colors, u, allowSmooth(colors)), lit ? 1 : 0.07);
  }
  if (motion === "trans") {
    return sampleTrans(colors, s, u, effect?.name ?? "");
  }
  if (motion === "flow" || motion === "fade" || motion === "gradual") {
    return cycle(colors, (s + u) % 1, allowSmooth(colors) && motion !== "flow");
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
    return scale(cycle(colors, u, allowSmooth(colors)), 0.06 + Math.pow(trail, 1.2) * 0.94);
  }
  if (motion === "energy") {
    const breath = pulse(u);
    const ridge = Math.pow(Math.max(0, 1 - dist / 0.5), 1.55);
    return scale(cycle(colors, u, allowSmooth(colors)), Math.min(1, 0.12 + breath * 0.55 + ridge * 0.33));
  }
  if (motion === "auto") {
    return scale(cycle(colors, s + u, allowSmooth(colors)), 0.25 + 0.75 * (1 - dist / 0.5));
  }
  return scale(base, 0.35 + 0.65 * (1 - dist / 0.45));
}

