/**
 * MIDI keyboard input (Web MIDI API, Chrome).
 *
 * One shared external store. Components read it with `useMidiInput()`; future exercises listen to
 * note events with `subscribe(listener)` (events: { type: "on" | "off", midi, velocity, time }).
 *
 * - `requestMIDIAccess()` is called only from `connect()` (a click), or silently on load when the
 *   browser already says the permission is "granted". Never prompts on page load.
 * - `pressed` = notes that are sounding: keys held down + keys released while the sustain pedal (CC64) is down.
 * - Events are about the physical keys (a key released under the pedal still emits "off");
 *   `pressed` is what honours the pedal.
 */
import { useEffect, useSyncExternalStore } from "react";
import * as Tone from "tone";
import { getSampler } from "@/lib/music/scheduler";

export type MidiStatus =
  | "unsupported"
  | "idle"
  | "pending"
  | "connected"
  | "no-devices"
  | "denied"
  | "error";

export interface MidiNoteEvent {
  type: "on" | "off";
  midi: number;
  /** 1..127 for "on"; 0 for "off". */
  velocity: number;
  /** performance.now() timeline (ms). */
  time: number;
}

export interface MidiSnapshot {
  status: MidiStatus;
  /** Names of the connected input devices. */
  devices: string[];
  /** Sounding notes (held keys + notes kept alive by the pedal). New Set on every change. */
  pressed: ReadonlySet<number>;
  sustain: boolean;
  /** Last note-on, kept after release so the readout can still show it. */
  lastNote: { midi: number; velocity: number; time: number } | null;
  /** The user granted access before (localStorage hh.midi.v1): the button says "Reconectar". */
  remembered: boolean;
  /** Play the notes she presses through the app's piano sampler (default off). */
  appSound: boolean;
}

const STORAGE_KEY = "hh.midi.v1";

let snap: MidiSnapshot = {
  status: "idle",
  devices: [],
  pressed: new Set(),
  sustain: false,
  lastNote: null,
  remembered: false,
  appSound: false,
};

const stateListeners = new Set<() => void>();
const eventListeners = new Set<(e: MidiNoteEvent) => void>();

const held = new Set<number>();
const sustained = new Set<number>();
let access: MIDIAccess | null = null;
let initialised = false;

// ---------- store plumbing ----------

function setSnap(patch: Partial<MidiSnapshot>) {
  snap = { ...snap, ...patch };
  stateListeners.forEach((l) => l());
}

export function subscribeState(l: () => void): () => void {
  stateListeners.add(l);
  return () => {
    stateListeners.delete(l);
  };
}
export const getSnapshot = (): MidiSnapshot => snap;
const serverSnapshot: MidiSnapshot = snap;
const getServerSnapshot = (): MidiSnapshot => serverSnapshot;

/** Note events for exercises. Returns an unsubscribe function. */
export function subscribe(listener: (e: MidiNoteEvent) => void): () => void {
  eventListeners.add(listener);
  return () => {
    eventListeners.delete(listener);
  };
}

function emit(e: MidiNoteEvent) {
  eventListeners.forEach((l) => {
    try {
      l(e);
    } catch (err) {
      console.error("MIDI listener failed", err);
    }
  });
}

// ---------- optional app sound ----------

const freq = (midi: number) => Tone.Frequency(midi, "midi").toFrequency();

async function soundOn(midi: number, velocity: number) {
  try {
    const s = await getSampler();
    s.triggerAttack(freq(midi), Tone.now(), Math.max(0.05, velocity / 127));
  } catch {
    /* audio not available */
  }
}
async function soundOff(midi: number) {
  try {
    const s = await getSampler();
    s.triggerRelease(freq(midi), Tone.now());
  } catch {
    /* ignore */
  }
}

export function setAppSound(on: boolean) {
  setSnap({ appSound: on });
  if (on) {
    // Called from a click on the switch, so the browser lets audio start.
    void Tone.start();
    void getSampler();
  } else {
    for (const m of snap.pressed) void soundOff(m);
  }
}

// ---------- note logic ----------

function publishPressed(before: ReadonlySet<number>) {
  const next = new Set<number>([...held, ...sustained]);
  if (snap.appSound) {
    for (const m of before) if (!next.has(m)) void soundOff(m);
  }
  setSnap({ pressed: next });
}

function noteOn(midi: number, velocity: number, time: number) {
  const before = snap.pressed;
  const retrigger = sustained.has(midi);
  sustained.delete(midi);
  held.add(midi);
  if (snap.appSound) {
    if (retrigger) void soundOff(midi);
    void soundOn(midi, velocity);
  }
  setSnap({ lastNote: { midi, velocity, time } });
  publishPressed(before);
  emit({ type: "on", midi, velocity, time });
}

