# Changelog

## 1.0.0 — 2026-10-02

Primeira versão pública.

- Motor em arquivo único (`app/index.html`): relógio por contagem de quadros, aleatoriedade por hash com seed, loops seamless verificados (a emenda do loop mede igual a uma virada de compasso interna nas 10 composições de teste).
- STANDARD: o motor de camadas original (organismo, estrutura, medição, dados, HUD, evento, pós) portado para render determinístico, com textos específicos de evento transformados em parâmetros.
- Geradores de briefing: linhas, fluxo, túnel, parede tipográfica. Camadas fixas: shader GLSL (4 presets + código próprio), imagem, vídeo, forma, texto.
- Entrevistador embutido com gramática visual por regras; importação do PROJECT JSON da skill.
- Export PNG alpha (composição, por camada, camada única, branco α), WebM, janela de saída, displays recortados, validação ERROR / WARNING / OPTIMIZATION.
- Skill `ai-vj-generator` com referências de entrevista, direção de arte, schema, saídas e entrega; scripts de build em Python e Node. Testada com cenário RED/GREEN.
