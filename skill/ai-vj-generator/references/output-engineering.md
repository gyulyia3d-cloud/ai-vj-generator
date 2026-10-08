# Output engineering: from canvas to light

How a finished composition becomes photons on a real surface, and what that changes in the design. `surface-model.md` describes the surface; `output-targets.md` lists what is delivered; `capabilities.md` labels what the engine does. This file is the physics and signal chain in between. Numbers come from `scripts/surface_calc.py`.

Sources studied: the TouchDesigner output, blending and optimisation chapters and the PixelController matrix pipeline (principles only; no code was taken, see `repo-analysis.md`).

## 1. One raster, one window

The engine draws **one** raster that spans every region. Build the raster, then let each projector, LED port or display take its rectangle in whatever system receives the files.

- The pixel map in `canvas.w × canvas.h` is the *content* raster. For several outputs, declare the rectangles in `canvas.displays`; the Export tab renders each region as its own PNG sequence or MP4.
- Rotating an output means rotating the *canvas* of that rectangle (flip / flop), not transforming the pixels inside it. A projector mounted portrait receives a rotated rectangle; design the content for the unrotated map and say how each rectangle is rotated in the delivery notes.
- Mixed resolutions fit into a raster as a packing problem (e.g. four 1400×1050 outputs as a 2×2 grid of 2800×2100). State the packing in `PRODUCTION_SPEC.md`.
- Colour-order, orientation and serpentine paths of LED strips belong to the controller; content is always upright, in a clean rectangular map.

## 2. Edge blending (projection)

Two overlapping projectors add light. A blend zone cross-fades the two images so the sum is constant.

**Sizing.** Start near 10% of the projector size along the blend axis, rounded to a power of two (192 → 256 for 1920), then tune on site (usual 10–20%).

**The pixel cost.** Overlap pixels are shown twice, so they are *not* extra content. For `n` projectors of length `L` with overlap `ov`:

- visible content = `n·L − (n−1)·ov`
- cutting a content raster of `n·L` discards `(n−1)·ov/2` from each outer edge, which keeps the blend at the centre of the canvas
- projector `i` crops from `(n−1)·ov/2 + i·(L − ov)` for length `L`

Two 1920 projectors with 256 px overlap: raster 3840, visible 3584, crops 128→2048 and 1792→3712. `surface_calc.py blend --n 2 --overlap 256` prints it.

Choose one of two workflows and write it in the spec:

| Workflow | Content size | Use when |
|---|---|---|
| Full raster with a buffer | `n·L` | nobody experienced will calibrate; the blend can change on site without losing content |
| Visible size | `n·L − (n−1)·ov` | a projectionist has fixed the blend; fewer pixels to render |

**The ramp.** The fade is an S curve, then each projector's inverse gamma so the *light* adds linearly. With `x` from 0 to 1 across the zone and steepness `p` (default 2):

`a(x) = ½·(2x)^p` for `x < ½`, `a(x) = 1 − ½·(2(1−x))^p` otherwise; multiply the projector whose image *rises* across the zone by `a^(1/γ)` (γ ≈ 2.2) and the one whose image *falls* by `(1−a)^(1/γ)`, so the light of the two adds to a constant. `surface_calc.py ramp --overlap 256` prints a table. Also lift the black level of the non-overlapping area to match the doubled black in the zone, or a visible band remains.

**Design rules.** No text, faces or logos in the blend zone or in the discarded edges; avoid large dark fields near the zone; slow horizontal motion through a blend is forgiving, hard vertical edges are not.

## 3. Tearing, stutter and refresh

- Tearing: the display refreshes out of step with the render. Prevent it with identical displays (same model, resolution, bit depth, refresh), one output window, a professional GPU where available, and a single logical display (mosaic) for many outputs.
- Stutter without dropped frames: a 30 fps clip on a 60 Hz output should show each frame for exactly 2 refreshes; if a driver shows one for 1 and the next for 3, motion judders. Prefer fps that divide the refresh evenly (30 and 60 on 60 Hz; 25 and 50 on 50 Hz). 24 fps on 60 Hz gives uneven 3:2 cadence. `surface_calc.py loop --refresh 60` checks it.
- Remote-desktop tools, display rotation set in the operating system and a mismatched display in the chain are common causes: debug by disconnecting displays one at a time.
- The engine renders 24, 25, 30, 50 and 60 fps only. Broadcast chains at 29.97 or 59.94 conform on the server; say so in the spec.

## 4. LED output chain

