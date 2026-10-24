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

function buildIntervals(): ColorRole[] {
  const spec: [string, string][] = [
    ["m2", "Minor 2nd"], ["M2", "Major 2nd"], ["m3", "Minor 3rd"], ["M3", "Major 3rd"],
    ["P4", "Perfect 4th"], ["TT", "Tritone"], ["P5", "Perfect 5th"], ["m6", "Minor 6th"],
    ["M6", "Major 6th"], ["m7", "Minor 7th"], ["M7", "Major 7th"], ["P8", "Octave"],
  ];
  return spec.map(([id, name], i) => {
    const grey = Math.round(210 - i * 12).toString(16).padStart(2, "0");
    return role(`interval-${id}`, "intervals", name, `#${grey}${grey}${grey}`, ["band", "square"]);
  });
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
  { name: "crimson", color: "#DC143C" },
  { name: "scarlet", color: "#FF2400" },
  { name: "red", color: "#E53935" },
  { name: "brick", color: "#A0442C" },
  { name: "brown", color: "#8B5A2B" },
  { name: "chocolate", color: "#5C3A21" },
  { name: "rose", color: "#E8588F" },
  { name: "pink", color: "#F06292" },
  { name: "salmon", color: "#FA8072" },
  { name: "coral", color: "#FF7F50" },
  { name: "amber", color: "#FFBF00" },
  { name: "gold", color: "#D4AF37" },
  { name: "yellow", color: "#F9C81E" },
  { name: "olive", color: "#808000" },
  { name: "green", color: "#2E9E4F" },
  { name: "teal", color: "#008080" },
  { name: "celeste", color: "#7EC8F2" },
  { name: "sky", color: "#4FB3E8" },
  { name: "cornflower", color: "#6495ED" },
  { name: "blue", color: "#1E5FBF" },
  { name: "navy", color: "#14284B" },
  { name: "indigo", color: "#4B0082" },
  { name: "violet", color: "#8E24AA" },
  { name: "purple", color: "#7B1FA2" },
  { name: "lavender", color: "#B9A6E8" },
  { name: "grey", color: "#808080" },
  { name: "black", color: "#000000" },
  { name: "white", color: "#FFFFFF" },
];
