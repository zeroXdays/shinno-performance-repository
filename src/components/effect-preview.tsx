"use client";

import { useMemo } from "react";
import { useClock } from "@/hooks/use-clock";
import {
  EFFECTS,
  effectById,
  effectPeriodMs,
  paletteFor,
  rgbCss,
  sampleEffect,
  type LedEffect,
} from "@/lib/protocol";

export function EffectPreviewStyles() {
  const css = useMemo(() => EFFECTS.map((effect) => keyframes(effect)).join("\n"), []);
  return <style>{css}</style>;
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
  const period = effectPeriodMs(speed, effect.group) / 1000;
  const timing =
    effect.group === "breathe" ? "ease-in-out" : effect.group === "jump" || effect.group === "blink" ? "step-end" : "linear";
  const first = paletteFor(effect.id)[0];

  return (
    <span
      className={className}
      style={{
        display: "block",
        overflow: "hidden",
        background: rgbCss(first),
        boxShadow: `0 0 12px ${rgbCss(first, 0.45)}`,
        animation: `shinno-fx-${effect.id} ${period}s ${timing} infinite`,
      }}
    />
  );
}

function keyframes(effect: LedEffect): string {
  const id = `shinno-fx-${effect.id}`;
  const colors = paletteFor(effect.id).map((c) => `rgb(${c.r}, ${c.g}, ${c.b})`);
  const n = colors.length;

  if (effect.group === "breathe") {
    if (n === 1) {
      return `@keyframes ${id}{0%,100%{background:${colors[0]};filter:brightness(.12);box-shadow:0 0 0 ${colors[0]}}50%{background:${colors[0]};filter:brightness(1);box-shadow:0 0 16px ${colors[0]}}}`;
    }
    const stops = colors
      .map((color, i) => {
        const p = (i / n) * 100;
        const dim = i % 2 === 0 ? 1 : 0.18;
        return `${p}%{background:${color};filter:brightness(${dim});box-shadow:0 0 ${dim > 0.5 ? 16 : 0}px ${color}}`;
      })
      .join("");
    return `@keyframes ${id}{${stops}100%{background:${colors[0]};filter:brightness(.18)}}`;
  }

  if (effect.group === "blink") {
    if (n === 1) {
      return `@keyframes ${id}{0%,38%{background:${colors[0]};filter:brightness(1)}42%,100%{background:#000;filter:brightness(0)}}`;
    }
    const slice = 100 / n;
    const stops = colors
      .map((color, i) => {
        const a = i * slice;
        const on = a + slice * 0.4;
        const b = (i + 1) * slice;
        return `${a}%{background:${color};filter:brightness(1)}${on}%{background:#000;filter:brightness(0)}${b}%{background:#000;filter:brightness(0)}`;
      })
      .join("");
    return `@keyframes ${id}{${stops}}`;
  }

  if (effect.group === "jump") {
    const slice = 100 / n;
    const stops = colors
      .map((color, i) => {
        const a = i * slice;
        const b = (i + 1) * slice - 0.01;
        return `${a}%,${b}%{background:${color}}`;
      })
      .join("");
    return `@keyframes ${id}{${stops}100%{background:${colors[0]}}}`;
  }

  const stops = colors.map((color, i) => `${(i / n) * 100}%{background:${color}}`).join("");
  return `@keyframes ${id}{${stops}100%{background:${colors[0]}}}`;
}
