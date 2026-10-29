import { useEffect, useMemo, useRef, useState } from "react";
import { Play, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChordNoteChips } from "@/components/analysis/ChordNoteChips";
import { MiniStaff, type MiniStaffNote } from "@/components/music/MiniStaff";
import { noteChipStyle, spelledPc } from "@/lib/colors/noteChip";
import { useColors } from "@/lib/colors/store";
import { useMidiInput } from "@/lib/midi/input";
import { chipMidi } from "@/lib/music/analysis/chords";
import { playChordMidi, playNoteMidi, stopAnalysisAudio } from "@/lib/music/analysis/audio";
import type { KeyInfo } from "@/lib/music/analysis/key";
import {
  noteEs,
  noteEsLabel,
  ruleOfOctave,
  spelledWithOctave,
  stepSatisfied,
  voiceRuleOfOctave,
} from "@/lib/music/analysis/ruleOfOctave";
import { DEFAULT_STUDY_BPM } from "@/lib/music/tempo";
import { staffStep } from "@/lib/music/staffMath";

interface Props {
  keyInfo: KeyInfo;
}

/** A pause after a right answer before the next bass note, so the "done" state is seen. */
const ADVANCE_MS = 450;

/**
 * "Regla de la octava": the bass walks up and down the scale, each step carrying a chord (only 1 and 5 in root position).
 * A card with a small grand staff for the chosen step, the 16 steps in a row, Escuchar, and Practicar con el teclado (MIDI).
 */
