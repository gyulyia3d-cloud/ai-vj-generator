#!/usr/bin/env node
// Teste do avaliador estrutural, só com controles: um projeto bom tira nota alta, projetos propositalmente ruins tiram nota baixa
// exatamente na métrica que quebram, duas execuções dão o mesmo número, e duas composições iguais derrubam a métrica de repetição.
// Um avaliador que não reprova nada não serve: por isso cada defeito é fabricado.
//   node evaluate_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? ['--chrome', argv[argv.indexOf('--chrome') + 1]] : [];
const tmp = mkdtempSync(join(tmpdir(), 'aivj-evalc-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const ev = (proj, name) => {
  const f = join(tmp, name + '.aivj.json'); writeFileSync(f, JSON.stringify(proj));
  try { return JSON.parse(execFileSync(process.execPath, [join(HERE, 'evaluate.mjs'), f, '--json', ...chrome], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 })); }
  catch (e) { if (e.status === 3) { console.log('  --   avaliador pulado (sem navegador)'); process.exit(3); } throw e; }
};

const brief = { name: 'Controle', lang: 'pt', concept: 'Uma peça de controle para testar o avaliador com defeitos fabricados.', mood: ['organic'], energy: 0.4, density: 'balanced', surface: { type: 'screen', w: 1280, h: 720 }, time: { bpm: 100, bars: 4 }, compositions: 2 };
writeFileSync(join(tmp, 'b.json'), JSON.stringify(brief));
execFileSync('python', [join(HERE, 'brief_to_project.py'), join(tmp, 'b.json'), '--out', join(tmp, 'good.json')], { stdio: 'pipe' });
const good = JSON.parse(readFileSync(join(tmp, 'good.json'), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));
const A = ev(good, 'good'), A2 = ev(good, 'good2');
check(A.compositions.every(c => c.total >= 75), `projeto gerado tira nota alta (${A.compositions.map(c => c.total).join(' / ')})`, JSON.stringify(A.compositions.map(c => c.score)));
check(JSON.stringify(A.compositions.map(c => c.score)) === JSON.stringify(A2.compositions.map(c => c.score)), 'duas execuções dão as mesmas notas (determinístico)', 'notas diferentes');

// 1) vazio: só o fundo
const empty = clone(good); empty.compositions.forEach(c => c.layers = c.layers.filter(l => l.type === 'bg'));
const E = ev(empty, 'empty');
check(E.compositions.every(c => c.total < 50 && c.score.contrast < 20 && c.score.motion < 20), `projeto vazio é reprovado (nota ${E.compositions[0].total}; contraste e movimento baixos)`, JSON.stringify(E.compositions[0].score));

// 2) tela cheia: um campo opaco de ruído cobrindo tudo, sem respiro
const full = clone(good); full.compositions.forEach(c => { c.layers.forEach(l => { if (l.type === 'shader') { l.opacity = 1; l.p = Object.assign({}, l.p, { preset: 'CAMPO FBM', p1: 6, p2: 1, p3: 1, p4: 1, c1: 'primary', c2: 'accent' }); } }); });
const F = ev(full, 'full');
check(F.compositions.every(c => c.score.breathing < 40), `tela cheia perde na métrica de respiro (${F.compositions.map(c => c.score.breathing).join(' / ')} contra ${A.compositions.map(c => c.score.breathing).join(' / ')})`, JSON.stringify(F.compositions.map(c => c.score)));

// 3) parada: uma forma estática, sem movimento nenhum
const still = clone(good); still.compositions.forEach(c => { c.layers = [{ type: 'bg', name: 'FUNDO', role: 'x' }, { type: 'shape', name: 'FORMA', role: 'x', on: true, opacity: 1, p: { kind: 'circle', layout: 'single', size: 300, pulseAmt: 0, spin: 0 } }]; });
const S = ev(still, 'still');
check(S.compositions.every(c => c.score.motion < 30 && c.score.arc < 30), `projeto parado perde em movimento e arco (movimento ${S.compositions[0].score.motion}, arco ${S.compositions[0].score.arc})`, JSON.stringify(S.compositions[0].score));

// 4) repetição: duas composições idênticas
const dup = clone(good); dup.compositions[1] = clone(dup.compositions[0]); dup.compositions[1].name = 'COPIA';
const D = ev(dup, 'dup');
check(D.compositions.every(c => c.score.repetition < 20) && A.compositions.every(c => c.score.repetition > 60), `composições idênticas derrubam a repetição (${D.compositions[0].score.repetition} contra ${A.compositions[0].score.repetition} no projeto bom)`, JSON.stringify(D.compositions.map(c => c.score.repetition)));

// 5) hierarquia estrutural: seis camadas fortes disputando
const flat = clone(good); flat.compositions.forEach(c => c.layers.forEach(l => { if (l.type !== 'bg' && l.type !== 'post') l.opacity = 1; }));
const H = ev(flat, 'flat');
check(H.compositions.every(c => c.raw.strongLayers >= 5) && H.compositions[0].score.hierarchy < A.compositions[0].score.hierarchy, `todas as camadas em 100% derrubam a hierarquia (${H.compositions[0].score.hierarchy} contra ${A.compositions[0].score.hierarchy})`, JSON.stringify(H.compositions[0].raw));

check(A.compositions[0].notes.hierarchy && Object.keys(A.weights).length === 7, 'cada métrica vem com texto em linguagem natural e 7 pesos', JSON.stringify(A.compositions[0].notes));
console.log(fail ? `\n${fail} falha(s).` : '\navaliador ok.');
process.exit(fail ? 1 : 0);
