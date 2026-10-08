#!/usr/bin/env node
// Teste da aba Superfície (só entrada e restrição): o CSV e a máscara PNG viram regiões, o preset aplica canvas, dobras e dados do espaço, a aba não oferece XML nem pixel map para baixar,
// cortes entram e saem, e os avisos de legibilidade acusam o texto pequeno e deixam o grande em paz (controle negativo).
//   node surface_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-surf-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 's', seed: 1, meta: { name: 'Parede <T>', brief: 'x', lang: 'pt' }, canvas: { w: 4500, h: 800, fps: 30, folds: [2250] }, time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

const page = await openPage(html, { chrome, width: 1300, height: 900 });
const E = x => page.evaluate(x);
try {
  // 2) regiões: CSV
  const csv = JSON.parse(await E(`(() => { const r = AIVJ.surfx.parseCsv('name,x,y,w,h\\n# comentário\\nA,0,0,1000,800\\nB,1000,0,1000,800\\n2000,0,500,400\\nC,4400,700,200,200\\nD,10,10,0,5\\nlixo', 4500, 800); return JSON.stringify(r); })()`));
  check(csv.rects.length === 3 && csv.rects[2].name === 'M03' && csv.errs.length === 3, 'CSV: cabeçalho e comentário ignorados, nome automático, 3 linhas ruins apontadas', JSON.stringify(csv));
  check(csv.errs.some(e => /sai do canvas/.test(e)) && csv.errs.some(e => /positivas/.test(e)) && csv.errs.some(e => /nome,x,y/.test(e)), 'CSV: as mensagens dizem o que está errado', JSON.stringify(csv.errs));
  // PNG máscara: três retângulos desenhados num canvas
  const m = JSON.parse(await E(`(() => { const cv = document.createElement('canvas'); cv.width = 450; cv.height = 80; const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 450, 80); c.fillStyle = '#fff'; c.fillRect(10, 10, 100, 60); c.fillRect(150, 5, 100, 70); c.fillRect(300, 20, 50, 40); const d = c.getImageData(0, 0, 450, 80);
    const r = AIVJ.surfx.maskToRects(d.data, 450, 80, 4500, 800); return JSON.stringify(r); })()`));
  check(m.rects.length === 3 && m.rects.some(r => r.x === 100 && r.y === 100 && r.w === 1000 && r.h === 600) && m.rects.some(r => r.x === 3000 && r.w === 500 && r.h === 400) && m.rects[0].y <= m.rects[1].y, 'PNG máscara: 3 blocos viram 3 módulos nas coordenadas do canvas', JSON.stringify(m.rects));
  // 3) a aba: preset, cortes, importação
  await E(`document.querySelector('#tabs [data-tab="sur"]').click()`);
  const open = await E(`!document.querySelector('[data-pane="sur"]').hidden && !!document.getElementById('sPre')`);
  check(open, 'a aba Superfície abre', 'sem aba');
  await E(`(() => { const s = document.getElementById('sPre'); s.value = 'multi-3'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const pr = JSON.parse(await E(`(() => { const P = AIVJ.project, c = P.canvas, cf = P.meta.spec.confirmed; return JSON.stringify({ w: c.w, h: c.h, folds: c.folds, target: c.target, pm: cf.pixelMap, pitch: cf.pitchMm }); })()`));
  check(pr.w === 5760 && pr.h === 1080 && pr.folds.join() === '1920,3840' && pr.target === 'multi' && pr.pm.join() === '5760,1080' && pr.pitch === 2.5, 'o preset "três telas" aplica canvas, dobras, destino e dados do espaço', JSON.stringify(pr));
  await E(`(() => { const i = document.getElementById('sCut'); i.value = '1000'; document.getElementById('sCutGo').click(); })()`);
  let folds = await E(`AIVJ.project.canvas.folds.join()`);
  check(folds === '1000,1920,3840', 'Cortar em x acrescenta a dobra em ordem', folds);
  await E(`document.querySelector('[data-sf="1920"]').click()`);
  folds = await E(`AIVJ.project.canvas.folds.join()`);
  check(folds === '1000,3840', 'clicar numa dobra a remove', folds);
  await E(`(() => { const i = document.getElementById('sCut'); i.value = '99999'; document.getElementById('sCutGo').click(); })()`);
  const emsg = await E(`document.getElementById('sMsg').textContent`);
  check(/entre 1 e 5759/.test(emsg), 'corte fora do canvas é recusado com a faixa válida', emsg);
  await E(`document.getElementById('sCutClear').click()`);
  check((await E(`AIVJ.project.canvas.folds`)) === undefined, 'Limpar cortes remove as dobras', 'ainda há dobras');
  // importar CSV pelo campo de arquivo
  await E(`(() => { const dt = new DataTransfer(); dt.items.add(new File(['A,0,0,1920,1080\\nB,1920,0,1920,1080\\nC,3840,0,1920,1080\\n'], 'mapa.csv', { type: 'text/csv' })); const i = document.getElementById('sMapFile'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 20; i++) { if ((await E(`(AIVJ.project.canvas.displays || []).length`)) === 3) break; await new Promise(r => setTimeout(r, 200)); }
  const dsp = JSON.parse(await E(`JSON.stringify({ d: AIVJ.project.canvas.displays, ov: document.getElementById('over').innerHTML.includes('D01') || document.getElementById('over').querySelectorAll('rect').length > 2 })`));
  check(dsp.d.length === 3 && dsp.d[1].x === 1920 && dsp.ov, 'importar CSV pelo campo cria 3 módulos e eles aparecem na vista', JSON.stringify(dsp).slice(0, 200));
  const ui = JSON.parse(await E(`(() => { const el = document.querySelector('[data-pane="sur"]'); return JSON.stringify({ xml: !!document.getElementById('sXml'), pat: !!document.getElementById('sPat'), csv: !!document.getElementById('sMapCsv'), txt: /Resolume|XML|Advanced Output/.test(el.textContent) }); })()`));
  check(!ui.xml && !ui.pat && !ui.csv && !ui.txt, 'a aba não gera XML, padrão de teste nem pixel map para baixar', JSON.stringify(ui));
  const rg = JSON.parse(await E(`(() => { const R = AIVJ.region; return JSON.stringify({ full: R(-1, 1, false), d1: R(1, 1, false), half: R(1, 0.5, true), bad: R(9, 1, false) }); })()`));
  check(rg.full === null && rg.d1 && rg.d1.x === 1920 && rg.d1.w === 1920 && rg.half && rg.half.w === 960 && rg.bad === null, 'regionRect: -1 e índice inválido = projeto completo; display 2 vira recorte na escala', JSON.stringify(rg));

  // 4) legibilidade: texto pequeno acusa, grande não
  const leg = JSON.parse(await E(`(() => { const mk = size => ({ canvas: { w: 4500, h: 800 }, compositions: [{ name: 'A', layers: [{ type: 'typeset', name: 'T', on: true, opacity: 1, p: { title: 'TITULO', caption: 'legenda', data: 'dados', size } }, { type: 'lines', name: 'L', on: true, opacity: 1, p: { weight: 1 } }] }] });
    const a = AIVJ.surfx.legibility(mk(60), 3.9, 40), b = AIVJ.surfx.legibility(mk(800), 3.9, 40); return JSON.stringify({ a: a.warnings, b: b.warnings, lim: a.limits.cap_height_min.px }); })()`));
  check(leg.a.some(w => /menor nível do texto/.test(w)) && leg.a.some(w => /traço de/.test(w)) && !leg.b.some(w => /menor nível do texto/.test(w)), `legibilidade: texto de 60 px e traço de 1 px a 40 m com 3,9 mm são acusados; texto de 800 px passa (mínimo ${leg.lim} px)`, JSON.stringify(leg));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nsuperfície ok.');
process.exit(fail ? 1 : 0);
