#!/usr/bin/env node
// Teste do RenderGraph e dos efeitos temporais (fase 4): o grafo ordena, valida e devolve recursos ao pool; a composição de um quadro roda por ele;
// trilha, feedback, slit scan e deslocamento são determinísticos (reexportar dá a mesma imagem), iguais seguindo em ordem ou saltando (replay), e o loop fecha na emenda.
//   node rendergraph_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-rg-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const L = (type, name, p) => ({ type, name, p });
/* cinza que sobe com a fase do loop: cada quadro tem um valor diferente, então dá para saber de que quadro veio cada pixel */
const ramp = 'void main(){ gl_FragColor = outc(vec3(uPh), 1.0); }';
/* uma barra que anda: onde há movimento a trilha deixa rastro */
const bar = 'void main(){ vec2 uv = gl_FragCoord.xy / uRes; float x = fract(uPh); float k = step(abs(uv.x - x), 0.04); gl_FragColor = outc(vec3(1.0), k); }';
const mkProject = (layers) => ({ schema: 'ai-vj-generator/2', id: 'rg', seed: 3, meta: { name: 'RG', brief: 'x', lang: 'pt' }, canvas: { w: 160, h: 90, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1, loop: true },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers }] });
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(mkProject([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'opaque' })])));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
const load = async (layers) => E(`AIVJ.importJson(${JSON.stringify(JSON.stringify(mkProject(layers)))})`);
try {
  /* 1) o grafo em si */
  const g1 = JSON.parse(await E(`(() => { const RG = AIVJ.RG, out = {};
    const g = RG.create('t'); const seen = [], rel = []; const pool = { release: r => rel.push(r.n) };
    g.add({ id: 'c', type: 'Composite', deps: ['a', 'b'], inplace: true, run: ([a, b]) => { seen.push('c'); return a; } });
    g.add({ id: 'a', type: 'Source', run: () => { seen.push('a'); return { n: 'A' }; } });
    g.add({ id: 'b', type: 'Generator', run: () => { seen.push('b'); return { n: 'B' }; } });
    g.add({ id: 'o', type: 'Output', deps: ['c'], run: ([x]) => { seen.push('o'); return x; } });
    const r = g.execute({}, pool); out.order = seen.join(''); out.released = rel.join(); out.out = r.output.n;
    const t = f => { try { f(); return null; } catch (e) { return e.message; } };
    out.cycle = t(() => { const h = RG.create('c'); h.add({ id: 'x', type: 'Generator', deps: ['y'], run: () => 1 }); h.add({ id: 'y', type: 'Generator', deps: ['x'], run: () => 1 }); h.add({ id: 'o', type: 'Output', deps: ['x'], run: () => 1 }); h.compile(); });
    out.missing = t(() => { const h = RG.create('m'); h.add({ id: 'x', type: 'Generator', deps: ['nope'], run: () => 1 }); h.add({ id: 'o', type: 'Output', deps: ['x'], run: () => 1 }); h.compile(); });
    out.badType = t(() => RG.create('b').add({ id: 'x', type: 'Magic', run: () => 1 }));
    out.noOutput = t(() => { const h = RG.create('n'); h.add({ id: 'x', type: 'Generator', run: () => 1 }); h.compile(); });
    out.types = Object.keys(RG.NODE_TYPES).join();
    return JSON.stringify(out); })()`));
  check(g1.order === 'abco' && g1.out === 'A' && g1.released === 'B', 'o grafo executa na ordem das dependências, o Composite reaproveita o acumulado e o recurso temporário B volta ao pool (o Output não)', JSON.stringify(g1));
  check(/ciclo/.test(g1.cycle) && /não existe/.test(g1.missing) && /desconhecido/.test(g1.badType) && /exatamente um Output/.test(g1.noOutput), 'ciclo, dependência ausente, tipo desconhecido e falta de Output são recusados com mensagem', JSON.stringify(g1));
  check(g1.types === 'Source,Generator,Shader,Effect,Mask,Composite,History,Feedback,Output', 'os nove tipos de nó do roadmap existem', g1.types);

  /* 2) a composição de um quadro vira grafo e não aloca por quadro */
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: ramp }), L('fx', 'X', { preset: 'PIXELATE' }), L('temporal', 'T', { preset: 'TRILHA' }), L('shape', 'Q', {})]);
  const types = JSON.parse(await E(`(() => { const c = AIVJ.project.compositions[0], cv = document.createElement('canvas'); cv.width = 80; cv.height = 45; const o = { target: cv, scale: 0.5, W: 160, H: 90 };
    const g = AIVJ.buildComposeGraph(c, AIVJ.frameAt(0, c), o); g.compile(); return JSON.stringify(g.nodes.map(n => n.id + ':' + n.type)); })()`).catch(() => '[]'));
  check(types.join() === 'src:Source,L0:Generator,C0:Composite,L1:Shader,C1:Composite,L2:Effect,C2:Composite,L3:Feedback,C3:Composite,L4:Generator,C4:Composite,out:Output', 'a composição vira Source, Generator, Shader, Effect, Feedback, Composite e Output, nessa ordem', types.join());
  await E(`AIVJ.renderFrame(0, 0, 0.5, true); 0`);
  const p0 = JSON.parse(await E(`JSON.stringify(AIVJ.canvasPool.stats)`));
  for (let f = 1; f <= 8; f++) await E(`AIVJ.renderFrame(0, ${f}, 0.5, true); 0`);
  const p1 = JSON.parse(await E(`JSON.stringify(AIVJ.canvasPool.stats)`));
  check(p1.allocs === p0.allocs && p1.reuses > p0.reuses, `pool de canvas: ${p0.allocs} canvas criados no primeiro quadro, 0 novos em 8 quadros`, JSON.stringify([p0, p1]));

  /* 3) TRILHA: rastro, determinismo, replay = sequência, emenda do loop */
  const px = (n, ci = 0) => E(`(() => { const im = AIVJ.renderFrame(${ci}, ${n}, 0.5, true), d = im.data; return Array.from(d.filter((v, i) => i % 4 === 0)); })()`).then(a => Uint8Array.from(a));
  const maxd = (a, b) => { let m = 0; for (let i = 0; i < a.length; i++) m = Math.max(m, Math.abs(a[i] - b[i])); return m; };
  const sum = a => a.reduce((x, y) => x + y, 0);
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'alpha' })]);
  const base = await px(20);
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'alpha' }), L('temporal', 'T', { preset: 'TRILHA', p1: 0.8, p2: 1 })]);
  const trail = await px(20), trail2 = await px(20);
  check(sum(trail) > sum(base) * 1.5, `a trilha deixa rastro (luz total ${sum(base)} sem, ${sum(trail)} com)`, `${sum(base)} ${sum(trail)}`);
  check(maxd(trail, trail2) === 0, 'renderizar o mesmo quadro duas vezes dá a mesma imagem (determinismo)', 'diferença ' + maxd(trail, trail2));
  /* seguindo em ordem, sem zerar: quadros 8..20 */
  const seq = JSON.parse(await E(`(() => { const A = AIVJ, c = A.project.compositions[0], cv = document.createElement('canvas'); cv.width = 80; cv.height = 45; let last = null; A.TM.resetAll();
    for (let n = 8; n <= 20; n++) { A.composeFrame(c, A.frameAt(n, c), { target: cv, scale: 0.5, W: 160, H: 90, skip: (i, L) => L.type === 'bg' }); } const d = cv.getContext('2d').getImageData(0, 0, 80, 45).data; return JSON.stringify(Array.from(d.filter((v, i) => i % 4 === 0))); })()`));
  const seqA = Uint8Array.from(seq);
  check(maxd(seqA, trail) <= 3, `seguir em ordem (quadros 8 a 20) e saltar direto ao 20 (replay) dão a mesma imagem (diferença máxima ${maxd(seqA, trail)} de 255)`, 'diferença ' + maxd(seqA, trail));
  /* emenda do loop: ...58, 59, 0 em ordem contra um salto ao quadro 0 */
  const wrap = JSON.parse(await E(`(() => { const A = AIVJ, c = A.project.compositions[0], cv = document.createElement('canvas'); cv.width = 80; cv.height = 45; A.TM.resetAll(); const LF = A.loopFrames();
    for (const n of [LF - 12, LF - 11, LF - 10, LF - 9, LF - 8, LF - 7, LF - 6, LF - 5, LF - 4, LF - 3, LF - 2, LF - 1, LF, LF + 1]) A.composeFrame(c, A.frameAt(n, c), { target: cv, scale: 0.5, W: 160, H: 90, skip: (i, L) => L.type === 'bg' });
    const d = cv.getContext('2d').getImageData(0, 0, 80, 45).data; return JSON.stringify({ a: Array.from(d.filter((v, i) => i % 4 === 0)), LF }); })()`));
  const jump = await px(1);
  check(maxd(Uint8Array.from(wrap.a), jump) <= 3, `a emenda do loop fecha: passar pelo quadro ${wrap.LF - 1} e voltar ao 0 dá o mesmo que saltar para o quadro 1 (diferença ${maxd(Uint8Array.from(wrap.a), jump)})`, 'emenda');

  /* 4) FEEDBACK compila e o rastro se transforma */
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'alpha' }), L('temporal', 'T', { preset: 'FEEDBACK' })]);
  const fb = await px(20), fb2 = await px(20);
  check(maxd(fb, fb2) === 0 && sum(fb) > sum(base), 'FEEDBACK: determinístico e com eco da imagem anterior', `${sum(fb)} ${sum(base)}`);

  /* 5) SLIT SCAN: a coluna da esquerda é o quadro atual, a da direita é o quadro N-1 atrás */
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: ramp, alphaMode: 'opaque' }), L('temporal', 'T', { preset: 'SLIT SCAN', p1: 8, p2: 0, p3: 0, p4: 0 })]);
  const slit = await E(`(() => { const im = AIVJ.renderFrame(0, 30, 1, true), d = im.data, w = im.width, row = 20; return JSON.stringify({ left: d[(row * w + 1) * 4], right: d[(row * w + w - 2) * 4], mid: d[(row * w + (w >> 1)) * 4] }); })()`);
  const sv = JSON.parse(slit), LFv = await E(`AIVJ.loopFrames()`), gray = f => Math.round(255 * ((f % LFv) / LFv));
  check(Math.abs(sv.left - gray(30)) <= 3 && Math.abs(sv.right - gray(30 - 7)) <= 3 && sv.mid < sv.left && sv.mid > sv.right, `SLIT SCAN (8 quadros): esquerda = quadro 30 (${sv.left}), direita = quadro 23 (${sv.right}), meio entre os dois (${sv.mid})`, slit);
  const slitWrap = JSON.parse(await E(`(() => { const im = AIVJ.renderFrame(0, 2, 1, true), d = im.data, w = im.width, row = 20; return JSON.stringify({ right: d[(row * w + w - 2) * 4] }); })()`));
  check(Math.abs(slitWrap.right - gray(LFv + 2 - 7)) <= 3, `SLIT SCAN na emenda: no quadro 2 a direita vem do quadro ${LFv - 5} do fim do loop (${slitWrap.right})`, JSON.stringify(slitWrap));

  /* 6) DESLOCAR compila e desenha; erros de shader não aparecem */
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'alpha' }), L('temporal', 'T', { preset: 'DESLOCAR' })]);
  const dsp = await px(10), dsp2 = await px(10);
  const errs = JSON.parse(await E(`JSON.stringify([...AIVJ.GLERR.values()])`));
  check(maxd(dsp, dsp2) === 0 && !errs.length && sum(dsp) > 0, 'DESLOCAR: desenha, determinístico, sem erro de shader', JSON.stringify(errs));

  /* 7) recursos: histórico em pool, liberado ao esquecer, nada preso */
  const rs = JSON.parse(await E(`(() => { const r = AIVJ.glr(); const before = r.arrays.active + r.textures.active; AIVJ.TM.resetAll(); return JSON.stringify({ before, after: r.arrays.active + r.textures.active }); })()`));
  check(rs.before > 0 && rs.after === 0, `o histórico fica em recursos do pool (${rs.before} ativos) e é liberado por completo ao zerar (${rs.after})`, JSON.stringify(rs));
  await load([L('bg', 'F', { grain: 0 }), L('shader', 'S', { src: bar, alphaMode: 'alpha' }), L('temporal', 'T', { preset: 'SLIT SCAN', p1: 16 })]);
  await E(`AIVJ.renderFrame(0, 5, 0.5, true); 0`); const a0 = JSON.parse(await E(`JSON.stringify(AIVJ.glMetrics())`));
  for (let f = 6; f <= 12; f++) await E(`AIVJ.renderFrame(0, ${f}, 0.5, true); 0`);
  const a1 = JSON.parse(await E(`JSON.stringify(AIVJ.glMetrics())`));
  check(a1.activeTextures === a0.activeTextures && a1.activeArrays === a0.activeArrays && a1.activeArrays >= 1 && a1.textureAllocs === a0.textureAllocs && a1.estimatedVramBytes < 64 * 1048576, `o histórico não cresce entre quadros (${a1.activeArrays} arranjo(s) e ${a1.activeTextures} textura(s) presos, nenhuma alocação nova) e a VRAM estimada é ${(a1.estimatedVramBytes / 1048576).toFixed(1)} MB`, JSON.stringify([a0, a1]));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nrender graph e efeitos temporais ok.');
process.exit(fail ? 1 : 0);
