import { useEffect, useState } from "react";
import { loadVoiceRange, type VoiceRange } from "@/lib/pitch/voiceRange";
import { TunerStep } from "./TunerStep";
import { VoiceRangeStep } from "./VoiceRangeStep";

type Step = 1 | 2;
const STEPS: { id: Step; label: string }[] = [
  { id: 1, label: "1 Tu registro" },
  { id: 2, label: "2 Afinador" },
];

// Same small segmented control as the note deck's (copied, that file is not touched).
function Segmented<T extends string | number>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (v: T) => void;
  label: string;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-1 rounded-md border border-border p-0.5">
      {options.map((o) => (
        <button
          key={String(o.id)}
          type="button"
          aria-pressed={value === o.id}
          onClick={() => onChange(o.id)}
          className={`rounded px-3 py-1 text-xs transition-colors ${
            value === o.id ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Cantar, part 1: measure her comfortable range, then a live tuner. Mount it as `<SingGame />` (no props).
 * The saved range is read after mount (never during render: the server has no localStorage).
 */
export function SingGame() {
  const [ready, setReady] = useState(false);
  const [range, setRange] = useState<VoiceRange | null>(null);
  const [step, setStep] = useState<Step>(1);

  useEffect(() => {
    const saved = loadVoiceRange();
    setRange(saved);
    setStep(saved ? 2 : 1);
    setReady(true);
  }, []);

  return (
    <section aria-label="Cantar" className="space-y-5" data-testid="sing-game">
      <Segmented label="Pasos de Cantar" value={step} onChange={setStep} options={STEPS} />
      {ready &&
        (step === 1 ? (
          <VoiceRangeStep
            range={range}
            onMeasured={(r) => {
              setRange(r);
            }}
          />
        ) : (
          <TunerStep range={range} />
        ))}
    </section>
  );
}
