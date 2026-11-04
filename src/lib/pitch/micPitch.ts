/**
 * Microphone → pitch frames. Instrument-agnostic: the window (1024 for trumpet, 2048 for voice) is a parameter and the
 * frames are raw; filtering is PitchTracker's job. Browser only: nothing here runs at import time.
 */
import { PitchDetector } from "pitchy";
import type { PitchFrame } from "./pitchMath";

export interface MicHandle {
  stop: () => void;
  /** Ignore the microphone for `ms` (the app is playing a reference note): frames arrive as "nothing heard". */
  pause: (ms: number) => void;
}

export interface MicOptions {
  windowSize?: number;
}

/** Spanish, short, shown in grey. */
function micError(e: unknown): Error {
  const name = (e as { name?: string })?.name;
  if (name === "NotAllowedError" || name === "SecurityError")
    return new Error("No tengo permiso para el micrófono: habilitalo en el candado de la barra");
  if (name === "NotFoundError" || name === "OverconstrainedError") return new Error("No encuentro un micrófono");
  if (name === "NotReadableError") return new Error("El micrófono está ocupado por otra aplicación");
  return new Error("No pude abrir el micrófono");
}

/** Must be called from a click (the AudioContext only starts after a gesture). Rejects with a Spanish message. */
export async function startMic(onFrame: (f: PitchFrame) => void, { windowSize = 2048 }: MicOptions = {}): Promise<MicHandle> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia)
    throw new Error("Este navegador no deja usar el micrófono (hace falta https o localhost)");
  let stream: MediaStream;
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
  } catch (e) {
    throw micError(e);
  }
  const Ctx: typeof AudioContext = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
  const ctx = new Ctx();
  try {
    await ctx.resume();
  } catch {
    /* some browsers resume on their own */
  }
  const source = ctx.createMediaStreamSource(stream);
  // Frames follow the audio clock, not the screen: requestAnimationFrame is throttled to a few frames a second when
  // the window is hidden or behind another one, and she may sing while looking at another window. A ScriptProcessor
  // fires every HOP samples whatever the screen does; it needs a path to the speakers, so it goes through a muted gain.
  const HOP = 1024;
  const proc = ctx.createScriptProcessor(HOP, 1, 1);
  const mute = ctx.createGain();
  mute.gain.value = 0;
  source.connect(proc);
  proc.connect(mute);
  mute.connect(ctx.destination); // silent: no feedback
  const detector = PitchDetector.forFloat32Array(windowSize);
  const buf = new Float32Array(windowSize); // the last `windowSize` samples, oldest first

  let running = true;
  let pausedUntil = 0;

  proc.onaudioprocess = (e) => {
    if (!running) return;
    const input = e.inputBuffer.getChannelData(0);
    const n = Math.min(input.length, windowSize);
    buf.copyWithin(0, n);
    buf.set(input.subarray(input.length - n), windowSize - n);
    const t = performance.now();
    if (t < pausedUntil) {
      onFrame({ t, freq: null, clarity: 0, rms: 0 });
      return;
    }
    let sum = 0;
    for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    const rms = Math.sqrt(sum / buf.length);
    const [freq, clarity] = detector.findPitch(buf, ctx.sampleRate);
    onFrame({ t, freq: Number.isFinite(freq) && freq > 0 ? freq : null, clarity, rms });
  };

  return {
    pause: (ms) => {
      pausedUntil = Math.max(pausedUntil, performance.now() + ms);
    },
    stop: () => {
      if (!running) return;
      running = false;
      proc.onaudioprocess = null;
      stream.getTracks().forEach((tr) => tr.stop());
      try {
        source.disconnect();
        proc.disconnect();
        mute.disconnect();
      } catch {
        /* already gone */
      }
      void ctx.close().catch(() => {});
    },
  };
}
