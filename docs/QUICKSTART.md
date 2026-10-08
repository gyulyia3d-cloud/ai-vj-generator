# Começo rápido: quatro caminhos

Todos terminam no mesmo lugar: um arquivo `*.aivj.json` (esquema `ai-vj-generator/2`) que o motor abre, mostra e exporta em PNG sequence ou MP4. Escolha pelo que você tem à mão.

## Caminho A: só o navegador, sem IA e sem terminal
Abra `app/index.html` (Chrome ou Edge), clique em **Gerar sem IA**, preencha o briefing, escolha o preset da superfície e clique em **Gerar e abrir**. Avalie, ajuste, confira a superfície e a legibilidade na aba Superfície e exporte. Passo a passo: [GUIA-SEM-IA.md](GUIA-SEM-IA.md).

## Caminho B: com qualquer IA (ChatGPT, Gemini, Claude, Codex, modelo local)
1. Dê à IA o arquivo `skill/ai-vj-generator/portable/PROMPT.md`: cole como primeira mensagem, ou aponte a ferramenta para o `AGENTS.md`, `GEMINI.md` ou `CLAUDE.md` da raiz (todos apontam para ele). Detalhes por ferramenta: [AI-AGNOSTIC.md](AI-AGNOSTIC.md).
2. Ela faz as perguntas do briefing (até 4 por rodada), escreve o contrato criativo e o projeto JSON.
3. Valide, em qualquer máquina com Python 3 (opcional, recomendado):
   ```bash
   python skill/ai-vj-generator/scripts/schema_check.py project meu.aivj.json
   python skill/ai-vj-generator/scripts/validate_project.py meu.aivj.json
   ```
4. Abra `app/index.html` e cole o JSON em **Carregar briefing**, ou gere um HTML autocontido: `node skill/ai-vj-generator/scripts/make-artifact.mjs meu.aivj.json --out meu.html`.

## Caminho C: sem IA, pela linha de comando
1. Copie `examples/briefs/led-wall.brief.json` e edite (nome, conceito, 1 a 3 climas, superfície, BPM).
2. Confira e veja o que falta: `python skill/ai-vj-generator/scripts/brief_check.py meu.brief.json`
3. Gere: `python skill/ai-vj-generator/scripts/brief_to_project.py meu.brief.json --out meu.aivj.json` e depois `node skill/ai-vj-generator/scripts/make-artifact.mjs meu.aivj.json --out meu.html`
4. Abra `meu.html`; mude cores, números e camadas pela interface. Os nomes das composições são provisórios: renomeie.

## Caminho D: Claude Code com comandos `/vj`
É um adaptador opcional: [../adapters/claude/INSTALL.md](../adapters/claude/INSTALL.md). Instala a skill e os comandos `/vj`, `/vj-reference`, `/vj-critique` e `/how-to-use`. O conteúdo é o mesmo do Caminho B.

## Renderizar
- **Na interface**, aba **Exportar**: PNG sequence com alpha (composição, camadas ou uma camada) ou **MP4 (H.264)**. Escolha o projeto completo ou uma região. O loop tem compassos inteiros, então a emenda é limpa.
- **Pela linha de comando**, sem abrir a interface:
  ```bash
  node scripts/render.mjs meu.aivj.json --out saida --format mp4 --comp all
  node scripts/render.mjs meu.aivj.json --out saida --format png --alpha
  ```
  Nunca é gravação de tela: cada quadro é desenhado de forma determinística. Detalhes: `skill/ai-vj-generator/references/render-cli.md`.
- **ISF**: camada do tipo **ISF** com 84 shaders no parâmetro da camada; a aba **ISF** importa arquivos `.fs`. Detalhes em [GUIA-SEM-IA.md](GUIA-SEM-IA.md).

## Conferir a qualidade
```bash
node skill/ai-vj-generator/scripts/contact_sheet.mjs meu.html pasta-de-saida   # folha de 6 quadros por composição
node skill/ai-vj-generator/scripts/seed_census.mjs meu.aivj.json --seeds 12    # variação entre sementes
node scripts/check.mjs                                                          # todos os testes do repositório
```
Olhe a folha de contato antes de aprovar: o teste não sabe se está bonito.
