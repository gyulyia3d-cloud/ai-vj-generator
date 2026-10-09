# Roadmap oficial (v11, motor 3.8.0)

Substitui o roadmap v10. Decidido pela autora em 08/10/2026.

## Produto
Sistema generativo de animação orientado por direção de arte. Entra um briefing e informação 2D de uma superfície; saem **PNG sequence** (RGB, RGBA, por camada, projeto completo ou região) e **MP4**.

Cadeia de decisão: intenção, significado, conceito, linguagem visual, composição, comportamento, animação, geração, render. A técnica é consequência da intenção. A superfície é entrada, restrição e contexto de composição, nunca ambiente 3D nem alvo de mapping.

## Fora de escopo (não planejar, não prometer)
Software de performance ou VJ playback, media server, projection mapping, geração de pixel map ou blueprint, gestão de LED wall, MIDI, OSC, NDI, controle remoto, integração com Resolume, TouchDesigner ou OBS, domo, DOOH, simulação do prédio ou do projetor, visualização 3D da instalação, tracking físico. O 3D existe só para gerar a animação.

Referências antigas a isso ficam apenas no `CHANGELOG.md`.

## Fases (ordem obrigatória)
| Fase | Foco | Estado |
|---|---|---|
| 0 | Limpeza de escopo | **feita (3.1.0)** |
| 1 | Fonte única da verdade (registry de geradores, parâmetros, modulação, capabilities) | **feita (3.3.0)**; o motor ainda declara os parâmetros no código e o registry é conferido contra ele (a geração motor ← registry fica na Fase 18) |
| 2 | Fundação WebGL2 (GLSL ES 3.00, VAO, FrameContext determinístico) | **feita (3.4.0)**; ver `ARQUITETURA-RENDER.md` |
| 3 | Recursos de GPU (pools de textura e framebuffer, métricas) | **feita (3.5.0)** |
| 4 | Render graph (History, Feedback, FX temporais) | **feita (3.6.0)** |
| 5 | Creative IR (conceito e verbos semânticos acima de humor) | **feita (3.7.0)** |
| 6 | Composition IR | **feita (3.8.0)** |
| 7 | Animation IR | pendente |
| 8 | 2D generativo avançado (campos, topologias, tipografia, imagem como fonte) | pendente |
| 9 | Surface IR (análise 2D com confiança EXPLICIT/DETECTED/INFERRED/UNKNOWN) | pendente |
| 10 | Semântica de áudio (cada camada declara um comportamento temporal) | pendente |
| 11 | 2.5D | pendente |
| 12 | 3D generativo | pendente |
| 13 | Partículas em GPU | pendente |
| 14 | Interface de ferramenta de criação | pendente |
| 15 | Crítica artística (ARTISTIC / STRUCTURAL / TECHNICAL separados) | pendente |
| 16 | Export profissional (PNG, MP4, manifesto, verificação) | pendente |
| 17 | Performance | pendente |
| 18 | Redução do monólito `app/index.html` | pendente |
| 19 | Versionamento e migração de projetos | pendente |
| 20 | Galeria de regressão | pendente |
| 21 | Testes visuais determinísticos | pendente |
| 22 | Testes de ponta a ponta | pendente |
| 23 | Documentação final literal | pendente |
| 24 | Portão final de qualidade | pendente |

WebGL2 (fase 2) vem antes de 3D e partículas. A decisão anterior de não migrar (relatório V9 §5, medido) está revogada por este roadmap; a fase 2 registra o ADR.

## Regras
- Determinismo acima de novidade visual: sem `Math.random`, `Date.now` ou `performance.now` no render.
- Coerência artística acima de quantidade de geradores; manutenção acima de complexidade.
- Projetos antigos continuam abrindo: mudança de schema traz migração.
- Cada fase termina com `node scripts/check.mjs` verde e relatório final.
