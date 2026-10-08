# Relatório V7 — o que a pasta `githubs2` pode dar ao AI VJ Generator

Data: 07/10/2026 · Base: skill instalada (V6, motor 2.x) · Material: 141 repositórios únicos (150 zips; 9 duplicados) + 2 instaladores.
**Nada foi implementado.** Este documento é para aprovação.

Método: li o catálogo de todos os zips (README, licença, estrutura), extraí e li o código/docs dos ~75 que tocam o assunto (shaders, áudio, animação, mapeamento, VJ, skills de arte), e comparei com o que a skill e o motor já têm (`SKILL.md`, `project-schema.md`, `repo-analysis.md`, `app/index.html`). Os 33 repositórios já analisados na V5 não foram reabertos, só reavaliados quando a nova leitura mudou o veredito.

---

## 1. Diagnóstico: onde a skill é limitada hoje

| # | Limite atual | Efeito nas animações |
|---|---|---|
| L1 | **Shader de passe único, sem textura de entrada, sem feedback.** (WebGL1, `texture2D` proibido; eco `p.echo` é cópia de quadros anteriores.) | Sem fluido, reação-difusão, trilhas reais, deslocamento por imagem, mosh, slit-scan, distorção de uma camada por outra. É o teto de complexidade. |
| L2 | **Biblioteca GLSL pequena** (`hash/noise/fbm`, 8 helpers `vj*`, 8 presets, 9 receitas). | Todo shader novo reescreve ruído, SDF, domínio repetido. Falta simplex/curl/worley/voronoi, SDF 2D/3D, raymarch, cor perceptual, tonemap, dither. |
| L3 | **Áudio com 4 bandas + `uHit`.** | Movimento "pulsa" mas não "viaja com a música". Faltam tempo integrado por banda, presença, ondas de BPM, onset melhor, espectro como textura, região de espectro por parâmetro. |
| L4 | **Transições entre composições: cut/fade/wipe/glitch.** | Set sem gramática de passagem; cada troca é um corte. |
| L5 | **Camada de informação limitada** (`hud/data/measure`). | Falta vocabulário de instrumentos (radar, scope, grade de status, anel de progresso, heatmap, grafo). |
| L6 | **Saída: PNG/WebM/ZIP; Spout/NDI = "exige ponte".** | Falta a ponte pronta para o seu Resolume e exportação que o Resolume lê nativamente (ISF). |
| L7 | **Mapeamento: só `surface_calc` + dobras.** | Falta exportar o mapa de saída (slices) e conteúdo para formas irregulares/domo. |
| L8 | **Teoria artística forte em "o quê", fraca em "tensão"**: faltam regras de evento focal / zona de respiro, imperfeição controlada, lista de banidos por briefing, diversidade medida entre seeds. | Conjuntos tendem a ficar uniformemente "densos e bonitos", sem hierarquia dramática. |

---

## 2. Os achados de maior impacto (ordem de valor)

### 2.1 ISF: importar e exportar shaders que o Resolume lê  ★★★★★
`ISF-Files` (MIT, 366 arquivos, ~200 geradores e filtros) + `isf-touchdesigner`. ISF é um GLSL com cabeçalho JSON (`INPUTS` float/bool/color/point2D/image/audioFFT, `PASSES` com `PERSISTENT`/`FLOAT`/`TARGET`). Resolume e Wire rodam ISF. Dos 200 arquivos: 75 usam passes, 49 buffers persistentes, 4 FFT.
**Proposta:** (a) `scripts/export_isf.py`: o shader do projeto vira `.fs` ISF, com `p1..p4` e cores como `INPUTS` e `uPh` → entrada de fase (o loop sincroniza pelo BPM do Resolume); (b) **importar** `.fs` ISF como camada de shader (tradutor de uniforms), o que abre as 200 peças MIT como matéria-prima. Resolve L6 de forma concreta: o resultado do skill vira clipe vivo no Resolume, não só PNG.
Atenção: ISF não tem relógio de BPM padrão; a fase do loop precisa ser uma entrada automatizável (verificado na busca: ISF nasceu no VDMX, sem BPM nativo).

