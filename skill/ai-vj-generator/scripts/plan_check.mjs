#!/usr/bin/env node
// Teste do caminho de uma IA: plan_ir.py imprime os dois IR, grava no projeto escrito à mão (camadas com nomes livres e role "hero: ...") e posiciona as camadas;
// aplicar duas vezes dá o mesmo arquivo; sem conceito reconhecido só registra; o validador aceita o resultado e avisa quando falta o plano.
//   node plan_check.mjs      (sem navegador)
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url)), tmp = mkdtempSync(join(tmpdir(), 'aivj-plan-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const py = (script, ...a) => execFileSync('python', [join(HERE, script), ...a], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
const validate = f => { try { return { code: 0, out: py('validate_project.py', f) }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
const L = (type, name, role, p = {}, extra = {}) => Object.assign({ type, name, role, on: true, opacity: 1, blend: 'normal', p }, extra);
const comp = (n) => ({ name: 'C' + n, hypothesis: 'x', layers: [
  L('bg', 'fundo', 'ground: the quiet reference', { grain: 0 }),
  L('shader', 'campo escuro', 'ground: slow matter', { preset: 'CAMPO FBM', p1: 1.6, p2: 0.5, p3: 0.7, p4: 1, audio: 0.6 }),
  L('tunnel', 'anéis de pressão', 'hero: the single dominant figure', { shape: 'circle', count: 10, weight: 6 }),
  L('shape', 'marca lateral', 'structure: the module the eye measures against', { kind: 'ring', layout: 'single', size: 120 }),
  L('instrument', 'espectro', 'instrument: shows the signal', { kind: 'bars', size: 0.28 }),
  L('typeset', 'titulo', 'information: title', { title: 'PRESSÃO', size: 150 }),
  L('post', 'acabamento', 'finish: vignette', { vig: 0.3 }),
] });
const project = { schema: 'ai-vj-generator/2', id: 'plan', seed: 5, meta: { name: 'PLANO', brief: 'x', lang: 'pt' }, canvas: { w: 4500, h: 800, fps: 30, target: 'led' }, time: { bpm: 110, bars: 4, loop: true, seamless: true, mode: 'loop' },
  audio: { reactive: true, sens: 1, smooth: 0.7, strategy: 'rhythmic' }, palette: { bg: '#000103', primary: '#DEE9F5', secondary: '#5F7A99', accent: '#E8A33D' }, compositions: [comp(1), comp(2), comp(3)] };
const brief = { name: 'Plano', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], surface: { type: 'led', w: 4500, h: 800, fps: 30 }, time: { bpm: 110, bars: 4 }, compositions: 3 };
const f = join(tmp, 'project.json'), b = join(tmp, 'brief.json');
writeFileSync(b, JSON.stringify(brief)); writeFileSync(f, JSON.stringify(project, null, 2));

try {
  const v0 = validate(f);
  check(v0.code === 0 && /no meta\.creativeIR/.test(v0.out), 'o validador avisa (nota) quando o projeto não tem o plano e diz o comando para criá-lo', v0.out.slice(-200));

  const printed = JSON.parse(py('plan_ir.py', b));
  check(printed.creativeIR.drives && printed.creativeIR.concept === 'containment' && printed.compositionIR.length === 3 && new Set(printed.compositionIR.map(c => c.grammar)).size === 3, `plan_ir.py brief.json imprime os dois IR (conceito ${printed.creativeIR.concept}, gramáticas ${printed.compositionIR.map(c => c.grammar).join(', ')})`, JSON.stringify(Object.keys(printed)));

  const msg = py('plan_ir.py', b, '--apply', f);
  const p1 = JSON.parse(readFileSync(f, 'utf8'));
  check(/3 composition\(s\) placed/.test(msg) && p1.meta.creativeIR.concept === 'containment' && p1.meta.compositionIR.length === 3, '--apply grava meta.creativeIR e meta.compositionIR e posiciona as 3 composições', msg);
  const c0 = p1.compositions[0].layers, hero = c0[2], st = c0[3], ins = c0[4], ty = c0[5];
  check(typeof hero.p.x === 'number' && hero.p.sx > 0 && hero.mod.some(m => m.shape === 'env' && m.k === 'sx') && typeof st.p.x === 'number' && ins.p.cx !== undefined && ty.p.cx !== undefined, 'camadas com nome livre são achadas pelo role ("hero:", "structure:") e pelo tipo: herói e estrutura posicionados, instrumento e texto no lugar', JSON.stringify([hero.p, st.p, ins.p, ty.p]).slice(0, 300));
  check(p1.compositions[0].layers[0].p.x === undefined && p1.compositions[0].layers[1].p.x === undefined && p1.compositions[0].layers[6].p.x === undefined, 'fundo, campo e acabamento (camadas sem tier de figura) não são movidos', '');

  const before = readFileSync(f, 'utf8'); py('plan_ir.py', b, '--apply', f);
  check(readFileSync(f, 'utf8') === before, 'aplicar o plano duas vezes dá o mesmo arquivo (os envelopes não se acumulam)', 'arquivo mudou');
  const v1 = validate(f);
  check(v1.code === 0 && !/no meta\.creativeIR/.test(v1.out), 'o projeto com o plano passa no validador (envelope env incluído) e a nota some', v1.out.slice(-300));

  /* sem conceito reconhecido: só registra */
  const f2 = join(tmp, 'project2.json'), b2 = join(tmp, 'brief2.json');
  writeFileSync(f2, JSON.stringify(project, null, 2)); writeFileSync(b2, JSON.stringify(Object.assign({}, brief, { concept: 'Neutral piece with nothing to match.', mood: ['calm'] })));
  const m2 = py('plan_ir.py', b2, '--apply', f2), p2 = JSON.parse(readFileSync(f2, 'utf8'));
  check(/recorded only/.test(m2) && p2.meta.creativeIR.drives === false && p2.compositions[0].layers[2].p.x === undefined, 'sem conceito reconhecido o plano é só registrado, nada se move, e a dica de como conduzir aparece', m2);
  /* verbos pedidos conduzem */
  const b3 = join(tmp, 'brief3.json'); writeFileSync(b3, JSON.stringify(Object.assign({}, brief, { concept: 'Neutral piece with nothing to match.', verbs: ['erode', 'dissolve'] })));
  const f3 = join(tmp, 'project3.json'); writeFileSync(f3, JSON.stringify(project, null, 2));
  const m3 = py('plan_ir.py', b3, '--apply', f3);
  check(/placed by the plan/.test(m3) && JSON.parse(readFileSync(f3, 'utf8')).meta.creativeIR.visualVerbs[0] === 'erode', '`verbs` no briefing conduz o plano sem palavra de conceito', m3);
  /* briefing sem superfície */
  let msg4 = ''; try { py('plan_ir.py', join(tmp, 'brief4.json')); } catch (e) { msg4 = String(e.stderr || e.message); }
  writeFileSync(join(tmp, 'brief4.json'), JSON.stringify({ name: 'x', concept: 'uma peça sem superfície declarada' }));
  try { py('plan_ir.py', join(tmp, 'brief4.json')); msg4 = ''; } catch (e) { msg4 = String(e.stderr); }
  check(/needs `surface`/.test(msg4), 'briefing sem superfície é recusado com mensagem clara', msg4.slice(0, 120));
} catch (e) { bad('exceção: ' + (e.message || e)); }
console.log(fail ? `\n${fail} falha(s).` : '\nplan_ir ok.');
process.exit(fail ? 1 : 0);
