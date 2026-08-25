"use client";

import Image from "next/image";
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

const PHOTOS: Record<CarId, { src: string; alt: string }> = {
  q50: { src: "/cars/q50.jpg", alt: "Infiniti Q50" },
  q60: { src: "/cars/q60.jpg", alt: "Infiniti Q60" },
  q70: { src: "/cars/q70.jpg", alt: "Infiniti Q70" },
};

type FixtureKind = "emblem" | "badge" | "mirror" | "bumper";

interface Fixture {
  zone: ZoneKind;
  kind: FixtureKind;
  /** Percent of the photo box — measured from the 3/4 studio plates. */
  left: number;
  top: number;
  width: number;
  rotate: number;
  /** 1 = as drawn; <1 foreshortens a face that turns away. */
  scaleX: number;
  leds: number;
  /** Flip bumper/mirror housings that point the other way. */
  mirror?: boolean;
  caption?: string;
}

/**
 * Q50 3/4 (1600×1067): oval at ~17–23% × 51–58%, Q50 script under it in the
 * mesh, passenger sequential on the far mirror (~29×33), driver sequential on
 * the near mirror cap (~74–80 × 38), bumper bars in the fog recesses.
 */
const LAYOUTS: Record<CarId, Fixture[]> = {
  q50: [
    { zone: "emblem", kind: "emblem", left: 16.9, top: 50.6, width: 6.4, rotate: 8, scaleX: 0.9, leds: 8 },
    { zone: "grille", kind: "badge", left: 17.2, top: 57.4, width: 8.4, rotate: 6, scaleX: 0.92, leds: 6, caption: "Q50" },
    { zone: "mirrors", kind: "mirror", left: 27.2, top: 31.4, width: 4.2, rotate: -20, scaleX: 0.85, leds: 9 },
    { zone: "mirrors", kind: "mirror", left: 75.6, top: 34.6, width: 5.4, rotate: 8, scaleX: 1, leds: 9 },
    { zone: "bumper", kind: "bumper", left: 7.4, top: 67.0, width: 8.0, rotate: -10, scaleX: 0.88, leds: 5, mirror: true },
    { zone: "bumper", kind: "bumper", left: 37.8, top: 64.6, width: 12.2, rotate: 6, scaleX: 1, leds: 5 },
  ],
  q60: [
    { zone: "emblem", kind: "emblem", left: 8.4, top: 52.4, width: 5.8, rotate: 10, scaleX: 0.86, leds: 8 },
    { zone: "grille", kind: "badge", left: 9.2, top: 59.4, width: 6.6, rotate: 8, scaleX: 0.88, leds: 6, caption: "Q60" },
    { zone: "mirrors", kind: "mirror", left: 22.4, top: 28.6, width: 3.4, rotate: -24, scaleX: 0.78, leds: 9 },
    { zone: "mirrors", kind: "mirror", left: 68.8, top: 31.8, width: 6.8, rotate: 4, scaleX: 1, leds: 9 },
    { zone: "bumper", kind: "bumper", left: 4.8, top: 68.2, width: 8.4, rotate: -10, scaleX: 0.86, leds: 5, mirror: true },
    { zone: "bumper", kind: "bumper", left: 29.4, top: 65.8, width: 14.2, rotate: 6, scaleX: 1, leds: 5 },
  ],
  q70: [
    { zone: "emblem", kind: "emblem", left: 10.2, top: 53.6, width: 9.4, rotate: 6, scaleX: 0.9, leds: 8 },
    { zone: "grille", kind: "badge", left: 12.0, top: 62.0, width: 8.2, rotate: 5, scaleX: 0.92, leds: 6, caption: "Q70" },
    { zone: "mirrors", kind: "mirror", left: 24.0, top: 32.4, width: 3.6, rotate: -20, scaleX: 0.78, leds: 9 },
    { zone: "mirrors", kind: "mirror", left: 66.4, top: 34.8, width: 7.0, rotate: 3, scaleX: 1, leds: 9 },
    { zone: "bumper", kind: "bumper", left: 6.2, top: 69.4, width: 9.0, rotate: -8, scaleX: 0.86, leds: 5, mirror: true },
    { zone: "bumper", kind: "bumper", left: 33.6, top: 69.2, width: 12.8, rotate: 4, scaleX: 1, leds: 5 },
  ],
};

