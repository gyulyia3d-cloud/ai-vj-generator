# Changelog

## 3.8.0 (09/10/2026) · Fase 6: Composition IR

- **Composition IR** (`composition_ir.py`, `app/composition.js`, dados em `registry/composition.json`): uma por composição, em `meta.compositionIR`. Traz gramática espacial, zonas (herói, secundário, apoio, fundo), espaço negativo, ponto focal, massa visual, equilíbrio, alinhamento, eixo de movimento, mapa de densidade, escalas, profundidade, áreas seguras, comportamento de borda, âncora do texto e cinco fases (establish, develop, transform, peak, release).
- **12 gramáticas** (centered, offset, diagonal, radial, horizontal, vertical, distributed, clustered, asymmetric, symmetrical, hierarchical, edge-driven). A proporção da superfície e os verbos do Creative IR votam: a superfície ganha o primeiro lugar, o conceito molda o resto, e cada composição de um set usa uma gramática diferente. As zonas são frações do lado curto: o herói nunca é esticado para a proporção.
- **Aplicada às camadas** quando o Creative IR conduz: posição e escala do herói e da estrutura, centro do instrumento e do texto, direção das linhas, e as cinco fases como modulação `env` (escala, contraste, movimento, rotação, densidade), com o loop fechando.
- Nova forma de modulação `env` (motor, editor, esquema e validador). A galeria foi regenerada.
- Teste novo `composition_check.mjs` (Python = navegador em 40 casos, 5 superfícies; espaço negativo em 60 combinações; mesmos geradores em outro lugar; envelope fecha o loop); `references/composition-ir.md`.

## 3.7.0 (09/10/2026) · Fase 5: Creative IR

- **Creative IR** (`creative_ir.py`, `app/creative.js`, dados em `registry/creative.json`): compila o briefing em conceito, verbos visuais, motivos, estratégia de composição e de animação, famílias de gerador e faixas de parâmetro, e grava em `meta.creativeIR`. 32 verbos semânticos (cada um com geometria, movimento, comportamento espacial e temporal, densidade, papel do áudio, transição, material e composição), 16 conceitos (palavras em português e inglês), pesos de humor e 5 arcos.
- **O conceito pesa 3 vezes o humor.** Com conceito reconhecido (ou `brief.verbs`), o IR escolhe herói, estrutura e campo de cada composição, escala a densidade pelo arco, mistura o movimento (65% IR, 35% humor) e nomeia as composições pelo arco. Sem conceito reconhecido, o humor decide como antes.
- Mesmo humor, conceitos diferentes: "decadência" e "emergência" com "frio, contemplativo" diferem em topologia, movimento, densidade, arranjo, arco, família de gerador e material (`creative_check.mjs`). Paridade Python = navegador em 20 briefings.
- `brief.verbs` (opcional), `meta.creativeIR` no esquema e no validador; `references/creative-ir.md`.

## 3.6.0 (09/10/2026) · Fase 4: render graph e efeitos temporais

- **RenderGraph** (`app/rendergraph.js`): nós Source, Generator, Shader, Effect, Mask, Composite, History, Feedback e Output; compilação (dependências, ordem estável, ciclos, um Output), execução com devolução de recursos ao pool e `CanvasPool`. A composição de um quadro (`composeFrame`) roda por ele em `renderFrame`, exportação PNG, MP4 e replay; paridade de pixels com a versão anterior: 0,000 de 255 em 123 quadros.
- **Camada `temporal`** (Efeito › Tempo): TRILHA, FEEDBACK, SLIT SCAN (até 24 quadros em `TEXTURE_2D_ARRAY`) e DESLOCAR, determinísticos: a saída depende só dos quadros anteriores, o histórico é reconstruído por replay depois de um salto, a exportação zera antes de começar e o loop fecha na emenda.
- Correção no renderizador: upload e cópia de textura agora ativam a unidade certa (`bindForWrite`); o cache de `bindTexture` só vale para amostragem.
- Teste novo `rendergraph_check.mjs`; `references/temporal-layer.md`; `docs/ARQUITETURA-RENDER.md` com o grafo.

## 3.5.0 (09/10/2026) · Fase 3: recursos de GPU

- **Pools de textura e de framebuffer** com descritor (largura, altura, formato, filtro, wrap, profundidade, uso), adquirir/devolver/reaproveitar e descarte do que ficou parado; a textura do `fx` passa pelo pool (zero alocação por quadro depois do primeiro).
- **Estado da GPU** sem chamadas redundantes (blend, depth, scissor, framebuffer, textura por unidade, além de programa, viewport e VAO).
- **Métricas de desenvolvimento** `AIVJ.glMetrics()`: tempo de quadro, passes, desenhos, trocas de shader, alocações, texturas ativas, partículas ativas e VRAM estimada.
- Teste novo `gpu_resources_check.mjs`; `docs/ARQUITETURA-RENDER.md` atualizado.

## 3.4.0 (08/10/2026) · Fase 2: fundação WebGL2

