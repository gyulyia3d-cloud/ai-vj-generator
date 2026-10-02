#!/usr/bin/env node
// Verificações rápidas antes de commit/release: node scripts/check.mjs
// 1. sintaxe do JS do motor  2. skill/assets/engine.html idêntico a app/index.html
// 3. exemplos com forma válida e só tipos de camada conhecidos  4. frontmatter da skill
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKILL = join(ROOT, 'skill', 'ai-vj-generator');
let fail = 0;
const ok = m => console.log('  ok  ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };

const html = await readFile(join(ROOT, 'app', 'index.html'), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const tmp = join(tmpdir(), 'aivj-check.js');
await writeFile(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok('sintaxe do motor'); } catch (e) { bad('sintaxe do motor: ' + e.stderr); }
html.includes('/*__PROJECT_JSON__*/') ? ok('marcador do projeto presente') : bad('marcador /*__PROJECT_JSON__*/ ausente');

try {
  const eng = await readFile(join(SKILL, 'assets', 'engine.html'), 'utf8');
  eng === html ? ok('skill/assets/engine.html sincronizado') : bad('skill/assets/engine.html diferente de app/index.html — rode: node scripts/sync-skill.mjs');
} catch { bad('skill/assets/engine.html ausente — rode: node scripts/sync-skill.mjs'); }

const types = new Set([...js.matchAll(/reg\('([a-z]+)'/g)].map(m => m[1]));
ok(`${types.size} geradores registrados: ${[...types].join(' ')}`);
for (const dir of [join(ROOT, 'examples'), join(SKILL, 'assets', 'examples')]) {
  let files = [];
  try { files = (await readdir(dir)).filter(f => f.endsWith('.json')); } catch { continue; }
  for (const f of files) {
    try {
      const p = JSON.parse(await readFile(join(dir, f), 'utf8'));
      if (p.schema !== 'ai-vj-generator/1') throw new Error('schema');
      if (!p.compositions?.length) throw new Error('sem composições');
      for (const c of p.compositions) for (const L of c.layers) if (!types.has(L.type)) throw new Error(`tipo desconhecido "${L.type}" em ${c.name}`);
      if (![24, 25, 30, 50, 60].includes(p.canvas?.fps ?? 30)) throw new Error('fps fora do padrão');
      ok(`${dir.includes('assets') ? 'skill/' : ''}examples/${f} · ${p.compositions.length} composições`);
    } catch (e) { bad(`${f}: ${e.message}`); }
  }
}

const sk = await readFile(join(SKILL, 'SKILL.md'), 'utf8');
const fm = sk.match(/^---\n([\s\S]*?)\n---/);
if (!fm) bad('SKILL.md sem frontmatter');
else {
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1], desc = fm[1].match(/^description:\s*(.+)$/m)?.[1] || '';
  name === 'ai-vj-generator' ? ok('nome da skill') : bad('nome da skill');
  desc.startsWith('Use when') && fm[1].length <= 1024 ? ok(`descrição (${fm[1].length}/1024 caracteres)`) : bad('descrição deve começar com "Use when" e caber em 1024 caracteres');
}
console.log(fail ? `\n${fail} problema(s).` : '\nTudo certo.');
process.exit(fail ? 1 : 0);
