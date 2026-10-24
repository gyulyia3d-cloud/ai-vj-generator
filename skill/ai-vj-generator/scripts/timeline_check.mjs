#!/usr/bin/env node
// Teste da timeline T1 (fase 14b), somente leitura, com mouse e teclado de verdade (CDP Input.dispatch*):
//   uma faixa por camada com o comportamento temporal declarado e o atraso medido em semicolcheias; fases e eventos vindos do Animation IR e do Composition IR
//   no lugar certo da régua; cabeça de leitura que segue o quadro e vai ao ponto clicado; teclado na régua; recolher; projeto sem IR diz que não tem;
//   nada do projeto muda (nem histórico) com a timeline em uso; controles negativos.
//   node timeline_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-tl-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const phaseNames = ['establish', 'develop', 'transform', 'peak', 'release'];
const mkProject = withIR => ({ schema: 'ai-vj-generator/2', id: 'tl', seed: 5, meta: Object.assign({ name: 'TIMELINE', brief: 'x', lang: 'pt' }, withIR ? {
    compositionIR: [{ temporal: { arc: 'x', phases: phaseNames.map((name, k) => ({ name, at: k / 5 })) } }],
    animationIR: [{ events: [{ name: 'establish', phase: 0, beat: 0, at: 0 }, { name: 'build', phase: 1, beat: 3, at: 0.2 }, { name: 'turn', phase: 2, beat: 6, at: 0.4 }, { name: 'focal', phase: 3, beat: 10, at: 0.6 }, { name: 'release', phase: 4, beat: 13, at: 0.8 }] }] } : {}),
  canvas: { w: 640, h: 360, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 4, loop: true, seamless: true, mode: 'loop' },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [
    { type: 'bg', name: 'FUNDO', temporal: { behavior: 'still', listens: [], reason: 'x' } },
    { type: 'hud', name: 'HERO', p: { phase: 0.25 }, mod: [{ k: 'size', src: 'lfo', shape: 'sine', cycles: 2, min: 1, max: 1.3, mode: 'mul' }], temporal: { behavior: 'beat', listens: ['bass'], reason: 'x' } },
    { type: 'lines', name: 'LINHAS', on: false, temporal: { behavior: 'drift', listens: [], reason: 'x' } }] }] });
const open = async withIR => {
  const pj = join(tmp, 'p' + withIR + '.json'); writeFileSync(pj, JSON.stringify(mkProject(withIR)));
  execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p' + withIR + '.html')], { stdio: 'pipe' });
  return openPage(join(tmp, 'p' + withIR + '.html'), { chrome, width: 1500, height: 950 });
};
let page = await open(1);
const E = s => page.evaluate(s), send = () => page.send;
const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const rect = async sel => JSON.parse(await E(`JSON.stringify((r => ({ x: r.x, y: r.y, w: r.width, h: r.height, r: r.right }))(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect()))`));
const click = async (sel, fx = 0.5) => { await E(`(e => e && e.scrollIntoView({ block: 'nearest' }))(document.querySelector(${JSON.stringify(sel)}))`); const r = await rect(sel); const x = r.x + r.w * fx, y = r.y + r.h / 2; await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y); await mouse('mouseReleased', x, y); await sleep(150); };
const key = (k, extra = {}) => page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0 }).then(() => page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0 })).then(() => sleep(100));
const snap = () => E(`JSON.stringify(AIVJ.project)`);
const wait = async (f, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(f)) return true; await sleep(60); } return false; };

