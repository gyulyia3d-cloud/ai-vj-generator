#!/usr/bin/env node
// Paridade de render entre dois motores (fase 2: mesmo comportamento, novo backend).
//   node scripts/gl_parity.mjs --save base.json      renderiza os casos com o motor atual e grava os pixels
//   node scripts/gl_parity.mjs --compare base.json   renderiza de novo e compara com a base (sai com 1 se passar da tolerância)
// Casos: as composições da galeria (quadros 0, meio e último, em escala reduzida) e uma camada de cada shader, filtro fx, cadeia synth e ISF original.
// Tolerância: diferença média <= 1.5 de 255 e no máximo 2% dos pixels com diferença > 24 (GPUs e compiladores diferem em ruído e ponto flutuante).
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { deflateSync, inflateSync } from 'node:zlib';
import { openPage } from '../skill/ai-vj-generator/scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), a = process.argv.slice(2);
const mode = a.includes('--save') ? 'save' : a.includes('--compare') ? 'compare' : null, file = a[a.indexOf(mode === 'save' ? '--save' : '--compare') + 1];
if (!mode || !file) { console.error('uso: node scripts/gl_parity.mjs --save|--compare arquivo.json'); process.exit(2); }

const open = () => openPage(join(ROOT, 'app', 'index.html'), { waitFor: '!!(window.AIVJ && window.AIVJ.renderFrame && window.AIVJ.isf)', width: 900, height: 600 });
let page = await open();
const E = x => page.evaluate(x);
const cases = [];   // { name, project, ci, frames, scale }
const gdir = join(ROOT, 'examples', 'gallery');
for (const f of readdirSync(gdir).filter(f => f.endsWith('.aivj.json'))) { const pr = JSON.parse(readFileSync(join(gdir, f), 'utf8')); pr.compositions.forEach(c => { c.layers = c.layers.filter(l => l.type !== 'sim'); }); cases.push({ name: 'galeria/' + f.replace('.aivj.json', ''), project: pr, all: true, scale: 0 }); }   // sim assa o loop em canvas 2D (lento no render por software e fora do escopo do WebGL)
const fix = JSON.parse(await E(`(() => { const A = AIVJ, base = { schema: 'ai-vj-generator/2', id: 'par', seed: 11, meta: { name: 'PARIDADE', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 2 }, palette: { bg: '#05060A', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' } };
  const out = [], mk = (name, layer) => out.push({ name, project: Object.assign({}, base, { compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, layer] }] }), all: false, scale: 0 });
  Object.keys(A.GEN.shader.params[0].opts).length; A.GEN.shader.params[0].opts.forEach(o => mk('shader/' + o, { type: 'shader', name: 'S', p: { preset: o } }));
  A.GEN.fx.params[0].opts.forEach(o => mk('fx/' + o, { type: 'fx', name: 'X', p: { preset: o } }));
  A.GEN.synth.params[0].opts.forEach(o => mk('synth/' + o, { type: 'synth', name: 'Y', p: { preset: o } }));
  A.isf.LIB.filter(x => x.origin === 'original').forEach(x => mk('isf/' + x.id, { type: 'isf', name: 'I', p: { lib: x.id } }));
  return JSON.stringify(out); })()`));
for (const c of fix) cases.push(c);

const frames = [];   // { key, w, h, data }
if (process.env.GLP_ONLY) for (let i = cases.length - 1; i >= 0; i--) if (!cases[i].name.includes(process.env.GLP_ONLY)) cases.splice(i, 1);
let first = true;
for (const c of cases) { if (process.env.GLP_LOG) console.log(c.name, Date.now() % 100000);
  if (c.all && !first) { await page.close(); page = await open(); }   /* uma página nova por projeto da galeria: importar vários na mesma página trava o render por software */
  first = false;
  const r = JSON.parse(await E(`(async () => { const A = AIVJ; A.importJson(${JSON.stringify(JSON.stringify(c.project))}); const P = A.project, lf = A.loopFrames(), cis = ${c.all ? 'P.compositions.map((_, i) => i)' : '[0]'}, fr = ${c.all ? '[0, Math.floor(lf / 2), lf - 1]' : '[Math.floor(A.loopFrames() * 0.3)]'}, out = [];
    const u8 = d => { let s = ''; for (let i = 0; i < d.length; i += 0x8000) s += String.fromCharCode.apply(null, d.subarray(i, i + 0x8000)); return btoa(s); };
    for (const ci of cis) for (const f of fr) { const im = A.renderFrame(ci, f, Math.min(1, Math.sqrt(16000 / (P.canvas.w * P.canvas.h))), true); out.push({ key: ci + '@' + f, w: im.width, h: im.height, b64: u8(im.data) }); }
    return JSON.stringify(out); })()`));
  if (process.env.GLP_LOG) console.log(' ->', r.length);
  for (const x of r) frames.push({ key: c.name + '#' + x.key, w: x.w, h: x.h, data: Buffer.from(x.b64, 'base64') });
}
await page.close();

if (mode === 'save') {
  writeFileSync(file, JSON.stringify(frames.map(f => ({ key: f.key, w: f.w, h: f.h, z: deflateSync(f.data).toString('base64') }))));
  console.log(`base gravada: ${frames.length} quadros de ${cases.length} casos em ${file}`); process.exit(0);
}
const base = new Map(JSON.parse(readFileSync(file, 'utf8')).map(f => [f.key, { w: f.w, h: f.h, data: inflateSync(Buffer.from(f.z, 'base64')) }]));
let worst = 0, bad = 0; const rows = [];
for (const f of frames) {
  const b = base.get(f.key); if (!b || b.w !== f.w || b.h !== f.h) { bad++; rows.push(`ERRO ${f.key}: tamanho ou caso ausente na base`); continue; }
  let sum = 0, big = 0, n = f.data.length / 4;
  for (let i = 0; i < f.data.length; i += 4) { let d = 0; for (let k = 0; k < 4; k++) d += Math.abs(f.data[i + k] - b.data[i + k]); d /= 4; sum += d; if (d > 24) big++; }
  const mean = sum / n, pct = big / n * 100; worst = Math.max(worst, mean);
  if (mean > 1.5 || pct > 2) { bad++; rows.push(`ERRO ${f.key}: diferença média ${mean.toFixed(2)}, ${pct.toFixed(1)}% dos pixels > 24`); }
}
console.log(rows.join('\n'));
console.log(bad ? `\n${bad} de ${frames.length} quadros fora da tolerância.` : `\nparidade ok: ${frames.length} quadros, pior diferença média ${worst.toFixed(3)} de 255.`);
process.exit(bad ? 1 : 0);
