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
  q50: { src: "/cars/q50-ink.png", alt: "Infiniti Q50" },
  q60: { src: "/cars/q60-ink.png", alt: "Infiniti Q60" },
  q70: { src: "/cars/q70-ink.png", alt: "Infiniti Q70" },
};

interface ProductSpot {
  zone: ZoneKind;
  src: string;
  left: string;
  top: string;
  width: string;
  rotate?: number;
  scaleX?: number;
  leds?: number;
}

/** Tight product meshes seated on the 3/4 graphic plate. */
const PRODUCTS: Record<CarId, ProductSpot[]> = {
  q50: [
    { zone: "emblem", src: "/products/emblem.png", left: "19.8%", top: "51.6%", width: "7.2%", rotate: 11, scaleX: 0.74 },
    { zone: "grille", src: "/products/grille-badge.png", left: "29.6%", top: "55.8%", width: "7.2%", rotate: 8, scaleX: 0.84 },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "19.4%", top: "33.8%", width: "3.1%", rotate: -32, scaleX: 0.86, leds: 9 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "25.6%", top: "31.6%", width: "3.9%", rotate: -16, scaleX: 0.94, leds: 9 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "8.0%", top: "63.2%", width: "7.4%", rotate: -8, scaleX: 0.9, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "37.0%", top: "62.6%", width: "8.8%", rotate: 5, scaleX: 1, leds: 6 },
  ],
  q60: [
    { zone: "emblem", src: "/products/emblem.png", left: "16.8%", top: "52.8%", width: "6.8%", rotate: 10, scaleX: 0.74 },
    { zone: "grille", src: "/products/grille-badge.png", left: "26.2%", top: "57.2%", width: "6.8%", rotate: 7, scaleX: 0.84 },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "17.6%", top: "31.4%", width: "3.0%", rotate: -28, scaleX: 0.86, leds: 9 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "24.2%", top: "29.6%", width: "3.8%", rotate: -12, scaleX: 0.94, leds: 9 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "6.8%", top: "65.0%", width: "7.0%", rotate: -8, scaleX: 0.9, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "27.4%", top: "64.0%", width: "8.4%", rotate: 4, scaleX: 1, leds: 6 },
  ],
  q70: [
    { zone: "emblem", src: "/products/emblem.png", left: "17.6%", top: "54.8%", width: "7.0%", rotate: 9, scaleX: 0.74 },
    { zone: "grille", src: "/products/grille-badge.png", left: "27.4%", top: "59.4%", width: "7.0%", rotate: 7, scaleX: 0.84 },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "18.2%", top: "33.0%", width: "3.0%", rotate: -26, scaleX: 0.86, leds: 9 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "24.8%", top: "32.4%", width: "3.8%", rotate: -10, scaleX: 0.94, leds: 9 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "6.4%", top: "66.4%", width: "7.2%", rotate: -6, scaleX: 0.9, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "31.2%", top: "67.2%", width: "8.6%", rotate: 3, scaleX: 1, leds: 6 },
  ],
};

