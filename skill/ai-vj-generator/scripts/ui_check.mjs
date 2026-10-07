#!/usr/bin/env node
// Teste automático da aba Ficha do motor, num Chrome/Edge headless.
//
//   node ui_check.mjs [--chrome caminho]
//
// 1. PARIDADE: as calculadoras em JavaScript do motor (AIVJ.surface) devolvem os mesmos números que
//    scripts/surface_calc.py nos mesmos casos (incluindo o arredondamento do meio para o par do Python).
// 2. FLUXO: criar a ficha, aplicar o cálculo de LED no canvas, detectar divergência entre ficha e canvas,
//    aplicar o blend, e o JSON exportado passar em validate_project.py sem ERROR.
// 3. SEGURANÇA: um projeto com valores maliciosos na ficha não injeta HTML nem executa script.
// Sai com 1 se algo falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-ui-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const py = (...a) => JSON.parse(execFileSync('python', [join(HERE, 'surface_calc.py'), ...a, '--json'], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }));
const build = (obj, name) => { const j = join(tmp, name + '.aivj.json'), h = join(tmp, name + '.html'); writeFileSync(j, JSON.stringify(obj)); execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), j, '--out', h], { stdio: 'pipe' }); return h; };

/* projeto-base: 6 camadas por composição, contrato completo, SEM ficha */
const contract = Object.fromEntries(['concept', 'audienceEffect', 'semioticIntent', 'visualLanguage', 'formLanguage', 'materialLanguage', 'colorLogic', 'spatialLogic', 'motionLanguage', 'temporalArc', 'technicalStrategy', 'forbiddenShortcuts'].map(k => [k, 'texto específico deste teste de interface para a ficha']));
contract.loopGrammar = 'cyclic: o loop fecha em compassos inteiros';
const layers = ['bg', 'organism', 'lines', 'data', 'hud', 'measure', 'post'].map((t, i) => ({ type: t, name: 'CAMADA ' + (i + 1), role: 'camada ' + t + ' do teste de interface', p: {} }));
const base = () => ({ schema: 'ai-vj-generator/2', id: 'ui-check', seed: 7, meta: { name: 'TESTE DE INTERFACE', brief: 'x', contract: { ...contract } },
  canvas: { w: 1920, h: 1080, fps: 30, target: 'screen' }, time: { bpm: 124, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'PRIMEIRA', hypothesis: 'x', layers }, { name: 'SEGUNDA', hypothesis: 'y', layers }] });

/* ---------- 1. paridade ---------- */
const cases = [
  ['led', ['--pitch', '3.91', '--cols', '20', '--rows', '8'], { pitch: 3.91, cabW: 500, cabH: 500, cols: 20, rows: 8 }],
  ['led', ['--pitch', '3.91', '--width-m', '10', '--height-m', '4'], { pitch: 3.91, cabW: 500, cabH: 500, widthM: 10, heightM: 4 }],
  ['led', ['--pitch', '2.6', '--cols', '40', '--rows', '10'], { pitch: 2.6, cabW: 500, cabH: 500, cols: 40, rows: 10 }],
  ['led', ['--pitch', '3.9', '--width-m', '3.25', '--height-m', '1.75'], { pitch: 3.9, cabW: 500, cabH: 500, widthM: 3.25, heightM: 1.75 }],   /* meio vai para o par */
  ['led', ['--pitch', '3.91', '--cols', '40', '--rows', '4'], { pitch: 3.91, cabW: 500, cabH: 500, cols: 40, rows: 4 }],
  ['blend', ['--n', '2', '--overlap', '256'], { proj: [1920, 1080], n: 2, overlap: 256, axis: 'x' }],
  ['blend', ['--n', '3', '--overlap', '200'], { proj: [1920, 1080], n: 3, overlap: 200, axis: 'x' }],
  ['blend', ['--n', '2', '--overlap', '108', '--axis', 'y'], { proj: [1920, 1080], n: 2, overlap: 108, axis: 'y' }],
  ['loop', ['--bpm', '128', '--bars', '4', '--fps', '30'], { bpm: 128, bars: 4, fps: 30 }],
  ['loop', ['--bpm', '132', '--bars', '4', '--fps', '30', '--refresh', '60'], { bpm: 132, bars: 4, fps: 30, refresh: 60 }],
  ['loop', ['--bpm', '120', '--bars', '4', '--fps', '25', '--refresh', '60'], { bpm: 120, bars: 4, fps: 25, refresh: 60 }],
  ['aspect', ['--w', '5120', '--h', '500'], { w: 5120, h: 500 }],
  ['aspect', ['--w', '1080', '--h', '1920'], { w: 1080, h: 1920 }],
  ['legibility', ['--pitch', '3.9', '--dist', '15'], { pitch: 3.9, dist: 15 }],
  ['projection', ['--throw', '1.5', '--dist', '12', '--lumens', '12000', '--ambient', '20', '--reflectance', '0.3'], { res: [1920, 1080], throw: 1.5, dist: 12, lumens: 12000, ambient: 20, reflectance: 0.3 }],
  ['projection', ['--image-width', '8', '--surface', '20x6', '--overlap', '0.15'], { res: [1920, 1080], imageWidth: 8, lumens: 10000, surface: [20, 6], overlap: 0.15 }],
];
const SKIP = new Set(['assumptions', 'integer_frame_options', 'refresh', 'tip', 'text_scale_hint', 'hero_modules', 'note', 'hairline_rule', 'contrast_verdict']);   /* prosa traduzida ou omitida de propósito */
function diff(a, b, path, out) {
  if (SKIP.has(path.split('.').pop())) return;
  if (typeof a === 'number' && typeof b === 'number') { if (Math.abs(a - b) > Math.max(0.006, 1e-9 * Math.abs(a))) out.push(`${path}: python ${a} · js ${b}`); }
  else if (Array.isArray(a) && Array.isArray(b)) { if (path.endsWith('warnings')) { if (a.length !== b.length) out.push(`${path}: ${a.length} avisos no python · ${b.length} no js`); } else if (a.length !== b.length) out.push(`${path}: tamanhos ${a.length} · ${b.length}`); else a.forEach((x, i) => diff(x, b[i], `${path}[${i}]`, out)); }
  else if (a && b && typeof a === 'object' && typeof b === 'object') { for (const k of Object.keys(a)) { if (SKIP.has(k)) continue; if (!(k in b)) out.push(`${path}.${k}: falta no js`); else diff(a[k], b[k], `${path}.${k}`, out); } }
  else if (a !== b) out.push(`${path}: python ${JSON.stringify(a)} · js ${JSON.stringify(b)}`);
}

