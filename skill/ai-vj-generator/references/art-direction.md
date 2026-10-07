# Art direction: from brief to grammar to compositions

Semiotics and composition theory are tools for decisions, not vocabulary for the summary. Every concept you name must change a parameter.

Deeper repertoire lives in `repertoire/` (see `repertoire/index.md`): art history, Swiss design and grids, color theory, animation principles, kinetic typography, generative and code art, patterns with ready GLSL recipes, artists/VJs/studios, and libraries with licenses.

## Brief → grammar

The table is a set of tendencies to test against the briefing, not recipes. If the briefing contradicts a row, the briefing wins.

Write the nine fields into `meta.grammar`. Each field is one sentence that a parameter can be checked against.

| Brief signal | Form | Motion | Rhythm | Density | Texture |
|---|---|---|---|---|---|
| minimalista, contemplativo, arquitetônico | few elements, planes, grids, one ring | slow, smooth, long cycles | events every 8–16 bars (with a 4-bar loop: once per loop, or none) | low, negative space works | clean, faint grain |
| orgânico, hipnótico | fields, orbits, points, curves | smooth deformation, micro-variation | breathing in loop cycles | medium | grain, soft vignette |
| tecnológico, editorial | rulers, brackets, data, type | step (quantized to the beat) | data on 1/4 or 1/16 | medium-high | scanline (not on LED) |
| industrial, agressivo, club | blocks, bands, giant type | step, hard cuts | glitch on beat 1, events every 2–4 bars | high, one hero per bar | clean on LED, block glitch |
| caótico, energético | swarms, tunnels | fast, 1/8 and 1/16 divisions | constant variation by seed | high | glitch, displacement |

Example: "orgânico, tecnológico e hipnótico" is not "a pretty sphere". It is: organic forms, continuous deformation, slow movement, micro-variation, procedural noise, repetition, low event frequency, fluid transitions, and the contrast of a technological structure reading an organic behaviour. In engine terms: `organism` (smooth, breathe 1.2), `structure` + `measure` (step), `flow`, a `CAMPO FBM` shader at low opacity, event every 8 bars, fade transition.

## Hierarchy (every composition)

Define PRIMARY (one hero generator, opacity 1, may react to audio), SECONDARY (support, 0.5–0.9), TERTIARY (information: data, HUD, text), BACKGROUND (bg, field shaders). If two layers compete for attention, lower one's opacity or move it to a slower division.

## Color

Pick one system: monochrome, complementary, analogous, split complementary, limited. Expose it as `palette.bg / primary / secondary / accent`. Proportion: bg 70%, primary 15%, secondary 10%, accent 5%. Accent is an event, not a fill. Per-composition accent overrides go in `composition.palette.accent`.

## Hypotheses (derived, never a template)

Write 3–5 conceptually distinct hypotheses **from this briefing's idea**. Name each from the briefing's own words. Each one needs: a one-sentence rule (what the system does), the principle it tests (animation, semiotic, compositional), its own topology and technique, and a hierarchy (hero, support, atmosphere).

How to diverge, in order of strength (`knowledge/visual-dna-diversity-critique.md` §41): different idea → different animation principle → different grammar → different system → different implementation. Changing parameters or colors does not count.

A useful way to find them: take the briefing's central tension and push it along different axes, for example *matter vs. measurement*, *growth vs. decay*, *one vs. many*, *signal vs. noise*, *surface vs. depth*, *order vs. rupture*. Each axis suggests a different behavior, which suggests a different technique.

The set must work alone and together (same palette, grammar and project) while arguing differently. There is no standard list of compositions, no default order and no default count: the briefing and the music's structure decide.

## Motion

Every movement has origin → development → resolution → repetition inside the loop. Interface moves in steps (`motion: "step"`), matter moves in curves (`"smooth"`). Continuous motion is expressed in whole cycles per loop (`scroll`, `cycles`, `spin`) so the loop closes. Use `div` to give layers different musical rates: 1/1 whole note … 1/16.

## Typography

Only when it carries meaning: event words, a typewall, a title. Check legibility at distance: LED and stage need size ≥ 24 px at canvas scale, heavy weights (`archivo`, `bebas`), tracking ≥ 0. Never add text to fill space.

## Surfaces with folds

When the map is several planes, the fold is the first fact of the composition. Treat each wall as its own frame and the fold as the axis they answer to.

- **Hierarchy per wall:** one figure per wall at 100%, support at 72%, field at 43%. Two walls can say the same thing (mirror), complete a sentence (A then B), or oppose (before / after); decide which and let the beat show it.
- **Scale:** the figure is at least a third of the height. What reads at the viewing distance is a block, not a line.
- **Alignment:** a grid in cells of 60 or 120 units, anchored at the fold (`wall.near`), so the same fraction means the same place on both sides.
- **Text stays in one wall.** Lines, fields and wipes may cross: that crossing is how the surface reads as one object.
- **Glitch is blocks** the size of a cell, on the beat; never noise, never a hairline.

Details and the kit: `walls-code-assets.md`.

## Transitions between compositions

`time.transition`: `cut`, `fade`, `wipe`, `glitch`, with `trBeats`. It must belong to the grammar: smooth grammars fade over 2–4 beats, industrial grammars glitch for 1 beat.

## Consistency check before delivery

Concept expresses the brief? Hierarchy present? Motion intentional? Rhythm tied to BPM? Color coherent? Every layer has a function? Output fits the surface? Plausible at 60 FPS?
