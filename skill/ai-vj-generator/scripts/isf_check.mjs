#!/usr/bin/env node
// Teste da ponte ISF: exporta os shaders de um projeto, compila o .fs como um host ISF o faria (declara os INPUTS como uniforms),
// importa um gerador ISF (float, bool, long, color, point2D, TIME, isf_FragNormCoord) e confere que desenha; recusa filtro com imagem.
//   node isf_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-isf-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const py = (...a) => execFileSync('python', [join(HERE, 'isf.py'), ...a], { stdio: 'pipe', encoding: 'utf8' });

const src = 'void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float r=length(uv); float k=smoothstep(.02,0.,abs(r-(.3+uP.x*.05+uBass*.1)))+uHit*.1; gl_FragColor=outc(mix(uC1,uC2,uHigh),clamp(k,0.,1.));}';
const project = { schema: 'ai-vj-generator/2', id: 'isf', seed: 3, meta: { name: 'ISF TESTE', brief: 'x', lang: 'pt' }, canvas: { w: 480, h: 270, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'ANEL', p: { src } }, { type: 'shader', name: 'PRESET', p: { preset: 'CÉLULAS' } }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
const out = join(tmp, 'out');
py('export', pj, '--out', out);
const fs = readdirSync(out).filter(f => f.endsWith('.fs'));
check(fs.length === 2, 'export gera um .fs por camada de shader (custom e preset)', fs.join(','));

const gen = `/*{ "DESCRIPTION": "teste", "CREDIT": "fixture", "ISFVSN": "2", "CATEGORIES": ["Generator"], "INPUTS": [
 {"NAME":"speed","TYPE":"float","DEFAULT":2.0,"MIN":0,"MAX":5},{"NAME":"size","TYPE":"float","DEFAULT":0.3,"MIN":0,"MAX":1},
 {"NAME":"invert","TYPE":"bool","DEFAULT":false},{"NAME":"mode","TYPE":"long","VALUES":[0,1],"LABELS":["a","b"],"DEFAULT":1},
 {"NAME":"tint","TYPE":"color","DEFAULT":[1,0,0,1]},{"NAME":"ctr","TYPE":"point2D","DEFAULT":[0.5,0.5]}] }*/
#define TAU 6.28318530718
void main(){ vec2 p = isf_FragNormCoord - ctr; float d = length(p * vec2(RENDERSIZE.x / RENDERSIZE.y, 1.0));
 float k = smoothstep(0.01, 0.0, abs(d - size - 0.05 * sin(TIME * speed * TAU / 8.0))); if (invert) k = 1.0 - k; if (mode == 1) k *= 0.9;
 gl_FragColor = vec4(tint.rgb * k, k); }`;
const filt = '/*{ "INPUTS":[{"NAME":"inputImage","TYPE":"image"}] }*/\nvoid main(){ gl_FragColor = IMG_THIS_NORM_PIXEL(inputImage); }';
writeFileSync(join(tmp, 'gen.fs'), gen); writeFileSync(join(tmp, 'filt.fs'), filt);
let r = ''; try { r = py('check', join(tmp, 'filt.fs')); } catch (e) { r = String(e.stdout); }
check(/NOT importable/.test(r), 'filtro com imagem é recusado com motivo', r);
r = py('check', join(tmp, 'gen.fs')); check(/importable/.test(r) && !/NOT/.test(r), 'gerador é aceito', r);
py('import', join(tmp, 'gen.fs'), '--out', join(tmp, 'gen.layer.json'));
const imp = JSON.parse(readFileSync(join(tmp, 'gen.layer.json'), 'utf8'));
check(imp.layer.p.p1 === 2 && imp.layer.p.p2 === 0.3 && /Credit: fixture/.test(imp.layer.role), 'import mapeia floats para p1..p4 e guarda o crédito', JSON.stringify(imp.inputs_mapped));

const impProj = JSON.parse(JSON.stringify(project)); impProj.compositions[0].layers = [{ type: 'bg', name: 'F' }, imp.layer];
const ip = join(tmp, 'imp.json'); writeFileSync(ip, JSON.stringify(impProj));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), ip, '--out', join(tmp, 'imp.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'imp.html'), { chrome, width: 1000, height: 700 });
try {
  const lit = await page.evaluate(`(() => { AIVJ.GLERR.clear(); const d = AIVJ.renderFrame(0, 30, 0.5, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return JSON.stringify({ s, e: [...AIVJ.GLERR.values()] }); })()`);
  const o = JSON.parse(lit); check(o.s > 0 && !o.e.length, 'ISF importado compila no motor e desenha', lit);
  /* o .fs exportado, com os INPUTS declarados como uniforms (o que um host ISF faz), compila em WebGL1 */
  for (const f of fs) {
    const txt = readFileSync(join(out, f), 'utf8'), m = txt.match(/^\/\*([\s\S]*?)\*\//), hdr = JSON.parse(m[1]);
    const decl = hdr.INPUTS.map(i => `uniform ${i.TYPE === 'color' ? 'vec4' : 'float'} ${i.NAME};`).join('\n') + '\nuniform vec2 RENDERSIZE; uniform float TIME;\n';
    const glsl = 'precision highp float;\n' + decl + txt.slice(m[0].length);
    const res = await page.evaluate(`(() => { const gl = document.createElement('canvas').getContext('webgl'); const s = gl.createShader(gl.FRAGMENT_SHADER); gl.shaderSource(s, ${JSON.stringify(glsl)}); gl.compileShader(s); return gl.getShaderParameter(s, gl.COMPILE_STATUS) ? 'ok' : gl.getShaderInfoLog(s); })()`);
    check(res === 'ok', 'export compila como ISF: ' + f, res);
  }
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nISF ok.');
process.exit(fail ? 1 : 0);
