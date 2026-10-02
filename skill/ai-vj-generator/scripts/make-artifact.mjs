#!/usr/bin/env node
// Embed a PROJECT JSON into the AI VJ Generator engine.
// usage: node make-artifact.mjs project.json [--out file.html] [--artifact]
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const MARK = '/*__PROJECT_JSON__*/';
const ENGINE = fileURLToPath(new URL('../assets/engine.html', import.meta.url));
const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out');
const out = outIdx >= 0 ? argv[outIdx + 1] : null;
const src = argv.find((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1));
if (!src) { console.error('usage: node make-artifact.mjs project.json [--out file.html] [--artifact]'); process.exit(1); }

const project = JSON.parse(await readFile(resolve(src), 'utf8'));
if (!Array.isArray(project.compositions) || !project.compositions.length) throw new Error('project has no compositions');
for (const c of project.compositions) if (!Array.isArray(c.layers)) throw new Error(`composition "${c.name}" has no layers`);

let html = await readFile(ENGINE, 'utf8');
if (!html.includes(MARK)) throw new Error('marker not found in engine.html');
html = html.replace(MARK, () => JSON.stringify(project).replace(/<\/(script)/gi, '<\\/$1'));
if (argv.includes('--artifact')) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1].replace(/<meta[^>]*>\s*/gi, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
  html = head.trim() + '\n' + body.trim() + '\n';
}
const dest = resolve(out || src.replace(/\.json$/i, '.html'));
await mkdir(dirname(dest), { recursive: true });
await writeFile(dest, html);
console.log(`ok -> ${dest} (${Math.round(html.length / 1024)} KB)`);
