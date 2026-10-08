# Effects, motion and software glossary

When a briefing or a reference uses a term, find it here, say what it is in plain words, and pick the engine form that reproduces the *process*. Forms: **G** = generator, **S** = shader layer (`glsl-recipes.md`), **C** = `code` layer (`creative-coding-patterns.md`), **E** = layer echo (`p.echo`), **L** = layer composition (blend, opacity, phase).

## Image and light

| Term | What it is | Form |
|---|---|---|
| **Bloom / glow** | bright areas bleed light | L: blurred copy on `blend: add`, 30–50% |
| **Chromatic aberration / RGB split** | colour channels offset | L: two copies in two palette roles offset 2–6 px, `add` |
| **Scanlines / CRT** | horizontal line texture | G `post` (off on LED), S `fract(y*n)` |
| **Grain / film noise** | animated fine noise | G `bg` grain; S `hash` per frame tile |
| **Vignette** | darkening toward edges | G `post`; radial multiplier |
| **Halftone** | dots sized by tone | C `K.dots`; S grid of circles with radius from field |
| **Dithering** | pattern to fake tones | S Bayer matrix on a threshold |
| **Posterize / threshold** | few tone levels / binary | S `step`, `smoothstep` |
| **Duotone / gradient map** | tone mapped onto two colours | S `mix(uC1,uC2,f)` |
| **Solarize / invert** | tones flipped above a threshold | S `abs(f-t)`; `invert` |
| **Lens flare / light leak** | optical artefact | L: a wide soft shape on `add`, low opacity |
| **Depth of field** | focus plane | L: blur and dim background layers |
| **Parallax** | layers shift at different rates | L: different `speed`/offset per depth tier |
| **Volumetric light / god rays** | light shafts | S radial blur approximation; L: stacked soft wedges |
| **Fog / haze** | depth fade | L: low-opacity ground and gradient falloff |

## Geometry and pattern

| Term | What it is | Form |
|---|---|---|
| **Kaleidoscope / mirror** | polar fold | S `vjKaleid`; C mirrored loops |
| **Tiling / repeat / mosaic** | repeated cells | S `fract(uv*n)`; G `symbols`, `lines` |
| **Truchet** | tiles with random orientation | S recipe 6 |
| **Voronoi / Worley / cells** | nearest-point regions | S preset CÉLULAS |
| **Moiré / interference** | two close frequencies | S recipe 9 |
| **Op Art** | perceptual vibration from regular patterns | S/G lines with phase drift |
| **Flow field** | vectors from noise steering particles/lines | S recipe 8; C pattern A |
| **Curl noise** | divergence-free flow | C: derive from a noise potential |
| **Domain warping** | distort coordinates with noise | S recipe 3 |
| **SDF / metaballs / smooth union** | distance functions, blobby merges | S recipe 4, `vjSmin` |
| **Raymarching** | step along rays through an SDF | S single pass; keep iterations low |
| **Phyllotaxis / golden angle** | 137.5° spiral packing | C pattern B; G `organism` |
| **Lissajous** | two-frequency parametric curve | C pattern C |
| **L-system / fractal / IFS** | recursive growth | C: fixed depth, closed form |
| **Cellular automata / reaction-diffusion** | stateful grid rules | not frame-pure: approximate with noise thresholds or precompute to an image |
| **Attractor (Lorenz, Clifford)** | chaotic orbit | C: integrate a fixed number of steps from a seed per frame |
| **Isometric / 2.5D** | oblique projection | C with fixed projection |
| **Wireframe / mesh** | edges only | C lines; G `lines` |
| **Point cloud** | dots in space | C pattern B/D |
| **Instancing** | one form copied with per-copy variation | C pattern E |

## Motion and time

| Term | What it is | Form |
|---|---|---|
| **Easing** | speed curve | `K.ease.*`, `animation-principles.md` §3 |
| **Stagger** | delay by index | `phase` offsets; C `idx*k` |
| **Follow-through / overshoot** | lag and settle | C pattern F; `K.ease.back` |
| **Loop / seamless** | end meets start | `uPh*n`, whole bars |
| **Ping-pong** | forward then back | `time.mode: pingpong` |
| **Time remap / freeze / stutter** | non-linear time | E with large `echoStep`; `K.ease.step` |
| **Feedback / trails / echo** | previous frames re-drawn | E (`p.echo`) |
| **Strobe** | rapid flashes | limit to ≤ 3 Hz; `K.strobe` |
| **Glitch / datamosh** | corrupted blocks / smear | G `blocks`, `K.glitch`; E smear |
| **Wipe / slice / mask reveal** | an edge sweeps | C rect with eased x; G `event` band |
| **Kinetic typography** | animated lettering | G `typewall`, `pixeltext`, `text` |
| **Draw-on / path reveal** | line draws itself | C progressive `lineTo` by ease |
| **Count-up / ticker** | numbers advancing | C text; quantise to beats |
| **Pulse / breathe** | scale or brightness on rhythm | `uHit`, `uBass`, `F.pulse`; `breathe` |
| **Orbit / spiral** | circular travel | `cos/sin` with integer cycles |
| **Shake** | decaying random offset | `A*exp(-s*8)*(hash-.5)` |
| **Camera move (push, pan, dolly, orbit)** | virtual camera | transform the layer `x/y/sx/sy/rot` over the bar; C projection |

## Colour and design

| Term | What it is |
|---|---|
| **Palette roles** | ground, figure, support, field, accent |
| **Cosine palette** | `a + b*cos(TAU*(c*t+d))`, `vjPal` |
| **Colour grading / LUT** | global tone mapping; apply in the finish tier, not per layer |
| **Neon / cyberpunk / Y2K / brutalist / Swiss / editorial** | style names: ask what the user attaches to the word, extract rules (grid, type, palette ratio, motion), do not apply a skin |
| **HUD / telemetry / reticle** | informational overlays; legibility gets harder with distance |
| **Generative / algorithmic / procedural** | rules + seed + parameters |
| **Data-driven / sonification** | data mapped to form (counts, positions) |

## Software and formats

| Term | What it means here |
|---|---|
| **Hydra** | live-coded chain of video-synth transforms with `a.fft` audio; see `software-techniques.md` |
| **TouchDesigner (TOP/CHOP/SOP/DAT/COMP)** | operator networks for images, signals, geometry, data, containers |
| **Resolume Arena / Avenue / Wire** | VJ media server and node patcher; named only as a vocabulary reference, not a target |
| **Synesthesia / SSF** | audio-reactive shader scenes with JSON controls and audio uniforms |
| **Cavalry** | procedural 2D animation: behaviours, falloffs, duplicator, stagger |
| **Notch, Unreal, Unity VFX** | real-time 3D engines; node or blueprint particle systems |
| **After Effects / Blender / Cinema 4D / Houdini** | offline motion/3D; export frames or masks if a piece must come from there |
| **ISF** | Interactive Shader Format: fragment shader plus JSON inputs |
| **Spout / Syphon / NDI / SDI** | video transports (NOT SUPPORTED by this engine) |
| **DXV / HAP / PNG sequence / WebM** | delivery formats (the engine writes PNG sequences and MP4; `ffmpeg` converts) |
| **Pixel map / region / canvas** | native pixel grid (an input description), output regions, the full composition space |
| **Safe area / gutter / fold** | margins, no-text strips, physical corners |

## If the term is not here

Say what you understand it to mean in one sentence, state the process behind the look, propose the engine form, and ask the user to confirm with a frame or a link they can attach. Do not guess silently.
