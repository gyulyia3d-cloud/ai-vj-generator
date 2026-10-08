# Fase 0: Product Scope Purge. Auditoria (steps 1-4)

Data: 2026-10-08. Linha de base: `node scripts/check.mjs` termina em "Tudo certo." (7 min). Nenhum arquivo de código alterado ainda.

## 1. Conflitos entre o roadmap novo e o estado atual

| Tema | Estado atual (repo) | Roadmap novo | Ação |
|---|---|---|---|
| WebGL | `getContext('webgl')` em `app/index.html:1445`; `docs/ROADMAP.md` Fase 4 e `historico/RELATORIO-V9` §5 decidiram, com medição, NÃO migrar | WebGL2 obrigatório (Fase 2) | A decisão V9 é revogada pelo novo roadmap. Registrar ADR na Fase 2 |
| Integrações | `docs/ROADMAP.md` Fase 5 planeja MIDI, OSC, NDI, MCP/Resolume, pixel maps, blueprints | Proibido (0.2) | Reescrever `docs/ROADMAP.md` inteiro |
| Escopo "fora agora" | domo, 3D de evento, visão ao vivo "adiados sem data" | Removidos de vez | Trocar "adiado" por "fora de escopo" |
| Superfície | gera pixel map (CSV/PNG) e fatias XML do Resolume | Superfície só como input/restrição; nunca gerar pixel map/mapping | Remover geração; manter importação |

## 2. Classificação das ocorrências (fora CHANGELOG, dist, isf-library)

**ACTIVE FEATURE (remover ou reclassificar):**
- `app/surface.js` + `app/surface-ui.js`: XML de Advanced Output do Resolume (`sXml`), `rectsCsv`/pixel map CSV e PNG exportados, "módulo do pixel map por fatia". Port Python: `scripts/export_slices.py`, `references/arena-advanced-output-structure.json`, testes `surface_check.mjs`, `test_export_slices.py`, `surface_calc.py`.
- `app/index.html` aba Export: tabela "Transporte de sinal" (NDI, Spout, SDI, OSC/MIDI/WebSocket), bloco de texto "RESOLUME / OBS / NDI / SPOUT" no manifesto (~linhas 3198-3201), presets `software`, 'Imersivo / domo', 'DOOH' no seletor de arquétipo (~3484), botão "Saída ao vivo / janela de saída", modo `?stage=1` para OBS.
- `app/isf-ui.js`: "Exportar para o Resolume" (ISF em si = gerador/entrada, pode ficar).
- Camada "Branco α (colorir no Resolume)": é recurso de alpha legítimo; só reescrever o rótulo.

**DOCUMENTATION (reescrever):** `README.md`, `docs/*`, `SKILL.md`, `portable/PROMPT.md`, `AGENTS.md`, `references/{capabilities,bridge-obs-spout,output-targets,output-engineering,software-techniques,library-matrix,walls-code-assets,aspect-ratios,delivery,interview,briefing/*,surface-and-export,surface-model,vj-practice}`.

**TEST (ajustar junto da remoção):** `check.mjs`, `phase3_acceptance.mjs` (cobre ZIP da parede), `surface_check.mjs`, `loop_check.mjs`, `synth_check.mjs`, `cdp.mjs`, `v7_check.mjs`.

**COMMENT / falso positivo:** "dome" em shader ("domed gem"), `WebSocket` na lista de bloqueio do sandbox de código (`index.html:1914,1918`: é segurança, manter), "tracking" tipográfico, "mapping" = tone/UV mapping, "OSC" como oscilador na synth.

**HISTORICAL:** `CHANGELOG.md`, `docs/historico/*`, `RELEASE-3.0.0.md`. Preservar.

**DEAD CODE:** nada de MIDI/OSC/NDI executável encontrado. Só texto "CONCEITUAL". Não há `requestMIDIAccess`, WebSocket de ponte, nem Transport.

## 3. Mapa de dependências
`app/*.js` → embutidos em `app/index.html` (`embed-modules.mjs`) → `build.mjs` → `index.html` → `sync-skill.mjs` → `skill/.../assets/engine.html`. Remover módulo exige: editar fonte, re-embutir, build, sync, atualizar `check.mjs`. `docs/ROADMAP.md` e `capabilities.md` são lidos por testes? (a verificar antes de editar).

## 4. Decisão de arquitetura proposta
Menor mudança suficiente, em 4 blocos pequenos, cada um com `check.mjs` verde:
- **0a** Docs: reescrever `docs/ROADMAP.md` (roadmap novo), `capabilities.md` (SUPPORTED / EXPORTABLE / INPUT-ANALYSIS ONLY / NOT SUPPORTED), README/AGENTS/PROMPT/SKILL sem promessas fora de escopo.
- **0b** UI Export: remover tabela de transporte e texto de bridge; manter manifesto, PNG, MP4/WebM.
- **0c** Superfície: manter presets, cortes como regiões (slice = região de render), importação de pixel map/imagem como entrada. Remover XML Resolume, exportação de pixel map/CSV/PNG e bridges.
- **0d** Limpeza de scripts/testes/arquétipos (dome, DOOH, clip-pack?) e `bridge-obs-spout.md`.

## Perguntas em aberto (precisam de decisão)
1. **Janela de saída / `?stage=1` / Tela cheia**: remover, ou manter como "preview em tela cheia" sem posicionar como saída ao vivo?
2. **ISF** (84 shaders + importar/exportar `.fs`): manter biblioteca e importação como geradores; remover só o texto/botão "Exportar para o Resolume"?
3. **Fatias do Display** (`P.canvas.displays`): manter como regiões de render definidas pelo usuário (slice do 0.7) e exportar PNG/MP4 por região?
