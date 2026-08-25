"use client";

import { useCallback, useMemo, useRef, type PointerEvent } from "react";
import type { Rgb } from "@/lib/protocol";
import { cn } from "@/lib/utils";

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
      const dist = Math.min(Math.hypot(dx, dy) / radius, 1);
      let angle = Math.atan2(dy, dx) * (180 / Math.PI) + 90;
      if (angle < 0) angle += 360;
      onChange(hsvToRgb(angle, dist, 1));
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

  return (
    <div className="mx-auto flex w-full max-w-[22rem] flex-col items-center gap-4">
      <div
        ref={disk}
        role="slider"
        aria-label="Color wheel"
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsv.h)}
        aria-valuetext={`${Math.round(color.r)}, ${Math.round(color.g)}, ${Math.round(color.b)}`}
        tabIndex={disabled ? -1 : 0}
        onPointerDown={onPointer}
        onPointerMove={(event: PointerEvent<HTMLDivElement>) => {
          if (event.buttons === 0) return;
          pick(event.clientX, event.clientY);
        }}
        className={cn(
          "relative aspect-square w-full cursor-crosshair touch-none rounded-full",
          disabled && "pointer-events-none opacity-50",
        )}
        style={{
          background: [
            "radial-gradient(circle, #fff 0%, rgba(255,255,255,0) 62%)",
            "conic-gradient(from 0deg, #ff0040, #ffea00, #00ff6a, #00d4ff, #2a4bff, #d000ff, #ff0040)",
          ].join(", "),
          boxShadow:
            "0 0 0 1px rgba(255,255,255,0.08), 0 20px 50px rgba(0,0,0,0.45), inset 0 0 40px rgba(0,0,0,0.25)",
        }}
      >
        <div
          className="pointer-events-none absolute left-1/2 top-1/2 size-[28%] -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20"
          style={{
            background: `rgb(${color.r}, ${color.g}, ${color.b})`,
            boxShadow: `0 0 28px rgb(${color.r}, ${color.g}, ${color.b})`,
          }}
        />
        <div
          className="pointer-events-none absolute size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
          style={{
            left: `${50 + knob.x * 42}%`,
            top: `${50 + knob.y * 42}%`,
            background: `rgb(${color.r}, ${color.g}, ${color.b})`,
          }}
        />
      </div>
    </div>
  );
}

function polar(hue: number, sat: number): { x: number; y: number } {
  const rad = ((hue - 90) * Math.PI) / 180;
  return { x: Math.cos(rad) * sat, y: Math.sin(rad) * sat };
}
