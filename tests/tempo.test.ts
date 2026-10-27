import { describe, expect, test } from "bun:test";
import {
  DEFAULT_STUDY_BPM, activePercent, baseTempo, bpmForPercent, clampBpm, loadSavedTempo, parseWrittenTempo,
  rescaleSeconds, resolveInitialBpm, saveTempo, stepBpm, toQuarterBpm,
} from "../src/lib/music/tempo";
import { SAMPLE_MUSICXML } from "../src/lib/music/sampleScore";

const metro = (unit: string, per: string, dots = "") =>
  `<direction><direction-type><metronome><beat-unit>${unit}</beat-unit>${dots}<per-minute>${per}</per-minute></metronome></direction-type></direction>`;

describe("tempo: clamp and step", () => {
  test("clamps to 20..220", () => {
    expect(clampBpm(5)).toBe(20);
    expect(clampBpm(999)).toBe(220);
    expect(clampBpm(71.6)).toBe(72);
    expect(clampBpm(NaN)).toBe(DEFAULT_STUDY_BPM);
  });
  test("step is 5, Shift is 1, and stays in range", () => {
    expect(stepBpm(72, 1)).toBe(77);
    expect(stepBpm(72, -1)).toBe(67);
    expect(stepBpm(72, 1, true)).toBe(73);
    expect(stepBpm(72, -1, true)).toBe(71);
    expect(stepBpm(22, -1)).toBe(20);
    expect(stepBpm(218, 1)).toBe(220);
  });
});

describe("tempo: written tempo in MusicXML", () => {
  test("<sound tempo> is already quarters per minute", () => {
    expect(parseWrittenTempo(`<measure><sound tempo="66"/></measure>`)).toBe(66);
    expect(parseWrittenTempo(`<sound dynamics="80" tempo="63.5"/>`)).toBe(64);
  });
  test("metronome quarter", () => expect(parseWrittenTempo(metro("quarter", "72"))).toBe(72));
  test("metronome half = 60 is 120 quarters", () => expect(parseWrittenTempo(metro("half", "60"))).toBe(120));
  test("metronome dotted half = 40 is 120 quarters", () =>
    expect(parseWrittenTempo(metro("half", "40", "<beat-unit-dot/>"))).toBe(120));
  test("metronome dotted quarter = 60 is 90 quarters", () =>
    expect(parseWrittenTempo(metro("quarter", "60", "<beat-unit-dot/>"))).toBe(90));
  test("metronome eighth = 144 is 72 quarters", () => expect(parseWrittenTempo(metro("eighth", "144"))).toBe(72));
  test("first one in the file wins", () => {
    expect(parseWrittenTempo(metro("quarter", "50") + `<sound tempo="99"/>`)).toBe(50);
    expect(parseWrittenTempo(`<sound tempo="99"/>` + metro("quarter", "50"))).toBe(99);
  });
  test("a metronome without per-minute is skipped", () => {
    const odd = `<metronome><beat-unit>quarter</beat-unit><beat-unit>half</beat-unit></metronome>`;
    expect(parseWrittenTempo(odd + `<sound tempo="80"/>`)).toBe(80);
  });
  test("no tempo gives null (bundled sample has none)", () => {
    expect(parseWrittenTempo("<score-partwise></score-partwise>")).toBeNull();
    expect(parseWrittenTempo(SAMPLE_MUSICXML)).toBeNull();
  });
  test("toQuarterBpm rejects unknown units", () => expect(toQuarterBpm("zzz", 0, 60)).toBeNull());
});

describe("tempo: percent buttons are relative to the score", () => {
  test("base falls back to 72", () => {
    expect(baseTempo(null)).toBe(72);
    expect(baseTempo(60)).toBe(60);
  });
  test("50/75/100 of 72", () => {
    expect(bpmForPercent(72, 50)).toBe(36);
    expect(bpmForPercent(72, 75)).toBe(54);
    expect(bpmForPercent(72, 100)).toBe(72);
  });
  test("active percent", () => {
    expect(activePercent(54, 72)).toBe(75);
    expect(activePercent(72, 72)).toBe(100);
    expect(activePercent(55, 72)).toBeNull();
  });
  test("never goes below 20", () => expect(bpmForPercent(30, 50)).toBe(20));
});

describe("tempo: initial value and saving", () => {
  test("saved wins, then written, then 72", () => {
    expect(resolveInitialBpm(50, 66)).toBe(50);
    expect(resolveInitialBpm(null, 66)).toBe(66);
    expect(resolveInitialBpm(null, null)).toBe(72);
  });
  test("save and load per score hash", () => {
    const mem: Record<string, string> = {};
    const store = { getItem: (k: string) => mem[k] ?? null, setItem: (k: string, v: string) => void (mem[k] = v) };
    expect(loadSavedTempo(store, "aaa")).toBeNull();
    saveTempo(store, "aaa", 55);
    saveTempo(store, "bbb", 300);
    expect(loadSavedTempo(store, "aaa")).toBe(55);
    expect(loadSavedTempo(store, "bbb")).toBe(220);
    expect(loadSavedTempo(store, "ccc")).toBeNull();
  });
  test("corrupt storage is ignored", () => {
    const store = { getItem: () => "{not json", setItem: () => {} };
    expect(loadSavedTempo(store, "aaa")).toBeNull();
  });
});

describe("tempo: changing it while playing keeps the musical position", () => {
  test("12 s at 60 bpm is 6 s at 120 bpm", () => expect(rescaleSeconds(12, 60, 120)).toBe(6));
  test("slower stretches time", () => expect(rescaleSeconds(6, 120, 60)).toBe(12));
  test("same position in whole notes", () => {
    const whole = (sec: number, bpm: number) => sec / ((60 / bpm) * 4);
    expect(whole(rescaleSeconds(9.3, 72, 54), 54)).toBeCloseTo(whole(9.3, 72), 10);
  });
});
