# Changelog

## 2.7.1 (08/10/2026) · Correção do menu

- **Abas e botões do menu travados**: a ajuda da aba (`#tabHelp`) era inserida dentro do cabeçalho em linha e espremia as abas numa coluna de 64 px, cobrindo-as (vinha da 2.5.0). Agora fica abaixo do cabeçalho.
- **Esc não fechava o assistente** de primeiro uso quando o cursor estava na caixa de JSON (o foco automático engolia a tecla). Corrigido, e o assistente ganhou o botão Fechar.
- `menu_check.mjs`: clique de verdade (evento de mouse no ponto do botão) em todas as abas em 3 tamanhos, botões do topo não cobertos, Esc e Fechar.

## 2.7.0 (08/10/2026) · Render MP4, camada fx, camada synth, biblioteca GLSL e relatório V9

- **MP4 (H.264) quadro a quadro**: `app/mp4.js` (muxer próprio + WebCodecs) na aba Exportar, e `scripts/render.mjs` (MP4 ou PNG por linha de comando, `AIVJ_GPU=1` liga a GPU). Sem gravação de tela e sem WebM; o botão Gravar fica como rascunho. Testado com ffprobe/ffmpeg (`mp4_check.mjs`). 4500×800 renderiza e codifica a cerca de 20 quadros por segundo numa GPU integrada.
- **Camada `fx`** (`app/fx.js`): efeito de uma passada que lê as camadas abaixo. 22 efeitos: PIXELATE, HALFTONE, DITHER, CRT, VHS, ABERRAÇÃO CROMÁTICA, BORDAS NEON, KUWAHARA, MAPA DE GRADIENTE, PAINEL DE LED, VIDRO LÍQUIDO, DESLOCAR, ESPELHO, BLOOM, ARRASTO DE PIXEL, GRADE E VINHETA, GLITCH EM BLOCOS, REPETIR, AUTOMODULAÇÃO, SABATTIER, HACHURA, POLAR (PLANETINHA). Todos fecham o loop (`fx_check.mjs`).
- **Camada `synth`** (`app/synth.js`): uma cadeia de uma linha (`osc(18,1,0.6).kaleid(6).modulate(noise(3,1),0.1).tint()`) vira shader. Gramática, operadores e GLSL próprios; ciclos inteiros por loop; expressões com `bass`, `hit`, `p1..p4`; erros em português; só nomes permitidos (nada de GLSL solto). 10 exemplos (`synth_check.mjs`).
- **Biblioteca GLSL**: 8 módulos novos (`noise.gradient noise.warp sdf2d.more space.more color.more easing.more filter math`), 20 no total, com teste numérico (`lib2_check.mjs`); a ideia segue o mapa de módulos de bibliotecas conhecidas, o código é original.
- **Movimento**: 9 formas de LFO de atenção (`bounce rubber shake jello tada heartbeat swing wobble pulse`), 8 transições novas (16), `vjSpring`, Kalman do andamento (`kickBpmK`, `kickConf`; 1,6 BPM de erro contra 3,0 da mediana nos testes).
- **Receitas**: `hilbert-curve` e `greeble-plate`.
- **XML do Arena** conferido contra um arquivo salvo pelo Resolume: 34 elementos e 38 parâmetros idênticos (`references/arena-advanced-output-structure.json`).
- **Medição e decisão**: `scripts/bench.mjs` mede o custo por tipo de camada; a troca do motor para WebGL2 **não** compensa agora (o codificador domina o quadro): `docs/RELATORIO-V9-githubs3.md` §5.
- **Documentação**: `references/vocabulary.md` (cardápio por necessidade, para o briefing), `fx-layer.md`, `synth-chain.md`, `render-cli.md`; `docs/PROXIMOS-PASSOS.md` reescrito.


## 2.6.0 (08/10/2026) · Aba ISF: biblioteca, importar e exportar shaders para o Resolume

