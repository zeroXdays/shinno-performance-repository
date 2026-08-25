export type ZoneKind = "emblem" | "mirrors" | "bumper" | "grille" | "custom";

export type CarId = "q50" | "q60" | "q70";

export interface CarBody {
  id: CarId;
  name: string;
  years: string;
}

export const CARS: CarBody[] = [
  { id: "q50", name: "Q50", years: "2014–2024" },
  { id: "q60", name: "Q60", years: "2017–2022" },
  { id: "q70", name: "Q70", years: "2015–2019" },
];

export const ZONES: { id: ZoneKind; label: string }[] = [
  { id: "emblem", label: "Emblem" },
  { id: "mirrors", label: "Mirrors" },
  { id: "bumper", label: "Bumper" },
  { id: "grille", label: "Grille" },
  { id: "custom", label: "Other" },
];
