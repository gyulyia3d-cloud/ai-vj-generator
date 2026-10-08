# The `fx` layer: effects that read what is below

A shader layer draws from nothing. An `fx` layer takes everything painted **below it in the stack** as a texture, runs one pass over it, and returns the result. It is how you get a CRT, a halftone, a VHS wobble, liquid glass or a bloom on top of a composition without rewriting the whole picture. Closes the old limit "single pass, no input texture".

```json
{ "type": "fx", "name": "ACABAMENTO", "role": "finish: scanlines and a little glow, last pass of the piece",
  "on": true, "opacity": 1, "blend": "normal", "p": { "preset": "CRT", "p1": 0.1, "p2": 0.3, "p3": 0.25, "p4": 0.35, "mix": 0.8 } }
```

## Rules
- **Order is meaning.** The effect only sees layers underneath. Put it above the layers it must change and below the ones it must leave alone (type and data usually stay above).
- With `opacity` 1 and `blend` `normal` the effect **replaces** the image below (the result already contains it). With less opacity it mixes with it. `mix` blends the effect with its own input, which is the usual way to dial it down.
- One or two per composition. Two heavy passes at 4500x800 cost frames; measure with `node scripts/bench.mjs` (the cost table is in `docs/historico/RELATORIO-V9-githubs3.md`).
- The loop closes: time enters only through the loop phase (`uPh`) and integer steps per loop. `fx_check.mjs` proves each preset closes the loop, changes the image, returns the input at `mix` 0 and does not flip the texture.
- Alpha is preserved, so an `fx` works in alpha exports too (a CRT turns the transparent border black on purpose: for alpha pieces prefer PIXELATE, DITHER, GRADE E VINHETA, BLOOM, ABERRAÇÃO CROMÁTICA).
- On LED walls: prefer `PAINEL DE LED`, `DITHER`, `GRADE E VINHETA`, `MAPA DE GRADIENTE`; avoid `CRT`, `VHS` and anything finer than the pixel pitch (it aliases).
- `res` (0.25 to 1) renders the effect at a lower internal resolution: use it for the expensive ones (`KUWAHARA`, `BLOOM`).
- Exporting a single layer (`Uma camada` in the Export tab) exports the effect with nothing below it, which shows nothing: export the composition.

## Presets (P1..P4 are the four sliders; the number in parentheses is the default)

| Preset | Family | Sliders |
|---|---|---|
| `PIXELATE` | tela | P1 Célula (px) (14) · P2 Respiro (0.3) · P3 Suavizar (0) |
| `HALFTONE` | impressão | P1 Célula (px) (9) · P2 Ângulo (°) (45) · P3 Suavidade (0.9) · P4 Cor da fonte (0.5) |
| `DITHER` | tela | P1 Níveis (3) · P2 Pixel (px) (3) · P3 Mistura de paleta (0.8) · P4 Duotom (0) |
| `CRT` | tela | P1 Curvatura (0.12) · P2 Linhas de varredura (0.35) · P3 Máscara RGB (0.3) · P4 Brilho (glow) (0.4) |
| `VHS` | tela | P1 Tremor (0.6) · P2 Vazamento de cor (0.6) · P3 Ruído (0.35) · P4 Faixa de rastreio (0.5) |
| `ABERRAÇÃO CROMÁTICA` | lente | P1 Quantidade (1.6) · P2 Radial (0 a 1) (1) · P3 Ângulo (°) (0) · P4 Suavização (0.3) |
| `BORDAS NEON` | traço | P1 Ganho (2.2) · P2 Largura (px) (1.2) · P3 Fonte visível (0.25) · P4 Contraste (1.2) |
| `KUWAHARA` | pintura | P1 Raio (3) · P2 Nitidez (1) |
| `MAPA DE GRADIENTE` | cor | P1 Níveis (0 = liso) (0) · P2 Contraste (1.1) · P3 Mistura com a fonte (0.15) · P4 Deslocar (0) |
| `PAINEL DE LED` | tela | P1 Passo (px) (10) · P2 Tamanho do LED (0.42) · P3 Gama (1.2) · P4 Vazamento de luz (0.35) |
| `VIDRO LÍQUIDO` | lente | P1 Refração (28) · P2 Suavidade (px) (6) · P3 Aberração (0.6) · P4 Brilho de borda (0.5) |
| `DESLOCAR` | distorção | P1 Quantidade (px) (18) · P2 Escala (3) · P3 Velocidade (voltas) (1) · P4 Direção (°) (0) |
| `ESPELHO` | geometria | P1 Dobras (6) · P2 Voltas por loop (1) · P3 Zoom (1) · P4 Mistura central (0.2) |
| `BLOOM` | luz | P1 Raio (px) (14) · P2 Limiar (0.55) · P3 Intensidade (1.2) · P4 Tom (cor 1) (0.3) |
| `ARRASTO DE PIXEL` | glitch | P1 Comprimento (px) (90) · P2 Limiar (0.45) · P3 Ângulo (°) (90) · P4 Mistura (0.9) |
| `GRADE E VINHETA` | cor | P1 Contraste (1.1) · P2 Saturação (1.05) · P3 Vinheta (0.35) · P4 Grão (0.12) |
| `GLITCH EM BLOCOS` | glitch | P1 Altura do bloco (px) (26) · P2 Deslocamento (px) (90) · P3 Probabilidade (0.35) · P4 Passos por loop (12) |
| `REPETIR` | geometria | P1 Colunas (3) · P2 Linhas (3) · P3 Deslocar (voltas) (1) · P4 Espelhar (0.5) |
| `AUTOMODULAÇÃO` | distorção | P1 Quantidade (px) (40) · P2 Escala (1) · P3 Rotação (voltas) (1) · P4 Canal (0 cor, 1 luz) (0) |
| `SABATTIER` | foto | P1 Limiar (0.5) · P2 Suavidade (0.12) · P3 Linha de Mackie (0.8) · P4 Mistura de cor (0.7) |
| `HACHURA` | traço | P1 Espaçamento (px) (7) · P2 Espessura (0.32) · P3 Papel x tinta (0 a 1) (1) · P4 Cor da fonte (0.15) |
| `POLAR (PLANETINHA)` | geometria | P1 Voltas por loop (1) · P2 Potência do raio (0.8) · P3 Zoom (1) · P4 Mistura central (0.1) |

## Writing your own pass
A pass is a GLSL ES 1.00 `void main()` that may call `tx(uv)` (the input, `uv` 0..1, straight alpha) and `fxLuma(rgb)`. All engine uniforms are there (`uRes uPh uBass uHit uC1 uC2 uBg uP` and the `vj*` helpers via `#include`). Add it to `FX` in `app/fx.js` with `labels`, defaults `d` and a `tag`, or write the source in a normal shader layer's `src` using the sampler filters of the `filter` module (`vjBlur9(uTex, uv, dir)` and friends work inside `fx` passes because `uTex` is the input).

## What it does not do (yet)
No state between frames (no feedback trails, no slit-scan, no optical flow, no jump-flood): those need history. For trails on a single layer use its own `echo` parameter (copies of earlier frames, deterministic). A multi-frame `fx` is on the roadmap (`docs/PROXIMOS-PASSOS.md`, phase 4), with deterministic pre-warm instead of baking the loop.
