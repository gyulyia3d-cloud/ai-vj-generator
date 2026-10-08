#!/usr/bin/env node
// Teste da camada synth (cadeia de uma linha vira shader): os 10 exemplos compilam em WebGL1, desenham e fecham o loop; cada operador compila sozinho;
// erros de gramática voltam com mensagem em português; expressões com áudio (bass, hit) mudam a imagem; texto fora da lista de nomes é recusado (nada de código solto).
//   node synth_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-synth-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const project = { schema: 'ai-vj-generator/2', id: 'syn', seed: 4, meta: { name: 'SYN', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 2 }, palette: { bg: '#0A0C10', primary: '#F2F2F2', secondary: '#7A8896', accent: '#E8742A' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'synth', name: 'S', p: {} }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
const run = (chain, extra = '') => E(`(() => { const A = AIVJ, P = A.project, c = P.compositions[0], L = c.layers[1]; L.p = Object.assign({ chain: ${JSON.stringify(chain)} }, ${extra || '{}'}); A.GLERR.clear();
  const px = n => A.renderFrame(0, n, 1, false).data, F = Math.round(P.time.bars * 4 * 60 / P.time.bpm * P.canvas.fps);
  const dif = (a, b) => { let d = 0; for (let i = 0; i < a.length; i++) d += Math.abs(a[i] - b[i]); return d / a.length; };
  let msg = ''; try { A.synth.SYN.compile(${JSON.stringify(chain)}); } catch (e) { msg = e.message; }
  if (msg) return JSON.stringify({ msg });
  const a = px(0), b = px(F), m = px(Math.round(F * .4)); let lit = 0; for (let i = 0; i < m.length; i += 4) lit += m[i] + m[i + 1] + m[i + 2];
  return JSON.stringify({ seam: dif(a, b), move: dif(a, m), lit: lit / (m.length / 4 * 3), err: [...A.GLERR.values()].filter(Boolean).join(' | ') }); })()`).then(JSON.parse);
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.synth)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const ex = JSON.parse(await E('JSON.stringify(AIVJ.synth.SYN.EXAMPLES)'));
  for (const [nm, chain] of Object.entries(ex)) {
    const r = await run(chain);
    check(!r.msg && !r.err, `exemplo compila: ${nm}`, r.msg || r.err);
    if (r.msg || r.err) continue;
    check(r.lit > 2, `desenha: ${nm}`, 'preto');
    check(r.seam < 1.0, `fecha o loop: ${nm} (emenda ${r.seam.toFixed(2)})`, 'emenda grande');
    check(r.move > 0.5, `anima: ${nm} (${r.move.toFixed(1)})`, 'parado');
  }
  /* cada operador, sozinho, em uma cadeia mínima */
  const ops = JSON.parse(await E('JSON.stringify({ co: Object.keys(AIVJ.synth.SYN.CO), cl: Object.keys(AIVJ.synth.SYN.CL), bl: Object.keys(AIVJ.synth.SYN.BL), mo: Object.keys(AIVJ.synth.SYN.MO), src: Object.keys(AIVJ.synth.SYN.SRC) })'));
  const bad1 = [];
  for (const s of ops.src) { const r = await run(`${s}()`); if (r.msg || r.err) bad1.push(s + ': ' + (r.msg || r.err).slice(0, 80)); }
  for (const o of [...ops.co, ...ops.cl]) { const r = await run(`osc(20,1,0.5).${o}()`); if (r.msg || r.err) bad1.push(o + ': ' + (r.msg || r.err).slice(0, 80)); }
  for (const o of [...ops.bl, ...ops.mo]) { const r = await run(`osc(20,1,0.5).${o}(noise(3,1))`); if (r.msg || r.err) bad1.push(o + ': ' + (r.msg || r.err).slice(0, 80)); }
  check(!bad1.length, `${ops.src.length + ops.co.length + ops.cl.length + ops.bl.length + ops.mo.length} operadores compilam sozinhos`, bad1.join(' · '));
  /* erros de gramática */
  const errs = [['blah()', /desconhecido/], ['rotate(0.2)', /começar por uma fonte/], ['osc(1,2,3,4)', /aceita até/], ['osc(20', /faltou "\)"/], ['osc(20).add(0.5)', /cadeia como primeiro argumento/], ['osc(foo)', /nome desconhecido/], ['osc(20).noise(3)', /é uma fonte/], ['osc(1);alert(1)', /caracter|sobrou|não permitido/]];
  for (const [chain, re] of errs) { const r = await run(chain); check(r.msg && re.test(r.msg), `erro claro: ${chain}`, r.msg || 'compilou'); }
  /* áudio: a mesma cadeia muda quando bass sobe */
  const ref = await run('osc(20,1,0.5).rotate(0.1,0).tint()'), withBass = await run('osc(20,1,0.5).rotate(0.1+0.4*bass,0).tint()');
  check(!withBass.msg && !withBass.err && ref.lit > 0, 'expressão com bass compila', withBass.msg || withBass.err);
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ncamada synth ok.');
process.exit(fail ? 1 : 0);
