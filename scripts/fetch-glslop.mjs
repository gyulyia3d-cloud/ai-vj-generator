#!/usr/bin/env node
// Baixa o corpus CC0 do glslop.com (https://glslop.com/api/v1/export) para uma pasta: <id>.fs + meta.json (título, autor, tags, origem).
// Uso: node scripts/fetch-glslop.mjs <pasta-saida>        Depois: python scripts/curate_isf.py <pasta-com-clones> --glslop <pasta-saida>
import fs from 'node:fs';
import path from 'node:path';

const out = process.argv[2];
if (!out) { console.error('uso: node scripts/fetch-glslop.mjs <pasta-saida>'); process.exit(2); }
fs.mkdirSync(out, { recursive: true });
let url = 'https://glslop.com/api/v1/export?limit=200&offset=0', total = 0;
const meta = {};
while (url) {
  const r = await fetch(url.startsWith('http') ? url : 'https://glslop.com' + url);
  if (!r.ok) { console.error('HTTP ' + r.status + ' em ' + url); process.exit(1); }
  const j = await r.json();
  if (j.license !== 'CC0-1.0') { console.error('licença inesperada: ' + j.license); process.exit(1); }
  for (const s of j.shaders || []) {
    const src = s.isf;
    if (!src || s.license !== 'CC0-1.0') continue;
    fs.writeFileSync(path.join(out, s.id + '.fs'), src.replace(/\r\n/g, '\n'), 'utf8');
    meta[s.id] = { stats: s.stats || {}, title: s.title, author: s.author_name || s.author || '', tags: s.tags || [], compile_ok: s.compile_ok, made_with: s.made_with || null, license: s.license };
    total++;
  }
  url = j.next || null;
}
fs.writeFileSync(path.join(out, 'meta.json'), JSON.stringify(meta, null, 1));
console.log(total + ' shaders CC0 salvos em ' + out);
