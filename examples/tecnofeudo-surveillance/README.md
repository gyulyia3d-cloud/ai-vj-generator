# TECNOFEUDO SURVEILLANCE (3840×1080 · 30 fps · alpha)

Arquivo: `tecnofeudo-surveillance.aivj.json` (schema `ai-vj-generator/2`). Brief: `brief.json`. Paleta (provisória, derivada das referências): bg `#050505`, primário `#FF1F3D`, cinza `#8A8A8A`, branco `#E8E8E8`.

1. **OLHO**: placa sólida vermelha com furos onde o blob é detectado (`blobs` com `invert`), grade, coordenadas, contador de alvos, régua.
2. **PLACAS**: três placas sólidas em silhueta (máscara/moldura), moldura de retângulos 3,556:1, faixa de perigo, palavras gigantes, sinalização.
3. **FÓRMULA**: φ, ângulo áureo, bits, escala, medidor, telemetria, espectro (Ikeda/Kurokawa/Izumida como princípio, nunca cópia).
4. **CIBERSIGILO**: heptagrama, flor da vida, torre e zigurate em linhas, anéis, fita.

## Câmera
Cada composição tem a camada **CÂMERA** (desligada) e **STAND-IN CÂMERA** (ligada, só para o preview). Importe o vídeo em **Mídia** como `camera.mp4`, ligue CÂMERA e desligue o STAND-IN. O blob lê o que está abaixo dele: para o furo seguir o corpo, a câmera precisa estar **dentro** do render do motor. Uma sequência PNG com alpha traz o furo já gravado; o motor não rastreia ao vivo dentro de outro software.

Áudio `structural`: só o herói (graves) e um campo de fundo (presença) escutam; o resto anda por loop e tempo. Câmera 2.5D `still` (um dolly encolhe a placa e mostra borda).
