import { Note } from "tonal";
import { readableTextOn } from "./color";

/** Chip look for one note: her note color, or neutral when that note's color is switched off. */
export interface NoteChipStyle {
  background: string;
  color: string;
  border: string;
  neutral: boolean;
}

export const NEUTRAL_CHIP: NoteChipStyle = {
  background: "#ffffff",
  color: "#111111",
  border: "#9ca3af",
  neutral: true,
};

type RoleLike = { id: string; color: string; enabled?: boolean };

/** Pitch class (0 = Do … 11 = Si) of a spelled note ("F#", "Bb", "Db4"). -1 when it cannot be read. */
export function spelledPc(spelled: string): number {
  const c = Note.chroma(spelled);
  return typeof c === "number" && Number.isFinite(c) ? c : -1;
}

/** Style of the chip for pitch class `pc`, read from the same note roles the score uses for noteheads. */
export function noteChipStyle(pc: number, roles: readonly RoleLike[]): NoteChipStyle {
  if (pc < 0) return NEUTRAL_CHIP;
  const r = roles.find((x) => x.id === `note-${pc}`);
  if (!r || r.enabled === false) return NEUTRAL_CHIP;
  return { background: r.color, color: readableTextOn(r.color), border: "rgba(0,0,0,0.28)", neutral: false };
}
