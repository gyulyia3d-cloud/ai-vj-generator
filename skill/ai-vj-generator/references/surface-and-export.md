# Surface tab, export manifest and flash safety

## Surface tab (`app/surface.js`, `app/surface-ui.js`)

| Feature | What it does | Verified how |
|---|---|---|
| Surface presets | 12 presets (LED wall in L 4500x800, ultrawide, strip, tower, stage 16:9, three screens, projection, facade, 16:9, 4K, vertical, square) set canvas, target, folds, pixel map, LED pitch and viewing distance in `meta.spec.confirmed` | `surface_check.mjs` |
| Cuts | folds are cut by number (`canvas.folds`), removed by clicking the chip | `surface_check.mjs` |
| Imported regions | CSV (`name,x,y,w,h` in canvas pixels, name optional, header and `#` lines ignored) or a PNG mask (anything not black is active; connected components become rectangles; the image is stretched to the canvas). Input only: the regions are stored in `canvas.displays` and drawn in the view. The engine never writes a pixel map | `surface_check.mjs` |
| Region export | the Export tab renders the full project or one region (display) as PNG sequence or MP4; the manifest records the region | `export_check.mjs`, `mp4_check.mjs` |
| Legibility | the smallest text level and the thinnest stroke of every layer against the minimum letter height and line weight for the pitch and the farthest distance (`SC.legibility`) | `surface_check.mjs`, with a control that passes |

Not implemented: dragging regions in the view. Out of scope: any mapping or output file (the surface is input and constraint).

## Export manifest (`MANIFEST.json`)

Written at the root of the (last) ZIP.

```json
{
  "schema": "ai-vj-generator/export-manifest/1", "engine": "2.5.0", "createdAt": "ISO date",
  "project": { "name": "", "id": "", "seed": 0, "sha256": "64 hex of the project JSON as exported", "bpm": 0, "bars": 0, "loop": true, "seamless": true, "loopFrames": 0 },
  "canvas": { "w": 0, "h": 0, "fps": 0, "target": "led", "folds": [] },
  "export": { "mode": "comp|rgb|layers|single", "region": "full | { name, index, x, y, w, h }", "alpha": true, "whiteAlpha": false, "scale": 1, "size": [0, 0], "start": 0, "end": 0, "frames": 0, "compositions": [], "prefix": "", "files": 0, "naming": "text", "partMB": 0 },
  "flash": { "criterion": "WCAG 2.3.1 general flash ...", "limiter": false, "perComposition": [{ "composition": "", "flashesPerSecondWorst": 0, "pass": true, "atFrame": 0, "limited": false, "after": { "flashesPerSecondWorst": 0, "pass": true }, "maxSwing": 0.08 }] },
  "parts": [{ "file": "", "bytes": 0, "files": 0 }]
}
```

The hash is computed before the export changes fps or bars, so it identifies the project the person saw. Names are predictable: `PROJECT/ALPHA/NN_COMPOSITION/NN_COMPOSITION_000000.png` (six digit frame number from the first exported frame; `COMPOSITIONS/` for RGB, `LAYERS/` for per layer).

**Parts.** With a limit (250 MB to 2 GB) the in-memory ZIP is written and restarted when it passes the limit, at a frame boundary. Parts are named `..._p01.zip`, `_p02`, and contain different frames; extract them all in the same folder. Only the last part has the manifest, `project.json` and the README.

## Flash safety (`app/flash.js`)

- **Analysis.** The loop (treated as cyclic) is rendered at low resolution, the mean relative luminance of each frame is taken (sRGB to linear, Rec. 709 weights, composited over black), swings of 0.1 or more are found with a zig-zag filter, swing pairs that stay above 0.8 luminance are exempt, and the worst one-second window is counted. More than 3 flashes in a second fails (WCAG 2.3.1 general flash).
- **Limiter.** Only for the compositions that fail, only inside the failing one-second windows (plus half a second of ramp each side). No frame may exceed the darkest frame within half a second on either side by more than 0.08, which keeps the swing under the 0.1 that counts as a flash. It only dims (gain at most 1): valleys and slow fades are not touched. The dimming is applied in sRGB with a gamma 2.2 conversion and leaves the alpha channel alone.
- **Measured both ways.** `export_check.mjs` exports a strobe project with and without the limiter, reads the written PNG files back and runs the analysis on them: 8 flashes per second without the limiter, 0 with it. A calm project goes through untouched.
- **Limits, honestly.** Saturated red flashes are not measured; the area of the flashing region is not weighted (the whole-frame mean is used, which misses a small bright flash that covers a few percent of the frame); per-layer exports are not limited; live playback is not limited. This is an aid, not a certification: for audiences with photosensitive epilepsy use a certified analyser (Harding/PEAT) on the final render.

## Everything the phase 3 tests prove

`genai_check` (browser generator equals the Python one for 28 briefs), `surface_check`, `export_check`, `audio_check`, `mod_ui_check`, `ux_check`, and `phase3_acceptance.mjs`, which walks the whole path of someone without Claude: open the engine, Generate without AI, fill the 4500x800 brief, evaluate, check the surface and legibility, tie the kick to a parameter, test flashes and export a sample, then open the ZIP.
