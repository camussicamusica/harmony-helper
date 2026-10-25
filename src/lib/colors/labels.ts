import type { ColorRole } from "./types";

/**
 * Spanish (Argentina) display names for the built-in color roles.
 *
 * Saved palettes keep the English `name` they were created with (storage is never rewritten).
 * The UI shows these labels instead, looked up by role id. Custom roles show the name she typed.
 */
const NOTE_ES = [
  "Do (C)",
  "Do# / Re♭ (C# / D♭)",
  "Re (D)",
  "Re# / Mi♭ (D# / E♭)",
  "Mi (E)",
  "Fa (F)",
  "Fa# / Sol♭ (F# / G♭)",
  "Sol (G)",
  "Sol# / La♭ (G# / A♭)",
  "La (A)",
  "La# / Si♭ (A# / B♭)",
  "Si (B)",
];

const FIXED: Record<string, string> = {
  "chord-major": "Mayor",
  "chord-minor": "Menor",
  "chord-diminished": "Disminuido",
  "chord-dominant7": "Séptima dominante",
  "chord-augmented": "Aumentado",
  "chord-sus": "Suspendido (sus)",
  "chord-outsideScale": "Fuera de la escala",
  "interval-P1": "Unísono",
  "interval-m2": "2ª menor",
  "interval-M2": "2ª mayor",
  "interval-m3": "3ª menor",
  "interval-M3": "3ª mayor",
  "interval-P4": "4ª justa",
  "interval-TT": "Tritono",
  "interval-P5": "5ª justa",
  "interval-m6": "6ª menor",
  "interval-M6": "6ª mayor",
  "interval-m7": "7ª menor",
  "interval-M7": "7ª mayor",
  "interval-P8": "Octava",
  "function-tonic": "Tónica",
  "function-subdominant": "Subdominante",
  "function-dominant": "Dominante",
  "ui-background": "Fondo",
  "ui-text": "Texto",
  "ui-highlight": "Resaltado",
  "ui-playingNote": "Nota que suena",
  "ui-rightHand": "Mano derecha",
  "ui-leftHand": "Mano izquierda",
};

/** Name to show for a role. Falls back to the stored name. */
export function roleLabel(role: Pick<ColorRole, "id" | "name" | "builtIn">): string {
  if (!role.builtIn) return role.name;
  const note = /^note-(\d+)$/.exec(role.id);
  if (note) return NOTE_ES[Number(note[1])] ?? role.name;
  const pattern = /^pattern-([A-Z])$/.exec(role.id);
  if (pattern) return `Patrón ${pattern[1]}`;
  const degree = /^function-degree-(\d+)$/.exec(role.id);
  if (degree) return `Grado ${degree[1]}`;
  return FIXED[role.id] ?? role.name;
}

/** Label for note chip `pc` (0 = Do … 11 = Si), e.g. "Re (D)". */
export const noteChipLabel = (pc: number) => NOTE_ES[pc] ?? "";
