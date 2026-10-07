#!/usr/bin/env node
// Censo de seeds: renderiza cada composição com N seeds e mede (1) seeds em branco, (2) quase-duplicatas (a peça não varia com a seed),
// (3) teste A-B-A (renderizar A, B, A: os dois A têm de sair idênticos, senão há estado global vazando), (4) densidade e variedade.
//   node seed_census.mjs <projeto.aivj.json | projeto.html> [--seeds 12] [--chrome caminho] [--json]
// Sai com 1 se achar problema; 3 se não houver navegador. Complementa loop_check (emenda) e contact_sheet (olhar).
import { execFileSync } from 'node:child_process';
import { mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = k => argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined;
const file = argv.find(a => !a.startsWith('--') && a !== arg('--seeds') && a !== arg('--chrome'));
if (!file) { console.error('uso: node seed_census.mjs <projeto.aivj.json|.html> [--seeds 12]'); process.exit(2); }
const N = Math.max(3, Math.min(64, parseInt(arg('--seeds') || '12', 10)));
let html = file;
if (file.endsWith('.json')) { html = join(mkdtempSync(join(tmpdir(), 'aivj-census-')), 'p.html'); execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), file, '--out', html], { stdio: 'pipe' }); }
const page = await openPage(html, { chrome: arg('--chrome'), width: 1200, height: 800 });
const res = await page.evaluate(`(() => {
  const P = AIVJ.project, out = [], G = 8;
  const sig = (ci, n) => { const im = AIVJ.renderFrame(ci, n, 0.2, true), w = im.width, h = im.height, d = im.data, cells = new Array(G * G).fill(0), cnt = new Array(G * G).fill(0); let cov = 0;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, a = d[i + 3] / 255, l = a * (0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2]) / 255, k = Math.floor(y * G / h) * G + Math.floor(x * G / w); cells[k] += l; cnt[k]++; cov += a; }
    return { g: cells.map((v, k) => v / Math.max(1, cnt[k])), cov: cov / (w * h) }; };
  const base = P.seed, LF = AIVJ.loopFrames();
  for (let ci = 0; ci < P.compositions.length; ci++) {
    const sigs = [];
    for (let s = 0; s < ${N}; s++) { AIVJ.setSeed(base + 1000 * s + 17); const fr = [0, Math.floor(LF * 0.33), Math.floor(LF * 0.66)].map(n => sig(ci, n)); sigs.push({ seed: base + 1000 * s + 17, g: fr.flatMap(f => f.g), cov: fr.reduce((a, f) => a + f.cov, 0) / fr.length }); }
    AIVJ.setSeed(sigs[0].seed); const a1 = sig(ci, 5).g; AIVJ.setSeed(sigs[1].seed); sig(ci, 5); AIVJ.setSeed(sigs[0].seed); const a2 = sig(ci, 5).g;
    out.push({ name: P.compositions[ci].name, sigs, aba: a1.every((v, i) => Math.abs(v - a2[i]) < 1e-9) });
  }
  AIVJ.setSeed(base); return JSON.stringify(out); })()`);
await page.close();
const dist = (a, b) => a.reduce((s, v, i) => s + Math.abs(v - b[i]), 0) / a.length;
let bad = 0; const report = [];
for (const c of JSON.parse(res)) {
  const s = c.sigs, blank = s.filter(x => x.cov < 0.005).length;
  const ds = []; for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) ds.push({ i, j, d: dist(s[i].g, s[j].g) });
  const mean = ds.reduce((a, b) => a + b.d, 0) / ds.length, min = Math.min(...ds.map(x => x.d)), dup = ds.filter(x => x.d < 0.004).length;
  const covs = s.map(x => x.cov), cm = covs.reduce((a, b) => a + b, 0) / covs.length, sd = Math.sqrt(covs.reduce((a, b) => a + (b - cm) ** 2, 0) / covs.length);
  const flags = []; if (blank) flags.push(`${blank} seed(s) em branco`); if (mean < 0.004) flags.push('a seed quase não muda a peça'); if (dup > ds.length * 0.3) flags.push(`${dup} pares quase idênticos`); if (!c.aba) flags.push('A-B-A falhou: estado global vaza entre seeds');
  if (flags.length) bad++;
  report.push({ composition: c.name, seeds: s.length, blank, meanDistance: +mean.toFixed(4), minDistance: +min.toFixed(4), nearDuplicatePairs: dup, coverageMean: +cm.toFixed(3), coverageSpread: +sd.toFixed(3), aba: c.aba, flags });
}
if (argv.includes('--json')) console.log(JSON.stringify(report, null, 2));
else for (const r of report) console.log(`${r.flags.length ? 'ERRO' : 'ok  '} ${r.composition}: seeds ${r.seeds} · distância média ${r.meanDistance} (mín ${r.minDistance}) · cobertura ${r.coverageMean} ±${r.coverageSpread} · A-B-A ${r.aba ? 'ok' : 'FALHOU'}${r.flags.length ? ' · ' + r.flags.join('; ') : ''}`);
console.log(bad ? `\n${bad} composição(ões) com problema.` : '\nCenso ok.');
process.exit(bad ? 1 : 0);
