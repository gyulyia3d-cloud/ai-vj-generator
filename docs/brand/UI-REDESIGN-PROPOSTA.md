# AI VJ Generator: proposta de UI/UX (fase 14a) e imagens do GitHub

Status: **proposta para discussão**, nada implementado. Escrita em 2026-10-14 depois de auditar a 3.17.0 no navegador (1440×900, biblioteca padrão carregada).
Decisões já tomadas pelo usuário: DS v2 funcional; fonte em `docs/brand/` com espelho em `GYULYIA-Design-System/ui_kits/aivj`; base da UI como fase 14a, antes da 13.

## 1. Enquadramento do problema

O app é um sistema de autoria generativa com muitos controles (75 sliders, 40 campos numéricos, 11 abas numa coluna de 280–400 px). Quem não escreveu o código não sabe onde ficar. A meta é ficar com a cara de um software de criação profissional (Adobe), mais bonito, com sliders que convidam a mexer, sem perder a identidade GYULYIA.

Sucesso (mensurável):
- Texto de controle nunca abaixo de 12 px (hoje: ~1.000 textos entre 8,5 e 10,5 px).
- Controle de desktop com 28 px de altura no mínimo (hoje: botões de 16 px). Em ponteiro grosso, 44 px.
- Qualquer parâmetro da camada selecionada a no máximo 2 cliques de distância, sem trocar de aba.
- Primeira abertura sem diálogo empilhado: no máximo 1 passo antes de ver o canvas.
- Todo slider mostra valor, estado (padrão ou alterado) e se está modulado, sem abrir nada.

## 2. Auditoria da UI atual (priorizada)

| P | Problema | Dimensão | Correção |
|---|---|---|---|
| P1 | Texto de 8,5–10,5 px em quase tudo | Densidade / legibilidade | Escala tipográfica com piso de 12 px |
| P1 | 11 abas planas (Compose, Layers, Params, Text, Media, Audio, Project, Surface, Sheet, Export, Guide) | Hierarquia | Áreas de trabalho + painel Propriedades contextual |
| P1 | Slider de 1 px, sem preenchimento, valor em campo separado | Affordance | Slider novo (seção 5) |
| P2 | Dois diálogos seguidos na abertura | Carga cognitiva | Um passo de entrada + tour curto opcional |
| P2 | Parágrafo de ajuda no topo de cada aba | Densidade | Ícone `?` com dica; guia vira tour |
| P2 | Barra superior de 66 px com botões quebrando linha | Hierarquia | Menu + seletor de área de trabalho + ações agrupadas |
| P3 | Caixa-alta em rótulos densos | Escaneabilidade | Caixa-alta só em abas, títulos e eyebrows |

## 3. Princípios (em ordem de prioridade para conflito)

1. **A obra manda.** O canvas é o maior elemento da tela; a interface recua em tom e cor.
2. **Um acento, um significado.** A cor de acento só marca o que está ativo, alterado ou modulado.
3. **Mostrar o estado, não pedir para abrir.** Valor, padrão/alterado e modulação ficam visíveis no próprio controle.
4. **Perto é junto.** Rótulo mais perto do seu controle do que do vizinho; grupos separados por espaço antes de linha.
5. **Ajuda onde a dúvida nasce.** Dica no controle, não parágrafo no topo.

## 4. DS v2 funcional (extensão do GYULYIA DS)

Mantém: Martian Mono, base preto/branco/cinza, linhas finas como estrutura, tom seco, sem emoji.
Passa a permitir (só nos controles da ferramenta, nunca nas imagens de marca sem aprovação):

**Cor**
- Elevação por tom de cinza (modo escuro): `--bg #000`, `--s1 #0d0d0d` (painéis), `--s2 #161616` (cartões, campos), `--s3 #202020` (menus, dicas). Linhas `#262626`.
- Texto: `#f2f2f2` principal, `#999` secundário, `#666` terciário (mínimo 4,5:1 sobre `--s1` para o secundário em corpo).
- Acento funcional: **verde da paleta STANDARD do app** (`#00ff3c` no escuro, `#007a22` no claro, definido pelo usuário em 2026-10-14; o DS em si não tem verde). Contraste do claro conferido por conta: ≥ 5:1 sobre `#f6f6f6`. Uso: preenchimento de slider alterado, seleção, foco, selo de modulação.
- Estados: erro e aviso com ícone e texto, nunca só cor.
- Tema claro: a primeira entrega é só escuro. Claro entra depois, com tokens semânticos já prontos.

**Forma**
- Raio 3 px em campos, botões e cartões de camada; 0 px no resto (painéis, linhas, canvas).
- Sombra só em menus e dicas flutuantes (`0 8px 24px rgb(0 0 0 / .5)`). Painéis acoplados não têm sombra.

