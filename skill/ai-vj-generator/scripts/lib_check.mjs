#!/usr/bin/env node
// Teste da biblioteca GLSL (#include): todos os módulos compilam juntos em WebGL 1, um shader raymarch com `map` do usuário desenha, e módulo inexistente é acusado pelo validador.
//   node lib_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-lib-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const mods = [...readFileSync(join(HERE, '..', 'references', 'glsl-lib', 'lib.glsl'), 'utf8').matchAll(/^\/\/@module (\S+)/gm)].map(m => m[1]);
check(mods.length >= 12, 'biblioteca tem os módulos', mods.join(','));

const all = mods.map(m => '#include ' + m).join('\n');
const useAll = `float map(vec3 p){return vjSdSphere(p,.8+.1*uBass);}
void main(){ vec2 uv=vjAspect(gl_FragCoord.xy); float k=0.;
 k+=vjSimplex(uv*3.+uPh)*.2+vjSimplexFbm(uv)*.2+length(vjCurl(uv))*.01+vjRidged(uv)*.1;
 vec3 w=vjWorley(uv*4.); k+=w.x*.2+vjVoronoiEdge(uv*3.)*.2;
 k+=vjSdSeg(uv,vec2(0.),vec2(.3))+vjSdRing(uv,.3,.02)+vjSdRoundBox(uv,vec2(.2),.05)+vjSdNgon(uv,5.,.3)+vjSdStar(uv,5.,.3,2.5)+vjSdTri(uv,.2)+vjSmax(.1,.2,.1)+vjOpSub(.1,.2)+vjOpOnion(.1,.02);
 k+=length(vjRepeat(uv,vec2(.3)))+length(vjMirror(uv,.1))+length(vjPolarRepeat(uv,6.));
 k+=vjSdBox3(vec3(uv,0.),vec3(.2))+vjSdTorus(vec3(uv,0.),vec2(.3,.1))+vjSdCapsule(vec3(uv,0.),vec3(0.),vec3(.2),.05)+vjSdPlane(vec3(uv,0.),.1)+length(vjRotX(.3)*vjRotY(.2)*vjRotZ(.1)*vec3(uv,1.))+length(vjRepeat3(vec3(uv,0.),vec3(.4)));
 vec3 ro=vec3(0.,0.,-3.),rd=vjCam(uv,ro,vec3(0.),1.5);float t=vjMarch(ro,rd,8.);vec3 col=vec3(0.);if(t>0.){vec3 p=ro+rd*t;vec3 n=vjNormal(p);col=vec3(.5+.5*dot(n,normalize(vec3(1.,1.,-1.))))*vjAO(p,n)*vjShadow(p,normalize(vec3(1.,1.,-1.)));}
 col=vjMixOklab(col,uC1,.3)+vjHsv(uPh,.5,.2)*.1;col=vjGrade(vjAces(col),1.1,1.);col+=vjDuotone(k,uC1,uC2)*.0;
 k+=vjBayer4(gl_FragCoord.xy)*.01+vjIgn(gl_FragCoord.xy)*.01+vjQuant(col,4.,gl_FragCoord.xy).r*.01+vjHalftone(uv,.3,20.,.5)*.1+vjLineScreen(uv,.3,30.,.5)*.1;
 k+=vjPolar(uv).x*.01+length(vjSwirl(uv,1.))*.01+length(vjBarrel(uv,.2))*.01+vjHexTile(uv*5.).x*.01+vjLogPolar(uv).x*.01;
 k+=vjSmoother(uPh)+vjInOut(uPh)+vjOutBack(uPh)+vjElastic(uPh)+vjBounce(uPh)+vjExpoOut(uPh)+vjGain(uPh,2.)+vjVignette(uv,.3)+vjGlow(k,.1,2.)+vjAA(k)+vjGrain(gl_FragCoord.xy,.1)+vjScan(gl_FragCoord.xy,4.,.2);
 k+=vjLedDots(gl_FragCoord.xy,6.,.8)+vjCrtMask(gl_FragCoord.xy).g+vjBleed(col,.2).r+vjHash22(uv).x+vjHash31(vec3(uv,1.))+vjHash33(vec3(uv,1.)).x;
 gl_FragColor=outc(mix(uC1,uC2,clamp(k*.2+uHigh,0.,1.)),clamp(.4+col.r+uHit*.2,0.,1.)); }`;
const layers = [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'LIB', role: 'x', p: { src: all + '\n' + useAll } }];
const project = { schema: 'ai-vj-generator/2', id: 'lib', seed: 3, meta: { name: 'LIB', brief: 'x', lang: 'pt' }, canvas: { w: 480, h: 270, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers }] };
const json = join(tmp, 'p.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

/* exemplos do glsl-library.md: cada bloco ```glsl compila e desenha */
const doc = readFileSync(join(HERE, '..', 'references', 'glsl-library.md'), 'utf8');
const blocks = doc.split('```glsl').slice(1).map(x => x.split('```')[0]);
check(blocks.length >= 3, 'glsl-library.md traz exemplos', 'blocos=' + blocks.length);
const page = await openPage(html, { chrome, width: 1000, height: 700 });
try {
  const r = await page.evaluate(`(() => { AIVJ.GLERR.clear(); const d = AIVJ.renderFrame(0, 12, 0.5, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return JSON.stringify({ s, e: [...AIVJ.GLERR.values()] }); })()`);
  const o = JSON.parse(r); check(o.s > 0 && !o.e.length, 'todos os módulos juntos compilam e desenham (raymarch incluído)', r.slice(0, 400));
  const n = await page.evaluate(`AIVJ.shaderResolve(${JSON.stringify(['#include color', '#include color', 'void main(){}'].join(String.fromCharCode(10)))}).split(String.fromCharCode(10)).length`);
  check(n === 3, 'include não muda a contagem de linhas (erros apontam a linha certa)', 'linhas=' + n);
  for (const [i, b] of blocks.entries()) {
    const r2 = await page.evaluate(`(() => { const L = AIVJ.project.compositions[0].layers[1]; L.p.src = ${JSON.stringify(b)}; AIVJ.GLERR.clear(); const d = AIVJ.renderFrame(0, 20, 0.4, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return JSON.stringify({ s, e: [...AIVJ.GLERR.values()] }); })()`);
    const o2 = JSON.parse(r2); check(o2.s > 0 && !o2.e.length, 'exemplo ' + (i + 1) + ' do glsl-library.md compila e desenha', r2.slice(0, 300));
  }
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
const vp = join(HERE, 'validate_project.py');
project.compositions[0].layers[1].p.src = '#include noise.nope\nvoid main(){ gl_FragColor=outc(uC1,uBass); }';
writeFileSync(json, JSON.stringify(project));
let out = ''; try { out = execFileSync('python', [vp, json], { encoding: 'utf8' }); } catch (e) { out = String(e.stdout); }
check(/unknown GLSL module/.test(out), 'validador acusa módulo inexistente', out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 2).join('|'));
console.log(fail ? `\n${fail} falha(s).` : '\nlib ok.');
process.exit(fail ? 1 : 0);
