#!/usr/bin/env node
// Teste automático do layout, tema, histórico e controles numéricos do motor, num Chrome/Edge headless.
//
//   node ui_layout_check.mjs [--chrome caminho]
//
// 1. DIVISOR: arrastar, setas, Home/End, duplo clique, persistência, minimizar e reabrir o menu.
// 2. TEMA: escuro, claro e sistema trocam os tokens; contraste de texto continua legível nos dois.
// 3. RESPONSIVO: de 320 a 2560 px de largura, em pé e deitado, sem rolagem horizontal, com o menu sempre alcançável.
// 4. HISTÓRICO: desfazer e refazer cobrem cada tipo de alteração (Ctrl+Z, Ctrl+Shift+Z, Ctrl+Y).
// 5. NÚMEROS: contas seguras, setas com Shift e Alt, valor inválido volta ao anterior, arrastar o rótulo.
// 6. VISTA: leitura de coordenadas e zona desenhada com o mouse.
// Sai com 1 se algo falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
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
const sleep = ms => new Promise(r => setTimeout(r, ms));

const contract = Object.fromEntries(['concept', 'audienceEffect', 'semioticIntent', 'visualLanguage', 'formLanguage', 'materialLanguage', 'colorLogic', 'spatialLogic', 'motionLanguage', 'temporalArc', 'technicalStrategy', 'forbiddenShortcuts'].map(k => [k, 'texto específico deste teste de interface']));
contract.loopGrammar = 'cyclic: o loop fecha em compassos inteiros';
const layers = ['bg', 'organism', 'lines', 'data', 'hud', 'measure', 'post'].map((t, i) => ({ type: t, name: 'CAMADA ' + (i + 1), role: 'camada ' + t + ' do teste', p: {} }));
const project = { schema: 'ai-vj-generator/2', id: 'ui-layout', seed: 7, meta: { name: 'TESTE DE LAYOUT', brief: 'x', contract },
  canvas: { w: 1920, h: 1080, fps: 30, target: 'screen' }, time: { bpm: 124, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'PRIMEIRA', hypothesis: 'x', layers }, { name: 'SEGUNDA', hypothesis: 'y', layers }] };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

const page = await openPage(html, { chrome, width: 1400, height: 900 });
const E = x => page.evaluate(x), send = page.send;
const mouse = (type, x, y, extra = {}) => send('Input.dispatchMouseEvent', { type, x, y, button: 'left', buttons: type === 'mouseReleased' ? 0 : 1, clickCount: 1, ...extra });
const rect = async sel => JSON.parse(await E(`JSON.stringify((r => ({ x: r.x, y: r.y, w: r.width, h: r.height, r: r.right, b: r.bottom }))(document.querySelector(${JSON.stringify(sel)}).getBoundingClientRect()))`));
const panelW = () => E(`Math.round(document.querySelector('#panel').getBoundingClientRect().width)`);
const key = (k, extra = {}) => send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0, ...extra }).then(() => send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code: extra.code || k, windowsVirtualKeyCode: extra.vk || 0, ...extra }));

