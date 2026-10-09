# Compatível com qualquer IA (ou nenhuma)

O projeto não depende de uma IA específica. O que a IA faz é **conduzir o briefing e escrever um arquivo JSON**; quem desenha, anima, mede e exporta é o motor (`app/index.html`). Sem IA, a aba **Gerar** faz o mesmo caminho por regras.

## O contrato
Entrada: um briefing (`skill/ai-vj-generator/schema/brief.schema.json`). Saída: um projeto (`schema/project.schema.json`, versão `ai-vj-generator/2`). Qualquer ferramenta que escreva JSON válido nesse esquema funciona; o validador (`scripts/validate_project.py`) diz o que corrigir, em texto simples.

## Como cada ferramenta carrega as instruções
| Ferramenta | Como |
|---|---|
| ChatGPT, Gemini (app), Claude (chat), Mistral, qualquer chat | cole `skill/ai-vj-generator/portable/PROMPT.md` como primeira mensagem; anexe `schema/project.schema.json` e `references/project-schema.md` se o chat aceitar arquivos |
| Custom GPT, Gem, Project | use o `PROMPT.md` como instrução do sistema e suba `references/` como conhecimento |
| Codex, Cursor, Windsurf, Aider e outros agentes de código | leem o `AGENTS.md` da raiz, que aponta para o `PROMPT.md` |
| Gemini CLI | lê o `GEMINI.md` da raiz |
| Claude Code | lê o `CLAUDE.md` da raiz, ou instale os comandos `/vj` (`adapters/claude/INSTALL.md`) |
| Modelos locais (Ollama, LM Studio) | `PROMPT.md` como mensagem de sistema; modelos pequenos costumam errar o esquema: gere com `brief_to_project.py` e peça a eles só ajustes |
| Nenhuma IA | `brief_to_project.py` (Caminho A e C do [QUICKSTART](QUICKSTART.md)) |

## O que muda com ou sem ferramentas
- **Com acesso a arquivos e terminal:** a IA roda `brief_check.py`, `palette.py`, `validate_project.py`, `contact_sheet.mjs` e `render.mjs`, olha as imagens e corrige.
- **Só chat:** ela escreve o JSON e a checklist do fim do `PROMPT.md`; diz com honestidade que não renderizou; você abre o JSON no motor e confere.

## Regras que valem para todas
Determinismo (sem `Math.random` nem relógio), loops que fecham em compassos inteiros, todo shader lê áudio (a menos que o contrato declare `audio.strategy: none` com motivo), referências viram princípios e nunca cópias, nada de shader sem licença, e nunca afirmar que viu um render que não viu. Estão no `PROMPT.md` e são testadas em `node scripts/check.mjs`.

## Para quem mantém o repositório
O texto-fonte é **um só**: `skill/ai-vj-generator/portable/PROMPT.md`. `AGENTS.md`, `GEMINI.md` e `CLAUDE.md` são ponteiros curtos; os comandos do Claude ficam em `adapters/claude/skills/` e não são necessários para as outras ferramentas. A skill completa (`SKILL.md` e `references/`) é Markdown comum: qualquer IA pode lê-la por demanda.
