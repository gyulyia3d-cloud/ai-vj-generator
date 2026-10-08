# Instalação no Claude Code (opcional)

Só o Claude Code precisa disto. Para o motor sem IA ou com outra IA, veja o [QUICKSTART](../../docs/QUICKSTART.md).

## Pré-requisitos
[Git](https://git-scm.com) e [Claude Code](https://claude.com/claude-code). Python 3 e Node.js 22 ou mais novo ajudam (validador, renderização); imagem e vídeo anexados pedem `pip install pillow numpy` e, para vídeo, `ffmpeg`.

## macOS / Linux
```bash
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git && cd ai-vj-generator && sh adapters/claude/install.sh
```

## Windows (PowerShell)
```powershell
git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git; cd ai-vj-generator; powershell -ExecutionPolicy Bypass -File adapters\claude\install.ps1
```

O instalador copia para `~/.claude/skills/` (ou `$CLAUDE_SKILLS_DIR`) a skill `ai-vj-generator` e os comandos `vj`, `vj-reference`, `vj-critique` e `how-to-use`. Reinicie o Claude Code e digite, por exemplo:

> /vj Set de techno industrial: LED 5120×500 em duas paredes em L, 132 BPM, vou levar pro Resolume com alpha. Anexei um print e um vídeo de referência.

## Atualizar
`git pull` e rode o instalador de novo (ele substitui as pastas instaladas).

## Se algo não aparece
- O comando `/vj` não existe: reinicie o Claude Code; confira que `~/.claude/skills/vj/SKILL.md` existe.
- Erro de "skill não encontrada": o instalador precisa rodar de dentro do repositório (ele acha `skill/ai-vj-generator` pela raiz).
- Sem Claude Code: ignore esta pasta; nada do motor depende dela.
