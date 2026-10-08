# Art bible (`meta.artBible`)

One page, written right after the creative contract and before any layer. The contract says **what the piece is for**; the art bible says **how every layer must look and move so the piece reads as one hand**. It is saved in `meta.artBible`, validated by `validate_project.py` (warnings, never errors) and shown in the interface next to the contract.

Rule of use: any layer you add must be defensible by one line of the bible. If no line covers it, either the layer is wrong or the bible is.

## Fields

| Field | Answers | Good (specific) | Weak (rejected as thin) |
|---|---|---|---|
| `thesis` | what is this piece, in a sentence a stranger could repeat | "A wall of cold signal that tightens on the kick and releases on the break." | "cool visuals" |
| `material` | what are things made of | "Light on a dark ground; additive matter, hard rectangles, no soft gradients." | "modern" |
| `space` | where things sit and how far away they are read | "Read from 8-40 m: strokes of 12 px or more, hero on the left third, data at the edge." | "good composition" |
| `motion` | how things move (generated from the motion profile, see `motion-profiles.md`) | "Stepped, critically damped, 4 moves per loop, locked to the beat grid." | "dynamic" |
| `dramaturgy` | how the set and each composition build and release | "Establish, build, peak, release over 4 bars; one dominant figure; the ground is the release." | "has a climax" |
| `color` | roles of the colours, not a list of hexes | "Steel blue for matter, one amber accent used only for events." | "blue and orange" |
| `typography` | which type, how many levels, when it appears | "Uppercase, one family, title + caption at 0.4x + data at 0.16x, revealed by glyph on the build." | "clean" |
| `audio` | what the music drives (matches `audio.strategy`) | "Rhythmic: kick drives the hero, hats the structure, at most three reactive layers." | "reacts to music" |
| `banned` | what this piece must not do | "Lens flares, neon glow, particle bursts, shockwave rings on every hit." | (empty) |
| `motionProfile` | the five axes as numbers (optional, but the generator always writes it) | `{"energy":0.75,"elasticity":0.15,"anticipation":0.1,"continuity":0.15,"rhythm":0.55}` | |
| `density` | `sparse`, `balanced` or `dense` (optional): the evaluator judges fill and empty space against it | `"sparse"` | |

The validator warns when a field is empty or has fewer than three words. It does not judge taste.

## How it is made

- **With an AI:** after the contract, write the nine lines from the briefing's own words. Quote the client's constraint (distance, pitch, banned things) in `space` and `banned`.
- **Without AI:** `scripts/brief_to_project.py` writes the bible from the brief (mood table, motion profile, surface, audio strategy). Edit it by hand: the generated lines are correct but generic, and a bible that could describe any piece is the failure this page exists to prevent.

## Relation to other files

- `creative-contract.md`: the contract is the *why*; the bible is the *rules of the look*. Their `motionLanguage`, `colorLogic`, `temporalArc` and `banned` are the same sentences, on purpose.
- `quality-gates.md` and `evaluation.md`: the evaluator measures structure; the bible is what a human reviewer checks the result against.
- `tension-and-release.md`: `dramaturgy` and `banned` come from there.
