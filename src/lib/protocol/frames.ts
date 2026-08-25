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

/** Native brightness. `percent` is 0–100. */
export function encodeBrightness(model: ModelProfile, percent: number): Uint8Array {
  return fill(model.commands.brightness, { i: clamp(percent, 0, 100) });
}

export function encodeWhite(model: ModelProfile, percent: number): Uint8Array | null {
  if (!model.commands.white) return null;
  return fill(model.commands.white, { i: clamp(percent, 0, 100) });
}

export function encodeEffect(model: ModelProfile, effectId: number): Uint8Array {
  return fill(model.commands.effect, { v: clamp(effectId, 0, 255) });
}

export function encodeEffectSpeed(model: ModelProfile, percent: number): Uint8Array {
  // UI: 0 = slow, 100 = fast. Firmware: 0 = fastest, 100 = slowest.
  return fill(model.commands.effectSpeed, { v: clamp(100 - percent, 0, 100) });
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
