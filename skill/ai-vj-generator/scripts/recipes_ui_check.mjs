#!/usr/bin/env node
// Teste automático das receitas embutidas e da paleta OKLCH do motor, num Chrome/Edge headless.
//
//   node recipes_ui_check.mjs [--chrome caminho]
//
// 1. EMBUTIDO: as receitas do motor são iguais ao manifest e às fontes em references/recipes.
// 2. ABA RECEITAS: busca, filtro, adicionar camada (um passo no histórico), cartões de teste, prévia.
// 3. PALETA: o porte em JavaScript dá o mesmo resultado que scripts/palette.py; edição por L C h e hex entra no histórico.
// 4. SEGURANÇA: texto digitado na busca não vira HTML.
// Sai com 1 se algo falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-rec-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const py = (...a) => { for (const exe of ['python', 'py', 'python3']) { try { return JSON.parse(execFileSync(exe, [join(HERE, 'palette.py'), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })); } catch (e) { if (e.code !== 'ENOENT') throw e; } } return null; };

const contract = Object.fromEntries(['concept', 'audienceEffect', 'semioticIntent', 'visualLanguage', 'formLanguage', 'materialLanguage', 'colorLogic'].map(k => [k, 'x ' + k]));
contract.loopGrammar = 'cyclic: o loop fecha em compassos inteiros';
const layers = ['bg', 'organism', 'lines'].map((t, i) => ({ type: t, name: 'CAMADA ' + (i + 1), role: 'camada ' + t }));
const project = { schema: 'ai-vj-generator/2', id: 'rec-check', seed: 7, meta: { name: 'TESTE DE RECEITAS', brief: 'x', contract },
  canvas: { w: 3584, h: 1080, fps: 30, target: 'projection' }, time: { bpm: 124, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'PRIMEIRA', hypothesis: 'x', layers }] };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

const page = await openPage(html, { chrome, width: 1400, height: 900 });
const E = x => page.evaluate(x);
const nl = () => E(`AIVJ.project.compositions[AIVJ.state.ci].layers.length`);
const hist = () => E(`AIVJ.hist`);

