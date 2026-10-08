# AGENTS.md: AI VJ Generator

For any coding or chat agent working in, or with, this repository (Codex, Gemini CLI as `GEMINI.md`, Claude Code, local models).

**Using the tool (making a set):** read `skill/ai-vj-generator/portable/PROMPT.md` and follow it. Output is one JSON project (`ai-vj-generator/2`). Quick path without an AI: `docs/QUICKSTART.md`, path C.

**Changing the repository (developing):**
- Engine source of truth: `app/index.html` (one file). After editing run `node scripts/sync-skill.mjs`, and, if you touched `references/glsl-lib/lib.glsl`, `node scripts/embed-glsl-lib.mjs`.
- Skill: `skill/ai-vj-generator/` (router `SKILL.md`, `references/`, `scripts/`, `schema/`, `portable/`). Keep `SKILL.md` a router (≤ 500 lines).
- Tests: `node scripts/check.mjs` must end with "Tudo certo." Single areas: `node skill/ai-vj-generator/scripts/v7_check.mjs`, `generator_check.mjs`, `isf_check.mjs`, `lib_check.mjs`.
- Rules that never break: deterministic frames (no `Math.random`, no clocks), loops close on whole bars, every shader reads audio unless `audio.strategy` is `none` with a reason, native pixels (never assume 16:9), licences: concepts from AGPL/GPL/non-commercial code, never copies (`references/provenance.md`).
- A test is only worth something if it can fail: add a negative control or a mutation check.
- Look at renders (`scripts/contact_sheet.mjs`) before calling visual work done.
- New layer kinds live in modules under `app/` (`fx.js`, `synth.js`, `isf-ui.js`, `mp4.js`); after editing run `node scripts/embed-modules.mjs`, then `node scripts/build.mjs` and `node scripts/sync-skill.mjs`. Their tests: `fx_check.mjs`, `synth_check.mjs`, `isf_ui_check.mjs`, `mp4_check.mjs`, `lib2_check.mjs`.
- Render without screen capture: `node scripts/render.mjs` (MP4 or PNG); measure cost with `node scripts/bench.mjs`.
- Roadmap and priorities: `docs/ROADMAP.md`; what is left: `docs/PROXIMOS-PASSOS.md`.
