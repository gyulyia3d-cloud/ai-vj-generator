/* Layout, tema, histórico, números e coordenadas (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores LAYOUT. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- V5 · layout, tema, histórico, números, coordenadas ---------- */
const ROOT_EL = document.documentElement, APP = $('#app');
ST.hl = []; ST.fl = []; ST.pend = null; ST.panelW = store.get('panelW', 400); const defViewH = () => innerHeight < 700 ? 34 : 46; ST.viewH = store.get('viewH', null); ST.viewHCustom = ST.viewH != null; if (!ST.viewHCustom) ST.viewH = defViewH(); ST.zoneDraw = null; ST.zoneTmp = null;

/* tema: escuro (marca) · claro · sistema */
const THEMES = [['dark', 'Escuro'], ['light', 'Claro'], ['auto', 'Sistema']];
function applyTheme(t) {
  if (!THEMES.some(x => x[0] === t)) t = 'dark';
  ST.theme = t; t === 'dark' ? ROOT_EL.removeAttribute('data-theme') : ROOT_EL.setAttribute('data-theme', t);
  store.set('theme', t);
  const b = $('#themeBtn'); if (b) { b.textContent = 'Tema ' + THEMES.find(x => x[0] === t)[1]; b.title = 'Alternar tema: escuro, claro ou do sistema'; }
}
applyTheme(store.get('theme', 'dark'));
$('#themeBtn').onclick = () => { const i = THEMES.findIndex(x => x[0] === ST.theme); applyTheme(THEMES[(i + 1) % THEMES.length][0]); toast('Tema ' + THEMES.find(x => x[0] === ST.theme)[1].toLowerCase(), 1100); };

/* layout: divisor arrastável, minimizar, empilhado no celular */
const MQ_STACK = matchMedia('(max-width:900px)'), MQ_LAND = matchMedia('(max-width:900px) and (orientation:landscape) and (max-height:540px)');
const stacked = () => MQ_STACK.matches && !MQ_LAND.matches;
const panelRange = () => [280, Math.max(280, Math.min(760, Math.round(innerWidth * 0.65)))];
function layoutApply(save) {
  const [lo, hi] = panelRange(), split = $('#split');
  if (!ST.viewHCustom) ST.viewH = defViewH();
  ST.panelW = clamp(Math.round(ST.panelW), lo, hi); ST.viewH = clamp(Math.round(ST.viewH * 10) / 10, 22, 72);
  if (stacked()) { ROOT_EL.style.removeProperty('--panel-w'); ROOT_EL.style.setProperty('--view-h', ST.viewH + 'dvh'); }
  else { ROOT_EL.style.setProperty('--panel-w', ST.panelW + 'px'); ROOT_EL.style.removeProperty('--view-h'); }
  if (split) {
    const st = stacked(); split.setAttribute('aria-orientation', st ? 'horizontal' : 'vertical');
    split.setAttribute('aria-valuemin', st ? 22 : lo); split.setAttribute('aria-valuemax', st ? 72 : hi); split.setAttribute('aria-valuenow', st ? Math.round(ST.viewH) : ST.panelW);
    split.setAttribute('aria-label', st ? 'Altura da vista, arraste ou use as setas' : 'Largura do menu, arraste ou use as setas');
  }
  if (save) { store.set('panelW', ST.panelW); store.set('viewH', ST.viewHCustom ? ST.viewH : null); }
}
function setPanelOpen(open, quiet) {
  APP.classList.toggle('nopanel', !open); { const po = $('#panelOpen'); po.setAttribute('aria-expanded', open); po.textContent = open ? 'Menu ›' : '‹ Menu'; po.setAttribute('aria-label', open ? 'Minimizar o menu' : 'Abrir o menu'); }
  store.set('panelOpen', open); setTimeout(fit, 30); if (!quiet) toast(open ? 'Menu aberto' : 'Menu minimizado. G reabre.', 1100);
}
(() => {
  const split = $('#split'); let drag = null;
  split.addEventListener('pointerdown', e => { split.setPointerCapture(e.pointerId); drag = { x: e.clientX, y: e.clientY, w: ST.panelW, h: ST.viewH, st: stacked() }; split.classList.add('drag'); document.body.classList.add('resizing'); e.preventDefault(); });
  split.addEventListener('pointermove', e => {
    if (!drag) return;
    if (drag.st) { ST.viewHCustom = true; ST.viewH = drag.h + (e.clientY - drag.y) / innerHeight * 100; } else ST.panelW = drag.w - (e.clientX - drag.x);
    layoutApply(false);
  });
  const end = () => { if (!drag) return; drag = null; split.classList.remove('drag'); document.body.classList.remove('resizing'); layoutApply(true); fit(); };
  split.addEventListener('pointerup', end); split.addEventListener('pointercancel', end);
  split.addEventListener('dblclick', () => { ST.panelW = 400; ST.viewHCustom = false; ST.viewH = defViewH(); layoutApply(true); toast('Tamanho padrão do menu', 900); });
  split.addEventListener('keydown', e => {
    const st = stacked(), step = e.shiftKey ? 64 : 16, [lo, hi] = panelRange(); let used = true; if (st) ST.viewHCustom = true;
    if (e.key === 'ArrowLeft' && !st) ST.panelW += step; else if (e.key === 'ArrowRight' && !st) ST.panelW -= step;
    else if (e.key === 'ArrowUp' && st) ST.viewH -= step / 12; else if (e.key === 'ArrowDown' && st) ST.viewH += step / 12;
    else if (e.key === 'Home') { st ? ST.viewH = 22 : ST.panelW = lo; } else if (e.key === 'End') { st ? ST.viewH = 72 : ST.panelW = hi; }
    else if (e.key === 'Enter' || e.key === ' ') setPanelOpen(false); else used = false;
    if (used) { e.preventDefault(); layoutApply(true); }
  });
  $('#panelOpen').onclick = () => setPanelOpen(APP.classList.contains('nopanel'));
  addEventListener('resize', () => layoutApply(false));
  MQ_STACK.addEventListener('change', () => { layoutApply(false); setTimeout(fit, 30); });
  if (store.get('panelOpen', true) === false) setPanelOpen(false, true);
  layoutApply(false);
})();