try {
  await E(`AIVJ.state.codeAllow = true; localStorage.clear(); 1`);
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false });
  await sleep(300);

  console.log('1. divisor e menu');
  check(await panelW() === 400, 'largura inicial do menu é 400 px', 'obtido ' + await panelW());
  const sp = await rect('#split');
  await mouse('mousePressed', sp.x + sp.w / 2, sp.y + 200); await mouse('mouseMoved', sp.x - 60, sp.y + 200); await mouse('mouseMoved', sp.x - 100, sp.y + 200); await mouse('mouseReleased', sp.x - 100, sp.y + 200);
  await sleep(150);
  const w1 = await panelW(); check(w1 > 480 && w1 < 520, 'arrastar o divisor 100 px alarga o menu (' + w1 + ')', 'obtido ' + w1);
  check(await E(`localStorage.getItem('aivj-panelW')`) === String(w1), 'a largura fica salva', await E(`localStorage.getItem('aivj-panelW')`));
  await E(`document.querySelector('#split').focus(); 1`); await key('ArrowRight', { code: 'ArrowRight', vk: 39 });
  check(await panelW() === w1 - 16, 'seta para a direita estreita 16 px', 'obtido ' + await panelW());
  await key('Home', { code: 'Home', vk: 36 }); check(await panelW() === 280, 'Home vai ao mínimo (280)', 'obtido ' + await panelW());
  await key('End', { code: 'End', vk: 35 }); const wmax = await panelW(); check(wmax >= 700 && wmax <= 760, 'End vai ao máximo (' + wmax + ')', 'obtido ' + wmax);
  await E(`document.querySelector('#split').dispatchEvent(new MouseEvent('dblclick', { bubbles: true })); 1`); await sleep(100);
  check(await panelW() === 400, 'duplo clique restaura 400 px', 'obtido ' + await panelW());
  const vw0 = (await rect('#view')).w;
  await E(`document.querySelector('#panelOpen').click(); 1`); await sleep(200);
  const vw1 = (await rect('#view')).w;
  check(vw1 > vw0 + 380 && await E(`getComputedStyle(document.querySelector('#panel')).display`) === 'none', 'minimizar deixa só a vista (' + Math.round(vw0) + ' → ' + Math.round(vw1) + ')', 'vista não cresceu');
  check(await E(`getComputedStyle(document.querySelector('#panelOpen')).display`) !== 'none', 'botão de reabrir aparece', 'sumiu');
  check(await E(`localStorage.getItem('aivj-panelOpen')`) === 'false', 'estado minimizado fica salvo', '');
  await E(`document.querySelector('#panelOpen').click(); 1`); await sleep(200);
  check(await panelW() === 400, 'reabrir volta ao 400 px', 'obtido ' + await panelW());

  console.log('\n2. tema');
  const bg0 = await E(`getComputedStyle(document.body).backgroundColor`);
  await E(`document.querySelector('#themeBtn').click(); 1`); await sleep(120);
  const th1 = await E(`document.documentElement.getAttribute('data-theme')`), bg1 = await E(`getComputedStyle(document.body).backgroundColor`), fg1 = await E(`getComputedStyle(document.body).color`);
  check(th1 === 'light' && bg1 === 'rgb(255, 255, 255)' && fg1 === 'rgb(0, 0, 0)', 'tema claro: fundo branco, texto preto', `${th1} ${bg1} ${fg1}`);
  check(bg0 === 'rgb(0, 0, 0)', 'tema escuro é o padrão da marca (fundo preto)', bg0);
  await E(`document.querySelector('#themeBtn').click(); 1`); await sleep(120);
  check(await E(`document.documentElement.getAttribute('data-theme')`) === 'auto', 'terceiro estado segue o sistema', '');
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'light' }] }); await sleep(150);
  check(await E(`getComputedStyle(document.body).backgroundColor`) === 'rgb(255, 255, 255)', 'sistema claro vira tema claro', await E(`getComputedStyle(document.body).backgroundColor`));
  await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-color-scheme', value: 'dark' }] }); await sleep(150);
  check(await E(`getComputedStyle(document.body).backgroundColor`) === 'rgb(0, 0, 0)', 'sistema escuro vira tema escuro', '');
  await E(`document.querySelector('#themeBtn').click(); 1`);
  check(await E(`localStorage.getItem('aivj-theme')`) === '"dark"', 'tema salvo e de volta ao escuro', await E(`localStorage.getItem('aivj-theme')`));
  const lum = c => { const [r, g, b] = c.match(/\d+/g).map(Number).map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  for (const theme of ['dark', 'light']) {
    await E(`AIVJ.applyTheme('${theme}'); 1`); await sleep(80);
    const [fg, dim, bg] = [await E(`getComputedStyle(document.body).color`), await E(`getComputedStyle(document.querySelector('.lbl')||document.body).color`), await E(`getComputedStyle(document.body).backgroundColor`)];
    const cr = c => (Math.max(lum(c), lum(bg)) + 0.05) / (Math.min(lum(c), lum(bg)) + 0.05);
    check(cr(fg) >= 7 && cr(dim) >= 4.5, `tema ${theme}: contraste texto ${cr(fg).toFixed(1)}:1, texto secundário ${cr(dim).toFixed(1)}:1`, 'abaixo de 7:1 e 4.5:1');
  }
  await E(`AIVJ.applyTheme('dark'); 1`);

  console.log('\n3. responsivo');
  const sizes = [[320, 568, 'celular pequeno'], [390, 844, 'celular'], [844, 390, 'celular deitado'], [768, 1024, 'tablet'], [1024, 768, 'tablet deitado'], [1440, 900, 'notebook'], [2560, 1440, 'tela grande']];
  for (const [w, h, name] of sizes) {
    const mobile = w < 900;
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
    await send('Emulation.setTouchEmulationEnabled', { enabled: mobile, maxTouchPoints: mobile ? 5 : 0 });
    await E(`AIVJ.setPanelOpen(true, true); AIVJ.layoutApply(false); 1`); await sleep(350);
    const m = JSON.parse(await E(`JSON.stringify({ sw: document.documentElement.scrollWidth, iw: innerWidth, ih: innerHeight, sh: document.documentElement.scrollHeight, view: (r => [r.x, r.y, r.width, r.height])(document.querySelector('#view').getBoundingClientRect()), panel: (r => [r.x, r.y, r.width, r.height])(document.querySelector('#panel').getBoundingClientRect()),
      tabs: [...document.querySelectorAll('#tabs button')].map(b => { const r = b.getBoundingClientRect(); return [r.width, r.height]; }) })`));
    check(m.sw <= m.iw + 1, `${name} ${w}×${h}: sem rolagem horizontal`, `largura ${m.sw} > ${m.iw}`);
    check(m.view[2] >= 200 && m.view[3] >= 120, `${name}: a vista tem ${Math.round(m.view[2])}×${Math.round(m.view[3])}`, 'vista pequena demais');
    check(m.panel[2] >= 240 && m.panel[3] >= 120, `${name}: o menu tem ${Math.round(m.panel[2])}×${Math.round(m.panel[3])} e fica visível`, 'menu pequeno demais');
    check(m.panel[0] + m.panel[2] <= m.iw + 1 && m.panel[1] + m.panel[3] <= m.ih + 2, `${name}: o menu cabe na tela`, JSON.stringify(m.panel));
    if (mobile) {
      const hit = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('#panel button:not(.tg), #bar button, #top button, #vtool button')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height))`));
      const tgs = JSON.parse(await E(`JSON.stringify([...document.querySelectorAll('.tg')].filter(b => b.offsetParent).map(b => b.getBoundingClientRect().height))`));
      if (tgs.length) check(Math.min(...tgs) >= 24, `${name}: interruptores com pelo menos 24 px visíveis (WCAG 2.2) e área de toque maior`, 'pequeno');
      check(Math.min(...hit) >= 38, `${name}: alvos de toque com pelo menos 38 px (mínimo ${Math.round(Math.min(...hit))})`, 'alvo pequeno');
      if (h > w) check(m.panel[1] >= m.view[1] + m.view[3] - 2, `${name}: menu empilhado abaixo da vista`, JSON.stringify([m.view, m.panel]));
    }
  }
  await send('Emulation.setTouchEmulationEnabled', { enabled: false, maxTouchPoints: 0 });
  await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 1, mobile: true }); await sleep(250);
  const sp2 = await rect('#split'); const vh0 = (await rect('#view')).h;
  await mouse('mousePressed', sp2.x + sp2.w / 2, sp2.y + sp2.h / 2); await mouse('mouseMoved', sp2.x + 100, sp2.y + 150); await mouse('mouseReleased', sp2.x + 100, sp2.y + 150); await sleep(200);
  const vh1 = (await rect('#view')).h; check(vh1 > vh0 + 60, `empilhado: arrastar o divisor para baixo aumenta a vista (${Math.round(vh0)} → ${Math.round(vh1)})`, '');
  await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 900, deviceScaleFactor: 1, mobile: false }); await sleep(300);

  console.log('\n4. histórico');
  for (const id of ['undoBtn', 'redoBtn', 'histBtn', 'themeBtn']) { const r = await rect('#' + id); check(r.w > 20 && r.h > 20 && await E(`getComputedStyle(document.querySelector('#${id}')).display`) !== 'none', `botão #${id} está visível (${Math.round(r.w)}×${Math.round(r.h)})`, 'escondido'); }
  const snapP = () => E(`JSON.stringify([AIVJ.state.ci, AIVJ.project], (k, v) => k === 'assets' ? undefined : v)`);
  const act = async (name, fn) => {
    await E(`AIVJ.undo && 1`); const h0 = await E(`AIVJ.hist`), s0 = await snapP();
    await fn(); await sleep(520);
    const h1 = await E(`AIVJ.hist`), s1 = await snapP();
    if (s1 === s0) return bad(name + ': a ação não mudou o projeto (teste inválido)');
    check(h1 === h0 + 1, `${name}: virou 1 passo de histórico`, `${h0} → ${h1}`);
    const lbl = (await E(`AIVJ.histLabels`)).at(-1);
    await E(`AIVJ.undo(); 1`); await sleep(80);
    check(await snapP() === s0, `${name}: desfazer volta ao estado anterior`, 'estado diferente');
    await E(`AIVJ.redo(); 1`); await sleep(80);
    check(await snapP() === s1, `${name}: refazer restaura (rótulo "${lbl}")`, 'estado diferente');
    await E(`AIVJ.undo(); 1`); await sleep(80);
  };
  await E(`document.querySelector('#tabs [data-tab="lay"]').click(); 1`);
  await act('alternar camada', () => E(`document.querySelector('.lrow .tg').click(); 1`));
  await E(`document.querySelector('#tabs [data-tab="prj"]').click(); 1`);
  await act('mudar largura do canvas', () => E(`(i => { i.value = 1280; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#pW')); 1`));
  await act('mudar compassos', () => E(`(s => { s.value = '8'; s.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#pBars')); 1`));
  await act('mudar cor da paleta', () => E(`(i => { i.value = '#336699'; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('[data-pal="accent"]')); 1`));
  await act('mudar nome do projeto', () => E(`(i => { i.value = 'outro nome'; i.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#pName')); 1`));
  await E(`document.querySelector('#tabs [data-tab="spc"]').click(); document.querySelector('#spMake') && document.querySelector('#spMake').click(); 1`); await sleep(500);
  await act('aplicar cálculo de LED na ficha', () => E(`document.querySelector('[data-apply="led"]').click(); 1`));
  await act('criar zona', () => E(`document.querySelector('#spZAdd').click(); 1`));
  await E(`document.querySelector('#tabs [data-tab="par"]').click(); 1`); await sleep(200);
  await act('mover um parâmetro (slider)', () => E(`(r => { r.value = (+r.max + +r.min) / 2 + (+r.max - +r.min) * 0.17; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#panes [data-pane="par"] input[data-r]')); 1`));
  await E(`document.querySelector('#tabs [data-tab="comp"]').click(); 1`);
  await act('trocar de composição', () => E(`document.querySelector('#compBtns [data-ci="1"]').click(); 1`));
  // atalhos de teclado com foco em controles
  await E(`document.querySelector('#tabs [data-tab="par"]').click(); 1`); await sleep(200);
  await E(`(r => { r.focus(); r.value = (+r.max + +r.min) / 2 + (+r.max - +r.min) * 0.31; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#panes [data-pane="par"] input[data-r]')); 1`); await sleep(520);
  const sA = await snapP(); await key('z', { code: 'KeyZ', vk: 90, modifiers: 2 }); await sleep(120);
  check(await snapP() !== sA, 'Ctrl+Z com o foco num slider desfaz', 'não mudou');
  await key('z', { code: 'KeyZ', vk: 90, modifiers: 10 }); await sleep(120);
  check(await snapP() === sA, 'Ctrl+Shift+Z com o foco num slider refaz', 'não voltou');
  await key('z', { code: 'KeyZ', vk: 90, modifiers: 2 }); await sleep(120); await key('y', { code: 'KeyY', vk: 89, modifiers: 2 }); await sleep(120);
  check(await snapP() === sA, 'Ctrl+Y refaz', 'não voltou');
  // clique real no botão Desfazer (não só a função)
  await E(`document.querySelector('#tabs [data-tab="par"]').click(); 1`); await sleep(150);
  await E(`(r => { r.value = (+r.max + +r.min) / 2 + (+r.max - +r.min) * 0.23; r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector('#panes [data-pane="par"] input[data-r]')); 1`); await sleep(520);
  const sBtn = await snapP(); const ub = await rect('#undoBtn'); await mouse('mousePressed', ub.x + ub.w / 2, ub.y + ub.h / 2); await mouse('mouseReleased', ub.x + ub.w / 2, ub.y + ub.h / 2); await sleep(150);
  check(await snapP() !== sBtn && await E(`document.querySelector('#redoBtn').disabled`) === false, 'clicar no botão Desfazer desfaz e habilita Refazer', 'nada mudou');
  const rb = await rect('#redoBtn'); await mouse('mousePressed', rb.x + rb.w / 2, rb.y + rb.h / 2); await mouse('mouseReleased', rb.x + rb.w / 2, rb.y + rb.h / 2); await sleep(150);
  check(await snapP() === sBtn, 'clicar no botão Refazer refaz', 'não voltou');
  await E(`document.querySelector('#histBtn').click(); 1`);
  const histRows = await E(`document.querySelectorAll('#histList li').length`); check(histRows >= 3 && await E(`document.querySelector('#hist').hidden`) === false, `a lista de histórico mostra ${histRows} linhas`, '');
  const n0 = await E(`AIVJ.hist`); await E(`document.querySelector('#histList li button').click(); 1`); await sleep(100);
  check(await E(`AIVJ.hist`) === 0 && n0 > 0, 'clicar em "Estado inicial" volta tudo', 'hist ' + await E(`AIVJ.hist`));
  await E(`document.querySelector('#histClose').click(); 1`);

  console.log('\n5. números');
  const ev = async (s, want) => { if (want === null) { const nan = await E(`Number.isNaN(AIVJ.evalExpr(${JSON.stringify(s)}))`); return check(nan, `conta inválida "${s}" é recusada`, 'foi aceita'); } const v = await E(`AIVJ.evalExpr(${JSON.stringify(s)})`); check(Math.abs(v - want) < 1e-9, `conta "${s}" = ${want}`, 'obtido ' + v); };
  await ev('120/2', 60); await ev('2*(3+4)', 14); await ev('1,5*2', 3); await ev('2^3', 8); await ev('-4+10', 6); await ev('pi', Math.PI); await ev('10%4', 2); await ev(' 3 + 4 ', 7); await ev('.5', 0.5);
  await ev('1/0', null); await ev('abc', null); await ev('(2', null); await ev('3 4', null); await ev('', null); await ev('2**3', null); await ev('constructor', null);
  await E(`document.querySelector('#tabs [data-tab="par"]').click(); 1`); await sleep(200);
  const pcSel = '#panes [data-pane="par"] .pc[data-t="n"]';
  const info = JSON.parse(await E(`(pc => JSON.stringify({ k: pc.dataset.k, min: +pc.querySelector('[data-r]').min, max: +pc.querySelector('[data-r]').max, step: +pc.querySelector('[data-r]').step }))(document.querySelector(${JSON.stringify(pcSel)}))`));
  const setNum = async txt => { await E(`(n => { n.focus(); n.value = ${JSON.stringify(txt)}; n.dispatchEvent(new Event('change', { bubbles: true })); })(document.querySelector(${JSON.stringify(pcSel + ' [data-num]')})); 1`); await sleep(60); };
  const rangeV = () => E(`+document.querySelector(${JSON.stringify(pcSel + ' [data-r]')}).value`);
  const target = Math.min(info.max, Math.max(info.min, info.min + (info.max - info.min) / 4));
  await setNum(`${info.min}+(${info.max}-${info.min})/4`);
  check(Math.abs(await rangeV() - target) <= info.step / 2 + 1e-6 || Math.abs(await rangeV() - target) < 0.01, `digitar uma conta move o slider (${await rangeV()} ≈ ${target})`, '');
  const before = await rangeV(); await setNum('isto não é número');
  check(await rangeV() === before && await E(`document.querySelector(${JSON.stringify(pcSel + ' [data-num]')}).value`) === String(+before.toFixed(4)), 'valor inválido volta ao anterior', 'mudou');
  await setNum(String(info.max * 10)); check(await rangeV() === info.max, 'valor acima do limite fica no máximo', await rangeV());
  await setNum(String(info.min)); const vmin = await rangeV();
  await E(`document.querySelector(${JSON.stringify(pcSel + ' [data-num]')}).focus(); 1`); await key('ArrowUp', { code: 'ArrowUp', vk: 38 }); const v1 = await rangeV();
  check(Math.abs(v1 - (vmin + info.step)) < info.step / 10 + 1e-6, `seta para cima soma 1 passo (${vmin} → ${v1})`, '');
  await key('ArrowUp', { code: 'ArrowUp', vk: 38, modifiers: 8 }); const v2 = await rangeV();
  check(Math.abs(v2 - Math.min(info.max, v1 + info.step * 10)) < info.step / 10 + 1e-6, `Shift+seta soma 10 passos (${v1} → ${v2})`, '');
  const lab = await rect(pcSel + ' > label'); const r0 = await rangeV();
  await mouse('mousePressed', lab.x + 8, lab.y + lab.h / 2); await mouse('mouseMoved', lab.x + 40, lab.y + lab.h / 2); await mouse('mouseMoved', lab.x + 90, lab.y + lab.h / 2); await mouse('mouseReleased', lab.x + 90, lab.y + lab.h / 2); await sleep(120);
  check(await rangeV() > r0, `arrastar o rótulo para a direita aumenta o valor (${r0} → ${await rangeV()})`, '');

  console.log('\n6. vista');
  await E(`AIVJ.state.exploded = false; 1`);
  const stg = await rect('#stage');
  await mouse('mouseMoved', stg.x + stg.w * 0.25, stg.y + stg.h * 0.5); await sleep(60);
  const xyTxt = await E(`document.querySelector('#xy').textContent`), xyOn = await E(`getComputedStyle(document.querySelector('#xy')).display`);
  check(xyOn === 'block' && /X 4\d\d · 0\.2[45]\d/.test(xyTxt), `leitura de coordenadas segue o cursor ("${xyTxt}")`, xyOn);
  await mouse('mouseMoved', 2, 2); await sleep(60);
  check(await E(`getComputedStyle(document.querySelector('#xy')).display`) === 'none', 'a leitura some fora da vista', '');
  await sleep(900); /* deixa o passo pendente do teste anterior fechar antes de contar */
  const zBefore = await E(`JSON.stringify((AIVJ.project.meta.spec || {}).zones || {})`); const hz0 = await E(`AIVJ.hist`);
  await E(`AIVJ.setZoneDraw('performer'); 1`);
  await mouse('mousePressed', stg.x + stg.w * 0.3, stg.y + stg.h * 0.4); await mouse('mouseMoved', stg.x + stg.w * 0.5, stg.y + stg.h * 0.7); await mouse('mouseMoved', stg.x + stg.w * 0.6, stg.y + stg.h * 0.9); await mouse('mouseReleased', stg.x + stg.w * 0.6, stg.y + stg.h * 0.9); await sleep(520);
  const zones = JSON.parse(await E(`JSON.stringify(AIVJ.project.meta.spec.zones)`)); const zs = [].concat(zones.performer || []); const z = zs.at(-1);
  check(z && Math.abs(z.x - 0.3) < 0.03 && Math.abs(z.y - 0.4) < 0.03 && Math.abs(z.w - 0.3) < 0.04 && Math.abs(z.h - 0.5) < 0.04, 'desenhar na vista cria a zona com as frações certas ' + JSON.stringify(z), 'zona ' + JSON.stringify(zones));
  check(await E(`AIVJ.hist`) === hz0 + 1, 'a zona desenhada entra no histórico', `${hz0} → ${await E('AIVJ.hist')} ${await E('JSON.stringify(AIVJ.histLabels)')}`);
  check(await E(`AIVJ.state.zoneDraw`) === null, 'o modo de desenho termina sozinho', '');
} finally { await page.close(); }

console.log(fail ? `\n${fail} problema(s).` : '\nTudo certo.');
process.exit(fail ? 1 : 0);
