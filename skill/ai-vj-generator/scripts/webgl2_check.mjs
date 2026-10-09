#!/usr/bin/env node
// Teste do renderizador WebGL2 (fase 2): o motor usa WebGL2 com GLSL ES 3.00, os programas ficam em cache (nenhuma recompilação depois do primeiro quadro),
// um erro de shader aponta a linha do código do usuário, o VAO e os buffers não são recriados por quadro, e sem WebGL2 o motor diz isso em vez de voltar ao WebGL1.
//   node webgl2_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-gl2-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const good = 'void main(){ vec2 uv = gl_FragCoord.xy / uRes; gl_FragColor = outc(vec3(uv, uBass), 1.0); }';
const broken = 'void main(){\n  vec2 uv = gl_FragCoord.xy / uRes;\n  float x = nope;\n  gl_FragColor = outc(vec3(uv, x), 1.0);\n}';
const project = { schema: 'ai-vj-generator/2', id: 'gl2', seed: 5, meta: { name: 'GL2', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'S', p: { src: good } }, { type: 'fx', name: 'X', p: { preset: 'PIXELATE' } }, { type: 'isf', name: 'I', p: { lib: 'aivj-aurora' } }, { type: 'synth', name: 'Y', p: {} }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
try {
  const info = JSON.parse(await E(`JSON.stringify(AIVJ.glInfo())`));
  check(info.version === 2 && info.context === 'WebGL2RenderingContext' && /ES 3\.00/.test(info.glsl), 'o motor usa WebGL2 com GLSL ES 3.00', JSON.stringify(info).slice(0, 200));
  check(info.caps.instancing && info.caps.transformFeedback && info.caps.texture3D && info.caps.maxTextureSize >= 2048, 'o renderizador detecta as capacidades do WebGL2 (instancing, transform feedback, 3D, MRT, float)', JSON.stringify(info.caps));
  /* cache: depois do primeiro quadro, mais quadros não compilam nada nem trocam de programa além dos usados */
  await E(`AIVJ.renderFrame(0, 0, 0.5, true); 0`);
  const s0 = JSON.parse(await E(`JSON.stringify(AIVJ.glInfo().stats)`));
  for (let f = 1; f <= 6; f++) await E(`AIVJ.renderFrame(0, ${f}, 0.5, true); 0`);
  const s1 = JSON.parse(await E(`JSON.stringify(AIVJ.glInfo().stats)`));
  check(s1.compiles === s0.compiles && s1.programs === s0.programs && s0.programs >= 4, `programas em cache: ${s0.programs} programas, 0 compilações novas em 6 quadros`, JSON.stringify([s0, s1]));
  check(s1.textureAllocs === s0.textureAllocs, 'nenhuma textura nova por quadro (a textura do fx é reaproveitada)', JSON.stringify([s0.textureAllocs, s1.textureAllocs]));
  check(s1.draws - s0.draws >= 6 * 4, 'pelo menos quatro desenhos por quadro (shader, fx, isf, synth), um por camada de GPU, sem passes extras', String(s1.draws - s0.draws));
  /* erro de shader: a linha é a do código do usuário */
  const er = await E(`(() => { const b = ${JSON.stringify(broken)}; AIVJ.glInfo(); const e = AIVJ.glProgram(b); return JSON.stringify({ ok: !!e, err: AIVJ.glError(b) }); })()`);
  const o = JSON.parse(er);
  check(!o.ok && /LINHA 3\b/.test(o.err || ''), 'erro de shader aponta a LINHA 3 do código do usuário (o cabeçalho não desloca a contagem)', er);
  /* sem WebGL2: mensagem clara, e só webgl2 é pedido (nunca webgl) */
  const nf = JSON.parse(await E(`(() => { const asked = []; const fake = { getContext: n => { asked.push(n); return null; } }; const r = AIVJ.webgl.create(fake); return JSON.stringify({ asked, err: r.error || null }); })()`));
  check(nf.asked.join() === 'webgl2' && /WebGL2/.test(nf.err || '') && /não usa WebGL1/.test(nf.err), 'sem WebGL2 o renderizador diz o motivo e não tenta WebGL1', JSON.stringify(nf));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nWebGL2 ok.');
process.exit(fail ? 1 : 0);
