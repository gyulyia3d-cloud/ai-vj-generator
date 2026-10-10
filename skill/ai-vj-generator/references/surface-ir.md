# Surface IR

What is known about the surface, how sure we are, and what that forces on the composition. The surface is **input, constraint and context**: never a 3D environment and never mapping. It sits beside the Creative IR: the Composition IR reads it to decide where things may go.

Compiled by `scripts/surface_ir.py` (Python) and `app/surface-ir.js` (browser) from the same data, `registry/surface.json`; both give the same IR (`surface_ir_check.mjs`). One IR per project, stored in `meta.surfaceIR`. Run `python scripts/surface_ir.py project.json [regions.csv]` to read it.

## Input
`brief.surface` (or the project's `canvas` and `meta.spec.confirmed`): `w`, `h`, `folds` (x of physical corners, px), `regions` (`{name,x,y,w,h,source}` in canvas pixels; `source: "mask"` when they were measured on an image), `pitchMm`, `viewingDistanceM` ([nearest, farthest]). Only `w` and `h` are required.

## The four confidences
Every fact carries one:

| Confidence | Meaning | Example |
|---|---|---|
| `EXPLICIT` | declared by the author, or exact arithmetic on what was declared | size, aspect, folds, regions from a CSV, pitch, distance |
| `DETECTED` | measured on a shape the author delivered | regions from a PNG mask; layout, symmetry and active share of the regions |
| `INFERRED` | a rule-based guess; may be wrong | one wall when no fold is declared; the reading axis; the smallest legible text (a rule of thumb) |
| `UNKNOWN` | the datum is missing and no honest rule exists | layout with no regions; legibility with no pitch. Its `value` is `null`: **never guess** |

## Strength follows confidence
`hard` constraints exist only for `EXPLICIT` and `DETECTED` facts: the Composition IR obeys them. `INFERRED` facts only advise (`soft`). `UNKNOWN` restricts nothing. The validator refuses a hard constraint built on an INFERRED fact and an UNKNOWN fact that carries a value.

## What an IR holds
`canvas` · `facts` (id, value, confidence, basis) · `walls` (between folds, 0..1) · `regions` (count, source, activeShare, bbox, layout: single/row/column/grid/scattered, symmetry h and v) · `grid` (8x8 coverage of the regions, 0..1) · `constraints` · `unknowns` (what to ask the author) · `summary` (facts per confidence).

Constraints: `activeArea` (hard when regions are given: the centre of each zone sits on a cell with coverage >= 0.5), `foldBands` (hard when folds are declared: a 2.4% band around each fold that no zone straddles; text keeps 6% away), `safeArea` (the bounding box of the regions, inset; the default 5% margin when there are none), `readingAxis` and `legibility` (soft advice).

## Applied to the composition
When a hard constraint exists, `compile_composition` moves the hero, the secondary and the support zone (and the text anchor) so they obey it, writes the fold seams into `negativeSpace`, replaces `safeAreas`, and records what it did in `compositionIR[i].surface` (`hard`, `adjusted`). With no folds and no regions nothing moves and the field is absent: a surface with only a size, a pitch and a distance gives the same composition as before.

## Open questions
`unknowns` always lists what a 2D image cannot say (depth/relief, curvature, ambient light, finish) and, when missing, the pitch, the farthest distance and the regions, each with the question to ask. The Surface tab shows facts, confidences, constraints and questions.

## Limits
Regions are rectangles (a mask becomes the bounding boxes of its connected parts). The coverage grid is 8x8: a zone is placed by its centre, not clipped to the region. Symmetry and layout are measured on the regions, not on the content. Legibility numbers are planning rules of thumb. Nothing here generates a pixel map, mapping or any output file.