- **Aba ISF** (`app/isf-ui.js`): biblioteca de 84 geradores com miniatura, busca e filtro (11 originais do projeto, 28 MIT de repositórios abertos, 45 CC0 do glslop.com); botão **Importar arquivo .fs** (vários de uma vez, com o motivo de cada recusa); **Exportar camada selecionada / todas** como `.fs` com a entrada `phase`. Cada camada guarda autoria e licença no `role`.
- **Importador mais robusto** (navegador e `isf.py`, idênticos): entradas com os nomes do motor (`phase bass mid high hit c1 c2 cbg…`) ligam direto ao motor, não a p1..p4; nomes que o motor já declara (`hash noise fbm uPulse…`) viram `isf_<nome>` em vez de quebrar a compilação; `float TAU = …` deixa de colidir.
- **11 shaders ISF originais** (`isf-library/original`): túnel, plasma, voronoi, caleidoscópio, lissajous, metabolas, aurora, matriz de LED, moiré, faixas, espiral. Dependem só de `phase`: o loop fecha (medido) e funcionam no Resolume sem mudanças.
- **Proveniência**: `isf-library/README.md` lista fontes, licenças e o que foi excluído (e por quê); `scripts/curate_isf.py`, `fetch-glslop.mjs` e `isf-thumbs.mjs` refazem tudo.
- **Teste novo** `isf_ui_check.mjs`: os 84 compilam em WebGL1, originais desenham e fecham o loop, o importador JS dá o mesmo shader que o Python nos 84, importar/exportar pela interface. Corrigidos dois defeitos de teste/ambiente: SwiftShader só em CI (forçado, mudava as notas na máquina com GPU) e a espera do histórico no teste de desfazer da modulação.

## 2.5.0 (08/10/2026) · Fase 3 do roadmap v9: áudio, superfícies, export e UI, e revisão da fase 2

**Aceite:** `skill/ai-vj-generator/scripts/phase3_acceptance.mjs` percorre, num navegador limpo e só pela interface, o caminho de quem não tem o Claude: Gerar sem IA, briefing da parede 4500×800, avaliar, fatias do Resolume, kick ligado a um parâmetro, teste de flash, export de uma amostra e conferência do ZIP. Guia em `docs/GUIA-SEM-IA.md`.

- **Aba Gerar (sem IA, no navegador).** Porta de `brief_to_project.py` para JavaScript (`app/genai.js`): formulário, preset de superfície, validação em português, Gerar e abrir (desfazível), salvar e carregar briefing, Avaliar. `genai_check.mjs` compara o projeto do navegador com o do Python, campo a campo, em 28 briefs (12 climas, 8 da galeria, 8 casos de borda). A tela inicial ganhou o botão Gerar sem IA.
- **Avaliador no motor.** A medição saiu do script e vive em `app/evaluate.js` (`AIVJ.evaluate`); a CLI e a aba Gerar chamam a mesma função. Notas idênticas às da fase 2.
- **Áudio.** `app/onset.js`: detector de onset e de kick com histórico (fluxo espectral, limiar de média + 1,5 desvios do último segundo, refratário, BPM pela mediana dos intervalos). Fontes novas `kick onset flux` em `layer.mod` e como banda por camada, com bandas sintéticas do BPM quando não há áudio. `audio_check.mjs`: espectros sintéticos com verdade conhecida (16 de 16 kicks, zero falsos nos chimbais, adaptativo a 35% do volume, refratário) e o `AUD.update` real com um analisador simulado.
- **Editor de modulação** (`app/mod-ui.js`, aba Parâm.): adiciona, remove e edita `layer.mod` (fonte, parâmetro, mínimo e máximo com contas, modo, LFO com ciclos inteiros, curva de mola) e aplica a curva de perfil de movimento. `mod_ui_check.mjs`.
- **Aba Superfície** (`app/surface.js`, `surface-ui.js`): 12 presets, cortes por número, pixel map por CSV ou PNG (vira `canvas.displays` e aparece na vista), fatias do Resolume (XML **idêntico** ao do `export_slices.py` em cinco superfícies; mapa .json; padrão de teste PNG), modo experimental de um módulo por fatia, avisos de legibilidade por passo e distância. `surface_check.mjs`.
- **Export** (`app/flash.js` e o `exportRun`): `MANIFEST.json` com SHA-256 do projeto, canvas, fps, compassos, quadros, arquivos, partes e resultado do flash; divisão em partes (`_p01`…) de 250 MB a 2 GB; análise de flash pelo critério geral do WCAG 2.3.1 sobre o loop cíclico; limitador de contraste local só nas composições e janelas que reprovam. `export_check.mjs` lê os PNG gravados de volta: estrobo de 8 Hz tem 8 flashes por segundo sem o limitador e 0 com ele; uma peça calma passa intacta. **Não mede flash vermelho nem ponderação por área.**
- **UX** (`app/ux.js`): modo Criativo/Avançado (esconde Texto, Projeto, +Efeitos e Ficha; não mexe no projeto), linha de ajuda em cada uma das 13 abas (PT e EN), lista de atalhos pela tecla `?` conferida contra o código do teclado, tour de 7 passos. `ux_check.mjs`.
- **Módulos embutidos.** Os trechos de `app/*.js` (genai, evaluate, gen-ui, surface, surface-ui, flash, onset, mod-ui, ux) são embutidos no `index.html` por `scripts/embed-modules.mjs` (`--check` roda no `check.mjs`). O motor continua um arquivo só.
- **Revisão da fase 2 (feita antes):** o custo dos geradores em `families.json` era um chute e agora vem de `scripts/layer_cost.mjs` (medido; `families.py check` falha se divergir; geradores com mídia ou código ficam `unmeasured`); o custo do bake da simulação foi corrigido (1,4 s medido, não 0,6 s); as faixas do avaliador na documentação estavam erradas e foram reescritas como o código as aplica; 26 rótulos em inglês da camada `typeset` e do painel da bíblia; `gallery.mjs --check` passou a acusar projeto velho; o validador avisa quando a cascata do `typeset` não cabe antes da saída.
- Versão do motor 2.5.0. Testes novos no `check.mjs`: genai, gen_ui, surface, export, audio, mod_ui, ux. `phase3_acceptance.mjs` (abre o motor limpo) também roda no `check.mjs`.

