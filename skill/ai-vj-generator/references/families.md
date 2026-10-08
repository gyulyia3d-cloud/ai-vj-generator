# Families

Generated from `families.json` by `python scripts/families.py markdown --write`. Families group the engine's generators, recipes and GLSL modules by what they do in a composition. `python scripts/families.py check` proves the manifest matches the engine. Cost classes come from `node scripts/layer_cost.mjs --write` (ms per frame above an empty frame, 1920x1080 at half resolution, software rendering on the author's machine; low < 8, medium < 20, high >= 20). Items that need media, run your own code or are not a layer say `unmeasured`. Absolute numbers depend on the machine, the order does not. Everything here is the project's own code; ideas from other projects are concepts only (repo-analysis.md).

## ground

the quiet matter everything else is read against.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `bg` | generator | flat colour of the piece | any | low | stable | The quiet reference; grain only on screens, never on LED. |
| `shader` | generator | GLSL field: slow matter or a hero field | any | high | stable | Every shader reads the audio bus; keep fills low when it is a ground. |
| `sim` | generator | reaction-diffusion or ink, baked in a loop | any | high | stable | The first frame bakes the loop (about 1.4 s measured in headless software rendering; cached after that); raise `threshold` so it leaves empty space. |
| `flow` | generator | particles in a field | screen, projection, mapping | medium | stable | Needs width of 2 or more to survive distance. |

## figure

the single dominant thing a composition is about.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `organism` | generator | point-cloud form with spin and breath | screen, projection, mapping, multi | medium | stable | Dot of 2 or more; fine dust vanishes at distance. |
| `tunnel` | generator | concentric forms with perspective | any | medium | stable | The default hero for a wall; heavy stroke on LED. |
| `shape` | generator | single or repeated primitive | any | low | stable | The cleanest way to make one dominant figure. |
| `lines` | generator | stripe field, stepped or smooth | any | low | stable | Cover under 10% of the frame as a hero, or nothing is left to breathe. |
| `typewall` | generator | words as a wall | any | medium | stable | Exact words only. |
| `pixeltext` | generator | wall-aware pixel type | led, multi | medium | stable | Respects fold gutters. |
| `symbols` | generator | wall-aware symbols | led, multi | medium | stable | Respects fold gutters. |
| `hazard` | generator | hazard stripes and warning forms | led, multi | low | stable | Respects fold gutters. |
| `blocks` | generator | large block glitch | led, multi | low | stable | Respects fold gutters. |
| `logo` | generator | white mask of a supplied logo | any | unmeasured | stable | Needs an asset in `assets/logos/`. |
| `model` | generator | 3D object (.obj .glb .stl) | screen, projection, mapping | unmeasured | beta | Rasterised on canvas 2D; shader, wireframe or points. |
| `splat` | generator | Gaussian splat or point cloud (.ply) | screen, projection | unmeasured | beta | Isotropic approximation; keep under 15000 points live. |
| `parallax` | generator | depth-banded still (2.5D) | screen, projection | unmeasured | beta | The model-based depth path was never tested here; a depth map you supply is fine. |
| `image` | generator | still image | any | unmeasured | stable | Import in the Media tab. |
| `video` | generator | video clip | screen, projection, mapping | unmeasured | stable | Import in the Media tab. |

## structure

grid, rhythm and texture that measure the figure.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `structure` | generator | grid and rulers | any | low | stable | The measure the eye reads the hero against. |
| `bitfield` | generator | bitwise cell field | any | medium | stable | Fills about half the frame by nature: use at 10-20% opacity as texture, never as the hero. |

## information

type, instruments and data: what the viewer reads.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `measure` | generator | tracking and measurement overlay | any | low | stable | Reads as data, not as image. |
| `instrument` | generator | spectrum, scope, radar, rings tied to the real signal | any | low | stable | Cause and effect: shows what drives the picture. |
| `data` | generator | logs and telemetry | screen, led | low | stable | Small, calm, always in the same place. |
| `hud` | generator | frame, title and clock | screen, led | medium | stable | Tells the viewer the system is alive. |
| `event` | generator | one-off marks on hits | any | low | stable | Use once per composition. |
| `text` | generator | free text | any | medium | stable | Prefer `typeset` when there is more than one level. |
| `typeset` | generator | title, caption and data as one hierarchy; reveal by glyph or word; text on a path | any | medium | stable | Hidden at both ends of the loop, so it closes. |

## finish

the last pass: vignette, scanlines, dither, LED emulation.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `post` | generator | vignette, scanlines, glitch | any | low | stable | Scanlines only on screens. |
| `dither` | GLSL | GLSL module (#include dither) | any | unmeasured | stable | Written from scratch for this project. |
| `post` | GLSL | GLSL module (#include post) | any | unmeasured | stable | Written from scratch for this project. |
| `led` | GLSL | GLSL module (#include led) | any | unmeasured | stable | Written from scratch for this project. |

## math

equation-driven forms and recipes.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `code` | generator | custom drawing code with the kit K | any | unmeasured | stable | Not a sandbox: lint plus per-project authorisation. |
| `superformula` | recipe | Superformula contours | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `clifford` | recipe | Clifford attractor cloud | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `pendulum-wave` | recipe | Pendulum wave | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `wave-interference` | recipe | Wave interference dot field | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `spirograph` | recipe | Spirograph family with a tracing head | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `kepler` | recipe | Kepler orbits | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `stagger-grid` | recipe | Radial stagger grid | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `chladni` | recipe | Chladni figures | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `quasicrystal` | recipe | Quasicrystal | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `domain-coloring` | recipe | Domain colouring of a rational function | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `julia-orbit` | recipe | Julia set on an orbit | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |
| `testcard` | recipe | Test cards for the site | any | unmeasured | stable | Tested starting move; change numbers, palette roles and audio mapping. |

## noise

GLSL noise toolbox.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `hash` | GLSL | GLSL module (#include hash) | any | unmeasured | stable | Written from scratch for this project. |
| `noise.simplex` | GLSL | GLSL module (#include noise.simplex) | any | unmeasured | stable | Written from scratch for this project. |
| `noise.cell` | GLSL | GLSL module (#include noise.cell) | any | unmeasured | stable | Written from scratch for this project. |

## form

GLSL distance fields, raymarching and spatial helpers.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `sdf2d` | GLSL | GLSL module (#include sdf2d) | any | unmeasured | stable | Written from scratch for this project. |
| `sdf3d` | GLSL | GLSL module (#include sdf3d) | any | unmeasured | stable | Written from scratch for this project. |
| `raymarch` | GLSL | GLSL module (#include raymarch) | any | unmeasured | stable | Written from scratch for this project. |
| `space` | GLSL | GLSL module (#include space) | any | unmeasured | stable | Written from scratch for this project. |

## colour

GLSL colour spaces and tone mapping.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `color` | GLSL | GLSL module (#include color) | any | unmeasured | stable | Written from scratch for this project. |

## motion

GLSL easing.

| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |
|---|---|---|---|---|---|---|
| `easing` | GLSL | GLSL module (#include easing) | any | unmeasured | stable | Written from scratch for this project. |
