import { beforeEach, describe, expect, test } from "bun:test";
import { getSnapshot, handleBytes, subscribe, type MidiNoteEvent } from "../src/lib/midi/input";

const ON = 0x90, OFF = 0x80, CC = 0xb0;
let t = 0;
const send = (status: number, d1: number, d2: number) => handleBytes([status, d1, d2], ++t);
const pressed = () => [...getSnapshot().pressed].sort((a, b) => a - b);

let events: MidiNoteEvent[] = [];
subscribe((e) => events.push(e));

beforeEach(() => {
  send(CC, 64, 0); // pedal up
  send(CC, 123, 0); // all notes off
  events = [];
});

describe("MIDI messages from the keyboard", () => {
  test("note-on adds the key and remembers the last note", () => {
    send(ON, 60, 100);
    expect(pressed()).toEqual([60]);
    expect(getSnapshot().lastNote).toMatchObject({ midi: 60, velocity: 100 });
    expect(events).toMatchObject([{ type: "on", midi: 60, velocity: 100 }]);
  });

  test("note-off removes the key (but lastNote stays for the readout)", () => {
    send(ON, 60, 100);
    send(OFF, 60, 0);
    expect(pressed()).toEqual([]);
    expect(getSnapshot().lastNote?.midi).toBe(60);
    expect(events.map((e) => e.type)).toEqual(["on", "off"]);
  });

  test("note-on with velocity 0 counts as note-off", () => {
    send(ON, 64, 90);
    send(ON, 64, 0);
    expect(pressed()).toEqual([]);
    expect(events.map((e) => e.type)).toEqual(["on", "off"]);
    expect(events[1].velocity).toBe(0);
  });

  test("a chord: three keys held together", () => {
    send(ON, 60, 80);
    send(ON, 64, 80);
    send(ON, 67, 80);
    expect(pressed()).toEqual([60, 64, 67]);
    send(OFF, 64, 0);
    expect(pressed()).toEqual([60, 67]);
  });

  test("works on any channel", () => {
    send(ON | 5, 72, 70);
    expect(pressed()).toEqual([72]);
    send(OFF | 5, 72, 0);
    expect(pressed()).toEqual([]);
  });

  test("all-notes-off (CC 123) clears everything", () => {
    send(ON, 60, 80);
    send(ON, 62, 80);
    send(CC, 123, 0);
    expect(pressed()).toEqual([]);
  });
});

describe("sustain pedal (CC 64)", () => {
  test("the pedal goes down at 64 or more and up below it", () => {
    send(CC, 64, 127);
    expect(getSnapshot().sustain).toBe(true);
    send(CC, 64, 63);
    expect(getSnapshot().sustain).toBe(false);
    send(CC, 64, 64);
    expect(getSnapshot().sustain).toBe(true);
  });

  test("released keys keep sounding while the pedal is down, and stop when it comes up", () => {
    send(CC, 64, 127);
    send(ON, 60, 80);
    send(ON, 64, 80);
    send(OFF, 60, 0);
    send(OFF, 64, 0);
    expect(pressed()).toEqual([60, 64]);
    send(CC, 64, 0);
    expect(pressed()).toEqual([]);
  });

  test("a key still held when the pedal comes up keeps sounding", () => {
    send(CC, 64, 127);
    send(ON, 60, 80);
    send(ON, 64, 80);
    send(OFF, 60, 0);
    send(CC, 64, 0);
    expect(pressed()).toEqual([64]);
  });

  test("the physical key-off event is still emitted under the pedal", () => {
    send(CC, 64, 127);
    send(ON, 60, 80);
    send(OFF, 60, 0);
    expect(events.map((e) => e.type)).toEqual(["on", "off"]);
    expect(pressed()).toEqual([60]);
  });

  test("other controllers do not touch the pedal", () => {
    send(CC, 7, 127); // volume
    expect(getSnapshot().sustain).toBe(false);
  });
});

describe("store", () => {
  test("a new Set is published on every change (so the screen re-renders)", () => {
    const before = getSnapshot().pressed;
    send(ON, 60, 80);
    expect(getSnapshot().pressed).not.toBe(before);
  });
});
