import * as Tone from "tone";
import { getSampler } from "@/lib/music/scheduler";

type Voice = { triggerAttackRelease: (f: number, d: number, t?: number) => unknown };

let fallback: Tone.PolySynth | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

/** The app's piano sampler; a plain synth if the samples do not load in 4 s (offline). */
async function getVoice(): Promise<Voice> {
  await Tone.start();
  try {
    const s = await Promise.race<Voice>([
      getSampler(),
      new Promise<Voice>((_, rej) => setTimeout(() => rej(new Error("samples timeout")), 4000)),
    ]);
    return s;
  } catch {
    if (!fallback) fallback = new Tone.PolySynth(Tone.Synth).toDestination();
    return fallback as unknown as Voice;
  }
}

const freq = (midi: number) => Tone.Frequency(midi, "midi").toFrequency();

export function stopAnalysisAudio() {
  timers.forEach(clearTimeout);
  timers = [];
}

/** Play several MIDI notes together. */
export async function playChordMidi(midis: number[], seconds = 1.6) {
  stopAnalysisAudio();
  const v = await getVoice();
  const t = Tone.now() + 0.02;
  for (const m of midis) v.triggerAttackRelease(freq(m), seconds, t);
}

/** Play one MIDI note. */
export async function playNoteMidi(midi: number, seconds = 0.9) {
  await playChordMidi([midi], seconds);
}

/** Play MIDI notes one after the other. Resolves when the last note has been struck; `onStep(i)` fires as each starts. */
export async function playSequence(midis: number[], stepSec = 0.42, onStep?: (i: number) => void, onEnd?: () => void) {
  stopAnalysisAudio();
  const v = await getVoice();
  const t0 = Tone.now() + 0.05;
  midis.forEach((m, i) => {
    v.triggerAttackRelease(freq(m), stepSec * 1.6, t0 + i * stepSec);
    if (onStep) timers.push(setTimeout(() => onStep(i), 50 + i * stepSec * 1000));
  });
  if (onEnd) timers.push(setTimeout(onEnd, 50 + midis.length * stepSec * 1000 + 200));
}
