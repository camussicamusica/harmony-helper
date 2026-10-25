import { darken } from "./color";
import type { ColorRole, ColorTarget } from "./types";

/** Shown instead of a note color when that note is switched off (fade-out mode). */
export const PLAIN_COLOR = "#000000";

/** Resting fill of the piano's black keys. */
export const BLACK_KEY_COLOR = "#1a1a1a";

/** Chip outline for a switched-off note in the strip. */
export const OFF_CHIP_COLOR = "#9ca3af";

/** Note names, both spellings. Index = pitch class. */
export const NOTE_LABELS = [
  "C", "C#/D♭", "D", "D#/E♭", "E", "F", "F#/G♭", "G", "G#/A♭", "A", "A#/B♭", "B",
];
export const NOTE_SHORT = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const NATURALS: Record<number, string> = {
  0: "#E53935", // C
  2: "#F9C81E", // D
  4: "#7EC8F2", // E
  5: "#8B5A2B", // F
  7: "#1E5FBF", // G
  9: "#F06292", // A
  11: "#8E24AA", // B
};

const NOTE_TARGETS: ColorTarget[] = ["stem", "accidental", "pianoKey", "square"];

function role(
  id: string,
  group: ColorRole["group"],
  name: string,
  color: string,
  targets: ColorTarget[],
  extra: Partial<ColorRole> = {},
): ColorRole {
  return { id, group, name, color, targets, builtIn: true, enabled: true, ...extra };
}

function buildNotes(): ColorRole[] {
  const out: ColorRole[] = [];
  for (let pc = 0; pc < 12; pc++) {
    const natural = NATURALS[pc];
    // Placeholder: sharps start as a darker shade of the natural below. She will repaint them.
    const color = natural ?? darken(NATURALS[pc - 1], 0.12).toUpperCase();
    out.push(role(`note-${pc}`, "notes", NOTE_LABELS[pc], color, [...NOTE_TARGETS]));
  }
  return out;
}

const CHORD_TARGETS: ColorTarget[] = ["square", "circleOutline", "band"];

function buildChords(): ColorRole[] {
  const spec: [string, string, string][] = [
    ["major", "Major", "#9CA3AF"],
    ["minor", "Minor", "#6B7280"],
    ["diminished", "Diminished", "#4B5563"],
    ["dominant7", "Dominant 7th", "#D1D5DB"],
    ["augmented", "Augmented", "#A8A29E"],
    ["sus", "Suspended", "#CBD5E1"],
    ["outsideScale", "Outside the scale", "#78716C"],
  ];
  return spec.map(([id, name, c]) => role(`chord-${id}`, "chords", name, c, [...CHORD_TARGETS]));
}

/** Interval role ids in order of size. P1 (unison) is a neutral grey, not toggled in the strip. */
export const INTERVAL_IDS = ["m2", "M2", "m3", "M3", "P4", "TT", "P5", "m6", "M6", "m7", "M7", "P8"] as const;

/** Default interval colors (hers to repaint). Index = semitones (mod 12, 0 = octave) in INTERVAL_IDS order + P1. */
export const INTERVAL_DEFAULTS: Record<string, string> = {
  P1: "#9CA3AF", // neutral grey
  m2: "#7B1E3A", // wine
  M2: "#E4572E", // vermilion
  m3: "#F2A33A", // amber
  M3: "#D4B106", // gold
  P4: "#7CB342", // green
  TT: "#00897B", // teal
  P5: "#1E88E5", // blue
  m6: "#3949AB", // indigo
  M6: "#8E24AA", // purple
  m7: "#EC407A", // pink
  M7: "#795548", // brown
  P8: "#00ACC1", // cyan
};

/** The old grey placeholders (210 - 12*i). Used only to migrate stored roles that were never repainted. */
export const OLD_INTERVAL_GREYS: Record<string, string> = Object.fromEntries(
  INTERVAL_IDS.map((id, i) => {
    const g = Math.round(210 - i * 12).toString(16).padStart(2, "0");
    return [`interval-${id}`, `#${g}${g}${g}`];
  }),
);

/** Neutral dark grey for note rings in "Intervalos" mode (only intervals carry color). */
export const RING_NEUTRAL_COLOR = "#4b5563";
/** White halo under the line so it reads over staff lines. */
export const HALO_COLOR = "#ffffff";
/** Thin segment for a switched-off interval. */
export const DISABLED_SEGMENT_COLOR = "#d1d5db";
/** Pill label text, chosen by contrast. */
export const PILL_TEXT_DARK = "#111111";
export const PILL_TEXT_LIGHT = "#ffffff";