### 2.2 Vocabulário de áudio do Synesthesia  ★★★★★
`SynesthesiaScenes`, `synesthesiaShaders`, `synesthesia-uniforms-display`, `Space-Shift` (26 cenas + runner WebGL2 multipasso). Uniforms por banda (Bass, Mid, MidHigh, High, geral): **Level** (nível suavizado), **Hits** (transiente), **Presence** (presença relativa); **\*Time** = tempo **integrado** (`t += dt · rate · (level·2 + presence + hits·2)`), que faz o movimento acelerar com a música sem nunca dar solavanco; **OnBeat, ToggleOnBeat, RandomOnBeat, BPMSin/Tri/Sin2/Sin4, BPMTwitcher, BeatTime, BPM, BPMConfidence**. Controles do tipo `traveler` (parâmetro que acumula) e `smooth` (toggle animado).
**Proposta:** ampliar o barramento do motor de `uBass uMid uHigh uRms uHit` para o conjunto acima (compatível, nomes antigos mantidos). O "tempo integrado" é o ganho mais audível: cria a sensação de que a imagem *viaja* com a música. Em modo sem áudio, os valores continuam sintéticos e determinísticos (regra do projeto).

### 2.3 Reatores do Astrofox (áudio → qualquer parâmetro)  ★★★★
`astrofox` (MIT): um **reator** seleciona uma região do espectro (retângulo frequência × amplitude), tem suavização, sensibilidade, histórico de energia (43 quadros, limiar 1,3) e **modos de saída** (Add, Subtract, Forward, Reverse, Cycle, Beat Trigger, Beat Envelope, Static Forward/Reverse/Cycle) ligados a um intervalo [min,max] do parâmetro. Também: easing por keyframe, clips com fade.
**Proposta:** `layer.mod` genérico: qualquer parâmetro numérico recebe uma fonte (reator, LFO em ciclos inteiros, envelope de evento) e um intervalo. Fecha o item 5 do `RELATORIO-MELHORIAS.md` (modulação) com um modelo já provado. Mantém o limite de 1–3 camadas reativas por composição.

### 2.4 Pipeline multipasso com feedback (a decisão grande)  ★★★★★ / risco alto
`Space-Shift/passRunner`, `touchFluid` (MIT, fluido semi-Lagrangiano, vorticidade, temperatura), `webgl-wind` (ISC, 1 milhão de partículas com estado em textura), `ISF` (PERSISTENT), `Babylon` (partículas GPU, fluxo, atratores), LYGIA (grayscott, ripple, fluido).
Todos exigem **estado entre quadros**, o que briga com a regra "mesmo projeto + seed + quadro = mesmo quadro". Três caminhos (ver §5): A) **bake em loop** (simula N quadros, funde a emenda), B) **pré-aquecimento determinístico** (recalcula do quadro 0 ao quadro k), C) **continuar sem estado** (só fórmulas fechadas). Recomendo A+B, só para uma camada nova `sim`.

### 2.5 Biblioteca de funções GLSL estilo LYGIA, reescrita  ★★★★
`lygia` tem ~2.800 arquivos (generative 15, sdf 48, space 42, color 197, filter 31, distort 6, lighting 100, sample 31, morphological 10, simulate 4, animation/easing). **Licença Prosperity: só uso não comercial, 30 dias de teste comercial. Você vende o trabalho, então não entra no skill nem em cópia parcial.** `shader-arsenal` embute LYGIA (mesma restrição).
**Proposta:** reescrever do zero, só com matemática de domínio público/MIT (Gustavson simplex, IQ-style SDFs, Worley, curl por diferenças finitas, easings de Penner, Bayer/blue-noise, OKLab, ACES/Reinhard, polar/kaleido/hex-tile, rotação 2D/3D, smin, dobras e repetição de domínio). Organizada em **módulos incluíveis por nome** (`#include noise.simplex`), com o validador resolvendo. É o que dá "mais opções" de verdade.

