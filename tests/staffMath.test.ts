import { describe, expect, test } from "bun:test";
import { ledgerSteps, ledgerStepsForAll, parseSpelled, staffStep } from "../src/lib/music/staffMath";

describe("staffStep", () => {
  test("treble: E4 bottom line, F5 top line", () => {
    expect(staffStep("E4", "treble")).toBe(0);
    expect(staffStep("F5", "treble")).toBe(8);
    expect(staffStep("G4", "treble")).toBe(2);
    expect(staffStep("C4", "treble")).toBe(-2);
  });
  test("bass: G2 bottom line, A3 top line", () => {
    expect(staffStep("G2", "bass")).toBe(0);
    expect(staffStep("A3", "bass")).toBe(8);
    expect(staffStep("C4", "bass")).toBe(10);
  });
  test("accidentals do not move the head", () => {
    expect(staffStep("C#5", "treble")).toBe(staffStep("C5", "treble"));
    expect(staffStep("Bb3", "bass")).toBe(staffStep("B3", "bass"));
    expect(staffStep("Cb4", "treble")).toBe(staffStep("C4", "treble"));
  });
  test("unreadable -> NaN", () => {
    expect(Number.isNaN(staffStep("H4", "treble"))).toBe(true);
    expect(Number.isNaN(staffStep("D", "treble"))).toBe(true);
  });
  test("parseSpelled", () => {
    expect(parseSpelled("C#4")).toEqual({ letter: "C", accidental: "#", octave: 4 });
    expect(parseSpelled("Bbb3")).toEqual({ letter: "B", accidental: "bb", octave: 3 });
  });
});

describe("ledger lines", () => {
  test("none inside the staff or in the first space outside", () => {
    expect(ledgerSteps(0)).toEqual([]);
    expect(ledgerSteps(8)).toEqual([]);
    expect(ledgerSteps(-1)).toEqual([]);
    expect(ledgerSteps(9)).toEqual([]);
  });
  test("middle C in treble sits on one ledger line below", () => {
    expect(ledgerSteps(staffStep("C4", "treble"))).toEqual([-2]);
    expect(ledgerSteps(staffStep("B3", "treble"))).toEqual([-2]);
    expect(ledgerSteps(staffStep("A3", "treble"))).toEqual([-2, -4]);
  });
  test("above the staff", () => {
    expect(ledgerSteps(staffStep("A5", "treble"))).toEqual([10]);
    expect(ledgerSteps(staffStep("B5", "treble"))).toEqual([10]);
    expect(ledgerSteps(staffStep("C6", "treble"))).toEqual([10, 12]);
  });
  test("bass: middle C is one ledger above", () => {
    expect(ledgerSteps(staffStep("C4", "bass"))).toEqual([10]);
    expect(ledgerSteps(staffStep("E2", "bass"))).toEqual([-2]);
  });
  test("union", () => {
    expect(ledgerStepsForAll([-2, -4, 10, 0])).toEqual([-4, -2, 10]);
  });
});