## 2.4.0 (08/10/2026) · Fase 2 do roadmap v9: nível artístico

- **Perfis de movimento executáveis** (`scripts/motion_profiles.py`, `references/motion-profiles.md`): cinco eixos (`energy elasticity anticipation continuity rhythm`) viram a curva "chute e toque" (mola amortecida, antecipação, quantização em degraus, ciclos inteiros por loop). O motor ganhou `motionCurve` e `layer.mod` com `shape: "spring"`; `motion_check.mjs` prova que as duas implementações dão o mesmo número (1e-9) e tem controle negativo. O gerador sem IA toca o perfil do clima no herói e uma cópia mais suave na estrutura (follow-through); `brief.motionProfile` sobrescreve.
- **Bíblia de arte** (`meta.artBible`, `references/art-bible.md`): nove linhas (tese, material, espaço, movimento, dramaturgia, cor, tipografia, áudio, banidos) mais `motionProfile` e `density`. Esquema, validador (só avisos) e gerador; aparece no resumo da interface.
- **Avaliador estrutural** (`scripts/evaluate.mjs`, `references/evaluation.md`): nota 0-100 por composição a partir de quadros renderizados (hierarquia, contraste, densidade, respiro, movimento, arco, repetição) com frase de ajuda em PT/EN. `evaluate_check.mjs` fabrica defeitos (vazio, tela cheia, parado, duplicado, tudo a 100%) e exige que cada um caia na métrica certa. Mede estrutura, não beleza.
- **Galeria de referência** (`examples/gallery/`, `scripts/gallery.mjs`): 8 briefs clima x superfície, projetos gerados sem IA, notas, folhas de contato e README. As 24 composições tiram >= 75 (de 77 a 100); `gallery.mjs --check` roda no `check.mjs`.
- **Famílias da biblioteca** (`references/families.json` e `.md`, `scripts/families.py`): 30 geradores, 12 receitas e 12 módulos GLSL em 10 famílias com superfícies, custo e maturidade; `families.py check` falha se o motor e o manifesto divergirem.
- **Tipografia** (camada `typeset`, `references/typography.md`): hierarquia título/legenda/dados, revelação por glifo ou palavra, texto em círculo, onda ou linha; escondida nas duas pontas do loop. Brief aceita `text.caption`, `text.data`, `text.path`. Teste: `typeset_check.mjs`.
- **Correções do gerador achadas pelo avaliador:** campo de bits deixou de ser herói (preenche metade do quadro; vira textura a 10% na estrutura), faixas com cobertura limitada, heróis de poeira (organism, flow) com massa mínima, simulação de reação com limiar mais alto, campo de fundo mais fraco em peças densas, herói do minimal com traço de 10.
- **Correções:** aviso novo no validador quando o parâmetro de uma modulação não está em `p`; esquema JSON aceita `spring`; `brief_to_project.py` voltou a LF; um bloco duplicado de validação de `layer.mod` (edição pela metade, não commitada) foi descartado.
- Testes novos no `check.mjs`: `motion_check`, `typeset_check`, `evaluate_check`, `families.py check`, `gallery.mjs --check`.

