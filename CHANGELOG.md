# Changelog

## 2.2.0 (não lançado) · V7 fase 1: áudio estendido, modulação e ponte ISF

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

## 2.1.0 (não lançado) · V5: briefing inteligente, conhecimento técnico e primeiro passo da UI

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

## 2.0.0 (não lançado) · arquitetura V4

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
