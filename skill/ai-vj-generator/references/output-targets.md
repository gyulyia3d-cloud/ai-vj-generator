# Delivery targets

The engine generates animation and delivers files. It does not transmit, control or map. The four labels and the full status table are in `capabilities.md`; how the surface shapes the design is in `surface-model.md`.

## What is delivered

| Delivery | Label | How |
|---|---|---|
| Preview in the browser, fullscreen preview | SUPPORTED | Viewport, `Tela cheia da viewport`, preview window. A look at the composition, not a playback system. |
| PNG sequence (RGBA or RGB), full project, one region (display) or one layer | EXPORTABLE | Export tab → ZIP. Deterministic, frame-exact loop, manifest with SHA-256. |
| MP4 (H.264), full project or one region | EXPORTABLE | Export tab or `node scripts/render.mjs`. No alpha: use the PNG sequence when alpha matters. |
| WebM screen recording | EXPORTABLE (draft) | `Gravar`. No alpha. Captures live audio reaction. A take, not a render. |
| Blueprint, plan, pixel map, photograph, mask | INPUT / ANALYSIS ONLY | Imported to describe the surface. The engine never generates them. |

Anything else a user asks for (NDI, Spout, OSC, MIDI, mapping files, integrations with performance software) is NOT SUPPORTED: say so plainly and offer the PNG sequence or MP4, which any software can open.

## LED

- Canvas = the real pixel resolution of the surface (e.g. 5120×500 for two 2560×500 walls in an L). Add `canvas.displays` for each wall or region. Static heroes and short text stay inside one region; elements that scroll or span the full width (typewall, lines, shaders) may cross the corner, since that crossing is the point of an L.
- `canvas.pitch` (mm) and `canvas.dist` (m) let the engine estimate legibility. Rule of thumb: minimum viewing distance ≈ 1 m per mm of pitch.
- Lines ≥ 2 px (use `weight` ≥ 4 and `ui` ≥ 2 on wide walls), `post.scan` = 0 (moiré), `bg.grain` = 0, `organism.dot` ≥ 2.
- Black is "off" on LED: negative space reads as void. Flat accents read; subtle gradients disappear.
- Many LED processors clip pure white at night: offer `palette.primary` slightly below white (#F2F0EA).

## Projection and irregular surfaces

- Projector black is grey: avoid large dark-grey fields; prefer true black and light forms.
- Keep 3–5% margin (`canvas.safe`) for the physical margin of the surface.
- Irregular surface: export alpha per layer (mode "Camadas α") or per region so each part can be handled separately. Draw regions as `displays`.
- Increase text scale; distance and focus soften detail.

## Regions

Define each region as a crop of the master canvas in `canvas.displays` (by hand in the Export tab, or imported in the Surface tab). The Export tab renders the full project or one region, as PNG sequence or MP4. The whole project is rendered and the region is cut from it, so a region is always consistent with the full image. The manifest records the region.

## Export

1. Export → "Composição α" (or "Camadas α" for separate layers), FPS 30 or 60, loop in whole bars.
2. Optional "Branco α (luma)": everything white, opacity in alpha; colour it later in the software that receives the files.
3. File naming: `PROJECT/ALPHA/01_NAME/01_NAME_000000.png`; with a region the region name is added (`01_NAME_DIR_000000.png`); `PROJECT_DATA/project.json` reopens everything; `MANIFEST.json` records seed, size, region, frame range and hashes.
4. "Camadas α": `PROJECT/LAYERS/01_NAME/L3_NAME/01_NAME_L3_000000.png`, one folder per layer that was on at export time. "Branco α (luma)" works on every layer, shaders included: luminance becomes alpha.

## Walls with folds (L, U, cube)

One render covers every wall: the canvas is the concatenation of the planes. Declare the folds in `canvas.folds` (px) and the gutter in `canvas.gutter`; the contact sheet and the viewport mark them in red. If the planes are different sizes, give the real size of each and confirm where each plane starts.

## Performance

Preview: PROJETO tab → preview 50% and density 60% if FPS drops; at most one `shader` at `res` ≤ 0.7 per composition; `flow.count` ≤ 1500 at 4K. The browser does not expose GPU load: report it as N/D, never invent it. Exports always render at full density.
