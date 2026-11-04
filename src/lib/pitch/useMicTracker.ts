import { useCallback, useEffect, useRef, useState } from "react";
import { startMic, type MicHandle } from "./micPitch";
import { PitchTracker, type TrackedFrame, type TrackerOptions } from "./pitchMath";

export interface MicTrackerOptions {
  windowSize?: number;
  tracker?: Partial<TrackerOptions>;
  /** Called for every frame (about 43 per second: one every 1024 samples), outside React's render. */
  onFrame?: (f: TrackedFrame) => void;
}

/**
 * Microphone + PitchTracker for a component. `live` and `silentMs` refresh about 12 times a second (a calm readout);
 * the per-frame data goes to `onFrame`. The microphone is closed when the component unmounts.
 */
export function useMicTracker({ windowSize = 2048, tracker, onFrame }: MicTrackerOptions = {}) {
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [live, setLive] = useState<TrackedFrame | null>(null);
  const [silentMs, setSilentMs] = useState(0);

  const handle = useRef<MicHandle | null>(null);
  const latest = useRef<TrackedFrame | null>(null);
  const lastHeardT = useRef(0);
  const onFrameRef = useRef(onFrame);
  onFrameRef.current = onFrame;
  const trackerOpts = useRef(tracker);
  const pausedUntil = useRef(0);
  const token = useRef(0);

  const stop = useCallback(() => {
    token.current++;
    handle.current?.stop();
    handle.current = null;
    latest.current = null;
    setListening(false);
    setLive(null);
    setSilentMs(0);
  }, []);

  const start = useCallback(async () => {
    if (handle.current) return;
    setError(null);
    const my = ++token.current;
    const tr = new PitchTracker(trackerOpts.current);
    try {
      const h = await startMic(
        (raw) => {
          const f = tr.push(raw);
          latest.current = f;
          if (f.heard) lastHeardT.current = f.t;
          onFrameRef.current?.(f);
        },
        { windowSize },
      );
      if (token.current !== my) {
        h.stop(); // stopped or unmounted while the permission prompt was open
        return;
      }
      handle.current = h;
      lastHeardT.current = performance.now();
      const left = pausedUntil.current - performance.now();
      if (left > 0) h.pause(left);
      setListening(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "No pude abrir el micrófono");
    }
  }, [windowSize]);

  /** Ignore the microphone for `ms` (a reference note is playing). Works before the mic is on, too. */
  const pause = useCallback((ms: number) => {
    pausedUntil.current = performance.now() + ms;
    handle.current?.pause(ms);
  }, []);

  useEffect(() => {
    if (!listening) return;
    const id = setInterval(() => {
      setLive(latest.current);
      setSilentMs(Math.max(0, performance.now() - lastHeardT.current));
    }, 80);
    return () => clearInterval(id);
  }, [listening]);

  useEffect(() => () => {
    token.current++;
    handle.current?.stop();
    handle.current = null;
  }, []);

  return { listening, error, live, silentMs, start, stop, pause };
}
