import { useCallback, useEffect, useState } from "react";
import { STEPS } from "./steps";

/** Per-piece progress, stored in localStorage `hh.recorrido.v1`, keyed by the same hash as the Ficha override. */
export interface PieceProgress {
  /** Step numbers (1–11) marked "Listo". */
  done: number[];
  /** Step number being shown in "De a uno". */
  current: number;
  /** Measure numbers she marked as hard. */
  hard: number[];
}

export type RecorridoMode = "uno" | "todo";

interface Store {
  mode: RecorridoMode;
  scores: Record<string, PieceProgress>;
}

const KEY = "hh.recorrido.v1";
const FRESH: PieceProgress = { done: [], current: 1, hard: [] };
const LAST = STEPS.length;

function readStore(): Store {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (p && typeof p === "object" && p.scores && typeof p.scores === "object") {
        return { mode: p.mode === "todo" ? "todo" : "uno", scores: p.scores };
      }
    }
  } catch {
    /* ignore */
  }
  return { mode: "uno", scores: {} };
}

function writeStore(s: Store) {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
}

function clean(p: Partial<PieceProgress> | undefined): PieceProgress {
  const nums = (a: unknown) => (Array.isArray(a) ? a.filter((x): x is number => typeof x === "number") : []);
  const cur = typeof p?.current === "number" ? Math.min(LAST, Math.max(1, Math.round(p.current))) : 1;
  return { done: nums(p?.done), current: cur, hard: nums(p?.hard).sort((a, b) => a - b) };
}

export function useRecorrido(hash: string) {
  const [mode, setModeState] = useState<RecorridoMode>("uno");
  const [progress, setProgress] = useState<PieceProgress>(FRESH);

  // Read after mount so server and client markup match.
  useEffect(() => {
    const s = readStore();
    setModeState(s.mode);
    setProgress(clean(s.scores[hash]));
  }, [hash]);

  const save = useCallback(
    (next: PieceProgress) => {
      setProgress(next);
      const s = readStore(); // re-read: never clobber the other pieces
      s.scores[hash] = next;
      writeStore(s);
    },
    [hash],
  );

  const setMode = useCallback((m: RecorridoMode) => {
    setModeState(m);
    const s = readStore();
    s.mode = m;
    writeStore(s);
  }, []);

  const goTo = (n: number) => save({ ...progress, current: Math.min(LAST, Math.max(1, n)) });
  const toggleDone = (n: number) =>
    save({ ...progress, done: progress.done.includes(n) ? progress.done.filter((x) => x !== n) : [...progress.done, n] });
  /** "Listo ✓": marks the step done and moves to the next one (the last one stays). */
  const finish = (n: number) =>
    save({
      ...progress,
      done: progress.done.includes(n) ? progress.done : [...progress.done, n],
      current: Math.min(LAST, n + 1),
    });
  const toggleHard = (m: number) =>
    save({
      ...progress,
      hard: progress.hard.includes(m) ? progress.hard.filter((x) => x !== m) : [...progress.hard, m].sort((a, b) => a - b),
    });
  /** Resets only this piece. */
  const reset = () => {
    setProgress(FRESH);
    const s = readStore();
    delete s.scores[hash];
    writeStore(s);
  };

  return { mode, setMode, progress, goTo, toggleDone, finish, toggleHard, reset };
}

export type Recorrido = ReturnType<typeof useRecorrido>;
