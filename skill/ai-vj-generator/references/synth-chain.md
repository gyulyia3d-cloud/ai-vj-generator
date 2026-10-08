# The `synth` layer: a one-line chain becomes a shader

Write the picture as a chain, not as GLSL. A source, then operators, left to right. The idea of chaining sources and transforms comes from live-coding video tools (Hydra is the best known); the grammar, the operators and every line of GLSL here are written for this project, with the rules of this engine: time only in **whole cycles per loop**, numbers that accept the **audio**, output through `outc()`.

```json
{ "type": "synth", "name": "CAMPO", "role": "ground: slow ribbons bent by noise",
  "p": { "chain": "osc(18,1,0.6).rotate(0.1,1).modulate(noise(3,1),0.12).tint().contrast(1.25)", "alphaMode": "opaque" } }
```
Empty `chain` plays the example named in `preset`. A broken chain shows the reason on the layer ("a cadeia precisa começar por uma fonte…") and in the Export validation.

## Grammar
`chain := source ( "." operator )*`, `operator := name "(" args ")"`. Arguments are numbers or **expressions** (`1+0.3*bass`, `max(2,hit*8)`), or, as the first argument of blend and modulate operators, another chain: `.add(shape(6,0.3), 0.5)`. A trailing `.out()` is accepted and ignored.
Names allowed in expressions: `bass mid high hit rms pulse beat phase tau pi p1 p2 p3 p4` and `sin cos abs min max floor fract mod sqrt pow mix clamp step smoothstep exp sign`. Anything else is refused: there is no way to inject raw GLSL.

Coordinate operators act on **everything before them** in the chain (`osc().rotate(.25)` rotates the oscillator), as in the tools that inspired this; colour operators act on the result so far.

## Sources
| Source | Arguments (defaults) | Gives |
|---|---|---|
| `osc` | freq 30, cycles 1, offset 0.5 | colour stripes across x, phase-shifted per channel |
| `noise` | scale 6, cycles 1 | value noise that walks a circle (loops) |
| `voronoi` | scale 5, jitter 0.4, cycles 1 | distance to cell seeds that orbit |
| `shape` | sides 4, radius 0.35, smooth 0.02 | polygon with alpha |
| `gradient` | cycles 1 | x, y and a breathing blue |
| `solid` | r g b a (0 0 0 1) | flat colour |
| `rings` | freq 24, cycles 1 | concentric rings flowing outward |
| `grid` | n 8, width 0.08 | lines |
| `stripes` | freq 14, cycles 1 | diagonal bars |

## Operators
- **Coordinates:** `rotate(turns, cycles)` `scale(s, x, y)` `pixelate(x, y)` `repeat(x, y, offX, offY)` `repeatX(n, off)` `repeatY(n, off)` `scroll(x, y, cycles)` `scrollX(x, cycles)` `scrollY(y, cycles)` `kaleid(n)` `mirror(amount)` `warp(amount, scale, cycles)` `twirl(amount, radius)`
- **Colour:** `color(r,g,b,a)` `hue(turns, cycles)` `saturate(a)` `contrast(a, mid)` `brightness(a)` `invert(a)` `posterize(bins, gamma)` `thresh(t, smooth)` `luma(t, smooth)` `tint(amount)` (maps luminance onto bg, accent, primary: the palette of the project) `gamma(a)`
- **Blend with another chain:** `add(chain, amt)` `sub` `mult` `diff` `blend` `layer(chain)` (uses its alpha) `mask(chain)` (uses its luminance)
- **Modulate with another chain:** `modulate(chain, amt)` `modulateScale(chain, mult, offset)` `modulateRotate(chain, mult, offset)` `modulatePixelate(chain, mult, offset)` `modulateKaleid(chain, sides)`

`cycles` is rounded to a whole number: that is what makes the loop close. Use `tint()` near the end so the palette of the project, not RGB accidents, decides the colour.

## Examples (all ship as presets and are tested by `synth_check.mjs`)
`FAIXAS MODULADAS` `KALEIDO DE RUÍDO` `CÉLULAS EM ESPELHO` `RETÍCULA RESPIRANDO` `ANÉIS HIPNÓTICOS` `FORMA SOBRE CAMPO` `FLUXO DE LISTRAS` `VÓRTICE` `CHECAGEM TRAVADA` `DIFERENÇA ORGÂNICA`

## When to use which layer
`shader` for a tuned GLSL field or an imported ISF; `synth` when the briefing reads like a recipe ("stripes, bent by noise, mirrored") and you want to iterate by editing one line; `fx` for passes over the stack; `code` for anything with geometry, text or state.