/* histórico: desfazer e refazer universais, com rótulo */
const HIST_MAX = 100;
function labelOf(el) {
  const clean = s => String(s || '').replace(/\s+/g, ' ').trim().slice(0, 44);
  const pc = el.closest && el.closest('.pc'); if (pc) { const l = pc.querySelector('label'); if (l && clean(l.textContent)) return clean(l.textContent); }
  const b = el.closest && el.closest('button,[role=tab],summary'); if (b) { const t = clean(b.getAttribute('aria-label') || b.title || b.textContent); if (t) return t; }
  const f = el.closest && el.closest('input,select,textarea'); if (f) { const lab = f.id && document.querySelector(`label[for="${f.id}"]`); return clean(f.getAttribute('aria-label') || (lab && lab.textContent) || f.id) || 'Campo'; }
  return 'Alteração';
}
function syncHistUI() {
  const u = $('#undoBtn'), r = $('#redoBtn'); if (!u || !r) return;
  u.disabled = !ST.hist.length; r.disabled = !ST.future.length;
  u.title = ST.hist.length ? 'Desfazer: ' + ST.hl[ST.hl.length - 1] + ' (Ctrl+Z)' : 'Nada para desfazer';
  r.title = ST.future.length ? 'Refazer: ' + ST.fl[ST.fl.length - 1] + ' (Ctrl+Shift+Z)' : 'Nada para refazer';
  if (!$('#hist').hidden) renderHist();
}
function commit(immediate, label) {
  if (label) ST.pend = label;
  clearTimeout(commitT);
  const go = () => {
    commitT = 0; const s = snap(); if (s === lastSnap) { ST.pend = null; return; }
    if (lastSnap) { ST.hist.push(lastSnap); ST.hl.push(ST.pend || 'Alteração'); if (ST.hist.length > HIST_MAX) { ST.hist.shift(); ST.hl.shift(); } }
    ST.future.length = 0; ST.fl.length = 0; lastSnap = s; ST.pend = null; store.set('state', JSON.parse(s)); syncHistUI();
  };
  commit.go = go;
  immediate ? go() : (commitT = setTimeout(go, 350));
}
function flushCommit() { if (commitT) { clearTimeout(commitT); commit.go && commit.go(); } }
function stepUndo() { const prev = ST.hist.pop(), lbl = ST.hl.pop(); ST.future.push(snap()); ST.fl.push(lbl); restore(prev); store.set('state', JSON.parse(prev)); return lbl; }
function stepRedo() { const nxt = ST.future.pop(), lbl = ST.fl.pop(); ST.hist.push(snap()); ST.hl.push(lbl); restore(nxt); store.set('state', JSON.parse(nxt)); return lbl; }
function undo() { flushCommit(); if (!ST.hist.length) return toast('Nada para desfazer ainda', 1100); const l = stepUndo(); syncHistUI(); toast('Desfeito: ' + l, 1400); }
function redo() { flushCommit(); if (!ST.future.length) return toast('Nada para refazer', 1100); const l = stepRedo(); syncHistUI(); toast('Refeito: ' + l, 1400); }
function jumpHistory(k) { flushCommit(); while (ST.hist.length > k) stepUndo(); while (ST.hist.length < k && ST.future.length) stepRedo(); syncHistUI(); }
function renderHist() {
  const box = $('#histList'), n = ST.hist.length, fut = ST.future.length;
  const rows = [['Estado inicial', 0, '']].concat(ST.hl.map((l, i) => [l, i + 1, ''])).concat(ST.fl.slice().reverse().map((l, i) => [l, n + 1 + i, 'fut']));
  box.innerHTML = rows.map(([l, k, c]) => `<li class="${k === n ? 'cur' : c}"><button data-jump="${k}"><span class="n">${String(k).padStart(2, '0')}</span><span>${esc(l)}</span></button></li>`).join('');
  $$('[data-jump]', box).forEach(b => b.onclick = () => jumpHistory(+b.dataset.jump));
  const cur0 = $('li.cur', box); if (cur0) cur0.scrollIntoView({ block: 'nearest' });
  $('#histCount').textContent = `${n} passo(s)${fut ? ' · ' + fut + ' à frente' : ''}`;
}
function toggleHist(open) { const h = $('#hist'); const v = open === undefined ? h.hidden : open; h.hidden = !v; $('#histBtn').setAttribute('aria-expanded', v); if (v) renderHist(); }
$('#undoBtn').onclick = undo; $('#redoBtn').onclick = redo; $('#histBtn').onclick = () => toggleHist(); $('#histClose').onclick = () => toggleHist(false);
/* rede de segurança: qualquer mudança vira passo de histórico, mesmo onde o código esqueceu de chamar commit() */
['change', 'click', 'pointerup', 'keyup'].forEach(ev => document.addEventListener(ev, e => {
  const t = e.target; if (!t || !t.closest || !t.closest('#panel,#bar,#vtool,#top')) return;
  if (ev === 'keyup' && !/^(Enter|Tab|Backspace|Delete|Arrow|Page)/.test(e.key)) return;
  if (!ST.pend) ST.pend = labelOf(t); commit(false);
}, true));
/* campo de texto em edição usa o desfazer nativo; qualquer outro usa o do app */
addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('input,textarea')) t.dataset.fv = t.value; });
addEventListener('change', e => { const t = e.target; if (t && t.matches && t.matches('input,textarea')) t.dataset.fv = t.value; }, true);
function editingText(t) {
  if (!t || !t.matches) return false;
  if (t.matches('[data-num],input[type=range],input[type=checkbox],input[type=radio],input[type=color],input[type=file],select,button')) return false;
  if (t.matches('textarea,input,[contenteditable]')) return t.isContentEditable ? true : t.value !== t.dataset.fv;
  return false;
}

