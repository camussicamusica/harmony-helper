import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { useColors } from "@/lib/colors/store";
import { NEUTRAL_CHIP, noteChipStyle } from "@/lib/colors/noteChip";
import { playNoteMidi } from "@/lib/music/analysis/audio";
import { useMicTracker } from "@/lib/pitch/useMicTracker";
import { clefForRange, type TrackedFrame } from "@/lib/pitch/pitchMath";
import { midiLabel, midiPcLabel, nearestNatural, spelledSharp } from "@/lib/pitch/noteName";
import type { VoiceRange } from "@/lib/pitch/voiceRange";
import { PitchTrace, type TraceFrame } from "./PitchTrace";

const REFERENCE_SECONDS = 1;
/** The app does not listen while the reference sounds, plus this tail (room echo). */
const TAIL_MS = 250;
/** Within this many cents of the target, held for HOLD_MS, the target note "lights up". */
const NEAR_CENTS = 15;
const HOLD_MS = 300;

const GREY = "#9ca3af";

const minus = (n: number) => (n < 0 ? `−${Math.abs(n)}` : n > 0 ? `+${n}` : "0");

/** −50..+50 cents as a small grey needle with a tick at the center. */
function Needle({ cents }: { cents: number | null }) {
  const x = cents === null ? 70 : 70 + (Math.max(-50, Math.min(50, cents)) / 50) * 60;
  return (
    <svg width={140} height={20} viewBox="0 0 140 20" aria-hidden data-testid="needle">
      <line x1={10} x2={130} y1={10} y2={10} stroke={GREY} strokeWidth={1} />
      <line x1={10} x2={10} y1={6} y2={14} stroke={GREY} strokeWidth={1} />
      <line x1={130} x2={130} y1={6} y2={14} stroke={GREY} strokeWidth={1} />
      <line x1={70} x2={70} y1={3} y2={17} stroke="#6b7280" strokeWidth={1.5} />
      {cents !== null && <circle cx={x} cy={10} r={5} fill="#6b7280" />}
    </svg>
  );
}

/** Step 2: pick a note, hear it, sing it. The line and the target stay quiet until she holds a note. */
export function TunerStep({ range }: { range: VoiceRange | null }) {
  const { palette } = useColors();
  const lo = range?.low ?? 36;
  const hi = range?.high ?? 84;
  const [target, setTarget] = useState(() => (range ? nearestNatural(Math.round((range.low + range.high) / 2)) : 62));
  const clef = range ? clefForRange(range.low, range.high) : "treble";

  const framesRef = useRef<TraceFrame[]>([]);
  const targetRef = useRef(target);
  targetRef.current = target;
  const nearSince = useRef<number | null>(null);
  const litRef = useRef(false);

  const mic = useMicTracker({
    onFrame: (f: TrackedFrame) => {
      framesRef.current.push(f);
      if (f.heard && Math.abs((f.midiFloat - targetRef.current) * 100) <= NEAR_CENTS) {
        if (nearSince.current === null) nearSince.current = f.t;
        litRef.current = f.t - nearSince.current >= HOLD_MS;
      } else {
        nearSince.current = null;
        litRef.current = false;
      }
    },
  });

  useEffect(() => {
    nearSince.current = null;
    litRef.current = false;
  }, [target]);

  const move = (d: number) => setTarget((t) => Math.min(hi, Math.max(lo, t + d)));

  const hear = () => {
    const ms = REFERENCE_SECONDS * 1000 + TAIL_MS;
    mic.pause(ms);
    void playNoteMidi(target, REFERENCE_SECONDS)
      .then(() => mic.pause(ms)) // the sound may have started late (samples loading)
      .catch(() => {});
  };

  const toggle = () => {
    if (mic.listening) {
      mic.stop();
      litRef.current = false;
      nearSince.current = null;
    } else {
      framesRef.current = [];
      void mic.start();
    }
  };

  const live = mic.live;
  const heard = !!live?.heard;
  const lit = mic.listening && litRef.current;
  const cents = heard ? Math.round(live!.cents) : null;
  const freq = heard ? 440 * 2 ** ((live!.midiFloat - 69) / 12) : null;
  const chip = heard && live!.stable ? noteChipStyle(((live!.nearest % 12) + 12) % 12, palette.roles) : NEUTRAL_CHIP;
  // The target pill stays grey: when she is in tune the note on the staff lights up, and once is enough.
  const targetChip = NEUTRAL_CHIP;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3" data-testid="tuner-target" data-midi={target} data-note={spelledSharp(target)} data-lit={lit ? "1" : "0"}>
        <span className="text-sm text-muted-foreground">Nota objetivo:</span>
        <Button type="button" variant="outline" size="sm" aria-label="Nota más grave" disabled={target <= lo} onClick={() => move(-1)}>
          ◀
        </Button>
        <span
          className="min-w-[8.5rem] rounded-full border px-3 py-1 text-center text-sm font-medium"
          style={{ background: targetChip.background, color: targetChip.color, borderColor: targetChip.border }}
        >
          {midiLabel(target)}
        </span>
        <Button type="button" variant="outline" size="sm" aria-label="Nota más aguda" disabled={target >= hi} onClick={() => move(1)}>
          ▶
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={hear}>
          ▶ Escuchar la nota
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={toggle} aria-pressed={mic.listening}>
          {mic.listening ? "Parar" : "🎤 Escuchar"}
        </Button>
      </div>

      {!range && <p className="text-xs text-muted-foreground">Medí tu registro primero para que te quede cómodo.</p>}
      {mic.error && <p className="text-sm text-muted-foreground">{mic.error}</p>}

      <PitchTrace target={target} clef={clef} framesRef={framesRef} active={mic.listening} lit={lit} />

      <div
        className="flex min-h-9 flex-wrap items-center gap-x-4 gap-y-2"
        data-testid="sing-readout"
        data-midi={heard ? live!.nearest : ""}
        data-cents={cents ?? ""}
        data-heard={heard ? "1" : "0"}
        data-stable={heard && live!.stable ? "1" : "0"}
        data-freq={freq === null ? "" : freq.toFixed(1)}
      >
        <span className="min-w-[6.5rem] rounded-full border px-3 py-1 text-center text-sm font-medium" style={{ background: chip.background, color: chip.color, borderColor: chip.border }}>
          {heard ? midiPcLabel(live!.nearest) : "—"}
        </span>
        <span className="min-w-[6rem] text-sm tabular-nums text-muted-foreground">{cents === null ? "" : `${minus(cents)} cents`}</span>
        <Needle cents={cents} />
        {mic.listening && !heard && mic.silentMs > 500 && <span className="text-sm text-muted-foreground">no te escucho bien</span>}
      </div>
    </div>
  );
}
