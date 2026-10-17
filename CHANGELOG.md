# Changelog

## Não lançado · Gerar briefing (IA gratuita opcional) e how-to das IAs

Sem mudança de render nem de formato de projeto. O motor ganha um assistente que faz, na web e sem custo, o papel do `/vj`: a pessoa responde a auditoria, junta mídias e descreve o projeto, e o motor monta as composições pelas regras locais (`genai.js`); uma IA gratuita, opcional, só completa o que ficou em branco.

- **Botão GERAR BRIEFING** ao lado de Carregar briefing (`app/briefgen.js`, módulo `BRIEFGEN`). Quatro seções, cada uma com o seu "Como fazer": 1 Auditoria (superfície, tempo, clima, energia, densidade, paleta, áudio, evento focal, proibidos, texto exato, entrega; com nota 0 a 100 e as perguntas pendentes, mesmos pesos de `brief_check.py`), 2 Mídias (até 3 imagens de referência; mapa de pixels em CSV ou PNG, medido localmente como regiões), 3 Descrição visual (e verbos visuais opcionais), 4 Gerar.
- **Honestidade sobre o que foi respondido:** só conta como respondido o que a pessoa tocou; o resto usa o padrão do gerador e fica registrado em `meta.spec.assumed`. `meta.generator` diz se houve IA e o que ela preencheu. A IA nunca muda nome, conceito, superfície, tempo nem texto, e nunca sobrescreve o que a pessoa respondeu (`sanitizeSpec` e `mergeSpec`, listas fechadas).
- **Aviso pequeno:** limite de 14 gerações por dia, compartilhado (cota gratuita); esgotado, o gerador por regras continua.
- **Carregar briefing:** passo a passo para gerar o JSON em Gemini, GPT, Claude, Grok e DeepSeek, com o prompt pronto para copiar e a nota de como inserir as mídias (o JSON não leva imagens; elas entram na vista ou na aba Mídia). A importação agora aceita também o **briefing** em JSON (antes só projeto): o gerador local monta as composições.
- **Worker opcional** (`worker/`, Cloudflare, sem dependências): esconde as chaves da Groq e do Gemini, impõe 14 por dia, só aceita origens autorizadas, estorna a geração se o provedor falha. **Vem desligado:** `ENDPOINT` em `app/briefgen.js` está vazio até alguém fazer o deploy (`worker/README.md`); sem ele a caixa da IA fica desativada e o assistente avisa. Os nomes de modelo e as cotas dos planos gratuitos não foram testados contra as APIs reais.
- **Teste novo** `briefgen_check.mjs` (listas fechadas = esquema = registry = Worker, entradas hostis com controle negativo, o Worker com fetch simulado, a interface com clique de mouse de verdade em 3 larguras, idioma, Esc, IA simulada).
- `window.AIVJ.briefgen` expõe o módulo (testes). Barra do topo: entre 701 e 920 px o botão novo recolhe (senão cobria o botão Briefing; medido) e o caminho é Carregar briefing > Gerar briefing aqui; até 700 px o topo rola na horizontal e o botão fica num grupo `.keep`. Ao abrir, o foco vai ao primeiro campo da auditoria.

## 3.20.0 (16/10/2026) · Fase 16: export verificável

Fecha a fase 16. Sem mudança de render nem de formato de projeto (a base de quadros de referência continua em diferença 0.000); o manifesto de export sobe para o esquema 2 e o 1 continua legível. `check.mjs`: 141 verificações, todas verdes.


- **Manifesto v2** (`ai-vj-generator/export-manifest/2`): lista cada PNG com bytes e SHA-256 (`crypto.subtle`; sem ele o campo é `null` e o manifesto diz que não há hash, em vez de inventar), declara o que o alfa significa e que MP4 não tem alfa. O v1 continua legível.
- **Verificador independente `scripts/verify_export.mjs`:** confere pasta ou partes `.zip` contra o manifesto (hash do projeto, quadros contíguos e contados, SHA-256 e bytes de cada PNG, dimensões, **alfa medido nos pixels**; MP4: bytes, SHA-256, `ftyp` e `alpha: false`). Sem o motor e sem rede.
- **`scripts/render.mjs` passa a gravar manifesto** (PNG: `MANIFEST.json` e `project.json` na pasta; MP4: `<arquivo>.manifest.json`), no mesmo esquema.
- **Testes:** `export_verify_check.mjs` (render pela linha de comando, entregas boas e 8 controles negativos: byte trocado, quadro apagado, `project.json` adulterado, alfa mentido, dimensão errada, sem manifesto, MP4 adulterado, MP4 que promete alfa) e `export_check.mjs` agora verifica o ZIP baixado pelo motor, as 8 partes juntas e a falta de uma parte.
- **JSZip embutido** (`app/vendor/jszip.min.js`, 3.10.1, baixado do cdnjs e conferido pelo mesmo SRI sha512 que a página já usava; cabeçalho MIT/GPLv3 preservado): o export em ZIP não depende mais de CDN. Teste novo `export_offline_check.mjs`: nenhum script de fora, nenhuma requisição http(s) além das fontes web, export de ponta a ponta conferido pelo verificador, e controle negativo (sem JSZip o export recusa com mensagem clara).
- **Bug achado pelo verificador:** o `FLASH.sha256` do motor errava o preenchimento quando o tamanho em bytes era 55 mod 64, então o "SHA-256 do projeto" do manifesto não era um SHA-256 verdadeiro em 1 de cada 64 projetos (e nenhuma ferramenta externa o reproduzia). Corrigido; `export_check.mjs` agora compara com `crypto.subtle` em todos os tamanhos de 0 a 260 bytes e com UTF-8.
- O `project.json` do ZIP passa a ser o mesmo texto que gerou o hash do manifesto (calculado antes do render, que preenche parâmetros padrão).