/* números: contas seguras (sem eval), setas, arrastar o rótulo, duplo clique */
function evalExpr(src) {
  if (/[\d.)a-z]\s+[\d.(a-z]/i.test(String(src).trim())) return NaN;
  const s = String(src).replace(/,/g, '.').replace(/\s+/g, '').toLowerCase().replace(/×/g, '*').replace(/÷/g, '/').replace(/−/g, '-');
  if (!s) return NaN; let i = 0;
  const num = () => { const m = /^(\d+\.?\d*|\.\d+)(e[+-]?\d+)?/.exec(s.slice(i)); if (!m) return NaN; i += m[0].length; return parseFloat(m[0]); };
  const prim = () => {
    if (s[i] === '(') { i++; const v = add(); if (s[i] !== ')') return NaN; i++; return v; }
    if (s.startsWith('pi', i)) { i += 2; return Math.PI; } if (s.startsWith('tau', i)) { i += 3; return Math.PI * 2; }
    return num();
  };
  const un = () => { if (s[i] === '-') { i++; return -un(); } if (s[i] === '+') { i++; return un(); } const b = prim(); if (s[i] === '^') { i++; return Math.pow(b, un()); } return b; };
  const mul = () => { let v = un(); while (i < s.length && (s[i] === '*' || s[i] === '/' || s[i] === '%')) { const o = s[i++], r = un(); v = o === '*' ? v * r : o === '/' ? v / r : v % r; } return v; };
  const add = () => { let v = mul(); while (i < s.length && (s[i] === '+' || s[i] === '-')) { const o = s[i++], r = mul(); v = o === '+' ? v + r : v - r; } return v; };
  const v = add(); return i === s.length && isFinite(v) ? v : NaN;
}
const stepDecimals = st => { const m = String(st).split('.')[1]; return m ? m.length : 0; };
addEventListener('focusin', e => { const t = e.target; if (t && t.matches && t.matches('input[data-num]')) setTimeout(() => t.select(), 0); });
document.addEventListener('keydown', e => {
  const t = e.target; if (!t || !t.matches || !t.matches('input[data-num]')) return;
  if (e.ctrlKey || e.metaKey) return;
  if (e.key === 'Escape') { t.value = t.dataset.fv; t.blur(); return; }
  const dir = e.key === 'ArrowUp' || e.key === 'PageUp' ? 1 : e.key === 'ArrowDown' || e.key === 'PageDown' ? -1 : 0; if (!dir) return;
  e.preventDefault();
  const st = +t.dataset.step || 0.01, mult = (e.key.startsWith('Page') ? 10 : 1) * (e.shiftKey ? 10 : e.altKey ? 0.1 : 1), cur0 = evalExpr(t.value);
  let v = (isFinite(cur0) ? cur0 : 0) + dir * st * mult; v = clamp(v, +t.dataset.min, +t.dataset.max);
  t.value = +v.toFixed(Math.max(stepDecimals(st), e.altKey ? stepDecimals(st) + 1 : 0, 2)); t.dispatchEvent(new Event('change', { bubbles: true }));
});
(() => {
  let sc = null;
  document.addEventListener('pointerdown', e => {
    const lab = e.target.closest && e.target.closest('.pc>label[for]'); if (!lab || e.button) return;
    const row = lab.closest('.pc'), r = row.querySelector('input[data-r]'); if (!r) return;
    sc = { x: e.clientX, v: +r.value, min: +r.min, max: +r.max, st: +r.step || 0.01, w: r.getBoundingClientRect().width || 200, moved: false, r, row, lab, id: e.pointerId };
  });
  document.addEventListener('pointermove', e => {
    if (!sc || e.pointerId !== sc.id) return; const dx = e.clientX - sc.x;
    if (!sc.moved) { if (Math.abs(dx) < 4) return; sc.moved = true; sc.lab.setPointerCapture(e.pointerId); sc.row.classList.add('scrubbing'); document.body.classList.add('resizing'); }
    const per = (sc.max - sc.min) / sc.w, mult = e.shiftKey ? 0.1 : (e.ctrlKey || e.altKey) ? 4 : 1;
    let v = sc.v + dx * per * mult; v = Math.round(v / sc.st) * sc.st; v = clamp(+v.toFixed(6), sc.min, sc.max);
    sc.r.value = v; sc.r.dispatchEvent(new Event('input', { bubbles: true }));
  });
  const end = e => {
    if (!sc || e.pointerId !== sc.id) return; const s = sc; sc = null;
    s.row.classList.remove('scrubbing'); document.body.classList.remove('resizing');
    if (s.moved) { s.r.dispatchEvent(new Event('change', { bubbles: true })); } else { const n = s.row.querySelector('input[data-num]'); if (n) n.focus(); }
  };
  document.addEventListener('pointerup', end); document.addEventListener('pointercancel', end);
  document.addEventListener('dblclick', e => {
    const lab = e.target.closest && e.target.closest('.pc>label[for]'); if (lab) { const rs = lab.closest('.pc').querySelector('[data-reset]'); if (rs) rs.click(); return; }
    const r = e.target.closest && e.target.closest('input[data-r]'); if (r) { const n = r.closest('.pc').querySelector('input[data-num]'); if (n) n.focus(); }
  });
})();

