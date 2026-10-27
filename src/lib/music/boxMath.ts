/** Where a measure box starts. The first measure of a system begins with the clef, key and time signature: the box
 *  must start after them (so it never covers or swallows the signature), not at the barline. */
export function systemStartX(opts: { firstNoteX: number; sigRight: number | null; pad?: number; gap?: number }): number {
  const { firstNoteX, sigRight, pad = 26, gap = 4 } = opts;
  const loose = firstNoteX - pad;
  return sigRight === null ? loose : Math.max(loose, sigRight + gap);
}
