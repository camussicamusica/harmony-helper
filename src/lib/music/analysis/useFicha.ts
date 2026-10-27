import { useCallback, useEffect, useMemo, useState } from "react";
import type { ScheduledNote } from "../types";
import { ALL_KEY_IDS, detectKeyFromNotes, keyFromId, type KeyInfo, type KeyResult } from "./key";
import { scaleChords, type ScaleChord } from "./chords";
import { pieceChords, type PieceChord } from "./pieceChords";
import { EMPTY_META, type ScoreMeta } from "./scoreMeta";

export interface ScoreData {
  notes: ScheduledNote[];
  meta: ScoreMeta;
}

export type ChordHighlight = { kind: "degree"; degree: number } | { kind: "chord"; index: number } | null;

/** Small, fast, non-cryptographic hash (FNV-1a) used to key per-score settings. */
export function hashText(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}

const OVERRIDE_PREFIX = "hh.keyOverride.v1:";

export interface Ficha {
  detection: KeyResult | null;
  /** The key in use: her override, or the detected one. */
  key: KeyInfo | null;
  overridden: boolean;
  overrideId: string | null;
  setOverride: (id: string | null) => void;
  /** The 24 key ids, plus the detected one when its spelling is not in the list. */
  keyIds: string[];
  triads: ScaleChord[];
  sevenths: ScaleChord[];
  chords: PieceChord[];
  meta: ScoreMeta;
}

/** Key, scale chords and piece chords for the loaded score. Heavy work only runs while `enabled`. */
export function useFicha(xml: string, data: ScoreData | null, bpm: number, enabled: boolean): Ficha {
  const hash = useMemo(() => hashText(xml), [xml]);
  const [overrideId, setOverrideId] = useState<string | null>(null);

  useEffect(() => {
    try {
      const v = localStorage.getItem(OVERRIDE_PREFIX + hash);
      setOverrideId(v && keyFromId(v) ? v : null);
    } catch {
      setOverrideId(null);
    }
  }, [hash]);

  const setOverride = useCallback(
    (id: string | null) => {
      setOverrideId(id);
      try {
        if (id) localStorage.setItem(OVERRIDE_PREFIX + hash, id);
        else localStorage.removeItem(OVERRIDE_PREFIX + hash);
      } catch {
        /* ignore */
      }
    },
    [hash],
  );

  const notes = data?.notes;
  const meta = data?.meta ?? EMPTY_META;

  const detection = useMemo(() => {
    if (!enabled || !notes?.length) return null;
    return detectKeyFromNotes(notes, meta.fifths);
  }, [enabled, notes, meta.fifths]);

  const key = useMemo(() => {
    if (overrideId) return keyFromId(overrideId);
    return detection?.best.key ?? null;
  }, [overrideId, detection]);

  const triads = useMemo(() => (key ? scaleChords(key, false) : []), [key]);
  const sevenths = useMemo(() => (key ? scaleChords(key, true) : []), [key]);
  const chords = useMemo(
    () => (enabled && key && notes?.length ? pieceChords(notes, key, meta, bpm) : []),
    [enabled, key, notes, meta, bpm],
  );

  const keyIds = useMemo(() => {
    const ids = [...ALL_KEY_IDS];
    const d = detection?.best.key.id;
    if (d && !ids.includes(d)) ids.push(d);
    return ids;
  }, [detection]);

  return { detection, key, overridden: !!overrideId, overrideId, setOverride, keyIds, triads, sevenths, chords, meta };
}

/** Indices of the piece chords a highlight refers to. */
export function highlightedIndices(h: ChordHighlight, chords: PieceChord[]): number[] {
  if (!h) return [];
  if (h.kind === "chord") return h.index < chords.length ? [h.index] : [];
  const out: number[] = [];
  chords.forEach((c, i) => {
    if (c.degree === h.degree) out.push(i);
  });
  return out;
}

const LAYERS_KEY = "hh.layersOpen.v1";

/** "Capas" row open/closed, remembered in localStorage. Default closed. */
export function useLayersOpen(): [boolean, (v: boolean) => void] {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    try {
      if (localStorage.getItem(LAYERS_KEY) === "1") setOpen(true);
    } catch {
      /* ignore */
    }
  }, []);
  const set = (v: boolean) => {
    setOpen(v);
    try {
      localStorage.setItem(LAYERS_KEY, v ? "1" : "0");
    } catch {
      /* ignore */
    }
  };
  return [open, set];
}