export function RuleOfOctaveCard({ keyInfo }: Props) {
  const { palette } = useColors(); // repaint when she changes a note color
  const roles = palette.roles;
  const midi = useMidiInput();
  const steps = useMemo(() => ruleOfOctave(keyInfo), [keyInfo]);
  const voicing = useMemo(() => voiceRuleOfOctave(steps, keyInfo.tonic), [steps, keyInfo.tonic]);

  const [sel, setSel] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [practicing, setPracticing] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [done, setDone] = useState<ReadonlySet<number>>(new Set());
  const [finished, setFinished] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const armed = useRef(true);

  const clearTimers = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const stopAll = () => {
    clearTimers();
    stopAnalysisAudio();
    setPlaying(false);
  };
  useEffect(() => () => {
    clearTimers();
    stopAnalysisAudio();
  }, []);
  // A different key means a different path: start over.
  const keyId = keyInfo.id;
  useEffect(() => {
    clearTimers();
    stopAnalysisAudio();
    setSel(0);
    setPlaying(false);
    setPracticing(false);
    setRevealed(false);
    setDone(new Set());
    setFinished(false);
  }, [keyId]);

  const playStep = (i: number) => {
    const v = voicing[i];
    void playChordMidi([v.bass, ...v.upper], 1.8);
  };

  const pick = (i: number) => {
    if (practicing) return;
    stopAll();
    setSel(i);
    playStep(i);
  };

  const listen = () => {
    if (playing) {
      stopAll();
      return;
    }
    stopAll();
    setPracticing(false);
    setFinished(false);
    const beat = 60_000 / DEFAULT_STUDY_BPM;
    setPlaying(true);
    steps.forEach((_, i) => {
      timers.current.push(
        setTimeout(() => {
          setSel(i);
          playStep(i);
        }, i * beat),
      );
    });
    timers.current.push(setTimeout(() => setPlaying(false), steps.length * beat));
  };

  // ---- Practicar con el teclado ----
  const connected = midi.status === "connected";
  const startPractice = () => {
    stopAll();
    setPracticing(true);
    setRevealed(false);
    setFinished(false);
    setDone(new Set());
    setSel(0);
    armed.current = true;
    void playNoteMidi(voicing[0].bass, 1.4);
  };
  const stopPractice = () => {
    clearTimers();
    setPracticing(false);
    setRevealed(false);
  };

  useEffect(() => {
    if (!practicing) return;
    const step = steps[sel];
    const ok = stepSatisfied(step, midi.pressed);
    if (!ok) {
      armed.current = true; // she let go, or has not got there yet: the next success counts
      return;
    }
    if (!armed.current) return; // still holding the previous chord
    armed.current = false;
    setDone((d) => new Set(d).add(sel));
    setRevealed(false);
    const next = sel + 1;
    timers.current.push(
      setTimeout(() => {
        if (next >= steps.length) {
          setPracticing(false);
          setFinished(true);
          return;
        }
        setSel(next);
        void playNoteMidi(voicing[next].bass, 1.4);
      }, ADVANCE_MS),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [midi.pressed, practicing, sel]);

  // ---- what is on screen ----
  const step = steps[sel];
  const v = voicing[sel];
  const hideChord = practicing && !revealed;
  const fillOf = (n: string) => {
    const st = noteChipStyle(spelledPc(n), roles);
    return st.neutral ? undefined : st.background;
  };
  const upperNotes: MiniStaffNote[] = useMemo(() => {
    if (hideChord) return [];
    const spelledByPc = new Map(step.upper.map((n) => [spelledPc(n), n]));
    const sorted = [...v.upper].sort((a, b) => a - b);
    let prevStep = -99;
    let shifted = false;
    return sorted.map((m) => {
      const name = spelledWithOctave(spelledByPc.get(m % 12) ?? step.upper[0], m);
      const s = staffStep(name, "treble");
      // a second apart would collide: nudge that head to the side
      shifted = s - prevStep <= 1 && !shifted;
      prevStep = s;
      return { spelled: name, col: shifted ? 0.42 : 0, fill: fillOf(name) };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hideChord, step, v, roles]);
  const bassName = spelledWithOctave(step.bass, v.bass);
  const bassNotes: MiniStaffNote[] = [{ spelled: bassName, col: 0, fill: fillOf(step.bass), ring: true }];

  const midis = [v.bass, ...v.upper];
  const playChip = (n: string) => {
    const pc = spelledPc(n);
    if (pc >= 0) void playNoteMidi(chipMidi(pc, midis));
  };

  return (
    <div className="rounded-lg border border-border bg-card p-3 text-card-foreground" data-testid="rule-of-octave">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-semibold">Regla de la octava · {keyInfo.label}</h3>
        <span className="text-[11px] tabular-nums text-muted-foreground">
          {sel + 1}/{steps.length}
        </span>
      </div>
      <p className="mt-0.5 text-[11px] text-muted-foreground">
        El bajo sube y baja por la escala. Solo el 1 y el 5 llevan acorde en estado fundamental; los demás van invertidos.
      </p>

      {/* the step on a small grand staff: chord above (clave de Sol), bass below (clave de Fa) */}
      <div className="mt-2 flex flex-col gap-1 overflow-hidden rounded-md" aria-label="Acorde del paso elegido">
        <MiniStaff clef="treble" notes={upperNotes} columns={1} width={180} height={74} ariaLabel="Acorde, clave de Sol" />
        <MiniStaff clef="bass" notes={bassNotes} columns={1} width={180} height={74} ariaLabel="Bajo, clave de Fa" />
      </div>

      <div className="mt-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-base font-semibold" data-testid="octave-chord-name">
            {hideChord ? `Bajo: ${noteEs(step.bass)}` : step.name}
          </span>
          {!hideChord && <span className="text-[11px] text-muted-foreground" title="Cifrado del bajo">{step.figure}</span>}
          <span className="rounded-full border border-border px-2 py-0.5 text-[11px] font-medium" data-testid="octave-fn">
            {hideChord ? "—" : step.fn}
          </span>
        </div>
        {!hideChord && step.leadsTo && (
          <p className="mt-0.5 text-[11px] text-muted-foreground">Dom de la Dom: lleva a {noteEsLabel(step.leadsTo)}.</p>
        )}
        {!hideChord && <p className="mt-0.5 text-[11px] text-muted-foreground">{step.roman}</p>}
        <div className="mt-1.5">
          {hideChord ? (
            <p className="text-xs text-muted-foreground">Tocá el acorde con la mano derecha. El bajo lo pone la app.</p>
          ) : (
            <ChordNoteChips spelled={step.notes} ownIndex={0} onNoteClick={(n) => playChip(n)} />
          )}
        </div>
      </div>

      {/* the 16 steps */}
      <div className="-mx-1 mt-3 overflow-x-auto px-1 pb-1" role="group" aria-label="Los 16 pasos">
        <div className="flex w-max items-stretch gap-1">
          {steps.map((s, i) => {
            const st = noteChipStyle(spelledPc(s.bass), roles);
            const isSel = i === sel;
            const isDone = done.has(i);
            return (
              <div key={i} className="flex items-stretch gap-1">
                {i === 0 && <span className="self-center pr-0.5 text-[10px] italic text-muted-foreground">sube</span>}
                {i === 8 && <span className="self-center px-0.5 text-[10px] italic text-muted-foreground">baja</span>}
                <button
                  type="button"
                  onClick={() => pick(i)}
                  disabled={practicing}
                  aria-pressed={isSel}
                  aria-label={`Paso ${i + 1}, ${s.dir}: bajo ${noteEsLabel(s.bass)}, ${s.fn}${isDone ? ", hecho" : ""}`}
                  data-step={i}
                  data-done={isDone ? "1" : "0"}
                  className={`flex w-[3.6rem] flex-col items-center gap-0.5 rounded-md border px-1 py-1 transition disabled:cursor-default ${
                    isSel ? "border-foreground/60 bg-accent" : "border-border hover:bg-accent/60"
                  } ${isDone ? "bg-emerald-500/10" : ""}`}
                >
                  <span
                    className="rounded px-1.5 text-[11px] font-semibold leading-4"
                    style={{ background: st.background, color: st.color, border: `1px solid ${st.border}` }}
                  >
                    {noteEs(s.bass)}
                  </span>
                  <span className="text-center text-[9px] leading-[1.1] text-muted-foreground">
                    {isDone ? "✓" : practicing && !isDone ? " " : s.fn}
                  </span>
                </button>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" className="gap-1" onClick={listen} disabled={practicing}>
          {playing ? (
            <>
              <Square className="h-3.5 w-3.5" /> Parar
            </>
          ) : (
            <>
              <Play className="h-3.5 w-3.5" /> Escuchar
            </>
          )}
        </Button>
        {!practicing ? (
          <Button size="sm" variant="outline" onClick={startPractice} disabled={!connected}>
            Practicar con el teclado
          </Button>
        ) : (
          <>
            <Button size="sm" variant="outline" onClick={() => setRevealed((r) => !r)}>
              {revealed ? "Ocultar acorde" : "Mostrar acorde"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => void playNoteMidi(v.bass, 1.4)}>
              Repetir bajo
            </Button>
            <Button size="sm" variant="ghost" onClick={stopPractice}>
              Terminar
            </Button>
          </>
        )}
      </div>
      {!connected && !practicing && (
        <p className="mt-1.5 text-[11px] text-muted-foreground">
          No hay teclado MIDI conectado. Conectalo con el botón de arriba a la derecha para practicar; lo demás funciona igual.
        </p>
      )}
      {practicing && (
        <p className="mt-1.5 text-[11px] text-muted-foreground" aria-live="polite">
          Paso {sel + 1} de {steps.length}. Cuando tengas las notas del acorde, pasa al siguiente.
        </p>
      )}
      {finished && (
        <p className="mt-1.5 text-[11px] text-muted-foreground" aria-live="polite">
          Recorriste toda la octava. Cuando quieras, probá de nuevo.
        </p>
      )}
    </div>
  );
}
