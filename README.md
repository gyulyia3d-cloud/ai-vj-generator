# AI VJ Generator

**Skill para o Claude + motor de composição generativa para VJs.** Você digita `/vj`, descreve o set e anexa referências; o Claude analisa o briefing, as imagens e os vídeos, conversa com você, e cria do zero um sistema visual em camadas, aberto num gerador ao vivo pronto para projetar, gravar ou exportar em PNG com alpha para o Resolume. Sem presets, sem modelos: cada projeto nasce só do seu briefing.

*Claude skill + generative composition engine for VJs. Describe the set, the space and the music; Claude interviews you, sets the art direction and hands you a live generator with 5 layered compositions, ready to project, record or export as alpha PNG sequences for Resolume. English summary below.*

![Como instalar — mapa mental](docs/install-mindmap.svg)

**Documentação:** [docs/README.md](docs/README.md) · começo rápido (com Claude, outra IA ou sem IA): [docs/QUICKSTART.md](docs/QUICKSTART.md) · roadmap: [docs/ROADMAP.md](docs/ROADMAP.md)

## Instalação em um comando

macOS / Linux:

```bash
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git && cd ai-vj-generator && sh install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git; cd ai-vj-generator; powershell -ExecutionPolicy Bypass -File install.ps1
```

O instalador copia as 4 skills de `skill/` para `~/.claude/skills/`. Reinicie o Claude Code e digite: `/vj set de techno industrial, LED 5120×500, 132 BPM, anexei duas referências`. Guia completo, incluindo claude.ai: [INSTALL.md](INSTALL.md).

**Sem o Claude:** abra `app/index.html` no navegador (ou rode `node scripts/serve.mjs` e acesse `http://localhost:5173`). A interface **não inventa animações**: ela abre com "Aguardando briefing" e carrega o projeto que o Claude escreveu (ou um JSON colado). O botão STANDARD abre a biblioteca original de camadas.

## O que ele faz

| | |
|---|---|
| **Comandos `/`** | `/vj <briefing>` conduz tudo do zero; `/vj-reference` só analisa anexos; `/vj-critique` avalia um projeto pronto e propõe mutações; `/how-to-use` explica tudo (EN e PT-BR) e roda sozinho no primeiro uso. |
| **Entrevista no chat** | Perguntas em rodadas de até 4, só as que mudam a solução e ancoradas no que foi medido nos anexos. Só o técnico tem padrão; paleta, conceito e composições vêm do briefing. |
| **Anexos analisados** | Imagens e vídeos viram medições (paleta em OKLab, peso visual, simetria, periodicidade, cortes, movimento de câmera) mais a leitura do Claude, e então um princípio, nunca uma cópia. Requer `pip install pillow numpy`; vídeo também precisa de ffmpeg. |
| **Gramática visual** | O briefing vira 9 decisões: forma, movimento, ritmo, cor, densidade, profundidade, textura, transição, relação sonora. |
| **3 a 5 composições distintas** | Hipóteses derivadas do tema, cada uma com regra, princípio de animação, técnica e hierarquia próprios, e nomes tirados do briefing. Sem lista padrão. |
| **Repertório** | História da arte, design suíço, cor, animação, tipografia cinética, arte generativa, padrões com receitas GLSL, artistas e estúdios, bibliotecas e licenças, em formato referência → princípio → parâmetro. |
| **Validação antes de entregar** | `validate_project.py` pega parâmetro com erro de digitação, FPS inválido, erros de GLSL ES 1.00 e sinais de template (nomes genéricos, paleta pronta, exemplo copiado). |
| **Camadas por composição** | Liga/desliga (teclas 0–9), solo, reordenar, duplicar, renomear, opacidade, blend, copiar e colar parâmetros, explosão 3D da pilha. |
| **Parâmetros** | Slider + campo numérico em tudo: transform, aparência, movimento (velocidade, fase, divisão 1/1…1/16), áudio, gerador. |
| **Camadas fixas** | SHADER (GLSL editável), IMAGEM, VÍDEO, FORMA e TEXTO (fonte importável, tracking, entrelinha, contorno, glow, animação). |
| **Paredes e dobras** | `canvas.folds` divide o mapa em paredes (L, U, cubo). Guia vermelho, calha, geradores medidos a partir da dobra e aviso quando texto cruza a calha. |
| **Camada de código** | Quando nenhum gerador expressa a ideia, a skill escreve o corpo de `draw(c, K)`: roda no relógio determinístico do motor, com kit de tipo em pixel-bloco, símbolos, glitch em bloco, máscaras de logo e variáveis que viram sliders. Filtro de segurança e autorização por projeto (não é uma caixa de areia). |
| **Geradores de parede** | `pixeltext`, `symbols`, `hazard`, `blocks`, `logo` (fit, mosaico, meio-tom, fatiado, degraus, fragmento). |
| **Branco α** | `palette.mode: white-alpha`: figura 100%, apoio 72%, campo 43%; tudo sai branco com opacidade e a cor se escolhe no Resolume. |
| **Arquivos embutidos** | Logos, imagens e fontes viajam dentro do HTML e do JSON (`make-artifact --assets pasta`). `pasta/logos/` vira máscara branca com alpha. |
| **QA headless** | `scripts/contact_sheet.mjs` abre o HTML num Chrome ou Edge sem janela, grava a folha de contato de cada composição (dobras marcadas) e imprime a validação. |
| **Tempo** | BPM global com tap, loop em compassos inteiros, sempre seamless, modos loop / ping-pong / reverse / random / phase / audio / manual, pausa e scrub quadro a quadro. |
| **Áudio** | Reatividade on/off; microfone ou arquivo; bass / mid / high / rms por camada, com suavização. |
| **Canvas** | Qualquer proporção: 16:9, 9:16, 32:9, 5120×500 para paredes em L. A viewport se adapta, com safe area, grade, zoom, 100% e displays recortados. |
| **Export** | PNG sequence com alpha (composição, por camada ou uma camada), branco α para colorir no software, WebM ao vivo, janela de saída para o 2º monitor, project.json reproduzível. |
| **STANDARD** | O motor de camadas original (organismo em filotaxia, estrutura áurea, medição, dados, HUD, evento, pós), portado para relógio por quadros. |
| **Validação** | ERROR / WARNING / OPTIMIZATION antes de exportar: mídia ausente, shader quebrado, loop que não fecha, moiré em LED, canvas grande demais. |