## 2.3.0 (07/10/2026) · Fase 1 do roadmap v9: documentação, neutralidade de IA, briefing estruturado

- **Qualquer IA, ou nenhuma:** `portable/PROMPT.md` (instruções em um arquivo), `AGENTS.md`, `docs/AI-AGNOSTIC.md`, esquemas JSON (`schema/project.schema.json`, `schema/brief.schema.json`) e `scripts/schema_check.py` (validador sem `pip`).
- **Briefing estruturado:** `scripts/brief_check.py` (nota 0–100 e as 4 próximas perguntas) e exemplos em `examples/briefs/`.
- **Geração sem IA:** `scripts/brief_to_project.py` transforma um brief em projeto válido (12 climas, paleta OKLCH, camadas em tiers com fundo quieto e herói dominante, estratégia de áudio); determinístico.
- **Áudio estruturado:** `audio.strategy` (`none/subtle/structural/rhythmic/full`) no motor (escala a reação; `none` zera, mantém movimento por tempo integrado e ondas do BPM) e no validador; `meta.contract.layerBudget` e `audioStrategyReason` como exceções declaradas; `references/audio-direction.md`.
- **Docs:** `docs/README.md`, `QUICKSTART.md`, `AI-AGNOSTIC.md`, `ROADMAP.md` (oficial, v9).
- Teste: `generator_check.mjs` (12 climas validam, abrem, desenham e fecham o loop).

## 2.2.0 (07/10/2026, publicada junto com a 2.3.0) · V7 fase 1: áudio estendido, modulação e ponte ISF

- **Áudio estendido** (`references/audio-bus.md`): `uMidHit uHighHit uPres uBassT uMidT uHighT uAudT uOnBeat uBSin uBSin2 uBSin4 uBTri uBpm`, também em `K.t.*` das camadas de código. Tempo integrado sintético fecha o loop (valor = compassos por loop); ao vivo integra de verdade. Tudo determinístico.
- **`layer.mod`**: qualquer parâmetro numérico recebe fonte de áudio, onda do BPM ou LFO em ciclos inteiros (`set/add/mul`). Validador confere fontes, modo, ciclos inteiros e conta camadas reativas.
- **Ponte ISF** (`scripts/isf.py`, `references/isf-bridge.md`): exporta cada camada de shader como `.fs` para Resolume/Wire/VDMX e importa geradores ISF de passe único como camada de shader (crédito preservado).
- **Biblioteca GLSL `#include`** (`references/glsl-lib/lib.glsl`, `glsl-library.md`): 12 módulos escritos do zero (hash, simplex/curl/ridged, Worley/Voronoi, SDF 2D e 3D, raymarch, Oklab e tonemap, dither e meio-tom, espaço, easing, pós, emulação de LED/CRT). Números de linha dos erros não mudam; validador acusa módulo inexistente. `node scripts/embed-glsl-lib.mjs` embute no motor.
- **Drama** (`references/tension-and-release.md`): evento focal, zona de respiro, imperfeição seedada, lista de banidos, gramática de passagem, emoção → movimento, ritmo como composição. Contrato ganha `focalEvent releaseZone banned tension imperfection` (aviso quando vazio).
- **Transições novas:** `zoom`, `slide`, `iris`, `blinds`.
- **Camadas novas:** `instrument` (bars, radial, scope, radar, rings, heat; ligadas ao sinal real), `bitfield` (campo de bits que fecha o loop), `sim` (reação-difusão e tinta, assadas em loop, determinísticas, ~0,6 s de bake), `parallax` (imagem + profundidade, 2.5D), `splat` (`.ply` de Gaussian Splatting e nuvens de pontos, aproximação isotrópica).
- **Saída:** modo palco por URL (`?stage=1&alpha=1&comp=N&play=0&q=1`) para OBS + Spout2 → Resolume (`bridge-obs-spout.md`); `scripts/export_slices.py` gera XML de Advanced Output do Resolume (conferido contra um arquivo real salvo pelo Arena), mapa JSON e padrão de teste; `scripts/depth_estimate.py` (modelo aberto se instalado, senão heurística).
- **Verificação:** `scripts/seed_census.mjs` (seeds em branco, quase-duplicatas, A-B-A).
- Testes: `v7_check.mjs`, `isf_check.mjs`, `lib_check.mjs`, `test_export_slices.py`; `check.mjs` roda todos.

