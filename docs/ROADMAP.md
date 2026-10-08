# Roadmap oficial (v10, motor 3.0.0)

Este é o roadmap em vigor. Ele substitui as ordens de prioridade de `historico/RELATORIO-V8-roadmap.md` e consolida `historico/RELATORIO-V7-githubs2.md` e `historico/RELATORIO-V9-githubs3.md`, o relatório do ChatGPT (`gpt-relatorio-v7`), o Deep Research e o "Resumo Executivo" (PDF). Os quatro documentos externos são lidos como **fonte de ideias**, não como plano: dois deles assumem equipes e orçamentos de empresa.

**Premissas (decididas pela autora, 07/10/2026)**
- Projeto **open source, autodidata, feito por uma pessoa**: estrutura clara e documentação boa valem tanto quanto features.
- O núcleo é **uma ferramenta compatível com qualquer IA** (Claude, Codex, Gemini, modelos locais) **e uma plataforma web sem IA**, que gera animações com shaders, movimento, física, matemática, direção de arte, teoria das cores e audioreatividade, e exporta **PNG sequence (alpha ou colorido)** e vídeo, em vários aspect ratios e superfícies **planas ou já segmentadas** (LED, telas, pixel maps, blueprints planos).
- **Fora de escopo agora:** anamorfismo, domo, espaço 3D de evento, visão ao vivo, runtime/media server nativo, SDI, MPCDI.
- **Integrações** (MIDI, OSC, NDI, MCP, Resolume) vêm **depois** de qualidade artística, áudio, superfícies e interface.

## Ordem das fases

| Fase | Foco | Estado |
|---|---|---|
| **1** | Documentação, neutralidade de IA, briefing estruturado, direção de áudio e geração sem IA | **feita**; neutralidade de ferramenta reforçada na 3.0 (`adapters/`, ponteiros na raiz) |
| **2** | Nível artístico: composições bonitas, harmônicas e profissionais | **feita (2.4.0)**; falta o seu olhar na galeria (Gate 2) |
| **3** | Audioreatividade estruturada, superfícies e aspect ratios, export PNG, UI/UX | **feita (2.5.0)**; faltam itens listados abaixo |
| **4** | Render, processamento e memória entre quadros | **parcial**: camada `fx` (textura de entrada), MP4 e render por CLI feitos; decisão medida de **não** trocar o motor para WebGL2 agora (`historico/RELATORIO-V9-githubs3.md` §5). Falta `fx` com histórico, render paralelo e motor modular |
| **5** | Integrações: MIDI, OSC, NDI (via OBS), MCP/Resolume, pixel maps, blueprints planos | depois |
| **6** | Adiado sem data: anamorfismo, domo, 3D de evento, visão ao vivo, runtime | só com demanda real |

### Fase 1 — Fundação documentada e agnóstica de IA (feita)
| Item | Entrega |
|---|---|
| Instruções portáteis para qualquer IA | `skill/ai-vj-generator/portable/PROMPT.md`, `AGENTS.md` na raiz, `docs/AI-AGNOSTIC.md` |
| Contrato de dados por esquema | `schema/project.schema.json`, `schema/brief.schema.json`, `scripts/schema_check.py` (sem `pip`) |
| Briefing estruturado | `brief.schema.json`, `scripts/brief_check.py` (nota 0-100 e as 4 próximas perguntas), exemplos em `examples/briefs/` |
| Geração **sem IA** | `scripts/brief_to_project.py`: brief → projeto válido (12 climas, paleta OKLCH, camadas em tiers, estratégia de áudio); determinístico |
| Áudio estruturado | `audio.strategy` (`none/subtle/structural/rhythmic/full`) no motor e no validador; `references/audio-direction.md` |
| Regras com exceção declarada | `meta.contract.layerBudget`, `audioStrategyReason` |
| Docs de entrada | `docs/README.md`, `QUICKSTART.md`, `AI-AGNOSTIC.md`, este roadmap |
| Testes | `generator_check.mjs` (12 climas validam, abrem, desenham, fecham o loop) |

