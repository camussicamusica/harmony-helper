import { useCallback, useEffect, useRef, useState } from "react";
import { FileUp, Loader2, X } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { convertToMusicXml, type OmrProgress } from "@/lib/music/omrService";

interface Props {
  onScoreLoaded: (musicXml: string, filename: string) => void;
}

/** Toolbar button "Abrir partitura" + drag-and-drop anywhere on the page. */
export function UploadZone({ onScoreLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<OmrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = progress !== null && progress.stage !== "done" && progress.stage !== "error";
  const busyRef = useRef(busy);
  busyRef.current = busy;

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const result = await convertToMusicXml(file, setProgress);
        onScoreLoaded(result.musicXml, result.filename);
        // brief "done" flash, then clear
        setTimeout(() => setProgress(null), 600);
      } catch (e: any) {
        setError(e?.message ?? "No se pudo abrir el archivo.");
        setProgress({ stage: "error", percent: 0 });
      }
    },
    [onScoreLoaded],
  );

  // Drag and drop anywhere on the page.
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      if (!busyRef.current) setDragOver(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (depth === 0) setDragOver(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragOver(false);
      if (busyRef.current) return;
      const f = e.dataTransfer?.files?.[0];
      if (f) void handleFile(f);
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
    };
  }, [handleFile]);

  const stageLabel = (() => {
    if (!progress) return null;
    switch (progress.stage) {
      case "uploading":
        return "Leyendo…";
      case "processing":
        return "Procesando…";
      case "done":
        return "Listo";
      case "error":
        return "Error";
      default:
        return null;
    }
  })();

  return (
    <>
      <div className="relative flex items-center gap-2">
        <button
          type="button"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-1.5 text-xs hover:bg-accent disabled:cursor-wait disabled:opacity-80"
        >
          {busy ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
          ) : (
            <FileUp className="h-3.5 w-3.5" />
          )}
          Abrir partitura
        </button>
        {!busy && error && (
          <div
            role="alert"
            className="absolute right-0 top-full z-50 mt-2 flex w-80 max-w-[90vw] items-start gap-2 rounded-md border border-border bg-card p-3 text-xs leading-snug text-foreground shadow-lg"
          >
            <span className="flex-1">{error}</span>
            <button
              type="button"
              aria-label="Cerrar aviso"
              className="shrink-0 rounded p-0.5 text-muted-foreground hover:text-foreground"
              onClick={() => setError(null)}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        {busy && (
          <div className="flex w-32 flex-col gap-1">
            <span className="truncate text-[11px] italic text-foreground">
              {stageLabel}
              {progress?.message ? ` — ${progress.message}` : ""}
            </span>
            <Progress value={progress?.percent ?? 0} className="h-1" />
          </div>
        )}
        <input
          ref={inputRef}
          type="file"
          accept=".musicxml,.xml,.mxl"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
      {dragOver && (
        <div className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center border-4 border-dashed border-primary bg-primary/10">
          <div className="rounded-lg bg-card px-6 py-4 text-sm font-medium shadow-lg">
            Soltá la partitura acá (.musicxml, .xml o .mxl)
          </div>
        </div>
      )}
    </>
  );
}
