# Biblioteca ISF

84 geradores ISF (de um passe, sem imagem de entrada) que a aba **ISF** do motor adiciona como camadas. Cada um compila em WebGL1 e é testado por `scripts/isf_ui_check.mjs`.

| Pasta | Qtd. | Notas |
|---|---|---|
| `original/` | 11 | Usam `phase` (o loop fecha de verdade), `bass mid high hit` e `c1 c2 cbg` |
| `third-party/` | 73 | Geradores ISF; a maioria usa `TIME` |

O manifesto (`manifest.json`) lista id, nome, arquivo e descrição de cada shader.

## Loop
Os 11 originais fecham o loop exatamente (dependem só de `phase`). Os demais usam `TIME`: só fecham se o período do shader dividir a duração do loop. Confira com `loop_check.mjs` antes de entregar.

## Miniaturas e embutir no motor
```bash
node scripts/isf-thumbs.mjs     # miniaturas
node scripts/embed-isf.mjs      # embute no motor
```
