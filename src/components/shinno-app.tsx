"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { Bluetooth, Loader2, Power, Trash2, Unplug, Car, Plug, Palette, Sparkles, Cpu } from "lucide-react";
import { ModeGlyph, PlayingBar } from "@/components/effect-preview";
import { ColorWheel, HEX_CLIP } from "@/components/color-wheel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { VehicleStage } from "@/components/vehicle-stage";
import { SettingsMenu } from "@/components/settings-menu";
import { assignableZonesForCar, CARS, kitZonesForCar, type ZoneKind } from "@/lib/catalog";
import { useGarage } from "@/lib/garage-context";
import { useI18n } from "@/lib/i18n";
import { EFFECTS, EFFECT_GROUPS, type Rgb } from "@/lib/protocol";
import { pathsForCar } from "@/lib/paths";
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

function subscribeNoop() {
  return () => {};
}

export function ShinnoApp() {
  const garage = useGarage();
  const { t } = useI18n();
  // Client-only garage counts (localStorage) — false on server to keep SSR labels stable.
  const garageReady = useSyncExternalStore(subscribeNoop, () => true, () => false);
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
      <header className="sticky top-0 z-20 border-b border-white/[0.06] bg-[#050505]/80 backdrop-blur-xl">
        <div className="mx-auto flex w-full max-w-lg items-center justify-between gap-3 px-5 py-3.5">
          <div className="flex items-center gap-2.5">
            <Image
              src="/shinno-logo-header.png"
              alt="Shinno Sync"
              width={507}
              height={96}
              className="h-8 w-auto sm:h-9"
              priority
            />
            <span className="text-[10px] font-medium tracking-[0.2em] text-white/60 uppercase sm:text-[11px] sm:tracking-[0.22em]">
              Sync
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <label className="flex max-w-[11.5rem] items-center gap-1.5 rounded-full border border-white/[0.08] bg-[#121212] px-2.5 py-1.5 text-sm text-white/85">
              <Car className="size-3.5 shrink-0 text-[#c41220]" />
              <select
                className="min-w-0 flex-1 truncate bg-transparent text-sm outline-none"
                value={garage.car}
                onChange={(event) => garage.setCar(event.target.value as typeof garage.car)}
                aria-label={t("car.label")}
                title={t("car.garageHint")}
              >
                {CARS.map((car) => {
                  const base = car.enabled ? car.name : `${car.name} — ${t("car.soon")}`;
                  // Counts come from localStorage — wait until mount to avoid hydration mismatch.
                  let label = base;
                  if (garageReady && car.enabled) {
                    const count = garage.vehicleDeviceCounts[car.id] ?? 0;
                    label = count > 0 ? `${base} · ${count}` : `${base} · ${t("car.empty")}`;
                  }
                  return (
                    <option
                      key={car.id}
                      value={car.id}
                      disabled={!car.enabled}
                      className="bg-neutral-900"
                    >
                      {label}
                    </option>
                  );
                })}
              </select>
            </label>
            <SettingsMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col px-5 pb-[6.25rem] pt-4">
        <VehicleStage
          car={garage.car}
          controllers={garage.controllers}
          target={garage.target}
          hotZones={garage.activePathZones}
          onSelect={(zone) => {
            garage.setTarget(zone);
            garage.setTab("color");
          }}
        />

        <div className="mt-4 flex min-h-0 flex-1 flex-col rounded-[1.35rem] border border-white/[0.08] bg-[#121212] p-4 shadow-[0_12px_40px_rgba(0,0,0,0.4)]">
          {garage.tab === "color" ? (
            garage.controllers.length === 0 ? (
              <EmptyGarage
                title={t("devices.empty")}
                hint={t("home.emptyHint")}
                actionLabel={t("devices.goScan")}
                onAction={() => openTab("scan")}
              />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-white/70">{zoneLabel}</p>
                  <button
                    type="button"
                    onClick={() => void garage.setPower(!power)}
                    className={cn(
                      "flex size-11 items-center justify-center rounded-full border transition",
                      power
                        ? "border-[#c41220]/50 bg-[#c41220] text-white shadow-[0_0_20px_rgba(196,18,32,0.45)]"
                        : "border-white/12 bg-white/[0.04] text-white/55",
                    )}
                    aria-label={power ? t("power.off") : t("power.on")}
                  >
                    <Power className="size-4" />
                  </button>
                </div>
                <ColorWheel color={color} onChange={(next) => void garage.setColor(next)} />
                <div>
                  <div className="mb-1.5 flex justify-between text-sm text-white/55">
                    <span>{t("color.brightness")}</span>
                    <span className="tabular-nums text-white/75">{brightness}%</span>
                  </div>
                  <Slider
                    min={1}
                    max={100}
                    value={[brightness]}
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
                        onClick={() => void garage.setColor(swatch)}
                        className="relative aspect-square w-full"
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
                        onClick={() => void garage.applyScene(scene)}
                        className={cn(
                          "flex flex-col items-center gap-1.5 rounded-xl border bg-[#0a0a0a] px-1.5 py-2.5",
                          active
                            ? "border-[#c41220]/70 shadow-[0_0_16px_rgba(196,18,32,0.28)]"
                            : "border-white/[0.08]",
                        )}
                      >
                        <span className="relative size-7">
                          <span
                            className="absolute inset-0 bg-white/30"
                            style={{ clipPath: HEX_CLIP }}
                            aria-hidden
                          />
                          <span
                            className="absolute inset-[2px]"
                            style={{
                              clipPath: HEX_CLIP,
                              background: rgbToCss(scene.color),
                            }}
                          />
                        </span>
                        <span className="text-[11px] leading-none text-white/80">{scene.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )
          ) : null}

          {garage.tab === "effects" ? <EffectsPanel onGoScan={() => openTab("scan")} /> : null}
          {garage.tab === "scan" ? <ScanPanel /> : null}
          {garage.tab === "devices" ? (
            <DeviceList onGoScan={() => openTab("scan")} />
          ) : null}

          {garage.lastError ? (
            <p className="mt-3 text-center text-sm text-red-300">{garage.lastError}</p>
          ) : null}
        </div>
      </main>

      <nav className="pointer-events-none fixed inset-x-0 bottom-0 z-20 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="pointer-events-auto mx-auto flex w-full max-w-lg items-center gap-1 rounded-full border border-white/[0.08] bg-[#121212]/92 px-2 py-1.5 shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          {TABS.map((item) => {
            const Icon = item.icon;
            const active = garage.tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => openTab(item.id)}
                className={cn(
                  "flex flex-1 flex-col items-center gap-0.5 rounded-full px-1 py-1.5 text-[11px] transition",
                  active ? "bg-white/[0.08] text-white" : "text-white/40",
                )}
              >
                <Icon className={cn("size-5", active && "text-[#c41220]")} />
                {t(`tab.${item.id}`)}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}

function EmptyGarage({
  title,
  hint,
  actionLabel,
  onAction,
}: {
  title: string;
  hint: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-2 py-10 text-center">
      <Bluetooth className="size-8 text-[#c41220]" aria-hidden />
      <div className="space-y-1.5">
        <p className="text-base font-medium text-white/90">{title}</p>
        <p className="mx-auto max-w-xs text-sm text-white/45">{hint}</p>
      </div>
      <Button
        className="mt-1 min-h-12 w-full max-w-xs rounded-xl bg-[#c41220] text-white shadow-[0_8px_24px_rgba(196,18,32,0.35)] hover:bg-[#d01a28]"
        onClick={onAction}
      >
        {actionLabel}
      </Button>
    </div>
  );
}

function EffectsPanel({ onGoScan }: { onGoScan: () => void }) {
  const garage = useGarage();
  const { t } = useI18n();
  const active = garage.selected[0]?.effectId;
  const speed = garage.activePathId ? garage.pathSpeed : (garage.selected[0]?.effectSpeed ?? 50);
  const [group, setGroup] = useState<(typeof EFFECT_GROUPS)[number]["id"] | "paths">("paths");
  const [query, setQuery] = useState("");
  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) return EFFECTS.filter((effect) => effect.name.toLowerCase().includes(q));
    if (group === "paths") return [];
    return EFFECTS.filter((effect) => effect.group === group);
  }, [group, query]);
  const carPaths = useMemo(() => pathsForCar(garage.car), [garage.car]);
  const pathZones = useMemo(() => kitZonesForCar(garage.car), [garage.car]);
  const activePath = carPaths.find((path) => path.id === garage.activePathId);
  const empty = garage.controllers.length === 0;

  return (
    <div className="flex min-h-0 flex-1 flex-col space-y-3">
      {empty ? (
        <div className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-3 text-center">
          <p className="text-sm text-white/55">{t("home.emptyHint")}</p>
          <Button
            size="sm"
            className="mt-2 rounded-full bg-[#c41220] text-white hover:bg-[#d01a28]"
            onClick={onGoScan}
          >
            {t("devices.goScan")}
          </Button>
        </div>
      ) : null}
      {garage.activePathId ? (
        <div className="overflow-hidden rounded-xl border border-[#c41220]/40 bg-[#0a0a0a] px-3 py-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#c41220]">{t("paths.live")}</p>
              <p className="mt-1 text-sm font-medium text-white">{activePath?.name ?? t("paths.title")}</p>
              <p className="mt-0.5 text-xs text-white/45">{activePath?.blurb}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => void garage.stopPath()}>
              {t("paths.stop")}
            </Button>
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {pathZones.map((zone) => {
              const hot = garage.activePathZones.includes(zone);
              return (
                <span
                  key={zone}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide",
                    hot
                      ? "border-[#c41220]/70 bg-[#c41220]/20 text-white"
                      : "border-white/[0.08] text-white/35",
                  )}
                >
                  {t(`zone.${zone}`)}
                </span>
              );
            })}
          </div>
        </div>
      ) : (
        <PlayingBar
          effectId={active}
          speed={speed}
          power={garage.selected.length ? garage.selected.every((c) => c.power) : false}
        />
      )}
      <div>
        <div className="mb-1 flex justify-between text-sm text-white/55">
          <span>{garage.activePathId ? t("paths.speed") : t("effects.speed")}</span>
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
          disabled={!garage.selected.length && !garage.activePathId}
          onValueChange={(value) => {
            const next = Array.isArray(value) ? value[0] : value;
            if (typeof next !== "number") return;
            if (garage.activePathId || group === "paths") garage.setPathSpeed(next);
            else void garage.setEffectSpeed(next);
          }}
        />
      </div>
      {group !== "paths" ? (
        <Input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("effects.search")}
          aria-label="Search modes"
        />
      ) : (
        <p className="text-xs text-white/65">{t("paths.hint")}</p>
      )}
      <div className="no-scrollbar mb-1.5 flex gap-1.5 overflow-x-auto overscroll-x-contain pb-0.5 [-webkit-overflow-scrolling:touch]">
        <button
          type="button"
          onClick={() => {
            setGroup("paths");
            setQuery("");
          }}
          className={cn(
            "shrink-0 rounded-full border px-2.5 py-1 text-xs font-medium transition",
            !query && group === "paths"
              ? "border-[#c41220] bg-[#c41220] text-white shadow-[0_4px_14px_rgba(196,18,32,0.35)]"
              : "border-white/15 bg-white/[0.1] text-white/85",
          )}
        >
          {t("paths.title")}
        </button>
        {EFFECT_GROUPS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setGroup(item.id);
              setQuery("");
            }}
            className={cn(
              "shrink-0 rounded-full px-2.5 py-1 text-xs transition",
              !query && group === item.id
                ? "bg-[#c41220] text-white shadow-[0_4px_14px_rgba(196,18,32,0.35)]"
                : "bg-white/[0.08] text-white/65",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
      {group === "paths" && !query ? (
        <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-2 content-start gap-2.5 overflow-y-auto overscroll-y-contain rounded-xl border border-[#c41220]/35 bg-[#141414] p-2.5">
          {carPaths.map((path) => {
            const activePathTile = garage.activePathId === path.id;
            const disabled = !garage.controllers.length;
            return (
              <button
                key={path.id}
                type="button"
                disabled={disabled}
                onClick={() => {
                  if (activePathTile) void garage.stopPath();
                  else void garage.startPath(path.id);
                }}
                className={cn(
                  "flex min-h-[7.25rem] flex-col items-start gap-2 rounded-xl border p-3 text-left transition",
                  activePathTile
                    ? "border-[#c41220] bg-[#2a1216] shadow-[0_0_18px_rgba(196,18,32,0.4)]"
                    : disabled
                      ? "border-white/30 bg-[#222222]"
                      : "border-white/28 bg-[#1e1e1e] hover:border-[#c41220]/55 hover:bg-[#241618]",
                )}
              >
                <span className="relative size-7 shrink-0">
                  <span
                    className="absolute inset-0 bg-white/45"
                    style={{ clipPath: HEX_CLIP }}
                    aria-hidden
                  />
                  <span
                    className="absolute inset-[2px]"
                    style={{
                      clipPath: HEX_CLIP,
                      background: rgbToCss(path.swatch),
                    }}
                  />
                </span>
                <span className={cn("text-sm font-semibold tracking-wide", disabled ? "text-white/85" : "text-white")}>
                  {path.name}
                </span>
                <span className={cn("text-[11px] leading-snug", disabled ? "text-white/60" : "text-white/72")}>
                  {path.blurb}
                </span>
              </button>
            );
          })}
        </div>
      ) : items.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">{t("effects.none")}</p>
      ) : (
        <div className="no-scrollbar grid min-h-0 flex-1 grid-cols-3 gap-2 overflow-y-auto overscroll-y-contain">
          {items.map((effect) => (
            <button
              key={effect.id}
              type="button"
              disabled={!garage.selected.length}
              onClick={() => void garage.setEffect(effect.id)}
              className={cn(
                "flex flex-col rounded-xl border bg-[#0a0a0a] p-1.5 text-center",
                active === effect.id && !garage.activePathId
                  ? "border-[#c41220]/70 shadow-[0_0_18px_rgba(196,18,32,0.28)]"
                  : "border-white/[0.08]",
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
        className="min-h-12 w-full rounded-xl bg-[#c41220] text-white shadow-[0_8px_24px_rgba(196,18,32,0.35)] hover:bg-[#d01a28]"
        onClick={() => void garage.scan()}
        disabled={garage.scanning || !garage.webBluetooth}
      >
        {garage.scanning ? <Loader2 className="animate-spin" /> : <Bluetooth />}
        {t("scan.pair")}
      </Button>
      {!garage.webBluetooth ? (
        <p className="text-center text-sm text-white/45">{t("scan.ble.none")}</p>
      ) : (
        <p className="text-center text-sm text-white/45">{t("scan.ble.web")}</p>
      )}
      {garage.scanError ? <p className="text-center text-sm text-red-300">{garage.scanError}</p> : null}
      {garage.discoveries.length === 0 && !garage.scanning ? (
        <p className="py-10 text-center text-sm text-white/40">{t("scan.empty")}</p>
      ) : (
        <ul className="space-y-1.5">
          {garage.discoveries.map((device) => {
            const paired = garage.controllers.some((c) => c.id === device.id);
            return (
              <li
                key={device.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.08] bg-[#0a0a0a] px-3 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm">{device.name}</p>
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

function DeviceList({ onGoScan }: { onGoScan: () => void }) {
  const garage = useGarage();
  const { t } = useI18n();
  const carName = CARS.find((car) => car.id === garage.car)?.name ?? garage.car.toUpperCase();
  if (!garage.controllers.length) {
    return (
      <div className="flex flex-1 flex-col gap-3">
        <p className="text-center text-xs tracking-wide text-white/45 uppercase">
          {t("car.active", { car: carName })}
        </p>
        <EmptyGarage
          title={t("devices.empty")}
          hint={garage.car === "g37" ? t("devices.emptyHintG37") : t("devices.emptyHint")}
          actionLabel={t("devices.goScan")}
          onAction={onGoScan}
        />
      </div>
    );
  }
  return (
    <div className="space-y-2">
      <p className="text-xs tracking-wide text-white/45 uppercase">
        {t("car.active", { car: carName })}
      </p>
      <div className="flex items-center justify-between gap-2">
        <Button size="sm" variant="outline" onClick={onGoScan}>
          <Bluetooth className="size-3.5" />
          {t("devices.goScan")}
        </Button>
        <Button size="sm" variant="ghost" onClick={garage.resetGarage}>
          <Trash2 className="size-3.5" />
          {t("devices.clear")}
        </Button>
      </div>
      {garage.controllers.map((controller) => (
        <div key={controller.id} className="rounded-xl border border-white/[0.08] bg-[#0a0a0a] p-3">
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
              {assignableZonesForCar(garage.car).map((zone) => (
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
