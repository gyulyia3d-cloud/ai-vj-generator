#!/usr/bin/env node
// Embed a PROJECT JSON into the AI VJ Generator engine.
// usage: node make-artifact.mjs project.json [--out file.html] [--artifact] [--assets pasta]
//   --assets pasta : embute imagens e fontes da pasta (logos/ vira máscara branca com alpha). Ver assets.mjs.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { collectAssets } from './assets.mjs';

const MARK = '/*__PROJECT_JSON__*/';
const ENGINE = fileURLToPath(new URL('../assets/engine.html', import.meta.url));
const argv = process.argv.slice(2);
const outIdx = argv.indexOf('--out'), asIdx = argv.indexOf('--assets');
const out = outIdx >= 0 ? argv[outIdx + 1] : null, assetsDir = asIdx >= 0 ? argv[asIdx + 1] : null;
const src = argv.find((a, i) => !a.startsWith('--') && !(outIdx >= 0 && i === outIdx + 1) && !(asIdx >= 0 && i === asIdx + 1));
if (!src) { console.error('usage: node make-artifact.mjs project.json [--out file.html] [--artifact]'); process.exit(1); }

const project = JSON.parse(await readFile(resolve(src), 'utf8'));
if (!Array.isArray(project.compositions) || !project.compositions.length) throw new Error('project has no compositions');
for (const c of project.compositions) if (!Array.isArray(c.layers)) throw new Error(`composition "${c.name}" has no layers`);

if (assetsDir) {
  const { assets, bytes, warnings } = await collectAssets(resolve(assetsDir));
  project.assets = Object.assign({}, project.assets || {}, assets);
  console.log(`assets: ${Object.keys(assets).length} arquivo(s), ${(bytes / 1048576).toFixed(1)} MB`);
  for (const w of warnings) console.warn('aviso: ' + w);
}
let html = await readFile(ENGINE, 'utf8');
if (!html.includes(MARK)) throw new Error('marker not found in engine.html');
html = html.replace(MARK, () => JSON.stringify(project).replace(/<\/(script)/gi, '<\\/$1'));
const pname = String(project.meta?.name || '').trim();
if (pname) {
  const t = (pname === pname.toUpperCase() ? pname.toLowerCase().replace(/(^|\s)\S/g, c => c.toUpperCase()) : pname).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  html = html.replace('<title>AI VJ Generator</title>', () => `<title>${t}</title>`);
}
if (argv.includes('--artifact')) {
  const head = html.match(/<head>([\s\S]*?)<\/head>/i)[1].replace(/<meta[^>]*>\s*/gi, '');
  const body = html.match(/<body>([\s\S]*?)<\/body>/i)[1];
  html = head.trim() + '\n' + body.trim() + '\n';
}
const dest = resolve(out || src.replace(/\.json$/i, '.html'));
await mkdir(dirname(dest), { recursive: true });
await writeFile(dest, html);
console.log(`ok -> ${dest} (${Math.round(html.length / 1024)} KB)`);
if (html.length > 15.5 * 1048576) console.warn('aviso: o HTML passa de 15,5 MB; o Artifact recusa páginas acima de 16 MB. Reduza imagens ou fontes.');
