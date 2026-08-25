"use client";

import type { ReactNode } from "react";
import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { sampleEffect, sampleLed } from "@/lib/protocol";
import { rgbToCss } from "@/lib/scenes";

interface CartoonCarProps {
  car: CarId;
  controllers: Controller[];
  target: "all" | ZoneKind;
  elapsed: number;
  onSelect: (zone: "all" | ZoneKind) => void;
}

export function CartoonCar({ car, controllers, target, elapsed, onSelect }: CartoonCarProps) {
  const zone = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);
  const emblem = zone("emblem");
  const grille = zone("grille");
  const mirrors = zone("mirrors");
  const bumper = zone("bumper");
  const coupe = car === "q60";
  const bars = car === "q70";
  const badge = car.toUpperCase();

  return (
    <svg
      viewBox="0 0 1200 640"
      className="relative z-0 h-auto w-full select-none"
      role="img"
      aria-label={`Cartoon ${badge} with Shinno lighting`}
      onClick={() => onSelect("all")}
    >
      <defs>
        <linearGradient id="studio" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#141416" />
          <stop offset="100%" stopColor="#070708" />
        </linearGradient>
        <linearGradient id="paint" x1="0.15" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#5c6168" />
          <stop offset="38%" stopColor="#32363c" />
          <stop offset="100%" stopColor="#1a1c20" />
        </linearGradient>
        <linearGradient id="paintHi" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#8a9098" />
          <stop offset="100%" stopColor="#3d4248" />
        </linearGradient>
        <linearGradient id="glass" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0%" stopColor="#6a849c" />
          <stop offset="45%" stopColor="#243040" />
          <stop offset="100%" stopColor="#101820" />
        </linearGradient>
        <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#f2f3f5" />
          <stop offset="45%" stopColor="#b8bcc2" />
          <stop offset="100%" stopColor="#7a7e84" />
        </linearGradient>
        <pattern id="honey" width="12" height="20" patternUnits="userSpaceOnUse">
          <path d="M6 1 L11 5.5 V14.5 L6 19 L1 14.5 V5.5 Z" fill="none" stroke="#3a3e44" strokeWidth="1" />
        </pattern>
        <filter id="softGlow" x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="3.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <rect width="1200" height="640" fill="url(#studio)" />
      <ellipse cx="640" cy="588" rx="500" ry="18" fill="#000" opacity="0.5" />

      {/* Rear wheel is farther; front wheel is closer — 3/4, not a side-on toy. */}
      <Wheel cx={1048} cy={528} scale={0.68} />
      <Wheel cx={318} cy={508} scale={1} />

      {/* Side haunch receding to the right */}
      <path
        d="M470 250 L 560 168 L 980 198 L 1120 280 L 1136 360 C 1138 410 1100 455 1078 468 L 1110 472 C 1104 430 996 424 988 472 L 560 468 L 470 360 Z"
        fill="#2a2e34"
        stroke="#0c0d10"
        strokeWidth="2.2"
      />
      <path d="M560 250 C 700 232 900 240 1080 300" fill="none" stroke="#6a7078" strokeWidth="3" opacity="0.4" />
      <rect x="820" y="292" width={coupe ? 0 : 40} height="10" rx="3" fill="url(#chrome)" />
      <text x="620" y="318" fill="#c5c8ce" fontFamily="Arial, sans-serif" fontSize="14" fontWeight="700" letterSpacing="1.2">
        {car === "q70" ? "3.7" : "3.0t"}
      </text>

      {/* Cabin / roof */}
      <path
        d={
          coupe
            ? "M500 168 C 620 108 820 100 1000 148 L 1088 230 L 980 198 L 560 168 Z"
            : "M500 168 C 600 98 820 88 1020 140 L 1100 220 L 980 198 L 560 168 Z"
        }
        fill="#3a4048"
        stroke="#0c0d10"
        strokeWidth="2"
      />
      {/* Windshield (facing us) + side glass */}
      <path d="M292 198 L 500 168 L 548 268 L 318 292 Z" fill="url(#glass)" stroke="#d5d8de" strokeWidth="3" />
      <path
        d={
          coupe
            ? "M500 168 L 980 198 L 960 278 L 548 268 Z"
            : "M500 168 L 780 178 L 790 272 L 548 268 Z"
        }
        fill="url(#glass)"
        stroke="#d5d8de"
        strokeWidth="3"
      />
      {!coupe ? <path d="M780 178 L 1020 140 L 1008 250 L 790 272 Z" fill="url(#glass)" stroke="#d5d8de" strokeWidth="3" /> : null}
      <path d="M500 166 L 548 268" stroke="#0c0d10" strokeWidth="10" />
      <path d="M502 168 L 550 268" stroke="#d5d8de" strokeWidth="2.2" />

      {/* Hood — a surface we look down on, between glass and grille */}
      <path
        d="M150 278 L 292 198 L 548 268 L 478 318 L 168 348 Z"
        fill="url(#paintHi)"
        stroke="#0c0d10"
        strokeWidth="2"
      />
      <path d="M220 268 L 400 248" fill="none" stroke="#1a1c20" strokeWidth="2" opacity="0.35" />
      <path d="M250 300 L 430 278" fill="none" stroke="#1a1c20" strokeWidth="2" opacity="0.25" />

      {/* Front fascia facing the camera */}
      <path
        d="M86 300 C 80 250 130 228 190 230 L 478 318 L 490 400 C 400 430 220 438 100 410 C 78 390 78 340 86 300 Z"
        fill="#24282c"
        stroke="#0c0d10"
        strokeWidth="2.4"
      />

      {/* Double-arch grille */}
      <path
        d="M148 262 C 210 238 310 248 400 292 C 412 318 400 372 370 392 C 300 418 200 414 148 388 C 122 360 122 292 148 262 Z"
        fill="url(#chrome)"
      />
      <path
        d="M164 274 C 218 254 304 264 382 302 C 392 322 384 366 360 382 C 300 404 210 400 164 378 C 144 354 144 300 164 274 Z"
        fill={bars ? "#1a1c20" : "#0e1012"}
      />
      {!bars ? (
        <path
          d="M164 274 C 218 254 304 264 382 302 C 392 322 384 366 360 382 C 300 404 210 400 164 378 C 144 354 144 300 164 274 Z"
          fill="url(#honey)"
          opacity="0.9"
        />
      ) : (
        <g stroke="url(#chrome)" strokeWidth="3.6" fill="none">
          <path d="M172 300 L 376 322" />
          <path d="M170 324 L 372 346" />
          <path d="M172 348 L 366 368" />
        </g>
      )}

      {/* Q50 crescent DRLs */}
      <path
        d="M78 268 C 70 238 110 228 158 238 L 186 248 L 168 318 C 120 328 76 310 78 268 Z"
        fill="#e8eef4"
        stroke="#0c0d10"
        strokeWidth="1.8"
      />
      <path d="M92 250 C 120 242 150 246 176 254" fill="none" stroke="#f7fbff" strokeWidth="5" strokeLinecap="round" />
      <path
        d="M400 250 C 470 248 560 278 578 310 C 572 338 520 348 470 340 L 412 322 C 404 292 400 268 400 250 Z"
        fill="#e8eef4"
        stroke="#0c0d10"
        strokeWidth="1.8"
      />
      <path d="M418 264 C 480 262 540 286 562 310" fill="none" stroke="#f7fbff" strokeWidth="6" strokeLinecap="round" />
      <ellipse cx="520" cy="308" rx="16" ry="12" fill="#b8c4d0" stroke="#8a96a4" strokeWidth="2" />

      {/* Lower bumper intakes */}
      <path d="M108 392 C 150 408 210 414 250 408 L 246 442 C 190 450 130 444 100 428 Z" fill="#121416" stroke="#0c0d10" />
      <path d="M330 398 C 380 392 450 388 500 400 L 492 438 C 430 448 360 444 328 430 Z" fill="#121416" stroke="#0c0d10" />
      <path d="M248 412 C 290 406 330 406 360 412 L 356 436 C 310 442 270 442 246 432 Z" fill="#0e1012" />
      <path d="M248 412 C 290 406 330 406 360 412 L 356 436 C 310 442 270 442 246 432 Z" fill="url(#honey)" opacity="0.65" />
      <path d="M220 452 C 228 372 410 368 430 452" fill="#24282c" stroke="#0c0d10" strokeWidth="2" />

      <LightHit
        zone="emblem"
        selected={target === "emblem"}
        on={Boolean(emblem?.power)}
        glow={fill(emblem, elapsed)}
        onToggle={() => toggle(onSelect, target, "emblem")}
      >
        <Emblem x={270} y={322} controller={emblem} elapsed={elapsed} />
      </LightHit>

      <LightHit
        zone="grille"
        selected={target === "grille"}
        on={Boolean(grille?.power)}
        glow={fill(grille, elapsed)}
        onToggle={() => toggle(onSelect, target, "grille")}
      >
        <Badge x={278} y={388} caption={badge} controller={grille} elapsed={elapsed} />
      </LightHit>

      <LightHit
        zone="bumper"
        selected={target === "bumper"}
        on={Boolean(bumper?.power)}
        glow={fill(bumper, elapsed)}
        onToggle={() => toggle(onSelect, target, "bumper")}
      >
        <BumperBar x={118} y={418} scale={0.72} controller={bumper} elapsed={elapsed} />
        <BumperBar x={348} y={414} scale={0.95} controller={bumper} elapsed={elapsed} />
      </LightHit>

      <g onClick={(event) => event.stopPropagation()}>
        <FarMirror x={268} y={168} />
        <NearMirror x={548} y={148} />
      </g>
      <LightHit
        zone="mirrors"
        selected={target === "mirrors"}
        on={Boolean(mirrors?.power)}
        glow={fill(mirrors, elapsed)}
        onToggle={() => toggle(onSelect, target, "mirrors")}
      >
        <Sequential x={250} y={178} count={9} scale={0.38} tilt={-16} controller={mirrors} elapsed={elapsed} />
        <Sequential x={590} y={172} count={9} scale={0.7} tilt={6} controller={mirrors} elapsed={elapsed} />
      </LightHit>
    </svg>
  );
}

