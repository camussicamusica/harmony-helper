/** Pure math for panning and centering the score (no DOM). */

export interface CenterInput {
  /** Band to show, in scroll-content px along one axis. */
  bandStart: number;
  bandEnd: number;
  /** Visible size along that axis (clientHeight / clientWidth). */
  viewSize: number;
  /** Total scrollable size (scrollHeight / scrollWidth). */
  contentSize: number;
}

/**
 * Scroll offset that puts the middle of the band in the middle of the view. A band taller than the view is centered on
 * its middle too, so both ends overflow equally. Clamped to what can be scrolled.
 */
export function centerScroll({ bandStart, bandEnd, viewSize, contentSize }: CenterInput): number {
  const mid = (bandStart + bandEnd) / 2;
  const max = Math.max(0, contentSize - viewSize);
  return clamp(mid - viewSize / 2, 0, max);
}

export interface AnchorInput {
  /** Current scroll offset and the content size before / after the re-render. */
  scroll: number;
  oldSize: number;
  newSize: number;
  /** Screen position (px from the view's start) of the point that must not move: the now-line, or the view center. */
  anchor: number;
  /** Where the zoomed content starts inside the scroll content (left padding). It does not scale. */
  origin: number;
  viewSize: number;
  contentSize: number;
}

/**
 * Scroll offset that keeps the same musical point under `anchor` after the content grew or shrank from `oldSize` to
 * `newSize` (only the part after `origin` scales). Clamped. A degenerate size leaves the scroll as it was.
 */
export function anchorScroll({ scroll, oldSize, newSize, anchor, origin, viewSize, contentSize }: AnchorInput): number {
  const max = Math.max(0, contentSize - viewSize);
  if (!(oldSize > 0) || !(newSize > 0)) return clamp(scroll, 0, max);
  const point = scroll + anchor - origin; // distance from the start of the zoomed content
  const next = origin + point * (newSize / oldSize) - anchor;
  return clamp(next, 0, max);
}

/** Space-bar / mouse-on-empty-space rule for dragging in Estudiar. */
export function canStartEstudiarDrag(opts: { spaceHeld: boolean; onEmptySpace: boolean }): boolean {
  return opts.spaceHeld || opts.onEmptySpace;
}

/** Vertical padding (px) above and below the Tocar score so any band can be brought to the middle of the view. */
export function tocarPadY(viewH: number): number {
  return Math.max(0, Math.round(viewH / 2));
}

function clamp(v: number, lo: number, hi: number): number {
  return Math.max(lo, Math.min(hi, v));
}
