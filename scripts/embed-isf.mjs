#!/usr/bin/env node
// Embute a biblioteca ISF (skill/ai-vj-generator/isf-library: manifest.json + .fs + thumbs/*.webp) em app/index.html entre /*__ISFLIB_START__*/ e /*__ISFLIB_END__*/.
// Uso: node scripts/embed-isf.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'app', 'index.html');
const dir = path.join(root, 'skill', 'ai-vj-generator', 'isf-library');
const man = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const items = man.items.map(it => {
  const o = { id: it.id, name: it.name, origin: it.origin, credit: it.credit, license: it.license, source: it.source, description: it.description,
    src: fs.readFileSync(path.join(dir, it.file), 'utf8').replace(/\r\n/g, '\n') };
  const th = path.join(dir, 'thumbs', it.id + '.webp');
  if (fs.existsSync(th)) o.thumb = 'data:image/webp;base64,' + fs.readFileSync(th).toString('base64');
  return o;
});
const body = JSON.stringify(items).split('</').join('<\\/');
const block = `/*__ISFLIB_START__*/const ISFLIB = ${body};/*__ISFLIB_END__*/`;
let t = fs.readFileSync(html, 'utf8');
const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const re = /\/\*__ISFLIB_START__\*\/[\s\S]*?\/\*__ISFLIB_END__\*\//;
if (!re.test(t)) { console.error('marcadores ISFLIB ausentes em app/index.html'); process.exit(2); }
const next = t.replace(re, () => block);
if (process.argv.includes('--check')) { if (next !== t) { console.error('biblioteca ISF embutida está velha: rode node scripts/embed-isf.mjs'); process.exit(1); } console.log('biblioteca ISF embutida em dia (' + items.length + ')'); process.exit(0); }
fs.writeFileSync(html, crlf ? next.replace(/\n/g, '\r\n') : next, 'utf8');
console.log('embutidos ' + items.length + ' shaders ISF');
