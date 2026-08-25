"use client";

import { useCallback, useMemo, useRef, useState, type PointerEvent } from "react";
import type { Rgb } from "@/lib/protocol";
import { hexToRgb, rgbToHex } from "@/lib/scenes";
import { cn } from "@/lib/utils";

/** Pointy-top hexagon that fits a square (vertices on the circumscribed circle). */
const HEX_CLIP = "polygon(50% 0%, 93.3% 25%, 93.3% 75%, 50% 100%, 6.7% 75%, 6.7% 25%)";

export function rgbToHsv(rgb: Rgb): { h: number; s: number; v: number } {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h, s, v: max };
}

export function hsvToRgb(h: number, s: number, v: number): Rgb {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0,
    g = 0,
    b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255),
  };
}

interface ColorWheelProps {
  color: Rgb;
  onChange: (color: Rgb) => void;
  disabled?: boolean;
}

export function ColorWheel({ color, onChange, disabled }: ColorWheelProps) {
  const hsv = useMemo(() => rgbToHsv(color), [color]);
  const disk = useRef<HTMLDivElement>(null);
  const [draftHex, setDraftHex] = useState<string | null>(null);
  const hexValue = draftHex ?? rgbToHex(color).toUpperCase();

  const pick = useCallback(
    (clientX: number, clientY: number) => {
      const el = disk.current;
      if (!el || disabled) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = clientX - cx;
      const dy = clientY - cy;
      const radius = rect.width / 2;
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      const dist = Math.hypot(dx, dy) / radius;
      const sat = Math.min(dist / hexRadiusAt(angle), 1);
      onChange(hsvToRgb(angle, sat, 1));
    },
    [disabled, onChange],
  );

  const onPointer = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (disabled) return;
      event.currentTarget.setPointerCapture(event.pointerId);
      pick(event.clientX, event.clientY);
    },
    [disabled, pick],
  );

  const knob = polar(hsv.h, hsv.s);
  const css = `rgb(${color.r}, ${color.g}, ${color.b})`;

  return (
    <div className="mx-auto flex w-full max-w-[20rem] flex-col items-center gap-3">
      <div className="relative aspect-square w-[86%]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-[8%] rounded-[32%] opacity-50 blur-3xl"
          style={{ background: css }}
        />
        <div
          ref={disk}
          role="slider"
          aria-label="Color hex"
          aria-valuemin={0}
          aria-valuemax={360}
          aria-valuenow={Math.round(hsv.h)}
          aria-valuetext={rgbToHex(color)}
          tabIndex={disabled ? -1 : 0}
          onPointerDown={onPointer}
          onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
            if (event.buttons === 0) return;
            pick(event.clientX, event.clientY);
          }}
          className={cn(
            "relative aspect-square w-full cursor-crosshair touch-none",
            disabled && "pointer-events-none opacity-50",
          )}
          style={{
            clipPath: HEX_CLIP,
            background: [
              "radial-gradient(circle at 50% 50%, #ffffff 0%, rgba(255,255,255,0.55) 18%, rgba(255,255,255,0) 58%)",
              "conic-gradient(from 0deg, #ff0040, #ffea00, #00ff6a, #00d4ff, #2a4bff, #d000ff, #ff0040)",
            ].join(", "),
            boxShadow: "inset 0 0 28px rgba(0,0,0,0.28)",
          }}
        >
          <svg
            viewBox="0 0 100 100"
            className="pointer-events-none absolute inset-0 h-full w-full opacity-35 mix-blend-overlay"
            aria-hidden
          >
            {HEX_VERTS.map((pt, i) => (
              <line
                key={i}
                x1="50"
                y1="50"
                x2={pt.x}
                y2={pt.y}
                stroke="white"
                strokeWidth="0.6"
              />
            ))}
            <polygon
              points={HEX_VERTS.map((pt) => `${pt.x},${pt.y}`).join(" ")}
              fill="none"
              stroke="white"
              strokeWidth="1.4"
            />
          </svg>
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 size-[22%] -translate-x-1/2 -translate-y-1/2"
            style={{
              clipPath: HEX_CLIP,
              background: css,
              boxShadow: `0 0 18px ${css}`,
            }}
          />
          <div
            className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 border-2 border-white shadow-md"
            style={{
              left: `${50 + knob.x * 46}%`,
              top: `${50 + knob.y * 46}%`,
              clipPath: HEX_CLIP,
              background: css,
            }}
          />
        </div>
      </div>

      <label
        className={cn(
          "flex items-center gap-2 rounded-full border border-white/12 bg-black/35 px-3 py-1.5",
          disabled && "opacity-50",
        )}
      >
        <span
          className="size-4 shrink-0"
          style={{ clipPath: HEX_CLIP, background: css }}
          aria-hidden
        />
        <input
          value={hexValue}
          disabled={disabled}
          spellCheck={false}
          autoCapitalize="characters"
          autoCorrect="off"
          aria-label="Hex color"
          onFocus={() => setDraftHex(rgbToHex(color).toUpperCase())}
          onChange={(event) => {
            const next = event.target.value.toUpperCase();
            setDraftHex(next);
            const raw = next.trim().replace(/^#/, "");
            const parsed = hexToRgb(next);
            if (parsed && raw.length === 6) onChange(parsed);
          }}
          onBlur={() => {
            const parsed = hexToRgb(draftHex ?? "");
            if (parsed) onChange(parsed);
            setDraftHex(null);
          }}
          className="w-[7.6rem] bg-transparent text-center font-mono text-sm tracking-[0.22em] text-white outline-none"
        />
      </label>
    </div>
  );
}

const HEX_VERTS = [
  { x: 50, y: 0 },
  { x: 93.3, y: 25 },
  { x: 93.3, y: 75 },
  { x: 50, y: 100 },
  { x: 6.7, y: 75 },
  { x: 6.7, y: 25 },
];

/** Unit radius of the hexagon edge at a hue angle (0° = up). */
export function hexRadiusAt(angle: number): number {
  const sector = ((angle % 60) + 60) % 60;
  const phi = ((sector - 30) * Math.PI) / 180;
  return Math.cos(Math.PI / 6) / Math.cos(phi);
}

function polar(hue: number, sat: number): { x: number; y: number } {
  const r = sat * hexRadiusAt(hue);
  const rad = ((hue - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * r, y: Math.sin(rad) * r };
}
