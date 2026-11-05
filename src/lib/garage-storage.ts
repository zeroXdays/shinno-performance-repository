import { ACTIVE_CARS, isActiveCar, type CarId } from "./catalog";
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

type GarageByCar = Partial<Record<CarId, Controller[]>>;

function emptyByCar(): GarageByCar {
  const next: GarageByCar = {};
  for (const car of ACTIVE_CARS) next[car.id] = [];
  return next;
}

function cloneGarage(list: Controller[]): Controller[] {
  return list.length === 0 ? EMPTY_GARAGE : list;
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

function readGarageByCar(active: CarId): GarageByCar {
  const byCar = emptyByCar();
  if (typeof window === "undefined") return byCar;

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return byCar;
    const parsed = JSON.parse(raw) as unknown;

    // New shape: { q50: [...], g37: [...] }
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const record = parsed as Record<string, unknown>;
      for (const car of ACTIVE_CARS) {
        const rows = hydrateControllers(record[car.id]);
        byCar[car.id] = rows.length === 0 ? [] : rows;
      }
      return byCar;
    }

    // Legacy single array → park under the active car so Q50/G37 can diverge after.
    const legacy = hydrateControllers(parsed);
    byCar[active] = legacy.length === 0 ? [] : legacy;
    return byCar;
  } catch {
    return byCar;
  }
}

function persistByCar(byCar: GarageByCar) {
  if (typeof window === "undefined") return;
  try {
    const payload: Record<string, unknown> = {};
    for (const car of ACTIVE_CARS) {
      payload[car.id] = persistable(byCar[car.id] ?? []);
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    /* ignore quota */
  }
}

let carSnapshot: CarId = SERVER_CAR;
let garageByCar: GarageByCar = emptyByCar();
let controllersSnapshot: Controller[] = EMPTY_GARAGE;

if (typeof window !== "undefined") {
  carSnapshot = readCar();
  garageByCar = readGarageByCar(carSnapshot);
  controllersSnapshot = cloneGarage(garageByCar[carSnapshot] ?? []);
  // Rewrite legacy array storage into the per-car map once.
  persistByCar(garageByCar);
  // Drop leftover sim-only legacy blobs that hydrated to empty.
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw && controllersSnapshot.length === 0 && raw.includes("sim-") && !raw.includes("q50")) {
      persistByCar(garageByCar);
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
  garageByCar = { ...garageByCar, [carSnapshot]: next };
  persistByCar(garageByCar);
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

/** Controllers saved for a car (active garage when car === getCar()). */
export function getControllersForCar(car: CarId): Controller[] {
  if (car === carSnapshot) return controllersSnapshot;
  return garageByCar[car] ?? EMPTY_GARAGE;
}

/** Device counts per active car — for garage picker labels. */
export function getVehicleDeviceCounts(): Record<CarId, number> {
  const counts = {} as Record<CarId, number>;
  for (const car of ACTIVE_CARS) {
    counts[car.id] = getControllersForCar(car.id).length;
  }
  return counts;
}

export function writeCar(next: CarId) {
  if (!isActiveCar(next)) return;
  if (next === carSnapshot) return;

  // Keep the outgoing car's kits as-is (already mirrored in garageByCar via writeGarage).
  garageByCar = { ...garageByCar, [carSnapshot]: controllersSnapshot };
  carSnapshot = next;
  controllersSnapshot = cloneGarage(garageByCar[next] ?? []);

  try {
    window.localStorage.setItem(CAR_STORAGE_KEY, next);
  } catch {
    /* ignore */
  }
  persistByCar(garageByCar);

  listeners.forEach((listener) => listener());
  carListeners.forEach((listener) => listener());
}
