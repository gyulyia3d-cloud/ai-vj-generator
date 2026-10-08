#!/usr/bin/env node
// Folha de contato e relatório de validação de um projeto, sem abrir a interface.
//
//   node contact_sheet.mjs projeto.html [pasta-de-saida] [--chrome caminho]
//
// Abre o HTML gerado em um Chrome/Edge headless com ?qa=1. O motor autoriza o código (a máquina é
// a sua e o arquivo acabou de ser gerado), renderiza 6 quadros do loop de cada composição com o
// blend das camadas, marca as dobras em vermelho e roda a validação técnica. O script grava um PNG
// por composição e report.json. Sem dependências: usa só o Chrome ou o Edge já instalado.
//
// Saída: NN_nome.png (6 quadros empilhados, de cima para baixo) · report.json · exit 1 se houver ERROR.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
const ci = argv.indexOf('--chrome');
const chromeArg = ci >= 0 ? argv[ci + 1] : null;
const pos = argv.filter((a, i) => !a.startsWith('--') && !(ci >= 0 && i === ci + 1));
if (!pos[0]) { console.error('uso: node contact_sheet.mjs projeto.html [pasta-de-saida] [--chrome caminho]'); process.exit(2); }
const html = resolve(pos[0]);
const outDir = resolve(pos[1] || join(dirname(html), 'contato'));

const CANDIDATES = [
  chromeArg, process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
  '/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'
].filter(Boolean);
const chrome = CANDIDATES.find(p => existsSync(p));
if (!chrome) { console.error('Nenhum Chrome/Edge encontrado. Passe --chrome <caminho> ou defina CHROME_PATH. Alternativa: abra o HTML, aba Exportar, "Folha de contato PNG".'); process.exit(3); }

const url = pathToFileURL(html).href + '?qa=1';
const profile = mkdtempSync(join(tmpdir(), 'aivj-qa-'));
const r = spawnSync(chrome, ['--headless=new', ...(process.getuid?.() === 0 ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', '--no-default-browser-check',
  `--user-data-dir=${profile}`, '--window-size=1600,1000', '--virtual-time-budget=90000', '--dump-dom', url], { encoding: 'utf8', maxBuffer: 1024 * 1024 * 1024, timeout: 240000 });
if (r.error) { console.error('Falha ao iniciar o navegador: ' + r.error.message); process.exit(3); }
const dom = r.stdout || '';
const host = dom.match(/<div id="aivj-qa"([^>]*)>/);
if (!host) { console.error('O motor não respondeu em modo QA. O HTML foi gerado com a versão atual do motor? (assets/engine.html)'); process.exit(3); }
if (!/data-done="1"/.test(host[1])) console.error('Aviso: o QA não terminou dentro do tempo; o relatório pode estar incompleto.');
const err = host[1].match(/data-error="([^"]*)"/); if (err) console.error('Erro no motor: ' + err[1]);

await mkdir(outDir, { recursive: true });
const rep = (() => { const m = dom.match(/<script type="application\/json" id="aivj-qa-json">([\s\S]*?)<\/script>/); try { return m ? JSON.parse(m[1]) : null; } catch { return null; } })();
const safe = s => String(s || 'x').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'X';
let n = 0;
for (const m of dom.matchAll(/<img data-ci="(\d+)" src="data:image\/png;base64,([^"]+)"/g)) {
  const i = +m[1], name = rep?.comps?.[i]?.name || 'comp';
  const file = join(outDir, `${String(i + 1).padStart(2, '0')}_${safe(name)}.png`);
  await writeFile(file, Buffer.from(m[2], 'base64')); n++; console.log('PNG   ' + file);
}
let errors = 0;
if (rep) {
  await writeFile(join(outDir, 'report.json'), JSON.stringify(rep, null, 2));
  console.log(`\n${rep.name} · ${rep.canvas.w}×${rep.canvas.h} · ${rep.bpm} BPM · loop ${rep.bars} compassos = ${rep.loopFrames} quadros`);
  for (const c of rep.comps) {
    const e = c.issues.filter(x => x.lvl === 'ERROR'), w = c.issues.filter(x => x.lvl === 'WARNING'), o = c.issues.filter(x => x.lvl === 'OPTIMIZATION');
    errors += e.length;
    console.log(`\n[${c.i + 1}] ${c.name}: ${e.length} ERROR · ${w.length} WARNING · ${o.length} OPTIMIZATION`);
    for (const x of [...e, ...w, ...o]) console.log(`   ${x.lvl.padEnd(12)} ${x.t}: ${x.m}`);
  }
} else console.error('Sem relatório de validação.');
if (!n) { console.error('Nenhuma folha de contato foi gerada.'); process.exit(3); }
console.log(`\n${n} folha(s) em ${outDir}. Cada PNG empilha 6 quadros do loop; as marcas vermelhas no topo são as dobras e as bordas da calha.`);
process.exit(errors ? 1 : 0);
