# Contribuindo

Pull requests são bem-vindos: geradores novos, presets de shader, exemplos de projeto, traduções e correções.

## Regras do motor

1. **Determinismo.** Um gerador é uma função de `(ctx, R)` onde `R = { p, F, comp, W, H, u, k }`. Nada de `Math.random`, `Date.now` ou estado entre quadros. Para aleatoriedade use `hr(a, b, c)` (hash com seed); para ruído, `vn(x, y)`.
2. **Loop.** Movimento contínuo usa `F.lph` (fase do loop) multiplicada por ciclos inteiros: `cyc(F, n)` arredonda quando seamless está ligado. Eventos usam `F.beat`, `F.bar`, `F.sub` ou `F.bk` (beat na divisão da camada).
3. **Escala.** Desenhe em unidades de 1080: multiplique tamanhos por `u`. O mesmo projeto precisa ler em 16:9, 9:16 e 10:1.
4. **Parâmetros.** Registre com `reg(type, label, group, params, draw)` usando `N` (número), `S` (lista), `C` (cor), `B` (liga/desliga), `T` (texto). A interface, o JSON e a validação vêm do registro.
5. **Design system.** A interface é monocromática (GYULYIA DS): preto, branco, cinzas, Martian Mono, linhas finas, cantos retos. Cor só dentro do palco.

## Antes do PR

```bash
node scripts/sync-skill.mjs
node scripts/check.mjs
```

Se você mudou um gerador, atualize `skill/ai-vj-generator/references/project-schema.md`. Se mudou o comportamento da skill, rode o cenário de teste descrito em `docs/ANALISE.md` (seção "Teste da skill") com e sem a skill.

## Testes sem navegador, CI e demonstração

- `node scripts/check.mjs` termina com **"Tudo certo."** só quando nada foi pulado. Sem Chrome/Edge ele diz `PASSOU, mas N verificações foram PULADAS`; com `--strict` (ou `CI=true`) isso é falha.
- Chrome é achado em `CHROME_PATH`, nos caminhos usuais ou no Chromium do Playwright. Como root (contêiner/CI) os scripts já usam `--no-sandbox`, e todos usam WebGL por software (`scripts/chrome_env.mjs`).
- `.github/workflows/check.yml` roda os testes em cada PR; `pages.yml` publica o motor (ative em Settings → Pages → Source: GitHub Actions).
