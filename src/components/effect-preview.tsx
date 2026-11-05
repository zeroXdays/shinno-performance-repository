"use client";

import { useMemo } from "react";
import { useClock } from "@/hooks/use-clock";
import { useI18n } from "@/lib/i18n";
import {
  effectById,
  motionFor,
  paletteFor,
  rgbCss,
  sampleLed,
  type LedEffect,
} from "@/lib/protocol";
import { cn, svgCoord } from "@/lib/utils";

const LEDS = 20;

export function ModeGlyph({
  effect,
  speed,
  className,
}: {
  effect: LedEffect;
  speed: number;
  className?: string;
}) {
  const elapsed = useClock(true);
  const motion = motionFor(effect);
  const points = useMemo(() => pathFor(motion), [motion]);
  const d = useMemo(() => polyline(points), [points]);
  const palette = useMemo(() => paletteFor(effect.id), [effect.id]);

  return (
    <div className={cn("flex h-full w-full flex-col gap-1", className)}>
      <svg viewBox="0 0 100 100" className="min-h-0 w-full flex-1" aria-hidden>
        <path d={d} fill="none" stroke="rgba(255,255,255,0.14)" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round" />
        {points.map((point, index) => {
          const rgb = sampleLed(effect.id, index, LEDS, elapsed, speed);
          return (
            <circle
              key={index}
              cx={svgCoord(point.x)}
              cy={svgCoord(point.y)}
              r="3.2"
              fill={rgbCss(rgb)}
              style={{ filter: `drop-shadow(0 0 2.5px ${rgbCss(rgb, 0.85)})` }}
            />
          );
        })}
      </svg>
      <div className="flex h-1.5 gap-0.5 px-1">
        {palette.map((rgb, i) => (
          <span key={i} className="h-full flex-1 rounded-[1px]" style={{ background: rgbCss(rgb) }} />
        ))}
      </div>
    </div>
  );
}

export function PlayingBar({
  effectId,
  speed,
  power,
}: {
  effectId?: number;
  speed: number;
  power: boolean;
}) {
  const { t } = useI18n();
  const effect = effectId != null ? effectById(effectId) : undefined;
  return (
    <div className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0a0a]">
      <div className="mx-auto h-24 w-24">
        {effect && power ? (
          <ModeGlyph effect={effect} speed={speed} />
        ) : (
          <div className="flex h-full items-center justify-center text-xs text-white/35">{t("effects.pick")}</div>
        )}
      </div>
      <p className="px-3 pb-2 text-center text-xs text-white/50">
        {effect ? effect.name : t("effects.path")}
      </p>
    </div>
  );
}

function pathFor(motion: ReturnType<typeof motionFor>): { x: number; y: number }[] {
  if (motion === "water" || motion === "wave") return wave();
  if (motion === "curtain") return curtain();
  if (
    motion === "run" ||
    motion === "tail" ||
    motion === "marquee" ||
    motion === "flow" ||
    motion === "fade" ||
    motion === "gradual" ||
    motion === "flush" ||
    motion === "trans"
  ) {
    return line();
  }
  return ring();
}

function line(): { x: number; y: number }[] {
  return Array.from({ length: LEDS }, (_, i) => {
    const t = i / (LEDS - 1);
    return { x: 10 + t * 80, y: 50 };
  });
}

function wave(): { x: number; y: number }[] {
  return Array.from({ length: LEDS }, (_, i) => {
    const t = i / (LEDS - 1);
    return { x: 10 + t * 80, y: 50 + Math.sin(t * Math.PI * 3) * 18 };
  });
}

function curtain(): { x: number; y: number }[] {
  const left = Array.from({ length: LEDS / 2 }, (_, i) => ({ x: 18, y: 14 + (i / (LEDS / 2 - 1)) * 72 }));
  const right = Array.from({ length: LEDS / 2 }, (_, i) => ({ x: 82, y: 14 + (i / (LEDS / 2 - 1)) * 72 }));
  return [...left, ...right];
}

function ring(): { x: number; y: number }[] {
  const inset = 16;
  const w = 100 - inset * 2;
  const h = 100 - inset * 2;
  const perim = 2 * (w + h);
  return Array.from({ length: LEDS }, (_, i) => {
    let d = (i / LEDS) * perim;
    if (d < w) return { x: inset + d, y: inset };
    d -= w;
    if (d < h) return { x: inset + w, y: inset + d };
    d -= h;
    if (d < w) return { x: inset + w - d, y: inset + h };
    d -= w;
    return { x: inset, y: inset + h - d };
  });
}

function polyline(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ");
}
