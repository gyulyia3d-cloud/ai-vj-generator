# Motion profiles

Five numbers (0 to 1) become an executable curve. Same numbers, same motion, in Python, in the engine and in any AI's head.

| Axis | 0 | 1 |
|---|---|---|
| `energy` | small, slow move | big move, fast ring (comes from the brief's `energy`) |
| `elasticity` | critically damped: one smooth bump | rings several times before it settles (overshoot up to ~66%) |
| `anticipation` | none | a clear wind-up dip right before the hit |
| `continuity` | stepped: the phase is quantised in time (interface, machines) | fully smooth (matter, water) |
| `rhythm` | 1 move per bar | 8 moves per bar; always a whole number of cycles per loop, so the loop closes |

## The curve: "kick and ring"

`curve(f)` (Python: `scripts/motion_profiles.py`; engine: `motionCurve` in `app/index.html`; `scripts/motion_check.mjs` compares the two to 1e-9):

- starts at **0** on the beat, rises to a peak of **1**, rings out (negative lobes when `zeta < 1`) and is back at 0 before the next beat;
- optional **wind-up**: a dip of `depth` over the last `ta` of the cycle, before the hit;
- optional **steps**: the phase is quantised to `steps` per cycle (low continuity);
- pure function of the loop phase, so deterministic and loop-closing.

Derived numbers (`motion_profiles.profile`): `zeta = 1 - 0.88*elasticity`; `wn = 7 + 11*energy`; `ta = 0.14*anticipation`; `depth = 0.30*anticipation`; `steps = 0` above 0.85 continuity, otherwise `4 + 28*continuity`; `cycles = bars * [1,2,4,8][round(rhythm*3)]`; `amp = 0.10 + 0.50*energy`.

## Using it in a project

A profile is played through `layer.mod` with `src: "lfo"`, `shape: "spring"`:

```json
"mod": [{ "k": "size", "src": "lfo", "shape": "spring", "cycles": 8, "zeta": 0.296, "wn": 12.5,
          "ta": 0.07, "depth": 0.15, "steps": 0, "min": 1, "max": 1.35, "mode": "mul" }]
```

`min..max` maps the curve (0 to 1; it may go below 0 for the wind-up and the ring) to a factor with `mode: "mul"` (the parameter is scaled), or to an offset with `add`. `cycles` is a whole number. The target parameter must be numeric and set in `p` (the validator warns otherwise). `lfo` is free: it does not count toward the three reactive layers.

Generate the entry instead of writing it: `python scripts/motion_profiles.py show --energy 0.7 --elasticity 0.8 ...` and `to_mod` in the same file.

## Mood defaults (`motion_profiles.MOODS`)

Elasticity, anticipation, continuity, rhythm. `industrial` 0.15/0.10/0.15/0.55 · `organic` 0.55/0.55/1.00/0.20 · `cosmic` 0.40/0.30/1.00/0.10 · `urban` 0.20/0.25/0.20/0.60 · `ritual` 0.30/0.65/0.90/0.15 · `glitch` 0.05/0.00/0.05/0.90 · `minimal` 0.10/0.20/1.00/0.10 · `liquid` 0.70/0.40/1.00/0.25 · `crystalline` 0.10/0.10/0.25/0.50 · `retro` 0.10/0.05/0.10/0.60 · `aggressive` 0.35/0.50/0.10/0.85 · `calm` 0.45/0.35/1.00/0.05. Override any axis in the brief with `motionProfile`.

## Design rules

- **One profile per composition, one hero move.** The hero plays the profile. The structure layer plays a softer copy (energy x0.7, elasticity x0.5, no wind-up, same cycles, so the two stay locked): that is follow-through.
- **Elasticity belongs to matter, not to machines.** A stepped, hard piece with a springy overshoot reads as a mistake; a liquid piece with no overshoot reads as dead.
- **Anticipation is cheap and strong.** 0.3 is enough to make a hit feel earned (`animation-principles.md`, principle 1).
- **Do not stack profiles on one parameter.** Two springs on `size` fight.
- **Rhythm is composition.** Fewer moves per bar (0 to 0.3) breathe; many (0.7 to 1) are a pulse. Vary it across the set.
