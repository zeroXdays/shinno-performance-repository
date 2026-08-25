export type ZoneKind = "emblem" | "mirrors" | "bumper" | "grille" | "custom";

export interface ShinnoProduct {
  id: ZoneKind;
  name: string;
  shortName: string;
  fitment: string;
  price: string;
  href: string;
  blurb: string;
}

export const SHINNO_PRODUCTS: ShinnoProduct[] = [
  {
    id: "emblem",
    name: "RGB LED Emblem",
    shortName: "Emblem",
    fitment: "Q50 2014–2024",
    price: "$134.99",
    href: "https://shinnoperformance.com/products/infiniti-q50-rgb-led-emblem-2014-2024",
    blurb: "Front badge replacement with Bluetooth RGB and weather-resistant housing.",
  },
  {
    id: "mirrors",
    name: "RGBW Side Mirror Lights",
    shortName: "Mirrors",
    fitment: "Q50 / Q60",
    price: "$134.99",
    href: "https://shinnoperformance.com/products/rgbw-side-mirror-lights-for-infiniti-q50-2014-2024",
    blurb: "Chasing RGBW plus a bright amber sequential turn signal.",
  },
  {
    id: "bumper",
    name: "RGB Bumper Lights",
    shortName: "Bumper",
    fitment: "Q50 2014–2024",
    price: "$119.99",
    href: "https://shinnoperformance.com/products/infiniti-q50-rgb-bumper-lights-2014-2024",
    blurb: "Lower fascia DRLs that sync with the rest of the front end.",
  },
  {
    id: "grille",
    name: "RGB Grille Badge",
    shortName: "Grille",
    fitment: "Q50 2014–2024",
    price: "$84.99",
    href: "https://shinnoperformance.com/products/rgb-illuminated-q50-grille-badge-2014-2024",
    blurb: "Smaller grille-mounted badge for a second lighting zone.",
  },
];

export const ZONE_HINTS: Record<ZoneKind, string> = {
  emblem: "Center of the grille. Usually one ELK-BLEDOM box behind the badge.",
  mirrors: "Left and right pods often share a single controller.",
  bumper: "Sport bumper sequential / DRL bars.",
  grille: "Secondary badge, often a smaller MELK or ELK module.",
  custom: "Any extra Lotus / Magic Lantern compatible box.",
};
