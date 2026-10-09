# Próximos passos (escolha a ordem)

Estado em 08/10/2026, motor **3.10.0**: Fases 1, 2 e 3 feitas; da Fase 4 já entraram a camada `fx` (textura de entrada), MP4 e render por linha de comando. `node scripts/check.mjs` verde. Cada item abaixo é um bloco pequeno com um teste de aceite. Tamanho em dias-focados (df). Análise completa: `docs/historico/RELATORIO-V9-githubs3.md`.

## Feito desde a última lista
Camada **ISF** (84 geradores no parâmetro da camada) · render **MP4 (H.264)** e **PNG por CLI** sem gravar a tela · camada **`fx`** com 22 efeitos · camada **`synth`** (cadeia de uma linha, inspirada no Hydra, código próprio) · 9 módulos GLSL novos com teste numérico · 8 transições novas (16) · 9 formas de LFO de atenção · Kalman do andamento · receitas `hilbert-curve` e `greeble-plate` · XML do Arena conferido contra um arquivo real · medição do motor e **decisão sobre WebGL2** (não trocar agora; `historico/RELATORIO-V9-githubs3.md` §5) · camada `blobs` (detecção por brilho, contraste, cor e zona) · menu corrigido · reorganização 3.0: `adapters/`, `docs/historico/`, documentação neutra de ferramenta.

## A. Estado entre quadros, sem assar o loop (Fase 4, o item que mais abre possibilidades)
| # | Item | df | Aceite |
|---|---|---|---|
| A1 | `fx` com histórico: cache de N quadros e **pré-aquecimento determinístico** (recalcula os N quadros anteriores quando se salta; guarda o último quando se toca em ordem) | 4 | o quadro n é idêntico tocando em ordem e saltando direto; teste A-B-A |
| A2 | trilhas (feedback), slit-scan, mosh e BFI como presets do A1 | 3 | cada um passa em `fx_check` e fecha o loop com pré-aquecimento de um loop |
| A4 | jump-flood, Turing e reação-difusão em GPU (substitui o `sim` de CPU assado) | 5 | `sim` novo roda sem assar; loop fecha por construção ou por pré-aquecimento |
| A5 | `render.mjs --jobs N`: fatias de quadros em várias páginas headless e junção de MP4 por GOP fechado | 2 | MP4 de 4 fatias = MP4 de uma peça (mesmos quadros) |

## B. Mais vocabulário
| # | Item | df | Nota |
|---|---|---|---|
| B1 | camada `doodle` (grade com regras por célula e semente, ideia do css-doodle) | 1 | combina com LED |
| B2 | biblioteca de cadeias `synth` salvas no projeto + 10 cadeias novas | 1 | |
| B3 | mais ISF: ampliar a biblioteca com os 7 geradores MIT que não compilam em WebGL1 depois de corrigidos, e aceitar `audioFFT` mapeando para as bandas do motor | 2 | cada correção registrada |
| B4 | mais 6 efeitos `fx` sem histórico (granulação de filme, anamórfico, tilt-shift, lente de gotas, duotom por mapa, estêncil) | 2 | |
| B5 | Python espelhando a gramática do `synth` (validação antes do navegador) | 1 | hoje só o motor valida |

## C. Fechar a Fase 3 (sobras)
Arrastar fatias na vista · rotação de 90° por fatia · limitador de flash por camada · flash vermelho e área do flash · painel de espectro desenhado · teste do detector de kick com áudio real. (1 a 2 df cada; veja `docs/ROADMAP.md`.)

## D. Só você
| # | Item | Aceite |
|---|---|---|
| D1 | olhar as 24 composições da galeria e as 22 amostras de `fx` (`node scripts/contact_sheet.mjs`) | lista do que refazer |
| D2 | rodar `render.mjs` ou o botão MP4 com um projeto seu e abrir o arquivo | abre sem retrabalho |
| D3 | dois testes do `/vj` com o mesmo briefing (tempo, perguntas, avisos, nota) | tabela preenchida |

## E. Integrações
Removidas do produto (roadmap v11, 08/10/2026): MIDI, OSC, NDI, Spout, MCP e integração com Resolume, TouchDesigner ou OBS não serão feitos. A próxima etapa é a Fase 0 (limpeza) e depois a Fase 1 (registry); ver `docs/ROADMAP.md`.

## Sugestão de ordem
D2 (testar o MP4 e o ISF na sua máquina) → B1/B4 (rápido, visível) → A1 e A2 (o grande ganho) → A5 → A3/A4 → C.

---

# Como usar os shaders ISF

ISF é um shader GLSL com um cabeçalho JSON. O motor usa a biblioteca como fonte de geradores e importa arquivos `.fs`; não exporta ISF.

## No motor
1. **Camada ISF**: em Camadas, adicione uma camada do tipo **ISF** e escolha o shader no parâmetro **Shader ISF** (84 opções). P1 a P4 mexem nas quatro primeiras entradas do shader (de 0 a 1 na faixa da entrada; −1 mantém o padrão). Os 11 "AIVJ" fecham o loop de verdade e reagem a graves, médios, agudos e golpes; os outros 73 têm autoria e licença (MIT ou CC0).
2. **Aba ISF**: lista os cartões com busca e filtro; **Adicionar à composição** cria a camada ISF já com o shader escolhido.
3. **Importar arquivo .fs**: aceita gerador de um passe e cria uma camada de shader. Filtro (com imagem de entrada), multipasso e textura de áudio são recusados dizendo o motivo.

## Por linha de comando (opcional)
```bash
python skill/ai-vj-generator/scripts/isf.py check  gerador.fs
python skill/ai-vj-generator/scripts/isf.py import gerador.fs --project meu-projeto.json --comp 0 --bars 4 --bpm 124
node skill/ai-vj-generator/scripts/isf_ui_check.mjs
```
Detalhes e licenças: `skill/ai-vj-generator/references/isf-layer.md`, `skill/ai-vj-generator/isf-library/README.md`.
