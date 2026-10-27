/** Crop math for the hover panel's "photo" of a note: a window of the printed score around its figure. */

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CloseupInput {
  /** Centre of the hovered notehead, in the score SVG's own units. */
  cx: number;
  cy: number;
  /** Staff space (distance between two staff lines), same units. */
  sp: number;
  /** Top and bottom staff line of the note's staff. */
  staffTop: number;
  staffBottom: number;
  /** Vertical centres of the other noteheads in the same figure (the stacked chord / interval). */
  figureYs?: readonly number[];
}

export interface Closeup {
  viewBox: Box;
  /** Size of the drawn <svg> in px. */
  width: number;
  height: number;
  scale: number;
}

export const CLOSEUP_MAX_W = 220;
export const CLOSEUP_MAX_H = 140;
export const CLOSEUP_MAX_SCALE = 2.5;
/** Half the window width, in staff spaces. */
export const CLOSEUP_HALF_W_SP = 3.5;
/** Room kept above (stems of the top note reach about 3.5 spaces) and below the staff / figure, in staff spaces. */
export const CLOSEUP_PAD_TOP_SP = 3.5;
export const CLOSEUP_PAD_BOTTOM_SP = 1.5;

/**
 * Window around a note: about +-3.5 staff spaces sideways, the whole staff (all five lines) plus any ledger-line or
 * stacked notes of its figure vertically. Drawn at up to 2.5x, never beyond 220x140 px.
 */
export function closeupBox(i: CloseupInput): Closeup {
  const { cx, cy, sp } = i;
  const ys = [i.staffTop, i.staffBottom, cy, ...(i.figureYs ?? [])];
  const y0 = Math.min(...ys) - CLOSEUP_PAD_TOP_SP * sp;
  const y1 = Math.max(...ys) + CLOSEUP_PAD_BOTTOM_SP * sp;
  const w = 2 * CLOSEUP_HALF_W_SP * sp;
  const h = y1 - y0;
  const scale = Math.min(CLOSEUP_MAX_SCALE, CLOSEUP_MAX_W / w, CLOSEUP_MAX_H / h);
  return { viewBox: { x: cx - w / 2, y: y0, w, h }, width: Math.round(w * scale), height: Math.round(h * scale), scale };
}

/** A viewport (client) coordinate -> the SVG's user units, given its on-screen rect and its viewBox. */
export function clientToSvg(
  p: { x: number; y: number },
  svgRect: { left: number; top: number; width: number; height: number },
  vb: Box,
): { x: number; y: number } {
  return {
    x: vb.x + ((p.x - svgRect.left) * vb.w) / (svgRect.width || 1),
    y: vb.y + ((p.y - svgRect.top) * vb.h) / (svgRect.height || 1),
  };
}
