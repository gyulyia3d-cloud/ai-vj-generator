# Documentação

| Quero… | Leia |
|---|---|
| Começar agora (com Claude, outra IA ou sem IA) | [QUICKSTART.md](QUICKSTART.md) |
| Ir do GitHub ao PNG **sem IA e sem terminal** (parede 4500×800 passo a passo) | [GUIA-SEM-IA.md](GUIA-SEM-IA.md) |
| Usar com ChatGPT, Gemini, Codex ou modelo local | [AI-AGNOSTIC.md](AI-AGNOSTIC.md) |
| Saber o que vem a seguir e por quê | [ROADMAP.md](ROADMAP.md) |
| Entender a skill (o roteador e o mapa de leitura) | `../skill/ai-vj-generator/SKILL.md` |
| Entender o formato do projeto | `../skill/ai-vj-generator/references/project-schema.md`, `../skill/ai-vj-generator/schema/` |
| Direção de arte, tensão e movimento | `references/tension-and-release.md`, `art-direction.md`, `craft-and-finish.md`, `motion-systems.md` |
| Audioreatividade | `references/audio-direction.md` (decisões), `audio-bus.md` (mecânica) |
| Shaders | `references/glsl-library.md`, `glsl-recipes.md`, `isf-bridge.md` |
| Superfícies, aspect ratios, LED | `references/surface-model.md`, `aspect-ratios.md`, `output-engineering.md`, `bridge-obs-spout.md` |
| Briefing | `references/briefing/` (diagnóstico, arquétipos, banco de perguntas) |
| Superfície, fatias do Resolume, manifesto de export, segurança de flash | `references/surface-and-export.md` |
| Perfis de movimento, bíblia de arte, avaliador, tipografia, famílias | `references/motion-profiles.md`, `art-bible.md`, `evaluation.md`, `typography.md`, `families.md` |
| Qualidade e testes | `references/quality-gates.md`, `../scripts/check.mjs` |
| Histórico de decisões | [RELATORIO-V7-githubs2.md](RELATORIO-V7-githubs2.md), [RELATORIO-V8-roadmap.md](RELATORIO-V8-roadmap.md), `../CHANGELOG.md` |

(Os caminhos `references/…` ficam em `skill/ai-vj-generator/references/`.)

## Mapa do repositório

```text
app/index.html            o motor (um arquivo: preview, interface, exportação)
skill/ai-vj-generator/    a skill: SKILL.md (roteador), references/, scripts/, schema/, portable/, assets/engine.html (cópia do motor)
skill/vj, vj-critique, vj-reference, how-to-use/   comandos
examples/                 projetos de exemplo (só formato) e briefs/ (entradas do gerador sem IA)
scripts/                  ferramentas do repositório: check.mjs (todos os testes), sync-skill.mjs, embeds
docs/                     esta pasta
evals/                    casos de avaliação
```
