import * as Tone from "tone";
import type { Hand, IsolationMode, ScheduledNote } from "./types";

type Listener = () => void;

class ActiveNotesStore {
  rh = new Set<number>();
  lh = new Set<number>();
  hoverRh = new Set<number>();
  hoverLh = new Set<number>();

  private listeners = new Set<Listener>();
  private version = 0;

  subscribe = (l: Listener) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };
  getSnapshot = () => this.version;
  private bump() {
    this.version++;
    this.listeners.forEach((l) => l());
  }

  add(midi: number, hand: Hand) {
    (hand === "RH" ? this.rh : this.lh).add(midi);
    this.bump();
  }
  remove(midi: number, hand: Hand) {
    (hand === "RH" ? this.rh : this.lh).delete(midi);
    this.bump();
  }
  addHover(midi: number, hand: Hand) {
    (hand === "RH" ? this.hoverRh : this.hoverLh).add(midi);
    this.bump();
  }
  removeHover(midi: number, hand: Hand) {
    (hand === "RH" ? this.hoverRh : this.hoverLh).delete(midi);
    this.bump();
  }
  clear() {
    this.rh.clear();
    this.lh.clear();
    this.bump();
  }
  clearHover() {
    this.hoverRh.clear();
    this.hoverLh.clear();
    this.bump();
  }
  isActive(midi: number, hand: Hand): boolean {
    if (hand === "RH") return this.rh.has(midi) || this.hoverRh.has(midi);
    return this.lh.has(midi) || this.hoverLh.has(midi);
  }
}

export const activeNotes = new ActiveNotesStore();

let sampler: Tone.Sampler | null = null;
let samplerLoaded: Promise<void> | null = null;

export function getSampler(): Promise<Tone.Sampler> {
  if (sampler && samplerLoaded) return samplerLoaded.then(() => sampler!);
  sampler = new Tone.Sampler({
    urls: {
      A0: "A0.mp3", C1: "C1.mp3", "D#1": "Ds1.mp3", "F#1": "Fs1.mp3",
      A1: "A1.mp3", C2: "C2.mp3", "D#2": "Ds2.mp3", "F#2": "Fs2.mp3",
      A2: "A2.mp3", C3: "C3.mp3", "D#3": "Ds3.mp3", "F#3": "Fs3.mp3",
      A3: "A3.mp3", C4: "C4.mp3", "D#4": "Ds4.mp3", "F#4": "Fs4.mp3",
      A4: "A4.mp3", C5: "C5.mp3", "D#5": "Ds5.mp3", "F#5": "Fs5.mp3",
      A5: "A5.mp3", C6: "C6.mp3",
    },
    release: 1,
    baseUrl: "https://tonejs.github.io/audio/salamander/",
  }).toDestination();
  samplerLoaded = Tone.loaded();
  return samplerLoaded.then(() => sampler!);
}

let scheduledIds: number[] = [];
let currentNotes: ScheduledNote[] = [];
let isolationRef: IsolationMode = "both";

export function setIsolation(mode: IsolationMode) {
  isolationRef = mode;
}

function shouldPlay(hand: Hand) {
  if (isolationRef === "both") return true;
  if (isolationRef === "rh") return hand === "RH";
  return hand === "LH";
}

const PLAYING_CLASS = "note-playing";

function markPlaying(note: ScheduledNote, on: boolean) {
  if (!note.svgEls?.length) return;
  for (const el of note.svgEls) {
    try {
      if (!el || !el.isConnected) continue;
      if (on) el.classList.add(PLAYING_CLASS);
      else el.classList.remove(PLAYING_CLASS);
    } catch {
      /* ignore detached node */
    }
  }
}

export function clearScoreHighlights() {
  if (typeof document === "undefined") return;
  try {
    document
      .querySelectorAll<SVGGElement>(`.${PLAYING_CLASS}`)
      .forEach((el) => el.classList.remove(PLAYING_CLASS));
  } catch {
    /* ignore */
  }
}

export async function loadNotes(notes: ScheduledNote[]) {
  await getSampler();
  clearSchedule();
  currentNotes = notes;
}

export function clearSchedule() {
  try {
    scheduledIds.forEach((id) => {
      try {
        Tone.getTransport().clear(id);
      } catch {
        /* transport may be disposed */
      }
    });
  } catch {
    /* ignore */
  }
  scheduledIds = [];
  activeNotes.clear();
  clearScoreHighlights();
}

export async function play() {
  await Tone.start();
  const samp = await getSampler();
  clearSchedule();

  for (const note of currentNotes) {
    const id = Tone.getTransport().schedule((time) => {
      if (!shouldPlay(note.hand)) return;
      const freq = Tone.Frequency(note.midi, "midi").toFrequency();
      samp.triggerAttackRelease(freq, note.durationSec, time);
      Tone.getDraw().schedule(() => {
        activeNotes.add(note.midi, note.hand);
        markPlaying(note, true);
      }, time);
      Tone.getDraw().schedule(() => {
        activeNotes.remove(note.midi, note.hand);
        markPlaying(note, false);
      }, time + note.durationSec);
    }, note.startSec);
    scheduledIds.push(id);
  }

  Tone.getTransport().start();
}

export function pause() {
  Tone.getTransport().pause();
}

export function stop() {
  try {
    Tone.getTransport().stop();
    Tone.getTransport().position = 0;
  } catch {
    /* transport may be disposed */
  }
  activeNotes.clear();
  clearScoreHighlights();
}

export function setBpm(bpm: number) {
  Tone.getTransport().bpm.value = bpm;
}
