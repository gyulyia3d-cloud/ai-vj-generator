# Roadmap oficial (v11, motor 3.20.0)

Substitui o roadmap v10. Decidido pela autora em 08/10/2026.

## Produto
Sistema generativo de animação orientado por direção de arte. Entra um briefing e informação 2D de uma superfície; saem **PNG sequence** (RGB, RGBA, por camada, projeto completo ou região) e **MP4**.

Cadeia de decisão: intenção, significado, conceito, linguagem visual, composição, comportamento, animação, geração, render. A técnica é consequência da intenção. A superfície é entrada, restrição e contexto de composição, nunca ambiente 3D nem alvo de mapping.

## Fora de escopo (não planejar, não prometer)
Software de performance ou VJ playback, media server, projection mapping, geração de pixel map ou blueprint, gestão de LED wall, MIDI, OSC, NDI, controle remoto, integração com Resolume, TouchDesigner ou OBS, domo, DOOH, simulação do prédio ou do projetor, visualização 3D da instalação, tracking físico. O 3D existe só para gerar a animação.

Referências antigas a isso ficam apenas no `CHANGELOG.md`.

## Fases (ordem obrigatória; ver a ordem revisada abaixo da tabela)
| Fase | Foco | Estado |
|---|---|---|
| 0 | Limpeza de escopo | **feita (3.1.0)** |
| 1 | Fonte única da verdade (registry de geradores, parâmetros, modulação, capabilities) | **feita (3.3.0)**; o motor ainda declara os parâmetros no código e o registry é conferido contra ele (a geração motor ← registry fica na Fase 18) |
| 2 | Fundação WebGL2 (GLSL ES 3.00, VAO, FrameContext determinístico) | **feita (3.4.0)**; ver `ARQUITETURA-RENDER.md` |
| 3 | Recursos de GPU (pools de textura e framebuffer, métricas) | **feita (3.5.0)** |
| 4 | Render graph (History, Feedback, FX temporais) | **feita (3.6.0)** |
| 5 | Creative IR (conceito e verbos semânticos acima de humor) | **feita (3.7.0)** |
| 6 | Composition IR | **feita (3.8.0)** |
| 7 | Animation IR | **feita (3.10.0)** |
| 8 | 2D generativo avançado (campos, topologias, tipografia, imagem como fonte) | **feita (3.11.0)** |
| 9 | Surface IR (análise 2D com confiança EXPLICIT/DETECTED/INFERRED/UNKNOWN) | **feita (3.12.0)** |
| 10 | Semântica de áudio (cada camada declara um comportamento temporal) | **feita (3.13.0)** |
| 11 | 2.5D (planos de profundidade, câmera, paralaxe, névoa e foco) | **feita (3.14.0)** |
| 12 | 3D generativo | **feita (3.15.0)**: camada `solid`, raymarching próprio sobre WebGL2, sem biblioteca 3D |
| 18 | Redução do monólito `app/index.html` (antes da interface: a UI nova nasce em módulos) | **feita (3.16.0)**: 18 módulos e `style.css`; o index.html é gerado |
| 19 | Versionamento e migração de projetos (esqueleto agora; cada fase seguinte que muda o esquema traz a sua migração) | **feita (3.17.0)**: `meta.formatVersion`, passos em `registry/versions.json`, `migrate.js` = `migrate_project.py` |
| 13 | Partículas em GPU (primeiro sem estado: posição em forma fechada do quadro; simulação com estado só depois, pelo histórico da fase 4) | **feita (3.18.0)**: camada `particles`, 6 regras em forma fechada (sem estado, quadros fora de ordem iguais), gl.POINTS sem buffer; simulação com estado fica para depois, pelo histórico da fase 4 |
| 14 | Interface de ferramenta de criação (sobre os módulos da fase 18) | **em andamento**: 14a (base: tokens, slider, casca nova) feita (3.19.0); falta o restante da 14 |
| 15 | Crítica artística (ARTISTIC / STRUCTURAL / TECHNICAL separados) | pendente |
| 16 | Export profissional: o que falta é verificação, manifesto verificável e honestidade sobre alfa (`mp4.js` e o manifesto já existem) | **feita (3.20.0)**: manifesto v2 com SHA-256 por quadro, `verify_export.mjs` (alfa medido), manifesto no `render.mjs`, JSZip embutido (export sem rede) |
| 17 | Performance | pendente |
| 20 | Galeria de regressão + testes visuais determinísticos (antigas 20 e 21 fundidas: um só mecanismo de quadros de referência; resolve o baseline obsoleto do `gl_parity` e o estouro de tempo do contato 02-jardim-tela) | **em andamento**: base versionada `examples/reference/parity.json` (184 quadros) e controle negativo no `check.mjs`; falta o contato `02-jardim-tela` |
| 22 | Testes de ponta a ponta | pendente |
| 24 | Portão final de qualidade, com auditoria de documentação (a antiga 23 virou regra: cada fase documenta o que entrega) | pendente |

**Ordem de execução a partir de 12 (revisada em 12/10/2026):** 18, 19, 13, 14, 15, 16, 17, 20, 22, 24. Os números das fases não mudam, só a ordem; a 21 foi fundida na 20 e a 23 virou regra por fase. Motivos: a migração fica mais cara a cada fase que muda o esquema; a interface não deve crescer dentro do monólito; galeria e testes visuais são o mesmo mecanismo.

WebGL2 (fase 2) vem antes de 3D e partículas. A decisão anterior de não migrar (relatório V9 §5, medido) está revogada por este roadmap; a fase 2 registra o ADR.

## Regras
- Determinismo acima de novidade visual: sem `Math.random`, `Date.now` ou `performance.now` no render.
- Coerência artística acima de quantidade de geradores; manutenção acima de complexidade.
- Projetos antigos continuam abrindo: mudança de schema traz migração.
- Cada fase termina com `node scripts/check.mjs` verde e relatório final.
