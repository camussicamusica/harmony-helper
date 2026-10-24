import { useCallback, useEffect, useState } from "react";
import { TopBar } from "./TopBar";
import { UploadZone } from "./UploadZone";
import { ScoreView } from "./ScoreView";
import { PianoView } from "./PianoView";
import { SAMPLE_MUSICXML } from "@/lib/music/sampleScore";
import {
  clearSchedule,
  loadNotes,
  pause,
  play,
  setIsolation,
  stop,
} from "@/lib/music/scheduler";
import { applyInterfaceVars } from "@/lib/colors/store";
import type { IsolationMode, ScheduledNote } from "@/lib/music/types";

export function ReaderPage() {
  const [xml, setXml] = useState<string>(SAMPLE_MUSICXML);
  const [bpm, setBpm] = useState(90);
  const [isolation, setIsolationState] = useState<IsolationMode>("both");
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [contour, setContour] = useState(false);
  const [scoreVersion, setScoreVersion] = useState(0);

  const handleNotes = useCallback((notes: ScheduledNote[]) => {
    void loadNotes(notes);
  }, []);

  useEffect(() => {
    applyInterfaceVars();
  }, []);

  useEffect(() => {
    setIsolation(isolation);
  }, [isolation]);

  const handlePlay = async () => {
    setIsPlaying(true);
    await play();
  };
  const handlePause = () => {
    pause();
    setIsPlaying(false);
  };
  const handleStop = () => {
    stop();
    clearSchedule();
    setIsPlaying(false);
  };

  const handleBpmChange = (v: number) => {
    setBpm(v);
    if (isPlaying) {
      stop();
      setIsPlaying(false);
    }
  };

  const handleScoreLoaded = (musicXml: string, _filename: string) => {
    handleStop();
    setXml(musicXml);
    setScoreVersion((v) => v + 1);
  };

  const handleUpload = async (file: File) => {
    const text = await file.text();
    handleScoreLoaded(text, file.name);
  };

  const clampZoom = (z: number) => Math.max(0.5, Math.min(2.5, Math.round(z * 100) / 100));

  return (
    <div className="flex h-screen flex-col bg-background font-sans antialiased">
      <TopBar
        isPlaying={isPlaying}
        bpm={bpm}
        isolation={isolation}
        zoom={zoom}
        contour={contour}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onBpmChange={handleBpmChange}
        onIsolationChange={setIsolationState}
        onZoomChange={(z) => setZoom(clampZoom(z))}
        onContourChange={setContour}
        onFileUpload={handleUpload}
      />
      <UploadZone onScoreLoaded={handleScoreLoaded} />
      <main className="grid min-h-0 flex-1 grid-rows-2">

        <section className="min-h-0 border-b border-border">
          <ScoreView
            key={scoreVersion}
            xml={xml}
            bpm={bpm}
            isolation={isolation}
            zoom={zoom}
            contour={contour}
            onNotes={handleNotes}
          />
        </section>
        <section className="min-h-0">
          <PianoView isolation={isolation} />
        </section>
      </main>
    </div>
  );
}
