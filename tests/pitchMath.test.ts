import { describe, expect, test } from "bun:test";
import { PitchDetector } from "pitchy";
import {
  PitchTracker,
  centsOff,
  clefForRange,
  freqToMidiFloat,
  median,
  nearestMidi,
  percentile,
  rangeFromFrames,
  staffStepFloat,
  type PitchFrame,
} from "../src/lib/pitch/pitchMath";
import { staffStep } from "../src/lib/music/staffMath";
import { midiLabel, nearestNatural } from "../src/lib/pitch/noteName";

const good = (t: number, freq: number): PitchFrame => ({ t, freq, clarity: 0.98, rms: 0.1 });
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12);

describe("conversions", () => {
  test("A4 = 440 is midi 69 with 0 cents", () => {
    expect(freqToMidiFloat(440)).toBeCloseTo(69, 9);
    expect(nearestMidi(freqToMidiFloat(440))).toBe(69);
    expect(centsOff(440, 69)).toBeCloseTo(0, 9);
  });
  test("446 Hz is about +23 cents", () => {
    expect(centsOff(446, 69)).toBeCloseTo(23.5, 0);
  });
  test("below the note is negative; C4 is 60", () => {
    expect(centsOff(430, 69)).toBeLessThan(0);
    expect(freqToMidiFloat(261.6256)).toBeCloseTo(60, 3);
  });
});

describe("median and percentile", () => {
  test("median odd, even, empty", () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 2, 3])).toBe(2.5);
    expect(median([])).toBeNaN();
  });
  test("percentile interpolates", () => {
    expect(percentile([0, 10], 50)).toBe(5);
    expect(percentile([1, 2, 3, 4, 5], 0)).toBe(1);
    expect(percentile([1, 2, 3, 4, 5], 100)).toBe(5);
  });
});

describe("PitchTracker gating", () => {
  test("low clarity is not heard", () => {
    const tr = new PitchTracker();
    expect(tr.push({ t: 0, freq: 220, clarity: 0.5, rms: 0.1 }).heard).toBe(false);
  });
  test("low rms is not heard", () => {
    const tr = new PitchTracker();
    expect(tr.push({ t: 0, freq: 220, clarity: 0.99, rms: 0.001 }).heard).toBe(false);
  });
  test("out of range and null are not heard", () => {
    const tr = new PitchTracker();
    expect(tr.push(good(0, 50)).heard).toBe(false);
    expect(tr.push(good(16, 1500)).heard).toBe(false);
    expect(tr.push({ t: 32, freq: null, clarity: 0, rms: 0.1 }).heard).toBe(false);
  });
  test("a good frame is heard with nearest and cents", () => {
    const r = new PitchTracker().push(good(0, 446));
    expect(r.heard).toBe(true);
    expect(r.nearest).toBe(69);
    expect(r.cents).toBeCloseTo(23.5, 0);
  });
});

describe("PitchTracker stability", () => {
  test("stable only after 150 ms on the same note", () => {
    const tr = new PitchTracker();
    let last = tr.push(good(0, 440));
    expect(last.stable).toBe(false);
    for (let t = 16; t < 140; t += 16) last = tr.push(good(t, 440));
    expect(last.stable).toBe(false);
    last = tr.push(good(160, 440));
    expect(last.stable).toBe(true);
  });
  test("changing note restarts stability", () => {
    const tr = new PitchTracker({ medianMs: 40 });
    for (let t = 0; t <= 200; t += 16) tr.push(good(t, 440));
    let r = tr.push(good(216, hz(72)));
    for (let t = 232; t < 280; t += 16) r = tr.push(good(t, hz(72)));
    expect(r.nearest).toBe(72);
    expect(r.stable).toBe(false);
  });
  test("a silence breaks stability", () => {
    const tr = new PitchTracker();
    for (let t = 0; t <= 200; t += 16) tr.push(good(t, 440));
    tr.push({ t: 216, freq: null, clarity: 0, rms: 0 });
    expect(tr.push(good(232, 440)).stable).toBe(false);
  });
  test("median smooths a vibrato blip", () => {
    const tr = new PitchTracker();
    let r = tr.push(good(0, 440));
    r = tr.push(good(16, 440));
    r = tr.push(good(32, 450));
    expect(r.cents).toBeCloseTo(0, 5); // median of 440, 440, 450
  });
});

describe("octave-jump rejection", () => {
  test("a single frame an octave up is dropped", () => {
    const tr = new PitchTracker();
    for (let t = 0; t < 100; t += 16) tr.push(good(t, 220));
    expect(tr.push(good(112, 440)).heard).toBe(false);
    const back = tr.push(good(128, 220));
    expect(back.heard).toBe(true);
    expect(back.nearest).toBe(57);
  });
  test("a jump that lasts 3 frames is accepted", () => {
    const tr = new PitchTracker();
    for (let t = 0; t < 100; t += 16) tr.push(good(t, 220));
    expect(tr.push(good(112, 880)).heard).toBe(false);
    expect(tr.push(good(128, 880)).heard).toBe(false);
    const r = tr.push(good(144, 880));
    expect(r.heard).toBe(true);
    expect(r.nearest).toBe(81);
  });
  test("the first note after a pause is never a jump", () => {
    const tr = new PitchTracker();
    for (let t = 0; t < 100; t += 16) tr.push(good(t, 110));
    tr.push({ t: 116, freq: null, clarity: 0, rms: 0 });
    expect(tr.push(good(700, 880)).heard).toBe(true);
  });
});

