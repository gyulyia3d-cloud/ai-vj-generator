#!/usr/bin/env node
// Teste do 2D generativo avançado (fase 8): as camadas `field` (12 regras) e `glyphs` (5 campos).
// Cada regra compila e desenha algo diferente; o mesmo quadro sai igual duas vezes; o loop fecha; a imagem escolhida de fato conduz o desenho
// (resposta conhecida: metade esquerda branca e direita preta); a rampa e a inversão dos glifos fazem o que dizem; o conceito escolhe regra e campo;
// o gerador Python = o do navegador; a animação toca no parâmetro `gain`; uma imagem ausente é erro. Há controles negativos.
//   node field_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-field-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.FIELD)' });
const E = s => page.evaluate(s);
/* o ambiente do teste dentro da página: projeto pequeno, imagem de resposta conhecida, funções de medida */
await E(`(() => { window.T8 = (() => { const A = AIVJ, W = 160, H = 90;
  const split = document.createElement('canvas'); split.width = 160; split.height = 90; const sx = split.getContext('2d'); sx.fillStyle = '#000'; sx.fillRect(0, 0, 160, 90); sx.fillStyle = '#fff'; sx.fillRect(0, 0, 80, 90);
  const other = document.createElement('canvas'); other.width = 160; other.height = 90; const ox = other.getContext('2d'); ox.fillStyle = '#000'; ox.fillRect(0, 0, 160, 90); ox.fillStyle = '#fff'; ox.fillRect(0, 0, 160, 45);
  const assets = { dividida: { kind: 'image', data: split.toDataURL('image/png') }, topo: { kind: 'image', data: other.toDataURL('image/png') } };
  const bg = { type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: {} };
  const proj = (layers, extra) => Object.assign({ schema: 'ai-vj-generator/2', id: 't', seed: 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#404040', accent: '#FFFFFF' }, assets, compositions: [{ name: 'A', hypothesis: 'x', layers: [bg].concat(layers) }] }, extra || {});
  const L = (type, p) => ({ type, name: 'X', on: true, opacity: 1, blend: 'normal', p });
  const load = async P => { A.importJson(JSON.stringify(P)); await A.loadAssets(P); A.GLERR.clear(); };
  const frame = n => A.renderFrame(0, n, 1, false);
  const stats = im => { const d = im.data, w = im.width, h = im.height; let l = 0, r = 0, t = 0, b = 0, all = 0, hs = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const o = (y * w + x) * 4, v = d[o] + d[o + 1] + d[o + 2]; all += v; if (x < w / 2) l += v; else r += v; if (y < h / 2) t += v; else b += v; hs = (hs * 31 + v) % 1000003; } return { left: l, right: r, top: t, bottom: b, all, hash: hs }; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]) + Math.abs(a.data[i + 1] - b.data[i + 1]) + Math.abs(a.data[i + 2] - b.data[i + 2]); return s / (a.data.length / 4) / 3; };
  return { A, L, load, frame, stats, diff, proj }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, L, load, frame, stats, diff, proj } = T8; ${s} })()`));
