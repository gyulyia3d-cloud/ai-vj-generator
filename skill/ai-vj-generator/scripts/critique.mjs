#!/usr/bin/env node
// Crítica (fase 15): três juízos separados por composição (ESTRUTURAL, ARTÍSTICO, TÉCNICO) e as falhas críticas, a partir de quadros reais do motor.
// ESTRUTURAL é o avaliador de sempre (evaluate.mjs). ARTÍSTICO compara o que foi medido com o que o projeto declarou (paleta, ponto focal, espaço negativo,
// arco de densidade); sem intenção declarada o item fica "não julgado". TÉCNICO: determinismo, erros de camada/shader, flash, validação de export, emenda do loop.
// Uma falha crítica reprova a composição qualquer que seja a nota. Veja references/evaluation.md.
//
//   node critique.mjs <projeto.aivj.json | projeto.html> [--json] [--out relatorio.md] [--lang pt|en] [--strict] [--no-flash] [--chrome caminho]
//
// Sai com 1 se alguma composição reprovar (FAIL); com --strict, também se algum eixo julgado ficar abaixo de 60 (REVIEW). 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = k => argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined;
const taken = new Set(['--out', '--lang', '--chrome'].map(arg).filter(Boolean));
const file = argv.find(a => !a.startsWith('--') && !taken.has(a));
if (!file) { console.error('uso: node critique.mjs <projeto.aivj.json|.html> [--json] [--out relatorio.md] [--lang pt|en] [--strict] [--no-flash]'); process.exit(2); }

let html = file;
if (file.endsWith('.json')) { html = join(mkdtempSync(join(tmpdir(), 'aivj-crit-')), 'p.html'); execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), file, '--out', html], { stdio: 'pipe' }); }
const page = await openPage(html, { chrome: arg('--chrome'), width: 1200, height: 800 });
let rep;
try { rep = JSON.parse(await page.evaluate(`JSON.stringify(AIVJ.critique(${arg('--lang') ? JSON.stringify(arg('--lang')) : 'undefined'}, { flash: ${argv.includes('--no-flash') ? 'false' : 'true'} }))`)); }
catch (e) { console.error('falha ao medir: ' + (e.message || e)); await page.close(); process.exit(1); }
await page.close();

const { lang, labels: L, compositions } = rep, pt = lang === 'pt';
const bar = v => v == null ? (pt ? 'não julgado' : 'not judged') : `${v}/100`;
if (argv.includes('--json')) console.log(JSON.stringify(rep, null, 2));
else {
  for (const c of compositions) {
    console.log(`\n${c.verdict}  ·  ${c.name}`);
    for (const x of c.critical) console.log(`  CRÍTICA  ${x.id.padEnd(22)} [${L[x.axis]}] ${x.note}`);
    console.log(`  ${L.structural.padEnd(10)} ${bar(c.structural.total)}   ${Object.entries(c.structural.score).filter(([, v]) => v < 60).map(([k, v]) => `${k} ${v}`).join(', ') || (pt ? 'nenhuma medida fraca' : 'no weak measure')}`);
    console.log(`  ${L.artistic.padEnd(10)} ${bar(c.artistic.score)}   (${c.artistic.judged}/${c.artistic.of} ${pt ? 'itens julgados' : 'items judged'})`);
    for (const i of c.artistic.items) console.log(`      ${(i.judged ? String(i.score) : '--').padStart(3)}  ${i.id.padEnd(9)} ${i.note}`);
    for (const e of c.artistic.needsEye) console.log(`      olho  ${e.id}: ${e.text.slice(0, 110)}`);
    console.log(`  ${L.technical.padEnd(10)} ${bar(c.technical.score)}`);
    for (const i of c.technical.items) console.log(`      ${String(i.score).padStart(3)}  ${i.id.padEnd(11)} ${i.note}`);
  }
  console.log(`\n${pt ? 'Veredito do set' : 'Set verdict'}: ${rep.verdict}`);
}
if (arg('--out')) {
  const md = [`# ${pt ? 'Crítica' : 'Critique'}`, '', `${pt ? 'Veredito' : 'Verdict'}: **${rep.verdict}**`, ''];
  for (const c of compositions) {
    md.push(`## ${c.name}: ${c.verdict}`, '');
    if (c.critical.length) md.push(`**${pt ? 'Falhas críticas' : 'Critical failures'}**`, '', ...c.critical.map(x => `- \`${x.id}\` (${L[x.axis]}): ${x.note}`), '');
    md.push(`### ${L.structural}: ${bar(c.structural.total)}`, '', ...Object.keys(rep.weights).map(k => `- ${k} ${c.structural.score[k]}: ${c.structural.notes[k]}`), '');
    md.push(`### ${L.artistic}: ${bar(c.artistic.score)}`, '', ...c.artistic.items.map(i => `- ${i.id} ${i.judged ? i.score : '--'}: ${i.note}`), ...c.artistic.needsEye.map(e => `- ${pt ? 'só o olho decide' : 'eye only'} (${e.id}): ${e.text}`), '');
    md.push(`### ${L.technical}: ${bar(c.technical.score)}`, '', ...c.technical.items.map(i => `- ${i.id} ${i.score}: ${i.note}`), '');
  }
  writeFileSync(arg('--out'), md.join('\n'), 'utf8');
}
process.exit(compositions.some(c => c.verdict === 'FAIL') || (argv.includes('--strict') && compositions.some(c => c.verdict === 'REVIEW')) ? 1 : 0);
