#!/usr/bin/env node
// Teste dos perfis de movimento: a curva do Python (motion_profiles.py) e a do motor (motionCurve) dão o mesmo número,
// a curva começa e termina em 0 (o loop fecha), o pico é 1, elasticidade cria sobressalto e a continuidade zero quantiza.
// Inclui controle negativo: uma curva com parâmetro trocado tem de ser reprovada na comparação.
//   node motion_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-motion-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const py = (...a) => execFileSync('python', [join(HERE, 'motion_profiles.py'), ...a], { encoding: 'utf8' });

const N = 240;
const CASES = [
  { energy: 0.5, elasticity: 0.8, anticipation: 0.5, continuity: 1, rhythm: 0.3 },
  { energy: 0.9, elasticity: 0.2, anticipation: 0, continuity: 1, rhythm: 0.6 },
  { energy: 0.2, elasticity: 0, anticipation: 0.2, continuity: 1, rhythm: 0 },
  { energy: 0.7, elasticity: 0.5, anticipation: 0.8, continuity: 0.1, rhythm: 0.9 },
  { energy: 0.4, elasticity: 1, anticipation: 1, continuity: 0.6, rhythm: 0.5 },
];
const flags = c => ['energy', 'elasticity', 'anticipation', 'continuity', 'rhythm'].flatMap(k => ['--' + k, String(c[k])]);
const prof = CASES.map(c => JSON.parse(py('show', ...flags(c), '--json')));
const ys = CASES.map(c => JSON.parse(py('curve', ...flags(c), '--n', String(N), '--json')));

const html = join(tmp, 'p.html'), json = join(tmp, 'p.aivj.json');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'm', seed: 1, meta: { name: 'M', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30 }, time: { bpm: 120, bars: 4 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 900, height: 600 });
try {
  for (const [i, p] of prof.entries()) {
    const js = JSON.parse(await page.evaluate(`JSON.stringify(Array.from({length:${N}},(_,k)=>AIVJ.motionCurve(k/${N},${p.zeta},${p.wn},${p.ta},${p.depth},${p.steps})))`));
    const d = Math.max(...js.map((v, k) => Math.abs(v - ys[i][k])));
    check(d < 1e-9, `perfil ${i + 1}: curva do motor = curva do Python (diferença máxima ${d.toExponential(1)})`, 'diferem');
  }
  // controle negativo: troca um parâmetro só no lado do motor; a comparação tem de acusar
  const p0 = prof[0], neg = JSON.parse(await page.evaluate(`JSON.stringify(Array.from({length:${N}},(_,k)=>AIVJ.motionCurve(k/${N},${p0.zeta + 0.1},${p0.wn},${p0.ta},${p0.depth},${p0.steps})))`));
  check(Math.max(...neg.map((v, k) => Math.abs(v - ys[0][k]))) > 1e-3, 'controle negativo: zeta trocado é reprovado pela comparação', 'comparação cega');
  // a bíblia de arte aparece no resumo do projeto e o texto vem escapado
  const ui = JSON.parse(await page.evaluate(`(() => { const P = JSON.parse(JSON.stringify(AIVJ.project)); P.meta.artBible = { thesis: 'tese <img src=x id=xss onerror=alert(1)> fim', motion: 'mov', motionProfile: { energy: 0.5, elasticity: 0.2, anticipation: 0.1, continuity: 1, rhythm: 0.3 } }; AIVJ.importJson(JSON.stringify(P));
    const t = document.body.textContent; return JSON.stringify({ title: t.includes('Bíblia de arte'), profile: t.includes('elasticidade 0.2'), xss: !!document.getElementById('xss'), literal: t.includes('<img src=x') }); })()`));
  check(ui.title && ui.profile && !ui.xss && ui.literal, 'interface: bíblia de arte e perfil aparecem no resumo, com o HTML escapado', JSON.stringify(ui));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();

// propriedades da curva (Python)
CASES.forEach((c, i) => {
  const y = ys[i], p = prof[i], peak = Math.max(...y), lo = Math.min(...y);
  check(Math.abs(y[0]) < 1e-12 && (p.steps > 0 || Math.abs(y[N - 1]) < 0.05), `perfil ${i + 1}: começa em 0 e volta a ~0 antes do próximo golpe (suave; em degraus o último degrau fica onde está e o loop fecha pela fase)`, `y0=${y[0]} yN=${y[N - 1]}`);
  check(c.continuity >= 0.85 ? Math.abs(peak - 1) < 0.02 : peak > 0.5, `perfil ${i + 1}: pico ${peak.toFixed(2)}`, 'pico fora do esperado');
  const ring = Math.min(...y.slice(0, Math.floor(N * 0.9)));
  check(c.elasticity >= 0.5 ? ring < -0.05 : c.elasticity === 0 ? ring > -0.02 : true, `perfil ${i + 1}: elasticidade ${c.elasticity} ${c.elasticity >= 0.5 ? 'sobressai (lóbulo negativo)' : 'sem sobressalto'}`, `min=${ring}`);
  check(p.cycles >= 1 && Number.isInteger(p.cycles), `perfil ${i + 1}: ${p.cycles} ciclo(s) por loop, inteiro`, 'ciclos não inteiros');
  if (c.continuity < 0.5) check(new Set(y.map(v => v.toFixed(6))).size <= p.steps + 2, `perfil ${i + 1}: continuidade baixa quantiza em ${p.steps} degraus`, 'valores demais');
});
console.log(fail ? `\n${fail} falha(s).` : '\nmovimento ok.');
process.exit(fail ? 1 : 0);
