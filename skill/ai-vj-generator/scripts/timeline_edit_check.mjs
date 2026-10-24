#!/usr/bin/env node
// Teste da timeline T2 (fase 14b), edição do que já existe, com mouse e teclado de verdade (CDP Input.dispatch*):
//   arrastar a barra de uma camada muda L.p.phase em semicolcheias inteiras (e o render muda); arrastar um evento muda a batida (e o render NÃO muda);
//   um gesto = uma entrada de histórico e um Ctrl+Z; Esc cancela; limites; teclado; ordem dos eventos; nada fora do campo alterado muda.
//   Controles negativos: clique sem mover não grava; evento não mexe no render; arrasto não passa do vizinho; projeto sem IR edita atraso mas não tem eventos.
//   node timeline_edit_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-tle-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));
const phaseNames = ['establish', 'develop', 'transform', 'peak', 'release'];
const mkProject = withIR => ({ schema: 'ai-vj-generator/2', id: 'tle', seed: 5, meta: Object.assign({ name: 'TIMELINE EDIT', brief: 'x', lang: 'pt' }, withIR ? {
    compositionIR: [{ temporal: { arc: 'x', phases: phaseNames.map((name, k) => ({ name, at: k / 5 })) } }],
    animationIR: [{ events: [{ name: 'establish', phase: 'establish', beat: 0, at: 0 }, { name: 'build', phase: 'develop', beat: 3, at: 0.1875 }, { name: 'turn', phase: 'transform', beat: 6, at: 0.375 }, { name: 'focal', phase: 'peak', beat: 10, at: 0.625 }, { name: 'release', phase: 'release', beat: 13, at: 0.8125 }] }] } : {}),
  canvas: { w: 640, h: 360, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 4, loop: true, seamless: true, mode: 'loop' },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [
    { type: 'bg', name: 'FUNDO', temporal: { behavior: 'still', listens: [], reason: 'x' } },
    { type: 'shape', name: 'HERO', p: { phase: 0.25 }, mod: [{ k: 'size', src: 'lfo', shape: 'sine', cycles: 2, min: 1, max: 1.3, mode: 'mul' }], temporal: { behavior: 'beat', listens: ['bass'], reason: 'x' } },
    { type: 'lines', name: 'LINHAS', on: false, temporal: { behavior: 'drift', listens: [], reason: 'x' } }] }] });
const open = async withIR => {
  const pj = join(tmp, 'p' + withIR + '.json'); writeFileSync(pj, JSON.stringify(mkProject(withIR)));
  execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p' + withIR + '.html')], { stdio: 'pipe' });
  return openPage(join(tmp, 'p' + withIR + '.html'), { chrome, width: 1500, height: 950 });
};
let page = await open(1);
const E = s => page.evaluate(s);
const mouse = (type, x, y) => page.send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1 });
const rect = async sel => JSON.parse(await E(`JSON.stringify((r => ({ x: r.x, y: r.y, w: r.width, h: r.height }))(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect()))`));
const key = (k, vk = 0) => page.send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: k, windowsVirtualKeyCode: vk }).then(() => page.send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: k, windowsVirtualKeyCode: vk })).then(() => sleep(80));
const wait = async (f, ms = 4000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await E(f)) return true; await sleep(60); } return false; };
const proj = () => E(`JSON.stringify(AIVJ.project)`);
const hash = () => E(`[3, 20, 40].map(n => { const d = AIVJ.renderFrame(0, n, 0.25, false).data; let h = 2166136261; for (let i = 0; i < d.length; i++) h = Math.imul(h ^ d[i], 16777619) >>> 0; return h; }).join()`);
const lane = i => `#tlBody .tlrow[data-i="${i}"] .tllane`;
const steps = async i => +(await E(`document.querySelector('${lane(i)}').dataset.steps`));
const phaseOf = i => E(`(AIVJ.project.compositions[0].layers[${i}].p || {}).phase`);
const evs = async () => JSON.parse(await E(`JSON.stringify(AIVJ.project.meta.animationIR[0].events.map(e => [e.beat, e.at, e.phase]))`));
/* arrasto real: aperta no centro do alvo, anda dx pixels em passos, solta (ou deixa preso para testar o Esc) */
const dragBy = async (sel, dx, { hold = false, fromFx = 0.5 } = {}) => {
  await E(`(e => e && e.scrollIntoView({ block: 'nearest' }))(document.querySelector(${JSON.stringify(sel)}))`);
  const r = await rect(sel), x = r.x + r.w * fromFx, y = r.y + r.h / 2;
  await mouse('mouseMoved', x, y); await mouse('mousePressed', x, y);
  for (let k = 1; k <= 6; k++) { await mouse('mouseMoved', x + dx * k / 6, y); await sleep(15); }
  if (!hold) { await mouse('mouseReleased', x + dx, y); await sleep(200); }
  return { x, y, dx };
};
const stepPx = async () => (await rect(lane(1))).w / 64, beatPx = async () => (await rect('#tlBody .tlstrip')).w / 16;

