# Animation, motion, physics, VFX and math: principles as parameters

How to make motion that looks intended. Every principle below is translated into something you can set in this engine (layer params, `p.echo`, `div`, `phase`, `speed`, `composition.motion`, `code` layer maths, GLSL). The sources are the working canon: Thomas and Johnston's twelve principles (*The Illusion of Life*, 1981), Richard Williams (*The Animator's Survival Kit*: spacing, timing, arcs), Material and Apple motion guidance (duration, easing, choreography), Robert Penner's easing equations, Reeves' particle systems, Reynolds' boids, Perlin and Quilez on noise and domain warping, and the generative practice of Casey Reas, Tyler Hobbs, Zach Lieberman, Manolo Gamboa Naon and others.

## 1. The twelve principles, procedurally

| Principle | Procedural translation | In the engine |
|---|---|---|
| **Squash and stretch** | Scale the long axis up and the short axis down by the same volume while speed rises; relax on impact | `sx`/`sy` driven by `uHit`/`F.pulse`; in a `code` layer `s=1+k*vel; sx=s; sy=1/s` |
| **Anticipation** | A small opposite move or dim before the main action; 2–6 frames at 30 fps | Event layers: pre-flash 3 frames, then the wipe; ease `back` (`K.ease.back`) |
| **Staging** | One clear focal point; light, scale and motion lead the eye; everything else supports | Hero tier owns scale and opacity (`craft-and-finish.md` §3) |
| **Straight ahead / pose to pose** | Simulation (state evolves) vs key states (designed poses between which you ease) | Generative layers (flow, particles) vs `step`/keyed layers (type, brackets) |
| **Follow-through and overlapping action** | Secondary parts lag the primary and overshoot slightly; phase offsets between related layers | `phase` offsets per layer (0.03–0.12 of a bar); `P.time.mode: "phase"` |
| **Slow in, slow out** | Ease at both ends; never linear unless it is a mechanism | Easing functions §3; `K.ease.*` |
| **Arcs** | Natural motion follows curves; straight lines read mechanical | Move along `sin/cos` pairs, Lissajous, splines; offset x and y phases |
| **Secondary action** | A small supporting motion that does not compete (breathing, drift, flicker) | Ambient `breathe` on the hero, slow drift on the ground |
| **Timing** | Duration and spacing set weight and emotion | §2 timing table; `div` (1/1…1/16), `speed` as whole cycles |
| **Exaggeration** | Push amplitude past realism, but with control | Raise `pulseAmt`, scale steps, event size; keep a ceiling |
| **Solid drawing** | Consistent volume, perspective and form logic | One module and constants for all layers; one depth model |
| **Appeal** | Clear shape, readable silhouette, a memorable detail | Hero silhouette first; a signature detail the audience remembers |

## 2. Timing is meaning

| Duration (at 120 BPM) | Reads as |
|---|---|
| 1–3 frames | impact, glitch, cut |
| 1/16–1/8 beat (60–120 ms) | tick, flicker, accent |
| 1/4–1/2 beat (125–250 ms) | snap, UI response, confident |
| 1 beat (500 ms) | the default "professional" move |
| 2–4 beats | gravity, build, weight |
| 1–4 bars | atmosphere, evolution, cinematic |

Rules: the slowest element is at least three times slower than the fastest; entrances take longer than exits; start a sequence 1–4 frames late rather than on frame 0; stagger in order of importance, total stagger under half a beat for UI-like text and up to a bar for atmospheric builds; hold longer on the thing that matters.

**Spacing** (where the frames fall) matters more than duration: close spacing = slow, wide spacing = fast. Easing is spacing.

## 3. Easing, the adverb of motion

Use at least three different eases per composition; no two unrelated layers share one. Direction: `out` for entrances (fast then settle), `in` for exits (slow then leave), `in-out` for travel between positions.

```
t in [0,1]
outCubic   = 1 - (1-t)^3                      confident, default entrance
inCubic    = t^3                              exits, wind-up
inOutCubic = t<.5 ? 4t^3 : 1-(-2t+2)^3/2      travel, calm
outExpo    = t==1 ? 1 : 1-2^(-10t)            snap with a long settle
outBack    = 1+c3*(t-1)^3+c1*(t-1)^2          overshoot (c1=1.70158, c3=c1+1): playful, springy
outElastic = 2^(-10t)*sin((10t-.75)*2pi/3)+1  wobble; use rarely
steps(n)   = floor(t*n)/n                     mechanical, interface, "step" clock
```