/* quadro: ir direto para um número */
$('#vFrame').onchange = e => { const v = evalExpr(e.target.value); if (!isFinite(v)) return toast('Use um número de quadro', 1200); setPause(true); ST.n = clamp(Math.round(v), 0, loopFrames() - 1); };

/* cursor de coordenadas (assinatura da marca) e desenho de zonas */
(() => {
  const xy = $('#xy'), stage = $('#stage'), W = () => P.canvas.w, H = () => P.canvas.h;
  const frac = e => { const r = stage.getBoundingClientRect(); return [(e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height]; };
  vp.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch' && !ST.zoneDraw) return;
    const [fx, fy] = frac(e);
    if (ST.exploded || fx < 0 || fx > 1 || fy < 0 || fy > 1) { xy.style.display = 'none'; }
    else {
      xy.textContent = `X ${Math.round(fx * W())} · ${fx.toFixed(3)}   Y ${Math.round(fy * H())} · ${fy.toFixed(3)}`; xy.style.display = 'block';
      const w = xy.offsetWidth; xy.style.left = Math.min(innerWidth - w - 8, e.clientX + 16) + 'px'; xy.style.top = Math.min(innerHeight - 30, e.clientY + 18) + 'px';
    }
    if (zd) { const [cx, cy] = [clamp(fx, 0, 1), clamp(fy, 0, 1)]; ST.zoneTmp = { x: Math.min(zd[0], cx), y: Math.min(zd[1], cy), w: Math.abs(cx - zd[0]), h: Math.abs(cy - zd[1]) }; drawOverlay(); }
  });
  vp.addEventListener('pointerleave', () => { xy.style.display = 'none'; });
  let zd = null;
  vp.addEventListener('pointerdown', e => {
    if (!ST.zoneDraw || e.button) return; const [fx, fy] = frac(e); if (fx < 0 || fx > 1 || fy < 0 || fy > 1) return;
    zd = [fx, fy]; vp.setPointerCapture(e.pointerId); e.preventDefault();
  });
  vp.addEventListener('pointerup', e => {
    if (!zd) return; const z = ST.zoneTmp, name = ST.zoneDraw; zd = null; ST.zoneTmp = null; setZoneDraw(null);
    if (z && z.w > 0.01 && z.h > 0.01) {
      const S = specOf(true); S.zones = S.zones || {}; const r3 = v => Math.round(v * 1000) / 1000, q = { x: r3(z.x), y: r3(z.y), w: r3(z.w), h: r3(z.h) };
      const c0 = S.zones[name]; S.zones[name] = Array.isArray(c0) ? [...c0, q] : c0 ? [c0, q] : q; ST.zones = true;
      commit(false, 'Zona ' + name); drawOverlay(); if (ST.tab === 'spc') renderSpec(); toast('Zona ' + name + ' criada', 1200);
    } else { drawOverlay(); toast('Arraste um retângulo maior', 1200); }
  });
  addEventListener('keydown', e => { if (e.key === 'Escape' && ST.zoneDraw) { zd = null; ST.zoneTmp = null; setZoneDraw(null); drawOverlay(); } });
})();
function setZoneDraw(name) { ST.zoneDraw = name; vp.classList.toggle('draw', !!name); if (name) { $('#drawHint').textContent = 'Arraste na vista para marcar: ' + name + '. Esc cancela.'; } if (ST.tab === 'spc' && !name) renderSpec(); }
