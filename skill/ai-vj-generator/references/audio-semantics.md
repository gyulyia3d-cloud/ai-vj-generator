# Audio semantics

Every layer says how it keeps time. Only some layers listen to the music. The strategy decides how many, and the engine holds each layer to what it declared.

Compiled by `scripts/audio_semantics.py` (Python) and `app/audio-sem.js` (browser) from the same data, `registry/audio.json`; both write the same declarations (`audio_sem_check.mjs`). The generators and `plan_ir.py --apply` write them: `layer.temporal` on every layer and one summary per composition in `meta.audioSemantics`.

## The declaration
```json
"temporal": { "behavior": "follow", "listens": ["mid"], "reason": "carries the mid story: the structure rotates and breathes with the body of the track" }
```

| behavior | listens? | what it is |
|---|---|---|
| `still` | no | does not move on its own: a ground, a plate, a frame |
| `drift` | no | moves with time only (loop phase, BPM waves, integrated travel) |
| `beat` | no | lands on the beat grid (onbeat, sixteenth steps, the loop's own events) |
| `follow` | yes | a continuous follower of the bands it lists |
| `accent` | yes | an event: it answers hits and transients |
| `section` | yes | a structural follower: presence and level of the track (build, drop, break), never single hits |

`listens` lists band **classes**: `bass`, `mid`, `high`, `hit`, `level`. The sources fall into them (`registry/audio.json`, `sources`): `bass`; `mid` and `mhit`; `high` and `hhit`; `hit`, `kick`, `onset`, `flux`; `level` is `rms` and `pres`. Integrated travel (`uBassT`...) and the BPM waves belong to no class: every layer keeps them, which is how a `drift` layer still moves.

## What the engine does with it
- A layer that does not listen (`still`, `drift`, `beat`) gets **zero** on every instantaneous band, its `p.audio` gate is closed and a `layer.mod` with a band source (`bass`, `kick`...) does nothing. `lfo`, `onbeat`, `bsin*`, `btri` and the integrated travel keep working.
- A layer that listens gets only the classes in `listens`. A `follow ["mid"]` layer sees no bass, no high, no hit.
- A layer with **no** `temporal` is a legacy layer: the old rule holds (a shader never drops below the 0.35 response and must read the audio uniforms).

## Who listens: the plan of each strategy
The strategy sets the budget; one layer carries each story, so the music has a hierarchy.

| strategy | budget | who listens |
|---|---|---|
| `none` | 0 | nobody (the instrument still shows the signal) |
| `subtle` | 1 | the hero follows the bass |
| `structural` | 2 | the hero follows the bass; a ground field follows the presence of the track (`section`) |
| `rhythmic` | 3 | hero: bass (an `accent` on bass and hits when the motion archetype is `pulse`, `stutter` or `surge`); structure: mid; a ground field: high |
| `full` | 3 | hero: `accent` on bass and hits; structure: mid; the event mark: hits |

Everything outside the plan falls back to a behavior that does not listen: the other ground layer, the information and the finish pass keep time (`drift`, `beat`), the background is `still`. The instrument is the meter: it listens to all five classes and is outside the budget.

## Rules the validator checks
- Every layer of a v2 project declares `temporal`. A composition with no declarations is reported as a legacy project and keeps the old rule.
- `behavior` is one of the six; `listens` lists known classes; a listening behavior has at least one class, a non-listening one has none.
- No more layers listen than the strategy allows (never more than 3; the instrument does not count). `none` allows none.
- A shader that listens must read an audio uniform; a `drift` or `beat` shader does not have to.
- Warnings: a non-listening layer that still carries `p.audio` or a band modulation (the gate closes them), a listening layer with nothing wired to the audio, a missing `reason`.

## Writing it by hand
Decide the story first (`audio-direction.md`), then declare: one layer per band story, the rest `drift` or `beat`. To set it in a finished project: `python scripts/plan_ir.py brief.json --apply project.json` (or `python scripts/audio_semantics.py project.json` to see what the strategy would give).
