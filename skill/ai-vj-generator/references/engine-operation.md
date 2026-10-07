# Engine operation: renderer, generators, GLSL, canvas, FPS, transport, outputs, build

> How to use the existing renderer (§46–§54). Never replace the engine and never write a second animation loop.

---

# 46. TECHNICAL RENDERER

The renderer already exists:

`assets/engine.html`

It provides:

- deterministic frame clock
- seeded randomness
- seamless loops
- alpha PNG export, per layer or full composition, and white-alpha (luma) output
- WebM recording
- output windows
- walls and folds (`canvas.folds`)
- code layers (`type: "code"`): your own drawing code, run inside the engine's deterministic clock
- embedded assets: logos, images and fonts travel inside the project
- STANDARD mode

Never replace it.

Never build a separate renderer.

Never create an independent canvas animation outside the engine. When the generators do not express the idea, write a `code` layer: it receives the frame clock, the wall geometry and the kit `K` (`references/walls-code-assets.md`) and stays deterministic, seamless and exportable.

Do not write a new:

```javascript
requestAnimationFrame
```

based animation system.

Creative implementation must remain compatible with the existing architecture.

---

# 47. STANDARD GENERATORS

Existing STANDARD generators include:

```text
bg
organism
structure
measure
data
hud
event
post
```

Briefing-oriented generators include:

```text
lines
flow
tunnel
typewall
```

Wall-aware generators (pixel-block type, signage symbols, hazard stripes, block glitch, logo masks):

```text
pixeltext
symbols
hazard
blocks
logo
```

Free layer, for what no generator expresses:

```text
code
```

Fixed media slots include:

```text
shader
image
video
shape
text
```

These are tools, not mandatory aesthetic presets. STANDARD is a library for the user to open in the interface; it is not a starting point for any briefing.

Never force a briefing into one of these generators if a custom GLSL system is more appropriate.

Parameter reference for every generator: `references/project-schema.md`. Presets that ship with the engine (`CAMPO FBM`, `CÉLULAS`, `ANÉIS SDF`, `FAIXAS`) are shortcuts; when the concept is specific, write the shader for it.

---

# 48. CUSTOM GLSL

Use custom GLSL when the concept requires a visual system beyond the standard generator vocabulary.

GLSL may be used for:

- procedural worlds
- SDF systems
- raymarched structures
- fields
- interference
- cellular systems
- complex distortion
- procedural materials
- abstract mathematical systems
- temporal effects

Keep shaders deterministic.

Use engine time and seeded parameters.

Avoid uncontrolled randomness.

---

# 49. PROJECT JSON

Use:

`references/project-schema.md`

Only write values that differ from defaults.

The engine handles fixed media slots.

The PROJECT JSON is the implementation layer of the artistic system.

Do not confuse JSON complexity with creative quality.

A simple project can produce a sophisticated animation if the concept and system are strong.

---

# 50. CANVAS

Canvas must represent the real pixel map.

Examples:

```text
5120×500
3840×1080
1080×1920
1920×1080
7680×2160
```

Never default to 1920×1080 when the target is different.

Design composition for the actual surface.

When the surface is made of several planes (an L of two walls, three walls, a cube), declare the folds in `canvas.folds` and the gutter in `canvas.gutter`. Then:

- text, faces and logos stay inside one wall and out of the gutter;
- lines, colour fields and wipes may cross a fold;
- measure positions from the fold (`wall.near(f)`) so the walls answer each other;
- elements are large: a hero is at least a third of the height and most of the wall's safe width.

Details and the full kit: `references/walls-code-assets.md`.

---

# 51. FPS

Supported:

- 24
- 25
- 30
- 50
- 60

Do not create unusual FPS values to force beat alignment.

Use whole-bar loop lengths.

---

# 52. TRANSPORT

Transport claims must use:

```text
SUPPORTED
EXPORTABLE
REQUIRES BRIDGE
CONCEPTUAL
```

NDI, Spout, Syphon and SDI require appropriate native bridges/software when the browser renderer does not directly support them.

Never claim unsupported direct transport.

---

# 53. OUTPUT TARGETS

Validate against:

`references/output-targets.md`

For LED:

- actual pixel map
- viewing distance
- brightness
- contrast
- high-frequency detail
- seams

For projection:

- black levels
- contrast
- environmental light
- mapping
- edge behavior

For Resolume:

- dimensions
- FPS
- alpha
- loop
- performance
- routing

---

# 54. BUILD

Use:

`references/delivery.md`

