import {
  encodeBrightness,
  encodeColor,
  encodePower,
  hexFrame,
} from "./frames.ts";
import { detectModel, FALLBACK_MODEL } from "./models.ts";
import { effectPeriodMs, sampleEffect, sampleLed } from "./preview.ts";
import { EFFECTS } from "./effects.ts";

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

const flowPeriod = effectPeriodMs(50, "flow");
const flowA = sampleEffect(143, 0, 50);
const flowB = sampleEffect(143, flowPeriod / 2, 50);
if (flowA.r === flowB.r && flowA.g === flowB.g && flowA.b === flowB.b) {
  throw new Error("W-R-W flow should move between white and red");
}

const jumpA = sampleEffect(193, 0, 50);
const jumpB = sampleEffect(193, effectPeriodMs(50, "jump") / 7 + 1, 50);
if (jumpA.r === jumpB.r && jumpA.g === jumpB.g && jumpA.b === jumpB.b) {
  throw new Error("7-color jump should change color across slices");
}

const strobeOff = sampleEffect(196, effectPeriodMs(40, "strobe") * 0.8, 40);
if (strobeOff.r + strobeOff.g + strobeOff.b !== 0) {
  throw new Error("7-color strobe should go dark in the off phase");
}

const auto = EFFECTS.find((effect) => effect.id === 0);
if (!auto || auto.name !== "Auto Play" || auto.group !== "basic") {
  throw new Error("mode 0 should be Auto Play in basic");
}
if (EFFECTS.length !== 213) throw new Error(`expected 213 modes got ${EFFECTS.length}`);
const jumpLedA = sampleLed(193, 0, 20, 0, 50);
const jumpLedB = sampleLed(193, 10, 20, 0, 50);
if (!jumpLedA || !jumpLedB) throw new Error("sampleLed should return a color");

for (const motion of ["flush", "strobe", "magic", "energy", "flow"] as const) {
  const a = effectPeriodMs(0, motion);
  const b = effectPeriodMs(50, motion);
  const c = effectPeriodMs(100, motion);
  if (!(a < b && b < c)) {
    throw new Error(`${motion}: speed 0 must be fastest (shorter period), 100 slowest, got ${a}/${b}/${c}`);
  }
}

const flushId = 181; // 7-Color Flush
const flushPeriod = effectPeriodMs(40, "flush");
const flushBand = Array.from({ length: 20 }, (_, i) => sampleLed(flushId, i, 20, flushPeriod * 0.12, 40));
const flushLit = flushBand.filter((rgb) => rgb.r + rgb.g + rgb.b > 90).length;
if (flushLit === 20) throw new Error("flush must be a traveling wash, not a full-path blink");
if (flushLit < 2) throw new Error("flush wash should light a band of LEDs");

const energyA = sampleEffect(212, 0, 50);
const energyB = sampleEffect(212, effectPeriodMs(50, "energy") * 0.5, 50);
if (energyA.r + energyA.g + energyA.b === 0 || energyB.r + energyB.g + energyB.b === 0) {
  throw new Error("energy should pulse, not strobe to black");
}

const sevenInRed = 129; // 7-Color in Red Running
const sevenPeriod = effectPeriodMs(40, "run");
const sevenBand = Array.from({ length: 20 }, (_, i) => sampleLed(sevenInRed, i, 20, sevenPeriod * 0.18, 40));
const sevenKeys = new Set(sevenBand.map((rgb) => `${rgb.r},${rgb.g},${rgb.b}`));
if (sevenKeys.size < 3) {
  throw new Error("7-Color in Red Running should show colored heads on a red field, not a flat strip");
}
const sevenAllRed = sevenBand.every((rgb) => rgb.r > 180 && rgb.g < 90 && rgb.b < 90);
if (sevenAllRed) throw new Error("7-Color in Red Running must not paint red on red");

console.log("protocol tests passed");
