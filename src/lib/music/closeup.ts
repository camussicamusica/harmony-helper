/**
 * Math for the hover panel's "photo" of a note: the note ALONE on a bare staff (5 lines, its own ledger lines,
 * a small clef), cropped tight around it. All pure; the DOM work lives in ScoreView.
 */

import { ledgerSteps, parseSpelled, staffStep, type Clef } from "@/lib/music/staffMath";

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
  clef: Clef;
  /** Far end of the note's stem (y, same units), when it has one. Clamped to a normal stem length. */
  stemY?: number;
}

export interface Closeup {
  viewBox: Box;
  /** Size of the drawn <svg> in px. */
  width: number;
  height: number;
  scale: number;
  /** Left edge (svg units) where the clef is drawn. */
  clefX: number;
  /** Distance (px) from the drawn svg's top edge to the notehead's centre. */
  headY: number;
}

export const CLOSEUP_MAX_W = 150;
export const CLOSEUP_MAX_H = 120;
export const CLOSEUP_MAX_SCALE = 2.5;
/** Window to the left of the notehead (accidental room) and to its right (dot, flag), in staff spaces. */
export const CLOSEUP_LEFT_SP = 2;
export const CLOSEUP_RIGHT_SP = 1.9;
/** Width reserved for the clef at the left edge, in staff spaces. */
export const CLOSEUP_CLEF_W_SP: Record<Clef, number> = { treble: 2.7, bass: 2.6 };
/** Room kept above the top line / below the bottom line so the clef fits, in staff spaces. */
export const CLOSEUP_CLEF_PAD_SP: Record<Clef, { top: number; bottom: number }> = {
  treble: { top: 1.9, bottom: 1.9 },
  bass: { top: 0.7, bottom: 0.7 },
};
/** A stem is never taken longer than this from the head (a chord's shared stem is cut by the window). */
export const CLOSEUP_STEM_MAX_SP = 3.6;

/** Tight window: clef area + about 2 staff spaces either side of the head; the staff, ledger lines and the stem vertically. */
export function closeupBox(i: CloseupInput): Closeup {
  const { cx, cy, sp, clef } = i;
  const stem = i.stemY === undefined ? cy : Math.max(cy - CLOSEUP_STEM_MAX_SP * sp, Math.min(cy + CLOSEUP_STEM_MAX_SP * sp, i.stemY));
  const pad = CLOSEUP_CLEF_PAD_SP[clef];
  const y0 = Math.min(i.staffTop - pad.top * sp, cy - 1.3 * sp, stem - 0.2 * sp);
  const y1 = Math.max(i.staffBottom + pad.bottom * sp, cy + 1.3 * sp, stem + 0.2 * sp);
  const x0 = cx - (CLOSEUP_LEFT_SP + CLOSEUP_CLEF_W_SP[clef]) * sp;
  const w = (CLOSEUP_LEFT_SP + CLOSEUP_CLEF_W_SP[clef] + CLOSEUP_RIGHT_SP) * sp;
  const h = y1 - y0;
  const scale = Math.min(CLOSEUP_MAX_SCALE, CLOSEUP_MAX_W / w, CLOSEUP_MAX_H / h);
  return { viewBox: { x: x0, y: y0, w, h }, width: Math.round(w * scale), height: Math.round(h * scale), scale, clefX: x0 + 0.15 * sp, headY: (cy - y0) * scale };
}

/** Where the small clef is drawn: Unicode glyph, font size and baseline (same recipe as MiniStaff). */
export function clefGlyph(clef: Clef, staffBottom: number, sp: number): { glyph: string; size: number; baseline: number } {
  return clef === "treble"
    ? { glyph: "\u{1D11E}", size: 8.75 * sp, baseline: staffBottom + 0.75 * sp }
    : { glyph: "\u{1D122}", size: 4.75 * sp, baseline: staffBottom - 1.05 * sp };
}

/** y of the 5 staff lines, top to bottom. */
export function staffLineYs(staffTop: number, sp: number): number[] {
  return [0, 1, 2, 3, 4].map((k) => staffTop + k * sp);
}

/**
 * From the y of many horizontal lines near a staff, the five that form it: the first run of five lines about one
 * space apart. null when there is none (the caller falls back to its own estimate).
 */
export function pickStaffLines(ys: readonly number[], sp: number): { top: number; bottom: number } | null {
  const sorted = [...ys].sort((a, b) => a - b).filter((y, i, a) => i === 0 || y - a[i - 1] > 0.3 * sp);
  for (const y0 of sorted) {
    for (const y1 of sorted) {
      const d = y1 - y0;
      if (d < 0.75 * sp || d > 1.25 * sp) continue; // the spacing is measured, `sp` is only a hint
      if ([2, 3, 4].every((k) => sorted.some((y) => Math.abs(y - (y0 + k * d)) <= 0.12 * d))) {
        const bottom = sorted.find((y) => Math.abs(y - (y0 + 4 * d)) <= 0.12 * d) as number;
        return { top: y0, bottom };
      }
    }
  }
  return null;
}

/**
 * Every staff found among many line ys, then the one nearest to `y` (0 distance when `y` is inside it or within two
 * spaces of it). Several staves of a page share the same x range, so the head's own staff must be picked by position.
 */
export function pickNearestStaff(ys: readonly number[], sp: number, y: number): { top: number; bottom: number } | null {
  let rest = [...ys];
  let best: { top: number; bottom: number } | null = null;
  let bestD = Infinity;
  for (let guard = 0; guard < 400; guard++) {
    const st = pickStaffLines(rest, sp);
    if (!st) break;
    const d = Math.max(st.top - y, y - st.bottom, 0);
    if (d < bestD) {
      bestD = d;
      best = st;
    }
    const step = (st.bottom - st.top) / 4;
    rest = rest.filter((v) => ![0, 1, 2, 3, 4].some((k) => Math.abs(v - (st.top + k * step)) < 0.3 * step));
  }
  return best && bestD <= 6 * sp ? best : null;
}

