# Biblioteca ISF

84 geradores ISF (de um passe, sem imagem de entrada) que a aba **ISF** do motor adiciona como camadas. Cada um compila em WebGL1 e é testado por `scripts/isf_ui_check.mjs`.

| Origem | Qtd. | Licença | Fonte |
|---|---|---|---|
| `original/` (AIVJ) | 11 | MIT, deste repositório | escritos para o projeto; usam `phase` (loop fecha de verdade), `bass mid high hit` e `c1 c2 cbg` |
| `third-party/` Vidvox | 27 | MIT | https://github.com/Vidvox/ISF-Files |
| `third-party/` ProjectileObjects | 1 | MIT | https://github.com/ProjectileObjects/MiscISFShaders |
| `third-party/glslop-*` | 45 | CC0-1.0 (domínio público) | https://glslop.com (corpus aberto; `/api/v1/export`) |

Cada arquivo mantém o seu `CREDIT`; o manifesto (`manifest.json`) guarda autoria, licença e origem, e a camada importada leva a licença no campo `role`. Os arquivos da Vidvox e da ProjectileObjects seguem a licença MIT dos repositórios (texto completo nos repositórios de origem; copyright dos respectivos autores). Os do glslop são CC0 por declaração do corpus; `author_name` do glslop vai no `credit`.

## O que ficou de fora, e por quê
- Qualquer arquivo com "noncommercial", Creative Commons com restrição, Shadertoy ou GLSL Sandbox no texto (ex.: vários da `modV` e do `ProjectileObjects`): licença incompatível com redistribuir.
- `Brick Pattern`, `PerlinNoiseShader`, `Zebra_Lines…`: autoria original com licença incerta.
- `ISF-shaders` do Ethereios (declarado CC0, mas são portes de Shadertoy de autores que não escolheram CC0), coleções sem arquivo de licença (grigM, w3h, bareimage mistura CC e MIT por arquivo).
- Filtros (precisam de imagem de entrada), ISF com `PASSES` e com `audio/audioFFT`: o importador recusa e diz por quê.
- 7 geradores MIT que usam GLSL ES 3 e não compilam em WebGL1.

## Loop
Os 11 originais fecham o loop exatamente (dependem só de `phase`). Os de terceiros usam `TIME`: só fecham se o período do shader dividir a duração do loop. Confira com `loop_check.mjs` antes de entregar.

## Regenerar
```bash
node scripts/fetch-glslop.mjs <pasta>/glslop            # corpus CC0
python scripts/curate_isf.py <pasta-com-clones> --originals skill/ai-vj-generator/isf-library/original --glslop <pasta>/glslop --top 45
node scripts/isf-thumbs.mjs                              # miniaturas
node scripts/embed-isf.mjs                               # embute no motor
```
`exclude.txt` (opcional, neste diretório) lista ids ou nomes a ignorar.