| Stage | What matters for the design |
|---|---|
| Content (sRGB-like) | stay in the gamut and brightness the room allows |
| Playback system | scales to the processor's input; never let it resample a 1:1 map |
| Processor / controller | applies gamma, white point, brightness, per-module calibration |
| Cabinet | refresh rate, grayscale depth, scan type |

- **Gamma belongs to one stage.** Cheap LED strips often need a gamma of about 2.2 to 2.5 applied at the *controller*; content stays as designed. If both the content and the controller apply a gamma, blacks crush and mid-tones collapse. Ask which stage applies it (`briefing/diagnosis.md`). Test with a grey ramp.
- **Dark gradients band** on LED, especially at low brightness (few grey levels per channel). Add a little grain or dither to slow gradients, or keep them above ~10% luminance. Where `bg.grain` is 0 for moiré, use ordered dither only if it does not beat with the pitch.
- **White clips** on many processors at night: keep primary slightly below white (#F2F0EA). A pure white full-area flash is also the harshest on the audience and on power draw.
- **White point.** LED walls run cooler (6500 to 9000 K) than screen references; warm palettes shift. Check on the wall, not on the laptop.
- **Cameras.** Low LED refresh rates and rolling shutters show bands and flicker; fine regular patterns (scanlines, halftone, 1-px grids) moiré. When a camera sees the wall, prefer soft gradients with grain and bold forms.
- **Resizing.** If the content size differs from the pixel map, scale by an integer factor with nearest-neighbour for pixel art, and with a high-quality filter for photographic detail. Do not let the pipeline rescale by a fraction.
- **Layout rotation.** Multi-panel matrices often rotate each panel (0, 90, 180, 270, with flips) to shorten cabling; the controller undoes it. The content is always the unrotated map.

## 5. Pixel-mapped fixtures and protocols

Out of scope: the engine delivers PNG sequences and MP4 and never addresses fixtures, DMX, Art-Net or sACN. Lines and strips are only a surface shape to compose for.

## 6. Performance and deployment

A show runs on the weakest link of a pipeline, not on the best component.

| Bottleneck | Symptom | Test | Remedy |
|---|---|---|---|
| Pixel shading (GPU) | frame time grows with resolution | lower the resolution of generators; if it speeds up, it is pixel-bound | lower `res` on shaders (0.5 to 0.7), fewer full-canvas layers, composite small assets instead of re-drawing a large empty canvas |
| CPU (decode, logic) | cook time of individual items spikes | add a fixed CPU load and watch for drops | cheaper codecs, fewer simultaneous clips, precomputed data |
| Storage | clips stall as the set loads | read many clips at once | fast SSD, HAP / DXV3 sized to the drive, fewer simultaneous 4K layers |
| GPU memory | slowdowns after resolution changes | change a resolution and watch | avoid changing resolutions at runtime; keep assets at their final size |

For delivery: a small hero asset modulated in a large canvas should be processed at its own size and composited once; a transparent full-canvas layer costs as much as an opaque one. One output window, no overlays or remote tools on the show machine, and the operating system's background tasks off. Perform-mode style full-screen output hides the editor and its cost.

For our engine: `shader.p.res` 0.5 to 0.7 and at most one shader at `res` below 1 per composition on weak GPUs; `p.echo` multiplies a layer's cost by its copies; exports always render at full density.

## 7. Control signals

Out of scope: no OSC, MIDI or remote control. The engine does not operate show software.

## 8. Test cards: what to run first on site

Before any content, the operator runs a test pattern on the real surface. Provide one for every mapped or LED project:

1. alignment grid with pixel rulers and the fold lines;
2. 1-pixel checkerboard and 1-pixel borders (resampling, scaling and edge cut);
3. grey ramp 0 to 100% in 10 steps and a gamma strip (banding, double gamma);
4. colour bars and a full-white and full-black frame (white clipping, black level);
5. safe-area frame and a centre cross;
6. a horizontal moving bar (judder, tearing, refresh cadence);
7. blend-zone markers where projectors overlap.

Deliver it as a composition named for the project, or as a short PNG set, with the loop closing so it can stay on screen during setup.

## Labels used in deliveries

| Item | Label |
|---|---|
| Per-region and per-layer alpha, white-alpha, PNG sequences, MP4, test cards | EXPORTABLE |
| Preview and fullscreen preview | SUPPORTED |
| Pixel maps and blueprints as surface descriptions | INPUT / ANALYSIS ONLY |
| Transmission protocols, control protocols, mapping files | NOT SUPPORTED |
