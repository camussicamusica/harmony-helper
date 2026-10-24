import { MOCK_C_MAJOR_SCALE_MUSICXML } from "./mockScale";

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

/**
 * Convert an uploaded score file (PDF / MusicXML / MIDI) into MusicXML.
 *
 * - .xml / .musicxml / .mxl  → read the file text directly (no OMR needed).
 * - .pdf / .mid / .midi      → POST to backend OMR endpoint when configured,
 *                              otherwise fall back to a mock that resolves
 *                              with the bundled sample score after ~3s.
 */
export async function convertToMusicXml(
  file: File,
  onProgress?: (p: OmrProgress) => void,
): Promise<OmrResult> {
  const name = file.name.toLowerCase();
  const isXml = /\.(musicxml|xml|mxl)$/.test(name);

  if (isXml) {
    onProgress?.({ stage: "uploading", percent: 50, message: "Reading file" });
    const text = await file.text();
    onProgress?.({ stage: "done", percent: 100 });
    return { musicXml: text, filename: file.name };
  }

  // OMR path (PDF / MIDI).
  const endpoint = (import.meta as any).env?.VITE_OMR_ENDPOINT as string | undefined;

  if (endpoint) {
    onProgress?.({ stage: "uploading", percent: 10, message: "Uploading PDF" });
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(endpoint, { method: "POST", body: form });
    if (!res.ok) throw new Error(`OMR failed: ${res.status}`);
    onProgress?.({ stage: "processing", percent: 70, message: "Recognizing notes" });
    const data = await res.json();
    onProgress?.({ stage: "done", percent: 100 });
    return { musicXml: data.musicXml, filename: file.name };
  }

  // Mock pipeline — simulate upload + OMR processing.
  return mockOmr(file, onProgress);
}

async function mockOmr(file: File, onProgress?: (p: OmrProgress) => void): Promise<OmrResult> {
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
