/* Eventos de UI, importação, manipulação direta, teclado, briefing e boot (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores BOOT. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- eventos de UI ---------- */
$('#tabs').addEventListener('click', e => {
  const b = e.target.closest('[data-tab]'); if (!b) return;
  if (b.dataset.tab === 'comp' || b.dataset.tab === 'lay') { setLib(b.dataset.tab); openLib(); return; }
  ST.tab = b.dataset.tab; $$('#tabs [data-tab]').forEach(x => x.setAttribute('aria-selected', x === b));
  $$('#panes .pane').forEach(p => p.hidden = p.dataset.pane !== ST.tab);
  if (ST.tab === 'sur') renderSurface(); if (ST.tab === 'exp') renderExport(); if (ST.tab === 'aud') renderAudio(); if (ST.tab === 'spc') renderSpec();  if (ST.tab === 'isf') renderIsf();
  store.set('tab', ST.tab);
});
/* biblioteca à esquerda (14a-2): Composições e Camadas ficam num painel próprio; as abas comp e lay do trilho só a abrem */
function setLib(k) {
  ST.lib = k === 'lay' ? 'lay' : 'comp';
  $$('#lib .pane').forEach(p => p.hidden = p.dataset.pane !== ST.lib);
  $$('#libTabs [data-lib]').forEach(x => x.setAttribute('aria-selected', x.dataset.lib === ST.lib));
  store.set('libTab', ST.lib); if (ST.lib === 'comp') renderComp(); libFilter();
}
function openLib(open = true) {
  $('#app').classList.toggle('nolib', !open); $('#app').classList.toggle('libsheet', open); $('#libOpen').hidden = open; store.set('libOpen', open); setTimeout(fit, 30);
}
function libFilter() {
  const q = $('#libSearch').value.trim().toLowerCase();
  $$('#lib .pane:not([hidden]) .crow, #lib .pane:not([hidden]) .lrow').forEach(r => { r.hidden = !!q && !r.textContent.toLowerCase().includes(q); });
}
$('#libTabs').addEventListener('click', e => { const b = e.target.closest('[data-lib]'); if (b) setLib(b.dataset.lib); });
$('#libMin').onclick = () => openLib(false);
$('#libOpen').onclick = () => openLib(true);
$('#libSearch').addEventListener('input', libFilter);
{ let lt = 0; new MutationObserver(() => { clearTimeout(lt); lt = setTimeout(libFilter, 0); }).observe($('#libBody'), { childList: true, subtree: true }); }
$('#mStd').onclick = () => setMode('standard');
$('#mBrief').onclick = () => setMode('briefing');
$('#wizBtn').onclick = openWiz;
$('#tap').onclick = tap; $('#bpmDn').onclick = () => setBpm(P.time.bpm - 1); $('#bpmUp').onclick = () => setBpm(P.time.bpm + 1);
$('#compBtns').onclick = e => { const b = e.target.closest('button'); if (!b) return; if (b.dataset.add != null) return dupComp(ST.ci); selectComp(+b.dataset.ci); };
$('#pause').onclick = () => setPause(!ST.paused);
$('#stepBtn').onclick = () => { const c = cur(); c.motion = (c.motion || 'step') === 'step' ? 'smooth' : 'step'; renderTop(); commit(); };
$('#explode').onclick = () => setExplode(!ST.exploded);
$('#audBtn').onclick = () => { setAudio(!P.audio.reactive); if (ST.tab === 'aud') renderAudio(); };
$('#rec').onclick = recToggle;
$('#cleanBtn').onclick = () => { $('#app').classList.add('clean'); toast('Tela limpa · H para voltar', 1800); setTimeout(fit, 30); };
$('#fsBtn').onclick = toggleFs;
$('#expBtn').onclick = () => $('#tabs [data-tab="exp"]').click();
function setBarHidden(h) { $('#app').classList.toggle('barhide', h); $('#barShow').hidden = !h; store.set('barHidden', h); setTimeout(fit, 30); }
$('#barHide').onclick = () => setBarHidden(true);
$('#barShow').onclick = () => setBarHidden(false);
if (store.get('barHidden', false) === true) setBarHidden(true);
function setPause(v) { ST.paused = v; if (!v) ST.t0 = performance.now() - ST.n / P.canvas.fps * 1000; $('#pause').setAttribute('aria-pressed', v); $('#pause').textContent = v ? 'Play' : 'Pausa'; $$('video').forEach(x => v && x.pause()); }
let scrubbing = false;
$('#scrub').addEventListener('input', e => { scrubbing = true; ST.n = +e.target.value; if (!ST.paused) setPause(true); });
$('#scrub').addEventListener('change', () => { scrubbing = false; });
$('#vFit').onclick = () => { ST.zoom = 1; fit(); }; $('#v100').onclick = () => { ST.zoom = 1 / ST.fitS; fit(); };
$('#vZi').onclick = () => { ST.zoom = Math.min(16, ST.zoom * 1.25); fit(); }; $('#vZo').onclick = () => { ST.zoom = Math.max(0.1, ST.zoom / 1.25); fit(); };
$('#vGrid').onclick = e => { ST.grid = !ST.grid; e.currentTarget.setAttribute('aria-pressed', ST.grid); drawOverlay(); };
$('#vSafe').onclick = e => { ST.safe = !ST.safe; e.currentTarget.setAttribute('aria-pressed', ST.safe); drawOverlay(); };

