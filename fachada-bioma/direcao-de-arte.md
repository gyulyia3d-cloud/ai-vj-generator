# DIÁRIO DE CAMPO: direção de arte

**Conceito em uma frase.** Uma sonda científica de campo usa a fachada como espécime: lê a arquitetura, abre cada janela como portal para um bioma brasileiro e deixa a pedra crescer, afogar, derreter e florescer.

## Briefing como entendido

Video mapping de fachada (fotos 1 e 2), tema Natureza Brasileira, colorido e tecnológico, com ilusão de tridimensionalidade e movimento que respeitem as segmentações arquitetônicas; profundidade, derretimento e displacement com narrativa. Confirmado nas perguntas: canvas 1920×1520, janelas como portais, ponto de vista frontal, show narrativo de ~3 min, BPM sintético, entrega do show completo e por superfície em alpha, paleta por bioma com ciano tecnológico, sem texto nem logo.

## Análise dos anexos

| Anexo | Medido e visto | Princípio extraído |
|---|---|---|
| Foto 1, relevo de argila 1920×1520 | simetria horizontal 0,93; 27% de preto puro; luminância média 0,58; relevo real em cornijas, colunas e balaústres | o relevo multiplica a luz: sombra e volume vêm da própria arquitetura. A silhueta sai da luminância |
| Foto 2, contornos | 392 regiões fechadas; 60% de energia em detalhe fino | cada região vira superfície: o desenho serve de segmentação (10 grupos) e de overlay de contorno |
| Foto 3, fachada pintada em cor sólida | cor saturada por segmento | cada segmento tem a sua própria matéria |
| Foto 4, praça à noite, fachada de pedra | linhas de luz que seguem as nervuras | a luz corre pela geometria real, não por cima dela |
| Foto 5, igreja em roxo, laranja e estrelas | arcos e janelas viram molduras de cor; fundo estrelado | a moldura da abertura é o elemento gráfico; o muro vira cenário |
| Foto 6, castelo-floresta com lago | único exemplo com profundidade real e narrativa | as aberturas são mundos por trás da parede; a água reflete e sobe |

Nada foi copiado ou traçado: a geometria, as texturas e os mundos são originais deste projeto.

## Hipóteses descartadas

1. **Mapping decorativo** (padrões coloridos seguindo as arestas): bonito, mas sem narrativa nem profundidade.
2. **Fachada como tela de vídeo de natureza**: ignora a arquitetura; vira um telão.
3. **A sonda e a fachada como espécime** (escolhida): tem fio narrativo, usa cada segmento de um jeito e permite ilusão de profundidade e derretimento com sentido.

## Mundo único, cinco atos

Compartilham: luz sobre preto, o ciano da sonda, o relevo de argila multiplicado, as mesmas 31 aberturas como portais, os olhos nos medalhões. Mudam: topologia, evento dominante, matéria e técnica.

| Ato | Matéria | Técnica principal | Fx |
|---|---|---|---|
| CALIBRAÇÃO | anéis de sonar (isolinhas de SDF), ticks, grade em perspectiva | shader de geometria analítica + radar + contorno revelado por clip | bloom |
| DOSSEL | veias, folhas e cipós em frente de crescimento; dossel com parallax | ruído com warp + células de folha + dioramas em 4 camadas | deslocamento orgânico |
| ÁGUAS | nível de água, cáusticas, bolhas, juncos, anéis na batida | linha d'água ondulada + interferência + reflexo do horizonte | vidro líquido em envelope |
| BRASA | voronoi de terra seca, lava, gotas de cera, flores de ipê | células com rachaduras, gotas por borda de cornija, flor de 5 pétalas | miragem de calor |
| CONVERGÊNCIA | um bioma por zona, limites que derretem, clarão dos olhos | quatro texturas de bioma por máscara de zona + carrossel de dioramas | automodulação |

## Cor com função

Ciano #36F1FF é a sonda e o único fio constante. Cada ato traz a sua cor-guia: Amazônia verde-limão com orquídea, Pantanal azul-piscina com dourado do amanhecer, Brasa âmbar com ipê magenta e amarelo, Convergência coral e violeta. O acento fica em olhos, flores e flashes.

## Áudio

Sem trilha: bandas sintéticas a 100 BPM. Todo shader lê as cinco bandas, cada uma com um papel: baixo pulsa anéis, olhos e luz dos portais; médios movem a matéria; agudos faíscam em pontos; hit acende as arestas das aberturas; rms respira o brilho geral. Quando a trilha chegar, trocar o BPM e re-renderizar.

## Rodadas de crítica e mutações

1. A primeira silhueta vazava entre as colunas (a máscara vinha das linhas): refeita pela luminância do relevo.
2. A folhagem do dossel formava uma grade visível (uma folha por célula): trocada por quatro folhas vizinhas com jitter e escala maior.
3. As colunas do ato 2 saíam chapadas em verde-limão: sombreamento cilíndrico por coluna e cipós finos.
4. A água do ato 3 apagava os portais: base e cáusticas reduzidas.
5. O clarão do ato 5 estourava em branco: reduzido.
