const NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const BLACK_PCS = new Set([1, 3, 6, 8, 10]);

export const FIRST_MIDI = 21; // A0
export const LAST_MIDI = 108; // C8

export function midiToName(midi: number): string {
  const pc = midi % 12;
  const octave = Math.floor(midi / 12) - 1;
  return `${NOTE_NAMES[pc]}${octave}`;
}

export function isBlackKey(midi: number): boolean {
  return BLACK_PCS.has(midi % 12);
}

/**
 * Pitch-class → color (Solfège mapping).
 * Accidentals adopt the nearest natural's color (sharp uses lower neighbor).
 */
const PC_COLORS: Record<number, string> = {
  0: "#E53935",  // C  - Red
  1: "#E53935",  // C# (-> C)
  2: "#F9C81E",  // D  - Yellow
  3: "#F9C81E",  // D# (-> D)
  4: "#7EC8F2",  // E  - Light Blue
  5: "#8B5A2B",  // F  - Brown
  6: "#8B5A2B",  // F# (-> F)
  7: "#1E5FBF",  // G  - Deeper Blue (distinct from E)
  8: "#1E5FBF",  // G# (-> G)
  9: "#F06292",  // A  - Pink
  10: "#F06292", // A# (-> A)
  11: "#8E24AA", // B  - Violet
};

export function pitchClassColor(midi: number): string {
  return PC_COLORS[midi % 12] ?? "#000000";
}

export interface KeyGeometry {
  midi: number;
  isBlack: boolean;
  x: number;
  width: number;
  whiteIndex: number | null;
}

/** Build geometry for 88 keys. White-key width = 1 unit; black-key width = 0.6 units, centered on the gap. */
export function buildKeyboardGeometry(whiteKeyWidth = 24) {
  const blackKeyWidth = whiteKeyWidth * 0.6;
  const keys: KeyGeometry[] = [];
  let whiteIndex = 0;
  for (let m = FIRST_MIDI; m <= LAST_MIDI; m++) {
    if (!isBlackKey(m)) {
      keys.push({
        midi: m,
        isBlack: false,
        x: whiteIndex * whiteKeyWidth,
        width: whiteKeyWidth,
        whiteIndex,
      });
      whiteIndex++;
    }
  }
  const totalWhite = whiteIndex;
  for (let m = FIRST_MIDI; m <= LAST_MIDI; m++) {
    if (isBlackKey(m)) {
      const prevWhite = keys.find((k) => k.midi === m - 1);
      if (!prevWhite) continue;
      const x = prevWhite.x + whiteKeyWidth - blackKeyWidth / 2;
      keys.push({
        midi: m,
        isBlack: true,
        x,
        width: blackKeyWidth,
        whiteIndex: null,
      });
    }
  }
  return {
    keys,
    whiteKeyWidth,
    blackKeyWidth,
    totalWidth: totalWhite * whiteKeyWidth,
  };
}
