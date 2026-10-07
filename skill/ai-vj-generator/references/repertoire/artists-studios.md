# Artists, VJs and studios: what to learn from each

These are references to **learn principles from**, not styles to imitate. For living artists and active studios, never reproduce a signature work or describe the output as "in the style of" them. Write the principle, transform it with the brief's own concept, and credit the reference in the art direction document as an influence.

Format of each row: what to observe → the transferable principle → how it becomes engine decisions.

## Audiovisual and data artists

| Artist | Observe | Principle | Engine translation |
|---|---|---|---|
| **Ryoji Ikeda** (Japan, b. 1966; *datamatics*, *test pattern*, *the transfinite* 2011, *data-verse*) | Pure data as image and sound; black and white; precision to the frame; scale from microscopic to cosmic | Information density as sublime; sound and image as one data stream | `data` + DATA STRIPES recipe; monochrome palette; `div` 1/16; `motion: step`; event-free. **Photosensitivity:** his register uses fast full-frame flicker; keep large flips ≤ 3 per second |
| **Carsten Nicolai / Alva Noto** (Germany; raster-noton) | Minimal grids, sine tones, clicks, crystalline systems | Reduction to the smallest unit; grid as score | `lines` + `structure`, thin but ≥ 2 px, long loops, one accent |
| **Ryoichi Kurokawa** (Japan) | Fragmented nature imagery and architectural structure, tightly synchronized with sound | Deconstructing the organic into data and rebuilding it | `organism` or video layer + CÉLULAS shader + glitch on beat 1 |
| **Robert Henke** (Germany; Monolake, co-founder of Ableton; *Lumière*, lasers) | Vector light, high-precision timing, few elements | A line of light is enough if its timing is exact | Black ground, `lines`/`shape` line only, `motion: step` on 1/8 |
| **Kurt Hentschläger** (*ZEE*, 2008: fog and stroboscopic light) | Immersion without objects; perception overloaded | The space and the eye as the medium | Light-and-Space fields; **document photosensitivity risk explicitly** if strobing |
| **Refik Anadol** (Turkey/USA, b. 1985; *WDCH Dreams* 2018, *Machine Hallucinations*, *Unsupervised* at MoMA 2022) | Datasets turned into fluid, pigment-like flows on huge screens; latent space as landscape | Data → latent space → fluid matter; scale and immersion | `flow` (high count, long trail) + CAMPO FBM warp; `motion: smooth`; palette derived from the brief's own data; loop 8–16 bars |
| **Joanie Lemercier** (France; *Eyjafjallajökull* 2012; co-founder of AntiVJ) | White light projected as lines on surfaces and landscapes | Light reveals geometry; slowness; monochrome | Mapping with `displays`/surfaces; white primary; `lines`, `structure`; very slow `speed` |
| **Nonotak** (Noemi Schipfer and Takami Nakamoto; *Daydream*, 2013) | Layers of thin light lines on translucent screens; binary rhythm | Depth from layered planes of simple lines | Stack 2–3 `lines` layers with different `div` and `phase`; explode view as preview of depth |
| **Daito Manabe / Rhizomatiks** (Japan) | Bodies and data, precise tracking, live AR on stage | The body measured by the machine | STANDARD register: `measure` + `data` over a moving hero |
| **Quayola** (Italy/UK) | Classical paintings and sculptures analyzed and rebuilt by algorithms | Tradition processed by computation | Image layer (a public-domain classical work) + CÉLULAS or halftone recipe on top |
| **teamLab** (Japan, founded 2001) | Immersive digital nature, flowers, "spatial calligraphy" | Nature that responds; brushstroke in space | `flow` + soft analogous palette; smooth motion; text as calligraphic stroke (roadmap) |
| **United Visual Artists** (UK, founded 2003; Massive Attack live visuals) | LED walls with text and statistics as political content; light sculpture | Information as protest and atmosphere | `data` or `typewall` with real facts from the brief; LED grid; monochrome + one accent |
| **Abraham Palatnik** (Brazil, 1928–2020; *aparelhos cinecromáticos*) | Moving colored light behind translucent surfaces, decades before digital | Kinetic light as painting | Soft color fields + `shape` with slow `spin`; blur on a duplicated layer |

