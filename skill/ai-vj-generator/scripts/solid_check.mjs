#!/usr/bin/env node
// Teste do 3D generativo (fase 12): a camada `solid` (8 formas, 3 materiais, câmera em órbita).
// Cada forma compila e desenha algo diferente; o mesmo quadro sai igual duas vezes; o loop fecha; o tempo só entra pelas voltas declaradas (controle: órbita 0 e voltas 0 = imagem parada);
// a órbita é em voltas inteiras (resposta conhecida: com 2 voltas por loop, a meio do loop a câmera está de volta ao ponto de partida; com 1 volta está do lado oposto);
// materiais, tamanho e elevação mudam a imagem; o modo alfa deixa o fundo transparente; o conceito escolhe a forma; o gerador Python = o do navegador; o código não usa relógio nem acaso.
//   node solid_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-solid-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.SOLID)' });
const E = s => page.evaluate(s);
await E(`(() => { window.T12 = (() => { const A = AIVJ, W = 160, H = 90;
  const bg = { type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: {} };
  const proj = (layers, noBg) => ({ schema: 'ai-vj-generator/2', id: 't', seed: 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#808080', accent: '#FFFFFF' }, compositions: [{ name: 'A', hypothesis: 'x', layers: (noBg ? [] : [bg]).concat(layers) }] });
  const L = (p, temporal) => ({ type: 'solid', name: 'X', on: true, opacity: 1, blend: 'normal', temporal: temporal || { behavior: 'still', listens: [], reason: 'teste: a camada não ouve o áudio, só a órbita e as voltas declaradas movem' }, p: Object.assign({ alphaMode: 'opaque', res: 1 }, p) });
  const load = P => { A.importJson(JSON.stringify(P)); A.GLERR.clear(); };
  const frame = (n, alpha) => A.renderFrame(0, n, 1, !!alpha);
  const sum = im => { const d = im.data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return s; };
  const hash = im => { const d = im.data; let h = 0; for (let i = 0; i < d.length; i += 4) h = (h * 31 + d[i] + d[i + 1] * 3 + d[i + 2] * 7) % 1000003; return h; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); return s / (a.data.length / 4) / 3; };
  return { A, L, load, frame, sum, hash, diff, proj }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, L, load, frame, sum, hash, diff, proj } = T12; ${s} })()`));