/* painel de composições (delegação) */
pane('comp').addEventListener('click', e => {
  const row = e.target.closest('.crow'), act = e.target.dataset.act;
  if (act === 'new') return dupComp(ST.ci);
  if (act === 'stdreset') { commit(true); SLOTS.standard = standardProject(); setMode('standard', true); commit(true); return toast('STANDARD restaurado · Ctrl+Z desfaz'); }
  if (!row) return; const i = +row.dataset.ci;
  if (e.target.tagName === 'CANVAS' || act === 'go') return selectComp(i);
  if (act === 'dup') dupComp(i);
  if (act === 'del') { commit(true); P.compositions.splice(i, 1); ST.ci = Math.min(ST.ci, P.compositions.length - 1); refreshAll(); commit(true); toast('Composição removida · Ctrl+Z desfaz'); }
  if (act === 'reset') { const o = ORIG[P.id + P.compositions[i].id]; if (!o) return toast('Sem versão original guardada'); commit(true); P.compositions[i] = clone(o); if (i === ST.ci) buildStage(); refreshAll(); commit(true); toast('Composição restaurada'); }
  if (act === 'exp') { selectComp(i, true); EXP.comps = 'current'; $('#tabs [data-tab="exp"]').click(); }
});
pane('comp').addEventListener('change', e => { if (!e.target.matches('[data-rename]')) return; const i = +e.target.closest('.crow').dataset.ci; P.compositions[i].name = e.target.value.toUpperCase().trim() || P.compositions[i].name; renderBar(); renderTop(); commit(); });
function dupComp(i) { commit(true); const c = clone(P.compositions[i]); c.id = 'c' + Date.now().toString(36); c.name = c.name + ' B'; P.compositions.splice(i + 1, 0, c); ORIG[P.id + c.id] = clone(c); selectComp(i + 1, true); refreshAll(); commit(true); toast('Composição duplicada'); }

