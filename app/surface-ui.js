/* Aba "Superfície" (fase 3): preset de superfície, cortes (dobras), fatias e XML para o Resolume, pixel map por CSV/PNG, legibilidade por passo e distância.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Textos em PT e EN pela função T3 (definida em gen-ui.js). */
const SUR = { out: '3840x2160', mode: 'columns', pitch: '', dist: '', msg: '', err: [], leg: null };
const SUR_OUTS = ['1280x720', '1920x1080', '3840x2160', '4096x2160', '7680x4320'];
function surOut() { const [w, h] = String(SUR.out).split('x').map(Number); return [w, h]; }
function surSpec() { return (P.meta.spec && P.meta.spec.confirmed) || {}; }
function surApplyPreset(id) {
  const q = SURFACE_PRESETS.find(x => x.id === id); if (!q) return false;
  const c = P.canvas; c.w = q.w; c.h = q.h; c.target = q.type; if (q.folds) c.folds = q.folds.slice(); else delete c.folds;
  P.meta.spec = P.meta.spec || { archetype: [], confirmed: {}, assumed: [] }; const cf = P.meta.spec.confirmed = P.meta.spec.confirmed || {};
  cf.pixelMap = [q.w, q.h]; if (q.pitchMm) cf.pitchMm = q.pitchMm; else delete cf.pitchMm; if (q.viewingDistanceM) cf.viewingDistanceM = q.viewingDistanceM.slice(); else delete cf.viewingDistanceM;
  commit(true, 'Superfície ' + id); refreshAll(); return true;
}
function surPlan() {
  const o = surOut(), disp = P.canvas.displays || [];
  return SURFX.plan(P.canvas, { name: P.meta.name, out: o, mode: SUR.mode === 'rects' && disp.length ? 'rects' : 'columns', rects: disp.map((d, i) => ({ name: d.name || 'M' + String(i + 1).padStart(2, '0'), x: d.x, y: d.y, w: d.w, h: d.h })) });
}
async function surPatternBlob(plan) {
  const W = P.canvas.w, H = P.canvas.h, k = Math.min(1, 8192 / W, 8192 / H), cw = Math.max(1, Math.round(W * k)), ch = Math.max(1, Math.round(H * k)), cv = document.createElement('canvas'); cv.width = cw; cv.height = ch;
  const c = cv.getContext('2d'); c.fillStyle = '#121212'; c.fillRect(0, 0, cw, ch);
  plan.placed.forEach((p, i) => {
    const col = SURFX.PAL_TILE[i % SURFX.PAL_TILE.length], x = p.x * k, y = p.y * k, w = p.w * k, h = p.h * k, t = Math.max(2, Math.round(4 * k));
    for (let yy = 0; yy < h; yy += 40 * k) for (let xx = 0; xx < w; xx += 40 * k) { const odd = (Math.floor(xx / (40 * k)) + Math.floor(yy / (40 * k))) % 2; c.fillStyle = `rgb(${col.map(v => Math.round(v * (odd ? 0.55 : 0.7))).join(',')})`; c.fillRect(x + xx, y + yy, Math.min(40 * k, w - xx), Math.min(40 * k, h - yy)); }
    c.fillStyle = '#fff'; c.fillRect(x, y, w, t); c.fillRect(x, y + h - t, w, t); c.fillRect(x, y, t, h); c.fillRect(x + w - t, y, t, h);
    c.font = `800 ${Math.max(12, Math.min(h * 0.28, 160 * k + 20))}px sans-serif`; c.textBaseline = 'top'; c.fillStyle = '#fff'; c.fillText(String(i + 1), x + t * 3, y + t * 3);
  });
  return new Promise(r => cv.toBlob(r, 'image/png'));
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
  const el = pane('sur'); if (!el) return; const c = P.canvas, en = ST.lang === 'en', disp = c.displays || [], plan = surPlan();
  const cur = (SURFACE_PRESETS.find(q => q.type === c.target && q.w === c.w && q.h === c.h) || { id: '' }).id;
  const folds = (c.folds || []).map(f => `<button data-sf="${f}" title="${esc(T3('Remover esta dobra', 'Remove this fold'))}">${f} ×</button>`).join('');
  el.innerHTML = `<h2 class="sec">${T3('Superfície', 'Surface')} <span class="lbl">${c.w}×${c.h} · ${esc(c.target)}</span></h2>
    <p class="note">${T3('Escolha o preset da sua superfície, corte o canvas nas dobras, gere as fatias para o Resolume e confira a legibilidade. Tudo é calculado aqui, sem IA.', 'Pick the preset for your surface, cut the canvas at the folds, generate the slices for Resolume and check legibility. Everything is computed here, with no AI.')}</p>
    <div class="row"><select id="sPre" aria-label="${T3('Preset de superfície', 'Surface preset')}"><option value="">${T3('Preset de superfície…', 'Surface preset…')}</option>${SURFACE_PRESETS.map(q => `<option value="${q.id}" ${q.id === cur ? 'selected' : ''}>${esc(en ? q.en : q.pt)}</option>`).join('')}</select></div>
    <h2 class="sec">${T3('Cortes (dobras)', 'Cuts (folds)')} <span class="lbl">${(c.folds || []).length + 1} ${T3('parede(s)', 'wall(s)')}</span></h2>
    <div class="row chips">${folds || `<span class="note">${T3('Sem cortes: uma parede só.', 'No cuts: a single wall.')}</span>`}</div>
    <div class="row"><span class="lbl">${T3('Cortar em x (px)', 'Cut at x (px)')}</span><input type="text" id="sCut" placeholder="2250" style="width:90px"><button id="sCutGo">${T3('Cortar', 'Cut')}</button><button id="sCutHalf">${T3('Ao meio', 'In half')}</button><button id="sCutClear" ${(c.folds || []).length ? '' : 'disabled'}>${T3('Limpar cortes', 'Clear cuts')}</button></div>
    <h2 class="sec">${T3('Pixel map', 'Pixel map')} <span class="lbl">${disp.length} ${T3('módulo(s)', 'module(s)')}${disp.length ? ' · ' + (SURFX.activePixels(disp) / (c.w * c.h) * 100).toFixed(1) + '% ' + T3('do canvas', 'of the canvas') : ''}</span></h2>
    <p class="note">${T3('Importe os módulos do seu LED ou telas: CSV (nome,x,y,largura,altura, em pixels do canvas) ou uma imagem PNG em que o que não é preto é pixel ativo (a imagem é esticada ao canvas). Os módulos aparecem na vista e viram fatias no XML.', 'Import your LED or screen modules: CSV (name,x,y,width,height, in canvas pixels) or a PNG image where anything not black is an active pixel (the image is stretched to the canvas). The modules show in the view and become slices in the XML.')}</p>
    <div class="row"><label class="filebtn">${T3('Importar CSV ou PNG', 'Import CSV or PNG')}<input type="file" id="sMapFile" accept=".csv,.txt,image/png,.png"></label><button id="sMapCsv" ${disp.length ? '' : 'disabled'}>${T3('Baixar CSV', 'Download CSV')}</button><button id="sMapClear" ${disp.length ? '' : 'disabled'}>${T3('Limpar mapa', 'Clear map')}</button></div>
    <h2 class="sec">${T3('Fatias para o Resolume', 'Slices for Resolume')} <span class="lbl">${plan.error ? '' : plan.placed.length + ' ' + T3('fatia(s)', 'slice(s)') + ' · ' + plan.screens + ' ' + T3('saída(s)', 'output(s)')}</span></h2>
    <div class="row"><span class="lbl">${T3('Saída', 'Output')}</span><select id="sOut">${SUR_OUTS.map(o => `<option ${o === SUR.out ? 'selected' : ''}>${o}</option>`).join('')}</select>
      <span class="lbl">${T3('Fatiar', 'Slice by')}</span><select id="sMode"><option value="columns" ${SUR.mode === 'columns' ? 'selected' : ''}>${T3('colunas entre as dobras', 'columns between the folds')}</option><option value="rects" ${SUR.mode === 'rects' ? 'selected' : ''} ${disp.length ? '' : 'disabled'}>${T3('um módulo do pixel map por fatia (experimental)', 'one pixel-map module per slice (experimental)')}</option></select></div>
    ${plan.error ? `<ul class="val"><li class="ERROR">${esc(plan.error)}</li></ul>` : `<dl class="kv">${plan.map.slices.map(s => `<dt>${String(s.slice).padStart(2, '0')}${s.name ? ' ' + esc(s.name) : ''}</dt><dd>x ${s.input.x}..${s.input.x + s.input.w}${s.input.y || s.input.h !== c.h ? ' · y ' + s.input.y + '..' + (s.input.y + s.input.h) : ''} → ${T3('saída', 'output')} ${s.screen} (${s.output.x}, ${s.output.y})</dd>`).join('')}</dl>
      <p class="note">${T3('Pixels', 'Pixels')}: ${c.w * c.h} ${T3('na entrada', 'in')} · ${plan.usedPixels} ${T3('nas fatias', 'in the slices')}.</p>`}
    <div class="row"><button id="sXml" ${plan.error ? 'disabled' : ''}>${T3('Baixar XML do Resolume', 'Download Resolume XML')}</button><button id="sMapJson" ${plan.error ? 'disabled' : ''}>${T3('Baixar mapa (.json)', 'Download map (.json)')}</button><button id="sPat" ${plan.error ? 'disabled' : ''}>${T3('Baixar padrão de teste (.png)', 'Download test pattern (.png)')}</button></div>
    <p class="note">${T3('No Resolume: Arquivo > Advanced Output > Carregar. Toque o padrão de teste: cada ladrilho tem de cair no seu lugar. As versões do Arena diferem: abra o XML uma vez, olhe as fatias e salve de novo pelo Arena. Rotação de 90° ainda não existe nesta aba. O modo "um módulo por fatia" generaliza o formato e ainda não foi conferido contra um arquivo salvo pelo Arena.', 'In Resolume: File > Advanced Output > Load. Play the test pattern: every tile must land in its place. Arena versions differ: open the XML once, look at the slices and re-save it from Arena. 90° rotation does not exist in this tab yet. The "one module per slice" mode generalises the format and has not been checked against a file saved by Arena.')}</p>
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
  on('sOut', 'change', e => { SUR.out = e.target.value; renderSurface(); }); on('sMode', 'change', e => { SUR.mode = e.target.value; renderSurface(); });
  on('sLegGo', 'click', () => { SUR.pitch = q('sLegP').value; SUR.dist = q('sLegD').value; renderSurface(); });
  on('sMapClear', 'click', () => { c.displays = []; commit(true, 'Pixel map'); drawOverlay(); SUR.mode = 'columns'; renderSurface(); });
  on('sMapCsv', 'click', () => saveFile(safe(P.meta.name) + '.pixelmap.csv', new Blob([SURFX.rectsCsv(c.displays.map((d, i) => ({ name: d.name || 'M' + String(i + 1).padStart(2, '0'), x: d.x, y: d.y, w: d.w, h: d.h })))], { type: 'text/csv' })));
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
      c.displays = res.rects.map(r => ({ x: r.x, y: r.y, w: r.w, h: r.h, name: r.name })); commit(true, 'Pixel map'); drawOverlay();
      SUR.msg = T3(`${res.rects.length} módulo(s) importado(s). Desfazer (Ctrl+Z) volta ao mapa anterior.`, `${res.rects.length} module(s) imported. Undo (Ctrl+Z) returns to the previous map.`); renderSurface();
    } catch (err) { SUR.err = [T3('Não consegui ler o arquivo: ', 'Could not read the file: ') + err.message]; renderSurface(); }
  });
  const base = () => safe(P.meta.name);
  on('sXml', 'click', () => { const p = surPlan(); if (!p.error) saveFile(base() + '.slices.xml', new Blob([p.xml], { type: 'application/xml' })); });
  on('sMapJson', 'click', () => { const p = surPlan(); if (!p.error) saveFile(base() + '.map.json', new Blob([JSON.stringify(p.map, null, 2) + '\n'], { type: 'application/json' })); });
  on('sPat', 'click', async () => { const p = surPlan(); if (!p.error) saveFile(base() + '.stageview.png', await surPatternBlob(p)); });
}