### 2.6 Transições e gramática de movimento entre composições  ★★★★
`motion-video-kit` (28 filmes analisados, 81 mil quadros): seis regras (o primeiro plano vira transição; um ator persistente; densidade por hierarquia; mudar a velocidade, não derivar; corte duro quando escala, direção e material combinam; causa → efeito) e **catálogo de 16 mecanismos** (fly-through, logo-as-portal, tile wipe, perspective fold, exploded layers, carousel, color-field takeover…). `ISF-Files` traz ~40 transições prontas (CrossZoom, Doom, Ripple, Perlin, Kaleidoscope, Window Blinds…).
**Proposta:** `time.transition` ganha ~12 mecanismos em shader, escolhidos por argumento do conceito, não por sorteio; regra "um ator persistente" no contrato.

### 2.7 Tensão artística: evento focal, respiro, imperfeição, banidos  ★★★★
- `mono-color-skill`: manifesto de receita (`focal_event`, `release_zone`, `unresolved_edge`, `empty_paper %`, `visual_tension` relaxado/equilibrado/assertivo), **catálogos JSON legíveis por máquina**, imperfeições controladas (densidade de tinta irregular, quebra de borda, deriva de meio-tom, **deriva de registro**), `imperfection_seed` estável. Tradução para VJ: um único **evento focal** por composição, uma **zona de respiro**, deriva cromática/registro como textura, seeds estáveis em retentativas.
- `awesome-ai-motion` (prompts): "**Banned:** shockwave rings, particle bursts, RGB split, camera shake, lens flares, neon glows…" por briefing. → campo `meta.contract.banned` obrigatório (anti-clichê).
- `pixel2motion`: personalidade → parâmetros (eixos energia × tom; squash 0–10% vs 20–40%; antecipação 50–100 ms vs 150–300 ms; tabelas de aço/lúdico/elegante), 20:50:30 antecipação:ação:follow-through, revelações draw-on com matemática de dash.
- `animation-principles` (144 skills, 12 conjuntos): lentes úteis ao VJ: **ritmo/pacing como música** (síncope, polirritmo, respiração), emoção → movimento (tensão, calma, poder, urgência), escalas de tempo; resto é de UI.
- `3brown1blue` (17 princípios de design visual): camadas de opacidade 1,0/0,4/0,15, contexto persistente, **densidade progressiva**, **representações ligadas** (mostrar o sinal que comanda o visual), cor como dado, ancoragem emocional.
- `design-motion-principles`: auditoria `anti-checklist` e três lentes de crítica.
**Proposta:** novas referências `tension-and-release.md`, `emotion-to-motion.md`, `banned-and-cliches.md`; contrato ganha `focalEvent`, `releaseZone`, `banned`, `imperfection`; portão de qualidade novo ("tem hierarquia dramática?").

### 2.8 Verificação de diversidade e determinismo (`genart-skill`)  ★★★★
Streams nomeados do PRNG (adicionar um sorteio não desloca o resto), **teste de distinção** (seeds diferentes → imagens diferentes), **teste A-B-A** (estado global vazando), **censo de traços** em N seeds, ambiente fixo (sRGB, sem retina), "olhar o PNG antes de julgar". Complementa `loop_check` e `contact_sheet`.
**Proposta:** `seed_census.mjs` (grade de 24 seeds + distinção + A-B-A) e `meta.features` (traços nomeáveis da peça).

