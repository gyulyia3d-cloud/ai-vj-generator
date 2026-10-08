/* Aba "Superfície": preset de superfície, cortes (dobras), regiões importadas de CSV/PNG (só entrada) e legibilidade por passo e distância. Não gera pixel map nem arquivos de mapping.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Textos em PT e EN pela função T3 (definida em gen-ui.js). */
const SUR = { pitch: '', dist: '', msg: '', err: [], leg: null };
function surSpec() { return (P.meta.spec && P.meta.spec.confirmed) || {}; }
function surApplyPreset(id) {
  const q = SURFACE_PRESETS.find(x => x.id === id); if (!q) return false;
  const c = P.canvas; c.w = q.w; c.h = q.h; c.target = q.type; if (q.folds) c.folds = q.folds.slice(); else delete c.folds;
  P.meta.spec = P.meta.spec || { archetype: [], confirmed: {}, assumed: [] }; const cf = P.meta.spec.confirmed = P.meta.spec.confirmed || {};
  cf.pixelMap = [q.w, q.h]; if (q.pitchMm) cf.pitchMm = q.pitchMm; else delete cf.pitchMm; if (q.viewingDistanceM) cf.viewingDistanceM = q.viewingDistanceM.slice(); else delete cf.viewingDistanceM;
  commit(true, 'Superfície ' + id); refreshAll(); return true;
}
function surLegHtml() {
  const cf = surSpec(), pitch = +(SUR.pitch || cf.pitchMm || 0), dist = +(SUR.dist || (cf.viewingDistanceM || [])[1] || 0);
  const inputs = `<div class="row"><span class="lbl">${T3('Passo do LED (mm)', 'LED pitch (mm)')}</span><input type="text" id="sLegP" value="${esc(SUR.pitch || cf.pitchMm || '')}" placeholder="3.9" style="width:80px"><span class="lbl">${T3('Distância máx. (m)', 'Max distance (m)')}</span><input type="text" id="sLegD" value="${esc(SUR.dist || (cf.viewingDistanceM || [])[1] || '')}" placeholder="40" style="width:80px"><button id="sLegGo">${T3('Conferir', 'Check')}</button></div>`;
  if (!(pitch > 0 && dist > 0)) return inputs + `<p class="note">${T3('Informe o passo do LED e a distância do espectador mais distante.', 'Enter the LED pitch and the distance of the farthest viewer.')}</p>`;
  const r = SURFX.legibility(P, pitch, dist);
  if (r.error) return inputs + `<p class="note">${esc(r.error)}</p>`;
  const lim = r.limits;
  return inputs + `<dl class="kv"><dt>${T3('Altura mínima de letra', 'Minimum letter height')}</dt><dd>${lim.cap_height_min.px} px (${lim.cap_height_min.mm} mm)</dd><dt>${T3('Altura confortável', 'Comfortable height')}</dt><dd>${lim.cap_height_comfortable.px} px</dd><dt>${T3('Traço mínimo', 'Minimum stroke')}</dt><dd>${lim.line_weight_min_px} px</dd></dl>`
    + (r.warnings.length ? `<ul class="val">${r.warnings.map(w => `<li class="WARNING">${esc(w)}</li>`).join('')}</ul>` : `<p class="note">${T3('Nenhum texto ou traço abaixo do mínimo legível neste projeto.', 'No text or stroke below the readable minimum in this project.')}</p>`);
}
function renderSurface() {
  const el = pane('sur'); if (!el) return; const c = P.canvas, en = ST.lang === 'en', disp = c.displays || [];
  const cur = (SURFACE_PRESETS.find(q => q.type === c.target && q.w === c.w && q.h === c.h) || { id: '' }).id;
  const folds = (c.folds || []).map(f => `<button data-sf="${f}" title="${esc(T3('Remover esta dobra', 'Remove this fold'))}">${f} ×</button>`).join('');
  el.innerHTML = `<h2 class="sec">${T3('Superfície', 'Surface')} <span class="lbl">${c.w}×${c.h} · ${esc(c.target)}</span></h2>
    <p class="note">${T3('Escolha o preset da sua superfície, corte o canvas nas dobras, importe as regiões que já existem e confira a legibilidade. A superfície é entrada e restrição de composição; o motor não gera pixel map nem arquivos de mapping.', 'Pick the preset for your surface, cut the canvas at the folds, import the regions that already exist and check legibility. The surface is input and a composition constraint; the engine does not generate pixel maps or mapping files.')}</p>
    <div class="row"><select id="sPre" aria-label="${T3('Preset de superfície', 'Surface preset')}"><option value="">${T3('Preset de superfície…', 'Surface preset…')}</option>${SURFACE_PRESETS.map(q => `<option value="${q.id}" ${q.id === cur ? 'selected' : ''}>${esc(en ? q.en : q.pt)}</option>`).join('')}</select></div>
    <h2 class="sec">${T3('Cortes (dobras)', 'Cuts (folds)')} <span class="lbl">${(c.folds || []).length + 1} ${T3('parede(s)', 'wall(s)')}</span></h2>
    <div class="row chips">${folds || `<span class="note">${T3('Sem cortes: uma parede só.', 'No cuts: a single wall.')}</span>`}</div>
    <div class="row"><span class="lbl">${T3('Cortar em x (px)', 'Cut at x (px)')}</span><input type="text" id="sCut" placeholder="2250" style="width:90px"><button id="sCutGo">${T3('Cortar', 'Cut')}</button><button id="sCutHalf">${T3('Ao meio', 'In half')}</button><button id="sCutClear" ${(c.folds || []).length ? '' : 'disabled'}>${T3('Limpar cortes', 'Clear cuts')}</button></div>
    <h2 class="sec">${T3('Regiões importadas (entrada)', 'Imported regions (input)')} <span class="lbl">${disp.length} ${T3('módulo(s)', 'module(s)')}${disp.length ? ' · ' + (SURFX.activePixels(disp) / (c.w * c.h) * 100).toFixed(1) + '% ' + T3('do canvas', 'of the canvas') : ''}</span></h2>
    <p class="note">${T3('Importe as regiões que já existem na sua superfície: CSV (nome,x,y,largura,altura, em pixels do canvas) ou uma imagem PNG em que o que não é preto é pixel ativo (a imagem é esticada ao canvas). As regiões aparecem na vista e podem ser renderizadas uma a uma na aba Exportar.', 'Import the regions that already exist on your surface: CSV (name,x,y,width,height, in canvas pixels) or a PNG image where anything not black is an active pixel (the image is stretched to the canvas). The regions show in the view and can be rendered one by one in the Export tab.')}</p>
    <div class="row"><label class="filebtn">${T3('Importar CSV ou PNG', 'Import CSV or PNG')}<input type="file" id="sMapFile" accept=".csv,.txt,image/png,.png"></label><button id="sMapClear" ${disp.length ? '' : 'disabled'}>${T3('Limpar mapa', 'Clear map')}</button></div>
    <h2 class="sec">${T3('Legibilidade', 'Legibility')}</h2>${surLegHtml()}
    <div id="sMsg" class="note" role="status" aria-live="polite">${SUR.err.length ? '<b>' + T3('Atenção:', 'Warning:') + '</b><br>' + SUR.err.map(esc).join('<br>') : esc(SUR.msg)}</div>`;
  surBind(el);
}
function surBind(el) {
  const q = id => $('#' + id, el), on = (id, ev, fn) => { const n = q(id); if (n) n.addEventListener(ev, fn); }, c = P.canvas;
  const setFolds = fs => { c.folds = [...new Set(fs)].filter(x => x > 0 && x < c.w).sort((a, b) => a - b); if (!c.folds.length) delete c.folds; commit(true, 'Cortes'); drawOverlay(); renderSurface(); if (ST.tab === 'prj') renderProject(); };
  on('sPre', 'change', e => { if (e.target.value) { surApplyPreset(e.target.value); SUR.msg = T3('Preset aplicado. Desfazer (Ctrl+Z) volta ao canvas anterior.', 'Preset applied. Undo (Ctrl+Z) returns to the previous canvas.'); SUR.err = []; renderSurface(); } });
  $$('[data-sf]', el).forEach(b => b.addEventListener('click', () => setFolds((c.folds || []).filter(f => f !== +b.dataset.sf))));
  on('sCutGo', 'click', () => { const x = Math.round(evalExpr(q('sCut').value)); if (!(x > 0 && x < c.w)) { SUR.err = [T3(`O corte precisa estar entre 1 e ${c.w - 1} px.`, `The cut must be between 1 and ${c.w - 1} px.`)]; renderSurface(); return; } SUR.err = []; setFolds([...(c.folds || []), x]); });
  on('sCutHalf', 'click', () => setFolds([...(c.folds || []), Math.round(c.w / 2)]));
  on('sCutClear', 'click', () => setFolds([]));
  on('sLegGo', 'click', () => { SUR.pitch = q('sLegP').value; SUR.dist = q('sLegD').value; renderSurface(); });
  on('sMapClear', 'click', () => { c.displays = []; commit(true, 'Regiões'); drawOverlay(); renderSurface(); });
  on('sMapFile', 'change', async e => {
    const f = e.target.files[0]; if (!f) return; e.target.value = '';
    try {
      let res;
      if (/\.png$/i.test(f.name) || f.type === 'image/png') {
        const img = await imgFrom(await readDataUrl(f)), k = Math.min(1, 1024 / img.naturalWidth), w = Math.max(1, Math.round(img.naturalWidth * k)), h = Math.max(1, Math.round(img.naturalHeight * k)), cv = document.createElement('canvas'); cv.width = w; cv.height = h;
        const cx = cv.getContext('2d', { willReadFrequently: true }); cx.drawImage(img, 0, 0, w, h); res = SURFX.maskToRects(cx.getImageData(0, 0, w, h).data, w, h, c.w, c.h); res.errs = res.truncated ? [T3('Mais de 500 módulos: só os 500 primeiros foram usados.', 'More than 500 modules: only the first 500 were used.')] : [];
        if (Math.abs(img.naturalWidth / img.naturalHeight - c.w / c.h) > 0.02 * c.w / c.h) res.errs.push(T3(`A imagem (${img.naturalWidth}×${img.naturalHeight}) tem proporção diferente do canvas (${c.w}×${c.h}); ela foi esticada.`, `The image (${img.naturalWidth}×${img.naturalHeight}) has a different aspect from the canvas (${c.w}×${c.h}); it was stretched.`));
      } else res = SURFX.parseCsv(await f.text(), c.w, c.h);
      SUR.err = res.errs;
      if (!res.rects.length) { SUR.err.push(T3('Nenhum módulo válido no arquivo.', 'No valid module in the file.')); renderSurface(); return; }
      c.displays = res.rects.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, name: r.name })); commit(true, 'Regiões'); drawOverlay();
      SUR.msg = T3(`${res.rects.length} módulo(s) importado(s). Desfazer (Ctrl+Z) volta ao mapa anterior.`, `${res.rects.length} module(s) imported. Undo (Ctrl+Z) returns to the previous map.`); renderSurface();
    } catch (err) { SUR.err = [T3('Não consegui ler o arquivo: ', 'Could not read the file: ') + err.message]; renderSurface(); }
  });
}
