import { describe, expect, test } from "bun:test";
import { ruleOfOctave, spelledWithOctave, stepSatisfied, voiceRuleOfOctave } from "../src/lib/music/analysis/ruleOfOctave";

type Key = Parameters<typeof ruleOfOctave>[0];
const D: Key = { tonic: "D", mode: "major" };
const Am: Key = { tonic: "A", mode: "minor" };
const C: Key = { tonic: "C", mode: "major" };
const F: Key = { tonic: "F", mode: "major" };

// Written by hand from the table: notes = bass first, then the rest going up from it.
const EXPECTED: Array<[string, Key, string[][]]> = [
  ["D major", D, [
    ["D", "F#", "A"], ["E", "G", "A", "C#"], ["F#", "A", "D"], ["G", "B", "D", "E"], ["A", "C#", "E"], ["B", "D", "G"], ["C#", "E", "G", "A"], ["D", "F#", "A"],
    ["D", "F#", "A"], ["C#", "E", "A"], ["B", "D", "E", "G#"], ["A", "C#", "E"], ["G", "A", "C#", "E"], ["F#", "A", "D"], ["E", "G", "A", "C#"], ["D", "F#", "A"],
  ]],
  ["A minor", Am, [
    ["A", "C", "E"], ["B", "D", "E", "G#"], ["C", "E", "A"], ["D", "F", "A", "B"], ["E", "G#", "B"], ["F#", "A", "D"], ["G#", "B", "D", "E"], ["A", "C", "E"],
    ["A", "C", "E"], ["G", "B", "E"], ["F", "A", "B", "D#"], ["E", "G#", "B"], ["D", "E", "G#", "B"], ["C", "E", "A"], ["B", "D", "E", "G#"], ["A", "C", "E"],
  ]],
  ["C major", C, [
    ["C", "E", "G"], ["D", "F", "G", "B"], ["E", "G", "C"], ["F", "A", "C", "D"], ["G", "B", "D"], ["A", "C", "F"], ["B", "D", "F", "G"], ["C", "E", "G"],
    ["C", "E", "G"], ["B", "D", "G"], ["A", "C", "D", "F#"], ["G", "B", "D"], ["F", "G", "B", "D"], ["E", "G", "C"], ["D", "F", "G", "B"], ["C", "E", "G"],
  ]],
  ["F major", F, [
    ["F", "A", "C"], ["G", "Bb", "C", "E"], ["A", "C", "F"], ["Bb", "D", "F", "G"], ["C", "E", "G"], ["D", "F", "Bb"], ["E", "G", "Bb", "C"], ["F", "A", "C"],
    ["F", "A", "C"], ["E", "G", "C"], ["D", "F", "G", "B"], ["C", "E", "G"], ["Bb", "C", "E", "G"], ["A", "C", "F"], ["G", "Bb", "C", "E"], ["F", "A", "C"],
  ]],
];

describe("ruleOfOctave: exact notes", () => {
  for (const [label, key, rows] of EXPECTED) {
    test(`${label}: 16 steps, notes and bass`, () => {
      const steps = ruleOfOctave(key);
      expect(steps.length).toBe(16);
      expect(steps.map((s) => s.notes)).toEqual(rows);
      expect(steps.map((s) => s.bass)).toEqual(rows.map((r) => r[0]));
      expect(steps.map((s) => s.upper)).toEqual(rows.map((r) => r.slice(1)));
    });
  }
  test("flats are spelled as flats and sharps as sharps", () => {
    const f = ruleOfOctave(F).flatMap((s) => s.notes);
    expect(f.some((n) => n.includes("#"))).toBe(false);
    expect(f).toContain("Bb");
    const d = ruleOfOctave(D).flatMap((s) => s.notes);
    expect(d.some((n) => n.includes("b"))).toBe(false);
    expect(d).toContain("F#");
  });
});