/* painel de camadas (delegação) */
pane('lay').addEventListener('click', e => {
  const comp = cur(), r = e.target.closest('.lrow');
  if (r && e.target.matches('[data-vis]')) { toggleLayer(+r.dataset.i); return; }
  if (r && !e.target.matches('input,select')) { selLayer(+r.dataset.i); return; }
  const a = e.target.dataset.la; if (!a) return; const i = ST.sel, L = comp.layers[i];
  if (a === 'addpop') { ADDPOP.open(e.target); return; }
  if (!L) return;
  if (a === 'solo') ST.solo = ST.solo === i ? -1 : i;
  if (a === 'up' && i < comp.layers.length - 1) { [comp.layers[i], comp.layers[i + 1]] = [comp.layers[i + 1], comp.layers[i]]; ST.sel = i + 1; }
  if (a === 'down' && i > 0) { [comp.layers[i], comp.layers[i - 1]] = [comp.layers[i - 1], comp.layers[i]]; ST.sel = i - 1; }
  if (a === 'dup') { comp.layers.splice(i + 1, 0, Object.assign(clone(L), { name: L.name + ' B' })); ST.sel = i + 1; }
  if (a === 'ren') { const row = $(`#lrows .lrow[data-i="${i}"] .nm`); row.innerHTML = `<input type="text" value="${esc(L.name)}" id="renIn" aria-label="Novo nome">`; const inp = $('#renIn'); inp.focus(); inp.select(); inp.onchange = inp.onblur = () => { L.name = inp.value.toUpperCase().trim() || L.name; renderLayers(); syncLayerDom(); commit(); }; return; }
  if (a === 'reset') { L.p = {}; L.opacity = 1; L.blend = 'normal'; toast('Camada restaurada'); }
  if (a === 'del') { comp.layers.splice(i, 1); ST.sel = Math.max(0, i - 1); ST.solo = -1; toast('Camada removida · Ctrl+Z desfaz'); }
  if (a === 'copy') { ST.clip = { type: L.type, p: clone(L.p) }; toast('Parâmetros copiados'); }
  if (a === 'paste') pasteParams(L);
  if (a === 'copyL') { ST.clipL = clone(L); toast('Camada copiada'); }
  if (a === 'pasteL' && ST.clipL) { comp.layers.splice(i + 1, 0, clone(ST.clipL)); ST.sel = i + 1; toast('Camada colada'); }
  buildStage(); renderLayers(); renderParams(); renderText(); commit();
});
pane('lay').addEventListener('change', e => {
  const r = e.target.closest('.lrow'); if (!r) return; const L = cur().layers[+r.dataset.i];
  if (e.target.matches('[data-op]')) L.opacity = clamp(+e.target.value, 0, 1);
  if (e.target.matches('[data-bl]')) L.blend = e.target.value;
  syncLayerDom(); commit();
});
pane('txt').addEventListener('click', e => {
  const t = e.target.dataset.tx; if (t == null) return; const comp = cur();
  if (t === 'add') { comp.layers.push(mk('text', 'TEXTO ' + (comp.layers.filter(l => l.type === 'text').length + 1), true, { content: P.meta.name })); ST.txtSel = comp.layers.length - 1; buildStage(); renderLayers(); commit(); }
  else ST.txtSel = +t;
  renderText();
});
document.addEventListener('change', e => {
  if (e.target.matches('[data-font]')) { const f = e.target.files[0]; if (f) importFile(f); }
  if (e.target.matches('[data-mimp]')) { const f = e.target.files[0]; if (f) importFile(f); }
});
pane('med').addEventListener('click', e => {
  if (e.target.dataset.logo) { toLogo(e.target.dataset.logo); return; }
  const id = e.target.dataset.use; if (!id) return; const m = MEDIA[id], comp = cur();
  let i = comp.layers.findIndex(l => l.type === m.kind); if (i < 0) { comp.layers.push(mk(m.kind, m.kind === 'video' ? 'VÍDEO' : m.kind === 'model' ? 'OBJETO 3D' : 'IMAGEM', true)); i = comp.layers.length - 1; buildStage(); }
  comp.layers[i].p.media = id; comp.layers[i].on = true; ST.sel = i; syncLayerDom(); renderLayers(); renderParams(); commit(); toast(`${m.name} → L${i}`);
});

