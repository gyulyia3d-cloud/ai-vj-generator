#!/usr/bin/env node
// Teste automático dos recursos V6 do motor: botão Cor (paletas), menu na linha do divisor, rodapé, +Efeitos com prévia,
// pop-up de ajuda, idioma EN/PT-BR e objeto 3D (OBJ, GLB; shader, wireframe, nuvem de pontos).
//   node features_check.mjs [--chrome caminho]     Sai com 1 se algo falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-feat-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const sleep = ms => new Promise(r => setTimeout(r, ms));

const contract = Object.fromEntries(['concept', 'audienceEffect', 'semioticIntent', 'visualLanguage', 'formLanguage', 'materialLanguage', 'colorLogic'].map(k => [k, 'x ' + k]));
contract.loopGrammar = 'cyclic: o loop fecha em compassos inteiros';
const layers = ['bg', 'organism', 'lines'].map((t, i) => ({ type: t, name: 'CAMADA ' + (i + 1), role: 'camada ' + t }));
const project = { schema: 'ai-vj-generator/2', id: 'feat', seed: 7, meta: { name: 'TESTE DE RECURSOS', brief: 'x', contract, lang: 'pt' }, canvas: { w: 1920, h: 1080, fps: 30, target: 'led' },
  time: { bpm: 124, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'PRIMEIRA', hypothesis: 'x', layers }] };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

/* octaedro em OBJ e um triângulo em GLB mínimo */
const obj = 'v 1 0 0\nv -1 0 0\nv 0 1 0\nv 0 -1 0\nv 0 0 1\nv 0 0 -1\nf 1 3 5\nf 3 2 5\nf 2 4 5\nf 4 1 5\nf 3 1 6\nf 2 3 6\nf 4 2 6\nf 1 4 6\n';
const glb = (() => {
  const pos = new Float32Array([0, 0, 0, 1, 0, 0, 0, 1, 0]), idx = new Uint16Array([0, 1, 2, 0]), bin = Buffer.concat([Buffer.from(pos.buffer), Buffer.from(idx.buffer)]);
  const js = Buffer.from(JSON.stringify({ asset: { version: '2.0' }, buffers: [{ byteLength: bin.length }], bufferViews: [{ buffer: 0, byteOffset: 0, byteLength: 36 }, { buffer: 0, byteOffset: 36, byteLength: 8 }],
    accessors: [{ bufferView: 0, componentType: 5126, count: 3, type: 'VEC3' }, { bufferView: 1, componentType: 5123, count: 3, type: 'SCALAR' }], meshes: [{ primitives: [{ attributes: { POSITION: 0 }, indices: 1 }] }] }));
  const pj = Buffer.concat([js, Buffer.alloc((4 - js.length % 4) % 4, 0x20)]), pb = Buffer.concat([bin, Buffer.alloc((4 - bin.length % 4) % 4)]);
  const h = Buffer.alloc(12); h.writeUInt32LE(0x46546C67, 0); h.writeUInt32LE(2, 4); h.writeUInt32LE(12 + 8 + pj.length + 8 + pb.length, 8);
  const c1 = Buffer.alloc(8); c1.writeUInt32LE(pj.length, 0); c1.writeUInt32LE(0x4E4F534A, 4); const c2 = Buffer.alloc(8); c2.writeUInt32LE(pb.length, 0); c2.writeUInt32LE(0x004E4942, 4);
  return Buffer.concat([h, c1, pj, c2, pb]).toString('base64');
})();

