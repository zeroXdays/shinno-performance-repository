"use client";

import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { rgbToCss } from "@/lib/scenes";

interface VehicleStageProps {
  car: CarId;
  controllers: Controller[];
  target: "all" | ZoneKind;
  onSelect: (zone: "all" | ZoneKind) => void;
}

export function VehicleStage({ car, controllers, target, onSelect }: VehicleStageProps) {
  const zoneCtrl = (kind: ZoneKind) => controllers.find((c) => c.zone === kind);

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-md">
      <svg
        viewBox="0 0 720 380"
        className="relative w-full select-none"
        role="img"
        aria-label={`${car.toUpperCase()} lighting zones`}
        onClick={() => onSelect("all")}
      >
        <defs>
          <linearGradient id="paint" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2a2a2e" />
            <stop offset="55%" stopColor="#141416" />
            <stop offset="100%" stopColor="#0a0a0c" />
          </linearGradient>
          <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>

        <ellipse cx="360" cy="348" rx="220" ry="16" fill="#000" opacity="0.55" />

        {car === "q70" ? <Q70Body /> : car === "q60" ? <Q60Body /> : <Q50Body />}

        <MirrorLights
          controller={zoneCtrl("mirrors")}
          selected={target === "mirrors"}
          onClick={() => toggle("mirrors")}
          car={car}
        />
        <BumperLights
          controller={zoneCtrl("bumper")}
          selected={target === "bumper"}
          onClick={() => toggle("bumper")}
          car={car}
        />
        <GrilleLight
          controller={zoneCtrl("grille")}
          selected={target === "grille"}
          onClick={() => toggle("grille")}
          car={car}
        />
        <EmblemLight
          controller={zoneCtrl("emblem")}
          selected={target === "emblem"}
          onClick={() => toggle("emblem")}
          car={car}
        />
      </svg>

      <p className="mt-1 text-center text-xs text-white/45">
        {target === "all" ? "All lights" : label(target)}
        {" · tap a part"}
      </p>
    </div>
  );
}

function Q50Body() {
  return (
    <g pointerEvents="none">
      {/* fenders / body */}
      <path
        d="M78 250 C110 168 190 118 360 108 C530 118 610 168 642 250 C628 286 540 304 360 308 C180 304 92 286 78 250 Z"
        fill="url(#paint)"
        stroke="#3a3a40"
        strokeWidth="1.2"
      />
      {/* hood */}
      <path
        d="M168 168 C230 132 290 122 360 120 C430 122 490 132 552 168 C500 176 430 184 360 184 C290 184 220 176 168 168 Z"
        fill="#121214"
        stroke="#2c2c32"
        strokeWidth="1"
      />
      <path d="M360 122 L360 184" stroke="#2a2a30" strokeWidth="1.4" />
      {/* windshield hint */}
      <path
        d="M210 168 C270 148 310 142 360 140 C410 142 450 148 510 168 C460 172 400 176 360 176 C320 176 260 172 210 168 Z"
        fill="#1a222c"
        opacity="0.85"
      />
      {/* V-motion grille */}
      <path
        d="M228 196 L360 228 L492 196 L468 250 L360 268 L252 250 Z"
        fill="#0d0d10"
        stroke="#4a4a52"
        strokeWidth="1.6"
      />
      <path d="M250 210 L360 236 L470 210" fill="none" stroke="#2e2e34" strokeWidth="1" />
      <path d="M258 226 L360 248 L462 226" fill="none" stroke="#2e2e34" strokeWidth="1" />
      {/* double-arch headlights */}
      <path d="M132 188 C188 164 248 170 268 198 C230 214 176 220 132 188 Z" fill="#cfd5de" />
      <path d="M148 198 C190 184 232 190 248 204 C220 214 176 216 148 198 Z" fill="#8b93a0" />
      <path d="M588 188 C532 164 472 170 452 198 C490 214 544 220 588 188 Z" fill="#cfd5de" />
      <path d="M572 198 C530 184 488 190 472 204 C500 214 544 216 572 198 Z" fill="#8b93a0" />
      {/* lower bumper */}
      <path
        d="M120 268 C180 278 260 286 360 288 C460 286 540 278 600 268 L580 300 C500 312 420 318 360 318 C300 318 220 312 140 300 Z"
        fill="#0c0c0e"
        stroke="#2a2a30"
      />
      <path d="M300 292 L360 298 L420 292 L408 312 L360 316 L312 312 Z" fill="#151518" />
    </g>
  );
}

