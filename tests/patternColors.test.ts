import { describe, expect, test } from "bun:test";
import {
  generatePalette,
  hueGap,
  hueOf,
  minNeighbourGap,
  padPalette,
  strongOf,
} from "../src/lib/music/analysis/patternColors";
import {
  applyPaletteToScore,
  getScoreColors,
  importProtoPalettes,
  loadDegradeOptions,
  loadPalettes,
  loadPatternOptions,
  paletteFor,
  PALETTES_KEY,
  PROTO_PALETTES_KEY,
  removePalette,
  rerollScoreColors,
  savePalette,
  savePatternOptions,
  SCORES_KEY,
  type KV,
} from "../src/lib/music/analysis/patternStore";

function fakeStorage(init: Record<string, string> = {}): KV & { data: Map<string, string> } {
  const data = new Map(Object.entries(init));
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
  };
}

describe("generatePalette", () => {
  test("gives n colors, valid hex, and the same seed gives the same colors", () => {
    const p = generatePalette(5, 123);
    expect(p).toHaveLength(5);
    for (const c of p) expect(c).toMatch(/^#[0-9A-F]{6}$/);
    expect(generatePalette(5, 123)).toEqual(p);
  });
  test("different seeds give different colors", () => {
    expect(generatePalette(4, 1)).not.toEqual(generatePalette(4, 2));
  });
  test("neighbouring patterns are never too close in hue, for any seed and 2-10 patterns", () => {
    for (let n = 2; n <= 10; n++) {
      for (let seed = 1; seed <= 60; seed++) {
        const hues = generatePalette(n, seed * 7919).map(hueOf);
        for (let i = 1; i < n; i++) {
          // Fitting the color into the screen range and rounding to 8-bit hex move a hue a few degrees.
          expect(hueGap(hues[i], hues[i - 1])).toBeGreaterThanOrEqual(minNeighbourGap(n) - 6);
        }
      }
    }
  });
  test("the hues are spread out, not bunched: no two are closer than half the even spacing", () => {
    for (let seed = 1; seed <= 30; seed++) {
      const hues = generatePalette(5, seed * 31).map(hueOf);
      for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) expect(hueGap(hues[i], hues[j])).toBeGreaterThan(36 - 4);
    }
  });
  test("the first pattern is not always the same hue", () => {
    const firsts = new Set<number>();
    for (let seed = 1; seed <= 20; seed++) firsts.add(Math.round(hueOf(generatePalette(3, seed)[0]) / 30));
    expect(firsts.size).toBeGreaterThan(3);
  });
  test("zero patterns, no colors", () => {
    expect(generatePalette(0, 5)).toEqual([]);
  });
  test("the border color keeps the hue and is darker", () => {
    const c = generatePalette(3, 9)[0];
    expect(hueGap(hueOf(strongOf(c)), hueOf(c))).toBeLessThan(15);
  });
});

describe("padPalette", () => {
  test("a longer combination is cut, a shorter one is filled with colors that are not close to the used ones", () => {
    expect(padPalette(["#AABBCC", "#CCBBAA", "#BBCCAA"], 2, 1)).toHaveLength(2);
    const padded = padPalette(["#F4A6A6", "#A6F4C8"], 4, 77);
    expect(padded).toHaveLength(4);
    expect(padded.slice(0, 2)).toEqual(["#F4A6A6", "#A6F4C8"]);
    expect(new Set(padded).size).toBe(4);
  });
});

