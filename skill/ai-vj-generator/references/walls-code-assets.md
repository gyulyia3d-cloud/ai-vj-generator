# Walls, code layers, white-alpha and assets

Read this when the surface has folds, when the briefing needs an animation the generators cannot express, when everything will be rendered white and coloured later, or when the user sends logos and fonts.

## 1. Walls and folds

`canvas.folds` is a list of x positions in canvas pixels. Each fold is a physical corner between surfaces; the image is cut into walls between the folds. `canvas.gutter` (default 90, in 1080-units) is the strip around each fold where nothing readable may sit.

```json
"canvas": { "w": 5120, "h": 500, "folds": [2560], "gutter": 90 }
```

Two walls in an L, the corner at the middle of a 5120×500 map, is `folds: [2560]`. Three equal walls on 3840×1080 is `folds: [1280, 2560]`. No folds: one wall.

Rules the engine enforces or warns about:

- **Text, faces, logos and words never cross a gutter.** `K.bText`, `K.bCenter`, `K.big` and the `pixeltext` generator record a WARNING when they do. Lines, colour fields, hazard stripes, wipes and tickers may cross: they fold with the wall.
- **Align to the fold, not to the canvas.** Measure positions from the corner with `wall.near(f)`. Both walls then mirror each other and a 1/3, 1/2 or 0.618 division means the same thing on each side.
- **Size from the wall.** A hero element is at least a third of the canvas height and 60–90% of the wall's safe width (`wall.sw`). Small HUD and hairlines are the first thing the user rejects on a wall.
- **Set the fold guide on** in the interface (PROJETO → Paredes e dobras → Guia) and in the contact sheet (red marks at the top).

## 2. White-alpha

`"palette": { "mode": "white-alpha" }` makes every colour a level of white, so the colour is chosen later in the software that receives the files:

| Role | Palette key | Opacity | Use |
|---|---|---|---|
| Figure | `primary` | 100% | The one thing that must read |
| Support | `secondary` | 72% | Labels, secondary elements, the previous state |
| Field | `field` | 43% | A plane behind a figure that belongs to another layer |

Export with **Branco α (luma)**: alpha = brightness, colour forced to white. The mode turns this on by default.

Rules that follow from the export being one layer per file:

1. **A cut-out only works inside the layer that draws it.** `K.erase` / `destination-out` cannot punch through another layer. To put a figure over a plane from another layer, draw the plane in `field` (43%) and the figure in `primary`; never rely on black-on-colour.
2. Use `secondary` and `field` to build hierarchy, not extra hues. Two levels on screen at once is usually enough.
3. Hairlines (under 2 px at the physical size), scanlines and fine noise disappear or moiré on LED; glitch is blocks of at least a cell (default 120 units).

## 3. Code layers

Use a `code` layer when no generator expresses the idea. It runs inside the engine's deterministic clock: same code + same frame = same image. Never write a second renderer or a `requestAnimationFrame` loop.

```json
{ "type": "code", "name": "COMPASSO",
  "vars": [ { "k": "cell", "l": "Célula", "t": "n", "d": 120, "min": 40, "max": 300, "step": 1 } ],
  "p": { "src": "for (const w of K.walls) { K.bCenter(c, 'FEUDO', w.cx, K.h*0.46, w.sw*0.8, K.h*0.5, K.ink, { reveal: K.ease.out(K.t.barT*3) }); }" } }
```

