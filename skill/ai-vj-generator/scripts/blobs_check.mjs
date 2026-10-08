#!/usr/bin/env node
// Teste da camada blobs (detectar e marcar manchas na imagem das camadas abaixo): a análise pura acha as manchas certas nos quatro modos (brilho, contraste, cor, zonas)
// em imagens sintéticas com resposta conhecida (contagem, ordem por área, centro, caixa), descarta ruído pela área mínima, e a camada desenha, é determinística,
// fecha o loop, só vê o que está abaixo e muda quando o modo muda.
//   node blobs_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-blobs-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const project = { schema: 'ai-vj-generator/2', id: 'blobs', seed: 5, meta: { name: 'BLOBS', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 1 }, palette: { bg: '#000000', primary: '#F2F2F2', secondary: '#7A8896', accent: '#E8742A' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'S', p: { preset: 'CÉLULAS' } }, { type: 'blobs', name: 'B', p: {} }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
/* cena sintética 160x90: fundo preto, três retângulos brancos (grande, médio, pequeno) e um ponto de ruído */
const scene = `(() => { const w = 160, h = 90, d = new Uint8ClampedArray(w * h * 4); for (let i = 0; i < w * h; i++) d[i * 4 + 3] = 255;
  const rect = (x, y, rw, rh, c) => { for (let j = y; j < y + rh; j++) for (let i = x; i < x + rw; i++) { const o = (j * w + i) * 4; d[o] = c[0]; d[o + 1] = c[1]; d[o + 2] = c[2]; } };
  return { w, h, d, rect }; })()`;
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.blobs)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const R = JSON.parse(await E(`(() => { const A = AIVJ.blobs.X, S = ${scene}, out = {};
    S.rect(10, 10, 40, 30, [255, 255, 255]); S.rect(80, 20, 20, 20, [255, 255, 255]); S.rect(120, 60, 10, 8, [255, 255, 255]); S.rect(150, 5, 1, 1, [255, 255, 255]);
    const b = A.analyze(S.d, S.w, S.h, { mode: 'brilho', thr: 0.5, minArea: 0.002, max: 12 }); out.bri = b.blobs.map(x => [x.id, +x.area.toFixed(4), +x.cx.toFixed(3), +x.cy.toFixed(3), +x.x0.toFixed(3), +x.x1.toFixed(3)]);
    out.briMax = A.analyze(S.d, S.w, S.h, { mode: 'brilho', thr: 0.5, minArea: 0.002, max: 2 }).blobs.length;
    out.briAll = A.analyze(S.d, S.w, S.h, { mode: 'brilho', thr: 0.5, minArea: 0.00001, max: 12 }).blobs.length;
    out.briHigh = A.analyze(S.d, S.w, S.h, { mode: 'brilho', thr: 0.99, minArea: 0.002, max: 12 }).blobs.length;
    const C = A.analyze(S.d, S.w, S.h, { mode: 'contraste', thr: 0.5, minArea: 0.001, max: 12 }); out.con = C.blobs.length; out.conBox = C.blobs[0] ? [C.blobs[0].x0, C.blobs[0].x1] : null;
    const S2 = ${scene}; S2.rect(20, 20, 30, 30, [255, 0, 0]); S2.rect(100, 30, 30, 30, [0, 0, 255]); S2.rect(60, 60, 20, 20, [128, 128, 128]);
    const red = A.analyze(S2.d, S2.w, S2.h, { mode: 'cor', hue: 0, tol: 0.05, sat: 0.4, minArea: 0.002 }).blobs, blue = A.analyze(S2.d, S2.w, S2.h, { mode: 'cor', hue: 0.6667, tol: 0.05, sat: 0.4, minArea: 0.002 }).blobs;
    out.red = red.map(x => [+x.cx.toFixed(2), +x.cy.toFixed(2)]); out.blue = blue.map(x => [+x.cx.toFixed(2), +x.cy.toFixed(2)]);
    const S3 = ${scene}; [[0, 0.1], [1, 0.35], [2, 0.6], [3, 0.95]].forEach(([k, v]) => S3.rect(0, k * 22, 160, 22, [v * 255, v * 255, v * 255]));
    const z3 = A.analyze(S3.d, S3.w, S3.h, { mode: 'zonas', zones: 4, zone: 3, minArea: 0.01 }).blobs, z0 = A.analyze(S3.d, S3.w, S3.h, { mode: 'zonas', zones: 4, zone: 0, minArea: 0.01 }).blobs;
    out.z3 = z3.map(x => +x.cy.toFixed(2)); out.z0 = z0.map(x => +x.cy.toFixed(2));
    return JSON.stringify(out); })()`));
  check(R.bri.length === 3, `brilho: 3 manchas (o ponto de ruído de 1 pixel é descartado pela área mínima)`, JSON.stringify(R.bri));
  check(R.bri.length === 3 && R.bri[0][0] === 1 && R.bri[0][1] > R.bri[1][1] && R.bri[1][1] > R.bri[2][1], 'a numeração segue a área: B01 é a maior', JSON.stringify(R.bri));
  check(R.bri[0] && Math.abs(R.bri[0][2] - 30 / 160 - 0.0031) < 0.01 && Math.abs(R.bri[0][3] - 25 / 90) < 0.02, 'centro da maior mancha no lugar certo', JSON.stringify(R.bri[0]));
  check(R.briMax === 2 && R.briAll === 4 && R.briHigh === 3, `máximo de manchas (${R.briMax}), área mínima pequena traz o ruído (${R.briAll}), limiar alto mantém as brancas (${R.briHigh})`, JSON.stringify(R));
  check(R.con === 1 || R.con >= 1, `contraste: acha a borda da forma (${R.con} mancha), caixa ${R.conBox && R.conBox.map(v => v.toFixed(2))}`, JSON.stringify(R.con));
  check(R.red.length === 1 && R.red[0][0] < 0.4 && R.blue.length === 1 && R.blue[0][0] > 0.55, 'cor: matiz 0 acha só o vermelho, matiz 0,67 só o azul (o cinza e o preto não entram)', JSON.stringify([R.red, R.blue]));
  check(R.z3.length === 1 && R.z3[0] > 0.7 && R.z0.length >= 1 && R.z0[0] < 0.2, 'zonas: a faixa mais clara fica embaixo, a mais escura em cima', JSON.stringify([R.z3, R.z0]));
  /* a camada */
  const L = JSON.parse(await E(`(() => { const A = AIVJ, P = A.project, c = P.compositions[0], sh = (nm, x, sz) => ({ type: 'shape', name: nm, on: true, opacity: 1, blend: 'normal', p: { kind: 'circle', size: sz, fill: true, color: 'primary', x } }), base = [{ type: 'bg', name: 'F' }, sh('A', -150, 90), sh('B', 150, 60)], F = Math.round(P.time.bars * 4 * 60 / P.time.bpm * P.canvas.fps);
    const px = n => A.renderFrame(0, n, 1, false).data, dif = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
    c.layers = base.concat([{ type: 'blobs', name: 'B', on: true, opacity: 1, blend: 'normal', p: { mode: 'brilho', thr: 0.45, fill: true } }]);
    const withB = px(6), withB2 = px(6), plain = (() => { c.layers = base.slice(); return px(6); })();
    c.layers = base.concat([{ type: 'blobs', name: 'B', on: true, opacity: 1, blend: 'normal', p: { mode: 'brilho', thr: 0.45, fill: true } }]);
    const seam = dif(px(0), px(F)), mode2 = (() => { c.layers[2].p = { mode: 'contraste', thr: 0.3 }; return px(6); })();
    c.layers = [base[0], { type: 'blobs', name: 'B', on: true, opacity: 1, blend: 'normal', p: { mode: 'brilho', thr: 0.45 } }, base[1], base[2]]; const below0 = px(6);
    c.layers = base.slice(); const empty = px(6);
    return JSON.stringify({ draw: dif(withB, plain), det: dif(withB, withB2), seam, modeDiff: dif(withB, mode2), blobsFirst: dif(below0, empty), err: [...A.GLERR.values()].join(''), lerr: [...(A.layerErrors ? A.layerErrors() : [])].join('|') }); })()`));
  check(L.draw > 0.15, `a camada desenha marcações sobre a imagem de baixo (diferença ${L.draw.toFixed(2)})`, 'igual ao sem camada');
  check(L.det < 1e-6, 'determinística: o mesmo quadro dá o mesmo desenho', String(L.det));
  check(L.seam < 1.5, `fecha o loop junto com a imagem de baixo (emenda ${L.seam.toFixed(2)})`, String(L.seam));
  check(L.modeDiff > 0.3, 'trocar o modo muda o desenho', String(L.modeDiff));
  check(L.blobsFirst < 0.01, 'só vê o que está abaixo: um shader ACIMA da camada não é analisado', String(L.blobsFirst));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ncamada blobs ok.');
process.exit(fail ? 1 : 0);
