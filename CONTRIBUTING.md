# Contribuindo

Pull requests são bem-vindos: geradores, efeitos `fx`, cadeias `synth`, shaders ISF com licença clara, exemplos, traduções e correções. As regras para agentes de código estão em [AGENTS.md](AGENTS.md); aqui, o essencial para pessoas.

## Regras do motor
1. **Determinismo.** Um gerador é uma função de `(ctx, R)` com `R = { p, F, comp, W, H, u, k }`. Nada de `Math.random`, `Date.now` ou estado entre quadros. Aleatoriedade: `hr(a, b, c)` (hash com semente) e ruído `vn(x, y)`.
2. **Loop.** Movimento contínuo usa `F.lph` (fase do loop) vezes ciclos inteiros. Eventos usam `F.beat`, `F.bar`, `F.sub` ou `F.bk`.
3. **Escala.** Desenhe em unidades de 1080 (multiplique tamanhos por `u`). O mesmo projeto precisa ler em 16:9, 9:16 e 10:1.
4. **Parâmetros.** Registre com `reg(type, label, group, params, draw)` usando `N`, `S`, `C`, `B`, `T`. A interface, o JSON e a validação vêm do registro.
5. **Camadas que leem a pilha** (`fx`, `blobs`) recebem `R.below` e entram em `BELOW_TYPES` (`app/fx.js`).
6. **Design system.** Interface monocromática (GYULYIA DS): preto, branco, cinzas, Martian Mono, linhas finas, cantos retos. Cor só dentro do palco.
7. **Licenças.** Nada de código de repositórios AGPL, GPL ou não comerciais; ISF de terceiros só MIT, CC0 ou equivalente, com autoria no manifesto (`skill/ai-vj-generator/isf-library/README.md`).

## Antes do PR
```bash
node scripts/embed-modules.mjs && node scripts/build.mjs && node scripts/sync-skill.mjs
node scripts/check.mjs
```
Se mudou um gerador, atualize `skill/ai-vj-generator/references/project-schema.md` e, se for uma camada nova, `references/families.json` e `references/vocabulary.md`. Todo recurso novo traz um teste que pode falhar (controle negativo) e, se for visual, uma folha de contato olhada por uma pessoa.

## Testes, CI e demonstração
- `node scripts/check.mjs` termina com **"Tudo certo."** só quando nada foi pulado. Sem Chrome/Edge ele diz `PASSOU, mas N verificações foram PULADAS`; com `--strict` (ou `CI=true`) isso é falha.
- O Chrome é achado em `CHROME_PATH`, nos caminhos usuais ou no Chromium do Playwright. Como root (contêiner, CI) os scripts usam `--no-sandbox` e WebGL por software; em máquina com GPU eles usam a GPU (`AIVJ_SOFTWARE_GL=1` força o software, `AIVJ_GPU=1` liga a GPU nos benchmarks e renders).
- `.github/workflows/check.yml` roda os testes em cada PR; `pages.yml` publica o motor (Settings → Pages → Source: GitHub Actions).
