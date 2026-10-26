# Índice de referências e tentativas com o `/vj`

Tentativas reais de uso do AI VJ Generator, recuperadas em 2026-10-26 dos artifacts da autora no claude.ai: **3 projetos completos** (`*.aivj.json`), **4 objetos 3D**, o padrão de **vídeo de câmera** e **784 quadros renderizados** em 22 conjuntos, cada um com folha de contato.

**O que este índice não tem.** Os artifacts guardam as **saídas** (renders e projetos), não os arquivos de referência de entrada, isto é, as imagens e os vídeos que foram anexados no chat do `/vj`. Esses não estavam em nenhum dos artifacts lidos. Para indexá-los, é preciso subir os arquivos (ou dizer onde estão).

**Licença.** Os objetos 3D trazem `public domain (CC0)` no cabeçalho. Para os projetos e os quadros, a licença é decisão da autora e está em aberto.

## 1. Projetos (`examples/tentativas/`)

Cada arquivo é um projeto `ai-vj-generator/2` completo, com briefing, contrato criativo, composições e materiais embutidos. Abra no motor com **Carregar**. Os três passam no `schema_check.py` e no `validate_project.py` (0 erros; os avisos são parâmetros `cx`/`cy` e similares que o motor ignora).

| Projeto | Superfície | BPM | Composições (camadas) | Semente | Materiais embutidos |
|---|---|---|---|---|---|
| [**TECNOFEUDO SMART SAMPA**](../examples/tentativas/tecnofeudo-smart-sampa.aivj.json) | LED 3840×1920, passo 3,9 mm, visão de 8 a 40 m | 120, 4 compassos | POSTE (13) · DRONES (13) · PERFIS (12) · TERMAL (12) | 130191 | `poste.obj`, `drone.obj`, `helicoptero.obj` |
| [**TECNOFEUDO RADAR**](../examples/tentativas/tecnofeudo-radar.aivj.json) | LED 3840×1920, passo 3,9 mm, visão de 8 a 40 m | 120, 4 compassos | RADAR (14) · CÂMERA (15) · SIGILO (13) · PAINEL (14) | 800907 | `camera.obj`, `drone.obj`, `helicoptero.obj` |
| [**TECNOFEUDO SURVEILLANCE**](../examples/tentativas/tecnofeudo-surveillance.aivj.json) | LED 3840×1080, passo 3,9 mm, visão de 8 a 40 m | 120, 4 compassos | OLHO (10) · PLACAS (10) · FÓRMULA (11) · CIBERSIGILO (10) | 340566 | nenhum |

Em comum: loop de 4 compassos (240 quadros a 30 fps), transição `slices`, áudio `structural`, e o banido "neon glow, lens flares, partículas aleatórias". Os três registram em `meta.spec.assumed` que a superfície foi assumida a partir do briefing sem IA e pedem **confirmar o pixel map e as distâncias com o local antes de entregar**.

- **Smart Sampa.** Briefing: *vigilância urbana como arquitetura de extração: câmeras, drones e dados de pessoas alimentam uma tecnocracia; o sistema lê a cidade em calor e em pixels.* Evento focal: os lasers infravermelhos do poste travam no chão e o contador de câmeras sorteia. Paleta: fundo `#060608`, primária `#FF2A3D`, secundária `#8C8C96`, acento `#F2F2F2`.
- **Radar.** Briefing: *vigilância como infraestrutura de poder, lida de dentro: radar, câmera, sigilo e painel de terreno; o sistema é exposto, medido e devolvido ao público.* Evento focal: a varredura do radar trava um alvo e o quadro desloca em glitch. Paleta: fundo `#050505`, primária `#FF1F2E`, secundária `#8C8C96`, acento `#F2F2F2`.
- **Surveillance.** Briefing: *vigilância como arquitetura: a câmera vê, o sistema cobre o mundo com placas sólidas e só abre furos onde detecta um corpo. Contenção, medição, ordem.* Evento focal: a placa sólida vermelha abre furos exatamente onde o blob é detectado, e o contador de alvos salta. Paleta: fundo `#050505`, primária `#FF1F3D`, secundária `#8A8A8A`, acento `#E8E8E8`.

Para renderizar sem abrir a interface: `node scripts/render.mjs examples/tentativas/tecnofeudo-radar.aivj.json --out saida --format png --alpha`.

## 2. Materiais usados

### Objetos 3D (`examples/assets/3d/`)

Os quatro foram escritos de forma procedural para o AI VJ Generator (cabeçalho `# procedural, public domain (CC0), written for AI VJ Generator`) e entram no projeto pela camada **Objeto 3D**. Nos projetos, todos são renderizados como nuvem de pontos, exceto a camada CÂMERA ARAME, que usa wireframe.

