import { describe, expect, test } from "bun:test";
import { ALL_KEY_IDS, KK_MAJOR, KK_MINOR, detectKey, keyFromId, keyInfo, type KeyMode } from "../src/lib/music/analysis/key";
import { SAMPLE_MUSICXML } from "../src/lib/music/sampleScore";

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** A "perfect" histogram for a key: the Krumhansl profile shifted so the tonic sits on `tonicPc`. */
function idealHistogram(tonicPc: number, mode: KeyMode): number[] {
  const prof = mode === "major" ? KK_MAJOR : KK_MINOR;
  return prof.map((_, pc) => prof[mod12(pc - tonicPc)]);
}

/** Duration-weighted pitch-class histogram read straight from the sample's XML text (no XML parser needed). */
function sampleHistogram(): number[] {
  const hist = new Array(12).fill(0);
  const STEP_PC: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  for (const m of SAMPLE_MUSICXML.matchAll(/<note>([\s\S]*?)<\/note>/g)) {
    const body = m[1];
    const step = /<step>([A-G])<\/step>/.exec(body)?.[1];
    if (!step) continue; // a rest
    const alter = Number(/<alter>(-?\d+)<\/alter>/.exec(body)?.[1] ?? 0);
    const dur = Number(/<duration>(\d+)<\/duration>/.exec(body)![1]);
    hist[mod12(STEP_PC[step] + alter)] += dur;
  }
  return hist;
}

describe("detectKey: which key is this music in?", () => {
  test("C major", () => {
    const r = detectKey(idealHistogram(0, "major"), { fifths: 0 });
    expect(r.best.key.id).toBe("C major");
    expect(r.best.key.fifths).toBe(0);
    expect(r.confidenceWord).toBe("bastante seguro");
  });

  test("A minor (not confused with its relative, C major)", () => {
    const r = detectKey(idealHistogram(9, "minor"), { fifths: 0 });
    expect(r.best.key.id).toBe("A minor");
    expect(r.best.key.label).toBe("La menor");
  });

  test("A flat major has signature -4 and is spelled with flats", () => {
    const r = detectKey(idealHistogram(8, "major"), { fifths: -4 });
    expect(r.best.key.id).toBe("Ab major");
    expect(r.best.key.fifths).toBe(-4);
    expect(r.best.key.label).toBe("La♭ mayor");
  });

  test("E major has signature +4", () => {
    const r = detectKey(idealHistogram(4, "major"), { fifths: 4 });
    expect(r.best.key.id).toBe("E major");
    expect(r.best.key.fifths).toBe(4);
  });

  test("the bundled sample (Bach Minuet) is G major, signature +1", () => {
    const r = detectKey(sampleHistogram(), { fifths: 1 });
    expect(r.best.key.id).toBe("G major");
    expect(r.best.key.fifths).toBe(1);
    expect(r.best.key.label).toBe("Sol mayor");
    expect(r.mode.differs).toBe(false);
  });

  test("the key signature breaks a tie between enharmonic spellings (Gb vs F#)", () => {
    expect(detectKey(idealHistogram(6, "major"), { fifths: -6 }).best.key.id).toBe("Gb major");
    expect(detectKey(idealHistogram(6, "major"), { fifths: 6 }).best.key.id).toBe("F# major");
  });

  test("a flat, ambiguous histogram gives low confidence", () => {
    const r = detectKey(new Array(12).fill(1));
    expect(r.confidence).toBeLessThan(0.3);
    expect(r.confidenceWord).toBe("dudoso");
  });

  test("a clear piece gives high confidence", () => {
    expect(detectKey(idealHistogram(0, "major"), { fifths: 0 }).confidence).toBeGreaterThan(0.8);
  });
});

describe("keyInfo: spelling and key signature", () => {
  test("La♭ mayor is La♭ Si♭ Do Re♭ Mi♭ Fa Sol, with no G#", () => {
    const k = keyInfo("Ab", "major");
    expect(k.notes).toEqual(["Ab", "Bb", "C", "Db", "Eb", "F", "G"]);
    expect(k.notes).not.toContain("G#");
    expect(k.notes.some((n) => n.includes("#"))).toBe(false);
  });

  test("fifths: the key signature of each key (recent bug fix, keep guarded)", () => {
    expect(keyInfo("Ab", "major").fifths).toBe(-4);
    expect(keyInfo("G", "major").fifths).toBe(1);
    expect(keyInfo("F#", "major").fifths).toBe(6);
    expect(keyInfo("Gb", "major").fifths).toBe(-6);
    expect(keyInfo("C", "minor").fifths).toBe(-3);
    expect(keyInfo("C", "major").fifths).toBe(0);
    expect(keyInfo("A", "minor").fifths).toBe(0);
  });

  test("all 24 keys have the right signature (circle of fifths)", () => {
    const expected: Record<string, number> = {
      "C major": 0, "Db major": -5, "D major": 2, "Eb major": -3, "E major": 4, "F major": -1,
      "F# major": 6, "G major": 1, "Ab major": -4, "A major": 3, "Bb major": -2, "B major": 5,
      "C minor": -3, "C# minor": 4, "D minor": -1, "Eb minor": -6, "E minor": 1, "F minor": -4,
      "F# minor": 3, "G minor": -2, "G# minor": 5, "A minor": 0, "Bb minor": -5, "B minor": 2,
    };
    expect(ALL_KEY_IDS).toHaveLength(24);
    for (const id of ALL_KEY_IDS) expect([id, keyFromId(id)!.fifths]).toEqual([id, expected[id]]);
  });

  test("keyFromId round-trips and rejects nonsense", () => {
    expect(keyFromId("Ab major")?.fifths).toBe(-4);
    expect(keyFromId("banana")).toBeNull();
    expect(keyFromId("H major")).toBeNull();
  });
});
