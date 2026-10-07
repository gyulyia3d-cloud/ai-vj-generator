# Software workflows as inspiration

How the main real-time and motion tools think, what their signature techniques are, and how to **replicate the process** in this engine. Understanding the tool lets you read a reference that says "feedback loop", "instancing", "CHOP noise" or "falloff" and translate it. Never imitate a product's interface or copy its presets; the goal is the process.

Sources studied: Hydra (live-coding video synth, function reference and the `a.fft` audio object), TouchDesigner (operator families and network patterns), Cavalry (procedural 2D animation), Resolume Arena and Wire (nodes, slices, FFT, OSC, ISF), Synesthesia (SSF shader format, audio uniforms, best practices), openFrameworks and p5.js examples, Strudel (pattern language), and the community links on the Synesthesia GLSL resources page (Shadertoy, ISF, GLSL Sandbox, ShaderGif, ShaderFrog, The Book of Shaders, Inigo Quilez, Shane's raymarching, awesome-GLSL).

## Hydra: chains of verbs

A source (`osc`, `noise`, `voronoi`, `shape`, `gradient`) goes through geometry transforms (`rotate`, `scale`, `repeat`, `kaleid`, `pixelate`, `scroll`), colour transforms (`color`, `saturate`, `contrast`, `thresh`, `luma`, `invert`, `colorama`, `posterize`), is **modulated** by another source (`modulate`, `modulateScale`, `modulateRotate`, `modulatePixelate`, `modulateKaleid`) and **blended** (`add`, `mult`, `blend`, `diff`, `layer`, `mask`), then output (`out`, four buffers `o0–o3`). Feedback is `src(o0)…out(o0)`. Audio is `a.fft[0..n]` (bins), `setBins`, `setScale`, `setSmooth`.

What to take:
- **Everything is modulation.** One signal bends another's coordinates. In this engine: add a noise or sine field to `uv` before drawing (domain warp), or drive a layer parameter from another layer's band role.
- **Source → transform → blend** as a design order: decide the pattern, bend it, then composite. Layer `blend` modes are the blend step.
- **Feedback as texture of time.** Frame-pure replacement: `p.echo`.
- **Audio as a few named bands**, smoothed and scaled, each wired to one property: `uBass`, `uMid`, `uHigh`, `uHit`.
- **Rule from the VJ-skill guide:** all visuals audio-reactive, no strobing above 3 Hz.
- Translation table in `glsl-recipes.md`.

## TouchDesigner: signals, images, geometry, instancing

Operator families: **TOP** (images/textures), **CHOP** (channels: audio, noise, LFO, lag, math), **SOP** (geometry), **DAT** (data/tables), **COMP** (containers/UI), **MAT** (materials). The craft is networks.

Patterns worth knowing:
- **Feedback loop:** Feedback TOP → Transform/Level/Blur → Composite with source → back to Feedback. Produces trails, fractals, smears. Replacement: `p.echo`; for fractal-like repetition, kaleid/IFS in a shader.
- **Audio spectrum → texture:** Audio Spectrum CHOP → CHOP to TOP → drives noise amplitude, scale or displacement. Replacement: three or four bands feeding one property each (`audio-bus.md`).
- **Noise CHOP with time slice:** one smooth random value per channel per frame to drive motion. Replacement: seeded value noise sampled on a loop circle (`creative-coding-patterns.md` §2).
- **Instancing:** one geometry copied N times, with per-instance transform and colour read from channels, tables or pixels. Replacement: pattern E (grid with falloff), pattern D (particles), per-index `K.rand`.
- **GLSL TOP:** a fragment shader as an image operator. Replacement: the `shader` layer.
- **Lag / Filter / Math CHOPs:** smoothing, scaling, remapping signals. Replacement: ease functions, peak-hold smoothing (already in the bus).
- **Projection mapping workflow:** corner pin, mesh warp, blending, calibration. Replacement: declare `canvas.folds/displays`; do pin and blend in the mapping software; design for the surface (`surface-model.md`).
- **Render pass thinking:** scene → post (bloom, glow, chromatic, grain, glitch). Replacement: a `post`/finish tier and effect layers with `blend: add`.

## Cavalry: behaviours, falloffs, duplicator, stagger

Cavalry treats animation as **systems of values**: *Generators* produce values (random, noise, waves, expressions); *Behaviours* (Noise, Random, Oscillator, Morph, Bend, Modulate, Stagger…) drive attributes over a set; *Falloffs* weight how strongly each item feels a behaviour (by distance, shape, index); the *Duplicator* distributes copies in grids, lines, paths, points, shapes; *Connect Shapes* draws relations between distributed points; *Magic Easing* curves the timing; text can be animated per character or word; spreadsheets can drive values.

What to take:
- **Distribute, then drive.** Build an array of items from a rule (grid, circle, path, golden angle), then apply behaviours with falloff and stagger: pattern E in `creative-coding-patterns.md`.
- **Falloff is the secret of elegance.** The effect is strongest near a moving influence and fades smoothly. Always weight by distance, index or time rather than applying uniformly.
- **Stagger** is delay by index: `phase = idx * k` (follow-through and overlap for free).
- **Connect distributions** into lines: draw segments between near neighbours (`d < R`).
- **One value changes, the whole system responds**: expose a few meaningful parameters (`vars`) that cascade.

## Resolume Arena and Wire: slices, FFT, OSC, ISF

Arena composes **clips on layers in a deck** with effects, **slices** and **Advanced Output** (input selection and output transformation), BPM sync, and OSC/MIDI control. Wire is the node editor: Input nodes (textures, FFT spectrum, OSC/MIDI, Spout/Syphon), General nodes, Output nodes, Slice In (slices as shapes), ISF shaders, Falloff, Frequency-to-pitch and Frequency-to-BPM nodes.

What to take:
- **Design for clips and slices**: each composition is a loopable clip with a clear BPM-friendly duration; layers export separately (alpha PNG per layer) so the VJ can recolour, retime and mix in Arena.
- **White-alpha** content is recoloured in Arena; design in luminance.
- **Slices follow the physical surface**; the input is the full canvas. Our `canvas.folds/displays` mirror that.
- **FFT with falloff**: smooth fall, quick rise (our bus).
- **ISF** (interactive shader format) = fragment shader + JSON controls; the closest to our `shader` layer with `uP` controls.
- **OSC needs a bridge** from a browser (`capabilities.md`).

## Synesthesia: shaders with audio uniforms and a controls panel

Scenes are GLSL fragment shaders in the SSF format with a JSON file of controls. Audio uniforms: **Levels** (`syn_Level`, `syn_BassLevel`, `syn_MidLevel`, `syn_MidHighLevel`, `syn_HighLevel`, 0–1), **Hits** (`syn_Hits`, `syn_BassHits`…: transients, 0–1), **Time** (`syn_Time`, `syn_BassTime`…: clocks that advance faster when a band is loud), **Presence**, **Beat** (`syn_OnBeat`, `syn_ToggleOnBeat`, `syn_RandomOnBeat`, `syn_BeatTime`), **BPM** (`syn_BPM`, `syn_BPMConfidence`, `syn_BPMTwitcher`, `syn_BPMSin/Tri` at 1×, ½, ¼, ⅛), plus `syn_FadeInOut` and `syn_Intensity`. Standard uniforms: `RENDERSIZE`, `TIME`, `_uv`, `_uvc` (aspect-corrected, centred), multipass with `syn_FinalPass` for feedback.

Best practices from its docs, adopted here:
- **"Every scene should have some audio reactivity."** (our rule for shaders).
- Ask: *what is unique about this scene that audio can highlight, and what is boring that audio can enliven?*
- Use **hits** for events, **levels** for continuous response, **time** uniforms for audio-driven speed, BPM waves for steady pulse.
- Offer **toggles** so a performer can turn audio animation off; set sensible **min/max** and use curves (`pow`) to concentrate the interesting range; use smooth sliders (0.05–0.2); set **defaults that engage immediately** and leave room to evolve.
- Compare with `> 0.5` rather than `== 1.0` for booleans.
- Group controls and keep names clear; do not expose controls that do nothing in some states.

Mapping to this engine: `syn_BassLevel → uBass`, `syn_Hits → uHit`, `syn_BPMSin → sin(TAU*uPh*n)`, `syn_OnBeat → exp(-uBp*5)`, `_uvc → uv`.

## openFrameworks and p5.js: the examples as teachers

- **Math:** `ofNoise` over a 2-D slice of a 3-D field to push particles (pollen in wind); periodic signals (sine, saw, triangle, noise, random) with frequency and amplitude; trigonometric motion; vector maths.
- **GL:** FBO trails (fade with a translucent rectangle), GPU particle systems, shaders with displacement maps and alpha masks, instancing, transform feedback, compute shaders.
- **Graphics:** blending modes, polylines, vector graphics, LUT filters, colour keys.
- **Sound:** `ofSoundGetSpectrum` and a smoothed array that decays by 0.96 and takes the max of incoming.
- **p5.js:** drawing primitives, `noise`, `randomSeed/noiseSeed` (seeded art), `createGraphics` buffers, vectors, easing helpers, WebGL mode and `p5.strands` (a JS shader DSL). Seeded randomness and parameter-driven design are its lessons.
- Everything portable is portable as an idea; here it becomes a generator, a `code` layer or a shader.

## Strudel / Tidal: time as patterns

A cycle is divided by mini-notation (`bd sd [hh hh] ~`), speed modifiers (`*`, `/`), elongation (`@`), alternation (`< >`), randomness (`?`, `|`), polymeter, **Euclidean** `(k,n)`, and transformations (`every`, `jux`, `off`, `rev`, `chunk`, `mask`, `struct`). Signals (`sine`, `saw`, `perlin`, `rand`) modulate any parameter. Take: compose a set as **layers of voices with different cycle lengths** (1, 2, 3, 4, 8 bars) that realign, so the whole evolves without repeating; use Euclidean rhythms for event timing; use `mask`-style gradual introduction ("0 for 4 bars, then 1") for arrangement; "build gradually, change one or two things at a time" for live use.

## Skill-building references (how these skills are made)

- **`algorithmic-art`:** philosophy first (a short manifesto of the system's computational aesthetic), then the algorithm; seeded randomness (same seed = same output); parameters are tunable system properties (quantities, scales, ratios, thresholds), not "pattern types"; quality means balanced complexity, harmonious colour, smooth performance and the sense of countless hours of refinement. Adopted: the creative contract is the philosophy; `vars` are system properties.
- **`hyperframes` family (creative / animation):** design-spec as brand truth, house-style *lazy defaults to question*, **video-medium density** (three or more layers per scene: background treatment, midground message, foreground accents), *two focal points minimum*, anchor to edges, scale up everything for the medium, vary eases/speeds/directions, build / breathe / resolve, easing as emotion, beat-direction with a motion verb for every element, an adherence check after authoring. Adopted: `craft-and-finish.md`, `animation-principles.md` §6, the finish pass.
- **Design-motion skills:** contextual weighting, create vs audit modes, anti-slop checklists, performance guidance. Adopted: the quality gates and automatic rejects.

## Translating a reference that names a tool or effect

1. Identify the **process** (what is being computed, over what, driven by what).
2. Identify the **visible result** (what the audience sees).
3. Choose the engine form (`behavior-to-technique.md`): generator, shader, code layer, echo, composition of layers.
4. Rebuild it from the concept of this brief, with its own palette, scale, audio roles and loop. Look at the frames, then adjust until the *effect* is right, not the code.

`effects-glossary.md` lists the common terms with their translation.