function Q60Body() {
  return (
    <g pointerEvents="none">
      <path
        d="M70 258 C108 170 200 108 360 98 C520 108 612 170 650 258 C634 292 530 310 360 314 C190 310 86 292 70 258 Z"
        fill="url(#paint)"
        stroke="#3a3a40"
        strokeWidth="1.2"
      />
      <path
        d="M160 172 C230 124 300 112 360 110 C420 112 490 124 560 172 C500 182 430 190 360 190 C290 190 220 182 160 172 Z"
        fill="#101012"
      />
      <path
        d="M216 200 L360 236 L504 200 L476 258 L360 278 L244 258 Z"
        fill="#0d0d10"
        stroke="#4a4a52"
        strokeWidth="1.6"
      />
      <path d="M118 196 C186 154 250 162 276 202 C230 222 164 226 118 196 Z" fill="#d5dbe4" />
      <path d="M602 196 C534 154 470 162 444 202 C490 222 556 226 602 196 Z" fill="#d5dbe4" />
      <path
        d="M110 272 C180 286 270 296 360 298 C450 296 540 286 610 272 L588 308 C500 322 420 328 360 328 C300 328 220 322 132 308 Z"
        fill="#0b0b0d"
      />
    </g>
  );
}

function Q70Body() {
  return (
    <g pointerEvents="none">
      <path
        d="M90 236 C130 160 210 114 360 106 C510 114 590 160 630 236 C618 278 530 298 360 302 C190 298 102 278 90 236 Z"
        fill="url(#paint)"
        stroke="#3a3a40"
        strokeWidth="1.2"
      />
      <path
        d="M180 158 C250 128 310 120 360 118 C410 120 470 128 540 158 C480 168 420 176 360 176 C300 176 240 168 180 158 Z"
        fill="#141418"
      />
      <path
        d="M240 186 L360 214 L480 186 L462 248 L360 266 L258 248 Z"
        fill="#0d0d10"
        stroke="#4a4a52"
        strokeWidth="1.6"
      />
      <rect x="118" y="186" width="118" height="28" rx="6" fill="#c8ced8" />
      <rect x="484" y="186" width="118" height="28" rx="6" fill="#c8ced8" />
      <path
        d="M128 260 C190 274 270 282 360 284 C450 282 530 274 592 260 L574 296 C490 308 420 312 360 312 C300 312 230 308 146 296 Z"
        fill="#0c0c0e"
      />
    </g>
  );
}

function EmblemLight({
  controller,
  selected,
  onClick,
  car,
}: {
  controller?: Controller;
  selected: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const y = car === "q70" ? 186 : car === "q60" ? 198 : 192;
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <circle
        cx="360"
        cy={y}
        r="26"
        fill="transparent"
        stroke={selected ? "#fff" : "transparent"}
        strokeWidth="2"
      />
      <circle
        cx="360"
        cy={y}
        r="17"
        fill={fill(controller)}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.35)"}
        strokeWidth="1.4"
      />
    </g>
  );
}

function GrilleLight({
  controller,
  selected,
  onClick,
  car,
}: {
  controller?: Controller;
  selected: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const y = car === "q70" ? 228 : car === "q60" ? 238 : 232;
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <rect
        x="328"
        y={y}
        width="64"
        height="16"
        rx="3"
        fill={fill(controller)}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.2)"}
        strokeWidth={selected ? 2 : 1}
      />
    </g>
  );
}

function BumperLights({
  controller,
  selected,
  onClick,
  car,
}: {
  controller?: Controller;
  selected: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const y = car === "q70" ? 268 : car === "q60" ? 286 : 278;
  const color = fill(controller);
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <rect x="140" y={y - 8} width="136" height="28" fill="transparent" />
      <rect x="444" y={y - 8} width="136" height="28" fill="transparent" />
      <rect
        x="148"
        y={y}
        width="118"
        height="11"
        rx="5"
        fill={color}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "transparent"}
        strokeWidth="2"
      />
      <rect
        x="454"
        y={y}
        width="118"
        height="11"
        rx="5"
        fill={color}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "transparent"}
        strokeWidth="2"
      />
    </g>
  );
}

function MirrorLights({
  controller,
  selected,
  onClick,
  car,
}: {
  controller?: Controller;
  selected: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const y = car === "q70" ? 168 : car === "q60" ? 168 : 172;
  const color = fill(controller);
  const left = car === "q60" ? 62 : 78;
  const right = car === "q60" ? 658 : 642;
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <ellipse
        cx={left}
        cy={y}
        rx="26"
        ry="14"
        fill={color}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.25)"}
        strokeWidth={selected ? 2 : 1}
      />
      <ellipse
        cx={right}
        cy={y}
        rx="26"
        ry="14"
        fill={color}
        filter={controller?.power ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.25)"}
        strokeWidth={selected ? 2 : 1}
      />
    </g>
  );
}

function fill(controller?: Controller): string {
  if (controller?.power) return rgbToCss(controller.color, 0.35 + (controller.brightness / 100) * 0.65);
  return "rgba(70,70,74,0.7)";
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
