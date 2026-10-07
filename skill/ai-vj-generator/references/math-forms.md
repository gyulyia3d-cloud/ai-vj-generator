# Mathematical and physical forms: a catalogue for building original systems

Mathematics and physics are the largest *free* vocabulary a VJ has: exact, scalable to any pixel map, and already loaded with meaning. This file is the index. Ten forms are shipped as tested layers (`recipes/`, `python scripts/recipes.py list`); the rest are formulas to implement in a `code` layer or a shader. Use a form because its **behaviour** carries the concept, never because it looks impressive (`behavior-to-technique.md`).

Sources: parametric-curve and distribution libraries from motion-design tooling, three.js parametric geometry, Taichi's simulation examples, d3's scales and layouts, and the TouchDesigner GLSL chapters. Formulas are public mathematics; every implementation here was written independently (`provenance.md`, `repo-analysis.md`).

## 1. How to choose a form

| If the idea is… | Reach for | Why |
|---|---|---|
| growth, morphology, a natural form from one law | superformula, phyllotaxis, L-systems, rose curves | one equation spans many species of shape |
| cycles inside cycles, time, gravity, scale | Kepler orbits, pendulum wave, Lissajous, spirograph | integer ratios make closed, readable choreography |
| sound, vibration, resonance | Chladni figures, wave interference, standing waves | the physics of sound drawn directly |
| order inside chaos, smoke, nerves, dust | strange attractors (Clifford, De Jong, Lorenz) | structure that never repeats yet stays itself |
| order without repetition, crystal, architecture | quasicrystal, Penrose-like waves, aperiodic tilings | forbidden symmetry feels engineered and alive |
| infinite depth, recursion | Julia and Mandelbrot sets, IFS, Sierpinski | detail at every scale; the "world that keeps opening" |
| analysis, signal, invisible fields | domain colouring, vector fields, iso-lines | topology made visible |
| pulses, flocks, networks | point processes, Voronoi, relaxation, flow lines | emergence from local rules |

## 2. Shipped recipes (tested, loop-closing)

| Id | Kind | Principle | Means | Strip behaviour |
|---|---|---|---|---|
| `superformula` | code | Gielis superformula rings with a travelling morph | growth, archetype, transformation | one per height-sized module |
| `clifford` | code | strange attractor cloud, parameters on a circle | order in chaos, dust, nebula | `copies` repeats it with phase offsets |
| `pendulum-wave` | code | f = base + floor(i·spread) cycles per loop | synchrony and drift, ensemble | native to wide canvases |
| `wave-interference` | code | orbiting point sources, dot grid | fields, sound, radiation | grid = LED pixel language |
| `spirograph` | code | hypotrochoid family, a head traces each curve once per loop | drawing itself, mechanism | centred; layer several |
| `kepler` | code | closed-form Kepler ellipses, third-law periods | cosmos, scale, gravity | centred; two layers on a strip |
| `chladni` | shader | nodal lines of a vibrating plate, two modes blended | sound made visible, resonance | one plate per module |
| `quasicrystal` | shader | n plane waves, aperiodic n-fold symmetry | crystal, forbidden symmetry | covers any aspect |
| `domain-coloring` | shader | iso-lines of arg and modulus of a rational function | invisible forces, topology | covers any aspect |
| `julia-orbit` | shader | z²+c with c on a circle, smooth-escape bands | recursion, depth | covers any aspect |

Build a layer: `python scripts/recipes.py layer chladni --set p1=4 --name "<name from this brief>" --role "<why it exists>"`. Look at all of them: `python scripts/recipes.py gallery --out g.aivj.json`, `node scripts/make-artifact.mjs g.aivj.json --out g.html`, `node scripts/contact_sheet.mjs g.html contato`.

Check combinations by eye: a full-wall recipe (`stagger-grid`, `wave-interference`) over a dense hero turns to noise; lower its opacity, change its scale, or give each a different tier and region. A recipe is a move, not a preset: change the numbers, the palette roles and the audio mapping, give it a name and a `role` from the briefing, and combine at least two ideas so no composition is a recipe alone.

## 3. Formulas to implement (not shipped)

