import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { MiniStaff } from "@/components/music/MiniStaff";
import { midiLabel, spelledSharp } from "@/lib/pitch/noteName";
import { clefForRange, rangeFromFrames } from "@/lib/pitch/pitchMath";
import { saveVoiceRange, type VoiceRange } from "@/lib/pitch/voiceRange";
import { useMicTracker } from "@/lib/pitch/useMicTracker";

type Phase = 0 | 1; // 0 = lowest note, 1 = highest note

const PHASES: { text: string }[] = [
  { text: "Cantá un “uuu” que baje hasta tu nota más grave, sin forzar." },
  { text: "Ahora uno que suba hasta la más aguda." },
];

interface Take {
  midis: number[];
  frames: number;
  firstT: number;
  lastT: number;
}
const emptyTake = (): Take => ({ midis: [], frames: 0, firstT: 0, lastT: 0 });

interface Props {
  range: VoiceRange | null;
  onMeasured: (r: VoiceRange) => void;
}

/** Step 1: two "uuu" slides, one down and one up. Only firm frames (clear, loud enough, same note ≥150 ms) count. */
export function VoiceRangeStep({ range, onMeasured }: Props) {
  const [redo, setRedo] = useState(false);
  const [recording, setRecording] = useState<Phase | null>(null);
  const [done, setDone] = useState<[boolean, boolean]>([false, false]);
  const [notice, setNotice] = useState("");
  const takes = useRef<[Take, Take]>([emptyTake(), emptyTake()]);
  const recRef = useRef<Phase | null>(null);

  const mic = useMicTracker({
    onFrame: (f) => {
      const p = recRef.current;
      if (p === null) return;
      const t = takes.current[p];
      if (t.frames === 0) t.firstT = f.t;
      t.lastT = f.t;
      t.frames++;
      if (f.heard && f.stable) t.midis.push(f.midiFloat);
    },
  });

  const begin = (p: Phase) => {
    takes.current[p] = emptyTake();
    recRef.current = p;
    setRecording(p);
    setNotice("");
    void mic.start();
  };

  const finish = (p: Phase) => {
    mic.stop();
    recRef.current = null;
    setRecording(null);
    const t = takes.current[p];
    const frameMs = t.frames > 1 ? (t.lastT - t.firstT) / (t.frames - 1) : undefined;
    if (!rangeFromFrames(t.midis, t.midis, { frameMs })) {
      takes.current[p] = emptyTake();
      setNotice("No te escuché lo suficiente, probá de nuevo.");
      return;
    }
    const nextDone: [boolean, boolean] = p === 0 ? [true, done[1]] : [done[0], true];
    setDone(nextDone);
    if (nextDone[0] && nextDone[1]) {
      const [lo, hi] = takes.current;
      const fm = (t: Take) => (t.frames > 1 ? (t.lastT - t.firstT) / (t.frames - 1) : undefined);
      const r = rangeFromFrames(lo.midis, hi.midis, { frameMs: Math.min(fm(lo) ?? 17, fm(hi) ?? 17) });
      if (!r) {
        setNotice("No te escuché lo suficiente, probá de nuevo.");
        setDone([false, false]);
        return;
      }
      onMeasured(saveVoiceRange(r.low, r.high));
      setRedo(false);
    }
  };

  const remeasure = () => {
    takes.current = [emptyTake(), emptyTake()];
    setDone([false, false]);
    setNotice("");
    setRedo(true);
  };

  if (range && !redo) {
    const clef = clefForRange(range.low, range.high);
    return (
      <div className="space-y-3" data-testid="voice-range" data-low={range.low} data-high={range.high}>
        <p className="text-sm">
          Tu registro cómodo: <strong>{midiLabel(range.low)}</strong> a <strong>{midiLabel(range.high)}</strong>
        </p>
        <MiniStaff
          clef={clef}
          width={200}
          height={96}
          columns={2}
          notes={[{ spelled: spelledSharp(range.low) }, { spelled: spelledSharp(range.high) }]}
          ariaLabel="Tu registro en el pentagrama"
        />
        <Button type="button" variant="outline" size="sm" onClick={remeasure}>
          Medir de nuevo
        </Button>
      </div>
    );
  }

  const current: Phase = done[0] ? 1 : 0;
  let status = mic.error ?? notice;
  if (!status && mic.listening) status = mic.silentMs > 500 ? "no te escucho bien" : mic.live?.heard ? midiLabel(mic.live.nearest) : "";
  return (
    <div className="space-y-4" data-testid="voice-range-measure">
      {PHASES.map((ph, i) => {
        const p = i as Phase;
        const isCurrent = current === p && !done[p];
        const isRec = recording === p;
        return (
          <div key={i} className={`flex flex-wrap items-center gap-3 ${isCurrent || done[p] ? "" : "opacity-50"}`}>
            <p className="min-w-[16rem] flex-1 text-sm">{ph.text}</p>
            {done[p] ? (
              <span className="text-xs text-muted-foreground">Listo</span>
            ) : (
              <div className="flex gap-2">
                <Button type="button" size="sm" variant="outline" disabled={!isCurrent || isRec} onClick={() => begin(p)}>
                  🎤 Escuchar
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!isRec} onClick={() => finish(p)}>
                  Listo
                </Button>
              </div>
            )}
          </div>
        );
      })}
      <p className="min-h-5 text-sm text-muted-foreground" aria-live="polite" data-testid="range-live">
        {status}
      </p>
    </div>
  );
}
