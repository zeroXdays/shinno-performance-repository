export type ZoneKind = "emblem" | "mirrors" | "bumper" | "grille" | "custom";

export type CarId = "q50" | "g37" | "q60" | "q70";

export interface CarBody {
  id: CarId;
  name: string;
  years: string;
  enabled: boolean;
}

export const CARS: CarBody[] = [
  { id: "q50", name: "Q50", years: "2014–2024", enabled: true },
  { id: "g37", name: "G37", years: "2008–2013", enabled: true },
  { id: "q60", name: "Q60", years: "2017–2022", enabled: false },
  { id: "q70", name: "Q70", years: "2015–2019", enabled: false },
];

export const ACTIVE_CARS = CARS.filter((car) => car.enabled);

export function isActiveCar(id: string): id is CarId {
  return ACTIVE_CARS.some((car) => car.id === id);
}

/**
 * Shinno RGB kits ship with Magic Lantern / Lotus Lamp X devices (same family as
 * Lotus Lantern). They advertise as ELK-BLEDOM, ELK-BLEDOB, MELK, or LEDBLE and
 * take the 9-byte frames in `src/lib/protocol`. There is no unique SKU per zone —
 * one device drives each kit. Pair by Bluetooth name, then assign the zone.
 *
 * Typical garage (Q50):
 * - Emblem: ELK-BLEDOM
 * - Mirrors: ELK-BLEDOM or ELK-BLEDOB (one device for both housings)
 * - Bumper: ELK-BLEDOB or ELK-BLEDOM (one device for both sequentials)
 * - Grille badge: often MELK-OA10 — parked below until we have a kit to test
 *
 * G37 currently ships emblem only — restore mirrors/bumper in KIT_ZONES_BY_CAR
 * when those kits are available.
 */
export const ZONES: { id: ZoneKind; label: string }[] = [
  { id: "emblem", label: "Emblem" },
  { id: "mirrors", label: "Mirrors" },
  { id: "bumper", label: "Bumper" },
  // { id: "grille", label: "Grille" },
  { id: "custom", label: "Other" },
];

/** Kit zones offered per car. Edit here to re-add G37 mirrors/bumper later. */
export const KIT_ZONES_BY_CAR: Record<CarId, ZoneKind[]> = {
  q50: ["emblem", "mirrors", "bumper"],
  g37: ["emblem"],
  q60: ["emblem", "mirrors", "bumper"],
  q70: ["emblem", "mirrors", "bumper"],
};

export function kitZonesForCar(car: CarId): ZoneKind[] {
  return KIT_ZONES_BY_CAR[car] ?? ["emblem"];
}

export function isKitZoneForCar(car: CarId, zone: ZoneKind): boolean {
  return kitZonesForCar(car).includes(zone);
}

/** Tiles on the car stage (no "Other"). */
export function stageZonesForCar(car: CarId) {
  const kit = new Set(kitZonesForCar(car));
  return ZONES.filter((zone) => kit.has(zone.id));
}

/** Zone picker options: kit zones + Other. */
export function assignableZonesForCar(car: CarId) {
  const kit = stageZonesForCar(car);
  const other = ZONES.find((zone) => zone.id === "custom");
  return other ? [...kit, other] : kit;
}

/** @deprecated Prefer stageZonesForCar(car) — kept for callers that are car-agnostic. */
export const STAGE_ZONES = ZONES.filter((zone) => zone.id !== "custom");

/** @deprecated Prefer assignableZonesForCar(car). */
export const ASSIGNABLE_ZONES = ZONES;
