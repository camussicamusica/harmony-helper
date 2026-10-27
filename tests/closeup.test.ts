import { describe, expect, test } from "bun:test";
import {
  assignModifiers,
  clefForNote,
  clefGlyph,
  clientToSvg,
  closeupBox,
  ledgerLineYs,
  measuredStep,
  pickNearestStaff,
  pickStaffLines,
  placePanel,
  shouldFlip,
  spelledWithOctave,
  staffLineYs,
} from "../src/lib/music/closeup";

describe("closeupBox", () => {
  const base = { cx: 100, cy: 50, sp: 10, staffTop: 30, staffBottom: 70, clef: "bass" as const };
  test("tight: clef area + about 2 spaces each side of the head, clef anchored at the left edge", () => {
    const c = closeupBox(base);
    expect(c.viewBox.x).toBeCloseTo(100 - (2 + 2.6) * 10, 5);
    expect(c.viewBox.w).toBeCloseTo((2 + 2.6 + 1.9) * 10, 5);
    expect(c.clefX).toBeGreaterThan(c.viewBox.x);
    expect(c.clefX).toBeLessThan(c.viewBox.x + 10);
    expect(c.headY).toBeCloseTo((50 - c.viewBox.y) * c.scale, 5);
  });
  test("vertically: the staff plus the clef padding, treble needs more room than bass", () => {
    const b = closeupBox(base);
    expect(b.viewBox.y).toBeCloseTo(30 - 7, 5);
    expect(b.viewBox.y + b.viewBox.h).toBeCloseTo(70 + 7, 5);
    const t = closeupBox({ ...base, clef: "treble" });
    expect(t.viewBox.h).toBeGreaterThan(b.viewBox.h);
  });
  test("a small drawing: never beyond 150x120 px nor 2.5x", () => {
    const c = closeupBox(base);
    expect(c.width).toBeLessThanOrEqual(150);
    expect(c.height).toBeLessThanOrEqual(120);
    const small = closeupBox({ ...base, sp: 4, staffTop: 42, staffBottom: 58, cy: 50 });
    expect(small.scale).toBeLessThanOrEqual(2.5);
    expect(closeupBox({ ...base, sp: 1, staffTop: 48, staffBottom: 52, cy: 50 }).scale).toBe(2.5);
  });
  test("ledger-line notes extend the window; a long stem is cut to a normal length", () => {
    expect(closeupBox({ ...base, cy: 10 }).viewBox.y).toBeCloseTo(10 - 13, 5);
    const stem = closeupBox({ ...base, stemY: -200 });
    expect(stem.viewBox.y).toBeCloseTo(50 - 36 - 2, 5);
    const short = closeupBox({ ...base, stemY: 40 });
    expect(short.viewBox.y).toBeCloseTo(23, 5); // staff padding still wins
  });
});

describe("staff pieces", () => {
  test("five lines one space apart", () => {
    expect(staffLineYs(30, 10)).toEqual([30, 40, 50, 60, 70]);
  });
  test("measuredStep: bottom line 0, a space above 1, below the staff negative", () => {
    expect(measuredStep(70, 70, 10)).toBe(0);
    expect(measuredStep(65, 70, 10)).toBe(1);
    expect(measuredStep(90, 70, 10)).toBe(-4);
    expect(measuredStep(10, 70, 10)).toBe(12);
  });
  test("ledger lines only outside the staff", () => {
    expect(ledgerLineYs(50, 70, 10)).toEqual([]);
    expect(ledgerLineYs(75, 70, 10)).toEqual([]); // space below the bottom line
    expect(ledgerLineYs(80, 70, 10)).toEqual([80]); // on the first ledger line
    expect(ledgerLineYs(85, 70, 10)).toEqual([80]); // below it
    expect(ledgerLineYs(90, 70, 10)).toEqual([80, 90]);
    expect(ledgerLineYs(20, 70, 10)).toEqual([20]); // top: first ledger is 1 line above top (y=20)
  });
  test("pickStaffLines finds the five real lines among neighbours", () => {
    const ys = [511.4, 521.4, 531.4, 541.4, 551.4, 407.5, 413.5, 490];
    expect(pickStaffLines(ys, 10)).toEqual({ top: 511.4, bottom: 551.4 });
    expect(pickStaffLines([511.4, 521.4, 531.4], 10)).toBeNull();
    expect(pickStaffLines([511.4, 521.4, 531.4, 541.4, 551.4], 9.2)).toEqual({ top: 511.4, bottom: 551.4 }); // hint a bit off
    expect(pickStaffLines([511.4, 511.6, 521.4, 531.4, 541.4, 551.4], 10)).toEqual({ top: 511.4, bottom: 551.4 }); // duplicates collapse
  });
  test("pickNearestStaff: the staff of the head, not the one above or below it", () => {
    const treble = [343.5, 353.5, 363.5, 373.5, 383.5];
    const bass = [453.4, 463.4, 473.4, 483.4, 493.4];
    const ys = [...treble, ...bass];
    expect(pickNearestStaff(ys, 10.5, 493.4)).toEqual({ top: 453.4, bottom: 493.4 });
    expect(pickNearestStaff(ys, 10.5, 351)).toEqual({ top: 343.5, bottom: 383.5 });
    expect(pickNearestStaff(ys, 10.5, 503)).toEqual({ top: 453.4, bottom: 493.4 }); // a ledger-line note below
    expect(pickNearestStaff(ys, 10.5, 2000)).toBeNull();
    expect(pickNearestStaff([], 10, 5)).toBeNull();
  });
  test("clef glyphs", () => {
    expect(clefGlyph("treble", 70, 10).glyph).toBe("𝄞");
    expect(clefGlyph("bass", 70, 10).glyph).toBe("𝄢");
    expect(clefGlyph("treble", 70, 10).baseline).toBeGreaterThan(70);
    expect(clefGlyph("bass", 70, 10).baseline).toBeLessThan(70);
  });
});

