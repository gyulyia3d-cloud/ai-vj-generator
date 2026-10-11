# Depth IR (2.5D)

A 2.5D scene has no mesh. Each generated layer gets a **depth** (`layer.z`, -1 far, +1 near) and the composition gets **one camera** (`composition.camera`). The camera moves the planes against each other, so a flat stack of layers reads as a space.

Compiled by `scripts/depth_ir.py` (Python) and `app/depth.js` (browser) from the same data, `registry/depth.json`; both give the same IR and the same transforms (`depth_check.mjs`). The generators and `plan_ir.py --apply` write `layer.z`, `composition.camera` and `meta.depthIR` (one entry per composition).

This is **not 3D**: no mesh, no camera inside a scene, no occlusion. For a real camera use the 3D phase. The `parallax` layer (a photo plus a depth map) and the `splat` layer stay as they are; the Depth IR is for the layers the generators make.

## What the camera does to a plane at depth `z`
| effect | what happens | where |
|---|---|---|
| parallax | the plane slides by `-camera offset × unit × (z - focus)`: near planes slide one way, far planes the other, the focus plane stays | `sway`, `crane`, `orbit` |
| perspective | the plane scales by `1 + dolly × (z + 1) / 2`: near planes grow more than far ones | `dolly` |
| fog | planes behind the focus lose opacity and saturation: `fog × clamp((focus - z) / 1.5)` (0.1 by default; `rack` has none, it is a pure focus pull) | every camera |
| focus | planes farther than 0.25 from the focus plane blur: `dof × unit × (|z - focus| - 0.25)` | every camera |

`unit` is the short side as a 16:9 frame would have it (`min(H, 0.5625 W)`), so the same project reads the same on 4500×800 and on 1920×1080. Blur also applies in front of the focus plane (beyond the 0.25 zone); fog does not, because what is near is never hazy.

## The camera
```json
"camera": { "move": "sway", "amp": 0.05, "cycles": 1, "phase": 0, "focus": 0.2, "fog": 0.3, "dof": 0.012, "steps": 8 }
```
| move | what moves | amp is |
|---|---|---|
| `still` | nothing; planes keep their fog and focus | 0 |
| `sway` | side to side | fraction of the unit |
| `crane` | up and down | fraction of the unit |
| `orbit` | a small ellipse (y has half the height of x) | fraction of the unit |
| `dolly` | push in and out | fraction of scale at the nearest plane |
| `rack` | nothing moves; the focus plane travels between far and near | focus travel in z units |

- **Whole cycles.** `cycles` is an integer number per loop (`dolly` runs half the bars, the rest once per loop), so the loop closes. The camera never listens to the audio and ignores the `temporal` gate: it keeps the loop's time.
- `steps` (optional, `stutter` uses 8) holds the camera in steps, as the stepped archetype moves.
- The archetype of the Animation IR chooses the camera (pulse and breathe: dolly; glide and stutter: sway; orbit: orbit; ripple: rack; settle: crane); a vertical movement axis turns sway into crane. The briefing's energy scales `amp` (0.6 to 1.4 times the registry value).
- **Surface IR.** A hard constraint (declared folds, or an active area) leaves only `rack` (or `still`): nothing may slide or grow across a seam. Without them nothing changes. `canvas.folds` with a moving camera is a validator error.

## The planes
The tier of a layer (its role starts with `hero:`, `structure:`, `ground:`, `event:`, as in the other IRs) gives its range; layers of one tier are spread over it, the bottom layer farthest.

| tier | z range | why |
|---|---|---|
| ground | -0.9 to -0.5 | slowest parallax, most fog, softest focus |
| structure | -0.4 to -0.2 | the module the eye measures against sits behind the hero |
| hero | 0.1 to 0.3 | the focus plane; the hero is never hazy or soft |
| event | 0.6 to 0.8 | an event mark passes in front |

**Screen plane, no `z`:** the background, instruments, information (text) and the finish. Text must not slide against a fold or soften, a meter is a meter, the finish covers everything. The focus is the mean z of the hero layers (0.2 when there is none).

## `meta.depthIR[i]`
Camera, `focus`, `planes` (name, tier, z, fog, blur in pixels), `screen` (layers on the screen plane), `parallax` (the largest slide in pixels on this surface, the scale gain in percent, the largest blur and fog), `seam` (whether a hard constraint forced the focus pull, and the rule) and `loop` (`closes: true`, `audio: false`). The numbers are the same ones the engine uses every frame, so the IR describes what you will see.

## Writing it by hand
Run `python scripts/plan_ir.py brief.json --apply project.json`: it gives every composition its camera and planes (idempotent) after the other three IRs. Or set `layer.z` and `composition.camera` yourself; `validate_project.py` checks them:
- error: `z` outside -1..1, an unknown `move`, `cycles` that is not a whole number (the loop would not close), `amp` out of range, a moving camera on a surface with `canvas.folds`.
- warning: `z` on text, a meter or the finish; `z` without a camera (nothing happens); a camera without any `z`; a parallax so large that the far plane shows stretched edges.

A project with no camera and no `z` renders exactly as before.

## Common mistakes
- Putting `z` on the title: it would slide and soften. Leave information on the screen plane.
- Moving the hero by `z`: the hero is the focus plane and should stay still against the frame; give the depth to the ground and the structure.
- A big `sway` on a folded wall: use `rack` there, or no camera.
- Using `dolly` with a hand-written `cycles: 1.5`: the loop does not close.
