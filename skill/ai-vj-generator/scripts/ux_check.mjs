#!/usr/bin/env node
// Teste da UX da fase 3: modo Criativo/Avançado (abas escondidas e persistência), ajuda por aba (uma linha para cada aba que existe), atalhos (a lista cobre TODOS os
// atalhos do código do teclado e abre com ?), tour guiado (cada passo destaca um elemento visível, navega, sai com Esc e conclui) e idioma.
//   node ux_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-ux-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'u', seed: 1, meta: { name: 'U', brief: 'x', lang: 'pt' }, canvas: { w: 1280, h: 720, fps: 30 }, time: { bpm: 120, bars: 2 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1400, height: 900 });
const E = x => page.evaluate(x);
const key = (k, extra = {}) => E(`document.dispatchEvent(new KeyboardEvent('keydown', Object.assign({ key: ${JSON.stringify(k)}, bubbles: true }, ${JSON.stringify(extra)}))); 0`);
try {
  // 1) modo
  await E(`localStorage.removeItem('aivj-level'); AIVJ.UX.setLevel('creative', true)`);
  const vis = JSON.parse(await E(`JSON.stringify(['gen','comp','lay','par','aud','sur','exp','txt','prj','rec','spc'].map(t => [t, document.querySelector('#tabs [data-tab="' + t + '"]').offsetParent !== null]))`));
  const shown = Object.fromEntries(vis);
  check(shown.gen && shown.comp && shown.lay && shown.par && shown.aud && shown.sur && shown.exp && !shown.txt && !shown.prj && !shown.rec && !shown.spc, 'modo Criativo mostra Gerar, Compor, Camadas, Parâm., Áudio, Superfície e Exportar e esconde Texto, Projeto, +Efeitos e Ficha', JSON.stringify(shown));
  await E(`document.getElementById('lvlBtn').click()`);
  const adv = JSON.parse(await E(`JSON.stringify(['txt','prj','rec','spc'].map(t => document.querySelector('#tabs [data-tab="' + t + '"]').offsetParent !== null))`));
  check(adv.every(Boolean) && (await E(`localStorage.getItem('aivj-level')`)) === '"advanced"', 'o botão troca para Avançado: as quatro abas voltam e a escolha fica gravada', JSON.stringify(adv));
  await E(`document.querySelector('#tabs [data-tab="prj"]').click(); document.getElementById('lvlBtn').click()`);
  check((await E(`AIVJ.state.tab`)) !== 'prj' && (await E(`document.querySelector('[data-pane="prj"]').hidden`)), 'ao voltar para Criativo estando numa aba escondida, a interface vai para Compor', await E(`AIVJ.state.tab`));
  check(await E(`!!AIVJ.project && AIVJ.project.compositions.length === 1`), 'esconder abas não mexe no projeto', 'projeto mudou');

  // 2) ajuda por aba
  const tabs = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#tabs [data-tab]')].map(b => b.dataset.tab))`));
  const noHelp = [], helps = {};
  for (const t of tabs) { await E(`document.querySelector('#tabs [data-tab="${t}"]').click()`); await new Promise(r => setTimeout(r, 60)); const h = await E(`(() => { const x = document.getElementById('tabHelp'); return x && !x.hidden ? x.textContent : ''; })()`); helps[t] = h; if (!h || h.length < 30) noHelp.push(t); }
  check(!noHelp.length, `todas as ${tabs.length} abas têm uma linha de ajuda (${tabs.join(', ')})`, 'sem ajuda em: ' + noHelp.join(', '));
  check(new Set(Object.values(helps)).size === tabs.length, 'cada aba tem uma ajuda diferente', 'textos repetidos');
  await E(`AIVJ.setLang('en', true)`); await E(`document.querySelector('#tabs [data-tab="exp"]').click()`); await new Promise(r => setTimeout(r, 60));
  const en = await E(`document.getElementById('tabHelp').textContent`);
  check(/Export the PNG sequence/.test(en), 'em inglês a ajuda aparece em inglês', en);
  await E(`AIVJ.setLang('pt', true)`);
  await E(`document.getElementById('helpHide').click()`);
  check(await E(`document.getElementById('tabHelp').hidden`), 'o × esconde a linha de ajuda (e ela volta pelo botão da aba Guia)', 'ajuda ainda visível');
  await E(`document.querySelector('#tabs [data-tab="gui"]').click()`); await new Promise(r => setTimeout(r, 60)); await E(`document.getElementById('uxHelpOn').click()`);
  check(await E(`!document.getElementById('tabHelp').hidden`), 'o botão "Mostrar a linha de ajuda" da aba Guia traz a ajuda de volta', 'continua escondida');

  // 3) atalhos: a lista cobre todos os cases do teclado
  const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'index.html'), 'utf8'), blk = src.slice(src.indexOf('/* ---------- teclado ---------- */'), src.indexOf('/* ---------- carregar briefing'));
  const cases = [...blk.matchAll(/case '([^']+)':/g)].map(m => m[1]).filter(k => k !== 'escape');
  const listed = JSON.parse(await E(`JSON.stringify(AIVJ.UX.KEYS.map(k => k[0]))`)).join(' ').toLowerCase();
  const labelOf = { ' ': 'espaço', enter: 'enter', arrowup: '↑', arrowdown: '↓', ',': ',', '.': '.' };
  const missing = cases.filter(c => !listed.includes((labelOf[c] || c).toLowerCase()));
  check(cases.length >= 12 && !missing.length, `a lista de atalhos cobre os ${cases.length} atalhos do código do teclado`, 'faltam: ' + missing.join(', '));
  await key('?'); check(await E(`!!document.getElementById('keysBox')`), 'a tecla ? abre a lista de atalhos', 'não abriu');
  await key('Escape'); check(await E(`!document.getElementById('keysBox')`), 'Esc fecha a lista', 'continua aberta');
  await E(`(() => { const i = document.createElement('input'); i.id = 'tmpIn'; document.body.appendChild(i); i.focus(); i.dispatchEvent(new KeyboardEvent('keydown', { key: '?', bubbles: true })); })()`);
  check(await E(`!document.getElementById('keysBox')`), 'digitando num campo, ? não abre a lista', 'abriu');

  // 4) tour
  await E(`AIVJ.UX.startTour()`);
  let st = JSON.parse(await E(`(() => { const hi = document.getElementById('tourHi').getBoundingClientRect(), t = document.querySelector('#tabs [data-tab="gen"]').getBoundingClientRect(); return JSON.stringify({ n: document.getElementById('tourBox').textContent.slice(0, 12), near: Math.abs(hi.left + 4 - t.left) < 2 && Math.abs(hi.top + 4 - t.top) < 2 }); })()`));
  check(/1 \/ 7/.test(st.n) && st.near, 'o tour abre no passo 1 e o destaque cobre o elemento (aba Gerar)', JSON.stringify(st));
  for (let i = 2; i <= 7; i++) {
    await E(`document.getElementById('tourNext').click()`);
    const s = JSON.parse(await E(`(() => { const hi = document.getElementById('tourHi').getBoundingClientRect(); return JSON.stringify({ w: hi.width, h: hi.height, txt: document.getElementById('tourBox').textContent.slice(0, 10) }); })()`));
    if (!(s.w > 20 && s.h > 10 && s.txt.startsWith(i + ' / 7'))) { bad(`passo ${i} do tour sem destaque ou fora de ordem :: ` + JSON.stringify(s)); break; }
    if (i === 7) ok('os sete passos do tour destacam elementos visíveis, em ordem');
  }
  await E(`document.getElementById('tourPrev').click()`);
  check(/6 \/ 7/.test(await E(`document.getElementById('tourBox').textContent`)), 'Voltar retorna ao passo anterior', await E(`document.getElementById('tourBox').textContent.slice(0, 20)`));
  await key('Escape');
  check(await E(`!document.getElementById('tourBox') && !document.getElementById('tourHi')`), 'Esc sai do tour e remove o destaque', 'sobrou elemento');
  await E(`AIVJ.UX.startTour(); for (let i = 0; i < 7; i++) document.getElementById('tourNext').click();`);
  check(await E(`!document.getElementById('tourBox') && localStorage.getItem('aivj-tourDone') === 'true'`), 'concluir o último passo encerra e grava que o tour foi feito', 'não encerrou');
  // passo com aba escondida (modo Criativo esconde Ficha, mas o tour não usa abas escondidas): nenhum passo aponta para elemento invisível
  const hidden = JSON.parse(await E(`JSON.stringify(AIVJ.UX.STEPS.filter(s => { const e = document.querySelector(s[0]); return !e || e.offsetParent === null; }).map(s => s[0]))`));
  check(!hidden.length, 'nenhum passo do tour aponta para elemento escondido no modo Criativo', JSON.stringify(hidden));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nUX ok.');
process.exit(fail ? 1 : 0);
