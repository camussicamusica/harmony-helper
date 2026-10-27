export interface BandScrollInput {
  /** Page (document) y of the score wrapper's top edge. */
  docTop: number;
  /** Band to show, in px relative to the wrapper. */
  y0: number;
  y1: number;
  /** Tighter band used when the roomy one is taller than the visible area. */
  tight?: { y0: number; y1: number };
  /** Visible area in viewport px: just under the sticky top bar, just above the sticky piano. */
  visTop: number;
  visBottom: number;
}

/**
 * window.scrollY that shows the whole band between the sticky bars: vertically centered when it fits, else its top
 * edge sits just under the top bar. Never negative.
 */
export function bandScrollTop({ docTop, y0, y1, tight, visTop, visBottom }: BandScrollInput): number {
  const room = visBottom - visTop;
  if (tight && y1 - y0 > room) {
    y0 = tight.y0;
    y1 = tight.y1;
  }
  const h = y1 - y0;
  const bandTopInView = h >= room ? visTop + 8 : visTop + (room - h) / 2;
  return Math.max(0, docTop + y0 - bandTopInView);
}
