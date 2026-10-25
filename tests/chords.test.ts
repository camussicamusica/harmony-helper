import { describe, expect, test } from "bun:test";
import { FUNCTION_SHORT, functionOf, scaleChords } from "../src/lib/music/analysis/chords";
import { keyInfo } from "../src/lib/music/analysis/key";

describe("diatonic chords of G major", () => {
  const triads = scaleChords(keyInfo("G", "major"));
  test("names", () => {
    expect(triads.map((c) => c.name)).toEqual([
      "Sol mayor", "La menor", "Si menor", "Do mayor", "Re mayor", "Mi menor", "Fa# disminuido",
    ]);
  });
  test("roman numerals", () => {
    expect(triads.map((c) => c.roman)).toEqual(["I", "ii", "iii", "IV", "V", "vi", "vii°"]);
  });
  test("qualities", () => {
    expect(triads.map((c) => c.quality)).toEqual(["major", "minor", "minor", "major", "major", "minor", "diminished"]);
  });
  test("sevenths: names, numerals, qualities", () => {
    const s = scaleChords(keyInfo("G", "major"), true);
    expect(s.map((c) => c.name)).toEqual([
      "Sol maj7", "La m7", "Si m7", "Do maj7", "Re7", "Mi m7", "Fa# m7♭5",
    ]);
    expect(s.map((c) => c.roman)).toEqual(["Imaj7", "ii7", "iii7", "IVmaj7", "V7", "vi7", "viiø7"]);
    expect(s.map((c) => c.quality)).toEqual(["major7", "minor7", "minor7", "major7", "dominant7", "minor7", "halfDim7"]);
  });
});

describe("diatonic chords of A minor (natural minor)", () => {
  const triads = scaleChords(keyInfo("A", "minor"));
  test("names", () => {
    expect(triads.map((c) => c.name)).toEqual([
      "La menor", "Si disminuido", "Do mayor", "Re menor", "Mi menor", "Fa mayor", "Sol mayor",
    ]);
  });
  test("roman numerals", () => {
    expect(triads.map((c) => c.roman)).toEqual(["i", "ii°", "III", "iv", "v", "VI", "VII"]);
  });
  test("qualities", () => {
    expect(triads.map((c) => c.quality)).toEqual(["minor", "diminished", "major", "minor", "minor", "major", "major"]);
  });
  test("sevenths", () => {
    const s = scaleChords(keyInfo("A", "minor"), true);
    expect(s.map((c) => c.name)).toEqual(["La m7", "Si m7♭5", "Do maj7", "Re m7", "Mi m7", "Fa maj7", "Sol7"]);
    expect(s.map((c) => c.roman)).toEqual(["i7", "iiø7", "IIImaj7", "iv7", "v7", "VImaj7", "VII7"]);
  });
});

describe("functions (Tónica / Subdominante / Dominante)", () => {
  test("major: I ii iii IV V vi vii° -> Tón Subd Tón Subd Dom Tón Dom", () => {
    const fns = scaleChords(keyInfo("G", "major")).map((c) => FUNCTION_SHORT[c.fn]);
    expect(fns).toEqual(["Tón", "Subd", "Tón", "Subd", "Dom", "Tón", "Dom"]);
  });
  test("minor: i ii° III iv v VI VII -> Tón Dom Tón Subd Dom Subd Dom", () => {
    const fns = scaleChords(keyInfo("A", "minor")).map((c) => FUNCTION_SHORT[c.fn]);
    expect(fns).toEqual(["Tón", "Dom", "Tón", "Subd", "Dom", "Subd", "Dom"]);
  });
  test("in minor, v is Dominante (Sofia's decision, 2026-10-24)", () => {
    expect(functionOf("minor", 4)).toBe("D");
    expect(FUNCTION_SHORT[functionOf("minor", 4)]).toBe("Dom");
  });
  test("short labels are never a single letter (a bare 'D' would be confused with the note Re)", () => {
    expect(FUNCTION_SHORT).toEqual({ T: "Tón", SD: "Subd", D: "Dom" });
    for (const label of Object.values(FUNCTION_SHORT)) expect(label.length).toBeGreaterThan(1);
  });
});
