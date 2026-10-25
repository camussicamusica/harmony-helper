import { describe, expect, test } from "bun:test";
import { keyInfo } from "../src/lib/music/analysis/key";
import { advanceScale, checkTonicChord, scaleTargets, tonicTriadPcs } from "../src/lib/music/recorrido/midiChecks";

const G = keyInfo("G", "major");
const set = (...m: number[]) => new Set(m);

/** Plays a list of MIDI notes in order, returning the last state and every hint. */
function play(notes: number[], idx = 0) {
  const hints: Array<string | null> = [];
  for (const m of notes) {
    const r = advanceScale(G, idx, m);
    idx = r.idx;
    hints.push(r.hint);
  }
  return { idx, hints };
}

describe("scale check, G major", () => {
  test("the targets are G A B C D E F# G", () => {
    expect(scaleTargets(G)).toEqual([7, 9, 11, 0, 2, 4, 6, 7]);
  });

  test("playing the scale in order finishes after the octave (8 notes)", () => {
    const { idx, hints } = play([55, 57, 59, 60, 62, 64, 66, 67]);
    expect(idx).toBe(8);
    expect(hints.every((h) => h === null)).toBe(true);
  });

  test("any octave counts, even jumping between octaves", () => {
    expect(play([43, 69, 71, 48, 74, 40, 78, 91]).idx).toBe(8);
  });

  test("a wrong note gives a hint and does not reset", () => {
    const { idx, hints } = play([55, 57, 61]); // G A then C# instead of B
    expect(idx).toBe(2);
    expect(hints[2]).toBe("Esa es Do# (C#); ahora va Si (B).");
  });

  test("after a wrong note you can carry on from where you were", () => {
    expect(play([55, 57, 61, 59, 60, 62, 64, 66, 67]).idx).toBe(8);
  });

  test("a natural F where F# is needed gets the 'la escala usa' hint", () => {
    const { idx, hints } = play([55, 57, 59, 60, 62, 64, 65]);
    expect(idx).toBe(6);
    expect(hints[6]).toBe("Esa es Fa (F); la escala usa Fa# (F#).");
  });

  test("playing the previous note again is ignored, with no hint", () => {
    const { idx, hints } = play([55, 55]);
    expect(idx).toBe(1);
    expect(hints).toEqual([null, null]);
  });

  test("once done, further notes change nothing", () => {
    expect(advanceScale(G, 8, 61)).toEqual({ idx: 8, hint: null });
  });
});

describe("tonic chord check, G major", () => {
  test("the tonic triad is G B D", () => expect(tonicTriadPcs(G)).toEqual([7, 11, 2]));

  test("root position counts", () => {
    expect(checkTonicChord(G, set(55, 59, 62))).toEqual({ done: true, missing: [], extra: [] });
  });

  test("any inversion counts", () => {
    expect(checkTonicChord(G, set(59, 62, 67)).done).toBe(true); // 1st inversion
    expect(checkTonicChord(G, set(62, 67, 71)).done).toBe(true); // 2nd inversion
  });

  test("any voicing counts: wide spread and doubled notes", () => {
    expect(checkTonicChord(G, set(43, 55, 62, 71, 74, 79)).done).toBe(true);
  });

  test("a missing note is reported (no D)", () => {
    const r = checkTonicChord(G, set(55, 59, 67));
    expect(r.done).toBe(false);
    expect(r.missing).toEqual([2]);
    expect(r.extra).toEqual([]);
  });

  test("two notes are not enough", () => {
    const r = checkTonicChord(G, set(55, 59));
    expect(r.done).toBe(false);
    expect(r.missing).toEqual([2]);
  });

  test("an extra note is reported (a C on top)", () => {
    const r = checkTonicChord(G, set(55, 59, 62, 72));
    expect(r.done).toBe(false);
    expect(r.missing).toEqual([]);
    expect(r.extra).toEqual([0]);
  });

  test("a different chord reports both what is missing and what is extra", () => {
    const r = checkTonicChord(G, set(60, 64, 67)); // C major
    expect(r.done).toBe(false);
    expect(r.missing).toEqual([11, 2]);
    expect(r.extra).toEqual([0, 4]);
  });

  test("nothing pressed", () => {
    expect(checkTonicChord(G, set()).done).toBe(false);
  });
});
