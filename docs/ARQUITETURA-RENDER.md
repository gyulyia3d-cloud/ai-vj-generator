# Arquitetura de render (motor 3.4.0)

## Caminho de um quadro
```
projeto (JSON) + número do quadro
  → frameAt(n)            quadro determinístico: fase do loop, batida, bandas de áudio
  → renderLayer(L)        uma camada por vez, em ordem
       camadas 2D       Canvas 2D direto
       camadas de GPU   shader, isf, synth, fx:  frameContext → glFrameUniforms → WebGLRenderer (1 desenho de tela cheia) → drawImage no canvas da camada
  → compositor Canvas 2D  blend, opacidade, fx/blobs leem a pilha de baixo
  → saída                  viewport, PNG (toBlob) ou MP4 (WebCodecs)
```
Todo o render é função do projeto e do número do quadro. Relógio, `Date.now` e `Math.random` só aparecem no preview ao vivo (`ST.t0`) e na medição de custo, nunca no desenho.

## Decisões (ADR)
1. **Contexto `webgl2` obrigatório.** Sem ele: mensagem técnica (`#glFail`) e as camadas de GPU não desenham. Não existe volta ao WebGL1. A decisão anterior de não migrar (relatório V9, medida) foi revogada pelo roadmap v11, porque 3D, partículas em GPU e render graph dependem de WebGL2.
2. **Dialeto de autoria continua GLSL ES 1.00.** Projetos, receitas, a biblioteca ISF e o que as IAs escrevem usam `gl_FragColor`, `texture2D` e `void main(){}`. O renderizador compila como `#version 300 es` com um cabeçalho de `#define` (a mesma técnica do three.js), sem reescrever o código do usuário. Assim o esquema não muda e os 123 quadros de referência saem idênticos. O validador (`validate_project.py`) continua recusando `#version`, `in` e `out` no código do usuário.
3. **Um módulo, só GPU.** `app/webgl.js` não conhece projeto, interface nem IR. O motor fala com ele por `glInit`, `glProg` e `glFrameUniforms`.
4. **FrameContext** reúne o que um quadro pode ler: `frameIndex fps frameTime normalizedTime loopPhase seed bpm beatPhase audio surface resolution`. Os uniforms `u*` mantêm os nomes de sempre, agora enviados por grupo.

## O que existe e o que não existe ainda
| Item | Estado |
|---|---|
| WebGL2, GLSL ES 3.00, VAO fixo, cache de programas com último uso e despejo do menos usado | feito |
| localização de uniforms em cache, sem troca redundante de programa e viewport | feito |
| interfaces de textura, framebuffer, formatos float, capacidades | feitas; sem uso real além da textura do fx |
| pools de textura e framebuffer, métricas de VRAM | fase 3 |
| render graph, histórico, feedback | fase 4 |
| instancing, transform feedback, MRT | detectados; usados nas fases 12 e 13 |

## Testes
`scripts/gl_parity.mjs --save|--compare` (paridade de pixels entre motores, tolerância: média ≤ 1,5 de 255 e ≤ 2% dos pixels com diferença > 24) e `webgl2_check.mjs` (contexto, cache, linha do erro, sem WebGL1).
