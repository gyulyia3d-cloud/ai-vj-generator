# DIÁRIO DE CAMPO: ficha de produção

Video mapping de fachada, tema Natureza Brasileira. Sonda científica que explora os biomas sobre a arquitetura.

## Superfície e entrega

| Item | Valor | Origem |
|---|---|---|
| Canvas mestre | 1920 × 1520 px (5:4) | confirmado pelo usuário |
| FPS | 30 | padrão técnico |
| Projetores, blend | não informados: canvas único, sem overlap | assumido |
| Distância de leitura | 40 m, ponto principal frontal | assumido |
| Luz ambiente | noite escura, poucos postes | assumido |
| BPM | 100 (sintético, sem trilha ainda) | confirmado: usar BPM sintético |
| Ato | 16 compassos = 1152 quadros = 38,4 s | derivado (`surface_calc.py loop`) |
| Show | 5 atos = 192 s (3 min 12 s) | derivado |
| Janelas e portas | projetadas como portais para o bioma | confirmado |
| Texto e logo | nenhum | confirmado |

## Ordem dos atos

| # | Ato | Bioma | Evento dominante |
|---|---|---|---|
| 1 | CALIBRAÇÃO | a sonda acorda | a varredura desce e cada janela abre como túnel de grade |
| 2 | DOSSEL | Amazônia | a frente de cipós chega a cada janela e abre o dossel; olhos de onça |
| 3 | ÁGUAS | Pantanal | a água sobe pela fachada; as janelas mostram o amanhecer |
| 4 | BRASA | Cerrado e Caatinga | a terra racha, cornijas e colunas derretem, depois o ipê floresce |
| 5 | CONVERGÊNCIA | Mata Atlântica e fusão | cada zona carrega um bioma, os limites derretem, os olhos clareiam |

Cada ato nasce e termina no escuro. O loop de cada um fecha (`loop_check.mjs`) e a sequência encaixa com um corte ou um fade curto pelo preto.

## Zonas arquitetônicas (coordenadas no canvas 1920 × 1520)

Geometria extraída da foto 2 (contornos) por segmentação de regiões fechadas e conferida contra a foto 1. Os shaders usam a mesma geometria, então o conteúdo respeita as divisões da fachada.

| Zona | Onde | Uso |
|---|---|---|
| Torres, domos, agulhas | x < 500 ou x > 1400, y < 600 | esferas de luz, anéis a partir dos olhos |
| Medalhões de estrela (olhos) | (299, 482) e (1607, 469), r 54 | olhos da sonda: radar, onça, sol, brasa, clarão |
| Coroa | x 500 a 1400, y < 600 | balaustrada, frontão e friso |
| Colunas (6) | x 77–213, 389–492, 1403–1505, 1691–1853 | sombreamento cilíndrico, cipós, juncos, cera |
| Andar nobre | x 500 a 1400, y 600 a 985 | arcos, janela central |
| Térreo | x 500 a 1400, y 985 a 1480 | três arcos com leque, porta central |
| Torres laterais | janelas altas e baixas | portais laterais |
| Balcões e escada | balaústres laterais, escada | barras verticais, ondas |
| Aberturas | 31 portais (janelas, arcos, leques, atic, medalhões) | dioramas com parallax |

## O que acompanha o vídeo

- `saida/ato01…ato05` (MP4, H.264, 1920×1520, 30 fps).
- `saida/diario_de_campo_completo.mp4`: os cinco atos em sequência (3 min 12 s).
- `mascaras/*.png`: uma máscara com alpha por superfície arquitetônica (torres, tímpanos e estrelas, coroa, colunas, andar nobre, térreo, janelas laterais, balcões, pedra, escada, silhueta e aberturas), no canvas 1920×1520. Use no Resolume ou no MadMapper para dar tratamento por superfície (cor, brilho, delay) ao vídeo completo.
- `diario.html`: o motor com o projeto carregado, para tocar, mexer nos parâmetros e re-renderizar (por exemplo trocar o BPM quando a trilha chegar).
- `diario.aivj.json`: o projeto.

## Honestidade de escopo

- **SUPPORTED:** preview no navegador, tela cheia.
- **EXPORTABLE:** MP4 H.264, sequência PNG (com alpha, por composição ou por camada).
- **INPUT / ANALYSIS ONLY:** as fotos 1 e 2 (relevo e contornos) viram máscaras e geometria.
- **NOT SUPPORTED:** MIDI, OSC, NDI, Spout, Syphon, integração com Resolume ou MadMapper, pixel map, blueprint e simulação da instalação.
- O "alpha por superfície" é entregue como máscaras PNG, não como um vídeo separado por superfície. O motor exporta alpha por **camada**, não por região arquitetônica.
- A ilusão de profundidade (portais com parallax e relevo de argila multiplicado) depende de um ponto de vista principal frontal.

## Suposições e riscos

| Campo | Suposição | Risco |
|---|---|---|
| Distância | 40 m | contornos finos somem acima de ~60 m |
| Projetores | um canvas único | com mais de um projetor, o overlap e o blend são do software de mapping |
| BPM | 100 sintético | os hits não casam com a trilha final; trocar o BPM e re-renderizar |
| Vidro | portais nas janelas | o vidro reflete menos, o contraste cai nos portais |
| Luz ambiente | noite escura | com luz forte os pretos viram cinza |
| Flash | no ato 5 o clarão dura ~8 compassos e sobe devagar, abaixo de 3 flashes por segundo | conferir com a legislação local se houver restrição |
