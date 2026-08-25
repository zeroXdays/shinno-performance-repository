"use client";

import type { Controller } from "@/lib/controller";
import { rgbToCss } from "@/lib/scenes";
import { cn } from "@/lib/utils";

interface VehicleStageProps {
  controllers: Controller[];
  target: "all" | string;
  onSelect: (id: "all" | string) => void;
}

export function VehicleStage({ controllers, target, onSelect }: VehicleStageProps) {
  const zone = (kind: Controller["zone"]) => controllers.find((c) => c.zone === kind);
  const emblem = zone("emblem");
  const mirrors = zone("mirrors");
  const bumper = zone("bumper");
  const grille = zone("grille");
  const glow = (c?: Controller) =>
    c && c.power ? rgbToCss(c.color, 0.18 + (c.brightness / 100) * 0.7) : "transparent";
  const solid = (c?: Controller) =>
    c && c.power ? rgbToCss(c.color, 0.45 + (c.brightness / 100) * 0.55) : "rgba(80,80,84,0.5)";

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="pointer-events-none absolute inset-x-8 top-10 h-40 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(225,6,0,0.18),transparent_70%)] blur-2xl" />
      <svg viewBox="0 0 640 360" className="relative w-full" aria-hidden>
        <defs>
          <linearGradient id="body" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#1a1a1e" />
            <stop offset="100%" stopColor="#0b0b0d" />
          </linearGradient>
          <filter id="soft">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>

        <ellipse cx="320" cy="318" rx="210" ry="18" fill="rgba(0,0,0,0.55)" />

        <path
          d="M86 228 C120 168 190 118 320 110 C450 118 520 168 554 228 C548 258 500 278 320 282 C140 278 92 258 86 228 Z"
          fill="url(#body)"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="1.5"
        />
        <path
          d="M168 168 C214 138 256 128 320 126 C384 128 426 138 472 168 C430 176 370 182 320 182 C270 182 210 176 168 168 Z"
          fill="#0e0e12"
          stroke="rgba(255,255,255,0.06)"
        />

        {/* Headlights */}
        <path
          d="M148 188 C186 172 230 176 248 196 C214 210 176 214 148 188 Z"
          fill="#d8dde8"
          opacity="0.85"
        />
        <path
          d="M492 188 C454 172 410 176 392 196 C426 210 464 214 492 188 Z"
          fill="#d8dde8"
          opacity="0.85"
        />

        {/* Mirrors */}
        <g
          className="cursor-pointer"
          onClick={() => mirrors && onSelect(target === mirrors.id ? "all" : mirrors.id)}
        >
          <ellipse
            cx="92"
            cy="176"
            rx="28"
            ry="16"
            fill={solid(mirrors)}
            filter={mirrors?.power ? "url(#soft)" : undefined}
          />
          <ellipse cx="92" cy="176" rx="18" ry="10" fill={solid(mirrors)} stroke="white" strokeOpacity="0.25" />
          <ellipse
            cx="548"
            cy="176"
            rx="28"
            ry="16"
            fill={solid(mirrors)}
            filter={mirrors?.power ? "url(#soft)" : undefined}
          />
          <ellipse cx="548" cy="176" rx="18" ry="10" fill={solid(mirrors)} stroke="white" strokeOpacity="0.25" />
        </g>

        {/* Grille / V-motion */}
        <path
          d="M250 198 L320 214 L390 198 L372 238 L320 248 L268 238 Z"
          fill="#111114"
          stroke="rgba(255,255,255,0.12)"
        />
        <g
          className="cursor-pointer"
          onClick={() => grille && onSelect(target === grille.id ? "all" : grille.id)}
        >
          <rect
            x="292"
            y="208"
            width="56"
            height="14"
            rx="3"
            fill={solid(grille)}
            filter={grille?.power ? "url(#soft)" : undefined}
          />
        </g>
        <g
          className="cursor-pointer"
          onClick={() => emblem && onSelect(target === emblem.id ? "all" : emblem.id)}
        >
          <ellipse
            cx="320"
            cy="188"
            rx="22"
            ry="22"
            fill={glow(emblem)}
            filter={emblem?.power ? "url(#soft)" : undefined}
          />
          <ellipse cx="320" cy="188" rx="16" ry="16" fill={solid(emblem)} stroke="white" strokeOpacity="0.35" />
          <text
            x="320"
            y="193"
            textAnchor="middle"
            fontSize="11"
            fontFamily="ui-sans-serif, system-ui"
            fill="#111"
            fontWeight="700"
          >
            Q
          </text>
        </g>

        {/* Bumper DRLs */}
        <g
          className="cursor-pointer"
          onClick={() => bumper && onSelect(target === bumper.id ? "all" : bumper.id)}
        >
          <rect
            x="150"
            y="252"
            width="110"
            height="10"
            rx="4"
            fill={solid(bumper)}
            filter={bumper?.power ? "url(#soft)" : undefined}
          />
          <rect
            x="380"
            y="252"
            width="110"
            height="10"
            rx="4"
            fill={solid(bumper)}
            filter={bumper?.power ? "url(#soft)" : undefined}
          />
        </g>
      </svg>
      <p className="mt-1 text-center text-[11px] uppercase tracking-[0.22em] text-white/35">
        {target === "all" ? "All zones linked" : "Single zone"}
        {" · "}tap a light to isolate
      </p>
      <div className="mt-3 flex flex-wrap justify-center gap-2">
        {controllers.map((controller) => {
          const active = target === controller.id;
          return (
            <button
              key={controller.id}
              type="button"
              onClick={() => onSelect(active ? "all" : controller.id)}
              className={cn(
                "rounded-full border px-3 py-1 text-xs tracking-wide transition",
                active
                  ? "border-white/40 bg-white/15 text-white"
                  : "border-white/10 bg-white/5 text-white/70 hover:bg-white/10",
              )}
            >
              <span
                className="mr-1.5 inline-block size-2 rounded-full"
                style={{
                  background: controller.power ? rgbToCss(controller.color) : "#444",
                  boxShadow: controller.power ? `0 0 8px ${rgbToCss(controller.color)}` : "none",
                }}
              />
              {controller.customName}
            </button>
          );
        })}
      </div>
    </div>
  );
}
