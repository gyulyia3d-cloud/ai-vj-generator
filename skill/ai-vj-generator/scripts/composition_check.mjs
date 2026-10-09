#!/usr/bin/env node
// Teste do Composition IR (fase 6): Python = navegador; a proporção da superfície muda a gramática; os mesmos geradores com outra gramática ficam em outro lugar;
// o espaço negativo é respeitado; o envelope de cinco fases fecha o loop; o IR só é aplicado quando o Creative IR conduz; os projetos continuam válidos e desenham.
//   node composition_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-comp-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const S = (w, h, type = 'led') => ({ type, w, h, fps: 30 });
const base = (over) => Object.assign({ name: 'Teste Comp', lang: 'pt', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], energy: 0.5, surface: S(4500, 800), time: { bpm: 110, bars: 4 }, compositions: 3 }, over);
const surfaces = { 'ultrawide 4500x800': S(4500, 800), '16:9 1920x1080': S(1920, 1080, 'screen'), 'vertical 1080x1920': S(1080, 1920, 'screen'), 'quadrado 1080x1080': S(1080, 1080, 'screen'), 'faixa 10400x416': S(10400, 416) };
const concepts = ['Pressão contida, tensão e compressão sem saída.', 'A fluid river of flow, drift and echo.', 'Quebra e fratura: uma ruptura e caos.', 'Algo que surge do vazio e floresce.', 'Neutral piece with nothing to match.'];
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.COMPOSITION)' });
const E = s => page.evaluate(s);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const jsC = (brief, i) => E(`(() => { const b = ${JSON.stringify(brief)}; return JSON.stringify(AIVJ.COMPOSITION.compile(b, AIVJ.CREATIVE.compile(b), ${i})); })()`).then(JSON.parse);
const pyC = (brief, i, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(brief)); return JSON.parse(execFileSync('python', [join(HERE, 'composition_ir.py'), f, String(i)], { encoding: 'utf8' })); };
const build = brief => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`).then(JSON.parse);
try {
  /* 1) paridade Python = navegador */
  let par = 0, tot = 0; const parBad = [];
  for (const [sn, sf] of Object.entries(surfaces)) for (const [ci, c] of concepts.entries()) for (const i of [0, 1, 2]) {
    if ((ci + i) % 2) continue; const b = base({ surface: sf, concept: c, mood: ci % 2 ? ['calm'] : ['glitch'] }); tot++;
    if (same(JSON.parse(JSON.stringify(pyC(b, i, `p${tot}`))), await jsC(b, i))) par++; else parBad.push(sn + '/' + ci + '/' + i);
  }
  check(!parBad.length, `o Composition IR do Python é igual ao do navegador em ${par}/${tot} casos (5 superfícies, 5 conceitos, 3 composições)`, parBad.join(' '));

  /* 2) a proporção da superfície escolhe a gramática */
  const top = async sf => (await jsC(base({ surface: sf }), 0)).grammarSet;
  const uw = await top(surfaces['ultrawide 4500x800']), vt = await top(surfaces['vertical 1080x1920']), strip = await top(surfaces['faixa 10400x416']);
  check(uw.includes('horizontal') && vt.some(g => g === 'vertical' || g === 'hierarchical') && !uw.includes('vertical') && !vt.includes('horizontal'), `ultrawide pede gramática horizontal (${uw.join(', ')}); vertical pede hierarquia vertical (${vt.join(', ')})`, JSON.stringify({ uw, vt }));
  check(strip.includes('horizontal'), `a faixa 10400×416 também (${strip.join(', ')})`, strip.join());
  const cu = await jsC(base({ surface: surfaces['ultrawide 4500x800'] }), 0), ct = await jsC(base({ surface: surfaces['vertical 1080x1920'] }), 0);
  const pxw = (c, W) => c.zones.hero.w * W, pxh = (c, H) => c.zones.hero.h * H;
  check(Math.abs(pxw(cu, 4500) - pxh(cu, 800)) < 8 && Math.abs(pxw(ct, 1080) - pxh(ct, 1920)) < 8, 'o herói é quadrado em pixels nas duas superfícies: a zona não estica o 16:9 para a proporção', JSON.stringify([pxw(cu, 4500), pxh(cu, 800), pxw(ct, 1080), pxh(ct, 1920)]));

  /* 3) campos do IR e espaço negativo respeitado */
  const need = ['grammar', 'canvas', 'hierarchy', 'zones', 'negativeSpace', 'focalPoint', 'visualMass', 'balance', 'alignment', 'movementAxis', 'densityMap', 'scaleHierarchy', 'depthHierarchy', 'safeAreas', 'edgeBehavior', 'temporal'];
  check(need.every(k => k in cu) && cu.hierarchy.primary === 'hero' && cu.densityMap.length === 3 && cu.temporal.phases.length === 5, 'o IR traz zonas, hierarquia, espaço negativo, ponto focal, massa visual, equilíbrio, alinhamento, eixo, mapa de densidade, escalas, profundidade, áreas seguras, borda e cinco fases', Object.keys(cu).join());
  const overlap = (a, b) => Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const worst = []; let n = 0;
  for (const [sn, sf] of Object.entries(surfaces)) for (let i = 0; i < 12; i++) {
    const g = (await E(`JSON.stringify(AIVJ.COMPOSITION.DATA.grammarOrder)`).then(JSON.parse))[i];
    const c = await E(`(() => { const D = AIVJ.COMPOSITION.DATA, ir = { visualVerbs: [], verbScores: {}, arc: null }; const saved = D.aspectClasses; D.aspectClasses = Object.assign({}, saved, { [AIVJ.COMPOSITION.aspectClass(${sf.w}, ${sf.h})]: { ${JSON.stringify(g)}: 3 } }); try { return JSON.stringify(AIVJ.COMPOSITION.compile({ surface: ${JSON.stringify(sf)} }, ir, 0)); } finally { D.aspectClasses = saved; } })()`).then(JSON.parse);
    n++; const neg = c.negativeSpace[0], h = c.zones.hero, ov = overlap(h, neg) / (h.w * h.h);
    if (c.grammar !== g) worst.push(sn + ':' + g + '->' + c.grammar); else if (ov > 0.2) worst.push(sn + ':' + g + ' ' + ov.toFixed(2));
  }
  check(!worst.length, `em ${n} combinações de gramática e superfície o herói não invade o espaço negativo (no máximo 20% da sua área)`, worst.join(' '));

  /* 4) os mesmos geradores, composição diferente */
  const proj = await build(base({ surface: S(1920, 1080, 'screen'), compositions: 3 }));
  const lay = proj.compositions[0].layers, ir0 = proj.meta.compositionIR[0], ir1 = proj.meta.compositionIR[1];
  const moved = JSON.parse(await E(`(() => { const A = AIVJ, proj = ${JSON.stringify(proj)}, W = 1920, H = 1080, mk = () => [{ type: 'tunnel', name: 'HERÓI X', p: {} }, { type: 'shape', name: 'ESTRUTURA I', p: {} }, { type: 'instrument', name: 'INSTRUMENTO I', p: {} }, { type: 'typeset', name: 'TIPOGRAFIA I', p: {} }];
    const a = mk(), b = mk(); A.COMPOSITION.apply(a, proj.meta.compositionIR[0], W, H); A.COMPOSITION.apply(b, proj.meta.compositionIR[2], W, H);
    const pos = l => [l[0].p.x, l[0].p.y, l[0].p.sx, l[1].p.x, l[2].p.cx, l[3].p.cy]; return JSON.stringify({ types: a.map(l => l.type).join() === b.map(l => l.type).join(), ha: pos(a), hb: pos(b), ga: proj.meta.compositionIR[0].grammar, gb: proj.meta.compositionIR[2].grammar }); })()`));
  check(moved.types && moved.ga !== moved.gb && !same(moved.ha, moved.hb), `os mesmos geradores com a gramática ${moved.ga} e com ${moved.gb} ficam em lugares e escalas diferentes (herói, estrutura, instrumento e texto: ${moved.ha.join('/')} contra ${moved.hb.join('/')})`, JSON.stringify(moved));
  check(new Set(proj.meta.compositionIR.map(c => c.grammar)).size >= 2, `as ${proj.meta.compositionIR.length} composições de um set usam gramáticas diferentes (${proj.meta.compositionIR.map(c => c.grammar).join(', ')})`, '');

  /* 5) envelope das cinco fases: fecha o loop e muda a escala */
  const env = JSON.parse(await E(`(() => { const A = AIVJ, proj = ${JSON.stringify(proj)}; let L = null, ci = 0; for (const [k, c] of proj.compositions.entries()) { const h = c.layers.find(l => /^HER/.test(l.name) && ['tunnel', 'shape', 'organism'].includes(l.type)); if (h) { L = h; ci = k; break; } }
    if (!L) return JSON.stringify({ none: true }); const at = lph => A.applyMods(Object.assign({ sx: L.p.sx, sy: L.p.sy, contrast: 1, speed: 1, rot: 0, count: L.p.count || 0 }, L.p), L, { lph, bands: {} }).sx;
    return JSON.stringify({ ci, mods: L.mod.map(m => m.k + ':' + m.shape).join(), v0: at(0), v1: at(0.999999), mid: at(0.62), early: at(0.1) }); })()`));
  if (env.none) ok('(nenhum herói posicionável neste projeto; envelope conferido nos dados)');
  else check(env.mods.includes('sx:env') && Math.abs(env.v0 - env.v1) < 1e-3 && Math.abs(env.mid - env.early) > 0.02, `o envelope de fases fecha o loop (escala ${env.v0.toFixed(3)} no início e ${env.v1.toFixed(3)} no fim) e a escala muda ao longo do loop (${env.early.toFixed(2)} → ${env.mid.toFixed(2)})`, JSON.stringify(env));

  /* 6) só se aplica quando o Creative IR conduz */
  const mood = await build(base({ concept: 'Neutral piece with nothing to match.', mood: ['industrial'], surface: S(1920, 1080, 'screen') }));
  const heroM = mood.compositions[0].layers.find(l => /^HER/.test(l.name));
  check(mood.meta.compositionIR.length === 3 && !('x' in heroM.p) && !(heroM.mod || []).some(m => m.shape === 'env'), 'sem conceito reconhecido o Composition IR é só registrado: nenhuma camada é movida', JSON.stringify(heroM.p).slice(0, 120));

  /* 7) projetos válidos e que desenham */
  for (const [sn, sf] of [['ultrawide', surfaces['ultrawide 4500x800']], ['vertical', surfaces['vertical 1080x1920']], ['16:9', surfaces['16:9 1920x1080']]]) {
    const pr = await build(base({ surface: sf })), f = join(tmp, 'v' + sn.replace(/\W/g, '') + '.json'); writeFileSync(f, JSON.stringify(pr));
    let r = 0, out = ''; try { execFileSync('python', [join(HERE, 'validate_project.py'), f], { stdio: 'pipe' }); } catch (e) { r = e.status; out = String(e.stdout); }
    const draw = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(pr))}); AIVJ.GLERR.clear(); let lit = 0; for (const ci of [0, 1, 2]) { const d = AIVJ.renderFrame(ci, 20, 0.05, true).data; for (let i = 0; i < d.length; i += 4) lit += d[i] + d[i + 1] + d[i + 2]; } return JSON.stringify({ lit, errs: AIVJ.layerErrors(), gl: [...AIVJ.GLERR.values()] }); })()`));
    check(r === 0 && draw.lit > 0 && !draw.errs.length && !draw.gl.length, `projeto ${sn}: passa no validador (inclui o envelope env), desenha as 3 composições sem erro`, out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | ') + JSON.stringify(draw).slice(0, 160));
  }
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nComposition IR ok.');
process.exit(fail ? 1 : 0);
