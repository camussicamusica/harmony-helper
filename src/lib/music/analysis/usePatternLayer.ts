import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ScoreData } from "./useFicha";
import { colorCount, detectPatterns, patternLetters, type Pattern } from "./patterns";
import {
  applyPaletteToScore,
  DEFAULT_DEGRADE_OPTIONS,
  DEFAULT_PATTERN_OPTIONS,
  getScoreColors,
  importProtoPalettes,
  loadDegradeOptions,
  loadPalettes,
  loadPatternOptions,
  paletteFor,
  removePalette,
  rerollScoreColors,
  savePalette,
  saveDegradeOptions,
  savePatternOptions,
  type DegradeOptions,
  type PatternOptions,
  type ScoreColors,
} from "./patternStore";

export interface PatternLayer {
  options: PatternOptions;
  setOptions: (patch: Partial<PatternOptions>) => void;
  patterns: Pattern[];
  /** color key -> letter ("A", "B"...) */
  letters: Map<string, string>;
  /** color key -> box color */
  colors: Map<string, string>;
  /** How many different colors the patterns need. */
  count: number;
  /** Saved combinations (lists of hex). */
  saved: string[][];
  reroll: () => void;
  /** "Me gusta esta": true if it was new. */
  like: () => boolean;
  applySaved: (index: number) => void;
  removeSaved: (index: number) => void;
}

/** Patterns of the loaded score, their colors (random per score, remembered) and the layer's settings. */
export function usePatternLayer(hash: string, data: ScoreData | null): PatternLayer {
  const [options, setOptionsState] = useState<PatternOptions>(DEFAULT_PATTERN_OPTIONS);
  const [saved, setSaved] = useState<string[][]>([]);
  const [score, setScore] = useState<{ hash: string; colors: ScoreColors } | null>(null);
  const loaded = useRef(false);

  // Read after mount so server and client markup match.
  useEffect(() => {
    importProtoPalettes();
    setOptionsState(loadPatternOptions());
    setSaved(loadPalettes());
    loaded.current = true;
  }, []);

  const setOptions = useCallback((patch: Partial<PatternOptions>) => {
    setOptionsState((prev) => {
      const next = { ...prev, ...patch };
      savePatternOptions(next);
      return next;
    });
  }, []);

  const notes = data?.notes;
  const meta = data?.meta;
  const patterns = useMemo(() => {
    if (!options.on || !notes?.length) return [];
    const starts = new Map((meta?.measures ?? []).map((m) => [m.number, m.startSec]));
    return detectPatterns(notes, { scope: options.scope, includeTransposed: options.includeTransposed, measureStarts: starts });
  }, [options.on, options.scope, options.includeTransposed, notes, meta]);

  const letters = useMemo(() => patternLetters(patterns), [patterns]);
  const count = useMemo(() => colorCount(patterns), [patterns]);

  // First view of this score: draw the colors (and save them) once there is something to color.
  useEffect(() => {
    if (!options.on || !count) return;
    if (score?.hash === hash) return;
    setScore({ hash, colors: getScoreColors(hash) });
  }, [options.on, count, hash, score?.hash]);

  const colors = useMemo(() => {
    const out = new Map<string, string>();
    if (!score || score.hash !== hash || !count) return out;
    const pal = paletteFor(count, score.colors);
    [...letters.keys()].forEach((k, i) => out.set(k, pal[i]));
    return out;
  }, [score, hash, count, letters]);

  const reroll = useCallback(() => {
    setScore({ hash, colors: rerollScoreColors(hash, Math.max(1, count)) });
  }, [hash, count]);

  const like = useCallback(() => {
    const cols = [...colors.values()];
    if (!cols.length) return false;
    const before = loadPalettes().length;
    const list = savePalette(cols);
    setSaved(list);
    return list.length > before;
  }, [colors]);

  const applySaved = useCallback(
    (index: number) => {
      const p = loadPalettes()[index];
      if (!p) return;
      setScore({ hash, colors: applyPaletteToScore(hash, p) });
    },
    [hash],
  );

  const removeSaved = useCallback((index: number) => setSaved(removePalette(index)), []);

  return { options, setOptions, patterns, letters, colors, count, saved, reroll, like, applySaved, removeSaved };
}

export interface DegradeLayer {
  options: DegradeOptions;
  setOptions: (patch: Partial<DegradeOptions>) => void;
}

export function useDegradeLayer(): DegradeLayer {
  const [options, setOptionsState] = useState<DegradeOptions>(DEFAULT_DEGRADE_OPTIONS);
  useEffect(() => {
    setOptionsState(loadDegradeOptions());
  }, []);
  const setOptions = useCallback((patch: Partial<DegradeOptions>) => {
    setOptionsState((prev) => {
      const next = { ...prev, ...patch };
      saveDegradeOptions(next);
      return next;
    });
  }, []);
  return { options, setOptions };
}
