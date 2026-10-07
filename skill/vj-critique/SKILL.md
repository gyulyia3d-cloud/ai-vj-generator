---
name: vj-critique
description: Review a built VJ project against its briefing, its creative contract and the weighted quality gates, and propose ordered mutations.
argument-hint: <path to the .aivj.json or HTML, optional>
disable-model-invocation: true
---

# /vj-critique

Critique an existing VJ project. Project to review: $ARGUMENTS (if empty, use the most recent project in the working directory and say which one).

1. Invoke the `ai-vj-generator` skill. Its files are in the sibling folder `../ai-vj-generator/`.
2. **Look** at each composition at several loop positions: run `node ../ai-vj-generator/scripts/contact_sheet.mjs <project>.html contato` (or open the interface) and read every PNG and the validation it prints. Do not critique what you have not seen. On surfaces with folds also check that no text, face or logo crosses a gutter, that nothing relies on a cut-out across layers, and that the elements are large enough for the viewing distance.
3. Score every composition with `../ai-vj-generator/references/quality-gates.md` (100 points, weights per dimension, automatic rejects) and answer its self-critique questions. Check the project against its own creative contract (`meta.contract`): each layer must trace to a line of it, and the ten acceptance questions of `creative-contract.md` must have answers. Run `python ../ai-vj-generator/scripts/validate_project.py <project>.aivj.json` too.
4. Be specific: name the composition, the layer and the moment ("in 03 the hero loses hierarchy at bar 3 because the secondary density passes the primary"), never "it looks good".
5. Propose mutations in the skill's order (concept, semiotic intent, temporal structure, topology, spatial system, motion, technique, material, composition, parameters last) and ask which to apply. Apply nothing until the user chooses, unless asked to fix everything.