try {
  const KINDS = JSON.parse(await E('JSON.stringify(Object.keys(AIVJ.SOLID.SOL))'));
  /* 1) a camada existe: 8 formas e 3 materiais */
  const R = JSON.parse(await E(`JSON.stringify({ g: !!AIVJ.GEN.solid, k: AIVJ.GEN.solid.params.find(d => d.k === 'kind').opts.length, m: AIVJ.GEN.solid.params.find(d => d.k === 'material').opts })`));
  check(R.g && R.k === 8 && R.m.length === 3, `o motor tem a camada solid (${R.k} formas; materiais ${R.m.join(', ')})`, JSON.stringify(R));

  /* 2) cada forma compila, desenha e é diferente das outras; o mesmo quadro sai igual duas vezes */
  const draws = await J(`const out = {}; for (const k of ${JSON.stringify(KINDS)}) { load(proj([L({ kind: k })])); const a = frame(9), b = frame(9); out[k] = { s: sum(a), h: hash(a), same: diff(a, b), errs: A.layerErrors(), gl: [...A.GLERR.values()].map(x => String(x).slice(0, 160)) }; } return JSON.stringify(out);`);
  const hs = KINDS.map(k => draws[k].h);
  check(KINDS.every(k => draws[k].s > 3000 && !draws[k].errs.length && !draws[k].gl.length), `as ${KINDS.length} formas compilam e desenham (nenhum quadro em branco, nenhum erro de shader)`, KINDS.filter(k => draws[k].s <= 3000 || draws[k].errs.length || draws[k].gl.length).map(k => k + ' ' + JSON.stringify(draws[k].gl)).join(' | '));
  check(new Set(hs).size === KINDS.length, `as ${KINDS.length} formas dão ${KINDS.length} imagens diferentes`, 'repetidas: ' + KINDS.filter((k, i) => hs.indexOf(hs[i]) !== i).join(','));
  check(KINDS.every(k => draws[k].same === 0), 'o mesmo quadro sai idêntico duas vezes (determinístico)', KINDS.filter(k => draws[k].same).join(','));

  /* 3) o loop fecha e a câmera anda; controle negativo: sem órbita e sem voltas nada se mexe (o tempo só entra pelas voltas declaradas) */
  const loop = await J(`const LF = A.loopFrames(), out = {}; for (const k of ${JSON.stringify(KINDS)}) for (const orb of [1, 2]) { load(proj([L({ kind: k, orbit: orb })])); const a = frame(0), b = frame(LF), c = frame(Math.round(LF * 0.4)); out[k + orb] = { close: diff(a, b), move: diff(a, c) }; }
    load(proj([L({ kind: 'ESFERA', orbit: 0, p4: 0 })])); const s0 = frame(0), s1 = frame(Math.round(LF * 0.4)); return JSON.stringify({ LF, out, still: diff(s0, s1) });`);
  const names = Object.keys(loop.out), notClosed = names.filter(k => loop.out[k].close > 0.6), still = names.filter(k => loop.out[k].move < 0.4);
  check(!notClosed.length, `o loop fecha nas ${names.length} combinações forma x órbita (o quadro ${loop.LF} é o quadro 0, diferença média abaixo de 0,6 em 255)`, notClosed.map(k => k + ' ' + loop.out[k].close.toFixed(2)).join(' '));
  check(!still.length, 'todas andam ao longo do loop (o quadro a 40% difere do quadro 0)', still.map(k => k + ' ' + loop.out[k].move.toFixed(2)).join(' '));
  check(loop.still === 0, 'controle negativo: órbita 0 e deformação 0 dão imagem parada (nenhum relógio escondido)', 'diferença ' + loop.still);

  /* 4) a órbita é em voltas inteiras: com 2 voltas a meio do loop a câmera volta ao ponto de partida; com 1 volta fica do lado oposto */
  const orb = await J(`const half = Math.round(A.loopFrames() / 2); load(proj([L({ kind: 'CRISTAIS', orbit: 2, p4: 0, p3: 0.55 })])); const a2 = frame(0), b2 = frame(half); load(proj([L({ kind: 'CRISTAIS', orbit: 1, p4: 0 })])); const a1 = frame(0), b1 = frame(half); return JSON.stringify({ two: diff(a2, b2), one: diff(a1, b1) });`);
  check(orb.two < 0.6 && orb.one > 2, `órbita em voltas inteiras: a meio do loop, 2 voltas voltam ao início (diferença ${orb.two.toFixed(2)}) e 1 volta fica do lado oposto (${orb.one.toFixed(1)})`, JSON.stringify(orb));

  /* 5) material, tamanho, elevação e luz mudam a imagem do jeito certo */
  const look = await J(`const o = {}; const f = p => { load(proj([L(Object.assign({ kind: 'ESFERA', orbit: 0 }, p))])); return frame(9); };
    const m0 = f({ material: 'fosco' }), m1 = f({ material: 'metal' }), m2 = f({ material: 'vidro' }); o.mat = [diff(m0, m1), diff(m0, m2), diff(m1, m2)];
    o.size = [sum(f({ size: 0.5 })), sum(f({ size: 1 })), sum(f({ size: 1.8 }))]; o.elev = diff(f({ elev: 10, kind: 'TORO' }), f({ elev: 65, kind: 'TORO' })); o.light = diff(f({ light: 0 }), f({ light: 150 }));
    o.fog = [sum(f({ fog: 0, kind: 'ONDAS' })), sum(f({ fog: 2, kind: 'ONDAS' }))]; return JSON.stringify(o);`);
  check(look.mat.every(d => d > 1), `os três materiais dão imagens diferentes (diferenças ${look.mat.map(d => d.toFixed(1)).join(', ')})`, JSON.stringify(look.mat));
  check(look.size[0] < look.size[1] && look.size[1] < look.size[2], 'tamanho: quanto maior o sólido, mais pixels acesos (0,5 < 1 < 1,8)', JSON.stringify(look.size));
  check(look.elev > 2 && look.light > 1, `elevação e luz mudam a imagem (${look.elev.toFixed(1)}, ${look.light.toFixed(1)})`, JSON.stringify([look.elev, look.light]));
  check(look.fog[1] < look.fog[0], 'névoa: o que está longe escurece (a onda com névoa 2 é mais escura que sem névoa)', JSON.stringify(look.fog));

  /* 6) modo alfa: fundo transparente fora da forma, opaco dentro */
  const al = await J(`load(proj([L({ kind: 'ESFERA', alphaMode: 'alpha', size: 0.8 })], true)); const im = frame(9, true), w = im.width, h = im.height, a = (x, y) => im.data[(y * w + x) * 4 + 3]; return JSON.stringify({ corner: a(1, 1), centre: a(w >> 1, h >> 1), w, h });`);
  check(al.corner === 0 && al.centre > 200, `alfa: fora da forma a transparência é total (${al.corner}) e no centro a forma é opaca (${al.centre})`, JSON.stringify(al));

  /* 7) o código não usa relógio nem acaso (controle negativo: a mesma regex acusa um trecho com relógio) */
  const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'solid.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const clock = /Date\.now|performance\.now|Math\.random|new Date|requestAnimationFrame/;
  check(!clock.test(src) && clock.test('const t = Date.now();') && clock.test('x = Math.random()'), 'solid.js não usa Date.now, performance.now, Math.random nem requestAnimationFrame (e a regex acusa um trecho que usa)', 'achou relógio ou acaso');

  /* 8) o conceito escolhe a forma; Python = navegador; a animação toca em size */
  const briefs = [
    { name: 'Solido', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['morph', 'fold', 'bloom'], mood: ['cosmic'], energy: 0.5, surface: { type: 'screen', w: 1920, h: 1080, fps: 30 }, time: { bpm: 120, bars: 4 }, compositions: 3, text: { title: 'ORBITA' } },
    { name: 'Colunas', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['rise', 'orbit', 'fold'], mood: ['urban'], energy: 0.6, surface: { type: 'led', w: 4500, h: 800, fps: 30 }, time: { bpm: 124, bars: 4 }, compositions: 3, text: { title: 'TORRE' } },
  ];
  const buildJs = b => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(b)}))`).then(JSON.parse);
  const dif = (a, b, path = '$') => { if (a === b) return null; if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: py=${JSON.stringify(a)} js=${JSON.stringify(b)}`; if (Array.isArray(a) !== Array.isArray(b)) return `${path}: tipo diferente`;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!(k in a)) return `${path}.${k}: só no JS`; if (!(k in b)) return `${path}.${k}: só no Python`; const d = dif(a[k], b[k], `${path}.${k}`); if (d) return d; } return null; };
  let parOk = 0; const parBad = [], solids = [], builtJs = [];
  for (const [i, b] of briefs.entries()) {
    const js = await buildJs(b), f = join(tmp, `b${i}.json`), o = join(tmp, `o${i}.json`); writeFileSync(f, JSON.stringify(b)); execFileSync('python', [join(HERE, 'brief_to_project.py'), f, '--out', o], { stdio: 'pipe' });
    const py = JSON.parse(readFileSync(o, 'utf8')); builtJs.push(js);
    { const d = dif(py, JSON.parse(JSON.stringify(js))); if (!d) parOk++; else parBad.push(b.name + ' ' + d); }
    for (const c of js.compositions) for (const l of c.layers) if (l.type === 'solid' && /^HER/.test(l.name)) solids.push(l);
  }
  check(parOk === briefs.length, `o projeto gerado no navegador é igual ao do Python nos ${briefs.length} briefings com herói solid`, parBad.join());
  check(solids.length >= 2 && solids.every(l => KINDS.includes(l.p.kind) && Array.isArray(l.mod) && l.mod.length > 0) && solids.some(l => l.mod.some(m => m.k === 'size')), `o conceito escolhe o sólido como herói (${solids.length} composições: ${solids.map(l => l.p.kind).join(', ')}) e o Animation IR o anima (size em pelo menos uma)`, JSON.stringify(solids.map(l => [l.p, (l.mod || []).map(m => m.k)])));

  /* 9) o projeto gerado passa no validador e desenha; controle negativo: tipo desconhecido é recusado */
  const g0 = builtJs[0], gf = join(tmp, 'g0.json'); writeFileSync(gf, JSON.stringify(g0));
  let code = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), gf], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { code = e.status; out = String(e.stdout); }
  const dr = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(g0))}); AIVJ.GLERR.clear(); let lit = 0; for (const ci of [0, 1, 2]) { const d = AIVJ.renderFrame(ci, 20, 0.05, true).data; for (let i = 0; i < d.length; i += 4) lit += d[i] + d[i + 1] + d[i + 2]; } return JSON.stringify({ lit, errs: AIVJ.layerErrors(), gl: [...AIVJ.GLERR.values()].map(x => String(x).slice(0, 160)) }); })()`));
  check(code === 0 && dr.lit > 0 && !dr.errs.length && !dr.gl.length, 'o projeto com herói solid passa no validador e desenha as 3 composições sem erro', out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | ') + JSON.stringify(dr).slice(0, 160));
  const mut = JSON.parse(JSON.stringify(g0)); mut.compositions.flatMap(c => c.layers).find(l => l.type === 'solid').type = 'solido-que-nao-existe'; writeFileSync(join(tmp, 'mut.json'), JSON.stringify(mut));
  let mcode = 0; try { execFileSync('python', [join(HERE, 'validate_project.py'), join(tmp, 'mut.json')], { stdio: 'pipe' }); } catch (e) { mcode = e.status; }
  check(mcode !== 0, 'controle negativo: o validador recusa um tipo de camada que não existe (o enum do esquema inclui solid)', 'aceitou');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nSólido 3D ok.');
process.exit(fail ? 1 : 0);
