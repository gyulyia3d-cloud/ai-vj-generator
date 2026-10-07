#!/usr/bin/env node
// Teste do gerador sem IA: um brief por clima (12) vira projeto, passa no validador sem erro nem aviso e no esquema, abre no motor,
// desenha todas as composições sem erro de camada, e o último quadro fecha com o primeiro. Também confere as regras de audioStrategy.
//   node generator_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-gen-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const py = (script, ...a) => { try { return { code: 0, out: execFileSync('python', [join(HERE, script), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }) }; } catch (e) { return { code: e.status, out: String(e.stdout) + String(e.stderr) }; } };

const MOODS = ['industrial', 'organic', 'cosmic', 'urban', 'ritual', 'glitch', 'minimal', 'liquid', 'crystalline', 'retro', 'aggressive', 'calm'];
const projects = [];
for (const [k, mood] of MOODS.entries()) {
  const brief = { name: 'Teste ' + mood, lang: k % 2 ? 'pt' : 'en', concept: 'A piece about ' + mood + ' made to test the generator end to end.', mood: [mood], energy: (k % 5) / 4,
    surface: { type: ['led', 'screen', 'projection'][k % 3], w: [1920, 1080, 4500][k % 3], h: [1080, 1920, 800][k % 3], fps: 30 }, time: { bpm: 100 + k * 3, bars: [4, 2, 8][k % 3] }, compositions: 2 + (k % 3) };
  if (k === 3) brief.text = { words: ['SINAL', 'PRESSAO'] };
  const bf = join(tmp, mood + '.brief.json'), pf = join(tmp, mood + '.aivj.json');
  writeFileSync(bf, JSON.stringify(brief));
  const g = py('brief_to_project.py', bf, '--out', pf);
  if (g.code !== 0) { bad(mood + ': gerador falhou: ' + g.out.slice(0, 200)); continue; }
  const v = py('validate_project.py', pf), s = py('schema_check.py', 'project', pf);
  const issues = v.out.split('\n').filter(l => /^(ERROR|WARNING)/.test(l));
  check(!issues.length && s.code === 0, `${mood}: passa no validador (0 erros, 0 avisos) e no esquema`, issues.slice(0, 2).join(' | ') + s.out.slice(0, 100));
  projects.push({ mood, pf });
}
const same = (() => { const a = join(tmp, 'a.json'), b = join(tmp, 'b.json'); py('brief_to_project.py', join(tmp, 'organic.brief.json'), '--out', a); py('brief_to_project.py', join(tmp, 'organic.brief.json'), '--out', b); return readFileSync(a, 'utf8') === readFileSync(b, 'utf8'); })();
check(same, 'mesmo brief, mesmo projeto (determinístico)', 'saídas diferentes');

/* briefs: checagem e erros de estrutura */
writeFileSync(join(tmp, 'bad.json'), JSON.stringify({ name: 'x', concept: 'curto', surface: { w: 10, h: 1080 }, time: { bpm: 500 } }));
const bad1 = py('brief_check.py', join(tmp, 'bad.json')); check(bad1.code === 1 && /below 16/.test(bad1.out) && /above 240/.test(bad1.out), 'brief inválido é recusado com o caminho do erro', bad1.out.slice(0, 160));
const good = py('brief_check.py', join(tmp, 'industrial.brief.json'), '--json'); const gj = JSON.parse(good.out); check(gj.valid && gj.ask.length === 4 && gj.score > 40, 'brief válido recebe nota e 4 perguntas', good.out.slice(0, 160));

/* audioStrategy none: sem motivo é aviso; shader sem uniform de áudio deixa de ser erro */
const calm = JSON.parse(readFileSync(join(tmp, 'calm.aivj.json'), 'utf8'));
calm.audio.strategy = 'none'; calm.meta.contract.audioStrategyReason = '';
calm.compositions[0].layers.find(l => l.type === 'shader').p.src = 'void main(){ gl_FragColor=outc(uC1,.5); }';
writeFileSync(join(tmp, 'none.json'), JSON.stringify(calm));
const nn = py('validate_project.py', join(tmp, 'none.json'));
check(!/never reads uBass/.test(nn.out) && /audioStrategyReason/.test(nn.out), 'audio.strategy none: shader sem áudio vira escolha declarada (aviso de motivo, sem erro)', nn.out.split('\n').filter(l => /ERROR|audioStrategy/.test(l)).join('|').slice(0, 200));
calm.audio.strategy = 'rhythmic'; writeFileSync(join(tmp, 'rh.json'), JSON.stringify(calm));
const rh = py('validate_project.py', join(tmp, 'rh.json')); check(/never reads uBass/.test(rh.out), 'sem declarar none o erro de áudio continua', rh.out.slice(0, 200));
calm.audio.strategy = 'loud'; writeFileSync(join(tmp, 'lo.json'), JSON.stringify(calm));
const lo = py('validate_project.py', join(tmp, 'lo.json')); check(/audio.strategy 'loud'/.test(lo.out), 'estratégia desconhecida é erro', lo.out.slice(0, 200));

if (projects.length) {
  const first = projects[0].pf, html = join(tmp, 'p.html');
  execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), first, '--out', html], { stdio: 'pipe' });
  const page = await openPage(html, { chrome, width: 1200, height: 800 });
  try {
    for (const { mood, pf } of projects) {
      const pj = readFileSync(pf, 'utf8');
      const r = await page.evaluate(`(() => { AIVJ.importJson(${JSON.stringify(pj)}); const P = AIVJ.project, out = []; for (let ci = 0; ci < P.compositions.length; ci++) { AIVJ.LAYERERR.clear(); const LF = AIVJ.loopFrames(), f = n => AIVJ.renderFrame(ci, n, 0.15, true).data, a = f(0), m = f(Math.floor(LF / 2)), z = f(LF); let lit = 0, w = 0; for (let i = 3; i < m.length; i += 4) lit += m[i]; for (let i = 0; i < a.length; i++) if (a[i] !== z[i]) w++; out.push({ ci, lit, w, e: [...AIVJ.LAYERERR.values()] }); } return JSON.stringify(out); })()`);
      const o = JSON.parse(r);
      check(o.every(c => c.lit > 0 && c.w === 0 && !c.e.length), `${mood}: todas as composições desenham, sem erro de camada, e o loop fecha`, r.slice(0, 300));
    }
    const st = await page.evaluate(`(() => { AIVJ.project.audio.strategy = 'none'; const F = AIVJ.frameAt(7), A = AIVJ.layerFrame(F, AIVJ.pm({ type: 'shader', p: {} }), 0, 2, 'shader').bands; AIVJ.project.audio.strategy = 'full'; const B = AIVJ.layerFrame(F, AIVJ.pm({ type: 'shader', p: {} }), 0, 2, 'shader').bands; AIVJ.project.audio.strategy = 'rhythmic'; const C = AIVJ.layerFrame(F, AIVJ.pm({ type: 'shader', p: {} }), 0, 2, 'shader').bands; return JSON.stringify({ none: [A.bass, A.hit, A.mhit, A.pres], noneMoves: A.bt > 0 || F.beatF === 0, full: B.bass / C.bass }); })()`);
    const s = JSON.parse(st); check(s.none.every(v => v === 0) && Math.abs(s.full - 1.3) < 0.05, 'estratégia none zera a reação e full a amplia em 1,3x (motor)', st);
  } catch (e) { bad('exceção: ' + (e.message || e)); }
  await page.close();
}
console.log(fail ? `\n${fail} falha(s).` : '\ngerador ok.');
process.exit(fail ? 1 : 0);
