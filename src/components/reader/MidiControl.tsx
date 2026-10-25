import { useState } from "react";
import { Keyboard } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { useMidiInput, type MidiStatus } from "@/lib/midi/input";
import { chordReadout, noteReadout } from "@/lib/midi/readout";

const MSG_NO_DEVICES = "No encuentro ningún teclado. Enchufalo y apretá de nuevo.";
const MSG_DENIED =
  "Chrome bloqueó el permiso. Hacé clic en el candado de la barra de direcciones → MIDI → Permitir.";
const MSG_UNSUPPORTED = "Este navegador no tiene MIDI. Usá Chrome.";
const MSG_ERROR = "No pude conectar el teclado MIDI. Apretá de nuevo.";

const DOT: Record<MidiStatus, string> = {
  unsupported: "bg-muted-foreground/40",
  idle: "bg-muted-foreground/40",
  pending: "bg-amber-400 animate-pulse",
  connected: "bg-emerald-500",
  "no-devices": "bg-amber-500",
  denied: "bg-destructive",
  error: "bg-destructive",
};

/** One compact control for the MIDI keyboard + a live readout of what she is playing. */
export function MidiControl() {
  const midi = useMidiInput();
  const [open, setOpen] = useState(false);
  const { status } = midi;

  const needsClick = status === "idle" || status === "no-devices" || status === "denied" || status === "error";
  const long =
    status === "no-devices" ? MSG_NO_DEVICES
    : status === "denied" ? MSG_DENIED
    : status === "unsupported" ? MSG_UNSUPPORTED
    : status === "error" ? MSG_ERROR
    : null;

  const label =
    long ??
    (status === "pending" ? "Conectando…"
    : status === "connected" ? `Teclado: ${midi.devices[0] ?? "MIDI"}${midi.devices.length > 1 ? ` +${midi.devices.length - 1}` : ""}`
    : midi.remembered ? "Reconectar teclado MIDI"
    : "Conectar teclado MIDI");

  const pressed = [...midi.pressed].sort((a, b) => a - b);
  const chord = chordReadout(midi.pressed);
  const last = midi.lastNote ? noteReadout(midi.lastNote.midi) : null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Popover open={open && status !== "unsupported"} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            size="sm"
            variant={status === "connected" ? "secondary" : "ghost"}
            disabled={status === "unsupported" || status === "pending"}
            className={`gap-1.5 px-2 text-xs ${long ? "h-auto max-w-sm whitespace-normal py-1 text-left leading-tight" : "h-7"}`}
            title={long ?? undefined}
            onClick={(e) => {
              if (needsClick) {
                e.preventDefault(); // connect instead of opening the popover
                void midi.connect();
              }
            }}
          >
            <span className="relative flex shrink-0 items-center">
              <Keyboard className="h-3.5 w-3.5" />
              <span
                aria-hidden
                className={`absolute -bottom-0.5 -right-1 h-2 w-2 rounded-full border border-card ${DOT[status]}`}
              />
            </span>
            <span className={long ? "italic" : "max-w-[14rem] truncate"}>{label}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" className="w-80 text-sm">
          <div className="mb-2 text-xs font-medium text-muted-foreground">Teclados conectados</div>
          {midi.devices.length ? (
            <ul className="mb-3 list-disc pl-5">
              {midi.devices.map((d) => (
                <li key={d}>{d}</li>
              ))}
            </ul>
          ) : (
            <p className="mb-3 text-xs italic text-muted-foreground">Ninguno por ahora.</p>
          )}
          <label className="flex cursor-pointer items-start gap-2">
            <Switch checked={midi.appSound} onCheckedChange={midi.setAppSound} className="mt-0.5" />
            <span>
              Sonido de la app al tocar
              <span className="block text-xs text-muted-foreground">
                Dejalo apagado si tu teclado ya suena solo. Prendido, la app suena además del teclado.
              </span>
            </span>
          </label>
        </PopoverContent>
      </Popover>

      {(last || pressed.length > 0) && (
        <div
          className="flex flex-wrap items-center gap-x-2 text-xs"
          aria-live="polite"
          data-testid="midi-readout"
        >
          <span className={pressed.length ? "font-medium text-foreground" : "text-muted-foreground"}>
            {last}
          </span>
          {chord && <span className="rounded bg-muted px-1.5 py-0.5 font-medium">{chord}</span>}
          {midi.sustain && <span className="italic text-muted-foreground">pedal</span>}
        </div>
      )}
    </div>
  );
}