## 2.1.0 (publicada junto com a 2.3.0) · V5: briefing inteligente, conhecimento técnico e primeiro passo da UI

- **Briefing inteligente** (`references/briefing/`): Brief Ledger, 11 arquétipos com ficha própria, pontuação por valor de informação, checagens de consistência, resumo ("entendi assim") antes do contrato, banco de perguntas de conceito, música, performer, risco e sucesso. `meta.spec` no schema, validado contra o canvas.
- **Ferramentas novas** (todas testadas): `surface_calc.py` (LED, projeção, blend, loop, legibilidade, pixelmap), `palette.py` (OKLCH), `recipes.py` (11 receitas matemáticas e físicas em `references/recipes/`), `loop_check.mjs` (fecha o loop? por camada, com controle negativo), `ui_check.mjs`, `cdp.mjs`.
- **Conhecimento novo:** `output-engineering`, `math-forms`, `perception-and-gestalt`, `color-science`, `motion-systems`, `vj-practice`, `repo-analysis` (ledger dos repositórios estudados e licenças), `ui-research`.
- **Interface:** aba **Ficha** (ficha de produção, zonas na viewport, calculadoras que espelham o Python, PRODUCTION_SPEC.md). Valores vindos do JSON são escapados (teste de injeção com teste de mutação).
- **Correções:** `--json` depois do subcomando, saída UTF-8 no Windows, entradas zero ou negativas com mensagem clara, `analyze_*.py -h` e arquivo ausente, finais de linha CRLF vs LF, contradições herdadas no roteador (3–8 vs 6–10 camadas, 3 vs 4 rodadas).
- `check.mjs` roda os testes unitários, a galeria de receitas, o fechamento de loop (e seu controle negativo) e a interface.
- **Interface (continuação):** menu com largura ajustável e minimizável; temas escuro, claro e sistema; layout responsivo de 320 a 2560 px em pé e deitado; desfazer e refazer para qualquer alteração (histórico nomeado); campos numéricos digitáveis com contas seguras; leitura de coordenadas e zona desenhada na vista; aba **Receitas** (12 receitas embutidas, prévia, adicionar como camada); **cartões de teste** com um clique; painel **Cor perceptual** OKLCH com paridade comprovada com `palette.py`; tipografia Martian Mono nos títulos e Helvetica em caixa alta no texto. Testes novos: `ui_layout_check.mjs`, `recipes_ui_check.mjs`, `embed-recipes.mjs --check`.
- `PlumberManager` analisado (ver `repo-analysis.md`): adotado o histórico com rótulos e o menu redimensionável; sugeridos Ctrl+K, tour, tela de início, grafo de camadas.
- **V6 (07/10/2026):** botão **Cor** sob a vista (Alpha, Standard por teoria das cores, Personalizada com seletor, RGB e HEX, e a paleta do briefing em `meta.briefPalette`); botão do menu (G) na linha do divisor; aba **+Efeitos** com botão Visualizar (um quadro ao passar o mouse, animação de 200 px a 10 fps ao clicar); rodapé com créditos, instagram.com/gyulyia e gyulyia.com; botão Evento removido; Explodir virou **Mostrar camadas**; pop-up de ajuda com X; idioma **EN / PT-BR** no motor (`meta.lang`) e na skill; **objeto 3D** (`.obj`, `.glb`, `.stl`) com render shader, wireframe ou nuvem de pontos, giro que fecha o loop e modelo dentro do JSON.
- **Skill:** `/how-to-use` (EN e PT-BR, roda sozinho no primeiro uso depois da instalação via `.first-run`), pergunta de idioma antes do briefing, `scripts/output_viewer.mjs` gera `OUTPUT.html` clicável com todos os arquivos gerados. Teste novo: `features_check.mjs`.

