# Adaptadores

O núcleo é independente de ferramenta (`skill/ai-vj-generator/`). Cada pasta aqui só ensina uma ferramenta a carregá-lo.

| Pasta | Ferramenta | O que tem |
|---|---|---|
| `claude/` | Claude Code | `install.sh`, `install.ps1`, `INSTALL.md` e os comandos `/vj`, `/vj-reference`, `/vj-critique`, `/how-to-use` (`skills/`) |
| (raiz) | Codex, Cursor e outros agentes | `AGENTS.md` aponta para o `PROMPT.md` |
| (raiz) | Gemini CLI | `GEMINI.md` aponta para o `PROMPT.md` |
| (nenhum) | ChatGPT, Gemini, modelos locais | cole `skill/ai-vj-generator/portable/PROMPT.md` (veja `docs/AI-AGNOSTIC.md`) |

Para acrescentar uma ferramenta nova: crie `adapters/<nome>/` com o que ela precisar (um arquivo de regras, um script) e faça tudo apontar para `portable/PROMPT.md`. Não copie instruções: a fonte é uma só.
