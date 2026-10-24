import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { IsolationMode, ScoreView } from "@/lib/music/types";
import { ColorStudio } from "@/components/studio/ColorStudio";
import { NoteColorStrip } from "./NoteColorStrip";
import { IntervalStrip } from "./IntervalStrip";
import { LINE_MODES, type LineColorMode } from "@/lib/music/lineMode";
import { UploadZone } from "./UploadZone";
import { Keyboard, Minus, Pause, Play, Plus, Square } from "lucide-react";

interface Props {
  isPlaying: boolean;
  bpm: number;
  isolation: IsolationMode;
  zoom: number;
  view: ScoreView;
  line: boolean;
  intervals: boolean;
  lineMode: LineColorMode;
  showKeyboard: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onBpmChange: (v: number) => void;
  onIsolationChange: (m: IsolationMode) => void;
  onZoomChange: (z: number) => void;
  onViewChange: (v: ScoreView) => void;
  onLineChange: (v: boolean) => void;
  onIntervalsChange: (v: boolean) => void;
  onLineModeChange: (m: LineColorMode) => void;
  onShowKeyboardChange: (v: boolean) => void;
  onScoreLoaded: (musicXml: string, filename: string) => void;
}

export function TopBar({
  isPlaying,
  bpm,
  isolation,
  zoom,
  view,
  line,
  intervals,
  lineMode,
  showKeyboard,
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
  onShowKeyboardChange,
  onScoreLoaded,
}: Props) {
  const isoLabel: Record<IsolationMode, string> = {
    both: "Both Hands",
    rh: "Right Hand",
    lh: "Left Hand",
  };

  return (
    <header className="sticky top-0 z-30 flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-border bg-card px-4 py-2">
      <h1 className="text-base font-semibold tracking-tight">
        Sheet Reader
        {isPlaying && <span className="ml-2 text-xs italic text-muted-foreground">Playing</span>}
        {!isPlaying && isolation !== "both" && (
          <span className="ml-2 text-xs italic text-muted-foreground">
            {isoLabel[isolation]} Isolated
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
            <Play className="h-4 w-4" /> Play
          </Button>
        ) : (
          <Button size="sm" variant="secondary" onClick={onPause} className="gap-1">
            <Pause className="h-4 w-4" /> Pause
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={onStop} className="gap-1">
          <Square className="h-4 w-4" /> Stop
        </Button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">Tempo</span>
        <div className="w-28">
          <Slider
            value={[bpm]}
            min={40}
            max={180}
            step={1}
            onValueChange={(v) => onBpmChange(v[0] ?? bpm)}
          />
        </div>
        <span className="w-10 text-xs tabular-nums text-muted-foreground">{bpm} bpm</span>
      </div>

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
            aria-label="Zoom out"
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
            aria-label="Zoom in"
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

        {/* In Intervalos / Ambos the labels always show as pills, so this switch only matters in Notas. */}
        <label
          title={lineMode !== "notas" ? "En Intervalos y Ambos las etiquetas siempre se muestran" : undefined}
          className={`flex items-center gap-2 text-xs text-muted-foreground ${
            line && lineMode === "notas" ? "cursor-pointer" : "cursor-not-allowed opacity-50"
          }`}
        >
          <Switch
            checked={lineMode !== "notas" || intervals}
            disabled={!line || lineMode !== "notas"}
            onCheckedChange={onIntervalsChange}
          />
          <span className={intervals && line ? "italic text-foreground" : ""}>Etiquetas</span>
        </label>

        {view === "estudiar" && (
          <Button
            size="sm"
            variant={showKeyboard ? "secondary" : "ghost"}
            className="h-7 gap-1 px-2 text-xs"
            onClick={() => onShowKeyboardChange(!showKeyboard)}
          >
            <Keyboard className="h-3.5 w-3.5" />
            {showKeyboard ? "Ocultar teclado" : "Mostrar teclado"}
          </Button>
        )}

        <NoteColorStrip />
        {line && lineMode !== "notas" && <IntervalStrip />}
      </div>
    </header>
  );
}
