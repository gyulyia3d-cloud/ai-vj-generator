# Animation IR

How things move: the behaviour of each layer over the loop, in musical time. It sits after the Composition IR (where things go) and before the generators draw. The same figures in the same places move like another piece when the archetype changes.

Compiled by `scripts/animation_ir.py` (Python) and `app/animation.js` (browser) from the same data, `registry/animation.json`; both give the same IR and the same layers (`animation_check.mjs`). One IR per composition, stored in `meta.animationIR` (a list, same order as `compositions`). It reads the Creative IR (verbs and the five motion axes), the Composition IR (the five phases) and the clock (`bpm`, `bars`, `fps`).

## The eight archetypes
| archetype | the hero... | the structure... | ground |
|---|---|---|---|
| `pulse` | is hit on the beat and rings out (spring) | answers a sixteenth later, softer | lags 2 sixteenths |
| `breathe` | breathes once every two bars (sine) | follows 2 sixteenths late | lags 4 |
| `glide` | makes one steady move per loop (triangle) | follows 4 late | lags 8 |
| `surge` | builds for a bar and drops at its end (ramp) | follows 1 late | lags 2 |
| `stutter` | moves in 6 hard steps per cycle, no ring | moves with it, no lag | holds |
| `orbit` | turns once per loop (rotation) | turns the other way | lags 4 |
| `ripple` | wobbles and the wobble travels outward (damped) | follows 2 late | lags 4 |
| `settle` | enters once per loop, lands and holds | holds | holds |

The verbs vote (`verbArchetypes`, as a share of their total weight): `drift` and `flow` ask for glide, `fracture` and `fragment` for stutter, `emerge` and `freeze` for settle, `compress` and `contract` for surge, and so on for all 32. With no verbs the axes choose (stepped: stutter; springy: pulse; smooth: breathe). Composition `i` takes slot `i` of the top three, so a set moves in different ways. `brief.motionArchetype` forces the first slot.

## What an IR holds
`archetype` and `archetypeSet` · `axes` (the five, 0..1) · `timing` (`bpm`, `bars`, `fps`, `loopFrames`, `cyclesPerLoop`, `framesPerCycle`, `beatsPerCycle`, `sixteenthFrames`) · `easing` · `spring` (the profile numbers: `zeta`, `wn`, `ta`, `depth`, `steps`, `amp`, `cycles`, `overshoot`) · `anticipation` (fraction and frames) · `settle` (fraction of the cycle and frames until the spring is at rest) · `hold` · `hierarchy` (hero, structure, ground, instrument, text; each with its behaviour and, for the first three, its lag) · `choreography` (the five phases: who leads, energy, how the phase changes) · `events` · `transitions` · `loop`.

- **Lag is in sixteenth notes of the loop.** `lag.steps` sixteenths become `lag.lag = steps / (bars * 16)` of the loop, written to the layer as `p.phase`, with `frames` for the frame count. The hero never lags.
- **Behaviours:** `lead`, `follow` (same move, softer, late), `counter` (same move turning the other way), `ambient` (slow matter that lags and never accents), `accent` (the instrument shows the signal), `reveal` (the text enters on the build and clears before the end), `hold`.
- **Events** (`establish`, `build`, `turn`, `focal`, `release`) are snapped to whole beats: `beat` is an integer inside the loop, `at = beat / (bars * 4)`. In a one-bar loop two events can share a beat.
- **Anticipation and settle are measured**, not adjectives: `anticipation.frames` is how long the wind-up dip lasts, `settle.frames` how long the spring needs to be within a few percent of rest.

## Applied to the layers (only when the Creative IR drives)
- hero: the archetype's curve (`spring`, `sin`, `tri`, `saw` or `rubber`, whole `cycles`) on the generator's target (`tunnel`/`shape` size, `lines` weight, `organism` breathe, `flow` amp, `typewall` fill), or on `rot` for `orbit` (mode `add`, 0..360 per cycle).
- structure: follows, counters (`rot`, 0..-360) or holds. A structure of the same generator type as the hero does not follow (one move is enough). Its `p.phase` is the lag.
- ground (shader fields, found by the names `CAMPO` / `ATMOSFERA` or a `role` that starts with `ground` or `atmosphere`): `p.phase` is the lag.
- Only the plan's own `lfo` curves on the driven keys are replaced, so applying twice does not stack them. `env` phases (Composition IR) and audio modulation stay.
- When the Creative IR does not drive (mood only), the IR is recorded and nothing is changed.

## The loop
Every curve has a whole number of cycles per loop, so the motion repeats exactly. All archetypes join the end of the loop to its start without a jump except `surge`, whose drop at the end of each bar is the point. A spring played in steps holds the wind-up dip until the hit, a jump of at most `amp * depth`.

## Limits
Eight archetypes drive one parameter per tier; richer choreography (per-object stagger in particles, camera moves) belongs to the 2.5D, 3D and particle phases and will read this IR. The audio semantics (every layer declares how it relates to the music) are Phase 10; here the instrument only has the behaviour `accent`.
