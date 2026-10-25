import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Keyboard, Play, RotateCcw, Square, X } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { PLAIN_COLOR } from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import { noteColor, useColors } from "@/lib/colors/store";
import { noteLabel, solfegeName } from "@/lib/music/naming";
import type { KeyInfo } from "@/lib/music/analysis/key";
import { subscribe as subscribeNotes, useMidiInput } from "@/lib/midi/input";
import { advanceScale, checkTonicChord, pcLabel, pcSpelled, scaleTargets, tonicTriadPcs } from "@/lib/music/recorrido/midiChecks";
import { DAYS, NO_TOOL_LINE, STEPS, type RecorridoStep, type Sala, type StepAction } from "@/lib/music/recorrido/steps";
import type { Recorrido } from "@/lib/music/recorrido/useRecorrido";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  recorrido: Recorrido;
  keyInfo: KeyInfo | null;
  bpm: number;
  /** Tempo before step 2 slowed it down, or null. */
  slowFrom: number | null;
  markMode: boolean;
  onMarkModeChange: (v: boolean) => void;
  selectedMeasure: number | null;
  onSelectMeasure: (m: number) => void;
  loopMeasure: number | null;
  onToggleLoop: (m: number) => void;
  onRunAction: (kind: StepAction) => void;
  onRestoreTempo: () => void;
}

const SALA_STYLE: Record<Sala, string> = {
  Entender: "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  Leer: "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  Hablar: "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  Escribir: "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  Oído: "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  Repaso: "bg-slate-200 text-slate-900 dark:bg-slate-800 dark:text-slate-200",
};

function SalaTag({ sala }: { sala: Sala }) {
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${SALA_STYLE[sala]}`}>{sala}</span>;
}

export function RecorridoPanel(props: Props) {
  const { open, onOpenChange, recorrido, markMode, onMarkModeChange } = props;
  const { mode, setMode, progress, goTo, toggleDone, finish, reset } = recorrido;
  const step = STEPS[progress.current - 1] ?? STEPS[0];
  const [confirmReset, setConfirmReset] = useState(false);

  // Marking mode only makes sense while step 5 is on screen.
  useEffect(() => {
    if (markMode && (!open || mode !== "uno" || step.n !== 5)) onMarkModeChange(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, mode, step.n]);

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="left"
        overlay={false}
        className="flex w-[340px] max-w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-[340px]"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
        aria-describedby={undefined}
      >
        <SheetHeader className="pr-6">
          <SheetTitle>Recorrido de la pieza</SheetTitle>
        </SheetHeader>

        <div className="flex items-center gap-1 rounded-md border border-border p-0.5" role="group" aria-label="Cómo verlo">
          {(["uno", "todo"] as const).map((m) => (
            <button
              key={m}
              type="button"
              aria-pressed={mode === m}
              onClick={() => setMode(m)}
              className={`flex-1 rounded px-3 py-1 text-xs transition-colors ${
                mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "uno" ? "De a uno" : "Ver todo"}
            </button>
          ))}
        </div>

        {mode === "uno" ? (
          <StepCard
            step={step}
            {...props}
            done={progress.done.includes(step.n)}
            dots={
              <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Pasos">
                {STEPS.map((s) => {
                  const done = progress.done.includes(s.n);
                  const cur = s.n === step.n;
                  return (
                    <button
                      key={s.n}
                      type="button"
                      onClick={() => goTo(s.n)}
                      aria-label={`Paso ${s.n}: ${s.title}${done ? " (hecho)" : ""}`}
                      aria-current={cur ? "step" : undefined}
                      className={`h-3.5 w-3.5 rounded-full border-2 ${
                        done ? "border-emerald-600 bg-emerald-500" : "border-muted-foreground/50 bg-background"
                      } ${cur ? "ring-2 ring-foreground ring-offset-1 ring-offset-background" : ""}`}
                    />
                  );
                })}
              </div>
            }
            onPrev={() => goTo(step.n - 1)}
            onNext={() => goTo(step.n + 1)}
            onDone={() => (progress.done.includes(step.n) ? toggleDone(step.n) : finish(step.n))}
            progressHard={progress.hard}
            onToggleHard={recorrido.toggleHard}
            onGoTo={goTo}
          />
        ) : (
          <Checklist recorrido={recorrido} />
        )}

        <div className="mt-auto border-t border-border pt-3">
          <Button size="sm" variant="ghost" className="gap-1 text-muted-foreground" onClick={() => setConfirmReset(true)}>
            <RotateCcw className="h-3.5 w-3.5" /> Empezar de nuevo
          </Button>
        </div>

        <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>¿Empezar de nuevo con esta pieza?</AlertDialogTitle>
              <AlertDialogDescription>
                Se borran los pasos hechos y los compases difíciles marcados. Las otras piezas no se tocan.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => {
                  reset();
                  onMarkModeChange(false);
                }}
              >
                Empezar de nuevo
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </SheetContent>
    </Sheet>
  );
}

