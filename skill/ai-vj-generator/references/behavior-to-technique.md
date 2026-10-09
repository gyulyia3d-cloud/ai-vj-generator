# Behavior to technique

The question is never "which generator should I use?". It is "what visual behavior must exist for the idea to be true?". Then:

```text
concept → visual behavior → temporal behavior → composition → rendering need → technique → implementation
```

Generators, shaders and libraries are **verbs**, not presets. Only the behavior decides.

## Decision table

| The behavior is… | Use | In this engine |
|---|---|---|
| A few discrete, designed objects moving through time: type, logo, geometry, choreography, editorial timing | Motion / timeline code | `typewall`, `pixeltext`, `symbols`, `shape`, `text`, `logo`, `blocks`, or a `code` layer |
| Exact 2D forms: lines, fills, masks, crisp vector scaling, type | Canvas2D / SVG | `lines`, `shape`, `text`, `hazard`, `structure`, or a `code` layer |
| 2D algorithmic systems: particles, fields, parametric forms | Canvas2D algorithms (p5-style logic) | `flow`, `tunnel`, `organism`, or a `code` layer |
| Many pixels obeying one rule: fields, SDF, interference, distortion, procedural material, feedback | WebGL / GLSL | `shader` layer with custom `src` (GLSL ES 1.00 contract in `project-schema.md`) |
| Real depth, camera, lighting, volume | 3D | A `code` layer with an explicit projection, or a shader raymarch; state the camera model |
| Exact layout plus a procedural material | Hybrid | Stack a vector/text layer over a shader layer; each stays independently exportable |

Use a shader **only if** at least one is true: the concept is a field; the effect is pixel-parallel; it depends on procedural texture or material; thousands of elements share one rule; feedback or per-pixel distortion is central. Otherwise take the simpler implementation.

The bundled engine is a Canvas2D + WebGL2 layer compositor. SVG, p5, PixiJS, regl and Three.js are not bundled; they appear in `library-matrix.md` as a vocabulary of what each is good at, and as options when the user explicitly takes the work to another runtime. Inside this engine the equivalent is a generator, a `code` layer or a shader layer.

## Behavior vocabulary

Drift, oscillation, acceleration, damping, spring, overshoot, accumulation, diffusion, attraction, repulsion, collision, flocking, branching, growth, decay, morphing, erosion, reveal, conceal, fracture, recombination, feedback, synchronization, desynchronization. Pick the one the concept requires, then choose how to render it. Details: `knowledge/motion-generative-gpu.md`.

## Concept → system (the pattern to learn from generative sketches)

```text
conceptual metaphor → system entities → relationships → state changes → visual traces
```

A metaphor is turned into entities with rules (what attracts, what scatters, what accumulates, what regenerates), and the picture is the trace of those rules over time. Do not copy anyone's ontology or parameter set; borrow only the pattern.

## Technique diversity

Across the compositions of one project, avoid repeating the primary technique. If three compositions are all particles over noise, the set is one idea. See `knowledge/visual-dna-diversity-critique.md` §29–§30 and §41.

## Performance

Watch pixel count, overdraw, shader iterations, particle counts, texture and render-target size. The engine renders previews at a reduced scale; export at full size is validated before it runs. Scale quality before breaking the intended visual language. Large walls (5120 wide and up) need large elements anyway: hairlines and micro-HUD are both unreadable and expensive.

## Post effects

Bloom, grain, scanlines, chromatic separation, displacement, feedback trails, dithering and blur are finishing tools, not concepts. A composition whose main idea is "glow" or "noise wallpaper" fails the quality gate.
