#!/usr/bin/env node
// Mede o custo de render por tipo de camada e por composição (ms por quadro), no tamanho real do projeto.
// Uso: AIVJ_GPU=1 node scripts/bench.mjs <projeto.aivj.json> [--scale 1] [--frames 12]
// Sem AIVJ_GPU=1 o Chrome roda sem GPU (como nos testes); com ele usa a placa de vídeo (o que importa para decidir WebGL2).
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from '../skill/ai-vj-generator/scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SK = join(ROOT, 'skill', 'ai-vj-generator');
const a = process.argv.slice(2), proj = a.find(x => !x.startsWith('--'));
const opt = (k, d) => a.includes(k) ? Number(a[a.indexOf(k) + 1]) : d;
if (!proj) { console.error('uso: node scripts/bench.mjs <projeto.aivj.json> [--scale 1] [--frames 12]'); process.exit(2); }
const scale = opt('--scale', 1), frames = opt('--frames', 12);
const tmp = mkdtempSync(join(tmpdir(), 'aivj-bench-'));
execFileSync(process.execPath, [join(SK, 'scripts', 'make-artifact.mjs'), proj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { width: 1400, height: 900 });
try {
  for (let i = 0; i < 80; i++) { if (await page.evaluate('!!(window.AIVJ && window.AIVJ.renderFrame)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const r = JSON.parse(await page.evaluate(`(() => {
    const A = AIVJ, P = A.project, out = { gpu: (() => { const g = document.createElement('canvas').getContext('webgl2') || document.createElement('canvas').getContext('webgl'); if (!g) return 'sem WebGL'; const e = g.getExtension('WEBGL_debug_renderer_info'); return (g instanceof WebGL2RenderingContext ? 'webgl2 · ' : 'webgl1 · ') + (e ? g.getParameter(e.UNMASKED_RENDERER_WEBGL) : '?'); })(), canvas: P.canvas, comps: [] };
    const time = (ci, mask) => { const c = P.compositions[ci], on = c.layers.map(l => l.on); c.layers.forEach((l, i) => l.on = mask(l, i) && on[i]);
      A.renderFrame(ci, 0, ${scale}, true); const t0 = performance.now(); for (let n = 1; n <= ${frames}; n++) A.renderFrame(ci, n * 3, ${scale}, true); const ms = (performance.now() - t0) / ${frames};
      c.layers.forEach((l, i) => l.on = on[i]); return ms; };
    P.compositions.forEach((c, ci) => { const byType = {}; for (const t of [...new Set(c.layers.map(l => l.type))]) byType[t] = +time(ci, l => l.type === t).toFixed(1);
      out.comps.push({ name: c.name, total: +time(ci, () => true).toFixed(1), byType }); });
    return JSON.stringify(out); })()`));
  console.log(r.gpu, '· canvas', r.canvas.w + 'x' + r.canvas.h, '· escala', scale);
  for (const c of r.comps) console.log(`${c.name}: ${c.total} ms/quadro (${(1000 / c.total).toFixed(1)} fps) · ` + Object.entries(c.byType).sort((x, y) => y[1] - x[1]).map(([t, v]) => `${t} ${v}`).join(' · '));
} finally { await page.close(); }
