import { useCallback, useRef, useState } from "react";
import { FileUp, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { convertToMusicXml, type OmrProgress } from "@/lib/music/omrService";
import { cn } from "@/lib/utils";

interface Props {
  onScoreLoaded: (musicXml: string, filename: string) => void;
}

export function UploadZone({ onScoreLoaded }: Props) {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [progress, setProgress] = useState<OmrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const busy = progress !== null && progress.stage !== "done" && progress.stage !== "error";

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      try {
        const result = await convertToMusicXml(file, setProgress);
        onScoreLoaded(result.musicXml, result.filename);
        // brief "done" flash, then clear
        setTimeout(() => setProgress(null), 600);
      } catch (e: any) {
        setError(e?.message ?? "Failed to process file");
        setProgress({ stage: "error", percent: 0 });
      }
    },
    [onScoreLoaded],
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (busy) return;
    const f = e.dataTransfer.files?.[0];
    if (f) void handleFile(f);
  };

  const stageLabel = (() => {
    if (!progress) return null;
    switch (progress.stage) {
      case "uploading":
        return "Uploading…";
      case "processing":
        return "Processing…";
      case "done":
        return "Ready";
      case "error":
        return "Error";
      default:
        return null;
    }
  })();

  return (
    <div className="border-b border-border bg-card/40 px-6 py-3">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!busy) setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !busy && inputRef.current?.click()}
        className={cn(
          "group flex cursor-pointer items-center gap-4 rounded-lg border border-dashed px-4 py-3 transition-colors",
          dragOver ? "border-primary bg-primary/5" : "border-border hover:border-foreground/40",
          busy && "cursor-wait opacity-90",
        )}
        role="button"
        aria-label="Upload score"
      >
        <div className="flex h-9 w-9 items-center justify-center rounded-md bg-background">
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
          ) : (
            <FileUp className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium">
            Upload Score{" "}
            <span className="text-xs font-normal text-muted-foreground">(PDF, XML, MIDI)</span>
          </div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            {busy ? (
              <span className="italic text-foreground">
                {stageLabel}
                {progress?.message ? ` — ${progress.message}` : ""}
              </span>
            ) : error ? (
              <span className="italic text-destructive">{error}</span>
            ) : (
              <span>Drag &amp; drop a file here, or click to browse.</span>
            )}
          </div>
          {busy && (
            <div className="mt-2">
              <Progress value={progress?.percent ?? 0} className="h-1" />
            </div>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.musicxml,.xml,.mxl,.mid,.midi"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void handleFile(f);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
