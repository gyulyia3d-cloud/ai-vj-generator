# Creative contract

The contract sits between the briefing and the code. Without it the path is `brief → code` and the result is an effect generator. With it: `brief → contract → visual DNA → composition theses → technique → code`. It is what makes the skill an art director.

Write it after the interview, the attachment analysis and the confirmed readback (`briefing/diagnosis.md`), before any JSON. The contract says *why* and *how it should feel*; the production spec (`meta.spec`) says *where and under what physical conditions*. The contract's `target` and `spatial_logic` fields cite the spec; they never contradict it. Keep it compact: one or two sentences per field, specific to this briefing.

## Fields

```yaml
creative_contract:
  concept:            # the idea in one sentence
  audience_effect:    # what the audience should feel or perceive
  semiotic_intent:    # abstract idea → association → visual sign → form → motion → temporal event
  visual_language:    # the coherent world (not a list of effects)
  form_language:      # primitives, topology, geometry or organic logic
  material_language:  # surface, light, texture, grain, emission, or deliberate flatness
  color_logic:        # roles and reasons, not just hex values
  spatial_logic:      # frame, depth, hierarchy, negative space, how folds are used
  motion_language:    # what moves, why, with what acceleration and cause
  typography_language: # only if type is used; the exact supplied font and why
  temporal_arc:       # how the set and each loop establish, evolve, peak, release
  loop_grammar:       # cyclic | morphological | continuous | event | evolutionary
  target:             # resolution, surface, fps, alpha, viewing distance
  technical_strategy: # which behaviors need which renderer, and why
  forbidden_shortcuts: # negative constraints for this project (generic noise + glow, constant rotation, everything centered ...)
```

In the project JSON it lives in `meta.contract` (same keys, camelCase: `audienceEffect`, `semioticIntent`, ...). The interface shows it in the PROJETO tab.

## Traceability rule

Every layer, technique choice, parameter group and audio binding must trace to a line of the contract. In schema 2 each layer carries a one-sentence `role` that does exactly that. A layer with no answer to "why does this exist?" is cut. A technique with no answer to "why this renderer?" is replaced by the simplest one that works.

## The V4 acceptance questions

A finished project must answer all of these. If one has no answer, the project is not done.

1. What is the concept?
2. Why does each layer exist?
3. Why was this rendering technique chosen?
4. Why is this composition framed this way?
5. How does the target surface alter the design?
6. What does audio control, and why?
7. How does the loop evolve?
8. Can the exact frame be reproduced (seed, frame number, project JSON)?
9. Can each layer be edited or exported on its own?
10. What is browser-native and what needs a bridge?

## Divergence, then commitment

Privately write 3–5 hypotheses that differ by conceptual argument, not by colour or effect. Score each 0–5 on: concept fit, semiotic clarity, compositional potential, temporal potential, target fit, technical feasibility, authorship. Commit to one. Do not show the long list unless the user asked for control over direction; then show it and wait.

## One world, several compositions

The chosen hypothesis becomes one art direction. Compositions share palette logic, material logic, typography logic, conceptual world and overall motion language. They differ in topology, spatial behavior, temporal function, density, technique, framing and main action. Their roles come from the dramaturgy of the brief (arrival, pressure, rupture, release ...), never from a stock label list.

Check set diversity before building: if two compositions share the same layer stack, the same primary technique and the same temporal behavior, merge or replace one.

## Visual DNA per composition

For each composition fix: concept, form, topology, composition, depth, material, lighting, colour roles, motion, animation principle, rhythm, temporal structure, camera, density, energy, audio relationship, transition, technical strategy. Hierarchy has at least a primary, a secondary and a tertiary element; make them differ by scale, contrast, brightness, motion, density or position, not all at once.

## Creative IR → project JSON → renderer

The contract is the creative intermediate representation. The project JSON is the source of truth for the work; the HTML is only a view and controller over it. Never bury a creative decision in the interface that is not in the JSON.
