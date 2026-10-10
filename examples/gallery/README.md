# Galeria de referência

Oito briefs curados (clima x superfície). Cada um vira um projeto **sem IA** (`scripts/brief_to_project.py`), é medido pelo avaliador estrutural (`scripts/evaluate.mjs`) e tem folha de contato (6 quadros do loop por composição, de cima para baixo).

**A nota mede defeitos estruturais** (hierarquia, contraste, densidade, respiro, movimento, arco, repetição). Nota alta quer dizer "sem defeito de estrutura", não "bonito": olhe as folhas de contato. A meta da galeria é toda composição com nota >= 75 **e** aprovada pelo seu olhar.

Regenerar: `node scripts/gallery.mjs`. Conferir: `node scripts/gallery.mjs --check` (roda dentro do `check.mjs`).

| Brief | Superfície | Clima | BPM | Notas por composição | Set |
|---|---|---|---|---|---|
| `01-pressao-led` | led 4500×800 | industrial, glitch | 132 | INDUSTRIAL I: **89** · GLITCH II: **76** · INDUSTRIAL III: **87** | **84** |
| `02-jardim-tela` | screen 1920×1080 | organic, calm | 96 | ORGANIC I: **98** · CALM II: **88** · ORGANIC III: **85** | **90** |
| `03-vertical-cosmos` | screen 1080×1920 | cosmic | 90 | COSMIC I: **87** · COSMIC II: **79** · COSMIC III: **79** | **82** |
| `04-torre-urbana` | led 540×1920 | urban, aggressive | 140 | URBAN I: **88** · AGGRESSIVE II: **81** · URBAN III: **92** | **87** |
| `05-ritual-mapping` | mapping 1920×1080 | ritual | 84 | RITUAL I: **90** · RITUAL II: **100** · RITUAL III: **91** | **94** |
| `06-glitch-parede` | led 4500×2160 | glitch, retro | 150 | GLITCH I: **97** · RETRO II: **90** · GLITCH III: **95** | **94** |
| `07-liquido-tela` | screen 1920×1080 | liquid, calm | 78 | LIQUID I: **87** · CALM II: **83** · LIQUID III: **83** | **84** |
| `08-minimal-multi` | multi 5760×1080 | minimal | 70 | MINIMAL I: **82** · MINIMAL II: **84** · MINIMAL III: **95** | **87** |

## Pressure Test (`01-pressao-led`)

> A wall of cold signal that tightens with the beat and releases on the break; the crowd should feel contained pressure.

![01-pressao-led-01_INDUSTRIAL_I.jpg](contato/01-pressao-led-01_INDUSTRIAL_I.jpg)

![01-pressao-led-02_GLITCH_II.jpg](contato/01-pressao-led-02_GLITCH_II.jpg)

![01-pressao-led-03_INDUSTRIAL_III.jpg](contato/01-pressao-led-03_INDUSTRIAL_III.jpg)

- **INDUSTRIAL I** — 89/100 · hierarchy 71 · contrast 100 · density 100 · breathing 77 · motion 100 · arc 85 · repetition 100
- **GLITCH II** — 76/100 · hierarchy 59 · contrast 44 · density 100 · breathing 67 · motion 100 · arc 85 · repetition 100
- **INDUSTRIAL III** — 87/100 · hierarchy 98 · contrast 51 · density 100 · breathing 80 · motion 100 · arc 85 · repetition 100

## Jardim de Luz (`02-jardim-tela`)

> Um organismo de luz que cresce devagar e respira com a música; o público deve sentir cuidado e espanto.

![02-jardim-tela-01_ORGANIC_I.jpg](contato/02-jardim-tela-01_ORGANIC_I.jpg)

![02-jardim-tela-02_CALM_II.jpg](contato/02-jardim-tela-02_CALM_II.jpg)

![02-jardim-tela-03_ORGANIC_III.jpg](contato/02-jardim-tela-03_ORGANIC_III.jpg)

- **ORGANIC I** — 98/100 · hierarchy 100 · contrast 100 · density 100 · breathing 87 · motion 100 · arc 100 · repetition 100
- **CALM II** — 88/100 · hierarchy 66 · contrast 100 · density 100 · breathing 68 · motion 100 · arc 100 · repetition 100
- **ORGANIC III** — 85/100 · hierarchy 69 · contrast 100 · density 88 · breathing 47 · motion 100 · arc 100 · repetition 100

## Poço Cósmico (`03-vertical-cosmos`)

> Uma queda lenta por um poço de estrelas em uma tela vertical; vertigem suave, sem pressa.

![03-vertical-cosmos-01_COSMIC_I.jpg](contato/03-vertical-cosmos-01_COSMIC_I.jpg)

![03-vertical-cosmos-02_COSMIC_II.jpg](contato/03-vertical-cosmos-02_COSMIC_II.jpg)

![03-vertical-cosmos-03_COSMIC_III.jpg](contato/03-vertical-cosmos-03_COSMIC_III.jpg)

