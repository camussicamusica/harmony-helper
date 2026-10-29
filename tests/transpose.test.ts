import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import {
  analysisFifths,
  analysisNotes,
  intervalForSemitones,
  soundingKeyLabel,
  soundingOf,
  summarizeTranspose,
  toConcert,
  transposeSpelled,
  writtenAndSounding,
} from "../src/lib/music/transpose";
import { buildKeySigView } from "../src/lib/music/analysis/keySignature";

describe("summarizeTranspose", () => {
  test("none, uniform and mixed", () => {
    expect(summarizeTranspose([]).kind).toBe("none");
    expect(summarizeTranspose([0, 0]).kind).toBe("none");
    expect(summarizeTranspose([-2])).toEqual({ parts: [-2], kind: "uniform", semitones: -2 });
    expect(summarizeTranspose([-2, -2]).kind).toBe("uniform");
    expect(summarizeTranspose([0, -2, -3])).toEqual({ parts: [0, -2, -3], kind: "mixed", semitones: 0 });
    expect(summarizeTranspose([0, -2]).kind).toBe("mixed");
  });
});

describe("spelling", () => {
  test("semitones to interval", () => {
    expect(intervalForSemitones(-2)).toBe("-2M");
    expect(intervalForSemitones(3)).toBe("3m");
    expect(intervalForSemitones(-12)).toBe("-8P");
    expect(intervalForSemitones(-14)).toBe("-9M");
    expect(intervalForSemitones(0)).toBe("1P");
  });
  test("B-flat trumpet sounds a major second lower", () => {
    expect(transposeSpelled("G5", -2)).toBe("F5");
    expect(transposeSpelled("C4", -2)).toBe("Bb3");
    expect(transposeSpelled("C#4", -2)).toBe("B3");
    expect(transposeSpelled("D", -2)).toBe("C");
    expect(transposeSpelled("G5", 0)).toBe("G5");
    expect(transposeSpelled("C4", -3)).toBe("A3"); // clarinet in A
  });
  test("keys", () => {
    expect(soundingKeyLabel("D", "major", -2)).toBe("Do mayor");
    expect(soundingKeyLabel("C", "major", -2)).toBe("Si♭ mayor");
    expect(soundingKeyLabel("A", "minor", -2)).toBe("Sol menor");
  });
});

describe("notes", () => {
  const g5 = { midi: 79, soundingMidi: 77, spelledName: "G" };
  test("sounding falls back to written", () => {
    expect(soundingOf(g5)).toBe(77);
    expect(soundingOf({ midi: 60 })).toBe(60);
  });
  test("panel texts", () => {
    expect(writtenAndSounding(g5)).toEqual({ written: "Sol5 (G5)", sounding: "Fa5 (F5)" });
    expect(writtenAndSounding({ midi: 60, soundingMidi: 60, spelledName: "C" })).toBeNull();
    expect(writtenAndSounding({ midi: 60, spelledName: "C" })).toBeNull();
  });
  test("concert note", () => {
    expect(toConcert(g5)).toEqual({ midi: 77, soundingMidi: 77, spelledName: "F" });
  });
  test("analysis uses written notes unless the parts are mixed", () => {
    const notes = [g5];
    expect(analysisNotes(notes, summarizeTranspose([-2]))).toBe(notes);
    expect(analysisNotes(notes, undefined)).toBe(notes);
    expect(analysisNotes(notes, summarizeTranspose([0, -2]))[0].midi).toBe(77);
    expect(analysisFifths(2, summarizeTranspose([-2]))).toBe(2);
    expect(analysisFifths(2, summarizeTranspose([0, -2]))).toBeNull();
  });
});

describe("key card text", () => {
  test("tag says where it sounds only when the part transposes", () => {
    const plain = buildKeySigView(2, "treble", null);
    expect(plain.tag).toBe("Re mayor · 2 ♯");
    const tpt = buildKeySigView(2, "treble", null, [], undefined, -2);
    expect(tpt.tag).toBe("Re mayor · 2 ♯ · suena en Do mayor");
  });
});

describe("Rimsky test scores", () => {
  const dir = "docs/research/partituras-prueba/";
  const chromatics = (file: string) =>
    [...readFileSync(dir + file, "utf8").matchAll(/<chromatic>(-?\d+)<\/chromatic>/g)].map((m) => Number(m[1]));
  test("the trumpet excerpt is one B-flat part", () => {
    expect(summarizeTranspose(chromatics("rimsky-094-trompeta-1.musicxml"))).toMatchObject({ kind: "uniform", semitones: -2 });
  });
  test("the orchestra mixes transposing and concert parts", () => {
    expect(summarizeTranspose(chromatics("rimsky-094-snegurochka-orquesta.musicxml")).kind).toBe("mixed");
  });
});
