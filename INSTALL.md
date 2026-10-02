# Instalação

Três caminhos, do mais simples ao mais completo. Escolha um.

## A. Só o gerador (sem Claude, sem instalar nada)

1. Baixe o repositório: botão **Code → Download ZIP** no GitHub, e descompacte.
2. Dê dois cliques em `app/index.html`.
3. Clique em **Novo briefing** (entrevistador) ou **Exemplo**. O botão **Standard** carrega o motor original.

Para microfone e janelas de saída, o navegador exige um endereço `http://`. Com [Node.js](https://nodejs.org) 18 ou mais recente:

```bash
node scripts/serve.mjs
```

Abra `http://localhost:5173`.

## B. Skill no Claude Code

Pré-requisitos: [Git](https://git-scm.com) e [Claude Code](https://claude.com/claude-code).

macOS / Linux:

```bash
git clone https://github.com/SEU-USUARIO/ai-vj-generator.git && cd ai-vj-generator && sh install.sh
```

Windows (PowerShell):

```powershell
git clone https://github.com/SEU-USUARIO/ai-vj-generator.git; cd ai-vj-generator; powershell -ExecutionPolicy Bypass -File install.ps1
```

O instalador copia a pasta `skill/ai-vj-generator` para `~/.claude/skills/ai-vj-generator`. Para instalar só num projeto, copie a mesma pasta para `.claude/skills/` dentro dele.

Reinicie o Claude Code e escreva, por exemplo:

> Quero visuais para meu set de techno industrial: LED 5120×500 em duas paredes em L, 132 BPM, vou levar pro Resolume com alpha.

O Claude entrevista, escreve o projeto, gera o HTML e (se o ambiente permitir) publica como Artifact.

Conferir a instalação:

```bash
ls ~/.claude/skills/ai-vj-generator
```

Deve listar `SKILL.md`, `references`, `scripts` e `assets`.

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