export function VehicleStage({ car, controllers, target, onSelect }: VehicleStageProps) {
  const zoneCtrl = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);
  const playing = controllers.some((controller) => controller.power && controller.effectId != null);
  const elapsed = useClock(playing);
  const colorOf = (controller?: Controller) => fill(controller, elapsed);
  const photo = PHOTOS[car];
  const fixtures = LAYOUTS[car];

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div
        className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]"
        onClick={() => onSelect("all")}
      >
        <Image
          src={photo.src}
          alt={photo.alt}
          width={1600}
          height={1067}
          className="relative z-0 h-auto w-full select-none saturate-[0.15] contrast-110"
          priority
        />
        {fixtures.map((fixture, i) => (
          <LightFixture
            key={`${fixture.zone}-${fixture.kind}-${i}`}
            fixture={fixture}
            controller={zoneCtrl(fixture.zone)}
            elapsed={elapsed}
            selected={target === fixture.zone}
            onToggle={() => toggle(fixture.zone)}
          />
        ))}
      </div>

      <div className="mt-2 grid grid-cols-4 gap-1">
        {ZONES.filter((zone) => zone.id !== "custom").map((zone) => {
          const controller = zoneCtrl(zone.id);
          const selected = target === zone.id;
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => toggle(zone.id)}
              className={cn(
                "rounded-lg border px-1.5 py-1.5 text-center text-[11px] leading-tight",
                selected ? "border-white/40 bg-white/10 text-white" : "border-white/10 bg-white/5 text-white/65",
              )}
            >
              <span
                className="mx-auto mb-1 block size-2 rounded-full"
                style={{
                  background: colorOf(controller),
                  boxShadow: controller?.power ? `0 0 8px ${colorOf(controller)}` : undefined,
                }}
              />
              {zone.label}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-center text-[11px] tracking-wide text-white/40">
        {target === "all" ? "All lights" : label(target)} · tap a part
      </p>
    </div>
  );
}

