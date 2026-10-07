# Question bank: meaning, music, performer, risk, success

The physical questions live in `archetypes.md`. This file holds the questions that make a project *interesting*: where the idea comes from, how the music behaves, who stands in front of the image, what must not happen, and how the result will be judged. Pick the ones the ledger still lacks (`diagnosis.md`). Wording is Portuguese-first; adapt it to the user's language and to this brief's own words.

Rules for every question here: derive the options from the brief or the attachments (never a generic menu), say what the answer will change, accept "decide por mim" (then state the choice and why).

## 1. Concept seeds: where the idea comes from

A strong project is usually a **tension** with a **verb** in a **place**. Ask until you can write that sentence; do not ask all of these.

| Question | Use when | Changes |
|---|---|---|
| "Qual é a tensão desta peça? Dois polos que brigam (ex.: pedra × luz, memória × futuro, ordem × ruído, corpo × máquina)." | the brief is a mood or a theme | the contract's concept and semiotic intent; the compositions become stages of the tension |
| "Se a tela só pudesse fazer *uma ação*, qual seria?" Offer verbs from the brief (crescer, corroer, dobrar, pulsar, escavar, revelar, enxamear, dissolver, empilhar, tecer, rachar, respirar) | the user has an image but no behaviour | the primary visual action, the motion language |
| "Qual é a imagem que as pessoas vão lembrar e postar depois?" | event, facade, festival | the hero moment, where the brightest composition sits |
| "O que este lugar / este artista / esta marca *tem de único*: uma história, um material, um som, uma cor?" | site-specific, branded, artist-led | semiotic source, palette logic, form language |
| "Complete: 'Quando acabar, a pessoa deve sentir que ____.'" | audience effect is vague | audience effect, temporal arc |
| "Que material isto parece (vidro, tinta, fumaça, metal quente, papel, água, neon, pele, tecido)? E que textura (lisa, granulada, riscada, polida)?" | the look is undecided | material language, shaders vs vectors |
| "Qual a regra que o sistema obedece? (um módulo que se repete, uma onda que passa, uma grade que quebra, um crescimento que se ramifica)" | the user likes generative or procedural looks | topology, the technique choice (`behavior-to-technique.md`) |

**Provocations for a stuck or timid brief** (offer one, it often unlocks the rest): "só duas cores", "uma única forma", "nada centralizado", "sem preto", "tudo muito lento", "tudo em escala monumental e uma coisa minúscula", "o contrário do que se espera para este gênero".

**Site-specific extras (facade, room, set):** o ritmo da arquitetura (módulos repetidos, vãos, eixos); o que a luz existente já faz; a história que o edifício guarda; o que não pode ser tocado (símbolos, janelas de moradores); o ponto de vista principal.

## 2. Music: how the sound behaves

Ask when the project reacts to sound or is built to a tempo.

| Question | Changes |
|---|---|
| "Gênero ou gêneros e, se der, 2 a 3 faixas de referência do set." | density, rhythmic vocabulary, how hard the hits land |
| "BPM fixo, faixa (ex. 124 a 134) ou variável? Mixagem com pitch?" | loop grammar; tempo-independent structure when a range |
| "Como é a estrutura: intro lenta, build, drop, quebra, volta? O drop é uma explosão ou um corte para o silêncio?" | the composition arc; which composition owns the peak; event layers |
| "O que domina: kick, grave sustentado, hats, vocal, sintetizador?" | which band drives which role (`audio-bus.md`) |
| "O som estará disponível para a peça (arquivo, linha ou microfone) ou a imagem precisa ser autônoma no BPM?" | audio-driven vs BPM-locked; honest `capabilities` |
| "Há silêncios ou partes sem batida? O que a tela faz nelas?" | quiet states, slow loops, release |
| "A imagem segue a música (sincronia estrita) ou responde por texturas e peso (sincronia solta)?" | tight vs loose coupling; at most 1 to 3 reacting layers |

## 3. The performer and the room

| Question | Changes |
|---|---|
| "Quem aparece na frente da tela e de que cor é a roupa e a luz neles?" | contrast behind the figure; which colours to avoid |
| "A luz de cena (LD) lava a tela? Que cores ela usa?" | palette that does not fight the lighting; black level |
| "Há fumaça ou haze?" | fog lifts blacks and softens thin detail; bolder forms |
| "Em que altura fica o palco em relação à plateia, e há varanda ou camarote?" | vertical sightlines; what is cut off |
| "O artista quer ser visto sobre a imagem (silhueta clara) ou integrado a ela?" | silhouette contrast, brightness behind the figure |
| "Telões laterais mostram câmera?" | a camera sees the wall: no moiré, no strobing |

## 4. Identity and supplied material

| Question | Changes |
|---|---|
| "Quais textos precisam aparecer, escritos exatamente como? Em que momentos?" | the type layer and its timing; never improvised words |
| "Há logo, fonte ou imagem para usar? Mande os arquivos; sem eles eu não invento substituto." | assets; legal and brand safety |
| "Há cores obrigatórias ou proibidas, e a peça é 'branca para eu colorir no Resolume'?" | palette, white-alpha |
| "Quem é o público e que cultura visual ele já tem (clube, festival, corporativo, arte)?" | density, references, taste |

## 5. Risk and constraints

| Question | Changes |
|---|---|
| "Há público sensível a flash (fotossensibilidade)? O local tem regras de strobe?" | the 3-flashes-per-second ceiling, luminance changes, red flashes avoided |
| "Há símbolos religiosos, políticos, de marcas ou de pessoas que devem ser evitados, ou obrigatórios?" | forbidden forms, review |
| "Qual a máquina que vai tocar (GPU, memória) e quantas camadas o Resolume aguenta?" | resolution, shader load, layer count |
| "Há prazo, rodadas de aprovação, ou um formato de entrega fixo?" | delivery plan, versions |
| "O que *nunca* pode acontecer?" (three items) | forbidden shortcuts in the contract |

## 6. Success: how this will be judged

| Question | Changes |
|---|---|
| "Quem vai julgar e como: a pista, o cliente, uma foto, um vídeo de celular, a câmera de transmissão?" | what is optimised: the room, the photo, the camera |
| "Qual o melhor resultado possível e qual o mínimo aceitável?" | where to spend detail and where to simplify |
| "Algum trabalho anterior (seu ou de outro) que *funcionou* para esse tipo de evento? O que nele funcionou?" | a reference grammar, never a copy (`attachments.md`) |

## 7. How to word a round

Shape: a one-line reason, the question, 3 to 5 options built from this brief, and a default.

```
Round 2 de 3 · quero entender o set antes de desenhar.

1. O drop é uma explosão ou um corte para o silêncio?
   a) explosão: tudo cresce e rompe   b) corte: a tela esvazia e volta   c) os dois, em partes diferentes do set
   (se não souber, assumo a)
2. Quem fica na frente da tela? Se for o DJ atrás de uma mesa, qual a altura da mesa em relação à tela?
...
```

## 8. Do not ask

- Anything the attachments settle.
- Taste adjectives alone ("moderno", "clean", "futurista") without a concrete choice.
- Questions whose answer you would not use.
- Five unrelated questions in one round.
- For a document the user cannot have, ask the single number that replaces it, once.
