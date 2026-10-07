# Repository analysis ledger

What was studied from the GITHUBS folder, what it was worth, where it went, and under what licence. Rule: **learn concepts, never copy code** (`provenance.md`). Verdicts: `ADOPTED` (the idea now lives in the skill), `REFERENCE` (cited, not implemented), `UI` (feeds the interface phase, `ui-research.md`), `SKIP` (not relevant). Licences matter: AGPL, GPL and proprietary code was never copied.

| Repository | What it is | Licence | Verdict | What was taken, and where it lives |
|---|---|---|---|---|
| **awesome-vjing** | curated VJ resources + the "Respect your VJ" manifesto | CC0 | ADOPTED | gig types, rider, credit practice, learning links → `vj-practice.md` |
| **awesome-creative-coding** | curated creative-coding map (books, tools, maths) | no licence file in the copy (links only) | REFERENCE | learning resources → `vj-practice.md` §7 |
| **awesome-generative-art** | curated generative-art map | CC0 | REFERENCE | resources (Lygia, hg_sdf, Spectral.js, "natural feel" articles) → `vj-practice.md` §7 |
| **Canvalry-scripts** (Cavalry scripts) | 26 parametric distributions (superformula, Lorenz, Lissajous, rose, epitrochoid, Möbius, wave interference…) and scene utilities (Renamer, Localiser, Convert Frame Rate, CSS gradient converter) | MIT | ADOPTED / UI | the *distribution idea* and formulas → `math-forms.md`, recipes `superformula`, `wave-interference`, `spirograph`; utilities → UI ideas (batch rename, text export/import, frame-rate conversion) in `ui-research.md` |
| **PixelController** (LED matrix controller) | generators + effects + mixers + colorset per "visual", panel layout with rotation, gamma tables, beat-to-animation, many output protocols | GPL (concepts only) | ADOPTED | LED output chain, gamma, layout rotation, protocols and universes → `output-engineering.md` §4–5, `scripts/surface_calc.py pixelmap`; visual = 2 generators + 2 effects + mixer pattern → `ui-research.md` |
| **TD-Arena** (Resolume-like on TouchDesigner) | composition → deck → layer → clip → effect → parameter model, OSC address per parameter, save state, thumbnails, UI modules | no licence file in the copy (concepts only) | UI | the parameter-address model and state save, clip launcher, performance monitor → `ui-research.md` |
| **OSCAR** (OSC/MIDI control surface editor) | browser editor that builds touch control pages, publishes them to phones, extension API, MCP tools that read, validate and *draft* but never operate the rig | BSD-3 | UI / ADOPTED | control-map deliverable and "assistant drafts, never operates" principle → `output-engineering.md` §7, `ui-research.md`; widget vocabulary (button, slider, XY pad, meter, dropdown, colour, MIDI/OSC fields) |
| **P5LIVE** (collaborative live-coding VJ environment) | p5 + Hydra + Strudel in a live editor with sketches list, snippets, popups, view-only mode, co-coding | AGPL (concepts only) | UI | live-code panel with recompile control, autosave, backup, popup streams (visuals-only, code-only), view-only/exhibit URLs, snippets → `ui-research.md` |
| **hydra** (video synth live editor) | chains of `src → coord → color → combine` functions; a Mutator that edits the AST of a patch, with an undo stack | AGPL (concepts only) | ADOPTED / UI | the function taxonomy (8 sources, 10 coordinate, 16 colour, 7 combine, 11 modulate) is already mapped in `glsl-recipes.md`; the **mutate with undo** pattern → `ui-research.md` (a "mutate" button on a composition, with history) |
| **vjdesign** (Vue form designer from JSON schema) | a profile (components → properties → editors) generates a design UI and a value JSON | MIT | UI | **schema-driven parameter panel**: the interface can generate every control from `recipes/manifest.json` and the engine registry → `ui-research.md`. Not a VJ tool, despite the name |
| **vjtools** (Java code standard) | a Chinese Java coding guideline | Apache-2.0 | SKIP | not related to VJ; nothing taken |
| **Introduction-to-TouchDesigner** | a book: signal flow, CHOPs, audio, GLSL, GPU particles, output, edge blending, optimisation | not stated in the copy (concepts only) | ADOPTED | edge blending maths, output raster, tearing, performance bottlenecks, audio sample-rate and smoothing ideas → `output-engineering.md`, `scripts/surface_calc.py blend / ramp` (tested against the chapter's numbers) |
| **anime.js** | animation engine: stagger, spring, timeline, SVG draw/morph, text split | MIT | ADOPTED | stagger options, spring by bounce/duration, path draw/morph, text split → `motion-systems.md` (all helpers re-written, tested) |
| **GSAP** | animation platform and plugins (CustomWiggle, CustomBounce, MotionPath, Flip, Physics2D, Inertia, SplitText, ScrambleText) | proprietary licence (concepts only) | ADOPTED | wiggle, squash and stretch, rough and slow-mo eases, FLIP, inertia, text scramble as *ideas* → `motion-systems.md`; no code used |
| **motion-canvas** | generator-based, code-driven animation (flow control, signals) | MIT | ADOPTED | `all / any / chain / sequence / loop / delay`, signals → frame-pure timeline algebra in `motion-systems.md` §2 |
| **d3** | data-driven documents: scales, interpolators, force layouts, Delaunay, contours, geo projections, colour schemes | ISC | REFERENCE / ADOPTED | cyclic colour maps, perceptual interpolation, scales → `color-science.md` §6; Delaunay and contour ideas listed as available forms |
| **taichi** | high-performance simulation language with fluid, MPM, vortex, physarum, n-body, wave examples | Apache-2.0 | ADOPTED | the *stateless* reformulation of simulations (advection by backward tracing, vortex street, standing waves) → `math-forms.md` §4; true simulation stays out of scope (no kept state) |
| **three.js** | 3-D library; post-processing passes and shaders (bloom, glitch, halftone, RGB shift, afterimage, film, kaleido, vignette…), parametric curves and geometry | MIT | ADOPTED / REFERENCE | the *finish-pass vocabulary* (see below), knot and parametric formulas → `math-forms.md` §3 |
| **openFrameworks** | C++ creative-coding toolkit with GL, shader, FBO-trails, GPU particles, compute, sound-FFT examples | MIT | REFERENCE | already mined in V4 (`creative-coding-patterns.md` §8); examples of FBO trails and GPU particles inform `p.echo` and the particle recipes |
| **p5.js** | creative-coding library | LGPL | REFERENCE | idioms already mapped in `creative-coding-patterns.md` |
| **css-doodle** | a DSL that generates CSS patterns on a grid | MIT | REFERENCE | the idea of a *tiny rule language per cell* (random, index, nth selectors) informs the grid recipes (`stagger-grid`); no code |
| **samila** | Python generative art from random formula parameters | MIT | REFERENCE | parameter-space sampling: a seed picks the formula coefficients → idea behind seed-driven recipe variants |
| **generative-art-node** | layered asset composition with rarity (HashLips) | MIT | REFERENCE | "layers in an order with rarity weights" is the opposite of our authored layers; noted, not adopted |
| **gaussian-splatting** | 3-D reconstruction research code | research, non-commercial licence | SKIP | out of scope for a 2-D deterministic engine; a splat-based scene would be imported as pre-rendered media |
| **plotly.py** | Python charting library | MIT | SKIP | not relevant to generative visuals |
| **PlumberManager** (editor React de fluxo de sinal de encanamento) | shell com menu lateral redimensionável e recolhível, histórico de comandos com rótulos, paleta de busca Ctrl+K, tour de boas-vindas, tela de início com modelos e recentes, widget embutível em shadow DOM, exportação SVG/PNG/PDF, grafo de fluxo automático (dagre), mini-mapa, painel de propriedades | not checked: the zip has no licence file, so concepts only | ADOPTED / SUGGESTED | **adotado (reescrito, sem código):** histórico de comandos com rótulo e lista, largura do menu ajustável com minimizar, painel de propriedades por camada. **Sugerido, ainda não feito:** paleta de comandos Ctrl+K, tour de boas-vindas, tela de início com modelos e recentes, grafo de camadas com mini-mapa, exportar a ficha em PDF, embutir o motor como widget → `ui-research.md` |

## Finish-pass vocabulary mapped from three.js post-processing

Used to extend the finish pass of `craft-and-finish.md` §7 with named, engine-friendly operations (write each as a shader or `post` parameter, in the palette):

| Pass | What it does | Engine route |
|---|---|---|
| bloom / unreal bloom | bright areas glow | `blend: add` of a blurred copy; use sparingly on LED |
| after-image | trails of the previous frames | `p.echo` |
| RGB shift | channel offset, chromatic aberration | a shader that samples three offsets (or three tinted layers with `add`) |
| halftone / dot-screen | dots sized by luminance | a shader or code-layer dot grid (not on moiré-prone walls) |
| film grain, vignette | texture and focus | `bg.grain` (not on LED), `post` vignette |
| glitch | random block displacement | `post.slices` or `K.glitch` |
| kaleidoscope, mirror | symmetry fold | `vjKaleid`, mirror around a fold |
| Sobel / Frei-Chen | edge extraction | a shader on a layer's own alpha; outlines |
| LUT / colour correction | grade | palette roles instead; LUT only if the user supplies it |
| pixelate | quantised view | `floor(uv*n)/n` |

## Licence caution (applies to all future use of this folder)

- AGPL (Hydra, P5LIVE) and GPL (PixelController): read for ideas; do not paste code or ship derived code in the skill.
- Proprietary (GSAP): read the public documentation; do not copy source.
- MIT, BSD, ISC, Apache: code may be adapted with a notice, but this ledger records only concepts and independent re-implementations.