### 2.9 Ponte real para o Resolume: OBS + Spout2  ★★★★
`obs-spout2-plugin` (GPL; instalador 1.12.0 já está na pasta): importa/exporta textura Spout em alta resolução; saída Spout do canvas do OBS. Caminho: **motor (HTML, fundo transparente, tamanho fixo por URL) → Fonte de Navegador do OBS → Spout2 → fonte Spout do Resolume/Wire.** Muda L6 de "REQUIRES BRIDGE" para um procedimento testável.
**Proposta:** `references/bridge-obs-spout.md`, parâmetros de URL do motor (`?w&h&fps&alpha&autoplay&chrome=0`), lista de verificação (resolução 4500×800, alfa, taxa de quadros). Licença GPL do plugin só importa se redistribuirmos o binário; só documentamos.

### 2.10 Mapeamento e saída de LED  ★★★★
- `xtremeled-remap-export` (Resolume Advanced Output XML e Hippotizer CSV, fatias, máscaras, cortar uma faixa 10400×416 em linhas de 3840×2160, gerador de padrão de teste, codecs ProRes/HAP/DXV3). Vale o seu fluxo (HANDSHAKE 4500×800, HOI 3664×1320).
- `ProjectorVideoMappingWeb`, `maptasticjs` (4 cantos/homografia, CSS matrix3d), `mapmap`, `LPMT` (GPL), `uv-mapper` (BSD; mapa UV para geometria arbitrária e correção de lente), `extended_view_toolkit` (panorama, 360, equiretangular, blend de projetores), `pixel_mapper` (mapa 3D de pixels por visão computacional, saída xLights).
**Proposta:** `scripts/export_slices.py`: gera **XML de Advanced Output do Resolume** a partir de `canvas.folds/displays` e uma imagem de teste por fatia; `surface_calc` ganha "remap em linhas" (`strip→raster`) e homografia de 4 cantos; referência de UV/domo (fisheye, equiretangular). Registro dos formatos: validar o XML contra um arquivo real seu (peço um exemplo).

### 2.11 Vocabulário de "display" e acabamento (RetroArch, ISF)  ★★★
`slang-shaders`/`glsl-shaders`/`common-shaders` (milhares; licenças mistas, muitas GPL/domínio público por arquivo): CRT (máscara de abertura, slot, scanline, halation), VHS (24), film grain, anamórfico, dither (Bayer, blue-noise), **motion blur/mix_frames**, **BFI** (subquadro anti-borrão, relevante a LED), `hdr`, e ~66 ports "procedural" (IQ raymarching, Kali, Dave Hoskins…). Como são multipasso, mostram o formato de **cadeia de passes** (`.slangp`).
**Proposta:** só conceitos e uma ficha de "emulação de mídia" (LED P3.9/P4.8: grade de pixel, gama, bleed; CRT; VHS) como receitas de acabamento. Nenhum código copiado.

### 2.12 Instrumentos de informação (camada "informação")  ★★★
`scificn-ui` (radar-chart, heatmap, node-graph, status-grid, progress-ring, line/bar chart, terminal; três temas), `astrofox` displays (bar spectrum, radial spectrum, soundwave, waveform ring, mesh grid, tunnel), `HUD_Sci-Fi` (Unity shadergraph), `audioMotion`/`cava` (escalas Bark/Mel/log, bandas de oitava, ponderação A/B/C/D/ITU-468, picos que caem com gravidade, "monstercat" smoothing), `awesome-audio-visualization`.
**Proposta:** gerador `instrument` com ~10 tipos, sempre ligado a um sinal real (princípio "representações ligadas"), e **análise de áudio por oitava com ponderação** no barramento.

---

## 3. Segundo escalão (valor real, esforço ou risco maior)

