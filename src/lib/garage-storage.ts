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

/** Cached getServerSnapshot values — a new []/object each call infinite-loops useSyncExternalStore. */
const EMPTY_GARAGE: Controller[] = [];
const SERVER_CAR: CarId = "q50";

function readControllers(): Controller[] {
  if (typeof window === "undefined") return EMPTY_GARAGE;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return EMPTY_GARAGE;
    const hydrated = hydrateControllers(JSON.parse(raw));
    return hydrated.length === 0 ? EMPTY_GARAGE : hydrated;
  } catch {
    return EMPTY_GARAGE;
  }
}

function readCar(): CarId {
  if (typeof window === "undefined") return SERVER_CAR;
  try {
    const raw = window.localStorage.getItem(CAR_STORAGE_KEY);
    if (raw && isActiveCar(raw)) return raw;
  } catch {
    /* ignore */
  }
  return SERVER_CAR;
}

let controllersSnapshot: Controller[] = EMPTY_GARAGE;
let carSnapshot: CarId = SERVER_CAR;

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
  return EMPTY_GARAGE;
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
  return SERVER_CAR;
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
