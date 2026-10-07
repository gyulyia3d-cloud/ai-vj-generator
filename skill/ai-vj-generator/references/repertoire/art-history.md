# Art history for live visuals

Movements as decision systems. Each row: what the movement believed, how it looks, how it moves, and what to set in the engine. Dates are approximate ranges of the core period.

## Modernist foundations

| Movement | Core idea | Visual signature | Motion translation | Engine |
|---|---|---|---|---|
| **Futurism** (Italy, 1909–1916; Balla, Boccioni) | Speed, machines, simultaneity; Balla's *Dynamism of a Dog on a Leash* (1912) repeats the moving body | Repeated contours, diagonal force lines, blur as multiplication | Echo and trail instead of a single moving object; diagonals accelerate | `flow` with long `trail`; `lines` dir `d`; `tunnel` with `twist`; low `blur` on a duplicated layer offset by `phase` |
| **Suprematism** (Russia, 1915–; Malevich) | Pure feeling through basic shapes on white or black; *Black Square* (1915) | Few flat geometric shapes floating, tilted, on empty ground | Slow drift and rotation; tension between shapes, never a grid | `shape` (square, line, cross) count 1–5, `rot` off-axis, `spin` 0–1; huge negative space; palette with one accent |
| **Constructivism** (Russia, 1917–1930s; Rodchenko, El Lissitzky) | Art as construction for a new society; *Beat the Whites with the Red Wedge* (Lissitzky, 1919) | Diagonals, red/black/white, photomontage, heavy sans type at angles | Thrust and impact; elements enter on diagonals and lock in place on the beat | `typewall` with `rot` ±15–30°, `motion: step`, palette black/bone/red; `event` mode `band` as the "wedge" |
| **De Stijl** (Netherlands, 1917–1931; Mondrian, van Doesburg) | Universal harmony from horizontals, verticals and primaries | Black grid, white planes, red/yellow/blue blocks | Rectangles change size or color on bar changes; no curves, no diagonals (Mondrian) | `lines` h + v layers, weight 8–20; `shape` square fill with `alt` accent; palette white bg, black lines, 3 primaries |
| **Bauhaus** (Germany, 1919–1933; Kandinsky, Moholy-Nagy, Albers) | Form follows function; teaching of point, line, plane; light as material | Basic forms, primary colors, sans-serif, photograms | Moholy-Nagy's *Light-Space Modulator* (1930): a machine that throws moving light and shadow; Kandinsky's *Point and Line to Plane* (1926): a point is tension, a line is a point in motion | `shape` circle/triangle/square as a vocabulary; `structure` as the teaching grid; light leaks as `shader` CAMPO FBM at low opacity |
| **Kinetic art** (1920s–1960s; Gabo, Calder, Tinguely, Abraham Palatnik in Brazil) | Real movement as part of the work; Palatnik's *aparelhos cinecromáticos* (from 1951) project moving colored light | Mobiles, motorized parts, colored light | Real-time continuous motion with mechanical regularity | `organism` with `spin`, `shape` radial with `spin`, smooth motion |

## Post-war and optical