## 3.19.0 (15/10/2026) · Fase 14a: base da UI, quadros de referência e camada `code` isolada

Release de fechamento da 14a. Sem mudança de formato de projeto nem de migração; o render não mudou (a base de quadros de referência confirma: diferença 0.000). `check.mjs`: 139 verificações, todas verdes.

### Fase 14a: base da UI (DS v2 funcional)

- **Tokens v2** em `app/style.css` (bloco V6): elevação por tom de cinza (`--s1`, `--s2`, `--s3`), um acento funcional (`--accent`, o verde da paleta STANDARD do app; escuro `#00ff3c`, claro `#007a22` para manter contraste), quinas retas em tudo (`--r:0`), escala de texto com piso de 11 px, escala de espaço de 4 px. Spec e racional em `docs/brand/UI-REDESIGN-PROPOSTA.md`.
- **Slider novo:** trilha de 4 px com preenchimento, alça de 14 px, valor em chip, rótulo de parâmetro em caixa normal. O que difere do padrão ganha acento (preenchimento e valor) e só então mostra o botão de restaurar. Módulo `app/slider-ui.js` (só apresentação: escreve `--p` e as classes `hasdef` e `chg`; nunca muda valor nem dispara evento). `ctlHtml` passa a gravar `data-def`.
- **Regras de forma e caixa (decisão do usuário em 14/10):** nada arredondado, inclusive a alça do slider (retângulo de 10×18 px); todo texto em caixa alta (menos o que o usuário digita); barra de ações retangular, de fundo preto (`--bg`), com botão **Ocultar** e botão **Barra** para trazê-la de volta (estado salvo). Painel de propriedades passa de 400 para 440 px (mínimo de 360), por causa do trilho de ícones.
- **Tipografia (DS):** Helvetica no texto, rótulos de parâmetro e descrições; Martian Mono em títulos, categorias (trilho, biblioteca, modo, seções) e dados.
- **Casca nova (14a-2), layout inspirado em editores como o Photoshop e apps de dither, com fontes, cores e linguagem do GYULYIA DS:**
  - **Slider empilhado:** rótulo à esquerda, valor à direita, trilha embaixo na largura toda (`.pc:has(>input[data-num])`).
  - **Barra superior em três zonas:** marca e modo | vista, zoom e histórico | briefing, tema, idioma e ajuda. Em telas de até 1180 px a zona do meio desce para uma segunda linha.
  - **Trilho de ícones à direita:** as abas viram ícones de linha (1,5 px) com rótulo, num trilho vertical; o painel de propriedades fica ao lado. Em até 900 px o trilho volta a ser uma faixa horizontal.
  - **Barra de ações flutuante** sobre a vista (só acima de 900 px), com **Exportar** em destaque (abre a aba Exportar).
  - **Biblioteca à esquerda** (Composições e Camadas, com busca e recolher). As abas `comp` e `lay` do trilho continuam existindo, escondidas, e só abrem a biblioteca; a aba padrão do painel passou a ser Parâmetros. Abaixo de 1280 px ela começa recolhida; em até 900 px vira uma gaveta inferior.
  - `ui_layout_check.mjs` ganhou as larguras novas (440 padrão, 360 mínimo); `ux_check.mjs` foi atualizado para a nova estrutura: Composições e Camadas ficam na biblioteca, e a conferência de ajuda por aba cobre só as abas do trilho.
- Sem mudança de render, de projeto ou de formato; nenhuma migração.
- **Corrigido (15/10):** o tour abre a biblioteca recolhida antes do passo "Camadas" (`app/ux.js`); os últimos textos abaixo de 11 px (botões da biblioteca, etiqueta, seletor, campo de quadro) usam `--fs-xs` (11 px); medido no navegador, nenhum texto visível nas 11 abas fica abaixo de 11 px.
- **Dívida conhecida:** em celular deitado (até 900 px de largura e 540 de altura) a biblioteca não aparece (a troca de composição segue pelos botões 01 a 05 e as camadas por Mostrar camadas). Os textos novos (busca, recolher e abrir a biblioteca, Exportar) já têm tradução para o inglês.

### Camada `code` isolada por alcance

