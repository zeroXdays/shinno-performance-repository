"use client";

import { useClock } from "@/hooks/use-clock";
import type { CarId, ZoneKind } from "@/lib/catalog";
import type { Controller } from "@/lib/controller";
import { rgbToCss } from "@/lib/scenes";
import { sampleEffect } from "@/lib/protocol";

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
  const wash = colorOf(controllers.find((controller) => controller.power) ?? zoneCtrl("emblem"));

  const toggle = (zone: ZoneKind) => {
    onSelect(target === zone ? "all" : zone);
  };

  return (
    <div className="relative mx-auto w-full max-w-lg">
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#09090b] shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
        <div
          className="pointer-events-none absolute inset-x-8 bottom-2 h-16 rounded-[100%] blur-2xl"
          style={{ background: wash, opacity: 0.28 }}
        />
        <svg
          viewBox="0 0 980 560"
          className="relative w-full select-none"
          role="img"
          aria-label={`${car.toUpperCase()} lighting zones`}
          onClick={() => onSelect("all")}
        >
          <defs>
            <linearGradient id="graphite" x1="0.05" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#8a9098" />
              <stop offset="18%" stopColor="#4d535c" />
              <stop offset="42%" stopColor="#2c3036" />
              <stop offset="68%" stopColor="#5a616a" />
              <stop offset="100%" stopColor="#16181c" />
            </linearGradient>
            <linearGradient id="graphite-side" x1="0" y1="0" x2="1" y2="0.3">
              <stop offset="0%" stopColor="#3a4048" />
              <stop offset="45%" stopColor="#24282e" />
              <stop offset="100%" stopColor="#121416" />
            </linearGradient>
            <linearGradient id="hood" x1="0.2" y1="0" x2="0.8" y2="1">
              <stop offset="0%" stopColor="#6a717a" />
              <stop offset="35%" stopColor="#3a4048" />
              <stop offset="100%" stopColor="#1c2026" />
            </linearGradient>
            <linearGradient id="glass" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#9aa8b8" />
              <stop offset="28%" stopColor="#243040" />
              <stop offset="100%" stopColor="#0b1018" />
            </linearGradient>
            <linearGradient id="chrome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#f2f4f6" />
              <stop offset="40%" stopColor="#b8bec6" />
              <stop offset="100%" stopColor="#6c737c" />
            </linearGradient>
            <linearGradient id="lamp" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f6f8fb" />
              <stop offset="55%" stopColor="#c5ced8" />
              <stop offset="100%" stopColor="#6d7886" />
            </linearGradient>
            <pattern id="honeycomb" width="12" height="20" patternUnits="userSpaceOnUse">
              <path
                d="M6 1 L11 4.5 V12.5 L6 16 L1 12.5 V4.5 Z"
                fill="none"
                stroke="rgba(220,225,230,0.22)"
                strokeWidth="0.7"
              />
            </pattern>
            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
              <feGaussianBlur stdDeviation="6" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <clipPath id="grille-clip">
              <path d={GRILLE[car]} />
            </clipPath>
          </defs>

          <ellipse cx="490" cy="518" rx="340" ry="16" fill="#000" opacity="0.55" />

          {car === "q70" ? <Q70Body /> : car === "q60" ? <Q60Body /> : <Q50Body />}

          <BumperLights
            color={colorOf(zoneCtrl("bumper"))}
            selected={target === "bumper"}
            on={Boolean(zoneCtrl("bumper")?.power)}
            onClick={() => toggle("bumper")}
            car={car}
          />
          <GrilleLight
            color={colorOf(zoneCtrl("grille"))}
            selected={target === "grille"}
            on={Boolean(zoneCtrl("grille")?.power)}
            onClick={() => toggle("grille")}
            car={car}
          />
          <EmblemLight
            color={colorOf(zoneCtrl("emblem"))}
            selected={target === "emblem"}
            on={Boolean(zoneCtrl("emblem")?.power)}
            onClick={() => toggle("emblem")}
            car={car}
          />
          <MirrorLights
            color={colorOf(zoneCtrl("mirrors"))}
            selected={target === "mirrors"}
            on={Boolean(zoneCtrl("mirrors")?.power)}
            onClick={() => toggle("mirrors")}
            car={car}
          />
        </svg>
      </div>
      <p className="mt-1.5 text-center text-[11px] tracking-wide text-white/40">
        {target === "all" ? "All lights" : label(target)}
        {" · tap a part"}
      </p>
    </div>
  );
}

