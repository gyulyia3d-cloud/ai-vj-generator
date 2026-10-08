# Relatório de melhorias — AI VJ Generator 1.0.0

Revisão de 03/10/2026 sobre o commit `420bbde`. Cobre o motor (`app/index.html`, 2.252 linhas), a skill (`skill/ai-vj-generator`, 6 arquivos), o repositório e a experiência de uso. Cada item traz evidência (medição ou linha de código), esforço estimado (P = horas, M = 1–3 dias, G = uma semana ou mais) e impacto para quem faz VJ.

## 1. Resumo

A base está correta e é difícil de copiar: relógio por quadros, render determinístico, o mesmo código no preview, no PNG e na gravação, e a skill separada do motor. O que falta para ser uma ferramenta de palco, e não só de estúdio, se resume a três frentes:

1. **Velocidade.** O export roda em CPU por acidente, e cinco geradores gastam de 45 a 61 ms por quadro em 1080p.
2. **Controle ao vivo.** Não há MIDI, modulação por LFO nem crossfader, que são o mínimo esperado num software de VJ.
3. **Distribuição.** A instalação exige `git clone` e um script, quando poderia ser um plugin do Claude Code com um comando. O README ainda tem `SEU-USUARIO`.

### As 10 prioridades

| # | Item | Esforço | Impacto |
|---|---|---|---|
| 1 | Export em GPU (remover `willReadFrequently` fora do luma) | P | Export várias vezes mais rápido |
| 2 | Cache estático de scanline, vinheta e grão | P | Cerca de 100 ms a menos por quadro em 1080p |
| 3 | Gravar o export direto numa pasta (File System Access), sem ZIP em memória | M | Libera exports de 4K e de 8 compassos |
| 4 | MIDI: learn de parâmetros, troca de composição por pad, sincronia por MIDI clock | M | Torna a ferramenta tocável ao vivo |
| 5 | Modulação: LFO e áudio ligáveis a qualquer parâmetro numérico | M | Multiplica a expressividade sem novos geradores |
| 6 | Separar TAP (tempo) de RESYNC (downbeat) | P | O tap hoje reinicia o loop a cada toque |
| 7 | Limitador de flashes (fotossensibilidade, máx. 3 Hz) | P | Segurança do público |
| 8 | Plugin do Claude Code + marketplace (`/plugin install`) | P | Instalação em um comando, com atualização |
| 9 | Testes automatizados no navegador + CI no GitHub | M | Os testes de emenda, alpha e export viram regressão |
| 10 | Persistir mídia importada (IndexedDB) | P | Hoje imagem, vídeo e fonte somem ao recarregar |

## 2. Bugs e riscos encontrados

