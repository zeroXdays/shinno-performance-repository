import { FALLBACK_MODEL, type ModelProfile, type TemplateByte } from "./models.ts";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, Math.round(value)));
}

function fill(template: TemplateByte[], vars: Record<string, number>): Uint8Array {
  return Uint8Array.from(
    template.map((byte) => (typeof byte === "number" ? byte : vars[byte] ?? 0)),
  );
}

export interface Rgb {
  r: number;
  g: number;
  b: number;
}

export function encodeFrame(
  template: TemplateByte[],
  vars: Record<string, number> = {},
): Uint8Array {
  return fill(template, vars);
}

export function encodePower(model: ModelProfile, on: boolean): Uint8Array {
  return fill(on ? model.commands.turnOn : model.commands.turnOff, {});
}

export function encodeColor(model: ModelProfile, rgb: Rgb): Uint8Array {
  return fill(model.commands.color, {
    r: clamp(rgb.r, 0, 255),
    g: clamp(rgb.g, 0, 255),
    b: clamp(rgb.b, 0, 255),
  });
}

/** LEDDMX pattern 0 = Off — required before a solid colour sticks. */
export const LEDDMX_PATTERN_OFF = 0;

/** Mic / EQ off — exits music-reactive mode that can look like pattern cycling. */
export const LEDDMX_MIC_OFF = Uint8Array.from([0x7b, 0xff, 0x0b, 0x00, 0x00, 0xff, 0xff, 0xff, 0xbf]);

export function isLedDmxModel(model: ModelProfile): boolean {
  return model.id.startsWith("LEDDMX");
}

/** LEDDMX must leave mic + pattern modes before a bare power-off sticks. */
export function encodePowerSequence(model: ModelProfile, on: boolean): Uint8Array[] {
  if (on) return [encodePower(model, true)];
  if (!isLedDmxModel(model)) return [encodePower(model, false)];
  return [
    LEDDMX_MIC_OFF,
    encodeEffect(model, LEDDMX_PATTERN_OFF),
    encodeColor(model, { r: 0, g: 0, b: 0 }),
    encodePower(model, false),
  ];
}

/** Power on + (mic/pattern Off for LEDDMX) + colour + brightness. */
export function encodeSolidColor(
  model: ModelProfile,
  rgb: Rgb,
  brightness: number,
): Uint8Array[] {
  const frames: Uint8Array[] = [encodePower(model, true)];
  if (isLedDmxModel(model)) {
    frames.push(LEDDMX_MIC_OFF);
    frames.push(encodeEffect(model, LEDDMX_PATTERN_OFF));
  }
  frames.push(encodeColor(model, rgb));
  frames.push(encodeBrightness(model, brightness));
  return frames;
}

/** Native brightness. `percent` is 0–100. */
export function encodeBrightness(model: ModelProfile, percent: number): Uint8Array {
  const i = clamp(percent, 0, 100);
  return fill(model.commands.brightness, { i, i32: Math.floor((i * 32) / 100) });
}

export function encodeWhite(model: ModelProfile, percent: number): Uint8Array | null {
  if (!model.commands.white) return null;
  return fill(model.commands.white, { i: clamp(percent, 0, 100) });
}

export function encodeEffect(model: ModelProfile, effectId: number): Uint8Array {
  return fill(model.commands.effect, { v: clamp(effectId, 0, 255) });
}

export function encodeEffectSpeed(model: ModelProfile, percent: number): Uint8Array {
  // UI + Shinno kits: 0/1 = slow, 100 = fast. Send the UI value through as-is.
  return fill(model.commands.effectSpeed, { v: clamp(percent, 0, 100) });
}

export function hexFrame(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join(" ");
}

export function applyRgbScale(rgb: Rgb, percent: number): Rgb {
  const scale = clamp(percent, 0, 100) / 100;
  return {
    r: clamp(rgb.r * scale, 0, 255),
    g: clamp(rgb.g * scale, 0, 255),
    b: clamp(rgb.b * scale, 0, 255),
  };
}

export { FALLBACK_MODEL };
