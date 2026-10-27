import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Minus, Plus } from "lucide-react";
import { MAX_BPM, MIN_BPM, TEMPO_PERCENTS, activePercent, bpmForPercent, clampBpm, stepBpm } from "@/lib/music/tempo";

interface Props {
  bpm: number;
  /** Tempo of the score for the 50/75/100 buttons. */
  scoreBpm: number;
  hasWrittenTempo: boolean;
  /** `slider` changes are debounced by the parent; everything else applies at once. */
  onChange: (bpm: number, source: "slider" | "other") => void;
}

export function TempoControl({ bpm, scoreBpm, hasWrittenTempo, onChange }: Props) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const inputRef = useRef<HTMLInputElement | null>(null);
  const active = activePercent(bpm, scoreBpm);

  useEffect(() => {
    if (editing) inputRef.current?.select();
  }, [editing]);

  const startEdit = () => {
    setDraft(String(bpm));
    setEditing(true);
  };
  const commit = () => {
    setEditing(false);
    const n = parseInt(draft.replace(/[^\d]/g, ""), 10);
    if (Number.isFinite(n)) onChange(clampBpm(n), "other");
  };

  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1" role="group" aria-label="Tempo de la partitura">
      <span className="text-xs text-muted-foreground">Tempo</span>
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8"
        aria-label="Bajar tempo"
        title="Bajar tempo (tecla −). Shift: de a 1"
        onClick={(e) => onChange(stepBpm(bpm, -1, e.shiftKey), "other")}
      >
        <Minus className="h-4 w-4" />
      </Button>
      {editing ? (
        <input
          ref={inputRef}
          value={draft}
          inputMode="numeric"
          aria-label="Escribir el tempo en bpm"
          className="h-8 w-20 rounded-md border border-input bg-background px-2 text-center text-sm tabular-nums"
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit();
            if (e.key === "Escape") setEditing(false);
          }}
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          aria-label={`Tempo de la partitura: ${bpm} negras por minuto. Tocá para escribir otro número`}
          title="Tocá para escribir un número"
          className="h-8 min-w-20 rounded-md border border-border px-2 text-sm font-medium tabular-nums hover:bg-accent"
        >
          ♩ = {bpm}
        </button>
      )}
      <Button
        size="icon"
        variant="outline"
        className="h-8 w-8"
        aria-label="Subir tempo"
        title="Subir tempo (tecla +). Shift: de a 1"
        onClick={(e) => onChange(stepBpm(bpm, 1, e.shiftKey), "other")}
      >
        <Plus className="h-4 w-4" />
      </Button>
      <div className="w-44 sm:w-56">
        <Slider
          value={[bpm]}
          min={MIN_BPM}
          max={MAX_BPM}
          step={1}
          aria-label="Tempo de la partitura"
          onValueChange={(v) => onChange(v[0] ?? bpm, "slider")}
        />
      </div>
      <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
        {TEMPO_PERCENTS.map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={active === p}
            title={`${p}% del tempo de la partitura (${bpmForPercent(scoreBpm, p)} bpm)`}
            onClick={() => onChange(bpmForPercent(scoreBpm, p), "other")}
            className={`rounded px-2.5 py-1 text-xs transition-colors ${
              active === p ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {p}%
          </button>
        ))}
      </div>
      {!hasWrittenTempo && <span className="text-xs italic text-muted-foreground">(sin tempo escrito)</span>}
    </div>
  );
}