try {
  await E(`AIVJ.state.paused = false; AIVJ.timeline.setOpen(true)`);
  check(await wait(`!!document.querySelector('#tlBody .tlrow[data-i]')`), 'a timeline abre e monta as faixas', 'sem faixas');
  const hist0 = await E(`AIVJ.hist`), proj0 = await snap();

  /* uma faixa por camada, com comportamento e atraso lidos do projeto */
  const L = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')].map(l => ({ b: l.dataset.behavior, steps: +l.dataset.steps, aria: l.getAttribute('aria-label') })))`));
  const nl = await E(`AIVJ.project.compositions[0].layers.length`);
  check(L.length === nl && nl >= 3, `uma faixa por camada (${nl})`, JSON.stringify(L.length));
  check(L.slice(3).every(x => x.b === '' && /SEM COMPORTAMENTO/.test(x.aria)), 'camada sem comportamento declarado aparece como SEM COMPORTAMENTO, sem inventar um', JSON.stringify(L.slice(3)));
  check(L[0].b === 'still' && L[1].b === 'beat' && L[2].b === 'drift', 'cada faixa mostra o comportamento temporal declarado na camada', JSON.stringify(L.map(x => x.b)));
  check(L[1].steps === 16 && L[0].steps === 0, 'atraso medido em semicolcheias: p.phase 0.25 em 4 compassos = 16, sem atraso = 0', JSON.stringify(L.map(x => x.steps)));
  check(/LFO 2 ciclos/.test(L[1].aria) && /ouve bass/.test(L[1].aria) && /desligada/.test(L[2].aria), 'o rótulo acessível diz LFO, o que a camada ouve e se está desligada', L[1].aria + ' | ' + L[2].aria);
  /* geometria da barra deslocada: começa em 25% da faixa e o trecho que passa o fim reaparece no começo */
  const g = JSON.parse(await E(`JSON.stringify((() => { const l = document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')[1], w = l.getBoundingClientRect().width, m = l.querySelector('[data-part=main]').getBoundingClientRect(), p = l.querySelector('[data-part=wrap]').getBoundingClientRect(), r = l.getBoundingClientRect(); return { start: (m.left - r.left) / w, mainW: m.width / w, wrapW: p.width / w, wrapStart: (p.left - r.left) / w }; })())`));
  check(Math.abs(g.start - 0.25) < 0.01 && Math.abs(g.mainW - 0.75) < 0.01 && Math.abs(g.wrapW - 0.25) < 0.01 && Math.abs(g.wrapStart) < 0.01, 'a barra começa em 25% do loop e o resto dá a volta no começo', JSON.stringify(g));
  /* controle negativo: sem atraso a barra ocupa a faixa toda e não tem trecho de volta */
  const g0 = JSON.parse(await E(`JSON.stringify((() => { const l = document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')[0], w = l.getBoundingClientRect().width; return { w: l.querySelector('[data-part=main]').getBoundingClientRect().width / w, wrap: !!l.querySelector('[data-part=wrap]') }; })())`));
  check(Math.abs(g0.w - 1) < 0.01 && !g0.wrap, 'controle negativo: camada sem atraso ocupa o loop todo e não tem trecho de volta', JSON.stringify(g0));

  /* fases e eventos nas posições do IR */
  const ph = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#tlBody .ph')].map(p => { const s = p.parentElement.getBoundingClientRect(), r = p.getBoundingClientRect(); return { n: p.dataset.phase, a: +((r.left - s.left) / s.width).toFixed(2), w: +(r.width / s.width).toFixed(2) }; }))`));
  check(ph.map(p => p.n).join() === phaseNames.join() && ph.every((p, k) => Math.abs(p.a - k / 5) < 0.01 && Math.abs(p.w - 0.2) < 0.01), 'as 5 fases da composição ocupam um quinto do loop cada, em ordem', JSON.stringify(ph));
  const ev = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#tlBody .ev')].map(p => { const s = p.parentElement.getBoundingClientRect(), r = p.getBoundingClientRect(); return { n: p.dataset.event, a: +((r.left - s.left) / s.width).toFixed(2) }; }))`));
  check(ev.length === 5 && ev.every((e, k) => Math.abs(e.a - [0, 0.2, 0.4, 0.6, 0.8][k]) < 0.01), 'os 5 eventos na batida aparecem em 0, 20, 40, 60 e 80% do loop', JSON.stringify(ev));
  /* régua */
  const rl = JSON.parse(await E(`JSON.stringify({ bars: document.querySelectorAll('#tlRuler i.bar').length, beats: document.querySelectorAll('#tlRuler i').length })`));
  check(rl.bars === 4 && rl.beats === 16, 'a régua marca 4 compassos e 16 batidas', JSON.stringify(rl));

  /* cabeça de leitura: segue o quadro e vai ao ponto clicado na régua */
  await E(`AIVJ.state.paused = true`); await sleep(150);
  await click('#tlRuler', 0.5); await sleep(200);
  const mid = JSON.parse(await E(`JSON.stringify({ n: AIVJ.state.n, LF: AIVJ.timeline.model.LF, paused: AIVJ.state.paused, vframe: document.getElementById('vFrame').value })`));
  check(Math.abs(mid.n - (mid.LF - 1) / 2) <= 2 && mid.paused, 'clicar no meio da régua leva o quadro ao meio do loop e pausa', JSON.stringify(mid));
  const hx = JSON.parse(await E(`JSON.stringify((() => { const h = document.getElementById('tlHead').getBoundingClientRect(), r = document.getElementById('tlRuler').getBoundingClientRect(); return { f: (h.left + h.width / 2 - r.left) / r.width }; })())`));
  check(Math.abs(hx.f - 0.5) < 0.02, 'a cabeça de leitura fica no meio da régua', JSON.stringify(hx));
  await E(`document.getElementById('tlRuler').focus()`);
  await key('ArrowRight', { code: 'ArrowRight', vk: 39 }); await key('ArrowRight', { code: 'ArrowRight', vk: 39 });
  const k2 = await E(`AIVJ.state.n`);
  check(k2 === mid.n + 2, 'seta direita na régua avança um quadro por toque', `${mid.n} → ${k2}`);
  await key('Home', { code: 'Home', vk: 36 });
  check((await E(`AIVJ.state.n`)) === 0, 'Home leva ao primeiro quadro', String(await E(`AIVJ.state.n`)));
  await key('PageDown', { code: 'PageDown', vk: 34 });
  check((await E(`AIVJ.state.n`)) === 15, 'PageDown anda uma batida (15 quadros a 120 BPM e 30 FPS)', String(await E(`AIVJ.state.n`)));
  /* controle negativo: a cabeça não está parada, segue o quadro tocando */
  await E(`AIVJ.timeline.seekBy(-AIVJ.state.n); AIVJ.state.paused = false`);
  const a0 = await E(`document.getElementById('tlHead').style.left`); await sleep(500);
  const a1 = await E(`document.getElementById('tlHead').style.left`);
  check(a0 !== a1, 'controle negativo: tocando, a cabeça de leitura anda', `${a0} = ${a1}`);
  await E(`AIVJ.state.paused = true`);

  /* áudio: a faixa desenha algo */
  const au = await E(`(() => { const c = document.getElementById('tlAud'), d = c.getContext('2d').getImageData(0, 0, c.width, c.height).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s; })()`);
  check(au > 0, 'a faixa de áudio sintético desenha as bandas', String(au));

  /* só leitura */
  const proj1 = await snap(), hist1 = await E(`AIVJ.hist`);
  check(proj1 === proj0 && hist1 === hist0, 'usar a timeline (clique, teclas, cabeça) não muda o projeto nem o histórico', `hist ${hist0} → ${hist1}`);
  await click('#tlBody .tlrow[data-i="1"] .tlname');
  check((await E(`AIVJ.state.sel`)) === 1 && (await snap()) === proj0, 'clicar no nome da camada só seleciona, sem editar', String(await E(`AIVJ.state.sel`)));

  /* recolher e voltar */
  const vp0 = (await rect('#vp')).h;
  await click('#tlToggle'); await sleep(250);
  const vp1 = (await rect('#vp')).h;
  check(await E(`document.getElementById('tl').hidden`) && vp1 > vp0 + 100, 'Timeline ▾ recolhe o painel e devolve a altura à vista', `${vp0} → ${vp1}`);
  await click('#tlShow'); await sleep(250);
  check(!(await E(`document.getElementById('tl').hidden`)), 'o botão Timeline ▴ traz de volta', '');

  /* altura arrastável por teclado */
  const h0 = await E(`AIVJ.timeline.height`);
  await E(`document.getElementById('tlSplit').focus()`); await key('ArrowUp', { code: 'ArrowUp', vk: 38 });
  const h1 = await E(`AIVJ.timeline.height`);
  check(h1 === h0 + 16, 'seta para cima no separador aumenta a timeline em 16 px', `${h0} → ${h1}`);

  /* edição do projeto reflete: mudar o atraso de uma camada pelo painel atualiza a barra (a timeline lê, não guarda cópia) */
  await E(`AIVJ.project.compositions[0].layers[0].p = { phase: 0.5 }`); await wait(`document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')[0].dataset.steps === '32'`, 3000);
  check(await E(`document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')[0].dataset.steps === '32'`), 'a timeline relê o projeto: p.phase 0.5 vira 32 semicolcheias', String(await E(`document.querySelectorAll('#tlBody .tlrow[data-i] .tllane')[0].dataset.steps`)));

  /* sem layout quebrado em tela estreita */
  await page.send('Emulation.setDeviceMetricsOverride', { width: 390, height: 780, deviceScaleFactor: 1, mobile: false }); await sleep(400);
  check(await E(`document.documentElement.scrollWidth <= 391`), 'em 390 px a página não rola na horizontal com a timeline', String(await E(`document.documentElement.scrollWidth`)));
  await page.send('Emulation.clearDeviceMetricsOverride');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();

/* projeto escrito à mão, sem Animation IR nem Composition IR: só régua e camadas, e a timeline diz isso (controle negativo da leitura de IR) */
try {
  page = await open(0);
  await page.evaluate(`AIVJ.timeline.setOpen(true)`);
  const t0 = Date.now(); while (Date.now() - t0 < 4000 && !(await page.evaluate(`!!document.querySelector('#tlBody .tlrow[data-i]')`))) await sleep(60);
  const n = JSON.parse(await page.evaluate(`JSON.stringify({ phases: document.querySelectorAll('#tlBody .ph').length, events: document.querySelectorAll('#tlBody .ev').length, note: (document.querySelector('#tlBody .tlnote') || {}).textContent || '', lanes: document.querySelectorAll('#tlBody .tlrow[data-i]').length })`));
  check(n.phases === 0 && n.events === 0 && /sem Animation IR/.test(n.note) && n.lanes >= 3, 'sem IR no projeto: nenhuma fase nem evento inventados, aviso claro e as faixas das camadas', JSON.stringify(n));
} catch (e) { bad('exceção (sem IR): ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ntimeline ok.');
process.exit(fail ? 1 : 0);
