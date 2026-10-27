import { describe, expect, test } from "bun:test";
import { anchorScroll, canStartEstudiarDrag, centerScroll, tocarPadY } from "../src/lib/music/panMath";

describe("centerScroll", () => {
  test("puts the middle of the band in the middle of the view", () => {
    expect(centerScroll({ bandStart: 400, bandEnd: 600, viewSize: 300, contentSize: 1000 })).toBe(350);
  });
  test("a band taller than the view is centered on its middle", () => {
    expect(centerScroll({ bandStart: 100, bandEnd: 900, viewSize: 300, contentSize: 1200 })).toBe(350);
  });
  test("clamps at both ends", () => {
    expect(centerScroll({ bandStart: 0, bandEnd: 50, viewSize: 300, contentSize: 1000 })).toBe(0);
    expect(centerScroll({ bandStart: 950, bandEnd: 1000, viewSize: 300, contentSize: 1000 })).toBe(700);
  });
  test("content smaller than the view: nothing to scroll", () => {
    expect(centerScroll({ bandStart: 10, bandEnd: 90, viewSize: 300, contentSize: 100 })).toBe(0);
  });
});

describe("anchorScroll", () => {
  const base = { viewSize: 1000, contentSize: 10000, origin: 300 };
  test("the point under the anchor stays under it", () => {
    // anchor at x=300 (now-line), scroll 500 -> point 500 into the content; content doubles -> point 1000
    expect(anchorScroll({ ...base, scroll: 500, oldSize: 4000, newSize: 8000, anchor: 300 })).toBe(1000);
  });
  test("zooming out brings it back", () => {
    expect(anchorScroll({ ...base, scroll: 1000, oldSize: 8000, newSize: 4000, anchor: 300 })).toBe(500);
  });
  test("viewport-center anchor", () => {
    // anchor 500, origin 16: point = 200 + 500 - 16 = 684; x1.5 -> 1026; scroll = 16 + 1026 - 500
    expect(anchorScroll({ viewSize: 1000, contentSize: 10000, origin: 16, scroll: 200, oldSize: 2000, newSize: 3000, anchor: 500 })).toBe(542);
  });
  test("same size: unchanged", () => {
    expect(anchorScroll({ ...base, scroll: 777, oldSize: 4000, newSize: 4000, anchor: 300 })).toBe(777);
  });
  test("clamps to the scrollable range", () => {
    expect(anchorScroll({ ...base, scroll: 9000, oldSize: 4000, newSize: 8000, anchor: 300 })).toBe(9000);
    expect(anchorScroll({ ...base, scroll: 0, oldSize: 4000, newSize: 2000, anchor: 900 })).toBe(0);
  });
  test("degenerate sizes keep the scroll", () => {
    expect(anchorScroll({ ...base, scroll: 500, oldSize: 0, newSize: 8000, anchor: 300 })).toBe(500);
  });
});

describe("estudiar drag rule", () => {
  test("space anywhere, or the mouse on empty space", () => {
    expect(canStartEstudiarDrag({ spaceHeld: true, onEmptySpace: false })).toBe(true);
    expect(canStartEstudiarDrag({ spaceHeld: false, onEmptySpace: true })).toBe(true);
    expect(canStartEstudiarDrag({ spaceHeld: false, onEmptySpace: false })).toBe(false);
  });
});

describe("tocarPadY", () => {
  test("half the view, never negative", () => {
    expect(tocarPadY(801)).toBe(401);
    expect(tocarPadY(-5)).toBe(0);
  });
});
