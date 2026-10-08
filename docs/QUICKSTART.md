# Quickstart: quatro caminhos

Todos terminam no mesmo lugar: um arquivo `*.aivj.json` (esquema `ai-vj-generator/2`) que o motor abre, mostra e exporta em PNG sequence.

## Caminho A: com Claude Code (conversa)

1. Instale: `sh install.sh` (macOS/Linux) ou `powershell -ExecutionPolicy Bypass -File install.ps1` (Windows). Reinicie o Claude Code.
2. Digite `/vj` e descreva o set (superfície com pixels reais, música, clima). Anexe referências se tiver.
3. O Claude pergunta (até 4 por rodada), escreve o contrato criativo, gera o projeto, valida, renderiza uma folha de contato e olha antes de entregar.
4. Abra o HTML gerado, ajuste, exporte.

## Caminho B: com qualquer outra IA (ChatGPT, Gemini, Codex, modelo local)

1. Dê à IA o arquivo `skill/ai-vj-generator/portable/PROMPT.md` (cole como primeira mensagem, ou aponte o `AGENTS.md`/`GEMINI.md` da raiz).
2. Ela preenche o brief (`schema/brief.schema.json`) fazendo perguntas, e escreve o projeto JSON.
3. Valide (opcional, mas recomendado), em qualquer máquina com Python 3:
   ```bash
   python skill/ai-vj-generator/scripts/schema_check.py project meu.aivj.json
   python skill/ai-vj-generator/scripts/validate_project.py meu.aivj.json
   ```
4. Abra `app/index.html`, importe o JSON, ou gere o HTML autocontido: `node skill/ai-vj-generator/scripts/make-artifact.mjs meu.aivj.json --out meu.html`.

## Caminho D: sem IA e sem terminal (só o navegador)

Abra `app/index.html`, clique em **Gerar sem IA**, preencha o briefing, escolha o preset da superfície e clique em **Gerar e abrir**. Avalie, ajuste, confira as fatias do Resolume na aba Superfície, teste os flashes e exporte na aba Exportar. Passo a passo completo: [GUIA-SEM-IA.md](GUIA-SEM-IA.md).

## Caminho C: sem IA, pela linha de comando

1. Copie `examples/briefs/led-wall.brief.json`, edite (nome, conceito, 1 a 3 climas, superfície, BPM).
2. Confira e veja o que falta:
   ```bash
   python skill/ai-vj-generator/scripts/brief_check.py meu.brief.json
   ```
3. Gere:
   ```bash
   python skill/ai-vj-generator/scripts/brief_to_project.py meu.brief.json --out meu.aivj.json
   node skill/ai-vj-generator/scripts/make-artifact.mjs meu.aivj.json --out meu.html
   ```
4. Abra `meu.html`; mude cores, números e camadas pela interface. Os nomes das composições são provisórios: renomeie.

## Exportar

Aba **Exportar**: PNG sequence com alpha (composição, camadas ou uma camada), resolução, fps, compassos, intervalo de quadros. O loop tem **compassos inteiros**; no Resolume use BPM Sync no clipe. Alpha "branco" (`palette.mode: white-alpha`) deixa a cor para o media server.

## Conferir a qualidade

```bash
node skill/ai-vj-generator/scripts/contact_sheet.mjs meu.html pasta-de-saida   # folha de 6 quadros por composição
node skill/ai-vj-generator/scripts/seed_census.mjs meu.aivj.json --seeds 12    # variação entre seeds
node scripts/check.mjs                                                          # todos os testes do repositório
```

Olhe a folha de contato antes de aprovar: o teste não sabe se está bonito.
