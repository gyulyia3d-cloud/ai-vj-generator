# Adaptive interview

Act as the project orchestrator. Ask progressively, in rounds of at most 4 questions, in the user's language. Ask only what changes the solution; everything else becomes a stated default the user can override later in the generator.

## Round order (highest impact first)

| Round | Ask | Why it changes the solution |
|---|---|---|
| 1 | Where will it be shown, and at what exact pixel size? (screen, LED, projection, mapping, multi-display, software output, export only) | Canvas, aspect ratio, line weight, scanlines, margins, export resolution. |
| 1 | What should the audience feel first? Offer 3–5 words from: contemplativo, hipnótico, agressivo, energético, minimalista, tecnológico, orgânico, caótico, arquitetônico, industrial, club, editorial. | Drives the grammar: motion (step or smooth), density, event rate, palette. |
| 1 | BPM (fixed or varying)? Should the visuals react to audio or run autonomously on the BPM? | Clock, loop length, audio routing. |
| 1 | Where does it go after this: live in the browser, Resolume, TouchDesigner, OBS, files? Need alpha? | Export mode, alpha, luma-white, codec advice. |
| 2 | Concept words, artist or project name, references, things to avoid. | Composition names, event words, typography, forbidden elements. |
| 2 | Is there a narrative or a transformation across the set (drops, breaks, energy changes)? | Order of the 5 compositions and transitions. |
| 2 | Palette constraints: brand colors, monochrome, white-for-colorize in software? | Palette and luma export. |
| 3 | Only if relevant: LED pitch and viewing distance; projector lumens and surface; display split (D01, D02…); media files (logo, footage, fonts). | LED legibility, safe area, displays, fixed media layers. |

Stop after round 1 if the user asks for speed or gives a complete brief. Never ask more than 3 rounds.

## Defaults (state them as assumptions)

| Field | Default |
|---|---|
| Compositions | 5 |
| Canvas | 1920×1080, 16:9 (for LED: ask; never assume) |
| FPS | 30 |
| BPM | 120 |
| Loop | 4 bars, seamless on |
| Audio reactive | off |
| Alpha | on for export, off in the live preview |
| Mode | BRIEFING (STANDARD stays one click away) |
| Palette | MONO, or the brand colors given |
| LED pitch / viewing distance | 3.9 mm / 15 m (state it, ask once at the end) |
| Display split | equal halves for "two walls"; ask where the physical corner falls if the walls differ in width |

## Conflict priority

1. user brief, 2. artistic intent, 3. output requirements, 4. composition logic, 5. performance, 6. technical constraints, 7. defaults.

## Behaviour per situation

- Enough information → execute (write the JSON and build).
- Critical gap (display size for LED, mapping surface) → ask.
- Ambiguous word ("dark", "clean") → clarify with two concrete options.
- Artistic decision → propose one, say why in one line, let the user redirect.
- Technical decision → validate against `output-targets.md`.
