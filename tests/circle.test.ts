import { describe, expect, test } from "bun:test";
import { resolutionArrows, ringAngle, ringSpelling, tritones } from "../src/lib/music/analysis/circle";
import { keyInfo } from "../src/lib/music/analysis/key";

const PC = { C: 0, Db: 1, D: 2, E: 4, F: 5, Fs: 6, G: 7, A: 9, B: 11 };

describe("ringAngle: the tonic sits at the bottom", () => {
  test("tonic = 90 degrees (bottom, SVG y down), whatever the key", () => {
    for (const tonicPc of [0, 5, 7, 8]) expect(ringAngle(tonicPc, tonicPc)).toBe(90);
  });
  test("each semitone up goes 30 degrees further round", () => {
    expect(ringAngle(8, 7)).toBe(120);
    expect(ringAngle(7 + 6, 7)).toBe(270);
  });
  test("wraps below the tonic (the leading tone is just before it)", () => {
    expect(ringAngle(PC.Fs, PC.G)).toBe(90 + 30 * 11);
  });
});

describe("ringSpelling follows the key", () => {
  const spell = (tonic: string) => ringSpelling(keyInfo(tonic, "major"), [], []);
  test("flats in F major", () => {
    const s = spell("F");
    expect(s[PC.Db]).toBe("Db");
    expect(s[3]).toBe("Eb");
    expect(s[PC.Fs]).toBe("Gb");
    expect(s[8]).toBe("Ab");
    expect(s[10]).toBe("Bb"); // in the key itself
  });
  test("sharps in G major", () => {
    const s = spell("G");
    expect(s[PC.Db]).toBe("C#");
    expect(s[3]).toBe("D#");
    expect(s[8]).toBe("G#");
    expect(s[PC.Fs]).toBe("F#"); // in the key itself
  });
  test("the key's own spelling wins for scale notes (La♭ mayor has no G#)", () => {
    expect(spell("Ab")[PC.G + 1]).toBe("Ab");
  });
  test("the chord's own spelling wins for chord notes", () => {
    const s = ringSpelling(keyInfo("C", "major"), ["Eb", "G", "Bb"], [3, 7, 10]);
    expect(s[3]).toBe("Eb");
    expect(s[10]).toBe("Bb");
  });
  test("always 12 names", () => {
    expect(spell("C")).toHaveLength(12);
  });
});

describe("resolutionArrows: D7 in G major", () => {
  const D7 = [PC.D, PC.Fs, PC.A, PC.C];
  const tonicTriad = [PC.G, PC.B, PC.D];
  const arrows = resolutionArrows(D7, PC.D, tonicTriad, PC.G);

  test("F# goes up to G (leading tone -> tonic)", () => {
    const a = arrows.find((x) => x.from === PC.Fs);
    expect(a).toMatchObject({ to: PC.G, emphasis: true });
  });
  test("C goes down to B (7th -> 3rd)", () => {
    const a = arrows.find((x) => x.from === PC.C);
    expect(a).toMatchObject({ to: PC.B, emphasis: true });
  });
  test("A is equally close to G and B, so no arrow is invented for it", () => {
    expect(arrows.find((x) => x.from === PC.A)).toBeUndefined();
  });
  test("D is already in the tonic chord, so it does not move", () => {
    expect(arrows.find((x) => x.from === PC.D)).toBeUndefined();
  });
  test("exactly two arrows", () => {
    expect(arrows).toHaveLength(2);
  });
});

describe("tritones", () => {
  test("D7 has one tritone: F# and C", () => {
    expect(tritones([PC.D, PC.Fs, PC.A, PC.C])).toEqual([[PC.Fs, PC.C]]);
  });
  test("a major triad has none", () => {
    expect(tritones([PC.G, PC.B, PC.D])).toEqual([]);
  });
  test("a diminished triad has one (B D F)", () => {
    expect(tritones([11, 2, 5])).toEqual([[11, 5]]);
  });
});
