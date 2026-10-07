# Quality gates

Two tools: **gates** that must pass in order while building, and a **100-point score** per composition before delivery. Both come after the contact sheets have actually been looked at. "AAA" is not an adjective here; it means artistic (authored, specific, coherent DNA, deliberate hierarchy), technical (deterministic, target-native, layer-separated, exportable, editable) and production-ready (reproducible, documented, routable).

## Gates (in order)

1. **Brief.** Concept specific; target real and recorded in `meta.spec` (confirmed vs assumed, performer and occluded zones, viewing distances); constraints known; references translated into principles; the readback was confirmed or the assumptions printed.
2. **Concept.** Visual thesis unique; technique not chosen prematurely; semiotic intent explicit; contract written.
3. **Composition.** Hierarchy exists; negative space exists; aspect ratio intentional; typography optically corrected; safe areas and gutters respected.
4. **Motion.** Movement has a cause; timing has a hierarchy; variation without noise; the loop grammar is convincing.
5. **Technical.** Dimensions, fps, alpha, mapping correct; performance acceptable; transport claims accurate; project validates with no ERROR; **every shader reads the audio uniforms**.
5b. **Craft.** 6–10 visible layers per composition in tiers; every layer named for its job with a `role`; one coordinate system and module; opacity, weight and scale ladders; accent under 5% of the frame; step vs smooth clocks assigned; information quantised; events on bar boundaries (`craft-and-finish.md`).
6. **Set diversity.** The compositions differ in concept expression, topology, spatial behavior, motion, temporal structure and implementation.
7. **Anti-slop.** No generic noise wallpaper, glow as the main idea, default centre composition, uniform particle field, audio-reactive everything, random typography, identical easing everywhere, excessive post effects.
7b. **Perception and safety.** Far read survives the squint and greyscale tests; no flash above 3 per second over a large field, no red strobe, no global rotation on a room or dome; no repeating pattern with `v ≥ P/4` px per frame; no period near 2 pixels on LED (`perception-and-gestalt.md` §7).
8. **Authorship.** Does it answer this brief? Does it feel designed rather than sampled? Is there a recognizable authored logic? Would a working VJ use it?

## Score (per composition, 100 points)

| Dimension | Weight |
|---|---:|
| Concept / meaning | 20 |
| Composition / hierarchy | 15 |
| Motion / temporal quality | 15 |
| Target / surface fitness | 10 |
| Rendering / material | 10 |
| Loop / dramaturgy | 10 |
| Layer architecture / editability (6–10 tiered, named layers) | 5 |
| Audio relationship | 5 |
| Typography / detail | 5 |
| Novelty / authorship | 5 |

Score each dimension as a fraction of its weight, with one line of evidence (a frame, a bar number, a layer). Below 70 total, or below half of the weight in Concept, Composition, Motion or Target fit, requires another mutation cycle. Report the scores to the user with the evidence; do not hide a weak composition.

## Automatic reject

- wrong resolution; broken alpha; a loop that does not close when looping is required
- a copied or traced reference; five variations of one generator
- no visual inspection
- an unsupported transport claim (OSC, NDI, Spout, Syphon, SDI shown as native)
- non-deterministic output (`Math.random`, clocks, kept state)
- fewer than 5 visible layers besides background and finish, or layers left with default names (`SHADER`, `FORMA`, `TEXTO`)
- a shader that ignores `uBass/uMid/uHigh/uRms/uHit/uAud`, or a shader layer with audio response 0
- text, a face or a logo crossing a fold gutter
- hairlines, scanlines or small HUD on a wall or LED
- a physical target (`led`, `projection`, `mapping`, `multi`) with no `meta.spec`, or a spec that disagrees with the canvas
- a flash above 3 per second over a large field, or an aliasing pattern
- a loop with a visible seam (`scripts/loop_check.mjs` names the layer)
- a recipe from `recipes/` shipped unchanged (no new name, role, numbers, palette roles or audio mapping)

## Mutation order

When a score is low, change things in this order and never begin with hue, speed or scale: concept → semiotic intent → temporal structure → topology → spatial system → motion → technique → material → composition → parameters. Record each round in the direction document.

## Self-critique questions (for `/vj-critique`)

Does it communicate the briefing and the concept? Is the semiotic intent readable? Is the composition intentional, with hierarchy? Is the motion meaningful, the temporal structure and loop convincing? Is the visual language coherent? Does the technique overpower the concept? Does it look like a preset, or like a previous output? Would a motion designer call the movement intentional, and a VJ call it useful in a set? Does it have authorship? The long V3 form is in `knowledge/visual-dna-diversity-critique.md` §44.

## Evaluation harness

`evals/` in the repository holds golden prompts (ultra-wide LED, mapped façade, kinetic type, 8-bar audio loop, reference transformation, technique restraint) and a rubric. Run the same prompt twice and compare architecture, visual hypotheses and parameter reuse; a regression is two different briefs converging on the same composition grammar.
