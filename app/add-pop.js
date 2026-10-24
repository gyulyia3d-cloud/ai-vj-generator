/* Popover Adicionar (fase 14a-3): escolhe categoria e tipo, vê um quadro de prévia, ajusta 2 a 4 parâmetros essenciais e adiciona a camada.
   Só apresentação e entrada: a camada nasce com mk() como antes (o projeto JSON não muda). Os demais parâmetros ficam no painel Parâmetros.
   Prévia: um quadro em 256 px, sem laço contínuo; tipos que sobrepõem o que está abaixo (filtro, tempo, pós) são vistos sobre a composição ativa.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores ADDPOP. */
const ADDPOP = (() => {
  const PRESET_KEY = { temporal: ['preset', () => TM.PRESETS], particles: ['kind', () => PRT], solid: ['kind', () => SOL], field: ['kind', () => FLD], fx: ['preset', () => FX], shader: ['preset', () => SHADERS] };
  const NO_PREVIEW = new Set(['code']);
  const st = { cat: FAMILIES[0][0], type: FAMILIES[0][1][0][0], q: '', draft: null, opener: null };
  const root = () => $('#addPop');
  const SCR = document.createElement('canvas'), SCR_CTX = SCR.getContext('2d');
  let raf = 0;

  const newDraft = type => ({ type, name: typeLabel(type).toUpperCase(), on: true, opacity: 1, blend: 'normal', p: {} });
  const defsFor = L => { const g = paramGroups(L), nm = typeLabel(L.type).toUpperCase(); return (g.find(x => x[0] === nm) || g[0])[1]; };
  const essential = defs => [...defs.filter(d => d.t === 's').slice(0, 1), ...defs.filter(d => d.t === 'n').slice(0, 3)];

  function typesShown() {
    const q = st.q.trim().toLowerCase();
    if (!q) return (FAMILIES.find(f => f[0] === st.cat) || FAMILIES[0])[1].map(x => [x[0], x[1], st.cat]);
    return FAMILIES.flatMap(f => f[1].map(x => [x[0], x[1], f[0]])).filter(x => (x[1] + ' ' + x[0] + ' ' + x[2]).toLowerCase().includes(q));
  }

  function renderCats() {
    $('#apCats').innerHTML = FAMILIES.map(f => `<button role="tab" data-cat="${esc(f[0])}" aria-selected="${!st.q && f[0] === st.cat}">${esc(f[0])}</button>`).join('');
  }
  function renderGrid() {
    const list = typesShown();
    $('#apGrid').innerHTML = list.length
      ? list.map(([t, label, fam]) => `<button data-type="${esc(t)}" aria-pressed="${t === st.type}"><b>${esc(label)}</b>${st.q ? `<i>${esc(fam)}</i>` : ''}</button>`).join('')
      : '<p class="note">Nenhum tipo encontrado.</p>';
  }
  function renderParams() {
    const L = st.draft, defs = essential(defsFor(L)), p = pm(L);
    $('#apParams').innerHTML = defs.length
      ? defs.map(d => ctlHtml(d, p[d.k])).join('') + '<p class="note">Os demais parâmetros ficam no painel Parâmetros depois de adicionada.</p>'
      : '<p class="note">Este tipo se ajusta no painel Parâmetros depois de adicionado.</p>';
    $('#apAdd').textContent = 'Adicionar ' + typeLabel(L.type);
  }

  function drawPreview() {
    raf = 0; const cv = $('#apCv'); if (!cv) return;
    const L = st.draft, comp = cur(), W = P.canvas.w, H = P.canvas.h, w = 256, h = Math.max(8, Math.round(256 * H / W));
    if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
    const c = cv.getContext('2d'); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    $('#apInfo').textContent = '';
    if (NO_PREVIEW.has(L.type)) { $('#apInfo').textContent = 'Sem prévia: o código só roda depois de autorizado.'; return; }
    SCR.width = w; SCR.height = h; const F = frameAt(ST.n, comp), k = w / W;
    try {
      if (BELOW_TYPES.has(L.type)) comp.layers.forEach((M, i) => { if (!M.on) return; renderLayer(SCR_CTX, comp, M, i, F, k, W, H, BELOW_TYPES.has(M.type) ? cv : undefined); c.globalAlpha = M.opacity; c.globalCompositeOperation = fxOp(M, (BLENDS[M.blend] || BLENDS.normal)[0]); c.drawImage(SCR, 0, 0); });
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
      renderLayer(SCR_CTX, comp, L, comp.layers.length, F, k, W, H, BELOW_TYPES.has(L.type) ? cv : undefined);
      c.globalAlpha = L.opacity; c.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); c.drawImage(SCR, 0, 0);
    } catch (err) { $('#apInfo').textContent = 'Sem prévia: ' + (err && err.message || err); }
    c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
  }
  const preview = () => { if (!raf) raf = requestAnimationFrame(drawPreview); };

  function pick(type) { st.type = type; st.draft = newDraft(type); renderGrid(); renderParams(); preview(); }

  function setParam(k, v) {
    const L = st.draft; L.p[k] = v;
    const pk = PRESET_KEY[L.type];
    if (pk && pk[0] === k) { const s = pk[1]()[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); renderParams(); }
    preview();
  }
  function onParamInput(e) {
    const row = e.target.closest('.pc'); if (!row) return; const k = row.dataset.k;
    if (e.target.matches('[data-r]')) { const v = +e.target.value; const n = row.querySelector('[data-num]'); if (n) n.value = +v.toFixed(4); setParam(k, v); }
  }
  function onParamChange(e) {
    const row = e.target.closest('.pc'); if (!row) return; const k = row.dataset.k, d = defsFor(st.draft).find(x => x.k === k); if (!d) return;
    if (e.target.matches('[data-num]')) {
      const v = evalExpr(e.target.value);
      if (!isFinite(v)) { toast('Valor inválido. Digite um número ou uma conta, como 120/2.', 1800); e.target.value = pm(st.draft)[k]; return; }
      const x = clamp(v, d.min, d.max); e.target.value = +x.toFixed(4); const r = row.querySelector('[data-r]'); if (r) { r.value = x; SLIDERUI.sync(r); } setParam(k, x);
    } else if (e.target.matches('[data-s]')) setParam(k, e.target.value);
  }
  function onParamClick(e) {
    const rs = e.target.closest('[data-reset]'); if (!rs) return; const row = rs.closest('.pc'), k = row.dataset.k;
    delete st.draft.p[k]; renderParams(); preview();
  }

  function open(opener) {
    const el = root(); if (!el) return;
    st.opener = opener || document.activeElement;
    const sel = cur().layers[ST.sel], f = sel && famOf(sel.type);
    st.q = ''; $('#apSearch').value = '';
    if (!(famOf(st.type) && famOf(st.type)[0] === st.cat)) { st.cat = FAMILIES[0][0]; st.type = FAMILIES[0][1][0][0]; }
    else if (f && !st.draft) { st.cat = f[0]; st.type = f[1][0][0]; }
    st.draft = newDraft(st.type);
    renderCats(); renderGrid(); renderParams();
    el.hidden = false; document.body.classList.add('apopen');
    $$('#addBtn,[data-la="addpop"]').forEach(b => b.setAttribute('aria-expanded', 'true'));
    preview();
    const first = $('#apGrid [aria-pressed="true"]') || $('#apSearch'); first && first.focus();
  }
  function close() {
    const el = root(); if (!el || el.hidden) return;
    el.hidden = true; document.body.classList.remove('apopen');
    $$('#addBtn,[data-la="addpop"]').forEach(b => b.setAttribute('aria-expanded', 'false'));
    const o = st.opener; st.opener = null; if (o && o.isConnected && o.focus) o.focus();
  }
  function add() {
    const L = st.draft, comp = cur(), i = ST.sel, t = L.type;
    const N = mk(t, typeLabel(t).toUpperCase(), true, clone(L.p));
    comp.layers.splice(i + 1, 0, N); ST.sel = i + 1;
    close(); buildStage(); renderLayers(); renderParams(); renderText();
    commit(true, 'Adicionar camada ' + typeLabel(t));
    toast('Camada adicionada: ' + typeLabel(t) + ' · Ctrl+Z desfaz');
  }

  const el = root();
  if (el) {
    $('#addPopX').onclick = close;
    $('#apAdd').onclick = add;
    $('#apSearch').addEventListener('input', e => { st.q = e.target.value; renderCats(); renderGrid(); });
    $('#apCats').addEventListener('click', e => {
      const b = e.target.closest('[data-cat]'); if (!b) return;
      st.q = ''; $('#apSearch').value = ''; st.cat = b.dataset.cat; renderCats(); renderGrid();
      const f = FAMILIES.find(x => x[0] === st.cat); if (f && !f[1].some(x => x[0] === st.type)) pick(f[1][0][0]);
    });
    $('#apGrid').addEventListener('click', e => { const b = e.target.closest('[data-type]'); if (b) pick(b.dataset.type); });
    const ps = $('#apParams'); ps.addEventListener('input', onParamInput); ps.addEventListener('change', onParamChange); ps.addEventListener('click', onParamClick);
    ps.addEventListener('keydown', e => { if (e.target.matches('[data-num]') && e.key === 'Enter') e.target.dispatchEvent(new Event('change', { bubbles: true })); });
    /* fora do cartão fecha; teclas de atalho do editor não vazam enquanto aberto; Tab fica preso dentro */
    el.addEventListener('pointerdown', e => { if (e.target === el) close(); });
    el.addEventListener('keydown', e => {
      e.stopPropagation();
      if (e.key === 'Escape') { e.preventDefault(); close(); return; }
      if (e.key !== 'Tab') return;
      const f = $$('button:not([disabled]),input,select,textarea,[tabindex="0"]', el).filter(n => n.offsetParent !== null);
      if (!f.length) return; const a = f[0], z = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus(); } else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus(); }
    });
    const bb = $('#addBtn'); if (bb) bb.onclick = () => open(bb);
  }
  return { open, close, add, get isOpen() { const e = root(); return !!e && !e.hidden; }, get type() { return st.type; }, get draft() { return st.draft; }, pick, setParam };
})();