describe("clef of a note", () => {
  test("spelling with octave from the sounding pitch", () => {
    expect(spelledWithOctave("G", 43)).toBe("G2");
    expect(spelledWithOctave("F#", 54)).toBe("F#3");
    expect(spelledWithOctave("Cb", 59)).toBe("Cb4"); // sounds as B3
    expect(spelledWithOctave("B#", 60)).toBe("B#3");
    expect(spelledWithOctave("H", 60)).toBeNull();
  });
  test("G2 measured on the second line of a bass staff -> bass", () => {
    expect(clefForNote("G", 43, 0, "L")).toBe("bass"); // G2 is the bottom line of the bass staff
    expect(clefForNote("G", 43, 0, "R")).toBe("bass"); // measurement beats the hand
  });
  test("E4 on the bottom line of a treble staff -> treble", () => {
    expect(clefForNote("E", 64, 0, "L")).toBe("treble");
  });
  test("neither clef agrees: the hand decides", () => {
    expect(clefForNote("G", 43, 7, "L")).toBe("bass");
    expect(clefForNote("G", 43, 7, "R")).toBe("treble");
    expect(clefForNote("??", 43, 0, "L")).toBe("bass");
  });
});

describe("assignModifiers: only the hovered head's own accidental and dot", () => {
  const sp = 10;
  // Two heads of a chord (a third apart), one dot next to each, an accidental before the upper one.
  const heads = [
    { cy: 100, left: 50, right: 62 },
    { cy: 80, left: 50, right: 62 },
  ];
  test("dots go to the head they sit beside, lifted dots on a line included", () => {
    const mods = [
      { cy: 100, left: 68, right: 71, w: 3 },
      { cy: 75, left: 68, right: 71, w: 3 }, // 80 - 5: dot of a note on a line
    ];
    expect(assignModifiers(heads, mods, sp)).toEqual([0, 1]);
  });
  test("an accidental left of the heads belongs to the nearest one", () => {
    expect(assignModifiers(heads, [{ cy: 82, left: 36, right: 46, w: 10 }], sp)).toEqual([1]);
    expect(assignModifiers(heads, [{ cy: 99, left: 36, right: 46, w: 10 }], sp)).toEqual([0]);
  });
  test("a dot on the wrong side or far away is nobody's", () => {
    expect(assignModifiers(heads, [{ cy: 100, left: 30, right: 33, w: 3 }], sp)).toEqual([-1]);
    expect(assignModifiers(heads, [{ cy: 140, left: 68, right: 71, w: 3 }], sp)).toEqual([-1]);
  });
});

describe("clientToSvg", () => {
  test("maps through the viewBox scale and offset", () => {
    const r = { left: 10, top: 20, width: 200, height: 100 };
    expect(clientToSvg({ x: 110, y: 70 }, r, { x: 0, y: 0, w: 400, h: 200 })).toEqual({ x: 200, y: 100 });
    expect(clientToSvg({ x: 10, y: 20 }, r, { x: 5, y: 7, w: 400, h: 200 })).toEqual({ x: 5, y: 7 });
  });
});

describe("placePanel: the photo's notehead is always at the tag's centre height", () => {
  const base = { photoBelow: 55, photoFromTop: 65, photoFromBottom: 200, cardH: 400, viewportH: 768, margin: 8 };
  test("plenty of room: normal layout, card top = tag - distance to the notehead", () => {
    const p = placePanel({ ...base, tagCenterY: 300 });
    expect(p.flipped).toBe(false);
    expect(p.top).toBe(235);
    expect(p.top + base.photoFromTop).toBe(300);
    expect(p.maxH).toBe(768 - 8 - 235);
  });
  test("the tag near the bottom (this was the bug): never moves the photo, flips instead", () => {
    const p = placePanel({ ...base, tagCenterY: 700, photoFromBottom: 65 });
    expect(p.flipped).toBe(true);
    const bottom = p.top + Math.min(400, p.maxH);
    expect(bottom - 65).toBe(700); // notehead = tag centre
    expect(p.top).toBeGreaterThanOrEqual(8);
  });
  test("flipped with a tall card: the card is capped at the viewport top and scrolls inside", () => {
    const p = placePanel({ ...base, tagCenterY: 700, photoFromBottom: 65, cardH: 2000 });
    expect(p.top).toBe(8);
    expect(p.maxH).toBe(700 + 65 - 8);
  });
  test("flip threshold: about 120 px must remain below the photo", () => {
    // photo bottom = tag + 55; viewport 768, margin 8 -> room = 705 - tag
    expect(shouldFlip(585, 55, 768)).toBe(false); // 120 px left
    expect(shouldFlip(586, 55, 768)).toBe(true);
  });
});