- **Problema medido:** o filtro de texto (`lintCode`) era a única barreira e se contornava montando `constructor` por concatenação (`K.ease.out['constr'+'uctor']('return this')()` devolvia a janela) ou por `c.canvas.ownerDocument.defaultView`. Provado por teste vermelho antes da correção.
- **Fronteira nova, de alcance:** construtores de função selados (`Function`, `AsyncFunction`, gerador e gerador async; `new Function` do motor não muda); o contexto 2D chega à camada como fachada sem `.canvas` (que devolve `undefined`) e desembrulha os argumentos; `K.img(name)` devolve cartão `{kind, name, w, h}` em vez do registro com o `<img>`, e `c.drawImage(K.img(n), ...)` continua funcionando. Custo medido: +0,9 ms por quadro com 3000 chamadas de desenho.
- **Teste novo `code_sandbox_check.mjs`:** passeio pelo grafo de objetos a partir de `c`, `K` e `Math` (tem de não achar janela, nó do DOM nem construtor real), 8 ataques conhecidos, controle negativo do passeio (no contexto cru ele acha `c.canvas`), controle positivo (o código legítimo desenha) e o filtro de texto como primeira barreira.
- **Limite honesto:** o código ainda roda no mesmo contexto da página, sem processo separado (o render síncrono e determinístico impede Worker). Poluição de protótipos e laços infinitos não são cobertos; o aviso de autorização diz isso e continua exigindo confiança em quem gerou o arquivo.

### Fase 20, primeira parte: quadros de referência versionados

- **Base versionada:** `examples/reference/parity.json` guarda 184 quadros de 120 casos (as 8 composições da galeria em 3 quadros e uma camada por opção de shader, fx, synth, ISF e, novas, field, glyphs, solid, particles, temporal, shape, instrument, tunnel, symbols, lines e pixeltext), encolhidos por média em caixa para ~1200 px (893 KB). O baseline obsoleto da fase 2 deixa de existir.
- **`node scripts/gl_parity.mjs --update`** regrava a base; **`--compare`** (sem arquivo) compara com ela. `check.mjs` roda a comparação e um controle negativo (quadro adulterado tem de reprovar). Duas execuções seguidas dão diferença 0.000 (render por software determinístico). Dura ~45 s.
- **Regra:** quem muda o render de propósito confere o desenho, roda `--update` e explica no commit; mudança de render sem `--update` reprova o `check.mjs`.
- Ainda na fase 20: contatos de galeria com tempo estourado (`02-jardim-tela` em `gallery.mjs`) e quadros em tamanho cheio por camada de fundo/forma.

## 3.18.0 (14/10/2026) · Fase 13: partículas em GPU, sem estado

- **Nova camada `particles`** (`app/particles.js`): 50 a 20 mil pontos numa só chamada `gl.POINTS`, sem buffer de vértices. A posição de cada partícula é função em forma fechada do índice, da semente e da fase do loop, no vertex shader: o quadro N sai igual fora de ordem, o loop fecha por frequências inteiras, o acaso é hash de inteiros. Seis regras: `ORBITA`, `FONTE`, `ESPIRAL`, `CHUVA`, `EXPLOSAO`, `ENXAME`; mistura `soma` ou `normal`.
- **Renderer:** `r.drawPoints(n)`, vertex shader próprio em `r.program` (`vert`), mistura `soma`, métrica `activeParticles` real, `glProgV` em `gl-glue.js`.
- **Entra pelo conceito:** `particles` é tipo de herói do Creative IR (`heroTypes`, pesos em 12 verbos, `particleKinds` liga cada um dos 32 verbos a uma regra); o Animation IR toca em `size`. Python e navegador dão o mesmo projeto. Aditivo: projetos antigos não precisam de migração.
- Teste novo `particles_check.mjs`; `registry.mjs` confere os 32 verbos; `references/particles-layer.md`; esquema, SKILL, PROMPT e famílias atualizados. Simulação com estado, rastro e colisão ficam para depois (histórico do RenderGraph).

## 3.17.0 (12/10/2026) · Fase 19: versionamento e migração

- **`meta.formatVersion`** (inteiro; ausente = 0) guarda a versão do FORMATO do projeto; o gerador (Python e navegador) já entrega o formato atual (2). `schema` continua `ai-vj-generator/2`, e `/1` abre como sempre.
- **Pipeline de migração com passos declarativos** em `registry/versions.json` (`format`, `ops`, `steps`), aplicados do mesmo jeito por `app/migrate.js` (motor, em toda importação) e `scripts/migrate_project.py` (CLI: imprime o que mudaria, `--out`, `--in-place`). Dois passos reais, retroativos à 3.1.0: rótulos de capacidade `requiresBridge` e `conceptual` viram `notSupported`; arquétipos `object-mapping` viram `installation` e `immersive` e `dooh` saem. Roda numa cópia (a entrada nunca muda), é idempotente, e quem manda é a versão (projeto já carimbado não é migrado).
- **Formato mais novo que o do motor** abre com aviso: não é recusado, a versão não é reescrita e campos desconhecidos não são apagados. O validador avisa formato mais novo, recusa `formatVersion` inválido e anota projeto atrasado.
- **Regra para as fases seguintes** (`references/migration.md`): mudança aditiva não precisa de passo; renomear, mover ou remover campo traz passo novo e sobe `format.current`. `registry.mjs --check` exige passos contíguos de 1 até a versão atual.
- Teste novo `migrate_check.mjs`: resposta conhecida, Python = navegador, idempotência, controles negativos, formato 99, os 11 exemplos e projetos da galeria só ganham o carimbo, e um da galeria migrado passa no validador.

