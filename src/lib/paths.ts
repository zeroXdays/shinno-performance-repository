import type { ZoneKind } from "./catalog";
import type { Rgb } from "./protocol";

export type PathRest = "off" | "dim";

export interface ZonePath {
  id: string;
  name: string;
  blurb: string;
  /** Ordered zone steps. Each step lights that zone (or zones). */
  steps: ZoneKind[][];
  rest: PathRest;
  /** Accent for the path tile. */
  swatch: Rgb;
}

/**
 * App-orchestrated zone chases. The phone times solid color/brightness writes;
 * firmware modes cannot travel across devices.
 */
export const ZONE_PATHS: ZonePath[] = [
  {
    id: "around",
    name: "Around",
    blurb: "Mirrors → emblem → bumper → emblem → mirrors",
    steps: [["mirrors"], ["emblem"], ["bumper"], ["emblem"], ["mirrors"]],
    rest: "off",
    swatch: { r: 196, g: 18, b: 32 },
  },
  {
    id: "front-rear",
    name: "Front–rear",
    blurb: "Emblem and bumper pulse as a pair",
    steps: [["emblem"], ["bumper"], ["emblem"], ["bumper"]],
    rest: "dim",
    swatch: { r: 40, g: 210, b: 255 },
  },
  {
    id: "wings",
    name: "Wings",
    blurb: "Mirrors flare, then the rest of the car",
    steps: [["mirrors"], ["mirrors", "emblem"], ["emblem", "bumper"], ["bumper"]],
    rest: "off",
    swatch: { r: 150, g: 40, b: 255 },
  },
  {
    id: "pulse",
    name: "Pulse",
    blurb: "All paired zones breathe together",
    steps: [["emblem", "mirrors", "bumper"], []],
    rest: "off",
    swatch: { r: 255, g: 150, b: 30 },
  },
  {
    id: "sweep",
    name: "Sweep",
    blurb: "One zone at a time across the garage",
    steps: [["mirrors"], ["emblem"], ["bumper"]],
    rest: "dim",
    swatch: { r: 80, g: 255, b: 90 },
  },
];

export function pathById(id: string): ZonePath | undefined {
  return ZONE_PATHS.find((path) => path.id === id);
}

/** UI speed 0 = slow, 100 = fast → dwell per step in ms. */
export function pathStepMs(speed: number): number {
  const t = 1 - Math.min(100, Math.max(0, speed)) / 100;
  return Math.round(220 + t * 780);
}

export function dimBrightness(brightness: number): number {
  return Math.max(4, Math.round(brightness * 0.12));
}