- **COSMIC I** — 87/100 · hierarchy 47 · contrast 81 · density 100 · breathing 100 · motion 100 · arc 100 · repetition 100
- **COSMIC II** — 79/100 · hierarchy 53 · contrast 23 · density 100 · breathing 100 · motion 100 · arc 100 · repetition 100
- **COSMIC III** — 79/100 · hierarchy 53 · contrast 26 · density 93 · breathing 100 · motion 100 · arc 100 · repetition 100

## Sirene (`04-torre-urbana`)

> Faixas e palavras gritadas em uma torre estreita de LED, como sinal de rua à noite.

![04-torre-urbana-01_URBAN_I.jpg](contato/04-torre-urbana-01_URBAN_I.jpg)

![04-torre-urbana-02_AGGRESSIVE_II.jpg](contato/04-torre-urbana-02_AGGRESSIVE_II.jpg)

![04-torre-urbana-03_URBAN_III.jpg](contato/04-torre-urbana-03_URBAN_III.jpg)

- **URBAN I** — 88/100 · hierarchy 54 · contrast 100 · density 100 · breathing 100 · motion 84 · arc 100 · repetition 100
- **AGGRESSIVE II** — 81/100 · hierarchy 73 · contrast 62 · density 100 · breathing 50 · motion 99 · arc 100 · repetition 100
- **URBAN III** — 92/100 · hierarchy 69 · contrast 86 · density 100 · breathing 100 · motion 100 · arc 100 · repetition 100

## Brasa (`05-ritual-mapping`)

> Anéis de brasa em volta de um objeto no palco, como um ritual que se acende e se apaga.

![05-ritual-mapping-01_RITUAL_I.jpg](contato/05-ritual-mapping-01_RITUAL_I.jpg)

![05-ritual-mapping-02_RITUAL_II.jpg](contato/05-ritual-mapping-02_RITUAL_II.jpg)

![05-ritual-mapping-03_RITUAL_III.jpg](contato/05-ritual-mapping-03_RITUAL_III.jpg)

- **RITUAL I** — 90/100 · hierarchy 65 · contrast 100 · density 100 · breathing 100 · motion 93 · arc 85 · repetition 100
- **RITUAL II** — 100/100 · hierarchy 100 · contrast 100 · density 100 · breathing 100 · motion 100 · arc 100 · repetition 100
- **RITUAL III** — 91/100 · hierarchy 95 · contrast 100 · density 100 · breathing 62 · motion 100 · arc 85 · repetition 100

## Falha Geral (`06-glitch-parede`)

> Uma parede grande quebrando em blocos magenta, falhas que reorganizam a imagem no tempo da bateria.

![06-glitch-parede-01_GLITCH_I.jpg](contato/06-glitch-parede-01_GLITCH_I.jpg)

![06-glitch-parede-02_RETRO_II.jpg](contato/06-glitch-parede-02_RETRO_II.jpg)

![06-glitch-parede-03_GLITCH_III.jpg](contato/06-glitch-parede-03_GLITCH_III.jpg)

- **GLITCH I** — 97/100 · hierarchy 94 · contrast 100 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100
- **RETRO II** — 90/100 · hierarchy 63 · contrast 100 · density 100 · breathing 100 · motion 99 · arc 85 · repetition 100
- **GLITCH III** — 95/100 · hierarchy 84 · contrast 100 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100

## Correnteza (`07-liquido-tela`)

> Água azul deslizando sobre água azul; calma que não é vazia.

![07-liquido-tela-01_LIQUID_I.jpg](contato/07-liquido-tela-01_LIQUID_I.jpg)

![07-liquido-tela-02_CALM_II.jpg](contato/07-liquido-tela-02_CALM_II.jpg)

![07-liquido-tela-03_LIQUID_III.jpg](contato/07-liquido-tela-03_LIQUID_III.jpg)

- **LIQUID I** — 87/100 · hierarchy 100 · contrast 27 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100
- **CALM II** — 83/100 · hierarchy 81 · contrast 26 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100
- **LIQUID III** — 83/100 · hierarchy 56 · contrast 62 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100

## Vão (`08-minimal-multi`)

> Um círculo e quatro linhas em três telas lado a lado; o silêncio entre as telas faz parte da peça.

![08-minimal-multi-01_MINIMAL_I.jpg](contato/08-minimal-multi-01_MINIMAL_I.jpg)

![08-minimal-multi-02_MINIMAL_II.jpg](contato/08-minimal-multi-02_MINIMAL_II.jpg)

![08-minimal-multi-03_MINIMAL_III.jpg](contato/08-minimal-multi-03_MINIMAL_III.jpg)

- **MINIMAL I** — 82/100 · hierarchy 96 · contrast 4 · density 100 · breathing 98 · motion 100 · arc 85 · repetition 100
- **MINIMAL II** — 84/100 · hierarchy 78 · contrast 37 · density 100 · breathing 100 · motion 100 · arc 85 · repetition 100
- **MINIMAL III** — 95/100 · hierarchy 81 · contrast 96 · density 100 · breathing 100 · motion 98 · arc 100 · repetition 100
