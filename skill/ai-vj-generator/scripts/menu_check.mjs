#!/usr/bin/env node
// Teste do menu: nenhum botão do topo nem aba fica coberto por outro elemento (a ajuda da aba já cobriu as abas), cada aba responde ao clique de verdade
// (evento de mouse no ponto do botão, não .click()), e o Esc fecha o assistente mesmo com o cursor na caixa de colar JSON (já não fechava).
//   node menu_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-menu-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const project = { schema: 'ai-vj-generator/2', id: 'menu', seed: 3, meta: { name: 'MENU', brief: 'x', lang: 'pt' }, canvas: { w: 480, h: 270, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 1 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'S', p: { preset: 'CÉLULAS' } }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1400, height: 900 });
const E = s => page.evaluate(s), sleep = ms => new Promise(r => setTimeout(r, ms));
const realClick = async sel => {
  const r = JSON.parse(await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'null'; const r = b.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, e = document.elementFromPoint(x, y); return JSON.stringify({ x, y, top: !!e && (e === b || b.contains(e)), cover: e ? (e.id || e.className || e.tagName) : null }); })()`));
  if (!r) return { err: 'sem elemento' }; if (!r.top) return { err: 'coberto por ' + r.cover };
  for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x: r.x, y: r.y, button: 'left', clickCount: 1 });
  await sleep(120); return {};
};
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.isf)').catch(() => false)) break; await sleep(250); }
  for (const [w, h] of [[1400, 900], [1024, 700], [800, 600]]) {
    await page.send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile: false }); await sleep(300);
    const tabs = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#tabs [data-tab]')].filter(b => getComputedStyle(b).display !== 'none').map(b => b.dataset.tab))`));
    const bad1 = [];
    for (const t of tabs) {
      await E(`document.querySelector('#tabs [data-tab="${t}"]').scrollIntoView({ inline: 'center' })`);
      const r = await realClick(`#tabs [data-tab="${t}"]`); if (r.err) { bad1.push(t + ' ' + r.err); continue; }
      const cur = await E(`document.querySelector('#tabs [aria-selected=true]')?.dataset.tab`); if (cur !== t) bad1.push(t + ' não abriu (abriu ' + cur + ')');
    }
    check(!bad1.length, `${w}x${h}: as ${tabs.length} abas respondem ao clique de verdade`, bad1.join(' · '));
    const top = JSON.parse(await E(`JSON.stringify(['#mStd', '#mBrief', '#wizBtn', '#histBtn', '#lvlBtn', '#themeBtn'].filter(s => { const b = document.querySelector(s); if (!b) return false; const r = b.getBoundingClientRect(), e = document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2); return !(e === b || b.contains(e)); }))`));
    check(!top.length, `${w}x${h}: botões do menu do topo não ficam cobertos`, top.join(','));
  }
  await page.send('Emulation.clearDeviceMetricsOverride');
  /* o assistente abre, o cursor vai para a caixa de JSON, e Esc fecha */
  await E(`document.getElementById('wizBtn').click()`); await sleep(150);
  const opened = await E(`!document.getElementById('wiz').hidden`); check(opened, 'o assistente abre', '');
  await E(`document.getElementById('wJson').focus()`);
  for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: 'Escape', code: 'Escape', windowsVirtualKeyCode: 27 });
  await sleep(200); check(await E(`document.getElementById('wiz').hidden`), 'Esc fecha o assistente com o cursor na caixa de JSON', 'continuou aberto');
  await E(`document.getElementById('wizBtn').click()`); await sleep(150);
  const r = await realClick('#wClose'); check(!r.err && await E(`document.getElementById('wiz').hidden`), 'o botão Fechar do assistente fecha', r.err || 'continuou aberto');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nmenu ok.');
process.exit(fail ? 1 : 0);
