/* Popover Adicionar (fase 14a-3): escolher o que entra na composição sem passar pelo painel de propriedades.
   Abas pelas categorias de FAMILIES, grade de miniaturas, busca; ao escolher, prévia de um quadro (lado maior de 256 px, sem loop contínuo),
   selects e 2 a 4 parâmetros essenciais em linha, e o botão Adicionar camada. Os demais parâmetros ficam no painel depois de adicionada.
   Abre pelo + no cabeçalho de Camadas e pelo Adicionar da barra flutuante; fecha com Esc e ao clicar fora; foco preso enquanto aberto;
   adicionar é um passo só no histórico (um Ctrl+Z desfaz). Em tela estreita vira gaveta. Só apresentação: não muda o render nem o formato.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores ADDUI. Mesmo escopo do motor (IIFE): sem import/export. */
const ADDUI = (() => {
  const PREV = 256, TW = 96, TH = 54;
  /* sem miniatura ao vivo: Tempo precisa do histórico de quadros, Simulação assa o loop inteiro na CPU, Código só roda depois de autorizado */
  const NO_LIVE = new Set(['temporal', 'sim', 'code']);
  const S = { cat: 0, q: '', type: null, hover: null, p: {}, opener: null, queue: [], tid: 0, raf: 0 };
  const defs = [];   /* lista estável para bindCtls: o conteúdo muda com o tipo escolhido */
  const SCR = document.createElement('canvas'), SCX = SCR.getContext('2d');
  const q = s => document.querySelector(s);
  const norm = s => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const items = () => FAMILIES.flatMap((f, fi) => f[1].map(([t, lab]) => ({ t, lab, fam: f[0], fi })));
  function visible() {
    const k = norm(S.q.trim());
    return k ? items().filter(x => norm(x.lab + ' ' + x.t + ' ' + x.fam).includes(k)) : items().filter(x => x.fi === S.cat);
  }

  /* Parâmetros que aparecem no popover. Os rótulos de P1 a P4 seguem o preset (paramGroups, o mesmo do painel).
     Regra atual: na ordem declarada no gerador, até 2 selects e o resto em números, interruptores, cores e texto curto, no máximo 4 ao todo. */
  function essentialParams(type) {
    const L = mk(type, '', true, S.type === type ? S.p : {}), name = typeLabel(type).toUpperCase();
    const g = paramGroups(L).find(x => x[0] === name), all = g ? g[1] : (GEN[type] ? GEN[type].params : []);
    const usable = d => d.t === 'n' || d.t === 'b' || d.t === 'c' || d.t === 's' || (d.t === 't' && !d.area);
    let sel = 0;
    return all.filter(d => usable(d) && (d.t !== 's' || sel++ < 2)).slice(0, 4);
  }

  /* posição de entrada: logo acima da camada selecionada, como o Adicionar do painel de Camadas */
  const insertAt = () => { const n = cur().layers.length; return Math.min(Math.max(ST.sel, -1), n - 1) + 1; };
  const draft = t => mk(t, typeLabel(t).toUpperCase(), true, t === S.type ? clone(S.p) : {});

  /* desenha uma pilha [camada, índice] num canvas, no quadro atual; mesma composição das miniaturas de Composições (drawThumb) */
  function paintStack(cv, k, stack) {
    const comp = cur(), W = P.canvas.w, H = P.canvas.h, w = Math.max(2, Math.round(W * k)), h = Math.max(2, Math.round(H * k));
    if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; SCR.width = w; SCR.height = h;
    const c = cv.getContext('2d'), F = frameAt(ST.n, comp); let err = '';
    c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
    for (const [L, i, temp] of stack) {
      if (!L.on) continue;
      try { renderLayer(SCX, comp, L, i, F, k, W, H, BELOW_TYPES.has(L.type) ? cv : undefined); } catch (e) { err = String(e && e.message || e); }
      if (temp && LAYER_ERR.has(L)) { err = LAYER_ERR.get(L); LAYER_ERR.delete(L); }   /* a camada temporária não deixa rastro no mapa de erros */
      c.globalAlpha = L.opacity; c.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); c.drawImage(SCR, 0, 0);
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }
    return err;
  }
  const below = () => cur().layers.slice(0, insertAt()).map((L, i) => [L, i, false]);
  function paintTile(cv, t) {
    if (NO_LIVE.has(t)) return;   /* a grade já marca o botão com .nolive */
    const W = P.canvas.w, H = P.canvas.h, k = Math.min(TW / W, TH / H), L = mk(t, '', true);
    /* quem lê a imagem de baixo (filtro, manchas) aparece sobre a composição; o resto aparece sozinho */
    paintStack(cv, k, (BELOW_TYPES.has(t) ? below() : []).concat([[L, insertAt(), true]]));
  }
  function paintPreview() {
    S.raf = 0; const cv = q('#addPrev'), t = S.hover || S.type; if (!cv) return;
    const st = q('#addPrevNote');
    if (!t) { cv.width = 2; cv.height = 2; st.textContent = T3('Escolha um tipo para ver a prévia.', 'Pick a type to see the preview.'); return; }
    if (NO_LIVE.has(t)) { cv.width = 2; cv.height = 2; st.textContent = T3('Sem prévia aqui: aparece na vista depois de adicionada.', 'No preview here: it shows in the view once added.'); return; }
    const W = P.canvas.w, H = P.canvas.h, k = PREV / Math.max(W, H);
    const err = paintStack(cv, k, below().concat([[draft(t), insertAt(), true]]));
    st.textContent = err ? T3('Erro na prévia: ', 'Preview error: ') + err : T3('Quadro ', 'Frame ') + frameAt(ST.n, cur()).n + T3(' · sobre as camadas de baixo', ' · over the layers below');
  }
  const schedule = () => { if (!S.raf) S.raf = requestAnimationFrame(() => { paintPreview(); place(); }); };   /* a prévia muda a altura da caixa: reposiciona para não passar da borda */
  function pump() {
    S.tid = 0; const x = S.queue.shift(); if (!x) return;
    if (x.isConnected) paintTile(x, x.dataset.t);
    if (S.queue.length) S.tid = setTimeout(pump, 0);
  }

  function tabsHtml() {
    const qq = !!S.q.trim();
    return FAMILIES.map((f, i) => `<button role="tab" id="addTab${i}" data-cat="${i}" aria-selected="${!qq && i === S.cat}" tabindex="${!qq && i === S.cat ? 0 : -1}">${esc(f[0])}</button>`).join('');
  }
  function gridHtml() {
    const v = visible();
    if (!v.length) return `<p class="note">${T3('Nada encontrado.', 'Nothing found.')}</p>`;
    return v.map(x => `<button class="addTile${NO_LIVE.has(x.t) ? ' nolive' : ''}" data-t="${x.t}" aria-pressed="${x.t === S.type}" title="${esc(x.fam + ' · ' + x.lab)}"><span class="cvw"><canvas data-t="${x.t}" width="2" height="2" aria-hidden="true"></canvas></span><span class="nm">${esc(x.lab)}</span>${S.q.trim() ? `<span class="fm">${esc(x.fam)}</span>` : ''}</button>`).join('');
  }
  function detHtml() {
    const t = S.type, comp = cur(), at = insertAt(), under = comp.layers[at - 1];
    const where = under ? T3('Entra acima de ', 'Goes above ') + 'L' + (at - 1) + ' · ' + esc(under.name) : T3('Entra como a primeira camada', 'Goes in as the first layer');
    if (!t) return `<p class="note">${where}</p>`;
    const f = famOf(t), p = pm(mk(t, '', true, S.p));
    defs.length = 0; essentialParams(t).forEach(d => defs.push(d));
    return `<h3>${esc(typeLabel(t))} <span class="lbl">${esc(f ? f[0] : '')}</span></h3>
      <div id="addCtl">${defs.map(d => ctlHtml(d, p[d.k])).join('')}</div>
      <p class="note">${where}. ${T3('Os outros parâmetros ficam no painel.', 'The other parameters stay in the panel.')}</p>
      <div class="acts"><button id="addGo" class="on">${T3('Adicionar camada', 'Add layer')}</button></div>`;
  }
  function render(keepFocus) {
    const box = q('#addPop .box'); if (!box) return;
    const fid = keepFocus && document.activeElement && document.activeElement.id;
    q('#addT').textContent = T3('Adicionar camada', 'Add layer'); q('#addX').setAttribute('aria-label', T3('Fechar', 'Close'));
    const s = q('#addQ'); s.placeholder = T3('Buscar tipo', 'Search type'); s.setAttribute('aria-label', T3('Buscar tipo de camada', 'Search layer type'));
    q('#addTabs').innerHTML = tabsHtml(); q('#addTabs').setAttribute('aria-label', T3('Categorias', 'Categories'));
    renderGrid(); renderDet();
    if (fid && document.getElementById(fid)) document.getElementById(fid).focus({ preventScroll: true });
  }
  function renderGrid() {
    const g = q('#addGrid'); g.innerHTML = gridHtml(); g.setAttribute('aria-label', T3('Tipos', 'Types'));
    clearTimeout(S.tid); S.queue = [...g.querySelectorAll('canvas[data-t]')]; S.tid = setTimeout(pump, 0);
  }
  function renderDet() { q('#addDet').innerHTML = detHtml(); schedule(); }
  function choose(t) {
    if (S.type !== t) { S.type = t; S.p = {}; }
    q('#addGrid').querySelectorAll('.addTile').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.t === t)));
    renderDet();
  }

  /* um passo só no histórico: o rascunho não toca o projeto até aqui */
  function add() {
    const t = S.type; if (!t) return null;
    flushCommit();
    const comp = cur(), at = insertAt(), L = draft(t);
    comp.layers.splice(at, 0, L); ST.sel = at;
    buildStage(); renderLayers(); renderParams(); renderText();
    commit(true, T3('Adicionar camada: ', 'Add layer: ') + L.name);
    close(); toast(T3('Camada adicionada: ', 'Layer added: ') + L.name + T3(' · Ctrl+Z desfaz', ' · Ctrl+Z undoes'), 1600);
    return L;
  }

  function place() {
    const root = q('#addPop'), box = q('#addPop .box'), o = S.opener; if (root.hidden) return;
    box.style.left = box.style.top = box.style.bottom = '';
    if (matchMedia('(max-width:700px)').matches || !o || !o.getBoundingClientRect) return;   /* gaveta: o CSS posiciona */
    const r = o.getBoundingClientRect(), bw = box.offsetWidth, bh = box.offsetHeight, vw = root.clientWidth, vh = root.clientHeight;
    const x = Math.min(Math.max(12, r.left), Math.max(12, vw - bw - 12));
    const y = r.top > vh / 2 ? r.top - bh - 6 : r.bottom + 6;
    box.style.left = x + 'px'; box.style.top = Math.min(Math.max(12, y), Math.max(12, vh - bh - 12)) + 'px';
  }
  function open(from) {
    const root = q('#addPop'); if (!root) return;
    S.opener = from || document.activeElement; S.hover = null;
    { const f = famOf(S.type || (cur().layers[ST.sel] || {}).type); if (f && !S.type) S.cat = FAMILIES.indexOf(f); }
    root.hidden = false; render(); place();
    q('#addBarBtn').setAttribute('aria-expanded', 'true');
    setTimeout(() => { const s = q('#addQ'); if (s && !root.hidden) s.focus({ preventScroll: true }); }, 20);
  }
  function close() {
    const root = q('#addPop'); if (!root || root.hidden) return;
    root.hidden = true; clearTimeout(S.tid); S.queue = []; if (S.raf) cancelAnimationFrame(S.raf); S.raf = 0;
    q('#addBarBtn').setAttribute('aria-expanded', 'false');
    const o = S.opener; S.opener = null; if (o && o.isConnected && o.focus) o.focus({ preventScroll: true });
  }
  const focusables = () => [...q('#addPop .box').querySelectorAll('button,input,select,textarea,[tabindex]')].filter(e => !e.disabled && e.tabIndex >= 0 && e.offsetParent !== null);

  function bind() {
    const root = q('#addPop');
    root.addEventListener('pointerdown', e => { if (e.target === root) close(); });
    root.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return;
      if (b.id === 'addX') close();
      else if (b.id === 'addGo') add();
      else if (b.dataset.cat != null) { S.cat = +b.dataset.cat; S.q = ''; q('#addQ').value = ''; q('#addTabs').innerHTML = tabsHtml(); renderGrid(); q('#addTab' + S.cat).focus(); }
      else if (b.classList.contains('addTile')) choose(b.dataset.t);
    });
    root.addEventListener('input', e => { if (e.target.id === 'addQ') { S.q = e.target.value; q('#addTabs').innerHTML = tabsHtml(); renderGrid(); } });
    /* passar o mouse ou focar uma miniatura mostra a prévia dela; sair volta ao tipo escolhido */
    const grid = q('#addGrid');
    grid.addEventListener('pointerover', e => { const b = e.target.closest('.addTile'); if (b && S.hover !== b.dataset.t) { S.hover = b.dataset.t; schedule(); } });
    grid.addEventListener('pointerleave', () => { if (S.hover) { S.hover = null; schedule(); } });
    grid.addEventListener('focusin', e => { const b = e.target.closest('.addTile'); if (b) { S.hover = b.dataset.t; schedule(); } });
    grid.addEventListener('focusout', () => { S.hover = null; schedule(); });
    root.addEventListener('keydown', e => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); close(); return; }
      if (e.key === 'Tab') {
        const f = focusables(), i = f.indexOf(document.activeElement);
        if (f.length && e.shiftKey && i <= 0) { e.preventDefault(); f[f.length - 1].focus(); }
        else if (f.length && !e.shiftKey && i === f.length - 1) { e.preventDefault(); f[0].focus(); }
      }
      const tab = e.target.closest('[role=tab]');
      if (tab && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) { e.preventDefault(); const n = FAMILIES.length; S.cat = (+tab.dataset.cat + (e.key === 'ArrowRight' ? 1 : n - 1)) % n; S.q = ''; q('#addQ').value = ''; q('#addTabs').innerHTML = tabsHtml(); renderGrid(); q('#addTab' + S.cat).focus(); }
      if (e.key === 'Enter' && e.target.id === 'addQ') { e.preventDefault(); const v = visible(); if (v.length) { choose(v[0].t); const b = q(`#addGrid .addTile[data-t="${v[0].t}"]`); if (b) b.focus(); } }
      e.stopPropagation();   /* os atalhos da vista (espaço, 0 a 9, letras) não disparam enquanto se escolhe */
    });
    const ctl = q('#addDet');
    bindCtls(ctl, defs, k => pm(mk(S.type, '', true, S.p))[k], (k, v) => {
      if (v === undefined) delete S.p[k]; else S.p[k] = v;
      const d = defs.find(x => x.k === k);
      /* trocar preset ou forma troca os rótulos e os padrões de P1 a P4 */
      if (d && d.t === 's' && /^(preset|kind)$/.test(k)) { ['p1', 'p2', 'p3', 'p4'].forEach(x => delete S.p[x]); renderDet(); return; }
      schedule();
    });
    addEventListener('resize', () => { if (!root.hidden) place(); });
  }

  function refresh() { const b = q('#addBarBtn'); if (b) { b.textContent = T3('Adicionar', 'Add'); b.title = T3('Adicionar camada (abre o popover)', 'Add layer (opens the popover)'); } if (q('#addPop') && !q('#addPop').hidden) render(true); }
  function init() {
    if (q('#addPop')) return;
    const dlg = document.createElement('section'); dlg.id = 'addPop'; dlg.hidden = true; dlg.setAttribute('role', 'dialog'); dlg.setAttribute('aria-modal', 'true'); dlg.setAttribute('aria-labelledby', 'addT');
    dlg.innerHTML = `<div class="box"><header><h2 id="addT"></h2><button id="addX">×</button></header>
      <input id="addQ" type="search" autocomplete="off" spellcheck="false">
      <div id="addTabs" role="tablist"></div>
      <div class="cols"><div id="addGrid" role="group"></div>
      <div class="side"><div class="pv"><canvas id="addPrev" width="2" height="2" aria-hidden="true"></canvas></div><p class="note" id="addPrevNote" role="status"></p><div id="addDet"></div></div></div></div>`;
    document.body.appendChild(dlg);
    const bar = q('#bar'), sep = bar && bar.querySelector('.sep');
    if (bar) { const b = document.createElement('button'); b.id = 'addBarBtn'; b.setAttribute('aria-haspopup', 'dialog'); b.setAttribute('aria-expanded', 'false'); b.setAttribute('aria-controls', 'addPop'); bar.insertBefore(b, sep || null); b.onclick = () => open(b); }
    /* o + do cabeçalho de Camadas é redesenhado com o painel: delegação */
    document.addEventListener('click', e => { const b = e.target.closest && e.target.closest('[data-addpop]'); if (b) open(b); });
    bind(); refresh();
  }
  if (typeof document !== 'undefined' && typeof $ === 'function') init();
  return { open, close, add, choose, essentialParams, refresh, NO_LIVE, get state() { return { open: !!q('#addPop') && !q('#addPop').hidden, cat: S.cat, q: S.q, type: S.type, p: clone(S.p), at: insertAt() }; } };
})();
