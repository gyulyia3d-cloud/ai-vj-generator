# Próximos passos (escolha a ordem)

Estado em 08/10/2026: Fases 1, 2 e 3 feitas (2.5.0). `node scripts/check.mjs` verde. Cada item abaixo é um bloco pequeno, com um teste de aceite. Tamanho em dias-focados (df).

## A. Fechar a Fase 3 (sobras)
| # | Item | df | Aceite |
|---|---|---|---|
| A1 | Arrastar e redimensionar fatias na vista de Superfície | 2 | teste CDP arrasta e o XML muda |
| A2 | Rotação de 90° por fatia (UI + XML) | 1 | XML do navegador = Python |
| A3 | Limitador de flash por camada (hoje só global) | 1 | PNG medido cai abaixo do limite |
| A4 | Flash vermelho e área do flash na análise (WCAG 2.3.1 completo) | 1 | casos sintéticos reprovam |
| A5 | Export WebM (MediaRecorder) | 1 | arquivo abre; duração = loop |
| A6 | Painel de espectro desenhado para escolher faixas dos reatores | 2 | clicar na faixa grava `band` no `layer.mod` |
| A7 | Testar o detector de kick com arquivo de áudio real (WAV de teste) | 1 | BPM do kick dentro de ±2 |

## B. Gate 2 e Gate 3 (só você)
| # | Item | Aceite |
|---|---|---|
| B1 | Olhar as 24 composições da galeria (`examples/gallery/README.md`) e marcar as que você refaria | lista de reprovadas |
| B2 | Exportar PNG sequence 4500×800 e abrir no Resolume | entra sem retrabalho |
| B3 | Dois testes do `/vj` com o mesmo briefing (registrar tempo, perguntas, avisos, nota) | tabela preenchida |

## C. Qualidade do projeto (baratos, fazer antes da Fase 4)
| # | Item | df | Nota |
|---|---|---|---|
| C1 | Subir o commit local (`main` está à frente do GitHub) e a tag `v2.5.0` | 0,1 | pede seu aval |
| C2 | Remover `skill.rar` e `dist/` do repositório (gerados) ou documentar por que ficam | 0,2 | |
| C3 | CI no GitHub (já existe em `.github/workflows`): confirmar que passa com Chrome do runner | 0,5 | veio do ramo `claude/lucid-mendel` |
| C4 | Nomes de arquivo do ISF perdem acento (`AÇÃO` vira `AC_MULO`) | 0,3 | bug em `isf.py` |
| C5 | Botão ISF na interface (ver seção abaixo) | 3 | hoje só linha de comando |
| C6 | Apagar os ramos remotos já fundidos | 0,1 | |

## D. Fase 4 — render (40 df, só depois de A e B)
D1 motor modular `src/` (6) → D2 compositor GPU WebGL2 com paridade de pixels (24) → D3 orçamento de GPU, `sim` em GPU, ISF multipasso (10).

## E. Fase 5 — integrações (25 df)
E1 Web MIDI (3) · E2 OSC por ponte local (4) · E3 NDI/Spout via OBS, só documentar o ensaio (2) · E4 MCP do Resolume: entregar o set ao Arena (8) · E5 exportadores MadMapper/pixel map/blueprint plano (8).

## Sugestão de ordem
C1 → C4 → B1/B2 → A3, A4 (segurança) → A1, A2 → C5 → A5–A7 → Fase 4.

---

# Como usar os shaders ISF

ISF é um shader GLSL com um cabeçalho JSON. Resolume Arena, Wire, VDMX e MadMapper abrem `.fs` direto. **Hoje o ISF só existe por linha de comando**, não há botão na interface (item C5).

## 1. Levar um shader seu para o Resolume
1. Tenha um projeto `.aivj.json` com camadas do tipo `shader`.
2. Rode:
   ```bash
   python skill/ai-vj-generator/scripts/isf.py export meu-projeto.json --out isf-out
   ```
3. Copie os `.fs` de `isf-out` para `Documentos\Resolume Arena\ISF` e atualize a lista de efeitos no Arena (a pasta pode não existir; crie).
4. No Arena, arraste o shader da aba Fontes para uma camada.
5. **Automatize o parâmetro `phase` de 0 a 1** (envelope linear, durando o loop). Sem isso o shader fica parado. `p1..p4` e as cores `c1, c2, cbg` viram controles. Áudio (`bass mid high rms hit…`) são floats comuns: ligue-os ao FFT do Arena.
6. Use a mistura Add ou Screen para luz sobre preto.

Observações: o projeto `examples/duas-paredes-codigo.json` não tem camada shader (exportar dá "no shader layer found"); use `examples/noite-filotaxia-1080p.json`.

## 2. Trazer um ISF de terceiros para o seu projeto
```bash
python skill/ai-vj-generator/scripts/isf.py check  gerador.fs
python skill/ai-vj-generator/scripts/isf.py import gerador.fs --project meu-projeto.json --comp 0 --bars 4 --bpm 124
```
Só entram **geradores** de um passe (sem `inputImage`, sem áudio, sem `PASSES`). Dos 326 arquivos testados, 35 importam. Respeite a licença: o autor é copiado para o `role` da camada, e não redistribua os arquivos de terceiros.

## 3. Testar
```bash
node skill/ai-vj-generator/scripts/isf_check.mjs
```
Detalhes: `skill/ai-vj-generator/references/isf-bridge.md`.
