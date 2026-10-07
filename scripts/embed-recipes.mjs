#!/usr/bin/env node
// Embeds references/recipes (manifest + sources) into app/index.html between the RECIPES markers.
// Usage: node scripts/embed-recipes.mjs [--check]   (--check fails if the embedded copy is stale)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const html = path.join(root, 'app', 'index.html');
const candidates = [path.join(root, 'skill', 'ai-vj-generator', 'references', 'recipes'), path.join(process.env.USERPROFILE || process.env.HOME || '', '.claude', 'skills', 'ai-vj-generator', 'references', 'recipes')];
const dir = candidates.find(d => fs.existsSync(path.join(d, 'manifest.json')));
if (!dir) { console.error('manifest.json not found'); process.exit(2); }

const manifest = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.json'), 'utf8'));
const out = manifest.recipes.map(r => {
  const e = { id: r.id, kind: r.kind, title: r.title, principle: r.principle, means: r.means, tier: r.tier, loop: r.loop, cost: r.cost, usage: r.usage || '', src: fs.readFileSync(path.join(dir, r.file), 'utf8').replace(/\r\n/g, '\n') };
  if (r.kind === 'code') e.vars = r.vars || []; else e.p = r.p || {};
  return e;
});
// keep the JSON literal safe inside an inline <script>: no "</", and no raw line separators
const LS = String.fromCharCode(0x2028), PS = String.fromCharCode(0x2029);
const body = JSON.stringify(out).split('</').join('<\\/').split(LS).join('\\u2028').split(PS).join('\\u2029');
const block = `/*__RECIPES_START__*/const RECIPES = ${body};/*__RECIPES_END__*/`;

let t = fs.readFileSync(html, 'utf8');
const crlf = t.includes('\r\n'); if (crlf) t = t.replace(/\r\n/g, '\n');
const re = /\/\*__RECIPES_START__\*\/[\s\S]*?\/\*__RECIPES_END__\*\//;
if (!re.test(t)) { console.error('RECIPES markers missing in app/index.html'); process.exit(2); }
const next = t.replace(re, () => block);
if (process.argv.includes('--check')) { if (next !== t) { console.error('RECIPES embed is stale: run node scripts/embed-recipes.mjs'); process.exit(1); } console.log('RECIPES embed ok (' + out.length + ')'); process.exit(0); }
fs.writeFileSync(html, crlf ? next.replace(/\n/g, '\r\n') : next, 'utf8');
console.log('embedded ' + out.length + ' recipes from ' + dir);
