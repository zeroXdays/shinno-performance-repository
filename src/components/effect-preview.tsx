"use client";

import { useClock } from "@/hooks/use-clock";
import { effectById, rgbCss, sampleEffect, type LedEffect } from "@/lib/protocol";

export function PlayingBar({
  effectId,
  speed,
  power,
}: {
  effectId?: number;
  speed: number;
  power: boolean;
}) {
  const playing = Boolean(power && effectId != null);
  const elapsed = useClock(playing);
  const effect = effectId != null ? effectById(effectId) : undefined;
  const rgb = playing && effectId != null ? sampleEffect(effectId, elapsed, speed) : null;

  return (
    <div className="overflow-hidden rounded-md border border-white/10">
      <div
        className="h-16 w-full"
        style={{
          background: rgb ? rgbCss(rgb) : "rgba(255,255,255,0.08)",
          boxShadow: rgb ? `inset 0 0 48px ${rgbCss(rgb, 0.45)}` : undefined,
        }}
      />
      <p className="px-3 py-1.5 text-xs text-white/50">
        {effect ? `${effect.name} · playing on the car` : "Pick a mode. The bar and the car both play it."}
      </p>
    </div>
  );
}

export function EffectStrip({
  effect,
  speed,
  className,
}: {
  effect: LedEffect;
  speed: number;
  className?: string;
}) {
  const elapsed = useClock(true);
  const rgb = sampleEffect(effect.id, elapsed, speed);

  return (
    <span
      className={className}
      style={{
        display: "block",
        overflow: "hidden",
        background: rgbCss(rgb),
        boxShadow: `0 0 12px ${rgbCss(rgb, 0.45)}`,
      }}
    />
  );
}
