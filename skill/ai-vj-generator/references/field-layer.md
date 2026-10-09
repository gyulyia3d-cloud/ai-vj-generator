# Fields, topologies, typography and images as sources (Phase 8)

Two layer types draw from a **field**: a number between 0 and 1 at every point of the frame. The field is noise that walks a closed circle once per loop, or the brightness of an image of the project. The same rule draws either, so changing the source changes the piece without changing the grammar.

## `field` (GPU, shader mode)
`p.kind` is the rule. `p.p1..p4` mean different things per rule (the inspector shows the labels). `p.gain` is the contrast of the field (1 = as it is; it is the parameter the Animation IR plays on). `p.invert` flips the field. `p.media` is the image that becomes the field (empty = noise); `p.fit` is `cover`, `contain` or `fill`. `c1` is the colour of low values, `c2` of high ones. `alphaMode` `alpha` draws strokes on transparent, `opaque` over the background colour; `res` is the internal resolution.

| rule | what it draws | p1 / p2 / p3 / p4 |
|---|---|---|
| `ISOLINHAS` | contour lines of the field, like a map | scale · levels · thickness · drift |
| `CORRENTES` | flow lines: threads that follow the field's perpendicular gradient | scale · thread length · thread density · drift |
| `CELULAS` | Voronoi cells, edges, filled or mosaic | density · mode (0 edges, 1 filled, 2 mosaic) · edge · cycles |
| `TRUCHET` | quarter-arc tiles; the field decides each tile's orientation | tiles · threshold · thickness · threshold sweep |
| `PONTOS` | offset lattice of dots sized by the field | density · min radius · max radius · row wave |
| `MOIRE` | two gratings at a small angle, bent by the field | frequency · angle (deg) · distortion · turns per loop |
| `METABOLAS` | smooth union of orbiting circles | bodies · smoothness · radius · orbits per loop |
| `INTERFERENCIA` | waves from several sources | sources · frequency · contrast · phase cycles |
| `PONTILHADO` | halftone dots on a rotated grid, radius = field | columns · gain · grid angle · softness |
| `RELEVO` | stacked lines lifted by the field (ridge plot) | lines · height · thickness · drift |
| `GRADE DEFORMADA` | a square grid warped by the field | cells · warp · thickness · drift |
| `POLAR` | spiral arms and rings bent by the field | arms · twist · rings · turns per loop |

Whole numbers (`turns`, `cycles`, `orbits`) are rounded, so every rule closes the loop. Audio enters through thickness and size (`uBass`, `uHit`), not through the shape of the field.

**Image as source.** Put an image in the project (`assets`, kind `image`) and set `p.media` to its name. `PONTILHADO`, `PONTOS`, `ISOLINHAS`, `TRUCHET`, `RELEVO`, `CELULAS` and the rest then read its brightness. The image is fitted to the frame with `p.fit`; outside it the field is 0. Videos are not sources (their frame depends on the clock). If `p.media` names an image that is not loaded the engine reports an error.

## `glyphs` (canvas 2D, generative typography)
A grid of characters. Each cell asks the field for a value and takes the character at that position of `p.ramp` (a string from emptiest to fullest; a space draws nothing). The colour goes from `c1` (low) to `c2` (high).

- `p.source`: `noise`, `radial`, `wave`, `spiral` or `image` (with `p.media`).
- `p.cell`: cell size in px at 1080 high (the grid is capped at 40 000 cells). `p.font`, `p.weight`.
- `p.scale` (field scale), `p.cycles` (whole turns per loop), `p.gain` (contrast), `p.invert`.
- `p.shuffle`: 0 to 1, jitters the chosen character in 8 steps per loop (deterministic: a function of the cell and the step).
- The generator writes the brief title as the ramp (` ` plus its letters without repeats), so the typography says the title's own letters.

## Where the generators pick them
The Creative IR knows `field` and `glyphs` as hero types (`registry/creative.json`, `heroTypes` and the `families` weights of the verbs). `fieldKinds` and `glyphSources` map each of the 32 verbs to a rule and a field: `drift`, `flow`, `trace` ask for `CORRENTES`; `oscillate`, `compress` for `MOIRE`; `hesitate`, `fragment`, `assemble` for `TRUCHET`; `dissolve` for `PONTILHADO`; and so on. The Animation IR plays its archetype on `gain`.

## Limits
Rules are one pass; there is no state between frames (the temporal layer does that). The field of an image is its luminance only; colour, edges and depth are not fields yet. `field` fills the frame: it is not moved by the Composition IR. On LED walls use `res` 0.5 and thick strokes.
