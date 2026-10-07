#!/usr/bin/env node
// Embeds references/glsl-lib/lib.glsl into app/index.html between the GLIB markers (modules for `#include name` in shader layers).
// Usage: node scripts/embed-glsl-lib.mjs [--check]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'app', 'index.html');
const lib = path.join(root, 'skill', 'ai-vj-generator', 'references', 'glsl-lib', 'lib.glsl');
const mods = {}; let cur = null;
for (const line of fs.readFileSync(lib, 'utf8').replace(/\r\n/g, '\n').split('\n')) {
  const m = line.match(/^\/\/@module\s+(\S+)(?:\s+requires\s+(.+))?$/);
  if (m) { cur = mods[m[1]] = { req: m[2] ? m[2].split(/[\s,]+/).filter(Boolean) : [], src: [], doc: '' }; continue; }
  if (!cur) continue;
  if (line.startsWith('//@doc')) { cur.doc = line.slice(6).trim(); continue; }
  if (line.trim()) cur.src.push(line.trim());
}
for (const k in mods) mods[k].src = mods[k].src.join(' ');
const body = JSON.stringify(mods).split('</').join('<\/');
const block = `/*__GLIB_START__*/const GLIB = ${body};/*__GLIB_END__*/`;
let t = fs.readFileSync(html, 'utf8');
const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const re = /\/\*__GLIB_START__\*\/[\s\S]*?\/\*__GLIB_END__\*\//;
if (!re.test(t)) { console.error('GLIB markers missing in app/index.html'); process.exit(2); }
const next = t.replace(re, () => block);
if (process.argv.includes('--check')) { if (next !== t) { console.error('GLIB embed is stale: run node scripts/embed-glsl-lib.mjs'); process.exit(1); } console.log('GLIB embed ok (' + Object.keys(mods).length + ')'); process.exit(0); }
fs.writeFileSync(html, crlf ? next.replace(/\n/g, '\r\n') : next, 'utf8');
console.log('embedded ' + Object.keys(mods).length + ' GLSL modules');