| Form | Definition | Notes for VJ use |
|---|---|---|
| Rose | `r = cos(kθ)`, `k = n/d` | closes over `θ ∈ [0, πd]` when n and d are both odd, else `[0, 2πd]` |
| Lissajous | `x = A sin(at+δ)`, `y = B sin(bt)` | closed for integer a, b; sweep δ for the classic opening ribbon |
| Epitrochoid | `x=(R+r)cos t − d cos((R+r)/r·t)`, `y=(R+r)sin t − d sin((R+r)/r·t)` | closes after q turns when R:r = p:q |
| Lamé superellipse | `|x/a|ⁿ + |y/b|ⁿ = 1` | n 2 circle, 4 squircle, <1 astroid; morphing n is a clean shape transition |
| Phyllotaxis | `r = c√n`, `θ = n·137.508°` | already an engine generator; vary the angle slightly for spirals that appear and dissolve |
| Torus knot (p,q) | `((R + r cos qt) cos pt, (R + r cos qt) sin pt, r sin qt)` | trefoil is (2,3); rotate in 3-D, project with the camera of `creative-coding-patterns.md` §3 |
| Möbius strip | `((1+v/2·cos(u/2))cos u, (1+v/2·cos(u/2))sin u, v/2·sin(u/2))` | one-sided surface: a loop with a twist, a good picture of "return changed" |
| Lorenz | `ẋ=σ(y−x)`, `ẏ=x(ρ−z)−y`, `ż=xy−βz`; σ 10, ρ 28, β 8/3 | integrate from seeded points each frame; rotate the camera by loop phase to close the loop |
| De Jong | `x'=sin(ay)−cos(bx)`, `y'=sin(cx)−cos(dy)` | same stateless trick as `clifford` |
| Chaos game / IFS | pick one of k affine maps at random, apply, plot | Sierpinski and fern; morph the map coefficients on a circle |
| Interference of N sources | `Σ sin(k·dᵢ − ωt)` | shipped as `wave-interference`; as a shader it becomes iso-lines |
| Superformula in 3-D | product of two superformulas over (θ, φ) | shell-like objects; cost needs a shader |
| Low-discrepancy points (R2) | `xₙ = frac(0.7548776662·n)`, `yₙ = frac(0.5698402910·n)` | a seedless alternative to random scatter with no clumps; the plastic-number cousin of phyllotaxis |
| Circle packing, Apollonian gasket | repeated inversion in circles | stateless by recursion to fixed depth |
| Elementary cellular automaton, rule 90 | cell(row n, col k) = 1 when `(n & k) == k` (Pascal mod 2, Lucas's theorem) | a closed form with no state: Sierpinski in any row. In GLSL ES 1.00 there are no bitwise ops: use repeated `mod(floor(x/2.), 2.)` |
| Wave grid, honeycomb, cone, helix distributions | place points on the form, drive size or colour by a field | the "distribution" idea: choose the geometry that carries the concept, then attach a behaviour |

## 4. Stateless physics: what to do when the engine forbids memory

A `code` layer and a shader are pure functions of the frame; there is no buffer carried between frames, so a true fluid or particle simulation cannot run. The following turn the *physics* into closed forms or bounded replays that look and behave like the simulation.

| Phenomenon | Closed or bounded form |
|---|---|
| Orbits | solve Kepler's equation each frame (`recipes/code/kepler.js`) |
| Damped spring | `x(t) = e^{−ζω₀t}(cos ω_d t + (ζω₀/ω_d) sin ω_d t)`, `ω_d = ω₀√(1−ζ²)`; ζ<1 bounces, ζ=1 is critical, ζ>1 is slow. Drive `t` from beat phase. Perceived duration and "bounce" (−1…1) are friendlier knobs than stiffness and damping; map them to ω₀ and ζ. |
| Wave propagation | sum of circular waves `sin(kr−ωt)/√r`, or d'Alembert travelling pairs `f(x−ct)+g(x+ct)`; a wavefront is the iso-line of `r − ct` |
| Standing waves, resonance | products of cosines (Chladni, pendulum wave) |
| Fluid look (stable-fluids idea) | the "advect" step of a stable fluid traces a point *backward* along the velocity field. Do that on an analytic, divergence-free field (curl of noise, or point-vortex sums) for K sub-steps per pixel or per seed: `p ← p − v(p)·dt`. The stateless result is a warped pattern that flows plausibly. |
| Vortex street | complex velocity of a periodic row of vortices `w(z) = −iΓ/(2λ)·cot(π(z−z₀)/λ)`; two staggered rows of opposite Γ give a Kármán street; shifting by one period λ per loop closes it |
| Slime-mould / network growth look | trace streamlines of a curl-noise field from seeded points, with lengths and weights from a falloff; the network read comes from many converging paths |
| Reaction-diffusion look | thresholded sum of plane waves at 0°/60°/120° gives Turing stripes and spots (the same as `quasicrystal` with n=3); for labyrinths add domain-warped noise |
| Particles | closed-form lifecycles: position as a function of birth time and age (`creative-coding-patterns.md` pattern D) |
| Soft bodies, granular, SPH, MPM | not live; render as metaballs of particles on closed-form paths, or pre-render in a real solver and import the frames as media |

## 5. Making any form loop

Verify, do not assume: `node scripts/loop_check.mjs <project>.html` renders the seam of every composition and layer. Its automatic verdict compares the seam with the other bar starts of the same loop, because an audio hit on the downbeat is a legitimate jump.

| Technique | Use |
|---|---|
| Whole cycles | every sine and rotation advances an integer number of cycles per loop (`TAU*uPh*n`, `K.TAU*K.t.ph*n`) |
| Parameter circle | move a parameter on a circle: `(a + r cos φ, b + r sin φ)`; used by the attractors, Julia, domain colouring |
| Noise on a circle | sample noise at `(x·s + R cos φ, y·s + R sin φ)` so the field returns |
| One period | shift a periodic structure by exactly one wavelength per loop (street, grating, tessellation) |
| Cross-fade | for evolutionary content blend `F(t)` with `F(t − T)` using weight `smoothstep` over the last bar |
| Mirror | ping-pong with a triangle wave when the form has no natural return |
| Beat grid | tie events to `K.t.beat` and `sub` so they land on the bar even when the shape is free |

Aliasing: a value that completes `n` cycles in `F` frames repeats every `F/n` frames; below about 4 frames per cycle it flickers or reverses (the wagon-wheel effect). Keep `n·` highest frequency under `F/4` (`perception-and-gestalt.md`).

## 6. Semiotics of mathematical form

| Form | Common associations | Handle with care |
|---|---|---|
| circle, orbit, spiral | cycle, time, cosmos, return | the default "mystical" cliché; justify it |
| lattice, grid, crystal | order, structure, systems, the city | cold and corporate if uncontrasted |
| fractal, recursion | infinity, nature, complexity, "psychedelic" | easy to overuse; keep palette discipline |
| wave, interference | sound, signal, communication | literal when a speaker is implied |
| attractor, cloud | chaos, memory, smoke, thought | needs a clear edge or a hero to read from far |
| knot, Möbius, loop | paradox, continuity, entanglement | a strong single hero, never a field |
| Voronoi, cells | biology, territory, networks | pairs with a growth verb |

The contract's `semioticIntent` should name the association you want *and* the one you refuse.