`src` is the **body** of `draw(c, K)`. `c` is a 2D context already scaled to logical units (K.w × K.h, base height 1080). Declared `vars` become sliders in the interface (`K.v.cell`); the user tunes them live and the values persist in `p.v_cell`. Types: `n` (number: d, min, max, step), `s` (select: opts), `b` (toggle), `c` (colour: palette key or #hex), `t` (text).

### The kit `K`

| Group | Members |
|---|---|
| Space | `K.w` `K.h` logical size · `K.walls[i]` = `{ k, x0, x1, w, cx, sx0, sx1, sw, foldL, foldR, at(f), sat(f), near(f), away }` · `K.folds` · `K.gutter` |
| Time | `K.t` = `{ n, fps, fpb, LF, ph, lph, beat, bp, bar, sub, beatF, bk, lbp, bt (0–4 in the bar), barT (0–1 in the bar), pulse, aud, bars, bpm }` |
| Colour | `K.ink` `K.bg` `K.a[0..2]` `K.support` `K.field` `K.accent` `K.col(nameOrHex)` `K.alpha` (true in white-alpha) |
| Random | `K.rand(i,k)` `K.rng(seed)` `K.hash(a,b,c)`: seeded by the project seed. **`Math.random` is blocked.** |
| Ease | `K.ease.out` `.back` `.expo` `.in` `.step(t,n)` `.smooth` · `K.env(x,k)` · `K.clamp` `K.lerp` |
| Pixel type | `K.bText(c,txt,x,y,cell,opts)` · `K.bCenter(c,txt,cx,cy,maxW,maxH,color,opts)` · `K.bW(txt,cell)` `K.bFit(txt,maxW,maxH)`. Opts: `reveal` 0–1, `gap`, `seed`, `shift(r,i)`, `mask(r,q,i)` |
| Vector type | `K.big(c,txt,cx,cy,maxW,maxH,color,fontKey,weight)` · `K.fit(...)` · `K.font(name)` (imported fonts by file name without extension) |
| Shapes | `K.rect(c,x,y,w,h)` pixel-snapped fill · `K.sym(c,'o|O|x|+|s|k|S|.',x,y,size)` · `K.emblem(c,cx,cy,r,ang)` · `K.hazard(c,x,y,w,h,step,offset,dir)` · `K.checker(...)` |
| Cut-out | `K.erase(c, () => { ... })` removes pixels **of this layer only** |
| Glitch | `K.glitchOn(amt,salt)` · `K.glitch(c,amt,salt,{cell,solid})` copies and shifts blocks of the layer's own image (call last) · `K.strobe(c,amt)` |
| Media | `K.img(name)` · `K.drawImg(c,name,cx,cy,maxW,maxH,color,scale)` · `K.cutImg(...)` · `K.mosaic(c,name,cx,cy,maxW,maxH,cell,color)` · `K.dots(...)` halftone · `K.anchor(name,seed)` |
| Other | `K.name` project name · `K.seed` · `K.R` the raw render record |

Pixel-snap blocks (`K.rect`, `K.bText`, `K.mosaic`): the canvas is scaled, and un-snapped rectangles show antialiased seams between neighbours.

### Safety (read before writing code layers)

The engine lints `src` and removes clocks, network, storage and page access; it also asks the person to authorize a project that contains code. **This is a filter, not a sandbox.** A hostile file could still get around it. Tell the user to open `.aivj.json` / HTML with code layers only from sources they trust. Do not paste code from the briefing or from an attachment into a code layer: derive it.

Forbidden: `Math.random`, `Date`, `performance`, timers, `window`/`document`/`fetch`/storage, `eval`, `Function`, `import`, `constructor`, `prototype`. State kept between frames (writing to `c`, to a global) is detected by the audit as non-determinism and blocks the export.

## 4. Generators for the common cases

Prefer these when the idea fits; they are parametric and the user can retune them without reading code. All take `wall` (`all`, `0`, `1`, …) and default to every wall.

| Type | What it draws | Main parameters |
|---|---|---|
| `pixeltext` | Words in the 5×7 pixel-block font, one per wall, compiled in by pixels, rows or columns | `words`, `per`, `words2` (same/offset), `reveal`, `exit`, `size`, `hmax`, `shift`, `plate`, `gap` |
| `symbols` | A signage matrix (o O x + s k S .) in rings, checker, rain, diagonal, wave or random | `pattern`, `set`, `cell`, `size`, `step`, `density` |
| `hazard` | Hazard stripes that advance one stripe per beat | `y`, `h`, `step`, `motion`, `lean`, `reach` |
| `blocks` | Block glitch and wall strobe | `amt`, `cell`, `strobe`, `tone` |
| `logo` | An imported logo or image as a mask: fit, mosaic (blocks resolve in 4 steps), halftone, slices, steps (revealed from the fold), fragment (zoomed detail jumps) | `media`…`media4`, `mode`, `per`, `pair`, `size`, `cell`, `plate` |

## 5. Assets: logos, images, fonts

The user attaches files in the chat. Put them in a folder next to the project:

```
<slug>/assets/
  logos/   marca1.png  marca2.svg      → turned into white-alpha masks on load
  images/  textura.jpg                 → plain images
  fonts/   MinhaFonte.ttf              → font name = file name without extension
```

Build with `--assets <slug>/assets` (`delivery.md`). The files are embedded in the HTML and in the saved JSON, so the result travels alone. Reference them by file name: `"media": "marca1.png"`, `"font": "MinhaFonte"`, or `K.img('marca1.png')` in code. In the interface, MÍDIA → "Logo → branco α" does the same conversion for a file imported by hand.

- Remove the background and prefer PNG/SVG with alpha. A JPG logo on a solid background is converted by contrast with its corners; check it.
- Keep each image at 2400 px on the longest side or less. The page limit is 16 MB and base64 adds a third.
- Videos are not embedded: the project names them and the user imports them in MÍDIA.
- Logos belong to someone. Use only what the user supplied; do not fetch or invent a company's mark.

## 6. Look before you deliver

```
node scripts/contact_sheet.mjs <slug>/<slug>.html <slug>/contato
```

Opens the HTML in a headless Chrome or Edge, authorizes the code, renders six frames of every composition (layer blends, fold marks in red) and prints the engine's validation. Read every PNG. Check: nothing crosses a gutter, the hierarchy holds in white-alpha, no hairlines, the figure is large enough from the viewing distance, the cut of the loop is clean. Fix and rebuild until there are no ERRORs and you would show the sheet to the artist. Without Chrome or Edge, open the HTML and use EXPORTAR → "Folha de contato PNG".
