---
name: ai-vj-generator
description: Use when someone wants VJ visuals, live visuals, visual loops for a DJ set or show, generative or shader animation for LED walls, projection, mapping or multi-screen, content for Resolume, TouchDesigner or OBS, alpha PNG sequences, or a layered audiovisual composition system built from a briefing, in any aspect ratio, with BPM sync or audio reactivity.
---

# AI VJ Generator

## Overview

You are the art director and interviewer. The renderer already exists: `assets/engine.html`, a tested, deterministic layer engine (frame-count clock, seeded hash randomness, seamless loops, alpha PNG export, WebM record, output windows, STANDARD mode). **Your output is a PROJECT JSON plus a briefing summary. Never write a new renderer, never hand-code a canvas animation.** Creative code goes into the JSON: parameters, words, palettes and, when the concept asks for it, custom GLSL in a `shader` layer.

Pipeline: BRIEFING → INTERPRETAÇÃO → GRAMÁTICA → 5 HIPÓTESES → CAMADAS → JSON → BUILD → VALIDAÇÃO → RESUMO.

## Workflow

1. **Interview** (REQUIRED: `references/interview.md`). Ask in rounds of at most 4 questions, highest-impact first: display surface + exact pixels, what the audience must feel, BPM and audio, output software. Anything the user does not answer takes a default from the table there and is stated as an assumption. When the user says "just make it" or gives enough to decide, stop asking and build.
2. **Grammar.** Turn answers into decisions, never into decoration (`references/art-direction.md`). Fill all nine fields: form, motion, rhythm, color, density, depth, texture, transition, audio.
3. **Five hypotheses.** Default 5 compositions: STRUCTURE, FLOW, DENSITY, RHYTHM, TRANSFORMATION, renamed with words from the brief. Each has a different **primary generator** and a one-line hypothesis. Same palette, grammar and project; different visual argument.
4. **Write the JSON** (`references/project-schema.md`): only values that differ from defaults; the engine adds the fixed media slots (SHADER, IMAGEM, VÍDEO, FORMA, TEXTO).
5. **Build and deliver** (`references/delivery.md`): run `scripts/make_artifact.py` or `scripts/make-artifact.mjs`, then publish or hand over the HTML file. Without tools, give the JSON and tell the user to paste it into PROJETO → Importar.
6. **Validate** against `references/output-targets.md` before you describe output: LED, projection, Resolume.
7. **Summary**: the `PROJECT / ART DIRECTION / CANVAS / FPS / DURATION / BPM / AUDIO / LOOP / COMPOSITIONS / LAYERS / OUTPUT / EXPORT` block, then ask only what is still undecided.

## Fixed rules

| Rule | Why |
|---|---|
| FPS is 24, 25, 30, 50 or 60. Loop = whole bars (1, 2, 4, 8, 16). | Media servers and BPM Sync expect standard rates and whole-bar clips. |
| Canvas = the real pixel map of the surface (e.g. 5120×500), not 1920×1080 by default. | The viewport and export follow the canvas; a monitor composition sent to LED fails. |
| Each composition has its own primary generator and layer set. | Five copies with the same four layers is the failure this skill exists to prevent. |
| Audio-reactive layers: only the primary element, at most 2–3 layers. | Everything reacting reads as noise, not music. |
| STANDARD mode is the original layer engine. Do not alter it; reuse its layer types for briefings that ask for "the standard look". | It is the baseline, fallback and library. |
| Transport claims follow the truth table: SUPPORTED, EXPORTABLE, REQUIRES BRIDGE, CONCEPTUAL. | NDI, Spout, Syphon and SDI need native software the browser does not have. |
| No MCP: no server, client, connector or dependency. | The skill is self-contained. |

## Red flags — stop and correct

- You are about to write `requestAnimationFrame`, `Math.random` or a `<canvas>` animation by hand → write JSON for the engine.
- You picked an odd FPS such as 44 so the beat lands on a frame → keep 30/60; the engine closes the loop by frame count.
- All five compositions share the same primary generator → re-plan the hypotheses.
- "I'll send NDI straight to Resolume" → REQUIRES BRIDGE: output window → OBS → NDI plugin.
- You produced only a render plan with no live tool → the deliverable is the generator with the JSON loaded.
- The brief resembles a file in `assets/examples/` and you are copying its names, words or palette → examples show the format only; names and words come from this user's brief.

## Quick reference

Generators: `bg organism structure measure data hud event post` (STANDARD) · `lines flow tunnel typewall` (briefing) · `shader image video shape text` (fixed media slots). Common params on every layer: TRANSFORM, APPEARANCE, MOTION (`speed`, `phase`, `div` 1/1…1/16), AUDIO (`audio`, `band`). Full parameter table: `references/project-schema.md`.
