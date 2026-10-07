# Perception, Gestalt and comfort: rules for images seen by a crowd

What the eye and brain do with light on a large surface, turned into decisions. Load it for any wall, projection or immersive project, for hierarchy problems, and whenever motion is fast, regular or global. The numbers are rules of thumb from vision science; the venue always wins over the rule.

## 1. Gestalt as an operating manual

| Principle | What the viewer does | Use it to | Break it to |
|---|---|---|---|
| **Proximity** | groups what is close | make a field of dots read as bands or a figure by varying spacing | create tension: one dot far from the cluster becomes a character |
| **Similarity** | groups what looks alike (size, colour, shape, brightness) | separate tiers: ground, structure, hero, information | camouflage a hero among decoys, then reveal it by changing one attribute |
| **Common fate** | groups what moves together | make a hundred elements one organism; stagger *breaks* it into a wave | let one element move against the flock: it becomes the focus |
| **Good continuation** | follows smooth lines through crossings | carry a line across a fold or a gap so the walls feel one image | interrupt it to signal a seam or a cut |
| **Closure** | completes partial shapes | draw a circle with 20% missing, glitch a letter and keep it legible, cut a hero by a fold | withhold closure to keep the eye searching |
| **Figure and ground** | decides what is object and what is space (Rubin's vase) | design negative space on purpose: LED black is the ground | keep the reading ambiguous for one beat, then resolve on the drop |
| **Symmetry and Prägnanz** | prefers the simplest, most regular interpretation | make the far read a single clean silhouette | offset by a small amount so the symmetry looks alive |
| **Common region and connectedness** | groups what shares an enclosure or a line | box a data layer, or join nodes with lines to turn points into a network | |
| **Focal point (von Restorff)** | notices the one different item | the single accent, the single fast thing, the single bright thing | use three at once and none wins |
| **Past experience** | reads familiar shapes instantly (faces, horizons, text, arrows) | put recognisable cues where they must read in 0.3 s | remember a face in a pattern is hard to un-see: check for accidental ones |

## 2. Attention and hierarchy

- Pre-attentive channels are **motion, luminance, colour, size, orientation, and isolation**. Give the hero *one* channel that dominates, and keep the tier below to a different one. Everything moving at the same energy has no hierarchy.
- **Motion wins** the periphery. In a field that is all moving, the stillest thing is the hero; in a still field, the one mover is.
- **Luminance beats hue** at distance. A dark-saturated shape is invisible next to a pale one; test the layout in greyscale (`quality-gates.md` hierarchy check).
- A figure needs **enough size**: angular size `θ = 2·atan(size / 2·distance)`. A 1 m shape at 20 m subtends 2.9°.
- Two reads, always: the **far read** (silhouette, 1 to 3 masses, readable at the farthest seat) and the **near read** (detail rewarding the front rows). Design the far read first.

## 3. Spatial frequency: which details survive distance

A pattern of period `P` mm seen from `D` m has `f = D·1000 / (57.3·P)` cycles per degree.

- Contrast sensitivity **peaks at about 3 to 5 cycles/degree** and falls to nothing near **30**. Bold forms with a period near the peak read best; at 15 m that is about 65 mm, 17 pixels on P3.9.
- Periods near 2 pixels are beyond the limit at 15 m: they vanish or shimmer, and on camera they moiré. `python scripts/surface_calc.py legibility --pitch 3.9 --dist 15` prints both bounds.
- Compose in a **hierarchy of frequencies**: a few big, low-frequency masses; a mid-frequency structure; sparse high-frequency accents. Flat midrange only is mud.

## 4. Temporal perception

| Phenomenon | Rule |
|---|---|
| Flicker fusion | the eye fuses light above roughly 50 to 90 Hz, depending on brightness and field size; large bright fields flicker more visibly. LED refresh below about 1,000 Hz may show in peripheral vision; cameras need thousands |
| Apparent motion (phi) | the brain connects successive positions as motion when the step is small; a step larger than a fraction of the pattern's period breaks it |
| **Wagon-wheel effect** | a repeating pattern of period `P` px moving `v` px per frame reverses or stutters when `v ≥ P/2`; keep `v < P/4`. At 30 fps, a 600 px/s motion has `v = 20` px/frame, so a 20 px stripe pattern would alias |
| Frame cadence | 24 fps on a 60 Hz output judders (3:2); use 30 or 60 (`output-engineering.md` §3) |
| Duration and timing | events shorter than about 80 ms read as a flash, not a shape; a title needs about 1 s per short word to be read from far |
| Beat tolerance | audio and image within about ±40 ms feel locked; image late by more than that feels dragging; early by a few frames feels punchy |

## 5. Comfort and safety

- **Photosensitivity.** Do not flash more than **3 times per second** over a large part of the visual field; avoid saturated red flashes; avoid high-contrast regular stripes and spirals that rotate or flicker. On a wall, "a large part of the field" is almost any bright full-screen strobe. This is the project's standing limit (`creative-contract.md` forbidden shortcuts) and the first risk question (`briefing/question-bank.md` §5).
- **Vection.** Large-field uniform motion (zoom out, tunnel, global drift or rotation) makes the audience feel they are moving. Keep it slow, avoid rotating the horizon on domes and rooms, and give a stable reference (a fixed frame, a horizon) when the motion is global. People who stand are more sensitive than people who sit.
- **Tunnel and zoom loops** hide a seam well but are the strongest vection triggers; use them for seconds, not minutes.
- **Contrast at night.** After minutes in a dark venue the eye is dark-adapted: a white full-field flash is glare. Prefer light-on-black forms and ramp brightness over a beat or two.
- **Dwell time.** A passer-by gives a billboard 1 to 3 s and a facade audience a few minutes; a club gives hours. Pace the information to the dwell time (`briefing/archetypes.md`).

## 6. Scale constants

| Quantity | Rule of thumb |
|---|---|
| Acuity | about 1 arcminute resolves two points; a 1 mm gap at 3.4 m |
| Legible cap height | ≥ 0.3° minimum, ≥ 0.6° comfortable (`surface_calc.py legibility`) |
| Reading speed | short display words about 3 to 4 per second at most; one word per beat at 120 BPM is the ceiling for kinetic type |
| Safe margin | 3 to 5% of the short side (projection warp, bezels) |
| Peripheral vision | detects motion and luminance changes beyond 30° but not detail or colour; the sides of a wide wall are for motion, not text |

## 7. Checks to run on any composition

1. Squint test: blur the contact sheet; is there still a hero, a ground and a second tier?
2. Greyscale test: does the hierarchy survive without hue?
3. Far-read test: shrink the frame to 5% of its width; does one silhouette remain?
4. Aliasing test: for each repeating pattern, `v < P/4` per frame?
5. Safety test: any flash above 3 per second, any red strobe, any global rotation?
6. Moiré test: any period near 2 pixels, any 1-px grid, any scanline?