Run:

```text
scripts/make_artifact.py project.json --assets assets
```

or:

```text
scripts/make-artifact.mjs project.json --assets assets
```

`--assets` embeds the user's logos (`assets/logos/`), images and fonts. Then look at it before you publish or hand it over:

```text
node scripts/contact_sheet.mjs <slug>.html contato
```

It prints the engine's validation and writes one contact-sheet PNG per composition. Open each PNG. A composition you have not looked at is not delivered.

Without tools, provide the PROJECT JSON and instruct the user to paste it into:

`PROJETO → Importar`

---

## Aba Ficha (V5)

A aba **Ficha** guarda e mostra `meta.spec`, a ficha de produção do projeto (`references/briefing/diagnosis.md` §6):

- **Criar ficha** a partir do canvas, escolher o arquétipo, ver o que foi **confirmado**, o **derivado** e o **assumido** (com "Confirmar" para promover uma premissa), os riscos e os dados do show.
- **Zonas** (performer, oclusão, texto seguro, blend) em fração do canvas; aparecem na viewport como retângulos tracejados (botão "Mostrar na viewport") e saem do hero, do texto e do brilho.
- Aviso quando a ficha e o canvas **divergem** em pixel map, com os dois caminhos de correção.
- **Calculadoras** que espelham `scripts/surface_calc.py` (LED, projeção, blend, loop, legibilidade, canvas atual). "Aplicar ao canvas e à ficha" grava o pixel map, o pitch, o destino e os números derivados.
- **PRODUCTION_SPEC.md** para copiar ou baixar, com os cartões de teste a rodar primeiro no local.

Teste: `node scripts/ui_check.mjs` compara as calculadoras JS com o Python, percorre o fluxo, valida o JSON exportado e tenta injetar HTML pela ficha.

## Receitas, cartões de teste e cor (V5)

- Aba **Receitas**: as receitas de `references/recipes/` vão **embutidas no motor** (`node scripts/embed-recipes.mjs`, conferido por `check.mjs`). Busque, filtre, veja a prévia e **adicione como camada** depois da camada selecionada; cada adição é um passo do histórico (`Receita …`).
- Código de receita é código do próprio motor, mas só entra **autorizado** se o projeto já tinha código autorizado. Se não, a barra de autorização aparece como em qualquer código.
- **Cartões de teste**: um clique cria a composição `CARTÕES DE TESTE` (receita `testcard`) já com N de projetores e sobreposição lidos da ficha. Rode primeiro no local, antes de qualquer arte.
- **Cor perceptual** (aba Projeto): edite L, C e h ou o hexadecimal de cada papel; o contraste contra o fundo e os avisos da superfície (LED, projeção, tela) aparecem ao lado; **Gerar esquema** aplica o mesmo resultado de `scripts/palette.py scheme`. O teste `recipes_ui_check.mjs` compara os dois.
- Teclado: **Ctrl+Z** desfaz qualquer alteração, **Ctrl+Y** ou **Ctrl+Shift+Z** refaz; dentro de um campo de texto em edição vale o desfazer nativo do campo.

## V6: cor, 3D, idioma e ajuda

- **Botão Cor** (sob a vista, depois de Áudio): Alpha (branco α), Standard (6 esquemas OKLCH a partir de um matiz, ajustados à superfície), Personalizada (seletor, RGB e HEX) e Briefing (restaura `meta.briefPalette`, que o motor grava ao carregar o projeto). Cada troca é um passo do histórico.
- **Objeto 3D:** Mídia > Objeto 3D (`.obj`, `.glb` sem compressão, `.stl`), ou arraste para a vista. A camada fixa `OBJETO 3D` liga sozinha; em Parâm. escolha `shader` (faces sombreadas), `wireframe` ou `pointcloud`, o giro Y (voltas inteiras por loop, fecha o loop), a inclinação, a perspectiva e a luz. O modelo é centrado e normalizado; o arquivo viaja em `assets` (`kind: model`). Limite de 400 mil triângulos; o shader desenha até 30 mil faces por quadro.
- **+Efeitos:** o botão Visualizar mostra uma prévia leve; passar o mouse mostra um quadro.
- **Idioma:** botão EN / PT-BR no cabeçalho; `meta.lang` define o idioma ao abrir. Textos longos de ajuda e notas seguem em português; rótulos, botões, abas e avisos curtos são traduzidos.
- **Ajuda:** o botão `?` reabre o pop-up; "Não mostrar ao abrir" o silencia.
