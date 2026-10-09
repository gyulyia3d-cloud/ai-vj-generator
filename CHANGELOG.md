# Changelog

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
