import { Note } from "tonal";
import type { ScheduledNote } from "../types";
import { noteLabel, solfegeName } from "../naming";
import type { Clef } from "../staffMath";
import { keyInfo, type KeyInfo } from "./key";

/** Order in which sharps / flats are added to a key signature. */
export const SHARP_ORDER = ["F", "C", "G", "D", "A", "E", "B"] as const;
export const FLAT_ORDER = ["B", "E", "A", "D", "G", "C", "F"] as const;

const MAJOR_TONICS = ["Cb", "Gb", "Db", "Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#"];
const MINOR_TONICS = ["Ab", "Eb", "Bb", "F", "C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#"];

export const clampFifths = (f: number) => Math.max(-7, Math.min(7, Math.round(f)));

/** The altered notes of a signature in printed order: 2 -> ["F#", "C#"], -3 -> ["Bb", "Eb", "Ab"]. */
export function signatureAccidentals(fifths: number): string[] {
  const f = clampFifths(fifths);
  return f >= 0 ? SHARP_ORDER.slice(0, f).map((l) => `${l}#`) : FLAT_ORDER.slice(0, -f).map((l) => `${l}b`);
}

/** Staff step (0 = bottom line) of each accidental as it is printed, so the glyphs go on their usual lines. */
export function signatureSteps(fifths: number, clef: Clef): number[] {
  const f = clampFifths(fifths);
  // Treble: sharps F5 C5 G5 D5 A4 E5 B4, flats B4 E5 A4 D5 G4 C5 F4. Bass is the same shapes, a third lower.
  const sharpsT = [8, 5, 9, 6, 3, 7, 4];
  const flatsT = [4, 7, 3, 6, 2, 5, 1];
  const t = (f >= 0 ? sharpsT.slice(0, f) : flatsT.slice(0, -f));
  return clef === "treble" ? t : t.map((s) => s - 2);
}

export function majorTonicOf(fifths: number): string {
  return MAJOR_TONICS[clampFifths(fifths) + 7];
}
export function minorTonicOf(fifths: number): string {
  return MINOR_TONICS[clampFifths(fifths) + 7];
}

/** Tag text: "Re mayor · 2 ♯", "La♭ mayor · 4 ♭", "Do mayor · sin alteraciones". */
export function signatureTag(fifths: number): string {
  const f = clampFifths(fifths);
  const major = `${solfegeName(majorTonicOf(f))} mayor`;
  if (f === 0) return `${major} · sin alteraciones`;
  return `${major} · ${Math.abs(f)} ${f > 0 ? "♯" : "♭"}`;
}

/** "Re mayor, o su relativa Si menor"; with no alterations "Do mayor o La menor, sin alteraciones". */
export function whichKeyText(fifths: number): string {
  const f = clampFifths(fifths);
  const major = `${solfegeName(majorTonicOf(f))} mayor`;
  const minor = `${solfegeName(minorTonicOf(f))} menor`;
  return f === 0 ? `${major} o ${minor}, sin alteraciones` : `${major}, o su relativa ${minor}`;
}

/** One-line trick to find the major key from the signature. */
export function signatureTrick(fifths: number): string {
  const f = clampFifths(fifths);
  const acc = signatureAccidentals(f);
  if (f === 0) return "Sin alteraciones: es Do mayor (o La menor).";
  const tonic = solfegeName(majorTonicOf(f));
  if (f > 0) {
    const last = solfegeName(acc[acc.length - 1]);
    return `El último sostenido + medio tono = la tónica (${last} → ${tonic}).`;
  }
  if (f === -1) return `Con un solo bemol (${solfegeName(acc[0])}) la tónica es ${tonic}: hay que saberlo de memoria.`;
  return `El penúltimo bemol es la tónica (${solfegeName(acc[acc.length - 2])}).`;
}

export interface OrderView {
  kind: "sharps" | "flats";
  names: string[];
  inUse: boolean[];
  title: string;
}

/** The order of sharps (Fa Do Sol Re La Mi Si) or of flats (Si Mi La Re Sol Do Fa), the ones in the signature marked. */
export function signatureOrder(fifths: number): OrderView {
  const f = clampFifths(fifths);
  const flats = f < 0;
  const letters = flats ? FLAT_ORDER : SHARP_ORDER;
  return {
    kind: flats ? "flats" : "sharps",
    names: letters.map((l) => solfegeName(l)),
    inUse: letters.map((_, i) => i < Math.abs(f)),
    title: flats ? "Orden de los bemoles" : "Orden de los sostenidos",
  };
}

