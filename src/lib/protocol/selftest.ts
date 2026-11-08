import {
  encodeBrightness,
  encodeColor,
  encodeEffect,
  encodeEffectSpeed,
  encodePower,
  encodePowerSequence,
  encodeSolidColor,
  hexFrame,
  LEDDMX_MIC_OFF,
  LEDDMX_PATTERN_OFF,
} from "./frames.ts";
import { detectModel, FALLBACK_MODEL } from "./models.ts";
import { effectPeriodMs, paletteFor, paletteFromEffectName, sampleEffect, sampleLed } from "./preview.ts";
import { EFFECTS } from "./effects.ts";
import { hexToRgb, rgbToHex } from "../scenes.ts";

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
assert("detect LEDDMX", detectModel("LEDDMX-00-003C").id, "LEDDMX-00");
assert("fallback", detectModel("unknown").id, FALLBACK_MODEL.id);

const dmx = detectModel("LEDDMX-00-003C");
const dmxOn = encodePower(dmx, true);
assert(
  "LEDDMX power on frame",
  hexFrame(dmxOn),
  "7b ff 04 03 ff ff ff ff bf",
);
const dmxOff = encodePower(dmx, false);
assert(
  "LEDDMX power off frame",
  hexFrame(dmxOff),
  "7b ff 04 02 ff ff ff ff bf",
);
const dmxRed = encodeColor(dmx, { r: 255, g: 0, b: 0 });
assert(
  "LEDDMX red (RGB wire order)",
  hexFrame(dmxRed),
  "7b ff 07 ff 00 00 00 ff bf",
);
const dmxGreen = encodeColor(dmx, { r: 0, g: 255, b: 0 });
assert(
  "LEDDMX green (RGB wire order)",
  hexFrame(dmxGreen),
  "7b ff 07 00 ff 00 00 ff bf",
);
const dmxBlue = encodeColor(dmx, { r: 0, g: 0, b: 255 });
assert(
  "LEDDMX blue (RGB wire order)",
  hexFrame(dmxBlue),
  "7b ff 07 00 00 ff 00 ff bf",
);
assert(
  "LEDDMX pattern Off",
  hexFrame(encodeEffect(dmx, LEDDMX_PATTERN_OFF)),
  "7b ff 03 00 ff ff ff ff bf",
);
assert(
  "LEDDMX mic off",
  hexFrame(LEDDMX_MIC_OFF),
  "7b ff 0b 00 00 ff ff ff bf",
);
const dmxSolid = encodeSolidColor(dmx, { r: 255, g: 0, b: 0 }, 100);
assert("LEDDMX solid starts with power", hexFrame(dmxSolid[0]), "7b ff 04 03 ff ff ff ff bf");
assert("LEDDMX solid clears mic", hexFrame(dmxSolid[1]), "7b ff 0b 00 00 ff ff ff bf");
assert("LEDDMX solid clears pattern", hexFrame(dmxSolid[2]), "7b ff 03 00 ff ff ff ff bf");
assert("LEDDMX solid then color", hexFrame(dmxSolid[3]), "7b ff 07 ff 00 00 00 ff bf");
const dmxPowerOff = encodePowerSequence(dmx, false);
assert("LEDDMX power-off sequence length", String(dmxPowerOff.length), "4");
assert("LEDDMX power-off ends with off", hexFrame(dmxPowerOff[3]), "7b ff 04 02 ff ff ff ff bf");

assert("power on", hexFrame(encodePower(elk, true)), "7e 04 04 f0 00 01 ff 00 ef");
assert("power off", hexFrame(encodePower(elk, false)), "7e 04 04 00 00 00 ff 00 ef");
assert(
  "color red",
  hexFrame(encodeColor(elk, { r: 255, g: 0, b: 0 })),
  "7e 07 05 03 ff 00 00 0a ef",
);

const dim = encodeBrightness(elk, 50);
if (dim[3] !== 50) throw new Error(`brightness byte expected 50 got ${dim[3]}`);

const speedSlow = encodeEffectSpeed(elk, 0);
if (speedSlow[3] !== 0) throw new Error(`UI speed 0 should write 0 (slow), got ${speedSlow[3]}`);
const speedFast = encodeEffectSpeed(elk, 100);
if (speedFast[3] !== 100) throw new Error(`UI speed 100 should write 100 (fast), got ${speedFast[3]}`);

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

