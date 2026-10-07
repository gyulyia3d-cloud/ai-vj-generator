# Audio bus and BPM

## What the engine provides

One shared audio source feeds every layer: microphone, line input or an audio file (Web Audio `AnalyserNode`, FFT 2048). The engine exposes smoothed bands **bass, mid, high** and **rms**, plus a beat flag. Per layer, `p.audio` (0…1 response) and `p.band` (`bass` / `mid` / `high` / `rms`) choose what that layer listens to. Project-level: `audio.reactive` (on/off), `audio.sens`, `audio.smooth`.

## The shader rule (non-negotiable)

**Every shader layer is audio-reactive.** This holds for presets and for custom GLSL:

- The engine forces a response of at least 0.35 on every `shader` layer (default 0.8, band `bass`), so a shader can never be silent.
- Shaders receive `uBass uMid uHigh uRms uHit` plus `uAud` (the layer's chosen band). With a source connected they carry the music; without one they carry **deterministic synthetic bands locked to the BPM**, so the shader reacts in the preview, in the PNG export and in the recording of the loop. `audio.reactive` defaults to true.
- A custom shader must read at least one of those uniforms and give each band a role (see `glsl-recipes.md`). `validate_project.py` raises an ERROR for a shader whose `src` ignores all of them, and for a shader layer with `p.audio` explicitly set to 0.
- Non-shader layers react only when `p.audio > 0`, with live audio. They also get `K.t.bass .mid .high .rms .hit` in code layers (live, or BPM-locked synthetic) for opt-in use.
- To check reactivity without a file or microphone, press **Fonte de teste** in the AUDIO tab (kick, hat and a lead at the project's BPM). It also works inside an Artifact.

When `audio.reactive` is false, non-shader layers pulse on the BPM; shaders still react through the synthetic bands. Audio is never required for anything else.

The bus smooths with a fast attack and a slow release (peak hold, as in the openFrameworks FFT example), so a kick lands on its own frame and fades in ~200 ms. `uHit` is a transient: the positive change of the bass band, decaying quickly.

Not provided by the engine (do not promise them): spectral centroid, key, beat tracking from audio. Higher-level features need Meyda or Essentia.js bundled into a custom runtime; BPM estimation from audio in a browser is heuristic. The manual BPM is the deterministic reference.

## Mapping rules

Prefer semantic mappings, 1–3 reactive layers per composition:

| Feature | Good for |
|---|---|
| bass | weight, scale, pressure, density |
| mid | displacement, flow, deformation, emission |
| high | accents, shimmer, texture, small particles, type reveal |
| rms | global intensity, only when justified |
| bar phase (BPM) | choreography, structure, discrete events |

Pipeline for any mapping: `raw feature → smoothing → normalization → response curve → target range → parameter`. Smooth before mapping. Use beat or onset-like triggers for events, never for constant motion.

Do not make every **non-shader** layer react. If everything moves with the music, nothing has hierarchy. The validator warns when more than three non-shader layers of a composition have `p.audio > 0`. Shaders are exempt from that cap, so when a composition has several shaders give them **different band roles** (one on bass pressure, one on mid flow, one on high texture) instead of the same one.

## BPM and loops

BPM is a transport variable: BPM → beat phase → bar phase → event scheduling.

- quarter note = `60 / BPM` s; bar = `4 · 60 / BPM` s; `n` bars = `n · 4 · 60 / BPM` s.
- 120 BPM: bar = 2 s. 124 BPM: bar ≈ 1.935 s.
- Loop length in frames = `round(60 / bpm · 4 · bars · fps)`. At 132 BPM, 4 bars, 30 fps that is 218 frames; content is driven by loop phase, so frame 217 still meets frame 0 and Resolume BPM Sync absorbs the sub-frame difference.
- Never change fps or bars to chase an integer. Never invent fps values like 49.6.
- Tap tempo (Space) sets BPM; the first tap of a series also aligns the downbeat; Enter aligns the downbeat without touching BPM.

## Designing audio behavior

Write one line per reactive layer: "this layer listens to X because the concept says Y, and it moves Z". If you cannot write it, remove the binding. Put the reasoning in the layer's `role` and the contract's `audio` relationship.

## Extended vocabulary (V7)

The bus now carries more than level and hit. Idea taken from how performance shader hosts (Synesthesia scenes, Astrofox reactors) separate *how loud*, *how sudden* and *how long it travelled*. All of it is deterministic: with no source the values come from the BPM, in the export too.

| Uniform / `K.t.` | Meaning | Use |
|---|---|---|
| `uBass uMid uHigh uRms` | smoothed level per band | size, brightness, amplitude |
| `uHit` `uMidHit` `uHighHit` | transient of the band (sudden rise, decays ~150 ms) | accents, flashes, steps, glitch triggers |
| `uPres` | presence: how much mid/high is above the bass (0–1) | open the image up when the track gets airy; close it when it is all low end |
| `uBassT` `uMidT` `uHighT` `uAudT` | **integrated time**: runs faster when the band is loud or hits, never jumps. Synthetic mode: exactly *bars* units per loop, so `sin(uBassT*TAU)` and `fract(uBassT)` close the loop. Live audio: real integration (does not close) | travel through noise space, rotation, camera motion that follows the music |
| `uOnBeat` | beat pulse (1 on the beat, decays) | one-frame accents on the grid |
| `uBSin uBSin2 uBSin4` `uBTri` | sine over 1, 2 and 4 beats; triangle over 1 beat (0–1) | breathing and sway locked to the tempo, with no audio needed |
| `uBpm` | BPM / 100 | scale speeds with tempo |

Rules:
- **Integrated time replaces `uPh * k` when the motion should feel played by the music.** Use `uPh` when the motion must be exactly periodic whatever the audio.
- Per-band roles (the shader rule stays): low = mass and structure, mid = body and rotation, high = detail and sparkle, hit = accent, integrated time = travel. Do not wire every band to size.
- Because integrated time is monotonic, use only `sin/cos/fract` of it for anything that must loop.

### Modulation: `layer.mod`

Any numeric parameter of any layer can be driven without writing code:

```json
"mod": [
  { "k": "p1", "src": "bass", "min": 1.5, "max": 3.0, "mode": "set" },
  { "k": "dot", "src": "lfo", "cycles": 2, "shape": "tri", "min": 0.8, "max": 1.6 },
  { "k": "spin", "src": "onbeat", "min": 0, "max": 2, "mode": "add" }
]
```

`src`: `bass mid high rms hit mhit hhit pres onbeat bsin bsin2 bsin4 btri lfo`. The source (0–1) is mapped to `min..max`; `mode` is `set` (default), `add` or `mul`. `lfo` takes `cycles` (whole number: the loop closes), `shape` `sin` (default), `tri`, `saw`. Audio sources count toward the limit of 3 reactive layers per composition (the validator warns); `lfo` and the BPM waves are free. Modulation runs after the per-layer defaults, before drawing, and is a pure function of the frame.
