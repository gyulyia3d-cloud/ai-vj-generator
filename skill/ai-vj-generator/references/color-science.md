# Colour science for light-emitting surfaces

The theory in `repertoire/color.md` and `knowledge/semiotics-art-color-composition.md` says what colours *mean* and how they harmonise. This file is the physics and perception underneath, plus a method that turns a concept into a palette that survives an LED wall, a projector and a camera. Tool: `python scripts/palette.py` (OKLCH palettes and checks; it never picks the hue for you).

## 1. Work in a perceptual space

HSL lies: a yellow and a blue at the same "lightness" differ enormously in how bright they look. **OKLCH** is built so equal `L` reads as equal lightness and equal `C` as equal colourfulness: `L` 0 to 1, `C` 0 (grey) to about 0.37, `h` in degrees (about 30 red, 110 yellow, 145 green, 195 cyan, 265 blue, 330 magenta).

- Build palettes by choosing `L` first (the value structure), then `C`, then `h`.
- Build ramps and gradients in OKLCH (or OKLab): no muddy mid-tones, no dark bands in the middle of a blue-to-yellow blend.
- Gamut-map by **reducing chroma at constant L and h**, never by clipping channels; `palette.py` does it.

## 2. A palette is a value structure first

Squint: a good palette survives greyscale. Work with 3 to 4 value tiers:

| Role | L (typical) | C | Job |
|---|---|---|---|
| bg | 0.00 to 0.12 | ≤ 0.03 | the ground; on LED and projection it is the unlit surface |
| field | 0.25 to 0.40 | ≤ 0.03 | a plane behind a figure that belongs to another layer |
| secondary | 0.55 to 0.70 | 0.03 to 0.08 | structure and support |
| primary | 0.88 to 0.95 | ≤ 0.03 | the figure; keep a little below white (LED clipping, glare) |
| accent | 0.65 to 0.78 | 0.12 to 0.22 | the event; the only saturated note; 5 to 10% of the area |

The 60 / 30 / 10 proportion (ground / structure / accent) is a default; a monochrome piece with one rare accent is stronger than five equal colours. Name the *job* of every colour in `meta.contract.colorLogic`.

## 3. Method: concept → hue → scheme → checks

1. **Source the hue from the meaning**, not the wheel: the material or the place (oxidised copper, sodium street light, sea at night), the emotion's temperature, the culture's association (`knowledge/semiotics-art-color-composition.md`). Say why in the contract.
2. **Pick the relation** between ground, structure and accent hues:

| Scheme | Hue relation | Reads as |
|---|---|---|
| mono | one hue, lightness and chroma vary | calm, material, disciplined |
| analogous | ±30° | harmony, atmosphere |
| complement | +180° | tension, signal against ground |
| split | +150° and +210° | tension with less hardness |
| triad | +120°, +240° | playful, graphic, poster-like |
| tetrad | +90° steps | rich, risks chaos: one dominant, three rare |

3. `python scripts/palette.py scheme --hue <h> --scheme <s> --surface led|projection|screen` returns bg, primary, secondary, accent, field and runs the checks.
4. `python scripts/palette.py check --bg … --primary … --secondary … --accent … --surface …` audits a palette you already have (a client's brand colours, a reference extraction).
5. Put the final hex values in `palette`; keep `colorLogic` to one line per role.

Checks the tool makes: primary:bg contrast ≥ 7:1 on LED and projection (≥ 4.5 on screens), accent:bg ≥ 4.5, primary and secondary at least 0.15 apart in lightness, accent not merging with primary in greyscale, accent chroma ≥ 0.06, a near-black ground on physical surfaces.

## 4. Additive light: why a screen palette is not a print palette

- **Emitted light adds.** Two overlapping layers with `add` or `screen` blend sum their light: green over blue is cyan, and bright overlaps clip toward white. Use `add` for glow and energy on dark grounds, `multiply` or `normal` for tonal control, `difference` for graphic inversions.
- On projection **two projectors in a blend zone add physically**; the ramp compensates (`output-engineering.md` §2).
- **Black is the absence of light.** On LED it is "off"; on a projector it is the grey of the lens and the room. Design with dark empty space, never with a mid-dark grey field.
- **Surface colour multiplies every colour** (a red brick facade removes blue and green). Test the palette on the surface or ask for its reflectance and tint (`briefing/archetypes.md` §C).
- **Grayscale depth.** At low brightness an LED or a projector has few grey steps, so slow dark gradients band; keep them above about 10% luminance, or add fine grain (not on moiré-prone walls).

## 5. Perception effects that change colour decisions

| Effect | What happens | Consequence |
|---|---|---|
| Simultaneous contrast | a colour looks different on different grounds | judge the palette on the real ground, not on swatches |
| Purkinje shift | in dim light blues look brighter and reds darker | a red accent needs more luminance in a dark venue; blue gets bright for free |
| Helmholtz–Kohlrausch | a saturated colour looks brighter than a grey of equal luminance | a saturated accent reads even at modest luminance; do not raise both |
| Lightness beats hue at distance | far away only luminance contrast survives | separate tiers by `L`, use hue for meaning |
| Chromatic adaptation | after minutes under one coloured light, white drifts | alternate hue families across a long set, or reset with a neutral |
| Colour vision deficiency | about 1 in 12 men confuse red and green | never encode meaning in red versus green alone; add lightness or shape |
| Vignetting and flare | a bright field washes nearby darks | keep large bright areas short in time |

## 6. Colour in motion

- **Hue drift speed**: slow (a full turn per 16 bars) reads as atmosphere, fast (per beat) as strobing; changes of hue on the beat are events.
- **Cyclic colour maps close loops.** A map built from three squared sines 120° apart, `c_k(t) = sin²(π(t + k/3))`, returns to its start at `t = 1`, so a colour that cycles once per loop has no seam. Sequential maps (viridis-like) do not close; use them for position, not for time.
- **Energy ladder**: express a set's arc with chroma and lightness (quiet = low chroma, mid L; peak = high chroma, wide L range) rather than by changing hue families.
- **White-alpha** (`palette.mode = "white-alpha"`): every colour becomes a level of white (figure 100%, support 72%, field 43%); the VJ colours each layer. Design the *value structure* only, and say so in the delivery.

## 7. Colour and the camera

A camera sees an LED wall through its own shutter and white balance. Saturated reds and blues clip first, low refresh rates band, fine regular patterns moiré. For camera-first work: slightly lower saturation, soft gradients with grain, avoid pure white fields, avoid 1-pixel details.

## 8. Cultural care

Colour meanings differ by culture, context and decade. Treat an association as a hypothesis to confirm with the brief ("branco é luto em alguns contextos; para este público, o que ele significa?"), never as a fixed lookup. Brand colours supplied by the user are authoritative; do not "improve" them.
