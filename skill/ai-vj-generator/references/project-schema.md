# PROJECT JSON — schema `ai-vj-generator/1`

Write only what differs from defaults. The engine normalizes the file: missing fields take defaults, unknown layer types are dropped with a warning, and the five fixed media slots (SHADER, IMAGEM, VÍDEO, FORMA, TEXTO) are appended, switched off, to any composition that lacks them.

```json
{
  "schema": "ai-vj-generator/1",
  "id": "kebab-case-unique-id",
  "meta": { "name": "PROJECT NAME", "artist": "", "context": "", "brief": "",
            "moods": ["industrial"], "grammar": { "form": "", "motion": "", "rhythm": "", "color": "", "density": "", "depth": "", "texture": "", "transition": "", "audio": "" } },
  "canvas": { "w": 1920, "h": 1080, "fps": 30, "target": "screen", "safe": 0.05,
              "pitch": 3.9, "dist": 15, "displays": [{ "x": 0, "y": 0, "w": 960, "h": 1080 }] },
  "time": { "bpm": 120, "bars": 4, "loop": true, "seamless": true, "mode": "loop", "transition": "cut", "trBeats": 1 },
  "audio": { "reactive": false, "sens": 1, "smooth": 0.7 },
  "seed": 184729,
  "palette": { "bg": "#000000", "primary": "#FFFFFF", "secondary": "#666666", "accent": "#FFFFFF" },
  "compositions": [
    { "name": "NAME", "hypothesis": "SLOT — one sentence", "motion": "step", "palette": { "accent": "#FF2A3D" },
      "layers": [ { "type": "bg", "name": "FUNDO", "on": true, "opacity": 1, "blend": "normal", "p": { } } ] }
  ]
}
```

| Field | Values |
|---|---|
| `canvas.target` | `screen` `led` `projection` `mapping` `multi` `software` `export` |
| `canvas.fps` | 24 25 30 50 60 |
| `time.bars` | 1 2 4 8 16 32 (loop length in 4/4 bars) |
| `time.mode` | `loop` `pingpong` `reverse` `random` `phase` `audio` `manual` |
| `time.transition` | `cut` `fade` `wipe` `glitch` |
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

Per-layer `audio` only acts when `audio.reactive` is true and the user connected a source in the ÁUDIO tab; otherwise the same layers pulse on the BPM. Setting `audio` on the hero while reactive is off is correct: it is ready for when the user turns audio on.

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
| `every` | 8 (0…64) | bars; 0 = only manual (key X) |
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

### `typewall` — giant scrolling words (briefing)
`words` `|`-separated · `rows` 4 (1 for very wide walls) · `fill` 0.82 · `font` `archivo` (`bebas` `mono` `helvetica` or an imported font name) · `weight` 800 · `scroll` 1 · `change` true (new word per division) · `outline` `alt` (`none` `all`) · `stroke` 2 · `sep` `"  /  "` · `upper` true · `hit` true · `color` · `hot`.

### `shader` — GLSL fragment layer (fixed slot)
`preset` `CAMPO FBM` | `CÉLULAS` | `ANÉIS SDF` | `FAIXAS` · `p1`…`p4` (defaults come from the preset) · `alphaMode` `alpha` (`opaque`) · `res` 1 (0.25…1 internal resolution) · `c1` `primary` · `c2` `accent` · `cbg` `bg` · `src` custom GLSL body (empty = preset).

| Preset | p1 | p2 | p3 | p4 |
|---|---|---|---|---|
| CAMPO FBM | scale 2.2 | drift radius 0.7 | warp 0.9 | contrast 1.4 |
| CÉLULAS | density 6 | cycles 1 | edge 0.4 | fill 0.3 |
| ANÉIS SDF | rings 9 | cycles 1 | thickness 0.35 | distortion 0.5 |
| FAIXAS | lines 14 | cycles 1 | duty 0.55 | glitch 0.5 |

**Custom GLSL contract** (WebGL 1, GLSL ES 1.00). Write only `void main(){…}` plus your own functions. Provided:

- uniforms: `vec2 uRes` · `float uPh` (loop phase 0→1, the seamless clock) · `uT` (seconds) · `uBeat` (beat index, wraps with the loop) · `uBp` (beat phase) · `uPulse` (beat envelope or audio) · `uAud` · `uAlpha` · `uSeed` · `vec3 uC1 uC2 uBg` · `vec4 uP` (= p1…p4)
- helpers: `hash(vec2)`, `noise(vec2)`, `fbm(vec2)`, `loopv(r)` (a point moving on a circle of radius r once per loop: use it to move through noise space seamlessly), `outc(color, coverage)` (writes alpha or opaque output), `TAU`
- loop rule: animate with `uPh` times whole numbers, or `loopv()`. Never use `uT` for motion that must loop.

### `image`, `video` — media (fixed slots)
`media` file name · `fit` `cover` (`contain` `fill` `none`) · `mirror` · `flip` · `cropL` `cropR` `cropT` `cropB` 0…0.49 · `anim` `none` (`pulse` `flash`) · `tint` `none` or color. Video adds `rate` 1 · `start` `end` (s) · `play` `loop` (`reverse` `pingpong` `sync` = stretch the clip over the loop).

### `shape` — vector forms (fixed slot)
`kind` `ring` (`circle` `square` `triangle` `line` `cross` `hex`) · `size` 160 · `count` 1 · `layout` `single` (`linear` `radial` `grid`) · `spread` 260 · `fill` false · `fillC` · `stroke` · `strokeW` 3 · `radius` 0 · `spin` 0 · `pulseAmt` 0.2 · `alt` false (accent walks across the shapes per division) · `hot`.

### `text` — typography (fixed slot)
`content` (multiline) · `font` `mono` (`helvetica` `archivo` `bebas` or imported) · `size` 96 · `weight` 700 · `tracking` 0.02 (em) · `leading` 1.05 · `align` `center` · `upper` true · `fill` true · `color` · `outline` 0 · `outlineC` · `shadow` 0 · `glow` 0 · `glowC` · `anim` `static` (`pulse` `scramble` `strobe` `marquee` `type`).

## Minimal composition example

```json
{ "name": "GOLPE", "hypothesis": "RITMO — a palavra troca a cada colcheia; quadrados marcam o contratempo.", "motion": "step",
  "layers": [
    { "type": "bg", "name": "FUNDO", "p": { "grain": 0 } },
    { "type": "typewall", "name": "PALAVRA", "p": { "words": "PRESSÃO|SINAL", "rows": 1, "div": "1/8" } },
    { "type": "shape", "name": "CONTRATEMPO", "p": { "kind": "square", "layout": "linear", "count": 16, "fill": true, "alt": true, "div": "1/8" } },
    { "type": "post", "name": "PÓS", "p": { "scan": 0, "prob": 0.5 } } ] }
```

Full worked projects: `examples/tecnofeudo-led-5120x500.json` (LED, custom GLSL, displays) and `examples/noite-filotaxia-1080p.json` in the repository.