- **Renderizador WebGL2** (`app/webgl.js`, `WEBGL.create`): contexto `webgl2`, programas em cache com esquema de uniforms e último uso, primitiva de tela cheia em VAO fixo, viewport e programa sem troca redundante, texturas e framebuffers como interface, detecção de capacidades (instancing, transform feedback, 3D, MRT, float). Sem WebGL2 o motor mostra um aviso técnico e não volta ao WebGL1.
- **GLSL ES 3.00 sem reescrever shader**: os projetos, receitas e a biblioteca ISF continuam no dialeto ES 1.00; o renderizador compila tudo como `#version 300 es` com um cabeçalho de `#define` (`gl_FragColor`, `texture2D`, `varying`). Funções embutidas redeclaradas por shaders de terceiros (`sign`, `round`) são tratadas.
- **FrameContext** (`frameContext`) e **uniforms por grupo** (`glFrameUniforms`: frame, audio, appearance, project): o render lê só o contexto do quadro, nunca relógio, `Date.now` ou `Math.random`.
- `scripts/gl_parity.mjs` compara a imagem do WebGL1 com a do WebGL2 em 123 quadros (galeria, shaders, filtros, cadeias, ISF): diferença média 0,000 de 255. Teste novo `webgl2_check.mjs`. ADR e mapa do render em `docs/ARQUITETURA-RENDER.md`.

## 3.3.0 (08/10/2026) · Fase 1: registry

- **`skill/ai-vj-generator/registry/`**: `generators.json` (34 tipos: categoria, renderMode, parâmetros, audioRoles, supportsAlpha, deterministic, surfaceAware, performanceClass), `parameters.json` (parâmetros comuns com unidade e papel), `modulation.json` (17 fontes), `capabilities.json` e `versions.json` (esquema atual, legados, migração e campos obsoletos).
- **Deriva corrigida:** o esquema não aceitava `kick`, `onset` e `flux` em `layer.mod.src` (a interface e o validador aceitavam). Agora o enum de `src` e o de `layer.type` vêm do registry; o validador lê `modulation.json`; `project-schema.md` cita os cinco tipos que faltavam.
- `scripts/registry.mjs --write` regenera o registry a partir do motor e grava os enums no esquema; `--check` (dentro de `check.mjs`) falha se motor, esquema, validador ou docs divergirem.

## 3.2.0 (08/10/2026) · Menu enxuto e camadas por categoria

- **Menu:** saem as abas **Gerar** e **ISF**. O caminho sem IA é `brief_to_project.py` + **Carregar**; a avaliação estrutural segue em `AIVJ.evaluate` e `scripts/evaluate.mjs` (a interface volta na Fase 15).
- **Camadas por categoria:** 34 tipos viram 9 categorias de até duas palavras (Fundo, Shader, Formas, Texto, Mídia, Dados, Partículas, Efeito, Código). O menu Adicionar escolhe categoria e tipo; nos parâmetros da camada, **Categoria** e **Tipo** trocam o tipo (guarda a transformação, zera o resto). O JSON continua guardando o tipo interno: projetos antigos abrem sem mudança.
- A camada `isf` fica em Shader › Biblioteca ISF; `ui-core.js` e `isf.js` substituem `gen-ui.js` e `isf-ui.js`.
- Teste novo `layers_check.mjs`; testes de aceite, ISF e UX ajustados ao menu novo.

## 3.1.0 (08/10/2026) · Fase 0 do roadmap v11: limpeza de escopo

O produto passa a ser um sistema generativo de animação: entra briefing e informação 2D de uma superfície, saem PNG sequence e MP4. Fora de escopo: performance, media server, mapping, geração de pixel map ou blueprint, MIDI, OSC, NDI, Spout, integrações com Resolume, TouchDesigner ou OBS, domo, DOOH.

- **Removido:** XML de Advanced Output do Resolume, mapa .json e padrão de teste das fatias, download de pixel map CSV, tabela "Transporte de sinal", textos de Resolume/TouchDesigner/OBS no LEIAME do export, exportação de ISF (botão, `isf.py export`), `export_slices.py`, `bridge-obs-spout.md`, arquétipos de objeto, domo e DOOH.
- **Novo:** camada `isf` (a biblioteca de 84 shaders escolhida no parâmetro `lib` da camada); export de PNG sequence e MP4 do **projeto completo ou de uma região** (display), com a região no nome dos arquivos e no manifesto.
- **Capabilities:** quatro rótulos (`supported`, `exportable`, `inputOnly`, `notSupported`). `requiresBridge` e `conceptual` continuam abrindo, com aviso, lidos como `notSupported`. Arquétipos antigos (`object-mapping`, `immersive`, `dooh`) abrem com aviso.
- **Roadmap v11** em `docs/ROADMAP.md` (o v10 foi para `docs/historico/ROADMAP-v10.md`). A decisão de não migrar para WebGL2 está revogada; a Fase 2 registra o ADR.
- Auditoria em `docs/FASE-0-AUDITORIA.md`.
- `render.mjs --region N`: PNG ou MP4 de um display pela linha de comando; o PNG recorta antes de transferir do navegador.
- Relatórios antigos, notas da 3.0.0 e versões anteriores do changelog saíram do repositório (ficam no histórico do git).
