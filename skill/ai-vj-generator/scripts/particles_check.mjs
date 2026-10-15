#!/usr/bin/env node
// Teste das partículas em GPU (fase 13): a camada `particles` (6 regras de movimento, sem estado entre quadros).
// Cada regra compila e desenha algo diferente; o mesmo quadro sai igual; pedir os quadros FORA DE ORDEM dá a mesma imagem (prova de que não há estado); o loop fecha;
// a quantidade, o tamanho do ponto, a mistura e a semente mudam a imagem do jeito certo; o modo alfa deixa o fundo transparente; a métrica conta as partículas; o código não usa relógio nem acaso.
//   node particles_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-prt-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.PARTICLES)' });
const E = s => page.evaluate(s);
await E(`(() => { window.T13 = (() => { const A = AIVJ, W = 192, H = 108;
  const bg = { type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: {} };
  const proj = (layers, noBg, seed) => ({ schema: 'ai-vj-generator/2', id: 't', seed: seed || 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#808080', accent: '#FFFFFF' }, compositions: [{ name: 'A', hypothesis: 'x', layers: (noBg ? [] : [bg]).concat(layers) }] });
  const L = (p, temporal) => ({ type: 'particles', name: 'X', on: true, opacity: 1, blend: 'normal', temporal: temporal || { behavior: 'still', listens: [], reason: 'teste: a camada não ouve o áudio, só o loop declarado move' }, p: Object.assign({ alphaMode: 'opaque', res: 1 }, p) });
  const load = P => { A.importJson(JSON.stringify(P)); A.GLERR.clear(); };
  const frame = (n, alpha) => A.renderFrame(0, n, 1, !!alpha);
  const sum = im => { const d = im.data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
  const hash = im => { const d = im.data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000003; return h; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); return s / (a.data.length / 4) / 3; };
  return { A, L, load, frame, sum, hash, diff, proj }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, L, load, frame, sum, hash, diff, proj } = T13; ${s} })()`));