const GRILLE: Record<CarId, string> = {
  q50: "M198 236 L392 242 L412 328 L182 320 Z",
  q60: "M190 242 L400 248 L422 338 L172 328 Z",
  q70: "M210 230 L400 236 L416 318 L196 310 Z",
};

function Q50Body() {
  return (
    <g pointerEvents="none">
      <path
        d="M112 356
           C92 312 90 262 118 228
           C138 204 168 196 198 206
           C240 150 328 118 428 112
           C508 108 548 84 592 58
           C668 32 792 46 868 118
           C910 156 926 214 912 268
           C922 308 910 362 868 392
           C800 424 640 436 520 428
           C470 424 430 400 408 372
           C360 400 250 392 168 372
           C138 378 122 372 112 356 Z"
        fill="url(#graphite-side)"
        stroke="#3a3f46"
        strokeWidth="1.1"
      />
      <path
        d="M198 206 C250 154 340 122 430 116 C500 122 540 148 548 176 C470 186 360 196 250 214 C224 218 208 214 198 206 Z"
        fill="url(#hood)"
      />
      <path d="M430 116 L438 176" stroke="#2a2e34" strokeWidth="1.4" />
      <path
        d="M250 214 C360 196 470 186 548 176 C560 188 568 208 562 228 C470 236 350 248 248 248 C230 236 236 222 250 214 Z"
        fill="#1a1d22"
        opacity="0.55"
      />
      <path
        d="M548 176 C592 64 760 52 848 122 C800 138 700 148 620 154 C580 156 558 164 548 176 Z"
        fill="url(#glass)"
        stroke="#8a96a4"
        strokeWidth="1.1"
      />
      <path
        d="M620 154 C700 148 800 138 848 122 C870 148 876 188 862 228 C780 248 680 258 600 252 C596 220 604 178 620 154 Z"
        fill="url(#glass)"
        opacity="0.92"
        stroke="#6a7684"
        strokeWidth="0.8"
      />
      <path d="M620 154 L600 252" stroke="#1a1c20" strokeWidth="7" strokeLinecap="round" />
      <path
        d="M168 232 C210 214 268 218 292 246 C250 268 196 272 154 252 C148 244 154 236 168 232 Z"
        fill="url(#lamp)"
      />
      <path
        d="M178 238 C214 224 258 228 278 248 C248 260 204 262 168 248 C168 244 172 240 178 238 Z"
        fill="none"
        stroke="#f4f7fb"
        strokeWidth="3.2"
        strokeLinecap="round"
      />
      <path
        d="M400 228 C458 214 522 228 548 262 C508 282 446 278 404 258 C394 248 394 236 400 228 Z"
        fill="url(#lamp)"
      />
      <path
        d="M414 236 C458 226 510 238 532 258 C500 270 450 268 412 254 C408 248 408 240 414 236 Z"
        fill="none"
        stroke="#f4f7fb"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d={chromeSurround("q50")} fill="url(#chrome)" />
      <path d={GRILLE.q50} fill="#0a0b0d" />
      <path d={GRILLE.q50} fill="url(#honeycomb)" />
      <path
        d="M118 356 C160 372 250 392 360 392 C390 360 430 348 448 360 C470 400 360 418 200 392 C150 380 122 368 118 356 Z"
        fill="#121416"
      />
      <path
        d="M200 338 C268 348 330 354 392 352 L398 372 C328 378 250 372 188 358 Z"
        fill="#0c0d10"
        stroke="#2a2e34"
        strokeWidth="1"
      />
      <path
        d="M96 332 C118 318 142 322 152 342 C132 356 108 354 96 332 Z"
        fill="#0e1014"
        stroke="#2c3036"
      />
      <path
        d="M430 348 C458 338 490 348 502 372 C476 386 446 382 430 348 Z"
        fill="#0e1014"
        stroke="#2c3036"
      />
      <path
        d="M430 210 C620 198 780 220 860 268"
        fill="none"
        stroke="#6a727c"
        strokeWidth="1.3"
        opacity="0.45"
      />
      <path d="M668 248 L692 252" stroke="#8a9098" strokeWidth="2.2" strokeLinecap="round" />
      <path d="M792 238 L812 242" stroke="#8a9098" strokeWidth="2.2" strokeLinecap="round" />
      <circle cx={798} cy={424} r={64} fill="#09090b" />
      <circle cx={148} cy={408} r={50} fill="#09090b" />
      <circle cx={438} cy={430} r={72} fill="#09090b" />
      <Wheel cx={798} cy={424} r={58} />
      <Wheel cx={148} cy={408} r={46} />
      <Wheel cx={438} cy={430} r={66} />
    </g>
  );
}

