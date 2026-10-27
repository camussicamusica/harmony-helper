import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  useFicha,
  type ChordHighlight,
  type ScoreData,
} from "@/lib/music/analysis/useFicha";
import { useOccurrenceCursor } from "@/lib/music/analysis/useOccurrenceCursor";
import type { ChordOccurrence } from "@/lib/music/analysis/occurrences";
import { useDegradeLayer, usePatternLayer } from "@/lib/music/analysis/usePatternLayer";
import type { ScoreMeta } from "@/lib/music/analysis/scoreMeta";
import { SAMPLE_MUSICXML } from "@/lib/music/sampleScore";
import {
  clearSchedule,
  loadNotes,
  pause,
  play,
  playRange,
  requestRetempo,
  setIsolation,
  stop,
} from "@/lib/music/scheduler";
import {
  DEFAULT_STUDY_BPM,
  baseTempo,
  clampBpm,
  loadSavedTempo,
  parseWrittenTempo,
  resolveInitialBpm,
  saveTempo,
  stepBpm,
} from "@/lib/music/tempo";
import { useUiPrefs } from "@/lib/ui/uiPrefs";
import { useAlwaysLabels, useLineMode } from "@/lib/music/lineMode";
import { applyInterfaceVars } from "@/lib/colors/store";
import type { IsolationMode, ScheduledNote, ScoreView as ViewMode } from "@/lib/music/types";

const VIEW_KEY = "hh.view.v1";
/** Last opened score (raw MusicXML + filename), so a reload or a dev-server refresh does not drop it. */
const LAST_SCORE_KEY = "hh.lastScore.v1";
/** Skip saving above this many characters (localStorage holds ~5 MB). */
const LAST_SCORE_MAX_CHARS = 2_000_000;

function saveLastScore(xml: string, filename: string) {
  try {
    if (xml.length > LAST_SCORE_MAX_CHARS) {
      localStorage.removeItem(LAST_SCORE_KEY);
      return;
    }
    localStorage.setItem(LAST_SCORE_KEY, JSON.stringify({ xml, filename }));
  } catch {
    /* quota or blocked storage: the score just is not remembered */
  }
}

function loadLastScore(): { xml: string; filename: string } | null {
  try {
    const o = JSON.parse(localStorage.getItem(LAST_SCORE_KEY) ?? "null");
    if (o && typeof o.xml === "string" && o.xml.length > 0) return { xml: o.xml, filename: String(o.filename ?? "") };
  } catch {
    /* ignore */
  }
  return null;
}

