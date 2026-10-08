#!/usr/bin/env node
// Avaliador estrutural: nota de 0 a 100 por composição a partir de quadros reais renderizados pelo motor, com texto em linguagem natural.
// Mede o que dá para medir sem olhar: hierarquia, contraste, densidade, respiro, coerência de movimento, arco temporal e repetição.
// NÃO substitui o olhar: nota alta quer dizer "sem defeito estrutural", não "bonito". Veja references/evaluation.md.
// A medição mora no motor (app/evaluate.js, função AIVJ.evaluate): este script só abre o projeto no Chrome/Edge e imprime o relatório.
// A mesma função alimenta o botão "Avaliar" da aba Gerar.
//
//   node evaluate.mjs <projeto.aivj.json | projeto.html> [--min 75] [--json] [--out relatorio.md] [--lang pt|en] [--chrome caminho]
//
// Sai com 1 se alguma composição ficar abaixo de --min (quando dado); 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), arg = k => argv.includes(k) ? argv[argv.indexOf(k) + 1] : undefined;
const taken = new Set(['--min', '--out', '--lang', '--chrome'].map(arg).filter(Boolean));
const file = argv.find(a => !a.startsWith('--') && !taken.has(a));
if (!file) { console.error('uso: node evaluate.mjs <projeto.aivj.json|.html> [--min 75] [--json] [--out relatorio.md] [--lang pt|en]'); process.exit(2); }
const MIN = arg('--min') ? parseFloat(arg('--min')) : null;

let html = file;
if (file.endsWith('.json')) { html = join(mkdtempSync(join(tmpdir(), 'aivj-eval-')), 'p.html'); execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), file, '--out', html], { stdio: 'pipe' }); }
const page = await openPage(html, { chrome: arg('--chrome'), width: 1200, height: 800 });
let rep;
try { rep = JSON.parse(await page.evaluate(`JSON.stringify(AIVJ.evaluate(${arg('--lang') ? JSON.stringify(arg('--lang')) : 'undefined'}))`)); } catch (e) { console.error('falha ao medir: ' + (e.message || e)); await page.close(); process.exit(1); }
await page.close();

const { lang, weights, labels: t, compositions: report, set: setScore } = rep;
if (argv.includes('--json')) console.log(JSON.stringify({ lang, loopFrames: rep.loopFrames, set: setScore, weights, compositions: report }, null, 2));
else {
  for (const c of report) {
    console.log(`\n${t.total} ${c.total}/100  ·  ${c.name}`);
    for (const k of Object.keys(weights)) { const v = c.score[k], tag = v >= 80 ? t.strong : v >= 60 ? t.ok : t.weak; console.log(`  ${String(v).padStart(3)}  ${k.padEnd(10)} ${tag.padEnd(6)} ${c.notes[k]}`); }
  }
  console.log(`\n${t.total} ${lang === 'pt' ? 'do set' : 'of the set'}: ${setScore}/100`);
}
if (arg('--out')) {
  const md = [`# ${lang === 'pt' ? 'Avaliação estrutural' : 'Structural evaluation'}`, '', `${t.total} ${lang === 'pt' ? 'do set' : 'of the set'}: **${setScore}/100**`, ''];
  for (const c of report) { md.push(`## ${c.name} — ${c.total}/100`, '', '| | |', '|---|---|', ...Object.keys(weights).map(k => `| ${k} | ${c.score[k]} · ${c.notes[k]} |`), ''); }
  writeFileSync(arg('--out'), md.join('\n'), 'utf8');
}
process.exit(MIN != null && report.some(c => c.total < MIN) ? 1 : 0);