/** Staff step (0 = bottom line, 2 per space pair) of a head at y, given the staff's bottom line. */
export function measuredStep(cy: number, staffBottom: number, sp: number): number {
  return Math.round((staffBottom - cy) / (sp / 2));
}

/** y of the ledger lines the head at `cy` needs (none inside the staff). */
export function ledgerLineYs(cy: number, staffBottom: number, sp: number): number[] {
  return ledgerSteps(measuredStep(cy, staffBottom, sp)).map((s) => staffBottom - (s * sp) / 2);
}

const ACC_OFFSET: Record<string, number> = { "": 0, "#": 1, "##": 2, b: -1, bb: -2 };

/** Spelled name with octave ("F#3") from a spelled name without octave ("F#") and the sounding MIDI number. */
export function spelledWithOctave(spelledName: string, midi: number): string | null {
  const m = /^([A-Ga-g])(##|#|bb|b)?$/.exec(spelledName.trim());
  if (!m) return null;
  const natural: Record<string, number> = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
  const base = midi - ACC_OFFSET[m[2] ?? ""] - natural[m[1].toUpperCase()];
  if (base % 12 !== 0) return null;
  return `${m[1].toUpperCase()}${m[2] ?? ""}${base / 12 - 1}`;
}

/**
 * Which clef the note is on: the one whose staff step for its pitch matches where the head was measured. Falls back to
 * `hand` (left = bass) when the spelling is unreadable or neither clef agrees.
 */
export function clefForNote(spelledName: string, midi: number, step: number, hand: "R" | "L" | string): Clef {
  const sp = spelledWithOctave(spelledName, midi);
  if (sp) {
    const t = staffStep(sp, "treble");
    const b = staffStep(sp, "bass");
    const dt = Math.abs(t - step);
    const db = Math.abs(b - step);
    if (dt <= 1 && dt < db) return "treble";
    if (db <= 1 && db < dt) return "bass";
  }
  return hand === "L" ? "bass" : "treble";
}

/** The accidental / dot paths that hang beside heads: which head (index) each one belongs to, -1 for none. */
export interface HeadBox {
  cy: number;
  left: number;
  right: number;
}
export interface ModBox {
  cy: number;
  left: number;
  right: number;
  w: number;
}

/**
 * Accidentals sit left of their head, dots right of it (a dot on a line is lifted half a space). Each modifier goes to
 * the nearest head by that rule so that, in a chord, only the hovered head's own accidental and dots are kept.
 */
export function assignModifiers(heads: readonly HeadBox[], mods: readonly ModBox[], sp: number): number[] {
  return mods.map((m) => {
    const isDot = m.w < 0.7 * sp;
    let best = -1;
    let bestD = Infinity;
    heads.forEach((h, i) => {
      const side = isDot ? m.left >= h.right - 0.3 * sp : m.right <= h.left + 0.3 * sp;
      if (!side) return;
      const d = isDot ? Math.min(Math.abs(m.cy - h.cy), Math.abs(m.cy - (h.cy - 0.5 * sp))) : Math.abs(m.cy - h.cy);
      const dx = isDot ? m.left - h.right : h.left - m.right;
      const score = d + Math.max(0, dx) * 0.02; // nearest vertically, ties by distance
      if (score < bestD && d < (isDot ? 0.35 : 1.6) * sp) {
        bestD = score;
        best = i;
      }
    });
    return best;
  });
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

/** Space (px) that must stay below the photo's bottom for the rest of the panel; less than this flips the layout. */
export const PANEL_MIN_BELOW = 120;

export interface PanelPlaceInput {
  /** Viewport y of the tag's centre. */
  tagCenterY: number;
  /** Distance (px) from the notehead's centre to the photo's bottom edge. */
  photoBelow: number;
  /** Distance from the card's top / bottom edge to the NOTEHEAD's centre, measured in the CURRENT layout. */
  photoFromTop: number;
  photoFromBottom: number;
  /** Natural (unclipped) card height in the current layout. */
  cardH: number;
  viewportH: number;
  margin?: number;
  minBelow?: number;
}

export interface PanelPlacement {
  /** true: NOTA and the rest go above the photo, the photo sits at the card's bottom. */
  flipped: boolean;
  /** Viewport y of the card's top edge. */
  top: number;
  /** Max card height (the rest scrolls inside). */
  maxH: number;
}

/** Should the layout flip? Depends only on the tag and the photo size, so it never oscillates. */
export function shouldFlip(tagCenterY: number, photoBelow: number, viewportH: number, margin = 8, minBelow = PANEL_MIN_BELOW): boolean {
  return viewportH - margin - (tagCenterY + photoBelow) < minBelow;
}

/**
 * Panel position with the photo's notehead exactly at the tag's centre height, always. Normal layout: photo on top, the rest
 * below it down to the viewport bottom (scrolling inside). Flipped (little room below the photo): the card ends just
 * under the photo, the rest sits above it.
 */
export function placePanel(i: PanelPlaceInput): PanelPlacement {
  const margin = i.margin ?? 8;
  const flipped = shouldFlip(i.tagCenterY, i.photoBelow, i.viewportH, margin, i.minBelow);
  if (!flipped) {
    const top = i.tagCenterY - i.photoFromTop;
    return { flipped, top, maxH: Math.max(1, i.viewportH - margin - top) };
  }
  const bottom = i.tagCenterY + i.photoFromBottom;
  const maxH = Math.max(1, bottom - margin);
  return { flipped, top: bottom - Math.min(i.cardH, maxH), maxH };
}
