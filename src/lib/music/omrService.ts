import { MOCK_C_MAJOR_SCALE_MUSICXML } from "./mockScale";
import { looksLikeZip, musicXmlFromMxl } from "./mxl";

export type OmrStage = "idle" | "uploading" | "processing" | "done" | "error";

export interface OmrProgress {
  stage: OmrStage;
  percent: number; // 0-100
  message?: string;
}

export interface OmrResult {
  musicXml: string;
  filename: string;
}

export const PDF_NOT_SUPPORTED =
  "Todavía no puedo leer PDF. Por ahora, abrí la partitura en MuseScore (gratis) y exportala como MusicXML (.musicxml o .mxl). Leer PDF viene más adelante.";

export const MIDI_NOT_SUPPORTED =
  "Todavía no puedo abrir archivos MIDI como partitura. Por ahora, abrí la partitura en MuseScore (gratis) y exportala como MusicXML (.musicxml o .mxl). Importar MIDI viene más adelante.";

export const UNKNOWN_FILE =
  "No reconozco ese tipo de archivo. Abrí una partitura en MusicXML (.musicxml, .xml o .mxl).";

/**
 * Turn an uploaded score file into MusicXML text.
 *
 * - .musicxml / .xml  -> read as text.
 * - .mxl              -> compressed MusicXML (a ZIP): the XML inside is extracted (see mxl.ts).
 * - .pdf              -> only with a real OMR backend (VITE_OMR_ENDPOINT). Without one, it says so and loads nothing.
 * - .mid / .midi      -> not supported yet (OSMD cannot draw MIDI): it says so and loads nothing.
 *
 * The old fake path (wait ~3 s, then load a C-major scale as if it were her piece) is no longer
 * reachable. `mockOmr` stays in this file for reference only.
 */
export async function convertToMusicXml(
  file: File,
  onProgress?: (p: OmrProgress) => void,
): Promise<OmrResult> {
  const name = file.name.toLowerCase();

  if (/\.(musicxml|xml|mxl)$/.test(name)) {
    onProgress?.({ stage: "uploading", percent: 40, message: "Leyendo el archivo" });
    const bytes = new Uint8Array(await file.arrayBuffer());
    let musicXml: string;
    if (looksLikeZip(bytes)) {
      musicXml = await musicXmlFromMxl(bytes);
    } else {
      musicXml = new TextDecoder("utf-8").decode(bytes);
      if (!/<score-(partwise|timewise)[\s>]/.test(musicXml)) {
        throw new Error("Ese archivo no parece una partitura MusicXML. Exportala de nuevo desde MuseScore.");
      }
    }
    onProgress?.({ stage: "done", percent: 100 });
    return { musicXml, filename: file.name };
  }

  if (/\.pdf$/.test(name)) {
    const endpoint = (import.meta as any).env?.VITE_OMR_ENDPOINT as string | undefined;
    if (!endpoint) throw new Error(PDF_NOT_SUPPORTED);
    onProgress?.({ stage: "uploading", percent: 10, message: "Subiendo el PDF" });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: form });
    if (!res.ok) throw new Error(`No pude leer el PDF (error ${res.status}).`);
    onProgress?.({ stage: "processing", percent: 70, message: "Reconociendo las notas" });
    const data = await res.json();
    onProgress?.({ stage: "done", percent: 100 });
    return { musicXml: data.musicXml, filename: file.name };
  }

  if (/\.(mid|midi)$/.test(name)) throw new Error(MIDI_NOT_SUPPORTED);

  throw new Error(UNKNOWN_FILE);
}

/**
 * FAKE pipeline, kept for reference and NOT used: it pretends to process a file and returns the
 * bundled C-major scale. It misled the user into thinking the scale was her piece.
 */
export async function mockOmr(file: File, onProgress?: (p: OmrProgress) => void): Promise<OmrResult> {
  // ~3s total processing simulation per spec.
  const steps: Array<{ stage: OmrStage; percent: number; message: string; wait: number }> = [
    { stage: "uploading", percent: 20, message: "Uploading score", wait: 500 },
    { stage: "uploading", percent: 45, message: "Uploaded", wait: 400 },
    { stage: "processing", percent: 70, message: "Analyzing staves", wait: 900 },
    { stage: "processing", percent: 95, message: "Recognizing notes", wait: 1100 },
    { stage: "done", percent: 100, message: "Complete", wait: 100 },
  ];
  for (const s of steps) {
    onProgress?.({ stage: s.stage, percent: s.percent, message: s.message });
    await new Promise((r) => setTimeout(r, s.wait));
  }
  return { musicXml: MOCK_C_MAJOR_SCALE_MUSICXML, filename: file.name };
}
