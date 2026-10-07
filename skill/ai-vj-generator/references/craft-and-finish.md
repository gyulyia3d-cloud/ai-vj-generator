# Craft and finish

What separates a produced piece from a generated one. Read before building any composition and again before delivery. This file holds principles abstracted from sets that worked: layered, named, harmonic, with a clear hierarchy. It contains no layouts, palettes or compositions to copy. Every project derives its own system from its briefing; what transfers is the discipline.

## 1. Every composition is a layered system (the layer rule)

A composition with two or three layers is a clip, not a system. It cannot be played, because there is nothing to mute, solo, rebalance or recolour. The target is **6 to 10 visible layers** per composition (minimum 5 excluding `bg` and `post`), built in tiers:

| Tier | Job | Typical share of attention | Examples of roles (derive yours from the brief) |
|---|---|---|---|
| **Ground** | The world the piece lives in: the void, the surface, the atmosphere | 5% | field, grain, a slow wash, a grid that is almost invisible |
| **Hero** | The one thing the concept is about | 40–55% | the organism, the word, the figure, the field |
| **Structure** | Geometry that measures or frames the hero | 15% | grid, rulers, rings, axes, wedges, guides |
| **Instruments** | Elements that read or track the hero, anchored to its real geometry | 10–15% | brackets on real points, rays, connection nets, readouts |
| **Information** | Small, quantised, repetitive detail | 5–10% | logs, counters, tags, coordinates, tickers |
| **Event** | A rare, large, decisive moment | 0 until it fires | a wipe, a word, a flash, a cut |
| **Finish** | The skin that unifies | 5% | scanline, grain, slices, chromatic split, vignette, glow |

Not every composition needs every tier, and a composition for a LED wall may drop Information. But a missing tier must be a decision recorded in the layer roles, never an accident. The five compositions of a set must not share the same stack: vary which tiers lead.

### Naming

Layers are named for **what they do in this piece**, in the project's language and voice: `MEDIDA DO VAZIO`, `RÉGUA`, `PULSO`, never `SHADER`, `FORMA`, `TEXTO`, `LAYER 3`, `COMP 01`. The name plus the `role` sentence is the documentation. The engine appends five fixed slots (shader, image, video, shape, text) switched off; rename the ones you use and leave the rest.

### Editability

Each layer must do one job, so it can be muted, soloed, retimed, recoloured or exported on its own. If removing a layer breaks the piece, the structure is wrong. Test: mute every layer except one at a time; each should still be a coherent image or a coherent accent.

## 2. One coordinate system: anchor the layers to the hero

Layers that are independent of each other look stacked. Layers that share geometry look designed.