**Tipografia** (razão ~1,25; piso de 12 px para conteúdo)
- 11 px: só microrrótulo em caixa-alta com tracking de 0,08em.
- 12 px: rótulos de parâmetro, valores. 13 px: texto de ajuda e campos.
- 16 / 20 / 25 px: títulos de painel, de área, de diálogo.
- Altura de linha: 1,2 em títulos, 1,5 em texto corrido. Valores numéricos com `tabular-nums`.

**Espaçamento** (escala de 4): 4, 8, 12, 16, 24, 32.
- Dentro do grupo: 4–8. Entre grupos: 16–24. Entre seções: 32. A razão é o que cria a hierarquia.

**Movimento:** 120–200 ms, easing padrão, nada elástico. Respeita `prefers-reduced-motion`.

## 5. Slider e painel Propriedades

Slider (um componente, usado em todo parâmetro):
- Linha: `rótulo (arrastável)` · `slider` · `valor` · `reset`.
- Trilha de 4 px, raio 2 px. Preenchimento cinza claro quando no padrão, ciano quando alterado. Alça de 14 px, com anel de foco visível.
- Valor num chip editável (clique para digitar, aceita contas como `1920/2`, como hoje). Setas ajustam; Shift grosso, Alt fino; duplo clique reseta.
- Ponto de reset só aparece quando o valor difere do padrão.
- Selo de modulação (áudio, env, LFO) como ícone pequeno à direita; clique abre a origem da modulação.
- Hit area de 28 px de altura (44 px em ponteiro grosso), mesmo com trilha fina.
- Estados: padrão, hover, foco, arrastando, desativado, alterado, modulado. Todos desenhados e testados.

Painel Propriedades:
- Segue a camada selecionada (ou a composição, se nada selecionado).
- Seções recolhíveis por assunto (Forma, Cor, Movimento, Áudio, Mistura), com contador de valores alterados no cabeçalho e memória do estado aberto/fechado.
- Busca de parâmetro no topo (filtra e abre as seções).
- Pré-ajustes como miniaturas, quando o gerador tiver receitas.

## 6. Estrutura da tela (grade e áreas)

```
┌──────────────────────────────────────────────────────────────────────┐
│ Menu · projeto · [Compor|Estilo|Movimento|Superfície|Exportar]  ⌘K  ? │  48 px
├──┬───────────────────────────────────────────────┬──────────────────┤
│  │                                               │ Propriedades     │
│T │                  CANVAS                       │ (camada ativa)   │
│r │         (HUD artístico preservado)            ├──────────────────┤
│i │                                               │ Camadas          │
│l │                                               │ (olho·trava·mist)│
├──┴───────────────────────────────────────────────┴──────────────────┤
│ Transporte: ▶ · BPM · tap · quadro · régua · gravar          métricas │  44 px
└──────────────────────────────────────────────────────────────────────┘
```

- Grade de 12 colunas no centro, trilho de ferramentas de 48 px, coluna direita de 320 px (arrastável entre 280 e 480), margem de 16 px.
- Áreas de trabalho trocam quais painéis aparecem e em que tamanho. O conteúdo das 11 abas atuais mapeia assim: Compor = Compose + Layers; Estilo = Params + Text + Media; Movimento = Audio + temporal; Superfície = Surface + Sheet; Exportar = Export + Project; Guide vira `?` e tour.
- Larguras estreitas (< 1024 px): painéis viram gavetas, canvas em tela cheia, transporte compacto.
- Atalhos preservados. Nada de lógica nova de render: só camada de apresentação (`app/style.css`, `ui-core.js`, `panels.js` e módulos de painel).

## 7. Fluxo de experiência (mapa resumido)

1. **Chega** com um briefing e o projeto do Claude pronto. A tela abre direto no canvas, com uma faixa de 1 linha: "Projeto carregado. Ajustar → Avaliar → Exportar".
2. **Entende** em 1 passo (tour de 3 telas, opcional, reabre pelo `?`).
3. **Ajusta** camada por camada pelo painel Propriedades. Sliders mostram o que mudou.
4. **Avalia** na área Movimento/Superfície com o crítico (fase 15 no futuro).
5. **Exporta** na área Exportar, com resumo do que sai (PNG sequência, MP4, região).

Momentos de atrito a vigiar: abrir o primeiro projeto, achar um parâmetro, desfazer, saber o que mudou, exportar uma região.

## 8. Plano da fase 14a (escopo e aceitação)

