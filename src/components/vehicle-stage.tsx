"use client";

import Image from "next/image";
import { useClock } from "@/hooks/use-clock";
import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { STAGE_ZONES } from "@/lib/catalog";
import { rgbToCss, rgbToHex } from "@/lib/scenes";
import { EFFECTS, sampleEffect, sampleLed } from "@/lib/protocol";
import { cn, svgCoord } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

interface VehicleStageProps {
  car: CarId;
  controllers: Controller[];
  target: "all" | ZoneKind;
  hotZones?: ZoneKind[];
  onSelect: (zone: "all" | ZoneKind) => void;
}

export function VehicleStage({ car, controllers, target, hotZones = [], onSelect }: VehicleStageProps) {
  const { t } = useI18n();
  const zoneCtrl = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);
  const playing =
    hotZones.length > 0 ||
    controllers.some((controller) => controller.power && controller.effectId != null);
  const elapsed = useClock(playing);

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="grid grid-cols-2 gap-2">
        {STAGE_ZONES.map((zone) => {
          const controller = zoneCtrl(zone.id);
          const selected = target === zone.id;
          const hot = hotZones.includes(zone.id);
          const wide = zone.id === "emblem";
          return (
            <button
              key={zone.id}
              type="button"
              onClick={() => toggle(zone.id)}
              className={cn(
                "flex flex-col items-stretch gap-2 rounded-2xl border px-3 py-3.5 text-left transition",
                wide && "col-span-2",
                hot
                  ? "border-[#c41220] bg-[#121212] shadow-[0_0_26px_rgba(196,18,32,0.35)]"
                  : selected
                    ? "border-[#c41220]/80 bg-[#121212] shadow-[0_0_22px_rgba(196,18,32,0.22)]"
                    : target === "all"
                      ? "border-white/[0.08] bg-[#121212]/90"
                      : "border-white/[0.05] bg-[#0a0a0a] opacity-45",
              )}
            >
              <span className={cn("flex w-full items-center justify-center", wide ? "h-[7.25rem]" : "h-[5rem]")}>
                <ZoneGlyph zone={zone.id} car={car} controller={controller} elapsed={elapsed} />
              </span>
              <span className="flex items-baseline justify-between gap-2">
                <span className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.16em] text-foreground/80 uppercase">
                  <span
                    className="size-1.5 shrink-0 rounded-full"
                    style={{ background: statusColor(controller, elapsed) }}
                    aria-hidden
                  />
                  {t(`zone.${zone.id}`)}
                </span>
                <span className="truncate text-[10px] tracking-wide text-muted-foreground">
                  {statusLine(controller, t)}
                </span>
              </span>
            </button>
          );
        })}
      </div>
      <p className="mt-2 text-center text-[11px] tracking-wide text-muted-foreground">
        {target === "all" ? t("stage.all") : t(`zone.${target}`)} · {t("stage.hint")}
      </p>
    </div>
  );
}

function ZoneGlyph({
  zone,
  car,
  controller,
  elapsed,
}: {
  zone: ZoneKind;
  car: CarId;
  controller?: Controller;
  elapsed: number;
}) {
  if (zone === "emblem") return <EmblemGlyph controller={controller} elapsed={elapsed} />;
  if (zone === "mirrors") return <CellsGlyph count={9} controller={controller} elapsed={elapsed} />;
  if (zone === "bumper") return <DotsGlyph count={5} controller={controller} elapsed={elapsed} />;
  // Grille badge glyph — restore with STAGE_ZONES when we have a kit to test:
  // if (zone === "grille") return <LettersGlyph caption={car.toUpperCase()} controller={controller} elapsed={elapsed} />;
  return <LettersGlyph caption={car.toUpperCase()} controller={controller} elapsed={elapsed} />;
}

