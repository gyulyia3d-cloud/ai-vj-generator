# Audio direction (structured audio-reactivity)

Audio is a design decision with a declared strength, a role for each band and bindings you can read. Mechanics: `audio-bus.md`. This file is how to decide.

## 1. Strategy (`audio.strategy`)

| Strategy | Gain on level/hit/presence | Use for | Notes |
|---|---|---|---|
| `none` | 0 | contemplative rooms, silent installations, pieces that must not depend on music | motion keeps going (BPM waves, integrated time, loop phase); say why in `meta.contract.audioStrategyReason`; the validator drops the "shader must read audio" error |
| `subtle` | 0.4 | ambient, lounge, background loops | accents are small; the picture breathes |
| `structural` | 0.7 | corporate, cinematic | sections (build, drop) shape the picture, hits do not shake it |
| `rhythmic` | 1.0 (default) | clubs, concerts, VJ clips | beat-locked accents, integrated travel |
| `full` | 1.3 | festivals, drops, strobing-style sets | keep inside flash limits (≤ 3 flashes per second) |

## 2. Roles of the signal

| Signal | Role | Typical target |
|---|---|---|
| `uBass` / `bass` | mass, weight | scale, brightness of the hero, line weight |
| `uMid` / `mid` | body, rotation | spin, density, displacement amount |
| `uHigh` / `high` | detail, sparkle | thin lines, grain amount, small particles |
| `uHit` `uMidHit` `uHighHit` | accent, event | one-frame flashes, steps, glitch triggers, the focal event |
| `uPres` | openness | contrast and aperture: open up when the track gets airy |
| `uBassT` `uMidT` `uHighT` | travel through space | camera, noise-space position, orbit angle (use `sin/cos/fract`) |
| `uOnBeat` `uBSin*` `uBTri` | the grid itself | anything that must stay locked to the tempo without audio |

Rule of three: one layer carries the bass story, one the mid, one the high. More than 3 audio-driven non-shader layers flatten the hierarchy (validator warning).

## 3. Section map (what each part of a track asks for)

| Section | Picture | How |
|---|---|---|
| intro | sparse, ground only, slow | strategy subtle; `lfo` modulation; no hits |
| build | density up, narrowing frame, rising detail | `mod` on `count`/`weight` from `high` or an `lfo` with 1 cycle per loop; speed up via integrated time |
| drop | the focal event lands; release zone is used | `hit` on the hero; a wipe or zoom transition on the downbeat |
| break | strip back; one element survives | transition `iris`/`fade` to a composition with a rest |
| outro | return to the ground | reverse of intro |

## 4. Binding recipes (`layer.mod`)

```json
"mod": [
  { "k": "weight", "src": "bass", "min": 4, "max": 10, "mode": "set" },
  { "k": "spin", "src": "lfo", "cycles": 2, "shape": "tri", "min": 0.5, "max": 1.5 },
  { "k": "count", "src": "high", "min": 0, "max": 12, "mode": "add" },
  { "k": "alpha", "src": "onbeat", "min": 0.4, "max": 1 }
]
```

Choose the source by the role in section 2. A binding without a reason in the layer's `role` is cut. `lfo`, `onbeat` and the BPM waves are free (they do not count toward the 3 reactive layers); band sources count.

## 5. Checks

- Does the piece still read with the sound off? (Rhythmic pieces should; `none` pieces must.)
- Does each audio-driven layer say what it listens to and why?
- Flash: no more than 3 strong luminance flashes per second for any strategy.
- The test source (ÁUDIO tab) shows every binding without a microphone; export uses the synthetic BPM bands, so the render is reproducible.
