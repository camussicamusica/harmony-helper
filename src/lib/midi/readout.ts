import { chordName, noteLabel } from "@/lib/music/naming";

const SHARP = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const FLAT = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"];

/** "Re (D) · octava 4". A black key has two names, so both are shown: "Fa# (F#) / Sol♭ (G♭) · octava 4". */
export function noteReadout(midi: number): string {
  const pc = ((midi % 12) + 12) % 12;
  const octave = Math.floor(midi / 12) - 1;
  const names = SHARP[pc] === FLAT[pc] ? noteLabel(SHARP[pc]) : `${noteLabel(SHARP[pc])} / ${noteLabel(FLAT[pc])}`;
  return `${names} · octava ${octave}`;
}

const BLACK_ROOT = /^(Do#|Re#|Fa#|Sol#|La#|Re♭|Mi♭|Sol♭|La♭|Si♭)/;
const isMajorish = (name: string) => /mayor|séptima|maj7|sus/.test(name);

/**
 * Chord name for 3+ different notes held together ("Fa# menor"), or null. Never guesses.
 * A black-key root has two spellings (Do# / Re♭); a key press cannot tell which one she means, so the
 * spelling is chosen by what is most common: flats for major chords (Si♭ mayor), sharps for minor ones
 * (Do# menor), Fa# always sharp, Mi♭ / Si♭ minor flat.
 */
export function chordReadout(pressed: ReadonlySet<number>): string | null {
  if (pressed.size < 3) return null;
  const low = [...pressed].sort((a, b) => a - b);
  const sharp = chordName(low.map((m) => SHARP[((m % 12) + 12) % 12]));
  const flat = chordName(low.map((m) => FLAT[((m % 12) + 12) % 12]));
  if (!sharp || !flat || sharp === flat) return sharp ?? flat;
  const sharpBlack = BLACK_ROOT.test(sharp);
  const flatBlack = BLACK_ROOT.test(flat);
  if (!sharpBlack && !flatBlack) return sharp; // natural root: only the bass note may differ
  if (!sharpBlack && flatBlack) return sharp; // root is a natural note in the sharp spelling
  if (sharpBlack && !flatBlack) return flat;
  if (sharp.startsWith("Fa#")) return sharp;
  if (isMajorish(sharp)) return flat;
  return /^(Re#|La#)/.test(sharp) ? flat : sharp;
}