function EmblemGlyph({ controller, elapsed }: { controller?: Controller; elapsed: number }) {
  const on = Boolean(controller?.power);
  const n = 28;
  const cx = 80;
  const cy = 46;
  const rx = 66;
  const ry = 34;
  const leds = Array.from({ length: n }, (_, i) => {
    const a = -Math.PI / 2 + (i / n) * Math.PI * 2;
    return {
      x: svgCoord(cx + Math.cos(a) * rx),
      y: svgCoord(cy + Math.sin(a) * ry),
      rgb: ledColor(controller, elapsed, i, n),
    };
  });
  const glow = on
    ? controller?.effectId != null
      ? sampleEffect(controller.effectId, elapsed, controller.effectSpeed)
      : (controller?.color ?? { r: 196, g: 18, b: 32 })
    : null;

  return (
    <div className="relative flex h-full w-full max-w-[15rem] items-center justify-center">
      {glow ? (
        <span
          className="pointer-events-none absolute inset-[18%] rounded-[50%] opacity-55 blur-xl"
          style={{ background: rgbToCss(glow, 0.55) }}
          aria-hidden
        />
      ) : null}
      <svg viewBox="0 0 160 92" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        <ellipse
          cx={cx}
          cy={cy}
          rx={rx + 4}
          ry={ry + 4}
          fill="none"
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="7"
        />
        {leds.map((led, i) => (
          <ellipse
            key={i}
            cx={led.x}
            cy={led.y}
            rx="3.6"
            ry="2.4"
            transform={`rotate(${((i / n) * 360).toFixed(1)} ${led.x} ${led.y})`}
            fill={on ? rgbToCss(led.rgb, 0.98) : "rgba(255,255,255,0.16)"}
            style={on ? { filter: `drop-shadow(0 0 3.5px ${rgbToCss(led.rgb, 0.9)})` } : undefined}
          />
        ))}
      </svg>
      {/* Glossy black overlay asset — same size/position as before; chrome remapped to deep black + sheen. */}
      <Image
        src="/products/emblem.png"
        alt=""
        width={320}
        height={180}
        className="relative z-[1] h-[72%] w-auto max-w-[72%] object-contain drop-shadow-[0_6px_18px_rgba(0,0,0,0.7)]"
        priority
      />
      <span
        className="pointer-events-none absolute inset-[22%] z-[2] rounded-[45%] bg-[radial-gradient(ellipse_at_28%_22%,rgba(255,255,255,0.18),transparent_58%)] mix-blend-soft-light"
        aria-hidden
      />
    </div>
  );
}

function CellsGlyph({
  count,
  controller,
  elapsed,
}: {
  count: number;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  return (
    <svg viewBox="0 0 118 36" className="h-9 w-auto" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const t = i / (count - 1);
        const w = 9 - i * 0.35;
        const h = 18 - Math.abs(t - 0.5) * 6;
        const x = 6 + t * 100;
        const y = 18 - h / 2 + Math.sin(t * Math.PI) * -2;
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <rect
            key={i}
            x={svgCoord(x)}
            y={svgCoord(y)}
            width={svgCoord(w)}
            height={svgCoord(h)}
            rx="1.6"
            fill={on ? rgbToCss(rgb, 0.94) : "rgba(255,255,255,0.16)"}
          />
        );
      })}
    </svg>
  );
}

function DotsGlyph({
  count,
  controller,
  elapsed,
}: {
  count: number;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  return (
    <svg viewBox="0 0 120 28" className="h-7 w-auto" aria-hidden>
      {Array.from({ length: count }, (_, i) => {
        const x = 18 + (i / (count - 1)) * 84;
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <circle
            key={i}
            cx={svgCoord(x)}
            cy="14"
            r="5.2"
            fill={on ? rgbToCss(rgb, 0.95) : "rgba(255,255,255,0.16)"}
          />
        );
      })}
    </svg>
  );
}

/** Q50 letter glyph for the grille badge. Unused while grille is parked. */
function LettersGlyph({
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
  return (
    <svg viewBox="0 0 160 44" className="h-10 w-auto" aria-hidden>
      <text
        x="80"
        y="33"
        textAnchor="middle"
        fontFamily="Arial Black, Arial, sans-serif"
        fontStyle="italic"
        fontWeight="900"
        fontSize="28"
        letterSpacing="-1.4"
        fill={on ? rgbToCss(rgb, 0.55) : "#1a1a1c"}
        stroke={on ? rgbToCss(rgb, 0.98) : "rgba(255,255,255,0.55)"}
        strokeWidth={on ? 3.2 : 2.4}
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

function statusColor(controller: Controller | undefined, elapsed: number) {
  if (!controller) return "rgba(255,255,255,0.2)";
  if (!controller.power) return "rgba(255,255,255,0.28)";
  const rgb =
    controller.effectId != null
      ? sampleEffect(controller.effectId, elapsed, controller.effectSpeed)
      : controller.color;
  return rgbToCss(rgb);
}

function statusLine(controller: Controller | undefined, t: (key: string) => string) {
  if (!controller) return t("stage.none");
  if (!controller.power) return t("stage.off");
  if (controller.effectId != null) {
    return EFFECTS.find((effect) => effect.id === controller.effectId)?.name ?? t("stage.mode");
  }
  return rgbToHex(controller.color);
}