function toggle(
  onSelect: (zone: "all" | ZoneKind) => void,
  target: "all" | ZoneKind,
  zone: ZoneKind,
) {
  onSelect(target === zone ? "all" : zone);
}

function LightHit({
  zone,
  selected,
  on,
  glow,
  onToggle,
  children,
}: {
  zone: ZoneKind;
  selected: boolean;
  on: boolean;
  glow: string;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <g
      role="button"
      tabIndex={0}
      aria-label={label(zone)}
      aria-pressed={selected}
      className="cursor-pointer"
      style={{
        filter: selected
          ? "drop-shadow(0 0 4px rgba(255,255,255,0.95))"
          : on
            ? `drop-shadow(0 0 6px ${glow})`
            : undefined,
      }}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          event.stopPropagation();
          onToggle();
        }
      }}
    >
      <g>{children}</g>
      {selected ? (
        <title>{label(zone)}</title>
      ) : null}
    </g>
  );
}

function Wheel({ cx, cy, scale = 1 }: { cx: number; cy: number; scale?: number }) {
  const r = 82 * scale;
  const rim = 56 * scale;
  const inner = 48 * scale;
  const hub = 16 * scale;
  const cap = 8 * scale;
  return (
    <g>
      <ellipse cx={cx} cy={cy + 10 * scale} rx={r + 6 * scale} ry={12 * scale} fill="#000" opacity="0.35" />
      <circle cx={cx} cy={cy} r={r} fill="#0a0a0c" stroke="#1c1c1e" strokeWidth={3 * scale} />
      <circle cx={cx} cy={cy} r={r - 11 * scale} fill="#2a2e32" />
      <circle cx={cx} cy={cy} r={rim} fill="#4e545c" />
      <circle cx={cx} cy={cy} r={inner} fill="#24282c" />
      {Array.from({ length: 10 }, (_, i) => {
        const a = (i / 10) * Math.PI * 2 - 0.18;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * 14 * scale}
            y1={cy + Math.sin(a) * 14 * scale}
            x2={cx + Math.cos(a) * 44 * scale}
            y2={cy + Math.sin(a) * 44 * scale}
            stroke="#c0c4ca"
            strokeWidth={5 * scale}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={hub} fill="#d8dbe0" />
      <circle cx={cx} cy={cy} r={cap} fill="#2a2c30" />
    </g>
  );
}

function FarMirror({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 18 C 4 4 28 0 42 10 C 46 22 28 38 10 36 C 0 32 -2 24 0 18 Z" fill="#3a3e44" stroke="#0c0d10" strokeWidth="1.6" />
      <path d="M8 16 L 34 12" stroke="#1a1c20" strokeWidth="4" strokeLinecap="round" />
    </g>
  );
}

function NearMirror({ x, y }: { x: number; y: number }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <path d="M0 28 C 8 4 70 0 96 18 C 102 36 70 62 22 58 C 4 52 -4 40 0 28 Z" fill="#3a3e44" stroke="#0c0d10" strokeWidth="2" />
      <path d="M18 24 L 88 20" stroke="#1a1c20" strokeWidth="6" strokeLinecap="round" />
    </g>
  );
}

function Emblem({
  x,
  y,
  controller,
  elapsed,
}: {
  x: number;
  y: number;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const leds = 8;
  return (
    <g transform={`translate(${x} ${y}) scale(0.92, 0.78) rotate(10)`}>
      <ellipse cx="0" cy="0" rx="36" ry="27" fill="#16171a" stroke="#c8ccd2" strokeWidth="3.4" />
      {on
        ? Array.from({ length: leds }, (_, i) => {
            const rgb = ledColor(controller, elapsed, i, leds);
            const a = -Math.PI / 2 + (i / leds) * Math.PI * 2;
            return <ellipse key={i} cx={Math.cos(a) * 24} cy={Math.sin(a) * 17} rx="8" ry="6" fill={rgbToCss(rgb, 0.8)} />;
          })
        : null}
      <path
        d="M0 -18 C -10 -4 -16 8 -22 20 C -12 12 -6 10 0 22 C 6 10 12 12 22 20 C 16 8 10 -4 0 -18 Z"
        fill="#e8eaee"
      />
    </g>
  );
}

function Badge({
  x,
  y,
  caption,
  controller,
  elapsed,
}: {
  x: number;
  y: number;
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
    <text
      x={x}
      y={y}
      textAnchor="middle"
      fontFamily="Arial Black, Arial, sans-serif"
      fontStyle="italic"
      fontWeight="900"
      fontSize="22"
      letterSpacing="-1.5"
      fill={on ? rgbToCss(rgb, 0.95) : "#141416"}
      stroke="#d2d6dc"
      strokeWidth="2.2"
      paintOrder="stroke fill"
    >
      {caption}
    </text>
  );
}

function Sequential({
  x,
  y,
  count,
  scale,
  tilt,
  controller,
  elapsed,
}: {
  x: number;
  y: number;
  count: number;
  scale: number;
  tilt: number;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const w = 14;
  return (
    <g transform={`translate(${x} ${y}) rotate(${tilt}) scale(${scale})`}>
      <rect x="-6" y="-8" width={count * (w + 3) + 8} height="28" rx="4" fill="#0c0d10" />
      {Array.from({ length: count }, (_, i) => {
        const rgb = ledColor(controller, elapsed, i, count);
        return (
          <rect
            key={i}
            x={i * (w + 3)}
            y={-4}
            width={w}
            height="20"
            rx="2"
            fill={on ? rgbToCss(rgb, 0.55 + (controller!.brightness / 100) * 0.45) : "#2a2c30"}
            stroke="#050506"
            strokeWidth="0.8"
          />
        );
      })}
    </g>
  );
}

function BumperBar({
  x,
  y,
  scale,
  flip,
  controller,
  elapsed,
}: {
  x: number;
  y: number;
  scale: number;
  flip?: boolean;
  controller?: Controller;
  elapsed: number;
}) {
  const on = Boolean(controller?.power);
  const count = 5;
  return (
    <g transform={`translate(${x} ${y}) scale(${flip ? -scale : scale} ${scale})`}>
      <path d="M0 -16 H 118 C 132 -16 142 -4 142 8 C 142 18 132 22 118 22 H 8 C -4 22 -8 8 -2 -4 Z" fill="#0d0e12" stroke="#2a2c30" strokeWidth="1.4" />
      {Array.from({ length: count }, (_, i) => {
        const rgb = ledColor(controller, elapsed, i, count);
        const cx = 18 + i * 24;
        return (
          <g key={i}>
            <circle cx={cx} cy="2" r="9" fill="#16181c" stroke="#2c2e32" />
            <circle cx={cx} cy="2" r="5.6" fill={on ? rgbToCss(rgb, 0.62 + (controller!.brightness / 100) * 0.38) : "#2a2c30"} />
          </g>
        );
      })}
    </g>
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
