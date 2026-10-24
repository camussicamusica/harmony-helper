import { useCallback, useEffect, useState } from "react";
import { TopBar } from "./TopBar";
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
import type { IsolationMode, ScheduledNote, ScoreView as ViewMode } from "@/lib/music/types";

const VIEW_KEY = "hh.view.v1";

export function ReaderPage() {
  const [xml, setXml] = useState<string>(SAMPLE_MUSICXML);
  const [bpm, setBpm] = useState(90);
  const [isolation, setIsolationState] = useState<IsolationMode>("both");
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [line, setLine] = useState(false);
  const [intervals, setIntervals] = useState(false);
  const [view, setViewState] = useState<ViewMode>("tocar");
  const [viewReady, setViewReady] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [scoreVersion, setScoreVersion] = useState(0);

  const handleNotes = useCallback((notes: ScheduledNote[]) => {
    void loadNotes(notes);
  }, []);

  useEffect(() => {
    applyInterfaceVars();
  }, []);

  // Remember the chosen view (read after mount so server and client markup match).
  useEffect(() => {
    try {
      const v = localStorage.getItem(VIEW_KEY);
      if (v === "tocar" || v === "estudiar") setViewState(v);
    } catch {
      /* ignore */
    }
    setViewReady(true);
  }, []);

  const setView = (v: ViewMode) => {
    setViewState(v);
    try {
      localStorage.setItem(VIEW_KEY, v);
    } catch {
      /* ignore */
    }
  };

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

  const clampZoom = (z: number) => Math.max(0.5, Math.min(2.5, Math.round(z * 100) / 100));

  const tocar = view === "tocar";
  const pianoVisible = tocar || showKeyboard;

  return (
    <div
      className={`flex flex-col bg-background font-sans antialiased ${
        tocar ? "h-screen overflow-hidden" : "min-h-screen"
      }`}
    >
      <TopBar
        isPlaying={isPlaying}
        bpm={bpm}
        isolation={isolation}
        zoom={zoom}
        view={view}
        line={line}
        intervals={intervals}
        showKeyboard={showKeyboard}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onBpmChange={handleBpmChange}
        onIsolationChange={setIsolationState}
        onZoomChange={(z) => setZoom(clampZoom(z))}
        onViewChange={setView}
        onLineChange={setLine}
        onIntervalsChange={setIntervals}
        onShowKeyboardChange={setShowKeyboard}
        onScoreLoaded={handleScoreLoaded}
      />
      <main className={`flex flex-1 flex-col ${tocar ? "min-h-0" : ""}`}>
        <section className={`flex-1 ${tocar ? "min-h-0 border-b border-border" : ""}`}>
          {viewReady && (
            <ScoreView
              key={scoreVersion}
              xml={xml}
              bpm={bpm}
              isolation={isolation}
              zoom={zoom}
              view={view}
              line={line}
              intervals={intervals}
              isPlaying={isPlaying}
              onNotes={handleNotes}
            />
          )}
        </section>
        {pianoVisible && (
          <section
            className={`h-[172px] shrink-0 bg-background ${
              tocar ? "" : "sticky bottom-0 z-20 border-t border-border"
            }`}
          >
            <PianoView isolation={isolation} />
          </section>
        )}
      </main>
    </div>
  );
}
