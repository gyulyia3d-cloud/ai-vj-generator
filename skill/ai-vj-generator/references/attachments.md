# Analyzing attachments

Images and videos in the conversation are references. Analyze them with your own eyes **and** with measurements, then convert what you find into principles. Never trace, copy or reproduce an attachment, and never embed it in the project unless the user explicitly asks to use their own media in an IMAGEM or VÍDEO layer.

## Procedure

| Attachment | Do |
|---|---|
| Image | 1. Look at it (read/view the file). 2. Run `python scripts/analyze_image.py <file>`. 3. Write the reference grammar below. |
| Video | 1. Run `python scripts/analyze_video.py <file> --out <dir>`. 2. **View `contact_sheet.jpg` and 3–4 frames** from the output; the numbers do not replace seeing. 3. Write the reference grammar, including time. |
| Several | Analyze each, then compare: what do they share (the briefing's real taste) and where do they disagree (a question for the user). |
| A link, a name, a studio | You cannot see a link's content. Say so and ask for a file or screenshot; for names use `repertoire/artists-studios.md`. |
| Audio file | You cannot measure BPM or structure here. Ask for BPM and the song's sections (intro, build, drop, break). |
| Floor plan, stage photo, LED drawing | Treat as a surface: read dimensions, divisions and seams from it; ask for the pixel map. |

The scripts need Pillow and numpy (`pip install pillow numpy`); the video script also needs ffmpeg and ffprobe on PATH. If they are missing, analyze by eye, say that you did, and do not invent numbers.

## What each measurement can change

| Measurement | Reading | Decision it can drive |
|---|---|---|
| `palette` + `suggested_roles` | Dominant colors and their shares, in perceptual OKLab | Palette roles and the 70/15/10/5 proportion; check roles against the concept, the suggestion is only a start |
| `luminance` mean, dark share | Key of the image | Low-key references → black ground, light-on-void forms; relevant for projection black levels |
| `warm_share`, `mean_chroma` | Temperature and saturation | Cold/warm contrast; desaturated vs saturated language |
| `visual_weight_center`, left/right and top/bottom balance | Where the weight sits | Asymmetric composition anchor (`cx`/`cy`, `x`/`y`); where the empty side goes |
| `symmetry_mirror_*` | Near 1 = mirrored | Symmetric vs asymmetric systems; radial vs linear topology |
| `flat_area_share` | Flat regions (empty ground or pattern plateaus) | Negative space; confirm by eye whether it is empty ground or pattern |
| `edge_orientation` | Dominant edge directions | Direction of lines, scroll axis, diagonal force |
| `frequency.energy_share` | Coarse / medium / fine structure | Scale of the system; **fine detail high → check LED legibility and moiré** |
| `frequency.periodicity` strength > ~60 | A regular grating, grid or tiling exists | A pattern grammar (period, angle) → `patterns.md`; use the measured period ratio, not the pixels |
| video `cuts.per_minute`, average shot | Edit rhythm | Temporal grammar: continuous vs cut; hold times; transition type |
| video `motion_energy_*`, variation | How much and how unevenly it moves | Energy and pacing: constant, surging, or punctuated |
| video `global_translation` | Camera move | Camera language: static, push, pan, parallax |
| video `brightness_over_time` | Light arc | The dramaturgy of the loop (build, drop, release) |

## Reference grammar (write one per attachment)

```
REF 1 · <file> · <image|video>
SEEN       what is there, in plain words (subject, structure, materials, light)
MEASURED   the 3–5 numbers that matter, with their meaning
PRINCIPLE  what is structurally interesting and transferable (composition, color logic, rhythm, material, algorithm)
NOT TAKEN  what you will deliberately not reuse (the subject, the signature, the exact palette, the layout)
→ DECISION which parameter, generator or GLSL rule carries the principle in this project
```

Example: `PRINCIPLE: dense parallel lines whose spacing breathes, no figure at all → DECISION: a custom GLSL field of 28 lines per height, phase driven by a slow sine, amplitude 0.4; no image is shown.`

## Respect

References may be someone else's work. Principles (density logic, proportion, rhythm, algorithm) are free to learn from; the work itself is not. If the user asks to reproduce a reference closely, propose the transformation instead and say why.

## Reading precisely (the protocol, every attachment)

Looking once is not analysis. Do these steps and report what you did.

1. **Whole, then parts.** View the full frame; then zoom into at least four regions (the focal area, a corner, an edge, the emptiest area) with crops or the zoom tool. Detail at 100% shows line weight, grain, antialiasing, text.
2. **Inventory the layers.** List every distinguishable layer from back to front (ground, field, hero, structure, information, finish) and the tier each belongs to (`craft-and-finish.md` §1). Count them. A reference with ten layers is a lesson in layering.
3. **Measure, do not adjectivise.** Give proportions: hero ≈ 45% of the frame area, accent ≈ 3% of pixels, grid module ≈ 1/12 of the height, line weights in two steps. Use the scripts for palette, balance, symmetry, frequency; add your own estimates for the rest and mark them as estimates.
4. **Identify the process behind the look** (noise warp, SDF, kaleidoscope, feedback trail, particle system, duplicator, flow field, halftone, glitch) with `effects-glossary.md`. Name the likely tool or library family and its technique (`software-techniques.md`) but do not claim certainty you cannot have; say "consistent with".
5. **Time, for video.** Sample at least eight frames across the duration and the first/last frames; describe starting state, key states, transitions, the event rhythm, the acceleration of motion, the loop point, camera behaviour and the audio relation if audible. Use the contact sheet and the cut list; watch for how the layers move at *different* rates.
6. **Identify what makes it good.** Name three things: structure (hierarchy, constants), timing (verbs, easing, quantisation) and finish (texture, colour discipline). These become constraints.
7. **Say what you cannot see.** Resolution, compression, audio, colour accuracy, a link you cannot open, a software screenshot that shows the UI but not the output. Ask for the missing piece instead of guessing.
8. **Translate to 3–7 design constraints** and map each to a layer, a `vars` entry or a shader rule.

If the attachment is a **software screenshot or a node graph** (TouchDesigner, Resolume Wire, Cavalry, Hydra code), it is a reference for a *process*: read the operators in order, state what each does, and rebuild the behaviour as layers, a shader or a code layer. If it is a **term or an effect name** with no image, look it up in `effects-glossary.md` and propose two or three interpretations with a sentence each; ask which one the user means before building.

## Research when the reference is a name, a link or a term you do not know

Search for it (documentation, artist or studio pages, tutorials), read at least two sources, and write: what it is, its defining technique, how it is typically parameterized, a way to reproduce the *process* with this engine, and what would be copying. Cite what you used. Record anything you cannot verify as an assumption.