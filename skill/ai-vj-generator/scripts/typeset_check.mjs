#!/usr/bin/env node
// Teste da camada typeset (hierarquia, revelação e caminho): valida, desenha sem erro, começa e termina escondida (o loop fecha),
// a revelação é gradual (meio da entrada tem menos pixels que o platô), e as três formas de caminho produzem imagens diferentes.
//   node typeset_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-type-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const T = (name, p) => ({ type: 'typeset', name, role: 'type: ' + name, on: true, opacity: 1, blend: 'normal', p });
const base = { title: 'PRESSÃO', caption: 'sinal frio em quatro compassos', data: '132 BPM · 4500×800', size: 180, font: 'archivo' };
const comps = [
  { name: 'PILHA', hypothesis: 'x', layers: [{ type: 'bg', name: 'FUNDO', role: 'x' }, T('PILHA', base)] },
  { name: 'CIRCULO', hypothesis: 'x', layers: [{ type: 'bg', name: 'FUNDO', role: 'x' }, T('CIRCULO', { ...base, path: 'circle', radius: 220, size: 90 })] },
  { name: 'ONDA', hypothesis: 'x', layers: [{ type: 'bg', name: 'FUNDO', role: 'x' }, T('ONDA', { ...base, path: 'wave', amp: 70, waves: 2, drift: 1, size: 90 })] },
  { name: 'PALAVRA', hypothesis: 'x', layers: [{ type: 'bg', name: 'FUNDO', role: 'x' }, T('PALAVRA', { ...base, reveal: 'word', title: 'UM DOIS TRÊS', caption: '', data: '' })] },
];
const project = { schema: 'ai-vj-generator/2', id: 'typeset', seed: 5, meta: { name: 'TYPESET', brief: 'x', lang: 'pt' }, canvas: { w: 1280, h: 720, fps: 30 }, time: { bpm: 120, bars: 4 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: comps };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
let v = '';
try { v = execFileSync('python', [join(HERE, 'validate_project.py'), json], { encoding: 'utf8' }); } catch (e) { v = String(e.stdout); }
const errs = v.split('\n').filter(l => /^ERROR/.test(l) && !/visible layer/.test(l));   // a camada sozinha em cada composição não cumpre o mínimo de 5, de propósito
check(!errs.length, 'validador aceita a camada typeset (e conhece os parâmetros)', errs.join(' | ').slice(0, 200));
// aviso do validador: a cascata não cabe antes da saída (controle negativo: o projeto bom não avisa)
const warnOf = p => { const f = join(tmp, 'w.aivj.json'); writeFileSync(f, JSON.stringify({ ...project, compositions: [{ name: 'W', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }, T('W', p)] }] })); try { return execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8' }); } catch (e) { return String(e.stdout); } };
check(!/fully on only/.test(warnOf(base)), 'cascata que cabe no loop: sem aviso', warnOf(base).slice(0, 200));
check(/fully on only/.test(warnOf({ ...base, inAt: 0.5, inLen: 0.3, cascade: 0.2 })), 'cascata que não cabe antes da saída: aviso do validador', warnOf({ ...base, inAt: 0.5, inLen: 0.3, cascade: 0.2 }).slice(0, 200));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
if (argv.includes('--keep')) copyFileSync(html, argv[argv.indexOf('--keep') + 1]);   // para olhar com contact_sheet.mjs
const page = await openPage(html, { chrome, width: 1200, height: 800 });
try {
  const r = JSON.parse(await page.evaluate(`(() => { AIVJ.LAYERERR.clear(); const LF = AIVJ.loopFrames(), out = [], lit = d => { let n = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) n++; return n; };
    for (let ci = 0; ci < 4; ci++) { const f = n => AIVJ.renderFrame(ci, n, 0.5, true).data, a = f(0), z = f(LF), h = f(Math.round(LF * 0.5)), q = f(Math.round(LF * 0.17)); let w = 0; for (let i = 0; i < a.length; i++) if (a[i] !== z[i]) w++; out.push({ ci, start: lit(a), end: lit(z), mid: lit(h), part: lit(q), w, hash: (() => { let s = 7; for (let i = 0; i < h.length; i += 13) s = (s * 31 + h[i] + i) >>> 0; return s; })() }); }
    return JSON.stringify({ out, err: [...AIVJ.LAYERERR.values()] }); })()`));
  check(!r.err.length, 'typeset desenha as 4 composições sem erro de camada', r.err.join(' | ').slice(0, 200));
  for (const o of r.out) {
    check(o.start === 0 && o.end === 0 && o.w === 0, `${comps[o.ci].name}: começa e termina escondida, o loop fecha`, JSON.stringify(o));
    check(o.mid > 200, `${comps[o.ci].name}: no platô há texto desenhado (${o.mid} px)`, JSON.stringify(o));
    check(o.part < o.mid, `${comps[o.ci].name}: a revelação é gradual (${o.part} px na entrada, ${o.mid} no platô)`, JSON.stringify(o));
  }
  check(new Set(r.out.slice(0, 3).map(o => o.hash)).size === 3, 'pilha, círculo e onda produzem imagens diferentes (controle: o caminho importa)', JSON.stringify(r.out.map(o => o.hash)));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ntypeset ok.');
process.exit(fail ? 1 : 0);
