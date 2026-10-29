import { useSyncExternalStore } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";
import { activeNotes } from "@/lib/music/scheduler";
import { noteColor, subscribe as subscribeColors, getState } from "@/lib/colors/store";
import { RING_NEUTRAL_COLOR, PLAIN_COLOR } from "@/lib/colors/defaults";
import { colorMidiOf, subscribeColorBy, getColorBy } from "@/lib/colors/colorBy";
import { labelWithOctave } from "@/lib/music/transpose";
import { fingeringFor, registerBand, type Alternative, type Fingering } from "@/lib/trumpet/fingerings";
import type { Instrument } from "@/lib/instrument/instrument";
import { PistonsDrawing } from "./PistonsDrawing";

const SPELL = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "Bb", "B"];
const BAND_NAME = ["pedal", "grave", "media", "aguda", "muy aguda"];

/** "Sol5 (G5)" for a midi, flats on B♭ only (the trumpet's own note). */
export function midiLabel(midi: number): string {
  return labelWithOctave(SPELL[((midi % 12) + 12) % 12], midi);
}

export function valvesText(label: string): string {
  return label === "0" ? "al aire" : label;
}

/** "también: 3 (parcial 3)" */
export function alternativesText(alts: Alternative[]): string {
  return alts.map((a) => `${valvesText(a.label)} (parcial ${a.partial})`).join(" · ");
}

/** What the pistons should say about a written note. */
export function describeNote(written: number, instrument: Instrument): { f: Fingering | null; usable: boolean; warn: string | null } {
  const f = fingeringFor(written);
  if (!f || !f.reachable) return { f, usable: false, warn: "Esta nota no existe en la trompeta" };
  const r = instrument.range;
  if (r && (written < r.low || written > r.high)) return { f, usable: true, warn: "Fuera del registro cómodo (Fa♯3 a Do6)" };
  return { f, usable: true, warn: null };
}

/** The note the pistons follow: the one playing first (a hover left behind must not freeze them), else the one under the mouse. Sounding pitch, or null. */
function currentSounding(): number | null {
  // Latest added wins, so a legato overlap shows the new note.
  const pick = (a: Set<number>, b: Set<number>) => (a.size ? [...a].at(-1)! : b.size ? [...b].at(-1)! : null);
  return pick(activeNotes.rh, activeNotes.lh) ?? pick(activeNotes.hoverRh, activeNotes.hoverLh);
}

/**
 * Where the piano keyboard was, for the trumpet: three pistons that go down and up with the playback and with the
 * note under the mouse. Calm on purpose: one thing lit, the rest grey.
 */
export function PistonsView({
  instrument,
  open,
  animate,
  onToggle,
}: {
  instrument: Instrument;
  open: boolean;
  animate: boolean;
  onToggle: () => void;
}) {
  useSyncExternalStore(activeNotes.subscribe, activeNotes.getSnapshot, activeNotes.getSnapshot);
  useSyncExternalStore(subscribeColors, getState, getState);
  useSyncExternalStore(subscribeColorBy, getColorBy, () => "written" as const);

  const sounding = currentSounding();
  const written = sounding === null ? null : sounding - instrument.transposeSemitones;
  const d = written === null ? null : describeNote(written, instrument);
  const colorMidi = written === null || sounding === null ? null : colorMidiOf({ midi: written, soundingMidi: sounding });
  const c = colorMidi === null ? RING_NEUTRAL_COLOR : noteColor(colorMidi);
  const color = c === PLAIN_COLOR ? RING_NEUTRAL_COLOR : c;
  const lit = d?.usable ? d.f : null;

  return (
    <div>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls="pistons-panel"
        aria-label={open ? "Ocultar pistones" : "Mostrar pistones"}
        title={`${open ? "Ocultar pistones" : "Mostrar pistones"} (tecla p)`}
        className="flex h-6 w-full items-center justify-center gap-1.5 border-t border-border bg-card text-xs text-muted-foreground transition-colors hover:text-foreground"
      >
        {open ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronUp className="h-3.5 w-3.5" />}
        Pistones
      </button>
      <div
        id="pistons-panel"
        inert={!open}
        aria-hidden={!open}
        className={`grid ${animate ? "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" : ""} ${
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
        <div className="min-h-0 overflow-hidden">
          <div className="flex h-[172px] w-full items-center justify-center gap-6 bg-muted/30 px-4" data-testid="pistons-view">
            <PistonsDrawing valves={lit?.valves ?? null} color={color} band={written === null || !d?.usable ? null : registerBand(written)} className="h-[150px] w-auto shrink-0" />
            <div className="min-w-0 max-w-sm text-sm" aria-live="polite" data-testid="pistons-readout">
              {written === null || !d ? (
                <div className="text-muted-foreground">Pasá el mouse por una nota o dale a Reproducir.</div>
              ) : (
                <>
                  <div className="text-xs text-muted-foreground">escrita {midiLabel(written)}</div>
                  {lit ? (
                    <>
                      <div className="text-2xl font-semibold leading-tight" data-testid="pistons-label">
                        {lit.label === "0" ? "Al aire" : `Pistones ${lit.label}`}
                      </div>
                      <div className="text-muted-foreground">
                        parcial {lit.partial} · registro {BAND_NAME[registerBand(written)]}
                      </div>
                      {lit.slide && <div className="mt-0.5">{slideText(lit.slide)}</div>}
                      {lit.alternatives.length > 0 && <div className="mt-0.5 text-xs text-muted-foreground">también: {alternativesText(lit.alternatives)}</div>}
                    </>
                  ) : null}
                  {d.warn && <div className="mt-0.5 text-xs italic text-muted-foreground">{d.warn}</div>}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/** The chart says "corredera 3ª afuera"; the screen says it the way she says it. */
export function slideText(slide: string): string {
  return slide.replace("corredera 3ª afuera", "corredera del 3.º afuera");
}
