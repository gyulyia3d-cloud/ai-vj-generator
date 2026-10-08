# Instalação

Três caminhos, do mais simples ao mais completo. Escolha um.

## A. Só o gerador (sem Claude, sem instalar nada)

1. Baixe o repositório: botão **Code → Download ZIP** no GitHub, e descompacte.
2. Dê dois cliques em `app/index.html`.
3. A interface abre em "Aguardando briefing": cole o PROJECT JSON (do Claude, de outra IA ou do gerador sem IA), ou clique em **Abrir demonstração (sem IA)**. Para criar um projeto novo, use o Claude (caminho B ou C).

Para microfone e janelas de saída, o navegador exige um endereço `http://`. Com [Node.js](https://nodejs.org) 18 ou mais recente:

```bash
node scripts/serve.mjs
```

Abra `http://localhost:5173`.

## B. Skill no Claude Code

Pré-requisitos: [Git](https://git-scm.com) e [Claude Code](https://claude.com/claude-code).

macOS / Linux:

```bash
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git && cd ai-vj-generator && sh install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git; cd ai-vj-generator; powershell -ExecutionPolicy Bypass -File install.ps1
```

O instalador copia as 4 pastas de `skill/` para `~/.claude/skills/`: `ai-vj-generator` (a skill principal) e os comandos `vj`, `vj-reference` e `vj-critique`. Instale as quatro juntas, porque os comandos apontam para a principal na pasta ao lado. Para instalar só num projeto, copie as mesmas pastas para `.claude/skills/` dentro dele.

Reinicie o Claude Code e digite, por exemplo:

> /vj Set de techno industrial: LED 5120×500 em duas paredes em L, 132 BPM, vou levar pro Resolume com alpha. Anexei um print e um vídeo de referência.

Cada `/vj` começa do zero. O Claude analisa o texto e os anexos, faz perguntas no chat, escreve a direção de arte e o projeto, gera o HTML, olha o resultado, critica e entrega (publicando como Artifact, se o ambiente permitir).

| Comando | O que faz |
|---|---|
| `/vj <briefing>` | Fluxo completo, do zero |
| `/vj-reference` | Só analisa as imagens e vídeos anexados e devolve a gramática de referência |
| `/vj-critique` | Avalia um projeto pronto contra o briefing e propõe mutações |
| `/how-to-use` | Explica tudo o que a skill faz no chat (EN ou PT-BR); roda sozinho no primeiro uso |

### Análise de imagens e vídeos (opcional, recomendado)

Para o Claude medir as referências em vez de só olhar para elas:

```bash
pip install pillow numpy
```

Para vídeos, instale também o [ffmpeg](https://ffmpeg.org/download.html) (precisa estar no PATH: `ffmpeg -version` e `ffprobe -version` devem funcionar). Sem isso o Claude analisa só a olho e avisa que não mediu.

Conferir a instalação:

```bash
ls ~/.claude/skills
```

Deve listar `ai-vj-generator`, `vj`, `vj-reference` e `vj-critique`. Dentro de `ai-vj-generator`: `SKILL.md`, `references`, `scripts` e `assets`.

## C. Skill no claude.ai (web e app desktop)

1. Compacte a pasta da skill:
   - macOS / Linux: `cd skill && zip -r ai-vj-generator.zip ai-vj-generator`
   - Windows: `Compress-Archive -Path skill\ai-vj-generator -DestinationPath ai-vj-generator.zip`
2. No claude.ai: **Configurações → Capacidades → Skills → Enviar skill** e escolha o zip. A execução de código precisa estar ligada.
3. Num chat novo, descreva o set. O Claude devolve o HTML do gerador com o projeto carregado.

Dentro de um Artifact do claude.ai o navegador bloqueia microfone e janelas pop-up: use um arquivo de áudio para a reatividade e Tela cheia para a saída. Para ter tudo, abra o HTML baixado no navegador.

## Atualizar

```bash
cd ai-vj-generator && git pull && sh install.sh
```

No Windows, troque `sh install.sh` por `powershell -ExecutionPolicy Bypass -File install.ps1`.

## Desinstalar

```bash
rm -rf ~/.claude/skills/ai-vj-generator
```

Windows: `Remove-Item -Recurse -Force $HOME\.claude\skills\ai-vj-generator`

## Problemas comuns

| Sintoma | Causa e solução |
|---|---|
| "A biblioteca de ZIP não carregou" | Sem internet na hora do export. O JSZip vem do cdnjs; reconecte e recarregue. |
| Microfone não liga | Página aberta como arquivo (`file://`) ou dentro de um Artifact. Use `node scripts/serve.mjs` ou um arquivo de áudio. |
| Janela de saída não abre | Bloqueador de pop-up. Permita pop-ups para `localhost`. |
| FPS baixo | Aba Projeto → Preview 50% e Densidade 60%. O export sempre sai em qualidade total. |
| Export de 4K trava | Escala 0.5 ou menos compassos. O navegador guarda o ZIP em memória. |
| A skill não aparece | Confira o caminho `~/.claude/skills/ai-vj-generator/SKILL.md` e reinicie o Claude Code. |

## Folha de contato (opcional)

`node skill/ai-vj-generator/scripts/contact_sheet.mjs projeto.html contato` precisa de Node 18+ e de um Chrome ou Edge instalado (o script os encontra sozinho; use `--chrome caminho` ou a variável `CHROME_PATH` se estiverem em outro lugar). Sem navegador, a mesma folha sai pelo botão "Folha de contato PNG" na aba Exportar.
