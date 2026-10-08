# Typography: the `typeset` layer

For anything with more than one line of text, use `typeset` instead of `text`. It sets title, caption and data as **one hierarchy**, reveals them by glyph or word, and can set them on a path. Everything is a pure function of the loop phase and hidden at both ends of the loop, so it closes.

## Hierarchy

Three levels, each `scale` times the one above (default 0.4): title = `size` px (logical units, times `u` like every generator), caption = 0.4x, data = 0.16x. Spacing is `gapY` em of the lower level. Leave caption or data empty to drop a level. Rules that hold on a wall and on a screen:

- One title. Two sizes are a hierarchy; three are a system; four are noise.
- The caption is secondary colour, the data is secondary colour smaller; only the title takes the accent, and only on a hit (the first level flashes the accent colour when the bass hit is strong).
- Uppercase, one family. Tracking 0.04 em at display sizes, a little more for small data.
- On LED, the smallest level must still be legible at the farthest viewing distance: run `scripts/surface_calc.py legibility` and raise `size` or `scale` until it is.

## Reveal

`reveal`: `glyph` (letter by letter), `word` (word by word, good for stepped pieces), `none` (always visible).

- `inAt` (0.08): where in the loop (0..1) the title starts to appear. `cascade` (0.07): extra delay for each lower level.
- `inLen` (0.18): how long the reveal takes. `outLen` (0.16): how long the exit takes; it ends exactly at the end of the loop, so the loop closes on an empty frame.
- `stagger` (0.8): how much of the reveal each glyph waits for the previous one (0 = all together, 2 = strictly one by one).
- Each glyph rises 35% of its height with an ease-out cubic and fades in; the title pulses with the beat by `pulse` (0.03).

The reveal is the **event** of the composition: place it at the build, not at the peak, and let the peak be held, not animated.

## Text on a path

`path`:

- `circle`: the title on the top arc of a circle of `radius` px, lower levels on smaller concentric arcs inside it. `drift` (whole turns per loop) rotates the text.
- `wave`: a sine baseline of `amp` px with `waves` periods (half-steps) across the text length; glyphs follow the tangent. `drift` moves the wave along the text by whole periods per loop.
- `line`: a straight baseline at `angle` degrees.

Keep text on a path short (under about 24 characters at the title level) and large: the eye reads curved type slowly.

## From the brief

`text.title`, `text.caption`, `text.data` and `text.path` in the brief (`schema/brief.schema.json`) make `brief_to_project.py` add a `typeset` layer. `text.words` (a list) still makes the big rotating `typewall`. Exact words only: never invent copy.

## Test

`scripts/typeset_check.mjs`: valid, draws, hidden at both ends of the loop, reveals gradually, and stack, circle and wave produce different images.