export function ReaderPage() {
  const [xml, setXml] = useState<string>(SAMPLE_MUSICXML);
  /** `bpm` is the tempo the music runs at; `shownBpm` follows the controls at once (the slider is debounced). */
  const [bpm, setBpm] = useState(DEFAULT_STUDY_BPM);
  const [shownBpm, setShownBpm] = useState(DEFAULT_STUDY_BPM);
  const bpmRef = useRef(DEFAULT_STUDY_BPM);
  const shownBpmRef = useRef(DEFAULT_STUDY_BPM);
  const bpmTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isolation, setIsolationState] = useState<IsolationMode>("both");
  const [isPlaying, setIsPlaying] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [line, setLine] = useState(false);
  const [intervals, setIntervals] = useAlwaysLabels();
  const [lineMode, setLineMode] = useLineMode();
  const [view, setViewState] = useState<ViewMode>("tocar");
  const [viewReady, setViewReady] = useState(false);
  const ui = useUiPrefs();
  const uiRef = useRef(ui);
  uiRef.current = ui;
  const [scoreVersion, setScoreVersion] = useState(0);

  const [fichaOpen, setFichaOpen] = useState(false);
  const [scoreData, setScoreData] = useState<ScoreData | null>(null);
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
  const writtenTempo = useMemo(() => parseWrittenTempo(xml), [xml]);
  const scoreBpm = baseTempo(writtenTempo);
  const scoreHashRef = useRef(scoreHash);
  scoreHashRef.current = scoreHash;
  const recorrido = useRecorrido(scoreHash);
  const ficha = useFicha(xml, scoreData, bpm, fichaOpen || recorridoOpen);
  const patternLayer = usePatternLayer(scoreHash, scoreData);
  const degradeLayer = useDegradeLayer();
  const [degradeCap, setDegradeCap] = useState(1);
  const patternView = useMemo(
    () =>
      patternLayer.options.on && patternLayer.patterns.length && patternLayer.colors.size
        ? {
            patterns: patternLayer.patterns,
            colors: patternLayer.colors,
            letters: patternLayer.letters,
            scope: patternLayer.options.scope,
            intensity: patternLayer.options.intensity,
          }
        : null,
    [patternLayer.options.on, patternLayer.options.scope, patternLayer.options.intensity, patternLayer.patterns, patternLayer.colors, patternLayer.letters],
  );
  const degradeView = useMemo(
    () => (degradeLayer.options.on ? { intensity: degradeLayer.options.intensity } : null),
    [degradeLayer.options.on, degradeLayer.options.intensity],
  );
  const cursor = useOccurrenceCursor(
    ficha.chords,
    useCallback((occ: ChordOccurrence) => setFocusChord({ index: occ.index, nonce: Date.now() }), []),
  );
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
    const last = loadLastScore();
    const startXml = last?.xml ?? xml;
    if (last) setXml(last.xml);
    setViewReady(true);
    try {
      const start = resolveInitialBpm(loadSavedTempo(localStorage, hashText(startXml)), parseWrittenTempo(startXml));
      applyTempoNow(start);
      setShownBpm(start);
    } catch {
      /* ignore */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  /** Make the music run at `v`. If it is playing, it keeps its place in the piece (see requestRetempo). */
  const applyTempoNow = (v: number) => {
    const next = clampBpm(v);
    const prev = bpmRef.current;
    if (next === prev) return;
    requestRetempo(prev / next);
    bpmRef.current = next;
    setBpm(next);
  };

  /** Tempo from the controls. The label moves at once and the choice is saved; the slider waits 150 ms before re-timing. */
  const handleBpmChange = (v: number, source: "slider" | "other" = "other") => {
    const next = clampBpm(v);
    shownBpmRef.current = next;
    setShownBpm(next);
    try {
      saveTempo(localStorage, scoreHashRef.current, next);
    } catch {
      /* ignore */
    }
    if (bpmTimer.current) clearTimeout(bpmTimer.current);
    bpmTimer.current = null;
    if (source === "slider") {
      bpmTimer.current = setTimeout(() => {
        bpmTimer.current = null;
        applyTempoNow(next);
      }, 150);
    } else {
      applyTempoNow(next);
    }
  };

  // Keys "-" and "+" / "=" change the tempo, unless she is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const dir = e.key === "+" || e.key === "=" ? 1 : e.key === "-" || e.key === "_" ? -1 : 0;
      if (!dir) return;
      e.preventDefault();
      handleBpmChange(stepBpm(shownBpmRef.current, dir), "other");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keys "m" (top menu) and "p" (piano) show/hide them, unless she is typing somewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || e.repeat) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))) return;
      const k = e.key.toLowerCase();
      if (k === "m") {
        e.preventDefault();
        uiRef.current.toggleMenu();
      } else if (k === "p") {
        e.preventDefault();
        uiRef.current.togglePiano();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const handleScoreLoaded = (musicXml: string, filename: string) => {
    saveLastScore(musicXml, filename);
    handleStop();
    if (bpmTimer.current) clearTimeout(bpmTimer.current);
    bpmTimer.current = null;
    bpmRef.current = -1; // new score: take its tempo without trying to keep a playing position
    let start = DEFAULT_STUDY_BPM;
    try {
      start = resolveInitialBpm(loadSavedTempo(localStorage, hashText(musicXml)), parseWrittenTempo(musicXml));
    } catch {
      start = resolveInitialBpm(null, parseWrittenTempo(musicXml));
    }
    applyTempoNow(start);
    setShownBpm(start);
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
    const base = slowFrom ?? shownBpmRef.current;
    setSlowFrom(base);
    handleBpmChange(Math.round(base * 0.6));
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

  return (
    <div
      className={`flex flex-col bg-background font-sans antialiased ${
        tocar ? "h-screen overflow-hidden" : "min-h-screen"
      } ${recorridoOpen ? "sm:pl-[340px]" : ""}`}
    >
      <TopBar
        isPlaying={isPlaying}
        bpm={shownBpm}
        scoreBpm={scoreBpm}
        hasWrittenTempo={writtenTempo !== null}
        isolation={isolation}
        zoom={zoom}
        view={view}
        line={line}
        intervals={intervals}
        lineMode={lineMode}
        menuOpen={ui.menuOpen}
        animate={ui.animate}
        onMenuToggle={ui.toggleMenu}
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
        onScoreLoaded={handleScoreLoaded}
        patternLayer={patternLayer}
        degradeLayer={degradeLayer}
        degradeCap={degradeCap}
        scoreReady={scoreData !== null}
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
              occurrenceMark={cursor.current ? cursor.current.index : null}
              highlightChords={highlightIdx}
              focusChord={focusChord}
              hardMeasures={recorrido.progress.hard}
              markMode={markMode}
              onToggleHardMeasure={recorrido.toggleHard}
              highlightMeasure={selectedMeasure !== null && recorrido.progress.hard.includes(selectedMeasure) ? selectedMeasure : null}
              focusMeasure={focusMeasure}
              patternLayer={patternView}
              degradeLayer={degradeView}
              onDegradeCap={setDegradeCap}
              hoverKey={ficha.key}
            />
          )}
        </section>
        <section className={`shrink-0 bg-background ${tocar ? "" : "sticky bottom-0 z-20 border-t border-border"}`}>
          <PianoView
            isolation={isolation}
            open={ui.pianoOpen}
            animate={ui.animate}
            onToggle={ui.togglePiano}
          />
        </section>
      </main>
      <FichaPanel
        open={fichaOpen}
        onOpenChange={setFichaOpen}
        ficha={ficha}
        cursor={cursor}
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
        bpm={shownBpm}
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