## 2.0.0 (publicada junto com a 2.3.0) · arquitetura V4

### Rodada de qualidade estética e áudio (06/10/2026)

- **Áudio corrigido: todo shader é audioreativo (regra permanente).** A causa era uma cadeia de três chaves desligadas por padrão (reativo global, resposta por camada em 0, fonte conectada). Agora: resposta do shader nunca abaixo de 0,35 (padrão 0,8, banda bass); uniforms `uBass uMid uHigh uRms uHit` além de `uAud`; sem fonte, bandas sintéticas presas ao BPM (determinísticas: preview, PNG e loop reagem); `audio.reactive` padrão `true`; botão **Fonte de teste** (kick, chimbal e lead no BPM, funciona no Artifact); suavização com ataque rápido e queda lenta; `AUD.stop()` não deixa mais o analisador ligado à saída. O validador dá ERRO para shader que ignora o áudio ou com `p.audio` 0.
- **Eco (`p.echo`, `echoStep`, `echoFade`)** em qualquer camada: cópias em quadros anteriores, determinístico, fecha o loop (substitui o feedback do Hydra/TouchDesigner).
- **Shaders:** 4 presets reescritos com as bandas e 4 novos (`KALEIDO`, `FLUXO WARP`, `GRADE SDF`, `INTERFERÊNCIA`); helpers GLSL `vjRot vjPal vjSdBox vjSdCircle vjSmin vjKaleid vjEaseOut vjPulse`. Nove receitas e sete padrões de camada de código documentados e **compilados e renderizados no motor**.
- **Geradores neutros.** `hud`, `data`, `event`, `structure` e `measure` não carregam mais coordenadas, cidade, rótulos nem o ângulo áureo de peças anteriores; o texto original vive só no bloco `STD_P` do STANDARD. `check.mjs` falha se um texto de peça vazar.
- **Conhecimento novo na skill:** `craft-and-finish.md` (camadas em tiers, nomes, âncora a uma geometria, escadas de opacidade/peso/escala, gramática de tempo, "finish pass"), `animation-principles.md` (12 princípios, física em forma fechada, VFX, matemática, praticantes), `design-laws.md` (Gestalt, leis de UX, cor, tipografia), `software-techniques.md` (Hydra, TouchDesigner, Cavalry, Wire, Synesthesia, openFrameworks, p5, Strudel, como as skills `algorithmic-art` e `hyperframes` são construídas), `effects-glossary.md`, `aspect-ratios.md` (famílias de proporção, tiras, torres, domo, distância de leitura), `glsl-recipes.md`, `creative-coding-patterns.md`.
- **Entrevista:** até 4 rodadas e **Gate E de calibração de gosto** (14 perguntas concretas). `attachments.md` ganha o protocolo de leitura precisa (zoom, inventário de camadas, medir, identificar o processo, o que não se vê) e de pesquisa de termos desconhecidos.
- **Validador:** ERRO com menos de 5 camadas visíveis por composição (schema 2), AVISO abaixo de 6, nomes padrão (`SHADER`, `FORMA`…) e camadas de código iguais deixam de acusar falso positivo.
- **Exemplo de formato** reescrito com 6–7 camadas nomeadas por composição.

### Skill como roteador

