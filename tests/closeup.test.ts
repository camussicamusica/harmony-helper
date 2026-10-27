import { describe, expect, test } from "bun:test";
import { clientToSvg, closeupBox } from "../src/lib/music/closeup";

describe("closeupBox", () => {
  const base = { cx: 100, cy: 50, sp: 10, staffTop: 30, staffBottom: 70 };
  test("about +-3.5 staff spaces wide, the whole staff plus padding tall", () => {
    const c = closeupBox(base);
    expect(c.viewBox).toEqual({ x: 65, y: -5, w: 70, h: 90 });
  });
  test("drawn at up to 2.5x but inside 220x140 px", () => {
    const c = closeupBox(base);
    expect(c.scale).toBeCloseTo(140 / 90, 5); // the height limit wins
    expect(c.height).toBe(140);
    expect(c.width).toBe(Math.round(70 * c.scale));
    const small = closeupBox({ ...base, sp: 4, staffTop: 42, staffBottom: 58, cy: 50 });
    expect(small.scale).toBe(2.5);
  });
  test("a stacked figure or ledger notes extend the window downward", () => {
    const c = closeupBox({ ...base, figureYs: [90] });
    expect(c.viewBox.y).toBe(-5);
    expect(c.viewBox.y + c.viewBox.h).toBe(105);
    expect(c.height).toBeLessThanOrEqual(140);
  });
  test("a note above the staff (ledger lines) extends it upward", () => {
    const c = closeupBox({ ...base, cy: 10 });
    expect(c.viewBox.y).toBe(-25);
  });
});

describe("clientToSvg", () => {
  test("maps through the viewBox scale and offset", () => {
    const r = { left: 10, top: 20, width: 200, height: 100 };
    expect(clientToSvg({ x: 110, y: 70 }, r, { x: 0, y: 0, w: 400, h: 200 })).toEqual({ x: 200, y: 100 });
    expect(clientToSvg({ x: 10, y: 20 }, r, { x: 5, y: 7, w: 400, h: 200 })).toEqual({ x: 5, y: 7 });
  });
});
