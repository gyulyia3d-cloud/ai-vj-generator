#!/usr/bin/env node
// Gera o HTML final do gerador, opcionalmente com um PROJECT JSON embutido.
//
//   node scripts/build.mjs                          → dist/ai-vj-generator.html (abre em STANDARD)
//   node scripts/build.mjs examples/tecno-led.json  → dist/<nome>.html (abre no BRIEFING do JSON)
//   node scripts/build.mjs projeto.json --artifact  → versão sem <html>/<head>/<body>, pronta para publicar como Artifact
//   node scripts/build.mjs projeto.json --out caminho/arquivo.html
//
// Sem dependências. A skill usa este script; também dá para fazer a troca à mão:
// substitua o marcador /*__PROJECT_JSON__*/ dentro de <script id="project"> pelo JSON.
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, join, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const args = process.argv.slice(2);
const flag = f => args.includes(f);
const opt = f => { const i = args.indexOf(f); return i >= 0 ? args[i + 1] : null; };
const jsonPath = args.find(a => a.endsWith('.json'));
const MARK = '/*__PROJECT_JSON__*/';

const html = await readFile(join(ROOT, 'app', 'index.html'), 'utf8');
if (!html.includes(MARK)) throw new Error('Marcador do projeto não encontrado em app/index.html');

let out = html, name = 'ai-vj-generator';
if (jsonPath) {
  const raw = await readFile(resolve(jsonPath), 'utf8');
  const project = JSON.parse(raw);
  if (!Array.isArray(project.compositions) || !project.compositions.length) throw new Error('JSON sem "compositions".');
  for (const c of project.compositions) if (!Array.isArray(c.layers)) throw new Error(`Composição "${c.name}" sem "layers".`);
  // impede que um "</script>" dentro de strings (ex.: GLSL ou texto) feche a tag
  const safeJson = JSON.stringify(project).replace(/<\/(script)/gi, '<\\/$1');
  out = out.replace(MARK, safeJson);
  name = basename(jsonPath).replace(/\.(aivj\.)?json$/i, '');
}

if (flag('--artifact')) {
  // O Artifact já envolve a página com doctype/html/head/body: mantemos só título, links, estilo e corpo.
  const head = out.match(/<head>([\s\S]*?)<\/head>/i)[1].replace(/<meta[^>]*>\s*/gi, '');
  const body = out.match(/<body>([\s\S]*?)<\/body>/i)[1];
  out = head.trim() + '\n' + body.trim() + '\n';
}

const dest = opt('--out') || join(ROOT, 'dist', name + (flag('--artifact') ? '.artifact' : '') + '.html');
await mkdir(dirname(dest), { recursive: true });
await writeFile(dest, out);
console.log(`ok → ${dest} (${(out.length / 1024).toFixed(0)} KB)`);
