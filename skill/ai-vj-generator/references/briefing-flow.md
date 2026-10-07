# Briefing flow (`/vj`)

How a project is born: from the briefing only. The interface is opened last, with the finished project loaded.

## 0. Fresh start (always)

Every `/vj` is a new project from zero.

- Do not reuse a previous project's name, palette, words, generators, parameters or compositions. Do not open or copy any example, template or earlier `.aivj.json`.
- The **only** exception is an explicit request to continue a named project ("continua o MATÉRIA LENTA", "muda a composição 3 do projeto X"). Then load that file, edit it as a patch, and say which fields changed.
- Previous generations in this conversation are used only to avoid repeating them (`knowledge/visual-dna-diversity-critique.md` §42), never to inherit from them.
- There are no stock palettes, stock hypothesis lists or stock layer stacks. If you catch yourself reaching for "STRUCTURE / FLOW / DENSITY / RHYTHM / TRANSFORMATION" or a familiar palette, stop and derive from this briefing.
- The STANDARD library exists in the interface for the user to open. Use its layer types only when this briefing's concept calls for them, never as a starting point.

## 1. Intake

1. Read the user's message.
2. List every attachment (images, videos, links, audio, documents).
3. Analyze each one before asking anything (`attachments.md`). What you measure and see changes which questions are worth asking.

## 2. Diagnose, then interview in the chat

1. **Diagnose** (`briefing/diagnosis.md`): fill the Brief Ledger from the message and the attachments, tag each field `said` / `seen` / `measured` / `inferred` / `default` / `unknown`, classify the archetype(s), run the consistency checks, and score the unknowns by value of information.
2. **Ask** the highest-scoring unknowns in rounds of at most 4 questions (5 when the brief is rich): physics first (the archetype's Round 1 in `briefing/archetypes.md`), then music, performer and meaning (`briefing/question-bank.md`), then taste (`interview.md` Gate E). Use the question tool when the host has one; otherwise plain text with short options.
   - Ground questions in the analysis: not "what colors?" but "a referência 1 é quase monocromática com um acento frio nos 4% finais; é essa a proporção que você quer?"
   - Ask for documents (rider, LED map, plan, photos at night) before facts, and say who can answer ("pergunte ao técnico de LED: ...").
   - When the user gives metres, pitch or projector data, compute the pixel map with `python scripts/surface_calc.py` and read the result back for confirmation.
   - Ask only what changes the solution. If an answer is already in the message or in an attachment, do not ask it. Offer concrete options derived from this briefing, with a default and its risk.
   - Critical gaps (real pixel map, mapping surface, viewing distance, occluded zones) are asked, never assumed. Everything else the user declines becomes a stated assumption in `meta.spec.assumed`.
3. **Readback** (`briefing/diagnosis.md` §5): show what you understood, the derived numbers and what they force, and wait for confirmation unless the user said "decide o resto".

Stop when you can state the concept in one sentence and name what is still assumed. Usually 3 rounds, up to 4 when the project is large or earlier results missed; with "decide o resto" or an equivalent, stop after round 1 and print the assumptions block.

## 3. Reference grammar

For each attachment, write what was measured and seen, then the principle (see `attachments.md`). References are never copied or traced; they become principles that serve this briefing's concept.

## 4. Creative contract → direction document

First write the creative contract (`creative-contract.md`), after the readback is confirmed: concept, audience effect, semiotic intent, visual language, form, material, colour logic, spatial logic, motion, typography, temporal arc, loop grammar, target, technical strategy, forbidden shortcuts. Privately generate 3–5 hypotheses that differ by argument, score them, commit to one world. Put the contract in `meta.contract` of the project.


Follow this order: interpretation → knowledge (load `repertoire/index.md` and the 1–3 files the briefing calls for) → concept → semiotic intent → animation principle → visual grammar → art direction → technical strategy.

Write `direcao-de-arte.md` (or `art-direction.md` in the user's language) containing: the concept in one sentence; the briefing as understood; attachment analysis; references as reference → principle → parameter; time; color with roles; and for each composition a Visual DNA (`knowledge/visual-dna-diversity-critique.md` §27), a one-sentence rule, the hierarchy, and the technical strategy. The compositions are 3–5 (exactly five when the user asks for a set of five) inside **one world**: shared palette, material and conceptual logic, but different topology, spatial behavior, temporal function and technique (`creative-contract.md`; §28 and §41 of `knowledge/visual-dna-diversity-critique.md`).

If the user asked for control over direction, show the hypotheses and wait. Otherwise state them and continue.

## 5. Build

1. Create a new folder `<project-slug>/` in the user's working directory. Never write into the skill folder or the repository's `examples/`.
2. Write `<slug>.aivj.json` (`project-schema.md`, schema `ai-vj-generator/2`: add `meta.contract`, `meta.spec` from the diagnosis, a `role` on every layer, and optionally `capabilities`). Also write `<slug>/PRODUCTION_SPEC.md`: the confirmed and derived numbers, the zones and the assumptions, as the sheet a technician can check. Custom GLSL goes in `shader.p.src`; check each shader against the contract. Put the files the user sent in `<slug>/assets/` (logos in `assets/logos/`). Prefer the wall-aware generators; use a `code` layer when none expresses the idea (`walls-code-assets.md`). Roles and layers come from this briefing: do not reuse a fixed stack.
3. Run `python scripts/validate_project.py <slug>.aivj.json` and fix every ERROR. It catches misspelled parameters (the engine ignores them silently), illegal FPS and loop lengths, GLSL ES 1.00 mistakes (`float a = 1;`, integer `%`, loop bounds from uniforms, `uT` motion that cannot loop) signs of a template (generic composition names, an engine palette, an example's name, near-identical compositions), a missing or thin creative contract, more than three audio-reactive layers in one composition, and transport claims that need a bridge (`capabilities.md`). It cannot compile GLSL.
4. Build the HTML with `scripts/make_artifact.py` or `scripts/make-artifact.mjs`, adding `--assets <slug>/assets` (`delivery.md`).
5. Run `node scripts/contact_sheet.mjs <slug>/<slug>.html <slug>/contato`, which prints the validation and writes a contact sheet per composition, and read every PNG; run `node scripts/loop_check.mjs <slug>/<slug>.html` to confirm every composition and layer closes its loop; or open the interface and look at several loop positions (`quality-gates.md`). Read the validation panel: that is where shader compile errors appear, with line numbers. Do not report a composition you have not seen. If you cannot open a browser, say so plainly in the delivery: "shaders not compiled, compositions not seen", and give the user the checklist (open the HTML, read the panel, scrub each composition).
6. Critique, score each composition with `quality-gates.md`, mutate in its order (concept first, parameters last), rebuild. Record each round in the direction document.

## 6. Deliver

Open the interface with the project loaded (publish as an Artifact where available, or give the HTML file). Finish with the summary block from `delivery.md`, then ask only what is still undecided.

## Slash commands

| Command | Does |
|---|---|
| `/vj <briefing>` | This whole flow, from zero |
| `/vj-reference` | Analyze attachments only and return the reference grammar |
| `/vj-critique` | Review a built project against the briefing and the weighted quality gates; propose mutations |