describe("rangeFromFrames", () => {
  const rep = (v: number, n: number) => Array.from({ length: n }, () => v);
  test("percentiles ignore outliers", () => {
    const low = [...rep(57, 100), 40, 41]; // a puff far below
    const high = [...rep(76, 100), 95, 96]; // a squeak far above
    expect(rangeFromFrames(low, high)).toEqual({ low: 57, high: 76 });
  });
  test("low is p5 of the low phase, high is p95 of the high phase", () => {
    const low = Array.from({ length: 100 }, (_, i) => 50 + i * 0.1); // 50..59.9
    const high = Array.from({ length: 100 }, (_, i) => 70 + i * 0.1);
    const r = rangeFromFrames(low, high)!;
    expect(r.low).toBe(50);
    expect(r.high).toBe(79);
    expect(r.low).toBe(Math.round(percentile(low, 5)));
    expect(r.high).toBe(Math.round(percentile(high, 95)));
  });
  test("null with less than 1 s in a phase", () => {
    expect(rangeFromFrames(rep(57, 30), rep(76, 100))).toBeNull();
    expect(rangeFromFrames(rep(57, 100), rep(76, 30))).toBeNull();
    expect(rangeFromFrames([], [])).toBeNull();
  });
  test("frame rate is a parameter", () => {
    expect(rangeFromFrames(rep(57, 40), rep(76, 40), { frameMs: 30 })).toEqual({ low: 57, high: 76 });
  });
  test("upside down is null", () => {
    expect(rangeFromFrames(rep(76, 100), rep(57, 100))).toBeNull();
  });
});

describe("clefForRange", () => {
  test("center at C4 or above is treble", () => {
    expect(clefForRange(57, 76)).toBe("treble"); // A3-E5, center 66.5
    expect(clefForRange(55, 65)).toBe("treble"); // center 60
    expect(clefForRange(40, 75)).toBe("bass"); // center 57.5
    expect(clefForRange(40, 60)).toBe("bass");
  });
});

describe("staffStepFloat", () => {
  test("naturals land on their step", () => {
    expect(staffStepFloat(64, "treble")).toBe(0); // E4
    expect(staffStepFloat(60, "treble")).toBe(staffStep("C4", "treble"));
    expect(staffStepFloat(43, "bass")).toBe(0); // G2 → no: G2 is midi 43
    expect(staffStepFloat(77, "treble")).toBe(staffStep("F5", "treble"));
  });
  test("sharps and fractions interpolate", () => {
    const c = staffStep("C4", "treble");
    const d = staffStep("D4", "treble");
    expect(staffStepFloat(61, "treble")).toBeCloseTo((c + d) / 2, 9);
    expect(staffStepFloat(60.25, "treble")).toBeCloseTo(c + (d - c) * 0.125, 9);
  });
  test("E to F is a semitone apart, one step", () => {
    expect(staffStepFloat(65, "treble") - staffStepFloat(64, "treble")).toBe(1);
    expect(staffStepFloat(64.5, "treble")).toBeCloseTo(0.5, 9);
  });
  test("black key between E-F neighbours: F#4 sits between F4 and G4", () => {
    expect(staffStepFloat(66, "treble")).toBeCloseTo(staffStep("F4", "treble") + 0.5, 9);
  });
});

describe("note names", () => {
  test("labels", () => {
    expect(midiLabel(62)).toBe("Re4 (D4)");
    expect(midiLabel(61)).toBe("Do#4 (C#4)");
    expect(midiLabel(57)).toBe("La3 (A3)");
  });
  test("nearestNatural", () => {
    expect(nearestNatural(62)).toBe(62);
    expect(nearestNatural(61)).toBe(60);
  });
});

describe("synthetic sines through pitchy", () => {
  const N = 2048;
  const SR = 44100;
  const detector = PitchDetector.forFloat32Array(N);
  const sine = (f: number) => Float32Array.from({ length: N }, (_, i) => 0.3 * Math.sin((2 * Math.PI * f * i) / SR));
  for (const f of [98, 220, 330]) {
    test(`${f} Hz within 5 cents, clarity > 0.9`, () => {
      const [pf, clarity] = detector.findPitch(sine(f), SR);
      expect(Math.abs(1200 * Math.log2(pf / f))).toBeLessThan(5);
      expect(clarity).toBeGreaterThan(0.9);
    });
  }
  test("white noise is not a note", () => {
    let seed = 12345;
    const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 2 ** 32) * 2 - 1;
    const noise = Float32Array.from({ length: N }, () => 0.3 * rnd());
    const [pf, clarity] = detector.findPitch(noise, SR);
    expect(clarity).toBeLessThan(0.9);
    const heard = new PitchTracker().push({ t: 0, freq: pf, clarity, rms: 0.17 }).heard;
    expect(heard).toBe(false);
  });
  test("a sine through the tracker names the note", () => {
    const [pf, clarity] = detector.findPitch(sine(220), SR);
    const r = new PitchTracker().push({ t: 0, freq: pf, clarity, rms: 0.2 });
    expect(r.nearest).toBe(57);
    expect(Math.abs(r.cents)).toBeLessThan(5);
  });
});
