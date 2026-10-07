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
