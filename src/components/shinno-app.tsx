"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bluetooth, Loader2, Power, ScanLine, Trash2, Unplug, Car } from "lucide-react";
import { ModeGlyph, PlayingBar } from "@/components/effect-preview";
import { ColorWheel } from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { VehicleStage } from "@/components/vehicle-stage";
import { CARS, ZONES, type ZoneKind } from "@/lib/catalog";
import { useGarage } from "@/lib/garage-context";
import { EFFECTS, EFFECT_GROUPS } from "@/lib/protocol";
import { rgbToCss, rgbToHex, SCENES } from "@/lib/scenes";
import { cn } from "@/lib/utils";

const SWATCHES = [
  { r: 196, g: 18, b: 32 },
  { r: 255, g: 252, b: 245 },
  { r: 40, g: 210, b: 255 },
  { r: 255, g: 150, b: 30 },
  { r: 150, g: 40, b: 255 },
  { r: 80, g: 255, b: 90 },
  { r: 255, g: 80, b: 160 },
  { r: 20, g: 80, b: 255 },
];

export function ShinnoApp() {
  const garage = useGarage();
  const live = garage.selected[0];
  const color = live?.color ?? { r: 196, g: 18, b: 32 };
  const brightness = live?.brightness ?? 80;
  const power = garage.selected.length ? garage.selected.every((c) => c.power) : false;
  const zoneLabel =
    garage.target === "all" ? "All lights" : ZONES.find((z) => z.id === garage.target)?.label;

  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <header className="border-b border-white/10 bg-black">
        <div className="mx-auto flex max-w-lg items-center justify-between gap-3 px-4 py-3">
          <Image
            src="/shinno-logo-header.png"
            alt="Shinno Performance"
            width={507}
            height={96}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-white/80">
            <Car className="size-3.5 text-white/50" />
            <select
              className="bg-transparent text-sm outline-none"
              value={garage.car}
              onChange={(event) => garage.setCar(event.target.value as typeof garage.car)}
              aria-label="Car"
            >
              {CARS.map((car) => (
                <option key={car.id} value={car.id} className="bg-neutral-900">
                  {car.name}
                </option>
              ))}
            </select>
          </label>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-4 pb-8 pt-4">
        <VehicleStage
          car={garage.car}
          controllers={garage.controllers}
          target={garage.target}
          onSelect={(zone) => {
            garage.setTarget(zone);
            garage.setTab("color");
          }}
        />

        {garage.controllers.length === 0 ? (
          <div className="mt-2 flex items-center justify-center gap-2 text-sm">
            <Button size="sm" onClick={() => void garage.loadDemo()}>
              Demo lights
            </Button>
            <Button size="sm" variant="outline" onClick={() => garage.setTab("scan")}>
              Scan
            </Button>
          </div>
        ) : null}

        <div className="mt-3 flex gap-1 rounded-full border border-white/10 bg-white/5 p-1">
          {(
            [
              { id: "color" as const, label: "Color" },
              { id: "effects" as const, label: "Modes" },
              { id: "scan" as const, label: "Scan" },
              { id: "devices" as const, label: "Devices" },
            ]
          ).map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => garage.setTab(item.id)}
              className={cn(
                "flex-1 rounded-full py-1.5 text-sm",
                garage.tab === item.id ? "bg-white text-black" : "text-white/50",
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        {garage.tab === "color" ? (
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-white/50">{zoneLabel}</p>
                <p className="text-lg tabular-nums">{rgbToHex(color)}</p>
              </div>
              <button
                type="button"
                disabled={!garage.selected.length}
                onClick={() => void garage.setPower(!power)}
                className={cn(
                  "flex size-11 items-center justify-center rounded-full border",
                  power
                    ? "border-red-500/40 bg-red-600 text-white shadow-[0_0_18px_rgba(225,6,0,0.45)]"
                    : "border-white/15 bg-white/5 text-white/60",
                )}
                aria-label={power ? "Turn off" : "Turn on"}
              >
                <Power className="size-4" />
              </button>
            </div>
            <ColorWheel
              color={color}
              onChange={(next) => void garage.setColor(next)}
              disabled={!garage.selected.length}
            />
            <div>
              <div className="mb-1 flex justify-between text-sm text-white/55">
                <span>Brightness</span>
                <span className="tabular-nums">{brightness}%</span>
              </div>
              <Slider
                min={1}
                max={100}
                value={[brightness]}
                disabled={!garage.selected.length}
                onValueChange={(value) => {
                  const next = Array.isArray(value) ? value[0] : value;
                  if (typeof next === "number") void garage.setBrightness(next);
                }}
              />
            </div>
            <div className="flex flex-wrap gap-2">
              {SWATCHES.map((swatch) => (
                <button
                  key={rgbToHex(swatch)}
                  type="button"
                  disabled={!garage.selected.length}
                  onClick={() => void garage.setColor(swatch)}
                  className="size-7 rounded-full border border-white/15"
                  style={{ background: rgbToCss(swatch) }}
                  aria-label={rgbToHex(swatch)}
                />
              ))}
            </div>
            <div className="flex gap-1.5 overflow-x-auto">
              {SCENES.map((scene) => (
                <button
                  key={scene.id}
                  type="button"
                  disabled={!garage.controllers.length}
                  onClick={() => void garage.applyScene(scene)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-sm text-white/80"
                >
                  {scene.name}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {garage.tab === "effects" ? <EffectsPanel /> : null}
        {garage.tab === "scan" ? <ScanPanel /> : null}
        {garage.tab === "devices" ? <DeviceList /> : null}

        {garage.lastError ? (
          <p className="mt-3 text-sm text-red-300">{garage.lastError}</p>
        ) : null}
      </main>
    </div>
  );
}

function EffectsPanel() {
  const garage = useGarage();
  const active = garage.selected[0]?.effectId;
  const speed = garage.selected[0]?.effectSpeed ?? 50;
  const [group, setGroup] = useState<(typeof EFFECT_GROUPS)[number]["id"]>("basic");
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return EFFECTS.filter((effect) => effect.name.toLowerCase().includes(q));
    return EFFECTS.filter((effect) => effect.group === group);
  }, [group, query]);

  return (
    <div className="mt-4 space-y-3">
      <PlayingBar
        effectId={active}
        speed={speed}
        power={garage.selected.length ? garage.selected.every((c) => c.power) : false}
      />
      <div>
        <div className="mb-1 flex justify-between text-sm text-white/55">
          <span>Speed</span>
          <span className="tabular-nums">{speed}</span>
        </div>
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-white/35">
          <span>0 fast</span>
          <span>100 slow</span>
        </div>
        <Slider
          min={0}
          max={100}
          value={[speed]}
          disabled={!garage.selected.length}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next === "number") void garage.setEffectSpeed(next);
          }}
        />
      </div>
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search Auto Play, curtain, water…"
        aria-label="Search modes"
      />
      <div className="flex gap-1 overflow-x-auto pb-0.5">
        {EFFECT_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setGroup(item.id);
              setQuery("");
            }}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs",
              !query && group === item.id ? "bg-white text-black" : "bg-white/10 text-white/70",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">No modes match.</p>
      ) : (
        <div className="grid max-h-[46vh] grid-cols-3 gap-2 overflow-y-auto pr-0.5">
          {items.map((effect) => (
            <button
              key={effect.id}
              type="button"
              disabled={!garage.selected.length}
              onClick={() => void garage.setEffect(effect.id)}
              className={cn(
                "flex flex-col rounded-xl border bg-black/35 p-1.5 text-center",
                active === effect.id
                  ? "border-red-500/70 shadow-[0_0_18px_rgba(225,6,0,0.25)]"
                  : "border-white/10",
              )}
            >
              <div className="aspect-square w-full">
                <ModeGlyph effect={effect} speed={speed} />
              </div>
              <span className="mt-1 line-clamp-2 min-h-8 text-[10px] leading-tight text-white/75">
                {effect.name}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ScanPanel() {
  const garage = useGarage();
  return (
    <div className="mt-4 space-y-3">
      <div className="grid grid-cols-2 gap-2">
        <Button onClick={() => void garage.scan("simulator")} disabled={garage.scanning}>
          {garage.scanning ? <Loader2 className="animate-spin" /> : <ScanLine />}
          Demo scan
        </Button>
        <Button
          variant="outline"
          disabled={!garage.webBluetooth || garage.scanning}
          onClick={() => void garage.scan("web-bluetooth")}
        >
          <Bluetooth />
          Pair
        </Button>
      </div>
      {!garage.webBluetooth ? (
        <p className="text-sm text-white/45">
          Live Bluetooth needs the iPhone app. Chrome can pair a box from this page.
        </p>
      ) : (
        <p className="text-sm text-white/45">Looks for ELK / MELK boxes nearby.</p>
      )}
      {garage.scanError ? <p className="text-sm text-red-300">{garage.scanError}</p> : null}
      {garage.discoveries.length === 0 && !garage.scanning ? (
        <p className="py-8 text-center text-sm text-white/40">Nothing yet.</p>
      ) : (
        <ul className="space-y-1.5">
          {garage.discoveries.map((device) => {
            const paired = garage.controllers.some((c) => c.id === device.id);
            return (
              <li
                key={device.id}
                className="flex items-center justify-between rounded-md border border-white/10 px-3 py-2"
              >
                <div>
                  <p className="text-sm">{device.name}</p>
                  <p className="text-xs text-white/40">
                    {device.transport === "simulator" ? "Demo" : "Bluetooth"}
                  </p>
                </div>
                <Button size="sm" disabled={paired} onClick={() => void garage.pair(device)}>
                  {paired ? "Added" : "Add"}
                </Button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function DeviceList() {
  const garage = useGarage();
  if (!garage.controllers.length) {
    return <p className="mt-8 text-center text-sm text-white/40">No devices. Scan or load demo lights.</p>;
  }
  return (
    <div className="mt-4 space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={garage.resetGarage}>
          <Trash2 className="size-3.5" />
          Clear
        </Button>
      </div>
      {garage.controllers.map((controller) => (
        <div key={controller.id} className="rounded-md border border-white/10 p-3">
          <div className="flex items-center justify-between gap-2">
            <Input
              value={controller.customName}
              onChange={(event) => garage.rename(controller.id, event.target.value)}
            />
            <Button size="sm" variant="ghost" onClick={() => void garage.forget(controller.id)}>
              <Unplug className="size-3.5" />
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <select
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
              value={controller.zone}
              onChange={(event) => garage.setZone(controller.id, event.target.value as ZoneKind)}
            >
              {ZONES.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-neutral-900">
                  {zone.label}
                </option>
              ))}
            </select>
            <span className="text-xs text-white/40">{controller.connection}</span>
          </div>
          <p className="mt-1 text-xs text-white/35">{controller.advertisedName}</p>
        </div>
      ))}
    </div>
  );
}
