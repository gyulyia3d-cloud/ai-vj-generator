#!/usr/bin/env node
// Teste da aba ISF: a biblioteca inteira entra como camada e compila (WebGL1), os originais desenham e fecham o loop, o importador do navegador
// dá o mesmo shader que isf.py, o arquivo .fs importado pela interface vira camada, filtros são recusados com motivo e a exportação compila.
//   node isf_ui_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = join(HERE, '..', 'isf-library');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-isfui-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const man = JSON.parse(readFileSync(join(LIB, 'manifest.json'), 'utf8'));
check(man.items.length >= 30 && man.items.every(i => i.credit && i.license && i.source), `manifesto: ${man.items.length} shaders, todos com autoria, licença e origem`, 'faltam campos');
check(man.items.filter(i => i.origin === 'third-party').every(i => ['MIT', 'CC0-1.0'].includes(i.license)), 'todo shader de terceiros é MIT ou CC0', '');
const project = { schema: 'ai-vj-generator/2', id: 'isfui', seed: 3, meta: { name: 'ISF UI', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'ANEL', p: { preset: 'CÉLULAS' } }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
const norm = s => s.replace(/-?\d+\.?\d*(?:e[-+]?\d+)?/gi, m => String(parseFloat(m)));   // 2.0 = 2, 1e-05 = 0.00001
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.isf)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const n = await E('AIVJ.isf.LIB.length'); check(n === man.items.length, 'a biblioteca embutida tem os mesmos shaders do manifesto', `${n} contra ${man.items.length}`);
  /* a aba existe e lista */
  await E(`document.querySelector('#tabs [data-tab="isf"]').click()`);
  const cards = await E(`document.querySelectorAll('[data-pane="isf"] .rcard').length`); check(cards === n, 'aba ISF lista todos os cartões', `${cards}`);
  await E(`(() => { const q = document.getElementById('isfQ'); q.value = 'aivj tunnel'; q.dispatchEvent(new Event('input')); })()`);
  check(await E(`document.querySelectorAll('[data-pane="isf"] .rcard').length`) === 1, 'busca filtra a lista', '');
  await E(`(() => { const q = document.getElementById('isfQ'); q.value = ''; q.dispatchEvent(new Event('input')); })()`);
  /* cada shader entra, compila e (os originais) desenham e fecham o loop */
  for (const it of man.items) {
    const r = JSON.parse(await E(`(() => {
      const A = AIVJ, P = A.project, c = P.compositions[0]; c.layers.length = 1; A.isf.ui.msg = null;
      const okc = A.isf.add(${JSON.stringify(it.id)}); const L = c.layers[c.layers.length - 1];
      const px = f => { const d = A.renderFrame(0, f, 0.5, true).data; let s = 0; for (let i = 0; i < d.length; i += 4) s += d[i] + d[i + 1] + d[i + 2]; return [s, d]; };
      const F = Math.round(P.time.bars * 4 * 60 / P.time.bpm * P.canvas.fps);
      const a = px(0), b = px(F), m = px(Math.round(F * 0.37)); let df = 0, dm = 0;
      for (let i = 0; i < a[1].length; i++) { df += Math.abs(a[1][i] - b[1][i]); dm += Math.abs(a[1][i] - m[1][i]); }
      return JSON.stringify({ okc, role: L && L.role, lit: Math.max(a[0], m[0]), seam: df / a[1].length, move: dm / a[1].length, msg: A.isf.ui.msg && A.isf.ui.msg.text });
    })()`));
    check(r.okc, `compila: ${it.id}`, r.msg);
    if (it.origin === 'original') {
      check(r.lit > 0, `desenha: ${it.id}`, 'preto');
      check(r.seam < 0.6 && r.move > r.seam * 3, `fecha o loop: ${it.id} (emenda ${r.seam.toFixed(2)}, movimento ${r.move.toFixed(2)})`, 'emenda grande ou parado');
    }
    check(/Credit: /.test(r.role || '') && r.role.includes('ISF library (' + it.license + ')'), `camada guarda crédito e licença: ${it.id}`, r.role);
  }
  /* paridade com isf.py */
  let par = 0; const parBad = [];
  for (const it of man.items) {
    const py = join(tmp, 'x.layer.json');
    execFileSync('python', [join(HERE, 'isf.py'), 'import', join(LIB, it.file), '--bars', '4', '--bpm', '120', '--out', py], { stdio: 'pipe' });
    const pyL = JSON.parse(readFileSync(py, 'utf8')).layer;
    const js = JSON.parse(await E(`(() => { const it = AIVJ.isf.LIB.find(x => x.id === ${JSON.stringify(it.id)}); const r = AIVJ.isf.X.convert(it.src, ${JSON.stringify(it.file.replace(/^.*\//, ''))}, 4, 120); return JSON.stringify(r.layer); })()`));
    if (norm(js.p.src) === norm(pyL.p.src) && js.name === pyL.name && JSON.stringify(Object.keys(js.p).sort()) === JSON.stringify(Object.keys(pyL.p).sort())) par++; else parBad.push(it.id);
  }
  check(!parBad.length, `importador do navegador = isf.py em ${par}/${man.items.length} shaders`, parBad.join(','));
  /* importar arquivo pela interface */
  const gen = `/*{ "DESCRIPTION": "fixture", "CREDIT": "tester", "INPUTS": [{"NAME":"size","TYPE":"float","DEFAULT":0.3,"MIN":0,"MAX":1},{"NAME":"phase","TYPE":"float","DEFAULT":0}] }*/
void main(){ vec2 p = isf_FragNormCoord - 0.5; float k = smoothstep(0.01, 0.0, abs(length(p) - size - 0.05*sin(6.28318*phase))); gl_FragColor = vec4(vec3(k), k); }`;
  const filt = '/*{ "INPUTS":[{"NAME":"inputImage","TYPE":"image"}] }*/\nvoid main(){ gl_FragColor = IMG_THIS_NORM_PIXEL(inputImage); }';
  const out = JSON.parse(await E(`(async () => { const c = AIVJ.project.compositions[0]; c.layers.length = 1;
    await AIVJ.isf.files([new File([${JSON.stringify(gen)}], 'meu anel.fs'), new File([${JSON.stringify(filt)}], 'filtro.fs'), new File(['nada'], 'quebrado.fs')]);
    return JSON.stringify({ n: c.layers.length, name: c.layers[1] && c.layers[1].name, msg: AIVJ.isf.ui.msg }); })()`));
  check(out.n === 2 && out.name === 'MEU ANEL', 'arquivo .fs importado pela interface vira camada; filtro e arquivo quebrado não', JSON.stringify(out));
  check(out.msg && out.msg.bad && /1 de 3/.test(out.msg.text) && /filtro\.fs/.test(out.msg.text) && /quebrado\.fs/.test(out.msg.text), 'a mensagem diz quais arquivos falharam e por quê', out.msg && out.msg.text);
  /* camada isf: um shader da biblioteca escolhido nos parâmetros, as 84 opções, compila e desenha */
  const ly = JSON.parse(await E(`(async () => { const A = AIVJ, P = A.project; P.compositions[0].layers = [{ type: 'bg', name: 'F' }];
    const ids = A.isf.LIB.map(x => x.id);
    A.isf.add(ids[3]); const L = P.compositions[0].layers[1];
    return JSON.stringify({ n: ids.length, type: L.type, lib: L.p.lib, ok: L.p.lib === ids[3], hasSrc: !!L.p.src }); })()`));
  check(ly.n === 84 && ly.type === 'isf' && ly.ok && !ly.hasSrc, 'adicionar da biblioteca cria uma camada do tipo isf com o shader só em p.lib', JSON.stringify(ly));
  const sweep = JSON.parse(await E(`(() => { const A = AIVJ, P = A.project, ids = A.isf.LIB.map(x => x.id), bad = [];
    for (const id of ids) { P.compositions[0].layers = [{ type: 'bg', name: 'F' }, { type: 'isf', name: 'I', on: true, opacity: 1, blend: 'add', p: { lib: id } }]; A.GLERR.clear(); const d = A.renderFrame(0, 30, 0.5, true).data; if ([...A.GLERR.values()].length) bad.push(id); }
    return JSON.stringify({ n: ids.length, bad }); })()`));
  check(!sweep.bad.length, 'as ' + sweep.n + ' opções do parâmetro lib compilam e desenham como camada isf', sweep.bad.join(','));
  /* no inspetor, o parâmetro lib lista as 84 opções */
  const ui = JSON.parse(await E(`(() => { const A = AIVJ, P = A.project; P.compositions[0].layers = [{ type: 'bg', name: 'F' }]; A.isf.add(A.isf.LIB[0].id); A.state.sel = 1; document.querySelector('#tabs [data-tab="par"]').click();
    const sel = document.querySelector('[data-pane="par"] .pc[data-k="lib"] select'); return JSON.stringify({ n: sel ? sel.options.length : 0, cur: sel ? sel.value : null, first: A.isf.LIB[0].id }); })()`));
  check(ui.n === 84 && ui.cur === ui.first, 'o parâmetro lib da camada isf mostra as 84 opções no inspetor', JSON.stringify(ui));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\naba ISF ok.');
process.exit(fail ? 1 : 0);