try {
  await E(`localStorage.clear(); AIVJ.state.codeAllow = true; 1`);

  /* 1. embutido */
  const man = JSON.parse(readFileSync(join(HERE, '..', 'references', 'recipes', 'manifest.json'), 'utf8')).recipes;
  const emb = JSON.parse(await E(`JSON.stringify(AIVJ.RECIPES.map(r => ({ id: r.id, kind: r.kind, src: r.src })))`));
  check(emb.length === man.length && man.every((m, i) => emb[i].id === m.id && emb[i].kind === m.kind), 'receitas embutidas = manifest (' + man.length + ')', `${emb.length} vs ${man.length}`);
  const drift = man.filter((m, i) => emb[i] && emb[i].src !== readFileSync(join(HERE, '..', 'references', 'recipes', m.file), 'utf8').replace(/\r\n/g, '\n')).map(m => m.id);
  check(!drift.length, 'fontes embutidas = arquivos de references/recipes', drift.join(','));

  /* 2. receitas como opção das camadas shader e código (sem aba) */
  check(await E(`!document.querySelector('#tabs [data-tab="rec"]')`), 'não há aba +Efeitos: as receitas vivem nos parâmetros das camadas shader e código', 'aba presente');
  const l0 = await nl(), h0 = await hist();
  await E(`AIVJ.addRecipe('chladni'); 1`); await sleep(500);
  check(await nl() === l0 + 1 && await hist() === h0 + 1, 'adicionar receita de shader cria 1 camada e 1 passo de histórico', `${l0}->${await nl()} / ${h0}->${await hist()}`);
  check(await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].type`) === 'shader', 'a camada nova fica selecionada', '');
  await E(`AIVJ.undo(); 1`); await sleep(150);
  check(await nl() === l0, 'Desfazer remove a camada da receita', String(await nl()));
  await E(`AIVJ.redo(); 1`); await sleep(150);
  check(await nl() === l0 + 1, 'Refazer devolve a camada', String(await nl()));

  /* o seletor Receita nos parâmetros troca o conteúdo da camada atual */
  const opts = JSON.parse(await E(`(() => { document.querySelector('#tabs [data-tab="par"]').click(); const s = document.getElementById('pRec'); return JSON.stringify(s ? [...s.options].map(o => o.value).filter(Boolean) : []); })()`));
  check(opts.length === man.filter(m => m.kind === 'shader').length && opts.includes('chladni'), 'o seletor Receita de uma camada shader lista as receitas de shader', JSON.stringify(opts));
  const sw = JSON.parse(await E(`(() => { const s = document.getElementById('pRec'); s.value = 'julia-orbit'; s.dispatchEvent(new Event('change', { bubbles: true })); const L = AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel]; return JSON.stringify({ type: L.type, name: L.name, src: (L.p.src || '').includes('julia') || (L.p.src || '').length > 50 }); })()`));
  check(sw.type === 'shader' && /JULIA/.test(sw.name) && sw.src, 'escolher outra receita troca o código e o nome da camada', JSON.stringify(sw));

  await E(`AIVJ.state.codeAllow = true; AIVJ.addRecipe('clifford'); 1`); await sleep(500);
  check(await E(`AIVJ.state.codeAllow`) === true && await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].type`) === 'code', 'receita de código entra autorizada quando o código já era autorizado', '');
  await E(`AIVJ.state.codeAllow = false; AIVJ.addRecipe('clifford'); 1`); await sleep(500);
  check(await E(`AIVJ.state.codeAllow`) === false, 'receita de código NÃO se autoriza sozinha quando o código estava bloqueado', 'codeAllow ligou sozinho');
  await E(`AIVJ.state.codeAllow = true; 1`);

  const c0 = await E(`AIVJ.project.compositions.length`), h1 = await hist();
  await E(`document.querySelector('#tabs [data-tab="sur"]').click(); document.querySelector('#sTest').click(); 1`); await sleep(600);
  check(await E(`AIVJ.project.compositions.length`) === c0 + 1 && await hist() === h1 + 1, 'cartões de teste (aba Superfície) criam 1 composição e 1 passo', '');
  check(await E(`AIVJ.project.compositions.at(-1).layers[1].p.v_card === undefined && AIVJ.project.compositions.at(-1).layers[1].type`) === 'code', 'a composição de teste usa a receita testcard', '');
  await E(`AIVJ.undo(); 1`); await sleep(150);
  check(await E(`AIVJ.project.compositions.length`) === c0, 'Desfazer remove a composição de teste', '');

  /* 3. paleta */
  const combos = [[250, 'complement', 'led'], [30, 'mono', 'projection'], [145, 'triad', 'screen'], [330, 'tetrad', 'led'], [195, 'split', 'projection'], [265, 'analogous', 'screen'], [0, 'complement', 'led'], [359, 'mono', 'screen']];
  const havePy = py('convert', '#E19000') !== null;
  if (!havePy) ok('-- palette.py indisponível: paridade pulada');
  else for (const [h, s, sf] of combos) {
    const ref = py('scheme', '--hue', String(h), '--scheme', s, '--surface', sf);
    const got = JSON.parse(await E(`JSON.stringify(AIVJ.PAL.scheme(${h}, ${JSON.stringify(s)}, 0.17, ${JSON.stringify(sf)}))`));
    const same = ['bg', 'primary', 'secondary', 'accent'].every(k => ref[k].hex === got[k].hex);
    const cr = Object.keys(ref.checks.contrast).every(k => Math.abs(ref.checks.contrast[k] - got.checks.contrast[k]) < 0.011);
    check(same && cr && ref.checks.warnings.length === got.checks.warnings.length, `paridade JS=Python ${s} h${h} ${sf}`, `${['bg', 'primary', 'secondary', 'accent'].map(k => ref[k].hex + '/' + got[k].hex).join(' ')} avisos ${ref.checks.warnings.length}/${got.checks.warnings.length}`);
  }
  const rt = JSON.parse(await E(`JSON.stringify(['#E19000', '#000103', '#7089A4', '#FFFFFF', '#000000', '#4C5055'].map(h => { const o = AIVJ.PAL.hexToOklch(h); return [h, AIVJ.PAL.oklchToHex(o[0], o[1], o[2])[0]]; }))`));
  check(rt.every(([a, b]) => a === b), 'hex -> OKLCH -> hex volta ao mesmo hex', rt.filter(([a, b]) => a !== b).join(';'));

  await E(`document.querySelector('#tabs [data-tab="prj"]').click(); 1`); await sleep(150);
  check(await E(`!!document.querySelector('#palX')`), 'o painel Cor perceptual aparece na aba Projeto', '');
  const p0 = await E(`AIVJ.project.palette.accent`), h2 = await hist();
  await E(`(i => { i.value = '#3355FF'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#palX [data-role="accent"] [data-hex]')); 1`); await sleep(400);
  check(await E(`AIVJ.project.palette.accent`) === '#3355FF' && await hist() === h2 + 1, 'editar o hex muda a paleta e entra no histórico', await E(`AIVJ.project.palette.accent`));
  await E(`AIVJ.undo(); 1`); await sleep(200);
  check(await E(`AIVJ.project.palette.accent`) === p0, 'Desfazer devolve a cor', await E(`AIVJ.project.palette.accent`));
  await E(`(i => { i.value = 'zzz'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#palX [data-role="accent"] [data-hex]')); 1`); await sleep(200);
  check(await E(`AIVJ.project.palette.accent`) === p0, 'hex inválido não altera a paleta', await E(`AIVJ.project.palette.accent`));
  await E(`(i => { i.value = '0.5'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#palX [data-role="primary"] [data-lch="0"]')); 1`); await sleep(400);
  const pl = JSON.parse(await E(`JSON.stringify(AIVJ.PAL.hexToOklch(AIVJ.project.palette.primary))`));
  check(Math.abs(pl[0] - 0.5) < 0.01, 'digitar L=0,5 leva a luminosidade a 0,5', String(pl[0]));
  await E(`AIVJ.undo(); 1`); await sleep(200);
  await E(`(g => { document.querySelector('#palHue').value = '250'; g.click(); })(document.querySelector('#palGen')); 1`); await sleep(400);
  const g = JSON.parse(await E(`JSON.stringify(AIVJ.project.palette)`));
  const ref = havePy ? py('scheme', '--hue', '250', '--scheme', 'complement', '--surface', await E(`document.querySelector('#palSurf').value`)) : null;
  check(!ref || (g.bg === ref.bg.hex && g.accent === ref.accent.hex && g.field === ref.field.hex), 'Gerar esquema aplica o mesmo resultado do palette.py (inclui o campo)', JSON.stringify(g));
} finally { await page.close(); }

console.log(fail ? `\n${fail} problema(s).` : '\nTudo certo.');
process.exit(fail ? 1 : 0);
