"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { BleTransport, DiscoveredDevice } from "@/lib/ble/types";
import { WebBluetoothTransport, isChooserCancel, webBluetoothAvailable } from "@/lib/ble/web-bluetooth";
import { registerAutoReconnect } from "@/lib/ble/auto-reconnect";
import { carSupportsZonePaths, kitZonesForCar, type CarId, type ZoneKind } from "@/lib/catalog";
import { createController, guessZone, type Controller, type TabId } from "@/lib/controller";
import {
  detectModel,
  encodeBrightness,
  encodeEffect,
  encodeEffectSpeed,
  encodePower,
  encodePowerSequence,
  encodeSolidColor,
  type Rgb,
} from "@/lib/protocol";
import { SCENES, type Scene } from "@/lib/scenes";
import { dimBrightness, pathByIdForCar, pathStepMs, type ZonePath } from "@/lib/paths";
import { getSettings } from "@/lib/settings";
import {
  getCar,
  getControllersForCar,
  getGarageControllers,
  getServerCar,
  getServerGarage,
  getVehicleDeviceCounts,
  subscribeCar,
  subscribeGarage,
  writeCar,
  writeGarage,
} from "@/lib/garage-storage";
type Target = "all" | ZoneKind;

interface GarageContextValue {
  controllers: Controller[];
  discoveries: DiscoveredDevice[];
  scanning: boolean;
  scanError: string | null;
  tab: TabId;
  setTab: (tab: TabId) => void;
  target: Target;
  setTarget: (target: Target) => void;
  car: CarId;
  setCar: (car: CarId) => void;
  /** Saved kit counts per enabled car (Q50 / G37 …). */
  vehicleDeviceCounts: Record<CarId, number>;
  selected: Controller[];
  syncAll: boolean;
  busy: boolean;
  lastError: string | null;
  webBluetooth: boolean;
  activePathId: string | null;
  activePathZones: ZoneKind[];
  pathSpeed: number;
  setPathSpeed: (percent: number) => void;
  startPath: (pathId: string) => Promise<void>;
  stopPath: () => Promise<void>;
  resetGarage: () => void;
  scan: () => Promise<void>;
  stopScan: () => void;
  refreshNearby: () => Promise<void>;
  pair: (discovery: DiscoveredDevice) => Promise<void>;
  forget: (id: string) => Promise<void>;
  connect: (id: string) => Promise<void>;
  disconnect: (id: string) => Promise<void>;
  rename: (id: string, name: string) => void;
  setZone: (id: string, zone: ZoneKind) => void;
  setPower: (on: boolean) => Promise<void>;
  setColor: (color: Rgb) => Promise<void>;
  setBrightness: (percent: number) => Promise<void>;
  setEffect: (effectId: number) => Promise<void>;
  setEffectSpeed: (percent: number) => Promise<void>;
  applyScene: (scene: Scene) => Promise<void>;
}

const GarageContext = createContext<GarageContextValue | null>(null);

