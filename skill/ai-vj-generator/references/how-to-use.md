# How to use / Como usar

Both languages are kept in sync. Present only the language the user chose.

## EN

**What it is.** A Claude skill plus a visual engine. You describe a show; Claude diagnoses the surface, interviews you, writes a creative contract and builds layered, audio-reactive, seamlessly looping animations for LED walls, stages, facades, mapped projection, domes and odd aspect ratios.

**Commands**
- `/vj <briefing>`: the full flow from zero. Say what it is, where it will be shown (real pixel size) and how it should feel. Attach references if you have them.
- `/vj-reference`: analyse attachments only and get the reference grammar.
- `/vj-critique`: review a built project against its briefing and propose ordered mutations.
- `/how-to-use`: this guide.

**The flow.** Language → briefing → diagnosis (Brief Ledger, project archetype) → a few high-value questions → "this is what I understood" → creative contract → one world, 3–5 compositions of 6–10 named layers → build, look, critique, mutate, validate → deliver.

**What you get.** The project JSON, a single HTML engine file with the project loaded (open it in a browser, or as an Artifact), contact sheets, and a production spec. Run `node scripts/output_viewer.mjs <folder>` to build `OUTPUT.html`: a clickable page that lists and previews every generated file.

**Inside the engine.** Tabs: Compose, Layers, Params, Text, Media, Audio, Project, Sheet, Export, Guide. Type numbers or use sliders; Ctrl+Z undoes anything; the menu resizes or minimises (G); the colour button under the view switches palette (alpha, standard, custom, briefing); preview and export PNG, loops, WebM. The language switch (EN / PT-BR) is in the header.

**Tips.** Give the real pixel map. Say what the performer or the audience sees. Name feelings, not effects. Everything is generated from your briefing; nothing is a preset.

## PT-BR

**O que é.** Uma skill do Claude mais um motor visual. Você descreve o show; o Claude diagnostica a superfície, faz perguntas, escreve um contrato criativo e cria animações em camadas, audioreativas e com loop perfeito para paredes de LED, palcos, fachadas, projeção mapeada, domos e proporções fora do comum.

**Comandos**
- `/vj <briefing>`: o fluxo completo do zero. Diga o que é, onde será exibido (tamanho real em pixels) e qual a sensação. Anexe referências se tiver.
- `/vj-reference`: analisa só os anexos e devolve a gramática da referência.
- `/vj-critique`: avalia um projeto pronto contra o briefing e propõe mutações em ordem.
- `/how-to-use`: este guia.

**O fluxo.** Idioma → briefing → diagnóstico (Brief Ledger, arquétipo) → poucas perguntas de alto valor → "foi isso que entendi" → contrato criativo → um mundo, 3–5 composições de 6–10 camadas nomeadas → construir, olhar, criticar, mutar, validar → entregar.

**O que você recebe.** O JSON do projeto, um HTML único com o motor e o projeto carregado (abra no navegador ou como Artifact), folhas de contato e a ficha de produção. Rode `node scripts/output_viewer.mjs <pasta> --lang pt` para gerar o `OUTPUT.html`: uma página clicável que lista e mostra cada arquivo gerado.

**Dentro do motor.** Abas: Compor, Camadas, Parâm., Texto, Mídia, Áudio, Projeto, Ficha, Exportar, Guia. Digite números ou use sliders; Ctrl+Z desfaz qualquer coisa; o menu muda de tamanho ou minimiza (G); o botão de cor sob a vista troca a paleta (alpha, standard, personalizada, briefing); preview e exportação de PNG, loops e WebM. O seletor de idioma (EN / PT-BR) fica no cabeçalho.

**Dicas.** Informe o pixel map real. Diga o que o performer ou o público vê. Nomeie sensações, não efeitos. Tudo nasce do seu briefing; nada é preset.
