# TECNOFEUDO SMART SAMPA (3840×1920 · 30 fps · alpha)

`tecnofeudo-smartsampa.aivj.json` (schema `ai-vj-generator/2`), brief em `brief.json`. Paleta provisória: bg `#060608`, vermelho `#FF2A3D`, cinza `#8C8C96`, branco `#F2F2F2`; a composição TERMAL usa violeta/vermelho/laranja/amarelo.

1. **POSTE**: poste com 7 câmeras (nuvem de pontos) e lasers infravermelhos tracejados que varrem o solo; terreno em linhas; placas sólidas; contador; telemetria; fita de palavras.
2. **DRONES**: helicóptero e 2 drones girando, farol varrendo o chão, caixas de alvo travado, rede, rack, terreno em linhas.
3. **PERFIS**: cartões de perfil com foto pixelada que pisca e flui; 3 quadros para prints de notícias; grafo, escala, medidor, palavras gigantes (aceleracionismo, capitalismo tardio, vigilância, roubo de dados, tecnofeudalismo).
4. **TERMAL**: relevo 3D em linhas lido por mapa de gradiente térmico; placa modular, medidor, coordenadas, régua.

## O que você precisa inserir
- **Câmera:** importe `camera.mp4` em Mídia, ligue CÂMERA e desligue STAND-IN (em cada composição).
- **Fotos de perfil:** `perfil1.png` a `perfil6.png` (em Mídia). Sem elas aparece uma silhueta sintética marcada. São dados de pessoas reais: use só imagens com autorização.
- **Prints de notícias:** `noticia1.png` a `noticia3.png`. Os quadros têm o rótulo "FONTE · VEÍCULO · DATA · LINK (conferir antes de exibir)". O conteúdo e a veracidade são seus; eu não escrevi nenhuma manchete.
- **Fontes:** não chegaram. Por ora valem Martian Mono, Archivo Black e Bebas Neue. Para usar as suas, coloque os .ttf/.otf/.woff2 numa pasta e rode `node skill/ai-vj-generator/scripts/make-artifact.mjs <projeto> --assets <pasta> --out saida.html`; o nome do arquivo sem extensão é o valor de `font`.

## Modelos 3D
`models/*.obj` (poste, drone, helicóptero) são procedurais, domínio público (CC0), embutidos no projeto em `assets`. Rodam na camada `model` em nuvem de pontos.

## Autorização de código
Os lasers, alvos, farol, perfis e prints são camadas `code`. O motor pede autorização ao abrir (botão do aviso). O `scripts/render.mjs` não autoriza código sozinho, então use a interface ou `contact_sheet.mjs` para exportar essas composições.