describe("colors saved per score", () => {
  test("first view draws and saves; the same score gets the same colors again", () => {
    const kv = fakeStorage();
    const a = getScoreColors("abc", kv, () => 0.25);
    expect(kv.data.has(SCORES_KEY)).toBe(true);
    const b = getScoreColors("abc", kv, () => 0.9); // a different random must not matter now
    expect(b).toEqual(a);
    expect(paletteFor(3, b)).toEqual(paletteFor(3, a));
  });
  test("different scores get different draws", () => {
    const kv = fakeStorage();
    let r = 0.1;
    const rng = () => (r += 0.17) % 1;
    const a = getScoreColors("one", kv, rng);
    const b = getScoreColors("two", kv, rng);
    expect(paletteFor(4, a)).not.toEqual(paletteFor(4, b));
  });
  test("Otra combinación changes the colors of this score only, and the first one moves far in hue", () => {
    const kv = fakeStorage();
    const other = getScoreColors("other", kv, () => 0.5);
    const a = getScoreColors("abc", kv, () => 0.3);
    let r = 0.05;
    const next = rerollScoreColors("abc", 3, kv, () => (r += 0.211) % 1);
    expect(paletteFor(3, next)).not.toEqual(paletteFor(3, a));
    expect(hueGap(hueOf(paletteFor(3, next)[0]), hueOf(paletteFor(3, a)[0]))).toBeGreaterThanOrEqual(40);
    expect(getScoreColors("abc", kv)).toEqual(next); // it was saved
    expect(getScoreColors("other", kv)).toEqual(other);
  });
  test("a saved combination applied to a score is kept after reload, and wins over the draw", () => {
    const kv = fakeStorage();
    getScoreColors("abc", kv, () => 0.3);
    applyPaletteToScore("abc", ["#F4A6A6", "#A6F4C8"], kv);
    expect(paletteFor(2, getScoreColors("abc", kv))).toEqual(["#F4A6A6", "#A6F4C8"]);
  });
  test("a broken storage value does not crash, it just draws again", () => {
    const kv = fakeStorage({ [SCORES_KEY]: "{not json" });
    expect(Number.isFinite(getScoreColors("abc", kv).seed)).toBe(true);
  });
  test("with no storage at all it still works for the session", () => {
    expect(Number.isFinite(getScoreColors("abc", null).seed)).toBe(true);
  });
});

describe("saved combinations", () => {
  test("Me gusta esta saves, and the same combination is not saved twice", () => {
    const kv = fakeStorage();
    savePalette(["#F4A6A6", "#A6F4C8"], kv);
    savePalette(["#f4a6a6", "#a6f4c8"], kv);
    expect(loadPalettes(kv)).toEqual([["#F4A6A6", "#A6F4C8"]]);
  });
  test("a saved combination is never removed by anything except removePalette", () => {
    const kv = fakeStorage();
    savePalette(["#F4A6A6", "#A6F4C8"], kv);
    savePalette(["#AAC8F4", "#F4E0A6"], kv);
    getScoreColors("abc", kv);
    rerollScoreColors("abc", 2, kv);
    applyPaletteToScore("abc", ["#111111".replace("1", "A")], kv);
    expect(loadPalettes(kv)).toHaveLength(2);
    expect(removePalette(0, kv)).toEqual([["#AAC8F4", "#F4E0A6"]]);
  });
  test("the prototype's combinations are imported once and its own key is left alone", () => {
    const proto = JSON.stringify([["#F4A6A6", "#A6F4C8", "#AAC8F4"], ["not a color"]]);
    const kv = fakeStorage({ [PROTO_PALETTES_KEY]: proto });
    expect(importProtoPalettes(kv)).toBe(1);
    expect(loadPalettes(kv)).toEqual([["#F4A6A6", "#A6F4C8", "#AAC8F4"]]);
    expect(importProtoPalettes(kv)).toBe(0); // second time: nothing
    expect(kv.data.get(PROTO_PALETTES_KEY)).toBe(proto);
    // Remove it in the new list: it does not come back.
    removePalette(0, kv);
    expect(importProtoPalettes(kv)).toBe(0);
    expect(loadPalettes(kv)).toEqual([]);
  });
  test("with no prototype data yet, nothing happens and it can try again later", () => {
    const kv = fakeStorage();
    expect(importProtoPalettes(kv)).toBe(0);
    kv.setItem(PROTO_PALETTES_KEY, JSON.stringify([["#F4A6A6"]]));
    expect(importProtoPalettes(kv)).toBe(1);
  });
  test("junk in the saved list is ignored", () => {
    const kv = fakeStorage({ [PALETTES_KEY]: JSON.stringify([["#F4A6A6"], "x", [1, 2], []]) });
    expect(loadPalettes(kv)).toEqual([["#F4A6A6"]]);
  });
});

describe("layer options", () => {
  test("both layers start off", () => {
    const kv = fakeStorage();
    expect(loadPatternOptions(kv)).toEqual({ on: false, scope: "both", includeTransposed: false, intensity: 0.25 });
    expect(loadDegradeOptions(kv)).toEqual({ on: false, intensity: 0.35 });
  });
  test("what she chooses is remembered, and bad values fall back", () => {
    const kv = fakeStorage();
    savePatternOptions({ on: true, scope: "rh", includeTransposed: true, intensity: 0.4 }, kv);
    expect(loadPatternOptions(kv)).toEqual({ on: true, scope: "rh", includeTransposed: true, intensity: 0.4 });
    kv.setItem("hh.patterns.options.v1", JSON.stringify({ on: "yes", scope: "zzz", intensity: 9 }));
    expect(loadPatternOptions(kv)).toEqual({ on: false, scope: "both", includeTransposed: false, intensity: 0.6 });
  });
});
