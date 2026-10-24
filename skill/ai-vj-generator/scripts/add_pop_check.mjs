#!/usr/bin/env node
// Teste do popover Adicionar (fase 14a-3), com eventos de mouse e teclado de verdade (CDP Input.dispatch*), não .click():
//   abre pelo botão da aba Camadas e pelo da barra; categorias e grade de tipos; busca; prévia de um quadro (com controle negativo);
//   parâmetro ajustado no popover chega à camada; adicionar é UMA entrada no histórico e Ctrl+Z desfaz; Esc e clique fora fecham e devolvem o foco;
//   Tab fica preso dentro; atalhos do editor não vazam enquanto aberto.
//   node add_pop_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-addpop-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const project = { schema: 'ai-vj-generator/2', id: 'addpop', seed: 3, meta: { name: 'ADICIONAR', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'hud', name: 'H', p: {} }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1400, height: 900 });
const E = s => page.evaluate(s), send = page.send;
const mouse = (type, x, y) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const rect = async sel => JSON.parse(await E(`JSON.stringify((r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect()))`));
const click = async (sel, fx = 0.5) => { await E(`(e => e && e.scrollIntoView({ block: 'center', inline: 'nearest' }))(document.querySelector(${JSON.stringify(sel)}))`); await sleep(40); const r = await rect(sel); const x = r.x + r.w * fx, y = r.y + r.h / 2; await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(120); };
const key = (k, extra = {}) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0, ...extra }).then(() => send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0 })).then(() => sleep(80));
const state = async () => JSON.parse(await E(`JSON.stringify({ open: !document.getElementById('addPop').hidden, type: AIVJ.addPop.type, n: AIVJ.project.compositions[0].layers.length, hist: AIVJ.hist, labels: AIVJ.histLabels, sel: AIVJ.state.sel, exploded: AIVJ.state.exploded, active: document.activeElement && (document.activeElement.id || document.activeElement.dataset.la || document.activeElement.tagName) })`));
/* soma de luminância do quadro de prévia: 0 = tudo preto */
const prevSum = () => E(`(() => { const cv = document.getElementById('apCv'); const d = cv.getContext('2d').getImageData(0, 0, cv.width, cv.height).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; })()`);
const wait = async (f, ms = 3000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(f)) return true; await sleep(60); } return false; };

