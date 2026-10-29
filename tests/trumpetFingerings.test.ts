import { describe, expect, test } from "bun:test";
import { fingeringFor, registerBand, seriesFor, type Valves } from "../src/lib/trumpet/fingerings";

// Standard chart, research file section 3.4. midi: [label, partial, alternates as "label@partial"]
const CHART: Record<number, [string, number, string[]]> = {
  54: ["1-2-3", 2, []], 55: ["1-3", 2, []], 56: ["2-3", 2, []], 57: ["1-2", 2, ["3@2"]],
  58: ["1", 2, []], 59: ["2", 2, []], 60: ["0", 2, []],
  61: ["1-2-3", 3, []], 62: ["1-3", 3, []], 63: ["2-3", 3, []], 64: ["1-2", 3, ["3@3"]],
  65: ["1", 3, []], 66: ["2", 3, []], 67: ["0", 3, ["1-3@4"]],
  68: ["2-3", 4, []], 69: ["1-2", 4, ["3@4"]], 70: ["1", 4, []], 71: ["2", 4, ["1-3@5"]],
  72: ["0", 4, ["2-3@5"]], 73: ["1-2", 5, ["3@5"]], 74: ["1", 5, []], 75: ["2", 5, []], 76: ["0", 5, []],
  77: ["1", 6, []], 78: ["2", 6, []], 79: ["0", 6, []],
  80: ["2-3", 8, []], 81: ["1-2", 8, ["3@8"]], 82: ["1", 8, []], 83: ["2", 8, []], 84: ["0", 8, []],
};

const key = (a: { label: string; partial: number }) => `${a.label}@${a.partial}`;

describe("fingeringFor: standard chart F♯3 to C6", () => {
  for (const [m, [label, partial, alts]] of Object.entries(CHART)) {
    test(`written ${m}: ${label} on partial ${partial}`, () => {
      const f = fingeringFor(Number(m))!;
      expect(f.label).toBe(label);
      expect(f.partial).toBe(partial);
      expect(f.alternatives.map(key)).toEqual(alts);
      expect(f.reachable).toBe(true);
    });
  }

  test("covers all 31 notes", () => expect(Object.keys(CHART).length).toBe(31));

  test("valves array matches the label", () => {
    expect(fingeringFor(55)!.valves).toEqual([true, false, true]);
    expect(fingeringFor(60)!.valves).toEqual([false, false, false]);
    expect(fingeringFor(58)!.valves).toEqual([true, false, false]);
    expect(fingeringFor(59)!.valves).toEqual([false, true, false]);
  });

  test("never picks the flat 7th partial", () => {
    for (let m = 54; m <= 96; m++) expect(fingeringFor(m)!.partial).not.toBe(7);
  });
});

describe("slides", () => {
  test("F♯3, G3, C♯4 and D4 need the 3rd slide out", () => {
    for (const m of [54, 55, 61, 62]) expect(fingeringFor(m)!.slide).toBe("corredera 3ª afuera");
  });
  test("other notes have no slide advice", () => {
    for (const m of [56, 57, 60, 63, 64, 67, 72, 84]) expect(fingeringFor(m)!.slide).toBeUndefined();
  });
});

describe("alternates", () => {
  test("A in every octave can be played with 3 alone", () => {
    for (const m of [57, 69, 81]) expect(fingeringFor(m)!.alternatives[0].valves).toEqual([false, false, true]);
  });
  test("C♯5 prefers 1-2 (partial 5), with 3 as alternate", () => {
    const f = fingeringFor(73)!;
    expect(f.label).toBe("1-2");
    expect(f.alternatives[0].label).toBe("3");
  });
});

describe("above C6 (research notes)", () => {
  test("C♯6 = 1-2, D6 open, E♭6 = 2, E6 open, F6 = 1, F♯6 = 2, G6 open", () => {
    const got = [85, 86, 87, 88, 89, 90, 91].map((m) => fingeringFor(m)!.label);
    expect(got).toEqual(["1-2", "0", "2", "0", "1", "2", "0"]);
  });
  test("C7 (96) is open", () => expect(fingeringFor(96)!.label).toBe("0"));
});

describe("pedal tones and range", () => {
  test("pedal C3 is open on partial 1", () => {
    const f = fingeringFor(48)!;
    expect(f.label).toBe("0");
    expect(f.partial).toBe(1);
    expect(f.reachable).toBe(true);
  });
  test("pedal series goes down to F♯2 (42) with 1-2-3", () => {
    expect(fingeringFor(42)!.label).toBe("1-2-3");
    expect(fingeringFor(45)!.label).toBe("1-2");
  });
  test("gap notes 49–53 and below 42 are flagged unreachable", () => {
    for (const m of [49, 53, 41, 36]) expect(fingeringFor(m)!.reachable).toBe(false);
  });
  test("null outside 36–96", () => {
    for (const m of [35, 0, 97, 127, NaN]) expect(fingeringFor(m)).toBeNull();
    expect(fingeringFor(36)).not.toBeNull();
    expect(fingeringFor(96)).not.toBeNull();
  });
});

describe("seriesFor", () => {
  const v = (s: string): Valves => [s.includes("1"), s.includes("2"), s.includes("3")];
  // pedal, partials 2..8
  const SERIES: Record<string, number[]> = {
    "": [48, 60, 67, 72, 76, 79, 82, 84],
    "2": [47, 59, 66, 71, 75, 78, 81, 83],
    "1": [46, 58, 65, 70, 74, 77, 80, 82],
    "12": [45, 57, 64, 69, 73, 76, 79, 81],
    "23": [44, 56, 63, 68, 72, 75, 78, 80],
    "13": [43, 55, 62, 67, 71, 74, 77, 79],
    "123": [42, 54, 61, 66, 70, 73, 76, 78],
  };
  for (const [combo, notes] of Object.entries(SERIES)) {
    test(`valves ${combo || "open"}`, () => expect(seriesFor(v(combo))).toEqual(notes));
  }
  test("3 alone equals 1-2", () => expect(seriesFor([false, false, true])).toEqual(SERIES["12"]));
});

describe("registerBand", () => {
  test("edges", () => {
    expect(registerBand(36)).toBe(0);
    expect(registerBand(53)).toBe(0);
    expect(registerBand(54)).toBe(1);
    expect(registerBand(59)).toBe(1);
    expect(registerBand(60)).toBe(2);
    expect(registerBand(71)).toBe(2);
    expect(registerBand(72)).toBe(3);
    expect(registerBand(83)).toBe(3);
    expect(registerBand(84)).toBe(4);
    expect(registerBand(96)).toBe(4);
  });
});