try {
  await E(`AIVJ.state.paused = true; AIVJ.timeline.setOpen(true)`);
  check(await wait(`!!document.querySelector('#tlBody .tlrow[data-i]')`), 'a timeline abre e monta as faixas', 'sem faixas');

  /* atraso por arrasto */
  const h0 = await E(`AIVJ.hist`), r0 = await hash(), pj0 = JSON.parse(await proj());
  const sp = await stepPx();
  await dragBy(lane(1), 5 * sp);
  const s1 = await steps(1), ph1 = await phaseOf(1), h1 = await E(`AIVJ.hist`);
  check(s1 === 21 && Math.abs(ph1 - 21 / 64) < 1e-6, 'arrastar a barra 5 semicolcheias à direita: de 16 vai a 21 (p.phase = 21/64)', `steps ${s1}, phase ${ph1}`);
  check(h1 === h0 + 1 && /Atraso L1/.test((await E(`AIVJ.histLabels`)).slice(-1)[0]), 'o arrasto grava UMA entrada de histórico, com nome', `${h0} → ${h1}: ${(await E(`AIVJ.histLabels`)).slice(-1)}`);
  const r1 = await hash();
  check(r1 !== r0, 'o atraso muda o render de verdade (quadros 3, 20 e 40 diferem)', 'hash igual');
  const pj1 = JSON.parse(await proj());
  const onlyPhase = JSON.stringify({ ...pj1, compositions: [{ ...pj1.compositions[0], layers: pj1.compositions[0].layers.map((L, i) => i === 1 ? { ...L, p: { ...L.p, phase: 0.25 } } : L) }] }) === JSON.stringify(pj0);
  check(onlyPhase, 'só L1.p.phase mudou: o resto do projeto está igual byte a byte', 'diferença fora do campo');
  check((await E(`document.querySelector('${lane(1)}').getAttribute('aria-valuenow')`)) === '21' && /21/.test(await E(`document.querySelector('${lane(1)}').getAttribute('aria-valuetext')`)), 'a barra é um slider acessível com valor atual e texto', await E(`document.querySelector('${lane(1)}').getAttribute('aria-valuetext')`));
  await E(`AIVJ.undo()`); await sleep(200);
  check((await phaseOf(1)) === 0.25 && (await E(`AIVJ.hist`)) === h0 && (await hash()) === r0, 'um Ctrl+Z desfaz o arrasto inteiro (p.phase 0.25 e o mesmo render)', `phase ${await phaseOf(1)}, hist ${await E(`AIVJ.hist`)}`);
  check((await wait(`document.querySelector('${lane(1)}').dataset.steps === '16'`, 3000)), 'a timeline relê o projeto depois do desfazer (16 semicolcheias)', String(await steps(1)));

  /* limites */
  await dragBy(lane(1), -20 * sp);
  check((await steps(1)) === 0 && (await phaseOf(1)) === undefined, 'arrastar além do começo trava em 0 e apaga p.phase (sem atraso, como projeto novo)', `steps ${await steps(1)}, phase ${await phaseOf(1)}`);
  await dragBy(lane(1), 70 * sp, { fromFx: 0 });
  check((await steps(1)) === 63 && Math.abs((await phaseOf(1)) - 63 / 64) < 1e-6, 'arrastar além do fim trava em 63 (nunca 64: o loop não vira atraso de volta inteira)', `steps ${await steps(1)}`);
  await E(`AIVJ.undo(); AIVJ.undo()`); await sleep(150);

  /* camada sem p: o primeiro arrasto cria p.phase */
  await dragBy(lane(0), 3 * sp);
  check((await steps(0)) === 3 && Math.abs((await phaseOf(0)) - 3 / 64) < 1e-6, 'camada sem atraso: arrastar 3 semicolcheias cria p.phase = 3/64', `steps ${await steps(0)}`);
  await E(`AIVJ.undo()`); await sleep(150);

  /* controle negativo: clicar sem mover não grava nada */
  const hC = await E(`AIVJ.hist`), pC = await proj();
  await dragBy(lane(1), 0);
  check((await E(`AIVJ.hist`)) === hC && (await proj()) === pC, 'controle negativo: clicar na barra sem arrastar não grava histórico nem muda o projeto', `hist ${hC} → ${await E(`AIVJ.hist`)}`);
  check((await E(`AIVJ.state.sel`)) === 1, 'clicar na barra seleciona a camada', String(await E(`AIVJ.state.sel`)));

  /* Esc cancela */
  await dragBy(lane(1), 8 * sp, { hold: true });
  const mid = await steps(1);
  await key('Escape', 27);
  await page.send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: 10, y: 10, button: 'left', buttons: 0, clickCount: 1 }); await sleep(200);
  check(mid === 24 && (await steps(1)) === 16 && (await E(`AIVJ.hist`)) === hC, 'Esc no meio do arrasto devolve o valor de antes (24 → 16) sem gravar histórico', `meio ${mid}, fim ${await steps(1)}, hist ${await E(`AIVJ.hist`)}`);

  /* teclado: rajada = uma entrada */
  await E(`document.querySelector('${lane(1)}').focus()`);
  await key('ArrowRight', 39); await key('ArrowRight', 39); await key('ArrowRight', 39);
  check((await steps(1)) === 19 && (await E(`document.activeElement === document.querySelector('${lane(1)}')`)), 'três setas à direita: +3 semicolcheias e o foco continua na barra', `steps ${await steps(1)}`);
  await key('PageDown', 34); check((await steps(1)) === 23, 'PageDown anda uma batida (4 semicolcheias)', String(await steps(1)));
  await sleep(600);
  const hK = await E(`AIVJ.hist`);
  check(hK === hC + 1, 'a rajada de teclas vira uma só entrada de histórico', `${hC} → ${hK}`);
  await key('Home', 36); check((await steps(1)) === 0 && (await phaseOf(1)) === undefined, 'Home zera o atraso', String(await steps(1)));
  await key('End', 35); check((await steps(1)) === 63, 'End vai a 63', String(await steps(1)));
  await sleep(600); await E(`AIVJ.undo(); AIVJ.undo()`); await sleep(200);
  check((await phaseOf(1)) === 0.25, 'desfazer volta ao atraso original', String(await phaseOf(1)));

  /* eventos */
  const bp = await beatPx(), render0 = await hash(), hE = await E(`AIVJ.hist`);
  check(JSON.stringify(await evs()) === JSON.stringify([[0, 0, 'establish'], [3, 0.1875, 'develop'], [6, 0.375, 'transform'], [10, 0.625, 'peak'], [13, 0.8125, 'release']]), 'ponto de partida: 5 eventos em ordem, nas batidas 0, 3, 6, 10 e 13', JSON.stringify(await evs()));
  await dragBy('#tlBody .ev[data-k="1"]', 2 * bp, { fromFx: 0 });
  let e = await evs();
  check(e[1][0] === 5 && Math.abs(e[1][1] - 0.3125) < 1e-9 && e[1][2] === 'develop', 'arrastar o evento "build" 2 batidas à direita: batida 5, at = 5/16, ainda na fase develop', JSON.stringify(e[1]));
  check((await E(`AIVJ.hist`)) === hE + 1 && /Evento build/.test((await E(`AIVJ.histLabels`)).slice(-1)[0]), 'o arrasto do evento grava uma entrada de histórico com nome', `${hE} → ${await E(`AIVJ.hist`)}`);
  check((await hash()) === render0, 'controle negativo: mexer num evento NÃO muda o render (é anotação do plano)', 'hash mudou');
  check(await E(`document.querySelector('#tlBody .ev[data-k="1"]').getAttribute('aria-valuenow') === '5'`), 'o marcador é um slider com a batida atual', '');
  await dragBy('#tlBody .ev[data-k="1"]', 20 * bp, { fromFx: 0 });
  e = await evs();
  check(e[1][0] === 6, 'controle negativo: o evento não passa do vizinho (para na batida do "turn", 6)', JSON.stringify(e));
  /* "build" e "turn" agora estão na mesma batida (6): quem está por cima (o último) é o que o mouse pega, e ele não passa para trás do vizinho */
  await dragBy('#tlBody .ev[data-k="2"]', -8 * bp, { fromFx: 0 });
  e = await evs();
  check(e[2][0] === 6 && e[1][0] === 6, 'à esquerda o evento também não passa do vizinho anterior ("turn" fica na batida 6, junto de "build")', JSON.stringify(e));
  await E(`document.querySelector('#tlBody .ev[data-k="1"]').focus()`); await key('Home', 36);
  e = await evs();
  check(e[1][0] === 0 && e[1][2] === 'establish' && e[2][0] === 6, 'Home no evento "build" leva à batida 0 e a fase acompanha (establish), sem mexer nos outros', JSON.stringify(e));
  const okOrder = e.every((x, k) => Number.isInteger(x[0]) && x[0] >= 0 && x[0] < 16 && (k === 0 || x[0] >= e[k - 1][0]));
  check(okOrder, 'todas as batidas continuam inteiras, dentro do loop e em ordem (o que o validador exige)', JSON.stringify(e));
  await sleep(600); await E(`AIVJ.undo(); AIVJ.undo(); AIVJ.undo()`); await sleep(200);
  check(JSON.stringify(await evs()) === JSON.stringify([[0, 0, 'establish'], [3, 0.1875, 'develop'], [6, 0.375, 'transform'], [10, 0.625, 'peak'], [13, 0.8125, 'release']]) && (await E(`AIVJ.hist`)) === hE, 'três Ctrl+Z devolvem os 5 eventos ao estado de partida', JSON.stringify(await evs()));
  /* teclado no evento */
  await E(`document.querySelector('#tlBody .ev[data-k="3"]').focus()`);
  await key('ArrowLeft', 37); await key('ArrowLeft', 37);
  e = await evs();
  check(e[3][0] === 8 && e[3][2] === 'transform' && (await E(`document.activeElement.dataset.k`)) === '3', 'setas no evento "focal": 10 → 8 (cruzou para a fase transform) e o foco fica nele', JSON.stringify(e[3]));
  await key('Home', 36); e = await evs();
  check(e[3][0] === 6, 'Home no evento para no vizinho anterior (6), não passa dele', JSON.stringify(e[3]));
  await sleep(600); await E(`AIVJ.undo()`); await sleep(150);

  /* o painel de parâmetros acompanha o atraso editado na timeline */
  await dragBy(lane(1), 2 * sp);
  const panel = await E(`(() => { const r = document.querySelector('#params [data-k="phase"] [data-num], #params input[data-num][data-k="phase"]'); return r ? +r.value : null; })()`);
  check(panel === null || Math.abs(panel - 18 / 64) < 1e-3, 'o campo de atraso do painel Parâmetros mostra o valor editado na timeline (ou não existe nesse tipo)', String(panel));
  await E(`AIVJ.undo()`);
} catch (er) { bad('exceção: ' + (er.message || er)); }
await page.close();

/* sem IR: o atraso edita, mas não há eventos para arrastar */
try {
  page = await open(0);
  await page.evaluate(`AIVJ.state.paused = true; AIVJ.timeline.setOpen(true)`);
  const t0 = Date.now(); while (Date.now() - t0 < 4000 && !(await page.evaluate(`!!document.querySelector('#tlBody .tlrow[data-i]')`))) await sleep(60);
  const sp = (await rect(lane(1))).w / 64;
  await dragBy(lane(1), 4 * sp);
  const n = JSON.parse(await E(`JSON.stringify({ steps: +document.querySelector('${lane(1)}').dataset.steps, ev: document.querySelectorAll('#tlBody .ev').length, ir: !!AIVJ.project.meta.animationIR })`));
  check(n.steps === 20 && n.ev === 0 && !n.ir, 'sem Animation IR: o atraso edita (16 → 20), nenhum evento é inventado e nenhum IR é criado', JSON.stringify(n));
} catch (er) { bad('exceção (sem IR): ' + (er.message || er)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ntimeline editável ok.');
process.exit(fail ? 1 : 0);
