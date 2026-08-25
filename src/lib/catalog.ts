export type ZoneKind = "emblem" | "mirrors" | "bumper" | "grille" | "custom";

export type CarId = "q50" | "q60" | "q70";

export interface CarBody {
  id: CarId;
  name: string;
  years: string;
  enabled: boolean;
}

export const CARS: CarBody[] = [
  { id: "q50", name: "Q50", years: "2014–2024", enabled: true },
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
 * Typical garage:
 * - Emblem: ELK-BLEDOM
 * - Mirrors: ELK-BLEDOM or ELK-BLEDOB (one device for both housings)
 * - Bumper: ELK-BLEDOB or ELK-BLEDOM (one device for both sequentials)
 * - Grille badge: often MELK-OA10 — parked below until we have a kit to test
 */
export const ZONES: { id: ZoneKind; label: string }[] = [
  { id: "emblem", label: "Emblem" },
  { id: "mirrors", label: "Mirrors" },
  { id: "bumper", label: "Bumper" },
  // { id: "grille", label: "Grille" },
  { id: "custom", label: "Other" },
];

/** Tiles on the car stage. Grille is omitted until we can test a badge kit. */
export const STAGE_ZONES = ZONES.filter((zone) => zone.id !== "custom");

export const ASSIGNABLE_ZONES = ZONES;