// ---------- "Ver todo" ----------

function Checklist({ recorrido }: { recorrido: Recorrido }) {
  const { progress, toggleDone, goTo, setMode } = recorrido;
  const doneCount = progress.done.length;
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">
        {doneCount} de {STEPS.length} pasos hechos. Sin apuro: saltear un día no rompe nada.
      </p>
      {DAYS.map((day) => (
        <section key={day}>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day}</h3>
          <ul className="flex flex-col gap-0.5">
            {STEPS.filter((s) => s.day === day).map((s) => {
              const done = progress.done.includes(s.n);
              return (
                <li key={s.n} className="flex items-start gap-2 rounded-md px-1 py-1.5 hover:bg-accent">
                  <Checkbox
                    checked={done}
                    onCheckedChange={() => toggleDone(s.n)}
                    aria-label={`Paso ${s.n} hecho`}
                    className="mt-0.5"
                  />
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    onClick={() => {
                      goTo(s.n);
                      setMode("uno");
                    }}
                    title="Abrir este paso"
                  >
                    <span className={`text-[13px] leading-snug ${done ? "text-muted-foreground line-through" : ""}`}>
                      {s.n}. {s.title}
                    </span>
                  </button>
                  <SalaTag sala={s.sala} />
                  <span className="w-11 shrink-0 text-right text-[11px] tabular-nums text-muted-foreground">{s.time}</span>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

// ---------- "De a uno" ----------

interface CardProps extends Props {
  step: RecorridoStep;
  done: boolean;
  dots: ReactNode;
  onPrev: () => void;
  onNext: () => void;
  onDone: () => void;
  progressHard: number[];
  onToggleHard: (m: number) => void;
  onGoTo: (n: number) => void;
}

function StepCard(p: CardProps) {
  const { step } = p;
  return (
    <div className="flex flex-col gap-3">
      {p.dots}
      <div className="rounded-lg border border-border p-3">
        <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
          Paso {step.n} de {STEPS.length} · {step.day}
        </div>
        <h3 className="mt-0.5 text-base font-semibold leading-snug">{step.title}</h3>
        <div className="mt-1.5 flex items-center gap-2">
          <SalaTag sala={step.sala} />
          <span className="text-xs text-muted-foreground">{step.time}</span>
        </div>

        <ol className="mt-3 flex flex-col gap-2">
          {step.items.map((t, i) => (
            <li key={i} className="flex gap-2 text-sm leading-snug">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[11px] font-semibold">
                {i + 1}
              </span>
              <span>{t}</span>
            </li>
          ))}
        </ol>

        {step.action ? (
          <Button className="mt-3 w-full" onClick={() => p.onRunAction(step.action!.kind)}>
            {step.action.label}
          </Button>
        ) : step.noTool ? (
          <p className="mt-3 rounded-md bg-muted px-2.5 py-2 text-xs italic text-muted-foreground">{NO_TOOL_LINE}</p>
        ) : null}
        {step.note && <p className="mt-2 text-xs text-muted-foreground">{step.note}</p>}
      </div>

      {step.n === 2 && p.slowFrom !== null && (
        <div className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-2 text-xs">
          <span>
            Tempo: {p.bpm} bpm (antes {p.slowFrom})
          </span>
          <Button size="sm" variant="outline" className="h-7" onClick={p.onRestoreTempo}>
            Volver a {p.slowFrom} bpm
          </Button>
        </div>
      )}
      {step.n === 3 && <Step3Check keyInfo={p.keyInfo} />}
      {step.n === 5 && <MarkHard {...p} />}
      {step.n === 6 && <HardList {...p} />}

      <div className="flex items-center gap-2">
        <Button size="sm" variant="outline" disabled={step.n <= 1} onClick={p.onPrev} className="gap-1">
          <ChevronLeft className="h-4 w-4" /> Anterior
        </Button>
        <Button
          size="sm"
          variant={p.done ? "secondary" : "default"}
          className="flex-1 gap-1"
          onClick={p.onDone}
          title={p.done ? "Hecho: apretá para sacar la marca" : "Marcar como hecho y pasar al siguiente"}
        >
          <Check className="h-4 w-4" /> {p.done ? "Hecho" : "Listo"}
        </Button>
        <Button size="sm" variant="outline" disabled={step.n >= STEPS.length} onClick={p.onNext} className="gap-1">
          Siguiente <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ---------- step 5: mark hard measures ----------

function MarkHard(p: CardProps) {
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <Button
        size="sm"
        variant={p.markMode ? "default" : "outline"}
        aria-pressed={p.markMode}
        onClick={() => p.onMarkModeChange(!p.markMode)}
      >
        {p.markMode ? "Listo de marcar" : "Marcar compás difícil"}
      </Button>
      {p.markMode && (
        <p className="text-xs text-muted-foreground">Tocá un compás de la partitura para marcarlo. Tocalo otra vez para sacar la marca.</p>
      )}
      {p.progressHard.length === 0 ? (
        <p className="text-xs text-muted-foreground">Todavía no marcaste ninguno. Con 2–3 alcanza.</p>
      ) : (
        <ul className="flex flex-wrap gap-1.5" aria-label="Compases marcados">
          {p.progressHard.map((m) => (
            <li key={m}>
              <button
                type="button"
                onClick={() => p.onToggleHard(m)}
                title="Sacar la marca"
                className="flex items-center gap-1 rounded-full border border-amber-600 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-900 dark:bg-amber-950 dark:text-amber-100"
              >
                comp. {m} <X className="h-3 w-3" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ---------- step 6: the list ----------

function HardList(p: CardProps) {
  if (p.progressHard.length === 0) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
        <p className="text-xs text-muted-foreground">Todavía no marcaste compases difíciles.</p>
        <Button size="sm" variant="outline" onClick={() => p.onGoTo(5)}>
          Ir al paso 5
        </Button>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="text-xs font-semibold">Tus compases difíciles</div>
      <ul className="flex flex-col gap-1">
        {p.progressHard.map((m) => {
          const sel = p.selectedMeasure === m;
          const looping = p.loopMeasure === m;
          return (
            <li key={m} className={`flex items-center gap-2 rounded-md px-1.5 py-1 ${sel ? "bg-accent" : ""}`}>
              <button
                type="button"
                aria-pressed={sel}
                onClick={() => p.onSelectMeasure(m)}
                className="flex-1 text-left text-sm font-medium hover:underline"
                title="Ver en la partitura"
              >
                compás {m}
              </button>
              <Button
                size="sm"
                variant={looping ? "secondary" : "outline"}
                className="h-7 gap-1 px-2"
                onClick={() => p.onToggleLoop(m)}
              >
                {looping ? (
                  <>
                    <Square className="h-3.5 w-3.5" /> Parar
                  </>
                ) : (
                  <>
                    <Play className="h-3.5 w-3.5" /> Repetir
                  </>
                )}
              </Button>
            </li>
          );
        })}
      </ul>
      <p className="text-[11px] text-muted-foreground">"Repetir" toca ese compás en bucle hasta que apretés Parar.</p>
    </div>
  );
}

// ---------- step 3: the MIDI check ----------

function NoteSquare({ pc, spelled, lit, order }: { pc: number; spelled: string; lit: boolean; order?: number }) {
  const fill = noteColor(pc);
  const plain = fill === PLAIN_COLOR;
  const bg = plain ? "#ffffff" : fill;
  return (
    <div className="flex w-7 flex-col items-center gap-1">
      <div
        className="flex h-7 w-7 items-center justify-center rounded-[3px] text-[9px] font-semibold transition-opacity"
        style={{
          background: bg,
          color: readableTextOn(bg),
          border: "2.5px solid #111827",
          opacity: lit ? 1 : 0.4,
          boxShadow: lit ? "0 0 0 3px #F59E0B" : undefined,
        }}
        title={noteLabel(spelled)}
      >
        {solfegeName(spelled)}
      </div>
      {order !== undefined && <span className="text-[11px] font-semibold">{order}</span>}
    </div>
  );
}

function Step3Check({ keyInfo }: { keyInfo: KeyInfo | null }) {
  useColors(); // repaint when she changes note colors
  const midi = useMidiInput();
  const connected = midi.status === "connected";
  const [idx, setIdx] = useState(0);
  const idxRef = useRef(0);
  const [hint, setHint] = useState<string | null>(null);
  const [scaleManual, setScaleManual] = useState(false);
  const [chordDone, setChordDone] = useState(false);
  const [chordManual, setChordManual] = useState(false);
  const keyId = keyInfo?.id;

  useEffect(() => {
    idxRef.current = 0;
    setIdx(0);
    setHint(null);
    setScaleManual(false);
    setChordDone(false);
    setChordManual(false);
  }, [keyId]);

  useEffect(() => {
    if (!keyInfo) return;
    return subscribeNotes((e) => {
      if (e.type !== "on") return;
      const r = advanceScale(keyInfo, idxRef.current, e.midi);
      idxRef.current = r.idx;
      setIdx(r.idx);
      setHint(r.hint);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyId]);

  const chord = keyInfo ? checkTonicChord(keyInfo, midi.pressed) : null;
  useEffect(() => {
    if (chord?.done) setChordDone(true);
  }, [chord?.done]);

  if (!keyInfo) {
    return (
      <p className="rounded-lg border border-border p-3 text-xs text-muted-foreground">
        Todavía no hay tonalidad para esta pieza. Abrí una partitura para hacer el chequeo.
      </p>
    );
  }

  const targets = scaleTargets(keyInfo);
  const scaleDone = idx >= targets.length || scaleManual;
  const triad = tonicTriadPcs(keyInfo);
  const have = new Set([...midi.pressed].map((m) => ((m % 12) + 12) % 12));
  const needsClick = midi.status === "idle" || midi.status === "no-devices" || midi.status === "denied" || midi.status === "error";

  const restartScale = () => {
    idxRef.current = 0;
    setIdx(0);
    setHint(null);
    setScaleManual(false);
  };

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-3">
      {connected ? (
        <p className="flex items-center gap-1.5 text-xs text-emerald-700 dark:text-emerald-400">
          <Keyboard className="h-3.5 w-3.5" /> Teclado: {midi.devices[0] ?? "conectado"}. Te escucho.
        </p>
      ) : (
        <div className="flex flex-col gap-1.5 text-xs text-muted-foreground">
          <p>Para que la app te escuche, conectá tu teclado. Si no, usá "Lo hice" cuando termines.</p>
          {needsClick && (
            <Button size="sm" variant="outline" className="w-fit gap-1" onClick={() => void midi.connect()}>
              <Keyboard className="h-3.5 w-3.5" /> {midi.remembered ? "Reconectar teclado MIDI" : "Conectar teclado MIDI"}
            </Button>
          )}
        </div>
      )}

      {/* a. scale */}
      <div className="flex flex-col gap-2">
        <div className="text-sm font-semibold">Tocá la escala de {keyInfo.label} subiendo, una octava.</div>
        <div className="flex gap-1" role="group" aria-label="Grados de la escala">
          {targets.map((pc, i) => (
            <NoteSquare
              key={i}
              pc={pc}
              spelled={pcSpelled(pc, keyInfo)}
              lit={i < idx || scaleManual}
              order={i < 7 ? i + 1 : 8}
            />
          ))}
        </div>
        {hint && !scaleDone && <p className="text-xs italic text-muted-foreground">{hint}</p>}
        {scaleDone ? (
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Salió la escala.
            <button type="button" className="font-normal text-muted-foreground underline" onClick={restartScale}>
              Otra vez
            </button>
          </p>
        ) : (
          !connected && (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setScaleManual(true)}>
              Lo hice ✓
            </Button>
          )
        )}
      </div>

      {/* b. tonic chord */}
      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <div className="text-sm font-semibold">Tocá el acorde de tónica ({keyInfo.label}) todo junto.</div>
        <div className="flex gap-1" role="group" aria-label="Notas del acorde">
          {triad.map((pc, i) => (
            <NoteSquare
              key={i}
              pc={pc}
              spelled={pcSpelled(pc, keyInfo)}
              lit={chordDone || chordManual || have.has(pc)}
              order={[1, 3, 5][i]}
            />
          ))}
        </div>
        {chord && !chordDone && !chordManual && midi.pressed.size >= 3 && (chord.missing.length > 0 || chord.extra.length > 0) && (
          <p className="text-xs italic text-muted-foreground">
            {chord.missing.length > 0 && <>Falta: {chord.missing.map((pc) => pcLabel(pc, keyInfo)).join(", ")}. </>}
            {chord.extra.length > 0 && <>Sobra: {chord.extra.map((pc) => pcLabel(pc, keyInfo)).join(", ")}.</>}
          </p>
        )}
        {chordDone || chordManual ? (
          <p className="flex items-center gap-2 text-xs font-medium text-emerald-700 dark:text-emerald-400">
            <Check className="h-3.5 w-3.5" /> Salió el acorde.
            <button
              type="button"
              className="font-normal text-muted-foreground underline"
              onClick={() => {
                setChordDone(false);
                setChordManual(false);
              }}
            >
              Otra vez
            </button>
          </p>
        ) : (
          !connected && (
            <Button size="sm" variant="outline" className="w-fit" onClick={() => setChordManual(true)}>
              Lo hice ✓
            </Button>
          )
        )}
      </div>
    </div>
  );
}
