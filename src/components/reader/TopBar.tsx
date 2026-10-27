import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { TempoControl } from "./TempoControl";
import { Switch } from "@/components/ui/switch";
import type { IsolationMode, ScoreView } from "@/lib/music/types";
import { ColorStudio } from "@/components/studio/ColorStudio";
import { NoteColorStrip } from "./NoteColorStrip";
import { IntervalStrip } from "./IntervalStrip";
import { LINE_MODES, type LineColorMode } from "@/lib/music/lineMode";
import { UploadZone } from "./UploadZone";
import { MidiControl } from "./MidiControl";
import { useLayersOpen } from "@/lib/music/analysis/useFicha";
import type { ChordNamesLayer, DegradeLayer, PatternLayer } from "@/lib/music/analysis/usePatternLayer";
import { ChordNamesControls, DegradeControls, PatternsControls } from "./LayerControls";
import { ChevronDown, ChevronUp, Layers, ListMusic, Minus, Pause, Play, Plus, Route, Square } from "lucide-react";

interface Props {
  isPlaying: boolean;
  bpm: number;
  scoreBpm: number;
  hasWrittenTempo: boolean;
  isolation: IsolationMode;
  zoom: number;
  view: ScoreView;
  line: boolean;
  intervals: boolean;
  lineMode: LineColorMode;
  menuOpen: boolean;
  animate: boolean;
  onMenuToggle: () => void;
  fichaOpen: boolean;
  recorridoOpen: boolean;
  onRecorridoToggle: () => void;
  onFichaToggle: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onBpmChange: (v: number, source: "slider" | "other") => void;
  onIsolationChange: (m: IsolationMode) => void;
  onZoomChange: (z: number) => void;
  onViewChange: (v: ScoreView) => void;
  onLineChange: (v: boolean) => void;
  onIntervalsChange: (v: boolean) => void;
  onLineModeChange: (m: LineColorMode) => void;
  onScoreLoaded: (musicXml: string, filename: string) => void;
  patternLayer: PatternLayer;
  degradeLayer: DegradeLayer;
  chordNamesLayer: ChordNamesLayer;
  /** Strongest degradé intensity that keeps black noteheads readable (0-1). */
  degradeCap: number;
  /** The score has been read: "no repeated measures" is then a fact. */
  scoreReady: boolean;
}

