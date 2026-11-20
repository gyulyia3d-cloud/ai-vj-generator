# Biblioteca ISF

84 geradores ISF (de um passe, sem imagem de entrada) que a aba **ISF** do motor adiciona como camadas. Cada um compila em WebGL1 e é testado por `scripts/isf_ui_check.mjs`.

| Pasta | Qtd. | Licença |
|---|---|---|
| `original/` | 11 | MIT, deste repositório. Usam `phase` (o loop fecha de verdade), `bass mid high hit` e `c1 c2 cbg` |
| `third-party/` (MIT) | 28 | MIT. O aviso de copyright e de licença exigido está em `THIRD-PARTY-NOTICES.md` e no cabeçalho de cada arquivo |
| `third-party/glslop-*` | 45 | CC0-1.0 (domínio público) |

O manifesto (`manifest.json`) guarda a licença de cada shader, e a camada importada leva a licença no campo `role`.

## Loop
Os 11 originais fecham o loop exatamente (dependem só de `phase`). Os demais usam `TIME`: só fecham se o período do shader dividir a duração do loop. Confira com `loop_check.mjs` antes de entregar.

## Miniaturas e embutir no motor
```bash
node scripts/isf-thumbs.mjs     # miniaturas
node scripts/embed-isf.mjs      # embute no motor
```
