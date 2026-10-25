import { useCallback, useEffect, useMemo, useState } from "react";
import { TopBar } from "./TopBar";
import { ScoreView } from "./ScoreView";
import { PianoView } from "./PianoView";
import { FichaPanel, type FichaFocus } from "@/components/analysis/FichaPanel";
import { RecorridoPanel } from "@/components/recorrido/RecorridoPanel";
import { useRecorrido } from "@/lib/music/recorrido/useRecorrido";
import type { StepAction } from "@/lib/music/recorrido/steps";
import {
  hashText,
  highlightedIndices,
  useChordOverlayPref,
  useFicha,
  type ChordHighlight,
  type ScoreData,
} from "@/lib/music/analysis/useFicha";
import type { ScoreMeta } from "@/lib/music/analysis/scoreMeta";
import { SAMPLE_MUSICXML } from "@/lib/music/sampleScore";
import {
  clearSchedule,
  loadNotes,
  pause,
  play,
  playRange,
  setIsolation,
  stop,
} from "@/lib/music/scheduler";
import { useAlwaysLabels, useLineMode } from "@/lib/music/lineMode";
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
  const [intervals, setIntervals] = useAlwaysLabels();
  const [lineMode, setLineMode] = useLineMode();
  const [view, setViewState] = useState<ViewMode>("tocar");
  const [viewReady, setViewReady] = useState(false);
  const [showKeyboard, setShowKeyboard] = useState(false);
  const [scoreVersion, setScoreVersion] = useState(0);

  const [fichaOpen, setFichaOpen] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
  const [showChordMarks, setShowChordMarks] = useChordOverlayPref();
  const [highlight, setHighlight] = useState<ChordHighlight>(null);
  const [focusChord, setFocusChord] = useState<{ index: number; nonce: number } | null>(null);
  const [recorridoOpen, setRecorridoOpen] = useState(false);
  const [fichaFocus, setFichaFocus] = useState<FichaFocus | null>(null);
  const [markMode, setMarkMode] = useState(false);
  const [selectedMeasure, setSelectedMeasure] = useState<number | null>(null);
  const [focusMeasure, setFocusMeasure] = useState<{ measure: number; nonce: number } | null>(null);
  const [loopMeasure, setLoopMeasure] = useState<number | null>(null);
  /** Tempo before "Recorrido" step 2 slowed it down. */
  const [slowFrom, setSlowFrom] = useState<number | null>(null);
  const scoreHash = useMemo(() => hashText(xml), [xml]);
  const recorrido = useRecorrido(scoreHash);
  const ficha = useFicha(xml, scoreData, bpm, fichaOpen || showChordMarks || recorridoOpen);
  const highlightIdx = useMemo(() => highlightedIndices(highlight, ficha.chords), [highlight, ficha.chords]);

  const handleScoreData = useCallback((notes: ScheduledNote[], meta: ScoreMeta) => {
    setScoreData({ notes, meta });
  }, []);

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
    setLoopMeasure(null);
    setIsPlaying(true);
    await play();
  };
  const handlePause = () => {
    pause();
    setIsPlaying(false);
  };
  const handleStop = () => {
    setLoopMeasure(null);
    stop();
    clearSchedule();
    setIsPlaying(false);
  };

  const handleBpmChange = (v: number) => {
    setBpm(v);
    if (isPlaying) {
      setLoopMeasure(null);
      stop();
      setIsPlaying(false);
    }
  };

  const handleScoreLoaded = (musicXml: string, _filename: string) => {
    handleStop();
    setXml(musicXml);
    setScoreData(null);
    setHighlight(null);
    setFocusChord(null);
    setMarkMode(false);
    setSelectedMeasure(null);
    setFocusMeasure(null);
    setSlowFrom(null);
    setScoreVersion((v) => v + 1);
  };

  const openFicha = (f: Omit<FichaFocus, "nonce">) => {
    setFichaFocus({ ...f, nonce: Date.now() });
    setFichaOpen(true);
  };

  const slowTempo = () => {
    const base = slowFrom ?? bpm;
    setSlowFrom(base);
    handleBpmChange(Math.max(40, Math.round(base * 0.6)));
  };

  const restoreTempo = () => {
    if (slowFrom === null) return;
    handleBpmChange(slowFrom);
    setSlowFrom(null);
  };

  const runAction = (kind: StepAction) => {
    switch (kind) {
      case "ficha-tonalidad":
        openFicha({ sections: ["Tonalidad", "Escala", "Acordes de la escala"] });
        break;
      case "tocar-lento":
        setView("tocar");
        slowTempo();
        break;
      case "ficha-escala":
        openFicha({ sections: ["Escala"] });
        break;
      case "estudiar":
        setView("estudiar");
        break;
      case "ficha-circulo":
        openFicha({ sections: ["Círculo"], circleSource: "piece" });
        break;
    }
  };

  const selectMeasure = (m: number) => {
    setSelectedMeasure(m);
    setFocusMeasure({ measure: m, nonce: Date.now() });
  };

  const toggleLoop = async (m: number) => {
    if (loopMeasure === m) {
      handleStop();
      return;
    }
    const span = ficha.meta.measures.find((x) => x.number === m);
    selectMeasure(m);
    if (!span) return; // no timing for this measure: scrolling and highlight still work
    stop();
    clearSchedule();
    setLoopMeasure(m);
    setIsPlaying(true);
    await playRange(span.startSec, span.endSec);
  };

  const clampZoom = (z: number) => Math.max(0.5, Math.min(2.5, Math.round(z * 100) / 100));

  const tocar = view === "tocar";
  const pianoVisible = tocar || showKeyboard;

  return (
    <div
      className={`flex flex-col bg-background font-sans antialiased ${
        tocar ? "h-screen overflow-hidden" : "min-h-screen"
      } ${recorridoOpen ? "sm:pl-[340px]" : ""}`}
    >
      <TopBar
        isPlaying={isPlaying}
        bpm={bpm}
        isolation={isolation}
        zoom={zoom}
        view={view}
        line={line}
        intervals={intervals}
        lineMode={lineMode}
        showKeyboard={showKeyboard}
        fichaOpen={fichaOpen}
        onFichaToggle={() => setFichaOpen((v) => !v)}
        recorridoOpen={recorridoOpen}
        onRecorridoToggle={() => setRecorridoOpen((v) => !v)}
        onPlay={handlePlay}
        onPause={handlePause}
        onStop={handleStop}
        onBpmChange={handleBpmChange}
        onIsolationChange={setIsolationState}
        onZoomChange={(z) => setZoom(clampZoom(z))}
        onViewChange={setView}
        onLineChange={setLine}
        onIntervalsChange={setIntervals}
        onLineModeChange={setLineMode}
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
              lineMode={lineMode}
              isPlaying={isPlaying}
              onNotes={handleNotes}
              onScoreData={handleScoreData}
              chordMarks={ficha.chords}
              showChordMarks={showChordMarks}
              highlightChords={highlightIdx}
              focusChord={focusChord}
              hardMeasures={recorrido.progress.hard}
              markMode={markMode}
              onToggleHardMeasure={recorrido.toggleHard}
              highlightMeasure={selectedMeasure !== null && recorrido.progress.hard.includes(selectedMeasure) ? selectedMeasure : null}
              focusMeasure={focusMeasure}
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
      <FichaPanel
        open={fichaOpen}
        onOpenChange={setFichaOpen}
        ficha={ficha}
        showChordMarks={showChordMarks}
        onShowChordMarksChange={setShowChordMarks}
        highlight={highlight}
        onHighlightChange={setHighlight}
        onFocusChord={(index) => setFocusChord({ index, nonce: Date.now() })}
        focus={fichaFocus}
      />
      <RecorridoPanel
        open={recorridoOpen}
        onOpenChange={setRecorridoOpen}
        recorrido={recorrido}
        keyInfo={ficha.key}
        bpm={bpm}
        slowFrom={slowFrom}
        markMode={markMode}
        onMarkModeChange={setMarkMode}
        selectedMeasure={selectedMeasure}
        onSelectMeasure={selectMeasure}
        loopMeasure={loopMeasure}
        onToggleLoop={(m) => void toggleLoop(m)}
        onRunAction={runAction}
        onRestoreTempo={restoreTempo}
      />
    </div>
  );
}
