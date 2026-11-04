import { Note } from "tonal";
import { noteLabel } from "@/lib/music/naming";

/** Sharp spelling with octave: 61 → "C#4". */
export function spelledSharp(midi: number): string {
  return Note.fromMidiSharps(midi);
}

/** "Re4 (D4)", "Do#4 (C#4)": Spanish first, then the letter, octave on both. */
export function midiLabel(midi: number): string {
  const sp = spelledSharp(midi);
  const oct = Note.octave(sp);
  const pc = Note.pitchClass(sp);
  return noteLabel(pc).replace(/^(\S+)( \()(\S+)\)$/, `$1${oct}$2$3${oct})`);
}

/** "Re (D)" without octave. */
export function midiPcLabel(midi: number): string {
  return noteLabel(Note.pitchClass(spelledSharp(midi)));
}

/** Natural notes first: the nearest natural to `midi` (rounding down on a tie). */
export function nearestNatural(midi: number): number {
  for (let d = 0; d < 2; d++) {
    for (const c of [midi - d, midi + d]) if ([0, 2, 4, 5, 7, 9, 11].includes(((c % 12) + 12) % 12)) return c;
  }
  return midi;
}
