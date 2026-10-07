# Repertoire — index

Theory and references that ground art-direction decisions. Load only the file the brief calls for; never load the whole folder.

## The rule: reference → principle → parameter

Every reference you use must end in an engine decision. A name with no parameter behind it is decoration.

```
REFERENCE      Bridget Riley, "Current" (1964)
PRINCIPLE      optical vibration from dense parallel lines under small, regular displacement
PARAMETER      shader recipe RILEY WAVES · p1 lines 14 · p3 amplitude 0.4 · monochrome palette · motion smooth · 1 cycle per loop
```

Never write "in the style of" a living artist or studio, and never reproduce a signature work (Ikeda's barcodes as his piece, Anadol's data paintings as his piece). Take the principle (binary density, latent-space fluidity) and transform it with this brief's own concept, palette and words. Historical movements and techniques (Op Art, Swiss grid, Truchet tiles) are open vocabulary.

## Which file to open

| Brief mentions… | Open |
|---|---|
| a period or movement: Bauhaus, construtivismo, futurismo, op art, minimalismo, concretismo, neoconcreto, video art, glitch, demoscene, cinema expandido | `art-history.md` |
| design suíço, grid, tipografia, editorial, cartaz, modular, programático, hierarquia | `swiss-design.md` |
| cor, paleta, contraste, harmonia, neon, monocromático, temperatura, LED vs projetor | `color.md` |
| animação, movimento, peso, elástico, orgânico, mecânico, ritmo, easing, title design, motion design | `animation.md` |
| texto, palavra, lettering, tipografia em movimento, kinetic type, letreiro, letreiro de abertura | `kinetic-type.md` |
| arte generativa, code art, algorítmico, abstrato, sistema, regras, ruído, partículas, seed | `generative-art.md` |
| padrão, pattern, textura geométrica, moiré, xadrez, ladrilho, halftone, ondas, op art (recipes) | `patterns.md` |
| a named artist, VJ or studio (Ikeda, Anadol, Lemercier, ManvsMachine…), "parecido com…", "inspirado em…" | `artists-studios.md` |
| a library or tool (p5, three.js, GSAP, Hydra, TouchDesigner, shaders), "como faço isso no meu pipeline" | `libraries.md` |

Several signals → open at most three files, the ones that change the most decisions. A movement named in the brief (Op Art, Bauhaus) that `patterns.md` or `swiss-design.md` already covers does not need `art-history.md` too.

## Where repertoire shows up in the output

1. **Art direction document**: one line per reference used, in the reference → principle → parameter format.
2. **meta.grammar**: the principle, in plain words.
3. **Composition hypothesis**: names the principle being tested ("TRANSFORMAÇÃO — o moiré de duas grades revela uma terceira forma que não está desenhada").
4. **Parameters and GLSL**: the actual translation.

Keep it short. One precise reference per composition beats five names in the summary.
