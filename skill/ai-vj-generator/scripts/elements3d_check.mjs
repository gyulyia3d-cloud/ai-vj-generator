#!/usr/bin/env node
// Teste dos Elementos 3D: a categoria nova (organismo + botânica, molecular, símbolos 3D, terreno, monumento), render em pontos, linhas ou plexus, e glow.
// Cada forma desenha, é diferente das outras e sai igual duas vezes; o loop fecha (emenda do último para o primeiro quadro dentro do passo normal) e a forma anda;
// os três renders dão imagens diferentes; glow acende pixels a mais e glow 0 é idêntico a não declarar glow (o organismo antigo não muda);
// controles negativos: giro 0 e ciclos 0 dão imagem parada; o código não usa relógio nem acaso.
//   node elements3d_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-e3-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.GEN && window.AIVJ.GEN.monument)' });
const E = s => page.evaluate(s);
await E(`(() => { window.T3 = (() => { const A = AIVJ, W = 192, H = 108;
  const bg = { type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: { grain: 0 } };
  const proj = layers => ({ schema: 'ai-vj-generator/2', id: 't', seed: 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#808080', accent: '#FF8800' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [bg].concat(layers) }] });
  const L = (type, p) => ({ type, name: 'X', on: true, opacity: 1, blend: 'normal', temporal: { behavior: 'still', listens: [], reason: 'teste: só o giro e os ciclos declarados movem' }, p: Object.assign({}, p) });
  const load = P => A.importJson(JSON.stringify(P));
  const frame = n => A.renderFrame(0, n, 1, false);
  const sum = im => { const d = im.data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
  const hash = im => { const d = im.data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000003; return h; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); return s / (a.data.length / 4) / 3; };
  return { A, L, load, frame, sum, hash, diff, proj }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, L, load, frame, sum, hash, diff, proj } = T3; ${s} })()`));
