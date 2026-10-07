# Kinetic typography and motion lettering

Words on a stage are images first and text second. They must survive distance, motion and the beat. Use type only when the word carries the concept (see `art-direction.md`, Typography).

## Lineage

| Reference | Principle |
|---|---|
| Futurist *parole in libertà* (Marinetti, 1910s) | Words freed from lines: size and position as sound |
| Constructivist posters (Lissitzky, Rodchenko) | Type on diagonals as force; heavy sans; red and black |
| Concrete poetry (Brazil: Noigandres group, Augusto and Haroldo de Campos, Décio Pignatari, 1950s) | The word as visual object; meaning from layout and repetition |
| Swiss typography (see `swiss-design.md`) | Grotesque, grid, hierarchy by scale and weight |
| Title sequences (Saul Bass, Pablo Ferro, Kyle Cooper) | Type that moves with the concept of the film |
| Lyric videos and stage typography (2000s–) | Type as the lead visual on screens |
| Variable fonts (OpenType 1.8, 2016) | Weight, width and slant as continuous animation axes |

## Techniques → engine

| Technique | What it does | Engine now | Notes |
|---|---|---|---|
| Giant word wall, scrolling rows | Rhythm and texture from a word | `typewall` (rows, scroll cycles, change per division) | Best on wide LED: `rows` 1–2 |
| Word change on the beat | Text as percussion | `typewall` `change: true` with `div` 1/4 or 1/8 | Keep words short (≤ 8 letters) |
| Outline / fill alternation | Weight change without changing font | `typewall` `outline: alt`; `text` `fill` + `outline` | Outline needs `stroke` ≥ 2 px on LED |
| Decode / scramble | Machine reading, reveal | `text` `anim: scramble`; `event` words decode | Pairs with `data` and HUD languages |
| Typewriter | Sequential reveal | `text` `anim: type` | Over the loop; holds at full text |
| Marquee | Continuous travel | `text` `anim: marquee` | Integer cycles per loop |
| Strobe | On/off on the beat | `text` `anim: strobe` | Photosensitivity: keep at ≥ 1/4 division on full-screen type |
| Pulse / scale on kick | Emphasis | `text` `anim: pulse`; layer `pulseAmt` | Squash/stretch pair for weight |
| Wipe-in word | Event-sized statement | `event` mode `band`, `full` or `word` | The word is drawn from `event.words` |
| Rotation and diagonal setting | Constructivist force | layer `rot` ±15–30° | Combine with left alignment |
| Masked reveal by shape | Word appears through geometry | Text layer under a `shape`, with `blend: multiply` on black ground | Full masks arrive with the WebGL compositor |
| Per-letter stagger, wave, explode | Each glyph moves on its own phase | Not yet in the engine | Ask for it as a roadmap item; do not fake it with many layers |
| Variable font axis animation (wght, wdth) | Breathing weight, stretching width | Not yet in the engine (Martian Mono has wdth/wght axes) | Roadmap |
| Extrusion / 3D type | Depth, anamorphic pop | Not yet (3D module) | Roadmap (DOOH anamorphic) |

## Legibility rules

- **Size**: on LED, cap height ≥ 1/8 of the canvas height for any word meant to be read; secondary labels are texture, not text.
- **Duration**: a word needs about 0.3 s per syllable to be read in motion; at 128 BPM one beat (0.47 s) fits one short word. Changing words on 1/16 makes texture, not reading.
- **Contrast**: type in `primary` on `bg`; reserve `accent` for the event word.
- **Families**: heavy grotesque (`archivo`) for statements, condensed (`bebas`) for wide rows, `mono` for data and HUD. Import a font only if the concept needs it; check its license allows projection and redistribution of renders.
- **Language**: event words in the audience's language unless the concept is foreign or technical; avoid mixing two languages in one composition.