## Engenharia criativa, em uma frase

Cada camada é uma **função pura de (parâmetros, número do quadro)**: o relógio conta quadros, não milissegundos, e toda aleatoriedade sai de um hash com seed. Por isso o mesmo código desenha o preview, o PNG e a gravação, o último quadro encaixa no primeiro, e um `project.json` reproduz a peça inteira em qualquer máquina.

## Estrutura

```
ai-vj-generator/
├── app/index.html               motor completo, um arquivo, sem build
├── skill/                       as skills (instaladas juntas)
│   ├── ai-vj-generator/         a skill principal
│   │   ├── SKILL.md
│   │   ├── references/          fluxo, entrevista, anexos, direção de arte, repertório, schema, saídas, entrega
│   │   ├── scripts/             analyze_image · analyze_video · validate_project · make_artifact · contact_sheet · assets
│   │   └── assets/engine.html   cópia do app (a skill não carrega exemplos)
│   ├── vj/                      comando /vj
│   ├── vj-reference/            comando /vj-reference
│   └── vj-critique/             comando /vj-critique
├── examples/                    dois projetos só para mostrar o formato do arquivo
├── scripts/                     serve · build · sync-skill · check
├── docs/                        análise do prompt, apresentação, mapa de instalação
├── install.sh · install.ps1
└── INSTALL.md · CHANGELOG.md · CONTRIBUTING.md · LICENSE
```

## Transporte de sinal, sem promessa falsa

| Destino | Status |
|---|---|
| Tela cheia, 2º monitor (HDMI, DisplayPort) | Suportado |
| PNG alpha, WebM, JSON | Suportado |
| Resolume, TouchDesigner, Notch, MadMapper | Exportável (PNG → Alley DXV3 α, Movie File In TOP) |
| NDI | Requer bridge: janela de saída → OBS → plugin DistroAV |
| Spout / Syphon | Requer bridge: OBS + plugin, ou TouchDesigner Web Render TOP |
| SDI | Requer bridge: placa Blackmagic / AJA |
| OSC, MIDI, WebSocket | Conceitual (roadmap) |

## Desenvolvimento

```bash
node scripts/serve.mjs          # servidor local em http://localhost:5173
node scripts/sync-skill.mjs     # depois de editar app/index.html
node scripts/check.mjs          # sintaxe, sincronia da skill, exemplos, frontmatter
node scripts/build.mjs examples/noite-filotaxia-1080p.json   # HTML com projeto embutido em dist/
```

Sem dependências de npm. A única biblioteca externa é o JSZip (cdnjs, com SRI), carregado só para o export.

## Roadmap

- Controle por MIDI (Web MIDI) e OSC via bridge local
- Export direto em WebCodecs (H.264 / VP9) quando o navegador suportar alpha
- Mais geradores: reaction-diffusion, feedback, SDF 3D
- Editor de timeline para sequenciar as composições no set

## English summary

AI VJ Generator is an open-source Claude skill plus a single-file browser engine. The skill interviews you about the venue (LED, projection, mapping, multi-screen), the mood and the music, then writes a PROJECT JSON: a visual grammar and five compositions, each with its own hero generator and independent layers. The engine renders it live with per-layer parameters (slider and numeric input), BPM sync, optional audio reactivity, an exploded 3D layer view, and frame-exact seamless loops. Export alpha PNG sequences (per composition or per layer) for Resolume via Alley/DXV3, record WebM, or open output windows. NDI, Spout and Syphon are documented as bridge workflows, never faked. Install with `sh install.sh` (or `install.ps1` on Windows) and ask Claude for visuals.

## Créditos

Criado por **GYULYIA** — Giulia Ribeiro, artista de visuais em tempo real, São Paulo. Design system GYULYIA (monocromático, Martian Mono). A linguagem do modo STANDARD estuda o Graphic Realism; todos os glifos, códigos e pictogramas são originais.

[gyulyia.com](https://gyulyia.com) · [@gyulyia](https://instagram.com/gyulyia) · Licença [MIT](LICENSE)
