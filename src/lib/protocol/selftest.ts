import {
  encodeBrightness,
  encodeColor,
  encodePower,
  hexFrame,
} from "./frames.ts";
import { detectModel, FALLBACK_MODEL } from "./models.ts";
import { effectPeriodMs, sampleEffect } from "./preview.ts";

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

const breathePeriod = effectPeriodMs(50, "breathe");
const breatheLow = sampleEffect(0x80, 0, 50);
const breathePeak = sampleEffect(0x80, breathePeriod / 2, 50);
if (breatheLow.r >= breathePeak.r) {
  throw new Error("red breathe should peak at mid-cycle");
}

const jumpA = sampleEffect(0x9d, 0, 50);
const jumpB = sampleEffect(0x9d, effectPeriodMs(50, "jump") / 7 + 1, 50);
if (jumpA.r === jumpB.r && jumpA.g === jumpB.g && jumpA.b === jumpB.b) {
  throw new Error("seven jump should change color across slices");
}

const strobeOff = sampleEffect(0x8b, effectPeriodMs(40, "blink") * 0.8, 40);
if (strobeOff.r + strobeOff.g + strobeOff.b !== 0) {
  throw new Error("red strobe should go dark in the off phase");
}

console.log("protocol tests passed");