| Arquivo | Vértices | Faces | Tamanho | Camadas que o usam |
|---|---|---|---|---|
| `poste.obj` | 334 | 568 | 15,6 KB | Smart Sampa: POSTE › POSTE DE CÂMERAS |
| `drone.obj` | 372 | 656 | 17,7 KB | Smart Sampa: DRONES › DRONE A e B · Radar: CÂMERA e SIGILO › DRONE A e B |
| `helicoptero.obj` | 358 | 608 | 16,6 KB | Smart Sampa: DRONES › HELICÓPTERO · embutido no Radar, mas sem camada que o use |
| `camera.obj` | 476 | 832 | 22,5 KB | Radar: CÂMERA › CÂMERA DE SEGURANÇA e CÂMERA ARAME |

### Slot de vídeo da câmera

Todas as composições dos três projetos têm uma camada **CÂMERA** do tipo vídeo, **desligada**, apontando para `camera.mp4`. No Smart Sampa e no Radar, cada composição tem também um shader **STAND-IN CÂMERA** no lugar; no Surveillance só a composição OLHO tem esse shader, e nas outras três a camada CÂMERA fica desligada sem stand-in. O papel dela, escrito no próprio projeto: *captura de câmera do usuário; importar em Mídia como `camera.mp4`, ligar esta camada e desligar o stand-in.* É o padrão do projeto para "traga o seu vídeo": a composição funciona sem ele e melhora quando ele entra. O vídeo não viaja dentro do JSON (só no navegador onde foi importado).

### O que não aparece nestes projetos

