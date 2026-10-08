# ISF generators

ISF (Interactive Shader Format) is a GLSL fragment shader with a JSON header. The engine uses it as a source of ready generators and as an import format. It does not export ISF. Licence rule: an ISF file keeps its author; the importer copies `CREDIT` into the layer `role`. Do not redistribute third-party ISF files inside this skill.

## The `isf` layer (engine 3.1+)

`isf` is a layer type. Its parameter `lib` is a menu with the 84 generators of `isf-library/` (11 originals, 28 MIT, 45 CC0; credit, licence and source of each in `manifest.json` and `isf-library/README.md`). The project JSON stores only the id:

```json
{ "type": "isf", "name": "AURORA", "p": { "lib": "aivj-aurora", "p1": -1, "p2": -1, "p3": -1, "p4": -1, "alphaMode": "opaque" } }
```

- `p1..p4` drive the shader's first four `float` inputs, from 0 to 1 across the input's MIN..MAX range. `-1` keeps the ISF default.
- Colours `c1`, `c2`, `cbg` connect to the project palette. The layer reacts to audio like any shader layer.
- The conversion depends only on the ISF file, the loop bars and the BPM, so the frame stays a pure function of the project.
- The **ISF** tab lists the library with search and filters; **Adicionar à composição** inserts an `isf` layer.

## Import: ISF file → shader layer

```bash
python scripts/isf.py check  generator.fs      # importable? says why not
python scripts/isf.py import generator.fs --project p.aivj.json --comp 0 --bars 4 --bpm 124
```

The ISF tab does the same in the browser (**Importar arquivo .fs**) and the result is identical, tested on all 84 shaders. The result is a `shader` layer whose `src` holds the converted code.

Supported: single-pass **generators** (no `inputImage`, no `audio`/`audioFFT`, no `PASSES`, no `IMG_*` calls). The first four `float` inputs become `p1..p4` (defaults kept; use `layer.mod` to play them), the first two `color` inputs become `c1`/`c2`, other inputs are fixed at their defaults. `TIME` becomes loop phase × loop seconds (it only loops if the shader's own period divides the loop: check with `loop_check.mjs`). An audio hook (`uBass/uMid/uHigh/uHit` brighten the output) is appended because every shader layer reads audio.

Known limits (measured on a 326-file ISF collection: 35 importable, 30 of those compile as-is): filters and multi-pass files are refused; some files use GLSL ES 3 features (array constructors, dynamic indexing, int/float mixing) that the current renderer rejects: fix the line the engine reports.

How the importer maps inputs:
- inputs named like the engine's own (`phase loopBars bpm bass mid high rms hit midhit highhit pres`, colours `c1 c2 cbg`) connect straight to the engine, so the 11 originals keep their audio and loop;
- the first four other `float` inputs become `p1..p4`, the first two other colours `c1/c2`;
- names the engine already declares (`hash noise fbm uPulse …`) are renamed `isf_<name>` so GLSL does not reject the redefinition; `float TAU = …` and `#define TAU` are dropped (the engine defines it).

Loop: third-party shaders use `TIME`; they close the loop only if their period divides the loop length. The 11 originals use `phase` and close it exactly.

Tests: `node scripts/isf_check.mjs`, `node scripts/isf_ui_check.mjs`.

For the briefing: when the concept names a generator-like look (tunnel, plasma, voronoi, aurora, LED ripples), start from the matching library shader and adapt it, or write a new one with the same inputs; do not paste unlicensed ISF into the project.