Escopo, nesta ordem:
1. Tokens v2 (cor, tipo, espaço, raio, movimento) em `app/style.css`, com tema escuro.
2. Componente de slider + chip de valor + selo de modulação, usado primeiro no painel de parâmetros.
3. Painel Propriedades com seções recolhíveis e busca.
4. Barra superior nova, seletor de áreas de trabalho, trilho de ferramentas.
5. Diálogo de entrada único, tour, `?` em vez de parágrafos.
6. Camadas num painel com olho, trava e modo de mistura.

Aceitação: critérios da seção 1, mais teste visual por captura em 1440×900, 1024×768 e 390×844; `check.mjs` verde; projetos antigos abrem iguais; nenhum controle perdeu função (lista gerada do estado atual); contraste conferido por script.

Riscos: perder um atalho ou parâmetro escondido; piorar a performance do painel com 75 sliders (virtualizar seções fechadas); o `index.html` é gerado, então a mudança vai nos módulos de `app/`, nunca no HTML final.

## 9. Imagens do GitHub

Duas peças, em duas versões. Fonte HTML no DS, saída PNG.

**Intro**
- 16:9 (1920×1080): título + frase + diagrama da cadeia `briefing → interpretação → direção de arte → composição → animação → geração → render → PNG/MP4` + 3 saídas + captura real do app.
- Carrossel 4:5 (1080×1350), 6 telas: (1) capa; (2) o que é, em 1 frase; (3) a cadeia, em diagrama de linha; (4) o que sai (PNG sequência, MP4, região); (5) captura do app com 3 chamadas; (6) como começar.

**How-to**
- 16:9: faixa horizontal com 5 passos numerados, cada um com ícone de linha e captura recortada.
- Carrossel 4:5, 6 telas: capa + 5 passos. (1) Descreva o set no chat com `/vj`; (2) o projeto chega montado; (3) ajuste com os sliders; (4) avalie; (5) exporte.

Regras visuais: mesma linguagem do DS v2, ícones de linha de 1,5 px (desenhados em SVG, sem biblioteca), diagramas com linhas finas, capturas reais do app (não ilustração), um único acento verde para destacar o caminho principal, texto de no mínimo 28 px no carrossel e 22 px no 16:9. Tom seco e técnico, sem humor.
Pré-requisito: capturas boas dependem da UI nova. Por isso as imagens entram **depois** da 14a (ou em duas rodadas: versão com a UI atual agora, regerada depois).

## 10. Em aberto

- Cor exata do acento (verde `#00ff3c`; falta validar daltonismo).
- Tema claro: depois da primeira entrega ou nunca?
- Imagens: gerar já com a UI atual ou esperar a 14a?
- Tags do GitHub: criar `v3.17.0` e apagar `v3.16.0`.

## 11. Referências de layout (adendo de 2026-10-14)

O usuário enviou três referências: um editor de dither (barra superior, painel esquerdo de biblioteca, canvas com barra de ações flutuante, trilho de ícones e painel de propriedades à direita), um popup de efeito (miniatura de pré-visualização, selects, linhas de campo + slider, botão de adicionar) e o Photoshop com painel de Timeline. **Vale só o layout, a posição e os menus**; fonte, cor e linguagem seguem o GYULYIA DS v2 (seção 4).

Mapa para o app (substitui o diagrama da seção 6 no que divergir):

| Referência | No AI VJ Generator |
|---|---|
| Barra superior: marca e seletor de modo à esquerda | `GYULYIA® AI VJ Generator`, nome do projeto, seletor Criativo/Avançado |
| Barra superior: zoom, ajustar, comparar, desfazer, refazer, camadas no centro | Ajustar, 100%, zoom, grade, safe, desfazer, refazer, histórico |
| Barra superior: ajuda e menu à direita | Carregar briefing, tema, idioma, ajuda |
| Painel esquerdo de biblioteca (busca, abas, miniaturas) | Composições e Camadas, com busca e miniaturas; recolhível |
| Barra de ações flutuante sobre o canvas | Cor, Mostrar camadas, Gravar, Tela limpa, Cheia, **Exportar** em destaque |
| Trilho de ícones + painel de propriedades | Parâmetros, Texto, Mídia, Áudio, Superfície, Ficha, Exportar; seções com cabeçalho `/ NOME` |
| Photoshop: painel Timeline embaixo | Timeline (seção 13) |

Slider em duas variantes do mesmo componente: **empilhada** no painel de propriedades (rótulo à esquerda, valor à direita, trilha embaixo na largura toda) e **em linha** no popover (rótulo, chip de valor, trilha).

## 12. Popover "Adicionar" (efeitos e camadas)

