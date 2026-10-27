import { useCallback, useMemo, useState } from "react";
import { findChordOccurrences, wrapPos, type ChordOccurrence, type ChordQuery } from "./occurrences";
import type { PieceChord } from "./pieceChords";

interface Selection {
  id: string;
  query: ChordQuery;
  pos: number;
}

export interface OccurrenceCursor {
  /** Id of the chord (or key, or group) being walked, null when none. */
  activeId: string | null;
  occurrences: ChordOccurrence[];
  /** 0-based position inside `occurrences`. */
  pos: number;
  current: ChordOccurrence | null;
  /**
   * Press on a chord button: the same `id` again goes to the next occurrence (wrapping to the 1st after the last);
   * a different `id` starts at its 1st occurrence.
   */
  select: (id: string, query: ChordQuery) => void;
  /** ◀ / ▶ */
  step: (dir: 1 | -1) => void;
  clear: () => void;
}

/**
 * Walks through the occurrences of a chord (or any `ChordQuery`) in the piece. Reusable: the Ficha uses it with one
 * chord per button; a future círculo de quintas can pass a list of chords for the key she clicked.
 * `onNavigate` runs on every move so the caller can scroll the score.
 */
export function useOccurrenceCursor(chords: readonly PieceChord[], onNavigate?: (occ: ChordOccurrence) => void): OccurrenceCursor {
  const [sel, setSel] = useState<Selection | null>(null);
  const occurrences = useMemo(() => (sel ? findChordOccurrences(chords, sel.query) : []), [chords, sel]);
  const pos = occurrences.length ? Math.min(sel?.pos ?? 0, occurrences.length - 1) : 0;
  const current = occurrences[pos] ?? null;

  const select = useCallback(
    (id: string, query: ChordQuery) => {
      const same = sel?.id === id;
      const occs = same ? occurrences : findChordOccurrences(chords, query);
      if (!occs.length) return;
      const next = same ? wrapPos(pos, occs.length, 1) : 0;
      setSel({ id, query, pos: next });
      onNavigate?.(occs[next]);
    },
    [sel, occurrences, pos, chords, onNavigate],
  );

  const step = useCallback(
    (dir: 1 | -1) => {
      if (!sel || !occurrences.length) return;
      const next = wrapPos(pos, occurrences.length, dir);
      setSel({ ...sel, pos: next });
      onNavigate?.(occurrences[next]);
    },
    [sel, occurrences, pos, onNavigate],
  );

  const clear = useCallback(() => setSel(null), []);

  return { activeId: sel?.id ?? null, occurrences, pos, current, select, step, clear };
}
