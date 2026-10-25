import { useEffect, useState, type ReactNode } from "react";
import { ChevronDown, Play, Square } from "lucide-react";
import { ChordCircle, type CircleChord } from "@/components/analysis/ChordCircle";
import { roleColor } from "@/lib/colors/roleColor";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { PLAIN_COLOR } from "@/lib/colors/defaults";
import { readableTextOn } from "@/lib/colors/color";
import { noteColor, useColors } from "@/lib/colors/store";
import { solfegeName } from "@/lib/music/naming";
import { keyFromId } from "@/lib/music/analysis/key";
import {
  FUNCTION_ROLE,
  FUNCTION_ES,
  FUNCTION_SHORT,
  scaleMidi,
  scaleSteps,
  voiceChordMidi,
  type ScaleChord,
} from "@/lib/music/analysis/chords";
import type { PieceChord } from "@/lib/music/analysis/pieceChords";
import type { Ficha, ChordHighlight } from "@/lib/music/analysis/useFicha";
import { playChordMidi, playChordsInOrder, playNoteMidi, playSequence, stopAnalysisAudio } from "@/lib/music/analysis/audio";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  ficha: Ficha;
  showChordMarks: boolean;
  onShowChordMarksChange: (v: boolean) => void;
  highlight: ChordHighlight;
  onHighlightChange: (h: ChordHighlight) => void;
  onFocusChord: (index: number) => void;
}

