# Art direction: from brief to grammar to five compositions

Semiotics and composition theory are tools for decisions, not vocabulary for the summary. Every concept you name must change a parameter.

## Brief → grammar

Write the nine fields into `meta.grammar`. Each field is one sentence that a parameter can be checked against.

| Brief signal | Form | Motion | Rhythm | Density | Texture |
|---|---|---|---|---|---|
| minimalista, contemplativo, arquitetônico | few elements, planes, grids, one ring | slow, smooth, long cycles | events every 8–16 bars | low, negative space works | clean, faint grain |
| orgânico, hipnótico | fields, orbits, points, curves | smooth deformation, micro-variation | breathing in loop cycles | medium | grain, soft vignette |
| tecnológico, editorial | rulers, brackets, data, type | step (quantized to the beat) | data on 1/4 or 1/16 | medium-high | scanline (not on LED) |
| industrial, agressivo, club | blocks, bands, giant type | step, hard cuts | glitch on beat 1, events every 2–4 bars | high, one hero per bar | clean on LED, block glitch |
| caótico, energético | swarms, tunnels | fast, 1/8 and 1/16 divisions | constant variation by seed | high | glitch, displacement |

Example: "orgânico, tecnológico e hipnótico" is not "a pretty sphere". It is: organic forms, continuous deformation, slow movement, micro-variation, procedural noise, repetition, low event frequency, fluid transitions, and the contrast of a technological structure reading an organic behaviour. In engine terms: `organism` (smooth, breathe 1.2), `structure` + `measure` (step), `flow`, a `CAMPO FBM` shader at low opacity, event every 8 bars, fade transition.

## Hierarchy (every composition)

Define PRIMARY (one hero generator, opacity 1, may react to audio), SECONDARY (support, 0.5–0.9), TERTIARY (information: data, HUD, text), BACKGROUND (bg, field shaders). If two layers compete for attention, lower one's opacity or move it to a slower division.

## Color

Pick one system: monochrome, complementary, analogous, split complementary, limited. Expose it as `palette.bg / primary / secondary / accent`. Proportion: bg 70%, primary 15%, secondary 10%, accent 5%. Accent is an event, not a fill. Per-composition accent overrides go in `composition.palette.accent`.

## Five hypotheses

Default slots, each renamed from the brief's own words (never "Composition 1"):

| Slot | Visual hypothesis | Typical primary | Support |
|---|---|---|---|
| STRUCTURE | The system shows its skeleton | `lines`, `structure`, `shape` ring | `hud`, rare `event` |
| FLOW | Matter moves through a field, no cuts | `flow` or `organism` (smooth) | `shader` CAMPO FBM, low `post` |
| DENSITY | Controlled saturation, one hero | `tunnel` | `data`, diagonal `lines`, frequent `event` |
| RHYTHM | Typography or shape as instrument | `typewall` | `shape` on 1/8, `event` mode `word` |
| TRANSFORMATION | The piece changes state within the loop | `shader` (CÉLULAS, ANÉIS SDF, FAIXAS or custom GLSL) | `organism` + `measure`, `structure` |

The five must work alone and as a set (same palette, grammar, BPM, project). Variation comes from the brief, not from random parameters.

## Motion

Every movement has origin → development → resolution → repetition inside the loop. Interface moves in steps (`motion: "step"`), matter moves in curves (`"smooth"`). Continuous motion is expressed in whole cycles per loop (`scroll`, `cycles`, `spin`) so the loop closes. Use `div` to give layers different musical rates: 1/1 whole note … 1/16.

## Typography

Only when it carries meaning: event words, a typewall, a title. Check legibility at distance: LED and stage need size ≥ 24 px at canvas scale, heavy weights (`archivo`, `bebas`), tracking ≥ 0. Never add text to fill space.

## Transitions between compositions

`time.transition`: `cut`, `fade`, `wipe`, `glitch`, with `trBeats`. It must belong to the grammar: smooth grammars fade over 2–4 beats, industrial grammars glitch for 1 beat.

## Consistency check before delivery

Concept expresses the brief? Hierarchy present? Motion intentional? Rhythm tied to BPM? Color coherent? Every layer has a function? Output fits the surface? Plausible at 60 FPS?
