# Compatibilidade com qualquer IA (e com nenhuma)

*English summary: the engine never talks to an AI. Any model (or a person, or a web form) produces a JSON file that follows a published schema; the engine and the Python/Node scripts validate and render it. The AI is a replaceable layer.*

## O contrato

```text
 brief (JSON)  ──►  project (JSON, ai-vj-generator/2)  ──►  engine (HTML)  ──►  PNG sequence / video
 quem preenche:     quem escreve:                          quem renderiza:
 pessoa, formulário, IA ou                                 o motor; determinístico
 IA                 brief_to_project.py (sem IA)
```

| Peça | Arquivo | Para que serve |
|---|---|---|
| Esquema do brief | `skill/ai-vj-generator/schema/brief.schema.json` | o que perguntar e em que formato |
| Esquema do projeto | `skill/ai-vj-generator/schema/project.schema.json` | forma do JSON que o motor lê |
| Regras profundas | `scripts/validate_project.py` | parâmetros, GLSL, áudio, contrato, superfície, ofício |
| Validador sem dependências | `scripts/schema_check.py` | confere o esquema sem `pip install` |
| Perguntas | `scripts/brief_check.py` | nota 0-100 e as próximas 4 perguntas |
| Geração sem IA | `scripts/brief_to_project.py` | brief → projeto válido |
| Instruções portáteis | `portable/PROMPT.md` | o que qualquer IA precisa saber, em um arquivo |

## Como ligar cada ferramenta

| Ferramenta | Como |
|---|---|
| **Claude Code** | `install.sh`/`install.ps1` copia a skill; `/vj`, `/vj-reference`, `/vj-critique` |
| **Codex / agentes que leem `AGENTS.md`** | abra o repositório; o `AGENTS.md` da raiz aponta para `PROMPT.md` e lista os comandos |
| **Gemini CLI** | copie o `AGENTS.md` como `GEMINI.md` (mesmo conteúdo) |
| **ChatGPT / Gemini / Claude no navegador** | cole `PROMPT.md` na primeira mensagem; peça o brief; cole de volta o JSON gerado e rode `schema_check.py` e `validate_project.py` na sua máquina |
| **Modelo local (Ollama, LM Studio)** | igual ao anterior; modelos pequenos funcionam melhor partindo do projeto gerado por `brief_to_project.py` e pedindo só edições |
| **Nenhuma IA** | caminho C do `QUICKSTART.md` |

## Regras que mantêm tudo compatível

1. **A IA nunca está no loop de render.** Ela cria ou altera o JSON; o motor executa.
2. **O JSON é a única fonte da verdade.** O HTML é só visualizador e controlador.
3. **Tudo é validável por script**, sem rede e sem serviço externo.
4. **Cada IA recebe o mesmo `PROMPT.md`**, então os resultados são comparáveis (útil para testar modelos).
5. **Exceções são declaradas** (`audio.strategy`, `layerBudget`), não implícitas.
6. **Privacidade:** nada do que você anexa é enviado a lugar nenhum pelo motor; o que vai para a IA é o que você cola nela.

## Medir uma IA nova (10 minutos)

1. Dê o `PROMPT.md` e o brief `examples/briefs/led-wall.brief.json` em texto.
2. Peça o projeto JSON. Rode `schema_check.py` e `validate_project.py`.
3. Abra no motor, gere a folha de contato e olhe.
Critérios: 0 erros no validador; contrato específico (não genérico); hierarquia (um herói, um respiro); loop fecha; você aprova o que vê.