- **`SKILL.md` de 1.617 linhas para 141.** Só regras duras, comandos, fluxo e mapa de leitura. Nada foi apagado: a teoria V3 (§3–§45, §55–§59) foi movida sem alterações para `references/knowledge/` (4 arquivos) e o manual do motor (§46–§54) para `references/engine-operation.md`. As numerações de seção continuam valendo.
- **Entrevista em portões A–D** (produção, intenção artística, entradas e identidade, entrega), com critério de parada: acaba quando o contrato criativo pode ser escrito.
- **Contrato criativo** (`references/creative-contract.md`) entre o briefing e o código: 14 campos, regra de rastreabilidade (toda camada responde "por que existe") e 10 perguntas de aceitação. Divergência conceitual, depois **um mundo e 3–5 composições** que compartilham DNA e diferem em topologia, comportamento espacial e tempo.
- **Comportamento antes de técnica** (`behavior-to-technique.md`): a pergunta deixa de ser "qual gerador" e passa a ser "que comportamento visual a ideia exige".
- **Superfície** (`surface-model.md`), **áudio** (`audio-bus.md`), **capacidades** (`capabilities.md`, rótulos SUPPORTED / EXPORTABLE / REQUIRES BRIDGE / CONCEPTUAL, alinhados com a tabela do motor) e **qualidade** (`quality-gates.md`: oito portões e nota de 100 pontos com pesos, rejeições automáticas, ordem de mutação).
- `library-matrix.md` e `provenance.md` da pesquisa V4; `delivery.md` ganha CONCEITO, RENDERIZAÇÃO, NOTAS e LIMITES no resumo final; `/vj` e `/vj-critique` apontam para os novos portões.

### Schema `ai-vj-generator/2`

- Três blocos opcionais, ignorados na renderização e usados pela skill: `meta.contract`, `layer.role` e `capabilities`. Arquivos `/1` continuam carregando e validando.
- `validate_project.py` confere o contrato (campos finos ou vazios, gramática de loop), papéis de camada, no máximo 3 camadas reativas ao áudio por composição e transporte honesto (OSC, NDI, Spout, Syphon e SDI só em `requiresBridge`; MIDI, WebSocket, MP4 e HAP só em `conceptual`).
- Exemplo novo `examples/contrato-v4-formato.json` (só mostra o formato).

### Motor

- O painel de composição mostra o **contrato criativo** do projeto.
- **TAP não reinicia mais o loop a cada toque:** só o primeiro toque de uma série alinha o downbeat; `Enter` alinha sem mexer no BPM.
- Export PNG sem luma deixa de forçar canvas em software (`willReadFrequently` só com luma): export em GPU.
- Versão do motor 2.0.0.

### Verificação

- `scripts/check.mjs` confere: SKILL.md ≤ 500 linhas, todo caminho citado existe, links entre references, e que o validador recusa OSC/MIDI como `supported`.

## Não lançado (paredes, código e anexos, já incluído na 2.0.0)

### Paredes, camada de código e arquivos embutidos

- **Paredes e dobras:** `canvas.folds` (x em px) e `canvas.gutter` dividem o canvas em paredes. Os geradores recebem a geometria (`wall.near`, `wall.sw`), o guia vermelho aparece na viewport (PROJETO → Paredes e dobras) e a validação avisa quando texto cruza a calha de uma dobra.
- **Camada de código (`type: "code"`):** a skill escreve o corpo de `draw(c, K)` quando nenhum gerador expressa a ideia. Roda dentro do relógio determinístico do motor, com o kit `K` (tempo, paredes, tipo em pixel-bloco, símbolos, faixa de risco, glitch em bloco, máscaras de logo, easing, aleatoriedade com seed) e variáveis reguláveis (`vars`) que viram sliders. `Math.random`, relógio, rede e armazenamento são bloqueados por filtro; o projeto com código pede autorização. É um filtro, não uma caixa de areia. A auditoria renderiza a camada em 6 quadros e bloqueia o export se o mesmo quadro sair diferente.
- **Geradores novos:** `pixeltext`, `symbols`, `hazard`, `blocks`, `logo` (fit, mosaico, meio-tom, fatiado, degraus a partir da dobra, fragmento).
- **Branco α:** `palette.mode: "white-alpha"` (figura 100%, apoio 72%, campo 43%), nova chave de paleta `field` e botão no painel Projeto; liga o export luma por padrão.
- **Arquivos embutidos:** imagens e fontes viajam dentro do projeto (`assets`). `make-artifact --assets pasta` embute (`pasta/logos/` vira máscara branca com alpha). Na interface, MÍDIA → "Logo → branco α" faz o mesmo.
- **QA sem abrir a interface:** `scripts/contact_sheet.mjs` roda o HTML num Chrome ou Edge headless e grava uma folha de contato por composição (6 quadros, dobras marcadas) e o relatório de validação. A interface tem o botão "Folha de contato PNG".
- **Skill:** nova referência `walls-code-assets.md`; o fluxo pede resolução, dobras, fontes, logos e paleta; `validate_project.py` confere dobras, código, variáveis e arquivos; exemplo novo `examples/duas-paredes-codigo.json`.
- **Removido:** o exemplo `tecnofeudo-led-5120x500`.