Nenhum dos três embute logo, imagem raster ou fonte importada. O texto usa as fontes do próprio motor (`mono` e `archivo`). Então, **nestas tentativas, o único material próprio trazido para dentro do projeto foram os objetos 3D**; vale subir logos, imagens, vídeos e fontes nas próximas (veja [o README](../README.md#instalação-no-claude-com-vj)).

## 3. Quadros renderizados (`docs/assets/referencias/`)

Cada imagem é uma folha de contato com 6 quadros igualmente espaçados do conjunto. Os nomes e os rótulos vêm do reel "Reel AI VJ Generator".

### 5 testes, 1 briefing

Briefing do reel: *parede dupla em L · video mapping · teste de direção de arte.* Cada teste tem 6 quadros do loop.

| Teste | Resolução dos quadros | Conteúdo (legenda do reel) |
|---|---|---|
| 01 ALVOS · 32:9 | 1184×329 | relevo, alvos rastreados, régua, coordenadas |
| 02 LATITUDE · 2:1 | 694×329 | mapa em pontos, formas cromadas, coordenadas |
| 03 SINAL · 2:1 | 694×329 | mosaico, tipografia em bloco, formas cromadas |
| 04 SMART SAMPA · 2:1 | 667×329 | log, torre em malha, contador, telemetria |
| 05 DRONES · 2:1 | 667×329 | drones em pontos, terreno, rastreio, racks |

![Teste 01 ALVOS](assets/referencias/teste-01-alvos.webp)
![Teste 02 LATITUDE](assets/referencias/teste-02-latitude.webp)
![Teste 03 SINAL](assets/referencias/teste-03-sinal.webp)
![Teste 04 SMART SAMPA](assets/referencias/teste-04-smart-sampa.webp)
![Teste 05 DRONES](assets/referencias/teste-05-drones.webp)

Os nomes SMART SAMPA e DRONES coincidem com o projeto e com uma composição dos arquivos da seção 1, mas **não confirmei** que os testes do reel sejam esses projetos.

### Palco de 4 telas (1832×660)

Preview com IMAG SR, BACKSCREEN, IMAG SL e BOOTH. 40 quadros por conjunto, reduzidos para 1100×396.

![Palco 01 CALIBRAÇÃO](assets/referencias/palco-01-calibracao.webp)
![Palco 03 VIDRO](assets/referencias/palco-03-vidro.webp)

### HANDSHAKE 握手 · LIMÃO

Parede de 4500×800 com quina em 2250 px. Briefing em JSON no reel: `id: handshake-limao`, 132 BPM em 4 compassos, cor "lima ácido, preto, cinzas, branco", forma "lajes chanfradas e tubos 45°", semente 20261006, descrito como *set techno cyberpunk*. 48 quadros por conjunto.

![HANDSHAKE 02 TUBULAÇÃO](assets/referencias/handshake-02-tubulacao.webp)
![HANDSHAKE 04 TERMINAL](assets/referencias/handshake-04-terminal.webp)

### META: parede dupla em L, 5120×500

Duas paredes de 2560×500. Sete clipes (META_01, 03, 05, 06, 07, 08 e 09; os conjuntos 02 e 04 não estão nos artifacts), 48 quadros cada, em 1776×174.

![META 01](assets/referencias/meta-01.webp)
![META 03](assets/referencias/meta-03.webp)
![META 05](assets/referencias/meta-05.webp)
![META 06](assets/referencias/meta-06.webp)
![META 07](assets/referencias/meta-07.webp)
![META 08](assets/referencias/meta-08.webp)
![META 09](assets/referencias/meta-09.webp)

### REDES MATA NEGRA, 2816×768

Duas composições: **02 FLOR DE RASTREIO** (prunus, 5 pétalas, simetria radial; 60 quadros) e **03 MICÉLIO E FLUXO** (29 nós, 5 colunas de fluxo, 30 fps; 57 quadros), em 888×242.

![REDES 02 FLOR DE RASTREIO](assets/referencias/redes-02-flor-de-rastreio.webp)
![REDES 03 MICÉLIO E FLUXO](assets/referencias/redes-03-micelio-e-fluxo.webp)

### Capturas do próprio motor

- **Mostrar camadas** (73 quadros, 888×741): captura real do botão *Mostrar camadas* do AI VJ Generator, com a pilha aberta em 3D e cada camada com o seu nome; os primeiros quadros são a vista normal.
- **Canvas Expand** (40 quadros, 888×555): captura da ferramenta em gyulyia.com/tools, mostrada no reel logo depois do comando de exemplo `/vj fachada 4:3, 120 BPM, vigilância`.

![Motor, Mostrar camadas](assets/referencias/motor-show-layers.webp)
![Canvas Expand](assets/referencias/motor-canvas-expand.webp)

### Extras sem legenda

`N6` e `N10` (6 quadros cada, 667×329 e 694×329) estão nos artifacts mas **não são usados** no reel e não têm legenda. Ficam aqui como referência visual.

![Extra N6](assets/referencias/extra-n6.webp)
![Extra N10](assets/referencias/extra-n10.webp)

## 4. De onde vem

Os artifacts são **privados** (só a autora abre); os links servem para ela.

| Artifact | Atualizado | O que tem | Indexado |
|---|---|---|---|
| [Reel AI VJ Generator](https://claude.ai/artifact/CTziRW4nJjVUMzyPfrCugv) | 2026-10-24 | 9 arquivos `f_*.js` com os quadros e o `index.html` do reel (canvas 1080×1920) | seção 3 |
| [Story AI VJ Generator](https://claude.ai/artifact/7f7jwAT16SqgZu1xqxCgwZ) | 2026-10-24 | os mesmos `f_*.js` do reel, menos `f_redes.js` (tamanhos de arquivo iguais) | repete a seção 3 |
| Reel AI VJ Generator (Copy) e (Copy)(Copy) | 2026-10-24 | cópias do reel (não comparei byte a byte) | não |
| [Tecnofeudo Smart Sampa](https://claude.ai/artifact/FS6kS27btvzGWhrwbWt83q) | 2026-10-24 | motor + projeto embutido | seção 1 |
| [Tecnofeudo Radar](https://claude.ai/artifact/2j3jEb5wMufkw7y479tRMR) | 2026-10-23 | motor + projeto embutido | seção 1 |
| [Tecnofeudo Surveillance](https://claude.ai/artifact/6UXBtHAXkDoibu96ekVVeU) | 2026-10-22 | motor + projeto embutido | seção 1 |
| [AI VJ Generator](https://claude.ai/artifact/X92F1hCgAhcqGx35ixsB89) | 2026-10-09 | build do motor sem projeto ("Aguardando briefing") | sem material |
| [Stage Composer](https://claude.ai/artifact/7YRSkRq36qqMPvE6EDWc5w) | 2026-09-27 | ferramenta anterior (Blueprint, Pixel map, 3D), sem imagens embutidas | sem material |

**Não abertos (candidatos):** GYULYIA® LAYER FORGE e LAYER FORGE · Projeto Mãe, Motor de camadas · Tendal da Lapa, CONSOLE 01 e 02, Cyberpunk Brasilidades · Fachada, CORNER//GRID, GYULYIA Reel Templates e FIRMAMENTO Stage Visuals. Podem ter mais tentativas; diga quais indexar.

## 5. Reutilizar

- **Abrir um projeto:** motor → **Carregar** → escolher o `.aivj.json`. Ou renderizar pela linha de comando (comando na seção 1).
- **Usar um objeto 3D:** aba **Mídia** → **Objeto 3D** → escolher o `.obj`; em **Parâm.** escolha o render (shader, wireframe ou nuvem de pontos). Detalhes em [README › Leve seus materiais](../README.md#instalação-no-claude-com-vj).
- **Trocar o stand-in pela sua câmera:** importar o vídeo como `camera.mp4`, ligar a camada CÂMERA e desligar o STAND-IN.
