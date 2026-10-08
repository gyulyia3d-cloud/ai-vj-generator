# Relatório V9: lacunas L1 a L8, partes 2 e 3 do relatório V7, e as novas pastas de repositórios

Data: 08/10/2026 · Motor 2.7.0 · Fontes lidas: `docs/RELATORIO-V7-githubs2.md`, `C:\Users\gyuly\Desktop\githubs2\` (162 itens) e `C:\Users\gyuly\Downloads\GITHUBS\` (33 itens, 6 novos).
Regra de licença mantida: **nada de LYGIA, Hydra, TouchDesigner_Shared, displacementx, shader-arsenal foi copiado**. Foram lidos como mapa de módulos e de fluxos de trabalho; todo código novo foi escrito para o projeto e tem teste.

## 1. Estado das lacunas do diagnóstico (L1 a L8)

| # | Lacuna | Estado | O que foi feito | Prova |
|---|---|---|---|---|
| L1 | passe único, sem textura de entrada, sem feedback | **resolvida em parte** | camada `fx`: lê tudo que está abaixo na pilha e devolve a imagem processada (22 efeitos). Textura de entrada: sim. Passes encadeados: dá para empilhar vários `fx`. **Falta** estado entre quadros (trilhas, slit-scan, fluxo óptico, jump-flood): veja §5 | `fx_check.mjs` (compila, muda a imagem, fecha o loop, mistura 0 = entrada, textura não vira de cabeça para baixo, ordem importa) |
| L2 | biblioteca GLSL pequena | **resolvida** | 20 módulos (eram 12): ruído de gradiente, tileável, voronoise, domain warp, 8 SDFs 2D novos e operações, espaço, cor (HSL, Oklch, temperatura, 9 blends), 20 easings Penner e mola, 7 filtros de amostrador, matemática | `lib_check.mjs` (todos compilam juntos) e `lib2_check.mjs` (24 afirmações numéricas) |
| L3 | áudio com 4 bandas | **resolvida antes** (2.3 e 2.5) e **reforçada**: Kalman do andamento (`kickBpmK`, `kickConf`) | `audio_check.mjs`: com jitter e kicks perdidos o erro é 1,6 BPM contra 3,0 da mediana |
| L4 | transições só cut/fade/wipe/glitch | **resolvida** | 16 transições (8 novas: `crosszoom spin radial diagonal slices flip blur drop`), no esquema, no validador e na interface | `schema_check`, `ui_check` |
| L5 | informação limitada | **resolvida antes** | camada `instrument` (bars, radial, scope, radar, rings, heat) + `data`, `measure`, `hud` | testes de camada |
| L6 | saída | **resolvida no que foi pedido** | **MP4 H.264 quadro a quadro** (WebCodecs + muxer próprio) na aba Exportar e por linha de comando; PNG sequence por CLI. Sem gravação de tela, sem WebM. Spout e NDI ficam para depois | `mp4_check.mjs` (ffprobe: h264, tamanho, 12 quadros, 30 fps; quadro 0 ≈ PNG; anima) |
| L7 | mapeamento | **resolvida antes** (fatias XML + padrão de teste) e **conferida contra um arquivo do Arena**: os 34 elementos e 38 parâmetros do XML são idênticos aos do exemplo real do `xtremeled-remap-export` | `test_export_slices.py` + `references/arena-advanced-output-structure.json` |
| L8 | tensão artística | **resolvida antes** (`focalEvent`, `releaseZone`, `banned`, `imperfection`, bíblia de arte, avaliador) | `evaluate_check.mjs`, galeria |

## 2. Parte 2 do V7, item a item

| Item | Estado |
|---|---|
| 2.1 ISF | **feito e ampliado**: aba ISF no motor (biblioteca de 84 geradores com miniatura, importar `.fs`, exportar), importador com renomeação de colisões e entradas com nome do motor, 11 originais. Proveniência em `isf-library/README.md` |
| 2.2 áudio estilo Synesthesia | feito antes (tempo integrado, presença, ondas do BPM, onset) |
| 2.3 reatores Astrofox | feito antes (`layer.mod` com editor); agora 13 formas de LFO |
| 2.4 pipeline multipasso com feedback | **parcial, por decisão sua (Q1: sem bake em loop)**: `fx` cobre filtros de uma passada sobre a pilha; estado entre quadros fica como próximo passo com *pré-aquecimento determinístico* (opção B do V7), sem assar o loop |
| 2.5 biblioteca estilo LYGIA | **feito só o que faltava (Q5)**: ver §1 L2; nada copiado |
| 2.6 transições | **feito**: 16, com regra "pelo argumento do conceito" em `vocabulary.md` |
| 2.7 tensão artística | feito antes |
| 2.8 diversidade e determinismo | feito antes (`seed_census.mjs`) |
| 2.11 acabamento e emulação de mídia | **feito** como camada `fx`: `PAINEL DE LED`, `CRT`, `VHS`, `DITHER`, `HALFTONE`, `PIXELATE`, `GRADE E VINHETA` (vinheta, grão, contraste) etc. BFI e motion blur de subquadro não, porque exigem histórico |
| 2.12 instrumentos de informação | feito antes (`instrument`); análise por oitava no barramento de áudio já existe |

## 3. Parte 3 do V7: o que virou código

| Fonte (conceito, nunca o código) | Entrou como |
|---|---|
| `processing-imageprocessing`: Halftone, Dithering, Sobel, Kuwahara, Quantization, Strokes, Sabattier | `fx` `HALFTONE`, `DITHER`, `BORDAS NEON`, `KUWAHARA`, `MAPA DE GRADIENTE` (quantização), `HACHURA` (traços), `SABATTIER` (solarização) |
| `TouchDesigner_Shared`: pixel sorting, little planet, noise looper, Hilbert | `fx` `ARRASTO DE PIXEL`, `POLAR (PLANETINHA)`, `vjFlowWarp` (ruído em círculo, fecha o loop), receita `hilbert-curve`. **Não entram**: jump-flood, Turing, slit-scan, fluxo óptico (precisam de estado) |
| `displacementx`: greeble | receita `greeble-plate` (subdivisão recursiva por semente); `DESLOCAR` |
| `liquid-glass-react` | `fx` `VIDRO LÍQUIDO` (refração pelo gradiente de luminância, aberração, brilho de borda) |
| `Depth-*`, `3D-Machine-Learning` | já existem `parallax` e `scripts/depth_estimate.py`; **Q7 manteve fora do escopo** estimativa por modelo e splats novos |
| `LowLevelParticleFilters.jl` | **filtro de Kalman do andamento** (`TempoKalman`, no domínio do intervalo, com escolha de oitava e rejeição de outliers) |
| `BlobTracking.jl` | só pesquisa: exige câmera |
| `anime`, `GSAP`, `motion`, `theatre`, `react-motion`, `motion-canvas`, `animate.css`, `mathematics-of-animation`, `manim` | molas e vocabulário de atenção: LFO `bounce rubber shake jello tada heartbeat swing wobble pulse` (todas fecham o loop), `vjSpring(t, zeta, wn)`, easings Penner |
| **Hydra** (só a ideia de encadear, AGPL) | camada `synth`: gramática própria, 9 fontes, 13 operadores de coordenada, 11 de cor, 7 de mistura, 5 de modulação, expressões com áudio, ciclos inteiros |

## 4. Respostas do item 7 aplicadas
1. **Sem bake em loop**: não há mais trabalho de bake; a camada `sim` antiga continua como estava e fica marcada na documentação como CPU e assada.
2. **ISF com biblioteca própria na documentação, usada no briefing**: `references/vocabulary.md` (cardápio por necessidade), `isf-bridge.md` (biblioteca e regras de importação) e o `PROMPT.md` portátil apontam para eles.
3. **Sem ponte agora**: Spout/NDI continuam `REQUIRES BRIDGE`, documentados.
4. **XML**: exemplo real encontrado (`xtremeled-remap-export`), vocabulário conferido por teste; as `.avc` de `Documents/Resolume Arena/Compositions` não guardam o `ScreenSetup`, então não servem para essa conferência.
5. **LYGIA só o que não temos**: feito (§1 L2).
6. **Incluir se ainda não foi feito**: `focalEvent`, `releaseZone`, `banned` e `imperfection` já estavam no contrato.
7. **Fora do escopo**: splats novos, profundidade por modelo, Some-Many-Books.

## 5. Motor GPU / WebGL2: medido, e a decisão

**Pergunta:** trocar o motor para GPU com WebGL2 otimiza o render e o processamento das composições?
**Método:** `node scripts/bench.mjs <projeto>` renderiza no caminho de exportação (canvases na GPU, sem `getImageData`) com a GPU ligada (Intel UHD, Chrome/ANGLE D3D11) e desconta o custo do codificador.

| Projeto (galeria) | Canvas | ms por quadro (render + MP4) | só codificar | camadas somadas |
|---|---|---|---|---|
| 01 pressão LED | 4500×800 | 35, 39, 66 | 31, 33, 34 | 4 a 32 ms |
| 02 jardim | 1920×1080 | 47 a 62 | 32 a 48 | 3 a 30 ms |
| 03 vertical | 1080×1920 | 50 a 66 | 45 a 51 | 3 a 16 ms |

(Medições de uma máquina só, variam ±30%; servem de ordem de grandeza.) Em 4500×800 o render completo com codificação H.264 roda a **15 a 28 quadros por segundo**; o quadro de preview ao vivo gasta 2 a 4 ms.
**Leitura:** o que domina é o **codificador** (30 a 50 ms por quadro numa GPU integrada), não o desenho das camadas. As camadas 2D já rodam em canvases acelerados e os shaders já são WebGL. Portar as ~28 camadas para um compositor WebGL2 reduziria no máximo a parcela das camadas (poucos ms a ~30 ms), custaria cerca de 24 dias e reabriria todos os testes de paridade de pixel.
**Decisão:** **não** trocar o motor agora. Passar o contexto para WebGL2 sem uma funcionalidade que o exija não acelera nada (os shaders GLSL ES 1.00 funcionam igual). Adotar WebGL2 **quando** entrar o estado entre quadros (texturas float, ping-pong, MRT), e só nas camadas que precisam. O que realmente acelera a entrega, em ordem de ganho por esforço:
1. render **paralelo por fatias de quadros** (`render.mjs --jobs N`, várias páginas headless): 2 a 4× em CPU com vários núcleos; PNG é trivial, MP4 exige concatenar GOPs fechados (ffmpeg `concat`);
2. `res` menor nos shaders pesados e escolher `fx` baratos;
3. codificador por hardware dedicado (NVENC/QuickSync) quando a máquina tiver: o Chrome já escolhe sozinho.

## 6. O que as novas pastas sugerem (`Downloads\GITHUBS`)
Novos em relação à `githubs2`: `Introduction-to-touchdesigner` (livro: TOPs, CHOPs, GLSL, otimização), `OSCAR`, `TD-Arena`, `css-doodle`, `openFrameworks`, `p5.js-main`. Os demais (hydra, motion-canvas, three.js, vjtools…) já estavam avaliados.

| Fonte | O que é | Sugestão |
|---|---|---|
| `OSCAR` (editor de interfaces de controle que emite OSC, MIDI, DMX; tem servidor MCP) | para a Fase 5: em vez de escrever UI de OSC/MIDI, **mapear os parâmetros do motor** (`layer.mod`, `p1..p4`, escolha de composição) para endereços OSC e deixar o OSCAR desenhar o painel de celular | a ponte local (WebSocket para OSC) é a única peça que falta; rever licença antes de qualquer cópia |
| `TD-Arena` (um "Resolume" dentro do TouchDesigner, em construção) | arquitetura de clipes, camadas, colunas e efeitos como componentes trocáveis | confirma o desenho de `layers × columns` do motor; nada a copiar |
| `Introduction-to-touchdesigner` | capítulos sobre **feedback TOP**, **cache TOP**, instanciamento, GLSL TOP, otimização por resolução e formato | base da futura camada `fx` com histórico: cache de N quadros + recálculo determinístico; "otimizar por resolução e formato" já está no `res` do `fx` |
| `css-doodle` (MIT, DSL de padrões em grade com `@random`, `@pick`, `@seq`, `@nth`) | um **gerador de células**: grade com regras por célula, por semente | candidato à camada `doodle`: grade `n×m` onde cada célula escolhe forma, cor e fase por `hash` da posição; cabe em uma tarde e combina com LED |
| `openFrameworks` (C++, 5049 arquivos) | referência de `ofNoise`, FBO com rastro, partículas com modos | já havia padrões de oF em `creative-coding-patterns.md`; nada novo a implementar |
| `p5.js` | referência (V5) | nada |
| `hydra` | já virou `synth` | próximo: salvar e carregar cadeias (biblioteca de cadeias do projeto) |

## 7. Limites honestos desta entrega
- O `fx` não tem memória: sem trilhas, sem slit-scan, sem fluxo óptico, sem jump-flood nem Turing. É o primeiro item da Fase 4 (pré-aquecimento determinístico).
- Os shaders ISF de terceiros só fecham o loop se o período deles dividir o loop; os 11 originais fecham de fato.
- MP4 não guarda alpha; H.264 em larguras acima de 4096 depende do navegador (4500×800 funcionou nesta máquina; a mensagem diz o que fazer se recusar).
- A medição de desempenho é de uma GPU integrada; numa placa dedicada o codificador tende a ficar 2 a 5× mais rápido e as camadas passam a pesar mais na proporção.
- O botão `Gravar` (WebM ao vivo da viewport) continua existindo como rascunho e agora diz isso; para entregar, MP4 ou PNG.