function noteOff(midi: number, time: number) {
  const before = snap.pressed;
  held.delete(midi);
  if (snap.sustain) sustained.add(midi);
  publishPressed(before);
  emit({ type: "off", midi, velocity: 0, time });
}

function setSustain(down: boolean) {
  if (down === snap.sustain) return;
  const before = snap.pressed;
  if (!down) sustained.clear();
  setSnap({ sustain: down });
  publishPressed(before);
}

function allNotesOff() {
  const before = snap.pressed;
  held.clear();
  sustained.clear();
  publishPressed(before);
}

/** Handles one raw MIDI message (3 bytes). Any channel. */
function handleBytes(data: ArrayLike<number>, time: number) {
  const status = data[0] & 0xf0;
  const d1 = data[1] ?? 0;
  const d2 = data[2] ?? 0;
  if (status === 0x90 && d2 > 0) noteOn(d1, d2, time);
  else if (status === 0x80 || status === 0x90) noteOff(d1, time); // note-on with velocity 0 = off
  else if (status === 0xb0) {
    if (d1 === 64) setSustain(d2 >= 64);
    else if (d1 === 120 || d1 === 123) allNotesOff(); // all sound off / all notes off
  }
}

// ---------- connection ----------

function remember() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ granted: true }));
  } catch {
    /* ignore */
  }
}
function wasGranted(): boolean {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return !!raw && JSON.parse(raw)?.granted === true;
  } catch {
    return false;
  }
}

function refreshInputs() {
  if (!access) return;
  const names: string[] = [];
  access.inputs.forEach((input) => {
    if (input.state === "connected") {
      names.push(input.name || input.manufacturer || "Teclado MIDI");
      input.onmidimessage = (ev) => {
        if (ev.data) handleBytes(ev.data, ev.timeStamp || performance.now());
      };
    } else {
      input.onmidimessage = null;
    }
  });
  if (names.length === 0 && (held.size > 0 || sustained.size > 0)) allNotesOff(); // unplugged mid-note
  if (names.length === 0 && snap.sustain) setSustain(false);
  setSnap({ devices: names, status: names.length ? "connected" : "no-devices" });
}

/** Asks Chrome for MIDI access. Call it from a click ("Conectar teclado MIDI"). */
export async function connect(): Promise<void> {
  if (typeof navigator === "undefined" || typeof navigator.requestMIDIAccess !== "function") {
    setSnap({ status: "unsupported" });
    return;
  }
  if (snap.status === "pending") return;
  setSnap({ status: "pending" });
  // Starting audio here (inside the click) lets the optional app sound work later.
  void Tone.start().catch(() => {});
  try {
    access = await navigator.requestMIDIAccess({ sysex: false });
    access.onstatechange = () => refreshInputs();
    remember();
    setSnap({ remembered: true });
    refreshInputs();
  } catch (e: any) {
    const name = e?.name as string | undefined;
    setSnap({ status: name === "SecurityError" || name === "NotAllowedError" ? "denied" : "error" });
  }
}

/** Runs once on the client (from the hook). Never prompts: it connects silently only if already granted. */
function init() {
  if (initialised || typeof navigator === "undefined") return;
  initialised = true;
  if (typeof navigator.requestMIDIAccess !== "function") {
    setSnap({ status: "unsupported" });
    return;
  }
  setSnap({ remembered: wasGranted() });
  try {
    void navigator.permissions
      ?.query({ name: "midi" as PermissionName })
      .then((p) => {
        if (p.state === "granted") void connect();
        else if (p.state === "denied") setSnap({ status: "denied" });
      })
      .catch(() => {});
  } catch {
    /* permissions API without "midi": the user clicks the button */
  }
}

export function useMidiInput() {
  const s = useSyncExternalStore(subscribeState, getSnapshot, getServerSnapshot);
  useEffect(() => {
    init();
  }, []);
  return { ...s, connect, setAppSound };
}

// ---------- dev / test hook (no hardware) ----------

if (typeof window !== "undefined" && import.meta.env.DEV) {
  (window as any).__hhMidi = {
    /** Pretend a key went down / up. */
    simulate(midi: number, on: boolean, velocity = 90) {
      handleBytes([on ? 0x90 : 0x80, midi, on ? velocity : 0], performance.now());
    },
    /** Pretend the sustain pedal went down / up. */
    sustain(down: boolean) {
      handleBytes([0xb0, 64, down ? 127 : 0], performance.now());
    },
    /** Force a status (to see every label) or restore with "idle". */
    setStatus(status: MidiStatus, devices: string[] = []) {
      setSnap({ status, devices });
    },
    snapshot: () => ({ ...snap, pressed: [...snap.pressed] }),
    events: [] as MidiNoteEvent[],
  };
  subscribe((e) => (window as any).__hhMidi.events.push(e));
}