Mood: `expo.out` = confident, `sine.inOut` = dreamy, `elastic` = playful, `steps` = machine. Engine helpers: `K.ease.out/back/expo/in/step/smooth`, GLSL `vjEaseOut`, `vjPulse`.

## 4. Physics you can fake in closed form (stateless, deterministic)

The engine renders any frame independently, so use closed-form motion, not integrators with history.

- **Damped spring** from rest to a target after an impulse at time `t0`: `x = target * (1 - exp(-z*w*s) * (cos(wd*s) + (z/sqrt(1-z*z)) * sin(wd*s)))`, `s = t - t0`, `w = 2*pi*freq`, `wd = w*sqrt(1-z*z)`. `z` (damping ratio) 0.2 is bouncy, 0.7 is crisp, 1 is critical. This is "follow-through" for free.
- **Inertia / viscosity:** exponential approach `x += (target - x) * (1 - exp(-k*dt))`; closed form `x(t) = target + (x0 - target) * exp(-k*s)`.
- **Gravity and bounce:** `y = h * |cos(pi * s / T)| * exp(-d * s)` for a decaying bounce with a decay `d`.
- **Pressure and release:** `uBass` charges scale/thickness; `uHit` releases (a shock ring, a flash) that decays as `exp(-age*k)`.
- **Orbit and attraction:** parametrise positions as `centre + r(t) * (cos(a), sin(a))` with `a = TAU*(phase + k*bars)`; vary `r` and `a` per element by `hash(i)`.
- **Turbulence:** sum two or three octaves of noise at different speeds (multi-scale perturbation), never a single noise at one scale.
- **Collision / impulse:** at event time `t0`, add a decaying oscillation `A * exp(-s*d) * sin(w*s)` to position, scale or colour.

## 5. VFX vocabulary and how to fake it

| Effect | How |
|---|---|
| **Motion blur / trails** | `p.echo` 3–6 copies, `echoStep` 1–3 frames, `echoFade` 0.5–0.7 |
| **Echo / stutter** | `echoStep` 4–8 frames, 2 copies, `blend: add` |
| **Camera shake** | Offset the layer by a decaying noise burst on impact: `A*exp(-s*8)*(hash(n)-.5)`; keep it under 1% of the height on large walls |
| **Impact flash / anticipation** | 2–3 frame white or accent pop on `uHit`, then fall |
| **Shockwave** | `r = vjEaseOut(age)`, ring width and amplitude decay with age (recipe 7 in `glsl-recipes.md`) |
| **Chromatic split** | Two copies of a layer in different palette roles, offset by 2–6 px (scaled by pixel pitch), `blend: add` |
| **Scanlines / interlace** | Static texture drawn once; off on LED (moiré) |
| **Bloom / glow** | A blurred copy (`blur` param) on `blend: add` at 30–50%; finishing only |
| **Glitch (block)** | Quantised block displacement, strong on the downbeat (`K.glitch`); never full-frame random |
| **Datamosh / smear** | Echo with a large `echoStep` and a directional offset |
| **Particle lifecycle** | `age = fract(uPh*n + hash(i))`: birth, grow, fade; position `p0 + v*age + .5*g*age²` (closed form) |
| **Depth of field** | Blur and lower opacity on layers that are "behind" the hero |
| **Vignette / falloff** | Radial multiplier on coverage, not a gradient overlay |
| **Strobe** | Never above 3 flashes per second, never full-screen alternations (WCAG 2.3.1) |

## 6. Choreography and variety (the checklist that stops generic output)

1. **Every layer gets a motion verb** (impact: slams, drops; directional: slides, wipes, cuts; reveal: draws, fills, grows, counts; organic: breathes, drifts, orbits, morphs; mechanical: steps, snaps, locks, ticks). If you cannot name the verb, the layer is not designed.
2. Different eases, different speeds, different directions per layer. No more than two layers with the same ease.
3. Element order by importance: the thing that moves first is perceived as the most important.
4. One ambient motion per composition carried by several layers (shared breath), plus distinct accent motions.
5. Stillness is a verb. After a big move, hold.
6. Transitions are meaning: a crossfade says "this continues", a hard cut says "wake up", a long dissolve says "drift with me". Do not crossfade everything.
7. Do not enter everything the same way (not all from below with a fade).

## 7. Math as visual vocabulary

