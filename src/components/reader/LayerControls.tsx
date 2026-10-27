import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
import type { ChordNamesLayer, DegradeLayer, PatternLayer } from "@/lib/music/analysis/usePatternLayer";
import type { PatternScope } from "@/lib/music/analysis/patterns";

const SCOPES: Array<{ id: PatternScope; label: string }> = [
  { id: "both", label: "Ambas manos" },
  { id: "rh", label: "Mano derecha" },
  { id: "lh", label: "Mano izquierda" },
];

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Swatches({ colors }: { colors: string[] }) {
  return (
    <span className="inline-flex overflow-hidden rounded border border-border">
      {colors.map((c, i) => (
        <b key={i} className="block h-4 w-5" style={{ background: c }} />
      ))}
    </span>
  );
}

function Intensity({ label, value, max, onChange }: { label: string; value: number; max?: number; onChange: (v: number) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs text-muted-foreground">
      <span>{label}</span>
      <Slider
        className="w-28"
        min={5}
        max={Math.round((max ?? 0.6) * 100)}
        step={1}
        value={[Math.round(value * 100)]}
        onValueChange={([v]) => onChange(v / 100)}
        aria-label={label}
      />
      <span className="w-9 tabular-nums text-foreground">{pct(value)}</span>
    </label>
  );
}

interface PatternsProps {
  layer: PatternLayer;
  /** The score has been read (so "no repeats" is true, not just "not loaded yet"). */
  scoreReady: boolean;
}

/** Switch "Cajas de patrones" plus its small controls in a popover. */
export function PatternsControls({ layer, scoreReady }: PatternsProps) {
  const { options, setOptions } = layer;
  const [liked, setLiked] = useState<"new" | "dup" | null>(null);
  const [removeIdx, setRemoveIdx] = useState<number | null>(null);
  const none = options.on && scoreReady && layer.patterns.length === 0;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={options.on} onCheckedChange={(v) => setOptions({ on: v })} aria-label="Cajas de patrones" />
        <span className={options.on ? "italic text-foreground" : ""}>Cajas de patrones</span>
      </label>
      {options.on && (
        <Popover onOpenChange={(o) => !o && setLiked(null)}>
          <PopoverTrigger asChild>
            <Button size="sm" variant="ghost" className="h-7 gap-1 px-2 text-xs">
              Ajustes de las cajas <ChevronDown className="h-3 w-3" />
            </Button>
          </PopoverTrigger>
          <PopoverContent align="start" className="flex w-80 flex-col gap-3 text-xs">
            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground">Alcance</span>
              <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5">
                {SCOPES.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={options.scope === s.id}
                    onClick={() => setOptions({ scope: s.id })}
                    className={`flex-1 rounded px-2 py-1 text-xs ${
                      options.scope === s.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex cursor-pointer items-center gap-2 text-muted-foreground">
              <Switch
                checked={options.includeTransposed}
                onCheckedChange={(v) => setOptions({ includeTransposed: v })}
                aria-label="Incluir parecidos (transportados)"
              />
              <span className={options.includeTransposed ? "italic text-foreground" : ""}>Incluir parecidos (transportados)</span>
            </label>
            {options.includeTransposed && (
              <p className="-mt-1 text-muted-foreground">Los parecidos llevan borde de rayitas y una comilla en la letra (B′).</p>
            )}

            <Intensity label="Intensidad" value={options.intensity} onChange={(v) => setOptions({ intensity: v })} />

            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => layer.reroll()} disabled={!layer.count}>
                Otra combinación
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
                disabled={!layer.count}
                onClick={() => setLiked(layer.like() ? "new" : "dup")}
              >
                Me gusta esta
              </Button>
              {liked && (
                <span className="italic text-muted-foreground" role="status">
                  {liked === "new" ? "Guardada." : "Ya la tenías guardada."}
                </span>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-muted-foreground">Usar una combinación guardada</span>
              {layer.saved.length === 0 && <span className="italic text-muted-foreground">Todavía no guardaste ninguna.</span>}
              {layer.saved.map((cols, i) => (
                <div key={cols.join("")} className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => layer.applySaved(i)}
                    className="flex flex-1 items-center gap-2 rounded border border-border px-2 py-1 text-left hover:bg-accent"
                    title="Usar esta combinación en esta partitura"
                  >
                    <Swatches colors={cols} />
                    <span>Usar</span>
                  </button>
                  <button type="button" onClick={() => setRemoveIdx(i)} className="text-muted-foreground underline hover:text-foreground">
                    Quitar
                  </button>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      )}
      {none && <span className="text-xs italic text-muted-foreground">Esta partitura no tiene compases que se repitan.</span>}
      {options.on && layer.count > 0 && (
        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground" aria-label="Patrones encontrados">
          {[...layer.letters.entries()].map(([k, letter]) => (
            <span key={k} className="inline-flex items-center gap-1">
              <b className="block h-3 w-3 rounded-sm border border-border" style={{ background: layer.colors.get(k) }} />
              {letter}
            </span>
          ))}
        </span>
      )}

      <AlertDialog open={removeIdx !== null} onOpenChange={(o) => !o && setRemoveIdx(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Quitar esta combinación guardada?</AlertDialogTitle>
            <AlertDialogDescription>
              Se saca de la lista de guardadas. Las partituras que ya la usan conservan sus colores.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (removeIdx !== null) layer.removeSaved(removeIdx);
                setRemoveIdx(null);
              }}
            >
              Quitar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

/** Switch "Degradé de notas" plus its slider inline. */
export function DegradeControls({ layer, cap }: { layer: DegradeLayer; cap: number }) {
  const { options, setOptions } = layer;
  const capped = options.on && options.intensity > cap + 0.004;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={options.on} onCheckedChange={(v) => setOptions({ on: v })} aria-label="Degradé de notas" />
        <span className={options.on ? "italic text-foreground" : ""}>Degradé de notas</span>
      </label>
      {options.on && <Intensity label="Intensidad" value={options.intensity} onChange={(v) => setOptions({ intensity: v })} />}
      {capped && (
        <span className="text-xs italic text-muted-foreground" role="status">
          Se muestra al {pct(cap)} para que las notas negras se lean bien.
        </span>
      )}
    </div>
  );
}

const CHORD_NAME_MODES: Array<{ id: "unicos" | "todos"; label: string }> = [
  { id: "unicos", label: "Solo los únicos" },
  { id: "todos", label: "Todos" },
];

/** Switch "Nombres de acordes" plus its two modes. */
export function ChordNamesControls({ layer }: { layer: ChordNamesLayer }) {
  const { options, setOptions } = layer;
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <label className="flex cursor-pointer items-center gap-2 text-xs text-muted-foreground">
        <Switch checked={options.on} onCheckedChange={(v) => setOptions({ on: v })} aria-label="Nombres de acordes" />
        <span className={options.on ? "italic text-foreground" : ""}>Nombres de acordes</span>
      </label>
      {options.on && (
        <div className="flex items-center gap-0.5 rounded-md border border-border p-0.5" role="group" aria-label="Qué acordes nombrar">
          {CHORD_NAME_MODES.map((m) => (
            <button
              key={m.id}
              type="button"
              aria-pressed={options.mode === m.id}
              onClick={() => setOptions({ mode: m.id })}
              className={`rounded px-2 py-0.5 text-xs ${
                options.mode === m.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
