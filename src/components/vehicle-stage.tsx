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

/** Product cutouts from Shinno Performance, placed on the 3/4 studio photos. */
const PRODUCTS: Record<CarId, ProductSpot[]> = {
  q50: [
    { zone: "emblem", src: "/products/emblem.png", left: "14.8%", top: "51.8%", width: "8.6%" },
    { zone: "grille", src: "/products/grille-badge.png", left: "24.0%", top: "57.2%", width: "7.2%" },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "25.2%", top: "32.2%", width: "4.8%", rotate: -16, leds: 8 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "62.2%", top: "30.2%", width: "6.2%", rotate: 8, leds: 8 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "4.6%", top: "65.2%", width: "8.2%", rotate: -6, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "42.2%", top: "63.2%", width: "10%", rotate: 3, leds: 6 },
  ],
  q60: [
    { zone: "emblem", src: "/products/emblem.png", left: "10.2%", top: "53.4%", width: "8.0%" },
    { zone: "grille", src: "/products/grille-badge.png", left: "18.8%", top: "59.6%", width: "6.8%" },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "22.4%", top: "28.8%", width: "4.6%", rotate: -14, leds: 8 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "61.5%", top: "29.4%", width: "6.0%", rotate: 10, leds: 8 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "4.2%", top: "67.0%", width: "7.6%", rotate: -8, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "28.5%", top: "65.4%", width: "9.4%", rotate: 4, leds: 6 },
  ],
  q70: [
    { zone: "emblem", src: "/products/emblem.png", left: "11.4%", top: "56.2%", width: "8.4%" },
    { zone: "grille", src: "/products/grille-badge.png", left: "20.6%", top: "62.0%", width: "7.0%" },
    { zone: "mirrors", src: "/products/mirror-left.png", left: "23.0%", top: "31.4%", width: "4.5%", rotate: -12, leds: 8 },
    { zone: "mirrors", src: "/products/mirror-right.png", left: "61.0%", top: "34.2%", width: "6.4%", rotate: 6, leds: 8 },
    { zone: "bumper", src: "/products/bumper-left.png", left: "3.6%", top: "68.4%", width: "7.8%", rotate: -5, leds: 6 },
    { zone: "bumper", src: "/products/bumper-right.png", left: "32.4%", top: "69.6%", width: "10.2%", rotate: 2, leds: 6 },
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
          className="relative z-0 h-auto w-full select-none"
          priority
        />
        {spots.map((spot, i) => {
          const controller = zoneCtrl(spot.zone);
          const on = Boolean(controller?.power);
          const selected = target === spot.zone;
          return (
            <div
              key={`${spot.zone}-${i}`}
              className="absolute z-10"
              style={{
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
                    filter: on
                    ? `brightness(1.06) drop-shadow(0 0 3px ${colorOf(controller)})`
                    : "brightness(0.88) saturate(0.82)",
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
                    background: barFill(controller, elapsed, spot.leds ?? 1),
                    mixBlendMode: "screen",
                    opacity: 0.48,
                  }}
                />
              ) : null}
              <button
                type="button"
                aria-label={label(spot.zone)}
                className={cn(
                  "absolute inset-0 z-20 rounded-sm bg-transparent",
                  selected ? "ring-2 ring-white/85 ring-offset-1 ring-offset-black/40" : "hover:ring-1 hover:ring-white/35",
                )}
                onClick={(event) => {
                  event.stopPropagation();
                  toggle(spot.zone);
                }}
              />
            </div>
          );
        })}
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

function fill(controller: Controller | undefined, elapsed: number): string {
  if (!controller?.power) return "rgba(70,70,74,0.7)";
  if (controller.effectId != null) {
    const rgb = sampleEffect(controller.effectId, elapsed, controller.effectSpeed);
    return rgbToCss(rgb, 0.28 + (controller.brightness / 100) * 0.72);
  }
  return rgbToCss(controller.color, 0.38 + (controller.brightness / 100) * 0.62);
}

function barFill(controller: Controller | undefined, elapsed: number, leds: number): string {
  if (!controller?.power) return "transparent";
  const alpha = 0.22 + (controller.brightness / 100) * 0.5;
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
