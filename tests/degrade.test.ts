import { describe, expect, test } from "bun:test";
import {
  averageColor,
  buildBands,
  contrastWithBlack,
  gradientStops,
  maxIntensityForContrast,
  onPaper,
  type DegradeNote,
} from "../src/lib/music/analysis/degrade";

const RED = "#E53935";
const BLUE = "#1E5FBF";
const dn = (x: number, startSec: number, color: string | null, over: Partial<DegradeNote> = {}): DegradeNote => ({
  x, staff: 0, system: 0, startSec, endSec: startSec + 0.5, color, ...over,
});

describe("buildBands", () => {
  test("stops sit at the notehead x, in each note's own color", () => {
    const b = buildBands([dn(100, 0, RED), dn(180, 0.5, BLUE), dn(400, 1, RED)], { maxGapSec: 4 });
    expect(b).toHaveLength(1);
    expect(b[0].stops.map((s) => s.x)).toEqual([100, 180, 400]);
    expect(b[0].stops[0].color.toLowerCase()).toBe(RED.toLowerCase());
    expect(b[0].stops[1].color.toLowerCase()).toBe(BLUE.toLowerCase());
  });
  test("the stop does not depend on how long the note lasts", () => {
    const short = buildBands([dn(100, 0, RED), dn(180, 0.5, BLUE)], { maxGapSec: 4 });
    const long = buildBands([dn(100, 0, RED, { endSec: 0.5 }), dn(180, 0.5, BLUE, { endSec: 3 })], { maxGapSec: 4 });
    expect(short[0].stops.map((s) => s.x)).toEqual(long[0].stops.map((s) => s.x));
  });
  test("a chord is one stop with the average color of its notes", () => {
    const b = buildBands([dn(100, 0, RED), dn(101, 0, BLUE), dn(200, 1, RED)], { maxGapSec: 4 });
    expect(b[0].stops).toHaveLength(2);
    expect(b[0].stops[0].color).toBe(averageColor([RED, BLUE]));
    expect(b[0].stops[0].x).toBeCloseTo(100.5, 5);
  });
  test("the right hand and the left hand make separate bands", () => {
    const b = buildBands([dn(100, 0, RED), dn(100, 0, BLUE, { staff: 1 })], { maxGapSec: 4 });
    expect(b.map((x) => x.staff)).toEqual([0, 1]);
  });
  test("the band breaks at a line (system) change", () => {
    const b = buildBands([dn(100, 0, RED), dn(60, 1, BLUE, { system: 1 })], { maxGapSec: 4 });
    expect(b.map((x) => x.system)).toEqual([0, 1]);
  });
  test("the band breaks at a long silence and not at a short one", () => {
    const notes = [dn(100, 0, RED), dn(150, 1, BLUE), dn(600, 9, RED)];
    expect(buildBands(notes, { maxGapSec: 4 })).toHaveLength(2);
    expect(buildBands(notes, { maxGapSec: 20 })).toHaveLength(1);
  });
  test("a long note counts as sound: no break while it rings", () => {
    const notes = [dn(100, 0, RED, { endSec: 9 }), dn(600, 9.5, BLUE)];
    expect(buildBands(notes, { maxGapSec: 4 })).toHaveLength(1);
  });
  test("a note whose color is off adds no stop; a band with only those has no band", () => {
    const b = buildBands([dn(100, 0, RED), dn(150, 0.5, null), dn(200, 1, BLUE)], { maxGapSec: 4 });
    expect(b[0].stops.map((s) => s.x)).toEqual([100, 200]);
    expect(buildBands([dn(100, 0, null)], { maxGapSec: 4 })).toEqual([]);
  });
  test("the band reaches a bit past the first and last note", () => {
    const b = buildBands([dn(100, 0, RED), dn(200, 1, BLUE)], { maxGapSec: 4, padPx: 20 });
    expect([b[0].x0, b[0].x1]).toEqual([80, 220]);
  });
});

describe("gradientStops", () => {
  test("transparent at both edges, full color at each note, offsets in order", () => {
    const b = buildBands([dn(100, 0, RED), dn(200, 1, BLUE)], { maxGapSec: 4, padPx: 20 });
    const g = gradientStops(b[0]);
    expect(g.map((s) => s.opacity)).toEqual([0, 1, 1, 0]);
    expect(g[0].offset).toBe(0);
    expect(g[g.length - 1].offset).toBe(1);
    expect(g[1].offset).toBeCloseTo(20 / 140, 5);
    expect(g[2].offset).toBeCloseTo(120 / 140, 5);
  });
});

describe("readability of black noteheads", () => {
  test("black on white is 21:1", () => {
    expect(contrastWithBlack("#FFFFFF")).toBeCloseTo(21, 3);
  });
  test("a color at 100% over white keeps its own contrast; at 0% it is the paper", () => {
    expect(onPaper(RED, 0)).toBe("#ffffff");
    expect(onPaper(RED, 1).toLowerCase()).toBe(RED.toLowerCase());
  });
  test("the 12 factory note colors at the default 35% are all at least 4.5:1", () => {
    const factory = ["#E53935", "#C62E2B", "#F9C81E", "#C2A11A", "#7EC8F2", "#8B5A2B", "#6B4620", "#1E5FBF", "#174B97", "#F06292", "#C0507A", "#8E24AA"];
    for (const c of factory) expect(contrastWithBlack(onPaper(c, 0.35))).toBeGreaterThanOrEqual(4.5);
    expect(maxIntensityForContrast(factory)).toBeGreaterThanOrEqual(0.35);
  });
  test("a very dark color caps the intensity so black notes stay readable", () => {
    const cap = maxIntensityForContrast(["#000000", "#10204A"]);
    expect(cap).toBeGreaterThan(0.3);
    expect(cap).toBeLessThan(1);
    expect(contrastWithBlack(onPaper("#000000", cap))).toBeGreaterThanOrEqual(4.49);
    // Just above the cap it would fail.
    expect(contrastWithBlack(onPaper("#000000", Math.min(1, cap + 0.05)))).toBeLessThan(4.5);
  });
  test("light colors need no cap", () => {
    expect(maxIntensityForContrast(["#F9C81E", "#7EC8F2"])).toBe(1);
  });
});
