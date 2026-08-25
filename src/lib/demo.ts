import { createController, type Controller } from "@/lib/controller";
import { detectModel } from "@/lib/protocol";
import type { ZoneKind } from "@/lib/catalog";

export const DEMO_DEVICES: { id: string; name: string; zone: ZoneKind }[] = [
  { id: "sim-emblem", name: "ELK-BLEDOM-EM01", zone: "emblem" },
  { id: "sim-mirrors", name: "ELK-BLEDOM-MR22", zone: "mirrors" },
  { id: "sim-bumper", name: "ELK-BLEDOB-BP08", zone: "bumper" },
  // Grille badge kit — restore when we have one to test:
  // { id: "sim-grille", name: "MELK-OA10-GB14", zone: "grille" },
];

export function createDemoControllers(): Controller[] {
  return DEMO_DEVICES.map((row) => ({
    ...createController({
      id: row.id,
      advertisedName: row.name,
      zone: row.zone,
      modelId: detectModel(row.name).id,
      transport: "simulator",
    }),
    connection: "connected",
    effectId: 1,
    effectSpeed: 42,
  }));
}