| Tema | Fonte | Ideia | Veredito |
|---|---|---|---|
| Padrões e algoritmos de imagem | `processing-imageprocessing` (MIT: Halftone, Dithering, Sobel, Kuwahara, Quantization, Strokes, Knitting, Sabattier, RetroConsole), `TouchDesigner_Shared` (GPL, só nomes: jump-flood, Turing pattern, pixel-sorting, Hilbert, slit-scan, curl 4D, optical flow, equirect "little planet", beesandbombs loops, noise_looper) | receitas de shader/código novas | ADOTAR como receitas próprias |
| Geometria vetorial | `maker.js`, `Graphite` (Apache, nós `repeat`, voronoi, offset de caminho, instanciamento com transformação), `Canvalry-scripts` | operações booleanas, offset, instanciar com variação | receitas de código (`K.path`) |
| Física | `Oimo.js` (MIT, 3D), `particles.js`, `Babylon` (emissores, atratores, gradientes por idade) | "física assada" em loop | só via bake A (§5) |
| Texto | `bitfolly` (bit a bit: `(x&y^t/20)%100`), `GLITCHGIFVJ` (cadeia de FX reordenável, GIF), `displacementx` (mapas de greeble sci-fi, modos de composição) | gerador `bitfield`, camada de GIF, "greeble" como textura | receitas |
| Vidro | `liquid-glass-react` (refração por mapa de deslocamento, aberração cromática) | shader "vidro" de refração | receita |
| 2.5D | `VisionDepth3D` (proprietário, não usar), `Depth-*`, `3D-Machine-Learning` | estimativa de profundidade por modelo → paralaxe de imagens fixas | opcional: script com modelo aberto, **peso do modelo não vai no repositório** |
| Nuvem de pontos/splats | `potree`, `pcl`, `spark` (MIT, splats em three), `gaussian-splatting` (não comercial) | importar `.ply/.xyz` como camada de pontos (como o `.obj` que já existe); splats só pré-renderizados | `.ply/.xyz` sim; splats não |
| Reenquadrar | `caire` (seam carving) | adaptar imagem de referência a 4500×800 sem esticar | ferramenta opcional |
| Texto em imagem | `tesseract.js` | ler texto de riders/plantas anexadas | opcional |
| Ritmo algorítmico | `sonic-pi` (anéis, `spread` euclidiano, escalas, acordes, `live_loop`, sincronia), `sfxr` | base para padrões rítmicos determinísticos e fonte de teste de áudio melhor | adaptar conceitos (já há euclidiano) |
| Filtros de estado | `LowLevelParticleFilters.jl`, `BlobTracking.jl` | Kalman para rastrear BPM; rastrear blobs | só pesquisa (sem câmera) |
| Animação-biblioteca | `anime`, `GSAP`, `motion`, `theatre`, `react-motion`, `motion-canvas`, `animate.css`, `mathematics-of-animation`, `manim` | já cobertos (V5); `animate.css` = vocabulário de atenção (bounce, jello, tada, headShake) e springs por massa/rigidez | pouco novo; adicionar mola física e vocabulário |

---

## 4. Licenças (regra de ouro mantida)

| Situação | Repositórios | Regra |
|---|---|---|
| Não comercial / proprietário | LYGIA (Prosperity), shader-arsenal (embute LYGIA), VisionDepth3D, Gaussian-Splatting, Displacement-MicroMap (NVIDIA), GLITCHGIFVJ (CC BY-NC-SA) | só conceito; **proibido copiar** |
| AGPL/GPL | audioMotion (AGPL), Hydra, P5LIVE, PixelController, mapmap, LPMT, TouchDesigner_Shared, obs-spout2, displacementx (GPL), PlumberManager | só conceito; sem colar código |
| MIT/BSD/ISC/Apache | ISF-Files, touchFluid, webgl-wind, astrofox, genart-skill, processing-imageprocessing, anime, spark, Graphite, Oimo, xtremeled-remap-export, uv-mapper (BSD) … | pode adaptar com aviso; ainda assim registrar proveniência |
| Sem licença no zip | Space-Shift, Alfrid (MIT ok), PlumberManager (GPL), vários | conceito apenas |
Os arquivos ISF individuais podem ter autor/licença no cabeçalho (`CREDIT`): o importador deve preservá-lo.

---

## 5. Decisão arquitetural que preciso de você: estado entre quadros

O motor garante *quadro = função(projeto, seed, n)*. Fluido, reação-difusão e partículas com estado quebram isso. Opções:

