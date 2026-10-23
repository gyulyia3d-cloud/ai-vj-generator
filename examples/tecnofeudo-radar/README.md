# TECNOFEUDO RADAR (3840×1920 · 30 fps · alpha)

`tecnofeudo-radar.aivj.json` (schema `ai-vj-generator/2`), brief em `brief.json`. Paleta provisória: bg `#050505`, vermelho `#FF1F2E`, cinza `#7A7A82`, branco `#F2F2F2`; PAINEL usa violeta/vermelho/laranja/amarelo (térmico).

Cada composição tem **um elemento central dominante** sobre uma **grade modular de 12×6** (margem 36, calha 18, unidades lógicas 2160×1080). As placas são silhuetas chanfradas: cheia, vazada, hachurada, escura ou **moldura com janela** (mostra o conteúdo por trás). A última camada de cada composição é glitch com deslocamento.

1. **RADAR**: radar central (anéis, rosa dos ventos de 5° em 5°, varredura, alvos que travam quando a varredura passa), 6 placas com contador, log, coordenadas, medidor e barras.
2. **CÂMERA**: câmera bullet monumental em nuvem de pontos e arame, cone infravermelho tracejado, moldura com janela, 2 drones, placas.
3. **SIGILO**: cibersigilo de quatro dobras (lâminas afiadas, vermelho e branco), flor da vida ao fundo, palavras de resistência contornadas, faixa de perigo.
4. **PAINEL**: terreno 3D térmico dentro de uma janela de painel de operações, com rastreio de manchas de calor (`blobs`), lista de entidades, grafo, barras e status.

## Inserir
- Câmera: `camera.mp4` em Mídia, ligar CÂMERA e desligar STAND-IN (cada composição). O `blobs` do PAINEL e os alvos leem o que está abaixo.
- Frases das placas e da fita são editáveis (typewall/ticker); troque por suas palavras.
- Fontes: ainda não chegaram; valem Martian Mono, Archivo Black e Bebas. Para trocar: `make-artifact.mjs <projeto> --assets <pasta>` e `font` = nome do arquivo sem extensão.

## Observações
- Camadas `code` (radar, sigilo, cone, placas) pedem autorização ao abrir. `render.mjs` não autoriza código; exporte pela interface.
- Modelos 3D procedurais CC0 em `models/`, embutidos em `assets`.
- As composições passam de 10 camadas (13 a 14): é orçamento declarado, não limite do motor.
