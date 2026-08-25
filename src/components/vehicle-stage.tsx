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
          const on = Boolean(controller?.power);
          const glow = fill(controller, elapsed);
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
              <span
                className="flex h-[5.5rem] w-full items-center justify-center overflow-hidden"
                style={{ filter: on ? `drop-shadow(0 0 7px ${glow})` : undefined }}
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

/** Native-pixel LED seats, measured on the product PNGs. */
const EMBLEM_RING = Array.from({ length: 20 }, (_, i) => {
  const a = -Math.PI / 2 + (i / 20) * Math.PI * 2;
  return { cx: 260 + Math.cos(a) * 242, cy: 141 + Math.sin(a) * 118 };
});

const MIRROR_LEFT = [
  { x: 51, y: 88 },
  { x: 93, y: 82 },
  { x: 132, y: 78 },
  { x: 165, y: 76 },
  { x: 220, y: 74 },
  { x: 275, y: 76 },
  { x: 325, y: 78 },
  { x: 389, y: 82 },
  { x: 451, y: 90 },
].map((p, i) => ({ ...p, w: 22 - i * 0.4, h: 30 - i * 0.5 }));

const MIRROR_RIGHT = [
  { x: 67, y: 82 },
  { x: 127, y: 76 },
  { x: 185, y: 72 },
  { x: 234, y: 70 },
  { x: 272, y: 72 },
  { x: 314, y: 74 },
  { x: 357, y: 76 },
  { x: 390, y: 78 },
  { x: 430, y: 82 },
].map((p, i) => ({ ...p, w: 24 - i * 1.2, h: 32 - i * 1.4 }));

const BUMPER_LEFT = [
  { cx: 175, cy: 208 },
  { cx: 230, cy: 208 },
  { cx: 285, cy: 210 },
  { cx: 340, cy: 212 },
  { cx: 395, cy: 214 },
];

const BUMPER_RIGHT = [
  { cx: 150, cy: 208 },
  { cx: 205, cy: 204 },
  { cx: 260, cy: 200 },
  { cx: 318, cy: 196 },
  { cx: 375, cy: 192 },
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

function MaskGlow({ src, color }: { src: string; color: string }) {
  return (
    <span
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        background: color,
        mixBlendMode: "screen",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
      }}
    />
  );
}

function Overlay({
  width,
  height,
  children,
}: {
  width: number;
  height: number;
  children: ReactNode;
}) {
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      preserveAspectRatio="xMidYMid meet"
      className="pointer-events-none absolute inset-0 h-full w-full"
      aria-hidden
    >
      {children}
    </svg>
  );
}

function EmblemIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const n = EMBLEM_RING.length;
  const rim = on ? rgbToCss(ledColor(controller, elapsed, 0, n), 0.85) : undefined;
  return (
    <Shot src="/products/emblem.png" width={520} height={282}>
      {on ? <MaskGlow src="/products/emblem-ring.png" color={rim!} /> : null}
      {on ? (
        <Overlay width={520} height={282}>
          {EMBLEM_RING.map((led, i) => {
            const rgb = ledColor(controller, elapsed, i, n);
            return <ellipse key={i} cx={led.cx} cy={led.cy} rx="11" ry="7" fill={rgbToCss(rgb, 0.9)} />;
          })}
        </Overlay>
      ) : null}
    </Shot>
  );
}

function MirrorsIcon({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  return (
    <span className="flex h-full w-full items-center justify-center gap-1 px-0.5">
      <MirrorUnit
        src="/products/mirror-left.png"
        width={520}
        height={198}
        cells={MIRROR_LEFT}
        controller={controller}
        elapsed={elapsed}
      />
      <MirrorUnit
        src="/products/mirror-right.png"
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
  width,
  height,
  cells,
  controller,
  elapsed,
}: {
  src: string;
  width: number;
  height: number;
  cells: { x: number; y: number; w: number; h: number }[];
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  return (
    <Shot src={src} width={width} height={height}>
      <Overlay width={width} height={height}>
        {cells.map((cell, i) => {
          const rgb = ledColor(controller, elapsed, i, cells.length);
          return (
            <rect
              key={i}
              x={cell.x - cell.w / 2}
              y={cell.y - cell.h / 2}
              width={cell.w}
              height={cell.h}
              rx="2.4"
              fill={on ? rgbToCss(rgb, 0.92) : "rgba(235,238,242,0.2)"}
              style={on ? { mixBlendMode: "screen" } : undefined}
            />
          );
        })}
      </Overlay>
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
        {on ? (
          <>
            <MaskGlow src="/products/grille-letters.png" color={rgbToCss(rgb, 0.55)} />
            <MaskGlow src="/products/grille-letter-edge.png" color={rgbToCss(rgb, 0.95)} />
          </>
        ) : null}
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
