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
                "flex flex-col items-center gap-2 rounded-2xl border px-2.5 py-3.5 transition",
                selected
                  ? "border-[#e10600]/80 bg-white/[0.07] shadow-[0_0_22px_rgba(225,6,0,0.22)]"
                  : target === "all"
                    ? "border-white/10 bg-[#121214]/90"
                    : "border-white/5 bg-black/45 opacity-50",
              )}
            >
              <span
                className="flex h-[5.5rem] w-full items-center justify-center"
                style={{
                  filter: on
                    ? `drop-shadow(0 0 10px ${glow})`
                    : "drop-shadow(0 0 0.6px rgba(255,255,255,0.28))",
                }}
              >
                <ProductIcon
                  zone={zone.id}
                  caption={car.toUpperCase()}
                  controller={controller}
                  elapsed={elapsed}
                />
              </span>
              <span className="text-[11px] font-medium tracking-[0.18em] text-white/75 uppercase">
                {zone.label}
              </span>
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
  const leds = 14;
  const tint = on ? rgbToCss(ledColor(controller, elapsed, 0, leds), 0.42) : undefined;
  return (
    <span className="relative h-full w-[9.5rem]">
      <Image
        src="/products/emblem.png"
        alt=""
        width={520}
        height={282}
        unoptimized
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      {on ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background: tint,
            mixBlendMode: "screen",
            WebkitMaskImage: "url(/products/emblem.png)",
            maskImage: "url(/products/emblem.png)",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            WebkitMaskSize: "contain",
            maskSize: "contain",
          }}
        />
      ) : null}
      <svg viewBox="0 0 200 110" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {on
          ? Array.from({ length: leds }, (_, i) => {
              const rgb = ledColor(controller, elapsed, i, leds);
              const a = -Math.PI / 2 + (i / leds) * Math.PI * 2;
              return (
                <ellipse
                  key={i}
                  cx={100 + Math.cos(a) * 78}
                  cy={55 + Math.sin(a) * 40}
                  rx="7.5"
                  ry="5.2"
                  fill={rgbToCss(rgb, 0.82)}
                  style={{ mixBlendMode: "screen" }}
                />
              );
            })
          : null}
        {on ? (
          <ellipse
            cx="100"
            cy="55"
            rx="88"
            ry="48"
            fill="none"
            stroke={rgbToCss(ledColor(controller, elapsed, 3, leds), 0.55)}
            strokeWidth="2.2"
            style={{ mixBlendMode: "screen" }}
          />
        ) : null}
      </svg>
    </span>
  );
}

function MirrorsIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center gap-1 px-0.5">
      <MirrorUnit src="/products/mirror-left.png" width={520} height={198} controller={controller} elapsed={elapsed} arch={1} />
      <MirrorUnit src="/products/mirror-right.png" width={520} height={187} controller={controller} elapsed={elapsed} arch={-1} />
    </span>
  );
}

function MirrorUnit({
  src,
  width,
  height,
  controller,
  elapsed,
  arch,
}: {
  src: string;
  width: number;
  height: number;
  controller?: Controller;
  elapsed: number;
  arch: number;
}) {
  const on = Boolean(controller?.power);
  const count = 9;
  return (
    <span className="relative h-[3.35rem] w-[6.6rem]">
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        unoptimized
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <svg viewBox="0 0 280 100" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {Array.from({ length: count }, (_, i) => {
          const rgb = ledColor(controller, elapsed, i, count);
          const t = (i + 0.5) / count;
          const x = 22 + t * 236;
          const y = 40 + Math.sin(t * Math.PI) * 9 * arch;
          return (
            <rect
              key={i}
              x={x}
              y={y}
              width="18"
              height="22"
              rx="2.2"
              fill={on ? rgbToCss(rgb, 0.92) : "rgba(210,214,220,0.18)"}
              style={on ? { mixBlendMode: "screen" } : undefined}
            />
          );
        })}
      </svg>
    </span>
  );
}

function BumperIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center gap-1 px-0.5">
      <BumperUnit src="/products/bumper-left.png" width={520} height={297} controller={controller} elapsed={elapsed} />
      <BumperUnit src="/products/bumper-right.png" width={520} height={389} controller={controller} elapsed={elapsed} />
    </span>
  );
}

function BumperUnit({
  src,
  width,
  height,
  controller,
  elapsed,
}: {
  src: string;
  width: number;
  height: number;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const count = 5;
  return (
    <span className="relative h-[3.6rem] w-[6.4rem]">
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        unoptimized
        draggable={false}
        className="absolute inset-0 h-full w-full object-contain"
      />
      <svg viewBox="0 0 200 120" className="pointer-events-none absolute inset-0 h-full w-full" aria-hidden>
        {Array.from({ length: count }, (_, i) => {
          const rgb = ledColor(controller, elapsed, i, count);
          const cx = 46 + i * 27;
          return (
            <g key={i}>
              <circle cx={cx} cy="74" r="9.2" fill={on ? rgbToCss(rgb, 0.18) : "rgba(0,0,0,0.15)"} />
              <circle
                cx={cx}
                cy="74"
                r="5.6"
                fill={on ? rgbToCss(rgb, 0.95) : "rgba(80,84,90,0.55)"}
                style={on ? { mixBlendMode: "screen" } : undefined}
              />
            </g>
          );
        })}
      </svg>
    </span>
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
      : (controller?.color ?? { r: 196, g: 18, b: 32 })
    : { r: 210, g: 214, b: 220 };
  const tint = rgbToCss(rgb, on ? 0.72 : 0);

  if (caption === "Q50") {
    return (
      <span className="relative h-full w-[10.5rem]">
        <Image
          src="/products/grille-badge.png"
          alt=""
          width={406}
          height={152}
          unoptimized
          draggable={false}
          className="absolute inset-0 h-full w-full object-contain"
        />
        {on ? (
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background: tint,
              mixBlendMode: "screen",
              WebkitMaskImage: "url(/products/grille-badge.png)",
              maskImage: "url(/products/grille-badge.png)",
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
        ) : null}
      </span>
    );
  }

  return (
    <svg viewBox="0 0 220 78" className="h-[3.4rem] w-auto" aria-hidden>
      <text
        x="110"
        y="54"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="44"
        letterSpacing="-1.8"
        fill={on ? rgbToCss(rgb, 0.96) : "#d8dce2"}
        stroke="#9aa3ad"
        strokeWidth="4.5"
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