try {
  const KINDS = JSON.parse(await E('JSON.stringify(Object.keys(AIVJ.FIELD.FLD))')), SRC = ['noise', 'radial', 'wave', 'spiral'];
  /* 1) as duas camadas existem e as 12 regras estão no motor */
  const R = JSON.parse(await E(`JSON.stringify({ f: !!AIVJ.GEN.field, g: !!AIVJ.GEN.glyphs, fk: AIVJ.GEN.field.params.find(d => d.k === 'kind').opts.length, gs: AIVJ.GEN.glyphs.params.find(d => d.k === 'source').opts })`));
  check(R.f && R.g && R.fk === 12 && R.gs.length === 5, `o motor tem a camada field (${R.fk} regras) e a camada glyphs (campos: ${R.gs.join(', ')})`, JSON.stringify(R));

  /* 2) cada regra compila, desenha algo e é diferente das outras; o mesmo quadro sai igual duas vezes */
  const draws = await J(`const out = {}; for (const k of ${JSON.stringify(KINDS)}) { await load(proj([L('field', { kind: k, alphaMode: 'opaque' })])); const a = frame(9), b = frame(9); out[k] = { s: stats(a), same: diff(a, b), errs: A.layerErrors(), gl: [...A.GLERR.values()].map(x => String(x).slice(0, 120)) }; } return JSON.stringify(out);`);
  const hs = KINDS.map(k => draws[k].s.hash);
  check(KINDS.every(k => draws[k].s.all > 2000 && !draws[k].errs.length && !draws[k].gl.length), `as ${KINDS.length} regras do campo compilam e desenham (nenhum quadro em branco, nenhum erro de shader)`, KINDS.filter(k => draws[k].s.all <= 2000 || draws[k].errs.length || draws[k].gl.length).join(','));
  check(new Set(hs).size === KINDS.length, 'as 12 regras dão 12 imagens diferentes', 'repetidas: ' + KINDS.filter((k, i) => hs.indexOf(hs[i]) !== i).join(','));
  check(KINDS.every(k => draws[k].same === 0), 'o mesmo quadro sai idêntico duas vezes (determinístico)', KINDS.filter(k => draws[k].same).join(','));

  /* 3) o loop fecha (campo e glifos) e o campo anda ao longo do loop */
  const loop = await J(`const out = {}; const LF = A.loopFrames(); const sets = ${JSON.stringify(KINDS)}.map(k => ['field', { kind: k, alphaMode: 'opaque' }]).concat(${JSON.stringify(SRC)}.map(s => ['glyphs', { source: s, cell: 12 }]));
    for (const [t, p] of sets) { await load(proj([L(t, p)])); const a = frame(0), b = frame(LF), c = frame(Math.round(LF * 0.4)); out[(p.kind || p.source)] = { close: diff(a, b), move: diff(a, c) }; } return JSON.stringify({ LF, out });`);
  const names = Object.keys(loop.out), notClosed = names.filter(k => loop.out[k].close > 0.6), still = names.filter(k => loop.out[k].move < 0.4);
  check(!notClosed.length, `o loop fecha nas ${names.length} (o quadro ${loop.LF} é o quadro 0, diferença média abaixo de 0,6 em 255)`, notClosed.map(k => k + ' ' + loop.out[k].close.toFixed(2)).join(' '));
  check(!still.length, 'todas andam ao longo do loop (o quadro a 40% difere do quadro 0)', still.map(k => k + ' ' + loop.out[k].move.toFixed(2)).join(' '));

  /* 4) imagem como fonte: resposta conhecida (esquerda branca, direita preta) */
  const img = await J(`const o = {}; for (const k of ['PONTILHADO', 'PONTOS', 'ISOLINHAS', 'METABOLAS', 'RELEVO', 'CELULAS']) { await load(proj([L('field', { kind: k, media: 'dividida', alphaMode: 'opaque' })])); const s = stats(frame(9)); await load(proj([L('field', { kind: k, alphaMode: 'opaque' })])); const n = stats(frame(9)); o[k] = { left: s.left, right: s.right, noiseLeft: n.left, noiseRight: n.right, errs: A.layerErrors().length }; }
    await load(proj([L('field', { kind: 'PONTILHADO', media: 'dividida', alphaMode: 'opaque' })])); const a = frame(9); await load(proj([L('field', { kind: 'PONTILHADO', media: 'topo', alphaMode: 'opaque' })])); const b = frame(9); o.otherImage = diff(a, b);
    await load(proj([L('field', { kind: 'PONTILHADO', media: 'dividida', invert: true, alphaMode: 'opaque' })])); const inv = stats(frame(9)); o.inv = { left: inv.left, right: inv.right }; return JSON.stringify(o);`);
  check(img.PONTILHADO.left > 3 * img.PONTILHADO.right && img.PONTOS.left > 2 * img.PONTOS.right && img.METABOLAS.errs === 0, `a imagem conduz o desenho: com a metade esquerda branca, o pontilhado fica ${(img.PONTILHADO.left / Math.max(1, img.PONTILHADO.right)).toFixed(1)}x mais claro à esquerda e os pontos ${(img.PONTOS.left / Math.max(1, img.PONTOS.right)).toFixed(1)}x`, JSON.stringify(img.PONTILHADO) + JSON.stringify(img.PONTOS));
  check(Math.abs(img.PONTILHADO.noiseLeft - img.PONTILHADO.noiseRight) < 0.5 * (img.PONTILHADO.noiseLeft + img.PONTILHADO.noiseRight) && img.otherImage > 3, `sem imagem o campo é ruído (esquerda e direita parecidas) e outra imagem dá outro desenho (diferença ${img.otherImage.toFixed(1)})`, JSON.stringify([img.PONTILHADO, img.otherImage]));
  check(img.inv.right > 3 * img.inv.left, 'inverter o campo troca os lados (a metade direita passa a ser a clara)', JSON.stringify(img.inv));

  /* 5) glifos: imagem, rampa, inversão e embaralhar fazem o que dizem */
  const gl = await J(`const o = {}; const g = p => L('glyphs', Object.assign({ source: 'image', media: 'dividida', cell: 8, c1: 'primary', c2: 'primary' }, p));
    await load(proj([g({})])); const a = stats(frame(9)); o.img = { left: a.left, right: a.right };
    await load(proj([g({ invert: true })])); const i = stats(frame(9)); o.inv = { left: i.left, right: i.right };
    await load(proj([])); o.base = stats(frame(9)).all; await load(proj([g({ ramp: '   ' })])); o.blank = stats(frame(9)).all;
    await load(proj([g({ ramp: ' #' })])); const d1 = stats(frame(9)).all; await load(proj([g({ ramp: ' .:-=+*#%@' })])); const d2 = stats(frame(9)).all; o.ramp = [d1, d2];
    await load(proj([g({ source: 'noise', shuffle: 0.8 })])); const s0 = frame(2), s0b = frame(2), s1 = frame(Math.round(A.loopFrames() * 0.6)); o.shuf = [diff(s0, s0b), diff(s0, s1)];
    await load(proj([g({ source: 'image', media: '' })])); o.noMedia = stats(frame(9)).all; o.noMediaErr = A.layerErrors().length;
    return JSON.stringify(o);`);
  check(gl.img.left > 3 * gl.img.right && gl.inv.right > 3 * gl.inv.left, `glifos de imagem: ficam do lado claro da imagem (${(gl.img.left / Math.max(1, gl.img.right)).toFixed(1)}x) e a inversão troca o lado`, JSON.stringify([gl.img, gl.inv]));
  check(gl.blank === gl.base && gl.ramp[0] > gl.base && gl.ramp[1] > gl.base && gl.ramp[0] !== gl.ramp[1], 'a rampa de caracteres manda: rampa só de espaços não desenha nada; duas rampas diferentes dão tintas diferentes', JSON.stringify([gl.base, gl.blank, gl.ramp]));
  check(gl.shuf[0] === 0 && gl.shuf[1] > 0.3, 'embaralhar é determinístico (mesmo quadro igual) e muda com o passo do loop', JSON.stringify(gl.shuf));
  check(gl.noMedia === gl.base, 'campo = image sem imagem escolhida não desenha (e o validador acusa, abaixo)', String([gl.noMedia, gl.base]));

  /* 6) o validador do motor acusa imagem ausente (controle negativo: sem imagem escolhida em campo de ruído não acusa) */
  const val = await J(`await load(proj([L('field', { kind: 'ISOLINHAS', media: 'naoexiste' })])); const bad = (A.validate({ comps: [0], fps: 30, scale: 1, start: 0, end: 0, alpha: false, layers: false, layerCount: 0 }).out || []); await load(proj([L('field', { kind: 'ISOLINHAS' })])); const good = (A.validate({ comps: [0], fps: 30, scale: 1, start: 0, end: 0, alpha: false, layers: false, layerCount: 0 }).out || []); await load(proj([L('glyphs', { source: 'image', media: '' })])); const gbad = (A.validate({ comps: [0], fps: 30, scale: 1, start: 0, end: 0, alpha: false, layers: false, layerCount: 0 }).out || []);
    return JSON.stringify({ bad: bad.filter(x => /ERROR/.test(JSON.stringify(x)) && /mídia ausente/.test(JSON.stringify(x))).length, good: good.filter(x => /ERROR/.test(JSON.stringify(x))).length, gbad: gbad.filter(x => /mídia ausente/.test(JSON.stringify(x))).length });`);
  check(val.bad >= 1 && val.good === 0 && val.gbad >= 1, 'o motor acusa imagem-fonte ausente em field e em glyphs, e não acusa campo de ruído', JSON.stringify(val));

  /* 7) o conceito escolhe a regra e o campo; Python = navegador; a animação toca em gain */
  const briefs = [
    { name: 'Campo', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['drift', 'flow', 'morph'], mood: ['liquid'], energy: 0.5, surface: { type: 'screen', w: 1920, h: 1080, fps: 30 }, time: { bpm: 120, bars: 4 }, compositions: 3, text: { title: 'AIVJ NOW' } },
    { name: 'Tipo', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['fragment', 'accumulate', 'assemble'], mood: ['industrial'], energy: 0.5, surface: { type: 'led', w: 4500, h: 800, fps: 30 }, time: { bpm: 120, bars: 4 }, compositions: 3, text: { title: 'SIGNAL' } },
    { name: 'Misto', lang: 'en', concept: 'A fluid river of flow, drift and echo.', mood: ['calm'], energy: 0.4, surface: { type: 'screen', w: 1080, h: 1920, fps: 30 }, time: { bpm: 100, bars: 2 }, compositions: 3, text: { title: 'RIVER' } },
  ];
  const buildJs = b => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(b)}))`).then(JSON.parse);
  const diff = (a, b, path = '$') => { if (a === b) return null; if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: py=${JSON.stringify(a)} js=${JSON.stringify(b)}`; if (Array.isArray(a) !== Array.isArray(b)) return `${path}: tipo diferente`;
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { if (!(k in a)) return `${path}.${k}: só no JS`; if (!(k in b)) return `${path}.${k}: só no Python`; const d = diff(a[k], b[k], `${path}.${k}`); if (d) return d; } return null; };
  const hero = P => P.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)));
  let parOk = 0; const parBad = [], found = { field: 0, glyphs: 0 };
  for (const [i, b] of briefs.entries()) {
    const js = await buildJs(b), f = join(tmp, `b${i}.json`), o = join(tmp, `o${i}.json`); writeFileSync(f, JSON.stringify(b)); execFileSync('python', [join(HERE, 'brief_to_project.py'), f, '--out', o], { stdio: 'pipe' });
    const py = JSON.parse(readFileSync(o, 'utf8'));
    { const d = diff(py, JSON.parse(JSON.stringify(js))); if (!d) parOk++; else parBad.push(b.name + ' ' + d); }
    for (const h of hero(js)) if (h && (h.type === 'field' || h.type === 'glyphs')) found[h.type]++;
    if (i === 0) {
      const hs = hero(js), fh = hs.find(h => h.type === 'field');
      check(fh && fh.p.kind === 'CORRENTES' && fh.mod.some(m => m.k === 'gain' && m.src === 'lfo'), `verbos drift, flow, morph dão herói field com a regra CORRENTES e a animação toca em gain (${fh && fh.mod.filter(m => m.k === 'gain').map(m => m.shape).join()})`, JSON.stringify(fh && [fh.p, fh.mod]));
    }
    if (i === 1) {
      const gh = hero(js).find(h => h.type === 'glyphs');
      check(gh && gh.p.ramp === ' SIGNAL' && ['noise', 'wave', 'radial', 'spiral'].includes(gh.p.source), `verbos fragment, accumulate, assemble dão herói glyphs e a rampa vem do título (${gh && JSON.stringify(gh.p.ramp)})`, JSON.stringify(gh && gh.p));
    }
  }
  check(parOk === briefs.length, `o projeto gerado no navegador é igual ao do Python nos ${briefs.length} briefings com campo e glifos`, parBad.join());
  check(found.field >= 1 && found.glyphs >= 1, `o conceito escolhe as camadas novas (${found.field} herói(s) field, ${found.glyphs} glyphs nos briefings de teste)`, JSON.stringify(found));

  /* 8) os projetos gerados passam no validador e desenham */
  const g0 = await buildJs(briefs[0]), gf = join(tmp, 'g0.json'); writeFileSync(gf, JSON.stringify(g0));
  let code = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), gf], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { code = e.status; out = String(e.stdout); }
  const dr = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(g0))}); AIVJ.GLERR.clear(); let lit = 0; for (const ci of [0, 1, 2]) { const d = AIVJ.renderFrame(ci, 20, 0.05, true).data; for (let i = 0; i < d.length; i += 4) lit += d[i] + d[i + 1] + d[i + 2]; } return JSON.stringify({ lit, errs: AIVJ.layerErrors(), gl: [...AIVJ.GLERR.values()] }); })()`));
  check(code === 0 && dr.lit > 0 && !dr.errs.length && !dr.gl.length, 'o projeto com herói field passa no validador e desenha as 3 composições sem erro', out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | ') + JSON.stringify(dr).slice(0, 120));
  const mut = JSON.parse(JSON.stringify(g0)); mut.compositions.flatMap(c => c.layers).find(l => l.type === 'field').type = 'campo-que-nao-existe'; writeFileSync(join(tmp, 'mut.json'), JSON.stringify(mut));
  let mcode = 0; try { execFileSync('python', [join(HERE, 'validate_project.py'), join(tmp, 'mut.json')], { stdio: 'pipe' }); } catch (e) { mcode = e.status; }
  check(mcode !== 0, 'controle negativo: o validador recusa um tipo de camada que não existe (o enum do esquema inclui field e glyphs)', 'aceitou');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nCampo e glifos ok.');
process.exit(fail ? 1 : 0);