function Q60Body() {
  return (
    <g pointerEvents="none">
      <path
        d="M108 368
           C84 318 88 258 122 220
           C146 192 180 184 214 198
           C270 132 370 96 470 92
           C560 88 610 58 650 36
           C730 8 850 28 910 110
           C944 152 952 220 934 278
           C940 324 920 378 868 404
           C780 436 620 444 500 432
           C450 426 410 398 392 368
           C340 400 230 396 150 376
           C128 380 114 376 108 368 Z"
        fill="url(#graphite-side)"
        stroke="#3a3f46"
        strokeWidth="1.1"
      />
      <path
        d="M214 198 C280 140 380 104 472 98 C548 108 590 140 598 172 C510 184 380 198 260 214 C236 216 220 208 214 198 Z"
        fill="url(#hood)"
      />
      <path
        d="M598 172 C650 48 820 28 896 114 C840 132 730 146 650 154 C618 156 604 164 598 172 Z"
        fill="url(#glass)"
        stroke="#8a96a4"
        strokeWidth="1.1"
      />
      <path
        d="M650 154 C730 146 840 132 896 114 C918 150 922 198 904 244 C820 268 710 278 628 268 C624 228 632 178 650 154 Z"
        fill="url(#glass)"
        opacity="0.9"
      />
      <path d="M650 154 L628 268" stroke="#1a1c20" strokeWidth="8" strokeLinecap="round" />
      <path
        d="M158 228 C208 206 272 212 298 246 C252 270 190 272 148 250 C142 240 148 232 158 228 Z"
        fill="url(#lamp)"
      />
      <path
        d="M170 236 C214 220 262 226 282 248 C248 260 198 262 160 248"
        fill="none"
        stroke="#f4f7fb"
        strokeWidth="3.1"
        strokeLinecap="round"
      />
      <path
        d="M408 232 C470 214 540 230 568 268 C524 290 456 284 412 260 C402 250 400 240 408 232 Z"
        fill="url(#lamp)"
      />
      <path
        d="M422 242 C470 228 526 240 548 264 C512 276 458 272 418 256"
        fill="none"
        stroke="#f4f7fb"
        strokeWidth="3"
        strokeLinecap="round"
      />
      <path d={chromeSurround("q60")} fill="url(#chrome)" />
      <path d={GRILLE.q60} fill="#0a0b0d" />
      <path d={GRILLE.q60} fill="url(#honeycomb)" />
      <path
        d="M118 360 C170 380 270 400 380 400 C412 366 452 354 470 368 C490 410 360 428 190 400 C148 388 124 372 118 360 Z"
        fill="#121416"
      />
      <path
        d="M192 346 C270 358 340 364 404 360 L412 382 C332 390 250 382 180 366 Z"
        fill="#0c0d10"
      />
      <circle cx={804} cy={428} r={62} fill="#09090b" />
      <circle cx={140} cy={412} r={50} fill="#09090b" />
      <circle cx={442} cy={434} r={72} fill="#09090b" />
      <Wheel cx={804} cy={428} r={56} />
      <Wheel cx={140} cy={412} r={46} />
      <Wheel cx={442} cy={434} r={66} />
    </g>
  );
}

