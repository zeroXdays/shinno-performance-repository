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
import { WebBluetoothTransport, webBluetoothAvailable } from "@/lib/ble/web-bluetooth";
import type { ZoneKind } from "@/lib/catalog";
import {
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
import { SCENES, type Scene } from "@/lib/scenes";

type Target = "all" | string;

interface GarageContextValue {
  controllers: Controller[];
  discoveries: DiscoveredDevice[];
  scanning: boolean;
  scanError: string | null;
  tab: TabId;
  setTab: (tab: TabId) => void;
  target: Target;
  setTarget: (target: Target) => void;
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

  const [controllers, setControllers] = useState<Controller[]>([]);
  const [discoveries, setDiscoveries] = useState<DiscoveredDevice[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const [tab, setTab] = useState<TabId>("garage");
  const [target, setTarget] = useState<Target>("all");
  const [busy, setBusy] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [demoLoaded, setDemoLoaded] = useState(false);

  const webBluetooth = webBluetoothAvailable();

  const persist = useCallback((next: Controller[]) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(next)));
    } catch {
      /* ignore quota */
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
    return controllers.filter((c) => c.id === target);
  }, [controllers, target]);

  const enqueue = useCallback((task: () => Promise<void>) => {
    writeQueue.current = writeQueue.current.then(task).catch((error: unknown) => {
      setLastError(error instanceof Error ? error.message : "Controller write failed.");
    });
    return writeQueue.current;
  }, []);

  const writeTo = useCallback(
    async (controller: Controller, frames: Uint8Array[]) => {
      const transport = transports.current.get(controller.id);
      if (!transport) return;
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
      setTab("garage");
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
      setBusy(true);
      setLastError(null);
      try {
        const list = selected;
        await enqueue(async () => {
          for (const [index, controller] of list.entries()) {
            const live = await ensureConnected(controller);
            await run(live);
            patch(live.id, update);
            if (index < list.length - 1) await sleep(28);
          }
        });
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Command failed.");
      } finally {
        setBusy(false);
      }
    },
    [enqueue, ensureConnected, patch, selected],
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

  const setColor = useCallback(
    async (color: Rgb) => {
      await forEachSelected(async (controller) => {
        const model = detectModel(controller.advertisedName);
        const frames = [encodeColor(model, color)];
        if (!controller.power) frames.unshift(encodePower(model, true));
        frames.push(encodeBrightness(model, controller.brightness));
        await writeTo(controller, frames);
      }, { color, power: true, effectId: undefined });
    },
    [forEachSelected, writeTo],
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
      try {
        await enqueue(async () => {
          for (const [index, controller] of controllers.entries()) {
            const live = await ensureConnected(controller);
            const override = scene.zones?.[live.zone];
            const color = override?.color ?? scene.color;
            const brightness = override?.brightness ?? scene.brightness;
            const power = override?.power ?? scene.power;
            const model = detectModel(live.advertisedName);
            const frames: Uint8Array[] = [encodePower(model, power)];
            if (power) {
              frames.push(encodeColor(model, color));
              frames.push(encodeBrightness(model, brightness));
              if (scene.effectId) {
                frames.push(encodeEffect(model, scene.effectId));
                frames.push(encodeEffectSpeed(model, scene.effectSpeed ?? 50));
              }
            }
            await writeTo(live, frames);
            patch(live.id, {
              power,
              color,
              brightness,
              effectId: power ? scene.effectId : undefined,
              effectSpeed: scene.effectSpeed ?? live.effectSpeed,
            });
            if (index < controllers.length - 1) await sleep(28);
          }
        });
      } catch (error) {
        setLastError(error instanceof Error ? error.message : "Scene failed.");
      } finally {
        setBusy(false);
      }
    },
    [controllers, enqueue, ensureConnected, patch, writeTo],
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
