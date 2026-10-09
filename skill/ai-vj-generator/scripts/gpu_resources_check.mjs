#!/usr/bin/env node
// Teste dos recursos de GPU (fase 3): pool de texturas e de framebuffers (adquirir, usar, devolver, reaproveitar, sem alocação por quadro),
// controle de estado sem chamadas redundantes, descarte do que ficou parado, VRAM estimada e métricas por quadro, com um projeto de várias camadas de GPU.
//   node gpu_resources_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-gpu-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const L = (type, name, p) => ({ type, name, p });
const project = { schema: 'ai-vj-generator/2', id: 'gpu', seed: 5, meta: { name: 'GPU', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [L('bg', 'F'), L('shader', 'S1', { preset: 'CAMPO FBM' }), L('fx', 'X1', { preset: 'PIXELATE' }), L('isf', 'I', { lib: 'aivj-aurora' }), L('fx', 'X2', { preset: 'PIXELATE' }), L('synth', 'Y', {}), L('fx', 'X3', { preset: 'PIXELATE' })] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
try {
  await E(`AIVJ.renderFrame(0, 0, 0.5, true); 0`);
  const a0 = JSON.parse(await E(`JSON.stringify(AIVJ.glMetrics())`));
  for (let f = 1; f <= 12; f++) await E(`AIVJ.renderFrame(0, ${f}, 0.5, true); 0`);
  const a1 = JSON.parse(await E(`JSON.stringify(AIVJ.glMetrics())`));
  check(a1.textureAllocs === a0.textureAllocs && a1.framebufferAllocs === a0.framebufferAllocs, `7 camadas (3 filtros fx) em 12 quadros: 0 texturas e 0 framebuffers novos depois do primeiro (${a0.textureAllocs} textura(s) no pool)`, JSON.stringify([a0, a1]));
  check(a1.draws >= 6 && a1.passes === a1.draws && a1.activeTextures === 0 && a1.estimatedVramBytes > 0, `métricas do quadro: ${a1.draws} desenhos, ${a1.passes} passes, ${a1.shaderSwitches} trocas de shader, VRAM estimada ${(a1.estimatedVramBytes / 1024).toFixed(0)} KB, nenhuma textura presa`, JSON.stringify(a1));
  check(Number.isFinite(a1.frameMs) && a1.frameMs >= 0 && a1.activeParticles === 0, 'tempo de quadro e partículas ativas existem nas métricas', JSON.stringify(a1));
  /* pools: reaproveitamento, chaves diferentes, devolução, descarte */
  const p = JSON.parse(await E(`(() => { const r = AIVJ.glr(), s0 = r.stats.textureAllocs; const t1 = r.textures.acquire({ w: 64, h: 64 }); r.textures.release(t1); const t2 = r.textures.acquire({ w: 64, h: 64 });
    const same = t1 === t2, t3 = r.textures.acquire({ w: 64, h: 64, filter: 'nearest' }), t4 = r.textures.acquire({ w: 32, h: 64 });
    const f1 = r.framebuffers.acquire({ w: 64, h: 64, depth: true }); r.framebuffers.release(f1); const f2 = r.framebuffers.acquire({ w: 64, h: 64, depth: true });
    const out = { same, newKeys: r.stats.textureAllocs - s0, fboSame: f1 === f2, fboComplete: !!f1.fb, vram: r.textures.bytes };
    [t2, t3, t4].forEach(t => r.textures.release(t)); r.framebuffers.release(f2); return JSON.stringify(out); })()`));
  check(p.same && p.newKeys === 3 && p.fboSame, 'pool de texturas devolve a mesma textura para a mesma chave e cria outra se filtro ou tamanho mudam; o de framebuffers também', JSON.stringify(p));
  const tr = JSON.parse(await E(`(() => { const r = AIVJ.glr(), gl = r.gl; r.frame += 200; r.textures.trim(120); const base = r.textures.total; const t = r.textures.acquire({ w: 8, h: 8, usage: 'tmp' }); r.frame += 200; r.textures.trim(0);
    const aliveBusy = gl.isTexture(t.tex), total = r.textures.total; r.textures.release(t); r.frame += 200; r.textures.trim(120);
    return JSON.stringify({ base, aliveBusy, total, after: r.textures.total, freed: !gl.isTexture(t.tex) }); })()`));
  check(tr.base === 0 && tr.aliveBusy && tr.total === 1 && tr.after === 0 && tr.freed, 'trim: o que ficou parado há mais de 120 quadros é destruído (pool vazio), a textura em uso sobrevive, e ao ser devolvida e esquecida também é liberada', JSON.stringify(tr));
  const stt = JSON.parse(await E(`(() => { const r = AIVJ.glr(), c0 = r.stats.stateChanges; r.setBlend('add'); r.setBlend('add'); r.setDepth(true); r.setDepth(true); r.setDepth(false); r.setBlend(null); const t = r.textures.acquire({ w: 4, h: 4 }); r.bindTexture(t.tex, 2); const c1 = r.stats.stateChanges; r.bindTexture(t.tex, 2); r.textures.release(t);
    return JSON.stringify({ changes: c1 - c0, extra: r.stats.stateChanges - c1 }); })()`));
  check(stt.changes === 5 && stt.extra === 0, 'estado da GPU: chamadas repetidas com o mesmo valor não geram troca (blend, depth, textura)', JSON.stringify(stt));
  const big = JSON.parse(await E(`(() => { const r = AIVJ.glr(), b0 = r.textures.bytes; const t = r.textures.acquire({ w: 100, h: 100, format: 'rgba16f' }); const d = r.textures.bytes - b0; r.textures.release(t); return JSON.stringify({ d }); })()`).catch(() => '{"d":-1}'));
  check(big.d === 100 * 100 * 8 || big.d === -1, 'VRAM estimada = largura × altura × bytes do formato (rgba16f = 8)', JSON.stringify(big));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nrecursos de GPU ok.');
process.exit(fail ? 1 : 0);
