import { isActiveCar, type CarId } from "./catalog";
import {
  CAR_STORAGE_KEY,
  STORAGE_KEY,
  hydrateControllers,
  persistable,
  type Controller,
} from "./controller";

const listeners = new Set<() => void>();
const carListeners = new Set<() => void>();

function readControllers(): Controller[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const hydrated = hydrateControllers(JSON.parse(raw));
    return hydrated;
  } catch {
    return [];
  }
}

function readCar(): CarId {
  if (typeof window === "undefined") return "q50";
  try {
    const raw = window.localStorage.getItem(CAR_STORAGE_KEY);
    if (raw && isActiveCar(raw)) return raw;
  } catch {
    /* ignore */
  }
  return "q50";
}

let controllersSnapshot: Controller[] = [];
let carSnapshot: CarId = "q50";

if (typeof window !== "undefined") {
  const hydrated = readControllers();
  controllersSnapshot = hydrated;
  carSnapshot = readCar();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && hydrated.length === 0 && raw.includes("sim-")) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(hydrated)));
    }
  } catch {
    /* ignore */
  }
}

export function getGarageControllers(): Controller[] {
  return controllersSnapshot;
}

export function getServerGarage(): Controller[] {
  return [];
}

export function subscribeGarage(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function writeGarage(next: Controller[]) {
  controllersSnapshot = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(persistable(next)));
  } catch {
    /* ignore quota */
  }
  listeners.forEach((listener) => listener());
}

export function getCar(): CarId {
  return carSnapshot;
}

export function getServerCar(): CarId {
  return "q50";
}

export function subscribeCar(listener: () => void) {
  carListeners.add(listener);
  return () => carListeners.delete(listener);
}

export function writeCar(next: CarId) {
  if (!isActiveCar(next)) return;
  carSnapshot = next;
  try {
    window.localStorage.setItem(CAR_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  carListeners.forEach((listener) => listener());
}
