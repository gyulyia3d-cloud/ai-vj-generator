# Arquitetura de render (motor 3.6.0)

## Caminho de um quadro
```
projeto (JSON) + número do quadro
  → frameAt(n)            quadro determinístico: fase do loop, batida, bandas de áudio
  → RenderGraph do quadro  Source → [Generator | Shader | Effect | History | Feedback] → Composite → … → Output   (composeFrame)
       camadas 2D       Canvas 2D direto
       camadas de GPU   shader, isf, synth, fx, temporal:  frameContext → glFrameUniforms → WebGLRenderer (1 desenho de tela cheia) → drawImage no canvas da camada
       compositor       blend e opacidade no acumulado; fx, manchas e temporal leem a pilha de baixo
  → saída                  viewport (camadas em canvas próprios), PNG (toBlob) ou MP4 (WebCodecs)
```
Todo o render é função do projeto e do número do quadro. Relógio, `Date.now` e `Math.random` só aparecem no preview ao vivo (`ST.t0`) e na medição de custo, nunca no desenho.

## Decisões (ADR)
1. **Contexto `webgl2` obrigatório.** Sem ele: mensagem técnica (`#glFail`) e as camadas de GPU não desenham. Não existe volta ao WebGL1. A decisão anterior de não migrar (relatório V9, medida) foi revogada pelo roadmap v11, porque 3D, partículas em GPU e render graph dependem de WebGL2.
2. **Dialeto de autoria continua GLSL ES 1.00.** Projetos, receitas, a biblioteca ISF e o que as IAs escrevem usam `gl_FragColor`, `texture2D` e `void main(){}`. O renderizador compila como `#version 300 es` com um cabeçalho de `#define` (a mesma técnica do three.js), sem reescrever o código do usuário. Assim o esquema não muda e os 123 quadros de referência saem idênticos. O validador (`validate_project.py`) continua recusando `#version`, `in` e `out` no código do usuário.
3. **Um módulo, só GPU.** `app/webgl.js` não conhece projeto, interface nem IR. O motor fala com ele por `glInit`, `glProg` e `glFrameUniforms`.
4. **FrameContext** reúne o que um quadro pode ler: `frameIndex fps frameTime normalizedTime loopPhase seed bpm beatPhase audio surface resolution`. Os uniforms `u*` mantêm os nomes de sempre, agora enviados por grupo.

## Recursos de GPU (fase 3)
- **Pools** (`r.textures`, `r.framebuffers`): `acquire(descritor)` e `release(item)`. Descritor: largura, altura, formato (`rgba8`, `rgba16f`, `rgba32f`), filtro, wrap, profundidade e uso; a chave é a combinação deles. Item devolvido é reaproveitado; o que fica parado mais de 120 quadros é destruído (`trim`), e nada em uso é destruído.
- **Estado** (`setBlend`, `setDepth`, `setScissor`, `bindFramebuffer`, `bindTexture`, programa, viewport, VAO): só chama o GL quando o valor muda.
- **Métricas de desenvolvimento** (`AIVJ.glMetrics()`): tempo de quadro, passes, desenhos, trocas de shader, alocações de textura e framebuffer, texturas ativas e no pool, partículas ativas (0 até a fase 13) e VRAM estimada (largura x altura x bytes do formato; o navegador não expõe o número real). Não existe modo ao vivo: é diagnóstico.
- **Primeiro uso real:** a textura de entrada do `fx` vem do pool; depois do primeiro quadro, vários filtros não alocam nada.
- **Decidido não fazer agora:** desenhar as camadas de GPU em framebuffer em vez do canvas WebGL compartilhado. Hoje cada camada custa uma cópia para o canvas 2D; o ganho só aparece com o render graph (fase 4), onde as camadas de GPU encadeiam sem voltar ao canvas 2D.

## Render graph (fase 4)
- **`app/rendergraph.js`** (`RG`): `RG.create()`, `add({ id, type, deps, run, inplace })`, `compile()` (valida dependências, ordena de forma estável, exige um Output, recusa ciclos), `execute(ctx, pool)` (devolve cada recurso ao pool quando o último consumidor termina). Tipos de nó: Source, Generator, Shader, Effect, Mask, Composite, History, Feedback, Output. `CanvasPool` reaproveita canvas 2D por tamanho: depois do primeiro quadro, zero canvas novos.
- **Quem usa o grafo:** `composeFrame` é o único caminho de render fora da viewport ao vivo: `renderFrame`, exportação PNG (inclusive por camada e por região), MP4 e o replay dos efeitos temporais. A viewport ao vivo continua com um canvas por camada empilhados (só a composição de fx, manchas e temporal usa o mesmo compositor).
- **Efeitos temporais** (`app/temporal.js`, ver `skill/ai-vj-generator/references/temporal-layer.md`): trilha e feedback guardam a saída do quadro anterior em dois buffers A/B (a saída vira histórico com `copyTexSubImage2D`, sem passe extra); slit scan e deslocar guardam os últimos N quadros da entrada num `TEXTURE_2D_ARRAY`.
- **Determinismo:** a saída de um quadro depende só dos quadros anteriores. Em ordem, o histórico continua; num salto ele é zerado e reconstruído por replay (janela em que a persistência cai abaixo de 1/255, no máximo 40 quadros). A exportação e `renderFrame` zeram antes de começar; duas exportações dão a mesma imagem e o loop fecha na emenda. Seguir em ordem e saltar divergem no máximo 3/255.
- **Não existe ainda:** nós Scene3D, ParticleSystem e Camera (fases 12 e 13); o nó Mask está definido e sem uso; a viewport ao vivo ainda não roda pelo grafo.

## O que existe e o que não existe ainda
| Item | Estado |
|---|---|
| WebGL2, GLSL ES 3.00, VAO fixo, cache de programas | feito (fase 2) |
| pools de textura e framebuffer, estado sem troca redundante, métricas, VRAM estimada | feito (fase 3) |
| render graph, histórico A/B e em arranjo, trilha, feedback, slit scan, deslocar | feito (fase 4) |
| camadas de GPU encadeadas em framebuffer sem voltar ao canvas 2D | não feito: o ganho medido não justificou ainda; fica para a fase 17 |
| instancing, transform feedback, MRT | detectados; usados nas fases 12 e 13 |

## Testes
`scripts/gl_parity.mjs --save|--compare` (paridade de pixels, tolerância: média <= 1,5 de 255 e <= 2% dos pixels com diferença > 24), `webgl2_check.mjs`, `gpu_resources_check.mjs` e `rendergraph_check.mjs` (grafo, composição, determinismo, replay, emenda do loop, slit scan por pixel).