## 3.16.0 (12/10/2026) · Fase 18: redução do monólito

- **`app/index.html` virou arquivo gerado.** Todo o JS escrito à mão (cerca de 4 400 linhas: núcleo, camadas base e geradas, composição, cola WebGL, camadas fixas, kit de código, projeto, runtime, palco, painéis, exportação, ficha, layout, receitas, paleta rápida, regras EN e boot) e o CSS (416 linhas) foram para 18 módulos `app/*.js` e `app/style.css`, embutidos por `node scripts/embed-modules.mjs` entre marcadores, no mesmo lugar e no mesmo escopo (a IIFE do motor). Sobraram 6 linhas de script soltas no HTML.
- **Mudança sem efeito no render, provada por bytes:** tirando os marcadores e o cabeçalho de cada módulo, o `index.html` novo e o `dist/ai-vj-generator.html` são idênticos byte a byte aos da 3.15.0.
- **Portão novo em `check.mjs`:** o script solto no `index.html` não passa de 20 linhas (com controle negativo). Código novo vai para um módulo.
- Roadmap revisado: ordem 18, 19, 13, 14, 15, 16, 17, 20 (galeria + testes visuais fundidos), 22, 24; a antiga 23 virou regra por fase.

## 3.15.0 (12/10/2026) · Fase 12: 3D generativo

- **Decisão (ADR em `docs/ARQUITETURA-RENDER.md`): código próprio sobre o WebGL2, sem biblioteca 3D.** Nova camada `solid` (`app/solid.js`): uma forma 3D por distância assinada (raymarching num fragment shader) vista por uma câmera que orbita em voltas inteiras por loop, então o loop fecha por construção. Oito formas (`ESFERA`, `TORO`, `CRISTAIS`, `GIROIDE`, `COLUNAS`, `ANEIS`, `ONDAS`, `ESPONJA`), três materiais (`fosco`, `metal`, `vidro`), câmera (voltas, elevação, distância), luz e névoa. Sem relógio e sem `Math.random`; áudio só em `uBass` e `uHit` e só se a declaração temporal deixar. A saída é uma camada com alfa como as outras; a superfície continua restrição 2D.
- **Entra pelo conceito:** `solid` é tipo de herói do Creative IR (`registry/creative.json`: `heroTypes`, pesos nos verbos `orbit`, `morph`, `fold`, `bloom`, `accumulate`, `fracture`, `assemble`, `rise`, `converge`, e `solidKinds`, que liga cada um dos 32 verbos a uma forma); o Animation IR toca no parâmetro `size`; o Depth IR pode pôr a camada num plano. Python (`brief_to_project.py`) e navegador (`genai.js`) dão o mesmo projeto.
- Teste novo `solid_check.mjs`; registry confere que todo verbo aponta para uma forma que existe; `references/solid-layer.md`; esquema, SKILL e PROMPT atualizados.

## 3.14.0 (11/10/2026) · Fase 11: 2.5D

- **Depth IR** (`depth_ir.py`, `app/depth.js`, dados em `registry/depth.json`): as camadas geradas ganham um plano de profundidade (`layer.z`, -1 longe a +1 perto) e cada composição ganha **uma câmera** (`composition.camera`), registrados em `meta.depthIR`. Sem malha e sem 3D: planos. A câmera tem seis movimentos: `sway` e `crane` (paralaxe: o plano longe desliza contra o perto), `orbit` (elipse), `dolly` (empurra e recua, o perto cresce mais), `rack` (nada se move, o foco viaja) e `still`. Névoa (o que está atrás do foco perde opacidade e cor) e foco (o que passa de 0,25 do plano de foco desfoca) valem para todas.
- **Os planos vêm do tier:** chão -0,9..-0,5, estrutura -0,4..-0,2, herói 0,1..0,3 (o plano de foco: nunca nublado nem mole), evento 0,6..0,8; as camadas de um tier se espalham no intervalo, a de baixo mais longe. Fundo, instrumento, informação (texto) e acabamento ficam no plano da tela, sem `z`.
- **O arquétipo do Animation IR escolhe a câmera** (pulse e breathe dolly, glide e stutter sway com 8 passos parados, orbit orbit, ripple rack, settle crane; eixo vertical troca sway por crane) e a energia do briefing escala a amplitude. **Surface IR:** dobra declarada ou área ativa dura deixa só `rack`: nada desliza nem cresce por cima de uma costura. A câmera roda em ciclos inteiros do loop (o loop fecha), não ouve o áudio e ignora o portão de bandas da fase 10.
- **Motor:** `paintLayer` aplica a câmera depois da modulação (`DEPTH.adjust`): deslocamento, escala, desfoque e `opacity()`. Projeto sem câmera e sem `z` renderiza igual, pixel a pixel. Validador: `z` fora de [-1, 1], câmera desconhecida, ciclos não inteiros, amplitude fora do limite e câmera que se move em `canvas.folds` são erros; `z` em texto ou medidor, `z` sem câmera e câmera sem `z` são avisos. Os dois geradores e `plan_ir.py --apply` (idempotente) gravam planos e câmera.
- Teste novo `depth_check.mjs` (Python = navegador no IR em 3 superfícies, nos 8 arquétipos com e sem costura e nas transformações de 6 câmeras × 7 fases × 4 planos; resposta conhecida em pixels: paralaxe +18,0 e -9,0 px com sinais opostos, crane só em y, orbit em três quadros, dolly 10,2% e 0,6%, névoa 21% de luz, foco, rack; o loop fecha; a câmera ignora o áudio; projeto antigo igual; controles negativos; validador com 9 recusas e avisos; o deslocamento medido bate com o IR); `references/depth-ir.md`; `PROMPT.md` e `SKILL.md` apontam para ele.
- Correção: a constante `VERSION` do motor ainda dizia 3.12.0 desde a fase 10; agora 3.14.0.

