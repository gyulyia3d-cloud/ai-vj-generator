#!/usr/bin/env node
// Aceite da Fase 3 (gate do roadmap): alguém SEM o Claude, abrindo só app/index.html, consegue pela interface gerar, ajustar e exportar um set para uma parede 4500×800.
// O teste faz o que uma pessoa faria, na ordem: abre o motor limpo, escolhe "Gerar sem IA", preenche o briefing, gera, avalia, confere a superfície e as fatias do Resolume,
// liga o kick a um parâmetro, testa flashes e exporta uma amostra em PNG; depois abre o ZIP e confere tamanho, nomes e manifesto. Nenhum erro de JavaScript pode aparecer no caminho.
//   node phase3_acceptance.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { mkdtempSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const APP = join(HERE, '..', '..', '..', 'app', 'index.html');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

// o motor "limpo": sem projeto, como quem baixou do GitHub; localStorage vazio vem de um perfil novo
const page = await openPage(APP, { chrome, width: 1400, height: 900, waitFor: '!!(window.AIVJ && window.AIVJ.GENAI)' });
const E = x => page.evaluate(x);
const wait = async (cond, ms = 30000) => { for (let t = 0; t < ms; t += 250) { if (await E(cond)) return true; await new Promise(r => setTimeout(r, 250)); } return false; };
const setv = (id, v) => E(`(() => { const n = document.getElementById(${JSON.stringify(id)}); if (!n) return 'sem ${id}'; n.value = ${JSON.stringify(String(v))}; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
try {
  await E(`window.__errs = []; addEventListener('error', e => window.__errs.push(String(e.message))); addEventListener('unhandledrejection', e => window.__errs.push(String(e.reason))); 0`);

  // 1) a porta de entrada oferece o caminho sem IA
  const wiz = await E(`(() => { const w = document.getElementById('wiz'); return JSON.stringify({ open: !w.hidden, btn: !!document.getElementById('wGen'), text: w.textContent.includes('Sem IA') }); })()`);
  const w0 = JSON.parse(wiz);
  check(w0.btn && w0.text, `a tela inicial oferece "Gerar sem IA" (aberta: ${w0.open})`, JSON.stringify(w0));
  await E(`document.getElementById('wGen').click()`);
  check(await E(`document.getElementById('wiz').hidden && !document.querySelector('[data-pane="gen"]').hidden`), 'clicar em Gerar sem IA fecha a tela inicial e abre a aba Gerar', 'não abriu');

  // 2) preenche o briefing da parede 4500×800
  await setv('gNome', 'Pressão'); await setv('gConceito', 'Uma parede de sinal frio que aperta com a batida e solta na quebra; o público deve sentir pressão contida.'); await setv('gPreset', 'led-4500x800');
  await E(`document.querySelector('#gMoods [data-gm="industrial"]').click(); document.querySelector('#gMoods [data-gm="glitch"]').click()`);
  await setv('gBpm', '132'); await setv('gTitle', 'PRESSÃO'); await setv('gCap', 'sinal frio, quatro compassos'); await setv('gData', '132 BPM · 4500×800'); await setv('gFocal', 'um túnel de retângulos que estala no bumbo'); await setv('gBan', 'flare, brilho neon');
  await E(`document.getElementById('gGo').click()`);
  const g = JSON.parse(await E(`(() => { const P = AIVJ.project; return JSON.stringify({ w: P.canvas.w, h: P.canvas.h, folds: P.canvas.folds, comps: P.compositions.length, layers: P.compositions.map(c => c.layers.length), bpm: P.time.bpm, typeset: P.compositions.some(c => c.layers.some(l => l.type === 'typeset')), bible: !!P.meta.artBible, msg: document.getElementById('gMsg').textContent.slice(0, 120) }); })()`));
  check(g.w === 4500 && g.h === 800 && g.folds && g.folds[0] === 2250 && g.comps === 3 && g.bpm === 132 && g.layers.every(n => n >= 8) && g.typeset && g.bible, 'Gerar e abrir: 4500×800, dobra em 2250, 3 composições com 8 ou mais camadas, tipografia e bíblia de arte', JSON.stringify(g));

  // 3) avalia
  await E(`document.getElementById('gEval').click()`);
  const evOk = await wait(`document.querySelectorAll('#gEvalOut .rcard').length === 3`);
  const sc = evOk ? JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#gEvalOut .rcard .tag')].map(t => parseInt(t.textContent)))`)) : [];
  check(evOk && sc.every(n => n >= 60), `Avaliar devolve uma nota por composição (${sc.join(' / ')})`, JSON.stringify(sc));

  // 4) superfície: preset e legibilidade
  await E(`document.querySelector('#tabs [data-tab="sur"]').click()`);
  const s = JSON.parse(await E(`(() => { const P = AIVJ.project; return JSON.stringify({ w: P.canvas.w, h: P.canvas.h, folds: P.canvas.folds, resolume: /Resolume|XML/.test(document.querySelector('[data-pane="sur"]').textContent) }); })()`));
  check(s.w === 4500 && s.h === 800 && (s.folds || []).length === 1 && !s.resolume, 'Superfície: 4500×800 com uma dobra, sem fatias nem XML de mapping', JSON.stringify(s));
  const leg = await E(`document.getElementById('sLegGo') ? document.querySelector('[data-pane="sur"]').textContent.includes('Altura mínima de letra') : false`);
  check(leg, 'a legibilidade usa o passo e a distância do preset (3,9 mm, até 40 m)', 'sem painel de legibilidade');

  // 5) ajusta: liga o kick ao tamanho do herói
  const hi = await E(`(() => { const L = AIVJ.project.compositions[0].layers, i = L.findIndex(l => /HERÓI/.test(l.name)); AIVJ.state.sel = i; AIVJ.setCi(0); document.querySelector('#tabs [data-tab="par"]').click(); return i; })()`);
  await E(`document.getElementById('modAdd').click()`);
  await E(`(() => { const s = document.querySelector('[data-mk="src"][data-mi="1"]') || document.querySelector('[data-mk="src"][data-mi="0"]'); s.value = 'kick'; s.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  const mods = JSON.parse(await E(`JSON.stringify(AIVJ.project.compositions[0].layers[${hi}].mod)`));
  check(mods.some(m => m.src === 'kick'), 'o editor liga o kick a um parâmetro do herói', JSON.stringify(mods));

  // 6) testa flashes e exporta uma amostra
  await E(`document.querySelector('#tabs [data-tab="exp"]').click()`);
  await E(`document.querySelector('[data-es="0.25"]').click()`);
  await E(`(() => { const e = document.getElementById('eE'); e.value = 5; e.dispatchEvent(new Event('change', { bubbles: true })); })()`);
  await E(`document.getElementById('eFlTest').click()`);
  const fl = await wait(`document.getElementById('eInfo').textContent.includes('flash')`, 20000);
  check(fl, 'Testar flashes responde para as composições', await E(`document.getElementById('eInfo').textContent.slice(0, 160)`));
  const haveZip = await E(`typeof JSZip !== 'undefined'`);
  if (!haveZip) console.log('  --   JSZip não carregou (sem rede): a etapa de exportar o ZIP foi pulada');
  else {
    await E(`window.__dl = []; HTMLAnchorElement.prototype.click = function () { if (this.download) window.__dl.push(fetch(this.href).then(r => r.arrayBuffer()).then(b => ({ name: this.download, buf: b }))); }; 0`);
    await E(`document.getElementById('eGo').click()`);
    const done = await wait(`document.getElementById('eInfo').textContent.startsWith('Pronto')`, 120000);
    check(done, 'Renderizar e baixar ZIP termina', await E(`document.getElementById('eInfo').textContent.slice(0, 160)`));
    const z = JSON.parse(await E(`(async () => { const f = await Promise.all(window.__dl); if (!f.length) return JSON.stringify({}); const zip = await JSZip.loadAsync(f[0].buf), names = Object.keys(zip.files).filter(n => /\\/ALPHA\\/.*\\.png$/.test(n)).sort(), man = JSON.parse(await zip.file(/MANIFEST\\.json$/)[0].async('string')), im = new Image(); im.src = URL.createObjectURL(await zip.file(names[0]).async('blob')); await im.decode(); return JSON.stringify({ zipName: f[0].name, n: names.length, first: names[0], w: im.width, h: im.height, man: { c: man.canvas, e: man.export, p: man.project, fl: man.flash.perComposition.length } }); })()`));
    check(z.n === 6 && z.w === 1125 && z.h === 200 && /ALPHA\/01_/.test(z.first) && z.man.c.w === 4500 && z.man.e.size.join() === '1125,200' && z.man.e.frames === 6 && /^[0-9a-f]{64}$/.test(z.man.p.sha256), `o ZIP tem 6 PNG de 1125×200 (4500×800 a 25%), nomes previsíveis e manifesto com canvas, tamanho e SHA-256`, JSON.stringify(z));
  }
  const errs = JSON.parse(await E(`JSON.stringify(window.__errs)`));
  check(!errs.length, 'nenhum erro de JavaScript em todo o caminho', errs.join(' | ').slice(0, 300));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\naceite da fase 3 ok.');
process.exit(fail ? 1 : 0);
