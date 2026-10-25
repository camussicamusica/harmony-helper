import { Note } from "tonal";
import type { KeyInfo } from "./key";

const mod12 = (n: number) => ((n % 12) + 12) % 12;

/** Spelled name (tonal style, "Db") of each of the 12 pitch classes: the key's own spelling for scale notes, the chord's for its notes, flats/sharps by key signature for the rest. */
export function ringSpelling(key: KeyInfo, chordNotes: string[], chordPcs: number[]): string[] {
  const out: string[] = [];
  // KeyInfo.fifths is not reliable (tonal gives no fifths for a bare pitch class), so read the scale's own accidentals.
  const flats = key.notes.filter((n) => n.includes("b")).length > key.notes.filter((n) => n.includes("#")).length;
  for (let pc = 0; pc < 12; pc++) {
    const inKey = key.pcs.indexOf(pc);
    const inChord = chordPcs.indexOf(pc);
    if (inChord >= 0 && chordNotes[inChord]) out.push(chordNotes[inChord]);
    else if (inKey >= 0) out.push(key.notes[inKey]);
    else out.push(Note.pitchClass(flats ? Note.fromMidi(60 + pc) : Note.fromMidiSharps(60 + pc)));
  }
  return out;
}

/** Degrees clockwise on screen from the bottom of the circle (SVG: 90 = bottom, y down). */
export const ringAngle = (pc: number, tonicPc: number) => 90 + 30 * mod12(pc - tonicPc);

export interface Arrow {
  from: number;
  to: number;
  /** Leading tone -> tonic, or 7th -> 3rd. */
  emphasis: boolean;
  why: string;
}

/**
 * Voice-leading arrows for a Dominante chord: each chord note that is not in the tonic triad goes to the nearest
 * tonic-triad note a semitone or a whole tone away. Ties are skipped (never guess).
 */
export function resolutionArrows(chordPcs: number[], rootPc: number, tonicTriadPcs: number[], tonicPc: number): Arrow[] {
  const out: Arrow[] = [];
  const third = tonicTriadPcs[1];
  const seventh = chordPcs.length >= 4 ? chordPcs.find((p) => [9, 10, 11].includes(mod12(p - rootPc))) : undefined;
  for (const pc of chordPcs) {
    if (tonicTriadPcs.includes(pc)) continue;
    const dist = (a: number, b: number) => Math.min(mod12(a - b), mod12(b - a));
    const cands = tonicTriadPcs.map((t) => ({ t, d: dist(pc, t) })).filter((c) => c.d >= 1 && c.d <= 2);
    if (!cands.length) continue;
    const best = Math.min(...cands.map((c) => c.d));
    const nearest = cands.filter((c) => c.d === best);
    let target: number | null = nearest.length === 1 ? nearest[0].t : null;
    const leading = pc === mod12(tonicPc - 1);
    const isSeventh = pc === seventh;
    if (leading) target = tonicPc;
    else if (isSeventh && cands.some((c) => c.t === third)) target = third;
    if (target === null) continue;
    out.push({
      from: pc,
      to: target,
      emphasis: leading || (isSeventh && target === third),
      why: leading ? "la sensible sube a la tónica" : isSeventh && target === third ? "la séptima baja a la tercera" : "se resuelve por grado conjunto",
    });
  }
  return out;
}

/** Pairs of chord pitch classes a tritone apart. */
export function tritones(pcs: number[]): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < pcs.length; i++)
    for (let j = i + 1; j < pcs.length; j++) if (mod12(pcs[i] - pcs[j]) === 6) out.push([pcs[i], pcs[j]]);
  return out;
}
