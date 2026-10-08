#!/usr/bin/env node
// Teste numérico dos módulos GLSL novos (noise.gradient, noise.warp, sdf2d.more, space.more, color.more, easing.more, math): em vez de só compilar,
// o shader calcula afirmações (centro dentro da forma, fora longe, blend conhecido, easing de 0 a 1, ruído em faixa) e escreve 1 ou 0 num pixel por afirmação.
//   node lib2_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-lib2-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const near = (a, b, e = 0.02) => `(abs((${a})-(${b}))<${e})`;
const cases = [
  ['cross: centro dentro, longe fora', 'vjSdCross(vec2(0.),.5,.15)<0. && vjSdCross(vec2(3.,3.),.5,.15)>0. && vjSdCross(vec2(.4,.4),.5,.15)>0.'],
  ['rhombus: centro dentro, canto fora', 'vjSdRhombus(vec2(0.),vec2(.5,.3))<0. && vjSdRhombus(vec2(.45,.28),vec2(.5,.3))>0. && ' + near('vjSdRhombus(vec2(.5,0.),vec2(.5,.3))', '0.')],
  ['vesica (lente): centro dentro, extremo fora', 'vjSdVesica(vec2(0.),.6,.3)<0. && vjSdVesica(vec2(0.,1.),.6,.3)>0.'],
  ['moon (lua): ponto do crescente dentro, buraco fora', 'vjSdMoon(vec2(-.2,0.),.5,.3,.3)<0. && vjSdMoon(vec2(.3,0.),.5,.3,.3)>0.'],
  ['heart (coração): centro dentro, longe fora, mais largo no alto que embaixo', 'vjSdHeart(vec2(0.),1.)<0. && vjSdHeart(vec2(3.,3.),1.)>0. && vjSdHeart(vec2(0.,-1.3),1.)>0.'],
  ['arc: sobre o arco dentro da espessura, centro fora', 'vjSdArc(vec2(0.,.5),1.,.5,.05)<0. && vjSdArc(vec2(0.),1.,.5,.05)>0. && vjSdArc(vec2(0.,-.5),1.,.5,.05)>0.'],
  ['pie (setor): dentro do cone e do raio, fora do raio fora', 'vjSdPie(vec2(0.,.2),1.,.5)<0. && vjSdPie(vec2(0.,.9),1.,.5)>0. && vjSdPie(vec2(0.,-.2),1.,.5)>0.'],
  ['ellipse: centro dentro, longe fora', 'vjSdEllipse(vec2(0.),vec2(.5,.3))<0. && vjSdEllipse(vec2(2.,2.),vec2(.5,.3))>0. && ' + near('vjSdEllipse(vec2(.5,0.),vec2(.5,.3))', '0.', 0.001)],
  ['ops de SDF: união, interseção, xor, morph', near('vjOpUnion(.2,-.3)', '-.3') + ' && ' + near('vjOpInter(.2,-.3)', '.2') + ' && ' + near('vjOpXor(-.2,-.3)', '.2') + ' && ' + near('vjOpMorph(0.,1.,.25)', '.25')],
  ['fill e stroke: dentro 1, fora 0, borda 0,5', near('vjFill(-1.,.01)', '1.') + ' && ' + near('vjFill(1.,.01)', '0.') + ' && ' + near('vjFill(0.,.01)', '.5') + ' && vjStroke(0.,.02,.005)>.99 && vjStroke(.5,.02,.005)<.01'],
  ['gradient noise: faixa e determinismo', 'abs(vjCNoise(vec2(3.3,4.7)))<1. && vjGNoise(vec2(1.7,2.2))>=0. && vjGNoise(vec2(1.7,2.2))<=1. && ' + near('vjGNoise(vec2(1.7,2.2))', 'vjGNoise(vec2(1.7,2.2))', 1e-6) + ' && vjTurbulence(vec2(.3,.9))>=0. && vjTurbulence(vec2(.3,.9))<=1.'],
  ['noise periódico: p e p+período dão o mesmo', near('vjPNoise(vec2(.37,.81),vec2(4.))', 'vjPNoise(vec2(4.37,.81),vec2(4.))', 1e-4) + ' && ' + near('vjPNoise(vec2(.37,.81),vec2(4.))', 'vjPNoise(vec2(.37,8.81),vec2(4.))', 1e-4)],
  ['voronoise: 0..1 e responde a u, v', 'vjVoronoise(vec2(2.1,3.4),1.,1.)>=0. && vjVoronoise(vec2(2.1,3.4),1.,1.)<=1. && abs(vjVoronoise(vec2(2.1,3.4),0.,1.)-vjVoronoise(vec2(2.1,3.4),1.,1.))>.0001'],
  ['domain warp: move o ponto, k=0 não move', 'length(vjDomainWarp(vec2(.3,.4),.5)-vec2(.3,.4))>.001 && ' + near('length(vjDomainWarp(vec2(.3,.4),0.)-vec2(.3,.4))', '0.', 1e-5) + ' && length(vjFlowWarp(vec2(.3,.4),.5,0.)-vec2(.3,.4))>.001'],
  ['space: scaleAt fixo no centro, fisheye k=0 identidade, mirrorTile 0..1', near('length(vjScaleAt(vec2(.5),vec2(.5),3.)-vec2(.5))', '0.', 1e-5) + ' && ' + near('length(vjFishEye(vec2(.3,.2),0.)-vec2(.3,.2))', '0.', 1e-5) + ' && vjMirrorTile(vec2(.7,1.3),3.).x<=1. && vjMirrorTile(vec2(.7,1.3),3.).y>=0.'],
  ['hsl: vermelho, ida e volta', near('vjHsl(0.,1.,.5).r', '1.') + ' && ' + near('vjHsl(0.,1.,.5).g', '0.') + ' && ' + near('vjHsl(1./3.,1.,.5).g', '1.') + ' && ' + near('vjToHsl(vec3(1.,0.,0.)).z', '.5') + ' && ' + near('vjToHsl(vjHsl(.6,.7,.4)).x', '.6', .01)],
  ['oklch: L alto = claro, C=0 cinza', 'dot(vjOklch(.9,.05,.3),vec3(.33))>dot(vjOklch(.3,.05,.3),vec3(.33)) && ' + near('vjOklch(.5,0.,.2).r', 'vjOklch(.5,0.,.2).b', .01)],
  ['temperatura: 2000K quente (r>b), 9000K fria (b>r)', 'vjTemp(2000.).r>vjTemp(2000.).b && vjTemp(9000.).b>=vjTemp(9000.).r-.001'],
  ['blends conhecidos', near('vjBScreen(vec3(.5),vec3(.5)).r', '.75') + ' && ' + near('vjBMult(vec3(.5),vec3(.5)).r', '.25') + ' && ' + near('vjBOverlay(vec3(.25),vec3(.5)).r', '.25') + ' && ' + near('vjBSoft(vec3(.5),vec3(.5)).r', '.5') + ' && ' + near('vjBDiff(vec3(.2),vec3(.7)).r', '.5') + ' && ' + near('vjBExcl(vec3(.5),vec3(.5)).r', '.5') + ' && vjBDodge(vec3(.5),vec3(.5)).r>.99 && ' + near('vjBBurn(vec3(.5),vec3(1.)).r', '.5')],
  ['levels: gama 1 entre 0..1 é identidade', near('vjLevels(vec3(.3),0.,1.,1.).r', '.3') + ' && ' + near('vjLevels(vec3(.3),.3,1.,1.).r', '0.') + ' && ' + near('vjLevels(vec3(1.),0.,.5,1.).r', '1.')],
  ['easings: 0 vai a 0 e 1 vai a 1', ['InSine', 'OutSine', 'InOutSine', 'InQuad', 'OutQuad', 'InOutQuad', 'InCubic', 'OutCubic', 'InQuart', 'OutQuart', 'InQuint', 'OutQuint', 'InExpo', 'InCirc', 'OutCirc', 'InBack', 'InOutBack', 'InElastic', 'OutElastic', 'OutBounce'].map(n => `${near(`vj${n}(0.)`, '0.', .01)} && ${near(`vj${n}(1.)`, '1.', .01)}`).join(' && ')],
  ['easings: monotonia de quad/cubic/sine e meio-termo', 'vjInQuad(.5)<.5 && vjOutQuad(.5)>.5 && ' + near('vjInOutQuad(.5)', '.5') + ' && ' + near('vjInOutSine(.5)', '.5') + ' && vjInCubic(.3)<vjInCubic(.6) && vjOutCubic(.3)<vjOutCubic(.6)'],
  ['spring: começa em 0, assenta em 1, passa de 1 quando subamortecida', near('vjSpring(0.,.3,10.)', '0.') + ' && ' + near('vjSpring(6.,.3,10.)', '1.', .01) + ' && vjSpring(.35,.2,10.)>1.05 && ' + near('vjSpring(8.,1.,6.)', '1.', .01) + ' && vjSpring(.1,1.,6.)<1.'],
  ['math: map, wrap, quantize, pingpong, step', near('vjMap(5.,0.,10.,0.,100.)', '50.', .001) + ' && ' + near('vjWrap(11.,0.,10.)', '1.', .001) + ' && ' + near('vjWrap(-1.,0.,10.)', '9.', .001) + ' && ' + near('vjQuantize(.34,4.)', '.25', .001) + ' && ' + near('vjPingPong(.5)', '.5', .001) + ' && ' + near('vjPingPong(1.)', '1.', .001) + ' && ' + near('vjPingPong(2.)', '0.', .001) + ' && ' + near('vjSat(2.)', '1.', .001) + ' && vjStep(.6,.5,.1)>.9'],
];
const src = '#include noise.gradient\n#include noise.warp\n#include sdf2d.more\n#include space.more\n#include color.more\n#include easing.more\n#include math\nvoid main(){ int i=int(floor(gl_FragCoord.x)); float pass=0.;\n'
  + cases.map(([_, e], k) => `if(i==${k}){ pass = (${e}) ? 1. : 0.; }`).join('\n') + '\ngl_FragColor=vec4(pass,pass,pass,1.); }';
const project = { schema: 'ai-vj-generator/2', id: 'lib2', seed: 3, meta: { name: 'LIB2', brief: 'x', lang: 'pt' }, canvas: { w: 64, h: 8, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 1 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'shader', name: 'T', p: { src, alphaMode: 'opaque', res: 1 } }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1000, height: 700 });
try {
  for (let i = 0; i < 80; i++) { if (await page.evaluate('!!(window.AIVJ && window.AIVJ.renderFrame)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const r = JSON.parse(await page.evaluate(`(() => { AIVJ.GLERR.clear(); const d = AIVJ.renderFrame(0, 0, 1, false).data, row = []; for (let i = 0; i < ${cases.length}; i++) row.push(d[(4 * 64) * 4 * 0 + (4 * 64 * 4) + i * 4]); return JSON.stringify({ row, err: [...AIVJ.GLERR.values()].join(' | ') }); })()`));
  if (r.err) bad('o shader de teste não compilou: ' + r.err.slice(0, 300));
  else cases.forEach(([nm], k) => { if (r.row[k] > 200) ok(nm); else bad(nm + ' :: afirmação falhou'); });
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nmódulos novos ok.');
process.exit(fail ? 1 : 0);