| Movement | Core idea | Visual signature | Motion translation | Engine |
|---|---|---|---|---|
| **Concrete art** (Max Bill; Brazil: Grupo Ruptura 1952, Waldemar Cordeiro) | Art built from mathematics, not from nature | Systematic progressions, modular forms, color steps | Progression: each step changes one variable | `shape` grid with stepped `size`; `div` 1/4 progressions |
| **Neo-concretism** (Brazil, 1959; Lygia Clark, Hélio Oiticica, Lygia Pape) | The geometric plane opened to the body, participation and time | Folding planes, color as space (Oiticica's *Metaesquemas*, *Penetráveis*) | Planes that open, fold, invite; slower, warmer than concretism | `shape` square with `rot` animated by LFO; saturated color fields; smooth motion |
| **Op Art** (1955–1970; Vasarely, Riley, Cruz-Diez, Soto; MoMA's *The Responsive Eye*, 1965) | The eye completes the work; perception is the subject | Black/white stripes, checkerboards, moiré, color vibration | Tiny displacements create large perceived motion | `patterns.md` recipes MOIRÉ, RILEY WAVES, CHECKER WARP; `lines` with `pulseAmt` 0; monochrome; one variable animated |
| **Minimalism** (1960s; Judd, Flavin, LeWitt, Agnes Martin) | Literal objects, repetition, industrial materials; Flavin's fluorescent tubes; LeWitt's instructions as the work | Units in series, single light lines, white walls | Almost none: a single slow change over a long loop | `lines` count 1–5, weight heavy; loop 16 bars; events off; `post` off; negative space ≥ 80% |
| **Light and Space** (California, 1960s–; Turrell, Irwin) | Light as volume; perception of the room itself | Fields of pure color, soft edges, no objects | Imperceptibly slow color change | `shader` CAMPO FBM with high `p1` contrast low, palette two close hues, `speed` 0.25; no beat sync |
| **Fluxus / systems / instructions** (1960s; LeWitt's wall drawings, Yoko Ono's instruction pieces) | The idea as a set of instructions; execution can vary | Drawings from written rules | The seed is the instruction set: same rules, new outcome | Treat each composition hypothesis as an instruction; change `seed` per show while keeping rules |

## Media art

| Movement | Core idea | Visual signature | Motion translation | Engine |
|---|---|---|---|---|
| **Abstract and visual-music film** (1920s–1970s; Fischinger, Len Lye, McLaren, John and James Whitney) | Image as music; Whitney's *Catalog* (1961) and *Arabesque* (1975) use computed harmonic motion | Lines and dots in harmonic paths, scratched film, color music | Motion literally follows musical ratios | `patterns.md` LISSAJOUS; `organism` spin synced; `div` ratios 1/4 vs 1/8 between layers |
| **Video art** (1960s–; Nam June Paik, Steina and Woody Vasulka) | Television as material; the signal can be manipulated | Scan lines, raster distortion, feedback, magnets on CRTs | Signal disturbance as content | `post` scanlines, `jitter`; FAIXAS preset; feedback when the WebGL compositor exists |
| **Expanded cinema** (Gene Youngblood's book, 1970) | Cinema beyond the screen: environments, multiple projections, computers | Multi-screen, immersive, synesthetic | The space itself is the frame | `canvas.displays`, wide canvases, content designed per wall |
| **Early computer art** (1960s; Georg Nees, Frieder Nake, Vera Molnár, Manfred Mohr; Brazil: Waldemar Cordeiro) | The algorithm as artist's tool; plotter drawings; controlled disorder | Grids of squares slowly disordering (Nees's *Schotter*, 1968–70; Molnár's *(Dés)Ordres*, 1974) | Order dissolving into chaos across the loop, or across the set | `shape` grid with `rot`/`x` jitter growing over the loop; a TRANSFORMATION composition that ends in disorder |
| **Demoscene** (1980s–; Amiga, PC) | Maximum visuals in minimum code, real time, music-synced | Tunnels, plasma, rotozoomers, scrollers, copper bars | Everything on the beat, show-off transitions | `tunnel`, FAIXAS, `typewall` as scroller; `transition: glitch` |
| **Glitch art** (2000s–; Rosa Menkman's *Glitch Moment(um)*, 2011) | Error reveals the medium | Datamosh, pixel sort, corrupted codecs, RGB split | Rare, sharp disruptions inside a stable flow | `post` with `prob` 0.1–0.3 and strong `slices`; `event` as the break; never constant glitch |
| **Post-internet and data art** (2010s–) | Data, networks and machine perception as subject | Interfaces, HUDs, datasets, latent spaces | Machine reading the human or the organic | The STANDARD engine (surveillance reading an organism) is this register |

## Using a movement in a brief

1. Name the movement only if the brief evokes it or if it solves a real problem (for example: "we need maximum legibility at 40 m" → Swiss/Constructivist type).
2. Take **one** principle, not the whole look.
3. Combine at most two movements per project, in tension (Op Art precision against Light and Space softness; Constructivist type against organic flow). The tension is the concept.
