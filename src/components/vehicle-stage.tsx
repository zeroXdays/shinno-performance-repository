"use client";

import { useClock } from "@/hooks/use-clock";
import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { ZONES } from "@/lib/catalog";
import { rgbToCss } from "@/lib/scenes";
import { sampleEffect, sampleLed } from "@/lib/protocol";
import { cn } from "@/lib/utils";

interface VehicleStageProps {
  car: CarId;
  controllers: Controller[];
  target: "all" | ZoneKind;
  onSelect: (zone: "all" | ZoneKind) => void;
}

export function VehicleStage({ car, controllers, target, onSelect }: VehicleStageProps) {
  const zoneCtrl = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);
  const playing = controllers.some((controller) => controller.power && controller.effectId != null);
  const elapsed = useClock(playing);

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="grid grid-cols-2 gap-2">
        {ZONES.filter((zone) => zone.id !== "custom").map((zone) => {
          const controller = zoneCtrl(zone.id);
          const selected = target === zone.id;
          const on = Boolean(controller?.power);
          const glow = fill(controller, elapsed);
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => toggle(zone.id)}
              className={cn(
                "flex flex-col items-center gap-2 rounded-2xl border px-3 py-4 transition",
                selected
                  ? "border-white/50 bg-white/10"
                  : target === "all"
                    ? "border-white/10 bg-white/5"
                    : "border-white/5 bg-black/40 opacity-55",
              )}
            >
              <span
                className="flex h-20 w-full items-center justify-center"
                style={{
                  filter: on ? `drop-shadow(0 0 8px ${glow})` : undefined,
                }}
              >
                <ProductIcon
                  zone={zone.id}
                  caption={car.toUpperCase()}
                  controller={controller}
                  elapsed={elapsed}
                />
              </span>
              <span className="text-xs font-medium tracking-wide text-white/80">{zone.label}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] tracking-wide text-white/40">
        {target === "all" ? "All lights" : label(target)} · tap a product
      </p>
    </div>
  );
}

function ProductIcon({
  zone,
  caption,
  controller,
  elapsed,
}: {
  zone: ZoneKind;
  caption: string;
  controller?: Controller;
  elapsed: number;
}) {
  if (zone === "emblem") return <EmblemIcon controller={controller} elapsed={elapsed} />;
  if (zone === "mirrors") return <MirrorsIcon controller={controller} elapsed={elapsed} />;
  if (zone === "bumper") return <BumperIcon controller={controller} elapsed={elapsed} />;
  if (zone === "grille") return <BadgeIcon caption={caption} controller={controller} elapsed={elapsed} />;
  return null;
}

function EmblemIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const leds = 8;
  return (
    <svg viewBox="0 0 120 90" className="h-20 w-auto" aria-hidden>
      <ellipse cx="60" cy="45" rx="54" ry="38" fill="#141416" stroke="#d0d4da" strokeWidth="4" />
      {on
        ? Array.from({ length: leds }, (_, i) => {
            const rgb = ledColor(controller, elapsed, i, leds);
            const a = -Math.PI / 2 + (i / leds) * Math.PI * 2;
            return (
              <ellipse
                key={i}
                cx={60 + Math.cos(a) * 36}
                cy={45 + Math.sin(a) * 24}
                rx="11"
                ry="8"
                fill={rgbToCss(rgb, 0.85)}
              />
            );
          })
        : null}
      <path
        d="M60 14C48 28 40 42 32 66c8-6 16-10 24-8l4 16 4-16c8-2 16 2 24 8C80 42 72 28 60 14Z"
        fill="#eceef2"
      />
    </svg>
  );
}

function MirrorsIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <svg viewBox="0 0 160 80" className="h-16 w-auto" aria-hidden>
      <MirrorCap x={8} y={18} flip controller={controller} elapsed={elapsed} />
      <MirrorCap x={88} y={18} controller={controller} elapsed={elapsed} />
    </svg>
  );
}

function MirrorCap({
  x,
  y,
  flip,
  controller,
  elapsed,
}: {
  x: number;
  y: number;
  flip?: boolean;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const count = 7;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -1 : 1} 1) translate(${flip ? -64 : 0} 0)`}>
      <path d="M4 28 C 10 6 54 2 62 16 C 66 30 40 48 12 46 C 2 42 0 34 4 28 Z" fill="#3a3e44" stroke="#0c0d10" strokeWidth="1.6" />
      {Array.from({ length: count }, (_, i) => {
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <rect
            key={i}
            x={10 + i * 7}
            y={18}
            width="5.5"
            height="10"
            rx="1"
            fill={on ? rgbToCss(rgb, 0.9) : "#2a2c30"}
          />
        );
      })}
    </g>
  );
}

function BumperIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const count = 5;
  return (
    <svg viewBox="0 0 180 70" className="h-14 w-auto" aria-hidden>
      <path
        d="M8 18 h150 c12 0 20 8 22 16 c2 8-4 18-16 20 H20 C8 52 4 36 8 18 Z"
        fill="#0d0e12"
        stroke="#2a2c30"
        strokeWidth="1.6"
      />
      {Array.from({ length: count }, (_, i) => {
        const rgb = ledColor(controller, elapsed, i, count);
        const cx = 28 + i * 30;
        return (
          <g key={i}>
            <circle cx={cx} cy="34" r="9" fill="#16181c" stroke="#2c2e32" />
            <circle cx={cx} cy="34" r="5.4" fill={on ? rgbToCss(rgb, 0.95) : "#2a2c30"} />
          </g>
        );
      })}
    </svg>
  );
}

function BadgeIcon({
  caption,
  controller,
  elapsed,
}: {
  caption: string;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const rgb = on
    ? controller?.effectId != null
      ? sampleEffect(controller.effectId, elapsed, controller.effectSpeed)
      : controller!.color
    : { r: 22, g: 22, b: 24 };
  return (
    <svg viewBox="0 0 160 70" className="h-14 w-auto" aria-hidden>
      <text
        x="80"
        y="48"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="36"
        letterSpacing="-1.5"
        fill={on ? rgbToCss(rgb, 0.95) : "#1a1a1c"}
        stroke="#d4d8de"
        strokeWidth="3"
        paintOrder="stroke fill"
      >
        {caption}
      </text>
    </svg>
  );
}

function ledColor(controller: Controller | undefined, elapsed: number, i: number, count: number) {
  if (!controller?.power) return { r: 40, g: 40, b: 44 };
  if (controller.effectId != null) {
    return sampleLed(controller.effectId, i, count, elapsed, controller.effectSpeed);
  }
  return controller.color;
}

function fill(controller: Controller | undefined, elapsed: number): string {
  if (!controller?.power) return "rgba(70,70,74,0.7)";
  if (controller.effectId != null) {
    const rgb = sampleEffect(controller.effectId, elapsed, controller.effectSpeed);
    return rgbToCss(rgb, 0.28 + (controller.brightness / 100) * 0.72);
  }
  return rgbToCss(controller.color, 0.38 + (controller.brightness / 100) * 0.62);
}

function label(zone: ZoneKind): string {
  switch (zone) {
    case "emblem":
      return "Emblem";
    case "mirrors":
      return "Mirrors";
    case "bumper":
      return "Bumper";
    case "grille":
      return "Grille";
    default:
      return "Other";
  }
}
