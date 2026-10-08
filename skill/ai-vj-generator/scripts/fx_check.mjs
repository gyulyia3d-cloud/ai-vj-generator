#!/usr/bin/env node
// Teste da camada fx (efeito que lê as camadas abaixo): cada preset compila em WebGL1, muda a imagem, fecha o loop, mistura=0 devolve a entrada,
// a orientação da textura está certa (grade neutra = identidade, nada de imagem de cabeça para baixo) e o efeito vê só o que está abaixo dele.
//   node fx_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-fx-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const project = { schema: 'ai-vj-generator/2', id: 'fx', seed: 9, meta: { name: 'FX', brief: 'x', lang: 'pt' }, canvas: { w: 480, h: 270, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 2 }, palette: { bg: '#0A0C10', primary: '#F2F2F2', secondary: '#7A8896', accent: '#E8742A' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'S', p: { preset: 'ANÉIS SDF' } }, { type: 'tunnel', name: 'T' }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.fx)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const names = JSON.parse(await E('JSON.stringify(Object.keys(AIVJ.fx.FX))'));
  check(names.length >= 16, `${names.length} efeitos no catálogo`, names.join(','));
  for (const nm of names) {
    const r = JSON.parse(await E(`(() => {
      const A = AIVJ, P = A.project, c = P.compositions[0], base = c.layers.slice(0, 3);
      const px = (n) => A.renderFrame(0, n, 1, false).data, F = Math.round(P.time.bars * 4 * 60 / P.time.bpm * P.canvas.fps);
      const dif = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
      const mean = a => { let s = 0; for (let i = 0; i < a.length; i += 4) s += a[i] + a[i + 1] + a[i + 2]; return s / (a.length / 4 * 3); };
      c.layers = base.slice(); const n0 = F * 0.3 | 0, plain = px(n0);
      c.layers = base.concat([{ type: 'fx', name: 'FX', on: true, opacity: 1, blend: 'normal', p: { preset: ${JSON.stringify(nm)} } }]);
      const fx = px(n0), fx0 = px(0), fxF = px(F);
      c.layers[3].p.mix = 0; const off = px(n0); delete c.layers[3].p.mix;
      const b = A.fx.body(A.fx.FX[${JSON.stringify(nm)}].src); const L = c.layers[3];
      return JSON.stringify({ change: dif(plain, fx), seam: dif(fx0, fxF), ident: dif(plain, off), lit: mean(fx), err: [...A.GLERR.values()].filter(Boolean).join(' | ') });
    })()`));
    check(!r.err, `compila: ${nm}`, r.err);
    check(r.change > 0.8, `muda a imagem: ${nm} (${r.change.toFixed(1)})`, 'igual à entrada');
    check(r.seam < 1.2, `fecha o loop: ${nm} (emenda ${r.seam.toFixed(2)})`, 'emenda grande');
    check(r.ident < 0.6, `mistura 0 devolve a entrada: ${nm} (${r.ident.toFixed(2)})`, 'diferente');
    check(r.lit > 3, `não sai preto: ${nm}`, String(r.lit));
  }
  /* orientação: um efeito neutro não pode virar a imagem de cabeça para baixo */
  const o = JSON.parse(await E(`(() => { const A = AIVJ, P = A.project, c = P.compositions[0]; c.layers = [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'S', p: { preset: 'FAIXAS' } }];
    const px = n => A.renderFrame(0, n, 1, false).data; const plain = px(10);
    c.layers.push({ type: 'fx', name: 'FX', on: true, opacity: 1, blend: 'normal', p: { preset: 'GRADE E VINHETA', p1: 1, p2: 1, p3: 0, p4: 0 } }); const fx = px(10);
    let d = 0, top = 0, bot = 0; const w = 480, h = 270; for (let i = 0; i < plain.length; i++) d += Math.abs(plain[i] - fx[i]); d /= plain.length;
    return JSON.stringify({ d }); })()`));
  check(o.d < 1.6, `orientação certa (efeito neutro = identidade, diferença ${o.d.toFixed(2)})`, String(o.d));
  /* o efeito só vê o que está abaixo: uma camada colocada ACIMA dele não é processada */
  const v = JSON.parse(await E(`(() => { const A = AIVJ, P = A.project, c = P.compositions[0];
    const mk = fxFirst => { c.layers = [{ type: 'bg', name: 'F' }, { type: 'shape', name: 'FORMA', on: true, p: { kind: 'circle', size: 120, fill: true, color: 'accent' } }];
      const fx = { type: 'fx', name: 'FX', on: true, opacity: 1, blend: 'normal', p: { preset: 'PIXELATE', p1: 40, p2: 0, p3: 0 } };
      if (fxFirst) c.layers.splice(1, 0, fx); else c.layers.push(fx); return A.renderFrame(0, 5, 1, false).data; };
    const a = mk(false), b = mk(true); let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; })()`));
  check(v > 0.5, `ordem importa: o efeito não processa o que está acima dele (${v.toFixed(2)})`, 'igual');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ncamada fx ok.');
process.exit(fail ? 1 : 0);