### Fase 2 — Nível artístico (feita em 2.4.0; o aceite por nota passou, o aceite pelo olhar é seu)
Objetivo: o que sai do `/vj` e do gerador sem IA deve parecer trabalho de estúdio.
1. **Galeria de referência** (3 df): 8 briefs curados (clima × superfície) com renders, PNGs e a nota de cada um. Serve de teste visual e de vitrine do repositório.
2. **Bíblia de arte** (2 df): `meta.artBible` gerada na etapa de contrato (tese, linguagem de material, espaço, movimento, dramaturgia, cor, tipografia, áudio, banidos) e mostrada na interface.
3. **Perfis de movimento executáveis** (3 df): `energy, elasticity, anticipation, continuity, rhythm` viram curvas (mola, easing, overshoot) por uma função pura; usados pelo gerador sem IA e documentados para as IAs.
4. **Avaliador estrutural** (5 df): nota por hierarquia, contraste, densidade, respiro, coerência de movimento, arco temporal e repetição, calculada de renders (`contact_sheet`, `seed_census`, `layerAudit`), com texto em linguagem natural.
5. **Biblioteca por famílias** (3 df): receitas, geradores e módulos GLSL agrupados em famílias com manifesto (superfícies adequadas, custo, licença, maturidade).
6. **Tipografia** (2 df): hierarquia (título, legenda, dados), tipo em caminho e reveal por glifo.
**Aceite:** 8 composições da galeria passam no avaliador com nota ≥ 75 e você as aprova ao olhar. **Estado:** as 24 composições (8 briefs x 3) tiram de 77 a 100; falta a aprovação visual (`examples/gallery/README.md`). Ressalva: o gerador foi ajustado até a galeria passar, então a prova de que o avaliador funciona são os controles negativos de `evaluate_check.mjs`.

### Fase 3 — Áudio, superfícies, export e UI (feita em 2.5.0)
**Estado (08/10/2026).** Feito e testado: UI de modulação (`layer.mod` sem JSON, curva de perfil de movimento), detector de onset e kick com histórico (fluxo espectral, limiar adaptativo, refratário, BPM do kick) e fontes `kick onset flux`; presets de superfície, cortes, pixel map por CSV e PNG, fatias do Resolume no navegador (XML idêntico ao do Python), avisos de legibilidade; manifesto de export com SHA-256, divisão em partes, nomes previsíveis; limitador e análise de flash (WCAG 2.3.1 geral); aba **Gerar sem IA** (porta do gerador, paridade comprovada), modo Criativo/Avançado, ajuda por aba, atalhos (`?`) e tour. **Aceite:** `phase3_acceptance.mjs` percorre o caminho de quem não tem o Claude e passa. **Não feito:** arrastar fatias na vista, rotação de 90°, WebM no export, limitador por camada, flash vermelho e área do flash na análise, teste do detector com microfone ou arquivo reais (só espectros sintéticos e um analisador simulado), reatores por faixa com painel de espectro desenhado (há as fontes e a escolha de banda, não o desenho).
1. **UI de modulação** (3 df) e reatores por faixa de espectro; fluxo espectral (onset) e detector de kick com histórico (3 df).
2. **Superfícies planas e segmentadas** (6 df): presets de superfície e aspect ratio na interface (LED, ultrawide, vertical, torre, fita, multi-tela), pixel maps por CSV/PNG, fatias com UI (arrastar, cortar, rodar 90°), exporta XML de Advanced Output (já existe em script), avisos de legibilidade por pitch e distância.
3. **Export** (4 df): PNG sequence alpha/colorido por composição ou por camada, nomes e pastas previsíveis, ZIP em partes grandes, manifesto de export (fps, bars, seed, hash do projeto), WebM como bônus.
4. **UI/UX** (8 df): aba "Gerar sem IA" (formulário do brief + gerar + abrir), modo Criativo/Avançado, ajuda contextual, atalhos, vista de camadas e tour.
5. **Limitador de flash** (2 df).
**Aceite:** alguém sem Claude consegue, só pela interface, gerar, ajustar e exportar um set para uma parede 4500×800.

