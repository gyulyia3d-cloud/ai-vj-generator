#!/usr/bin/env node
// Teste da semântica de áudio (fase 10): Python = navegador (declarações e geradores); a estratégia decide o orçamento de camadas que ouvem (uma história por camada: graves, médios, agudos, golpes);
// o motor respeita a declaração (a camada que não ouve não recebe banda; a que ouve recebe só as classes que declarou); o arquétipo põe golpe no herói; declarar é idempotente;
// o validador aceita o projeto, não exige mais que todo shader ouça quando ele declara que não ouve, e recusa declaração quebrada ou orçamento estourado; projeto antigo (sem declaração) segue a regra antiga.
//   node audio_sem_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-asem-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const REG = JSON.parse(readFileSync(join(HERE, '..', 'registry', 'audio.json'), 'utf8'));
const STRATS = ['none', 'subtle', 'structural', 'rhythmic', 'full'];
const S = (w, h, type = 'led', fps = 30) => ({ type, w, h, fps });
const base = over => Object.assign({ name: 'Teste Audio', lang: 'pt', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], energy: 0.5, surface: S(4500, 800), time: { bpm: 120, bars: 4 }, compositions: 3 }, over || {});
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 4 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.AUDIOSEM && window.AIVJ.GENAI)' });
const E = s => page.evaluate(s);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const wr = (name, o) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(o)); return f; };
const py = (code, ...args) => execFileSync('python', ['-X', 'utf8', '-c', code, ...args], { encoding: 'utf8', cwd: HERE });
const vp = (p, name) => { const f = wr(name, p); let r = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { r = e.status; out = String(e.stdout); } return { r, out, errs: out.split('\n').filter(l => /^ERROR/.test(l)) }; };
const bpy = (brief, name) => { const out = join(tmp, name + '.aivj.json'); execFileSync('python', [join(HERE, 'brief_to_project.py'), wr(name, brief), '--out', out], { stdio: 'pipe' }); return JSON.parse(readFileSync(out, 'utf8')); };
const bjs = brief => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`).then(JSON.parse);

try {
  /* 1) o gerador do navegador e o Python dão as mesmas declarações, em todas as camadas das 3 composições */
  const brief = base(), pp = bpy(brief, 'b1'), pjs = await bjs(brief);
  check(same(pp.meta.audioSemantics, pjs.meta.audioSemantics), 'Python e navegador gravam o mesmo meta.audioSemantics (3 composições)', JSON.stringify([pp.meta.audioSemantics[0], pjs.meta.audioSemantics[0]]).slice(0, 400));
  check(pp.compositions.every((c, i) => c.layers.every((L, k) => same(L.temporal, pjs.compositions[i].layers[k].temporal) && same(L.p && L.p.audio, pjs.compositions[i].layers[k].p && pjs.compositions[i].layers[k].p.audio))), 'toda camada sai com a mesma declaração temporal e o mesmo p.audio nos dois geradores', '');
  check(pp.compositions.every(c => c.layers.every(L => L.temporal && REG.behaviors[L.temporal.behavior] && typeof L.temporal.reason === 'string' && L.temporal.reason.length > 8)), 'toda camada de todas as composições declara comportamento e motivo', '');

  /* 2) declare direto: Python = navegador para cada estratégia e arquétipo, e idempotente */
  const lay = pp.compositions[0].layers.map(L => { const c = JSON.parse(JSON.stringify(L)); delete c.temporal; return c; });
  const pyDecl = (strat, arch) => JSON.parse(py('import sys,json; sys.path.insert(0,"."); import audio_semantics as a; L=json.load(open(sys.argv[1],encoding="utf-8")); s=a.declare(L, sys.argv[2], None if sys.argv[3]=="-" else sys.argv[3]); print(json.dumps({"s":s,"L":L},ensure_ascii=False))', wr('lay', lay), strat, arch || '-'));
  const jsDecl = (strat, arch) => E(`(() => { const L = ${JSON.stringify(lay)}, s = AIVJ.AUDIOSEM.declare(L, ${JSON.stringify(strat)}, ${JSON.stringify(arch || null)}); return JSON.stringify({ s, L }); })()`).then(JSON.parse);
  const rows = {};
  for (const st of STRATS) for (const ar of [null, 'pulse', 'breathe']) { const a = pyDecl(st, ar), b = await jsDecl(st, ar); rows[st + '/' + ar] = a; if (!same(a, b)) bad(`Python e navegador diferem em ${st}/${ar}`); }
  ok('declare dá o mesmo resultado no Python e no navegador nas 5 estratégias × 3 arquétipos');
  const twice = await E(`(() => { const L = ${JSON.stringify(lay)}; AIVJ.AUDIOSEM.declare(L, 'rhythmic', 'pulse'); const a = JSON.stringify(L); AIVJ.AUDIOSEM.declare(L, 'rhythmic', 'pulse'); return a === JSON.stringify(L); })()`);
  check(twice, 'declarar duas vezes não muda nada (idempotente)', '');

  /* 3) o orçamento da estratégia e uma história por camada */
  const lis = r => r.s.layers.filter((x, i) => REG.behaviors[x.behavior].reactive && !REG.exempt.includes(x.tier));
  for (const st of STRATS) {
    const r = rows[st + '/null'], n = lis(r).length;
    check(n === r.s.reactive && n <= REG.budget[st] && (st !== 'none' || n === 0) && (st === 'none' || n >= 1), `${st}: ${n} camada(s) ouvem (orçamento ${REG.budget[st]})`, JSON.stringify(r.s.layers));
  }
  const bandsOf = r => lis(r).flatMap(x => x.listens);
  const rh = rows['rhythmic/null'];
  check(new Set(lis(rh).map(x => x.tier)).size === lis(rh).length && lis(rh).map(x => x.tier).sort().join() === 'ground,hero,structure', 'rhythmic: herói, estrutura e um campo de chão ouvem; ATMOSFERA e o resto marcam o tempo sem ouvir', JSON.stringify(lis(rh)));
  check(new Set(bandsOf(rh)).size === bandsOf(rh).length || bandsOf(rh).every(b => b !== 'mid'), 'rhythmic: os médios ficam com uma camada só (a estrutura)', JSON.stringify(bandsOf(rh)));
  const atm = rh.L.find(L => /ATMOSFERA/.test(L.name));
  check(atm.temporal.behavior === 'drift' && !('audio' in (atm.p || {})), 'a ATMOSFERA é drift: não ouve e perde o p.audio', JSON.stringify(atm.temporal));
  check(rows['rhythmic/pulse'].s.layers.find(x => x.tier === 'hero').behavior === 'accent' && rows['rhythmic/breathe'].s.layers.find(x => x.tier === 'hero').behavior === 'follow' && rows['full/breathe'].s.layers.find(x => x.tier === 'hero').behavior === 'accent', 'o arquétipo põe golpe no herói (pulse = accent) e a respiração segue os graves (follow); no full o herói sempre acentua', '');
  check(rows['structural/null'].s.layers.find(x => x.tier === 'ground' && x.behavior === 'section') !== undefined && rows['structural/null'].s.layers.every(x => x.behavior !== 'accent'), 'structural: o chão segue a presença da faixa (section) e nenhum golpe sacode a imagem', '');
  check(rows['none/null'].L.every(L => !('audio' in (L.p || {})) || !(L.p.audio > 0)) && rows['none/null'].s.layers.filter(x => REG.behaviors[x.behavior].reactive).every(x => x.tier === 'instrument'), 'none: só o instrumento (o medidor) ouve; nenhuma camada tem p.audio', '');
  const inst = rh.s.layers.find(x => x.tier === 'instrument');
  check(inst && inst.behavior === 'follow' && inst.listens.length === 5, 'o instrumento ouve as cinco classes e fica fora do orçamento', JSON.stringify(inst));

  /* 4) o motor respeita a declaração: layerFrame fecha o portão e mascara as bandas; os tempos integrados e as ondas do BPM seguem */
  const probe = tp => E(`(() => { const P = AIVJ.project, comp = P.compositions[0], L = { type: 'shape', name: 'X', p: { kind: 'circle', size: 100, audio: 1, band: 'kick' }, mod: [{ k: 'size', src: 'bass', min: 100, max: 300, mode: 'set' }] }, TP = ${JSON.stringify(tp || null)};
    const out = { b: [], m: [] }, fpb = P.canvas.fps * 60 / P.time.bpm;
    for (let n = 0; n < Math.round(fpb * 4); n++) { const F = AIVJ.frameAt(n, comp), lf = AIVJ.layerFrame(F, AIVJ.pm(L), 1, 2, 'shape', TP || undefined); out.b.push(lf.bands); out.m.push(AIVJ.applyMods(AIVJ.pm(L), L, lf).size); out.a = Math.max(out.a || 0, lf.a); }
    const mx = k => Math.max(...out.b.map(b => b[k])); return JSON.stringify({ bass: mx('bass'), mid: mx('mid'), high: mx('high'), hit: mx('hit'), kick: mx('kick'), pres: mx('pres'), bt: mx('bt'), bsin: Math.max(...out.b.map(b => Math.abs(b.bsin || 0))), a: out.a, sizeMax: Math.max(...out.m), sizeMin: Math.min(...out.m) }); })()`).then(JSON.parse);
  const legacy = await probe(null), drift = await probe({ behavior: 'drift', listens: [] }), midOnly = await probe({ behavior: 'follow', listens: ['mid'] }), acc = await probe({ behavior: 'accent', listens: ['bass', 'hit'] }), all = await probe({ behavior: 'follow', listens: ['bass', 'mid', 'high', 'hit', 'level'] });
  check(legacy.bass > 0.2 && legacy.kick > 0.5 && legacy.sizeMax > 250, 'sem declaração (projeto antigo): as bandas chegam como sempre', JSON.stringify(legacy));
  check(drift.bass === 0 && drift.mid === 0 && drift.high === 0 && drift.hit === 0 && drift.kick === 0 && drift.pres === 0 && drift.a === 0, 'drift: nenhuma banda instantânea nem o pulso do áudio chegam à camada', JSON.stringify(drift));
  check(drift.sizeMax === drift.sizeMin && drift.sizeMax === 100, 'drift: uma modulação com src bass não move nada (o portão fecha também a modulação)', JSON.stringify([drift.sizeMin, drift.sizeMax]));
  check(drift.bt === legacy.bt && Math.abs(drift.bsin - legacy.bsin) < 1e-9 && drift.bsin > 0, 'drift: os tempos integrados e as ondas do BPM continuam (a camada marca o tempo sem ouvir)', JSON.stringify([drift.bt, legacy.bt, drift.bsin]));
  check(midOnly.mid > 0.2 && midOnly.bass === 0 && midOnly.hit === 0 && midOnly.kick === 0 && midOnly.high === 0, 'follow ["mid"]: só a banda média chega; graves, agudos e golpes ficam em zero', JSON.stringify(midOnly));
  check(acc.bass > 0.2 && acc.hit > 0.5 && acc.kick > 0.5 && acc.mid === 0 && acc.high === 0 && acc.sizeMax > 250, 'accent ["bass","hit"]: graves e golpes chegam, a modulação por bass move a camada; médios e agudos não', JSON.stringify(acc));
  check(all.bass > 0.2 && all.mid > 0.2 && all.high > 0.1 && all.hit > 0.5 && all.sizeMax > 250, 'controle negativo: declarando as cinco classes tudo volta a chegar (o zero de antes vem da declaração, não do teste)', JSON.stringify(all));
  const shaderGate = await E(`(() => { const P = AIVJ.project, comp = P.compositions[0], F = AIVJ.frameAt(0, comp), f = tp => AIVJ.layerFrame(F, { audio: 0, band: 'bass', speed: 1, div: '1/4', phase: 0 }, 1, 2, 'shader', tp); return JSON.stringify({ old: f(undefined).bands.bass, drift: f({ behavior: 'drift', listens: [] }).bands.bass, follow: f({ behavior: 'follow', listens: ['bass'] }).bands.bass }); })()`).then(JSON.parse);
  check(shaderGate.old > 0.2 && shaderGate.drift === 0 && shaderGate.follow > 0.2, 'shader: sem declaração a regra antiga mantém o piso de 0.35; declarado drift não ouve; declarado follow ouve', JSON.stringify(shaderGate));

  /* 5) validador: aceita o projeto gerado; shader que não ouve passa quando declara que não ouve; recusa declaração quebrada e orçamento estourado */
  const v0 = vp(pp, 'v0');
  check(v0.r === 0 && !v0.out.includes('legacy project'), 'o projeto gerado passa no validador, sem aviso de projeto antigo', v0.errs.join(' | '));
  const mut = f => { const p = JSON.parse(JSON.stringify(pp)); f(p); return p; };
  const quietShader = mut(p => { const L = p.compositions[0].layers.find(x => x.type === 'shader' && /ATMOSFERA/.test(x.name)); L.p = L.p || {}; L.p.src = 'precision mediump float; uniform vec2 uRes; void main(){ gl_FragColor = vec4(0.1); }'; L.p.audio = undefined; delete L.p.audio; });
  const vq = vp(quietShader, 'vq');
  check(!vq.errs.some(l => /never reads|Every shader/.test(l)), 'um shader drift que não lê uniform de áudio não é mais erro', vq.errs.join(' | '));
  const legacyShader = mut(p => { for (const L of p.compositions[0].layers) delete L.temporal; const L = p.compositions[0].layers.find(x => x.type === 'shader' && /ATMOSFERA/.test(x.name)); L.p = L.p || {}; L.p.src = 'precision mediump float; uniform vec2 uRes; void main(){ gl_FragColor = vec4(0.1); }'; });
  const vl = vp(legacyShader, 'vl');
  check(vl.errs.some(l => /never reads/.test(l)) && /legacy project/.test(vl.out), 'controle negativo: o mesmo shader em projeto sem declaração segue a regra antiga (erro) e a composição avisa que é projeto antigo', vl.errs.join(' | '));
  const none4 = mut(p => { p.audio.strategy = 'none'; p.meta.contract.audioStrategyReason = 'sala silenciosa'; });
  check(vp(none4, 'n4').errs.some(l => /strategy 'none' allows 0/.test(l)), 'estratégia none com camada declarada follow/accent: erro de orçamento', '');
  const four = mut(p => { for (const L of p.compositions[0].layers) if (['ATMOSFERA I', 'MARCA I', 'PALAVRA I', 'INFORMAÇÃO I', 'ACABAMENTO'].includes(L.name)) { L.temporal = { behavior: 'follow', listens: ['high'], reason: 'teste' }; L.p = L.p || {}; L.p.audio = 0.5; } });
  check(vp(four, 'q4').errs.some(l => /at most 3|allows 3/.test(l)), 'mais de 3 camadas que ouvem: erro', '');
  const dl = mut(p => { p.compositions[0].layers.find(x => x.temporal.behavior === 'drift').temporal.listens = ['bass']; });
  check(vp(dl, 'dl').errs.some(l => /does not listen to the audio, but `listens`/.test(l)), 'drift que declara listens: erro', '');
  const fn = mut(p => { p.compositions[0].layers.find(x => x.temporal.behavior === 'follow' && x.type !== 'instrument').temporal.listens = []; });
  check(vp(fn, 'fn').errs.some(l => /needs at least one of/.test(l)), 'follow sem listens: erro', '');
  const bb = mut(p => { p.compositions[0].layers[1].temporal.behavior = 'wiggle'; });
  check(vp(bb, 'bb').errs.some(l => /temporal\.behavior: must be one of/.test(l)), 'comportamento que não existe: erro', '');
  const ghost = mut(p => { const L = p.compositions[0].layers.find(x => x.type === 'shape' || x.type === 'lines'); L.temporal = { behavior: 'follow', listens: ['bass'], reason: 'x' }; L.p.audio = 0; for (const o of ['HER', 'ESTRUTURA']) { /* o orçamento fica de fora */ } });
  const vg = vp(ghost, 'vg'); check(/nothing connects it to the audio/.test(vg.out) || vg.errs.length, 'camada declarada follow com p.audio 0 e sem modulação por banda: aviso de que nada a liga ao áudio (ou erro de orçamento)', vg.out.split('\n').slice(0, 6).join(' | '));

  /* 6) a galeria e o plano: plan_ir --apply declara um projeto antigo sem mexer no resto */
  const old = JSON.parse(JSON.stringify(pp)); for (const c of old.compositions) for (const L of c.layers) delete L.temporal; delete old.meta.audioSemantics;
  const of_ = wr('old', old), bf = wr('oldb', base());
  execFileSync('python', [join(HERE, 'plan_ir.py'), bf, '--apply', of_], { stdio: 'pipe' });
  const upd = JSON.parse(readFileSync(of_, 'utf8'));
  check(upd.compositions.every(c => c.layers.every(L => L.temporal)) && upd.meta.audioSemantics.length === 3 && vp(upd, 'upd').r === 0, 'plan_ir.py --apply declara o comportamento de um projeto antigo e ele passa no validador', vp(upd, 'upd').errs.join(' | '));
} catch (e) { bad('exceção: ' + (e.stack || e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nsemântica de áudio ok.');
process.exit(fail ? 1 : 0);