| Severidade | Onde | Problema | Correção |
|---|---|---|---|
| Alta | `app/index.html:1796` | O canvas de render do export é criado com `willReadFrequently: true` sempre, o que força desenho em software. Foram medidos 58 quadros em 480×270 em 12,5 s (cerca de 215 ms por quadro numa resolução que é 1/16 do 1080p). | Usar `willReadFrequently` só quando `EXP.luma` estiver ligado. Converter os PNG em paralelo (`OffscreenCanvas.convertToBlob` num worker). |
| Alta | `:1829` | O ZIP inteiro fica na memória (`generateAsync`). Um export 4K de 8 compassos a 60 FPS passa de 1,5 GB e trava a aba. | Chrome e Edge: `showDirectoryPicker()` e um arquivo por quadro, gravado em streaming. Nos outros navegadores: ZIPs em partes de 500 MB. |
| Média | `:2002–2007` | `tap()` zera o quadro (`ST.n = 0`) a cada toque, então o visual pula para o início do loop enquanto você marca o tempo. | Fazer o TAP só ajustar o BPM e criar um RESYNC separado (tecla `Enter`) que alinha o downbeat. |
| Média | `:938` | `MEDIA` vive só na memória. Ao recarregar, as camadas IMAGEM, VÍDEO e TEXTO perdem arquivos e fontes, e a validação acusa ERROR. | Guardar os blobs no IndexedDB pela chave do nome. No Artifact, usar a capacidade `assets`. |
| Média | `:1540`, `drawThumb` | Miniaturas renderizam a composição inteira, shader incluído, na thread principal a cada 24 quadros e em todo `renderComp()`. Isso causa soluços periódicos no preview. | Desenhar a miniatura a partir do canvas já composto quando a composição está ativa, e renderizar as inativas num worker com `OffscreenCanvas`. Pausar as miniaturas em tela limpa ou cheia. |
| Média | Estratégia geral | Não há "trocar no próximo compasso": `selectComp` corta na hora, fora do tempo. | Opção de quantização da troca: imediato, próximo beat ou próximo compasso. É padrão em Resolume e Ableton. |
| Baixa | `ST.future` | O histórico guarda o futuro, mas não existe refazer. | `Ctrl+Shift+Z` lendo `ST.future`. |
| Baixa | `:462` | O fundo preenche 9× a área (`W*3 × H*3`) para cobrir transformações. | Preencher só a área visível (desfazer a matriz) ou o retângulo do canvas quando não há transformação. |
| Baixa | `:708` | O padrão do HUD no STANDARD ainda traz a data e o local de um evento real (`25.26.27.09 · 02.03.10.2026 · SÃO PAULO`). | Manter no preset STANDARD, se ele deve ser fiel, e trocar o padrão do gerador por `{DATA}` e `{BPM}` dinâmicos. |
| Baixa | Evento manual (X) | Disparado perto do fim do loop, ele é cortado na volta do loop. | Guardar o evento em quadros absolutos (`raw`), não em beat do loop. |
| Risco legal | `README`, STANDARD | O MIT cobre o código, mas o nome GYULYIA® e o wordmark são marca. A fonte Helvetica do design system é licenciada e não pode entrar no repositório. Hoje ela não entra, e isso precisa continuar assim. | Adicionar uma nota de marca ao README ("o código é MIT; o nome e a identidade GYULYIA não") e uma regra no CONTRIBUTING proibindo fontes não-OFL. |
| Risco de segurança | Saúde | Os wipes de evento e o glitch em `prob` alta podem passar de 3 flashes por segundo, o que pode disparar crises em pessoas fotossensíveis (WCAG 2.3.1, teste de Harding). | Limitador global de flashes, ligado por padrão, com aviso na validação quando ele atua. |

## 3. Performance (medida)

Custo de desenho por gerador, em canvas de GPU de 1920×1080, média de 20 quadros, com os parâmetros padrão. O preview roda em escala menor (cerca de 0,5, ou seja, 1/4 dos pixels), então ao vivo o custo é menor, mas a ordem relativa se mantém. A medição foi feita com o painel do navegador oculto, então os valores absolutos podem estar inflados.

| Gerador | ms / quadro | Causa provável | Otimização | Esforço |
|---|---|---|---|---|
| `typewall` | 61,3 | `fillText` de glifos gigantes repetidos + `measureText` por linha a cada quadro | Rasterizar cada palavra uma vez num canvas fora da tela e repetir com `drawImage`; cache de largura por palavra | P |
| `post` | 56,9 | 270 `fillRect` de scanline + gradiente radial na tela inteira a cada quadro | Scanline e vinheta são estáticas: desenhar uma vez por tamanho de canvas e reutilizar | P |
| `shader` | 55,3 | Cópia do canvas WebGL para o 2D a cada quadro; contexto único redimensionado entre miniatura e preview | Um contexto WebGL fixo por tamanho; miniaturas sem shader | M |
| `flow` | 54,2 | 900 partículas × 8 amostras × 2 chamadas de ruído em JS | Tabela de ruído pré-calculada; ou mover para WebGL (pontos e linhas na GPU) | M |
| `bg` | 45,3 | Preenchimento de 9× a área + upscale do grão sem suavização | Preencher só a área visível; manter blocos de grão já no tamanho final | P |
| `organism` | 18,2 | 2.400 `fillRect` com troca de `globalAlpha` por ponto | Agrupar por faixas de alpha (8 grupos) ou mover para WebGL | P |
| `data`, `structure`, `measure`, `hud`, `event`, `lines`, `tunnel`, `shape`, `text` | 1,5–6,3 | Adequado | — | — |

Com os itens P aplicados, o STANDARD completo em 1080p deve cair pela metade. Esse número é uma estimativa e precisa ser medido de novo depois da mudança.

Uma decisão estrutural para a versão 2: hoje cada camada tem o próprio canvas 2D e o navegador faz a composição via CSS. Um compositor WebGL único, em que cada camada vira textura e o blend roda em shader, permitiria feedback (o quadro anterior como entrada), displacement entre camadas e blends reais no export, que hoje dependem de `globalCompositeOperation`.

## 4. Funcionalidades para VJ

### 4.1 Controle ao vivo (prioridade alta)

