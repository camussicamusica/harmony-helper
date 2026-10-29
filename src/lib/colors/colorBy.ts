import { useSyncExternalStore } from "react";
import { soundingOf } from "@/lib/music/transpose";

/**
 * "Color por: escrita / suena". Which pitch of a transposing instrument decides a note's color.
 * Own key (never hh.colors.v1, which holds her palette). Default: the written note, the one she reads.
 */
export type ColorBy = "written" | "sounding";

const KEY = "hh.colorBy.v1";
let current: ColorBy | null = null;
const listeners = new Set<() => void>();

export function getColorBy(): ColorBy {
  if (current === null) {
    current = "written";
    try {
      if (typeof localStorage !== "undefined" && localStorage.getItem(KEY) === "sounding") current = "sounding";
    } catch {
      /* ignore */
    }
  }
  return current;
}

export function setColorBy(v: ColorBy) {
  if (v === getColorBy()) return;
  current = v;
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
  listeners.forEach((l) => l());
}

export function subscribeColorBy(fn: () => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function useColorBy(): [ColorBy, (v: ColorBy) => void] {
  const v = useSyncExternalStore(subscribeColorBy, getColorBy, () => "written" as ColorBy);
  return [v, setColorBy];
}

/** The midi whose pitch class colors this note under the current choice. The one place that decides it. */
export function colorMidiOf(n: { midi: number; soundingMidi?: number }, by: ColorBy = getColorBy()): number {
  return by === "sounding" ? soundingOf(n) : n.midi;
}