## 3.13.0 (11/10/2026) · Fase 10: semântica de áudio

- **Toda camada declara um comportamento temporal** (`layer.temporal = { behavior, listens, reason }`), e só algumas ouvem a música. Seis comportamentos (`registry/audio.json`, `audio_semantics.py`, `app/audio-sem.js`): `still`, `drift` e `beat` **não ouvem** (o áudio nunca chega à camada; ela marca o tempo com o loop e as ondas do BPM); `follow`, `accent` e `section` ouvem as classes de banda que declaram (`bass`, `mid`, `high`, `hit`, `level`).
- **A estratégia dá o orçamento e o plano:** `none` 0 camadas ouvem, `subtle` 1 (o herói segue os graves), `structural` 2 (herói nos graves, um campo de chão segue a presença da faixa, sem golpes), `rhythmic` 3 (herói graves, estrutura médios, um campo de chão agudos; o herói acentua golpes quando o arquétipo é pulse, stutter ou surge), `full` 3 (herói acentua, estrutura médios, a marca de evento nos golpes). Uma camada por história; o resto recua para `drift` ou `beat`. O instrumento é o medidor e fica fora do orçamento. O resumo vai em `meta.audioSemantics` (um por composição).
- **O motor respeita a declaração** (`layerFrame` + `AUDIOSEM.mask`): a camada que não ouve fica sem nenhuma banda instantânea, sem pulso e com a modulação por banda fechada; a que ouve recebe só as classes de `listens`. Tempos integrados e ondas do BPM seguem em todas. **A regra antiga "todo shader ouve" deixou de ser global:** vale para o shader que declara ouvir e para projeto sem declaração (projeto antigo abre como sempre).
- **Validador:** `behavior` e `listens` conhecidos, camada que ouve precisa de classe e a que não ouve não declara nenhuma, ninguém passa do orçamento da estratégia (nunca mais de 3), shader `drift` ou `beat` não precisa ler uniform de áudio; avisos para `p.audio` ou modulação por banda em camada que não ouve e para camada que ouve sem nada ligado ao áudio.
- Os dois geradores gravam a declaração em toda camada (independe do Creative IR conduzir); `plan_ir.py --apply` declara um projeto antigo. Galeria regenerada. Teste novo `audio_sem_check.mjs` (Python = navegador em 5 estratégias × 3 arquétipos, orçamento, motor mascarando as bandas com controle negativo, validador com 8 casos recusados, projeto antigo segue a regra antiga).

## 3.12.0 (09/10/2026) · Fase 9: Surface IR

- **Surface IR** (`surface_ir.py`, `app/surface-ir.js`, dados em `registry/surface.json`): uma por projeto, em `meta.surfaceIR`. Analisa o que o autor entregou da superfície (tamanho, dobras, regiões de um CSV ou de uma máscara PNG, passo do LED, distância) e **rotula cada fato com a confiança**: `EXPLICIT` (declarado), `DETECTED` (medido numa forma entregue: arranjo, simetria e área ativa das regiões), `INFERRED` (palpite por regra: só aconselha) e `UNKNOWN` (faltou o dado: vira pergunta, o valor é `null`, nunca se chuta).
- **A força da restrição segue a confiança:** só `EXPLICIT` e `DETECTED` viram restrição dura (`activeArea`, `foldBands`, `safeArea` das regiões); `INFERRED` aconselha (`readingAxis`, `legibility`); `UNKNOWN` não restringe nada. O validador recusa restrição dura apoiada em fato INFERRED e fato UNKNOWN com valor.
- **Aplicado ao Composition IR:** com dobras ou regiões declaradas, herói, secundário e apoio caem em células ativas e não cruzam a costura, o texto fica a 6% da dobra, a costura entra no espaço negativo, `safeAreas` vem da caixa das regiões e `compositionIR[i].surface` registra o que foi movido. Sem dobras nem regiões nada muda (passo e distância sozinhos continuam dando a mesma composição).
- `brief.surface` aceita `regions`; os dois geradores levam dobras e regiões ao `canvas` e gravam `meta.surfaceIR`; `plan_ir.py --apply` lê dobras e regiões do projeto. Aba Superfície: tabela de fatos com a confiança de cada um, restrições duras e brandas, perguntas em aberto; regiões importadas de PNG ficam marcadas como `mask`.
- Teste novo `surface_ir_check.mjs` (Python = navegador em 11 superfícies e na composição; confiança de cada fato; medidas com resposta conhecida; controles negativos que provam que as regras podem falhar; validador contra IR adulterado; plan_ir; aba). `references/surface-ir.md`; `PROMPT.md` e `SKILL.md` apontam para ele.

