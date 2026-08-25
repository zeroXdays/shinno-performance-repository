"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { BleTransport, DiscoveredDevice } from "@/lib/ble/types";
import { WebBluetoothTransport, isChooserCancel, webBluetoothAvailable } from "@/lib/ble/web-bluetooth";
import type { CarId, ZoneKind } from "@/lib/catalog";
import { createController, guessZone, type Controller, type TabId } from "@/lib/controller";
import {
  detectModel,
  encodeBrightness,
  encodeColor,
  encodeEffect,
  encodeEffectSpeed,
  encodePower,
  type Rgb,
} from "@/lib/protocol";
import { SCENES, type Scene } from "@/lib/scenes";
import { getSettings } from "@/lib/settings";
import {
  getCar,
  getGarageControllers,
  getServerCar,
  getServerGarage,
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
  selected: Controller[];
  syncAll: boolean;
  busy: boolean;
  lastError: string | null;
  webBluetooth: boolean;
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

  const webBluetooth = webBluetoothAvailable();

  const setCar = useCallback((next: CarId) => {
    writeCar(next);
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

  const ensureConnected = useCallback(
    async (controller: Controller) => {
      if (controller.connection === "connected") return controller;
      const transport = (web.current ??= new WebBluetoothTransport());
      transports.current.set(controller.id, transport);
      patch(controller.id, { connection: "connecting", error: undefined });
      try {
        await transport.connect(controller.id);
        patch(controller.id, { connection: "connected", wantConnected: true, error: undefined });
        return { ...controller, connection: "connected" as const, wantConnected: true };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connect failed.";
        patch(controller.id, { connection: "error", error: message });
        throw error;
      }
    },
    [patch],
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
      const zone = guessZone(discovery.name, used);
      const model = detectModel(discovery.name);
      const controller = createController({
        id: discovery.id,
        advertisedName: discovery.name,
        zone,
        modelId: model.id,
        transport: "web-bluetooth",
      });
      setControllers((prev) => {
        if (prev.some((c) => c.id === discovery.id)) return prev;
        return [...prev, controller];
      });
      const transport = (web.current ??= new WebBluetoothTransport());
      transports.current.set(controller.id, transport);
      if (!getSettings().autoConnect) return;
      try {
        await ensureConnected(controller);
      } catch {
        /* error stored on controller */
      }
    },
    [controllers, ensureConnected, setControllers],
  );

  const refreshNearby = useCallback(async () => {
    if (!webBluetoothAvailable()) return;
    const transport = (web.current ??= new WebBluetoothTransport());
    try {
      const granted = await transport.adoptGranted();
      setDiscoveries((prev) => {
        const byId = new Map(prev.map((d) => [d.id, d]));
        for (const device of granted) byId.set(device.id, device);
        return [...byId.values()];
      });
      if (getSettings().autoConnect) {
        for (const controller of getGarageControllers()) {
          if (!controller.wantConnected || controller.connection === "connected") continue;
          try {
            await ensureConnected(controller);
          } catch {
            /* error stored on controller */
          }
        }
      }
    } catch {
      /* getDevices is optional in Chrome */
    }
  }, [ensureConnected]);

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
      if (getSettings().autoConnect) {
        for (const controller of getGarageControllers()) {
          if (!controller.wantConnected || controller.connection === "connected") continue;
          try {
            await ensureConnected(controller);
          } catch {
            /* error stored on controller */
          }
        }
      }
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
  }, [ensureConnected, pair]);

  const stopScan = useCallback(() => {
    web.current?.stopScan();
    setScanning(false);
  }, []);

  const forget = useCallback(
    async (id: string) => {
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

  const setPower = useCallback(
    async (on: boolean) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        await writeTo(controller, [encodePower(model, on)]);
      }, { power: on, effectId: undefined });
    },
    [forEachSelected, writeTo],
  );

  const flushColor = useCallback(
    async (color: Rgb, list: Controller[]) => {
      await enqueue(async () => {
        for (const [index, controller] of list.entries()) {
          const live = await ensureConnected(controller);
          const model = detectModel(live.advertisedName);
          const frames = [encodeColor(model, color)];
          if (!live.power) frames.unshift(encodePower(model, true));
          frames.push(encodeBrightness(model, live.brightness));
          await writeTo(live, frames);
          if (index < list.length - 1) await sleep(24);
        }
      });
    },
    [enqueue, ensureConnected, writeTo],
  );

  const setColor = useCallback(
    async (color: Rgb) => {
      const list = selected;
      applyLocal({ color, power: true, effectId: undefined }, list.map((c) => c.id));
      setLastError(null);
      if (colorTimer.current) clearTimeout(colorTimer.current);
      colorTimer.current = setTimeout(() => {
        void flushColor(color, list);
      }, 60);
    },
    [applyLocal, flushColor, selected],
  );

  const setBrightness = useCallback(
    async (percent: number) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        await writeTo(controller, [
          encodeBrightness(model, percent),
          encodeColor(model, controller.color),
        ]);
      }, { brightness: percent });
    },
    [forEachSelected, writeTo],
  );

  const setEffect = useCallback(
    async (effectId: number) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        const frames = [encodeEffect(model, effectId)];
        if (!controller.power) frames.unshift(encodePower(model, true));
        await writeTo(controller, frames);
      }, { effectId, power: true });
    },
    [forEachSelected, writeTo],
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
            const frames: Uint8Array[] = [encodePower(model, row.power)];
            if (row.power) {
              frames.push(encodeColor(model, row.color));
              frames.push(encodeBrightness(model, row.brightness));
              if (row.effectId) {
                frames.push(encodeEffect(model, row.effectId));
                frames.push(encodeEffectSpeed(model, row.effectSpeed ?? 50));
              }
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
    [controllers, enqueue, ensureConnected, setControllers, writeTo],
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
    selected,
    syncAll: target === "all",
    busy,
    lastError,
    webBluetooth,
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
