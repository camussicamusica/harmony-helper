/**
 * Staff geometry for a spelled note, no drawing. A "step" is one half-space of the staff:
 * 0 = bottom line, 1 = first space, 2 = second line … 8 = top line; negative below, above 8 above.
 * Even steps are lines, odd steps are spaces.
 */

export type Clef = "treble" | "bass";

const LETTER_INDEX: Record<string, number> = { C: 0, D: 1, E: 2, F: 3, G: 4, A: 5, B: 6 };

/** Diatonic number (octave * 7 + letter) of the bottom line: E4 in treble, G2 in bass. */
const BOTTOM_LINE: Record<Clef, number> = { treble: 4 * 7 + 2, bass: 2 * 7 + 4 };

export type Accidental = "" | "#" | "##" | "b" | "bb";

export interface SpelledNote {
  letter: string;
  accidental: Accidental;
  octave: number;
}

/** "C#4" -> { letter: "C", accidental: "#", octave: 4 }; null when it cannot be read. */
export function parseSpelled(spelled: string): SpelledNote | null {
  const m = /^([A-Ga-g])(##|#|bb|b)?(-?\d+)$/.exec(spelled.trim());
  if (!m) return null;
  return { letter: m[1].toUpperCase(), accidental: (m[2] ?? "") as Accidental, octave: Number(m[3]) };
}

/** Staff step of a spelled note with octave ("E4" in treble = 0). NaN when unreadable. Accidentals do not move a note. */
export function staffStep(spelled: string, clef: Clef): number {
  const p = parseSpelled(spelled);
  if (!p) return NaN;
  return p.octave * 7 + LETTER_INDEX[p.letter] - BOTTOM_LINE[clef];
}

/** Is this step on a staff line (the 5 lines or a ledger line)? */
export function isLineStep(step: number): boolean {
  return Math.abs(step % 2) === 0;
}

/**
 * Ledger-line steps a note at `step` needs (ascending order below the staff, descending above is not needed:
 * the list is always sorted by distance from the staff). A note in the first space outside the staff needs none;
 * a note ON the first ledger line, or beyond it, needs every line from the staff to it (or to the one next to it).
 */
export function ledgerSteps(step: number): number[] {
  const out: number[] = [];
  if (!Number.isFinite(step)) return out;
  if (step <= -2) {
    const last = isLineStep(step) ? step : step + 1;
    for (let s = -2; s >= last; s -= 2) out.push(s);
  } else if (step >= 10) {
    const last = isLineStep(step) ? step : step - 1;
    for (let s = 10; s <= last; s += 2) out.push(s);
  }
  return out;
}

/** Union of the ledger lines of several notes (each line once), sorted ascending. */
export function ledgerStepsForAll(steps: number[]): number[] {
  const set = new Set<number>();
  for (const s of steps) for (const l of ledgerSteps(s)) set.add(l);
  return [...set].sort((a, b) => a - b);
}

/** Stem-less notehead needs no direction; kept here so the glyph position of an accidental is testable. */
export function accidentalGlyph(a: Accidental | "n"): string {
  return { "": "", "#": "♯", "##": "𝄪", b: "♭", bb: "𝄫", n: "♮" }[a];
}