try {
  const KINDS = JSON.parse(await E('JSON.stringify(Object.keys(AIVJ.PARTICLES.PRT))'));
  /* 1) a camada existe: 6 regras */
  const R = JSON.parse(await E(`JSON.stringify({ g: !!AIVJ.GEN.particles, k: AIVJ.GEN.particles.params.find(d => d.k === 'kind').opts.length, b: AIVJ.GEN.particles.params.find(d => d.k === 'blend').opts })`));
  check(R.g && R.k === 6 && R.b.length === 2, `o motor tem a camada particles (${R.k} regras; mistura ${R.b.join(', ')})`, JSON.stringify(R));

  /* 2) cada regra compila, desenha e é diferente das outras; o mesmo quadro sai igual duas vezes */
  const draws = await J(`const out = {}; for (const k of ${JSON.stringify(KINDS)}) { load(proj([L({ kind: k })])); const a = frame(9), b = frame(9); out[k] = { s: sum(a), h: hash(a), same: diff(a, b), errs: A.layerErrors(), gl: [...A.GLERR.values()].map(x => String(x).slice(0, 200)) }; } return JSON.stringify(out);`);
  const hs = KINDS.map(k => draws[k].h);
  check(KINDS.every(k => draws[k].s > 1500 && !draws[k].errs.length && !draws[k].gl.length), `as ${KINDS.length} regras compilam e desenham (nenhum quadro em branco, nenhum erro de shader)`, KINDS.filter(k => draws[k].s <= 1500 || draws[k].errs.length || draws[k].gl.length).map(k => k + ' ' + draws[k].s + ' ' + JSON.stringify(draws[k].gl)).join(' | '));
  check(new Set(hs).size === KINDS.length, `as ${KINDS.length} regras dão ${KINDS.length} imagens diferentes`, 'repetidas: ' + KINDS.filter((k, i) => hs.indexOf(hs[i]) !== i).join(','));
  check(KINDS.every(k => draws[k].same === 0), 'o mesmo quadro sai idêntico duas vezes (determinístico)', KINDS.filter(k => draws[k].same).join(','));

  /* 3) SEM ESTADO: pedir os quadros fora de ordem dá a mesma imagem que pedir em ordem (controle negativo: quadros diferentes diferem) */
  const ooo = await J(`const o = {}; for (const k of ${JSON.stringify(KINDS)}) { load(proj([L({ kind: k })])); const a20 = frame(20); frame(3); frame(27); frame(11); const b20 = frame(20); o[k] = { again: diff(a20, b20), other: diff(a20, frame(21)) }; } return JSON.stringify(o);`);
  check(KINDS.every(k => ooo[k].again === 0), 'sem estado entre quadros: o quadro 20 sai idêntico depois de pedir os quadros 3, 27 e 11 (nenhuma simulação acumulada)', KINDS.filter(k => ooo[k].again).join(','));
  check(KINDS.every(k => ooo[k].other > 0.02), 'controle negativo: o quadro 21 difere do 20 (o teste de ordem consegue falhar)', KINDS.filter(k => ooo[k].other <= 0.02).map(k => k + ' ' + ooo[k].other).join(','));

  /* 4) o loop fecha e anda; controle negativo: voltas 1 e 2 a meio do loop (a regra precisa de frequência inteira, então 2 voltas fecham a meio e 1 volta não) */
  const loop = await J(`const LF = A.loopFrames(), out = {}; for (const k of ${JSON.stringify(KINDS)}) { load(proj([L({ kind: k })])); const a = frame(0), b = frame(LF), c = frame(Math.round(LF * 0.4)); out[k] = { close: diff(a, b), move: diff(a, c) }; } return JSON.stringify({ LF, out });`);
  const names = Object.keys(loop.out), notClosed = names.filter(k => loop.out[k].close > 0.6), still = names.filter(k => loop.out[k].move < 0.15);
  check(!notClosed.length, `o loop fecha nas ${names.length} regras (o quadro ${loop.LF} é o quadro 0, diferença média abaixo de 0,6 em 255)`, notClosed.map(k => k + ' ' + loop.out[k].close.toFixed(2)).join(' '));
  check(!still.length, 'todas andam ao longo do loop (o quadro a 40% difere do quadro 0)', still.map(k => k + ' ' + loop.out[k].move.toFixed(2)).join(' '));
  const half = await J(`const h = Math.round(A.loopFrames() / 2); load(proj([L({ kind: 'ORBITA', p4: 2, p2: 1 })])); const a2 = frame(0), b2 = frame(h); load(proj([L({ kind: 'ORBITA', p4: 1, p2: 1 })])); const a1 = frame(0), b1 = frame(h); return JSON.stringify({ two: diff(a2, b2), one: diff(a1, b1) });`);
  check(half.one > 0.3 && half.two < 0.6 * 4, `controle: a meio do loop, 1 volta por loop está do lado oposto (${half.one.toFixed(2)}) e a mesma medida fecha no fim, não aqui`, JSON.stringify(half));

  /* 5) quantidade, tamanho do ponto, mistura, semente */
  const look = await J(`const o = {}; const f = (p, seed) => { load(proj([L(Object.assign({ kind: 'ESPIRAL', count: 3000, dot: 6 }, p))], false, seed)); return frame(9); };
    o.count = [sum(f({ count: 200 })), sum(f({ count: 2000 })), sum(f({ count: 15000 }))]; o.dot = [sum(f({ dot: 10 })), sum(f({ dot: 25 })), sum(f({ dot: 40 }))];
    o.blend = diff(f({ blend: 'soma' }), f({ blend: 'normal' })); o.seed = diff(f({}, 7), f({}, 8)); o.ext = [sum(f({ size: 0.4 })), sum(f({ size: 1 }))];
    o.soft = diff(f({ soft: 0.1 }), f({ soft: 1 })); return JSON.stringify(o);`);
  check(look.count[0] < look.count[1] && look.count[1] < look.count[2], `quantidade: mais partículas, mais pixels acesos (${look.count.map(Math.round).join(' < ')})`, JSON.stringify(look.count));
  check(look.dot[0] < look.dot[1] && look.dot[1] < look.dot[2], `tamanho do ponto: maior ponto, mais pixels acesos (${look.dot.map(Math.round).join(' < ')})`, JSON.stringify(look.dot));
  check(look.blend > 0.2 && look.seed > 0.2 && look.soft > 0.1, `mistura, semente e maciez mudam a imagem (${look.blend.toFixed(2)}, ${look.seed.toFixed(2)}, ${look.soft.toFixed(2)})`, JSON.stringify(look));
  check(look.ext[0] !== look.ext[1], 'a extensão muda a imagem', JSON.stringify(look.ext));

  /* 6) modo alfa: fundo transparente, partículas opacas; a métrica conta as partículas */
  const al = await J(`load(proj([L({ kind: 'ESPIRAL', alphaMode: 'alpha', count: 4000, dot: 8 })], true)); const im = frame(9, true), w = im.width, h = im.height; let corner = 0, lit = 0; for (let i = 0; i < im.data.length; i += 4) if (im.data[i + 3] > 40) lit++; corner = im.data[3];
    const m = A.glMetrics(); return JSON.stringify({ corner, lit, particles: m && m.activeParticles });`);
  check(al.corner === 0 && al.lit > 100, `alfa: o canto é transparente (${al.corner}) e há ${al.lit} pixels com partícula`, JSON.stringify(al));
  check(al.particles === 4000, `a métrica activeParticles conta as partículas do quadro (${al.particles})`, JSON.stringify(al));

  /* 7) o código não usa relógio nem acaso (controle negativo: a mesma regex acusa um trecho com relógio) */
  const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'particles.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const clock = /Date\.now|performance\.now|Math\.random|new Date|requestAnimationFrame/;
  check(!clock.test(src) && clock.test('const t = Date.now();') && clock.test('x = Math.random()'), 'particles.js não usa Date.now, performance.now, Math.random nem requestAnimationFrame (e a regex acusa um trecho que usa)', 'achou relógio ou acaso');
  check(!/\bsin\(\s*id\b|\bsin\(\s*float\(gl_VertexID/.test(src), 'o acaso por partícula é hash de inteiros, não sin() do índice (igual em qualquer placa)', 'achou sin do índice');

  /* 8) o conceito escolhe a regra; Python = navegador; a animação toca em size */
  const briefs = [
    { name: 'Poeira', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['scatter', 'dissolve', 'release'], mood: ['cosmic'], energy: 0.5, surface: { type: 'screen', w: 1920, h: 1080, fps: 30 }, time: { bpm: 120, bars: 4 }, compositions: 3, text: { title: 'POEIRA' } },
    { name: 'Fonte', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['rise', 'scatter', 'dissolve'], mood: ['organic'], energy: 0.6, surface: { type: 'led', w: 4500, h: 800, fps: 30 }, time: { bpm: 124, bars: 4 }, compositions: 3, text: { title: 'JATO' } },
  ];
  const buildJs = b => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(b)}))`).then(JSON.parse);
  const dif = (a, b, path = '$') => { if (a === b) return null; if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: py=${JSON.stringify(a)} js=${JSON.stringify(b)}`; if (Array.isArray(a) !== Array.isArray(b)) return `${path}: lista x objeto`;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!(k in a)) return `${path}.${k}: só no JS`; if (!(k in b)) return `${path}.${k}: só no Python`; const d = dif(a[k], b[k], `${path}.${k}`); if (d) return d; } return null; };
  let parOk = 0; const parBad = [], prts = [], builtJs = [];
  for (const [i, b] of briefs.entries()) {
    const js = await buildJs(b), f = join(tmp, `b${i}.json`), o = join(tmp, `o${i}.json`); writeFileSync(f, JSON.stringify(b)); execFileSync('python', [join(HERE, 'brief_to_project.py'), f, '--out', o], { stdio: 'pipe' });
    const py = JSON.parse(readFileSync(o, 'utf8')); builtJs.push(js);
    { const d = dif(py, JSON.parse(JSON.stringify(js))); if (!d) parOk++; else parBad.push(b.name + ' ' + d); }
    for (const c of js.compositions) for (const l of c.layers) if (l.type === 'particles' && /^HER/.test(l.name)) prts.push(l);
  }
  check(parOk === briefs.length, `o projeto gerado no navegador é igual ao do Python nos ${briefs.length} briefings`, parBad.join());
  check(prts.length >= 2 && prts.every(l => KINDS.includes(l.p.kind) && Array.isArray(l.mod) && l.mod.length > 0) && prts.some(l => l.mod.some(m => m.k === 'size')), `o conceito escolhe partículas como herói (${prts.length} composições: ${prts.map(l => l.p.kind).join(', ')}) e o Animation IR as anima (size em pelo menos uma)`, JSON.stringify(prts.map(l => [l.p, (l.mod || []).map(m => m.k)])));

  /* 9) o projeto gerado passa no validador e desenha; controle negativo: tipo desconhecido é recusado */
  const g0 = builtJs[0], gf = join(tmp, 'g0.json'); writeFileSync(gf, JSON.stringify(g0));
  let code = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), gf], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { code = e.status; out = String(e.stdout); }
  const dr = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(g0))}); AIVJ.GLERR.clear(); let lit = 0; for (const ci of [0, 1, 2]) { const d = AIVJ.renderFrame(ci, 20, 0.05, true).data; for (let i = 0; i < d.length; i += 4) lit += d[i + 3]; } return JSON.stringify({ lit, errs: AIVJ.layerErrors(), gl: [...AIVJ.GLERR.values()].map(x => String(x).slice(0, 160)) }); })()`));
  check(code === 0 && dr.lit > 0 && !dr.errs.length && !dr.gl.length, 'o projeto com herói de partículas passa no validador e desenha as 3 composições sem erro', out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | ') + JSON.stringify(dr).slice(0, 160));
  const mut = JSON.parse(JSON.stringify(g0)); mut.compositions.flatMap(c => c.layers).find(l => l.type === 'particles').type = 'particulas-que-nao-existe'; writeFileSync(join(tmp, 'mut.json'), JSON.stringify(mut));
  let mcode = 0; try { execFileSync('python', [join(HERE, 'validate_project.py'), join(tmp, 'mut.json')], { stdio: 'pipe' }); } catch (e) { mcode = e.status; }
  check(mcode !== 0, 'controle negativo: o validador recusa um tipo de camada que não existe (o enum do esquema inclui particles)', 'aceitou');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nPartículas ok.');
process.exit(fail ? 1 : 0);
