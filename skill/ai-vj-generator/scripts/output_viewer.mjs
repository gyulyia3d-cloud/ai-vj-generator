#!/usr/bin/env node
// Builds OUTPUT.html in a folder: a clickable page that lists and previews every generated file
// (HTML engine, project JSON, images, markdown). Usage: node output_viewer.mjs <folder> [--lang en|pt]
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve, extname, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

const argv = process.argv.slice(2), dir = resolve(argv.find((a, i) => !a.startsWith('--') && argv[i - 1] !== '--lang') || '.');
const lang = argv.includes('--lang') ? argv[argv.indexOf('--lang') + 1] : 'en';
const T = lang === 'pt' ? { title: 'ARQUIVOS GERADOS', open: 'Abrir', empty: 'Nada aqui ainda.', hint: 'Clique em Abrir. O HTML abre o motor com o projeto carregado.' }
  : { title: 'GENERATED FILES', open: 'Open', empty: 'Nothing here yet.', hint: 'Click Open. The HTML opens the engine with the project loaded.' };
const esc = s => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const walk = (d, o = []) => { for (const n of readdirSync(d)) { if (n === 'OUTPUT.html' || n.startsWith('.') || n === 'node_modules') continue; const p = join(d, n), s = statSync(p); s.isDirectory() ? walk(p, o) : o.push({ p, s: s.size }); } return o; };
const files = walk(dir).sort((a, b) => a.p.localeCompare(b.p));
const kind = e => ({ '.html': 'html', '.json': 'json', '.md': 'md', '.png': 'img', '.jpg': 'img', '.jpeg': 'img', '.webp': 'img', '.svg': 'img', '.webm': 'vid', '.mp4': 'vid' }[e] || 'file');
const fmt = n => n > 1048576 ? (n / 1048576).toFixed(1) + ' MB' : n > 1024 ? Math.round(n / 1024) + ' KB' : n + ' B';
const items = files.map(({ p, s }) => {
  const rel = relative(dir, p).split(sep).join('/'), k = kind(extname(p).toLowerCase()), href = esc(encodeURI(rel));
  let body = '';
  if (k === 'img') body = `<img loading="lazy" src="${href}" alt="${esc(rel)}">`;
  else if (k === 'vid') body = `<video controls preload="none" src="${href}"></video>`;
  else if (k === 'md' || k === 'json') { const t = readFileSync(p, 'utf8'); body = `<pre>${esc(t.length > 20000 ? t.slice(0, 20000) + '\n…' : t)}</pre>`; }
  else if (k === 'html') body = `<p class="n">${esc(T.hint)}</p>`;
  return `<details${k === 'img' ? ' open' : ''}><summary><span>${esc(rel)}</span><em>${fmt(s)}</em><a href="${href}" target="_blank" rel="noopener">${T.open}</a></summary>${body}</details>`;
}).join('\n');
const html = `<!doctype html><html lang="${lang === 'pt' ? 'pt-BR' : 'en'}"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${T.title}</title>
<link href="https://fonts.googleapis.com/css2?family=Martian+Mono:wght@400;600&display=swap" rel="stylesheet">
<style>:root{--bg:#000;--fg:#fff;--dim:#8a8a8a;--rule:#2a2a2a}@media (prefers-color-scheme:light){:root{--bg:#fff;--fg:#000;--dim:#666;--rule:#ddd}}
*{box-sizing:border-box}body{margin:auto;background:var(--bg);color:var(--fg);font:13px/1.5 "Helvetica Neue",Helvetica,Arial,sans-serif;text-transform:uppercase;letter-spacing:.04em;padding:16px;max-width:1100px}
h1{font:600 14px "Martian Mono",monospace;letter-spacing:.14em;margin:0 0 4px}p.n{color:var(--dim);margin:6px 0}
details{border-top:1px solid var(--rule)}summary{display:flex;gap:12px;align-items:center;padding:10px 0;cursor:pointer;min-height:44px;flex-wrap:wrap}summary span{flex:1;min-width:0;overflow-wrap:anywhere}summary em{color:var(--dim);font-style:normal}
a{color:var(--fg);border:1px solid var(--fg);padding:6px 10px;text-decoration:none}a:hover,summary:hover{opacity:.7}img,video{max-width:100%;display:block;margin:0 0 12px;border:1px solid var(--rule)}
pre{max-height:360px;overflow:auto;border:1px solid var(--rule);padding:8px;text-transform:none;white-space:pre-wrap;font:12px "Martian Mono",monospace}</style></head>
<body><h1>${T.title}</h1><p class="n">${esc(pathToFileURL(dir).href)} · ${files.length}</p>${items || `<p class="n">${T.empty}</p>`}</body></html>`;
const out = join(dir, 'OUTPUT.html');
writeFileSync(out, html);
console.log(out);
console.log(pathToFileURL(out).href);
