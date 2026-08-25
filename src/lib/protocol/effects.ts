export interface LedEffect {
  id: number;
  name: string;
  group: "breathe" | "blink" | "fade" | "jump";
}

export const EFFECTS: LedEffect[] = [
  { id: 0x87, name: "Crossfade", group: "breathe" },
  { id: 0x8a, name: "Seven breathe", group: "breathe" },
  { id: 0x80, name: "Red breathe", group: "breathe" },
  { id: 0x81, name: "Green breathe", group: "breathe" },
  { id: 0x82, name: "Blue breathe", group: "breathe" },
  { id: 0x83, name: "Amber breathe", group: "breathe" },
  { id: 0x84, name: "Ice breathe", group: "breathe" },
  { id: 0x85, name: "Violet breathe", group: "breathe" },
  { id: 0x86, name: "White breathe", group: "breathe" },
  { id: 0x93, name: "Seven fade", group: "fade" },
  { id: 0x94, name: "Red fade", group: "fade" },
  { id: 0x95, name: "Green fade", group: "fade" },
  { id: 0x96, name: "Blue fade", group: "fade" },
  { id: 0x9a, name: "Red-green fade", group: "fade" },
  { id: 0x9b, name: "Red-blue fade", group: "fade" },
  { id: 0x9c, name: "Green-blue fade", group: "fade" },
  { id: 0x9d, name: "Seven jump", group: "jump" },
  { id: 0x8b, name: "Red strobe", group: "blink" },
  { id: 0x8c, name: "Green strobe", group: "blink" },
  { id: 0x8d, name: "Blue strobe", group: "blink" },
  { id: 0x8e, name: "Amber strobe", group: "blink" },
  { id: 0x91, name: "White strobe", group: "blink" },
  { id: 0x92, name: "Seven strobe", group: "blink" },
];

export const EFFECT_GROUPS = [
  { id: "breathe", label: "Breathe" },
  { id: "fade", label: "Fade" },
  { id: "jump", label: "Jump" },
  { id: "blink", label: "Strobe" },
] as const;
