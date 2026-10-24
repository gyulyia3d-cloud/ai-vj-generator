# Structural evaluator

`node scripts/evaluate.mjs project.aivj.json [--min 75] [--json] [--out report.md] [--lang pt|en]`

It renders real frames with the engine (24 frames across the loop, per composition), measures seven things and prints a 0-100 score with a sentence for each. It needs Chrome or Edge (the same headless browser as `contact_sheet.mjs`) and Node 22+.

**What the score means.** A high score means *no structural defect*: there is a hero, it contrasts, there is empty space, it moves, it builds, and it is not a copy of its sibling. It does **not** mean the piece is beautiful, original or right for the client. Look at the contact sheets; a 95 can still be boring. A low score is almost always a real problem worth fixing.

## The seven measures and their weights

| Measure (weight) | How it is measured | What a low score tells you |
|---|---|---|
| `hierarchy` (20) | 60%: how much of the image energy sits in the top 10% of a 16x9 grid (one dominant region = good; flat = no centre; one lone spot = no context). 40%: how many drawing layers have opacity >= 0.85 (1-3 is good) | competing centres, or everything at 100% |
| `contrast` (15) | the 99th-percentile luminance distance from the ground colour, brightest frame | the figure does not separate from the ground |
| `density` (10) | fraction of pixels more than 12% away from the ground, averaged over the loop, against the band declared by `meta.artBible.density` | nearly empty, or nearly full |
| `breathing` (15) | fraction of grid cells with no figure (mean ink under 10%) | no rest area; or so much that the piece feels absent |
| `motion` (15) | mean frame-to-frame change on block-averaged ink (the background grain is switched off for the measurement), including the seam from last frame to first; share of frozen frames | frozen, frantic, long stills, or a pop at the loop seam |
| `arc` (15) | range of mean ink over the loop and where its peak falls | flat energy; no build and release |
| `repetition` (10) | correlation of the energy map with the most similar sibling composition | two compositions that look alike |

Bands (full score inside the inner numbers, zero outside the outer ones, smooth in between): coverage `sparse` 3-22% (zero under 0.3% or over 60%), `balanced` (default) 10-40% (zero under 1% or over 80%), `dense` 15-60% (zero under 4% or over 95%); rest area `sparse` 40-97% (zero under 15%), `balanced` 20-65% (zero at 0% and above 97%), `dense` 5-50% (zero above 90%). Motion: full score from 0.4% to 10% mean change per sample, zero under 0.05% or over 30%.

## Honest limits

- It sees only what the engine renders at about 240 px wide per frame. Fine detail (hairlines, small dust) is under-measured: that is deliberate, because it is also invisible at distance.
- `repetition` compares composition against composition inside one project, not against anything outside it. Use `seed_census.mjs` for seed sensitivity.
- `motion` ignores audio: it measures the synthetic, BPM-locked bands. A live-audio set will move more.
- Thresholds were set by hand against 24 compositions of the gallery plus hand-made bad projects (`scripts/evaluate_check.mjs`: empty, full, still, duplicated, flat hierarchy must all fail on the right measure). Treat them as a first calibration, not a standard.
- The generator was tuned until the gallery passed 75. That is a fair use of the tool (it found real defects: bit fields filling half the frame, stripes with no gaps, hairline dust heroes) but it also means the gallery is not an independent test of the evaluator; the negative controls are.

## Using it in the workflow

1. After `brief_to_project.py` or an AI-written project: run it. Any measure under 60 comes with the sentence to act on.
2. Fix the weakest measure first, re-run. Do not chase 100.
3. Then open the contact sheet and the engine. The art bible (`art-bible.md`) is what you compare against by eye.
4. `--min 75` returns exit code 1 if a composition is below it, for scripts and CI. `gallery.mjs --check` does this for the eight gallery briefs.


# Critique (phase 15): three separate judgements and the critical failures

`node scripts/critique.mjs project.aivj.json [--json] [--out report.md] [--lang pt|en] [--strict] [--no-flash]` (browser function: `AIVJ.critique(lang, {flash})`).

It reuses the evaluator's frames (one measurement) and reports, per composition, three axes that are **never merged into one number**:

| Axis | Question | Source |
|---|---|---|
| STRUCTURAL | is there a structural defect? | the seven measures above, unchanged |
| ARTISTIC | does the piece do what it declared it would do? | measured frames against `project.palette`, `meta.compositionIR` (`focalPoint`, `negativeSpace`, `temporal.phases[].density`) |
| TECHNICAL | does it render and export without defect? | determinism (same frame before and after another one), layer and shader errors, flash (WCAG 2.3.1 general criterion), export validation, loop seam, even dimensions |

**Artistic items** (each 0-100, only when the intent exists): `palette` (share of the ink that sits on a segment ground-to-palette-colour), `focal` (distance from the centroid of the `role: hero` layers to `focalPoint`), `negative` (ink density of the figures, ground field excluded, inside the declared empty regions against the frame average; 100% means it ignored them), `arc` (correlation between measured coverage and the declared phase density curve). What is not declared is **not judged** (score `null`, not 100), and the report says how many items were judged. What only an eye can decide (`artBible.banned`, `contract.forbiddenShortcuts`) is listed under `needsEye` with no score.

**Critical failures** reject a composition whatever its scores: `EMPTY`, `FROZEN` (unless every drawing layer declares `still` or `hold`), `SEAM_POP`, `NONDETERMINISTIC`, `LAYER_ERROR`, `FLASH_HAZARD` (over 3 per second), `EXPORT_BLOCKER`, `PALETTE_IGNORED` (under 25% of the ink in the palette), `NEGATIVE_SPACE_FILLED` (figure ink density in the declared empty regions above the frame average), `FOCUS_LOST` (hero more than 50% of the frame from the focal point). Verdict: `FAIL` with any of them; `REVIEW` when a judged axis is under 60; else `PASS`. The exit code is 1 on `FAIL` (and on `REVIEW` with `--strict`).

**Honest limits.** The artistic axis checks adherence to the *declared* intent, not taste: a project that declares a bad intent can pass. Flash analysis is the general criterion on mean luminance; saturated-red flashes are not measured and this is not a certification. `arc` compares coverage, not colour or motion. The checks were set by hand against fabricated defects (`scripts/critique_check.mjs`) and the eight gallery briefs; the gallery itself has real findings (see the changelog), so it is not a clean reference.