## 3.11.0 (09/10/2026) · Fase 8: 2D generativo avançado

- **Camada `field`** (GPU, `app/field.js`): um campo escalar (ruído que anda numa volta fechada por loop, ou a luminância de uma imagem do projeto em `p.media`) desenhado por uma de **12 regras**: isolinhas, correntes (linhas de fluxo), células (Voronoi), Truchet, pontos em favo, moiré, metabolas, interferência, pontilhado, relevo, grade deformada e polar. `p.gain` (contraste do campo) e `p.invert`. Imagem como fonte: a mesma regra desenha outra origem.
- **Camada `glyphs`** (tipografia generativa em grade): cada célula escolhe um caractere de uma rampa (`p.ramp`, do mais vazio ao mais cheio) segundo um campo (`noise`, `radial`, `wave`, `spiral` ou `image`) e uma cor entre `c1` e `c2`; `shuffle` embaralha em 8 passos por loop, de forma determinística. É auditada para determinismo como as outras camadas de canvas 2D.
- **Entram pelo conceito:** `field` e `glyphs` são tipos de herói do Creative IR (`heroTypes`, pesos nos verbos); `fieldKinds` e `glyphSources` ligam cada um dos 32 verbos a uma regra e a um campo (`drift` e `flow` pedem CORRENTES, `fragment` e `assemble` pedem TRUCHET...). A rampa dos glifos vem do título do briefing. O Animation IR toca o arquétipo em `gain`. Gerador do navegador e `brief_to_project.py` iguais.
- Editor: rótulos de P1 a P4 por regra, troca de regra carrega os padrões, validação (imagem-fonte ausente é erro, shader compila), categorias Shader › Campo e Texto › Glifos. `families.json` e `families-cost.json` com as duas camadas.
- Teste novo `field_check.mjs` (12 regras diferentes entre si, determinismo, loop fecha nas 16 combinações, imagem conduz com resposta conhecida, inversão, rampa, embaralhar, validador, Python = navegador, controle negativo); `references/field-layer.md`.

## 3.10.0 (09/10/2026) · Fase 7: Animation IR

- **Animation IR** (`animation_ir.py`, `app/animation.js`, dados em `registry/animation.json`): uma por composição, em `meta.animationIR`. Diz como as coisas se movem, em tempo musical: arquétipo, relógio (`loopFrames`, ciclos por loop, quadros por ciclo, semicolcheia em quadros), easing, antecipação e assentamento medidos em quadros, quem lidera e quem segue e quantas semicolcheias atrasado (herói, estrutura, chão, instrumento, texto), coreografia das cinco fases, cinco eventos na grade de batidas e o contrato do loop.
- **8 arquétipos de movimento** (pulse, breathe, glide, surge, stutter, orbit, ripple, settle). Os 32 verbos do Creative IR votam; sem verbos os eixos escolhem; cada composição de um set usa um arquétipo diferente; `brief.motionArchetype` força o primeiro.
- **Aplicado às camadas** quando o Creative IR conduz: a curva do arquétipo no parâmetro-alvo do herói (ou na rotação, no orbit), a estrutura segue, contra-gira ou fica parada, e o atraso vai em `p.phase`. Só as curvas `lfo` próprias nas chaves conduzidas são trocadas (aplicar duas vezes não empilha); as fases `env` e a modulação por áudio ficam. Todos os ciclos são inteiros: o movimento se repete a cada loop e emenda sem salto, exceto a queda declarada do `surge`.
- O Animation IR é aplicado depois do Composition IR no gerador do navegador, no `brief_to_project.py` e no `plan_ir.py` (que agora grava os três IR). Validador: `meta.animationIR` (ciclos inteiros, atrasos e eventos dentro do loop, `loop.closes`). A galeria foi regenerada.
- Teste novo `animation_check.mjs` (Python = navegador no IR em 23 casos e nas camadas em 32 combinações; conceito escolhe o arquétipo; 4 arquétipos fazem 4 movimentos diferentes dos mesmos geradores; periodicidade; atraso; antecipação e assentamento; eventos; só aplica quando conduz; IR quebrado é recusado; trocar o arquétipo troca a imagem); `references/animation-ir.md`.

## 3.9.0 (09/10/2026) · Os dois IR para qualquer IA

- **`PROMPT.md` v3.1** (passo 2b): ensina qualquer IA, com ou sem ferramentas, a planejar a peça antes da técnica. IR = Representação Intermediária, um plano estruturado entre o briefing (palavras) e os geradores (código): o **Creative IR** (conceito, verbos visuais, motivos, hierarquia, comportamento) e um **Composition IR** por composição (gramática espacial, zonas, espaço negativo, fases). Lista os 32 verbos, as 12 gramáticas, os campos de `meta.creativeIR` e `meta.compositionIR`, a forma `env` e a regra de que o `role` de cada camada começa com o seu tier.
- **`scripts/plan_ir.py`**: `plan_ir.py brief.json` imprime os dois IR; `--apply project.json` grava em `meta` e posiciona as camadas de um projeto escrito à mão (camadas achadas pelo `role` ou pelo nome, idempotente).
- `SKILL.md`, `/vj` (Claude) e o validador (nota quando falta `meta.creativeIR`) apontam para o plano; `registry.mjs --check` confere que o PROMPT cita todos os verbos e gramáticas. Teste novo `plan_check.mjs`.