| Funcionalidade | Por que | Como | Esforço |
|---|---|---|---|
| **MIDI** | Controlador é o instrumento do VJ. A tabela de transporte marca MIDI como "conceitual", mas a Web MIDI API funciona nativamente no Chrome e no Edge, sem ponte. | `navigator.requestMIDIAccess()`; modo LEARN (clique no parâmetro e gire um knob); pads trocam composição e ligam camadas; mapa salvo no projeto. Não roda dentro do sandbox do Artifact, só na versão local ou no GitHub Pages. | M |
| **MIDI clock** | Sincroniza o BPM com o DJ ou com o Ableton sem depender do tap. | Contar os 24 pulsos por semínima; Start/Stop alinham o downbeat. | P (depois do MIDI) |
| **Modulação** | Um LFO ligado a qualquer parâmetro multiplica as possibilidades sem criar novos geradores. | Por parâmetro: fonte (seno, triângulo, quadrada, serra, aleatória por seed; graves, médios ou agudos; envelope do evento), divisão de BPM e profundidade. O LFO em ciclos inteiros mantém o loop seamless. | M |
| **Crossfader A/B** | A transição hoje é só um snapshot que se dissolve. VJs misturam duas composições ao vivo. | Dois decks renderizando; fader manual ou automático em N beats; blend escolhido. | M |
| **Troca quantizada** | Corte no tempo certo. | "Próximo beat / compasso" (item 2 de bugs). | P |
| **Setlist / autopilot** | Para sets longos ou instalações. | Sequência de composições com duração em compassos e transição; modo aleatório por seed. | M |

### 4.2 Palco e saída

| Funcionalidade | Por que | Como | Esforço |
|---|---|---|---|
| **Test card / pixel map** | Montar LED e projeção exige padrão de teste: grade, IDs de display, barras de cor, contagem de pixels, cantos. | Novo gerador `testcard` usando `canvas.displays` e `pitch`. | P |
| **Corner pin por display** | Ajuste rápido de projeção sem precisar abrir o Resolume. | Na janela de saída: arrastar 4 cantos (homografia via CSS `matrix3d`). | M |
| **Gravação em resolução cheia** | Hoje o GRAVAR captura na resolução do preview. | Modo "render offline para vídeo": WebCodecs `VideoEncoder` quadro a quadro em resolução cheia, com muxer WebM. Determinístico, como o PNG. | M |
| **HAP direto do navegador** | Pularia o Alley. O HAP é compressão DXT + Snappy num contêiner QuickTime, tudo implementável em JS ou WASM. | Encoder DXT1/DXT5 em WASM + muxer MOV. É o item de maior valor para usuários de Resolume. | G |
| **Bridges prontas** | Transformar "requer bridge" em um clique. | `bridges/` no repositório: um `.tox` do TouchDesigner (Web Render TOP → Spout/NDI Out), uma cena do OBS pronta com DistroAV, e um mini-servidor Node para OSC (WebSocket ↔ UDP). | M |
| **App desktop** | NDI e Spout nativos, sem OBS. | Empacotar o motor em Tauri ou Electron com um addon NDI. | G |

### 4.3 Criação

| Funcionalidade | Esforço |
|---|---|
| Presets salvos (camada, composição, paleta, movimento), em `localStorage` + exportação em JSON | P |
| Biblioteca de shaders maior: reaction-diffusion (com feedback), SDF 3D (raymarch), domain warp, kaleidoscópio | M |
| Gerador de feedback (o quadro anterior como entrada), que depende do compositor WebGL | M |
| Máscaras: qualquer camada como máscara de outra (luma ou alpha) | M |
| Vídeo com fundo removido ou mapa de profundidade (via IA, fora do navegador), documentado como workflow | P |
| Auto-BPM por áudio (autocorrelação de onsets) como sugestão, não como substituto do tap | M |

### 4.4 Interface (GYULYIA DS)

| Item | Esforço |
|---|---|
| Alternância EN / PT-BR (o design system prevê; o motor tem cerca de 300 strings) | M |
| Overlay de atalhos (tecla `?`) | P |
| As 9 abas em 2 linhas pesam; agrupar em 3 seções (CRIAR, TOCAR, SAIR) com sub-abas | P |
| "Modo palco": oculta tudo menos transporte, composições e camadas, com botões maiores para tela de toque | P |
| Aviso de primeira execução sobre fotossensibilidade e sobre o limitador | P |

## 5. A skill

