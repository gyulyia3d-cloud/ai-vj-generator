#!/usr/bin/env node
// Teste do editor de modulação (aba Parâm.): adicionar, trocar fonte e modo, digitar mínimo e máximo, LFO e curva de mola, remover, e a curva de perfil de movimento.
// O projeto que sai do editor passa no validador, e o motor aplica a modulação (o valor do parâmetro muda no quadro). Controle: sem modulação o parâmetro fica no padrão.
//   node mod_ui_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-modui-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const brief = { name: 'Modulacao', lang: 'pt', concept: 'Uma peça para testar o editor de modulação com camadas reais.', mood: ['industrial'], energy: 0.6, surface: { type: 'screen', w: 1280, h: 720 }, time: { bpm: 120, bars: 2 }, compositions: 1 };
writeFileSync(join(tmp, 'b.json'), JSON.stringify(brief));
const pj = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
execFileSync('python', [join(HERE, 'brief_to_project.py'), join(tmp, 'b.json'), '--out', pj], { stdio: 'pipe' });
// tira o mod do herói para começar do zero
const P0 = JSON.parse((await import('node:fs')).readFileSync(pj, 'utf8')); P0.compositions[0].layers.forEach(l => { delete l.mod; }); writeFileSync(pj, JSON.stringify(P0));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1300, height: 900 });
const E = x => page.evaluate(x);
const ch = (sel, v) => E(`(() => { const n = document.querySelector(${JSON.stringify(sel)}); if (!n) return 'sem ' + ${JSON.stringify(sel)}; n.value = ${JSON.stringify(String(v))}; n.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
try {
  // seleciona o herói (camada 3) e abre Parâm.
  const hero = await E(`(() => { const L = AIVJ.project.compositions[0].layers, i = L.findIndex(l => /HERÓI/.test(l.name)); AIVJ.state.sel = i; AIVJ.setCi(0); document.querySelector('#tabs [data-tab="par"]').click(); return JSON.stringify({ i, type: L[i].type }); })()`);
  const h = JSON.parse(hero);
  check(await E(`!!document.getElementById('modPanel') && !!document.getElementById('modAdd')`), `o painel de modulação aparece na aba Parâm. (herói: ${h.type})`, 'sem painel');
  const before = JSON.parse(await E(`(() => { const L = AIVJ.project.compositions[0].layers[${h.i}]; return JSON.stringify({ mod: L.mod || null, opts: [...document.querySelectorAll('[data-mk="src"] option')].length }); })()`));
  check(before.mod === null, 'controle: sem modulação a camada não tem layer.mod', JSON.stringify(before));

  await E(`document.getElementById('modAdd').click()`);
  let st = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${h.i}].mod)`));
  check(st && st.length === 1 && st[0].src === 'bass' && st[0].mode === 'set' && st[0].k, '+ Modulação cria uma entrada (grave, definir) sobre o primeiro parâmetro numérico', JSON.stringify(st));
  const k0 = st[0].k;
  await ch('[data-mk="src"][data-mi="0"]', 'kick'); await ch('[data-mk="min"][data-mi="0"]', '10*2'); await ch('[data-mk="max"][data-mi="0"]', '40'); await ch('[data-mk="mode"][data-mi="0"]', 'add');
  st = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${h.i}].mod)`));
  check(st[0].src === 'kick' && st[0].min === 20 && st[0].max === 40 && st[0].mode === 'add', 'fonte kick, mínimo "10*2" = 20 (conta), máximo 40, modo somar ficam gravados', JSON.stringify(st));
  const bad1 = await ch('[data-mk="max"][data-mi="0"]', 'abc');
  st = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${h.i}].mod)`));
  check(st[0].max === 40, 'texto que não é número é recusado e o valor anterior fica', JSON.stringify(st));

  // LFO e curva de mola pela forma
  await ch('[data-mk="src"][data-mi="0"]', 'lfo'); await ch('[data-mk="shape"][data-mi="0"]', 'spring');
  st = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${h.i}].mod)`));
  check(st[0].src === 'lfo' && st[0].shape === 'spring' && st[0].zeta > 0 && st[0].wn > 0 && Number.isInteger(st[0].cycles), 'LFO com forma "mola" preenche zeta, wn e ciclos inteiros a partir do perfil', JSON.stringify(st));
  check(await E(`!!document.querySelector('[data-mk="zeta"][data-mi="0"]')`), 'os campos da mola (zeta, wn, antecipação, profundidade, degraus) aparecem', 'sem campos');
  await ch('[data-mk="cycles"][data-mi="0"]', '2.6');
  check((await E(`AIVJ.project.compositions[0].layers[${h.i}].mod[0].cycles`)) === 3, 'ciclos do LFO viram número inteiro (2,6 → 3): o loop fecha', 'ciclos não inteiros');

  // o projeto sai válido e o motor aplica
  writeFileSync(join(tmp, 'out.json'), await E(`JSON.stringify(AIVJ.projectOut())`));
  let v = ''; try { v = execFileSync('python', [join(HERE, 'validate_project.py'), join(tmp, 'out.json')], { encoding: 'utf8' }); } catch (e) { v = String(e.stdout); }
  check(!/^ERROR/m.test(v), 'o projeto exportado depois das edições passa no validador sem erro', v.split('\n').filter(l => /^ERROR/.test(l)).slice(0, 2).join(' | '));
  const ap = JSON.parse(await E(`(() => { const P = AIVJ.project, L = P.compositions[0].layers[${h.i}], k = L.mod[0].k, vals = []; for (let n = 0; n < 24; n++) { const F = AIVJ.frameAt(n, P.compositions[0]), lf = AIVJ.layerFrame(F, AIVJ.pm(L), ${h.i}, 8, L.type); vals.push(AIVJ.applyMods(AIVJ.pm(L), L, lf)[k]); } return JSON.stringify({ k, base: AIVJ.pm(L)[k], min: Math.min(...vals), max: Math.max(...vals) }); })()`));
  check(Math.abs(ap.max - ap.min) > 1e-6, `o motor aplica a curva: ${ap.k} varia de ${ap.min.toFixed(3)} a ${ap.max.toFixed(3)} em 24 quadros (padrão ${ap.base})`, JSON.stringify(ap));

  // curva de perfil de movimento
  await E(`(() => { const r = document.querySelector('[data-pf="elasticity"]'); r.value = 0.9; r.dispatchEvent(new Event('input', { bubbles: true })); })()`);
  await E(`(() => { document.querySelector('#modPanel details summary').click(); document.getElementById('pfApply').click(); })()`);
  const pf = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${h.i}].mod)`));
  const target = pf.find(m => m.shape === 'spring' && m.mode === 'mul');
  check(target && target.zeta < 0.3 && Number.isInteger(target.cycles) && target.min === 1, `"Aplicar como curva de mola" cria o layer.mod do perfil (elasticidade 0,9 → zeta ${target && target.zeta})`, JSON.stringify(pf));
  // remover
  await new Promise(r => setTimeout(r, 500));   // o histórico agrupa edições a menos de 350 ms; sem a espera o desfazer volta além da remoção
  const n0 = pf.length; await E(`document.querySelector('[data-mdel="0"]').click()`);
  const after = await E(`(AIVJ.project.compositions[0].layers[${h.i}].mod || []).length`);
  check(after === n0 - 1, 'remover tira só a entrada escolhida', `${n0} → ${after}`);
  // desfazer traz de volta
  await E(`AIVJ.undo()`);
  const back = await E(`(AIVJ.project.compositions[0].layers[${h.i}].mod || []).length`);
  check(back === n0, 'desfazer (Ctrl+Z) devolve a modulação removida', `${back} esperado ${n0}`);
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\neditor de modulação ok.');
process.exit(fail ? 1 : 0);
