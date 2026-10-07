# Animation principles and motion design for abstract, beat-locked visuals

Character animation and motion design give the vocabulary for deliberate movement. In VJ work the "character" is a field, a shape or a word, and the clock is the beat. The engine's constraint shapes everything: **motion must be a function of the frame and close the loop**, so physical feel is built from closed-form curves (easing, damped springs, oscillation), not from accumulated simulation.

## The 12 principles (Thomas & Johnston, *The Illusion of Life*, 1981), translated

| Principle | In character animation | In abstract VJ | Engine |
|---|---|---|---|
| Squash and stretch | Volume preserved while deforming | A form compresses on the kick and stretches on release; keep area constant (sx × sy ≈ 1) | Pair `sx` up with `sy` down on the hero; pulse on `div` 1/4 |
| Anticipation | Small opposite move before the action | A brief contraction, density drop or darkening just before the drop or event | `event.at` one beat after a reduction; lower the opacity of support layers in the bar before |
| Staging | Make the idea unmistakable | One hero per bar; support layers yield (lower opacity, slower division) | Hierarchy: hero opacity 1, support 0.4–0.7 (see `art-direction.md`) |
| Straight ahead vs pose to pose | Frame-by-frame vs keyframes | Generative flow (straight ahead) vs states switched per beat (pose to pose) | `motion: smooth` + `flow` vs `motion: step` + per-beat states |
| Follow-through and overlapping action | Parts keep moving after the body stops | After the event, secondary layers settle later than the hero | Give support layers a `phase` offset (0.05–0.2) so they lag the hero |
| Slow in, slow out | Easing at start and end | Cosine-shaped or eased oscillation instead of linear ramps | Prefer `sin`/`loopv` motion in shaders; `smooth` motion mode |
| Arcs | Natural paths curve | Orbits and curved paths instead of straight lines | `organism` spin, `flow` orbit `radius`, LISSAJOUS recipe |
| Secondary action | Supporting gesture that enriches the main one | Grain, scanline, data log ticking under the hero | `bg` grain, `data`, `hud` at low weight |
| Timing | Number of frames defines weight and mood | Beat division defines energy: 1/1 heavy, 1/16 nervous | `div` per layer; `speed` |
| Exaggeration | Push past realism for clarity | Push the pulse on the hero only; keep the rest calm | `pulseAmt` high on one layer, near zero elsewhere |
| Solid drawing | Volume and weight | Consistent perspective and depth cues | `tunnel` power, `organism` tilt, depth stack of layers |
| Appeal | Charisma, readability | A clear, memorable shape that survives distance | Fewer, bigger elements on LED; strong silhouette |

## Physical adjectives → motion parameters

| The brief says | Mass | Damping | Speed | Cuts | Engine |
|---|---|---|---|---|---|
| pesado, industrial, massivo | high | low (long ring) | slow travel, hard stop | on beat 1 | `motion: step`, `div` 1/1–1/2, big `pulseAmt` on kick, `stepped` lines |
| líquido, orgânico, fluido | medium | high | continuous | none | `motion: smooth`, `flow`, CAMPO FBM, `breathe` high |
| elástico, saltitante | low | low | fast with overshoot | on beat | `shape` `pulseAmt` 0.4–0.8 at `div` 1/8, squash/stretch pair |
| mecânico, preciso, técnico | — | critical (no overshoot) | constant | quantized 1/4 or 1/16 | `motion: step`, `measure`, `data`, `hud` |
| etéreo, flutuante | very low | high | very slow | none | `speed` 0.25–0.5, loop 8–16 bars, low contrast palette |
| nervoso, caótico | low | low | fast, irregular | 1/16 | `div` 1/16, `post.prob` 0.6+, `flow` high `amp` (watch photosensitivity) |

## Motion design vocabulary

- **Easing families** (Robert Penner's easing equations, 2001, the basis of most tools): linear, sine, quad, cubic, expo, back (overshoot), elastic, bounce. In the loop-safe engine, use sine-based motion for smooth, and quantized steps for mechanical.
- **Stagger**: the same motion offset per element (letter, line, tile). Engine: `phase` per duplicated layer; in GLSL, add `id * k` to the phase of each cell.
- **Hold**: a still moment makes the next move hit harder. A composition can hold for a bar before the event.
- **Match cut / morph**: transition through a shared shape (ring becomes tunnel). Choose compositions so that the last state of one resembles the first of the next, and use `fade`.
- **Camera language in 2D**: push-in (scale up over the loop), parallax (layers at different speeds), whip (fast `x` jump with blur). Engine: `sx`/`sy`, per-layer `speed`, `blur` during `event`.
- **Rhythm vs counterpoint**: visuals can follow the music (sync) or answer it (counterpoint: a slow field over a fast track). The brief decides; write it in `grammar.audio`.

## Title design and motion graphics lineage

| Reference | Principle | Use |
|---|---|---|
| Saul Bass (*Vertigo*, 1958; *Anatomy of a Murder*, 1959) | Reduce the film's concept to one graphic idea in motion | One idea per composition, said with shape |
| Maurice Binder (Bond gun-barrel and titles, 1962–) | Silhouette, liquid light, rhythm with the theme | Silhouettes + liquid fields on beat |
| Pablo Ferro (*Dr. Strangelove*, 1964) | Hand-drawn type, quick cuts | Type as texture, fast cutting at 1/8 |
| Kyle Cooper (*Se7en*, 1995) | Scratched, jittery, layered type; the medium's damage as mood | `post` glitch on `text`, scramble animation |
| Motion graphics studios (see `artists-studios.md`) | Systems, 3D abstraction, typography in space | Treat as principles, never as styles to copy |

## Loop discipline

Every movement has origin → development → resolution → return inside the loop. Check the hero layer at frame 0 and at the last frame: they must meet. If a movement cannot close (a fall, an explosion), resolve it before the loop ends and start it again from rest.