## 3.8.0 (09/10/2026) · Fase 6: Composition IR

- **Composition IR** (`composition_ir.py`, `app/composition.js`, dados em `registry/composition.json`): uma por composição, em `meta.compositionIR`. Traz gramática espacial, zonas (herói, secundário, apoio, fundo), espaço negativo, ponto focal, massa visual, equilíbrio, alinhamento, eixo de movimento, mapa de densidade, escalas, profundidade, áreas seguras, comportamento de borda, âncora do texto e cinco fases (establish, develop, transform, peak, release).
- **12 gramáticas** (centered, offset, diagonal, radial, horizontal, vertical, distributed, clustered, asymmetric, symmetrical, hierarchical, edge-driven). A proporção da superfície e os verbos do Creative IR votam: a superfície ganha o primeiro lugar, o conceito molda o resto, e cada composição de um set usa uma gramática diferente. As zonas são frações do lado curto: o herói nunca é esticado para a proporção.
- **Aplicada às camadas** quando o Creative IR conduz: posição e escala do herói e da estrutura, centro do instrumento e do texto, direção das linhas, e as cinco fases como modulação `env` (escala, contraste, movimento, rotação, densidade), com o loop fechando.
- Nova forma de modulação `env` (motor, editor, esquema e validador). A galeria foi regenerada.
- Teste novo `composition_check.mjs` (Python = navegador em 40 casos, 5 superfícies; espaço negativo em 60 combinações; mesmos geradores em outro lugar; envelope fecha o loop); `references/composition-ir.md`.

## 3.7.0 (09/10/2026) · Fase 5: Creative IR

- **Creative IR** (`creative_ir.py`, `app/creative.js`, dados em `registry/creative.json`): compila o briefing em conceito, verbos visuais, motivos, estratégia de composição e de animação, famílias de gerador e faixas de parâmetro, e grava em `meta.creativeIR`. 32 verbos semânticos (cada um com geometria, movimento, comportamento espacial e temporal, densidade, papel do áudio, transição, material e composição), 16 conceitos (palavras em português e inglês), pesos de humor e 5 arcos.
- **O conceito pesa 3 vezes o humor.** Com conceito reconhecido (ou `brief.verbs`), o IR escolhe herói, estrutura e campo de cada composição, escala a densidade pelo arco, mistura o movimento (65% IR, 35% humor) e nomeia as composições pelo arco. Sem conceito reconhecido, o humor decide como antes.
- Mesmo humor, conceitos diferentes: "decadência" e "emergência" com "frio, contemplativo" diferem em topologia, movimento, densidade, arranjo, arco, família de gerador e material (`creative_check.mjs`). Paridade Python = navegador em 20 briefings.
- `brief.verbs` (opcional), `meta.creativeIR` no esquema e no validador; `references/creative-ir.md`.

## 3.6.0 (09/10/2026) · Fase 4: render graph e efeitos temporais

- **RenderGraph** (`app/rendergraph.js`): nós Source, Generator, Shader, Effect, Mask, Composite, History, Feedback e Output; compilação (dependências, ordem estável, ciclos, um Output), execução com devolução de recursos ao pool e `CanvasPool`. A composição de um quadro (`composeFrame`) roda por ele em `renderFrame`, exportação PNG, MP4 e replay; paridade de pixels com a versão anterior: 0,000 de 255 em 123 quadros.
- **Camada `temporal`** (Efeito › Tempo): TRILHA, FEEDBACK, SLIT SCAN (até 24 quadros em `TEXTURE_2D_ARRAY`) e DESLOCAR, determinísticos: a saída depende só dos quadros anteriores, o histórico é reconstruído por replay depois de um salto, a exportação zera antes de começar e o loop fecha na emenda.
- Correção no renderizador: upload e cópia de textura agora ativam a unidade certa (`bindForWrite`); o cache de `bindTexture` só vale para amostragem.
- Teste novo `rendergraph_check.mjs`; `references/temporal-layer.md`; `docs/ARQUITETURA-RENDER.md` com o grafo.

## 3.5.0 (09/10/2026) · Fase 3: recursos de GPU

- **Pools de textura e de framebuffer** com descritor (largura, altura, formato, filtro, wrap, profundidade, uso), adquirir/devolver/reaproveitar e descarte do que ficou parado; a textura do `fx` passa pelo pool (zero alocação por quadro depois do primeiro).
- **Estado da GPU** sem chamadas redundantes (blend, depth, scissor, framebuffer, textura por unidade, além de programa, viewport e VAO).
- **Métricas de desenvolvimento** `AIVJ.glMetrics()`: tempo de quadro, passes, desenhos, trocas de shader, alocações, texturas ativas, partículas ativas e VRAM estimada.
- Teste novo `gpu_resources_check.mjs`; `docs/ARQUITETURA-RENDER.md` atualizado.

## 3.4.0 (08/10/2026) · Fase 2: fundação WebGL2