function Q70Body() {
  return (
    <g pointerEvents="none">
      <path
        d="M120 350
           C100 310 102 268 128 236
           C150 214 184 208 214 218
           C250 160 340 128 430 122
           C510 118 545 96 575 74
           C650 48 770 58 848 118
           C890 152 908 210 898 262
           C910 304 900 356 860 384
           C790 418 640 430 520 422
           C470 418 430 396 412 372
           C360 396 250 390 170 368
           C142 372 126 364 120 350 Z"
        fill="url(#graphite-side)"
        stroke="#3a3f46"
        strokeWidth="1.1"
      />
      <path
        d="M214 218 C260 164 350 132 432 126 C500 132 538 156 546 182 C470 190 360 202 258 220 C234 222 220 222 214 218 Z"
        fill="url(#hood)"
      />
      <path
        d="M546 182 C575 80 740 62 830 124 C780 140 680 150 610 156 C575 158 556 168 546 182 Z"
        fill="url(#glass)"
        stroke="#8a96a4"
        strokeWidth="1.1"
      />
      <path
        d="M610 156 C680 150 780 140 830 124 C852 154 860 196 848 236 C770 256 670 264 598 256 C594 220 598 178 610 156 Z"
        fill="url(#glass)"
        opacity="0.9"
      />
      <rect x="132" y="228" width="132" height="30" rx="6" fill="url(#lamp)" transform="rotate(-8 198 243)" />
      <rect x="404" y="226" width="128" height="28" rx="6" fill="url(#lamp)" transform="rotate(6 468 240)" />
      <path d={chromeSurround("q70")} fill="url(#chrome)" />
      <path d={GRILLE.q70} fill="#0a0b0d" />
      <path d={GRILLE.q70} fill="url(#honeycomb)" />
      <path
        d="M128 348 C176 368 270 386 380 386 C408 356 448 346 466 360 C484 400 360 418 196 392 C150 378 132 360 128 348 Z"
        fill="#121416"
      />
      <circle cx={812} cy={420} r={62} fill="#09090b" />
      <circle cx={156} cy={404} r={50} fill="#09090b" />
      <circle cx={448} cy={422} r={70} fill="#09090b" />
      <Wheel cx={812} cy={420} r={56} />
      <Wheel cx={156} cy={404} r={46} />
      <Wheel cx={448} cy={422} r={64} />
    </g>
  );
}

function chromeSurround(car: CarId): string {
  if (car === "q60") return "M176 228 L416 236 L442 350 L158 338 Z";
  if (car === "q70") return "M196 218 L416 224 L434 328 L182 320 Z";
  return "M184 222 L408 228 L432 340 L168 330 Z";
}

function Wheel({ cx, cy, r }: { cx: number; cy: number; r: number }) {
  const inner = r * 0.62;
  const hub = r * 0.2;
  const spokes = 10;
  return (
    <g>
      <ellipse cx={cx} cy={cy + r * 0.08} rx={r * 1.02} ry={r * 0.22} fill="#000" opacity="0.35" />
      <circle cx={cx} cy={cy} r={r} fill="#0b0c0e" />
      <circle cx={cx} cy={cy} r={r * 0.92} fill="#1a1d22" stroke="#4a5058" strokeWidth="2" />
      <circle cx={cx} cy={cy} r={inner} fill="#101215" stroke="#5a616a" strokeWidth="1.4" />
      {Array.from({ length: spokes }, (_, i) => {
        const a = (i / spokes) * Math.PI * 2 - Math.PI / 2;
        return (
          <line
            key={i}
            x1={cx + Math.cos(a) * hub}
            y1={cy + Math.sin(a) * hub}
            x2={cx + Math.cos(a) * inner}
            y2={cy + Math.sin(a) * inner}
            stroke="#7a828c"
            strokeWidth={r * 0.07}
            strokeLinecap="round"
          />
        );
      })}
      <circle cx={cx} cy={cy} r={hub} fill="#2c3138" stroke="#c5c9d0" strokeWidth="1.1" />
    </g>
  );
}

