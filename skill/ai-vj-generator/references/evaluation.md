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
