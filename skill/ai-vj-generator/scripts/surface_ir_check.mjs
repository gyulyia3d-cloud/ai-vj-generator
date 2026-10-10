#!/usr/bin/env node
// Teste do Surface IR (fase 9): Python = navegador; cada fato leva a confiança certa (EXPLICIT, DETECTED, INFERRED, UNKNOWN); a força da restrição segue a confiança
// (só EXPLICIT e DETECTED são duras); medidas com resposta conhecida (arranjo, simetria, área ativa); as restrições duras mudam a composição e as brandas e as desconhecidas
// não mudam nada (controles negativos); o validador recusa um IR adulterado; a aba Superfície mostra a análise.
//   node surface_ir_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-sir-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const R = (x, y, w, h, extra) => Object.assign({ x, y, w, h }, extra);
const S = (w, h, extra) => Object.assign({ type: 'led', w, h, fps: 30 }, extra);
const surfaces = {
  'nua 4500x800': S(4500, 800),
  'dobras': S(4500, 800, { folds: [1500, 3000] }),
  'fila de 3': S(4500, 800, { regions: [R(0, 0, 1000, 800), R(1100, 0, 1000, 800), R(2200, 0, 1000, 800)] }),
  'espelhada': S(4500, 800, { regions: [R(0, 0, 1000, 800), R(3500, 0, 1000, 800)] }),
  'grade 2x2': S(1920, 1080, { regions: [R(0, 0, 900, 500), R(1020, 0, 900, 500), R(0, 580, 900, 500), R(1020, 580, 900, 500)] }),
  'espalhada': S(1920, 1080, { regions: [R(100, 100, 300, 300), R(900, 50, 200, 500), R(1500, 800, 400, 250), R(300, 700, 150, 150), R(1000, 600, 100, 100)] }),
  'um bloco': S(1920, 1080, { regions: [R(400, 200, 1100, 700)] }),
  'máscara': S(4500, 800, { regions: [R(0, 0, 2000, 800, { source: 'mask' })] }),
  'tudo': S(4500, 800, { folds: [2250], regions: [R(0, 0, 2000, 800), R(2500, 0, 2000, 800)], pitchMm: 3.9, viewingDistanceM: [2, 40] }),
  'vertical': S(1080, 1920),
  'faixa estreita': S(4500, 800, { regions: [R(0, 0, 450, 800)] }),
};
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.SURFACEIR && window.AIVJ.COMPOSITION)' });
const E = s => page.evaluate(s);
const jsS = sf => E(`JSON.stringify(AIVJ.SURFACEIR.compile(${JSON.stringify(sf)}))`).then(JSON.parse);
const pyS = (sf, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(sf)); return JSON.parse(execFileSync('python', [join(HERE, 'surface_ir.py'), f], { encoding: 'utf8' })); };
const base = over => Object.assign({ name: 'Teste Surf', lang: 'pt', concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'], energy: 0.5, surface: S(4500, 800), time: { bpm: 110, bars: 4 }, compositions: 3 }, over);
const jsC = (brief, i) => E(`(() => { const b = ${JSON.stringify(brief)}; return JSON.stringify(AIVJ.COMPOSITION.compile(b, AIVJ.CREATIVE.compile(b), ${i})); })()`).then(JSON.parse);
const pyC = (brief, i, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(brief)); return JSON.parse(execFileSync('python', [join(HERE, 'composition_ir.py'), f, String(i)], { encoding: 'utf8' })); };
const conf = (ir, id) => (ir.facts.find(f => f.id === id) || {}).confidence;
const ctr = (ir, id) => ir.constraints.find(c => c.id === id);
const overlaps = (z, b) => z.x < b.to && z.x + z.w > b.from;
try {
  /* 1) paridade Python = navegador */
  const parBad = []; const all = {};
  for (const [n, sf] of Object.entries(surfaces)) { const j = await jsS(sf); all[n] = j; if (!same(pyS(sf, 'p' + parBad.length + n.replace(/\W/g, '')), j)) parBad.push(n); }
  check(!parBad.length, `o Surface IR do Python é igual ao do navegador nas ${Object.keys(surfaces).length} superfícies (nua, dobras, fila, espelhada, grade, espalhada, bloco, máscara, tudo, vertical, faixa)`, parBad.join(' '));

  /* 2) cada fato leva a confiança certa */
  const nua = all['nua 4500x800'], dob = all['dobras'], fila = all['fila de 3'], msk = all['máscara'], tudo = all['tudo'];
  check(conf(nua, 'size') === 'EXPLICIT' && conf(nua, 'aspect') === 'EXPLICIT' && conf(nua, 'walls') === 'INFERRED' && conf(nua, 'activeArea') === 'INFERRED' && conf(nua, 'readingAxis') === 'INFERRED', 'sem nada além do tamanho: tamanho e proporção EXPLICIT; paredes, área ativa e eixo de leitura INFERRED', JSON.stringify(nua.facts.map(f => f.id + ':' + f.confidence)));
  check(conf(nua, 'layout') === 'UNKNOWN' && conf(nua, 'symmetry') === 'UNKNOWN' && conf(nua, 'pitch') === 'UNKNOWN' && conf(nua, 'viewingDistance') === 'UNKNOWN' && conf(nua, 'legibility') === 'UNKNOWN', 'sem regiões, passo e distância: arranjo, simetria, passo, distância e legibilidade são UNKNOWN', JSON.stringify(nua.facts.map(f => f.id + ':' + f.confidence)));
  check(nua.facts.filter(f => f.confidence === 'UNKNOWN').every(f => f.value === null), 'um fato UNKNOWN nunca carrega valor (não se chuta)', '');
  check(conf(dob, 'walls') === 'EXPLICIT' && dob.facts.find(f => f.id === 'walls').value === 3 && dob.walls.length === 3, 'dobras declaradas: três paredes, EXPLICIT', JSON.stringify(dob.walls));
  check(conf(fila, 'activeArea') === 'EXPLICIT' && conf(fila, 'layout') === 'DETECTED' && conf(fila, 'symmetry') === 'DETECTED', 'regiões de uma lista: área ativa EXPLICIT; arranjo e simetria DETECTED (medidos)', JSON.stringify(fila.facts.map(f => f.id + ':' + f.confidence)));
  check(conf(msk, 'activeArea') === 'DETECTED' && msk.regions.source === 'mask', 'regiões vindas de máscara: a área ativa é DETECTED, não EXPLICIT', JSON.stringify(msk.facts.find(f => f.id === 'activeArea')));
  check(conf(tudo, 'pitch') === 'EXPLICIT' && conf(tudo, 'viewingDistance') === 'EXPLICIT' && conf(tudo, 'legibility') === 'INFERRED' && tudo.facts.find(f => f.id === 'legibility').value.capPx >= 7, 'passo e distância declarados: EXPLICIT; a legibilidade derivada é INFERRED (regra de bolso)', JSON.stringify(tudo.facts.find(f => f.id === 'legibility')));
  const need = o => ['facts', 'walls', 'constraints', 'unknowns', 'summary', 'canvas'].every(k => k in o) && o.summary.EXPLICIT + o.summary.DETECTED + o.summary.INFERRED + o.summary.UNKNOWN === o.facts.length;
  check(Object.values(all).every(need), 'todo IR traz fatos, paredes, restrições, perguntas em aberto e o resumo por confiança, que soma o total de fatos', '');
  const ask = nua.unknowns.map(u => u.id);
  check(['depth', 'curvature', 'ambientLight', 'material', 'pitch', 'viewingDistance', 'regions'].every(k => ask.includes(k)) && !all['tudo'].unknowns.some(u => ['pitch', 'viewingDistance', 'regions'].includes(u.id)) && nua.unknowns.every(u => u.ask.endsWith('?')), 'o que falta vira pergunta (relevo, curvatura, luz, acabamento, passo, distância, regiões) e some quando o dado é dado', ask.join());

  /* 3) a força da restrição segue a confiança */
  const rule = [], hardOf = new Set(['EXPLICIT', 'DETECTED']);
  for (const [n, ir] of Object.entries(all)) for (const c of ir.constraints) { if (c.strength === 'hard' && !hardOf.has(c.confidence)) rule.push(n + ':' + c.id + ' dura com ' + c.confidence); if (hardOf.has(c.confidence) && c.strength !== 'hard') rule.push(n + ':' + c.id + ' mole com ' + c.confidence); }
  check(!rule.length, 'em todas as superfícies: restrição dura só com EXPLICIT ou DETECTED; INFERRED só aconselha (soft)', rule.join(' '));
  check(!ctr(nua, 'foldBands') && !ctr(nua, 'activeArea') && ctr(nua, 'safeArea').strength === 'soft' && ctr(dob, 'foldBands').strength === 'hard' && ctr(fila, 'activeArea').strength === 'hard' && ctr(msk, 'activeArea').confidence === 'DETECTED' && ctr(msk, 'activeArea').strength === 'hard' && ctr(tudo, 'legibility').strength === 'soft', 'sem dobras nem regiões não há restrição dura; dobras e regiões (lista ou máscara) viram duras; a legibilidade é só conselho', JSON.stringify(nua.constraints.map(c => c.id + ':' + c.strength)));

  /* 4) medidas com resposta conhecida */
  const esp = all['espelhada'], gr = all['grade 2x2'], sp = all['espalhada'], um = all['um bloco'];
  check(fila.regions.layout === 'row' && gr.regions.layout === 'grid' && sp.regions.layout === 'scattered' && um.regions.layout === 'single' && dob.regions === null, 'arranjo medido: fila, grade 2×2, espalhada e bloco único', [fila, gr, sp, um].map(x => x.regions.layout).join());
  check(Math.abs(fila.regions.activeShare - 2 / 3) < 0.002 && Math.abs(um.regions.activeShare - (1100 * 700) / (1920 * 1080)) < 0.002, `área ativa medida: fila de três = ${fila.regions.activeShare} (2/3) e bloco único = ${um.regions.activeShare}`, '');
  check(esp.regions.symmetry.h === 1 && fila.regions.symmetry.h < 0.7 && gr.regions.symmetry.h > 0.9 && gr.regions.symmetry.v > 0.9, `simetria medida: espelhada ${esp.regions.symmetry.h} (resposta 1); fila assimétrica ${fila.regions.symmetry.h}; grade ${gr.regions.symmetry.h}/${gr.regions.symmetry.v}`, JSON.stringify([esp.regions.symmetry, fila.regions.symmetry, gr.regions.symmetry]));
  check(fila.regions.bbox.x === 0 && Math.abs(fila.regions.bbox.w - 3200 / 4500) < 0.002 && ctr(fila, 'safeArea').value.x > 0 && ctr(fila, 'safeArea').value.w < fila.regions.bbox.w, 'a área segura sai da caixa das regiões, recuada', JSON.stringify(ctr(fila, 'safeArea').value));
  const g8 = fila.grid; check(g8.length === 8 && g8[0].length === 8 && g8[3][0] === 1 && g8[3][7] === 0, 'a grade de cobertura 8×8: célula dentro da região = 1, fora = 0', JSON.stringify(g8[3]));
  const lg = tudo.facts.find(f => f.id === 'legibility').value, lgFar = (await jsS(S(4500, 800, { pitchMm: 3.9, viewingDistanceM: [2, 80] }))).facts.find(f => f.id === 'legibility').value;
  check(lgFar.capPx > lg.capPx && lgFar.linePx >= lg.linePx, `mais longe, texto maior: ${lg.capPx} px a 40 m e ${lgFar.capPx} px a 80 m`, JSON.stringify([lg, lgFar]));

  /* 5) restrições duras mudam a composição; brandas e UNKNOWN não mudam nada */
  const zs = ['hero', 'secondary', 'support'];
  for (const [sn, key] of [['dobras', 'dobras'], ['faixa estreita', 'faixa estreita']]) {
    const sf = surfaces[sn], bad2 = [];
    const cons = all[key];
    for (let i = 0; i < 3; i++) {
      const c = await jsC(base({ surface: sf }), i);
      if (sn === 'dobras') {
        const bands = ctr(cons, 'foldBands').bands;
        for (const z of zs) if (bands.some(b => overlaps(c.zones[z], b))) bad2.push(`${i}:${z} cruza a dobra`);
        const wall = cons.walls.find(w => w.from <= c.textAnchor.cx && c.textAnchor.cx <= w.to);
        if ((wall.from > 0 && c.textAnchor.cx - wall.from < 0.06 - 1e-9) || (wall.to < 1 && wall.to - c.textAnchor.cx < 0.06 - 1e-9)) bad2.push(`${i}:texto cola na dobra (${c.textAnchor.cx})`);
        if (!c.negativeSpace.some(n => n.why.includes('fold seam'))) bad2.push(`${i}:sem costura no espaço negativo`);
      } else {
        const n = 8, ac = ctr(cons, 'activeArea'); for (const z of zs) { const cx = c.zones[z].x + c.zones[z].w / 2, cy = c.zones[z].y + c.zones[z].h / 2; if (cons.grid[Math.min(Math.floor(cy * n), n - 1)][Math.min(Math.floor(cx * n), n - 1)] < ac.minCoverage) bad2.push(`${i}:${z} fora da área ativa`); }
        if (!c.surface || !c.surface.hard.includes('activeArea:EXPLICIT') || c.safeAreas.w > 0.1) bad2.push(`${i}:IR sem registro da superfície ou área segura não recuada (${JSON.stringify(c.safeAreas)})`);
      }
    }
    check(!bad2.length, sn === 'dobras' ? 'com dobras declaradas: nenhuma zona (herói, secundário, apoio) cruza a costura, o texto fica a 6% dela e a costura entra no espaço negativo' : 'com regiões declaradas: o centro de cada zona cai numa célula ativa, a área segura encolhe para a região e o IR registra o que restringiu', bad2.join(' | '));
    /* controle negativo: sem a restrição, a mesma composição quebra a regra (o teste pode falhar) */
    const free = []; for (let i = 0; i < 3; i++) free.push(await jsC(base({ surface: S(4500, 800) }), i));
    let broke = 0;
    for (const c of free) for (const z of zs) {
      if (sn === 'dobras') { if (ctr(cons, 'foldBands').bands.some(b => overlaps(c.zones[z], b))) broke++; }
      else { const cx = c.zones[z].x + c.zones[z].w / 2, cy = c.zones[z].y + c.zones[z].h / 2; if (cons.grid[Math.min(Math.floor(cy * 8), 7)][Math.min(Math.floor(cx * 8), 7)] < 0.5) broke++; }
    }
    check(broke > 0, `controle negativo (${sn}): sem a restrição ${broke} zona(s) violam a regra, então o teste acima pode falhar`, 'nenhuma violação sem restrição');
  }
  const plain = await jsC(base({ surface: S(4500, 800) }), 0), soft = await jsC(base({ surface: S(4500, 800, { pitchMm: 3.9, viewingDistanceM: [2, 40] }) }), 0);
  check(same(plain, soft) && !('surface' in plain), 'passo e distância (INFERRED, soft) e o que é UNKNOWN não movem nenhuma zona: a composição é idêntica e não leva o campo `surface`', 'a composição mudou');
  const pyOk = []; for (const [n, sf] of [['dobras', surfaces.dobras], ['fila de 3', surfaces['fila de 3']], ['tudo', surfaces.tudo], ['faixa estreita', surfaces['faixa estreita']], ['nua', surfaces['nua 4500x800']]]) for (const i of [0, 1, 2]) {
    const b = base({ surface: sf }); if (!same(pyC(b, i, 'c' + i + n.replace(/\W/g, '')), await jsC(b, i))) pyOk.push(n + '/' + i);
  }
  check(!pyOk.length, 'o Composition IR com restrições da superfície é igual em Python e no navegador (5 superfícies × 3 composições)', pyOk.join(' '));

  /* 6) o gerador grava meta.surfaceIR; o validador aceita e recusa o IR adulterado */
  const brief = base({ surface: surfaces.tudo }), proj = JSON.parse(await E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`));
  const vp = (p, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(p)); let r = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8', stdio: 'pipe' }); } catch (e) { r = e.status; out = String(e.stdout); } return { r, out }; };
  check(proj.meta.surfaceIR && conf(proj.meta.surfaceIR, 'walls') === 'EXPLICIT' && proj.canvas.displays.length === 2 && proj.canvas.folds[0] === 2250, 'o gerador leva dobras e regiões do brief ao canvas e grava meta.surfaceIR', JSON.stringify(proj.canvas));
  const v0 = vp(proj, 'v0'); check(v0.r === 0, 'o projeto gerado passa no validador', v0.out.split('\n').filter(l => /ERROR/.test(l)).join(' | '));
  const t1 = JSON.parse(JSON.stringify(proj)); t1.meta.surfaceIR.constraints.find(c => c.id === 'readingAxis').strength = 'hard';
  const t2 = JSON.parse(JSON.stringify(proj)); t2.meta.surfaceIR.facts.find(f => f.id === 'layout').confidence = 'UNKNOWN';
  const t3 = JSON.parse(JSON.stringify(proj)); t3.meta.surfaceIR.facts[0].confidence = 'CERTAIN';
  const t4 = JSON.parse(JSON.stringify(proj)); t4.canvas.w = 3000;
  const r1 = vp(t1, 't1'), r2 = vp(t2, 't2'), r3 = vp(t3, 't3'), r4 = vp(t4, 't4');
  check(r1.r !== 0 && /hard constraint needs/.test(r1.out), 'controle negativo: restrição dura apoiada em fato INFERRED é recusada pelo validador', r1.out.slice(0, 160));
  check(r2.r !== 0 && /UNKNOWN fact must not carry a value/.test(r2.out), 'controle negativo: fato UNKNOWN com valor é recusado', r2.out.slice(0, 160));
  check(r3.r !== 0 && /confidence must be one of/.test(r3.out), 'controle negativo: confiança fora dos quatro níveis é recusada', r3.out.slice(0, 160));
  check(/meta\.surfaceIR is for 4500x800 but the canvas is 3000x800/.test(r4.out), 'IR velho (canvas mudou depois) gera aviso para rodar plan_ir.py de novo', r4.out.slice(0, 200));

  /* 7) plan_ir.py --apply lê as dobras do projeto */
  const noFold = base({ surface: S(4500, 800) }), pp = JSON.parse(await E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(noFold)}))`));
  pp.canvas.folds = [1500, 3000]; delete pp.meta.surfaceIR; const pf = join(tmp, 'pp.json'), bf = join(tmp, 'bb.json'); writeFileSync(pf, JSON.stringify(pp)); writeFileSync(bf, JSON.stringify(noFold));
  execFileSync('python', [join(HERE, 'plan_ir.py'), bf, '--apply', pf], { stdio: 'pipe' });
  const pa = JSON.parse(readFileSync(pf, 'utf8'));
  check(pa.meta.surfaceIR && conf(pa.meta.surfaceIR, 'walls') === 'EXPLICIT' && pa.meta.compositionIR.every(c => c.surface && c.surface.hard.includes('foldBands:EXPLICIT')), 'plan_ir.py --apply lê as dobras do projeto, grava meta.surfaceIR e planeja as composições com a costura', JSON.stringify(pa.meta.surfaceIR && pa.meta.surfaceIR.summary));

  /* 8) navegador: máscara vira DETECTED; a aba mostra a análise com a confiança de cada fato */
  const det = JSON.parse(await E(`(() => { const cv = document.createElement('canvas'); cv.width = 450; cv.height = 80; const c = cv.getContext('2d'); c.fillStyle = '#000'; c.fillRect(0, 0, 450, 80); c.fillStyle = '#fff'; c.fillRect(10, 10, 100, 60); c.fillRect(200, 10, 100, 60);
    const d = c.getImageData(0, 0, 450, 80), r = AIVJ.surfx.maskToRects(d.data, 450, 80, 4500, 800); return JSON.stringify(AIVJ.SURFACEIR.compile({ w: 4500, h: 800, regions: r.rects.map(q => Object.assign({}, q, { source: 'mask' })) })); })()`));
  check(conf(det, 'activeArea') === 'DETECTED' && det.regions.count === 2 && det.regions.layout === 'row', 'máscara PNG desenhada: duas regiões medidas, área ativa DETECTED, arranjo em fila', JSON.stringify(det.regions));
  await E(`document.querySelector('#tabs [data-tab="sur"]').click()`);
  const ui0 = JSON.parse(await E(`JSON.stringify({ rows: document.querySelectorAll('#sIr tbody tr').length, labels: [...document.querySelectorAll('#sIr .conf')].map(n => n.textContent), cons: document.getElementById('sIrCons').textContent, unk: !!document.getElementById('sIrUnk') })`));
  check(ui0.rows === 10 && ui0.labels.includes('EXPLICIT') && ui0.labels.includes('INFERRED') && ui0.labels.includes('UNKNOWN') && ui0.unk, 'a aba Superfície lista os 10 fatos com o rótulo de confiança e as perguntas em aberto', JSON.stringify(ui0).slice(0, 200));
  await E(`(() => { const c = AIVJ.project.canvas, h = c.w / 2, rows = ['A,0,0,' + h + ',' + c.h, 'B,' + h + ',0,' + h + ',' + c.h, ''], dt = new DataTransfer(); dt.items.add(new File([rows.join(String.fromCharCode(10))], 'mapa.csv', { type: 'text/csv' })); const i = document.getElementById('sMapFile'); i.files = dt.files; i.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  for (let i = 0; i < 20; i++) { if ((await E(`(AIVJ.project.canvas.displays || []).length`)) === 2) break; await new Promise(r => setTimeout(r, 200)); }
  const ui1 = JSON.parse(await E(`JSON.stringify({ t: document.getElementById('sIr').textContent, c: document.getElementById('sIrCons').textContent })`));
  check(/Área ativa.*EXPLICIT/.test(ui1.t) && /activeArea \(EXPLICIT\)/.test(ui1.c), 'importar um CSV pela aba muda a análise: a área ativa passa a EXPLICIT e vira restrição dura', ui1.c);
} catch (e) { bad('exceção: ' + (e.stack || e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nSurface IR ok.');
process.exit(fail ? 1 : 0);
