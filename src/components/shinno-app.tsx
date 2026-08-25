"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Bluetooth, Loader2, Power, Trash2, Unplug, Car, Plug, Palette, Sparkles, Cpu } from "lucide-react";
import { ModeGlyph, PlayingBar } from "@/components/effect-preview";
import { ColorWheel, HEX_CLIP } from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { VehicleStage } from "@/components/vehicle-stage";
import { SettingsMenu } from "@/components/settings-menu";
import { ASSIGNABLE_ZONES, CARS, type ZoneKind } from "@/lib/catalog";
import { useGarage } from "@/lib/garage-context";
import { useI18n } from "@/lib/i18n";
import { EFFECTS, EFFECT_GROUPS, type Rgb } from "@/lib/protocol";
import { rgbToCss, rgbToHex, SCENES } from "@/lib/scenes";
import { cn } from "@/lib/utils";
import type { TabId } from "@/lib/controller";

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

function sameRgb(a: Rgb, b: Rgb) {
  return a.r === b.r && a.g === b.g && a.b === b.b;
}

const TABS: { id: TabId; icon: typeof Palette }[] = [
  { id: "color", icon: Palette },
  { id: "effects", icon: Sparkles },
  { id: "scan", icon: Bluetooth },
  { id: "devices", icon: Cpu },
];

