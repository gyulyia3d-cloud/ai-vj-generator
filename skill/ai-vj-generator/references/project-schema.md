# PROJECT JSON — schema `ai-vj-generator/2`

Write only what differs from defaults. The engine normalizes the file: missing fields take defaults, unknown layer types are dropped with a warning, and the five fixed media slots (SHADER, IMAGEM, VÍDEO, FORMA, TEXTO) are appended, switched off, to any composition that lacks them.

```json
{
  "schema": "ai-vj-generator/2",
  "id": "kebab-case-unique-id",
  "meta": { "lang": "en|pt", "briefPalette": {}, "name": "PROJECT NAME", "artist": "", "context": "", "brief": "",
            "contract": { "concept": "", "audienceEffect": "", "semioticIntent": "", "visualLanguage": "", "formLanguage": "", "materialLanguage": "",
                          "colorLogic": "", "spatialLogic": "", "motionLanguage": "", "typographyLanguage": "", "temporalArc": "", "loopGrammar": "cyclic",
                          "technicalStrategy": "", "forbiddenShortcuts": "",
                          "focalEvent": "", "releaseZone": "", "banned": "", "tension": "balanced", "imperfection": "" },
            "spec": { "archetype": ["stage-led"], "confirmed": { "pixelMap": [1920, 1080], "pitchMm": 3.9, "viewingDistanceM": [8, 40] },
                      "zones": { "performer": { "x": 0.33, "y": 0.45, "w": 0.34, "h": 0.55 } }, "assumed": [], "show": { "bpm": [124, 134] }, "risks": [] },
            "moods": ["industrial"], "grammar": { "form": "", "motion": "", "rhythm": "", "color": "", "density": "", "depth": "", "texture": "", "transition": "", "audio": "" } },
  "canvas": { "w": 1920, "h": 1080, "fps": 30, "target": "screen", "safe": 0.05,
              "pitch": 3.9, "dist": 15, "displays": [{ "x": 0, "y": 0, "w": 960, "h": 1080 }] },
  "time": { "bpm": 120, "bars": 4, "loop": true, "seamless": true, "mode": "loop", "transition": "cut", "trBeats": 1 },
  "audio": { "reactive": true, "sens": 1, "smooth": 0.7 },
  "seed": 184729,
  "palette": { "bg": "#000000", "primary": "#FFFFFF", "secondary": "#666666", "accent": "#FFFFFF" },
  "compositions": [
    { "name": "NAME", "hypothesis": "SLOT — one sentence", "motion": "step", "palette": { "accent": "#FF2A3D" },
      "layers": [ { "type": "bg", "name": "FUNDO", "on": true, "opacity": 1, "blend": "normal", "role": "why this layer exists", "p": { } } ] }
  ],
  "capabilities": { "supported": ["preview", "fullscreenPreview"], "exportable": ["pngSequenceAlpha", "webm"], "inputOnly": ["surfaceBitmap"], "notSupported": ["midi", "osc"] }
}
```

## Schema 2 (V4) in one paragraph

`ai-vj-generator/2` is `/1` plus five optional blocks (the fifth, `meta.artBible`, is below) the engine ignores for rendering and the skill uses for rigor: `meta.spec` (the production spec from the brief diagnosis: confirmed and derived surface facts, performer and occluded zones, assumptions, show context and risks; shape in `briefing/diagnosis.md` §6; the validator checks it against `canvas`), `meta.contract` (the creative contract, shown in the PROJETO tab; fields in `creative-contract.md`), `layer.role` (one sentence: why the layer exists, traced to the contract) and a top-level `capabilities` object (honest transport labels; see `capabilities.md`). Schema `/1` files still load and validate. Everything else below is unchanged.

