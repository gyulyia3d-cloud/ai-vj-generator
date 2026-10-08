# Do GitHub ao PNG ou MP4, sem IA e sem terminal

Este é o caminho da pessoa que baixou o repositório e não usa nenhuma IA. Você só precisa de um navegador moderno (Chrome, Edge ou Firefox). O exemplo é uma parede de LED de 4500×800 com uma dobra no meio, o caso do aceite da fase 3; troque pelos números da sua superfície.

## 1. Abrir

Abra o arquivo `app/index.html` no navegador (duplo clique). A tela inicial oferece três caminhos: **Gerar sem IA**, importar um JSON que alguma IA escreveu, ou abrir o STANDARD. Clique em **Gerar sem IA**.

## 2. Preencher o briefing (aba Gerar)

| Campo | O que colocar |
|---|---|
| Nome | o nome da peça |
| Conceito | uma ou duas frases: sobre o que é e o que o público deve sentir. É o campo que mais pesa |
| Clima (até 3) | industrial, orgânico, cósmico, urbano, ritual, glitch, minimalista, líquido, cristalino, retrô, agressivo, calmo. Define matiz, esquema de cor, geradores e o perfil de movimento |
| Energia e densidade | 0 a 1 e esparsa/equilibrada/densa |
| Preset de superfície | escolha "Parede LED em L · 4500×800": já preenche tipo, pixels, dobra em 2250, passo de 3,9 mm e distância de 8 a 40 m. Dá para digitar outros números |
| BPM, compassos, composições | o loop tem sempre compassos inteiros |
| Estratégia de áudio | nenhuma, sutil, estrutural, rítmica ou completa (o que a música move na imagem) |
| Texto | só palavras exatas. Título + legenda + dados viram uma hierarquia; "palavras grandes" viram uma parede de texto |
| Cor | automática pelo clima, por matiz e esquema, ou 4 cores exatas |
| Evento focal e banidos | a única coisa que domina a peça, e o que ela não pode ter |

Clique em **Gerar e abrir**. O projeto abre na viewport. Se faltar algo, a aba diz o que, em português. **Ctrl+Z** volta ao projeto anterior. **Salvar briefing** guarda o formulário para depois (**Carregar briefing** devolve).

O mesmo briefing sempre dá o mesmo projeto, e é idêntico ao que o `brief_to_project.py` gera (há um teste de paridade).

## 3. Avaliar

**Avaliar o projeto** renderiza 24 quadros de cada composição e dá uma nota por hierarquia, contraste, densidade, respiro, movimento, arco e repetição, com uma frase do que mudar. A nota mede **defeito de estrutura**, não beleza: olhe a vista. Detalhes em `skill/ai-vj-generator/references/evaluation.md`.

## 4. Ajustar

- **Compor**: ative, duplique e renomeie composições. **Camadas**: ligue, desligue, reordene. Teclas **0 a 9** ligam camadas; **E** abre a pilha em 3D.
- **Parâm.**: números e contas (`1920/2`). Mais abaixo, **Modulação**: ligue qualquer parâmetro ao kick, ao grave, a uma onda do BPM ou a um LFO, sem escrever JSON. A "curva de perfil de movimento" cria uma mola (sobe no golpe, oscila, volta antes do próximo).
- **Áudio**: arquivo, microfone ou "fonte de teste". Sem fonte, tudo reage ao BPM de forma determinística. O detector de kick usa fluxo espectral e um limiar que acompanha o histórico do último segundo.
- **Tecla ?** lista todos os atalhos. **Guia → tour** percorre as abas. O botão **Criativo/Avançado** no topo esconde ou mostra as abas técnicas.

## 5. Superfície e Resolume (aba Superfície)

- Troque o preset, **corte** o canvas em mais dobras (digite o x e clique em Cortar) ou limpe os cortes.
- **Pixel map**: importe um CSV `nome,x,y,largura,altura` (em pixels do canvas) ou uma imagem PNG em que o que não é preto é pixel ativo. Os módulos aparecem na vista.
- **Fatias**: escolha a saída (por exemplo 3840×2160); a aba mostra onde cada fatia cai. Baixe o **XML do Resolume** (Arquivo → Advanced Output → Carregar), o **mapa .json** e o **padrão de teste .png**. Toque o padrão no Resolume: cada ladrilho tem de cair no seu lugar. Abra o XML uma vez, olhe as fatias e salve de novo pelo Arena.
- **Legibilidade**: informe o passo do LED e a distância do espectador mais longe; a aba lista o texto e os traços do projeto que ficam abaixo do mínimo legível.

## 6. Exportar (aba Exportar)

1. Escolha modo (composição com alpha, RGB, camadas), escala, FPS, compassos e o intervalo de quadros. Para testar, use escala 25% e poucos quadros.
2. **Testar flashes**: mede o loop de cada composição pelo critério geral do WCAG 2.3.1 (mais de 3 flashes por segundo reprova). **Suavizar se o teste falhar** limita o contraste local só nas composições que reprovam. O teste não mede flash vermelho e não substitui uma ferramenta homologada para público sensível.
3. **Dividir em partes**: para sequências grandes, o ZIP é gravado a cada 250 MB, 500 MB, 1 GB ou 2 GB (`..._p01.zip`, `_p02`…). Extraia todas na mesma pasta; só a última leva o manifesto.
4. **Renderizar e baixar ZIP**. O ZIP traz `ALPHA/NN_COMPOSICAO/NN_COMPOSICAO_000000.png`, a primeira imagem de prévia, `PROJECT_DATA/project.json`, o LEIAME e o `MANIFEST.json` (versão do motor, SHA-256 do projeto, canvas, fps, compassos, quadros, arquivos, partes e o resultado do teste de flash).

## 7. MP4, efeitos, cadeias e ISF
- **MP4 (H.264)**, na aba Exportar, seção **Vídeo MP4**: gerado quadro a quadro, sem gravar a tela; usa a composição, a resolução, o FPS, os compassos e o intervalo de quadros escolhidos acima. Não guarda alpha (para transparência, PNG). Se o navegador recusar o tamanho, reduza a resolução. Pela linha de comando: `node scripts/render.mjs projeto.aivj.json --out saida --format mp4`.
- **Camadas novas** (aba Camadas, "Adicionar"): **Efeito sobre as camadas abaixo** (`fx`: CRT, VHS, halftone, painel de LED, vidro, bloom…), **Cadeia** (`synth`: uma linha vira shader) e **Manchas** (`blobs`: acha e marca regiões da imagem abaixo). Efeitos e manchas só enxergam o que está embaixo deles na pilha: coloque-os acima do que devem mudar.
- **Aba ISF**: biblioteca de 84 shaders (cada cartão mostra autoria e licença), **Importar arquivo .fs**, **Exportar** para o Resolume. No Resolume, copie os `.fs` para `Documentos\Resolume Arena\ISF`, arraste para uma camada e **automatize `phase` de 0 a 1 durante o loop**.
- O botão **Gravar** (WebM ao vivo da viewport) é só rascunho: pode travar em composições pesadas. Para entregar, MP4 ou PNG.

## O que não existe (ainda)
Arrastar as fatias na vista (hoje se corta por número), rotação de 90° nas fatias, limitador de flash por camada, efeitos com memória entre quadros (trilhas, slit-scan), identidade de manchas entre quadros e MIDI/OSC. A lista, em blocos pequenos, está em [PROXIMOS-PASSOS.md](PROXIMOS-PASSOS.md).