| Idea | Use for |
|---|---|
| `sin`, `cos`, oscillation | breathing, periodic state, arcs; frequency ratios give polyrhythm |
| Lissajous `x=sin(a t+d), y=sin(b t)` | graceful closed paths; ratios 1:2, 2:3, 3:4 |
| Polar coordinates, radial distance | emergence, orbit, falloff, tunnels, kaleidoscopes |
| **Golden angle** 137.508° (phyllotaxis `r = c*sqrt(i), θ = i*137.508°`) | natural, non-aligning distributions; sunflowers, organisms |
| **Golden ratio** 1.618 | scale steps, spacing, spiral growth |
| **Fibonacci** | counts of arms and petals (13, 21, 34); sizes in sequence |
| Noise (value, gradient, simplex), fBm | controlled uncertainty; use multi-octave, seeded |
| Domain warping `f(p + g(p))` | organic flow, marble, smoke (Quilez) |
| Curl of a noise potential | divergence-free flow for particles (no sinks) |
| Voronoi / Worley | cells, cracks, membranes, territories |
| Signed distance fields | crisp shapes, smooth union (`vjSmin`), outlines, glows |
| Cellular automata, reaction-diffusion | emergence; stateful, so approximate analytically or pre-compute |
| Attractors (Lorenz, Clifford) | chaos with structure; integrate a fixed number of steps per frame from a seed |
| Euclidean rhythms `E(k,n)` | event patterns (3,8), (5,8), (7,16); also spatial patterns |
| Moiré / interference | perceptual vibration from two close frequencies |
| Truchet, tiling, symmetry groups | modular order with variation |

Pick the maths from the behaviour, not the other way round. Constrain randomness: bounds, hierarchy, a seed, a reason.

## 8. Practitioners and what to take from each (principles, not styles)

- **Frank Thomas, Ollie Johnston, Richard Williams:** weight, timing, spacing, arcs, anticipation.
- **Oskar Fischinger, Len Lye, Norman McLaren, John Whitney:** abstract motion as music; rhythm as form; harmonic motion (Whitney's "digital harmony": frequency ratios drive position).
- **Saul Bass, Pablo Ferro, Maurice Binder:** reduction, bold cut shapes, one idea per beat.
- **Ryoji Ikeda, Carsten Nicolai:** data minimalism, precision, high-frequency information, grids, rhythm as measurement.
- **Vera Molnár, Manfred Mohr, Casey Reas, Tyler Hobbs:** rule-based systems with controlled perturbation; flow fields; overlapping vs non-overlapping shapes; palette discipline.
- **Zach Lieberman, Golan Levin, Memo Akten:** gesture and system; sound-image coupling; legible interaction of simple rules.
- **Refik Anadol, teamLab, Universal Everything, Quayola:** data or form as material at architectural scale; slow, immersive transformation.
- **Joanie Lemercier, NONOTAK, Marshmallow Laser Feast, UVA:** light, space and architecture; mapping as composition.
- **Inigo Quilez, Matt DesLauriers, Manolo Gamboa Naon, Shadertoy authors:** SDF modelling, palettes, domain tricks, craft in few lines.
- **VJ culture** (Resolume, Synesthesia, TouchDesigner artists): loopable, performable, layered, parameter-friendly clips.

Never "make it like [artist]". Extract: what is the rule, what is the constraint, what does the audience perceive, and write an original system with this brief's concept.

## 9. Laws of perception that motion obeys

- **Common fate:** things that move together are grouped. Use it to bind layers; break it to separate a hero.
- **Contrast of motion** (fast vs slow, still vs moving) steers attention more than colour.
- **Weber-Fechner:** perceived brightness is logarithmic; use gamma-aware ramps and ease exponentials, not linear ones.
- **Temporal aliasing:** features moving faster than about one pixel per frame at the viewing distance strobe; on 30 fps LED keep fast lines thick.
- **Flicker limit:** no more than 3 flashes per second, no large-area red/white alternation.
- **Persistence:** the eye holds an impact about 100–150 ms; a flash shorter than 3 frames reads as a flicker, not an event.

## 10. Quick recipes

- **Weight:** slow `inOut` over 2 beats + an overshoot `outBack` when it lands.
- **Energy:** short `outExpo` on beats with `uHit` scale pops.
- **Calm:** `sine.inOut`, 1–2 bar cycles, one ambient breath.
- **Tension:** slow accumulation (a counter, a thickening line) for 3 bars, a held silence for 1 beat, then the event.
- **Precision:** `steps` easing, quantised data updates, thin consistent line weights.
- **Organism:** noise-driven drift at two scales, a breath at the bar, a scan band every two bars.