/* ---------- importação de arquivos ---------- */
async function importFile(f) {
  const id = f.name, url = URL.createObjectURL(f);
  try {
    if (/^image\//.test(f.type)) {
      const img = new Image(); img.src = url; await img.decode(); const data = await readDataUrl(f);
      MEDIA[id] = { kind: 'image', name: f.name, img, url, data, w: img.naturalWidth, h: img.naturalHeight }; AUDIT.clear(); assignMedia(id, 'image');
      if (data.length > 8e6) toast('Imagem pesada (' + (data.length / 1048576).toFixed(1) + ' MB): vai dentro do JSON do projeto. Reduza se possível.', 4200);
    } else if (/^video\//.test(f.type)) {
      const el = document.createElement('video'); el.src = url; el.muted = true; el.loop = true; el.playsInline = true; el.preload = 'auto';
      await new Promise((r, j) => { el.onloadeddata = r; el.onerror = () => j(new Error('vídeo não suportado')); });
      MEDIA[id] = { kind: 'video', name: f.name, el, url, w: el.videoWidth, h: el.videoHeight, dur: el.duration }; assignMedia(id, 'video');
    } else if (/\.ply$/i.test(f.name)) {
      const o = parsePly(await f.arrayBuffer()), data = splatPack(o);
      MEDIA[id] = Object.assign(o, { name: f.name, url, data }); AUDIT.clear(); assignMedia(id, 'splat');
      toast(`${f.name}: ${o.total} pontos${o.total > o.n ? ' → ' + o.n + ' (reduzido)' : ''}${o.hasScale ? ' · splats gaussianos' : ' · nuvem de pontos'}`, 4200);
    } else if (/\.(obj|glb|stl)$/i.test(f.name)) {
      const buf = await f.arrayBuffer(), mod = parseModel(f.name, buf), data = await readDataUrl(f);
      MEDIA[id] = Object.assign(mod, { name: f.name, url, data }); AUDIT.clear(); assignMedia(id, 'model');
      if (data.length > 8e6) toast('Modelo pesado (' + (data.length / 1048576).toFixed(1) + ' MB): vai dentro do JSON do projeto.', 4200);
    } else if (/\.(ttf|otf|woff2?)$/i.test(f.name) || /font/.test(f.type)) {
      const name = f.name.replace(/\.[^.]+$/, '').replace(/[^\w -]/g, '');
      const ff = new FontFace(name, await f.arrayBuffer()); await ff.load(); document.fonts.add(ff);
      if (!CUSTOM_FONTS.includes(name)) CUSTOM_FONTS.push(name); FONT_DATA[name] = await readDataUrl(f);
      const L = cur().layers[ST.txtSel ?? -1] || cur().layers.find(l => l.type === 'text');
      if (L) { L.p.font = name; L.on = true; syncLayerDom(); commit(); }
      toast('Fonte carregada: ' + name); renderText(); renderParams();
    } else toast('Formato não reconhecido: ' + f.name);
  } catch (e) { toast('Não foi possível abrir ' + f.name + ': ' + e.message, 3600); }
  renderMedia();
}
function assignMedia(id, kind) {
  const comp = cur(); let i = comp.layers.findIndex(l => l.type === kind && !MEDIA[l.p.media]);
  if (i < 0) i = comp.layers.findIndex(l => l.type === kind);
  if (i < 0) { comp.layers.push(mk(kind, kind === 'video' ? 'VÍDEO' : kind === 'model' ? 'OBJETO 3D' : kind === 'splat' ? 'SPLAT 3D' : 'IMAGEM', true)); i = comp.layers.length - 1; buildStage(); }
  comp.layers[i].p.media = id; comp.layers[i].on = true; ST.sel = i; syncLayerDom(); renderLayers(); renderParams(); commit();
  toast(`${MEDIA[id].name} → L${i} · ${comp.layers[i].name}`);
}
vp.addEventListener('dragover', e => { e.preventDefault(); vp.classList.add('dragover'); });
vp.addEventListener('dragleave', () => vp.classList.remove('dragover'));
vp.addEventListener('drop', e => { e.preventDefault(); vp.classList.remove('dragover'); [...(e.dataTransfer?.files || [])].forEach(importFile); });

/* ---------- manipulação direta ---------- */
let drag = null;
vp.addEventListener('pointerdown', e => {
  if (e.button !== 0) return;
  if (ST.exploded) { drag = { m: 'rot', x: e.clientX, y: e.clientY, rx: ST.rx, rz: ST.rz }; rig.classList.add('drag'); vp.setPointerCapture(e.pointerId); return; }
  const L = cur().layers[ST.sel]; if (!L) return;
  const p = pm(L); drag = { m: e.shiftKey ? 'scale' : e.altKey ? 'rotate' : 'move', x: e.clientX, y: e.clientY, p0: { x: p.x, y: p.y, sx: p.sx, sy: p.sy, rot: p.rot }, L };
  vp.setPointerCapture(e.pointerId);
});
vp.addEventListener('pointermove', e => {
  if (!drag) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (drag.m === 'rot') { ST.rz = drag.rz + dx * 0.3; ST.rx = clamp(drag.rx - dy * 0.25, 10, 80); rig.style.setProperty('--rz', ST.rz + 'deg'); rig.style.setProperty('--rx', ST.rx + 'deg'); return; }
  const s = ST.fitS * ST.zoom, L = drag.L, pr = pane('par');
  if (drag.m === 'move') { L.p.x = Math.round(drag.p0.x + dx / s); L.p.y = Math.round(drag.p0.y + dy / s); setCtlValue(pr, 'x', L.p.x); setCtlValue(pr, 'y', L.p.y); }
  if (drag.m === 'scale') { const k = Math.max(0.01, 1 - dy / 200); L.p.sx = +(drag.p0.sx * k).toFixed(3); L.p.sy = +(drag.p0.sy * k).toFixed(3); setCtlValue(pr, 'sx', L.p.sx); setCtlValue(pr, 'sy', L.p.sy); }
  if (drag.m === 'rotate') { L.p.rot = +(drag.p0.rot + dx * 0.4).toFixed(1); setCtlValue(pr, 'rot', L.p.rot); }
});
const endDrag = () => { if (drag && drag.m !== 'rot') commit(); drag = null; rig.classList.remove('drag'); };
vp.addEventListener('pointerup', endDrag); vp.addEventListener('pointercancel', endDrag);
vp.addEventListener('wheel', e => { if (!e.ctrlKey) return; e.preventDefault(); ST.zoom = clamp(ST.zoom * (e.deltaY < 0 ? 1.1 : 0.9), 0.1, 16); fit(); }, { passive: false });