- **Renderizador WebGL2** (`app/webgl.js`, `WEBGL.create`): contexto `webgl2`, programas em cache com esquema de uniforms e último uso, primitiva de tela cheia em VAO fixo, viewport e programa sem troca redundante, texturas e framebuffers como interface, detecção de capacidades (instancing, transform feedback, 3D, MRT, float). Sem WebGL2 o motor mostra um aviso técnico e não volta ao WebGL1.
- **GLSL ES 3.00 sem reescrever shader**: os projetos, receitas e a biblioteca ISF continuam no dialeto ES 1.00; o renderizador compila tudo como `#version 300 es` com um cabeçalho de `#define` (`gl_FragColor`, `texture2D`, `varying`). Funções embutidas redeclaradas por shaders de terceiros (`sign`, `round`) são tratadas.
- **FrameContext** (`frameContext`) e **uniforms por grupo** (`glFrameUniforms`: frame, audio, appearance, project): o render lê só o contexto do quadro, nunca relógio, `Date.now` ou `Math.random`.
- `scripts/gl_parity.mjs` compara a imagem do WebGL1 com a do WebGL2 em 123 quadros (galeria, shaders, filtros, cadeias, ISF): diferença média 0,000 de 255. Teste novo `webgl2_check.mjs`. ADR e mapa do render em `docs/ARQUITETURA-RENDER.md`.

## 3.3.0 (08/10/2026) · Fase 1: registry

- **`skill/ai-vj-generator/registry/`**: `generators.json` (34 tipos: categoria, renderMode, parâmetros, audioRoles, supportsAlpha, deterministic, surfaceAware, performanceClass), `parameters.json` (parâmetros comuns com unidade e papel), `modulation.json` (17 fontes), `capabilities.json` e `versions.json` (esquema atual, legados, migração e campos obsoletos).
- **Deriva corrigida:** o esquema não aceitava `kick`, `onset` e `flux` em `layer.mod.src` (a interface e o validador aceitavam). Agora o enum de `src` e o de `layer.type` vêm do registry; o validador lê `modulation.json`; `project-schema.md` cita os cinco tipos que faltavam.
- `scripts/registry.mjs --write` regenera o registry a partir do motor e grava os enums no esquema; `--check` (dentro de `check.mjs`) falha se motor, esquema, validador ou docs divergirem.

## 3.2.0 (08/10/2026) · Menu enxuto e camadas por categoria

- **Menu:** saem as abas **Gerar** e **ISF**. O caminho sem IA é `brief_to_project.py` + **Carregar**; a avaliação estrutural segue em `AIVJ.evaluate` e `scripts/evaluate.mjs` (a interface volta na Fase 15).
- **Camadas por categoria:** 34 tipos viram 9 categorias de até duas palavras (Fundo, Shader, Formas, Texto, Mídia, Dados, Partículas, Efeito, Código). O menu Adicionar escolhe categoria e tipo; nos parâmetros da camada, **Categoria** e **Tipo** trocam o tipo (guarda a transformação, zera o resto). O JSON continua guardando o tipo interno: projetos antigos abrem sem mudança.
- A camada `isf` fica em Shader › Biblioteca ISF; `ui-core.js` e `isf.js` substituem `gen-ui.js` e `isf-ui.js`.
- Teste novo `layers_check.mjs`; testes de aceite, ISF e UX ajustados ao menu novo.

## 3.1.0 (08/10/2026) · Fase 0 do roadmap v11: limpeza de escopo

O produto passa a ser um sistema generativo de animação: entra briefing e informação 2D de uma superfície, saem PNG sequence e MP4. Fora de escopo: performance, media server, mapping, geração de pixel map ou blueprint, MIDI, OSC, NDI, Spout, integrações com Resolume, TouchDesigner ou OBS, domo, DOOH.

- **Removido:** XML de Advanced Output do Resolume, mapa .json e padrão de teste das fatias, download de pixel map CSV, tabela "Transporte de sinal", textos de Resolume/TouchDesigner/OBS no LEIAME do export, exportação de ISF (botão, `isf.py export`), `export_slices.py`, `bridge-obs-spout.md`, arquétipos de objeto, domo e DOOH.
- **Novo:** camada `isf` (a biblioteca de 84 shaders escolhida no parâmetro `lib` da camada); export de PNG sequence e MP4 do **projeto completo ou de uma região** (display), com a região no nome dos arquivos e no manifesto.
- **Capabilities:** quatro rótulos (`supported`, `exportable`, `inputOnly`, `notSupported`). `requiresBridge` e `conceptual` continuam abrindo, com aviso, lidos como `notSupported`. Arquétipos antigos (`object-mapping`, `immersive`, `dooh`) abrem com aviso.
- **Roadmap v11** em `docs/ROADMAP.md` (o v10 foi para `docs/historico/ROADMAP-v10.md`). A decisão de não migrar para WebGL2 está revogada; a Fase 2 registra o ADR.
- Auditoria em `docs/FASE-0-AUDITORIA.md`.
- `render.mjs --region N`: PNG ou MP4 de um display pela linha de comando; o PNG recorta antes de transferir do navegador.
- Relatórios antigos, notas da 3.0.0 e versões anteriores do changelog saíram do repositório (ficam no histórico do git).
