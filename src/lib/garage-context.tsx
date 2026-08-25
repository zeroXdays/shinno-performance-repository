"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { SimulatorTransport } from "@/lib/ble/simulator";
import type { BleTransport, DiscoveredDevice } from "@/lib/ble/types";
import { WebBluetoothTransport, isChooserCancel, webBluetoothAvailable } from "@/lib/ble/web-bluetooth";
import { type CarId, type ZoneKind } from "@/lib/catalog";
import {
  CAR_STORAGE_KEY,
  createController,
  guessZone,
  persistable,
  STORAGE_KEY,
  type Controller,
  type TabId,
} from "@/lib/controller";
import {
  detectModel,
  encodeBrightness,
  encodeColor,
  encodeEffect,
  encodeEffectSpeed,
  encodePower,
  type Rgb,
} from "@/lib/protocol";
import { createDemoControllers } from "@/lib/demo";
import { SCENES, type Scene } from "@/lib/scenes";

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
  demoLoaded: boolean;
  loadDemo: () => Promise<void>;
  resetGarage: () => void;
  scan: (mode: "simulator" | "web-bluetooth") => Promise<void>;
  stopScan: () => void;
  pair: (discovery: DiscoveredDevice) => Promise<void>;
  forget: (id: string) => Promise<void>;
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
  const sim = useRef(new SimulatorTransport());
  const web = useRef<WebBluetoothTransport | null>(null);
  const transports = useRef(new Map<string, BleTransport>());
  const writeQueue = useRef(Promise.resolve());
  const colorTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [controllers, setControllers] = useState<Controller[]>(() => createDemoControllers());
  const [discoveries, setDiscoveries] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("effects");
  const [target, setTarget] = useState<Target>("all");
  const [car, setCarState] = useState<CarId>("q50");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(true);

  const webBluetooth = webBluetoothAvailable();

  const persist = useCallback((next: Controller[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(next)));
    } catch {
      /* ignore quota */
    }
  }, []);

  const setCar = useCallback((next: CarId) => {
    setCarState(next);
    try {
      window.localStorage.setItem(CAR_STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  }, []);

  const patch = useCallback(
    (id: string, update: Partial<Controller>) => {
      setControllers((prev) => {
        const next = prev.map((c) => (c.id === id ? { ...c, ...update } : c));
        persist(next);
        return next;
      });
    },
    [persist],
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
        const next = prev.map((c) => (idSet.has(c.id) ? { ...c, ...update } : c));
        persist(next);
        return next;
      });
    },
    [persist, target],
  );

  const enqueue = useCallback((task: () => Promise<void>) => {
    writeQueue.current = writeQueue.current.then(task).catch((error: unknown) => {
      if (isChooserCancel(error)) return;
      setLastError(error instanceof Error ? error.message : "Controller write failed.");
    });
    return writeQueue.current;
  }, []);

  const writeTo = useCallback(
    async (controller: Controller, frames: Uint8Array[]) => {
      const transport =
        transports.current.get(controller.id) ??
        (controller.transport === "simulator" ? sim.current : undefined);
      if (!transport) return;
      transports.current.set(controller.id, transport);
      for (const [index, frame] of frames.entries()) {
        await transport.write(controller.id, frame);
        if (index < frames.length - 1) {
          await sleep(18);
        }
      }
    },
    [],
  );

  const ensureConnected = useCallback(
    async (controller: Controller) => {
      if (controller.connection === "connected") return controller;
      const transport =
        controller.transport === "web-bluetooth"
          ? (web.current ??= new WebBluetoothTransport())
          : sim.current;
      transports.current.set(controller.id, transport);
      patch(controller.id, { connection: "connecting", error: undefined });
      try {
        await transport.connect(controller.id);
        patch(controller.id, { connection: "connected" });
        return { ...controller, connection: "connected" as const };
      } catch (error) {
        const message = error instanceof Error ? error.message : "Connect failed.";
        patch(controller.id, { connection: "error", error: message });
        throw error;
      }
    },
    [patch],
  );

  const loadDemo = useCallback(async () => {
    setBusy(true);
    setLastError(null);
    try {
      const found: DiscoveredDevice[] = [];
      await sim.current.scan((device) => found.push(device));
      const used = new Set<ZoneKind>();
      const next: Controller[] = [];
      for (const device of found) {
        const zone = guessZone(device.name, used);
        used.add(zone);
        const model = detectModel(device.name);
        const controller = createController({
          id: device.id,
          advertisedName: device.name,
          zone,
          modelId: model.id,
          transport: "simulator",
        });
        transports.current.set(controller.id, sim.current);
        await sim.current.connect(controller.id);
        next.push({ ...controller, connection: "connected" });
      }
      setControllers(next);
      persist(next);
      setDemoLoaded(true);
      setTarget("all");
      setTab("color");
    } finally {
      setBusy(false);
    }
  }, [persist]);

  const resetGarage = useCallback(() => {
    for (const controller of controllers) {
      void transports.current.get(controller.id)?.disconnect(controller.id);
    }
    transports.current.clear();
    setControllers([]);
    persist([]);
    setDemoLoaded(false);
    setDiscoveries([]);
    setTarget("all");
  }, [controllers, persist]);

  const scan = useCallback(async (mode: "simulator" | "web-bluetooth") => {
    setScanning(true);
    setScanError(null);
    setDiscoveries([]);
    setTab("scan");
    const transport = mode === "web-bluetooth" ? (web.current ??= new WebBluetoothTransport()) : sim.current;
    try {
      await transport.scan((device) => {
        setDiscoveries((prev) =>
          prev.some((d) => d.id === device.id) ? prev : [...prev, device],
        );
      });
    } catch (error) {
      if (isChooserCancel(error)) {
        setScanError(null);
        return;
      }
      setScanError(error instanceof Error ? error.message : "Scan failed.");
    } finally {
      setScanning(false);
    }
  }, []);

  const stopScan = useCallback(() => {
    sim.current.stopScan();
    web.current?.stopScan();
    setScanning(false);
  }, []);

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
        transport: discovery.transport,
      });
      setControllers((prev) => {
        const next = [...prev, controller];
        persist(next);
        return next;
      });
      const transport =
        discovery.transport === "web-bluetooth"
          ? (web.current ??= new WebBluetoothTransport())
          : sim.current;
      transports.current.set(controller.id, transport);
      try {
        await ensureConnected(controller);
      } catch {
        /* error stored on controller */
      }
    },
    [controllers, ensureConnected, persist],
  );

  const forget = useCallback(
    async (id: string) => {
      await transports.current.get(id)?.disconnect(id);
      transports.current.delete(id);
      setControllers((prev) => {
        const next = prev.filter((c) => c.id !== id);
        persist(next);
        return next;
      });
      if (target === id) setTarget("all");
    },
    [persist, target],
  );

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
      setControllers((prev) => {
        const next = prev.map((controller) => {
          const row = snapshot.find((s) => s.id === controller.id);
          return row ? { ...controller, ...row } : controller;
        });
        persist(next);
        return next;
      });
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
    [controllers, enqueue, ensureConnected, persist, writeTo],
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
    demoLoaded,
    loadDemo,
    resetGarage,
    scan,
    stopScan,
    pair,
    forget,
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
