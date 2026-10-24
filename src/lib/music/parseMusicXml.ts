import type { OpenSheetMusicDisplay } from "opensheetmusicdisplay";
import type { Hand, ScheduledNote } from "./types";
import { midiToName, pitchClassColor } from "./midiUtils";

export interface ParseResult {
  notes: ScheduledNote[];
  bpm: number;
  durationSec: number;
}

/**
 * Set per-VoiceEntry stem colors based on the bottom note's pitch class.
 * MUST be called AFTER osmd.load() and BEFORE osmd.render().
 * Noteheads are intentionally left at their default color so duration
 * (filled vs. hollow) remains visually readable.
 */
export function applyStemColors(osmd: OpenSheetMusicDisplay) {
  const sheet: any = (osmd as any).Sheet;
  if (!sheet) return;
  try {
    (osmd as any).EngravingRules.ColoringEnabled = true;
  } catch {
    /* ignore */
  }
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
            const midi = (p.halfTone ?? 0) + 12;
            if (midi < bottomMidi) bottomMidi = midi;
          }
          if (bottomMidi !== Infinity) {
            ve.StemColor = pitchClassColor(bottomMidi);
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

            notes.push({
              id,
              midi,
              noteName: midiToName(midi),
              startSec,
              durationSec,
              hand,
              svgEls,
              accidentalEls,
            });
          }
        }
      }
    }
  }

  notes.sort((a, b) => a.startSec - b.startSec);
  return { notes, bpm, durationSec: maxEnd };
}