try {
  /* abrir pelo botão da aba Camadas */
  await click('#libTabs [data-lib="lay"]');
  const s0 = await state();
  await click('[data-la="addpop"]');
  let s = await state();
  check(s.open, 'o botão Adicionar camada abre o popover', JSON.stringify(s));
  check(await E(`document.getElementById('addPop').contains(document.activeElement)`), 'o foco entra no popover', String(s.active));
  check(await E(`document.querySelector('[data-la="addpop"]').getAttribute('aria-expanded') === 'true'`), 'o botão avisa aria-expanded=true', '');
  const cats = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#apCats [data-cat]')].map(b => b.dataset.cat))`));
  check(cats.length === 9 && cats.join() === JSON.parse(await E(`JSON.stringify(AIVJ.FAMILIES.map(f => f[0]))`)).join(), 'as 9 categorias do motor aparecem como abas', cats.join());

  /* categoria e grade */
  await click('#apCats [data-cat="Dados"]');
  const g = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#apGrid [data-type]')].map(b => b.dataset.type))`));
  check(g.join() === 'measure,data,hud,instrument,blobs', 'clicar em Dados lista os tipos da categoria', g.join());
  await click('#apGrid [data-type="instrument"]');
  s = await state();
  check(s.type === 'instrument', 'clicar num tipo o escolhe', s.type);

  /* busca */
  await E(`document.getElementById('apSearch').focus()`);
  for (const ch of 'glif') await key(ch, { text: ch });
  const q = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#apGrid [data-type]')].map(b => b.dataset.type))`));
  check(q.length === 1 && q[0] === 'glyphs', 'a busca "glif" acha só glyphs em todas as categorias', q.join());
  await E(`(() => { const s = document.getElementById('apSearch'); s.value = ''; s.dispatchEvent(new Event('input', { bubbles: true })); })()`);

  /* prévia: tipo que desenha tem pixels; controle negativo: código não tem prévia (preto + aviso) */
  await click('#apCats [data-cat="Shader"]');
  await click('#apGrid [data-type="shader"]'); await sleep(250);
  const sumShader = await prevSum();
  check(sumShader > 5000, 'a prévia de um shader desenha pixels', 'soma ' + sumShader);
  await click('#apCats [data-cat="Código"]');
  await click('#apGrid [data-type="code"]'); await sleep(250);
  const sumCode = await prevSum(), info = await E(`document.getElementById('apInfo').textContent`);
  check(sumCode === 0 && /Sem prévia/.test(info), 'controle negativo: código fica sem prévia (quadro preto e aviso)', `soma ${sumCode} · ${info}`);

  /* parâmetro ajustado no popover chega à camada (clique de mouse no slider) */
  await click('#apCats [data-cat="Shader"]');
  await click('#apGrid [data-type="field"]'); await sleep(200);
  const first = JSON.parse(await E(`JSON.stringify((() => { const r = document.querySelector('#apParams .pc[data-t="n"]'); return r ? { k: r.dataset.k, v: +r.querySelector('[data-r]').value } : null; })())`));
  check(!!first, 'o popover mostra parâmetros numéricos essenciais do tipo', JSON.stringify(first));
  const before = await prevSum();
  await click(`#apParams .pc[data-k="${first.k}"] [data-r]`, 0.95); await sleep(250);
  const after = JSON.parse(await E(`JSON.stringify({ v: +document.querySelector('#apParams .pc[data-k="${first.k}"] [data-r]').value, d: AIVJ.addPop.draft.p['${first.k}'] })`));
  check(after.d !== undefined && after.v !== first.v && after.d === after.v, 'mexer no slider grava o valor na camada em rascunho', JSON.stringify({ first, after }));
  const sum2 = await prevSum();
  check(sum2 > 0, 'a prévia continua desenhando depois do ajuste', `antes ${before} depois ${sum2}`);
  const nParams = await E(`document.querySelectorAll('#apParams .pc').length`);
  check(nParams >= 1 && nParams <= 4, 'no máximo 4 parâmetros essenciais no popover', String(nParams));

  /* adicionar = uma entrada no histórico; vai para depois da selecionada; carrega o parâmetro */
  const sA = await state();
  await click('#apAdd');
  s = await state();
  check(!s.open && s.n === sA.n + 1, 'Adicionar camada fecha o popover e cria 1 camada', JSON.stringify({ sA, s }));
  const added = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[AIVJ.state.sel])`));
  check(added.type === 'field' && added.p[first.k] === after.v, 'a camada nova tem o tipo e o parâmetro escolhidos no popover', JSON.stringify(added));
  check(s.sel === sA.sel + 1, 'a camada nova entra logo acima da selecionada e fica selecionada', `${sA.sel} → ${s.sel}`);
  check(s.hist === sA.hist + 1 && /Adicionar camada/.test(s.labels[s.labels.length - 1]), 'adicionar é uma só entrada no histórico, com nome', JSON.stringify({ h: s.hist, last: s.labels[s.labels.length - 1] }));
  await E(`AIVJ.undo()`); await sleep(150);
  s = await state();
  check(s.n === sA.n, 'um Ctrl+Z desfaz a camada inteira', JSON.stringify(s));
  await E(`AIVJ.redo()`); await sleep(100);

  /* camada sem ajuste nasce com p vazio (controle negativo do teste de parâmetro) */
  await click('[data-la="addpop"]');
  await click('#apCats [data-cat="Formas"]'); await click('#apGrid [data-type="lines"]');
  await click('#apAdd');
  const plain = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[AIVJ.state.sel])`));
  check(plain.type === 'lines' && Object.keys(plain.p).length === 0, 'sem ajustar nada, a camada nasce com p vazio', JSON.stringify(plain));

  /* Esc fecha e devolve o foco ao botão */
  await click('[data-la="addpop"]');
  await key('Escape', { code: 'Escape', vk: 27 });
  s = await state();
  check(!s.open && s.active === 'addpop', 'Esc fecha e o foco volta ao botão que abriu', JSON.stringify(s));

  /* clique fora fecha; clique dentro do cartão não */
  await click('[data-la="addpop"]');
  await click('#apCv');
  check((await state()).open, 'clicar dentro do cartão não fecha', '');
  await mouse('mouseMoved', 6, 6); await mouse('mousePressed', 6, 6); await mouse('mouseReleased', 6, 6); await sleep(120);
  check(!(await state()).open, 'clicar fora do cartão fecha', '');

  /* pela barra flutuante */
  await click('#addBtn');
  check((await state()).open, 'o botão Adicionar da barra também abre', '');

  /* atalhos do editor não vazam: E liga Mostrar camadas */
  const ex0 = (await state()).exploded;
  await E(`document.getElementById('apGrid').querySelector('button').focus()`);
  await key('e', { text: 'e', code: 'KeyE', vk: 69 });
  const ex1 = (await state()).exploded;
  check(ex1 === ex0, 'com o popover aberto, a tecla E não aciona o atalho do editor', `${ex0} → ${ex1}`);
  /* controle positivo do mesmo teste: fechado, E funciona */
  await key('Escape', { code: 'Escape', vk: 27 });
  await E(`document.activeElement && document.activeElement.blur()`);
  await key('e', { text: 'e', code: 'KeyE', vk: 69 });
  const ex2 = (await state()).exploded;
  check(ex2 !== ex0, 'controle positivo: com o popover fechado, E aciona o atalho', `${ex0} → ${ex2}`);
  await key('e', { text: 'e', code: 'KeyE', vk: 69 });

  /* Tab preso dentro */
  await click('#addBtn');
  await E(`(() => { const f = [...document.querySelectorAll('#addPop button,#addPop input,#addPop select')].filter(n => n.offsetParent !== null); f[f.length - 1].focus(); })()`);
  await key('Tab', { code: 'Tab', vk: 9 });
  check(await E(`document.getElementById('addPop').contains(document.activeElement)`), 'Tab no último controle volta ao primeiro, sem sair do popover', await E(`document.activeElement.id || document.activeElement.tagName`));
  await E(`(() => { const f = [...document.querySelectorAll('#addPop button,#addPop input,#addPop select')].filter(n => n.offsetParent !== null); f[0].focus(); })()`);
  await key('Tab', { code: 'Tab', vk: 9, modifiers: 8 });
  check(await E(`document.getElementById('addPop').contains(document.activeElement)`), 'Shift+Tab no primeiro controle vai ao último, sem sair', await E(`document.activeElement.id || document.activeElement.tagName`));
  await key('Escape', { code: 'Escape', vk: 27 });

  /* celular: o cartão cabe na tela */
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 1, mobile: false }); await sleep(250);
  await E(`AIVJ.addPop.open(document.getElementById('addBtn'))`); await sleep(250);
  const box = await rect('#addPop .apbox');
  check(box.x >= 0 && box.x + box.w <= 391, 'em 390 px de largura o cartão não passa da tela', JSON.stringify(box));
  check(await E(`document.documentElement.scrollWidth <= 391`), 'sem rolagem horizontal da página com o popover aberto', String(await E(`document.documentElement.scrollWidth`)));
  await E(`AIVJ.addPop.close()`);
  await send('Emulation.clearDeviceMetricsOverride');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\npopover Adicionar ok.');
process.exit(fail ? 1 : 0);
