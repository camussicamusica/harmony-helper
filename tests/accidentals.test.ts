import { describe, expect, test } from "bun:test";
import { accidentalOwners, keySigAccidentals } from "../src/lib/music/accidentals";

describe("keySigAccidentals", () => {
  test("D major: F# then C#, on the F and C lines (treble)", () => {
    const g = keySigAccidentals(2, "treble");
    expect(g.map((x) => x.pc)).toEqual([6, 1]);
    expect(g.map((x) => x.step)).toEqual([8, 5]); // F5 top line, C5 third space
    expect(g.every((x) => x.kind === "#")).toBe(true);
  });
  test("D major in the bass clef: F3 and C3 lines", () => {
    expect(keySigAccidentals(2, "bass").map((x) => x.step)).toEqual([6, 3]);
  });
  test("B-flat major: Bb then Eb", () => {
    const g = keySigAccidentals(-2, "treble");
    expect(g.map((x) => x.pc)).toEqual([10, 3]);
    expect(g.map((x) => x.step)).toEqual([4, 7]);
    expect(g.every((x) => x.kind === "b")).toBe(true);
  });
  test("bass flats", () => {
    expect(keySigAccidentals(-3, "bass").map((x) => x.step)).toEqual([2, 5, 1]);
  });
  test("C major has none; more than 7 is capped", () => {
    expect(keySigAccidentals(0, "treble")).toEqual([]);
    expect(keySigAccidentals(9, "treble")).toHaveLength(7);
  });
  test("every sharp key lists distinct pitch classes", () => {
    const pcs = keySigAccidentals(7, "treble").map((x) => x.pc);
    expect(new Set(pcs).size).toBe(7);
  });
});

describe("accidentalOwners", () => {
  const sp = 10;
  // two heads of a chord: upper at cy 50, lower at cy 80, both at x 100..112
  const heads = [
    { cy: 50, left: 100, right: 112 },
    { cy: 80, left: 100, right: 112 },
  ];
  test("a sharp left of the lower head belongs to it", () => {
    const mods = [{ cy: 80, left: 85, right: 95, w: 10 }];
    expect(accidentalOwners(heads, mods, sp)).toEqual([1]);
  });
  test("a sharp left of the upper head belongs to the upper one", () => {
    expect(accidentalOwners(heads, [{ cy: 51, left: 84, right: 94, w: 10 }], sp)).toEqual([0]);
  });
  test("a dot right of a head is not an accidental", () => {
    expect(accidentalOwners(heads, [{ cy: 50, left: 116, right: 119, w: 3 }], sp)).toEqual([-1]);
  });
  test("a narrow but tall sharp is still an accidental", () => {
    expect(accidentalOwners(heads, [{ cy: 80, left: 86, right: 93, w: 6.5, h: 25 }], sp)).toEqual([1]);
  });
  test("an accidental far from any head belongs to none", () => {
    expect(accidentalOwners(heads, [{ cy: 200, left: 85, right: 95, w: 10 }], sp)).toEqual([-1]);
  });
});

import { nearestMidiForPc } from "../src/lib/music/accidentals";
describe("nearestMidiForPc", () => {
  test("same pitch class returns the reference itself", () => {
    expect(nearestMidiForPc(6, 66)).toBe(66);
  });
  test("picks the closest octave, in either direction", () => {
    expect(nearestMidiForPc(0, 71)).toBe(72); // C near B4 -> C5
    expect(nearestMidiForPc(11, 60)).toBe(59); // B near C4 -> B3
    expect(nearestMidiForPc(7, 60)).toBe(55); // G3 is 5 away, G4 is 7
  });
});
