# AGENTS.md: AI VJ Generator

For any coding or chat agent working in, or with, this repository (Codex, Cursor, Gemini CLI, Claude Code, local models). `GEMINI.md` and `CLAUDE.md` point here.

**Using the tool (making a set):** read `skill/ai-vj-generator/portable/PROMPT.md` and follow it. Output is one JSON project (`ai-vj-generator/2`). Quick path without an AI: `docs/QUICKSTART.md`, path A or C. How each tool loads the instructions: `docs/AI-AGNOSTIC.md`.

**Changing the repository (developing):**
- Engine source of truth: `app/index.html` plus the modules in `app/` (`fx.js`, `synth.js`, `blobs.js`, `isf-ui.js`, `mp4.js`, `mod-ui.js`, `gen-ui.js`, `surface*.js`, `flash.js`, `onset.js`, `evaluate.js`, `genai.js`, `ux.js`). The modules are embedded into `index.html` between markers: after editing run `node scripts/embed-modules.mjs`, then `node scripts/build.mjs` and `node scripts/sync-skill.mjs` (copies the engine into the skill). Other generated blocks: `node scripts/embed-glsl-lib.mjs` (after `references/glsl-lib/lib.glsl`), `node scripts/embed-recipes.mjs` (after `references/recipes/`), `node scripts/embed-isf.mjs` (after `isf-library/`).
- Skill: `skill/ai-vj-generator/` (router `SKILL.md`, `references/`, `scripts/`, `schema/`, `portable/`, `isf-library/`). Keep `SKILL.md` a router (at most 500 lines). The single source of the instructions for other AIs is `portable/PROMPT.md`: never copy it, point to it.
- Registry: `skill/ai-vj-generator/registry/` is the single source for layer types, modulation sources, capability labels and schema versions. After changing a layer's parameters or the modulation list run `node scripts/registry.mjs --write`; `--check` (part of `check.mjs`) fails on drift.
- Tests: `node scripts/check.mjs` must end with "Tudo certo." Single areas: `v7_check.mjs`, `generator_check.mjs`, `isf_check.mjs`, `isf_ui_check.mjs`, `fx_check.mjs`, `synth_check.mjs`, `blobs_check.mjs`, `mp4_check.mjs`, `lib_check.mjs`, `lib2_check.mjs`, `menu_check.mjs` (all in `skill/ai-vj-generator/scripts/`, run with `node`).
- Rules that never break: deterministic frames (no `Math.random`, no clocks), loops close on whole bars and whole cycles, every shader reads audio unless `audio.strategy` is `none` with a reason, native pixels (never assume 16:9), licences: concepts from AGPL, GPL or non-commercial code, never copies (`skill/ai-vj-generator/references/provenance.md`, `isf-library/README.md`).
- A test is only worth something if it can fail: add a negative control or a mutation check. UI tests must click with real mouse events, not `.click()`: a covered button passes the second and fails the first.
- Look at renders (`scripts/contact_sheet.mjs`) before calling visual work done.
- Render without screen capture: `node scripts/render.mjs` (MP4 or PNG); measure cost with `node scripts/bench.mjs`.
- Roadmap: `docs/ROADMAP.md`; what is left, in small blocks: `docs/PROXIMOS-PASSOS.md`; version notes: `CHANGELOG.md`.
