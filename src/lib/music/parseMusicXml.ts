import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { Hand, ScheduledNote } from "./types";
import { midiToName } from "./midiUtils";
import { durationNameFor } from "./naming";
import { markPhrases } from "./melodicLine";
import { noteColor, noteTargetOn } from "@/lib/colors/store";
import { PLAIN_COLOR } from "@/lib/colors/defaults";
import { getColorBy } from "@/lib/colors/colorBy";

const LETTER_BY_SEMITONE: Record<number, string> = { 0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B" };

function spellPitch(pitch: any, midi: number): string {
  const letter = LETTER_BY_SEMITONE[pitch?.FundamentalNote as number];
  const alter = Math.round(pitch?.AccidentalHalfTones ?? 0);
  if (letter === undefined) {
    // Fall back to sharps from the MIDI number.
    return ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"][midi % 12];
  }
  return letter + (alter > 0 ? "#".repeat(alter) : "b".repeat(-alter));
}

/** Chromatic transpose (<transpose><chromatic>, B♭ trumpet = -2) of the part a source note belongs to; 0 when none. */
function partTranspose(src: any): number {
  const t = src?.ParentStaffEntry?.ParentStaff?.ParentInstrument?.PlaybackTranspose;
  return typeof t === "number" && Number.isFinite(t) ? t : 0;
}

export interface ParseResult {
  notes: ScheduledNote[];
  bpm: number;
  durationSec: number;
}

/**
 * Set per-VoiceEntry stem colors (bottom note's pitch class) and per-note
 * notehead colors (only where the note's "notehead" target is on).
 * MUST be called AFTER osmd.load() and BEFORE osmd.render().
 */
export function applyStemColors(osmd: OpenSheetMusicDisplay) {
  const sheet: any = (osmd as any).Sheet;
  if (!sheet) return;
  try {
    (osmd as any).EngravingRules.ColoringEnabled = true;
  } catch {
    /* ignore */
  }
  const bySounding = getColorBy() === "sounding";
  for (const measure of sheet.SourceMeasures ?? []) {
    for (const vssec of measure.VerticalSourceStaffEntryContainers ?? []) {
      for (const se of vssec.StaffEntries ?? []) {
        if (!se) continue;
        for (const ve of se.VoiceEntries ?? []) {
          let bottomMidi = Infinity;
          for (const n of ve.Notes ?? []) {
            if (n.isRest?.()) continue;
            const p = n.Pitch;
            if (!p) continue;
            // Colored by the written pitch, or by the sounding one when she chose "Color por: suena".
            const midi = (p.halfTone ?? 0) + 12 + (bySounding ? partTranspose(n) : 0);
            if (midi < bottomMidi) bottomMidi = midi;
            // Hollow noteheads stay hollow when colored, so duration stays readable.
            n.NoteheadColor = noteTargetOn(midi, "notehead") ? noteColor(midi) : PLAIN_COLOR;
          }
          if (bottomMidi !== Infinity) {
            ve.StemColor = noteTargetOn(bottomMidi, "stem") ? noteColor(bottomMidi) : PLAIN_COLOR;
          }
        }
      }
    }
  }
}

/**
 * Walk the rendered GraphicSheet to extract scheduled notes AND capture
 * the SVG <g> notehead element for each note. This requires osmd.render()
 * to have been called first.
 */
export function parseSheetToNotes(osmd: OpenSheetMusicDisplay, bpm = 90): ParseResult {
  const gSheet: any = (osmd as any).GraphicSheet;
  const sheet: any = (osmd as any).Sheet;
  if (!gSheet || !sheet) return { notes: [], bpm, durationSec: 0 };

  const secondsPerWhole = (60 / bpm) * 4;
  const notes: ScheduledNote[] = [];
  let maxEnd = 0;
  let idCounter = 0;

  const staffCount = sheet.Instruments?.[0]?.Staves?.length ?? 1;

  const measureList: any[][] = gSheet.MeasureList ?? [];
  for (const measureRow of measureList) {
    for (const gMeasure of measureRow ?? []) {
      if (!gMeasure) continue;
      const staffIdx = gMeasure.ParentStaff?.idInMusicSheet ?? 0;
      const staffEntries = gMeasure.staffEntries ?? [];
      for (const gStaffEntry of staffEntries) {
        for (const gVoiceEntry of gStaffEntry.graphicalVoiceEntries ?? []) {
          const gNotes = gVoiceEntry.notes ?? [];
          // VexFlow note (shared by all chord-mates in this voice entry).
          const vfNote = gNotes[0]?.vfnote?.[0];
          const accidentalMods: any[] = (() => {
            try {
              const mods = vfNote?.modifiers ?? vfNote?.getModifiers?.() ?? [];
              return mods.filter(
                (m: any) =>
                  m?.getCategory?.() === "accidentals" ||
                  m?.constructor?.CATEGORY === "accidentals",
              );
            } catch {
              return [];
            }
          })();

          for (let noteIdx = 0; noteIdx < gNotes.length; noteIdx++) {
            const gNote = gNotes[noteIdx];
            const src = gNote.sourceNote;
            if (!src) continue;
            if (src.isRest?.()) continue;
            const pitch = src.Pitch;
            if (!pitch) continue;
            const midi = (pitch.halfTone ?? 0) + 12;
            const soundingMidi = midi + partTranspose(src);
            const length = src.Length?.RealValue ?? 0;
            if (length <= 0) continue;

            const absTs =
              src.getAbsoluteTimestamp?.()?.RealValue ??
              ((src.ParentStaffEntry?.Timestamp?.RealValue ?? 0) +
                (src.SourceMeasure?.AbsoluteTimestamp?.RealValue ?? 0));

            let hand: Hand;
            if (staffCount >= 2) {
              hand = staffIdx === 0 ? "RH" : "LH";
            } else {
              hand = midi >= 60 ? "RH" : "LH";
            }

            const startSec = absTs * secondsPerWhole;
            const durationSec = length * secondsPerWhole;
            maxEnd = Math.max(maxEnd, startSec + durationSec);

            const id = `n${idCounter++}`;
            const svgEls: SVGGElement[] = [];
            const el = gNote.getSVGGElement?.() as SVGGElement | undefined;
            if (el) {
              el.dataset.noteId = id;
              el.dataset.hand = hand;
              svgEls.push(el);
            }

            // Match VexFlow accidental modifiers to this note by chord index.
            const accidentalEls: SVGElement[] = [];
            for (const m of accidentalMods) {
              const mIdx = typeof m.index === "number" ? m.index : m.getIndex?.();
              if (mIdx !== undefined && mIdx !== noteIdx) continue;
              const aEl =
                (m.attrs?.el as SVGElement | undefined) ??
                (m.getAttribute?.("el") as SVGElement | undefined);
              if (aEl) accidentalEls.push(aEl);
            }

            const posInMeasure: number | undefined = src.ParentStaffEntry?.Timestamp?.RealValue;
            const denom: number | undefined = src.SourceMeasure?.ActiveTimeSignature?.Denominator;
            const beat =
              typeof posInMeasure === "number" && denom ? Math.floor(posInMeasure * denom + 1e-6) + 1 : undefined;
            const typeLen = src.TypeLength?.RealValue;
            const slurEnd = (src.NoteSlurs ?? []).some((sl: any) => sl?.EndNote === src);
            const tie = src.NoteTie;
            const tieContinuation = !!tie && tie.StartNote !== src;

            notes.push({
              id,
              midi,
              soundingMidi,
              noteName: midiToName(midi),
              startSec,
              durationSec,
              hand,
              measure: src.SourceMeasure?.MeasureNumber ?? 0,
              beat,
              durationName: durationNameFor(typeLen, length),
              spelledName: spellPitch(pitch, midi),
              slurEnd,
              tieContinuation,
              system: gMeasure.ParentStaffLine?.ParentMusicSystem?.Id ?? 0,
              voice: src.ParentVoiceEntry?.ParentVoice?.VoiceId,
              svgEls,
              accidentalEls,
            });
          }
        }
      }
    }
  }

  notes.sort((a, b) => a.startSec - b.startSec);
  markPhrases(notes);
  return { notes, bpm, durationSec: maxEnd };
}
