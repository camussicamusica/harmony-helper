## Goal

Eliminate the silent crash where uploading a PDF completes the mock OMR but the score panel never updates. Apply four targeted fixes.

## 1. Safe OSMD import in `src/components/reader/ScoreView.tsx`

The runtime log shows `Named export 'OpenSheetMusicDisplay' not found … is a CommonJS module`. Replace the static named import with a CJS/ESM-tolerant default+named shim:

```ts
import * as OSMDModule from "opensheetmusicdisplay";
const OpenSheetMusicDisplay =
  (OSMDModule as any).OpenSheetMusicDisplay ??
  (OSMDModule as any).default?.OpenSheetMusicDisplay ??
  (OSMDModule as any).default;
```

This resolves the constructor whether the bundle exposes it as a named export, on `default`, or as the default itself. Keeps it synchronous (no behavioral change) and removes the SSR hydration crash.

## 2. Sanitize the mock MusicXML in `src/lib/music/mockScale.ts`

Tighten the document so OSMD never rejects it:

- Add `<identification><creator type="composer">Mock OMR</creator><encoding><software>Lovable</software></encoding></identification>`.
- Add `<part-list>`'s `<score-instrument>` and `<score-part>` with `<part-name>Piano</part-name>` + `<part-abbreviation>Pno.</part-abbreviation>`.
- Inside `<attributes>` of measure 1, ensure `<staves>2</staves>` is present (already is) and assign each voice to its staff explicitly through the existing `<staff>` tags (already correct).
- Remove the `<!DOCTYPE …>` declaration — OSMD's XML parser occasionally trips on the external DTD reference in worker bundles; the working `sampleScore.ts` keeps it, but for the mock we want a minimal, parser-clean string.
- Double-check duration math: 4/4 with `divisions=4` → 16 per measure. RH voice 1: 4 quarters = 16. LH voice 2: 2 halves = 16. OK.

## 3. Harden cleanup in `ScoreView.tsx` and `scheduler.ts`

`ScoreView` remount sequence: handleStop → clearSchedule → setXml → key bump → old ScoreView unmount cleanup → new ScoreView mount + OSMD init. Any throw in the chain stops the new render.

- In `ScoreView`'s unmount cleanup, wrap `cleanupRef.current.forEach(fn => fn())` and `container.innerHTML = ""` in try/catch, and null-check `containerRef.current`.
- In `scheduler.ts`:
  - `markPlaying`: guard each `el.classList` access with `if (el && el.isConnected)`.
  - `clearScoreHighlights`: wrap the `document.querySelectorAll` loop in try/catch (no-op on SSR where `document` is undefined — add `typeof document !== "undefined"` guard).
  - `clearSchedule`: try/catch around `Tone.getTransport().clear(id)` (Tone can throw if the transport was disposed).
  - `stop`: same guard around transport calls.
- In `Tone.getDraw().schedule(...)` callbacks inside `play()`, check `note.svgEls?.every(el => el.isConnected)` before applying classes so a remounted score's stale references don't throw.

## 4. Visible error fallback for OSMD failures

In `ScoreView.tsx`:

- Add local state `const [renderError, setRenderError] = useState<string | null>(null)`.
- Wrap `osmd.load(xml)` and the subsequent `osmd.render()` + `wireAfterRender(...)` in a single try/catch (already partially there via `.catch`). On error: `console.error`, `setRenderError("Failed to render sheet music — the file could not be parsed.")`.
- Also wrap the zoom-effect's `osmd.render()` in try/catch with the same fallback.
- Render: when `renderError`, show a centered card inside the score container with the message, an italic subtitle ("Try re-uploading or use a different file."), and a Retry button that clears the error and bumps an internal `reloadNonce` to re-trigger the load effect.

## Validation

After applying:

1. Reload preview, confirm the sample Bach excerpt still renders (regression check).
2. Drop the same Gymnopedie PDF — after ~3s the score panel should swap to the C-major scale.
3. In DevTools console, confirm no `OpenSheetMusicDisplay not found` SSR error and no uncaught exceptions during the swap.
4. Temporarily corrupt the mock XML (e.g. delete `</part>`) and verify the user-facing "Failed to render sheet music" fallback appears with a working Retry button. Revert.

## Files touched

- `src/components/reader/ScoreView.tsx` — safe import, error state UI, try/catch around load/render, hardened cleanup.
- `src/lib/music/mockScale.ts` — add `<identification>`, instrument metadata, drop DOCTYPE.
- `src/lib/music/scheduler.ts` — guards in `markPlaying`, `clearScoreHighlights`, `clearSchedule`, `stop`, and the `Tone.getDraw` callbacks.

No changes to `ReaderPage.tsx`, `UploadZone.tsx`, or `omrService.ts` — the upload pipeline itself is working (replay confirms all 4 mock stages fire); the failure is purely on the OSMD-render side of the handoff.
