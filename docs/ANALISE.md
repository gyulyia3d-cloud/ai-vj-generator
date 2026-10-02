# Análise do master prompt e decisões de projeto

Revisão do "GYULYIA — VJ Generative Composition Engine" (73 seções) como skill open source para o Claude, e o que mudou na implementação.

## 1. O que o prompt acerta

- **Pipeline certo.** BRIEFING → INTERPRETAÇÃO → GRAMÁTICA → COMPOSIÇÃO → MOVIMENTO → PARÂMETROS → OUTPUT (seções 03 e 61) é exatamente como um diretor de arte trabalha, e é o que diferencia a skill de um gerador de efeitos.
- **Honestidade técnica.** As seções 25, 27 e 58 (nada de NDI, Spout ou SDI falsos; separar geração de transporte) são raras e valiosas. O teste de base mostrou que o Claude sem skill já é razoavelmente honesto sobre NDI; a skill transforma isso numa tabela fixa (SUPORTADO / EXPORTÁVEL / REQUER BRIDGE / CONCEITUAL).
- **Hierarquia e hipóteses.** "Cinco hipóteses visuais, não cinco variações" (seção 64) e "um herói por compasso" (seção 52) são as regras que mais melhoram o resultado.
- **Controle do artista.** Slider + campo numérico, reset, copiar e colar, seed, não destrutivo (seções 12, 32, 48, 66).

## 2. Problemas do prompt como skill

| Problema | Por que atrapalha | Decisão |
|---|---|---|
| **Mistura skill e aplicativo.** Metade das 73 seções descreve uma interface (botões, painéis, layout), não o comportamento do Claude. | O modelo tentaria reescrever um app inteiro a cada pedido: lento, caro e com bugs diferentes a cada vez. | Separei em duas peças. A **skill** é o diretor de arte e o entrevistador e escreve um PROJECT JSON. O **motor** é fixo e testado, e renderiza qualquer JSON. |
| **Tamanho.** São cerca de 6 mil palavras num único prompt. | As skills carregam o SKILL.md no contexto; um texto longo dilui as regras que importam. | O SKILL.md tem cerca de 750 palavras. O detalhe foi para 5 referências carregadas sob demanda (entrevista, direção de arte, schema, saídas, entrega). |
| **Links privados.** STANDARD e a infraestrutura apontam para `claude.ai/artifact/...`. | Num repositório público ninguém mais abre esses links, e a skill não consegue lê-los em tempo de execução. | O motor de camadas STANDARD foi **portado para dentro do repositório**, com o comportamento preservado. |
| **STANDARD não exportável.** O artefato original usa `Math.random`, o relógio real e three.js num canvas WebGL único. | O loop não fecha, o PNG não se repete e não dá para exportar por camada. | Reescrevi cada camada como uma função pura do quadro, com hash e seed. Mantive a sensação (degrau × suave, varredura a cada 2 compassos, evento a cada 8, glitch no beat 1) e confirmei com teste de emenda. |
| **Textos de evento fixos.** "TENDAL DA LAPA" e as coordenadas da Lapa estão gravados no código. | Num projeto open source isso vira lixo de outro evento. | Viraram parâmetros (`hud.title`, `hud.sub`, `data.teleTxt`). O STANDARD guarda os valores originais como padrão. |
| **Conflito de cor.** O design system GYULYIA é estritamente acromático; o STANDARD usa verde ácido. | Regras contraditórias. | A **interface** é monocromática (DS); a **cor** existe só dentro do palco, como paleta do projeto. |
| **Features sem destino.** RANDOM LOOP, AUDIO LOOP, GPU LOAD, multi-display. | A seção 68 manda cortar o que não melhora a obra. | As que têm uso real foram implementadas de forma simples. GPU LOAD aparece como N/D, porque o navegador não expõe esse dado (seção 37: não inventar). |
| **Faltava teste.** O prompt não diz como saber se a skill funciona. | Uma skill sem teste é só uma opinião. | Fiz um ciclo RED/GREEN com agentes (seção 5) e scripts de verificação (`scripts/check.mjs`). |
| **"Sem MCP".** | Correto; mantido. | A skill é autocontida: o motor está em `assets/` e os scripts não têm dependências. |

