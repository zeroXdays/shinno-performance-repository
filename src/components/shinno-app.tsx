"use client";

import { useMemo, useState } from "react";
import {
  Bluetooth,
  CarFront,
  Loader2,
  Palette,
  Power,
  ScanLine,
  Sparkles,
  Trash2,
  Unplug,
} from "lucide-react";
import { ColorWheel } from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { VehicleStage } from "@/components/vehicle-stage";
import { SHINNO_PRODUCTS, ZONE_HINTS, type ZoneKind } from "@/lib/catalog";
import { useGarage } from "@/lib/garage-context";
import { EFFECTS, EFFECT_GROUPS } from "@/lib/protocol";
import { rgbToCss, rgbToHex, SCENES } from "@/lib/scenes";
import { cn } from "@/lib/utils";

const PRESETS: { name: string; color: { r: number; g: number; b: number } }[] = [
  { name: "Infiniti red", color: { r: 196, g: 18, b: 32 } },
  { name: "OEM white", color: { r: 255, g: 252, b: 245 } },
  { name: "Ice", color: { r: 40, g: 210, b: 255 } },
  { name: "Amber", color: { r: 255, g: 150, b: 30 } },
  { name: "Violet", color: { r: 150, g: 40, b: 255 } },
  { name: "Lime", color: { r: 80, g: 255, b: 90 } },
];

export function ShinnoApp() {
  const garage = useGarage();
  const live = garage.selected[0];
  const color = live?.color ?? { r: 196, g: 18, b: 32 };
  const brightness = live?.brightness ?? 80;
  const power = garage.selected.length ? garage.selected.every((c) => c.power) : false;
  const mixed = garage.selected.length > 1 && new Set(garage.selected.map((c) => rgbToHex(c.color))).size > 1;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <Header />
      <main className="mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 pb-28 pt-4 lg:grid lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:pb-10">
        <section className="space-y-5">
          <VehicleStage
            controllers={garage.controllers}
            target={garage.target}
            onSelect={garage.setTarget}
          />
          {garage.controllers.length === 0 && !garage.busy ? (
            <EmptyGarage onDemo={garage.loadDemo} onScan={() => garage.setTab("scan")} />
          ) : null}
          {garage.busy && garage.controllers.length === 0 ? (
            <div className="flex items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/5 py-10 text-sm text-white/60">
              <Loader2 className="size-4 animate-spin" />
              Pairing demo garage…
            </div>
          ) : null}
          <SceneRail />
        </section>
        <section className="space-y-4">
          <DesktopNav />
          {garage.tab === "garage" || garage.tab === "color" ? (
            <ColorPanel color={color} brightness={brightness} power={power} mixed={mixed} />
          ) : null}
          {garage.tab === "effects" ? <EffectsPanel /> : null}
          {garage.tab === "scan" ? <ScanPanel /> : null}
          {garage.tab === "garage" ? <GarageList /> : null}
          {garage.lastError ? (
            <p className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm text-red-200">
              {garage.lastError}
            </p>
          ) : null}
        </section>
      </main>
      <MobileNav />
    </div>
  );
}

function Header() {
  const garage = useGarage();
  const connected = garage.controllers.filter((c) => c.connection === "connected").length;
  return (
    <header className="border-b border-white/10 bg-black/40 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <div>
          <p className="font-[family-name:var(--font-display)] text-xl tracking-[0.28em] text-white">
            SHINNO
          </p>
          <p className="text-[11px] uppercase tracking-[0.22em] text-white/45">
            Lights · Q50 / Q60
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs text-white/55">
          <span className="hidden sm:inline">
            {connected}/{garage.controllers.length} linked
          </span>
          <a
            href="https://shinnoperformance.com"
            className="rounded-full border border-white/15 px-3 py-1 text-white/70 hover:bg-white/10"
          >
            Shop
          </a>
        </div>
      </div>
    </header>
  );
}

