import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import type { IsolationMode } from "@/lib/music/types";
import { Minus, Pause, Play, Plus, Square, Upload } from "lucide-react";

interface Props {
  isPlaying: boolean;
  bpm: number;
  isolation: IsolationMode;
  zoom: number;
  contour: boolean;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onBpmChange: (v: number) => void;
  onIsolationChange: (m: IsolationMode) => void;
  onZoomChange: (z: number) => void;
  onContourChange: (v: boolean) => void;
  onFileUpload: (file: File) => void;
}

export function TopBar({
  isPlaying,
  bpm,
  isolation,
  zoom,
  contour,
  onPlay,
  onPause,
  onStop,
  onBpmChange,
  onIsolationChange,
  onZoomChange,
  onContourChange,
  onFileUpload,
}: Props) {
  const isoLabel: Record<IsolationMode, string> = {
    both: "Both Hands",
    rh: "Right Hand",
    lh: "Left Hand",
  };

  return (
    <header className="flex flex-wrap items-center gap-4 border-b border-border bg-card px-6 py-3">
      <h1 className="text-base font-semibold tracking-tight">
        Sheet Reader
        {isPlaying && <span className="ml-2 text-xs italic text-muted-foreground">Playing</span>}
        {!isPlaying && isolation !== "both" && (
          <span className="ml-2 text-xs italic text-muted-foreground">
            {isoLabel[isolation]} Isolated
          </span>
        )}
      </h1>

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
        <div className="w-32">
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
        <Switch checked={contour} onCheckedChange={onContourChange} />
        <span className={contour ? "italic text-foreground" : ""}>Contour Lines</span>
      </label>

      <div className="ml-auto">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent">
          <Upload className="h-3.5 w-3.5" />
          Upload MusicXML
          <input
            type="file"
            accept=".musicxml,.xml,.mxl"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFileUpload(f);
              e.target.value = "";
            }}
          />
        </label>
      </div>
    </header>
  );
}
