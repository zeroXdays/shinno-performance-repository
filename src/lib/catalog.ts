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

export const ZONES: { id: ZoneKind; label: string }[] = [
  { id: "emblem", label: "Emblem" },
  { id: "mirrors", label: "Mirrors" },
  { id: "bumper", label: "Bumper" },
  { id: "grille", label: "Grille" },
  { id: "custom", label: "Other" },
];
