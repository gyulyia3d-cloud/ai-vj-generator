# Adaptive interview

**Diagnose before asking.** Read `briefing/diagnosis.md` first: build the Brief Ledger, classify the archetype, score the unknowns, and ask only what survives. This file holds the interview mechanics, the taste calibration (Gate E) and the technical defaults; the archetype spec sheets are in `briefing/archetypes.md` and the creative, music, performer and risk questions in `briefing/question-bank.md`.

Act as the project orchestrator. Ask progressively, in rounds of at most 4 questions (5 when the briefing is rich and the user is engaged), in the user's language. Ask only what changes the solution; everything else becomes a stated default the user can override later in the generator. **A good interview is longer when the result will be shown to a crowd:** up to 4 rounds is fine when the project is large, the references are thin, or the user said earlier results were not aesthetically right. Never ask a question whose answer is already in the message or in an attachment.

## Material to ask for (every project)

Ask once, early, in the same round as the surface questions, and say what each file will become:

- **Surface:** real resolution; if there are several planes, where the folds are (px) and what each wall is; viewing distance; LED pitch if relevant.
- **Files:** reference images and videos (analyzed, never copied), fonts to use, logos or marks to show, any text that must appear. Logos and fonts are used only if the user supplies them.
- **Colour:** their palette, or "propose one", or "all white, I colour it in Resolume" (palette.mode: white-alpha).
- **Sound:** BPM, whether it reacts to audio.

If the user declines a point, record it as an assumption and move on.

## Gates

The rounds follow these gates; stop as soon as the creative contract (`creative-contract.md`) can be written and every CRITICAL ledger row is known.

- **A, production reality:** the archetype's Round 1 in `briefing/archetypes.md` (pixel map or metres + pitch or projector data, folds, viewing distances, performer and occluded zones, refresh and fps, alpha). Read the derived numbers back with `scripts/surface_calc.py`.
- **B, artistic intent:** concept, tension, primary visual action, emotional state, what stays stable and what escalates, references and what attracts the user in them, what to avoid (`briefing/question-bank.md` §1).
- **C, inputs and identity (only if relevant):** images, video, SVG, logos, fonts, exact text, audio, palette (`briefing/question-bank.md` §4).
- **D, delivery (only if relevant):** live or offline, Resolume / OBS / TouchDesigner / projection / media server, secondary display, bridge needs, PNG sequence or recording.
- **E, taste calibration (ask whenever the aesthetic is not already pinned down by good references):** see the section below. This gate is what lets the result land on the first try.
- **F, music and performer:** genre, BPM or range, set structure, which instrument drives which role, who stands in front of the image (`briefing/question-bank.md` §2 and §3).
- **G, risk and success:** flash limits, forbidden symbols, hardware, who judges the result and how (`briefing/question-bank.md` §5 and §6).

## Round order

Physics first, meaning second, taste third (`briefing/diagnosis.md` §7). Round 1 is the archetype's four CRITICAL questions; Round 2 is music, performer and the concept seed; Round 3 is Gate E, risk and success. Each round is at most 4 questions (5 when the brief is rich), each with options built from this brief and a stated default.

Stop after round 1 if the user asks for speed or gives a complete brief. With "decide o resto" or equivalent, print one assumptions block (aesthetic included) and build, keeping every assumption in `meta.spec.assumed`.

Before the contract, show the **readback** (`briefing/diagnosis.md` §5): what you understood, the derived numbers and the decisions they force.

## Gate E: taste calibration

Aesthetic words are ambiguous ("dark", "clean", "futuristic", "organic"). Pin them down with concrete choices, not adjectives. Ask 3–5 of these in one round, tailored to the briefing, as short multiple-choice questions with options derived from this brief (and from the references already analyzed):

1. **Anchors.** "Send or name 2–3 pieces you love and 1 you hate for this project; what exactly do you love in each (colour, rhythm, density, structure, material, typography)?"
2. **Density.** Sparse and monumental / balanced / dense and layered. (Layered is the default target: 6–10 layers per composition.)
3. **Order vs chaos.** Strict grid and instruments / organic and flowing / controlled glitch.
4. **Dimension.** Flat graphic / 2.5D depth and parallax / true 3-D with a camera.
5. **Speed and energy.** Contemplative (1–4 bar cycles) / driving (beat-locked) / explosive (impacts and events).
6. **Contrast and colour.** Monochrome with one accent / restricted palette (3–4 roles) / spectral. Dark ground or light? Accent colour, or let me propose one?
7. **Texture and finish.** Clean vector / grain and scanlines / glow and light / print-like.
8. **Typography.** None / system mono labels / big kinetic words / supplied font only.
9. **Hierarchy.** One clear hero with supporting layers / several equal moments / a field with no hero.
10. **Audio relation.** Beat-locked pulse / bass-driven weight / full-spectrum shimmer / music-independent (shaders still react).
11. **Narrative across the set.** Arc (arrive, build, rupture, release) / stations (equal clips) / loop one idea five ways.
12. **Boundaries.** The three things that must never happen (e.g. "no cyan", "no particles", "nothing centred", "no text").
13. **Software lineage.** Which look do you associate with the work: Hydra-style glitch/feedback, TouchDesigner instancing and noise, Cavalry-style geometric duplicators, Synesthesia shader worlds, Resolume-style loops, game/VFX particles, motion-graphics editorial? (Used to pick the vocabulary, never to copy.)
14. **Viewing situation.** Distance, ambient light, crowd, camera on stage (moiré), dwell time per clip.

Use the answers to write the **art-direction statement** (concept + 5 constraints) before any code. If the user answers little, state which choices you made and why, in one line each.

## When to ask more

Ask another round when: the references conflict; the surface is unusual (strip, dome, L); text or logos matter; the user complains about earlier output; or a key constraint (distance, pitch) is missing. Prefer *showing* over asking: after the first analysis, you may present 2–3 thumbnails-in-words of directions ("A: dense instrument panel in bone and steel; B: slow flow fields with one accent; C: strict grid with a travelling wave") and ask which to take.

## Defaults (technical only, state them as assumptions)

Only technical fields have defaults. Creative fields never do: palette, concept, words, forms, number and nature of compositions come from the briefing and the attachments.

| Field | Default |
|---|---|
| Canvas | 1920×1080, 16:9 (for LED or mapping: ask; never assume) |
| FPS | 30 |
| BPM | 120, unless the briefing says ambient or variable (then a ruler value, stated) |
| Loop | 4 bars, seamless on; choose longer for slow concepts |
| Audio reactive | off |
| Alpha | on for export, off in the live preview |
| LED pitch / viewing distance | 3.9 mm / 15 m (state it with its risk, ask once at the end; compute with `scripts/surface_calc.py`) |
| Display split | equal halves for "two walls"; ask where the physical corner falls if the walls differ in width |
| Compositions | 3–5, as many as the concept needs |
| Palette | derived from the concept and attachments (4 roles with a reason each); only a brand's own colors are taken as given |

## Conflict priority

1. user brief, 2. artistic intent, 3. output requirements, 4. composition logic, 5. performance, 6. technical constraints, 7. defaults.

## Behaviour per situation

- Enough information → execute (write the JSON and build).
- Critical gap (display size for LED, mapping surface) → ask.
- Ambiguous word ("dark", "clean") → clarify with two concrete options.
- Artistic decision → propose one, say why in one line, let the user redirect.
- Technical decision → validate against `output-targets.md`.
