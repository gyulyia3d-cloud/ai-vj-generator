#!/usr/bin/env node
// Fase 14b-T1: timeline somente leitura. Clique de mouse de verdade (Input.dispatchMouseEvent) nos botões e na régua; teclas por Input.dispatchKeyEvent.
// Confere, com um projeto da galeria (tem Composition IR e Animation IR): uma faixa por camada na ordem do painel; fases e eventos nas posições do IR;
// atraso em semicolcheias (p.phase) desloca a barra e a parte que dá a volta; ↻ quando o loop fecha e ≠ quando uma curva tem ciclo fracionário (controle negativo);
// a cabeça de leitura segue o quadro e só ela anda (o DOM não é refeito ao tocar); clicar na régua posiciona sem editar o projeto; transporte; olho = o do painel;
// recolher devolve o scrub; altura pelo teclado; áudio sintético desenhado; a barra flutuante não cobre a timeline. Sem IR, as faixas dizem que não há fases (controle).
//   node timeline_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const tmp = mkdtempSync(join(tmpdir(), 'aivj-tl-'));
const GAL = join(ROOT, 'examples', 'gallery', '01-pressao-led.aivj.json'), proj = JSON.parse(readFileSync(GAL, 'utf8'));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), GAL, '--out', join(tmp, 'g.html')], { stdio: 'pipe' });