## 3. O que foi adicionado ou alterado na revisão (Parte 4)

- **Formato de troca: o PROJECT JSON** (`schema ai-vj-generator/1`). A skill escreve só o que difere do padrão, e o motor normaliza o resto e acrescenta as camadas fixas. O mesmo arquivo abre no Claude, no navegador e no export.
- **Shader com código próprio.** A camada SHADER aceita GLSL escrito pelo Claude, com um contrato de uniforms que fecha o loop (`uPh`, `loopv()`). É onde entra o code art de verdade, sem o Claude reescrever o renderer.
- **Unidades de 1080.** Tamanhos escalam por `min(H, W·9/16)/1080`, então o mesmo projeto lê em 16:9, 9:16 e 10:1 (paredes em L).
- **Alpha correto.** O teste de export revelou que scanline e vinheta pintavam véu preto sobre o PNG transparente (0,4% de pixels transparentes). Agora elas são omitidas no export alpha (de 62% a 86% transparentes).
- **Branco α (luma → alpha)**, o fluxo de trabalho de LED que já existia no TECNOFEUDO, para colorir no Resolume.
- **Validação antes do export**: mídia ausente, erro de shader com número de linha, varredura que não divide o loop, moiré no LED, canvas acima de 8192 px, estimativa de memória.
- **Displays recortados** do canvas mestre, com janelas de saída individuais.
- **Desfazer** (Ctrl+Z, 60 passos), copiar e colar camada e parâmetros, explosão 3D com arraste, manipulação direta na viewport (arrastar move; Shift escala; Alt gira).
- **Removido do escopo:** um campo de seleção de "modo CUSTOM/PERFORMANCE/EXPORT". Esses modos viraram lugares (abas Parâmetros, Projeto → Performance, Exportar) em vez de estados, para eliminar um clique que não muda nada.

## 4. Verificação

| Teste | Resultado |
|---|---|
| Sintaxe, sincronia skill/app, exemplos, frontmatter (`scripts/check.mjs`) | ok |
| Emenda do loop: diferença entre o último e o primeiro quadro, comparada com uma virada de compasso interna | Dentro da faixa nas 10 composições (ex.: MOTOR 9,02 contra média de 8,82 e máximo de 9,98) |
| Export PNG alpha: 1 compasso a 124 BPM e 30 FPS | 58 quadros (= 60/124 × 4 × 30), ZIP com COMPOSITIONS/ALPHA/PREVIEW/PROJECT_DATA |
| Formato 5120×500 (LED em L) | Viewport 10,24:1; parede tipográfica, túnel e GLSL próprio preenchem a faixa |
| Console | Sem erros em STANDARD, Exemplo, entrevistador e nos JSON da skill |

### Teste da skill (RED → GREEN)

Cenário: *"Painel de LED 5120×500 em duas paredes em L, 132 BPM, techno industrial, agressivo mas legível, Resolume com alpha, manda NDI direto, 5 composições com camadas liga/desliga."*

- **Sem a skill (RED):** honesto sobre NDI e com loops determinísticos, mas sem entrevista de direção de arte. As 5 composições tinham as mesmas 4 camadas genéricas, a entrega era só render offline (sem camadas ao vivo, BPM ou áudio) e o FPS escolhido foi 44, para o beat cair num quadro inteiro.
- **Com a skill (GREEN):** assumiu os padrões e os declarou, porque o usuário pediu pressa. Usou 30 FPS, deu a cada composição um gerador herói diferente (linhas, campo GLSL, túnel, palavra, organismo com células) com nomes do briefing (BIGORNA, FORNO, ESTEIRA, SIRENE, RUPTURA), tratou NDI como REQUER BRIDGE com o passo a passo, gerou o HTML pelo script e terminou com o bloco de resumo e uma única pergunta (pitch do LED). O HTML abre sem erros.
- **REFACTOR:** o agente GREEN listou 12 ambiguidades. As que importavam viraram regras: arredondamento do loop em quadros, padrão de pitch e distância, emenda das paredes, nomes das pastas por camada, luma em shaders, âncora do organismo, áudio por camada com a reatividade desligada, e "não copie nomes do exemplo".