/* ---------- teclado ---------- */
addEventListener('keydown', e => {
  { const mod = e.ctrlKey || e.metaKey, kk = e.key.toLowerCase();
    if (mod && !e.altKey && (kk === 'z' || kk === 'y')) { if (editingText(e.target)) return; e.preventDefault(); if (kk === 'y' || e.shiftKey) redo(); else undo(); return; } }
  if (e.key === 'Escape' && !$('#wiz').hidden) { e.preventDefault(); closeWiz(); return; }   // o cursor já está na caixa de colar JSON: Esc tem de fechar mesmo assim
  if (e.target.closest('input,textarea,select,[contenteditable]')) return;
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (!$('#wiz').hidden) { if (e.key === 'Escape') closeWiz(); return; }
  const k = e.key.toLowerCase();
  if (e.shiftKey && /^Digit[1-9]$/.test(e.code)) { selectComp(+e.code.slice(5) - 1); return; }
  if (/^[0-9]$/.test(e.key)) { toggleLayer(+e.key); return; }
  switch (k) {
    case ' ': e.preventDefault(); tap(); break;
    case 'enter': if (e.target.closest('button,a,summary')) break; e.preventDefault(); resync(); toast('Downbeat alinhado', 900); break;
    case 'arrowup': e.preventDefault(); setBpm(P.time.bpm + (e.shiftKey ? 5 : 1)); break;
    case 'arrowdown': e.preventDefault(); setBpm(P.time.bpm - (e.shiftKey ? 5 : 1)); break;
    case 'p': setPause(!ST.paused); break;
    case 'e': setExplode(!ST.exploded); break;
    case 's': $('#stepBtn').click(); break;
    case 'c': cycleAccent(); break;
    case 'a': $('#audBtn').click(); break;
    case 'r': recToggle(); break;
    case 'h': { const a = $('#app'); a.classList.toggle('clean'); setTimeout(fit, 30); break; }
    case 'f': toggleFs(); break;
    case 'g': $('#panelOpen').click(); break;
    case ',': if (!ST.paused) setPause(true); ST.n = Math.max(0, ST.n - 1); break;
    case '.': if (!ST.paused) setPause(true); ST.n += 1; break;
    case 'escape': if ($('#app').classList.contains('clean')) { $('#app').classList.remove('clean'); setTimeout(fit, 30); } break;
  }
});

/* ---------- carregar briefing, ou gerar sem IA na aba Gerar ---------- */
function openWiz() { $('#wiz').hidden = false; setTimeout(() => $('#wJson').focus(), 30); }
function closeWiz() { $('#wiz').hidden = true; store.set('seenWiz', true); }
$('#wClose').onclick = closeWiz;
$('#wSkip').onclick = () => { closeWiz(); setMode('standard'); };
$('#wImport').onclick = () => { if (importJson($('#wJson').value)) closeWiz(); };
$('#wFile').onchange = e => { const f = e.target.files[0]; if (f) f.text().then(t => { if (importJson(t)) closeWiz(); }); };

