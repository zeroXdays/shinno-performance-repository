import {
  encodeBrightness,
  encodeColor,
  encodePower,
  hexFrame,
} from "./frames.ts";
import { detectModel, FALLBACK_MODEL } from "./models.ts";

function assert(name: string, actual: string, expected: string) {
  if (actual !== expected) {
    throw new Error(`${name}: expected "${expected}" got "${actual}"`);
  }
}

const elk = detectModel("ELK-BLEDOM-AABB");
assert("detect ELK-BLEDOM", elk.id, "ELK-BLEDOM");
assert("detect MELK", detectModel("MELK-OA10-XYZ").id, "MELK");
assert("detect BLEDOB", detectModel("ELK-BLEDOB").id, "ELK-BLEDOB");
assert("detect LEDBLE", detectModel("LEDBLE-01").id, "LEDBLE");
assert("fallback", detectModel("unknown").id, FALLBACK_MODEL.id);

assert("power on", hexFrame(encodePower(elk, true)), "7e 04 04 f0 00 01 ff 00 ef");
assert("power off", hexFrame(encodePower(elk, false)), "7e 04 04 00 00 00 ff 00 ef");
assert(
  "color red",
  hexFrame(encodeColor(elk, { r: 255, g: 0, b: 0 })),
  "7e 07 05 03 ff 00 00 0a ef",
);

const dim = encodeBrightness(elk, 50);
if (dim[3] !== 50) throw new Error(`brightness byte expected 50 got ${dim[3]}`);

console.log("protocol tests passed");
