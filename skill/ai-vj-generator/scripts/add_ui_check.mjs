#!/usr/bin/env node
// Fase 14a-3: popover Adicionar. Clique de mouse de verdade (Input.dispatchMouseEvent), nunca .click(), nos botões que abrem, nas abas, nas miniaturas e no Adicionar.
// Confere: abre pelo Adicionar da barra e pelo + de Camadas; uma aba por categoria com os mesmos tipos de FAMILIES; busca sem acento; miniaturas desenham;
// prévia de um quadro com lado maior de 256 px na proporção da superfície e sem loop contínuo; 2 a 4 parâmetros; mexer no rascunho não toca o projeto;
// adicionar = um passo de histórico (um Ctrl+Z desfaz); Esc e clique fora fecham e devolvem o foco; foco preso; atalhos da vista não disparam; gaveta em tela estreita.
//   node add_ui_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function session(width, height, fn) {
  const page = await openPage(join(ROOT, 'app', 'index.html'), { chrome, width, height });
  const E = s => page.evaluate(s), J = async s => JSON.parse(await E(s));
  const realClick = async sel => {
    const r = await J(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'null'; b.scrollIntoView({ block: 'center', inline: 'center' }); const r = b.getBoundingClientRect(), x = r.x + r.width / 2, y = r.y + r.height / 2, e = document.elementFromPoint(x, y); return JSON.stringify({ x, y, top: !!e && (b === e || b.contains(e) || e.contains(b)), cover: e && (e.id || e.className || e.tagName) }); })()`);
    if (!r) return { err: 'sem elemento ' + sel }; if (!r.top) return { err: sel + ' coberto por ' + r.cover };
    await clickAt(r.x, r.y); return {};
  };
  const clickAt = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(200); };
  const key = async (k, o = {}) => { const code = o.code || (k.length === 1 ? 'Key' + k.toUpperCase() : k), vk = o.vk || { Escape: 27, Tab: 9, Enter: 13 }[k] || (k.length === 1 ? k.toUpperCase().charCodeAt(0) : 0);
    for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: k, code, windowsVirtualKeyCode: vk, modifiers: o.mod || 0, text: type === 'keyDown' && k.length === 1 && !o.mod ? k : undefined }); await sleep(120); };
  await E(`(() => { const w = document.getElementById('wiz'); if (w && !w.hidden) document.getElementById('wClose').click(); return 1; })()`);
  try { await fn({ E, J, realClick, clickAt, key }); } catch (e) { bad('exceção: ' + (e.message || e)); }
  await page.close();
}
const isOpen = E => E(`!document.getElementById('addPop').hidden`);
/* pixels acesos de um canvas (0 = em branco); o controle negativo mede um canvas preto */
const LIT = sel => `(() => { const c = document.querySelector(${JSON.stringify(sel)}); if (!c || c.width < 3) return 0; const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; return n; })()`;
const SIG = sel => `(() => { const c = document.querySelector(${JSON.stringify(sel)}); const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let h = 0; for (let i = 0; i < d.length; i += 7) h = (h * 31 + d[i]) >>> 0; return h; })()`;

await session(1440, 900, async ({ E, J, realClick, clickAt, key }) => {
  /* abrir pela barra */
  let r = await realClick('#addBarBtn');
  check(!r.err && await isOpen(E), 'clique de verdade em Adicionar (barra flutuante) abre o popover', r.err || 'não abriu');
  check(await E(`document.activeElement && document.activeElement.id === 'addQ'`), 'ao abrir, o foco vai para a busca', await E(`document.activeElement && document.activeElement.id`));
  const tabs = await J(`JSON.stringify({ n: document.querySelectorAll('#addTabs [role=tab]').length, fam: AIVJ.FAMILIES.length })`);
  check(tabs.n === tabs.fam && tabs.n === 10, `uma aba por categoria (${tabs.n})`, JSON.stringify(tabs));
  r = await realClick('#addTabs [data-cat="6"]');
  const dados = await J(`JSON.stringify([...document.querySelectorAll('#addGrid .addTile')].map(b => b.dataset.t))`);
  check(!r.err && dados.join() === 'measure,data,hud,instrument,blobs,icon,ruler,counter,gauge,coords,progress,chart,network,rack', 'aba Dados (clique de verdade) mostra os 14 tipos de FAMILIES, na ordem', r.err || dados.join());
  /* miniaturas: desenham (Shader) e o controle negativo (canvas preto) conta zero */
  await realClick('#addTabs [data-cat="1"]'); await sleep(1500);
  const lit = await J(`JSON.stringify([...document.querySelectorAll('#addGrid canvas[data-t]')].map(c => { let n = 0; if (c.width > 2) { const d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; for (let i = 0; i < d.length; i += 4) if (d[i] + d[i + 1] + d[i + 2] > 30) n++; } return { t: c.dataset.t, n }; }))`);
  check(lit.length === 6 && lit.every(x => x.n > 50), 'as 6 miniaturas da aba Shader desenham (shader, isf, synth, field, solid, particles)', JSON.stringify(lit));
  const ctl = await E(`(() => { const c = document.createElement('canvas'); c.id = 'blackCtl'; c.width = 40; c.height = 20; const x = c.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, 40, 20); document.body.appendChild(c); return ${LIT('#blackCtl')}; })()`);
  check(ctl === 0, 'controle negativo: um canvas preto conta 0 pixels acesos', String(ctl));
  await realClick('#addTabs [data-cat="8"]'); await sleep(300);
  check(await E(`document.querySelector('#addGrid .addTile[data-t="temporal"]').classList.contains('nolive')`), 'Tempo (precisa do histórico) não tenta miniatura ao vivo e diz isso com um traço', '');
  /* busca sem acento e controle negativo */
  await E(`(() => { const q = document.getElementById('addQ'); q.value = 'solido'; q.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
  const s1 = await J(`JSON.stringify([...document.querySelectorAll('#addGrid .addTile')].map(b => b.dataset.t))`);
  check(s1.includes('solid') && await E(`![...document.querySelectorAll('#addTabs [role=tab]')].some(t => t.getAttribute('aria-selected') === 'true')`), 'busca "solido" acha Sólido 3D (sem acento) e tira a seleção das abas', s1.join());
  await E(`(() => { const q = document.getElementById('addQ'); q.value = 'zzqqxx'; q.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
  check(await E(`document.querySelectorAll('#addGrid .addTile').length === 0 && /nada encontrado/i.test(document.getElementById('addGrid').textContent)`), 'controle negativo: busca sem resultado mostra 0 tipos e diz "Nada encontrado"', '');
  await E(`(() => { const q = document.getElementById('addQ'); q.value = ''; q.dispatchEvent(new Event('input', { bubbles: true })); return 1; })()`);
  /* escolher: prévia e parâmetros */
  await realClick('#addTabs [data-cat="1"]'); r = await realClick('#addGrid .addTile[data-t="shader"]'); await sleep(500);
  const pv = await J(`JSON.stringify({ w: document.getElementById('addPrev').width, h: document.getElementById('addPrev').height, W: AIVJ.project.canvas.w, H: AIVJ.project.canvas.h, n: document.querySelectorAll('#addCtl .pc').length, go: !!document.getElementById('addGo') })`);
  check(!r.err && Math.max(pv.w, pv.h) === 256 && Math.abs(pv.h - Math.round(256 * pv.H / pv.W)) <= 1, `prévia de um quadro com lado maior de 256 px na proporção da superfície (${pv.w}×${pv.h} para ${pv.W}×${pv.H})`, r.err || JSON.stringify(pv));
  check(pv.n >= 2 && pv.n <= 4 && pv.go, `${pv.n} parâmetros em linha (2 a 4) e o botão Adicionar camada`, JSON.stringify(pv));
  check(await E(LIT('#addPrev')) > 500, 'a prévia desenha', '');
  const a0 = await E(SIG('#addPrev')); await sleep(1200); const a1 = await E(SIG('#addPrev'));
  check(a0 === a1 && await E(`AIVJ.state.n`) > 0, 'sem loop contínuo: parada, a prévia não muda enquanto a vista anda', `${a0} ${a1}`);
  /* mexer no rascunho não toca o projeto nem o histórico */
  const before = await J(`JSON.stringify({ h: AIVJ.hist, n: AIVJ.project.compositions[AIVJ.state.ci].layers.length, s: JSON.stringify(AIVJ.project), c: JSON.stringify(AIVJ.project.compositions) })`);
  await E(`(() => { const r = document.querySelector('#addCtl .pc[data-k="p1"] [data-r]'); r.value = 3.3; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); return 1; })()`); await sleep(700);
  const mid = await J(`JSON.stringify({ h: AIVJ.hist, s: JSON.stringify(AIVJ.project), p: AIVJ.addUI.state.p })`);
  check(mid.h === before.h && mid.s === before.s && mid.p.p1 === 3.3, 'mexer num parâmetro do popover muda só o rascunho (projeto e histórico iguais)', JSON.stringify({ h: [before.h, mid.h], p: mid.p }));
  check(await E(SIG('#addPrev')) !== a1, 'e a prévia redesenha com o valor novo', '');
  /* adicionar: um passo de histórico, um Ctrl+Z desfaz */
  const sel0 = await E(`AIVJ.state.sel`), at = await E(`AIVJ.addUI.state.at`);
  r = await realClick('#addGo');
  const after = await J(`(() => { const c = AIVJ.project.compositions[AIVJ.state.ci], L = c.layers[${at}]; return JSON.stringify({ h: AIVJ.hist, n: c.layers.length, type: L && L.type, p1: L && L.p.p1, sel: AIVJ.state.sel, open: !document.getElementById('addPop').hidden, label: AIVJ.histLabels.slice(-1)[0] }); })()`);
  check(!r.err && after.n === before.n + 1 && after.type === 'shader' && after.p1 === 3.3 && after.sel === at && at === sel0 + 1, `Adicionar camada (clique de verdade) põe a camada acima da selecionada (L${at}) com o valor do rascunho e a seleciona`, r.err || JSON.stringify(after));
  check(after.h === before.h + 1 && /adicionar camada/i.test(after.label || ''), 'adicionar é um passo só no histórico, com rótulo', JSON.stringify(after));
  check(!after.open && await E(`document.activeElement && document.activeElement.id === 'addBarBtn'`), 'o popover fecha e o foco volta ao botão que o abriu', '');
  await key('z', { mod: 2, code: 'KeyZ', vk: 90 }); await sleep(300);
  /* compara as composições: o restore do histórico (anterior a esta fase) normaliza project.assets ausente para {} em qualquer desfazer */
  const undone = await J(`JSON.stringify({ h: AIVJ.hist, c: JSON.stringify(AIVJ.project.compositions) })`);
  check(undone.h === before.h && undone.c === before.c, 'um Ctrl+Z desfaz a camada adicionada inteira', JSON.stringify({ h: undone.h }));
  /* controle: dois adicionar contam dois passos (o contador de passos consegue reprovar) */
  for (let i = 0; i < 2; i++) { await realClick('#addBarBtn'); await realClick('#addGrid .addTile[data-t="shader"]'); await realClick('#addGo'); }
  check(await E(`AIVJ.hist`) === before.h + 2, 'controle: dois adicionar = dois passos de histórico', String(await E(`AIVJ.hist`)));
  await key('z', { mod: 2, code: 'KeyZ', vk: 90 }); await key('z', { mod: 2, code: 'KeyZ', vk: 90 });
  /* abrir pelo + de Camadas; Esc fecha e devolve o foco */
  await E(`(() => { const t = document.querySelector('#libTabs [data-lib="lay"]'); t.click(); return 1; })()`); await sleep(200);
  r = await realClick('#lib [data-addpop]');
  check(!r.err && await isOpen(E), 'clique de verdade no + do cabeçalho de Camadas abre o popover', r.err || 'não abriu');
  await key('Escape');
  check(!(await isOpen(E)) && await E(`document.activeElement && document.activeElement.matches('[data-addpop]')`), 'Esc fecha e devolve o foco ao +', await E(`document.activeElement && (document.activeElement.id || document.activeElement.tagName)`));
  /* clique fora fecha */
  await realClick('#addBarBtn');
  const out = await J(`(() => { const b = document.querySelector('#addPop .box').getBoundingClientRect(); return JSON.stringify({ x: b.left > 40 ? 20 : innerWidth - 20, y: 20, fits: b.left >= 0 && b.top >= 0 && b.right <= innerWidth && b.bottom <= innerHeight }); })()`);
  check(out.fits, '1440×900: a caixa cabe inteira na tela', JSON.stringify(out));
  const pause0 = await E(`AIVJ.state.paused`);
  await realClick('#addGrid .addTile'); await key('p');
  check(await E(`AIVJ.state.paused`) === pause0, 'com o popover aberto, a tecla P (pausa da vista) não dispara', '');
  /* foco preso: Tab além do último volta ao primeiro, sempre dentro da caixa */
  let inside = true; for (let i = 0; i < 40; i++) { await key('Tab'); if (!(await E(`!!document.activeElement && document.querySelector('#addPop .box').contains(document.activeElement)`))) { inside = false; break; } }
  check(inside, 'foco preso: 40 Tabs seguidos não saem do popover', '');
  await clickAt(out.x, out.y);
  check(!(await isOpen(E)), 'clique fora da caixa fecha o popover', '');
});

/* tela estreita: gaveta encostada embaixo, sem rolagem horizontal */
await session(520, 860, async ({ E, J, realClick }) => {
  const r = await realClick('#addBarBtn'); await sleep(400);
  const g = await J(`(() => { const b = document.querySelector('#addPop .box').getBoundingClientRect(), x = document.querySelector('#addPop .box'); return JSON.stringify({ bottom: Math.round(b.bottom), ih: innerHeight, left: Math.round(b.left), w: Math.round(b.width), iw: innerWidth, ov: x.scrollWidth > x.clientWidth + 1 }); })()`);
  check(!r.err && g.bottom === g.ih && g.left === 0 && g.w === g.iw && !g.ov, `520 px: vira gaveta (encosta embaixo, largura toda, sem rolagem horizontal)`, r.err || JSON.stringify(g));
});

console.log(fail ? `\n${fail} falha(s).` : '\npopover Adicionar ok.');
process.exit(fail ? 1 : 0);