/* ---------- boot ---------- */
function boot() {
  ST.quality = store.get('quality', 0.75);
  let embedded = null;
  try { const raw = $('#project').textContent.trim(); if (raw && raw[0] === '{') embedded = normalize(JSON.parse(raw)); } catch (e) { console.warn('JSON embutido inválido', e); }
  const saved = store.get('state', null);
  if (saved && saved.slots && saved.slots.standard) {
    try { SLOTS.standard = normalize(saved.slots.standard); if (saved.slots.briefing) SLOTS.briefing = normalize(saved.slots.briefing); ST.mode = saved.mode === 'briefing' && SLOTS.briefing ? 'briefing' : 'standard'; ST.ci = saved.ci || 0; } catch (e) { SLOTS = { standard: standardProject(), briefing: null }; }
  }
  if (embedded && (!SLOTS.briefing || SLOTS.briefing.id !== embedded.id)) { SLOTS.briefing = embedded; ST.mode = 'briefing'; ST.ci = 0; }
  P = SLOTS[ST.mode]; ST.ci = Math.min(ST.ci, P.compositions.length - 1); SEED = P.seed;
  buildGrain(); rememberOrig(); renderGuide(); gateCode(P); EXP.luma = P.palette.mode === 'white-alpha';
  if (embedded) loadAssets(embedded); if (P !== embedded) loadAssets(P);
  $('#codeYes').onclick = allowCode; $('#codeNo').onclick = () => { $('#codeBan').hidden = true; };
  const tab = store.get('tab', 'par'); const tb = $(`#tabs [data-tab="${tab}"]`); if (tb && tab !== 'comp' && tab !== 'lay') tb.click(); setLib(store.get('libTab', 'comp')); if (store.get('libOpen', innerWidth >= 1280) === false) openLib(false);
  new ResizeObserver(() => fit()).observe(vp);
  refreshAll(); lastSnap = snap(); initLangHelp();
  document.fonts && document.fonts.load('800 40px "Martian Mono"').catch(() => {});
  if (!embedded && !saved && !store.get('seenWiz', false)) openWiz();
  raf = requestAnimationFrame(tick);
  window.AIVJ = { version: VERSION, addPop: ADDPOP, timeline: TIMELINE, get PAL() { return PAL; }, get RECIPES() { return RECIPES; }, addRecipe, addTestCards, recipeLayer, importFile, parseModel, setLang, setHow, undo, redo, evalExpr, applyTheme, layoutApply, setPanelOpen, setZoneDraw, get hist() { return ST.hist.length; }, get histLabels() { return ST.hl.slice(); }, surface: SC, specOf, applyCalc, renderSpec, specMarkdown, get project() { return P; }, get audio() { return AUD; }, AUDIOSEM, DEPTH, pseudoAudio, synthTimes, applyMods, motionCurve, GENAI, EVALUATOR, flash: FLASH, ONSET, UX, fx: { FX, body: fxBody, op: fxOp }, synth: { SYN, src: synthSrc }, blobs: { X: BLOBX }, layerErrors: () => [...LAYER_ERR.values()], mp4: { X: MP4X, render: mp4Render, run: exportMp4Run }, isf: { X: ISFX, LIB: ISFLIB, lib: isfLib }, modUI: { render: modPanel, params: modNumericParams, sources: MOD_SOURCES }, expRun: exportRun, EXP, surfx: SURFX, region: regionRect, surUI: { state: SUR, applyPreset: surApplyPreset, render: renderSurface }, COMPOSITION, SURFACEIR, ANIMATION, CREATIVE, FIELD: { FLD, GLY, body: fldBody }, SOLID: { SOL, body: solBody }, PARTICLES: { PRT, prog: prtProg }, MIGRATE, applyMods, RG, TM, composeFrame, buildComposeGraph: buildComposeGraph, frameAt, canvasPool: CANVAS_POOL, webgl: WEBGL, glProgram: body => glProg(body), glError: body => GL.err.get(body), glInfo: () => { glInit(); return GL.r ? { version: GL.r.version, context: GL.gl.constructor.name, glsl: GL.gl.getParameter(GL.gl.SHADING_LANGUAGE_VERSION), caps: GL.r.caps, stats: GL.r.stats } : { failure: GL.failure }; }, glMetrics: () => GL.r ? GL.r.metrics() : null, glr: () => GL.r, presets: SURFACE_PRESETS, GEN, FAMILIES, COMMON, modSources: () => MOD_SOURCES.map(x => x[0]), evaluate: lang => EVALUATOR.run(lang), critique: (lang, opts) => CRITIQUE.run(lang, opts), shaderResolve, GLIB, specBins, simBake, parsePly, get LAYERERR() { return LAYER_ERR; }, setSeed, bpmWaves, get GLERR() { return GL.err; }, layerFrame, pm, importJson, frameAt, validate: o => validate(o), GEN, loopFrames, contactSheet, layerAudit, allowCode, loadAssets, toLogo, projectOut, get state() { return ST; }, geom, lintCode, compileCode, setCi(i) { ST.ci = i; refreshAll(); },
    /* gancho de teste: renderiza a composição ci no quadro n, determinístico, sem tocar no preview */
    renderFrame(ci, n, scale = 0.25, alpha = false) {
      const comp = P.compositions[ci], W = P.canvas.w, H = P.canvas.h, w = Math.round(W * scale), h = Math.round(H * scale);
      const a = document.createElement('canvas'); a.width = w; a.height = h; const ac = a.getContext('2d', { willReadFrequently: true });
      const live = ST.live; ST.live = false; RENDER_ALPHA = alpha; EXPORTING = true; TM.resetAll();
      try { composeFrame(comp, frameAt(n, comp), { target: a, scale, W, H, skip: (i, L) => alpha && L.type === 'bg' }); }
      finally { ST.live = live; RENDER_ALPHA = false; EXPORTING = false; }
      return ac.getImageData(0, 0, w, h);
    } };
}
async function qaRun() {
  ST.qa = true; const host = document.createElement('div'); host.id = 'aivj-qa'; host.hidden = true; document.body.appendChild(host);
  try {
    ST.codeAllow = true; const b = $('#codeBan'); if (b) b.hidden = true; const w = $('#wiz'); if (w) w.hidden = true;
    await Promise.all(ASSET_JOBS); await (document.fonts && document.fonts.ready); await new Promise(r => setTimeout(r, 300));
    const rep = { name: P.meta.name, canvas: P.canvas, bpm: P.time.bpm, bars: P.time.bars, loopFrames: loopFrames(), comps: [] };
    for (let i = 0; i < P.compositions.length; i++) {
      const comp = P.compositions[i], v = validate({ scale: 1, fps: P.canvas.fps, comps: [i], alpha: true, start: 0, end: loopFrames() - 1, layers: false, layerCount: comp.layers.filter(l => l.on).length });
      const cv = contactSheet(i, { width: 2000 }); host.insertAdjacentHTML('beforeend', `<img data-ci="${i}" src="${cv.toDataURL('image/png')}">`);
      rep.comps.push({ i, name: comp.name, issues: v.out.map(x => ({ lvl: x.lvl, t: x.t, m: x.m })) });
    }
    const sc = document.createElement('script'); sc.type = 'application/json'; sc.id = 'aivj-qa-json'; sc.textContent = JSON.stringify(rep).replace(/</g, '\\u003c'); host.appendChild(sc);
  } catch (e) { host.setAttribute('data-error', String((e && e.message) || e)); }
  host.setAttribute('data-done', '1');
}
boot(); UX.init();
/* parâmetros de URL: ?stage=1 (só a imagem) &alpha=1 (fundo transparente) &comp=N (composição, de 1) &play=0 (pausado) &q=1 (qualidade) */
(function urlParams() {
  const q = new URLSearchParams(location.search), has = k => q.has(k);
  if (has('comp')) { const i = Math.max(0, Math.min(P.compositions.length - 1, (parseInt(q.get('comp'), 10) || 1) - 1)); ST.ci = i; refreshAll(); }
  if (q.get('stage') === '1') {
    document.documentElement.classList.add('stagemode'); $('#app').classList.add('clean');
    if (q.get('alpha') === '1') { ST.alphaStage = true; buildStage(); }
    if (q.has('q')) ST.quality = Math.max(0.25, Math.min(2, parseFloat(q.get('q')) || 1));
    setTimeout(fit, 30); addEventListener('resize', () => setTimeout(fit, 30));
  }
  if (q.get('play') === '0') ST.paused = true;
})();
if (/[?&]qa=1/.test(location.search)) qaRun();
