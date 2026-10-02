# AI VJ Generator

**Skill para o Claude + motor de composição generativa para VJs.** Você descreve o set, o espaço e a música; o Claude entrevista, define a direção de arte e entrega um gerador ao vivo com 5 composições em camadas, pronto para projetar, gravar ou exportar em PNG com alpha para o Resolume.

*Claude skill + generative composition engine for VJs. Describe the set, the space and the music; Claude interviews you, sets the art direction and hands you a live generator with 5 layered compositions, ready to project, record or export as alpha PNG sequences for Resolume. English summary below.*

![Como instalar — mapa mental](docs/install-mindmap.svg)

## Instalação em um comando

macOS / Linux:

```bash
git clone https://github.com/SEU-USUARIO/ai-vj-generator.git && cd ai-vj-generator && sh install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/SEU-USUARIO/ai-vj-generator.git; cd ai-vj-generator; powershell -ExecutionPolicy Bypass -File install.ps1
```

O instalador copia `skill/ai-vj-generator` para `~/.claude/skills/`. Reinicie o Claude Code e peça: *"quero visuais para meu set de techno, LED 5120×500, 132 BPM"*. Guia completo, incluindo claude.ai: [INSTALL.md](INSTALL.md).

**Sem o Claude:** abra `app/index.html` no navegador (ou rode `node scripts/serve.mjs` e acesse `http://localhost:5173`). O entrevistador embutido gera as 5 composições por regras; o botão STANDARD carrega o motor de camadas original.

## O que ele faz

| | |
|---|---|
| **Entrevistador** | Perguntas progressivas, só as que mudam a solução: superfície e pixels, sensação, BPM e áudio, software de destino. O resto vira padrão declarado. |
| **Gramática visual** | O briefing vira 9 decisões: forma, movimento, ritmo, cor, densidade, profundidade, textura, transição, relação sonora. |
| **5 composições** | Estrutura, fluxo, densidade, ritmo e transformação. Cada uma tem um gerador herói diferente e uma hipótese própria, com nomes vindos do briefing. |
| **Camadas por composição** | Liga/desliga (teclas 0–9), solo, reordenar, duplicar, renomear, opacidade, blend, copiar e colar parâmetros, explosão 3D da pilha. |
| **Parâmetros** | Slider + campo numérico em tudo: transform, aparência, movimento (velocidade, fase, divisão 1/1…1/16), áudio, gerador. |
| **Camadas fixas** | SHADER (GLSL editável), IMAGEM, VÍDEO, FORMA e TEXTO (fonte importável, tracking, entrelinha, contorno, glow, animação). |
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
├── skill/ai-vj-generator/       a skill (autocontida)
│   ├── SKILL.md
│   ├── references/              entrevista, direção de arte, schema, saídas, entrega
│   ├── scripts/                 make_artifact.py · make-artifact.mjs
│   └── assets/                  engine.html (cópia do app) · examples/
├── examples/                    projetos prontos (LED 5120×500, 1080p)
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
- Editor de timeline para sequenciar as 5 composições no set

## English summary

AI VJ Generator is an open-source Claude skill plus a single-file browser engine. The skill interviews you about the venue (LED, projection, mapping, multi-screen), the mood and the music, then writes a PROJECT JSON: a visual grammar and five compositions, each with its own hero generator and independent layers. The engine renders it live with per-layer parameters (slider and numeric input), BPM sync, optional audio reactivity, an exploded 3D layer view, and frame-exact seamless loops. Export alpha PNG sequences (per composition or per layer) for Resolume via Alley/DXV3, record WebM, or open output windows. NDI, Spout and Syphon are documented as bridge workflows, never faked. Install with `sh install.sh` (or `install.ps1` on Windows) and ask Claude for visuals.

## Créditos

Criado por **GYULYIA** — Giulia Ribeiro, artista de visuais em tempo real, São Paulo. Design system GYULYIA (monocromático, Martian Mono). A linguagem do modo STANDARD estuda o Graphic Realism; todos os glifos, códigos e pictogramas são originais.

[gyulyia.com](https://gyulyia.com) · [@gyulyia](https://instagram.com/gyulyia) · Licença [MIT](LICENSE)
