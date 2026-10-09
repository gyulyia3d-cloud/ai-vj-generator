# Composition IR

Where things go, how much room they take, where nothing goes, and how that changes over the loop. It sits between the Creative IR (what the piece is about) and the generators (what draws it). The same generators with another composition look like another piece.

Compiled by `scripts/composition_ir.py` (Python) and `app/composition.js` (browser) from the same data, `registry/composition.json`; both give the same IR (`composition_check.mjs`). One IR per composition, stored in `meta.compositionIR` (a list, same order as `compositions`).

## What an IR holds
`grammar` and `grammarSet` · `canvas` (size, aspect, orientation) · `hierarchy` (primary hero, secondary structure, tertiary ground) · `zones` (hero, secondary, support, background; rectangles in 0..1) · `negativeSpace` (where NOT to place anything) · `focalPoint` · `visualMass` (shares of hero, secondary, support) · `balance` (type and centre of mass) · `alignment` · `movementAxis` (x, y, diag, radial) · `densityMap` (3x3) · `scaleHierarchy` · `depthHierarchy` (foreground, midground, background; used by the 2.5D phase) · `safeAreas` · `edgeBehavior` (contain or bleed) · `textAnchor` · `temporal` (the five phases).

## Spatial grammar
Twelve grammars, none a rigid preset: centered, offset, diagonal, radial, horizontal, vertical, distributed, clustered, asymmetric, symmetrical, hierarchical, edge-driven. Zone sizes are fractions of the *short side*, so a figure is never stretched to the aspect ratio: a 4500x800 wall gets a figure 800 px tall, placed where the grammar says.

The grammar of each composition is chosen by two votes: the shape of the surface (ultrawide asks for horizontal, offset, edge-driven; tall asks for vertical and hierarchical; and so on) and the Creative IR verbs (compress asks for centered and radial, drift for horizontal, fracture for diagonal...). The surface wins the first slot, the concept shapes the rest of the set, and composition `i` takes slot `i`, so a set of three uses three different grammars.

## Applied to the layers (only when the Creative IR drives)
- hero (`tunnel`, `shape`, `organism`): `x`, `y`, `sx`, `sy`. Other hero types fill the frame by nature and are not moved; `lines` take their direction from the movement axis.
- structure (`tunnel`, `shape`): the secondary zone, a smaller scale. Lines: direction.
- instrument: `cx`, `cy` at the support zone. Typography (`typeset`): `cx`, `cy`, `align` from the text anchor.
- five phases, played as `env` modulation on the hero: establish, develop, transform, peak, release change scale (`sx`, `sy`), contrast, motion (`speed`), rotation and density (`count`). The profile comes from the arc of the Creative IR (pressure, emerge, erode, drift, cycle). The loop closes: the last phase blends back into the first.

When the Creative IR does not drive (mood only), the IR is recorded and no layer is moved.

## The `env` modulation shape
`layer.mod[]`: `{ "k": "sx", "src": "lfo", "shape": "env", "cycles": 1, "keys": [0, 0.3, 0.6, 1, 0.4], "min": 0.84, "max": 1.22, "mode": "mul" }`. `keys` are the values at the start of each phase (0..1, at least 2); between them the curve eases, and the last key blends back into the first. `cycles` must be a whole number.

## Limits
Only the three figure types are placed; the rest of the placement happens through structure, instrument and text. Contrast, rotation and motion per phase are small deliberate shifts, not a camera. Depth is recorded and used by the 2.5D phase.
