# Swiss design, grids and typographic hierarchy

The International Typographic Style (Switzerland, 1950s–60s) is the most useful design system for live visuals: it was built for legibility at a distance, objective information and rhythm on a grid.

## People and texts worth knowing

| Who | Contribution | Use it for |
|---|---|---|
| Josef Müller-Brockmann | *Grid Systems in Graphic Design* (1981); Tonhalle concert posters, where geometric rhythm stands for music | Music made visible as grid rhythm; modular layouts |
| Armin Hofmann, Emil Ruder (Basel School; Ruder's *Typographie*, 1967) | Contrast of form and counter-form; typography as rhythm of black and white | Weight contrast, negative space as active shape |
| Karl Gerstner | *Designing Programmes* (1964): design as a program of rules, not a single solution | The direct ancestor of generative design: the seed and the rules are the design |
| Max Bill | Concrete art and design from mathematical structure | Progressions, modular systems |
| Max Miedinger / Eduard Hoffmann; Adrian Frutiger | Helvetica (1957); Univers (1957) as a systematic family | Neutral grotesque type; weight families as hierarchy |
| Wolfgang Weingart | Swiss "new wave" (1970s): breaking the grid deliberately, layering, texture | Controlled rupture: the grid exists so it can be broken on the drop |

## Principles → engine

| Principle | What it means | Engine |
|---|---|---|
| **Grid first** | Every element aligns to columns, rows or a module | `structure` `grid` value as the module; place `shape`/`text` with `x`/`y` at multiples of it |
| **Asymmetric balance** | Weight on one side, balanced by space on the other | Hero at `cx` 0.62 (as in STANDARD) or a third; never centered unless the concept needs stillness |
| **Objective typography** | Grotesque sans, flush left, ragged right, no ornament | `text` font `helvetica` or `mono`, `align: left`, `upper` true, tracking 0–0.02 |
| **Hierarchy by scale and weight, not color** | Big/small, bold/light do the work | One giant word (`typewall` rows 1–2) + small technical labels (`hud`, `data` `ui` 1); color reserved for the event |
| **Negative space** | Empty area is a compositional element | Keep ≥ 40% of the frame empty in STRUCTURE compositions |
| **Rhythm** | Repetition of intervals, like a score | `lines` count = beats per bar × n; `div` matching the musical subdivision |
| **Programme, not solution** (Gerstner) | Define rules; outputs are variations | Composition = rules; seed = instance; show the same rules with two seeds as A/B |

## Grids for screens and walls

| Grid | Use | Canvas recipe |
|---|---|---|
| 12 / 8 / 4 columns | Editorial, HUD, data | 1920×1080: 120 px module (STANDARD `structure.grid` 120) |
| Modular (columns × rows) | Posters, data walls | Module = canvas height / 9 for 16:9; place type on row lines |
| Baseline | Long text, credits | `text` `leading` locked to the module |
| Radial / polar | Organic, hypnotic, centered stillness | `shape` layout radial, `tunnel`, `organism` |
| Golden section (φ 1.618) | Classic proportion; STANDARD uses it in the spiral | Hero at 0.618 of the width (`cx` 0.62) |
| Wide-wall grid (≥ 4:1) | LED strips, L-walls | Divide by walls first (`displays`), then 4–8 columns per wall; one idea per wall, rhythm across walls |
| Vertical (9:16) | Totems, phone, DOOH portrait | Stack in thirds; type horizontal, large; avoid wide `typewall` rows (use `rows` 6–10) |

## Swiss poster as a VJ composition

A Müller-Brockmann-style composition is a program: black ground; a field of concentric or diagonal shapes on a modular grid (rhythm); one block of small, flush-left type in a corner (information); one accent color. In the engine: `bg` black + `tunnel` or `shape` grid + `text` small left-aligned with real event information + `palette.accent` used only by the event. Animation: the shapes step on the beat, the type stays still. Stillness of type against motion of form is the hierarchy.
