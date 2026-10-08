# Aspect ratios and surfaces: composing for the shape you actually have

Never compose a 16:9 and stretch it. The same concept becomes a different composition on a different frame. This file turns theory into rules per aspect family and per viewing distance. The surface mechanics (folds, gutters, displays) are in `surface-model.md` and `walls-code-assets.md`.

## 1. Think in units, then in families

- The engine measures sizes in **1080-units** scaled by `k = min(H, W·9/16)/1080`. The same JSON therefore reads on any canvas, but *composition* (where things go and how many) must be re-decided per family.
- **Aspect families:**

| Family | Examples | Character | Composition move |
|---|---|---|---|
| Landscape standard | 16:9 (1920×1080, 3840×2160) | the default; also the safest | thirds, one hero, classic hierarchy |
| Square / near-square | 1:1 (1080×1080), 4:5 | poster, social, LED cubes | centred or diagonal; tight hierarchy; edge-anchored text |
| Portrait | 9:16 (1080×1920), pillars, kiosks | vertical reading, tall totems | stack in tiers top→bottom, vertical travel, hero in the upper-middle third |
| Wide | 21:9, 2:1 (2160×1080), 3840×1080 | cinematic, stage backdrops | horizontal travel, two or three focal points, panoramic structure |
| Ultra-wide strip | 32:9 to 10:1 (7680×2160, 5120×500, 4500×800) | LED fascias, walls, ribbons | **tile or travel**: repeat modules, move waves across; do not scale one hero to fill |
| Ultra-tall | 1:4 and taller | towers, columns | vertical cascade; text as stacked words |
| L / U / cube surfaces | folds in the canvas | architectural corners | walls answer each other; text per wall; lines cross folds |
| Multi-screen | triple-head, video walls | continuous or independent canvases | decide: one image across (continuity) or several images (rhythm) |

## 2. Rules by family

**Landscape (16:9).** Hero near a third or golden line; two focal points; negative space on the side the motion enters from; keep safe margins (5%).

**Square.** There is no "side"; use diagonals and nested frames. Text at edges, hero off-centre, a visible module grid (the square grid shows).

**Portrait (9:16, 1080×1920).** Think in tiers from top to bottom (ground, hero, structure, information). Motion travels vertically (falling, rising, scanning); horizontal motion feels like a slip. Large type is stacked, short words. Keep the hero in the central third vertically so phones, columns and bezels do not cut it. The same fonts need smaller measures: break lines by meaning.

**Wide (21:9, 2:1, 32:9 moderate).** Panoramic structure: a long horizon line, travelling waves, two or three hero moments across the width with relation (call and response). Do not centre a single object. Use the width for *time*: let a pulse travel left to right across one bar.

**Ultra-wide strips (e.g. 5120×500, 4500×800, 10:1).** The frame is a corridor.
- Choose a **module** equal to the height (a square of the strip) and treat the canvas as N modules. Hero elements are 1–3 modules wide, never the whole strip.
- **Repeat and phase**: duplicate a motif across modules with a phase offset so a wave runs along the strip (stagger by index).
- **Travel**: waves, tickers, wipes, hazard stripes and lines run horizontally and can cross folds; text and faces do not.
- Elements are **big**: at 500 px of height, a line weight of 4 units is `k·4` ≈ 2 px. Use ≥ 9 units for lines, ≥ 2.2 scale for readable text on a 5120×500 map; verify with the contact sheet.
- Compose **two readings**: the near read (modules, big shapes) and the far read (the overall silhouette across the wall).

**Ultra-tall.** Vertical cascade with a module equal to the width; one idea per module; scrolling reveals; avoid centred hero.

**Walls with folds.** Mirror around the fold (`wall.near(f)`); each wall gets a complete reading so either alone works; keep text inside walls and out of the gutter; let fields and lines cross to unify. Different widths per wall? Compose in each wall's own `sw`.

**Multi-screen and video walls.** Decide the policy: **continuous** (one canvas across all displays, content may be cut by bezels; keep focal points away from seams) or **segmented** (each display is its own composition). Document the `displays` crops.


## 3. Scaling laws

| Quantity | Rule |
|---|---|
| Line weight (px) | `weight_units × k`; keep ≥ 2 px at the panel, ≥ 1 LED pixel pitch × 2 |
| Text height | cap height ≥ the **legibility minimum** (§6) |
| Element count | density per module constant, not per canvas; a 4× wider canvas gets 4× the modules, not 4× smaller elements |
| Motion speed | in canvas fractions per bar, so a wider canvas moves faster in pixels but the same in bars |
| Hero size | ≥ ⅓ canvas height and 60–90% of a wall's safe width for walls; 40–55% of the frame area in landscape |
| Margins | `safe` fraction of the *short* side, not of the width |

## 4. Safe areas and edges

- `canvas.safe` keeps content off the rim (default 5% of the short side). On LED walls with bezels, and projection margins, raise it.
- Never leave an element grazing an edge or a fold: cross it or clear it.
- Keep type, logos and faces in the *content safe* region; let fields and ground bleed.

## 5. Pixel pitch, density, moiré

- Physical size per pixel: `pitch (mm)`. A wall of 5120 px at 3.9 mm is 20 m wide. Detail finer than ~2 pixels vanishes or shimmers; patterns near the pixel frequency produce moiré on camera. Avoid scanlines, fine halftones and 1-px grids on LED.
- On projection, contrast is limited by ambient light: keep primary information in mid and high luminance, and dark detail minimal.
- White-alpha content: design in 100/72/43% levels (`walls-code-assets.md`).

## 6. Legibility distance

Angular size rule of thumb: a character is legible when its height subtends at least about 0.3° for short words and 0.5° for important text.

`min cap height ≈ distance × tan(angle)` → at 15 m, 0.5° ≈ 13 cm. Convert to pixels with the panel pitch: `cap_px = cap_height_mm / pitch_mm`. At 3.9 mm pitch that is about 33 px; make it larger than that. Do the same arithmetic for a pictogram's smallest detail. If the contract names a viewing distance, derive and write down the minimum element size.

## 7. Adapting one concept across formats

Build the **concept once**, then **recompose**, not rescale:
1. Keep: concept, palette roles, motion language, layer roles.
2. Change: module size, count of repeats, travel direction (vertical for portrait, horizontal for wide), where the hero lives, tier order, text breaks.
3. Re-check: hierarchy ladder (still one hero?), minimum sizes, safe areas, and the loop seam.
4. Name the variants (`vertical`, `strip`) and export each at its native pixel size; never export one size and let the software stretch it.

## 8. Quick table: first decisions per aspect

| Aspect | Hero | Travel | Tier order | Text |
|---|---|---|---|---|
| 16:9 | on a third | any | ground, hero, structure, instruments, info | optional, edge-anchored |
| 1:1 | off-centre | diagonal | nested | at corners |
| 9:16 | upper-middle | vertical | top to bottom | stacked words |
| 21:9 / 2:1 | one of two or three | horizontal | left to right | large, short |
| 10:1 strip | 1–3 modules | along the strip | by module | big only, outside folds |
| L walls | one per wall, mirrored | across the fold | per wall | per wall, away from the fold |

## 9. Checks before delivery

Native pixel size correct; folds, gutters and displays declared; hero size and minimum element sizes computed from distance and pitch; no hairlines on LED; travel direction suits the frame; the contact sheet read at full width and at thumbnail; every composition still works if one wall is covered.