### Fase 4 — Render e processamento (≈ 40 df, só após a 2 e a 3)
1. **Motor modular** (6 df): `src/` + build para o mesmo `index.html`; testes inalterados.
2. **Compositor GPU WebGL2** com render graph mínimo (24 df), paridade de pixels contra o renderizador atual como teste.
3. **Orçamento de GPU e perfis de render** (3 df); `sim` em GPU; ISF multipasso (7 df).
**Aceite:** paridade de pixels, FPS maior em 1080p e 4500×800, `check.mjs` verde.

### Fase 5 — Integrações (≈ 25 df)
MIDI (Web MIDI), OSC por ponte local, NDI e Spout via OBS (já documentado), **MCP do Resolume** (handoff do set ao Arena), pixel maps e blueprints planos (importar PNG/SVG/CSV de módulos), exportadores para MadMapper/Resolume. Ableton Link por ponte.

## Logística de tokens e testes com `/vj`
- Cada sessão de trabalho tem **um objetivo e um teste**; evitar reler arquivos grandes (o motor tem 450 KB): usar `grep` e trechos.
- Rodar `node scripts/check.mjs` só no fim de cada bloco; testes isolados (`v7_check`, `generator_check`) durante o trabalho.
- **Dois testes de `/vj`** (antes e depois desta atualização), com o mesmo briefing para comparar: (1) `examples/briefs/led-wall.brief.json` descrito em texto; (2) um briefing seu de superfície diferente (vertical ou tela comum). Registrar: tempo até o primeiro render, perguntas feitas, avisos do validador, nota do avaliador (quando existir) e a sua avaliação ao olhar.
- Commits pequenos por fase; tag a cada fase fechada.

## Gates
| Gate | Pergunta |
|---|---|
| 1 | Qualquer IA (ou nenhuma) chega a um projeto válido seguindo só `docs/QUICKSTART.md`? |
| 2 | Você aprova as 8 composições da galeria sem querer refazer nenhuma? |
| 3 | Um set exportado em PNG sequence entra no Resolume sem retrabalho? |
| 4 | O motor modular e o compositor GPU mantêm a paridade? |
| 5 | Uma integração real (Resolume ou OBS) funcionou num ensaio? |

## Descartado ou adiado
Render farm, SDI, DeckLink, MPCDI, redes treinadas de segmentação, clone de TouchDesigner/Resolume, LLM dentro do render, NDI nativo no navegador, marketplace, versão Pro paga, modelo de equipe e orçamento em euro dos documentos externos.

## O que foi aproveitado de cada documento
| Documento | Aproveitado | Descartado |
|---|---|---|
| Deep Research e "Resumo Executivo" (PDF) | forma por fase, IR em JSON com esquema, manifestos | equipes, euros, datas, métricas sem método, "MCP = Mapping Control Protocol" (é Model Context Protocol), NDI/Spout dentro do navegador, runtime Electron cedo |
| `gpt-relatorio-v7` | IR como contrato, neutralidade de IA e modo sem IA, estado declarado, estratégia de áudio, perfis de render, avaliador, Design for Venue, "não clonar Resolume/TD" | remover a regra de áudio (virou exceção declarada), runtime nativo, 10 fases em escala de equipe |
| V7 (repositórios) | ISF, áudio estendido, biblioteca GLSL, `layer.mod`, camadas novas, saída OBS/Spout, fatias | — |
| V8 | ADRs e gates | prioridade da Fase F (anamórfico), trocada por superfícies planas |