Avaliação: **vale fazer**, com limites.
- Ganho: tira do painel de propriedades o fluxo de escolher o que entra no projeto; deixa o painel só para editar. É o padrão de software criativo (Adobe: Adicionar camada, Adicionar ajuste).
- Conteúdo: abas pelas 9 categorias de camada, grade de miniaturas, busca; ao escolher, pré-visualização leve (a mesma da antiga aba +Efeitos, por passar o mouse ou tocar), selects e 2 a 4 parâmetros essenciais em linha, e o botão **Adicionar camada**. Os demais parâmetros ficam no painel depois de adicionada.
- Limites: sem editor de parâmetros completo no popover (duplicaria o painel e dobraria o teste); pré-visualização com custo limitado (um quadro a 256 px, sem loop contínuo); fecha com Esc e ao clicar fora; foco preso dentro enquanto aberto; adicionar é uma ação só no histórico (desfaz com um Ctrl+Z).
- Onde abre: botão `+` no cabeçalho do painel de Camadas e botão Adicionar na barra flutuante. Em tela estreita vira gaveta.
- O que ele **não** é: não traz de volta a aba +Efeitos removida na 3.4. As receitas continuam sendo o seletor das camadas shader e código; o popover só chama esse mesmo seletor.

## 13. Timeline (estilo Photoshop, 14b)

Avaliação: **vale fazer, e o modelo de dados já pede por ela.** O Animation IR já tem fases da composição, eventos na batida, comportamento temporal por camada (lead, follow, counter, ambient, accent, reveal, hold), atraso em semicolcheias (`p.phase`) e `loopFrames`. Hoje isso só aparece como números; numa timeline fica visível e arrastável.

Layout (como no Photoshop): painel acoplado embaixo do canvas, recolhível e com altura arrastável.
- Cabeçalho à esquerda: transporte (início, quadro anterior, play/pause, próximo quadro, áudio) e o zoom da timeline.
- Régua: compassos, tempos e quadros (`0377/0450`), com a cabeça de leitura ligada ao scrub atual. Faixas de fase da composição coloridas em cinza e marcadores de evento na batida.
- Uma faixa por camada, de baixo para cima como no painel de Camadas: nome à esquerda; à direita uma barra que mostra o comportamento temporal e o atraso (início deslocado em semicolcheias). Olho e trava iguais aos do painel de Camadas.
- Faixa de áudio no fim: bandas (bass, mid, high, rms) ou a fonte de teste, com os onsets marcados.
- O loop é a janela: fim da régua = fim do loop, e a barra mostra se o loop fecha.

Entregas em fases (cada uma com teste visual):
1. **T1, somente leitura:** régua, cabeça de leitura, faixas de fase e evento, uma faixa por camada com comportamento e atraso, faixa de áudio. Substitui a linha do scrub. Não muda projeto, formato nem render.
2. **T2, edição do que já existe:** arrastar a barra de uma camada muda `p.phase` (atraso) em passos de semicolcheia; arrastar um evento muda a batida do evento. Mexe só em campos que já existem; desfaz como qualquer ajuste.
3. **T3, entrada e saída por camada (só se você quiser):** hoje toda camada vive o loop inteiro. Dar início e fim a cada uma é mudança de modelo: campo novo no esquema, passo de migração (regra da fase 19), mudança no render e teste visual. Decidir depois de usar T1 e T2.

Riscos: custo de desenhar a timeline a cada quadro (desenhar em canvas separado, só a cabeça de leitura se move); manter o loop fechando; teclado e leitor de tela para a régua e as barras (cada barra é um controle com rótulo e valor).

## 14. Ordem revisada da fase 14

14a-1 tokens v2 e slider (feito) · 14a-2 casca (barra superior, barra flutuante, trilho de ícones, painel esquerdo, slider empilhado) · 14a-3 popover Adicionar (feito, `app/add-ui.js`) · 14b-T1 timeline somente leitura (feito, `app/timeline.js`) · 14b-T2 timeline editável (feito: atraso da camada; eventos ficam só de leitura até haver consumidor) · T3 só por decisão. A fase 13 (partículas em GPU) começa depois da 14a-2, já com os controles novos.

## 15. Decisões de forma e caixa (2026-10-14, substituem o que divergir na seção 4)

- **Quinas retas em toda a UI**, sem exceção: botões, campos, painéis, abas, barra de ações. A alça do slider é um retângulo (10×18 px), nunca redonda. `--r` vale 0.
- **Todo texto em caixa alta**, como no DS (a exceção é o que o usuário digita em campo de texto livre).
- **Barra de ações sob o canvas:** retangular, de fundo preto, com botão **Ocultar** e um botão **Barra** para trazê-la de volta.
- **Fontes:** Helvetica no texto e nas descrições; Martian Mono em títulos e categorias.
- **Acento:** verde `#00ff3c` (claro `#007a22`).
- Sombra e raio saem do DS v2; ficam a elevação por tom de cinza e o acento verde.
