import type { Hand, ScheduledNote } from "./types";
import { intervalLabel } from "./naming";

const EPS = 1e-3;

export interface LinePoint {
  note: ScheduledNote;
  /** The line does NOT continue to the next point (rest, end of slur, or system break). */
  breakAfter: boolean;
}

/** One entry per onset for one hand: top note for RH, bottom note for LH. Tied continuations are skipped. */
export function handLine(notes: ScheduledNote[], hand: Hand): LinePoint[] {
  const mine = notes.filter((n) => n.hand === hand).sort((a, b) => a.startSec - b.startSec);
  if (!mine.length) return [];
  const hasSlurs = mine.some((n) => n.slurEnd);

  // Group by onset.
  const groups: ScheduledNote[][] = [];
  for (const n of mine) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(g[0].startSec - n.startSec) < EPS) g.push(n);
    else groups.push([n]);
  }

  const pts: LinePoint[] = [];
  let maxEnd = 0; // end of everything sounding in this hand before the current onset
  let prevGroupHadSlurEnd = false;
  let gapBefore = false;
  for (const g of groups) {
    const onset = g[0].startSec;
    gapBefore = maxEnd > 0 && onset > maxEnd + EPS;
    const candidates = g.filter((n) => !n.tieContinuation);
    const gEnd = Math.max(...g.map((n) => n.startSec + n.durationSec));
    if (candidates.length) {
      const rep =
        hand === "RH"
          ? candidates.reduce((a, b) => (b.midi > a.midi ? b : a))
          : candidates.reduce((a, b) => (b.midi < a.midi ? b : a));
      const prev = pts[pts.length - 1];
      if (prev) {
        const brk = gapBefore || (hasSlurs && prevGroupHadSlurEnd);
        prev.breakAfter = prev.breakAfter || brk;
        rep.isRestBefore = gapBefore;
      } else {
        rep.isRestBefore = false;
      }
      pts.push({ note: rep, breakAfter: false });
      prevGroupHadSlurEnd = g.some((n) => n.slurEnd);
    } else if (gapBefore && pts.length) {
      pts[pts.length - 1].breakAfter = true;
    }
    maxEnd = Math.max(maxEnd, gEnd);
  }
  return pts;
}

/** Sets isRestBefore on the representative notes (used by parseMusicXml). */
export function markPhrases(notes: ScheduledNote[]) {
  handLine(notes, "RH");
  handLine(notes, "LH");
}

export interface Segment {
  from: ScheduledNote;
  to: ScheduledNote;
  label: string;
}

export interface HandGeometry {
  hand: Hand;
  dots: ScheduledNote[];
  segments: Segment[];
}

/** Segments and dots for the overlay. Requires cx/cy to be measured. Never connects across a system break. */
export function buildGeometry(notes: ScheduledNote[], hands: Hand[]): HandGeometry[] {
  return hands.map((hand) => {
    const pts = handLine(notes, hand).filter((p) => p.note.cx !== undefined && p.note.cy !== undefined);
    const segments: Segment[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      if (a.breakAfter) continue;
      if ((a.note.system ?? 0) !== (b.note.system ?? 0)) continue;
      if ((b.note.cx ?? 0) < (a.note.cx ?? 0) - 5) continue; // wrapped to a new line
      segments.push({ from: a.note, to: b.note, label: intervalLabel(a.note.midi, b.note.midi) });
    }
    return { hand, dots: pts.map((p) => p.note), segments };
  });
}