### Cada briefing começa do zero

- **Comandos `/`:** `/vj`, `/vj-reference` e `/vj-critique` (skills só invocáveis pelo usuário). O fluxo é conduzido no chat do Claude; a interface abre por último, com o projeto carregado.
- **Sem presets:** o motor perde o entrevistador por regras (`composeFromBrief`), o botão EXEMPLO e as paletas prontas. A interface abre em "Aguardando briefing" e só carrega um projeto escrito pelo Claude ou um JSON colado. O STANDARD continua como biblioteca opcional.
- **Skill:** nova regra de começar do zero (SKILL.md §1B, `references/briefing-flow.md`); as referências deixam de listar hipóteses e paletas padrão; a skill não carrega mais exemplos (ficam em `examples/` só como formato de arquivo).
- **Anexos:** `analyze_image.py` (paleta OKLab, peso visual, simetria, periodicidade, frequência) e `analyze_video.py` (cortes, energia e direção de movimento, brilho ao longo do tempo, quadros-chave e folha de contato), com `references/attachments.md` ligando cada medição a uma decisão.
- **Validação:** `validate_project.py` pega parâmetros ignorados em silêncio, FPS e loops inválidos, erros de GLSL ES 1.00 (conferidos contra o compilador do navegador) e sinais de template.
- **Instaladores:** copiam as 4 skills.

- Skill: biblioteca de repertório em `references/repertoire/` (9 arquivos), com história da arte (do futurismo ao glitch, incluindo concretismo e neoconcretismo brasileiros), design suíço e grids, teoria da cor para superfícies de luz, os 12 princípios da animação e motion design, tipografia cinética, arte generativa e code art, padrões com 7 receitas GLSL testadas, artistas, VJs e estúdios, e bibliotecas com licenças. Todas as referências seguem o formato referência → princípio → parâmetro, com regra contra a imitação de artistas vivos.
- Skill: o schema documenta o posicionamento de `text` e `shape`, a semântica do `tunnel` e o comportamento de `event.every` em loops curtos.

## 1.0.0 — 2026-10-02

Primeira versão pública.

- Motor em arquivo único (`app/index.html`): relógio por contagem de quadros, aleatoriedade por hash com seed, loops seamless verificados (a emenda do loop mede igual a uma virada de compasso interna nas 10 composições de teste).
- STANDARD: o motor de camadas original (organismo, estrutura, medição, dados, HUD, evento, pós) portado para render determinístico, com textos específicos de evento transformados em parâmetros.
- Geradores de briefing: linhas, fluxo, túnel, parede tipográfica. Camadas fixas: shader GLSL (4 presets + código próprio), imagem, vídeo, forma, texto.
- Entrevistador embutido com gramática visual por regras; importação do PROJECT JSON da skill.
- Export PNG alpha (composição, por camada, camada única, branco α), WebM, janela de saída, displays recortados, validação ERROR / WARNING / OPTIMIZATION.
- Skill `ai-vj-generator` com referências de entrevista, direção de arte, schema, saídas e entrega; scripts de build em Python e Node. Testada com cenário RED/GREEN.
