"use client";

import { CartoonCar } from "@/components/cartoon-car";
import { useClock } from "@/hooks/use-clock";
import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { ZONES } from "@/lib/catalog";
import { rgbToCss } from "@/lib/scenes";
import { sampleEffect } from "@/lib/protocol";
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
  const colorOf = (controller?: Controller) => fill(controller, elapsed);

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_20px_60px_rgba(0,0,0,0.45)]">
        <CartoonCar
          car={car}
          controllers={controllers}
          target={target}
          elapsed={elapsed}
          onSelect={onSelect}
        />
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
