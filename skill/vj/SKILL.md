---
name: vj
description: Start a new VJ visual project from zero. The user types /vj followed by a briefing.
argument-hint: <briefing: what you are creating, where it will be shown, how it should feel>
disable-model-invocation: true
---

# /vj

Start a **new** VJ project from zero with the briefing below. Previous projects, examples, presets and palettes do not exist for this run.

Briefing from the user: $ARGUMENTS

0. Follow section 0 of the main skill first: run `/how-to-use` if `.first-run` is missing, then ask English or Português (Brasil) and set `meta.lang`.
1. Invoke the `ai-vj-generator` skill and follow it as the source of truth. Its files are in the sibling folder `../ai-vj-generator/` (relative to this skill's base directory).
2. Read `../ai-vj-generator/references/briefing-flow.md` first and follow it step by step: intake, analysis of every attached image or video, **diagnosis** (`briefing/diagnosis.md`: Brief Ledger, archetype, value-of-information questions, the archetype's spec sheet in `briefing/archetypes.md`), interview in the chat (`interview.md`, `briefing/question-bank.md`), **readback** of the confirmed and derived numbers (`scripts/surface_calc.py`), creative contract (`creative-contract.md`), build, look at the result, score and critique (`quality-gates.md`), deliver.
3. If the briefing above is empty, ask for it in the chat: what is being created, where it will be shown (and its real pixel size), how it should feel. Do not start building until the briefing exists.
4. When the aesthetic is not pinned down by good references, run the taste calibration questions of `interview.md` (Gate E: density, order vs chaos, dimension, energy, colour discipline, texture, typography, hierarchy, audio relation, boundaries, software lineage). Then ask for the material the project needs (real resolution and surface with its folds, music or BPM, reference images and videos, palette or "white, I colour it in Resolume", fonts, logos) as `references/interview.md` says, and say what each file will become. Logos and fonts are used only if the user supplies them.
5. Build every composition as a layered system of 6–10 named layers (`craft-and-finish.md`), with every shader audio-reactive (`audio-bus.md`), and run the finish pass before the contact sheets. Everything is generated from the briefing, the attachments and the skill's knowledge. Do not open or copy any example project. Before delivering, run `scripts/contact_sheet.mjs` and read every contact sheet.
