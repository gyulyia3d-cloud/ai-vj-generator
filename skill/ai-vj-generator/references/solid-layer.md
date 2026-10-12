# 3D generativo: the `solid` layer (Phase 12)

A `solid` layer draws one 3D form seen by a camera that orbits it. The 3D exists only to generate the animation: the output is a flat layer with alpha like any other, the surface stays a 2D constraint (Surface IR), and nothing here is a 3D scene of the installation.

## Decision: custom WebGL2, no 3D library
The form is a signed distance function (SDF) marched in a fragment shader (`app/solid.js`, on the renderer of phase 2). No three.js, no Babylon. Reasons: (1) the product generates 2D animation from an intention, so a scene graph, a mesh loader and a model format would be weight with no use; (2) a library brings its own clock and state, and the project's rule is that a frame is a pure function of the project and the frame number; (3) an SDF is about ten lines per form, needs no geometry upload, fits the texture/framebuffer pools and the render graph like any other GPU layer, and a generator (human or AI) can read and change it. What this gives up: meshes, imported models and rasterised triangles. `model` (OBJ) and `splat` stay as they are; instanced meshes and many particles are Phase 13 (GPU particles).

## Parameters
`p.kind` is the form. `p.size` scales it (0.3 to 2.5; it is the parameter the Animation IR plays on). `p.p1..p4` mean different things per form (the inspector shows the labels). `p.material` is `fosco` (matte), `metal` (reflects a procedural sky built from `c1`, `c2` and the background) or `vidro` (glass: dark body, strong rim, partly transparent). `p.orbit` is whole camera turns per loop (0 to 4; 0 = still camera). `p.elev` camera elevation in degrees, `p.dist` camera distance, `p.light` light azimuth, `p.fog` fades far parts to the background. `c1` and `c2` colour the form by its normal, `cbg` is the background. `alphaMode` `alpha` leaves the background transparent, `opaque` paints it. `res` is the internal resolution (0.25 to 1; lower it on LED walls).

| form | what it draws | p1 / p2 / p3 / p4 |
|---|---|---|
| `ESFERA` | a sphere deformed by a sine volume (organic, breathing) | deformation · frequency · radius · deformation turns per loop |
| `TORO` | a torus with a rounded-square section, twisted along its length | twists · thickness · major radius · turns per loop |
| `CRISTAIS` | a box folded on itself by `abs`, rotations and offsets (faceted crystal) | folds · angle · crystal size · breathing |
| `GIROIDE` | the gyroid minimal surface cut by a sphere | thickness · frequency · radius · phase turns per loop |
| `COLUNAS` | a field of columns whose heights come from a hash and breathe | max height · density · width · breaths per loop |
| `ANEIS` | tilted orbital rings, each turning at its own whole rate | rings · spacing · thickness · turns per loop |
| `ONDAS` | a wave surface cut in a disc | height · frequency · crests · cycles per loop |
| `ESPONJA` | a Menger sponge (iterated cross cut), turning | iterations · hole · size · turns per loop |

## Determinism and the loop
Time enters only through the loop phase `uPh` and through whole turns (`orbit`, and the `turns`, `cycles`, `breaths` parameters, which are rounded), so frame `loopFrames` equals frame 0. There is no `Date.now`, no `Math.random`, no clock: a hash of the cell and the seed decides everything random. With `orbit` 0 and the turns parameter 0 a solid is still. Audio enters only through `uBass` (deformation, height) and `uHit` (light), and only if the layer's `temporal` declaration listens (Phase 10).

## Where the generators pick it
`solid` is a hero type of the Creative IR (`registry/creative.json`: `heroTypes`, the `families` weights of the verbs and `solidKinds`, which maps each of the 32 verbs to a form: `grow`, `breathe`, `bloom`, `release`, `expand`, `emerge` ask for `ESFERA`; `orbit`, `converge`, `repel`, `attract` for `ANEIS`; `contract`, `erode`, `collapse`, `compress` for `ESPONJA`; `drift`, `flow`, `oscillate`, `sink` for `ONDAS`; and so on). The Animation IR plays its archetype on `size`. The Depth IR can put the layer in a plane like any hero; its camera moves the finished layer in 2D, the orbit moves the camera inside the solid. A hard fold or active area still only allows a focus pull.

## Limits
One form per layer, one pass, no shadows, no refraction, no reflection of other layers. Raymarching is costly: about 72 steps per pixel plus 4 more for the normal; measure with `layer_cost.mjs` and use `res` 0.5 on large walls. Edges are not anti-aliased except by the internal resolution being downscaled; for a clean edge render at `res` 1. A solid is a figure: use one as the hero and keep the rest of the composition 2D.
