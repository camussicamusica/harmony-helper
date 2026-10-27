/**
 * Nearest-note hit testing for the score hover. Each notehead owns an invisible "cuadrante" (zone) around it;
 * the pointer lights the note whose zone it is in. Pure: no DOM, all numbers are px in one shared frame.
 */

export interface HeadBox {
  id: string;
  /** Music system (line of the page) the head sits on. */
  system: number;
  /** Center of the head. */
  x: number;
  y: number;
  /** Head size (an engraved head is about one staff space tall). */
  w: number;
  h: number;
}

export interface HitOptions {
  /** Staff-line spacing in px: one number for the whole score, or one per system. Falls back to the median head height. */
  staffSpace?: number | Map<number, number>;
  /** Horizontal reach each side, in staff spaces (cap when the next onset is far). Default 2.5. */
  reachX?: number;
  /** Vertical reach above and below the head, in staff spaces. Default 2. */
  reachY?: number;
  /**
   * Y of the midpoint between two staves of a system (sorted). A head only answers a pointer on its own side,
   * so treble and bass never steal each other's zones.
   */
  splits?: Map<number, number[]>;
}

interface Column {
  x: number;
  lo: number;
  hi: number;
  heads: HeadBox[];
}

interface SystemIndex {
  sp: number;
  cols: Column[];
  yMin: number;
  yMax: number;
  splits: number[];
}

export interface NoteHitIndex {
  systems: Map<number, SystemIndex>;
  reachY: number;
}

const median = (xs: number[]): number => {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

const band = (splits: number[], y: number): number => {
  let n = 0;
  for (const s of splits) if (y > s) n++;
  return n;
};

/** Group heads per system into onset columns (heads within ~1.4 spaces of x are one column), with each column's x zone. */
export function buildNoteHitIndex(heads: HeadBox[], opts: HitOptions = {}): NoteHitIndex {
  const reachX = opts.reachX ?? 2.5;
  const reachY = opts.reachY ?? 2;
  const bySys = new Map<number, HeadBox[]>();
  for (const h of heads) {
    if (!Number.isFinite(h.x) || !Number.isFinite(h.y)) continue;
    const arr = bySys.get(h.system) ?? [];
    arr.push(h);
    bySys.set(h.system, arr);
  }
  const systems = new Map<number, SystemIndex>();
  for (const [system, hs] of bySys) {
    const given = typeof opts.staffSpace === "number" ? opts.staffSpace : opts.staffSpace?.get(system);
    const sp = given && given > 0 ? given : median(hs.map((h) => h.h)) || 8;
    const tol = sp * 1.4;
    const sorted = [...hs].sort((a, b) => a.x - b.x);
    const cols: Column[] = [];
    for (const h of sorted) {
      const last = cols[cols.length - 1];
      if (last && h.x - last.x <= tol) {
        last.heads.push(h);
        last.x = last.heads.reduce((a, b) => a + b.x, 0) / last.heads.length;
      } else cols.push({ x: h.x, lo: 0, hi: 0, heads: [h] });
    }
    cols.forEach((c, i) => {
      const prev = cols[i - 1];
      const next = cols[i + 1];
      const left = prev ? Math.min((c.x - prev.x) / 2, reachX * sp) : reachX * sp;
      const right = next ? Math.min((next.x - c.x) / 2, reachX * sp) : reachX * sp;
      // Never smaller than the heads themselves (a displaced chord head sticks out of the mean x).
      c.lo = Math.min(c.x - left, ...c.heads.map((h) => h.x - h.w / 2));
      c.hi = Math.max(c.x + right, ...c.heads.map((h) => h.x + h.w / 2));
    });
    systems.set(system, {
      sp,
      cols,
      yMin: Math.min(...hs.map((h) => h.y - h.h / 2)) - reachY * sp,
      yMax: Math.max(...hs.map((h) => h.y + h.h / 2)) + reachY * sp,
      splits: opts.splits?.get(system) ?? [],
    });
  }
  return { systems, reachY };
}

/** Column whose x zone holds x (binary search by center, then the two neighbours). Nearest center wins. */
function columnAt(cols: Column[], x: number): Column | null {
  let lo = 0;
  let hi = cols.length - 1;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (cols[mid].x < x) lo = mid + 1;
    else hi = mid;
  }
  let best: Column | null = null;
  for (let i = Math.max(0, lo - 1); i <= Math.min(cols.length - 1, lo); i++) {
    const c = cols[i];
    if (x < c.lo || x > c.hi) continue;
    if (!best || Math.abs(c.x - x) < Math.abs(best.x - x)) best = c;
  }
  return best;
}

/** The head whose zone holds the pointer (nearest one on ties), or null when the pointer is outside every zone. */
export function nearestNoteHit(
  pointer: { x: number; y: number },
  heads: HeadBox[] | NoteHitIndex,
  opts: HitOptions = {},
): HeadBox | null {
  const index = Array.isArray(heads) ? buildNoteHitIndex(heads, opts) : heads;
  for (const sys of index.systems.values()) {
    if (pointer.y < sys.yMin || pointer.y > sys.yMax) continue;
    const col = columnAt(sys.cols, pointer.x);
    if (!col) continue;
    const pBand = band(sys.splits, pointer.y);
    let best: HeadBox | null = null;
    let bestDy = Infinity;
    for (const h of col.heads) {
      if (band(sys.splits, h.y) !== pBand) continue;
      const dy = Math.abs(pointer.y - h.y);
      if (dy > h.h / 2 + index.reachY * sys.sp) continue;
      if (dy < bestDy) {
        bestDy = dy;
        best = h;
      }
    }
    if (best) return best;
  }
  return null;
}