## Stage, VJ and live-show references

| Reference | Observe | Principle | Engine translation |
|---|---|---|---|
| **Es Devlin** (stage designer: opera, Olympics 2012 closing, major tours) | A single monumental object (cube, ring, sphere) as both sculpture and screen | One iconic form per show | One hero `shape` or `tunnel` across all compositions as the visual identity |
| **Muti Randolph** (Brazil; D-Edge club, São Paulo, 2003) | Architecture made of light, programmed to the music | The room is the screen | Wide canvases and `displays`; `lines` aligned to the architecture |
| **Amon Tobin, *ISAM Live*** (2011) | Projection mapped onto a stacked-cube stage structure | Mapping turns stage geometry into content | Surfaces and masks (roadmap); for now, design per `display` region |
| **Daft Punk *Alive 2007* (pyramid); deadmau5 cube (2010)** | A single LED object as the show's logo | Brand as stage geometry | Hero geometry + simple, bold patterns readable from far away |
| **The Chemical Brothers' live visuals** (Adam Smith and Marcus Lyall) | Huge, simple, rhythmic figures; humor and menace | Scale and repetition of a single figure on the beat | `shape`/`typewall` hero at `div` 1/4; strong events at drops |
| **Weirdcore** (Aphex Twin live visuals) | Glitched, deformed imagery, often localized to the city of the show | Local content + distortion | `image` layer with local material + `post` glitch; brief asks for the city |
| **AntiVJ, Tundra, 1024 architecture** (collectives) | Projection mapping and light architecture for music | Light on structure; mapping as a language | `displays`, white light, structural `lines` |
| **Graphic Realism** (the STANDARD's register) | Interfaces that look operable, few materials, color as declaration | Function implied, never explained | STANDARD engine as is |

## Motion and design studios

| Studio | Observe | Principle | Engine translation |
|---|---|---|---|
| **ManvsMachine** (London) | Simple 3D primitives with material and physics; bold, clean cuts | Physical credibility of abstract forms | Squash/stretch pairs, heavy timing (`animation.md`), few forms |
| **Tendril** (Toronto) | Cinematic abstract 3D, light and texture | Mood through lighting of abstract matter | CAMPO FBM fields + one hero, slow push-in (`sx`/`sy` over the loop) |
| **Buck** (USA and international) | Craft across illustration, 2D and 3D; clear storytelling | Clarity and appeal | One idea per composition; strong silhouette |
| **Universal Everything** (Sheffield; Matt Pyke) | Procedural characters and behaviors; motion as personality | Behavior over appearance | Give each hero a motion personality (`animation.md` adjectives) |
| **FIELD** (London) | Generative brand systems; code as design tool | Identity as a system of rules | Gerstner-style programmes (`swiss-design.md`); seed per variant |
| **Territory Studio; GMUNK** (film interfaces such as *Blade Runner 2049*, *Tron: Legacy*, *Oblivion*) | Fictional UI: believable, layered, readable at a glance | Interfaces that tell a story | `hud`, `data`, `measure`; labels in the brief's language |
| **Moment Factory** (Montréal, founded 2001); **Onionlab** (Barcelona) | Large-scale immersive shows and mapping | Narrative across spaces and screens | Multiple compositions as a sequence; transitions as part of the story |

## How to use this file in a brief

1. If the user names someone, find the principle in this table and confirm it in one line: "Do Ikeda, vou usar a densidade binária de dados, não as listras dele."
2. If the user names no one, you may suggest one reference per composition when it clarifies the hypothesis.
3. Credit influences in the art direction document. Never put an artist's name inside the visuals.
