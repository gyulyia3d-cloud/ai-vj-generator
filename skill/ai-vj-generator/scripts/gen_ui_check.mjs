#!/usr/bin/env node
// Teste da aba Gerar: preenche o formulário como uma pessoa (sem IA, sem terminal), gera o projeto de uma parede 4500x800, confere que o projeto abriu
// no motor, recusa briefing incompleto em português, leva o briefing de ida e volta (salvar/carregar), avalia, escapa HTML e troca de idioma.
//   node gen_ui_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-genui-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'g', seed: 1, meta: { name: 'G', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30 }, time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1300, height: 900 });
const E = x => page.evaluate(x);
// ajuda para digitar num campo como uma pessoa: define o valor e dispara input/change
const setv = (id, v) => E(`(() => { const n = document.getElementById(${JSON.stringify(id)}); if (!n) return 'sem campo ${id}'; n.value = ${JSON.stringify(String(v))}; n.dispatchEvent(new Event('input', { bubbles: true })); n.dispatchEvent(new Event('change', { bubbles: true })); return 'ok'; })()`);
try {
  await E(`document.querySelector('#tabs [data-tab="gen"]').click()`);
  const vis = await E(`!document.querySelector('[data-pane="gen"]').hidden && !!document.getElementById('gGo')`);
  check(vis, 'a aba Gerar abre com o formulário', 'aba não apareceu');

  // 1) briefing incompleto: recusado, em português, sem abrir nada
  await E(`document.getElementById('gGo').click()`);
  let msg = await E(`document.getElementById('gMsg').textContent`);
  check(/Corrija/.test(msg) && /nome/.test(msg) && /conceito/.test(msg), 'briefing vazio é recusado com o que falta, em português', msg.slice(0, 200));

  // 2) a parede 4500x800 pelo preset, como no aceite da fase 3
  for (const [id, v] of [['gNome', 'Pressão <b>x</b>'], ['gConceito', 'Uma parede de sinal frio que aperta com a batida e solta na quebra; o público deve sentir pressão contida.'], ['gBpm', '132']]) await setv(id, v);
  await setv('gPreset', 'led-4500x800');
  await E(`document.querySelector('#gMoods [data-gm="industrial"]').click(); document.querySelector('#gMoods [data-gm="glitch"]').click()`);
  const f = JSON.parse(await E(`JSON.stringify({ w: document.getElementById('gW').value, h: document.getElementById('gH').value, folds: document.getElementById('gFolds').value, type: document.getElementById('gType').value, pitch: document.getElementById('gPitch').value, moods: [...document.querySelectorAll('#gMoods [aria-pressed=true]')].map(b => b.dataset.gm) })`));
  check(f.w === '4500' && f.h === '800' && f.folds === '2250' && f.type === 'led' && f.pitch === '3.9' && f.moods.join() === 'industrial,glitch', 'o preset preenche 4500×800, dobra em 2250, passo 3,9 mm e os climas ficam marcados', JSON.stringify(f));
  await setv('gFocal', 'um túnel de retângulos que estala no bumbo');
  await E(`document.getElementById('gGo').click()`);
  const r = JSON.parse(await E(`(() => { const P = AIVJ.project; return JSON.stringify({ name: P.meta.name, w: P.canvas.w, h: P.canvas.h, folds: P.canvas.folds, comps: P.compositions.length, bpm: P.time.bpm, mood: P.meta.contract.semioticIntent, bible: !!P.meta.artBible, msg: document.getElementById('gMsg').textContent, layers: P.compositions[0].layers.length }); })()`));
  check(r.w === 4500 && r.h === 800 && r.folds && r.folds[0] === 2250 && r.comps === 3 && r.bpm === 132 && r.bible && r.layers >= 7, 'Gerar e abrir cria o projeto 4500×800 (3 composições, dobra, bíblia de arte) no motor', JSON.stringify(r));
  check(/aberto: 3 composições/.test(r.msg) && /Ctrl\+Z/.test(r.msg), 'a mensagem de resultado resume o projeto e diz como desfazer', r.msg);
  const xss = await E(`(() => { const m = document.getElementById('gMsg'); return { raw: !!m.querySelector('b'), esc: m.innerHTML.toUpperCase().includes('&LT;B&GT;X&LT;/B&GT;') }; })()`);
  check(!xss.raw && xss.esc, 'o nome com HTML aparece escapado no resultado', JSON.stringify(xss));

  // 3) desfazer volta ao projeto anterior
  await E(`AIVJ.undo()`);
  const back = await E(`AIVJ.project.canvas.w`);
  check(back !== 4500, 'desfazer volta ao projeto anterior', 'canvas ' + back);
  await E(`document.getElementById('gGo').click()`);

  // 4) avaliar: roda, devolve nota e mostra por composição
  await E(`document.getElementById('gEval').click()`);
  for (let i = 0; i < 80; i++) { if (await E(`!!document.querySelector('#gEvalOut .rcard')`)) break; await new Promise(r => setTimeout(r, 250)); }
  const ev = JSON.parse(await E(`JSON.stringify({ cards: document.querySelectorAll('#gEvalOut .rcard').length, head: document.querySelector('#gEvalOut .sec')?.textContent || '' })`));
  check(ev.cards === 3 && /\/100/.test(ev.head), 'Avaliar mostra uma nota por composição e a nota do set', JSON.stringify(ev));

  // 5) briefing de ida e volta
  const rt = JSON.parse(await E(`(() => { const u = AIVJ.genUI, b = u.toBrief(u.state.v); return JSON.stringify({ b, ok: b.surface.w === 4500 && b.surface.folds[0] === 2250 && b.mood.length === 2 && b.focalEvent.startsWith('um túnel') }); })()`));
  check(rt.ok, 'o briefing montado pelo formulário guarda superfície, dobras, climas e evento focal', JSON.stringify(rt.b).slice(0, 300));
  const again = JSON.parse(await E(`(() => { const u = AIVJ.genUI, a = JSON.stringify(AIVJ.GENAI.build(u.toBrief(u.state.v))), b = JSON.stringify(AIVJ.GENAI.build(u.toBrief(u.state.v))); return JSON.stringify({ same: a === b }); })()`));
  check(again.same, 'o mesmo briefing dá o mesmo projeto (determinístico)', 'projetos diferentes');

  // 6) idioma: em inglês os rótulos mudam e o formulário continua gerando
  await E(`AIVJ.setLang('en', true)`);
  const en = await E(`document.querySelector('[data-pane="gen"] .sec').textContent`);
  check(/Generate without AI/.test(en), 'em inglês o título da aba muda', en);
  await E(`AIVJ.setLang('pt', true)`);

  // 6b) regressão: editar o formulário não pode alterar o padrão (as listas de climas e cores eram compartilhadas)
  const sh = JSON.parse(await E(`(() => { const u = AIVJ.genUI; u.state.v.colors[0] = '#123456'; u.state.v.mood.push('calm'); const f = u.fromBrief({ name: 'xx', concept: 'um conceito qualquer aqui' }); return JSON.stringify({ mood: f.mood, c0: f.colors[0] }); })()`));
  check(sh.mood.length === 0 && sh.c0 === '#000000', 'editar climas e cores no formulário não altera o padrão de um briefing novo', JSON.stringify(sh));

  // 7) limites: 4 climas, largura fora da faixa
  await E(`AIVJ.genUI.render()`);
  await E(`['gm', 'gm'].length; document.querySelector('#gMoods [data-gm="cosmic"]').click()`);
  const mood3 = await E(`AIVJ.genUI.state.v.mood.length`);
  check(mood3 === 3, 'o formulário não passa de 3 climas', 'climas: ' + mood3);
  await setv('gW', '99999'); await E(`document.getElementById('gGo').click()`);
  msg = await E(`document.getElementById('gMsg').textContent`);
  check(/largura/.test(msg), 'largura fora da faixa é recusada com mensagem', msg.slice(0, 160));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\naba Gerar ok.');
process.exit(fail ? 1 : 0);