| Field | Values |
|---|---|
| `canvas.target` | `screen` `led` `projection` `mapping` `multi` `software` `export` |
| `canvas.fps` | 24 25 30 50 60 |
| `canvas.folds` | list of x positions in canvas pixels, each a physical corner: `[2560]` splits a 5120-wide map into two walls. See `walls-code-assets.md` |
| `canvas.gutter` | 90 (0…600, 1080-units): strip around each fold where nothing readable sits |
| `palette.mode` | `"white-alpha"` → every colour a level of white (primary 100%, secondary 72%, field 43%); export "Branco α (luma)" |
| `palette.field` | colour of a plane behind a figure that belongs to another layer (default: 43% between bg and primary) |
| `assets` | `{ "name.png": { "kind": "image", "data": "data:…", "logo": true }, "Font": { "kind": "font", "data": "data:…" } }`. Do not write by hand: `make-artifact --assets <folder>` |
| `layer.role` | one sentence: why this layer exists (schema 2); traced to `meta.contract` |
| `p.echo` `p.echoStep` `p.echoFade` | any layer: `echo` 0–8 earlier-frame copies behind the layer, `echoStep` 1–24 frames apart, `echoFade` 0.1–0.95 opacity decay per copy (deterministic trails; not for video) |
| `audio.reactive` | default `true`; shaders react with the music or with BPM-locked synthetic bands (`audio-bus.md`) |
| `layer.vars` | code layers only: list of `{k, l, t, d, min, max, step, opts}`, the sliders of the layer |
| `layer.mod` | list of `{k, src, min, max, mode, cycles, shape}`: drives any numeric `p` parameter from the audio bus or an LFO (see `audio-bus.md`, Modulation) |
| `time.bars` | 1 2 4 8 16 32 (loop length in 4/4 bars) |
| `time.mode` | `loop` `pingpong` `reverse` `random` `phase` `audio` `manual` |
| `time.transition` | `cut` `fade` `wipe` `glitch` `zoom` `slide` `iris` `blinds` `crosszoom` `spin` `radial` `diagonal` `slices` `flip` `blur` `drop` (the outgoing composition is a snapshot that zooms away, slides out, opens an iris or dissolves through blinds; pick by the concept's argument, `references/tension-and-release.md` §5) |
| `composition.motion` | `step` (interface, quantized) or `smooth` (matter, eased); affects `measure` and `hud` |
| `layer.blend` | `normal` `add` `screen` `multiply` `difference` `overlay` `lighten` |
| color params | palette key `bg` `primary` `secondary` `accent`, or `#RRGGBB` |
| media `p.media` | file name the user will import in the MÍDIA tab; validation flags it until loaded |

Layer order = stacking order: index 0 is the bottom. Keyboard keys 0–9 toggle the first ten layers.

## Common parameters (every layer, inside `p`)

| Group | key: default (range) |
|---|---|
| TRANSFORM | `x`: 0, `y`: 0 (px, canvas units) · `sx`, `sy`: 1 (0…6) · `rot`: 0 (°) · `ax`, `ay`: 0.5 (anchor, fraction) |
| APPEARANCE | `bright`, `contrast`, `sat`: 1 (0…3) · `hue`: 0 (°) · `blur`: 0 (px) |
| MOTION | `speed`: 1 (multiplies cycles; rounded to whole cycles when seamless) · `phase`: 0 (0…1, up to one bar) · `div`: `1/4` (`1/1` `1/2` `1/4` `1/8` `1/16`) |
| AUDIO | `audio`: 0 (0…1 response) · `band`: `bass` (`mid` `high` `rms`) |

Sizes in generator params are in "1080-units": the engine scales by `k = min(H, W·9/16) / 1080`, so the same JSON reads at 1920×1080, 5120×500 or 1080×1920. Pixels on canvas = value × k. Examples: 1920×1080 → k = 1; 5120×500 → k = 0.46 (a 4 px line needs `weight` ≥ 9, readable text needs `ui` ≥ 2.2); 1080×1920 → k = 0.56.

`structure`, `measure` and the `hud` reticle all anchor to the `cx`/`cy` of the composition's first `organism` layer, even when that layer is off. Move the organism and they follow.

Per-layer `audio` on **non-shader** layers acts only when `audio.reactive` is true and a source is connected (ÁUDIO tab: file, microphone or **Fonte de teste**); otherwise those layers pulse on the BPM. **Shader layers always react** (response floor 0.35, default 0.8): with the music when a source is connected, with BPM-locked synthetic bands otherwise.

Loop length is rounded to whole frames: `round(60 / bpm × 4 × bars × fps)`. At 132 BPM, 4 bars, 30 FPS that is 218 frames (7.267 s, 0.18 frame short of exact). Content is driven by loop phase, so frame 217 still meets frame 0; Resolume BPM Sync absorbs the sub-frame difference. Never change FPS or bars to chase an integer.

## Generators

### `bg` — background (standard)
| key | default | notes |
|---|---|---|
| `fill` | true | |
| `color` | `bg` | |
| `grain` | 0.55 (0…1) | 0 on LED |
| `grainRate` | 3 (1…12) | frames per grain tile |

### `organism` — phyllotaxis organism, 2,400 points at the golden angle (standard)
| key | default | notes |
|---|---|---|
| `cx` `cy` | 0.62, 0.5 | center as fraction of canvas; `structure`, `measure` and `hud` reticle follow it |
| `size` | 1 (0.1…4) | |
| `points` | 2400 (200…8000) | |
| `dot` | 1 (0.2…5) | raise to 2+ on LED |
| `spin` | 1 (0…6) | |
| `breathe` | 0.5 (0…2) | |
| `scanBars` | `"2"` (`"1"` `"2"` `"4"` `"8"`) | must divide `time.bars` |
| `tiltX` `tiltY` | -51.6, -20 (°) | |
| `petals` | true | |
| `color` `scanColor` | `primary`, `accent` | |

### `structure` — grid, rulers, golden spiral and angle (standard)
`grid` 120 (px) · `gridA` 0.07 · `rulers` true · `rings` true · `spiral` true · `angle` true · `drawOn` true (redraws after each event) · `ui` 1 (text scale) · `color` `primary` · `hot` `accent`.

### `measure` — tracking brackets on organism points (standard)
`targets` 6 (1…6) · `net` true · `rays` true · `ui` 1 · `color` · `hot`.

### `data` — scrolling logs and telemetry (standard)
`rows` 35 · `tags` comma list · `log` true · `tele` true · `teleTxt` multiline with tokens `{BPM}` `{BAR}` `{CONF}` `{HASH}` `{N}`; a line starting with `*` is accent · `ui` 1 · `color` · `hot`.

### `hud` — corner frame, title, clock, beat counter, reticle (standard)
`title` (empty = project name) · `sub` · `date` · `foot` · `reticle` true · `beats` true · `ui` 1 · `color` · `hot`.

### `event` — color wipe + word (standard)
| key | default | notes |
|---|---|---|
| `every` | 8 (0…64) | bars; 0 = only manual (key X). If `every` ≥ `time.bars`, the event fires once per loop at bar `at` |
| `at` | 0 | bar offset |
| `dur` | 2 | beats |
| `words` | `"PADRÃO DETECTADO"` | separate with `\|`; one is picked per event by seed |
| `sub` | `"ALVO {ID} · 137.508° · CONF {CONF}"` | support line |
| `mode` | `band` (`full` `word`) | `word` = no block, accent word only |
| `size` | 1 | |
| `color` `ink` | `accent`, `auto` | auto = black or bone by contrast |

### `post` — scanlines, vignette, glitch slices (standard)
`scan` 0.34 (0 on LED) · `pitch` 1 · `vig` 0.55 · `prob` 0.35 (glitch chance per beat; beat 1 always glitches) · `slices` 7 · `jitter` true · `color` · `hot`. In alpha exports scanlines and vignette are skipped automatically.

### `lines` — structural field (briefing)
`dir` `h` (`v` `d`) · `count` 24 · `weight` 2 · `scroll` 1 (whole cycles per loop) · `stepped` false · `pulseAmt` 0.6 · `accentEvery` 0 · `color` · `hot`.

### `flow` — particles in a looping noise field (briefing)
`count` 900 · `trail` 8 · `amp` 0.12 · `scale` 2.5 · `radius` 0.8 · `width` 1.2 · `alpha` 0.7 · `acc` 0.06 (fraction in accent) · `color` · `hot`.

### `tunnel` — concentric shapes moving outward (briefing)
`shape` `rect` (`circle` `tri` `hex`) · `count` 18 · `cycles` 1 · `power` 2.2 · `size` 1 · `aspect` 1.78 (set to W/H for wide walls) · `weight` 3 · `spin` 0 · `twist` 0 · `pulseAmt` 1.2 · `cx` `cy` 0.5 · `hit` true · `color` · `hot`.

`count` shapes are spaced evenly in depth; each travels outward and wraps. `cycles` = how many times the whole set advances one full spacing per loop (2 = twice as fast as 1). `size` 1 makes the outermost shape reach about 0.6 × the canvas diagonal (it overfills the frame on purpose); `power` > 1 bunches shapes near the center (perspective). Two tunnels with slightly different `cx` or `count` and `blend: difference` on a black ground produce a moiré of rings.

### `typewall` — giant scrolling words (briefing)
`words` `|`-separated · `rows` 4 (1 for very wide walls) · `fill` 0.82 · `font` `archivo` (`bebas` `mono` `helvetica` or an imported font name) · `weight` 800 · `scroll` 1 · `change` true (new word per division) · `outline` `alt` (`none` `all`) · `stroke` 2 · `sep` `"  /  "` · `upper` true · `hit` true · `color` · `hot`.

### `pixeltext`, `symbols`, `hazard`, `blocks`, `logo`, `code` — wall-aware (briefing)

Parameters, the kit `K` for `code` and the rules for walls, white-alpha and assets are in `walls-code-assets.md`. All use `wall` (`all`, `0`, `1`, …), colour keys including `field`, and the common parameters below. `logo` takes `media`, `media2`…`media4` (file names present in `assets`).

### `typeset` — title, caption and data as one hierarchy (phase 2)
`title` `caption` `data` (empty levels are dropped) · `font` `size` 150 (title, logical px) `scale` 0.4 (ratio between levels) `weight` 800 `tracking` 0.04 `gapY` 0.5 `upper` true · `cx` `cy` 0.5 `align` · `reveal` `glyph` (`word`, `none`) `inAt` 0.08 `inLen` 0.18 `outLen` 0.16 `cascade` 0.07 `stagger` 0.8 · `path` `none` (`circle`, `wave`, `line`) `radius` `amp` `waves` `angle` `drift` (whole turns) · `pulse` 0.03 · `color` `subColor` `hot`. Hidden at both ends of the loop. See `typography.md`.

### `meta.artBible` — the look rules (phase 2)
Object of nine strings (`thesis material space motion dramaturgy color typography audio banned`) plus optional `motionProfile` (`energy elasticity anticipation continuity rhythm`, each 0..1) and `density` (`sparse|balanced|dense`, read by the evaluator). Warnings only. See `art-bible.md`.

### `layer.mod` shape `spring` (phase 2)
`{ "k": "size", "src": "lfo", "shape": "spring", "cycles": 8, "zeta": 0.3, "wn": 12.5, "ta": 0.07, "depth": 0.15, "steps": 0, "min": 1, "max": 1.35, "mode": "mul" }`. The curve is not clamped to 0..1 (the wind-up dips below 0, the ring below and above). See `motion-profiles.md`.

### `instrument` — information instruments tied to the signal (V7, briefing)
`kind` `bars` (`radial` `scope` `radar` `rings` `heat`) · `n` 48 elements · `size` 0.4 (fraction of the short side; for `bars`/`scope`/`heat` the half-width as fraction of W) · `cx` `cy` 0.5 · `weight` 3 · `gap` 0.3 · `mirror` false · `color` · `hot`. Live audio shows the real spectrum/waveform; without a source it shows the BPM-locked synthetic bands, so it always agrees with what drives the image (cause and effect, `tension-and-release.md` §8). `radar` completes whole turns per loop; `rings` shows bass/mid/high/rms as arcs.

### `bitfield` — bitwise cell field (V7, briefing)
`form` 0–7 (fixed formulas of x, y, t) · `cell` 14 px · `steps` 16 (8/16/32/64 steps per loop; the field steps, so the loop closes) · `mask` 2 (bit shift) · `levels` 2 or 4 · `invertHit` true (flip on a strong bass hit) · `color` `hot`. Integer maths only.

### `sim` — baked simulation with state (V7, briefing)
`kind` `reaction` (Gray-Scott reaction-diffusion: labyrinths, spots, coral) or `ink` (dye carried by a loop-periodic flow field; marbled ink, not full Navier-Stokes) · `res` 160 cells across (32–400; the grid height follows the canvas aspect) · `feed` 0.037 `kill` 0.06 (reaction: ~0.037/0.06 labyrinth, ~0.03/0.062 spots, ~0.055/0.062 dots) · `speed` 2 (simulation sub-steps) · `drops` 8 (injections per loop, locked to the beat grid) · `flow` 1 `dissipate` 0.998 (ink) · `threshold` 0.25 · `soft` 0.25 · `smooth` true · `color` `hot` (hot = the dense core).
How it closes the loop: it warms up one loop, records two, and cross-fades them (`out[f] = (1-f/LF)·S[LF+f] + (f/LF)·S[f]`), so the last frame continues into the first and any frame is a pure function of project + seed + frame (scroll and export agree). Cost: one bake at 160 cells (~0.6 s on a GPU machine, ~1.4 s measured in headless software rendering; cached; changes to the parameters, seed, bars, fps or canvas aspect re-bake). It does not read live audio (the injections follow the beat grid; hits only add a small brightness lift). Use `layer.mod` on `threshold`/`soft` for music-driven look.

### `parallax` — depth-banded still (V7)
`media` (image) · `mediad` (depth map, white = near; empty = luminance) · `bands` 14 · `orbit` `sway` (`circle` `dolly`) · `amp` 0.03 (fraction of W) · `cycles` 1 (whole sways per loop) · `zoom` 0.04 · `hitPush` 0.01 · `invertDepth` false · `fit` `cover`. See `depth-and-splats.md`.

### `splat` — Gaussian splats / point cloud `.ply` (V7)
`media` (a `.ply` imported in MÍDIA, embedded in the project as compact data) · `max` 15000 points drawn (about 30 ms per frame at half resolution in a software-GL test; 60000 is about 120 ms: use it for exports, not live) · `size` 0.42 · `dot` 1 · `turns` 1 whole orbits per loop · `tilt` -12 · `dist` 3.2 · `depthFade` 0.5 · `colorMode` `palette` (`source`) · `alpha` 0.8 · `hitPulse` true · `color` `hot`. Isotropic soft discs sorted back to front; see `depth-and-splats.md`.

### `shader` — GLSL fragment layer (fixed slot)
`preset` `CAMPO FBM` | `CÉLULAS` | `ANÉIS SDF` | `FAIXAS` | `KALEIDO` | `FLUXO WARP` | `GRADE SDF` | `INTERFERÊNCIA` · `p1`…`p4` (defaults come from the preset) · `alphaMode` `alpha` (`opaque`) · `res` 1 (0.25…1 internal resolution) · `c1` `primary` · `c2` `accent` · `cbg` `bg` · `src` custom GLSL body (empty = preset).

| Preset | p1 | p2 | p3 | p4 |
|---|---|---|---|---|
| CAMPO FBM | scale 2.2 | drift radius 0.7 | warp 0.9 | contrast 1.4 |
| KALEIDO | sides 6 | zoom 3 | texture 0.6 | detail 0.5 |
| FLUXO WARP | scale 1.6 | warp 1.1 | detail 0.5 | contrast 1.5 |
| GRADE SDF | cells 8 | cycles 1 | stroke 0.5 | fill 0.35 |
| INTERFERÊNCIA | frequency 9 | cycles 1 | thickness 0.5 | distance 0.45 |
| CÉLULAS | density 6 | cycles 1 | edge 0.4 | fill 0.3 |
| ANÉIS SDF | rings 9 | cycles 1 | thickness 0.35 | distortion 0.5 |
| FAIXAS | lines 14 | cycles 1 | duty 0.55 | glitch 0.5 |

**Custom GLSL contract** (authoring dialect GLSL ES 1.00; the engine compiles it as GLSL ES 3.00 on WebGL2 through a `#define` header, so `gl_FragColor` and `texture2D` keep working. Do not write `#version`, `in` or `out`). Write only `void main(){…}` plus your own functions. Provided:

- audio uniforms (always live or BPM-locked synthetic, so every shader reacts): `uBass` `uMid` `uHigh` `uRms` (0–1.5 bands, scaled by the layer response) · `uHit` (bass transient, decays in ~150 ms) · `uAud` (the band chosen in the layer's AUDIO panel). **Every shader must read at least one and give each a role.**
- V7 uniforms (same rules, all deterministic): `uMidHit` `uHighHit` (band transients) · `uPres` (presence) · `uBassT` `uMidT` `uHighT` `uAudT` (**integrated time**, `bars` units per loop in synthetic mode: use `sin(uBassT*TAU)`/`fract`) · `uOnBeat` · `uBSin` `uBSin2` `uBSin4` `uBTri` (BPM waves) · `uBpm` (BPM/100). Meaning and roles: `audio-bus.md` (Extended vocabulary).
- uniforms: `vec2 uRes` · `float uPh` (loop phase 0→1, the seamless clock) · `uT` (seconds) · `uBeat` (beat index, wraps with the loop) · `uBp` (beat phase) · `uPulse` (beat envelope or audio) · `uAud` · `uAlpha` · `uSeed` · `vec3 uC1 uC2 uBg` · `vec4 uP` (= p1…p4)
- helpers: `vjRot(a)` mat2, `vjPal(t,a,b,c,d)` cosine palette, `vjSdBox`, `vjSdCircle`, `vjSmin` (smooth min), `vjKaleid(p,n)`, `vjEaseOut(t)`, `vjPulse(x,k)` · `hash(vec2)`, `noise(vec2)`, `fbm(vec2)`, `loopv(r)` (a point moving on a circle of radius r once per loop: use it to move through noise space seamlessly), `outc(color, coverage)` (writes alpha or opaque output), `TAU`
- loop rule: animate with `uPh` times whole numbers, or `loopv()`. Never use `uT` for motion that must loop.
- seed: `uSeed` = `(project.seed % 997) × 0.173`, a small float. Add it to any `hash`/`noise` argument so a new seed gives a sibling piece.
- one layer = one color pair (`uC1`, `uC2`) over a transparent or `cbg` ground. For three color roles in one composition, stack two shader layers (each with its own `c1`/`c2` and `blend`), or write the third role as alpha.
- `p1`…`p4` reach the shader unclamped from the JSON; the ranges in the preset table only limit the UI sliders. Keep values inside them so a slider nudge does not jump.
- `res` (0.25…1) renders the shader at a fraction of the canvas and scales it up: widths measured in pixels grow as `res` falls. Hairlines need `res` 1.
- ES 1.00 only: `float a = 1.0;` (not `1`), `mod(x, y)` (no integer `%`), constant loop bounds, no `texture2D`/`#version`. `scripts/validate_project.py` checks these; the interface reports the rest with line numbers.

### `image`, `video` — media (fixed slots)
`media` file name · `fit` `cover` (`contain` `fill` `none`) · `mirror` · `flip` · `cropL` `cropR` `cropT` `cropB` 0…0.49 · `anim` `none` (`pulse` `flash`) · `tint` `none` or color. Video adds `rate` 1 · `start` `end` (s) · `play` `loop` (`reverse` `pingpong` `sync` = stretch the clip over the loop).

### `shape` — vector forms (fixed slot)
`kind` `ring` (`circle` `square` `triangle` `line` `cross` `hex`) · positioned from the canvas center, with `x`/`y` as offsets · `size` 160 · `count` 1 · `layout` `single` (`linear` `radial` `grid`) · `spread` 260 · `fill` false · `fillC` (fill color) · `stroke` (stroke **color**) · `strokeW` 3 (stroke width; 0 = no stroke) · `radius` 0 · `spin` 0 · `pulseAmt` 0.2 · `alt` false (accent walks across the shapes per division) · `hot`.

### `text` — typography (fixed slot)
`content` (multiline) · `font` `mono` (`helvetica` `archivo` `bebas` or imported) · `size` 96 · `weight` 700 · `tracking` 0.02 (em) · `leading` 1.05 · `align` `center` · `upper` true · `fill` true · `color` · `outline` 0 · `outlineC` · `shadow` 0 · `glow` 0 · `glowC` · `anim` `static` (`pulse` `scramble` `strobe` `marquee` `type`).

**Positioning.** The text block is vertically centered on the canvas. Its horizontal anchor depends on `align`: `left` → 6% of the width, `center` → 50%, `right` → 94%. Common `x`/`y` are **offsets in canvas pixels from that anchor**, not absolute positions. Examples at 1920×1080: a flush-left caption in the bottom-left corner is `align: left, x: 0, y: 420`; top-right is `align: right, x: 0, y: -420`. Never use large negative `x` with `align: left`: it pushes the text off the canvas.

### `model`, `isf`, `fx`, `synth`, `blobs` — later layer types
- `model`: 3D object (media slot). `isf`: one of the 84 library generators, chosen by `p.lib` (`isf-layer.md`). `fx`: one-pass effect over the layers below (`fx-layer.md`). `synth`: one-line chain compiled to a shader (`synth-chain.md`). `blobs`: detect and mark regions of the image below (`blob-layer.md`).

### `temporal` — effects over time (phase 4)
`p.preset`: `TRILHA` (persistence p1, brightness p2), `FEEDBACK` (persistence p1, zoom p2, rotation p3, drift p4), `SLIT SCAN` (frames 2 to 24 p1, axis p2, invert p3, curve p4), `DESLOCAR` (amount p1, gain p2). Reads the layers below like `fx`. See `temporal-layer.md`.

### `layer.mod` shape `env` (phase 6)
`{ k, src: "lfo", shape: "env", cycles, keys: [0..1, ...], min, max, mode }`: a closed envelope through `keys` (the value at the start of each phase). Used by the Composition IR (`composition-ir.md`).

### Layer categories (interface)
The interface groups the types in nine categories of at most two words: Fundo, Shader, Formas, Texto, Mídia, Dados, Partículas, Efeito, Código. The category is not stored: the project keeps `layer.type`. `registry/generators.json` lists every type with its category, render mode, parameters and cost class; `schema/project.schema.json` restricts `layer.type` to that list.

## Minimal composition example

```json
{ "name": "GOLPE", "hypothesis": "RITMO — a palavra troca a cada colcheia; quadrados marcam o contratempo.", "motion": "step",
  "layers": [
    { "type": "bg", "name": "FUNDO", "p": { "grain": 0 } },
    { "type": "typewall", "name": "PALAVRA", "p": { "words": "PRESSÃO|SINAL", "rows": 1, "div": "1/8" } },
    { "type": "shape", "name": "CONTRATEMPO", "p": { "kind": "square", "layout": "linear", "count": 16, "fill": true, "alt": true, "div": "1/8" } },
    { "type": "post", "name": "PÓS", "p": { "scan": 0, "prob": 0.5 } } ] }
```

The repository's `examples/` folder holds two projects that show the **file format** only. Do not open them to start a project and never copy their names, words, palettes or compositions: every project is derived from its own briefing.
