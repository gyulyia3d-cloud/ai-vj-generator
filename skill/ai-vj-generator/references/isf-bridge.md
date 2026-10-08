# ISF bridge (Resolume, Wire, VDMX, MadMapper)

ISF (Interactive Shader Format) is a GLSL fragment shader with a JSON header. Resolume Arena/Wire and most VJ hosts load it natively. `scripts/isf.py` moves shaders both ways. Licence rule: an ISF collection or file keeps its author; the importer copies `CREDIT` into the layer `role`. Do not redistribute third-party ISF files inside this skill.

## Export: project shader → `.fs`

```bash
python scripts/isf.py export project.aivj.json --out isf-out          # all compositions
python scripts/isf.py export project.aivj.json --comp 2 --out isf-out # one composition
```

One `.fs` per `shader` layer (custom `src` or preset). Copy to the host's ISF folder (Resolume: `Documents/Resolume Arena/ISF`, then refresh). Inputs created:

| ISF input | Meaning |
|---|---|
| `phase` | loop phase 0→1. **Automate it** (linear envelope over the loop, or BPM sync) so the loop closes like in the engine. Without it the shader is frozen. |
| `loopBars`, `bpm` | loop length and tempo (the engine's BPM waves and beat pulses derive from them) |
| `p1..p4` | the layer's four parameters |
| `c1`, `c2`, `cbg` | colours (initialised from the project palette) |
| `bass mid high rms hit midhit highhit pres` | audio, 0–1.5. Map them in the host (Resolume: audio FFT/parameter linking, or Wire). ISF has no standard BPM clock or band split, so these are plain floats. |

Differences to know: integrated time (`uBassT`…) becomes `phase*loopBars` in the host (periodic, no audio acceleration); `uSeed` is baked in. The output keeps alpha (`outc`), so blend the clip with Add/Screen in the host for light-on-black.

## Import: ISF generator → shader layer

```bash
python scripts/isf.py check  generator.fs      # importable? says why not
python scripts/isf.py import generator.fs --project p.aivj.json --comp 0 --bars 4 --bpm 124
```

Supported: single-pass **generators** (no `inputImage`, no `audio`/`audioFFT`, no `PASSES`, no `IMG_*` calls). The first four `float` inputs become `p1..p4` (defaults kept; use `layer.mod` to play them), the first two `color` inputs become `c1`/`c2`, other inputs are fixed at their defaults. `TIME` becomes loop phase × loop seconds (it only loops if the shader's own period divides the loop: check with `loop_check.mjs`). An audio hook (`uBass/uMid/uHigh/uHit` brighten the output) is appended because every shader must react to audio; replace it with a real mapping when you finish the layer.

Known limits (measured on a 326-file ISF collection: 35 importable, 30 of those compile as-is): filters and multi-pass files are refused; some files use GLSL ES 3 features (array constructors, dynamic indexing, int/float mixing) that WebGL 1 rejects: fix the line the engine reports. Multi-pass ISF (`PERSISTENT` buffers) waits for the `sim` layer.

Test: `node scripts/isf_check.mjs`.

## Library and the ISF tab (engine 2.6+)

The **ISF** tab of the engine holds `isf-library/` (84 generators: 11 originals, 28 MIT, 45 CC0; credit, licence and source of each in `manifest.json` and `isf-library/README.md`). **Add to composition** converts the shader with the loop length and BPM of the project and inserts a `shader` layer whose `role` carries author and licence. **Import .fs file** converts any single-pass generator you have; filters, multipass and audio textures are refused with the reason. **Export** writes the project's shader layers as `.fs` with a `phase` input.

How the importer maps inputs (browser and `isf.py` give the same shader, tested on all 84):
- inputs named like the engine's own (`phase loopBars bpm bass mid high rms hit midhit highhit pres`, colours `c1 c2 cbg`) connect straight to the engine, so a shader written for Resolume with those names (the originals, or an export) imports without losing its audio or loop;
- the first four other `float` inputs become `p1..p4`, the first two other colours `c1/c2`;
- names the engine already declares (`hash noise fbm uPulse …`) are renamed `isf_<name>` so GLSL does not reject the redefinition; `float TAU = …` and `#define TAU` are dropped (the engine defines it).

Loop: third-party shaders use `TIME`; they close the loop only if their period divides the loop length. The 11 originals use `phase` and close it exactly. Check with `loop_check.mjs`.

For the briefing: when the concept names a generator-like look (tunnel, plasma, voronoi, aurora, LED ripples), start from the matching original and adapt it, or write a new one with the same inputs; do not paste unlicensed ISF into the project.