export function ShinnoApp() {
  const garage = useGarage();
  const { t } = useI18n();
  const live = garage.selected[0];
  const color = live?.color ?? { r: 196, g: 18, b: 32 };
  const brightness = live?.brightness ?? 80;
  const power = garage.selected.length ? garage.selected.every((c) => c.power) : false;
  const zoneLabel =
    garage.target === "all" ? t("stage.all") : t(`zone.${garage.target}`);

  const openTab = (id: TabId) => {
    garage.setTab(id);
    if (id !== "scan") return;
    if (garage.controllers.length === 0 && garage.webBluetooth) void garage.scan();
    else void garage.refreshNearby();
  };

  return (
    <div className="flex min-h-dvh flex-col text-foreground">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-black/45 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 py-3">
          <Image
            src="/shinno-logo-header.png"
            alt="Shinno Performance"
            width={507}
            height={96}
            className="h-8 w-auto sm:h-9"
            priority
          />
          <div className="flex items-center gap-1.5">
            <label className="flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-sm text-white/80">
              <Car className="size-3.5 text-white/50" />
              <select
                className="bg-transparent text-sm outline-none"
                value={garage.car}
                onChange={(event) => garage.setCar(event.target.value as typeof garage.car)}
                aria-label={t("car.label")}
              >
                {CARS.map((car) => (
                  <option
                    key={car.id}
                    value={car.id}
                    disabled={!car.enabled}
                    className="bg-neutral-900"
                  >
                    {car.enabled ? car.name : `${car.name} — ${t("car.soon")}`}
                  </option>
                ))}
              </select>
            </label>
            <SettingsMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[5.75rem] pt-4">
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
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/30 px-4 py-4 text-center">
            <p className="text-sm text-white/55">{t("devices.empty")}</p>
            <Button className="mt-3 min-h-12 w-full" onClick={() => void garage.scan()}>
              {t("home.scanCta")}
            </Button>
          </div>
        ) : null}

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-3xl border border-white/10 bg-white/[0.05] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)]">
          {garage.tab === "color" ? (
            <div className="space-y-5">
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">{zoneLabel}</p>
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
                aria-label={power ? t("power.off") : t("power.on")}
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
                <span>{t("color.brightness")}</span>
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
            <div className="grid grid-cols-8 gap-1.5 px-0.5">
              {SWATCHES.map((swatch) => {
                const active = sameRgb(swatch, color);
                return (
                  <button
                    key={rgbToHex(swatch)}
                    type="button"
                    disabled={!garage.selected.length}
                    onClick={() => void garage.setColor(swatch)}
                    className="relative aspect-square w-full disabled:opacity-40"
                    aria-label={rgbToHex(swatch)}
                    aria-pressed={active}
                  >
                    <span className="block w-full pt-[100%]" aria-hidden />
                    {active ? (
                      <span
                        className="absolute inset-0 bg-white"
                        style={{ clipPath: HEX_CLIP }}
                        aria-hidden
                      />
                    ) : null}
                    <span
                      className={cn("absolute", active ? "inset-[2px]" : "inset-0")}
                      style={{
                        clipPath: HEX_CLIP,
                        background: rgbToCss(swatch),
                        boxShadow: active ? `0 0 12px ${rgbToCss(swatch, 0.9)}` : undefined,
                      }}
                    />
                  </button>
                );
              })}
            </div>
            <div className="grid grid-cols-3 gap-1.5">
              {SCENES.map((scene) => {
                const active =
                  sameRgb(scene.color, color) &&
                  brightness === scene.brightness &&
                  power === scene.power;
                return (
                  <button
                    key={scene.id}
                    type="button"
                    disabled={!garage.controllers.length}
                    onClick={() => void garage.applyScene(scene)}
                    className={cn(
                      "flex items-center gap-2 rounded-xl border bg-black/25 px-2.5 py-2 text-left disabled:opacity-40",
                      active
                        ? "border-red-500/70 shadow-[0_0_14px_rgba(225,6,0,0.22)]"
                        : "border-white/10",
                    )}
                  >
                    <span className="relative size-5 shrink-0">
                      <span
                        className="absolute inset-0 bg-white/25"
                        style={{ clipPath: HEX_CLIP }}
                        aria-hidden
                      />
                      <span
                        className="absolute inset-[1.5px]"
                        style={{
                          clipPath: HEX_CLIP,
                          background:
                            scene.color.r + scene.color.g + scene.color.b === 0
                              ? "rgb(28, 28, 32)"
                              : rgbToCss(scene.color),
                        }}
                      />
                    </span>
                    <span className="text-xs text-white/80">{scene.name}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}

        {garage.tab === "effects" ? <EffectsPanel /> : null}
        {garage.tab === "scan" ? <ScanPanel /> : null}
        {garage.tab === "devices" ? <DeviceList /> : null}

        {garage.lastError ? (
          <p className="mt-3 text-sm text-red-300">{garage.lastError}</p>
        ) : null}
        </div>
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-white/10 bg-black/55 backdrop-blur-md">
        <div className="mx-auto flex w-full max-w-lg px-2 pt-1.5 pb-[max(0.45rem,env(safe-area-inset-bottom))]">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = garage.tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openTab(item.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px]",
                  active ? "text-white" : "text-white/40",
                )}
              >
                <Icon className={cn("size-5", active && "text-[#e10600]")} />
                {t(`tab.${item.id}`)}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function EffectsPanel() {
  const garage = useGarage();
  const { t } = useI18n();
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
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      <PlayingBar
        effectId={active}
        speed={speed}
        power={garage.selected.length ? garage.selected.every((c) => c.power) : false}
      />
      <div>
        <div className="mb-1 flex justify-between text-sm text-white/55">
          <span>{t("effects.speed")}</span>
          <span className="tabular-nums">{speed}</span>
        </div>
        <div className="mb-1 flex justify-between text-[10px] uppercase tracking-wide text-white/35">
          <span>{t("effects.slow")}</span>
          <span>{t("effects.fast")}</span>
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
        placeholder={t("effects.search")}
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
        <p className="py-8 text-center text-sm text-white/40">{t("effects.none")}</p>
      ) : (
        <div className="grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto pr-0.5">
          {items.map((effect) => (
            <button
              key={effect.id}
              type="button"
              disabled={!garage.selected.length}
              onClick={() => void garage.setEffect(effect.id)}
              className={cn(
                "flex flex-col rounded-xl border bg-black/20 p-1.5 text-center",
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
  const { t } = useI18n();
  return (
    <div className="space-y-4">
      <Button
        className="min-h-12 w-full"
        onClick={() => void garage.scan()}
        disabled={garage.scanning || !garage.webBluetooth}
      >
        {garage.scanning ? <Loader2 className="animate-spin" /> : <Bluetooth />}
        {t("scan.pair")}
      </Button>
      {!garage.webBluetooth ? (
        <p className="text-sm text-white/45">{t("scan.ble.none")}</p>
      ) : (
        <p className="text-sm text-white/45">{t("scan.ble.web")}</p>
      )}
      {garage.scanError ? <p className="text-sm text-red-300">{garage.scanError}</p> : null}
      {garage.discoveries.length === 0 && !garage.scanning ? (
        <p className="py-10 text-center text-sm text-white/40">{t("scan.empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {garage.discoveries.map((device) => {
            const paired = garage.controllers.some((c) => c.id === device.id);
            return (
              <li
                key={device.id}
                className="rounded-xl border border-white/10 bg-black/20 px-3 py-3"
              >
                <div>
                  <p className="text-sm">{device.name}</p>
                  <p className="text-xs text-white/40">{t("scan.btTag")}</p>
                </div>
                <Button size="sm" disabled={paired} onClick={() => void garage.pair(device)}>
                  {paired ? t("scan.added") : t("scan.add")}
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
  const { t } = useI18n();
  if (!garage.controllers.length) {
    return <p className="py-10 text-center text-sm text-white/40">{t("devices.empty")}</p>;
  }
  return (
    <div className="space-y-2">
      <div className="flex justify-end">
        <Button size="sm" variant="ghost" onClick={garage.resetGarage}>
          <Trash2 className="size-3.5" />
          {t("devices.clear")}
        </Button>
      </div>
      {garage.controllers.map((controller) => (
        <div key={controller.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <Input
              aria-label={t("devices.rename")}
              value={controller.customName}
              onChange={(event) => garage.rename(controller.id, event.target.value)}
            />
            <Button
              size="sm"
              variant="destructive"
              onClick={() => void garage.forget(controller.id)}
            >
              <Unplug className="size-3.5" />
              {t("devices.remove")}
            </Button>
          </div>
          <div className="mt-2 flex items-center justify-between gap-2">
            <select
              className="h-8 flex-1 rounded-md border border-input bg-transparent px-2 text-sm"
              value={controller.zone}
              onChange={(event) => garage.setZone(controller.id, event.target.value as ZoneKind)}
              aria-label={t(`zone.${controller.zone}`)}
            >
              {ASSIGNABLE_ZONES.map((zone) => (
                <option key={zone.id} value={zone.id} className="bg-neutral-900">
                  {t(`zone.${zone.id}`)}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              onClick={() =>
                controller.connection === "connected"
                  ? void garage.disconnect(controller.id)
                  : void garage.connect(controller.id)
              }
            >
              <Plug className="size-3.5" />
              {controller.connection === "connected" ? t("devices.disconnect") : t("devices.connect")}
            </Button>
          </div>
          <p className="mt-1.5 flex items-center gap-1.5 text-xs text-white/35">
            <span
              className={cn(
                "size-1.5 rounded-full",
                controller.connection === "connected"
                  ? "bg-emerald-400"
                  : controller.connection === "connecting"
                    ? "bg-amber-400"
                    : controller.connection === "error"
                      ? "bg-red-400"
                      : "bg-white/30",
              )}
            />
            {controller.advertisedName} · {t(`connection.${controller.connection}`)}
          </p>
        </div>
      ))}
    </div>
  );
}
