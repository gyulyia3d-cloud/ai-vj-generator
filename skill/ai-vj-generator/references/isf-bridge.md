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
