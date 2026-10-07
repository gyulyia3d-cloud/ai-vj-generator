# Design laws applied to stage visuals

Laws of UX, Gestalt, typography, colour and composition, reinterpreted for large luminous surfaces seen at a distance by a crowd. A law is a prior about perception. Use it to decide, then verify with the contact sheet.

## Gestalt (grouping and figure-ground)

| Law | Use it to | On a stage |
|---|---|---|
| **Proximity** | group elements by distance | cluster related marks; separate groups by at least one module |
| **Similarity** | bind by shape/colour/size | give one family of marks one style; break it for the focal element |
| **Common region** | group by enclosure | a frame, a panel or a wall segment makes its contents one thing (folds do this physically) |
| **Continuity** | lead the eye along a line | rulers, flow lines and edges point to the hero |
| **Closure** | let the brain complete shapes | dashed rings and partial brackets are cheaper and more elegant than full ones |
| **Common fate** | group by shared motion | layers that move together read as one object |
| **Figure-ground** | separate subject from field | decide which is which in every layer; keep ground low contrast |
| **Symmetry / order** | read as stable and designed | use deliberately; asymmetry creates tension |
| **Focal point / emphasis** | one dominant element | contrast in scale, brightness, motion or colour; one winner per composition |

## Laws of UX that carry over

- **Aesthetic-usability effect:** harmonious pieces are forgiven more and read as more "professional". Polish is not decoration; it is perceived quality.
- **Hick's law:** more simultaneous choices, slower reading. Fewer competing elements per tier; stagger entrances.
- **Miller's law (7±2, closer to 4 chunks):** group information into at most four visible chunks; a log of 35 lines is texture, not information, so treat it as texture.
- **Von Restorff (isolation) effect:** the odd one out is remembered. That is the accent colour and the event: keep them rare.
- **Serial position effect:** the first and last beats of a loop are remembered; put the hook at the start and the resolution at the end.
- **Peak-end rule:** audiences judge a set by its peak and its end; design a peak and a clean ending per loop and per set.
- **Doherty threshold:** response under about 400 ms feels immediate; audio-to-image latency must stay under that, ideally within one or two frames (hence the fast attack in the audio bus).
- **Fitts's law (targets):** in the editor UI, big targets near the pointer. For stage content it appears as "the biggest thing is read first".
- **Jakob's law:** familiar conventions reduce load. Use known HUD, grid and ruler idioms when the concept is "reading", and break them when the concept is "rupture".
- **Law of Prägnanz:** the simplest interpretation wins. If a form needs explaining, simplify it.
- **Tesler's law (conservation of complexity):** complexity does not vanish, it moves. Put it in the system (rules, layers) and keep the surface simple.
- **Pareto / 80:20:** most of the impression comes from a few elements; spend polish on the hero, the accent and the loop seam.

## Hierarchy and composition

- **Visual weight** = size × contrast × saturation × position × isolation. Balance weights, do not average them.
- **Rule of thirds, golden section, diagonals:** focal points near thirds or golden lines look placed; dead centre looks defaulted. Use dead centre only for solemnity or symmetry on purpose.
- **Modular grid:** one base unit; margins, gutters and columns as multiples. Align to it or break it knowingly.
- **Negative space** is a shape. Plan where the eye rests and where motion enters or leaves.
- **Scale contrast:** a 3:1 to 5:1 ratio between hero and secondary reads as hierarchy; 1.5:1 reads as indecision.
- **Edge tension:** elements cropped by the frame or by a fold create energy; elements just touching the edge create tension you did not intend. Cross or clear, never graze.
- **Depth cues:** overlap, size, blur, opacity, parallax and atmospheric haze, in that order of cheapness.

## Colour

- **Role palette:** ground, figure, support, field, accent. Name the role for every colour; no role, no colour.
- **60-30-10** (dominant, secondary, accent), tightened on stage to roughly 90/9/1–5 when the ground is dark.
- **Harmony families:** monochromatic, analogous, complementary, split-complementary, triad. A restricted palette with one accent beats a rainbow every time.
- **Simultaneous contrast:** colours change under neighbours; judge them in context on the contact sheet.
- **Luminance first:** hierarchy comes from value contrast; hue comes second. Check the piece in greyscale.
- **Temperature:** cool recedes, warm advances; use it for depth.
- **Display realities:** LED saturates and bands in dark gradients (use dither or solid fills); projection raises black level (do not rely on very dark detail); white-alpha leaves colour to the software (design in luminance only).
- **Colour as motion** only with a reason (hue migration, temperature shift, an accent at the event).

## Typography

- **Measure and leading:** short lines (the *readable measure*), generous leading for light-on-dark.
- **Hierarchy:** two to three sizes from a scale; weight contrast (300 vs 800) is stronger than size alone.
- **Optical centring:** correct for letter shape, overshoot and glow; never trust the geometric centre.
- **Legibility distance:** cap height must exceed the angular-size minimum for the viewing distance (`aspect-ratios.md` §6).
- **Kinetic type:** one primary behaviour (reveal, wipe, tracking, baseline travel) and one restrained secondary; avoid per-letter bounce.

## Accessibility and safety (stage edition)

- No more than **3 flashes per second**; avoid large-area red flashes and high-contrast full-screen alternation (WCAG 2.3.1).
- Offer reduced-motion in installations (a calm variant of each composition).
- Do not rely on colour alone for meaning in informational layers.

## Review questions

Where does the eye go first, second, third? What is grouped, and by which law? What is the one accent, and where? Does a squint test (blur your eyes) keep the hierarchy? Does the greyscale version still read? What would a stranger at 15 m see?