export function VehicleStage({ car, controllers, target, onSelect }: VehicleStageProps) {
  const zoneCtrl = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);
  const playing = controllers.some((controller) => controller.power && controller.effectId != null);
  const elapsed = useClock(playing);
  const colorOf = (controller?: Controller) => fill(controller, elapsed);
  const photo = PHOTOS[car];
  const spots = PRODUCTS[car];

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
          className="relative z-0 h-auto w-full select-none grayscale contrast-125"
          priority
        />
        {spots.map((spot, i) => (
          <ProductMesh
            key={`${spot.zone}-${i}`}
            spot={spot}
            controller={zoneCtrl(spot.zone)}
            elapsed={elapsed}
            selected={target === spot.zone}
            onToggle={() => toggle(spot.zone)}
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

function ProductMesh({
  spot,
  controller,
  elapsed,
  selected,
  onToggle,
}: {
  spot: ProductSpot;
  controller?: Controller;
  elapsed: number;
  selected: boolean;
  onToggle: () => void;
}) {
  const on = Boolean(controller?.power);
  const leds = spot.leds ?? 1;
  return (
    <div
      className="absolute z-10"
      style={{
        isolation: "isolate",
        left: spot.left,
        top: spot.top,
        width: spot.width,
        transform: `rotate(${spot.rotate ?? 0}deg) scaleX(${spot.scaleX ?? 1})`,
        transformOrigin: "center center",
      }}
    >
      {/* Product PNGs also drive CSS masks; next/image would rewrite the URL. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={spot.src}
        alt=""
        draggable={false}
        className="relative z-0 h-auto w-full select-none"
        style={{
          filter: on ? "grayscale(1) contrast(1.12) brightness(1.05)" : "grayscale(1) contrast(1.08) brightness(0.82)",
        }}
      />
      {on ? (
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 z-10"
          style={{
            WebkitMaskImage: `url(${spot.src})`,
            maskImage: `url(${spot.src})`,
            WebkitMaskSize: "contain",
            maskSize: "contain",
            WebkitMaskRepeat: "no-repeat",
            maskRepeat: "no-repeat",
            WebkitMaskPosition: "center",
            maskPosition: "center",
            background: meshFill(controller, elapsed, leds),
            opacity: 0.82,
          }}
        />
      ) : null}
      {on && leds > 1 ? <LedRow controller={controller} elapsed={elapsed} count={leds} /> : null}
      <button
        type="button"
        aria-label={label(spot.zone)}
        className={cn(
          "absolute inset-0 z-20 rounded-sm bg-transparent",
          selected ? "ring-2 ring-white/85 ring-offset-1 ring-offset-black/40" : "hover:ring-1 hover:ring-white/35",
        )}
        onClick={(event) => {
          event.stopPropagation();
          onToggle();
        }}
      />
    </div>
  );
}

function LedRow({
  controller,
  elapsed,
  count,
}: {
  controller?: Controller;
  elapsed: number;
  count: number;
}) {
  if (!controller?.power) return null;
  return (
    <svg className="pointer-events-none absolute inset-[18%_8%] z-10" viewBox="0 0 100 20" preserveAspectRatio="none" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const rgb =
          controller.effectId != null
            ? sampleLed(controller.effectId, i, count, elapsed, controller.effectSpeed)
            : controller.color;
        const x = count === 1 ? 50 : 8 + (i / (count - 1)) * 84;
        return (
          <rect
            key={i}
            x={x - 3.1}
            y={5.5}
            width="6.2"
            height="9"
            rx="1.4"
            fill={rgbToCss(rgb, 0.55 + (controller.brightness / 100) * 0.45)}
          />
        );
      })}
    </svg>
  );
}

function fill(controller: Controller | undefined, elapsed: number): string {
  if (!controller?.power) return "rgba(70,70,74,0.7)";
  if (controller.effectId != null) {
    const rgb = sampleEffect(controller.effectId, elapsed, controller.effectSpeed);
    return rgbToCss(rgb, 0.28 + (controller.brightness / 100) * 0.72);
  }
  return rgbToCss(controller.color, 0.38 + (controller.brightness / 100) * 0.62);
}

function meshFill(controller: Controller | undefined, elapsed: number, leds: number): string {
  if (!controller?.power) return "transparent";
  const alpha = 0.35 + (controller.brightness / 100) * 0.5;
  if (controller.effectId != null && leds > 1) {
    const stops = Array.from({ length: leds }, (_, i) => {
      const rgb = sampleLed(controller.effectId as number, i, leds, elapsed, controller.effectSpeed);
      return `${rgbToCss(rgb, alpha)} ${(i / (leds - 1)) * 100}%`;
    });
    return `linear-gradient(90deg, ${stops.join(", ")})`;
  }
  if (controller.effectId != null) {
    const rgb = sampleEffect(controller.effectId, elapsed, controller.effectSpeed);
    return rgbToCss(rgb, alpha);
  }
  return rgbToCss(controller.color, alpha);
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