const page = await openPage(html, { chrome, width: 1400, height: 900 });
const E = x => page.evaluate(x);
const nl = () => E(`AIVJ.project.compositions[AIVJ.state.ci].layers.length`), hist = () => E(`AIVJ.hist`);
const lit = n => E(`(() => { const d = AIVJ.renderFrame(0, ${n}, 0.2, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s; })()`);
try {
  await E(`localStorage.clear(); AIVJ.state.codeAllow = true; 1`);

  /* barra, rodapé, botões */
  check(await E(`!document.querySelector('#fire')`), 'o botão Evento foi removido', '');
  check(await E(`document.querySelector('#explode').textContent.trim()`) === 'Mostrar camadas', 'Explodir virou Mostrar camadas', await E(`document.querySelector('#explode').textContent`));
  check(await E(`(b => b[b.findIndex(x => x.id === 'audBtn') + 1].id)([...document.querySelectorAll('#bar > button')])`) === 'palBtn', 'o botão Cor vem logo depois de Áudio', '');
  const foot = await E(`document.querySelector('#foot').innerText + '|' + [...document.querySelectorAll('#foot a')].map(a => a.href).join(',')`);
  check(/MIT License/i.test(foot) && /instagram\.com\/gyulyia/.test(foot) && /gyulyia\.com/.test(foot), 'rodapé: MIT License, Instagram e site', foot);
  const sp = JSON.parse(await E(`JSON.stringify((a => ({ r: a.right, l: document.querySelector('#split').getBoundingClientRect().left }))(document.querySelector('#panelOpen').getBoundingClientRect()))`));
  check(Math.abs(sp.r - sp.l) <= 2, 'o botão do menu fica na linha do divisor', JSON.stringify(sp));
  await E(`document.querySelector('#panelOpen').click(); 1`); await sleep(200);
  check(await E(`document.querySelector('#app').classList.contains('nopanel')`), 'o botão minimiza o menu', '');
  const sp2 = JSON.parse(await E(`JSON.stringify(document.querySelector('#panelOpen').getBoundingClientRect())`));
  check(sp2.right >= (await E('innerWidth')) - 30 && sp2.width > 0, 'minimizado, o botão continua visível na borda', JSON.stringify(sp2));
  await E(`document.querySelector('#panelOpen').click(); 1`); await sleep(200);
  check(await E(`!document.querySelector('#app').classList.contains('nopanel')`), 'o botão reabre o menu', '');

  /* paleta */
  const p0 = await E(`JSON.stringify(AIVJ.project.palette)`), h0 = await hist();
  await E(`document.querySelector('#palBtn').click(); 1`); await sleep(150);
  check(await E(`!document.querySelector('#palPop').hidden`), 'o botão Cor abre a janela de paletas', '');
  await E(`document.querySelector('[data-pm="alpha"]').click(); document.querySelector('#pmAlpha').click(); 1`); await sleep(400);
  check(await E(`AIVJ.project.palette.mode`) === 'white-alpha' && await hist() === h0 + 1, 'Alpha aplica branco α em um passo', '');
  await E(`AIVJ.undo(); 1`); await sleep(200);
  check(await E(`JSON.stringify(AIVJ.project.palette)`) === p0, 'Desfazer devolve a paleta', '');
  await E(`document.querySelector('[data-pm="standard"]').click(); 1`); await sleep(100);
  const nSch = await E(`document.querySelectorAll('[data-sch]').length`);
  await E(`document.querySelector('[data-sch="triad"]').click(); 1`); await sleep(400);
  const tri = JSON.parse(await E(`JSON.stringify(AIVJ.project.palette)`));
  check(nSch === 6 && tri.accent !== '#E19000' && tri.bg !== '#000000', 'Standard gera 6 esquemas e aplica um', JSON.stringify(tri));
  await E(`document.querySelector('[data-pm="custom"]').click(); 1`); await sleep(100);
  await E(`(i => { i.value = '10'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('.crgb[data-k="accent"] [data-ch="0"]')); 1`); await sleep(300);
  const ac = await E(`AIVJ.project.palette.accent`);
  check(/^#0A/i.test(ac), 'Personalizada: digitar R=10 muda o HEX', ac);
  await E(`(i => { i.value = '#112233'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('.crgb[data-k="bg"] [data-hexc]')); 1`); await sleep(300);
  check(await E(`AIVJ.project.palette.bg`) === '#112233', 'Personalizada: digitar o HEX muda a cor', await E(`AIVJ.project.palette.bg`));
  await E(`(i => { i.value = 'zzz'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('.crgb[data-k="bg"] [data-hexc]')); 1`); await sleep(200);
  check(await E(`AIVJ.project.palette.bg`) === '#112233', 'HEX inválido não altera a cor', '');
  await E(`document.querySelector('[data-pm="brief"]').click(); document.querySelector('#pmBrief').click(); 1`); await sleep(400);
  check(await E(`JSON.stringify([AIVJ.project.palette.bg, AIVJ.project.palette.primary, AIVJ.project.palette.accent])`) === JSON.stringify(['#000000', '#E8E8E8', '#E19000']), 'Briefing restaura a paleta original do /vj', await E(`JSON.stringify(AIVJ.project.palette)`));
  await E(`document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); 1`); await sleep(100);
  check(await E(`document.querySelector('#palPop').hidden`), 'Esc fecha a janela de paletas', '');

  /* +Efeitos */
  await E(`document.querySelector('#tabs [data-tab="rec"]').click(); 1`); await sleep(150);
  check(await E(`document.querySelector('#tabs [data-tab="rec"]').textContent.trim()`) === '+Efeitos', 'a aba virou +Efeitos', '');
  check(await E(`(dt => dt.map(x => x.textContent).join('|'))([...document.querySelectorAll('.rcard')[0].querySelectorAll('dt')])`).then(s => /Custo\|Prévia$/.test(s)), 'o botão Visualizar vem depois de Custo', '');
  await E(`document.querySelector('[data-rprev="chladni"]').click(); 1`); await sleep(500);
  const a1 = await E(`document.querySelector('[data-rc="chladni"] canvas').toDataURL().length`); await sleep(500);
  const a2 = await E(`document.querySelector('[data-rc="chladni"] canvas').toDataURL()`);
  check(await E(`document.querySelector('[data-rc="chladni"] canvas').width`) <= 200, 'a prévia é de baixa resolução (≤ 200 px)', '');
  await E(`document.querySelector('[data-rprev="chladni"]').click(); 1`); await sleep(200);
  const a3 = await E(`document.querySelector('[data-rc="chladni"] canvas').hidden`);
  check(a3 && a1 > 500 && a2.length > 500, 'a prévia anima e desliga ao clicar de novo', `${a1} ${a3}`);

  /* ajuda e idioma */
  await E(`document.querySelector('#helpBtn').click(); 1`); await sleep(150);
  check(await E(`!document.querySelector('#howto').hidden && document.querySelectorAll('#howBody li').length >= 10`), 'o botão ? abre o pop-up com 10 passos', '');
  await E(`document.querySelector('#howClose').click(); 1`); await sleep(100);
  check(await E(`document.querySelector('#howto').hidden`), 'o X fecha o pop-up', '');
  await E(`document.querySelector('#langBtn').click(); 1`); await sleep(300);
  check(await E(`document.querySelector('#tabs [data-tab="comp"]').textContent.trim()`) === 'Compose' && await E(`document.querySelector('#undoBtn').textContent.trim()`) === 'Undo', 'EN traduz abas e botões', await E(`document.querySelector('#tabs [data-tab="comp"]').textContent`));
  await E(`document.querySelector('#tabs [data-tab="rec"]').click(); 1`); await sleep(200);
  check(await E(`document.querySelector('[data-radd]').textContent.trim()`) === 'Add to composition', 'EN traduz o que é criado depois (aba redesenhada)', await E(`document.querySelector('[data-radd]').textContent`));
  check(await E(`document.documentElement.lang`) === 'en', 'html lang = en', '');
  await E(`document.querySelector('#langBtn').click(); 1`); await sleep(300);
  check(await E(`document.querySelector('#tabs [data-tab="comp"]').textContent.trim()`) === 'Compor' && await E(`document.querySelector('#undoBtn').textContent.trim()`) === 'Desfazer', 'PT-BR volta ao original sem sobras', '');
  await E(`document.querySelector('#tabs [data-tab="lay"]').click(); 1`);

  /* objeto 3D */
  const l0 = await nl(), h1 = await hist();
  await E(`AIVJ.importFile(new File([${JSON.stringify(obj)}], 'octa.obj')); 1`); await sleep(900);
  const L = JSON.parse(await E(`JSON.stringify((c => ({ t: c.layers[AIVJ.state.sel].type, on: c.layers[AIVJ.state.sel].on, m: c.layers[AIVJ.state.sel].p.media }))(AIVJ.project.compositions[AIVJ.state.ci]))`));
  check(L.t === 'model' && L.on && L.m === 'octa.obj', 'importar .obj ativa a camada OBJETO 3D', JSON.stringify(L));
  check(await hist() === h1 + 1, 'a importação é um passo de histórico', '');
  await E(`(c => c.layers.forEach((l, i) => { l.on = i === AIVJ.state.sel; }))(AIVJ.project.compositions[AIVJ.state.ci]); 1`);
  const sums = {};
  for (const mode of ['shader', 'wireframe', 'pointcloud']) { await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].p.mode = '${mode}'; 1`); sums[mode] = await lit(3); }
  check(Object.values(sums).every(s => s > 2000), 'os três renders desenham pixels', JSON.stringify(sums));
  check(new Set(Object.values(sums)).size === 3, 'os três renders são diferentes entre si', JSON.stringify(sums));
  await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].p.mode = 'shader'; 1`);
  const f0 = await lit(0), fl = await E(`AIVJ.loopFrames ? AIVJ.loopFrames() : 0`);
  check(fl > 0 && await lit(fl) === f0, 'o objeto gira e o loop fecha (quadro 0 = quadro final)', `${f0} vs ${await lit(fl)}`);
  const exp = JSON.parse(await E(`JSON.stringify(Object.keys(AIVJ.projectOut().assets || {}))`));
  check(exp.includes('octa.obj'), 'o modelo viaja no JSON do projeto', JSON.stringify(exp));
  await E(`AIVJ.importFile(new File([Uint8Array.from(atob('${glb}'), c => c.charCodeAt(0))], 'tri.glb')); 1`); await sleep(900);
  check(await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].p.media`) === 'tri.glb', 'importar .glb funciona', '');
  const bad = await E(`(async () => { try { AIVJ.parseModel('x.glb', new TextEncoder().encode('nope').buffer); return 'sem erro'; } catch (e) { return 'erro'; } })()`);
  check(bad === 'erro', 'arquivo inválido dá erro, não quebra', bad);
  await E(`AIVJ.undo(); 1`); await sleep(300);
  check(await E(`AIVJ.project.compositions[AIVJ.state.ci].layers[AIVJ.state.sel].p.media`) !== 'tri.glb', 'Desfazer desfaz a importação', '');
} finally { await page.close(); }

console.log(fail ? `\n${fail} problema(s).` : '\nTudo certo.');
process.exit(fail ? 1 : 0);
