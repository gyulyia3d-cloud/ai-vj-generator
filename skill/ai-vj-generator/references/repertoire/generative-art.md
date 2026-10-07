# Generative art, code art and abstraction with code

## Definitions that guide the work

- **Generative art** (Philip Galanter, "What is Generative Art?", 2003): art in which the artist sets a system in motion with some degree of autonomy, which then produces the work. The system is the artwork; each output is an instance.
- **Code art**: the algorithm is the medium and often visible as aesthetic (rules, data, precision, errors).
- **Controlled randomness**: chance inside rules. The seed makes chance reproducible: same seed, same piece; new seed, a sibling.
- **Abstraction with code**: start from a non-visual source (a rule, a dataset, a sound, a mathematical function) and give it form. Abstraction is a choice about what to keep: rhythm, ratio, density, direction.

## History in five steps

| Period | Who / what | What it established |
|---|---|---|
| 1960s | Georg Nees, Frieder Nake, A. Michael Noll; Stuttgart and New York exhibitions (1965); Vera Molnár; Waldemar Cordeiro (Brazil) | Plotter drawings; order versus disorder; the program as the author's tool |
| 1970s–80s | Manfred Mohr (cube-based algorithmic work), Harold Cohen's AARON (from 1973), the demoscene | Rules from geometry; autonomous drawing system; real-time code as performance |
| 1990s–2000s | John Maeda; Processing (Casey Reas and Ben Fry, 2001); openFrameworks (Zachary Lieberman and collaborators); vvvv, Max/Jitter | Code as a sketchbook for artists; the creative-coding community |
| 2010s | p5.js (Lauren McCarthy, 2013); Shadertoy (Inigo Quilez and Pol Jeremias, 2013); *The Book of Shaders* (Patricio Gonzalez Vivo and Jen Lowe); TouchDesigner in stage work | Shaders and the browser as the medium; SDF and noise as a shared language |
| 2020s | Long-form generative projects (e.g. Tyler Hobbs's *Fidenza*, 2021, built on flow fields); machine learning art (Memo Akten, Refik Anadol, Sougwen Chung) | Output-space curation; flow fields; latent spaces as material |

## Core techniques → engine

| Technique | What it produces | Engine |
|---|---|---|
| Noise (Perlin 1983/85, simplex 2001) and FBM | Natural variation: clouds, terrain, smoke | CAMPO FBM preset; `fbm()` in GLSL; `flow` |
| Domain warping | Fluid, marbled distortion | CAMPO FBM `p3` (warp) |
| Flow fields | Particles following a vector field | `flow` |
| Phyllotaxis and golden angle | Spirals of natural growth | `organism` |
| Voronoi / Worley | Cells, cracks, territories | CÉLULAS preset |
| Signed distance fields (SDF) | Crisp shapes, rings, boolean geometry, glow | ANÉIS SDF preset; custom GLSL with `length()`, `abs()`, `min()` |
| Tiling and symmetry | Patterns, ornament | `patterns.md` recipes |
| Recursion and fractals | Self-similarity across scales | FBM octaves; nested `tunnel`; custom GLSL loops |
| Cellular automata (Conway's Life, 1970; Wolfram's elementary rules) | Emergence from local rules | Needs frame-to-frame state: not available until the feedback compositor; approximate with per-bar hashed states |
| L-systems (Lindenmayer, 1968) | Branching growth | Not yet a generator; roadmap |
| Reaction-diffusion (Turing, 1952) | Spots and stripes, coral, fingerprints | Needs feedback: roadmap |
| Circle packing, DLA, subdivision | Dense organic layouts | Roadmap generators |
| Data as source | Logs, telemetry, sensor values | `data`, `hud`, DATA STRIPES recipe |

## How to direct a generative composition

1. **State the system in one sentence.** "Three hundred lines follow a wind that turns once per loop." If you cannot, the composition has no idea.
2. **Fix the rules, expose two or three knobs.** In the JSON: parameters the user will actually play (density, speed, amplitude). Leave the rest at defaults.
3. **Decide what chance controls.** Position? Timing? Color? Only one or two things should be random; the rest should be structure.
4. **Choose the seed on purpose.** Generate, look, keep the seed that best serves the concept (`seed` in the project). Say which seed in the summary.
5. **Design the curve of the loop.** Order → disorder → order (Molnár/Nees), or density rising to the event and resetting.
6. **Edge of chaos.** The interesting zone is between total regularity (boring) and noise (meaningless): a grid that breaks a little, a field with a visible direction.

## Abstraction from sound

Translate musical structure, not waveforms:

| Music | Visual |
|---|---|
| Kick | Hero pulse, scale, flash (`pulseAmt`, `div` 1/4, audio band bass) |
| Hats and percussion | Small, fast elements: data ticks, grain, sparks (`div` 1/16, band high) |
| Bassline | Slow mass deformation (`breathe`, warp, band bass with smoothing) |
| Pads, chords | Color field and slow drift (CAMPO FBM, analogous palette) |
| Breakdown | Remove layers, open negative space, slow motion |
| Drop | Event, accent color for 2 beats, all layers back on |
| Song sections | Compositions in order (STRUCTURE for intro, DENSITY for peak, TRANSFORMATION for the end) |