const page = await openPage(build(base(), 'base'), { chrome });
try {
  console.log('1. paridade JS x Python');
  for (const [cmd, pyArgs, jsArgs] of cases) {
    const p = py(cmd, ...pyArgs), j = await page.evaluate(`JSON.stringify(AIVJ.surface.${cmd === 'led' ? 'led' : cmd}(${JSON.stringify(jsArgs)}))`).then(JSON.parse);
    const d = []; diff(p, j, cmd, d);
    d.length ? bad(`${cmd} ${pyArgs.join(' ')}\n         ` + d.slice(0, 5).join('\n         ')) : ok(`${cmd} ${pyArgs.join(' ')}`);
  }

  console.log('\n2. fluxo da ficha');
  const E = x => page.evaluate(x);
  await E(`AIVJ.state.codeAllow = true; document.querySelector('#tabs [data-tab="spc"]').click(); 1`);
  (await E(`!!document.querySelector('#spMake')`)) ? ok('projeto sem ficha oferece "Criar ficha"') : bad('sem botão Criar ficha');
  await E(`document.querySelector('#spMake').click(); 1`);
  const s0 = JSON.parse(await E(`JSON.stringify(AIVJ.project.meta.spec)`));
  (s0 && s0.confirmed.pixelMap[0] === 1920 && s0.confirmed.pixelMap[1] === 1080) ? ok('ficha criada a partir do canvas (1920×1080)') : bad('ficha não criada corretamente: ' + JSON.stringify(s0));
  await E(`document.querySelector('[data-apply="led"]').click(); 1`);
  const c1 = JSON.parse(await E(`JSON.stringify({ w: AIVJ.project.canvas.w, h: AIVJ.project.canvas.h, target: AIVJ.project.canvas.target, pitch: AIVJ.project.canvas.pitch, spec: AIVJ.project.meta.spec })`));
  (c1.w === 2560 && c1.h === 1024 && c1.target === 'led' && c1.pitch === 3.9) ? ok('aplicar LED: canvas 2560×1024, destino led, pitch 3.9') : bad('aplicar LED errado: ' + JSON.stringify(c1));
  (c1.spec.confirmed.pixelMap[0] === 2560 && c1.spec.confirmed.pitchMm === 3.9 && c1.spec.archetype.includes('stage-led') && c1.spec.derived.aspect === '5:2') ? ok('a ficha recebeu pixel map, pitch, arquétipo e proporção') : bad('ficha não atualizada: ' + JSON.stringify(c1.spec));
  (await E(`document.querySelector('#panes [data-pane="spc"]').textContent.includes('Ficha e canvas conferem')`)) ? ok('painel mostra "Ficha e canvas conferem"') : bad('painel não confirma a igualdade');
  await E(`AIVJ.project.canvas.w = 1000; AIVJ.renderSpec(); 1`);
  (await E(`document.querySelector('#panes [data-pane="spc"]').textContent.includes('Ficha e canvas divergem')`)) ? ok('divergência entre ficha e canvas é detectada') : bad('divergência não detectada');
  await E(`document.querySelector('#spToCanvas').click(); 1`);
  (await E(`AIVJ.project.canvas.w === 2560`)) ? ok('"Usar o pixel map da ficha" restaura o canvas') : bad('restaurar canvas falhou');
  // zona via UI + overlay
  await E(`document.querySelector('#spZAdd').click(); 1`);
  (await E(`document.querySelector('#over').innerHTML.includes('performer')`)) ? ok('zona criada aparece na sobreposição da viewport') : bad('zona não desenhada');
  // exporta e valida
  const out = await E(`JSON.stringify(AIVJ.projectOut())`);
  const exp = join(tmp, 'export.aivj.json'); writeFileSync(exp, out);
  let vout = ''; try { vout = execFileSync('python', [join(HERE, 'validate_project.py'), exp], { encoding: 'utf8', env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }); } catch (e) { vout = String(e.stdout || '') + String(e.stderr || ''); }
  const errs = vout.split('\n').filter(l => /^ERROR/.test(l));
  errs.length === 0 ? ok('o JSON exportado pela interface passa no validate_project.py sem ERROR') : bad('validate_project.py: ' + errs.join(' | '));
  (await E(`AIVJ.specMarkdown()`) || '').includes('ficha de produção') ? ok('PRODUCTION_SPEC.md gerado') : bad('PRODUCTION_SPEC.md vazio');
} finally { await page.close(); }

