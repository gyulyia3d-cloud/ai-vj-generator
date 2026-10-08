# Documentação

| Quero… | Leia |
|---|---|
| Começar agora (navegador, qualquer IA, linha de comando, Claude Code) | [QUICKSTART.md](QUICKSTART.md) |
| Ir do GitHub ao PNG ou MP4 **sem IA e sem terminal** (parede 4500×800 passo a passo) | [GUIA-SEM-IA.md](GUIA-SEM-IA.md) |
| Usar com ChatGPT, Gemini, Codex, Claude ou modelo local | [AI-AGNOSTIC.md](AI-AGNOSTIC.md) e [../adapters/README.md](../adapters/README.md) |
| Saber o que falta e a ordem sugerida | [PROXIMOS-PASSOS.md](PROXIMOS-PASSOS.md) |
| Ver o roadmap e as decisões de escopo | [ROADMAP.md](ROADMAP.md) |
| Notas da versão | [RELEASE-3.0.0.md](RELEASE-3.0.0.md) e [../CHANGELOG.md](../CHANGELOG.md) |
| Entender as instruções que a IA segue | [../skill/ai-vj-generator/portable/PROMPT.md](../skill/ai-vj-generator/portable/PROMPT.md) |
| O que o motor já sabe fazer, por necessidade | `skill/ai-vj-generator/references/vocabulary.md` |
| Camadas novas | `references/fx-layer.md`, `synth-chain.md`, `blob-layer.md` |
| Shaders e ISF | `references/glsl-library.md`, `glsl-recipes.md`, `isf-layer.md`, `isf-library/README.md` |
| Renderizar sem gravar a tela | `references/render-cli.md` |
| Superfícies, regiões, manifesto, flash | `references/surface-and-export.md`, `surface-model.md`, `aspect-ratios.md`, `output-engineering.md` |
| Áudio e movimento | `references/audio-direction.md`, `audio-bus.md`, `motion-profiles.md` |
| Direção de arte e tensão | `references/tension-and-release.md`, `art-direction.md`, `craft-and-finish.md`, `art-bible.md` |
| Briefing | `references/briefing/` (diagnóstico, arquétipos, banco de perguntas) |
| Formato do projeto | `references/project-schema.md`, `schema/` |
| Qualidade e testes | `references/quality-gates.md`, `../scripts/check.mjs` |
| Relatórios antigos (V7, V8, V9, análises) | [historico/](historico/) |

Os caminhos `references/…` ficam em `skill/ai-vj-generator/references/`.

## Mapa do repositório
```text
app/                    motor (index.html + módulos)
skill/ai-vj-generator/  instruções e ferramentas para qualquer IA
adapters/               como cada ferramenta as carrega (claude/ tem o instalador)
examples/  scripts/  docs/  evals/
AGENTS.md  GEMINI.md  CLAUDE.md  ponteiros na raiz
```
