#!/usr/bin/env node
// Teste das categorias de camada: todo tipo do motor pertence a exatamente uma categoria, as categorias têm nome de até duas palavras,
// o menu Adicionar usa categoria + tipo, e trocar o tipo nos parâmetros troca L.type, guarda a transformação e zera o resto.
//   node layers_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-lay-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const project = { schema: 'ai-vj-generator/2', id: 'lay', seed: 1, meta: { name: 'CAMADAS', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'hud', name: 'H', p: { x: 10 } }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1300, height: 900 });
const E = s => page.evaluate(s);
try {
  const f = JSON.parse(await E(`(() => { const A = AIVJ, types = Object.keys(A.GEN), per = {}; A.FAMILIES.forEach(f => f[1].forEach(x => per[x[0]] = (per[x[0]] || 0) + 1));
    return JSON.stringify({ types: types.length, missing: types.filter(t => !per[t]), dup: Object.keys(per).filter(t => per[t] > 1), ghost: Object.keys(per).filter(t => !A.GEN[t]), cats: A.FAMILIES.length, long: A.FAMILIES.flatMap(f => [f[0], ...f[1].map(x => x[1])]).filter(n => n.split(/\s+/).length > 2) }); })()`));
  check(!f.missing.length && !f.dup.length && !f.ghost.length, `os ${f.types} tipos do motor ficam em ${f.cats} categorias, cada um em uma só`, JSON.stringify(f));
  check(!f.long.length && f.cats <= 10, 'nomes de categoria e de tipo têm até duas palavras', f.long.join(','));
  await E(`document.querySelector('#tabs [data-tab="lay"]').click()`);
  const m = JSON.parse(await E(`(() => { const c = document.getElementById('addCat'); c.value = 'Dados'; c.dispatchEvent(new Event('change')); return JSON.stringify({ cats: c.options.length, types: [...document.getElementById('addType').options].map(o => o.value) }); })()`));
  check(m.cats === 9 && m.types.join() === 'measure,data,hud,instrument,blobs', 'o menu Adicionar mostra categoria e, dentro dela, o tipo', JSON.stringify(m));
  await E(`AIVJ.state.sel = 1; document.querySelector('#tabs [data-tab="par"]').click()`);
  const s = JSON.parse(await E(`(() => { const t = document.getElementById('pTyp'); t.value = 'measure'; t.dispatchEvent(new Event('change', { bubbles: true })); const L = AIVJ.project.compositions[0].layers[1]; return JSON.stringify({ type: L.type, x: L.p.x, keys: Object.keys(L.p) }); })()`));
  check(s.type === 'measure' && s.x === 10 && s.keys.join() === 'x', 'trocar o tipo nos parâmetros muda L.type, guarda a posição e zera o resto', JSON.stringify(s));
  const c2 = JSON.parse(await E(`(() => { const c = document.getElementById('pCat'); c.value = 'Shader'; c.dispatchEvent(new Event('change', { bubbles: true })); const L = AIVJ.project.compositions[0].layers[1]; return JSON.stringify({ type: L.type, opts: [...document.getElementById('pTyp').options].map(o => o.value) }); })()`));
  check(c2.type === 'shader' && c2.opts.join() === 'shader,isf,synth', 'trocar a categoria vai para o primeiro tipo dela e lista os tipos irmãos (shader, isf, synth)', JSON.stringify(c2));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ncamadas ok.');
process.exit(fail ? 1 : 0);