/* ---------- 3. segurança ---------- */
console.log('\n3. segurança: valores maliciosos na ficha');
const evil = base();
evil.meta.spec = { archetype: ['<img src=x onerror=window.__xss=1>'], confirmed: { pixelMap: ['<img src=x onerror=window.__xss=2>', 5], '"><b id=evilkey>': 'v', viewingDistanceM: '"><svg onload=window.__xss=3>' },
  derived: { '<i onclick=window.__xss=4>k': '<img src=x onerror=window.__xss=5>' }, zones: { '<img src=x onerror=window.__xss=6>': { x: '"><img src=x onerror=window.__xss=7>', y: 0.1, w: 0.2, h: 0.2 } },
  assumed: [{ field: '<img src=x onerror=window.__xss=8>', value: '<img src=x onerror=window.__xss=9>', why: '"><img src=x onerror=window.__xss=10>', risk: '<svg onload=window.__xss=11>' }],
  show: { bpm: ['"><img src=x onerror=window.__xss=12>', 130], durationMin: '"><img src=x onerror=window.__xss=13>' }, risks: ['<img src=x onerror=window.__xss=14>'] };
const page2 = await openPage(build(evil, 'evil'), { chrome });
try {
  await page2.evaluate(`document.querySelector('#tabs [data-tab="spc"]').click(); AIVJ.renderSpec(); 1`);
  await page2.evaluate(`new Promise(r => setTimeout(r, 600))`);
  const inj = await page2.evaluate(`JSON.stringify({ xss: window.__xss === undefined ? null : window.__xss, handlers: document.querySelectorAll('#panes [onerror], #panes [onload], #panes [onclick], #over [onerror]').length, imgs: document.querySelectorAll('#panes img[src="x"], #over img').length, evilkey: !!document.getElementById('evilkey') })`).then(JSON.parse);
  (inj.xss === null && inj.handlers === 0 && inj.imgs === 0 && !inj.evilkey && page2.dialogs.length === 0) ? ok('nenhum HTML injetado e nenhum script executado') : bad('INJEÇÃO: ' + JSON.stringify(inj) + ' diálogos: ' + page2.dialogs.join('|'));
  const shown = await page2.evaluate(`document.querySelector('#panes [data-pane="spc"]').textContent.includes('onerror=window.__xss')`);
  shown ? ok('controle: o payload chegou ao painel como TEXTO (o teste exercitou o caminho)') : bad('controle: o payload não apareceu como texto; o teste de segurança não provou nada');
  const md = await page2.evaluate(`AIVJ.specMarkdown()`);
  typeof md === 'string' && md.length > 100 ? ok('exportação em markdown aceita valores estranhos como texto') : bad('markdown falhou');
} finally { await page2.close(); }

console.log(fail ? `\n${fail} problema(s).` : '\nTudo certo.');
process.exit(fail ? 1 : 0);