function EmblemLight({
  color,
  selected,
  on,
  onClick,
  car,
}: {
  color: string;
  selected: boolean;
  on: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const pos = car === "q70" ? { cx: 304, cy: 252 } : car === "q60" ? { cx: 296, cy: 268 } : { cx: 296, cy: 258 };
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <ellipse cx={pos.cx} cy={pos.cy} rx="34" ry="40" fill="transparent" />
      <ellipse
        cx={pos.cx}
        cy={pos.cy}
        rx="20"
        ry="26"
        fill={color}
        filter={on ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "url(#chrome)"}
        strokeWidth={selected ? 2.4 : 1.8}
      />
      <path
        d={`M ${pos.cx - 8} ${pos.cy + 10} C ${pos.cx - 7} ${pos.cy - 4}, ${pos.cx - 1} ${pos.cy - 16}, ${pos.cx} ${pos.cy - 18}
            M ${pos.cx + 8} ${pos.cy + 10} C ${pos.cx + 7} ${pos.cy - 4}, ${pos.cx + 1} ${pos.cy - 16}, ${pos.cx} ${pos.cy - 18}`}
        fill="none"
        stroke="#0b0c0e"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </g>
  );
}

function GrilleLight({
  color,
  selected,
  on,
  onClick,
  car,
}: {
  color: string;
  selected: boolean;
  on: boolean;
  onClick: () => void;
  car: CarId;
}) {
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <path d={GRILLE[car]} fill={color} opacity={on ? 0.55 : 0.18} filter={on ? "url(#glow)" : undefined} />
      <path
        d={GRILLE[car]}
        fill="transparent"
        stroke={selected ? "#fff" : "rgba(255,255,255,0.18)"}
        strokeWidth={selected ? 2.4 : 1}
      />
    </g>
  );
}

function BumperLights({
  color,
  selected,
  on,
  onClick,
  car,
}: {
  color: string;
  selected: boolean;
  on: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const y = car === "q70" ? 358 : car === "q60" ? 368 : 360;
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <rect x="88" y={y - 28} width="430" height="70" fill="transparent" />
      <rect
        x="196"
        y={y}
        width="196"
        height="12"
        rx="3"
        fill={color}
        filter={on ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "transparent"}
        strokeWidth="2"
      />
      <ellipse
        cx="124"
        cy={y + 4}
        rx="22"
        ry="10"
        fill={color}
        filter={on ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.2)"}
        strokeWidth={selected ? 2 : 1}
      />
      <ellipse
        cx="466"
        cy={y + 10}
        rx="24"
        ry="11"
        fill={color}
        filter={on ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.2)"}
        strokeWidth={selected ? 2 : 1}
      />
    </g>
  );
}

function MirrorLights({
  color,
  selected,
  on,
  onClick,
  car,
}: {
  color: string;
  selected: boolean;
  on: boolean;
  onClick: () => void;
  car: CarId;
}) {
  const near =
    car === "q60" ? { cx: 652, cy: 172, rot: -8 } : car === "q70" ? { cx: 622, cy: 170, rot: -8 } : { cx: 638, cy: 168, rot: -8 };
  const far =
    car === "q60" ? { cx: 268, cy: 148, rot: -26 } : car === "q70" ? { cx: 258, cy: 158, rot: -22 } : { cx: 262, cy: 152, rot: -24 };
  return (
    <g
      className="cursor-pointer"
      onClick={(event) => {
        event.stopPropagation();
        onClick();
      }}
    >
      <MirrorHousing cx={far.cx} cy={far.cy} rot={far.rot} color={color} selected={selected} on={on} />
      <MirrorHousing cx={near.cx} cy={near.cy} rot={near.rot} color={color} selected={selected} on={on} />
    </g>
  );
}

function MirrorHousing({
  cx,
  cy,
  rot,
  color,
  selected,
  on,
}: {
  cx: number;
  cy: number;
  rot: number;
  color: string;
  selected: boolean;
  on: boolean;
}) {
  return (
    <g transform={`translate(${cx} ${cy}) rotate(${rot})`}>
      <ellipse rx="28" ry="16" fill="transparent" />
      <path d="M -22 -6 C -8 -16 18 -14 26 -2 C 18 8 -6 12 -22 4 C -28 0 -28 -2 -22 -6 Z" fill="url(#graphite)" />
      <ellipse cx="4" cy="-2" rx="12" ry="7" fill="#1c2834" stroke="#8a96a4" strokeWidth="0.8" />
      <ellipse
        cx="-6"
        cy="10"
        rx="16"
        ry="5"
        fill={color}
        filter={on ? "url(#glow)" : undefined}
        stroke={selected ? "#fff" : "rgba(255,255,255,0.25)"}
        strokeWidth={selected ? 2 : 1}
      />
    </g>
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