function LightFixture({
  fixture,
  controller,
  elapsed,
  selected,
  onToggle,
}: {
  fixture: Fixture;
  controller?: Controller;
  elapsed: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const on = Boolean(controller?.power);
  return (
    <button
      type="button"
      aria-label={label(fixture.zone)}
      className={cn(
        "absolute z-10 origin-center bg-transparent p-0",
        selected ? "z-20" : "",
      )}
      style={{
        left: `${fixture.left}%`,
        top: `${fixture.top}%`,
        width: `${fixture.width}%`,
        transform: `rotate(${fixture.rotate}deg) scaleX(${fixture.scaleX * (fixture.mirror ? -1 : 1)})`,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      <span
        className={cn("block", selected ? "rounded-sm ring-2 ring-white/85 ring-offset-1 ring-offset-black/50" : "")}
        style={{
          filter: on
            ? `drop-shadow(0 0 4px ${fill(controller, elapsed)})`
            : "drop-shadow(0 1px 1px rgba(0,0,0,0.65))",
        }}
      >
        {fixture.kind === "emblem" ? (
          <EmblemMesh controller={controller} elapsed={elapsed} />
        ) : fixture.kind === "badge" ? (
          <BadgeMesh controller={controller} elapsed={elapsed} caption={fixture.caption ?? "Q50"} />
        ) : fixture.kind === "mirror" ? (
          <MirrorMesh controller={controller} elapsed={elapsed} count={fixture.leds} />
        ) : (
          <BumperMesh controller={controller} elapsed={elapsed} count={fixture.leds} />
        )}
      </span>
    </button>
  );
}

function EmblemMesh({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const leds = 8;
  return (
    <svg viewBox="0 0 120 90" className="h-auto w-full" aria-hidden>
      <defs>
        <radialGradient id="emblemCarbon" cx="50%" cy="40%" r="70%">
          <stop offset="0%" stopColor="#3a3a3c" />
          <stop offset="100%" stopColor="#111113" />
        </radialGradient>
      </defs>
      <ellipse cx="60" cy="45" rx="56" ry="40" fill="url(#emblemCarbon)" />
      {on
        ? Array.from({ length: leds }, (_, i) => {
            const rgb = ledColor(controller, elapsed, i, leds);
            const a = (-Math.PI / 2 + (i / leds) * Math.PI * 2) % (Math.PI * 2);
            return (
              <ellipse
                key={i}
                cx={60 + Math.cos(a) * 38}
                cy={45 + Math.sin(a) * 27}
                rx="14"
                ry="11"
                fill={rgbToCss(rgb, 0.55)}
              />
            );
          })
        : null}
      <ellipse
        cx="60"
        cy="45"
        rx="56"
        ry="40"
        fill="none"
        stroke={on ? "rgba(240,240,242,0.92)" : "rgba(196,198,202,0.88)"}
        strokeWidth="4.2"
      />
      <path
        d="M60 12C46 26 36 40 28 64c6-5 14-9 22-7l10 18 10-18c8-2 16 2 22 7C84 40 74 26 60 12Z"
        fill={on ? "rgba(236,237,240,0.95)" : "rgba(198,200,204,0.9)"}
      />
    </svg>
  );
}

function BadgeMesh({
  controller,
  elapsed,
  caption,
}: {
  controller?: Controller;
  elapsed: number;
  caption: string;
}) {
  const on = Boolean(controller?.power);
  const rgb = controller?.power
    ? controller.effectId != null
      ? sampleEffect(controller.effectId, elapsed, controller.effectSpeed)
      : controller.color
    : { r: 28, g: 28, b: 30 };
  const face = on ? rgbToCss(rgb, 0.92) : "#1a1a1c";
  return (
    <svg viewBox="0 0 220 70" className="h-auto w-full" aria-hidden>
      <text
        x="110"
        y="54"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="52"
        letterSpacing="-3"
        fill={face}
        stroke="rgba(210,212,216,0.95)"
        strokeWidth="3.5"
        paintOrder="stroke fill"
      >
        {caption}
      </text>
    </svg>
  );
}

function MirrorMesh({
  controller,
  elapsed,
  count,
}: {
  controller?: Controller;
  elapsed: number;
  count: number;
}) {
  const on = Boolean(controller?.power);
  const segs = Array.from({ length: count }, (_, i) => i);
  return (
    <svg viewBox="0 0 190 48" className="h-auto w-full" aria-hidden>
      <path d="M6 34h178c2 0 4 2 4 4v2H4v-2c0-2 1-4 2-4Z" fill="#c5c7cb" opacity="0.85" />
      <path d="M8 10h174l4 22H4Z" fill="#0c0c0e" />
      {segs.map((i) => {
        const x = 10 + i * 19;
        const lift = Math.sin((i / (count - 1)) * Math.PI) * 1.6;
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <path
            key={i}
            d={`M${x} ${12 - lift} h15 l2.4 18 h-19.4 Z`}
            fill={on ? rgbToCss(rgb, 0.55 + (controller!.brightness / 100) * 0.45) : "#2a2c30"}
            stroke="#050506"
            strokeWidth="0.8"
          />
        );
      })}
    </svg>
  );
}

function BumperMesh({
  controller,
  elapsed,
  count,
}: {
  controller?: Controller;
  elapsed: number;
  count: number;
}) {
  const on = Boolean(controller?.power);
  return (
    <svg viewBox="0 0 220 70" className="h-auto w-full" aria-hidden>
      <path d="M8 18h186c10 0 18 8 20 18 1 6-2 16-14 20H22C8 54 4 40 6 30 7 24 8 18 8 18Z" fill="#0d0e10" stroke="#1c1d20" strokeWidth="1.2" />
      <path d="M24 46h168" stroke="#2a2c30" strokeWidth="6" />
      {Array.from({ length: count }, (_, i) => {
        const x = 36 + i * 34;
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <g key={i}>
            <circle cx={x} cy="34" r="11" fill="#16171a" stroke="#2c2e32" strokeWidth="1" />
            <circle
              cx={x}
              cy="34"
              r="7.2"
              fill={on ? rgbToCss(rgb, 0.6 + (controller!.brightness / 100) * 0.4) : "#2a2c30"}
            />
          </g>
        );
      })}
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
