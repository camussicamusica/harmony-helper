import { describe, expect, test } from "bun:test";
import { nearestNoteHit, type HeadBox } from "../src/lib/music/noteHit";

const SP = 10;
const head = (id: string, x: number, y: number, system = 0): HeadBox => ({ id, system, x, y, w: 13, h: 10 });
const id = (h: HeadBox | null) => h?.id ?? null;
const opts = { staffSpace: SP };

describe("nearestNoteHit", () => {
  const row = [head("a", 100, 50), head("b", 120, 50), head("c", 200, 50)];

  test("a pointer above the head, within 2 spaces, hits it", () => {
    expect(id(nearestNoteHit({ x: 100, y: 50 - 1.5 * SP }, row, opts))).toBe("a");
  });
  test("beyond the vertical reach is a miss", () => {
    expect(nearestNoteHit({ x: 100, y: 50 - 2 * SP - 6 }, row, opts)).toBeNull();
  });
  test("between two notes the nearer one wins", () => {
    expect(id(nearestNoteHit({ x: 107, y: 50 }, row, opts))).toBe("a");
    expect(id(nearestNoteHit({ x: 113, y: 50 }, row, opts))).toBe("b");
  });
  test("a pointer past the midpoint to the next note belongs to the next note", () => {
    expect(id(nearestNoteHit({ x: 100 + 2.4 * SP, y: 50 }, row, opts))).toBe("b");
  });
  test("far from every note is a miss", () => {
    expect(nearestNoteHit({ x: 160, y: 50 }, row, opts)).toBeNull();
    expect(nearestNoteHit({ x: 100, y: 400 }, row, opts)).toBeNull();
  });
  test("the cap stops the zone: past 2.5 spaces beyond the last note nothing is hit", () => {
    expect(id(nearestNoteHit({ x: 200 + 2.4 * SP, y: 50 }, row, opts))).toBe("c");
    expect(nearestNoteHit({ x: 200 + 2.6 * SP, y: 50 }, row, opts)).toBeNull();
  });
  test("chord: each tone owns its own band, by vertical distance", () => {
    const chord = [head("lo", 300, 80), head("mid", 300, 60), head("hi", 300, 40)];
    expect(id(nearestNoteHit({ x: 300, y: 82 }, chord, opts))).toBe("lo");
    expect(id(nearestNoteHit({ x: 305, y: 59 }, chord, opts))).toBe("mid");
    expect(id(nearestNoteHit({ x: 295, y: 36 }, chord, opts))).toBe("hi");
    expect(id(nearestNoteHit({ x: 300, y: 71 }, chord, opts))).toBe("lo");
    expect(id(nearestNoteHit({ x: 300, y: 69 }, chord, opts))).toBe("mid");
  });
  test("a displaced chord head belongs to the same column", () => {
    const chord = [head("a", 300, 50), head("b", 313, 45)];
    expect(id(nearestNoteHit({ x: 313, y: 44 }, chord, opts))).toBe("b");
    expect(id(nearestNoteHit({ x: 300, y: 52 }, chord, opts))).toBe("a");
  });
  test("two staves: zones stop at the midpoint between the staves", () => {
    const hs = [head("treble", 100, 60), head("bass", 100, 100)];
    const splits = new Map([[0, [80]]]);
    // 70 is nearer the treble head, 90 the bass head; both are inside the split's own side.
    expect(id(nearestNoteHit({ x: 100, y: 78 }, hs, { ...opts, splits }))).toBe("treble");
    expect(id(nearestNoteHit({ x: 100, y: 82 }, hs, { ...opts, splits }))).toBe("bass");
    // Treble note alone: pointer past the midpoint, within its 2 space reach, must not hit it.
    const lone = [head("treble", 100, 70), head("bass", 300, 130)];
    expect(nearestNoteHit({ x: 100, y: 85 }, lone, { ...opts, splits })).toBeNull();
    expect(id(nearestNoteHit({ x: 100, y: 85 }, lone, opts))).toBe("treble");
  });
  test("systems do not mix", () => {
    const hs = [head("s0", 100, 50, 0), head("s1", 100, 250, 1)];
    expect(id(nearestNoteHit({ x: 100, y: 245 }, hs, opts))).toBe("s1");
    expect(id(nearestNoteHit({ x: 100, y: 55 }, hs, opts))).toBe("s0");
    expect(nearestNoteHit({ x: 100, y: 150 }, hs, opts)).toBeNull();
  });
  test("empty input is a miss", () => {
    expect(nearestNoteHit({ x: 1, y: 1 }, [], opts)).toBeNull();
  });
});