async function session(file, width, height, fn) {
  const page = await openPage(file, { chrome, width, height });
  const E = s => page.evaluate(s), J = async s => JSON.parse(await E(s));
  const at = async sel => J(`(() => { const b = document.querySelector(${JSON.stringify(sel)}); if (!b) return 'null'; b.scrollIntoView({ block: 'nearest', inline: 'nearest' }); const r = b.getBoundingClientRect(); return JSON.stringify({ x: r.x, y: r.y, w: r.width, h: r.height }); })()`);
  const clickAt = async (x, y) => { for (const type of ['mousePressed', 'mouseReleased']) await page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', clickCount: 1 }); await sleep(200); };
  const realClick = async (sel, fx = 0.5) => {
    const r = await at(sel); if (!r) return { err: 'sem elemento ' + sel };
    const x = r.x + r.w * fx, y = r.y + r.h / 2, top = await E(`(() => { const b = document.querySelector(${JSON.stringify(sel)}), e = document.elementFromPoint(${x}, ${y}); return !!e && (b === e || b.contains(e) || e.contains(b)); })()`);
    if (!top) return { err: sel + ' coberto por ' + await E(`(() => { const e = document.elementFromPoint(${x}, ${y}); return e ? (e.id || e.className || e.tagName) : 'nada'; })()`) };
    await clickAt(x, y); return {};
  };
  const key = async (k, o = {}) => { const vk = { ArrowRight: 39, ArrowLeft: 37, ArrowUp: 38, ArrowDown: 40, Home: 36, End: 35 }[k] || 0;
    for (const type of ['keyDown', 'keyUp']) await page.send('Input.dispatchKeyEvent', { type, key: k, code: k, windowsVirtualKeyCode: vk, modifiers: o.mod || 0 }); await sleep(120); };
  await E(`(() => { const w = document.getElementById('wiz'); if (w && !w.hidden) document.getElementById('wClose').click(); return 1; })()`); await sleep(400);
  try { await fn({ E, J, realClick, clickAt, key, at }); } catch (e) { bad('exceção: ' + (e.message || e)); }
  await page.close();
}
const POS = `AIVJ.state.F.n`;
const until = async (E, cond, ms = 8000) => { for (let t = 0; t < ms; t += 200) { if (await E(cond)) return true; await sleep(200); } return false; };

await session(join(tmp, 'g.html'), 1440, 900, async ({ E, J, realClick, key, at }) => {
  if (!(await E(`AIVJ.timeline.state.open`))) await realClick('#tlTog');
  check(await E(`AIVJ.timeline.state.open && getComputedStyle(document.getElementById('scrub')).display === 'none'`), '1440×900: a timeline abre acoplada embaixo da vista e substitui a linha do scrub', '');
  const comp = proj.compositions[0], cir = proj.meta.compositionIR[0], an = proj.meta.animationIR[0];
  /* faixas por camada, na ordem do painel */
  const rows = await J(`JSON.stringify([...document.querySelectorAll('#tlNames .tln.ly .nm')].map(e => e.textContent))`), panel = await J(`JSON.stringify([...document.querySelectorAll('#lrows .lrow .nm')].map(e => e.textContent))`);
  check(rows.length > 0 && rows.join('|') === panel.join('|'), `uma faixa por camada, na ordem do painel de Camadas (${rows.length})`, rows.join('|'));
  /* fases e eventos nas posições do IR */
  const ph = await J(`JSON.stringify([...document.querySelectorAll('#tlPh .tlph')].map(e => ({ t: e.textContent, l: parseFloat(e.style.left) })))`);
  check(ph.length === cir.temporal.phases.length && ph.every((p, k) => p.t === cir.temporal.phases[k].name && Math.abs(p.l - cir.temporal.phases[k].at * 100) < 0.01), `fases da composição (${ph.map(p => p.t).join(', ')}) começam onde o Composition IR diz`, JSON.stringify(ph));
  const ev = await J(`JSON.stringify([...document.querySelectorAll('#tlEv .tlev')].map(e => ({ t: e.textContent, l: parseFloat(e.style.left) })))`);
  check(ev.length === an.events.length && ev.every((e, k) => e.t === an.events[k].name && Math.abs(e.l - an.events[k].at * 100) < 0.01), `eventos na batida (${ev.length}) nas posições do Animation IR`, JSON.stringify(ev));
  /* atraso em semicolcheias */
  const li = comp.layers.findIndex(l => l.p && l.p.phase > 0), lp = comp.layers[li].p.phase, steps = Math.round(lp * proj.time.bars * 16 * 100) / 100;
  const bar = await J(`(() => { const r = document.querySelectorAll('#tlIn .tlr.ly')[${li}], b = r.querySelectorAll('.tlbar'); return JSON.stringify({ n: b.length, l: parseFloat(b[0].style.left), wrap: b[1] ? parseFloat(b[1].style.width) : 0, label: r.getAttribute('aria-label') }); })()`);
  check(bar.n === 2 && Math.abs(bar.l - lp * 100) < 0.01 && Math.abs(bar.wrap - lp * 100) < 0.01 && bar.label.includes(String(steps)), `atraso de ${steps} semicolcheia(s) (p.phase ${lp}): a barra começa deslocada e a sobra dá a volta`, JSON.stringify(bar));
  check(/segue|deriva|acento|lidera|parada/.test(bar.label), 'cada faixa diz o comportamento no rótulo acessível', bar.label);
  /* fecha o loop, e o controle negativo: um ciclo fracionário mostra ≠ */
  check(await E(`[...document.querySelectorAll('#tlIn .tlr.ly .tlend')].every(e => e.classList.contains('ok')) && document.querySelector('#tlRuler .tlend').classList.contains('ok')`), 'projeto da galeria: toda faixa e a régua marcam que o loop fecha (↻)', '');
  const hero = comp.layers.findIndex(l => Array.isArray(l.mod) && l.mod.some(m => m.src === 'lfo'));
  await E(`(() => { const L = AIVJ.project.compositions[AIVJ.state.ci].layers[${hero}]; window.__mod = JSON.stringify(L.mod); L.mod.find(m => m.src === 'lfo').cycles = 1.5; return 1; })()`);
  /* a timeline confere mudanças a cada 30 quadros: espera até 8 s, sem forçar o redesenho */
  await until(E, `/\\bno\\b/.test(document.querySelector('#tlRuler .tlend').className)`);
  const neg = await J(`JSON.stringify({ row: document.querySelectorAll('#tlIn .tlr.ly')[${hero}].querySelector('.tlend').className, ruler: document.querySelector('#tlRuler .tlend').className })`);
  check(/\bno\b/.test(neg.row) && /\bno\b/.test(neg.ruler), 'controle negativo: com uma curva de 1,5 ciclo, a faixa e a régua marcam que o loop não fecha (≠)', JSON.stringify(neg));
  await E(`(() => { AIVJ.project.compositions[AIVJ.state.ci].layers[${hero}].mod = JSON.parse(window.__mod); return 1; })()`); await until(E, `/\\bok\\b/.test(document.querySelector('#tlRuler .tlend').className)`);
  /* só a cabeça de leitura anda */
  await E(`AIVJ.timeline.state.open && (window.__tlIn = document.getElementById('tlIn')); 1`);
  if (await E(`AIVJ.state.paused`)) await realClick('#tlPlay');
  const h0 = await J(`JSON.stringify({ l: parseFloat(document.getElementById('tlHead').style.left), n: ${POS} })`); await sleep(900);
  const h1 = await J(`JSON.stringify({ l: parseFloat(document.getElementById('tlHead').style.left), n: ${POS}, LF: AIVJ.state.F.LF, same: window.__tlIn === document.getElementById('tlIn') })`);
  check(h1.n !== h0.n && Math.abs(h1.l - h1.n / h1.LF * 100) < 1.5, `a cabeça de leitura segue o quadro (${h0.n} → ${h1.n})`, JSON.stringify([h0, h1]));
  check(h1.same, 'tocando, só a cabeça de leitura anda: o DOM da timeline não é refeito a cada quadro', '');
  /* régua: clique de verdade posiciona, sem editar o projeto */
  const before = await J(`JSON.stringify({ s: JSON.stringify(AIVJ.project), h: AIVJ.hist, bpm: AIVJ.project.time.bpm })`);
  let r = await realClick('#tlRuler', 0.5); await sleep(150);
  const mid = await J(`JSON.stringify({ n: ${POS}, LF: AIVJ.state.F.LF, paused: AIVJ.state.paused })`);
  check(!r.err && mid.paused && Math.abs(mid.n - mid.LF / 2) <= 2, `clique de verdade no meio da régua pausa e vai ao quadro ${mid.n} de ${mid.LF}`, r.err || JSON.stringify(mid));
  await E(`document.getElementById('tlRuler').focus(); 1`); await key('ArrowRight');
  const k1 = await E(POS); await key('ArrowRight', { mod: 8 }); const k2 = await E(POS);
  const fpb = await E(`AIVJ.state.F.fpb`);
  check(k1 === mid.n + 1 && k2 === k1 + Math.round(fpb), `régua pelo teclado: → anda 1 quadro, Shift+→ anda um tempo (${Math.round(fpb)} quadros)`, `${mid.n} ${k1} ${k2}`);
  /* transporte */
  r = await realClick('#tlNext'); const t1 = await E(POS); r = await realClick('#tlStart'); const t0 = await E(POS); await realClick('#tlPrev'); const tp = await E(POS);
  check(t1 === k2 + 1 && t0 === 0 && tp === mid.LF - 1, 'transporte: próximo quadro, início do loop, quadro anterior dá a volta', `${t1} ${t0} ${tp}`);
  await realClick('#tlZi'); await realClick('#tlZi'); const z = await J(`JSON.stringify({ z: AIVJ.timeline.state.zoom, w: document.getElementById('tlIn').offsetWidth, v: document.getElementById('tlTracks').clientWidth })`);
  check(z.z === 4 && z.w >= z.v * 3.9, 'zoom da timeline 4×: a faixa fica 4 vezes mais larga e rola', JSON.stringify(z));
  await realClick('#tlZo'); await realClick('#tlZo');
  const after = await J(`JSON.stringify({ s: JSON.stringify(AIVJ.project), h: AIVJ.hist, bpm: AIVJ.project.time.bpm })`);
  check(after.s === before.s && after.h === before.h, 'régua, teclado, transporte e zoom não mudam o projeto nem o histórico (somente leitura)', JSON.stringify({ h: [before.h, after.h] }));
  /* olho: o mesmo do painel */
  const on0 = await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[1].on`);
  r = await realClick('#tlNames [data-tlvis="1"]'); await sleep(500);
  const on1 = await J(`JSON.stringify({ on: AIVJ.project.compositions[AIVJ.state.ci].layers[1].on, tl: document.querySelector('#tlNames [data-tlvis="1"]').getAttribute('aria-pressed') })`);
  check(!r.err && on1.on === !on0 && on1.tl === String(!on0), 'o olho da faixa liga e desliga a camada, como o do painel de Camadas', r.err || JSON.stringify(on1));
  await realClick('#tlNames [data-tlvis="1"]');
  /* áudio sintético desenhado */
  const au = await J(`(() => { const c = document.getElementById('tlAc'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 40) n++; return JSON.stringify({ n, t: document.getElementById('tlAuL').textContent }); })()`);
  check(au.n > 500 && /sintética/i.test(au.t), 'faixa de áudio: bandas da fonte sintética do BPM desenhadas, com rótulo', JSON.stringify(au));
  /* a barra flutuante não cobre a timeline */
  const ov = await J(`JSON.stringify({ bar: document.getElementById('bar').getBoundingClientRect().bottom, tl: document.getElementById('tl').getBoundingClientRect().top })`);
  check(ov.bar <= ov.tl + 1, 'a barra flutuante sobe e não cobre a timeline', JSON.stringify(ov));
  /* altura pelo teclado: a vista encolhe */
  const vp0 = await E(`document.getElementById('vp').offsetHeight`), th0 = await E(`AIVJ.timeline.state.h`);
  await E(`document.getElementById('tlGrip').focus(); 1`); await key('ArrowUp'); await key('ArrowUp'); await sleep(200);
  const vp1 = await E(`document.getElementById('vp').offsetHeight`), th1 = await E(`AIVJ.timeline.state.h`);
  check(th1 === th0 + 32 && vp1 < vp0, `altura pelo teclado (${th0} → ${th1} px) e a vista encolhe junto`, `${vp0} ${vp1}`);
  await key('ArrowDown'); await key('ArrowDown');
  /* recolher devolve o scrub */
  r = await realClick('#tlTog');
  check(!r.err && !(await E(`AIVJ.timeline.state.open`)) && await E(`getComputedStyle(document.getElementById('scrub')).display !== 'none' && getComputedStyle(document.getElementById('tlBody')).display === 'none'`), 'recolher (clique de verdade) esconde as faixas e devolve o scrub', r.err || '');
  await realClick('#tlTog');
});

/* sem IR (STANDARD): controle, as faixas dizem que não há fases nem eventos */
await session(join(ROOT, 'app', 'index.html'), 1440, 900, async ({ E, realClick }) => {
  if (!(await E(`AIVJ.timeline.state.open`))) await realClick('#tlTog');
  check(await E(`/sem fases/i.test(document.getElementById('tlPh').textContent) && /sem eventos/i.test(document.getElementById('tlEv').textContent) && document.querySelectorAll('#tlPh .tlph').length === 0`), 'controle: projeto sem Composition IR nem Animation IR mostra "sem fases" e "sem eventos"', '');
});

/* tela estreita: começa recolhida, com o scrub */
await session(join(tmp, 'g.html'), 520, 860, async ({ E }) => {
  const s = JSON.parse(await E(`JSON.stringify({ open: AIVJ.timeline.state.open, scrub: getComputedStyle(document.getElementById('scrub')).display, ov: document.documentElement.scrollWidth > innerWidth + 1 })`));
  check(!s.open && s.scrub !== 'none' && !s.ov, '520 px: a timeline começa recolhida, o scrub fica, sem rolagem horizontal', JSON.stringify(s));
});

console.log(fail ? `\n${fail} falha(s).` : '\ntimeline ok.');
process.exit(fail ? 1 : 0);