| Opção | Como | Custo | Efeito |
|---|---|---|---|
| **A. Bake em loop** | simula 2× o loop, funde o fim com o começo (cross-fade), guarda os quadros em atlas de textura | memória (N quadros), 1 pré-processamento | loop sem emenda, scrub instantâneo; a ideia padrão de VJ |
| **B. Pré-aquecimento** | para o quadro k, simula de 0 a k | CPU/GPU cresce com k | exato, mas lento em scrub e export longo |
| **C. Sem estado** | só fórmulas fechadas | zero | o que fazemos hoje (teto atual) |
**Recomendação:** A para fluido/reação-difusão/partículas; B só para pré-visualização curta; C continua o padrão. A camada nova se chama `sim`, WebGL2 com ping-pong, e o `loop_check` ganha teste específico.
Junto: **textura de entrada** em shader (imagem, vídeo, espectro) e passes nomeados, no formato do `PASSES` do ISF. Isso exige WebGL2 e um compositor WebGL; o relatório de melhorias já sugeria o compositor único.

---

## 6. Plano proposto (fases, cada uma testável e reversível)

| Fase | Entrega | Tipo | Esforço |
|---|---|---|---|
| **7.1 Conhecimento** | `tension-and-release`, `emotion-to-motion`, `banned-and-cliches`, `motion-grammar-transitions` (16 mecanismos), `audio-vocabulary` (Synesthesia/Astrofox), `licensing-v7`, atualização de `repo-analysis`; contrato com `focalEvent/releaseZone/banned/imperfection`; portão de qualidade de hierarquia dramática | só skill (texto + validador) | P |
| **7.2 Biblioteca GLSL** | módulos reescritos (`noise`, `sdf2d`, `sdf3d`, `raymarch`, `color`, `dither`, `space`, `easing`, `post`), `#include`, +20 receitas testadas, +10 presets | skill + motor | M |
| **7.3 Áudio** | tempo integrado, presença, ondas de BPM, bandas por oitava com ponderação, reatores e `layer.mod` | motor | M |
| **7.4 Saída** | exportar ISF, importar ISF, ponte OBS+Spout (URL params), export de slices Resolume XML + padrão de teste | scripts + motor | M |
| **7.5 Novas camadas** | `instrument`, `bitfield`, `pointcloud` (.ply/.xyz), `glass`, 12 transições | motor | M |
| **7.6 Estado** | camada `sim` (bake A), textura de entrada e multipasso (WebGL2) | motor, risco | G |
| **7.7 Verificação** | `seed_census`, distinção, A-B-A, `meta.features` | scripts | P |
| **7.8 UI** | painel de reatores/mod, biblioteca de módulos, importador ISF, transições | interface | M |

Ordem sugerida: 7.1 → 7.3 → 7.2 → 7.4 → 7.7 → 7.5 → 7.8 → 7.6 (a mais arriscada, por último, com decisão sua).

---

## 7. Perguntas para aprovação

1. **Estado entre quadros (§5):** aprova A (bake em loop) para uma camada `sim`, ou prefere ficar sem estado?
2. **ISF:** aprova importar/exportar? Você usa Resolume 7 com ISF ou só clipes renderizados (HAP/DXV)? Isso decide se o foco é ISF vivo ou export de vídeo.
3. **Ponte:** vai usar OBS+Spout2 (o instalador está na pasta)? Se sim, documento e testo o caminho com você.
4. **Mapeamento:** pode me enviar um **XML de Advanced Output** real do Resolume (e, se existir, o CSV do Hippotizer) para eu validar o exportador de slices?
5. **LYGIA:** confirma que é para **reescrever** a biblioteca e não usar nada dela (licença não comercial)?
6. **Escopo artístico:** os `banned` e o "evento focal" viram **obrigatórios** no contrato (mais rígido) ou só recomendados?
7. **Fora do escopo:** confirma que não vamos tratar splats 3D, estimativa de profundidade com modelo, nem o Some-Many-Books (livros de programação em chinês, fora do tema)?

