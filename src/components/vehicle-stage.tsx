"use client";

import type { ReactNode } from "react";
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
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => toggle(zone.id)}
              className={cn(
                "flex flex-col items-center gap-2 overflow-hidden rounded-2xl border px-2.5 py-3.5 transition",
                selected
                  ? "border-[#e10600]/80 bg-white/[0.07] shadow-[0_0_22px_rgba(225,6,0,0.22)]"
                  : target === "all"
                    ? "border-white/10 bg-[#121214]/90"
                    : "border-white/5 bg-black/45 opacity-50",
              )}
            >
              <span className="flex h-[5.5rem] w-full items-center justify-center overflow-hidden">
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

/** Native-pixel LED seats, measured on the product PNGs. */
const MIRROR_LEFT = [
  { x: 78, y: 70, w: 36, h: 28 },
  { x: 120, y: 78, w: 38, h: 36 },
  { x: 166, y: 88, w: 40, h: 42 },
  { x: 209, y: 95, w: 38, h: 42 },
  { x: 255, y: 96, w: 38, h: 44 },
  { x: 304, y: 90, w: 40, h: 46 },
  { x: 349, y: 86, w: 38, h: 42 },
  { x: 389, y: 82, w: 36, h: 38 },
  { x: 435, y: 79, w: 34, h: 34 },
];

const MIRROR_RIGHT = [
  { x: 80, y: 71, w: 38, h: 34 },
  { x: 126, y: 73, w: 38, h: 38 },
  { x: 166, y: 78, w: 38, h: 42 },
  { x: 212, y: 84, w: 38, h: 44 },
  { x: 260, y: 87, w: 38, h: 44 },
  { x: 305, y: 87, w: 38, h: 40 },
  { x: 348, y: 82, w: 38, h: 40 },
  { x: 392, y: 72, w: 36, h: 34 },
  { x: 435, y: 61, w: 32, h: 24 },
];

const BUMPER_LEFT = [
  { cx: 175, cy: 205 },
  { cx: 230, cy: 208 },
  { cx: 285, cy: 210 },
  { cx: 340, cy: 211 },
  { cx: 399, cy: 211 },
];

const BUMPER_RIGHT = [
  { cx: 150, cy: 212 },
  { cx: 205, cy: 208 },
  { cx: 260, cy: 204 },
  { cx: 318, cy: 200 },
  { cx: 377, cy: 197 },
];

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

function Shot({
  src,
  width,
  height,
  children,
}: {
  src: string;
  width: number;
  height: number;
  children?: ReactNode;
}) {
  return (
    <span className="relative inline-block h-full max-h-full">
      <Image
        src={src}
        alt=""
        width={width}
        height={height}
        unoptimized
        draggable={false}
        className="block h-full w-auto max-w-full object-contain"
      />
      {children}
    </span>
  );
}

function MaskGlow({ src, color, halo = false }: { src: string; color: string; halo?: boolean }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: color,
        mixBlendMode: "screen",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        maskMode: "alpha",
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "100% 100%",
        maskSize: "100% 100%",
        filter: halo ? `drop-shadow(0 0 3px ${color})` : undefined,
      }}
    />
  );
}

function Overlay({
  width,
  height,
  children,
  mask,
}: {
  width: number;
  height: number;
  children: ReactNode;
  mask?: string;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
      style={
        mask
          ? {
              WebkitMaskImage: `url(${mask})`,
              maskImage: `url(${mask})`,
              maskMode: "alpha",
              WebkitMaskSize: "100% 100%",
              maskSize: "100% 100%",
            }
          : undefined
      }
    >
      {children}
    </svg>
  );
}

function EmblemIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const rim = on ? rgbToCss(ledColor(controller, elapsed, 0, 24), 0.92) : undefined;
  return (
    <Shot src="/products/emblem.png" width={520} height={282}>
      {on ? <MaskGlow src="/products/emblem-ring.png" color={rim!} halo /> : null}
    </Shot>
  );
}

function MirrorsIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center gap-1 px-0.5">
      <MirrorUnit
        src="/products/mirror-left.png"
        cellsSrc="/products/mirror-left-cells.png"
        width={520}
        height={198}
        cells={MIRROR_LEFT}
        controller={controller}
        elapsed={elapsed}
      />
      <MirrorUnit
        src="/products/mirror-right.png"
        cellsSrc="/products/mirror-right-cells.png"
        width={520}
        height={187}
        cells={MIRROR_RIGHT}
        controller={controller}
        elapsed={elapsed}
      />
    </span>
  );
}

function MirrorUnit({
  src,
  cellsSrc,
  width,
  height,
  cells,
  controller,
  elapsed,
}: {
  src: string;
  cellsSrc: string;
  width: number;
  height: number;
  cells: { x: number; y: number; w: number; h: number }[];
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const wash = on ? rgbToCss(ledColor(controller, elapsed, 0, cells.length), 0.72) : undefined;
  return (
    <Shot src={src} width={width} height={height}>
      {on ? <MaskGlow src={cellsSrc} color={wash!} /> : null}
      {on ? (
        <Overlay width={width} height={height} mask={cellsSrc}>
          {cells.map((cell, i) => {
            const rgb = ledColor(controller, elapsed, i, cells.length);
            return (
              <rect
                key={i}
                x={cell.x - cell.w / 2}
                y={cell.y - cell.h / 2}
                width={cell.w}
                height={cell.h}
                rx="2"
                fill={rgbToCss(rgb, 0.95)}
                style={{ mixBlendMode: "screen" }}
              />
            );
          })}
        </Overlay>
      ) : null}
    </Shot>
  );
}

function BumperIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center gap-1 px-0.5">
      <BumperUnit
        src="/products/bumper-left.png"
        width={520}
        height={297}
        dots={BUMPER_LEFT}
        controller={controller}
        elapsed={elapsed}
      />
      <BumperUnit
        src="/products/bumper-right.png"
        width={520}
        height={389}
        dots={BUMPER_RIGHT}
        controller={controller}
        elapsed={elapsed}
      />
    </span>
  );
}

function BumperUnit({
  src,
  width,
  height,
  dots,
  controller,
  elapsed,
}: {
  src: string;
  width: number;
  height: number;
  dots: { cx: number; cy: number }[];
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  return (
    <Shot src={src} width={width} height={height}>
      <Overlay width={width} height={height}>
        {dots.map((dot, i) => {
          const rgb = ledColor(controller, elapsed, i, dots.length);
          return (
            <g key={i}>
              <circle cx={dot.cx} cy={dot.cy} r="11" fill={on ? rgbToCss(rgb, 0.22) : "transparent"} />
              <circle
                cx={dot.cx}
                cy={dot.cy}
                r="6.5"
                fill={on ? rgbToCss(rgb, 0.96) : "rgba(90,94,100,0.45)"}
                style={on ? { mixBlendMode: "screen" } : undefined}
              />
            </g>
          );
        })}
      </Overlay>
    </Shot>
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

  if (caption === "Q50") {
    return (
      <Shot src="/products/grille-badge.png" width={406} height={152}>
        {on ? <MaskGlow src="/products/grille-letters.png" color={rgbToCss(rgb, 0.82)} /> : null}
      </Shot>
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
        fill={on ? rgbToCss(rgb, 0.55) : "#1c1c1e"}
        stroke={on ? rgbToCss(rgb, 0.96) : "#c8ccd2"}
        strokeWidth={on ? 5 : 3.5}
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