export function GarageProvider({ children }: { children: ReactNode }) {
  const web = useRef<WebBluetoothTransport | null>(null);
  const transports = useRef(new Map<string, BleTransport>());
  const writeQueue = useRef(Promise.resolve());
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pathRunId = useRef(0);
  const pathSpeedRef = useRef(55);

  const controllers = useSyncExternalStore(subscribeGarage, getGarageControllers, getServerGarage);
  const car = useSyncExternalStore(subscribeCar, getCar, getServerCar);
  const setControllers = useCallback((next: Controller[] | ((prev: Controller[]) => Controller[])) => {
    const resolved = typeof next === "function" ? next(getGarageControllers()) : next;
    writeGarage(resolved);
  }, []);

  const [discoveries, setDiscoveries] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("effects");
  const [target, setTarget] = useState<Target>("all");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [activePathId, setActivePathId] = useState<string | null>(null);
  const [activePathZones, setActivePathZones] = useState<ZoneKind[]>([]);
  const [pathSpeed, setPathSpeedState] = useState(55);

  const webBluetooth = webBluetoothAvailable();

  const vehicleDeviceCounts = useMemo(() => {
    // Recompute when active garage or car changes (storage notifies both).
    void controllers;
    void car;
    return getVehicleDeviceCounts();
  }, [controllers, car]);

  const setCar = useCallback((next: CarId) => {
    if (next === getCar()) return;
    // Drop live BLE links for the car we are leaving; the other car's kits stay saved.
    for (const controller of getGarageControllers()) {
      void transports.current.get(controller.id)?.disconnect(controller.id);
      transports.current.delete(controller.id);
    }
    pathRunId.current += 1;
    if (pathTimer.current) {
      clearTimeout(pathTimer.current);
      pathTimer.current = null;
    }
    setActivePathId(null);
    setActivePathZones([]);
    writeCar(next);
    const kit = new Set(kitZonesForCar(next));
    setTarget((current) => (current !== "all" && !kit.has(current) ? "all" : current));
    // Drop saved zones that this car does not offer (e.g. G37 emblem-only).
    const incoming = getControllersForCar(next);
    const pruned = incoming.filter((row) => kit.has(row.zone) || row.zone === "custom");
    if (pruned.length !== incoming.length) writeGarage(pruned);
  }, []);

  const patch = useCallback(
    (id: string, update: Partial<Controller>) => {
      setControllers((prev) => prev.map((c) => (c.id === id ? { ...c, ...update } : c)));
    },
    [setControllers],
  );

  const selected = useMemo(() => {
    if (target === "all") return controllers;
    return controllers.filter((c) => c.zone === target);
  }, [controllers, target]);

  const applyLocal = useCallback(
    (update: Partial<Controller>, ids?: string[]) => {
      setControllers((prev) => {
        const idSet = new Set(
          ids ??
            (target === "all" ? prev : prev.filter((c) => c.zone === target)).map((c) => c.id),
        );
        return prev.map((c) => (idSet.has(c.id) ? { ...c, ...update } : c));
      });
    },
    [setControllers, target],
  );

  const enqueue = useCallback((task: () => Promise<void>) => {
    writeQueue.current = writeQueue.current.then(task).catch((error: unknown) => {
      if (isChooserCancel(error)) return;
      setLastError(error instanceof Error ? error.message : "Write failed.");
    });
    return writeQueue.current;
  }, []);

  const writeTo = useCallback(async (controller: Controller, frames: Uint8Array[]) => {
    const transport = transports.current.get(controller.id) ?? web.current;
    if (!transport) return;
    transports.current.set(controller.id, transport);
    for (const [index, frame] of frames.entries()) {
      await transport.write(controller.id, frame);
      if (index < frames.length - 1) await sleep(18);
    }
  }, []);

  const replayLook = useCallback(
    async (controller: Controller) => {
      const live = getGarageControllers().find((row) => row.id === controller.id) ?? controller;
      const model = detectModel(live.advertisedName);
      let frames: Uint8Array[];
      if (!live.power) {
        frames = [encodePower(model, false)];
      } else if (live.effectId != null) {
        frames = [
          encodePower(model, true),
          encodeEffect(model, live.effectId),
          encodeEffectSpeed(model, live.effectSpeed),
        ];
      } else {
        frames = encodeSolidColor(model, live.color, live.brightness);
      }
      await writeTo(live, frames);
    },
    [writeTo],
  );

  const bindTransport = useCallback(
    (transport: WebBluetoothTransport) => {
      transport.onDropped = (id) => {
        const row = getGarageControllers().find((controller) => controller.id === id);
        if (!row) return;
        patch(id, { connection: "disconnected", error: undefined });
      };
      transport.onLinked = (id) => {
        const row = getGarageControllers().find((controller) => controller.id === id);
        if (!row?.wantConnected) return;
        patch(id, { connection: "connected", error: undefined });
        void replayLook({ ...row, connection: "connected" });
      };
    },
    [patch, replayLook],
  );

  const ensureConnected = useCallback(
    async (controller: Controller) => {
      if (controller.connection === "connected") return controller;
      const transport = (web.current ??= new WebBluetoothTransport());
      bindTransport(transport);
      transport.remember(controller.id);
      transports.current.set(controller.id, transport);
      patch(controller.id, { connection: "connecting", error: undefined });
      try {
        await transport.connect(controller.id);
        patch(controller.id, { connection: "connected", wantConnected: true, error: undefined });
        return { ...controller, connection: "connected" as const, wantConnected: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connect failed.";
        patch(controller.id, { connection: "disconnected", error: message });
        throw error;
      }
    },
    [bindTransport, patch],
  );

  const resetGarage = useCallback(() => {
    for (const controller of controllers) {
      void transports.current.get(controller.id)?.disconnect(controller.id);
    }
    transports.current.clear();
    setControllers([]);
    setDiscoveries([]);
    setTarget("all");
  }, [controllers, setControllers]);

  const pair = useCallback(
    async (discovery: DiscoveredDevice) => {
      if (controllers.some((c) => c.id === discovery.id)) return;
      const used = new Set(controllers.map((c) => c.zone));
      const zone = guessZone(discovery.name, used, kitZonesForCar(getCar()));
      const model = detectModel(discovery.name);
      const controller = {
        ...createController({
          id: discovery.id,
          advertisedName: discovery.name,
          zone,
          modelId: model.id,
          transport: "web-bluetooth",
        }),
        wantConnected: true,
      };
      setControllers((prev) => {
        if (prev.some((c) => c.id === discovery.id)) return prev;
        return [...prev, controller];
      });
      const transport = (web.current ??= new WebBluetoothTransport());
      bindTransport(transport);
      transport.remember(controller.id);
      transports.current.set(controller.id, transport);
      if (!getSettings().autoConnect) return;
      try {
        await ensureConnected(controller);
      } catch {
        /* error stored on controller */
      }
    },
    [bindTransport, controllers, ensureConnected, setControllers],
  );

  const reconnectKnown = useCallback(async () => {
    if (!webBluetoothAvailable() || !getSettings().autoConnect) return;
    const transport = (web.current ??= new WebBluetoothTransport());
    bindTransport(transport);
    try {
      await transport.adoptGranted();
    } catch {
      /* getDevices is optional */
    }
    for (const controller of getGarageControllers()) {
      if (!controller.wantConnected) {
        transport.forgetAuto(controller.id);
        continue;
      }
      transport.remember(controller.id);
      if (controller.connection === "connected" || controller.connection === "connecting") continue;
      try {
        await ensureConnected(controller);
        await replayLook(controller);
      } catch {
        patch(controller.id, { connection: "disconnected", error: undefined });
      }
    }
  }, [bindTransport, ensureConnected, patch, replayLook]);

  useEffect(() => {
    registerAutoReconnect(() => {
      void reconnectKnown();
    });
  }, [reconnectKnown]);

  // After switching vehicles, link the newly active car's saved kits.
  const previousCar = useRef(car);
  useEffect(() => {
    if (previousCar.current === car) return;
    previousCar.current = car;
    void reconnectKnown();
  }, [car, reconnectKnown]);

  const refreshNearby = useCallback(async () => {
    if (!webBluetoothAvailable()) return;
    const transport = (web.current ??= new WebBluetoothTransport());
    bindTransport(transport);
    try {
      const granted = await transport.adoptGranted();
      setDiscoveries((prev) => {
        const byId = new Map(prev.map((d) => [d.id, d]));
        for (const device of granted) byId.set(device.id, device);
        return [...byId.values()];
      });
      await reconnectKnown();
    } catch {
      /* getDevices is optional in Chrome */
    }
  }, [bindTransport, reconnectKnown]);

  const scan = useCallback(async () => {
    setScanning(true);
    setScanError(null);
    setTab("scan");
    const transport = (web.current ??= new WebBluetoothTransport());
    const found: DiscoveredDevice[] = [];
    try {
      const granted = await transport.adoptGranted();
      setDiscoveries((prev) => {
        const byId = new Map(prev.map((d) => [d.id, d]));
        for (const device of granted) byId.set(device.id, device);
        return [...byId.values()];
      });
      await reconnectKnown();
      await transport.scan((device) => {
        found.push(device);
        setDiscoveries((prev) =>
          prev.some((d) => d.id === device.id) ? prev : [...prev, device],
        );
      });
      if (getSettings().autoAdd) {
        for (const device of found) {
          await pair(device);
        }
      }
    } catch (error) {
      if (isChooserCancel(error)) {
        setScanError(null);
        return;
      }
      setScanError(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }, [pair, reconnectKnown]);

  const stopScan = useCallback(() => {
    web.current?.stopScan();
    setScanning(false);
  }, []);

  const forget = useCallback(
    async (id: string) => {
      web.current?.forgetAuto(id);
      await transports.current.get(id)?.disconnect(id);
      transports.current.delete(id);
      setControllers((prev) => prev.filter((c) => c.id !== id));
      if (target === id) setTarget("all");
    },
    [setControllers, target],
  );

  const connect = useCallback(
    async (id: string) => {
      const controller = controllers.find((c) => c.id === id);
      if (!controller) return;
      await ensureConnected(controller);
    },
    [controllers, ensureConnected],
  );

  const disconnect = useCallback(async (id: string) => {
    await transports.current.get(id)?.disconnect(id);
    patch(id, { connection: "disconnected", wantConnected: false });
  }, [patch]);

  const rename = useCallback(
    (id: string, name: string) => patch(id, { customName: name }),
    [patch],
  );

  const setZone = useCallback(
    (id: string, zone: ZoneKind) => patch(id, { zone }),
    [patch],
  );

  const forEachSelected = useCallback(
    async (run: (controller: Controller) => Promise<void>, update: Partial<Controller>) => {
      const list = selected;
      applyLocal(update, list.map((c) => c.id));
      setLastError(null);
      try {
        await enqueue(async () => {
          for (const [index, controller] of list.entries()) {
            const live = await ensureConnected(controller);
            await run({ ...live, ...update });
            if (index < list.length - 1) await sleep(24);
          }
        });
      } catch (error) {
        if (!isChooserCancel(error)) {
          setLastError(error instanceof Error ? error.message : "Command failed.");
        }
      }
    },
    [applyLocal, enqueue, ensureConnected, selected],
  );

  const haltPathTimer = useCallback(() => {
    pathRunId.current += 1;
    if (pathTimer.current) {
      clearTimeout(pathTimer.current);
      pathTimer.current = null;
    }
    setActivePathId(null);
    setActivePathZones([]);
  }, []);

  const writePathStep = useCallback(
    async (path: ZonePath, stepIndex: number) => {
      const hot = path.steps[stepIndex] ?? [];
      setActivePathZones(hot);
      const garage = getGarageControllers();
      const color =
        garage.find((row) => hot.includes(row.zone))?.color ??
        garage[0]?.color ??
        ({ r: 196, g: 18, b: 32 } satisfies Rgb);

      await enqueue(async () => {
        for (const [index, controller] of garage.entries()) {
          const live = await ensureConnected(controller);
          const model = detectModel(live.advertisedName);
          const lit = hot.includes(live.zone);
          let frames: Uint8Array[];
          if (!lit && path.rest === "off") {
            frames = [encodePower(model, false)];
          } else {
            const brightness = lit
              ? live.brightness || 80
              : dimBrightness(live.brightness || 80);
            frames = encodeSolidColor(model, color, brightness);
          }
          await writeTo(live, frames);
          if (index < garage.length - 1) await sleep(18);
        }
      });

      setControllers((prev) =>
        prev.map((controller) => {
          const lit = hot.includes(controller.zone);
          if (lit) {
            return { ...controller, power: true, color, effectId: undefined };
          }
          if (path.rest === "off") {
            return { ...controller, power: false, effectId: undefined };
          }
          return { ...controller, power: true, color, effectId: undefined };
        }),
      );
    },
    [enqueue, ensureConnected, setControllers, writeTo],
  );

  const stopPath = useCallback(async () => {
    haltPathTimer();
  }, [haltPathTimer]);

  const setPathSpeed = useCallback((percent: number) => {
    const next = Math.min(100, Math.max(0, Math.round(percent)));
    pathSpeedRef.current = next;
    setPathSpeedState(next);
  }, []);

  const startPath = useCallback(
    async (pathId: string) => {
      const car = getCar();
      if (!carSupportsZonePaths(car)) return;
      const path = pathByIdForCar(car, pathId);
      if (!path) return;
      const garage = getGarageControllers();
      if (!garage.length) {
        setLastError("Add devices on Scan before running a zone path.");
        return;
      }
      const covered = new Set(path.steps.flat());
      const hasZone = garage.some((controller) => covered.has(controller.zone));
      if (!hasZone) {
        const labels = kitZonesForCar(getCar())
          .map((zone) => zone.charAt(0).toUpperCase() + zone.slice(1))
          .join(", ");
        setLastError(`Assign ${labels} on Devices so this path has somewhere to go.`);
        return;
      }

      haltPathTimer();
      const runId = pathRunId.current;
      setActivePathId(path.id);
      setLastError(null);
      setTarget("all");

      const tick = async (stepIndex: number) => {
        if (pathRunId.current !== runId) return;
        try {
          await writePathStep(path, stepIndex);
        } catch (error) {
          if (!isChooserCancel(error)) {
            setLastError(error instanceof Error ? error.message : "Path failed.");
          }
          haltPathTimer();
          return;
        }
        if (pathRunId.current !== runId) return;
        const next = (stepIndex + 1) % path.steps.length;
        pathTimer.current = setTimeout(() => {
          void tick(next);
        }, pathStepMs(pathSpeedRef.current));
      };

      await tick(0);
    },
    [haltPathTimer, writePathStep],
  );

  useEffect(() => {
    return () => {
      pathRunId.current += 1;
      if (pathTimer.current) clearTimeout(pathTimer.current);
    };
  }, []);

  const setPower = useCallback(
    async (on: boolean) => {
      haltPathTimer();
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        await writeTo(controller, encodePowerSequence(model, on));
      }, { power: on, effectId: undefined });
    },
    [forEachSelected, haltPathTimer, writeTo],
  );

  const flushColor = useCallback(
    async (
      color: Rgb,
      list: Controller[],
      opts: { alreadyPowered: boolean; exitPattern: boolean },
    ) => {
      await enqueue(async () => {
        for (const [index, controller] of list.entries()) {
          const live = await ensureConnected(controller);
          const model = detectModel(live.advertisedName);
          await writeTo(
            live,
            encodeSolidColor(model, color, live.brightness, {
              alreadyPowered: opts.alreadyPowered,
              exitPattern: opts.exitPattern,
            }),
          );
          if (index < list.length - 1) await sleep(24);
        }
      });
    },
    [enqueue, ensureConnected, writeTo],
  );

  const setColor = useCallback(
    async (color: Rgb) => {
      haltPathTimer();
      const list = selected;
      const leavingEffect = list.some((c) => c.effectId != null);
      const alreadyPowered = list.some((c) => c.power);
      applyLocal({ color, power: true, effectId: undefined }, list.map((c) => c.id));
      setLastError(null);
      if (colorTimer.current) clearTimeout(colorTimer.current);
      colorTimer.current = setTimeout(() => {
        void flushColor(color, list, {
          alreadyPowered,
          exitPattern: leavingEffect || !alreadyPowered,
        });
      }, 60);
    },
    [applyLocal, flushColor, haltPathTimer, selected],
  );

  const setBrightness = useCallback(
    async (percent: number) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        if (controller.effectId == null) {
          await writeTo(
            controller,
            encodeSolidColor(model, controller.color, percent, {
              alreadyPowered: controller.power,
              exitPattern: false,
            }),
          );
        } else {
          await writeTo(controller, [encodeBrightness(model, percent)]);
        }
      }, { brightness: percent });
    },
    [forEachSelected, writeTo],
  );

  const setEffect = useCallback(
    async (effectId: number) => {
      haltPathTimer();
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        const frames = [encodeEffect(model, effectId)];
        if (!controller.power) frames.unshift(encodePower(model, true));
        await writeTo(controller, frames);
      }, { effectId, power: true });
    },
    [forEachSelected, haltPathTimer, writeTo],
  );

  const setEffectSpeed = useCallback(
    async (percent: number) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        await writeTo(controller, [encodeEffectSpeed(model, percent)]);
      }, { effectSpeed: percent });
    },
    [forEachSelected, writeTo],
  );

  const applyScene = useCallback(
    async (scene: Scene) => {
      haltPathTimer();
      setBusy(true);
      setLastError(null);
      const snapshot = controllers.map((controller) => {
        const override = scene.zones?.[controller.zone];
        return {
          id: controller.id,
          color: override?.color ?? scene.color,
          brightness: override?.brightness ?? scene.brightness,
          power: override?.power ?? scene.power,
          effectId: (override?.power ?? scene.power) ? scene.effectId : undefined,
          effectSpeed: scene.effectSpeed ?? controller.effectSpeed,
        };
      });
      setControllers((prev) =>
        prev.map((controller) => {
          const row = snapshot.find((s) => s.id === controller.id);
          return row ? { ...controller, ...row } : controller;
        }),
      );
      try {
        await enqueue(async () => {
          for (const [index, controller] of controllers.entries()) {
            const live = await ensureConnected(controller);
            const row = snapshot.find((s) => s.id === live.id);
            if (!row) continue;
            const model = detectModel(live.advertisedName);
            let frames: Uint8Array[];
            if (!row.power) {
              frames = [encodePower(model, false)];
            } else if (row.effectId) {
              frames = [
                encodePower(model, true),
                encodeEffect(model, row.effectId),
                encodeEffectSpeed(model, row.effectSpeed ?? 50),
              ];
            } else {
              frames = encodeSolidColor(model, row.color, row.brightness);
            }
            await writeTo(live, frames);
            if (index < controllers.length - 1) await sleep(24);
          }
        });
      } catch (error) {
        if (!isChooserCancel(error)) {
          setLastError(error instanceof Error ? error.message : "Scene failed.");
        }
      } finally {
        setBusy(false);
      }
    },
    [controllers, enqueue, ensureConnected, haltPathTimer, setControllers, writeTo],
  );

  const value: GarageContextValue = {
    controllers,
    discoveries,
    scanning,
    scanError,
    tab,
    setTab,
    target,
    setTarget,
    car,
    setCar,
    vehicleDeviceCounts,
    selected,
    syncAll: target === "all",
    busy,
    lastError,
    webBluetooth,
    activePathId,
    activePathZones,
    pathSpeed,
    setPathSpeed,
    startPath,
    stopPath,
    resetGarage,
    scan,
    refreshNearby,
    stopScan,
    pair,
    forget,
    connect,
    disconnect,
    rename,
    setZone,
    setPower,
    setColor,
    setBrightness,
    setEffect,
    setEffectSpeed,
    applyScene,
  };

  return <GarageContext.Provider value={value}>{children}</GarageContext.Provider>;
}

export function useGarage() {
  const ctx = useContext(GarageContext);
  if (!ctx) throw new Error("useGarage must be used inside GarageProvider");
  return ctx;
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export { SCENES };