---

## Apêndice A — Ledger dos 141 repositórios

Legenda: **A** adotar (conceito ou reescrita), **R** referência (citar, não implementar), **P** possível/opcional, **S** pular. "Novo" = não estava na V5.

### Shaders, bibliotecas e formatos
| Repo | Licença | Veredito | Nota |
|---|---|---|---|
| ISF-Files | MIT | **A** | importar/exportar ISF; 40 transições; categorias |
| isf-touchdesigner | MIT | A | mapeamento de variáveis ISF (`TIME`, `RENDERSIZE`, `IMG_*`) |
| SynesthesiaScenes / synesthesiaShaders / synesthesia-uniforms-display | sem licença | **A** (conceito) | vocabulário de áudio, controles `traveler/smooth`, raymarch com áudio |
| Space-Shift | sem licença | A (conceito) | runner SSF em WebGL2, multipasso, `syn_FinalPass`; 26 cenas espaciais |
| lygia | Prosperity (não comercial) | **A só como mapa de módulos** | reescrever; nunca copiar |
| shader-arsenal | embute LYGIA | R | 20 presets audioreativos: ideias de composição |
| thebookofshaders | CC BY-NC-SA | A (conceito) | progressão: formas, padrões, ruído, FBM, ruído celular; já refletido em receitas |
| learningGLSL, advanced-compute-shader | MIT/Apache | R | TD |
| touchFluid | MIT | A | fluido (via bake) |
| webgl-wind | ISC | A | partículas com estado em textura |
| common-shaders, glsl-shaders, slang-shaders, RetroArch | mistas/GPL | R/A (conceito) | emulação de mídia, cadeia de passes, BFI, procedurais |
| slang | Apache | S | linguagem de shader, fora do escopo |
| regl, lightgl.js, Alfrid, luma.gl, webgl-fundamentals, awesome-webgl, awesome-opengl, awesome-graphics, graphics-resources | MIT | R | base técnica do futuro compositor WebGL2 (regl = comandos/recursos; luma.gl = WebGPU) |
| gpu.js | MIT | R | JS→GPU, usado por bitfolly |
| bitfolly | anticapitalist | A | gerador `bitfield` |
| creativecoding-sketches | MIT | R | KodeLife/TD/Vuo: poucos shaders |
| shader-park-touchdesigner | MIT | R | escultura SDF em DSL |
| pixijs, three.js, Babylon.js | MIT/Apache | R | catálogo de filtros/pós, partículas GPU, procedurais (já em V5 para three) |
| Better-Art-Direction | GPL | S | plugin de WordPress |

### Áudio
| Repo | Licença | Veredito | Nota |
|---|---|---|---|
| astrofox | MIT | **A** | reatores, displays, efeitos (LED, feedback, VHS, kaleido) |
| audioMotion.js | AGPL | A (conceito) | bandas de oitava, ponderação, escalas perceptuais |
| cava | MIT | A (conceito) | suavização, gravidade, sensibilidade automática |
| awesome-audio-visualization | — | R | links |
| fftw3 | GPL | S | FFT em C; o navegador já faz |
| sfxr, sonic-pi | MIT | P | síntese de teste, padrões rítmicos |
| waveform-playlist, audora | MIT/proprietário | S | editores de áudio |
| soundeffects-claude-code | MIT | S | efeitos sonoros do terminal |