const yb = paletteFor(49);
if (yb.length !== 2 || yb[0].r < 200 || yb[1].b < 200 || yb[0].b > 80) {
  throw new Error(`Y-B Water palette should be yellow+blue, got ${JSON.stringify(yb)}`);
}
const rgbTrans = paletteFor(5);
if (rgbTrans.length !== 3 || rgbTrans[1].g < 180 || rgbTrans[2].b < 200) {
  throw new Error(`R-G-B Trans palette should be red+green+blue, got ${JSON.stringify(rgbTrans)}`);
}
const rgbTransBand = Array.from({ length: 20 }, (_, i) => sampleLed(5, i, 20, effectPeriodMs(5, 50) * 0.2, 50));
for (const led of rgbTransBand) {
  // Must stay on named stops — muddy yellow (high R+G, low B) means Trans is blending again.
  const muddyYellow = led.r > 160 && led.g > 160 && led.b < 90;
  const muddyCyan = led.g > 160 && led.b > 160 && led.r < 90;
  if (muddyYellow || muddyCyan) {
    throw new Error(`R-G-B Trans invented mid-hue ${JSON.stringify(led)} — should hard-switch R/G/B only`);
  }
}
const wrw = paletteFor(144);
if (wrw.length !== 3 || wrw[0].r < 250 || wrw[1].r < 200 || wrw[1].g > 80) {
  throw new Error(`W-R-W Flow Back palette should be white-red-white, got ${JSON.stringify(wrw)}`);
}
const greenRun = paletteFor(92);
if (greenRun.length !== 1 || greenRun[0].g < 180) {
  throw new Error(`Green Run Back palette should be green only, got ${JSON.stringify(greenRun)}`);
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
  if (!(a > b && b > c)) {
    throw new Error(`${motion}: speed 0 must be slowest (longer period), 100 fastest, got ${a}/${b}/${c}`);
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

const transId = 3; // 7-Color Trans
const transPeriod = effectPeriodMs(50, "trans");
const transLeft = sampleLed(transId, 2, 20, transPeriod * 0.12, 50);
const transRight = sampleLed(transId, 17, 20, transPeriod * 0.12, 50);
if (transLeft.r === transRight.r && transLeft.g === transRight.g && transLeft.b === transRight.b) {
  throw new Error("7-Color Trans should wipe — left and right LEDs must differ mid-transition");
}

const magicId = 1; // Magic Forward
const magicBackId = 2; // Magic Back
const magicPeriod = effectPeriodMs(50, "magic");
const magicMid = Array.from({ length: 20 }, (_, i) => sampleLed(magicId, i, 20, magicPeriod * 0.4, 50));
const magicLit = magicMid.filter((rgb) => rgb.r + rgb.g + rgb.b > 40);
if (magicLit.length < 18) throw new Error("Magic Forward should keep the ring lit — no fill-and-hold gap");
const magicKeys = new Set(magicLit.map((rgb) => `${rgb.r},${rgb.g},${rgb.b}`));
if (magicKeys.size < 3) throw new Error("Magic Forward should show several rainbow colors at once");
const magicLate = Array.from({ length: 20 }, (_, i) => sampleLed(magicId, i, 20, magicPeriod * 0.9, 50));
const magicLateLit = magicLate.filter((rgb) => rgb.r + rgb.g + rgb.b > 40).length;
if (magicLateLit < 18) throw new Error("Magic Forward should stay continuous at the end of a cycle, not snap dark");
const magicEarly = sampleLed(magicId, 4, 20, 0, 50);
const magicMoved = sampleLed(magicId, 4, 20, magicPeriod * 0.2, 50);
if (magicEarly.r === magicMoved.r && magicEarly.g === magicMoved.g && magicEarly.b === magicMoved.b) {
  throw new Error("Magic Forward should keep rotating instead of holding a painted ring");
}
const magicFwd = sampleLed(magicId, 4, 20, magicPeriod * 0.25, 50);
const magicBackMirror = sampleLed(magicBackId, 15, 20, magicPeriod * 0.25, 50);
if (magicFwd.r !== magicBackMirror.r || magicFwd.g !== magicBackMirror.g || magicFwd.b !== magicBackMirror.b) {
  throw new Error("Magic Back should rotate the same rainbow the other way");
}

const raceId = 77; // 7-Color Race
const racePeriod = effectPeriodMs(50, "race");
const raceBand = Array.from({ length: 20 }, (_, i) => sampleLed(raceId, i, 20, racePeriod * 0.45, 50));
const raceLeft = raceBand.slice(0, 6);
const raceRight = raceBand.slice(14);
const leftKey = `${raceLeft[2].r},${raceLeft[2].g},${raceLeft[2].b}`;
const rightKey = `${raceRight[2].r},${raceRight[2].g},${raceRight[2].b}`;
if (leftKey === rightKey) throw new Error("Color Race should keep a solid field while another color runs through");
const leftUniform = raceLeft.every((rgb) => `${rgb.r},${rgb.g},${rgb.b}` === leftKey);
const rightUniform = raceRight.every((rgb) => `${rgb.r},${rgb.g},${rgb.b}` === rightKey);
if (!leftUniform || !rightUniform) {
  throw new Error("Color Race should be two solids meeting at a running front, not a rainbow mix");
}

const rgbRace = 79; // R-G-B Race
const rgbBand = Array.from({ length: 20 }, (_, i) => sampleLed(rgbRace, i, 20, racePeriod * 0.4, 50));
const rgbKeys = new Set(rgbBand.map((rgb) => `${rgb.r},${rgb.g},${rgb.b}`));
if (rgbKeys.size < 2) throw new Error("R-G-B Race should show a takeover between two of red, green, and blue");
if (rgbKeys.size > 4) throw new Error("R-G-B Race should not sprinkle the whole rainbow; only the racing pair");

const toRed = sampleLed(9, 18, 20, 0, 50);
const toGreen = sampleLed(11, 18, 20, 0, 50);
if (!(toRed.r > toRed.g + 40 && toRed.r > toRed.b + 40)) {
  throw new Error("6-Color to Red should land on a red endcap");
}
if (!(toGreen.g > toGreen.r + 20 && toGreen.g > toGreen.b + 20)) {
  throw new Error("6-Color to Green should land on a green endcap");
}

for (const effect of EFFECTS) {
  for (const elapsed of [-2, -0.4, 0, 1, 40, 400, 4000]) {
    for (let i = 0; i < 20; i++) {
      const rgb = sampleLed(effect.id, i, 20, elapsed, 50);
      if (!Number.isFinite(rgb.r) || !Number.isFinite(rgb.g) || !Number.isFinite(rgb.b)) {
        throw new Error(`${effect.name} LED ${i} at ${elapsed}ms returned a non-finite color`);
      }
    }
  }
}

const ycpSwab = paletteFromEffectName("Open Curtain Swab Y C P");
if (
  ycpSwab.length !== 3 ||
  ycpSwab[0].r < 200 ||
  ycpSwab[0].g < 180 ||
  ycpSwab[1].g < 180 ||
  ycpSwab[1].b < 180 ||
  ycpSwab[2].b < 180
) {
  throw new Error(`YCP swab should be yellow/cyan/purple, got ${JSON.stringify(ycpSwab)}`);
}
const rgbSwab = paletteFromEffectName("Open Curtain Swab R G B");
if (rgbSwab.length !== 3 || rgbSwab[1].g < 180 || rgbSwab[2].b < 200) {
  throw new Error(`RGB swab should be red/green/blue, got ${JSON.stringify(rgbSwab)}`);
}
const sixBu = paletteFromEffectName("Forward 6 Colors BU");
if (sixBu.length < 6 || sixBu[sixBu.length - 1].b < 200) {
  throw new Error(`6 Colors BU should end on blue with a multi-stop palette, got ${JSON.stringify(sixBu)}`);
}
const flowWhRd = paletteFromEffectName("Forward Flow WH RD WH");
if (flowWhRd.length !== 3 || flowWhRd[1].r < 200 || flowWhRd[1].g > 80) {
  throw new Error(`Flow WH RD WH should be white-red-white, got ${JSON.stringify(flowWhRd)}`);
}
const runWhOnVt = paletteFromEffectName("Forward Run WH ON VT");
if (runWhOnVt.length !== 2 || runWhOnVt[0].b < 180 || runWhOnVt[1].r < 250) {
  throw new Error(`Run WH ON VT should be violet field + white head, got ${JSON.stringify(runWhOnVt)}`);
}
const sevenOnGn = paletteFromEffectName("Forward Run 7 COLOR ON GN");
if (sevenOnGn.length < 6 || sevenOnGn[0].g < 180) {
  throw new Error(`7 COLOR ON GN should start green then rainbow, got ${JSON.stringify(sevenOnGn)}`);
}

const shinnoRed = { r: 225, g: 6, b: 0 };
assert("hex roundtrip", rgbToHex(hexToRgb(rgbToHex(shinnoRed))!), "#e10600");
const shortHex = hexToRgb("#F00");
if (!shortHex || shortHex.r !== 255 || shortHex.g !== 0 || shortHex.b !== 0) {
  throw new Error("3-digit hex should expand");
}
if (hexToRgb("not-a-color") !== null) throw new Error("invalid hex should be null");

console.log("protocol tests passed");
