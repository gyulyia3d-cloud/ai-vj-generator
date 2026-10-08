# AI VJ Generator 3.0.0

Primeira versão **compatível com qualquer IA por construção**: o conteúdo é um só, em texto, e o Claude Code virou um adaptador entre outros.

## Destaques
- **Qualquer IA, ou nenhuma.** `skill/ai-vj-generator/portable/PROMPT.md` é a fonte única das instruções (v3.0, reescrita com todo o vocabulário atual). `AGENTS.md`, `GEMINI.md` e `CLAUDE.md` na raiz apontam para ela. Sem IA, a aba **Gerar** do motor faz o caminho por regras.
- **Render sem gravar a tela.** MP4 (H.264) quadro a quadro na aba Exportar e por `node scripts/render.mjs`; PNG sequence com alpha por linha de comando.
- **Camadas novas.** `fx` (22 efeitos sobre a pilha), `synth` (uma linha vira shader), `blobs` (detecta e marca regiões).
- **ISF.** Aba com 84 geradores (11 originais, MIT e CC0 com autoria e licença), importar e exportar `.fs`.
- **Biblioteca GLSL** de 20 módulos, 13 formas de LFO, 16 transições, Kalman do andamento, receitas Hilbert e greeble.
- **Menu corrigido** (a ajuda da aba cobria as abas) e teste de clique de verdade.

## Reorganização
`adapters/` (instaladores e comandos do Claude), `docs/historico/` (relatórios antigos), documentação regenerada e neutra de ferramenta. `install.sh`, `install.ps1` e `INSTALL.md` agora estão em `adapters/claude/`.

## Atualizando de 2.x
Quem usa a skill no Claude Code roda `sh adapters/claude/install.sh` (ou `install.ps1`). Os projetos `ai-vj-generator/2` continuam abrindo sem mudança.

## Limites conhecidos
Sem memória entre quadros nos efeitos (trilhas, slit-scan); manchas sem identidade entre quadros; MP4 sem alpha; shaders ISF de terceiros só fecham o loop se o período deles dividir o loop; MIDI e OSC ainda não existem. Veja `docs/PROXIMOS-PASSOS.md`.