### Animação e arte (skills e teoria)
| Repo | Licença | Veredito | Nota |
|---|---|---|---|
| animation-principles | MIT | **A** | ritmo, emoção, escalas de tempo |
| design-motion-principles | MIT | A | auditoria, anti-checklist |
| motion-video-kit | MIT | **A** | gramática de movimento, 16 mecanismos, crítico independente |
| mono-color-skill | MIT (assets à parte) | **A** | manifesto de receita, tensão, imperfeição |
| pixel2motion | MIT | A | personalidade → parâmetros, draw-on, 12 princípios para logo |
| genart-skill | MIT | **A** | determinismo, censo, streams nomeados |
| 3brown1blue / manim | MIT | A | 17 princípios, trackers/updaters |
| victor-design | MIT | R | fluxo de design; pouco ligado a movimento |
| awesome-ai-motion | MIT | A (prompts) | lista de banidos; estrutura por compasso |
| awesome-claude-design | MIT | S | DESIGN.md de UI |
| anime, GSAP, motion, theatre, react-motion, motion-canvas, animate.css, mathematics-of-animation | vários | R | já na V5; animate.css e molas físicas dão vocabulário |
| generative-artistry, awesome-generative-art, awesome-creative-coding, awesome-creative-technology, awesome-canvas, awesome-livecoding, awesome-visualization-research, d3, samila, hashlips, generative-art-node, p5.js, P5LIVE, hydra | vários | R | referência/estudo (parte na V5); HashLips é raridade, oposto do autoral |
| particles.js | MIT | S | fundo de partículas simples |

### VJ, mapeamento e saída
| Repo | Licença | Veredito | Nota |
|---|---|---|---|
| xtremeled-remap-export | sem licença no zip (MIT no site, confirmar) | **A** | XML do Resolume, linhas para raster, teste |
| ProjectorVideoMappingWeb, maptasticjs | MIT | A | homografia de 4 cantos |
| mapmap, ProjectionMapping (LPMT) | GPL | R | formas irregulares, quad warp |
| uv-mapper | BSD | A | mapa UV, lente |
| extended_view_toolkit | GPL | R | panorama/360/blend |
| pixel_mapper | MIT | R | mapa 3D por visão, xLights |
| PixelController, awesome-vjing, vjdesign, vjtools | V5 | — | já avaliados |
| obs-spout2-plugin (+ .exe ×2) | GPL | **A** | ponte para o Resolume |
| GLITCHGIFVJ | CC BY-NC-SA | R | FX encadeados e GIF; não copiar |
| awesome-touchdesigner, TouchDesigner_Shared | GPL | R | receitas por nome |
| Canvalry-scripts | MIT | A (V5) | distribuições paramétricas |
| vj-achievement-universe | — | **S** | "VJ" aqui é portfólio de certificados |
| HUD_Sci-Fi, scificn-ui, ratty | MIT | A/R | instrumentos de informação |
| liquid-glass-react | MIT | A | receita de vidro |

### Visão, 3D, dados (quase todos fora do escopo)
3D-Machine-Learning, Depth, Depth-Map-Prediction, Estimating-Depth…, VisionDepth3D, face3d, PointCloudSegmentation, pcl, potree, SplatSLAM, spark, gaussian-splatting, Displacement-MicroMap-Toolkit, BlobTracking.jl, LowLevelParticleFilters.jl, pyidi, tesseract.js, caire, awesome-computer-vision, Oimo.js, maker.js, Graphite, displacementx, processing-imageprocessing, 3d-resources, webglstudio.js, taichi, plotly.py → **R/P** conforme §3; nenhum entra sem aprovação.

### Fora do assunto (S)
algorithm-visualizer, LeetCodeAnimation, Some-Many-Books (109 PDFs de programação em chinês; não abri nem extraí), java-design-patterns, design-patterns-for-humans, rails, parallel, claude-mem, pippit-bridge, pixel-mcp, PlumberManager (já aproveitado na UI), nike-air-zoom-alphafly (asset do seu projeto HOI), VJ-ChatGPT-Bot (bot de Telegram).

---

Fontes consultadas na web: [Resolume forum: ISF e Wire](https://www.resolume.com/forum/viewtopic.php?p=91468), [ISF — áudio](https://docs.isf.video/primer_chapter_8), [ISF JSON reference](https://docs.isf.video/ref_json), [VIDVOX: BPM no ISF](https://discourse.vidvox.net/t/replace-time-by-bpm-clock/455).
