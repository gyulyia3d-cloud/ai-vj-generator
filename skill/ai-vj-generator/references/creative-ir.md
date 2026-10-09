# Creative IR

The plan between the briefing and the generators. It exists so that the technique is a consequence of the intention: *concept, behaviour, composition, material and time first; mood second*.

```
brief -> requirements -> concept -> visual verbs -> motifs -> composition strategy -> animation strategy -> generator families -> parameter ranges
```
Compiled by `scripts/creative_ir.py` (Python) and `app/creative.js` (browser) from the same data, `registry/creative.json`. Both give the same IR (`creative_check.mjs`). The result is stored in `meta.creativeIR`.

## Data (`registry/creative.json`)
- **32 verbs**: grow, contract, accumulate, fracture, drift, orbit, breathe, pulse, erode, bloom, collapse, stretch, fold, scatter, converge, oscillate, morph, repel, attract, trace, flow, hesitate, freeze, release, compress, expand, fragment, assemble, dissolve, emerge, sink, rise. A verb is a behaviour, not a preset: it states its geometry, motion, spatial behaviour, temporal behaviour, density, audio role, transition, material and composition, plus the generator families that can express it, ground shaders, structure types, motion axes, a density factor and an arc.
- **16 concepts** (decay, emergence, containment, memory, flow, fracture, order, chaos, ascent, descent, cycle, silence, expansion, connection, signal, body): keyword stems in Portuguese and English, each pointing to weighted verbs.
- **Mood weights**: each of the 12 moods adds a little to a few verbs.
- **5 arcs** (pressure, emerge, erode, drift, cycle): the names and energy of the compositions of a set.

## How it decides
1. Concept: stems found in `concept` and `focalEvent` score the concepts (at most 3 per concept).
2. Verbs: concept score x verb weight x 3, plus 20 for each verb the author lists in `brief.verbs`, plus the mood weights. The four best verbs are kept.
3. From those verbs: generator types (hero, structure), ground shaders, motion axes (weighted mean), density, scale, motifs, arc, and the sentences for spatial, temporal and material behaviour, audio role and composition.
4. `drives`: true when a concept matched or verbs were listed. Then the IR chooses the hero, structure and ground of each composition, scales density by the arc, blends motion 65% IR and 35% mood, and names the compositions with the arc. When false (mood only, no recognised concept) the mood table decides exactly as before and the IR is only recorded.

The same mood with two concepts ("decay" and "emergence", both "cold, contemplative") gives different heroes, ground, structure, motion axes, density, arc, generator family and material.

## Brief fields
`brief.verbs`: optional list of verb ids (validated against the registry). Everything else comes from `concept`, `focalEvent`, `mood`, `banned`.

## For an AI (or a person) writing the project by hand
`python scripts/plan_ir.py brief.json` prints the Creative IR and one Composition IR per composition; `python scripts/plan_ir.py brief.json --apply project.json` records both in `meta` and places the layers (the layers say their tier in `role`: `hero: ...`, `structure: ...`). `portable/PROMPT.md` step 2b teaches the same without tools.

## Limits
Keyword matching is literal (stems, accents removed): a concept written without any known word does not drive the choice. Say it with a verb in `brief.verbs`, or extend the lexicon in `registry/creative.json` and run `node scripts/registry.mjs --write`.