| Item | Problema | Proposta | Esforço |
|---|---|---|---|
| **Instalação** | `git clone` + script. Nenhum caminho de atualização além de `git pull`. | Criar `.claude-plugin/plugin.json` e `marketplace.json`. O usuário roda `/plugin marketplace add SEU-USUARIO/ai-vj-generator` e depois `/plugin install ai-vj-generator`. Para o claude.ai, publicar o zip da skill como asset de cada release. | P |
| **JSON Schema formal** | O schema só existe em Markdown; os scripts validam pouco (só `compositions` e `layers`). | Gerar `schema/project.schema.json` (draft 2020-12) a partir do `GEN` do motor. Os scripts de build validam por ele e a skill o cita, o que dá autocompletar em editores. | P |
| **Avaliação contínua** | O teste RED/GREEN foi feito à mão, uma vez. | `evals/` com 6 cenários (LED, projeção vertical, instalação contemplativa, "só me dá o JSON", pedido de NDI, briefing em inglês) e critérios verificáveis: FPS válido, 5 geradores primários distintos, nenhum `Math.random`, honestidade sobre bridges, JSON que passa no schema. Rodar com `claude plugin eval` antes de cada release. | M |
| **Gatilho em português** | A descrição está em inglês; pedidos como "telão", "projeção mapeada" e "visual pro show" funcionam por semântica, mas não são garantidos. | Acrescentar 4 ou 5 termos PT-BR à descrição (ainda cabem cerca de 600 caracteres). | P |
| **Tamanho do SKILL.md** | 745 palavras, acima da meta de 500 do guia de autoria. | Mover a tabela "Fixed rules" para `references/art-direction.md` e deixar no SKILL.md só os red flags. | P |
| **Shaders escritos pelo Claude** | Um GLSL inválido só aparece quando o usuário abre o HTML. | Script `check_glsl` (glslangValidator em WASM ou um teste mínimo com headless-gl) chamado pelo `make_artifact`. | M |
| **Vídeo ou imagem do usuário** | A skill não sabe pedir nem aproveitar a mídia. | Uma pergunta da rodada 3 que gera camadas IMAGEM e VÍDEO já posicionadas, com `media` apontando para o nome do arquivo. | P |

## 6. Repositório e open source

| Item | Esforço |
|---|---|
| Trocar `SEU-USUARIO` em `README.md` (2), `INSTALL.md` (2), `docs/APRESENTACAO.md` (1) e `docs/install-mindmap.svg` (1), e então fazer o push | P |
| GitHub Pages ligado: o gerador fica online em `https://SEU-USUARIO.github.io/ai-vj-generator/` | P |
| GitHub Actions: `node scripts/check.mjs` + testes com Playwright (console sem erro, emenda do loop, alpha > 50%, export de 1 compasso) a cada PR | M |
| GIF ou vídeo de 15 s no topo do README (STANDARD → explodir → exemplo LED), que é o que vende em open source | P |
| Templates de issue (bug, gerador novo, preset de shader) e `CODE_OF_CONDUCT.md` | P |
| Release 1.0.0 com o zip da skill e o HTML pronto como assets | P |
| Nota de marca e de fontes (ver Riscos) | P |
| Modularizar o motor: `src/*.js` com build para o arquivo único (esbuild, só no desenvolvimento). Facilita PRs de geradores sem tocar nas 2.252 linhas. | M |

## 7. Roadmap sugerido

| Versão | Foco | Itens |
|---|---|---|
| **1.0.1** (hotfix, cerca de 1 dia) | Corrigir e publicar | Export em GPU, caches de `post` e `bg`, TAP/RESYNC, limitador de flashes, refazer, `SEU-USUARIO`, nota de marca, push, Pages, release |
| **1.1** (1–2 semanas) | Tocar ao vivo | MIDI + learn + clock, modulação LFO, troca quantizada, presets, mídia persistente, test card, plugin do Claude Code |
| **1.2** (2–3 semanas) | Exportar melhor | Export para pasta em streaming, gravação offline em resolução cheia (WebCodecs), CI com Playwright, JSON Schema, evals da skill |
| **2.0** (1–2 meses) | Motor novo | Compositor WebGL único (feedback, máscaras, blends reais), crossfader A/B, setlist, shaders novos, EN/PT, encoder HAP |

## 8. O que não mudar

- O relógio por quadros e o hash com seed: são a razão de o loop fechar e de o projeto ser reproduzível.
- A separação entre skill e motor: o Claude escreve direção (JSON e GLSL), nunca o renderer.
- A tabela de transporte honesta: qualquer bridge nova entra como "requer bridge" até existir de fato.
- O STANDARD como baseline fiel: melhorias de performance não podem mudar o visual dele; um teste de pixels pode garantir isso.
