# Changelog

## 3.12.0 (09/10/2026) · Fase 9: Surface IR

- **Surface IR** (`surface_ir.py`, `app/surface-ir.js`, dados em `registry/surface.json`): uma por projeto, em `meta.surfaceIR`. Analisa o que o autor entregou da superfície (tamanho, dobras, regiões de um CSV ou de uma máscara PNG, passo do LED, distância) e **rotula cada fato com a confiança**: `EXPLICIT` (declarado), `DETECTED` (medido numa forma entregue: arranjo, simetria e área ativa das regiões), `INFERRED` (palpite por regra: só aconselha) e `UNKNOWN` (faltou o dado: vira pergunta, o valor é `null`, nunca se chuta).
- **A força da restrição segue a confiança:** só `EXPLICIT` e `DETECTED` viram restrição dura (`activeArea`, `foldBands`, `safeArea` das regiões); `INFERRED` aconselha (`readingAxis`, `legibility`); `UNKNOWN` não restringe nada. O validador recusa restrição dura apoiada em fato INFERRED e fato UNKNOWN com valor.
- **Aplicado ao Composition IR:** com dobras ou regiões declaradas, herói, secundário e apoio caem em células ativas e não cruzam a costura, o texto fica a 6% da dobra, a costura entra no espaço negativo, `safeAreas` vem da caixa das regiões e `compositionIR[i].surface` registra o que foi movido. Sem dobras nem regiões nada muda (passo e distância sozinhos continuam dando a mesma composição).
- `brief.surface` aceita `regions`; os dois geradores levam dobras e regiões ao `canvas` e gravam `meta.surfaceIR`; `plan_ir.py --apply` lê dobras e regiões do projeto. Aba Superfície: tabela de fatos com a confiança de cada um, restrições duras e brandas, perguntas em aberto; regiões importadas de PNG ficam marcadas como `mask`.
- Teste novo `surface_ir_check.mjs` (Python = navegador em 11 superfícies e na composição; confiança de cada fato; medidas com resposta conhecida; controles negativos que provam que as regras podem falhar; validador contra IR adulterado; plan_ir; aba). `references/surface-ir.md`; `PROMPT.md` e `SKILL.md` apontam para ele.

## 3.11.0 (09/10/2026) · Fase 8: 2D generativo avançado

- **Camada `field`** (GPU, `app/field.js`): um campo escalar (ruído que anda numa volta fechada por loop, ou a luminância de uma imagem do projeto em `p.media`) desenhado por uma de **12 regras**: isolinhas, correntes (linhas de fluxo), células (Voronoi), Truchet, pontos em favo, moiré, metabolas, interferência, pontilhado, relevo, grade deformada e polar. `p.gain` (contraste do campo) e `p.invert`. Imagem como fonte: a mesma regra desenha outra origem.
- **Camada `glyphs`** (tipografia generativa em grade): cada célula escolhe um caractere de uma rampa (`p.ramp`, do mais vazio ao mais cheio) segundo um campo (`noise`, `radial`, `wave`, `spiral` ou `image`) e uma cor entre `c1` e `c2`; `shuffle` embaralha em 8 passos por loop, de forma determinística. É auditada para determinismo como as outras camadas de canvas 2D.
- **Entram pelo conceito:** `field` e `glyphs` são tipos de herói do Creative IR (`heroTypes`, pesos nos verbos); `fieldKinds` e `glyphSources` ligam cada um dos 32 verbos a uma regra e a um campo (`drift` e `flow` pedem CORRENTES, `fragment` e `assemble` pedem TRUCHET...). A rampa dos glifos vem do título do briefing. O Animation IR toca o arquétipo em `gain`. Gerador do navegador e `brief_to_project.py` iguais.
- Editor: rótulos de P1 a P4 por regra, troca de regra carrega os padrões, validação (imagem-fonte ausente é erro, shader compila), categorias Shader › Campo e Texto › Glifos. `families.json` e `families-cost.json` com as duas camadas.
- Teste novo `field_check.mjs` (12 regras diferentes entre si, determinismo, loop fecha nas 16 combinações, imagem conduz com resposta conhecida, inversão, rampa, embaralhar, validador, Python = navegador, controle negativo); `references/field-layer.md`.

## 3.10.0 (09/10/2026) · Fase 7: Animation IR

- **Animation IR** (`animation_ir.py`, `app/animation.js`, dados em `registry/animation.json`): uma por composição, em `meta.animationIR`. Diz como as coisas se movem, em tempo musical: arquétipo, relógio (`loopFrames`, ciclos por loop, quadros por ciclo, semicolcheia em quadros), easing, antecipação e assentamento medidos em quadros, quem lidera e quem segue e quantas semicolcheias atrasado (herói, estrutura, chão, instrumento, texto), coreografia das cinco fases, cinco eventos na grade de batidas e o contrato do loop.
- **8 arquétipos de movimento** (pulse, breathe, glide, surge, stutter, orbit, ripple, settle). Os 32 verbos do Creative IR votam; sem verbos os eixos escolhem; cada composição de um set usa um arquétipo diferente; `brief.motionArchetype` força o primeiro.
- **Aplicado às camadas** quando o Creative IR conduz: a curva do arquétipo no parâmetro-alvo do herói (ou na rotação, no orbit), a estrutura segue, contra-gira ou fica parada, e o atraso vai em `p.phase`. Só as curvas `lfo` próprias nas chaves conduzidas são trocadas (aplicar duas vezes não empilha); as fases `env` e a modulação por áudio ficam. Todos os ciclos são inteiros: o movimento se repete a cada loop e emenda sem salto, exceto a queda declarada do `surge`.
- O Animation IR é aplicado depois do Composition IR no gerador do navegador, no `brief_to_project.py` e no `plan_ir.py` (que agora grava os três IR). Validador: `meta.animationIR` (ciclos inteiros, atrasos e eventos dentro do loop, `loop.closes`). A galeria foi regenerada.
- Teste novo `animation_check.mjs` (Python = navegador no IR em 23 casos e nas camadas em 32 combinações; conceito escolhe o arquétipo; 4 arquétipos fazem 4 movimentos diferentes dos mesmos geradores; periodicidade; atraso; antecipação e assentamento; eventos; só aplica quando conduz; IR quebrado é recusado; trocar o arquétipo troca a imagem); `references/animation-ir.md`.

## 3.9.0 (09/10/2026) · Os dois IR para qualquer IA

- **`PROMPT.md` v3.1** (passo 2b): ensina qualquer IA, com ou sem ferramentas, a planejar a peça antes da técnica. IR = Representação Intermediária, um plano estruturado entre o briefing (palavras) e os geradores (código): o **Creative IR** (conceito, verbos visuais, motivos, hierarquia, comportamento) e um **Composition IR** por composição (gramática espacial, zonas, espaço negativo, fases). Lista os 32 verbos, as 12 gramáticas, os campos de `meta.creativeIR` e `meta.compositionIR`, a forma `env` e a regra de que o `role` de cada camada começa com o seu tier.
- **`scripts/plan_ir.py`**: `plan_ir.py brief.json` imprime os dois IR; `--apply project.json` grava em `meta` e posiciona as camadas de um projeto escrito à mão (camadas achadas pelo `role` ou pelo nome, idempotente).
- `SKILL.md`, `/vj` (Claude) e o validador (nota quando falta `meta.creativeIR`) apontam para o plano; `registry.mjs --check` confere que o PROMPT cita todos os verbos e gramáticas. Teste novo `plan_check.mjs`.

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
