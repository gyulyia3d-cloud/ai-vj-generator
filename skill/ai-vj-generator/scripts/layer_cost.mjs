#!/usr/bin/env node
// Mede o custo de cada gerador com os parâmetros padrão: milissegundos por quadro a 1920x1080 renderizado em meia resolução
// (software, Chrome/Edge headless, sem GPU), média de 6 quadros do loop depois de um quadro de aquecimento. A simulação (sim) tem um
// custo de "bake" na primeira chamada, medido à parte. Geradores que precisam de mídia ficam de fora.
//   node layer_cost.mjs [--write] [--chrome caminho]     --write grava references/families-cost.json (usado por families.py check)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const NEEDS_MEDIA = new Set(['image', 'video', 'model', 'splat', 'parallax', 'logo', 'code']);   // code: o custo é o do seu código
const tmp = mkdtempSync(join(tmpdir(), 'aivj-cost-'));
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'cost', seed: 1, meta: { name: 'COST', brief: 'x', lang: 'pt' }, canvas: { w: 1920, h: 1080, fps: 30 }, time: { bpm: 120, bars: 4 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1200, height: 800 });
const res0 = JSON.parse(await page.evaluate(`(() => { const types = Object.keys(AIVJ.GEN).filter(t => !${JSON.stringify([...NEEDS_MEDIA])}.includes(t) && t !== 'bg'), out = {}, P = AIVJ.project, LF = AIVJ.loopFrames();
  P.compositions[0].layers = [{ type: 'bg', name: 'F', role: 'x' }]; AIVJ.renderFrame(0, 0, 0.5, true); let b = 0; for (let k = 1; k <= 6; k++) { const a = performance.now(); AIVJ.renderFrame(0, Math.floor(LF * k / 7), 0.5, true); b += performance.now() - a; } out.__baseline = { ms: +(b / 6).toFixed(2), firstMs: 0, error: false };
  for (const t of types) { P.compositions[0].layers = [{ type: 'bg', name: 'F', role: 'x' }, { type: t, name: t, role: 'x', on: true, opacity: 1, blend: 'normal', p: t === 'code' ? { src: 'K.rect(0,0,200,200)' } : {} }];
    AIVJ.LAYERERR.clear(); const t0 = performance.now(); AIVJ.renderFrame(0, 0, 0.5, true); const first = performance.now() - t0; let sum = 0; for (let k = 1; k <= 6; k++) { const a = performance.now(); AIVJ.renderFrame(0, Math.floor(LF * k / 7), 0.5, true); sum += performance.now() - a; }
    out[t] = { ms: +(sum / 6).toFixed(2), firstMs: +first.toFixed(1), error: AIVJ.LAYERERR.size > 0 }; }
  return JSON.stringify(out); })()`));
await page.close();
const base = res0.__baseline.ms; delete res0.__baseline;
const res = Object.fromEntries(Object.entries(res0).map(([t, r]) => [t, { ...r, ms: +Math.max(0, r.ms - base).toFixed(2) }]));   // custo da camada = quadro com a camada menos quadro só com o fundo (composição, leitura de pixels)
const cls = ms => ms < 8 ? 'low' : ms < 20 ? 'medium' : 'high';
const rows = Object.entries(res).sort((a, b) => b[1].ms - a[1].ms);
for (const [t, r] of rows) console.log(`${t.padEnd(12)} ${String(r.ms).padStart(7)} ms  ${cls(r.ms).padEnd(6)}${r.firstMs > 4 * Math.max(1, r.ms) ? `  (1o quadro ${r.firstMs} ms: bake/aquecimento)` : ''}${r.error ? '  ERRO' : ''}`);
if (argv.includes('--write')) {
  const out = join(HERE, '..', 'references', 'families-cost.json');
  writeFileSync(out, JSON.stringify({ note: 'ms por quadro a 1920x1080 em meia resolução, software (headless, sem GPU), média de 6 quadros, ms acima de um quadro só com o fundo (baseline ' + base + ' ms); low < 8 ms, medium < 20 ms, high >= 20 ms (toda camada custa uns 5 ms nesse tamanho só por alocar o canvas e compor). Máquina da autora: valores relativos importam, absolutos não.', canvas: [1920, 1080], scale: 0.5, ms: Object.fromEntries(rows.map(([t, r]) => [t, { ms: r.ms, firstMs: r.firstMs }])) }, null, 1) + '\n');
  console.log('gravado ' + out);
}
console.log('baseline (só o fundo): ' + base + ' ms');
process.exit(rows.some(([, r]) => r.error) ? 1 : 0);