function SceneRail() {
  const garage = useGarage();
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium tracking-wide text-white/80">Vehicle scenes</h2>
        <span className="text-[11px] uppercase tracking-widest text-white/35">
          {garage.target === "all" ? "writes every zone" : "active zone only"}
        </span>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {SCENES.map((scene) => (
          <button
            key={scene.id}
            type="button"
            onClick={() => void garage.applyScene(scene)}
            disabled={!garage.controllers.length || garage.busy}
            className="min-w-[7.5rem] rounded-2xl border border-white/10 bg-white/5 px-3 py-3 text-left transition hover:bg-white/10 disabled:opacity-50"
          >
            <span
              className="mb-2 block h-1.5 w-10 rounded-full"
              style={{ background: rgbToCss(scene.color) }}
            />
            <span className="block text-sm text-white">{scene.name}</span>
            <span className="mt-1 block text-[11px] leading-snug text-white/45">{scene.blurb}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ColorPanel({
  color,
  brightness,
  power,
  mixed,
}: {
  color: { r: number; g: number; b: number };
  brightness: number;
  power: boolean;
  mixed: boolean;
}) {
  const garage = useGarage();
  const disabled = garage.controllers.length === 0;

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-[0_20px_80px_rgba(0,0,0,0.35)]">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm text-white/55">
            {garage.target === "all" ? "All controllers" : garage.selected[0]?.customName}
          </p>
          <p className="font-[family-name:var(--font-display)] text-2xl tracking-wide">
            {mixed ? "Mixed colors" : rgbToHex(color)}
          </p>
        </div>
        <Button
          size="lg"
          variant={power ? "default" : "outline"}
          className={cn(
            "h-12 rounded-full px-5",
            power && "bg-[var(--shinno-red)] text-white hover:bg-[var(--shinno-red)]/90",
          )}
          disabled={disabled}
          onClick={() => void garage.setPower(!power)}
        >
          <Power className="size-4" />
          {power ? "On" : "Off"}
        </Button>
      </div>
      <ColorWheel
        color={color}
        onChange={(next) => {
          void garage.setColor(next);
        }}
        disabled={disabled}
      />
      <div className="mt-6 space-y-3">
        <div className="flex items-center justify-between text-sm">
          <span className="text-white/60">Brightness</span>
          <span className="tabular-nums text-white">{brightness}%</span>
        </div>
        <Slider
          min={1}
          max={100}
          value={[brightness]}
          disabled={disabled}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") void garage.setBrightness(next);
          }}
        />
      </div>
      <div className="mt-5 flex flex-wrap gap-2">
        {PRESETS.map((preset) => (
          <button
            key={preset.name}
            type="button"
            disabled={disabled}
            onClick={() => void garage.setColor(preset.color)}
            className="flex items-center gap-2 rounded-full border border-white/10 bg-black/30 px-3 py-1.5 text-xs text-white/80 hover:bg-white/10 disabled:opacity-40"
          >
            <span
              className="size-3 rounded-full"
              style={{ background: rgbToCss(preset.color) }}
            />
            {preset.name}
          </button>
        ))}
      </div>
    </div>
  );
}

function EffectsPanel() {
  const garage = useGarage();
  const active = garage.selected[0]?.effectId;
  const speed = garage.selected[0]?.effectSpeed ?? 50;
  const disabled = garage.controllers.length === 0;
  const [group, setGroup] = useState<(typeof EFFECT_GROUPS)[number]["id"]>("breathe");
  const items = useMemo(() => EFFECTS.filter((e) => e.group === group), [group]);

  return (
    <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <h2 className="mb-1 text-lg text-white">Effects</h2>
      <p className="mb-4 text-sm text-white/50">
        Built-in controller patterns. Speed is sent to every selected zone so they stay in step.
      </p>
      <div className="mb-4 flex gap-2">
        {EFFECT_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setGroup(item.id)}
            className={cn(
              "rounded-full px-3 py-1 text-xs",
              group === item.id ? "bg-white text-black" : "bg-white/10 text-white/70",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {items.map((effect) => (
          <button
            key={effect.id}
            type="button"
            disabled={disabled}
            onClick={() => void garage.setEffect(effect.id)}
            className={cn(
              "rounded-2xl border px-3 py-3 text-left text-sm transition",
              active === effect.id
                ? "border-[var(--shinno-red)] bg-[var(--shinno-red)]/15 text-white"
                : "border-white/10 bg-black/20 text-white/80 hover:bg-white/10",
            )}
          >
            {effect.name}
          </button>
        ))}
      </div>
      <div className="mt-5 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-white/60">Speed</span>
          <span className="tabular-nums">{speed}</span>
        </div>
        <Slider
          min={0}
          max={100}
          value={[speed]}
          disabled={disabled}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") void garage.setEffectSpeed(next);
          }}
        />
      </div>
    </div>
  );
}

function ScanPanel() {
  const garage = useGarage();
  return (
    <div className="space-y-4 rounded-3xl border border-white/10 bg-white/[0.04] p-5">
      <div>
        <h2 className="text-lg text-white">Find controllers</h2>
        <p className="mt-1 text-sm text-white/50">
          Shinno RGB kits use the same ELK / MELK Bluetooth boxes as Lotus Lantern and Magic
          Lantern. This app names them as car zones instead of serial numbers.
        </p>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="lg"
          className="h-11 bg-[var(--shinno-red)] text-white hover:bg-[var(--shinno-red)]/90"
          onClick={() => void garage.scan("simulator")}
          disabled={garage.scanning}
        >
          {garage.scanning ? <Loader2 className="animate-spin" /> : <ScanLine />}
          Demo scan
        </Button>
        <Button
          size="lg"
          variant="outline"
          className="h-11"
          disabled={!garage.webBluetooth || garage.scanning}
          onClick={() => void garage.scan("web-bluetooth")}
        >
          <Bluetooth />
          Pair real box
        </Button>
      </div>
      {!garage.webBluetooth ? (
        <p className="rounded-xl border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
          Safari on iPhone cannot talk to these boxes from a website. Use the native Shinno Lights
          Xcode project in <code className="text-white">ios/ShinnoLights</code> for live Bluetooth.
          Chrome on macOS or Android can pair here.
        </p>
      ) : (
        <p className="text-sm text-white/45">
          Chrome will prompt for a nearby ELK-BLEDOM / MELK / LEDBLE device.
        </p>
      )}
      {garage.scanError ? (
        <p className="text-sm text-red-300">{garage.scanError}</p>
      ) : null}
      {garage.scanning ? (
        <div className="flex items-center gap-2 text-sm text-white/60">
          <Loader2 className="size-4 animate-spin" />
          Listening for ELK / MELK advertisements…
        </div>
      ) : null}
      {garage.discoveries.length === 0 && !garage.scanning ? (
        <p className="rounded-2xl border border-dashed border-white/15 px-4 py-8 text-center text-sm text-white/45">
          No boxes yet. Run a demo scan, or pair a real controller from Chrome.
        </p>
      ) : (
        <ul className="space-y-2">
          {garage.discoveries.map((device) => {
            const paired = garage.controllers.some((c) => c.id === device.id);
            return (
              <li
                key={device.id}
                className="flex items-center justify-between rounded-2xl border border-white/10 bg-black/30 px-3 py-3"
              >
                <div>
                  <p className="text-sm text-white">{device.name}</p>
                  <p className="text-xs text-white/45">
                    {device.transport === "simulator" ? "Simulator" : "Bluetooth"}
                    {device.rssi ? ` · ${device.rssi} dBm` : ""}
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={paired}
                  onClick={() => void garage.pair(device)}
                >
                  {paired ? "Paired" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function GarageList() {
  const garage = useGarage();
  if (!garage.controllers.length) return null;
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-white/80">Garage</h2>
        <Button size="sm" variant="ghost" onClick={garage.resetGarage}>
          <Trash2 className="size-3.5" />
          Reset
        </Button>
      </div>
      {garage.controllers.map((controller) => (
        <article
          key={controller.id}
          className="rounded-2xl border border-white/10 bg-black/25 p-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm text-white">{controller.customName}</p>
              <p className="text-xs text-white/40">
                {controller.advertisedName} · {controller.modelId}
              </p>
            </div>
            <span
              className={cn(
                "rounded-full px-2 py-0.5 text-[11px] uppercase tracking-wide",
                controller.connection === "connected"
                  ? "bg-emerald-500/15 text-emerald-300"
                  : controller.connection === "error"
                    ? "bg-red-500/15 text-red-300"
                    : "bg-white/10 text-white/50",
              )}
            >
              {controller.connection}
            </span>
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor={`name-${controller.id}`}>Name</Label>
              <Input
                id={`name-${controller.id}`}
                value={controller.customName}
                onChange={(event) => garage.rename(controller.id, event.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor={`zone-${controller.id}`}>Zone</Label>
              <select
                id={`zone-${controller.id}`}
                className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
                value={controller.zone}
                onChange={(event) => garage.setZone(controller.id, event.target.value as ZoneKind)}
              >
                {SHINNO_PRODUCTS.map((product) => (
                  <option key={product.id} value={product.id}>
                    {product.shortName}
                  </option>
                ))}
                <option value="custom">Custom</option>
              </select>
            </div>
          </div>
          <p className="mt-2 text-xs text-white/40">{ZONE_HINTS[controller.zone]}</p>
          {controller.error ? (
            <p className="mt-2 text-xs text-red-300">{controller.error}</p>
          ) : null}
          <div className="mt-3 flex justify-end">
            <Button size="sm" variant="ghost" onClick={() => void garage.forget(controller.id)}>
              <Unplug className="size-3.5" />
              Forget
            </Button>
          </div>
        </article>
      ))}
      <ProductStrip />
    </div>
  );
}

function ProductStrip() {
  return (
    <div className="rounded-2xl border border-white/10 p-4">
      <p className="mb-3 text-xs uppercase tracking-[0.2em] text-white/40">Fits this app</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {SHINNO_PRODUCTS.map((product) => (
          <a
            key={product.id}
            href={product.href}
            className="rounded-xl border border-white/10 bg-white/5 px-3 py-3 hover:bg-white/10"
          >
            <p className="text-sm text-white">{product.name}</p>
            <p className="text-xs text-white/45">
              {product.fitment} · {product.price}
            </p>
          </a>
        ))}
      </div>
    </div>
  );
}

function EmptyGarage({ onDemo, onScan }: { onDemo: () => void; onScan: () => void }) {
  return (
    <div className="rounded-3xl border border-dashed border-white/15 px-5 py-10 text-center">
      <CarFront className="mx-auto mb-3 size-8 text-white/40" />
      <h2 className="text-lg text-white">No controllers in the garage</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-white/50">
        Pair the ELK boxes that shipped with your emblem, mirrors, bumper, and grille badge. Lotus
        Lantern sees serials. Shinno Lights treats them as one car.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={onDemo} className="bg-[var(--shinno-red)] text-white hover:bg-[var(--shinno-red)]/90">
          Load demo Q50
        </Button>
        <Button variant="outline" onClick={onScan}>
          Scan
        </Button>
      </div>
    </div>
  );
}

function DesktopNav() {
  const garage = useGarage();
  const items = [
    { id: "garage" as const, label: "Garage" },
    { id: "color" as const, label: "Color" },
    { id: "effects" as const, label: "Effects" },
    { id: "scan" as const, label: "Scan" },
  ];
  return (
    <div className="hidden gap-1 rounded-full border border-white/10 bg-white/5 p-1 lg:flex">
      {items.map((item) => (
        <button
          key={item.id}
          type="button"
          onClick={() => garage.setTab(item.id)}
          className={cn(
            "flex-1 rounded-full px-3 py-1.5 text-sm",
            garage.tab === item.id ? "bg-white text-black" : "text-white/60 hover:text-white",
          )}
        >
          {item.label}
        </button>
      ))}
    </div>
  );
}

function MobileNav() {
  const garage = useGarage();
  const items = [
    { id: "garage" as const, label: "Garage", icon: CarFront },
    { id: "color" as const, label: "Color", icon: Palette },
    { id: "effects" as const, label: "Effects", icon: Sparkles },
    { id: "scan" as const, label: "Scan", icon: ScanLine },
  ];
  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/80 p-2 backdrop-blur-xl lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-4 gap-1">
        {items.map((item) => {
          const Icon = item.icon;
          const active = garage.tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => garage.setTab(item.id)}
              className={cn(
                "flex flex-col items-center gap-1 rounded-xl py-2 text-[11px]",
                active ? "text-white" : "text-white/45",
              )}
            >
              <Icon className="size-4" />
              {item.label}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
