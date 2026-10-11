#!/usr/bin/env node
// Teste do 2.5D (fase 11): Python = navegador (IR, planos, câmera, transformações); a câmera faz o que diz em pixels de resposta conhecida
// (paralaxe com sinais opostos, dolly por plano, névoa que conserva a soma, foco que desfoca só fora do plano, rack que não move nada); o loop fecha;
// uma restrição dura de dobra deixa só o puxar de foco; texto, medidor e acabamento ficam na tela; a câmera não ouve o áudio; o validador recusa câmera quebrada;
// projeto antigo (sem câmera) renderiza igual; plan_ir --apply planeja um projeto escrito à mão. Há controles negativos.
//   node depth_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-depth-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const REG = JSON.parse(readFileSync(join(HERE, '..', 'registry', 'depth.json'), 'utf8'));
const ANI = JSON.parse(readFileSync(join(HERE, '..', 'registry', 'animation.json'), 'utf8'));
const S = (w, h, type = 'led', fps = 30, extra) => Object.assign({ type, w, h, fps }, extra || {});
const base = over => Object.assign({ name: 'Teste Profundidade', lang: 'pt', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], energy: 0.5, surface: S(4500, 800), time: { bpm: 120, bars: 4 }, compositions: 3 }, over || {});
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 4 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.DEPTH && window.AIVJ.GENAI)' });
const E = s => page.evaluate(s);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const near = (a, b, t) => Math.abs(a - b) <= t;
const wr = (name, o) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(o)); return f; };
const py = (code, ...args) => execFileSync('python', ['-X', 'utf8', '-c', code, ...args], { encoding: 'utf8', cwd: HERE });
const vp = (p, name) => { const f = wr(name, p); let r = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { r = e.status; out = String(e.stdout); } return { r, out, errs: out.split('\n').filter(l => /^\s*(ERROR|error)/i.test(l) || /ERROR/.test(l)) }; };
const bpy = (brief, name) => { const out = join(tmp, name + '.aivj.json'); execFileSync('python', [join(HERE, 'brief_to_project.py'), wr(name, brief), '--out', out], { stdio: 'pipe' }); return JSON.parse(readFileSync(out, 'utf8')); };
const bjs = brief => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`).then(JSON.parse);

/* o ambiente de medida dentro da página: anéis brancos sobre preto (resposta conhecida), centroide, soma, pico e raio */
await E(`(() => { window.T11 = (() => { const A = AIVJ, W = 640, H = 360;
  const ring = (z, extra) => Object.assign({ type: 'shape', name: 'R' + z, role: 'x', on: true, opacity: 1, blend: 'normal', p: { kind: 'ring', layout: 'single', size: 100, strokeW: 8, pulseAmt: 0, spin: 0 } }, z === undefined ? {} : { z }, extra || {});
  const proj = (layers, cam, extra) => Object.assign({ schema: 'ai-vj-generator/2', id: 't', seed: 7, meta: { name: 'T', brief: 'x', lang: 'pt' }, canvas: { w: W, h: H, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 4, loop: true, seamless: true, mode: 'loop' },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#404040', accent: '#FFFFFF' }, compositions: [Object.assign({ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: { grain: 0 } }].concat(layers) }, cam ? { camera: cam } : {})] }, extra || {});
  const load = P => { A.importJson(JSON.stringify(P)); A.GLERR.clear(); };
  const frame = n => A.renderFrame(0, n, 1, false);
  const stats = im => { const d = im.data, w = im.width, h = im.height; let s = 0, sx = 0, sy = 0, pk = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[(y * w + x) * 4]; s += v; sx += v * x; sy += v * y; if (v > pk) pk = v; }
    const cx = sx / (s || 1), cy = sy / (s || 1); let r2 = 0; for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const v = d[(y * w + x) * 4]; r2 += v * ((x - cx) ** 2 + (y - cy) ** 2); } return { sum: s, cx, cy, pk, rms: Math.sqrt(r2 / (s || 1)) }; };
  const diff = (a, b) => { let s = 0; for (let i = 0; i < a.data.length; i += 4) s += Math.abs(a.data[i] - b.data[i]); return s / (a.data.length / 4); };
  const cam = (move, extra) => Object.assign({ move, amp: move === 'dolly' ? 0.12 : move === 'rack' ? 0.8 : 0.05, cycles: move === 'dolly' ? 2 : 1, phase: 0, focus: 0.2, fog: 0.3, dof: 0.012 }, extra || {});
  return { A, ring, proj, load, frame, stats, diff, cam, W, H, S: Math.min(H, W * 0.5625) }; })(); })()`);
const J = async s => JSON.parse(await E(`(async () => { const { A, ring, proj, load, frame, stats, diff, cam, W, H, S } = T11; return JSON.stringify(await (async () => { ${s} })()); })()`));

try {
  /* 1) o gerador do navegador e o Python dão o mesmo Depth IR, os mesmos z e a mesma câmera, em superfícies e conceitos diferentes */
  const briefs = [base(), base({ concept: 'Floresta de fungos que respira devagar, orgânica e úmida.', mood: ['organic'], surface: S(1280, 720, 'screen') }), base({ surface: S(4500, 800, 'led', 30, { folds: [1500, 3000] }) })];
  const pps = [], pjss = [];
  for (let i = 0; i < briefs.length; i++) {
    const pp = bpy(briefs[i], 'b' + i), pjs = await bjs(briefs[i]); pps.push(pp); pjss.push(pjs);
    check(same(pp.meta.depthIR, pjs.meta.depthIR), `brief ${i + 1}: Python e navegador gravam o mesmo meta.depthIR (${pp.meta.depthIR.map(d => d.camera.move).join(', ')})`, JSON.stringify([pp.meta.depthIR[0], pjs.meta.depthIR[0]]).slice(0, 500));
    check(pp.compositions.every((c, k) => same(c.camera, pjs.compositions[k].camera) && c.layers.every((L, j) => same(L.z, pjs.compositions[k].layers[j].z))), `brief ${i + 1}: mesma câmera e mesmo z em todas as camadas das ${pp.compositions.length} composições`, '');
  }

  /* 2) o arquétipo escolhe a câmera: compile direto, Python = navegador, nos 8 arquétipos, com e sem costura dura */
  const pp0 = pps[0], lay = pp0.compositions[0].layers.map(L => { const c = JSON.parse(JSON.stringify(L)); delete c.z; return c; });
  const cmpIR = pp0.meta.compositionIR[0], sxPlain = pp0.meta.surfaceIR, sxSeam = pps[2].meta.surfaceIR;
  const pyC = (arch, sx, axis) => JSON.parse(py('import sys,json; sys.path.insert(0,"."); import depth_ir as d; a=json.load(open(sys.argv[1],encoding="utf-8")); print(json.dumps(d.compile_depth(a["L"], a["an"], a["cmp"], a["sx"], a["W"], a["H"])))', wr('c_in', { L: lay, an: { archetype: arch, axes: { energy: 0.5 }, timing: { bars: 4 } }, cmp: Object.assign({}, cmpIR, { movementAxis: axis || cmpIR.movementAxis }), sx, W: 4500, H: 800 })));
  const jsC = (arch, sx, axis) => E(`JSON.stringify(AIVJ.DEPTH.compile(${JSON.stringify(lay)}, { archetype: ${JSON.stringify(arch)}, axes: { energy: 0.5 }, timing: { bars: 4 } }, ${JSON.stringify(Object.assign({}, cmpIR, { movementAxis: axis || cmpIR.movementAxis }))}, ${JSON.stringify(sx)}, 4500, 800))`).then(JSON.parse);
  const got = {};
  for (const a of ANI.archetypeOrder) for (const [tag, sx] of [['livre', sxPlain], ['costura', sxSeam]]) { const x = pyC(a, sx), y = await jsC(a, sx); got[a + '/' + tag] = x; if (!same(x, y)) bad(`Python e navegador diferem em ${a}/${tag}`); }
  ok('compile dá o mesmo Depth IR no Python e no navegador nos 8 arquétipos, sem e com costura dura');
  check(ANI.archetypeOrder.every(a => got[a + '/livre'].camera.move === (REG.archetypeCamera[a] === 'sway' && cmpIR.movementAxis === 'vertical' ? 'crane' : REG.archetypeCamera[a])), 'cada arquétipo escolhe a câmera do registry (sway vira crane no eixo vertical)', JSON.stringify(ANI.archetypeOrder.map(a => got[a + '/livre'].camera.move)));
  check(new Set(ANI.archetypeOrder.map(a => got[a + '/livre'].camera.move)).size >= 5, 'os 8 arquétipos usam pelo menos 5 câmeras diferentes', '');
  check(ANI.archetypeOrder.every(a => { const c = got[a + '/costura'].camera; return !REG.cameras[c.move].moves && got[a + '/costura'].seam.hard; }), 'com dobra dura nenhuma câmera move camadas: só rack ou still', JSON.stringify(ANI.archetypeOrder.map(a => got[a + '/costura'].camera.move)));
  check(ANI.archetypeOrder.every(a => { const m = got[a + '/livre'].camera; return m.move === 'still' || (Number.isInteger(m.cycles) && m.cycles >= 1); }) && got['pulse/livre'].camera.cycles === 2 && got['glide/livre'].camera.cycles === 1, 'a câmera roda em ciclos inteiros (dolly meio por compasso, o resto um por loop)', '');
  check(got['stutter/livre'].camera.steps === 8 && got['glide/livre'].camera.steps === undefined, 'stutter balança em 8 passos parados; glide não tem passos', '');
  const ctl = got['glide/livre'];
  const tiers = Object.fromEntries(ctl.planes.map(r => [r.tier, []])); ctl.planes.forEach(r => tiers[r.tier].push(r.z));
  check(Object.entries(tiers).every(([t, zs]) => zs.every(z => z >= REG.planes[t].range[0] && z <= REG.planes[t].range[1])) && ctl.planes.every((r, i) => i === 0 || ctl.planes[i - 1].z <= r.z || ctl.planes[i - 1].tier !== r.tier), 'cada camada fica no intervalo do seu tier e, dentro do tier, a de baixo fica mais longe', JSON.stringify(ctl.planes));
  check(['background', 'instrument', 'information', 'finish'].every(t => !ctl.planes.some(r => r.tier === t)) && ctl.screen.length >= 3, 'texto, medidor, fundo e acabamento ficam no plano da tela (sem z)', JSON.stringify(ctl.screen));
  check(ctl.focus.tier === 'hero' && ctl.focus.z === ctl.camera.focus && ctl.planes.filter(r => r.tier === 'hero').every(r => r.fog === 0 && r.blurPx === 0), 'o foco é o plano do herói: o herói não tem névoa nem desfoque', JSON.stringify(ctl.planes.filter(r => r.tier === 'hero')));
  const pg = ctl.planes.filter(r => r.tier === 'ground');
  check(pg.length > 0 && pg.every(r => r.fog > 0.03 && r.blurPx > 3), 'o chão, o plano mais longe, tem névoa e desfoque', JSON.stringify(pg));
  const noAnim = pyC(undefined, sxPlain); check(noAnim.camera.move === 'sway' && noAnim.archetype === null, 'sem Animation IR a câmera é sway (padrão do registry) e o arquétipo fica nulo', JSON.stringify(noAnim.camera));
  const hi = pyC('glide', sxPlain), loE = JSON.parse(py('import sys,json; sys.path.insert(0,"."); import depth_ir as d; a=json.load(open(sys.argv[1],encoding="utf-8")); print(json.dumps(d.compile_depth(a["L"], a["an"], a["cmp"], a["sx"], a["W"], a["H"])["camera"]["amp"]))', wr('c_lo', { L: lay, an: { archetype: 'glide', axes: { energy: 0 }, timing: { bars: 4 } }, cmp: cmpIR, sx: sxPlain, W: 4500, H: 800 })));
  check(loE < hi.camera.amp && near(loE, REG.cameras.sway.amp * REG.energy.lo, 1e-4), 'a energia do briefing escala a amplitude da câmera (mais energia, mais paralaxe)', `${loE} vs ${hi.camera.amp}`);

  /* 3) as transformações: Python = navegador em várias fases, câmeras e planos; e periodicidade exata */
  const phases = [0, 0.1, 0.25, 0.333, 0.5, 0.77, 0.999], zs = [-0.9, -0.5, 0.2, 0.7], moves = Object.keys(REG.cameras);
  const cams = moves.map(m => Object.assign({ move: m, amp: m === 'rack' ? 0.8 : m === 'dolly' ? 0.12 : 0.05, cycles: m === 'still' ? 0 : m === 'dolly' ? 2 : 1, phase: 0.1, focus: 0.2, fog: 0.3, dof: 0.012 }, m === 'sway' ? { steps: 8 } : {}));
  const pyT = JSON.parse(py('import sys,json; sys.path.insert(0,"."); import depth_ir as d; a=json.load(open(sys.argv[1],encoding="utf-8")); print(json.dumps([[d.layer_transform(c, d.camera_state(c, ph), z, 360) for ph in a["ph"] for z in a["z"]] for c in a["cams"]]))', wr('t_in', { ph: phases, z: zs, cams })));
  const jsT = await E(`JSON.stringify(${JSON.stringify(cams)}.map(c => ${JSON.stringify(phases)}.flatMap(ph => ${JSON.stringify(zs)}.map(z => AIVJ.DEPTH.transform(c, AIVJ.DEPTH.state(c, ph), z, 360)))))`).then(JSON.parse);
  check(pyT.every((row, i) => row.every((t, j) => Object.keys(t).every(k => near(t[k], jsT[i][j][k], 1e-9)))), `transform e state: Python = navegador nas ${moves.length} câmeras × ${phases.length} fases × ${zs.length} planos`, '');
  const per = await E(`JSON.stringify(${JSON.stringify(cams)}.map(c => { const a = AIVJ.DEPTH.state(c, 0), b = AIVJ.DEPTH.state(c, 1); return Object.keys(a).every(k => Math.abs(a[k] - b[k]) < 1e-9); }))`).then(JSON.parse);
  check(per.every(Boolean), 'toda câmera é periódica: a fase 1 dá o mesmo estado da fase 0 (o loop fecha)', JSON.stringify(per));

  /* 4) o que a câmera faz em pixels (resposta conhecida): anéis brancos sobre preto */
  const sway = await J(`const c = cam('sway'); load(proj([ring(-0.8)], c)); const a = stats(frame(0)), b = stats(frame(60)); load(proj([ring(0.7)], c)); const a2 = stats(frame(0)), b2 = stats(frame(60)); load(proj([ring(0.2)], c)); const a3 = stats(frame(0)), b3 = stats(frame(60));
    return { far: b.cx - a.cx, near: b2.cx - a2.cx, focus: b3.cx - a3.cx, fy: b.cy - a.cy, S };`);
  check(near(sway.far, 0.05 * sway.S * 1.0, 0.6) && near(sway.near, -0.05 * sway.S * 0.5, 0.6), `sway: o plano longe desliza ${sway.far.toFixed(1)} px e o perto ${sway.near.toFixed(1)} px, em sentidos opostos (esperado +${(0.05 * sway.S).toFixed(1)} e -${(0.05 * sway.S * 0.5).toFixed(1)})`, JSON.stringify(sway));
  check(Math.abs(sway.focus) < 0.6 && Math.abs(sway.fy) < 0.6, 'o plano do foco não desliza e o sway não move em y', JSON.stringify(sway));
  const crane = await J(`const c = cam('crane'); load(proj([ring(-0.8)], c)); const a = stats(frame(0)), b = stats(frame(60)); return { dy: b.cy - a.cy, dx: b.cx - a.cx, S };`);
  check(near(crane.dy, 0.05 * crane.S, 0.7) && Math.abs(crane.dx) < 0.6, `crane: o plano longe sobe e desce só em y (${crane.dy.toFixed(1)} px, esperado ${(0.05 * crane.S).toFixed(1)})`, JSON.stringify(crane));
  const orbit = await J(`const c = cam('orbit'); load(proj([ring(-0.8)], c)); const a = stats(frame(0)), b = stats(frame(60)), d = stats(frame(120)); return { b: [b.cx - a.cx, b.cy - a.cy], d: [d.cx - a.cx, d.cy - a.cy], S };`);
  check(near(orbit.b[0], 0.05 * orbit.S, 0.7) && near(orbit.b[1], -0.025 * orbit.S, 0.7) && Math.abs(orbit.d[0]) < 0.7 && near(orbit.d[1], -0.05 * orbit.S, 0.7), 'orbit: x no seno e y no cosseno com metade da altura (elipse), medido em três quadros', JSON.stringify(orbit));
  const dolly = await J(`const c = cam('dolly'); load(proj([ring(0.7)], c)); const a = stats(frame(0)), b = stats(frame(30)); load(proj([ring(-0.9)], c)); const a2 = stats(frame(0)), b2 = stats(frame(30)); return { near: b.rms / a.rms, far: b2.rms / a2.rms };`);
  check(near(dolly.near, 1 + 0.12 * 0.85, 0.015) && near(dolly.far, 1 + 0.12 * 0.05, 0.01) && dolly.near > dolly.far, `dolly: o plano perto cresce ${((dolly.near - 1) * 100).toFixed(1)}% e o longe ${((dolly.far - 1) * 100).toFixed(1)}% (esperado 10,2% e 0,6%)`, JSON.stringify(dolly));
  const fog = await J(`const c = cam('still', { amp: 0 }); load(proj([ring(0.2)], c)); const r = stats(frame(0)); load(proj([ring(-0.8)], c)); const f = stats(frame(0)); load(proj([ring(0.7)], c)); const n = stats(frame(0)); load(proj([ring(-0.8)])); const raw = stats(frame(0)); return { r, f, n, raw };`);
  check(near(fog.f.sum / fog.r.sum, 1 - 0.3 * (1.0 / 1.5), 0.03) && near(fog.r.sum, fog.raw.sum, fog.raw.sum * 0.01), `névoa: o plano longe perde ${((1 - fog.f.sum / fog.r.sum) * 100).toFixed(0)}% de luz (esperado 20%); o plano do foco e a peça sem câmera não perdem`, JSON.stringify([fog.f.sum, fog.r.sum, fog.raw.sum]));
  check(fog.f.pk < fog.r.pk * 0.8 * 0.9 && fog.f.rms > fog.r.rms, 'foco: o plano longe também desfoca (o pico cai além da névoa e a luz se espalha) e o plano do foco fica nítido', JSON.stringify([fog.f.pk, fog.r.pk, fog.f.rms, fog.r.rms]));
  check(near(fog.n.sum / fog.r.sum, 1, 0.02) && fog.n.pk > fog.r.pk * 0.6 && fog.n.pk > fog.f.pk * 1.5, 'o plano na frente do foco não ganha névoa (a luz fica) e desfoca bem menos que o longe (só passou da zona de foco)', JSON.stringify([fog.n.sum, fog.r.sum, fog.n.pk, fog.r.pk, fog.f.pk]));
  const rack = await J(`const c = cam('rack'); load(proj([ring(-0.8)], c)); const s0 = stats(frame(0)), s1 = stats(frame(180)), s2 = stats(frame(60)); return { dc: Math.hypot(s1.cx - s0.cx, s1.cy - s0.cy) + Math.hypot(s2.cx - s0.cx, s2.cy - s0.cy), pk0: s0.pk, pk1: s1.pk, pk2: s2.pk, rms0: s0.rms, rms1: s1.rms };`);
  check(rack.dc < 0.6 && rack.pk1 > rack.pk0 * 1.15 && rack.pk1 > rack.pk2 * 1.5 && rack.rms1 < rack.rms0, 'rack: nada se move e o foco viaja: o plano longe fica nítido quando o foco desce até ele (quadro 180) e mais borrado quando o foco sobe (quadro 60)', JSON.stringify(rack));

  /* 5) o loop fecha: o passo da emenda não é maior que os outros passos */
  const seam = await J(`const out = {}; for (const m of ['sway', 'orbit', 'crane']) { load(proj([ring(-0.8)], cam(m))); const LF = 240, c = n => stats(frame(n)); const xs = [], ys = []; for (const n of [0, 1, 2, 3, 120, 121, 238, 239]) { const s = c(n); xs.push(s.cx); ys.push(s.cy); }
      const st = (a, b) => Math.hypot(xs[a] - xs[b], ys[a] - ys[b]); out[m] = { seam: st(6, 7) + st(7, 0), step: st(0, 1) + st(1, 2) + st(2, 3), mid: st(4, 5) }; } return out;`);
  check(Object.values(seam).every(v => v.seam <= 2 * Math.max(v.step / 3, v.mid) + 0.3), 'o loop fecha: o passo da emenda (239 → 0) não passa dos passos do resto do loop em sway, orbit e crane', JSON.stringify(seam));

  /* 6) a câmera não ouve o áudio e independe do portão de bandas: camada still com z ainda se move */
  const aud = await J(`const c = cam('sway'); const L = ring(-0.8, { temporal: { behavior: 'still', listens: [], reason: 'x' } }); load(proj([L], c)); const a = stats(frame(0)), b = stats(frame(60)); return { dx: b.cx - a.cx };`);
  check(near(aud.dx, 0.05 * sway.S, 0.6), 'a camada que declara still ainda desliza com a câmera: a câmera é do tempo do loop, não da música', JSON.stringify(aud));

  /* 7) compatibilidade e controles negativos */
  const old = await J(`const a = (load(proj([ring()])), frame(70)); const b = (load(proj([ring()], cam('sway'))), frame(70)); const c = (load(proj([ring(-0.8)])), frame(70)); const d = (load(proj([ring(-0.8)], cam('sway'))), frame(70)); return { camSemZ: diff(a, b), zSemCam: diff(a, c), comTudo: diff(a, d) };`);
  check(old.camSemZ === 0 && old.zSemCam === 0, 'projeto antigo: câmera sem z e z sem câmera não mudam um pixel (a imagem sai igual)', JSON.stringify(old));
  check(old.comTudo > 0.1, 'controle negativo: com câmera e z a imagem muda (a medida enxerga a diferença)', JSON.stringify(old));
  const swapI = await J(`const mk = m => (load(proj([ring(-0.8), ring(0.7, { name: 'B' })], cam(m))), frame(60)); const g = mk('sway'), r = mk('rack'), o = mk('crane'); return { gr: diff(g, r), go: diff(g, o) };`);
  check(swapI.gr > 0.2 && swapI.go > 0.2, 'trocar a câmera troca a imagem (sway, crane e rack dão quadros diferentes com as mesmas camadas)', JSON.stringify(swapI));

  /* 8) os geradores: toda composição tem câmera, z só nos planos, texto e medidor na tela, câmera nunca ouve */
  for (let i = 0; i < pps.length; i++) for (const pp of [pps[i], pjss[i]]) {
    check(pp.compositions.every(c => c.camera && REG.cameras[c.camera.move]) && pp.compositions.every(c => c.layers.every(L => L.z === undefined || (L.z >= -1 && L.z <= 1))), `brief ${i + 1}: toda composição tem câmera válida e z dentro de [-1, 1]`, '');
    check(pp.compositions.every(c => c.layers.filter(L => ['instrument', 'post', 'bg'].includes(L.type) || /^information/i.test(L.role || '')).every(L => L.z === undefined)), `brief ${i + 1}: bg, instrumento, acabamento e informação ficam sem z`, '');
    check(pp.meta.depthIR.every(d => d.loop.closes === true && d.loop.audio === false && d.camera.cycles >= (d.camera.move === 'still' ? 0 : 1)), `brief ${i + 1}: o Depth IR declara loop que fecha e câmera que não ouve`, '');
  }
  check(pps[2].compositions.every(c => !REG.cameras[c.camera.move].moves) && pps[2].meta.depthIR.every(d => d.seam.hard && d.seam.rule), 'a superfície com dobras declaradas recebe só câmera de foco em todas as composições, com o motivo no IR', JSON.stringify(pps[2].meta.depthIR.map(d => d.camera.move)));
  check(pps[0].compositions.some(c => REG.cameras[c.camera.move].moves) && new Set(pps[0].compositions.map(c => c.camera.move)).size >= 2, 'sem dobras o set usa câmeras que se movem e pelo menos duas diferentes', JSON.stringify(pps[0].compositions.map(c => c.camera.move)));

  /* 9) o validador */
  const good = vp(pps[0], 'g0'); check(good.r === 0 && !/camera|\.z\b/.test(good.errs.join(' ')), 'o validador aceita o projeto gerado com câmera e z', good.errs.join(' | '));
  const mut = f => { const p = JSON.parse(JSON.stringify(pps[0])); f(p); return p; };
  check(vp(mut(p => { p.compositions[0].layers.find(L => L.z !== undefined).z = 1.7; }), 'm1').errs.some(l => /\.z: a number from -1/.test(l)), 'z fora de [-1, 1]: erro', '');
  check(vp(mut(p => { p.compositions[0].camera.move = 'zoomzoom'; }), 'm2').errs.some(l => /camera\.move: must be one of/.test(l)), 'câmera que não existe: erro', '');
  check(vp(mut(p => { p.compositions[0].camera = { move: 'sway', amp: 0.05, cycles: 1.5, phase: 0, focus: 0.2, fog: 0.3, dof: 0.012 }; }), 'm3').errs.some(l => /camera\.cycles: a whole number/.test(l)), 'ciclos que não são inteiros: erro (o loop não fecharia)', '');
  check(vp(mut(p => { p.compositions[0].camera.amp = 0.6; if (p.compositions[0].camera.move === 'rack') p.compositions[0].camera.move = 'sway'; }), 'm4').errs.some(l => /camera\.amp/.test(l)), 'amplitude absurda: erro', '');
  check(vp(mut(p => { p.canvas.folds = [1500, 3000]; p.compositions[0].camera = { move: 'sway', amp: 0.05, cycles: 1, phase: 0, focus: 0.2, fog: 0.3, dof: 0.012 }; }), 'm5').errs.some(l => /across the declared folds/.test(l)), 'câmera que desliza em superfície dobrada: erro', '');
  check(vp(mut(p => { const t = p.compositions[0].layers.find(L => L.type === 'typeset' || /^information/i.test(L.role || '')); if (t) t.z = 0.3; else p.compositions[0].layers.find(L => L.type === 'instrument').z = 0.3; }), 'm6').out.includes('should stay on the screen plane'), 'texto ou medidor com z: aviso de que ficam no plano da tela', '');
  check(vp(mut(p => { delete p.compositions[0].camera; }), 'm7').out.includes('has no `camera`'), 'z sem câmera: aviso de que os planos não fazem nada', '');
  check(vp(mut(p => { p.compositions[0].layers.forEach(L => delete L.z); }), 'm8').out.includes('no layer has `z`'), 'câmera sem nenhum z: aviso de que nada está num plano', '');
  check(vp(mut(p => { p.meta.depthIR[0].loop.audio = true; }), 'm9').errs.some(l => /camera never listens/.test(l)), 'meta.depthIR que diz que a câmera ouve o áudio: erro', '');
  const legacy = JSON.parse(JSON.stringify(pps[0])); for (const c of legacy.compositions) { delete c.camera; c.layers.forEach(L => delete L.z); } delete legacy.meta.depthIR;
  check(vp(legacy, 'lg').r === 0, 'projeto antigo (sem câmera, sem z, sem meta.depthIR) segue válido', vp(legacy, 'lg').errs.join(' | '));

  /* 10) plan_ir --apply planeja um projeto escrito à mão e é idempotente */
  const of_ = wr('hand', legacy), bf = wr('handb', base());
  execFileSync('python', [join(HERE, 'plan_ir.py'), bf, '--apply', of_], { stdio: 'pipe' });
  const a1 = readFileSync(of_, 'utf8'); execFileSync('python', [join(HERE, 'plan_ir.py'), bf, '--apply', of_], { stdio: 'pipe' });
  const upd = JSON.parse(a1);
  check(upd.compositions.every(c => c.camera) && upd.meta.depthIR.length === 3 && upd.compositions.some(c => c.layers.some(L => L.z !== undefined)) && vp(upd, 'upd').r === 0, 'plan_ir.py --apply dá câmera e planos a um projeto antigo e o resultado valida', '');
  check(a1 === readFileSync(of_, 'utf8'), 'aplicar o plano duas vezes dá o mesmo arquivo (z e câmera não se acumulam)', '');
  check(same(upd.meta.depthIR.map(d => d.camera.move), pps[0].meta.depthIR.map(d => d.camera.move)), 'o plano aplicado pelo plan_ir.py escolhe as mesmas câmeras do gerador (a amplitude vem dos eixos do briefing, que o plano mede a seu modo)', JSON.stringify([upd.meta.depthIR.map(d => d.camera.move), pps[0].meta.depthIR.map(d => d.camera.move)]));

  /* 11) o IR descreve a verdade: o maior deslocamento medido numa peça com câmera sway é o do Depth IR */
  const meas = await J(`const ir = ${JSON.stringify(ctl)}; const c = cam('sway', { amp: ir.camera.amp, focus: ir.camera.focus }); const out = []; for (const r of ir.planes) { load(proj([ring(r.z)], c)); const a = stats(frame(0)), b = stats(frame(60)); out.push(Math.abs(b.cx - a.cx)); } return { max: Math.max(...out), S };`);
  const expectShift = ctl.camera.amp * (ctl.parallax.unitPx > 0 ? meas.S : 0) * Math.max(...ctl.planes.map(r => Math.abs(r.z - ctl.camera.focus)));
  check(near(meas.max, expectShift, 0.8) && ctl.parallax.shiftXPx > 0, `o deslocamento máximo medido (${meas.max.toFixed(1)} px numa tela de ${meas.S}) bate com a fórmula do IR (${expectShift.toFixed(1)} px)`, JSON.stringify([meas, expectShift, ctl.parallax]));
} catch (e) { bad('exceção: ' + (e.stack || e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\n2.5D ok.');
process.exit(fail ? 1 : 0);
