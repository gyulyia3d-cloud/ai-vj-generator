# Color theory for light-emitting surfaces

VJ color is **additive light**, not pigment. On LED and projection, black is "off", saturated colors are emitted, and the room changes how color reads. Classic color theory still applies; the surface rules below override it.

## Theory that drives decisions

| Source | Idea | Decision it changes |
|---|---|---|
| Johannes Itten, *The Art of Color* (1961): seven contrasts | Hue, light–dark, cold–warm, complementary, simultaneous, saturation, extension (proportion) | Pick **one** contrast as the composition's color concept and name it in the art direction |
| Josef Albers, *Interaction of Color* (1963) | Color is relative: the same color looks different on different grounds | Test the accent on the actual `bg`; per-composition `palette.accent` overrides are legitimate |
| Michel-Eugène Chevreul (1839): simultaneous contrast | Adjacent colors push each other toward their complements | A gray next to the accent will read tinted; use true neutral `secondary` |
| Goethe, *Theory of Colours* (1810) | Color as experience and emotion, not only physics | Write the emotional intent first ("alarm", "dawn"), then choose hues |
| Munsell; modern OKLCH | Perceptual hue, lightness and chroma as separate axes | Build palettes by holding lightness constant and moving hue (OKLCH), so no color jumps out by accident |
| Proportion 70 / 15 / 10 / 5 | Background / primary / secondary / accent (STANDARD rule) | Accent is an event: it appears on the beat, in the wipe, on one tracked target |

## Harmonies as systems

| Harmony | Character | When | Palette recipe |
|---|---|---|---|
| Monochrome (one hue, many lightness steps) | Coherent, architectural, serious | Minimal, Swiss, Op Art, data | bg near-black of the hue; primary light tint; secondary mid; accent = pure white or the pure hue |
| Achromatic + one accent | Graphic, alarm, editorial (STANDARD) | Industrial, surveillance, techno | black / bone / gray / one saturated accent |
| Analogous (neighbors on the wheel) | Calm, natural, immersive | Organic, ambient, Light and Space | three hues within 60°, close lightness |
| Complementary | Vibration, maximum tension | Peaks, drops, Op Art color work | accent and secondary opposite; use extension contrast (one small, one large) |
| Split complementary | Tension with less aggression | Melodic, emotional | base hue + two neighbors of its complement |
| Triadic / De Stijl primaries | Playful, constructive, poster-like | Constructivist / Bauhaus references | three primaries on white or black, never at equal area |

## Surface rules (override theory)

| Surface | Rule |
|---|---|
| LED | Black is free and dark is beautiful; avoid large mid-gray (it shows the module grid and uneven batches). Pure white at full level is harsh at night and can clip: use bone (#F2F0EA–#F4F3EF) as primary. Saturated reds and blues lose detail at distance: give them weight. |
| Projection | Projector black is gray: dark palettes wash out, so build contrast with light forms on true black. Saturated colors lose brightness against white; test the accent's lightness. |
| Mapping on colored or textured surfaces | The surface tints everything: prefer white or very light content and let the material color it. |
| Resolume colorize workflow | Export **Branco α** (luma) and color in the software; then the palette here is only for preview. |
| Photosensitivity | Saturated red flashes are the most provocative for photosensitive viewers: keep red full-frame flashes slower than 3 per second. |

## Palette generation procedure

1. Write the color concept in one line (which Itten contrast, which emotion).
2. Choose the harmony from the table.
3. Fix `bg` first (for LED: #000000 or a very dark tint).
4. Choose `accent` (the event color), then `primary` (most-used content color, lightest), then `secondary` (support, mid lightness, low chroma).
5. Check: primary vs bg contrast high; secondary clearly below primary; accent distinct from primary in hue, not only lightness.
6. Per composition, override only `accent` when the hypothesis needs it (STANDARD uses green, blue, red per composition).

## Ready palettes in the engine

`STANDARD`, `MONO`, `BRANCO ALPHA`, `INDUSTRIAL`, `ORGÂNICO`, `NOTURNO`, `SOLAR`, `ALARME`. Use them as starting points; most briefs deserve their own four values written into `palette`.