function Section({ title, defaultOpen = true, children }: { title: string; defaultOpen?: boolean; children: ReactNode }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="rounded-lg border border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-sm font-semibold">
        {title}
        <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </CollapsibleTrigger>
      <CollapsibleContent className="px-3 pb-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}

/** Shorter quality words for the small circles. */
const SHORT_Q: Record<string, string> = { disminuido: "dism.", aumentado: "aum." };


export function FichaPanel({
  open,
  onOpenChange,
  ficha,
  showChordMarks,
  onShowChordMarksChange,
  highlight,
  onHighlightChange,
  onFocusChord,
}: Props) {
  const { palette } = useColors(); // re-render when she repaints roles
  const roles = palette.roles;
  const { key, detection, triads, sevenths, chords } = ficha;
  const [useSevenths, setUseSevenths] = useState(false);
  const [listening, setListening] = useState<number | null>(null);
  const [circleSource, setCircleSource] = useState<"scale" | "piece">("scale");
  const [scaleIdx, setScaleIdx] = useState(0);
  const [pieceIdx, setPieceIdx] = useState(0);

  const scale = useSevenths ? sevenths : triads;
  const countByDegree = new Map<number, number>();
  for (const c of chords) if (c.degree) countByDegree.set(c.degree, (countByDegree.get(c.degree) ?? 0) + 1);

  const timeSig = ficha.meta.timeSig ? `${ficha.meta.timeSig.beats}/${ficha.meta.timeSig.beatType}` : null;

  const confidenceText = () => {
    if (!detection) return "";
    if (ficha.overridden) return "elegida por vos";
    if (detection.confidenceWord === "bastante seguro") return "bastante seguro";
    return `dudoso: ¿o ${detection.runnerUp.key.label}?`;
  };

  const listen = () => {
    if (!key) return;
    if (listening !== null) {
      stopAnalysisAudio();
      setListening(null);
      return;
    }
    const up = scaleMidi(key);
    const seq = [...up, ...up.slice(0, -1).reverse()];
    setListening(0);
    void playSequence(
      seq,
      0.42,
      (i) => setListening(i <= 7 ? i % 7 : (14 - i) % 7),
      () => setListening(null),
    );
  };

  const playScaleChord = (c: ScaleChord) => {
    setCircleSource("scale");
    setScaleIdx(c.degree - 1);
    void playChordMidi(voiceChordMidi(c.pcs));
    onHighlightChange(highlight?.kind === "degree" && highlight.degree === c.degree ? null : { kind: "degree", degree: c.degree });
  };

  const clickPieceChord = (i: number, c: PieceChord) => {
    setCircleSource("piece");
    setPieceIdx(i);
    void playChordMidi(voiceChordMidi(c.pcs));
    onHighlightChange({ kind: "chord", index: i });
    onFocusChord(i);
  };

  // ---- Círculo: the chord being drawn ----
  const source = circleSource === "piece" && chords.length > 0 ? "piece" : "scale";
  const sIdx = Math.min(scaleIdx, Math.max(scale.length - 1, 0));
  const pIdx = Math.min(pieceIdx, Math.max(chords.length - 1, 0));
  const idx = source === "piece" ? pIdx : sIdx;
  const count = source === "piece" ? chords.length : scale.length;
  const sc = scale[sIdx];
  const pc = chords[pIdx];
  const circleChord: CircleChord | null =
    source === "piece" && pc
      ? { name: pc.name, notes: pc.notes, pcs: pc.pcs, rootPc: pc.rootPc, roleId: pc.roleId, fn: pc.fn, inScale: pc.inScale }
      : sc
        ? { name: sc.name, notes: sc.notes, pcs: sc.pcs, rootPc: sc.rootPc, roleId: sc.roleId, fn: sc.fn, inScale: true }
        : null;
  const tonicTriad = triads[0];
  const isDominant = !!circleChord && circleChord.inScale && circleChord.fn === "D";

  const stepCircle = (d: number) => {
    const n = idx + d;
    if (n < 0 || n >= count) return;
    if (source === "piece") {
      setPieceIdx(n);
      onHighlightChange({ kind: "chord", index: n });
      onFocusChord(n);
    } else {
      setScaleIdx(n);
    }
  };
  const listenCircle = () => {
    if (circleChord) void playChordMidi(voiceChordMidi(circleChord.pcs));
  };
  const listenResolution = () => {
    if (circleChord && tonicTriad) void playChordsInOrder([voiceChordMidi(circleChord.pcs), voiceChordMidi(tonicTriad.pcs)]);
  };
  const keyId = key?.id;
  useEffect(() => {
    setScaleIdx(0);
    setPieceIdx(0);
  }, [keyId]);

  const outsideColor = roleColor(roles, "chord-outsideScale", "#78716C");

  return (
    <Sheet open={open} onOpenChange={onOpenChange} modal={false}>
      <SheetContent
        side="right"
        overlay={false}
        className="flex w-full flex-col gap-3 overflow-y-auto p-4 sm:max-w-md"
        onInteractOutside={(e) => e.preventDefault()}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader>
          <SheetTitle>Ficha de la pieza</SheetTitle>
        </SheetHeader>

        {!key ? (
          <p className="text-sm text-muted-foreground">Abrí una partitura para ver su ficha.</p>
        ) : (
          <>
            {/* a. Tonalidad */}
            <Section title="Tonalidad">
              <div className="text-2xl font-semibold leading-tight">{key.label}</div>
              <div className="mt-0.5 text-sm text-muted-foreground">{confidenceText()}</div>
              {detection && !ficha.overridden && detection.mode.differs && (
                <div className="mt-1 text-xs text-muted-foreground">Modo que mejor encaja: {detection.mode.label}</div>
              )}
              {timeSig && <div className="mt-1 text-xs text-muted-foreground">Compás {timeSig}</div>}
              <div className="mt-3 flex items-center gap-2">
                <Select value={ficha.overrideId ?? "auto"} onValueChange={(v) => ficha.setOverride(v === "auto" ? null : v)}>
                  <SelectTrigger className="h-8 flex-1 text-sm" aria-label="Elegir otra tonalidad">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Detectada: {detection?.best.key.label ?? "—"}</SelectItem>
                    {ficha.keyIds.map((id) => (
                      <SelectItem key={id} value={id}>
                        {keyFromId(id)?.label ?? id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </Section>

            {/* b. Escala */}
            <Section title="Escala">
              <ScaleStrip
                keyNotes={key.notes}
                pcs={key.pcs}
                steps={scaleSteps(key)}
                midis={scaleMidi(key)}
                lit={listening}
              />
              <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={listen}>
                {listening === null ? (
                  <>
                    <Play className="h-3.5 w-3.5" /> Escuchar
                  </>
                ) : (
                  <>
                    <Square className="h-3.5 w-3.5" /> Parar
                  </>
                )}
              </Button>
            </Section>

            {/* b2. Círculo */}
            {circleChord && (
              <Section title="Círculo">
                <div className="mb-2 flex items-center gap-1 text-xs" role="group" aria-label="Qué acordes recorrer">
                  {(["scale", "piece"] as const).map((s) => (
                    <button
                      key={s}
                      type="button"
                      disabled={s === "piece" && chords.length === 0}
                      aria-pressed={source === s}
                      onClick={() => setCircleSource(s)}
                      className={`rounded-full border px-3 py-1 font-medium disabled:opacity-40 ${source === s ? "border-foreground bg-foreground text-background" : "border-border hover:bg-accent"}`}
                    >
                      {s === "scale" ? "Escala" : "Pieza"}
                    </button>
                  ))}
                  {source === "piece" && pc && (
                    <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">
                      compás {pc.measure}
                      {pc.beat > 1 ? `·${pc.beat}` : ""} · {idx + 1}/{count}
                    </span>
                  )}
                  {source === "scale" && <span className="ml-auto text-[11px] tabular-nums text-muted-foreground">{sc?.roman}</span>}
                </div>
                <ChordCircle keyInfo={key} chord={circleChord} tonicPcs={tonicTriad?.pcs ?? []} />
                {!circleChord.inScale && (
                  <p className="mt-1 text-center text-xs italic text-muted-foreground">
                    Este acorde está fuera de la escala: se dibuja con borde punteado.
                  </p>
                )}
                {isDominant && (
                  <p className="mt-1 text-center text-[11px] text-muted-foreground">
                    Las flechas muestran hacia dónde baja o sube cada nota para llegar a casa (la más gruesa = la que más empuja).
                  </p>
                )}
                <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
                  <Button size="sm" variant="outline" disabled={idx <= 0} onClick={() => stepCircle(-1)}>
                    ◀ Anterior
                  </Button>
                  <Button size="sm" variant="outline" disabled={idx >= count - 1} onClick={() => stepCircle(1)}>
                    Siguiente ▶
                  </Button>
                  <Button size="sm" className="gap-1" onClick={listenCircle}>
                    <Play className="h-3.5 w-3.5" /> Escuchar
                  </Button>
                  {isDominant && (
                    <Button size="sm" variant="secondary" className="gap-1" onClick={listenResolution}>
                      <Play className="h-3.5 w-3.5" /> Escuchar la resolución
                    </Button>
                  )}
                </div>
              </Section>
            )}

            {/* c. Acordes de la escala */}
            <Section title="Acordes de la escala">
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={useSevenths} onCheckedChange={setUseSevenths} />
                <span className={useSevenths ? "italic text-foreground" : ""}>Con séptima</span>
              </label>
              <div className="grid grid-cols-7 gap-1">
                {scale.map((c) => {
                  const lit = highlight?.kind === "degree" && highlight.degree === c.degree;
                  const n = countByDegree.get(c.degree) ?? 0;
                  return (
                    <button
                      key={c.degree}
                      type="button"
                      onClick={() => playScaleChord(c)}
                      aria-pressed={lit}
                      title={`${c.name}: ${c.notesEs.join(" · ")}`}
                      className="flex flex-col items-center gap-0.5 rounded-md p-0.5 hover:bg-accent"
                    >
                      <span
                        className="relative flex h-[52px] w-[52px] flex-col items-center justify-center rounded-full bg-background text-center leading-none"
                        style={{
                          border: `${lit ? 4 : 2.5}px solid ${roleColor(roles, c.roleId)}`,
                          boxShadow: lit ? `0 0 0 2px ${roleColor(roles, c.roleId)}55` : undefined,
                        }}
                      >
                        <span className="text-[12px] font-semibold">{c.rootEs}</span>
                        <span className="mt-0.5 text-[9px] text-muted-foreground">{SHORT_Q[c.qualityEs] ?? c.qualityEs}</span>
                        {n > 0 && (
                          <span className="absolute -right-1 -top-1 rounded-full bg-foreground px-1 text-[9px] font-medium leading-4 text-background">
                            ×{n}
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] font-semibold">{c.roman}</span>
                      <span
                        className="rounded px-1 text-[9px] font-medium leading-4"
                        style={{
                          background: roleColor(roles, FUNCTION_ROLE[c.fn], "#D1D5DB"),
                          color: readableTextOn(roleColor(roles, FUNCTION_ROLE[c.fn], "#D1D5DB")),
                        }}
                        title={FUNCTION_ES[c.fn]}
                      >
                        {FUNCTION_SHORT[c.fn]}
                      </span>
                      <span className="text-center text-[9px] leading-tight text-muted-foreground">{c.notesEs.join(" ")}</span>
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[11px] text-muted-foreground">Tón = tónica · Subd = subdominante · Dom = dominante</p>
            </Section>

            {/* d. Acordes de la pieza */}
            <Section title="Acordes de la pieza">
              <label className="mb-2 flex items-center gap-2 text-xs text-muted-foreground">
                <Switch checked={showChordMarks} onCheckedChange={onShowChordMarksChange} />
                <span className={showChordMarks ? "italic text-foreground" : ""}>Acordes sobre la partitura</span>
              </label>
              {chords.length === 0 ? (
                <p className="text-sm text-muted-foreground">No encontré acordes completos (hay pocas notas juntas).</p>
              ) : (
                <ol className="flex flex-col gap-1">
                  {chords.map((c, i) => {
                    const lit = highlight?.kind === "chord" && highlight.index === i;
                    const color = roleColor(roles, c.roleId);
                    return (
                      <li key={`${c.startSec}-${i}`}>
                        <button
                          type="button"
                          onClick={() => clickPieceChord(i, c)}
                          aria-pressed={lit}
                          className={`flex w-full items-center gap-2 rounded-md px-1.5 py-1 text-left hover:bg-accent ${lit ? "bg-accent" : ""}`}
                        >
                          <span className="w-16 shrink-0 text-[11px] tabular-nums text-muted-foreground">
                            comp. {c.measure}
                            {c.beat > 1 ? `·${c.beat}` : ""}
                          </span>
                          <span
                            className="rounded-full bg-background px-2.5 py-0.5 text-xs font-semibold"
                            style={{ border: `2px ${c.inScale ? "solid" : "dashed"} ${color}` }}
                          >
                            {c.name}
                            {c.bassEs ? <span className="font-normal text-muted-foreground"> /{c.bassEs}</span> : null}
                          </span>
                          {c.inScale ? (
                            <span className="text-xs font-semibold">{c.roman}</span>
                          ) : (
                            <span className="text-[11px] italic" style={{ color: outsideColor }}>
                              fuera de la escala
                            </span>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ol>
              )}
            </Section>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Callipari-style strip: 7 outline squares filled with her note colors, steps (1 / ½) between, degree under each. */
function ScaleStrip({
  keyNotes,
  pcs,
  steps,
  midis,
  lit,
}: {
  keyNotes: string[];
  pcs: number[];
  steps: number[];
  midis: number[];
  lit: number | null;
}) {
  useColors(); // repaint when note colors change
  return (
    <div className="flex items-start">
      {keyNotes.map((n, i) => {
        const fill = noteColor(pcs[i]);
        const plain = fill === PLAIN_COLOR;
        const bg = plain ? "#ffffff" : fill;
        return (
          <div key={i} className="flex items-start">
            <div className="flex w-9 flex-col items-center gap-1">
              <button
                type="button"
                onClick={() => void playNoteMidi(midis[i])}
                title={`${solfegeName(n)} — tocar`}
                className="flex h-9 w-9 items-center justify-center rounded-[4px] text-[11px] font-semibold"
                style={{
                  background: bg,
                  color: readableTextOn(bg),
                  border: `2.5px solid ${plain ? "#111827" : "#111827"}`,
                  boxShadow: lit === i ? "0 0 0 3px #F59E0B" : undefined,
                }}
              >
                {solfegeName(n)}
              </button>
              <span className="text-xs font-semibold">{i + 1}</span>
            </div>
            {i < keyNotes.length - 1 && (
              <div className="flex h-9 w-[18px] items-center justify-center text-[11px] text-muted-foreground">
                {steps[i] === 1 ? "1" : "½"}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