function buildIntervals(): ColorRole[] {
  const names: Record<string, string> = {
    P1: "Unison", m2: "Minor 2nd", M2: "Major 2nd", m3: "Minor 3rd", M3: "Major 3rd",
    P4: "Perfect 4th", TT: "Tritone", P5: "Perfect 5th", m6: "Minor 6th",
    M6: "Major 6th", m7: "Minor 7th", M7: "Major 7th", P8: "Octave",
  };
  return ["P1", ...INTERVAL_IDS].map((id) =>
    role(`interval-${id}`, "intervals", names[id], INTERVAL_DEFAULTS[id], ["band", "square"]),
  );
}

function buildPatterns(): ColorRole[] {
  return ["A", "B", "C", "D", "E", "F"].map((l, i) => {
    const grey = Math.round(200 - i * 18).toString(16).padStart(2, "0");
    return role(`pattern-${l}`, "patterns", `Pattern ${l}`, `#${grey}${grey}${grey}`, ["band", "square"]);
  });
}

function buildFunctions(): ColorRole[] {
  const base: [string, string][] = [
    ["tonic", "Tonic"], ["subdominant", "Subdominant"], ["dominant", "Dominant"],
  ];
  const out = base.map(([id, name], i) => {
    const g = Math.round(190 - i * 30).toString(16).padStart(2, "0");
    return role(`function-${id}`, "functions", name, `#${g}${g}${g}`, ["band", "square"]);
  });
  for (let d = 1; d <= 7; d++) {
    const g = Math.round(225 - d * 14).toString(16).padStart(2, "0");
    out.push(role(`function-degree-${d}`, "functions", `Degree ${d}`, `#${g}${g}${g}`, ["band", "square"]));
  }
  return out;
}

/** Built-in default hex for interface roles. Applied to the page only when she changes it. */
function buildInterface(): ColorRole[] {
  const t: ColorTarget[] = ["cssVar"];
  return [
    role("ui-background", "interface", "Background", "#FFFFFF", t, { cssVars: ["--background"] }),
    role("ui-text", "interface", "Text", "#0B1220", t, { cssVars: ["--foreground"] }),
    role("ui-highlight", "interface", "Highlight", "#F1F5F9", t, { cssVars: ["--accent"] }),
    role("ui-playingNote", "interface", "Playing note", "#F59E0B", t, { cssVars: ["--playing-note"] }),
    role("ui-rightHand", "interface", "Right hand", "#2BB5BC", t, { cssVars: ["--rh"] }),
    role("ui-leftHand", "interface", "Left hand", "#F2784B", t, { cssVars: ["--lh"] }),
  ];
}

export function buildDefaultRoles(): ColorRole[] {
  return [
    ...buildNotes(),
    ...buildChords(),
    ...buildIntervals(),
    ...buildPatterns(),
    ...buildFunctions(),
    ...buildInterface(),
  ];
}

export const NAMED_SWATCHES: { name: string; color: string }[] = [
  { name: "carmesí", color: "#DC143C" },
  { name: "escarlata", color: "#FF2400" },
  { name: "rojo", color: "#E53935" },
  { name: "ladrillo", color: "#A0442C" },
  { name: "marrón", color: "#8B5A2B" },
  { name: "chocolate", color: "#5C3A21" },
  { name: "rosa", color: "#E8588F" },
  { name: "rosado", color: "#F06292" },
  { name: "salmón", color: "#FA8072" },
  { name: "coral", color: "#FF7F50" },
  { name: "ámbar", color: "#FFBF00" },
  { name: "dorado", color: "#D4AF37" },
  { name: "amarillo", color: "#F9C81E" },
  { name: "oliva", color: "#808000" },
  { name: "verde", color: "#2E9E4F" },
  { name: "verde azulado", color: "#008080" },
  { name: "celeste", color: "#7EC8F2" },
  { name: "cielo", color: "#4FB3E8" },
  { name: "azul aciano", color: "#6495ED" },
  { name: "azul", color: "#1E5FBF" },
  { name: "azul marino", color: "#14284B" },
  { name: "índigo", color: "#4B0082" },
  { name: "violeta", color: "#8E24AA" },
  { name: "púrpura", color: "#7B1FA2" },
  { name: "lavanda", color: "#B9A6E8" },
  { name: "gris", color: "#808080" },
  { name: "negro", color: "#000000" },
  { name: "blanco", color: "#FFFFFF" },
];