describe("ruleOfOctave: labels, names, figures", () => {
  test("D major functions up and down", () => {
    const fn = ruleOfOctave(D).map((s) => s.fn);
    expect(fn).toEqual([
      "Tón", "Dom", "Tón", "Subd", "Dom", "Subd", "Dom", "Tón",
      "Tón", "Dom", "Dom de la Dom", "Dom", "Dom", "Tón", "Dom", "Tón",
    ]);
  });
  test("A minor functions up and down", () => {
    const fn = ruleOfOctave(Am).map((s) => s.fn);
    expect(fn).toEqual([
      "Tón", "Dom", "Tón", "Subd", "Dom", "Subd", "Dom", "Tón",
      "Tón", "Dom", "Dom de la Dom", "Dom", "Dom", "Tón", "Dom", "Tón",
    ]);
  });
  test("chord names and figures in D major", () => {
    const s = ruleOfOctave(D);
    expect(s.map((x) => x.name)).toEqual([
      "Re", "La7/Mi", "Re/Fa♯", "Mi m7/Sol", "La", "Sol/Si", "La7/Do♯", "Re",
      "Re", "La/Do♯", "Mi7/Si", "La", "La7/Sol", "Re/Fa♯", "La7/Mi", "Re",
    ]);
    expect(s.map((x) => x.figure)).toEqual([
      "5/3", "4/3", "6", "6/5", "5/3", "6", "6/5", "5/3",
      "5/3", "6", "4/3", "5/3", "4/2", "6", "4/3", "5/3",
    ]);
    expect(s[10].roman).toBe("V4/3 de V");
    expect(s[10].leadsTo).toBe("A");
    expect(s[1].leadsTo).toBeUndefined();
  });
  test("A minor: IV is major, V is major, v6 coming down", () => {
    const s = ruleOfOctave(Am);
    expect(s[5].name).toBe("Re/Fa♯");
    expect(s[4].name).toBe("Mi");
    expect(s[1].name).toBe("Mi7/Si");
    expect(s[3].name).toBe("Si m7♭5/Re");
    expect(s[9].name).toBe("Mi menor/Sol");
    expect(s[12].name).toBe("Mi7/Re");
  });
  test("A minor descending degree 6 is the French sixth, literal intervals", () => {
    const st = ruleOfOctave(Am)[10];
    expect(st.bass).toBe("F");
    expect(st.notes).toEqual(["F", "A", "B", "D#"]);
    expect(st.fn).toBe("Dom de la Dom");
    expect(st.figure).toBe("♯6/4/3");
    expect(st.name).toContain("6.ª aumentada (francesa)");
    expect(st.leadsTo).toBe("E");
  });
  test("bass degrees walk 1..8 then 8..1", () => {
    expect(ruleOfOctave(D).map((s) => s.bassDegree)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 8, 7, 6, 5, 4, 3, 2, 1]);
    expect(ruleOfOctave(D).map((s) => s.dir)).toEqual([...Array(8).fill("sube"), ...Array(8).fill("baja")]);
  });
});

describe("voicing", () => {
  const steps = ruleOfOctave(D);
  const v = voiceRuleOfOctave(steps, "D");
  test("bass climbs an octave and comes back", () => {
    expect(v.map((x) => x.bass)).toEqual([38, 40, 42, 43, 45, 47, 49, 50, 50, 49, 47, 45, 43, 42, 40, 38]);
  });
  test("upper notes are close position in C3-B4 and keep their pitch classes", () => {
    steps.forEach((s, i) => {
      const u = v[i].upper;
      expect(u.length).toBe(s.upper.length);
      expect(Math.min(...u)).toBeGreaterThanOrEqual(48);
      expect(Math.max(...u)).toBeLessThanOrEqual(71);
      expect(Math.max(...u) - Math.min(...u)).toBeLessThan(12);
      expect(new Set(u.map((m) => m % 12))).toEqual(new Set(s.upper.map((n) => ({ D: 2, E: 4, "F#": 6, G: 7, A: 9, B: 11, "C#": 1, "G#": 8 }[n]!))));
    });
  });
  test("deterministic", () => {
    expect(voiceRuleOfOctave(ruleOfOctave(D), "D")).toEqual(v);
  });
  test("spelledWithOctave", () => {
    expect(spelledWithOctave("F#", 54)).toBe("F#3");
    expect(spelledWithOctave("Bb", 58)).toBe("Bb3");
    expect(spelledWithOctave("D#", 63)).toBe("D#4");
  });
});

describe("stepSatisfied", () => {
  const s = ruleOfOctave(D)[1]; // A7/E: upper G, A, C#
  test("needs every upper pitch class, any octave, bass optional, extras fine", () => {
    expect(stepSatisfied(s, [55, 57, 61])).toBe(true);
    expect(stepSatisfied(s, [40, 55, 69, 73])).toBe(true);
    expect(stepSatisfied(s, [55, 57])).toBe(false);
    expect(stepSatisfied(s, [])).toBe(false);
  });
});