- Pick **one reference point** (the hero's centre, a fold, a baseline) and derive the others from it: rings at multiples of the hero's radius, rulers that end where the hero ends, brackets that sit on real points of the hero, text that aligns to the structure's grid. In the engine this is what `cx`/`cy` on the hero layer does for `structure`, `measure` and the `hud` reticle; in a `code` layer, derive from `K.walls` and shared constants.
- Pick **one module** (a base unit, such as one twelfth of the height) and make spacing, grid steps, tick spacing and margins integer multiples of it.
- Pick **one or two constants** that recur (golden ratio 1.618, a 3:2 ratio, a 137.5° angle, a Fibonacci step) and use them for scale steps, spacing and angles. A constant system is why a layered piece reads as harmonious. Say which constants in the contract.

## 3. Hierarchy by ratio, not by taste

Decide the ladder before drawing, then keep it.

- **Opacity ladder:** hero 100%, structure 30–55%, instruments 60–80%, information 35–50%, ground 8–20%. Never two tiers at the same opacity.
- **Line-weight ladder** (in 1080-units): hero 2–3, structure 1–1.5, instruments 1.5–2, information as thin as legible; on LED or walls multiply for the pixel pitch (`references/aspect-ratios.md`).
- **Scale ladder:** a golden or 3:2 step between tiers; text sizes from one scale, not one-offs.
- **Colour ratio:** about 90% neutrals (ground, bone, steel), about 9% secondary, **about 1–5% accent**, and the accent only where the eye should land (an event, one target, the scan band). A palette is roles with reasons: ground, figure, support, field, accent. Tint neutrals toward the accent hue; avoid dead grey and pure `#000`/`#fff` unless the concept is exactly that.
- **Two focal points minimum**: the eye needs somewhere to travel. A single centred element floating in space is a placeholder.
- **Edge anchoring over centring:** pin things to edges, folds and grid lines; give the empty space a job.

## 4. Timing grammar (a score, not a loop)

- **Build / breathe / resolve** inside each loop and across the set: elements enter staggered in order of importance; one ambient motion carries the middle; the resolve is decisive and shorter than the build.
- **Two clocks.** Matter is *smooth* (eased, curved, continuous); interface is *step* (quantised, ticking). Mixing them deliberately is what makes a piece feel like machinery reading an organism. Use `composition.motion` for this.
- **Quantise information** to musical fractions (data updates every 1/4 beat, a counter every beat, a glitch on the downbeat). Information that updates every frame reads as noise.
- **Draw-on then hold.** Lines draw on, then stay; do not animate everything all the time. Stillness after motion is a tool.
- **Events** are rare, structural and anticipated: a short build-up (anticipation), a hard onset (3–6 frames), a hold, a clean cut back. Fire them on bar boundaries (every 4, 8 or 16 bars), not randomly.
- **Vary the verbs per layer** (`animation-principles.md` §6): no two layers with the same ease, speed and direction.
- **Strong beat vs weak beat.** Glitches and accents are stronger on the downbeat of a bar than on the others.

## 5. Depth and material, cheaply

- **Parallax and size attenuation:** nearer things bigger, brighter, faster; farther things smaller, dimmer, slower. A hero with a slight tilt and a parabolic depth bulge reads as an object, not a sticker.
- **Atmosphere:** a low-opacity field behind the hero, never a flat void; keep 3–5 persistent low-contrast ground elements so the frame is never empty while the foreground builds.
- **Texture:** a slow grain or scanline unifies layers; keep it off on LED walls where it turns into moiré.
- **Echo (trails)** with `p.echo`: 2–6 copies at earlier frames give weight and speed without feedback buffers; keep it on one or two layers, not all.
- **Light:** emphasis by brightness and size, not by blur. Glow is a finishing tool, never the idea.

## 6. Typography as part of the system

One family (or one family plus one mono), two or three sizes from the scale, consistent tracking, uppercase for system text, optical centring, a baseline grid. Text is real content from the brief, not lorem ipsum; supplied fonts are used as supplied. On walls text stays out of fold gutters.

## 7. The finish pass (run it every time, before the contact-sheet review)

1. **Layer audit.** Count visible layers per composition (≥ 5, target 6–10). Every layer named for its job, with a `role`. Every tier either present or consciously absent.
2. **Hierarchy audit.** Mute layers from the top down; the picture should degrade in the order of the ladder. Squint test: is there one clear hero, one clear second thing?
3. **Constant audit.** Do grid, spacing, scale and angles come from the same module and constants? Any pixel value that came from nowhere gets snapped.
4. **Colour audit.** Accent below 5% of the frame, used on events or targets. Contrast between tiers distinguishable at the viewing distance.
5. **Timing audit.** Step vs smooth assigned. Information quantised. Events on bars. No two layers with identical ease/speed/direction. Loop closes.
6. **Audio audit.** Every shader reactive (rule). No more than three non-shader layers react. Each binding has a one-line reason. A silent bar still looks good.
7. **Surface audit.** Folds, gutters, safe areas, viewing distance, minimum element size (`aspect-ratios.md`).
8. **Frame-by-frame look.** Read the contact sheets at beats 0, 1, 2, 3, the last beat and the loop seam. Fix, rebuild, look again. Do not describe a composition you did not see.
9. **Remove one thing.** Cut the least necessary layer or element. Most pieces improve.

## 8. Anti-patterns (stop and correct)

Two or three layers per composition; layer names left as `SHADER`/`FORMA`/`TEXTO`; one effect doing all the work (a shader with nothing around it); layers that ignore each other's geometry; five compositions that are the same stack with different parameters; accent colour everywhere; every layer reacting to the music; everything centred; hairlines on a wall; glow as the main idea; motion as constant rotation; random jitter instead of quantised ticks; events on no musical boundary; an empty ground; decorations that carry no meaning.