try {
  /* 1) a categoria existe, com o organismo; Formas não tem mais o organismo */
  const fam = await J(`const f = A.FAMILIES.find(x => x[0] === 'Elementos 3D'), fo = A.FAMILIES.find(x => x[0] === 'Formas'); return JSON.stringify({ types: f ? f[1].map(x => x[0]) : null, formas: fo[1].map(x => x[0]) });`);
  check(fam.types && fam.types.join() === 'organism,botanic,molecule,sigil,terrain,monument' && !fam.formas.includes('organism'), 'a categoria Elementos 3D tem organismo, botânica, molecular, símbolos 3D, terreno e monumento; Formas não tem mais o organismo', JSON.stringify(fam));

  /* 2) todas as formas: desenham, diferem, determinísticas */
  const CASES = await J(`const out = []; ['botanic', 'molecule', 'sigil', 'monument'].forEach(t => A.GEN[t].params.find(d => d.k === 'kind').opts.forEach(k => out.push([t, k]))); out.push(['terrain', null], ['organism', null]); return JSON.stringify(out);`);
  const draws = await J(`const out = {}; for (const [t, k] of ${JSON.stringify(CASES)}) { load(proj([L(t, k ? { kind: k } : {})])); const a = frame(9), b = frame(9); out[t + ':' + k] = { s: sum(a), h: hash(a), same: diff(a, b), errs: A.layerErrors() }; } load(proj([])); out.bg = { s: sum(frame(9)) }; return JSON.stringify(out);`);
  const names = CASES.map(([t, k]) => t + ':' + k), hs = names.map(n => draws[n].h), base = draws.bg.s;
  check(names.every(n => draws[n].s > base + 4000 && !draws[n].errs.length), `as ${names.length} formas desenham sem erro (fundo sozinho soma ${base})`, names.filter(n => draws[n].s <= base + 4000 || draws[n].errs.length).map(n => n + ' ' + draws[n].s + ' ' + JSON.stringify(draws[n].errs)).join(' | '));
  check(new Set(hs).size === names.length, `as ${names.length} formas dão imagens diferentes`, 'repetidas: ' + names.filter((n, i) => hs.indexOf(hs[i]) !== i).join(','));
  check(names.every(n => draws[n].same === 0), 'o mesmo quadro sai idêntico duas vezes (determinístico)', names.filter(n => draws[n].same).join(','));

  /* 3) o loop fecha e a forma anda; controle negativo: giro 0 e ciclos 0 dão imagem parada */
  const loop = await J(`const LF = A.loopFrames(), out = {}; for (const [t, k] of ${JSON.stringify(CASES)}) { load(proj([L(t, Object.assign(k ? { kind: k } : {}, { spin: 1 }))])); const move = diff(frame(0), frame(Math.round(LF * 0.4)));
      load(proj([L(t, Object.assign(k ? { kind: k } : {}, { spin: 0 }))]));   /* emenda com giro 0: a câmera gira em voltas inteiras de qualquer jeito; aqui se mede a animação da própria forma */
      let step = 0; for (let q = 0; q < 8; q++) { const f = Math.round((q + 0.5) * LF / 8); step += diff(frame(f), frame(f + 1)) / 8; }
      let bar = 0; for (let q = 1; q < 4; q++) { const f = Math.round(q * LF / 4); bar += diff(frame(f - 1), frame(f)) / 3; }
      const seam = diff(frame(LF - 1), frame(LF)); out[t + ':' + k] = { seam, lim: Math.max(2 * bar, 2.5 * step, 0.004), move }; }
    load(proj([L('molecule', { kind: 'dna', spin: 0, cycles: 0 })])); const s0 = frame(0), s1 = frame(Math.round(LF * 0.4)); load(proj([L('terrain', { spin: 0, cycles: 0 })])); const t0 = frame(0), t1 = frame(Math.round(LF * 0.4));
    return JSON.stringify({ LF, out, still: diff(s0, s1), stillT: diff(t0, t1) });`);
  const open = names.filter(n => loop.out[n].seam > loop.out[n].lim), frozen = names.filter(n => loop.out[n].move < 0.3);
  check(!open.length, `o loop fecha nas ${names.length} formas (a emenda último→primeiro quadro não passa do passo normal, critério do loop_check)`, open.map(n => n + ' emenda ' + loop.out[n].seam.toFixed(3) + ' > ' + loop.out[n].lim.toFixed(3)).join(' '));
  check(!frozen.length, 'todas andam ao longo do loop (o quadro a 40% difere do quadro 0)', frozen.map(n => n + ' ' + loop.out[n].move.toFixed(2)).join(' '));
  check(loop.still === 0 && loop.stillT === 0, 'controle negativo: giro 0 e ciclos 0 dão imagem parada (DNA e terreno; nenhum relógio escondido)', JSON.stringify([loop.still, loop.stillT]));

  /* 4) pontos, linhas e plexus dão imagens diferentes, também no organismo */
  const modes = await J(`const out = {}; for (const [t, k] of [['botanic', 'flor'], ['molecule', 'dna'], ['sigil', 'magick'], ['terrain', null], ['monument', 'globo'], ['organism', null]]) { const h = ['points', 'lines', 'plexus'].map(r => { load(proj([L(t, Object.assign(k ? { kind: k } : {}, { render: r }))])); return hash(frame(9)); }); out[t] = h; } return JSON.stringify(out);`);
  check(Object.values(modes).every(h => new Set(h).size === 3), 'pontos, linhas e plexus dão três imagens diferentes em cada tipo (organismo incluso)', JSON.stringify(modes));

  /* 5) glow acende pixels a mais; glow 0 = não declarar glow (projetos antigos do organismo não mudam) */
  const glow = await J(`const f = p => { load(proj([L('organism', p)])); return frame(9); }, g = p => { load(proj([L('sigil', p)])); return frame(9); };
    const o0 = f({}), o1 = f({ glow: 0 }), o2 = f({ glow: 0.9 }), s0 = g({ glow: 0 }), s2 = g({ glow: 0.9 }), r0 = g({ render: 'lines', glow: 0 }), r2 = g({ render: 'lines', glow: 0.9 });
    return JSON.stringify({ same: diff(o0, o1), org: [sum(o1), sum(o2)], sig: [sum(s0), sum(s2)], lin: [sum(r0), sum(r2)] });`);
  check(glow.same === 0, 'glow 0 é idêntico a não declarar glow (o organismo antigo sai igual)', 'diferença ' + glow.same);
  check(['org', 'sig', 'lin'].every(k => glow[k][1] > glow[k][0] * 1.05), 'glow 0,9 acende mais pixels que glow 0 (organismo, símbolos em pontos e em linhas)', JSON.stringify(glow));

  /* 6) o código não usa relógio nem acaso */
  const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'elements3d.js'), 'utf8');
  check(!/Math\.random|Date\.now|performance\.now|new Date/.test(src), 'app/elements3d.js não usa Math.random, Date nem performance.now', '');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nelementos 3D ok.');
process.exit(fail ? 1 : 0);