/** Evidence for the detected key, from the notes: where the piece ends and which pitch it leans on. */
export function keyEvidence(notes: Pick<ScheduledNote, "spelledName" | "midi" | "startSec" | "durationSec">[], key: KeyInfo): string[] {
  if (!notes.length) return [];
  const out: string[] = [];
  const last = notes.reduce((a, n) => (n.startSec + n.durationSec >= a.startSec + a.durationSec ? n : a));
  const pcOf = (n: { midi: number }) => ((n.midi % 12) + 12) % 12;
  if (pcOf(last) === key.tonicPc) out.push(`la pieza termina en ${solfegeName(key.tonic)}`);
  const weight = new Array(12).fill(0);
  for (const n of notes) weight[pcOf(n)] += n.durationSec;
  const top = weight.indexOf(Math.max(...weight));
  if (top === key.tonicPc) out.push(`${solfegeName(key.tonic)} es la nota que más suena`);
  else if (top === (key.tonicPc + 7) % 12) out.push(`la nota que más suena es la dominante de ${solfegeName(key.tonic)}`);
  return out;
}

export interface KeySigView {
  fifths: number;
  clef: Clef;
  tag: string;
  accidentals: string[];
  steps: number[];
  which: string;
  /** "La app detectó Re mayor (bastante seguro): la pieza termina en Re." */
  detected: string;
  /** The key the scale is drawn for. */
  key: KeyInfo;
  trick: string;
  order: OrderView;
}

/**
 * Everything the key-signature panel shows. `detected` = the key the app detected for the stretch this signature
 * governs (null = none); it is used when its own signature matches the printed one, otherwise the major key is drawn.
 */
export function buildKeySigView(
  fifths: number,
  clef: Clef,
  detected: KeyInfo | null,
  evidence: string[] = [],
  confidenceWord?: string,
): KeySigView {
  const f = clampFifths(fifths);
  const matches = !!detected && detected.fifths === f;
  const key = matches ? detected! : keyInfo(majorTonicOf(f), "major");
  let text: string;
  if (matches) {
    const why = evidence.length ? `: ${evidence.join(" y ")}` : "";
    text = `La app detectó ${key.label}${confidenceWord ? ` (${confidenceWord})` : ""}${why}.`;
  } else if (detected) {
    text = `La app detectó ${detected.label}, que no coincide con esta armadura; se muestra ${key.label}.`;
  } else {
    text = "La app no pudo decidir entre las dos; se muestra la mayor.";
  }
  return {
    fifths: f,
    clef,
    tag: signatureTag(f),
    accidentals: signatureAccidentals(f),
    steps: signatureSteps(f, clef),
    which: whichKeyText(f),
    detected: text,
    key,
    trick: signatureTrick(f),
    order: signatureOrder(f),
  };
}

/** MIDI numbers to play: the altered notes (octave 4), the ascending scale of the key, and its tonic chord. */
export function keyPlayMidis(key: KeyInfo, accidentals: string[]) {
  const tonicMidi = (Note.midi(`${key.tonic}4`) ?? 60) - (Note.midi(`${key.tonic}4`)! > 65 ? 12 : 0);
  const scale = [0, ...(key.mode === "major" ? [2, 4, 5, 7, 9, 11] : [2, 3, 5, 7, 8, 10]), 12].map((s) => tonicMidi + s);
  const chord = [0, key.mode === "major" ? 4 : 3, 7].map((s) => tonicMidi + s);
  const altered = accidentals.map((n) => ({ name: n, label: noteLabel(n), midi: Note.midi(`${n}4`) ?? 60 }));
  return { scale, chord, altered };
}

/** Which measure range a signature governs: from its measure up to (not including) the next change. */
export interface KeyChange {
  measure: number;
  fifths: number;
}
export function fifthsAtMeasure(changes: readonly KeyChange[], measure: number, fallback: number | null): number | null {
  let f: number | null = fallback;
  for (const c of [...changes].sort((a, b) => a.measure - b.measure)) if (c.measure <= measure) f = c.fifths;
  return f;
}
export function measureRangeOf(changes: readonly KeyChange[], measure: number): { from: number; to: number } {
  const sorted = [...changes].sort((a, b) => a.measure - b.measure);
  let from = -Infinity;
  let to = Infinity;
  for (const c of sorted) {
    if (c.measure <= measure) from = c.measure;
    else {
      to = c.measure - 1;
      break;
    }
  }
  return { from, to };
}
