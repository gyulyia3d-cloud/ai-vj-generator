#!/usr/bin/env node
// Teste dos elementos de interface animados: ícone, régua, contador, medidor, coordenadas, progresso, gráfico, rede, datacenter (Dados), letreiro (Texto), geometria sagrada (Formas).
// Cada tipo está na categoria certa; cada forma desenha, difere das outras e sai igual duas vezes; o loop fecha (critério do loop_check: emenda último→primeiro quadro
// dentro do passo normal ou do passo nos inícios de beat); o que tem ciclos anda; controle negativo: ciclos 0 dão imagem parada; o código não usa relógio nem acaso.
//   node elements_ui_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-eui-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.GEN && window.AIVJ.GEN.sacred)' });
const E = s => page.evaluate(s);
await E(`(() => { window.TU = (() => { const A = AIVJ, W = 384, H = 216;
  const bg = { type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: { grain: 0 } };
  const proj = layers => ({ schema: 'ai-vj-generator/2', id: 't', seed: 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#808080', accent: '#FF8800' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [bg].concat(layers) }] });
  const L = (type, p) => ({ type, name: 'X', on: true, opacity: 1, blend: 'normal', temporal: { behavior: 'still', listens: [], reason: 'teste: só os ciclos declarados movem' }, p: Object.assign({}, p) });
  const load = P => A.importJson(JSON.stringify(P));
  const frame = n => A.renderFrame(0, n, 1, false);
  const sum = im => { const d = im.data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
  const hash = im => { const d = im.data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000003; return h; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); return s / (a.data.length / 4) / 3; };
  return { A, L, load, frame, sum, hash, diff, proj }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, L, load, frame, sum, hash, diff, proj } = TU; ${s} })()`));
const CAT = { Dados: ['icon', 'ruler', 'counter', 'gauge', 'coords', 'progress', 'chart', 'network', 'rack'], Texto: ['ticker'], Formas: ['sacred'] };
try {
  /* 1) cada tipo novo está na categoria certa */
  const fam = await J(`return JSON.stringify(Object.fromEntries(A.FAMILIES.map(f => [f[0], f[1].map(x => x[0])])));`);
  const miss = Object.entries(CAT).flatMap(([c, ts]) => ts.filter(t => !(fam[c] || []).includes(t)).map(t => c + ':' + t));
  check(!miss.length, 'ícone, régua, contador, medidor, coordenadas, progresso, gráfico, rede e datacenter em Dados; letreiro em Texto; geometria sagrada em Formas', miss.join(','));

  /* 2) desenham, diferem, determinísticos (cada valor de tipo/forma vira um caso) */
  const CASES = await J(`const sel = { icon: 'icon', gauge: 'kind', coords: 'mode', chart: 'kind', sacred: 'kind' }, out = [];
    ${JSON.stringify(Object.values(CAT).flat())}.forEach(t => { const k = sel[t]; if (k) A.GEN[t].params.find(d => d.k === k).opts.forEach(v => out.push([t, k, v])); else out.push([t, null, null]); }); return JSON.stringify(out);`);
  const P0 = ([t, k, v], extra) => JSON.stringify(Object.assign(k ? { [k]: v } : {}, extra || {}));
  const names = CASES.map(([t, , v]) => t + (v ? ':' + v : ''));
  const draws = await J(`const out = {}; for (const cs of ${JSON.stringify(CASES)}) { const [t, k, v] = cs; load(proj([L(t, k ? { [k]: v } : {})])); const a = frame(9), b = frame(9); out[t + (v ? ':' + v : '')] = { s: sum(a), h: hash(a), same: diff(a, b), errs: A.layerErrors() }; } load(proj([])); out.bg = { s: sum(frame(9)) }; return JSON.stringify(out);`);
  const hs = names.map(n => draws[n].h);
  check(names.every(n => draws[n].s > draws.bg.s + 3000 && !draws[n].errs.length), `os ${names.length} casos desenham sem erro`, names.filter(n => draws[n].s <= draws.bg.s + 3000 || draws[n].errs.length).map(n => n + ' ' + draws[n].s + ' ' + JSON.stringify(draws[n].errs)).join(' | '));
  check(new Set(hs).size === names.length, `os ${names.length} casos dão imagens diferentes`, 'repetidas: ' + names.filter((n, i) => hs.indexOf(hs[i]) !== i).join(','));
  check(names.every(n => draws[n].same === 0), 'o mesmo quadro sai idêntico duas vezes (determinístico)', names.filter(n => draws[n].same).join(','));

  /* 3) o loop fecha (critério do loop_check) e o que tem ciclos anda */
  const loop = await J(`const LF = A.loopFrames(), out = {}; for (const [t, k, v] of ${JSON.stringify(CASES)}) { load(proj([L(t, Object.assign(k ? { [k]: v } : {}, t === 'progress' ? { motion: 'vai-e-volta' } : {}, t === 'icon' ? { size: 900 } : {}))]));   /* ícone grande: no quadro de teste de 384 px o padrão vira 24 px */
      let step = 0; for (let q = 0; q < 8; q++) { const f = Math.round((q + 0.5) * LF / 8); step += diff(frame(f), frame(f + 1)) / 8; }
      let bar = 0; for (let q = 1; q < 4; q++) { const f = Math.round(q * LF / 4); bar += diff(frame(f - 1), frame(f)) / 3; }
      out[t + (v ? ':' + v : '')] = { seam: diff(frame(LF - 1), frame(LF)), lim: Math.max(2 * bar, 2.5 * step, 0.004), move: diff(frame(0), frame(Math.round(LF * 0.4))) }; } return JSON.stringify(out);`);
  const open = names.filter(n => loop[n].seam > loop[n].lim), frozen = names.filter(n => loop[n].move < 0.05);
  check(!open.length, `o loop fecha nos ${names.length} casos (emenda dentro do passo normal)`, open.map(n => n + ' emenda ' + loop[n].seam.toFixed(3) + ' > ' + loop[n].lim.toFixed(3)).join(' '));
  check(!frozen.length, 'todos andam ao longo do loop', frozen.map(n => n + ' ' + loop[n].move.toFixed(3)).join(' '));

  /* 4) controle negativo: ciclos 0 dão imagem parada (nenhum relógio escondido) */
  const still = await J(`const LF = A.loopFrames(), out = {}; for (const [t, p] of [['icon', { icon: 'cube', cycles: 0 }], ['ruler', { cycles: 0 }], ['coords', { cycles: 0 }], ['ticker', { cycles: 0 }], ['sacred', { kind: 'polar', cycles: 0 }], ['gauge', { cycles: 0 }], ['chart', { cycles: 0, label: '' }]]) { load(proj([L(t, p)])); out[t] = diff(frame(3), frame(Math.round(LF * 0.6))); } return JSON.stringify(out);`);
  check(Object.values(still).every(d => d === 0), 'controle negativo: com ciclos 0 ícone, régua, coordenadas, letreiro, grade polar, medidor e gráfico ficam parados', JSON.stringify(still));

  /* 5) o código não usa relógio nem acaso */
  const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'elements-ui.js'), 'utf8');
  check(!/Math\.random|Date\.now|performance\.now|new Date/.test(src), 'app/elements-ui.js não usa Math.random, Date nem performance.now', '');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nelementos de interface ok.');
process.exit(fail ? 1 : 0);