export function TopBar({
  isPlaying,
  bpm,
  scoreBpm,
  hasWrittenTempo,
  isolation,
  zoom,
  view,
  line,
  intervals,
  lineMode,
  menuOpen,
  animate,
  onMenuToggle,
  fichaOpen,
  recorridoOpen,
  onRecorridoToggle,
  onFichaToggle,
  onPlay,
  onPause,
  onStop,
  onBpmChange,
  onIsolationChange,
  onZoomChange,
  onViewChange,
  onLineChange,
  onIntervalsChange,
  onLineModeChange,
  onScoreLoaded,
  patternLayer,
  degradeLayer,
  chordNamesLayer,
  degradeCap,
  scoreReady,
}: Props) {
  const [layersOpen, setLayersOpen] = useLayersOpen();
  const isoLabel: Record<IsolationMode, string> = {
    both: "Dos manos",
    rh: "Mano derecha",
    lh: "Mano izquierda",
  };

  return (
    <header data-chrome="top" className="sticky top-0 z-30 border-b border-border bg-card px-4 py-2">
      {/* Always-visible row: the essentials. */}
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
      <h1 className="text-base font-semibold tracking-tight">
        Harmony Helper
        {isPlaying && <span className="ml-2 text-xs italic text-muted-foreground">Reproduciendo</span>}
        {!isPlaying && isolation !== "both" && (
          <span className="ml-2 text-xs italic text-muted-foreground">
            {isoLabel[isolation]} sola
          </span>
        )}
      </h1>

      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {(["tocar", "estudiar"] as ScoreView[]).map((v) => (
          <button
            key={v}
            onClick={() => onViewChange(v)}
            className={`rounded px-3 py-1 text-xs transition-colors ${
              view === v
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {v === "tocar" ? "Tocar" : "Estudiar"}
          </button>
        ))}
      </div>

      <div className="flex items-center gap-1">
        {!isPlaying ? (
          <Button size="sm" onClick={onPlay} className="gap-1">
            <Play className="h-4 w-4" /> Reproducir
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onPause} className="gap-1">
            <Pause className="h-4 w-4" /> Pausa
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onStop} className="gap-1">
          <Square className="h-4 w-4" /> Detener
        </Button>
      </div>

      <TempoControl
        bpm={bpm}
        scoreBpm={scoreBpm}
        hasWrittenTempo={hasWrittenTempo}
        onChange={onBpmChange}
        compact={!menuOpen}
      />

      <Button
        size="sm"
        variant="ghost"
        className="ml-auto h-8 gap-1 px-2 text-xs"
        aria-expanded={menuOpen}
        aria-controls="top-menu-panel"
        aria-label={menuOpen ? "Ocultar menú" : "Mostrar menú"}
        title={`${menuOpen ? "Ocultar menú" : "Mostrar menú"} (tecla m)`}
        onClick={onMenuToggle}
      >
        {menuOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        {menuOpen ? "Ocultar menú" : "Mostrar menú"}
      </Button>
      </div>

      {/* Collapsible rest of the menu. */}
      <div
        id="top-menu-panel"
        inert={!menuOpen}
        aria-hidden={!menuOpen}
        className={`grid ${animate ? "transition-[grid-template-rows] duration-200 ease-out motion-reduce:transition-none" : ""} ${
          menuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
        }`}
      >
      <div className="-mx-1 min-h-0 overflow-hidden px-1">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 pt-1.5">
      <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
        {(["both", "rh", "lh"] as IsolationMode[]).map((m) => {
          const active = isolation === m;
          return (
            <button
              key={m}
              onClick={() => onIsolationChange(m)}
              className={`rounded px-3 py-1 text-xs transition-colors ${
                active
                  ? m === "rh"
                    ? "bg-rh text-rh-foreground italic"
                    : m === "lh"
                      ? "bg-lh text-lh-foreground italic"
                      : "bg-primary text-primary-foreground italic"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {isoLabel[m]}
            </button>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <UploadZone onScoreLoaded={onScoreLoaded} />
        <Button
          size="sm"
          variant={recorridoOpen ? "secondary" : "outline"}
          className="gap-1"
          aria-pressed={recorridoOpen}
          onClick={onRecorridoToggle}
        >
          <Route className="h-4 w-4" /> Recorrido
        </Button>
        <Button
          size="sm"
          variant={fichaOpen ? "secondary" : "outline"}
          className="gap-1"
          aria-pressed={fichaOpen}
          onClick={onFichaToggle}
        >
          <ListMusic className="h-4 w-4" /> Ficha
        </Button>
        <ColorStudio />
      </div>

      {/* second row */}
      <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1.5">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground">Zoom</span>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onZoomChange(zoom - 0.1)}
            aria-label="Alejar"
          >
            <Minus className="h-3.5 w-3.5" />
          </Button>
          <div className="w-24">
            <Slider
              value={[zoom]}
              min={0.5}
              max={2.5}
              step={0.05}
              onValueChange={(v) => onZoomChange(v[0] ?? zoom)}
            />
          </div>
          <Button
            size="icon"
            variant="ghost"
            className="h-7 w-7"
            onClick={() => onZoomChange(zoom + 0.1)}
            aria-label="Acercar"
          >
            <Plus className="h-3.5 w-3.5" />
          </Button>
          <span className="w-10 text-xs tabular-nums text-muted-foreground">
            {Math.round(zoom * 100)}%
          </span>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
          <Switch checked={line} onCheckedChange={onLineChange} />
          <span className={line ? "italic text-foreground" : ""}>Línea melódica</span>
        </label>

        <NoteColorStrip />

        <MidiControl />

        <Button
          size="sm"
          variant={layersOpen ? "secondary" : "ghost"}
          className="h-7 gap-1 px-2 text-xs"
          aria-expanded={layersOpen}
          onClick={() => setLayersOpen(!layersOpen)}
          title="Cajas de patrones, degradé de notas, nombres de acordes, color de la línea, etiquetas y saltos"
        >
          <Layers className="h-3.5 w-3.5" /> Capas
          <ChevronDown className={`h-3 w-3 transition-transform ${layersOpen ? "rotate-180" : ""}`} />
        </Button>
      </div>

      {/* third row: layers (closed by default) */}
      {layersOpen && (
        <div className="flex basis-full flex-wrap items-center gap-x-4 gap-y-1.5">
        <PatternsControls layer={patternLayer} scoreReady={scoreReady} />
        <DegradeControls layer={degradeLayer} cap={degradeCap} />
        <ChordNamesControls layer={chordNamesLayer} />
        <div className="basis-full" aria-hidden />
        {line && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span>Color de la línea:</span>
            <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
              {LINE_MODES.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => onLineModeChange(m.id)}
                  aria-pressed={lineMode === m.id}
                  className={`rounded px-2 py-0.5 text-xs ${
                    lineMode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Labels show on hover; this switch keeps them all visible in every mode. */}
        <label
          title="Mostrar todas las etiquetas todo el tiempo (si no, aparecen al pasar el mouse por un tramo)"
          className={`flex items-center gap-2 text-xs text-muted-foreground ${
            line ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          }`}
        >
          <Switch checked={intervals} disabled={!line} onCheckedChange={onIntervalsChange} />
          <span className={intervals && line ? "italic text-foreground" : ""}>Etiquetas siempre</span>
        </label>
          {line && lineMode !== "notas" && <IntervalStrip />}
          {!line && (
            <span className="text-xs italic text-muted-foreground">Prendé la línea melódica para usar estas opciones.</span>
          )}
        </div>
      )}
      </div>
      </div>
      </div>
    </header>
  );
}
