# Partículas em GPU: the `particles` layer (Phase 13, stateless)

A `particles` layer draws 50 to 20,000 points in one GPU call. The first version is **stateless**: the position of every particle is a closed-form function of its index, the project seed and the loop phase `uPh`, computed in the vertex shader (`app/particles.js`). Nothing is simulated from one frame to the next.

## Decision: closed form first, simulation later
- A frame is a pure function of the project and the frame number. With closed-form positions, frame N is the same if it is asked for out of order, in parallel or after a scrub, and the loop closes by construction because every frequency is a whole number. `particles_check.mjs` proves it (frame 20 after frames 3, 27, 11 is byte identical).
- Randomness per particle is an integer hash (`uint`, no `sin`), so it is identical on every GPU.
- **Simulation with state** (collisions, attraction between particles, fluid-like motion) is not here on purpose. When it comes it goes through the RenderGraph history of Phase 4 (a position texture in ping-pong) and carries its own migration and visual test.
- Drawing: `gl.POINTS`, no vertex buffer (the vertex shader reads `gl_VertexID`), one draw for all particles, soft round sprite in the fragment shader. The renderer gained `r.drawPoints(n)`, a custom vertex shader option in `r.program`, the blend mode `soma` (additive colour, normal alpha) and the metric `activeParticles`.

## Parameters
`p.kind` is the motion rule. `p.size` is the extent (0.3 to 2.5; the parameter the Animation IR plays on). `p.p1..p4` mean different things per rule (the inspector shows the labels). `p.count` 50 to 20000. `p.dot` is the particle size in pixels at 1080 lines (0.5 to 40; capped at 64 internal pixels, a fixed cap so it does not depend on the device, and never below 1 pixel). `p.soft` softness of the sprite edge. `p.blend` is `soma` (additive glow) or `normal` (alpha over, order of index). `alphaMode`, `res`, `c1`, `c2` (each particle picks a mix of the two), `cbg`.

| rule | what it draws | p1 / p2 / p3 / p4 |
|---|---|---|
| `ORBITA` | tilted elliptical orbits, each at its own whole number of turns | radius · flattening · radius spread · turns per loop |
| `FONTE` | ballistic jets that rise and fall and start again | height · spread · base width · jets per loop |
| `ESPIRAL` | spiral arms of a galaxy, rigid whole turns | radius · twist · arms · turns per loop |
| `CHUVA` | a fall with lateral drift and sway | height · drift · sway · falls per loop |
| `EXPLOSAO` | radial bursts that fade, in waves | reach · spread · wave delay · bursts per loop |
| `ENXAME` | particles sliding along a Lissajous curve | amplitude · frequency X · frequency Y · cohesion |

## Determinism and the loop
Time enters only through `uPh` and whole numbers (`turns`, `jets`, `falls`, `bursts` and the Lissajous frequencies are rounded), so frame `loopFrames` equals frame 0. No `Date.now`, no `Math.random`, no clock. Audio enters only through `uBass` (reach and size) and `uHit` (brightness), and only if the layer's `temporal` declaration listens (Phase 10).

## Where the generators pick it
`particles` is a hero type of the Creative IR (`registry/creative.json`: `heroTypes`, the `families` weights of the verbs `scatter`, `dissolve`, `release`, `rise`, `orbit`, `bloom`, `expand`, `attract`, `repel`, `drift`, `flow`, `converge`, and `particleKinds`, which maps each of the 32 verbs to a rule). The Animation IR plays its archetype on `size`. Python (`brief_to_project.py`) and the browser (`genai.js`) give the same project.

## Limits
Points only: no trails (a trail needs history: later), no collisions, no particle-to-particle forces, no emitter with its own clock. 20,000 points is the ceiling of the control; the cost is dominated by overdraw, so a big `dot` with `soma` is the expensive case. A flat sprite has no depth: the Depth IR can still put the whole layer in a plane.
