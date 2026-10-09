#!/usr/bin/env node
// Teste do Animation IR (fase 7): Python = navegador (IR e aplicação nas camadas); o conceito escolhe o arquétipo; os mesmos geradores com outro arquétipo se movem de outro jeito;
// o loop é periódico (e contínuo, salvo o "drop" declarado do surge); atrasos em semicolcheias; antecipação e assentamento medidos; eventos na grade de batidas;
// só se aplica quando o Creative IR conduz; aplicar duas vezes não empilha; o validador recusa IR quebrado; os projetos desenham e são determinísticos.
//   node animation_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-anim-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const S = (w, h, type = 'led', fps = 30) => ({ type, w, h, fps });
const base = over => Object.assign({ name: 'Teste Anim', lang: 'pt', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], energy: 0.5, surface: S(4500, 800), time: { bpm: 110, bars: 4 }, compositions: 3 }, over);
const concepts = { pressao: 'Pressão contida, tensão e compressão sem saída.', fluxo: 'A fluid river of flow, drift and echo.', quebra: 'Quebra e fratura: uma ruptura e caos.', surge: 'Algo que surge do vazio e floresce.', neutro: 'Neutral piece with nothing to match.' };
const ARCH = JSON.parse(readFileSync(join(HERE, '..', 'registry', 'animation.json'), 'utf8')).archetypeOrder;
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.ANIMATION)' });
const E = s => page.evaluate(s);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const jsA = (brief, i) => E(`(() => { const b = ${JSON.stringify(brief)}, ir = AIVJ.CREATIVE.compile(b); return JSON.stringify(AIVJ.ANIMATION.compile(b, ir, AIVJ.COMPOSITION.compile(b, ir, ${i}), ${i})); })()`).then(JSON.parse);
const pyA = (brief, i, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(brief)); return JSON.parse(execFileSync('python', [join(HERE, 'animation_ir.py'), f, String(i)], { encoding: 'utf8' })); };
const build = brief => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`).then(JSON.parse);
const mk = (hero, st) => [{ type: 'bg', name: 'FUNDO', role: 'ground colour of the piece' }, { type: 'shader', name: 'CAMPO X', role: 'ground field: slow matter', p: {} }, { type: 'shader', name: 'ATMOSFERA I', role: 'atmosphere: a second field', p: {} },
  { type: hero, name: 'HERÓI X', role: 'hero: the figure', p: {} }, { type: st, name: 'ESTRUTURA I', role: 'structure: the grid', p: {} }, { type: 'instrument', name: 'INSTRUMENTO I', p: {} }, { type: 'typeset', name: 'TIPOGRAFIA I', p: {} }];
const pyApply = (brief, layers, name) => {
  const bf = join(tmp, name + '-b.json'), lf = join(tmp, name + '-l.json'), sc = join(tmp, name + '.py'); writeFileSync(bf, JSON.stringify(brief)); writeFileSync(lf, JSON.stringify(layers));
  writeFileSync(sc, `import sys, json\nsys.path.insert(0, ${JSON.stringify(HERE)})\nimport animation_ir as a, creative_ir as c, composition_ir as k\nb = json.load(open(sys.argv[1], encoding='utf-8')); layers = json.load(open(sys.argv[2], encoding='utf-8'))\nir = c.compile_ir(b); cmp = k.compile_composition(b, ir, 0); an = a.compile_animation(b, ir, cmp, 0)\na.apply_animation(layers, an); sys.stdout.reconfigure(encoding='utf-8'); print(json.dumps(layers, ensure_ascii=False))\n`);
  return JSON.parse(execFileSync('python', [sc, bf, lf], { encoding: 'utf8' }));
};
const jsApply = (brief, layers) => E(`(() => { const b = ${JSON.stringify(brief)}, ir = AIVJ.CREATIVE.compile(b), L = ${JSON.stringify(layers)}; AIVJ.ANIMATION.apply(L, AIVJ.ANIMATION.compile(b, ir, AIVJ.COMPOSITION.compile(b, ir, 0), 0)); return JSON.stringify(L); })()`).then(JSON.parse);
/* a pose = o valor de um parâmetro de uma camada em fases do loop (applyMods é o que o motor usa; layerFrame soma p.phase à fase, aqui também) */
const pose = (layer, key, def, phases) => E(`(() => { const L = ${JSON.stringify(layer)}; return JSON.stringify(${JSON.stringify(phases)}.map(lph => AIVJ.applyMods(Object.assign({ ${key}: ${def} }, L.p), L, { lph: lph + (L.p.phase || 0), bands: {} })[${JSON.stringify(key)}])); })()`).then(JSON.parse);
try {
  /* 1) paridade Python = navegador: o IR */
  let par = 0, tot = 0; const parBad = [];
  const times = [{ bpm: 110, bars: 4 }, { bpm: 128, bars: 1 }, { bpm: 90, bars: 8 }, { bpm: 140, bars: 2 }];
  for (const [ci, c] of Object.values(concepts).entries()) for (const i of [0, 1, 2]) {
    const tm = times[(ci + i) % 4], b = base({ concept: c, mood: ci % 2 ? ['calm'] : ['glitch'], time: tm, surface: S(1920, 1080, 'screen', [24, 30, 60][i]) }); tot++;
    if (same(pyA(b, i, 'a' + tot), await jsA(b, i))) par++; else parBad.push(ci + '/' + i);
  }
  for (const a of ARCH) { const b = base({ motionArchetype: a }); tot++; if (same(pyA(b, 0, 'f' + tot), await jsA(b, 0))) par++; else parBad.push('forçado ' + a); }
  check(!parBad.length, `o Animation IR do Python é igual ao do navegador em ${par}/${tot} casos (5 conceitos, 4 relógios, 3 fps, os 8 arquétipos forçados)`, parBad.join(' '));

  /* 2) paridade da aplicação nas camadas, para cada arquétipo e dois pares de geradores */
  const appBad = []; let appN = 0;
  for (const a of ARCH) for (const [h, s] of [['tunnel', 'lines'], ['shape', 'tunnel'], ['organism', 'shape'], ['lines', 'lines']]) {
    const b = base({ motionArchetype: a, time: { bpm: 120, bars: 4 } }); appN++;
    const jsL = await jsApply(b, mk(h, s)), pyL = pyApply(b, mk(h, s), 'ap' + appN);
    if (!same(JSON.parse(JSON.stringify(jsL)), pyL)) appBad.push(`${a}/${h}/${s}`);
  }
  check(!appBad.length, `aplicar o IR nas camadas dá o mesmo resultado no Python e no navegador (${appN} combinações de arquétipo e geradores)`, appBad.join(' '));

  /* 3) o conceito escolhe o arquétipo */
  const first = {}; for (const [k, c] of Object.entries(concepts)) first[k] = (await jsA(base({ concept: c }), 0)).archetypeSet;
  check(first.fluxo[0] === 'glide' && first.quebra[0] === 'stutter' && first.surge[0] === 'settle' && ['surge', 'pulse'].includes(first.pressao[0]), `o conceito vota no arquétipo: fluxo ${first.fluxo[0]}, quebra ${first.quebra[0]}, surgir ${first.surge[0]}, pressão ${first.pressao[0]}`, JSON.stringify(first));
  check(new Set(Object.values(first).map(s => s[0])).size >= 4, 'cinco conceitos dão pelo menos quatro arquétipos principais diferentes', JSON.stringify(first));
  const proj = await build(base({ surface: S(1920, 1080, 'screen') }));
  check(new Set(proj.meta.animationIR.map(a => a.archetype)).size >= 2 && proj.meta.animationIR.length === 3, `as 3 composições de um set se movem de modos diferentes (${proj.meta.animationIR.map(a => a.archetype).join(', ')})`, '');
  const neutral = await jsA(base({ concept: concepts.neutro, mood: [] }), 0);
  check(neutral.archetypeSet.length === 1 && ['stutter', 'pulse', 'breathe'].includes(neutral.archetype), `sem verbos os eixos escolhem o arquétipo (${neutral.archetype})`, JSON.stringify(neutral.archetypeSet));

  /* 4) os mesmos geradores, arquétipo diferente: movimento diferente */
  const phs = Array.from({ length: 16 }, (_, k) => k / 16 + 0.013);
  const poses = {};
  for (const a of ['pulse', 'breathe', 'surge', 'stutter']) { const L = await jsApply(base({ motionArchetype: a }), mk('tunnel', 'lines')), hero = L[3]; poses[a] = await pose(hero, 'size', 1, phs); poses[a + '_t'] = L.map(l => l.type).join(); }
  const dist = (x, y) => Math.max(...x.map((v, i) => Math.abs(v - y[i])));
  const pairs = [['pulse', 'breathe'], ['pulse', 'surge'], ['pulse', 'stutter'], ['breathe', 'surge'], ['breathe', 'stutter'], ['surge', 'stutter']], close = pairs.filter(([a, b]) => dist(poses[a], poses[b]) < 0.02);
  check(!close.length && new Set(['pulse', 'breathe', 'surge', 'stutter'].map(a => poses[a + '_t'])).size === 1, 'os mesmos geradores com 4 arquétipos fazem 4 movimentos diferentes do mesmo parâmetro (tipos de camada iguais)', close.map(p => p.join('~')).join(' '));

  /* 5) o loop: periódico em todos; contínuo em todos menos no drop declarado do surge; a rotação do orbit fecha em volta inteira */
  const loopBad = [];
  for (const a of ARCH) {
    const L = await jsApply(base({ motionArchetype: a }), mk('tunnel', 'lines')), H = L[3], St = L[4];
    for (const [lay, key, def] of [[H, a === 'orbit' ? 'rot' : 'size', a === 'orbit' ? 0 : 1], [St, a === 'orbit' ? 'rot' : 'weight', a === 'orbit' ? 0 : 2]]) {
      const at = await pose(lay, key, def, [0.07, 0.31, 0.58, 0.9, 1.07, 1.31, 1.58, 1.9, 0, 0.9999999]), per = [0, 1, 2, 3].every(k => Math.abs(at[k] - at[k + 4]) < 1e-6);
      const mod = key === 'rot' ? ((at[9] - at[8]) % 360 + 360) % 360 : at[9] - at[8], sp = (await jsA(base({ motionArchetype: a }), 0)).spring, tol = key === 'rot' ? 0.01 : 0.01 + sp.amp * sp.depth,
        cont = key === 'rot' ? Math.min(mod, 360 - mod) < tol : Math.abs(mod) < tol; /* a mola em degraus segura o mergulho da antecipação até o golpe: o salto permitido é a profundidade dele */
      if (!per) loopBad.push(`${a}/${key} não é periódico`);
      if (!cont && a !== 'surge') loopBad.push(`${a}/${key} salta ${mod.toFixed(3)} no fim do loop`);
    }
  }
  check(!loopBad.length, 'em todos os 8 arquétipos o movimento do herói e da estrutura se repete a cada loop e emenda sem salto (o surge cai de propósito no fim de cada compasso)', loopBad.join(' | '));
  const sg = await pose((await jsApply(base({ motionArchetype: 'surge' }), mk('tunnel', 'lines')))[3], 'size', 1, [0, 0.2499, 0.2501]);
  check(sg[1] > sg[0] + 0.1 && sg[2] < sg[1] - 0.1, `o surge sobe durante o compasso (${sg[0].toFixed(2)} → ${sg[1].toFixed(2)}) e cai no fim dele (${sg[2].toFixed(2)})`, JSON.stringify(sg));

  /* 6) atraso em semicolcheias */
  const lagBase = base({ motionArchetype: 'pulse', time: { bpm: 120, bars: 4 } }), irP = await jsA(lagBase, 0), LP = await jsApply(lagBase, mk('tunnel', 'lines'));
  const lagSt = LP[4].p.phase, lagGr = LP[1].p.phase;
  check(Math.abs(lagSt - irP.hierarchy.structure.lag.steps / 64) < 1e-4 && Math.abs(lagGr - irP.hierarchy.ground.lag.steps / 64) < 1e-4 && lagSt > 0 && lagGr > lagSt && LP[3].p.phase === undefined, `o pulse atrasa a estrutura ${irP.hierarchy.structure.lag.steps} semicolcheia e o chão ${irP.hierarchy.ground.lag.steps} (p.phase ${lagSt} e ${lagGr}); o herói não atrasa`, JSON.stringify([lagSt, lagGr, irP.hierarchy]));
  const noLag = JSON.parse(JSON.stringify(LP[4])); delete noLag.p.phase;
  const near = [0.002, 0.004, 0.008, 0.016], withL = await pose(LP[4], 'weight', 2, near), without = await pose(noLag, 'weight', 2, near), dl = Math.max(...withL.map((v, k) => Math.abs(v - without[k])));
  check(dl > 0.005, `o atraso muda a pose da estrutura nos mesmos instantes (diferença até ${dl.toFixed(3)})`, JSON.stringify([withL, without]));
  const st = await jsA(base({ motionArchetype: 'stutter' }), 0), LS = await jsApply(base({ motionArchetype: 'stutter' }), mk('tunnel', 'lines'));
  check(LS[4].p.phase === undefined && LS[1].p.phase === undefined && st.spring.steps === 6 && st.spring.overshoot === 0 && st.easing.id === 'steps', 'o stutter move tudo junto (sem atraso), em 6 degraus por ciclo e sem oscilar', JSON.stringify(st.spring));
  const orb = await jsApply(base({ motionArchetype: 'orbit' }), mk('tunnel', 'lines')), rotH = orb[3].mod.find(m => m.k === 'rot'), rotS = orb[4].mod.find(m => m.k === 'rot');
  check(rotH && rotS && rotH.max === 360 && rotS.max === -360 && rotH.cycles === 1, 'o orbit gira o herói uma volta por loop e a estrutura gira ao contrário', JSON.stringify([rotH, rotS]));

  /* 7) antecipação e assentamento medidos */
  const anim = JSON.parse(await E(`(() => { const b = ${JSON.stringify(base({ motionArchetype: 'pulse' }))}, ir = AIVJ.CREATIVE.compile(b), cmp = AIVJ.COMPOSITION.compile(b, ir, 0), ax = Object.assign({}, ir.motion.axes, { anticipation: 1, elasticity: 0.6 }), an = AIVJ.ANIMATION.compile(b, ir, cmp, 0, ax), s = an.spring;
    const dip = AIVJ.motionCurve(1 - s.ta * 0.5, s.zeta, s.wn, s.ta, s.depth, s.steps), peak = Math.max(...Array.from({ length: 200 }, (_, k) => AIVJ.motionCurve(k / 200, s.zeta, s.wn, s.ta, s.depth, s.steps))), late = AIVJ.motionCurve(an.settle.fraction + 0.02, s.zeta, s.wn, 0, 0, 0);
    return JSON.stringify({ ta: s.ta, depth: s.depth, dip, peak, settle: an.settle, frames: an.anticipation.frames, fpc: an.timing.framesPerCycle, late }); })()`));
  check(anim.ta > 0 && anim.dip < -0.01 && anim.peak > 0.9 && anim.frames > 0 && Math.abs(anim.frames - anim.ta * anim.fpc) < 0.01, `antecipação: a curva mergulha (${anim.dip.toFixed(3)}) antes do golpe, que chega a ${anim.peak.toFixed(2)}; dura ${anim.frames} quadros`, JSON.stringify(anim));
  check(anim.settle.fraction > 0 && anim.settle.fraction <= 1 && Math.abs(anim.late) < 0.1 && anim.settle.frames > 0, `assentamento: depois de ${anim.settle.frames} quadros (${anim.settle.fraction} do ciclo) a mola está a ${Math.abs(anim.late).toFixed(3)} do repouso`, JSON.stringify(anim.settle) + anim.late);

  /* 8) eventos na grade de batidas e relógio */
  const ev = await jsA(base({ time: { bpm: 100, bars: 2 }, surface: S(1920, 1080, 'screen', 60) }), 0), t = ev.timing;
  check(ev.events.length === 5 && ev.events.every((e, k) => Number.isInteger(e.beat) && Math.abs(e.at * 8 - e.beat) < 1e-3 && (k === 0 || e.beat >= ev.events[k - 1].beat) && e.beat < 8), `os 5 eventos caem em batidas inteiras do loop de 2 compassos (batidas ${ev.events.map(e => e.beat).join(', ')})`, JSON.stringify(ev.events));
  check(t.loopFrames === 288 && t.cyclesPerLoop === ev.spring.cycles && Math.abs(t.framesPerCycle * t.cyclesPerLoop - t.loopFrames) < 0.01 * t.cyclesPerLoop, `2 compassos a 100 bpm e 60 fps são ${t.loopFrames} quadros; ${t.cyclesPerLoop} ciclos de ${t.framesPerCycle} quadros`, JSON.stringify(t));

  /* 9) só se aplica quando o Creative IR conduz; aplicar duas vezes não empilha */
  const mood = await build(base({ concept: concepts.neutro, mood: ['industrial'], surface: S(1920, 1080, 'screen') })), hm = mood.compositions[0].layers;
  check(mood.meta.animationIR.length === 3 && hm.every(l => !l.p || l.p.phase === undefined) && hm.find(l => /^HER/.test(l.name)).mod.every(m => m.shape === 'spring'), 'sem conceito reconhecido o Animation IR é só registrado: o herói mantém a mola do humor e nenhum atraso é gravado', JSON.stringify(hm.find(l => /^HER/.test(l.name)).mod).slice(0, 160));
  const twice = await E(`(() => { const b = ${JSON.stringify(base({ motionArchetype: 'ripple' }))}, ir = AIVJ.CREATIVE.compile(b), L = ${JSON.stringify(mk('tunnel', 'lines'))}, an = AIVJ.ANIMATION.compile(b, ir, AIVJ.COMPOSITION.compile(b, ir, 0), 0); AIVJ.ANIMATION.apply(L, an); const once = JSON.stringify(L); AIVJ.ANIMATION.apply(L, an); return once === JSON.stringify(L); })()`);
  check(twice === true, 'aplicar o plano duas vezes dá o mesmo projeto (as curvas próprias são trocadas, não empilhadas)', '');
  const keep = await E(`(() => { const b = ${JSON.stringify(base({ motionArchetype: 'pulse' }))}, ir = AIVJ.CREATIVE.compile(b), L = ${JSON.stringify(mk('tunnel', 'lines'))}; L[3].mod = [{ k: 'sx', src: 'lfo', shape: 'env', cycles: 1, keys: [0, 1], min: 1, max: 1.2, mode: 'mul' }, { k: 'opacity', src: 'bass', min: 0.5, max: 1, mode: 'set' }, { k: 'size', src: 'lfo', shape: 'sin', cycles: 3, min: 1, max: 5, mode: 'mul' }];
    AIVJ.ANIMATION.apply(L, AIVJ.ANIMATION.compile(b, ir, AIVJ.COMPOSITION.compile(b, ir, 0), 0)); return JSON.stringify(L[3].mod.map(m => m.k + ':' + m.shape + ':' + m.cycles)); })()`).then(JSON.parse);
  check(keep.includes('sx:env:1') && keep.some(x => x.startsWith('opacity:')) && !keep.includes('size:sin:3') && keep.some(x => x.startsWith('size:spring')), 'o plano troca só a curva rítmica do parâmetro que conduz; a fase (env) e a modulação por áudio ficam', keep.join());

  /* 10) o validador aceita o que o gerador escreve e recusa IR quebrado (controle negativo) */
  const vv = (obj, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(obj)); let code = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { code = e.status; out = String(e.stdout); } return { code, out }; };
  const good = vv(proj, 'good');
  check(good.code === 0, 'o projeto gerado com animationIR passa no validador', good.out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | '));
  const breaks = { 'ciclos fracionários': p => { p.meta.animationIR[0].timing.cyclesPerLoop = 2.5; }, 'atraso fora do loop': p => { p.meta.animationIR[0].hierarchy.structure.lag.lag = 1.5; }, 'evento fora do loop': p => { p.meta.animationIR[0].events[3].beat = 99; }, 'loop que não fecha': p => { p.meta.animationIR[0].loop.closes = false; }, 'lista errada': p => { p.meta.animationIR = {}; } };
  const bb = Object.entries(breaks).filter(([n, f]) => { const p = JSON.parse(JSON.stringify(proj)); f(p); return vv(p, 'neg' + n.length).code === 0; }).map(([n]) => n);
  check(!bb.length, 'o validador recusa os 5 IR quebrados (ciclos fracionários, atraso, evento e loop fora do loop, lista errada)', 'aceitou: ' + bb.join(', '));

  /* 11) desenha, é determinístico e o arquétipo muda a imagem */
  const hashes = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(proj))}); AIVJ.GLERR.clear(); const h = (ci, f) => { const d = AIVJ.renderFrame(ci, f, f / 30, true).data; let s = 0; for (let i = 0; i < d.length; i += 4) s = (s * 31 + d[i] + 3 * d[i + 1] + 7 * d[i + 2]) % 1000003; return s; };
    const a = [0, 1, 2].map(ci => h(ci, 20)), b = [0, 1, 2].map(ci => h(ci, 20));
    const P = JSON.parse(JSON.stringify(AIVJ.project)); const alt = JSON.parse(JSON.stringify(P)); const bb = ${JSON.stringify(base({ surface: S(1920, 1080, 'screen') }))}; const ir = AIVJ.CREATIVE.compile(bb);
    const other = P.meta.animationIR[0].archetype === 'breathe' ? 'stutter' : 'breathe', an = AIVJ.ANIMATION.compile(Object.assign({}, bb, { motionArchetype: other }), ir, AIVJ.COMPOSITION.compile(bb, ir, 0), 0); AIVJ.ANIMATION.apply(P.compositions[0].layers, an);
    AIVJ.importJson(JSON.stringify(P)); const c = h(0, 37); AIVJ.importJson(JSON.stringify(alt)); const d = h(0, 37);
    return JSON.stringify({ a, b, c, d, errs: AIVJ.layerErrors(), gl: [...AIVJ.GLERR.values()] }); })()`));
  check(same(hashes.a, hashes.b) && hashes.a.every(x => x > 0) && !hashes.errs.length && !hashes.gl.length, 'o projeto desenha as 3 composições sem erro e o mesmo quadro sai igual duas vezes', JSON.stringify(hashes).slice(0, 200));
  check(hashes.c !== hashes.d, 'trocar só o arquétipo da composição troca a imagem de um quadro no meio do loop', JSON.stringify([hashes.c, hashes.d]));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nAnimation IR ok.');
process.exit(fail ? 1 : 0);
