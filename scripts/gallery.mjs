#!/usr/bin/env node
// Galeria de referência: 8 briefs curados (clima x superfície) viram projeto, nota do avaliador e folha de contato.
//   node scripts/gallery.mjs            regenera examples/gallery/*.aivj.json, *.evaluation.json, contato/*.jpg e README.md
//   node scripts/gallery.mjs --check    só confere: cada brief gera um projeto sem erro nem aviso e TODA composição tira nota >= 75
// A nota vem de skill/ai-vj-generator/scripts/evaluate.mjs. Ela mede defeitos estruturais, não beleza: a galeria também precisa ser olhada.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, writeFileSync, existsSync, copyFileSync, rmSync } from 'node:fs';
import { join, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), SK = join(ROOT, 'skill', 'ai-vj-generator', 'scripts'), GAL = join(ROOT, 'examples', 'gallery');
const CHECK = process.argv.includes('--check'), MIN = 75;
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 1 << 28 });
const briefs = readdirSync(GAL).filter(f => f.endsWith('.brief.json')).sort();
const tmp = mkdtempSync(join(tmpdir(), 'aivj-gal-'));
let fail = 0;
const rows = [];

for (const bf of briefs) {
  const id = bf.replace('.brief.json', ''), brief = JSON.parse(readFileSync(join(GAL, bf), 'utf8'));
  const pj = CHECK ? join(tmp, id + '.aivj.json') : join(GAL, id + '.aivj.json');
  run('python', [join(SK, 'brief_to_project.py'), join(GAL, bf), '--out', pj]);
  const v = run('python', [join(SK, 'validate_project.py'), pj]).split('\n').filter(l => /^(ERROR|WARNING)/.test(l) && !/export estimate/.test(l));
  if (CHECK) { const fresh = readFileSync(pj, 'utf8'), kept = existsSync(join(GAL, id + '.aivj.json')) ? readFileSync(join(GAL, id + '.aivj.json'), 'utf8') : null; if (kept !== null && kept !== fresh) { fail++; console.log(`  ERRO ${id}: examples/gallery/${id}.aivj.json está velho; rode node scripts/gallery.mjs`); } }
  const ev = JSON.parse(run(process.execPath, [join(SK, 'evaluate.mjs'), pj, '--json']));
  const low = ev.compositions.filter(c => c.total < MIN);
  if (v.length || low.length) { fail++; console.log(`  ERRO ${id}: ${v.concat(low.map(c => `${c.name} ${c.total}<${MIN}`)).join(' | ')}`); } else console.log(`  ok   ${id}: ${ev.compositions.map(c => c.total).join(' / ')} (set ${ev.set})`);
  rows.push({ id, brief, ev });
  if (CHECK) continue;
  writeFileSync(join(GAL, id + '.evaluation.json'), JSON.stringify(ev, null, 2) + '\n');
  const html = join(tmp, id + '.html'), out = join(tmp, id + '-contato');
  run(process.execPath, [join(SK, 'make-artifact.mjs'), pj, '--out', html]);
  try { run(process.execPath, [join(SK, 'contact_sheet.mjs'), html, out]); } catch (e) { console.log('  --   folha de contato não gerada: ' + String(e.stderr || e.message).slice(0, 120)); continue; }
  const dest = join(GAL, 'contato'); mkdirSync(dest, { recursive: true });
  for (const f of readdirSync(out).filter(f => f.endsWith('.png'))) {
    const src = join(out, f), name = `${id}-${f.replace(/\.png$/, '')}`;
    try { run('python', ['-c', 'import sys;from PIL import Image;im=Image.open(sys.argv[1]).convert("RGB");w=1000;im=im.resize((w,max(1,round(im.height*w/im.width))));im.save(sys.argv[2],"JPEG",quality=72,optimize=True)', src, join(dest, name + '.jpg')]); }
    catch { copyFileSync(src, join(dest, name + '.png')); }
  }
}

if (!CHECK) {
  const L = ['# Galeria de referência', '', 'Oito briefs curados (clima x superfície). Cada um vira um projeto **sem IA** (`scripts/brief_to_project.py`), é medido pelo avaliador estrutural (`scripts/evaluate.mjs`) e tem folha de contato (6 quadros do loop por composição, de cima para baixo).', '',
    '**A nota mede defeitos estruturais** (hierarquia, contraste, densidade, respiro, movimento, arco, repetição). Nota alta quer dizer "sem defeito de estrutura", não "bonito": olhe as folhas de contato. A meta da galeria é toda composição com nota >= 75 **e** aprovada pelo seu olhar.', '',
    'Regenerar: `node scripts/gallery.mjs`. Conferir: `node scripts/gallery.mjs --check` (roda dentro do `check.mjs`).', '', '| Brief | Superfície | Clima | BPM | Notas por composição | Set |', '|---|---|---|---|---|---|'];
  for (const { id, brief, ev } of rows) L.push(`| \`${id}\` | ${brief.surface.type} ${brief.surface.w}×${brief.surface.h} | ${(brief.mood || []).join(', ')} | ${brief.time.bpm} | ${ev.compositions.map(c => `${c.name}: **${c.total}**`).join(' · ')} | **${ev.set}** |`);
  L.push('');
  for (const { id, brief, ev } of rows) {
    L.push(`## ${brief.name} (\`${id}\`)`, '', `> ${brief.concept}`, '');
    const sheets = existsSync(join(GAL, 'contato')) ? readdirSync(join(GAL, 'contato')).filter(f => f.startsWith(id + '-')).sort() : [];
    for (const s of sheets) L.push(`![${s}](contato/${s})`, '');
    for (const c of ev.compositions) L.push(`- **${c.name}** — ${c.total}/100 · ${Object.entries(c.score).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
    L.push('');
  }
  writeFileSync(join(GAL, 'README.md'), L.join('\n'), 'utf8');
}
try { rmSync(tmp, { recursive: true, force: true }); } catch {}
console.log(fail ? `\n${fail} brief(s) com problema.` : '\ngaleria ok.');
process.exit(fail ? 1 : 0);
