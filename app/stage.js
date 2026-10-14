/* DOM do palco, loop principal, miniaturas, transições, histórico, toast e controles genéricos (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores STAGE. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- DOM do palco ---------- */
const DOM = { layers: [] };
const stage = $('#stage'), rig = $('#rig'), vp = $('#vp'), fitEl = $('#fit'), over = $('#over'), trans = $('#trans');
function buildStage() {
  const comp = cur(), W = P.canvas.w, H = P.canvas.h;
  rig.innerHTML = ''; DOM.layers = [];
  const cw = Math.max(1, Math.round(W * ST.ps)), ch = Math.max(1, Math.round(H * ST.ps));
  comp.layers.forEach((L, i) => {
    const d = document.createElement('div'); d.className = 'layer'; d.style.setProperty('--i', i);
    const cv = document.createElement('canvas'); cv.width = cw; cv.height = ch; d.appendChild(cv); rig.appendChild(d);
    DOM.layers.push({ el: d, cv, ctx: cv.getContext('2d') });
  });
  trans.width = cw; trans.height = ch;
  stage.style.setProperty('--mid', (comp.layers.length - 1) / 2);
  stage.style.setProperty('--gap', Math.round(H * 0.1));
  stage.style.setProperty('--lab', Math.round(H * 0.032));
  stage.style.setProperty('--H', H);
  syncLayerDom();
}
function syncLayerDom() {
  const comp = cur();
  comp.layers.forEach((L, i) => {
    const D = DOM.layers[i]; if (!D) return;
    D.el.classList.toggle('off', !isVis(i)); D.el.classList.toggle('sel', ST.sel === i);
    D.el.style.opacity = L.opacity; D.el.style.mixBlendMode = (BLENDS[L.blend] || BLENDS.normal)[1];
    D.el.dataset.name = `L${i} · ${L.name}`;
  });
}
function fit() {
  const W = P.canvas.w, H = P.canvas.h, r = vp.getBoundingClientRect();
  const base = Math.max(0.01, Math.min((r.width - 16) / W, (r.height - 16) / H));
  ST.fitS = base; const s = base * ST.zoom;
  fitEl.style.width = W * s + 'px'; fitEl.style.height = H * s + 'px';
  stage.style.width = W + 'px'; stage.style.height = H + 'px'; stage.style.transform = `scale(${s})`;
  vp.classList.toggle('zoomed', ST.zoom > 1.001);
  const ps = Math.min(1, s * (window.devicePixelRatio || 1) * ST.quality, Math.sqrt(3.2e6 / (W * H)));
  if (Math.abs(ps - ST.ps) / ST.ps > 0.06 || DOM.layers.length !== cur().layers.length) { ST.ps = Math.max(0.05, ps); buildStage(); }
  drawOverlay();
  $('#vRes').textContent = `${W}×${H} · ${aspectName(W, H)} · ${Math.round(s * 100)}%`;
}
function aspectName(W, H) { const g = (a, b) => b ? g(b, a % b) : a, d = g(W, H); const a = W / d, b = H / d; return a > 50 || b > 50 ? (W / H).toFixed(2) + ':1' : `${a}:${b}`; }
function drawOverlay() {
  const W = P.canvas.w, H = P.canvas.h, s = P.canvas.safe || 0.05;
  over.setAttribute('viewBox', `0 0 ${W} ${H}`);
  let h = '';
  const sw = `stroke="#fff" vector-effect="non-scaling-stroke" fill="none"`;
  if (ST.safe) h += `<rect x="${W * s}" y="${H * s}" width="${W * (1 - 2 * s)}" height="${H * (1 - 2 * s)}" ${sw} stroke-dasharray="6 6" stroke-opacity=".7"/>`;
  if (ST.grid) { for (let i = 1; i < 3; i++) h += `<line x1="${W * i / 3}" y1="0" x2="${W * i / 3}" y2="${H}" ${sw} stroke-opacity=".35"/><line x1="0" y1="${H * i / 3}" x2="${W}" y2="${H * i / 3}" ${sw} stroke-opacity=".35"/>`; h += `<line x1="${W / 2}" y1="0" x2="${W / 2}" y2="${H}" ${sw} stroke-opacity=".6"/><line x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}" ${sw} stroke-opacity=".6"/>`; }
  (P.canvas.displays || []).forEach((d, i) => { h += `<rect x="${d.x}" y="${d.y}" width="${d.w}" height="${d.h}" ${sw} stroke-opacity=".8"/><text x="${d.x + 8}" y="${d.y + 22}" fill="#fff" font-family="monospace" font-size="${Math.max(14, H * 0.02)}">D${pad(i + 1, 2)}</text>`; });
  if (ST.zones !== false) { const Z = (P.meta.spec && P.meta.spec.zones) || {}; Object.entries(Z).forEach(([name, zs]) => (Array.isArray(zs) ? zs : [zs]).forEach(z => { if (!z || !(+z.w > 0) || !(+z.h > 0)) return; const zx = +z.x * W, zy = +z.y * H, zw = +z.w * W, zh = +z.h * H; h += `<rect x="${zx}" y="${zy}" width="${zw}" height="${zh}" fill="#fff" fill-opacity=".12" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" stroke-opacity=".95" stroke-dasharray="8 6"/><text x="${zx + 10}" y="${zy + 26}" fill="#fff" stroke="#000" stroke-width="4" paint-order="stroke" font-family="monospace" font-size="${Math.max(16, H / 36)}">${esc(name)}</text>`; })); }
  if (ST.foldGuide !== false) { const gu = (P.canvas.gutter ?? 90) * unitOf(W, H); (P.canvas.folds || []).forEach(f => { h += `<rect x="${f - gu / 2}" y="0" width="${gu}" height="${H}" fill="#ff2a3d" fill-opacity=".16"/><line x1="${f}" y1="0" x2="${f}" y2="${H}" stroke="#ff2a3d" vector-effect="non-scaling-stroke" stroke-dasharray="8 6"/>`; }); }
  if (ST.zoneTmp) { const z = ST.zoneTmp; h += `<rect x="${z.x * W}" y="${z.y * H}" width="${z.w * W}" height="${z.h * H}" fill="#fff" fill-opacity=".16" stroke="#fff" stroke-width="2" vector-effect="non-scaling-stroke" stroke-dasharray="4 4"/>`; }
  over.innerHTML = h;
}

/* ---------- loop principal ---------- */
let raf = 0, lastT = performance.now(), thumbTick = 0, EXPORTING = false;
const COMP_CV = document.createElement('canvas'), COMP_CTX = COMP_CV.getContext('2d');
function liveFrame(now) {
  const fps = P.canvas.fps;
  if (P.time.mode === 'audio' && P.time.loop && AUD.live() && AUD.rms < 0.04) ST.t0 += now - ST.lastNow;
  ST.lastNow = now;
  if (ST.paused || (P.time.mode === 'manual' && P.time.loop)) { ST.t0 = now - ST.n / fps * 1000; return ST.n; }
  return Math.floor((now - ST.t0) / 1000 * fps);
}
function tick(now) {
  raf = requestAnimationFrame(tick);
  if (EXPORTING) return;
  const t0 = performance.now();
  AUD.update();
  ST.n = liveFrame(now);
  const comp = cur(), F = frameAt(ST.n, comp), W = P.canvas.w, H = P.canvas.h;
  ST.F = F;
  if (GL.r) GL.r.beginFrame();
  /* explodido: camadas desligadas aparecem como fantasma e atualizam a cada 6 quadros para poupar a GPU */
  comp.layers.forEach((L, i) => { const D = DOM.layers[i]; if (D && (isVis(i) || (ST.exploded && thumbTick % 6 === i % 6))) renderLayer(D.ctx, comp, L, i, F, ST.ps, W, H, BELOW_TYPES.has(L.type) ? fxLiveBelow(comp, i) : undefined); });
  if (GL.r) GL.r.endFrame();
  if (ST.manEv != null && F.beatF > ST.manEv + 32) ST.manEv = null;
  if (F.beat !== ST.lastBeat) { ST.lastBeat = F.beat; $$('#dots i').forEach((d, i) => d.classList.toggle('on', i === F.beat % 4)); }
  if (!scrubbing) { const s = $('#scrub'); s.max = F.LF - 1; s.value = F.n; }
  $('#vPos').textContent = `${pad(F.n, 4)}/${pad(F.LF, 4)} · C${pad(F.bar + 1, 2)}:${F.beat % 4 + 1}`;
  { const vf = $('#vFrame'); if (vf && document.activeElement !== vf) vf.value = F.n; }
  if (ST.tr) drawTransition(now);
  const needComp = REC.r || OUTS.length;
  if (needComp) {
    if (COMP_CV.width !== DOM.layers[0]?.cv.width || COMP_CV.height !== DOM.layers[0]?.cv.height) { COMP_CV.width = DOM.layers[0].cv.width; COMP_CV.height = DOM.layers[0].cv.height; }
    compositeTo(COMP_CTX, comp, DOM.layers.map(d => d.cv), { bgFill: '#000' });
    pumpOutputs();
  }
  if (++thumbTick % 24 === 0) drawThumb((thumbTick / 24) % P.compositions.length);
  const dt = now - lastT; lastT = now; ST.fpsA = ST.fpsA * 0.92 + (1000 / Math.max(1, dt)) * 0.08; ST.ms = ST.ms * 0.9 + (performance.now() - t0) * 0.1;
  if (thumbTick % 15 === 0) {
    const on = comp.layers.filter((_, i) => isVis(i)).length;
    $('#metrics').innerHTML = `FPS <b>${ST.fpsA.toFixed(0)}</b> · QUADRO <b>${ST.ms.toFixed(1)}MS</b> · PREVIEW <b>${DOM.layers[0]?.cv.width}×${DOM.layers[0]?.cv.height}</b> · CAMADAS <b>${on}</b> · GPU <b>N/D</b>`;
    if (ST.tab === 'aud') updateMeters();
  }
}

/* ---------- miniaturas ---------- */
const TH_SCR = document.createElement('canvas'), TH_SCR_CTX = TH_SCR.getContext('2d');
function drawThumb(ci) {
  const cv = $(`#th${ci}`); if (!cv) return;
  const comp = P.compositions[ci]; if (!comp) return;
  const W = P.canvas.w, H = P.canvas.h, w = 224, h = Math.max(8, Math.round(224 * H / W));
  if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h;
  TH_SCR.width = w; TH_SCR.height = h;
  const c = cv.getContext('2d'), F = frameAt(ST.n, comp), k = w / W;
  c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; c.fillStyle = '#000'; c.fillRect(0, 0, w, h);
  comp.layers.forEach((L, i) => {
    if (!L.on) return;
    renderLayer(TH_SCR_CTX, comp, L, i, F, k, W, H, BELOW_TYPES.has(L.type) ? cv : undefined);
    c.globalAlpha = L.opacity; c.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); c.drawImage(TH_SCR, 0, 0);
  });
  c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
}

/* ---------- transições entre composições ---------- */
function startTransition(prevComp) {
  const type = P.time.transition || 'cut'; if (type === 'cut' || !DOM.layers.length) return;
  const c = trans.getContext('2d'); trans.width = DOM.layers[0].cv.width; trans.height = DOM.layers[0].cv.height;
  compositeTo(c, prevComp, DOM.layers.map(d => d.cv), { bgFill: '#000', vis: i => prevComp.layers[i] && prevComp.layers[i].on });
  ST.tr = { type, start: performance.now(), dur: Math.max(60, (P.time.trBeats || 1) * beatMs()) };
}
function drawTransition(now) {
  const t = (now - ST.tr.start) / ST.tr.dur;
  if (t >= 1) { trans.style.opacity = 0; trans.style.clipPath = ''; trans.style.transform = ''; trans.style.filter = ''; trans.style.webkitMaskImage = trans.style.maskImage = ''; ST.tr = null; return; }
  const ty = ST.tr.type, ease = 1 - Math.pow(1 - t, 3), m = v => { trans.style.webkitMaskImage = trans.style.maskImage = v; };
  if (ty === 'zoom') { trans.style.opacity = 1 - ease; trans.style.transform = `scale(${1 + ease * 1.6})`; }
  else if (ty === 'slide') { trans.style.opacity = 1; trans.style.transform = `translateX(${-ease * 100}%)`; }
  else if (ty === 'iris') { trans.style.opacity = 1; m(`radial-gradient(circle at 50% 50%, transparent ${(ease * 78).toFixed(2)}%, #000 ${(ease * 78 + 0.6).toFixed(2)}%)`); }
  else if (ty === 'blinds') { trans.style.opacity = 1; const a = ((1 - ease) * 10).toFixed(3); m(`repeating-linear-gradient(90deg, #000 0, #000 ${a}%, transparent ${a}%, transparent 10%)`); }
  else if (ty === 'crosszoom') { trans.style.opacity = 1 - ease; trans.style.transform = `scale(${1 + ease * 3.2})`; trans.style.filter = `blur(${(ease * 14).toFixed(1)}px)`; }
  else if (ty === 'spin') { trans.style.opacity = 1 - ease; trans.style.transform = `rotate(${(ease * 120).toFixed(2)}deg) scale(${1 + ease * 1.2})`; }
  else if (ty === 'radial') { trans.style.opacity = 1; m(`conic-gradient(from 0deg at 50% 50%, transparent ${(ease * 100).toFixed(2)}%, #000 ${(ease * 100 + 0.4).toFixed(2)}%)`); }
  else if (ty === 'diagonal') { trans.style.opacity = 1; const q = (ease * 140 - 20).toFixed(2); m(`linear-gradient(135deg, transparent ${q}%, #000 ${(+q + 0.6).toFixed(2)}%)`); }
  else if (ty === 'slices') { trans.style.opacity = 1; const a = ((1 - ease) * 8).toFixed(3); m(`repeating-linear-gradient(0deg, #000 0, #000 ${a}%, transparent ${a}%, transparent 8%)`); }
  else if (ty === 'flip') { trans.style.opacity = 1 - Math.max(0, ease - 0.5) * 2; trans.style.transform = `perspective(1400px) rotateY(${(ease * 90).toFixed(2)}deg)`; }
  else if (ty === 'blur') { trans.style.opacity = 1 - ease; trans.style.filter = `blur(${(ease * 28).toFixed(1)}px)`; }
  else if (ty === 'drop') { trans.style.opacity = 1; trans.style.transform = `translateY(${(ease * ease * 110).toFixed(2)}%) rotate(${(ease * 8).toFixed(2)}deg)`; }
  else if (ty === 'fade') { trans.style.opacity = 1 - t; }
  else if (ST.tr.type === 'wipe') { trans.style.opacity = 1; trans.style.clipPath = `inset(0 0 0 ${t * 100}%)`; }
  else { const on = hr(Math.floor(now / 40), 3) > t; trans.style.opacity = on ? 1 : 0; trans.style.transform = `translateX(${(hr(Math.floor(now / 40), 4) - 0.5) * 40}px)`; }
}

/* ---------- histórico / autosave ---------- */
let commitT = 0, lastSnap = '';
const snap = () => JSON.stringify({ mode: ST.mode, ci: ST.ci, slots: SLOTS }, (k, v) => k === 'assets' ? undefined : v);
function restore(s) {
  const o = JSON.parse(s), keep = {}; for (const q in SLOTS) if (SLOTS[q]) keep[SLOTS[q].id] = SLOTS[q].assets; SLOTS = o.slots; for (const q in SLOTS) if (SLOTS[q]) SLOTS[q].assets = keep[SLOTS[q].id] || {}; ST.mode = o.mode; P = SLOTS[ST.mode] || SLOTS.standard; ST.ci = Math.min(o.ci || 0, P.compositions.length - 1);
  SEED = P.seed; buildGrain(); lastSnap = s; ST.sel = Math.min(ST.sel, cur().layers.length - 1); refreshAll();
}
/* undo, redo, commit: ver bloco V5 de histórico */

/* ---------- toast ---------- */
let toastT = 0;
function toast(msg, ms = 2400) { const t = $('#toast'); t.textContent = msg; t.style.display = 'block'; clearTimeout(toastT); toastT = setTimeout(() => t.style.display = 'none', ms); }

/* ---------- controles genéricos ---------- */
let uidN = 0; const uid = () => 'c' + (++uidN);
function colorCtl(d, val, id) {
  const isKey = PKEYS.includes(val) || val === 'none' || val === 'auto';
  const opts = [...(d.d === 'none' ? ['none'] : []), ...(d.d === 'auto' ? ['auto'] : []), ...PKEYS, 'livre'];
  return `<div class="pc col" data-k="${d.k}" data-t="c"><label for="${id}">${esc(d.l)}</label><input type="color" value="${isKey ? (val === 'none' || val === 'auto' ? '#ffffff' : col(cur(), val)) : val}" data-cc aria-label="${esc(d.l)} hex">
    <select id="${id}" data-cs>${opts.map(o => `<option value="${o}" ${(isKey ? val : 'livre') === o ? 'selected' : ''}>${o === 'livre' ? 'HEX LIVRE' : o === 'none' ? 'ORIGINAL' : o === 'auto' ? 'AUTO' : PNAMES[o]}</option>`).join('')}</select><button class="rs" data-reset title="Restaurar padrão">↺</button></div>`;
}
function ctlHtml(d, val) {
  const id = uid();
  if (d.t === 'n') return `<div class="pc" data-k="${d.k}" data-t="n"><label for="${id}" title="${esc(d.l)}">${esc(d.l)}</label><input type="range" min="${d.min}" max="${d.max}" step="${d.step}" value="${val}" data-r data-def="${d.d}" aria-label="${esc(d.l)}"><input id="${id}" type="text" inputmode="decimal" autocomplete="off" spellcheck="false" data-min="${d.min}" data-max="${d.max}" data-step="${d.step}" data-last="${+(+val).toFixed(4)}" value="${+(+val).toFixed(4)}" data-num title="Digite um número ou uma conta, como 120/2. Setas ajustam; Shift ×10, Alt ×0,1."><button class="rs" data-reset title="Restaurar ${esc(d.l)}">↺</button></div>`;
  if (d.t === 's') {
    let opts = d.opts;
    if (/^mediad?$/.test(d.k)) opts = ['', ...Object.keys(MEDIA).filter(k => MEDIA[k].kind === (d === GEN.video.params[0] ? 'video' : d === GEN.model.params[0] ? 'model' : d === GEN.splat.params[0] ? 'splat' : 'image'))];
    if (d.k === 'font') opts = ['mono', 'helvetica', 'archivo', 'bebas', ...CUSTOM_FONTS];
    return `<div class="pc wide" data-k="${d.k}" data-t="s"><label for="${id}">${esc(d.l)}</label><select id="${id}" data-s>${opts.map(o => `<option value="${esc(o)}" ${String(o) === String(val) ? 'selected' : ''}>${esc(/^mediad?$/.test(d.k) ? (o ? MEDIA[o]?.name || o : '— nenhum —') : o)}</option>`).join('')}${d.k === 'media' && val && !MEDIA[val] ? `<option selected value="${esc(val)}">AUSENTE: ${esc(val)}</option>` : ''}</select><button class="rs" data-reset title="Restaurar">↺</button></div>`;
  }
  if (d.t === 'b') return `<div class="pc wide" data-k="${d.k}" data-t="b"><label>${esc(d.l)}</label><button class="tg" data-b aria-pressed="${!!val}" aria-label="${esc(d.l)}"></button><button class="rs" data-reset title="Restaurar">↺</button></div>`;
  if (d.t === 'c') return colorCtl(d, val, id);
  if (d.t === 't') return d.area ? `<div class="pc ta" data-k="${d.k}" data-t="t"><label class="lbl" for="${id}">${esc(d.l)}</label><textarea id="${id}" rows="${d.k === 'src' ? 12 : 4}" data-tx spellcheck="false">${esc(val)}</textarea></div>`
    : `<div class="pc wide" data-k="${d.k}" data-t="t"><label for="${id}">${esc(d.l)}</label><input type="text" id="${id}" value="${esc(val)}" data-tx><button class="rs" data-reset title="Restaurar">↺</button></div>`;
  return '';
}
function bindCtls(root, defs, get, set) {
  const def = k => defs.find(d => d.k === k);
  root.addEventListener('input', e => {
    const row = e.target.closest('.pc'); if (!row) return; const k = row.dataset.k, d = def(k); if (!d) return;
    if (e.target.matches('[data-r]')) { const v = +e.target.value; row.querySelector('[data-num]').value = +v.toFixed(4); set(k, v); }
    else if (e.target.matches('[data-tx]')) set(k, e.target.value);
    else if (e.target.matches('[data-cc]')) { set(k, e.target.value); row.querySelector('[data-cs]').value = 'livre'; }
  });
  root.addEventListener('change', e => {
    const row = e.target.closest('.pc'); if (!row) return; const k = row.dataset.k, d = def(k); if (!d) return;
    if (e.target.matches('[data-num]')) { let v = evalExpr(e.target.value); if (!isFinite(v)) { e.target.classList.add('bad'); toast('Valor inválido. Digite um número ou uma conta, como 120/2.', 1800); const lastV = parseFloat(e.target.dataset.last); v = isFinite(lastV) ? lastV : d.d; setTimeout(() => e.target.classList.remove('bad'), 700); } v = clamp(v, d.min, d.max); e.target.value = +v.toFixed(4); e.target.dataset.last = e.target.value; row.querySelector('[data-r]').value = v; set(k, v); }
    else if (e.target.matches('[data-s]')) set(k, e.target.value);
    else if (e.target.matches('[data-cs]')) { const v = e.target.value; if (v !== 'livre') { set(k, v); row.querySelector('[data-cc]').value = (v === 'none' || v === 'auto') ? '#ffffff' : col(cur(), v); } else set(k, row.querySelector('[data-cc]').value); }
    commit();
  });
  root.addEventListener('keydown', e => { if (e.target.matches('[data-num]') && e.key === 'Enter') e.target.dispatchEvent(new Event('change', { bubbles: true })); });
  root.addEventListener('click', e => {
    const row = e.target.closest('.pc'); if (!row) return; const k = row.dataset.k, d = def(k); if (!d) return;
    if (e.target.matches('[data-b]')) { const v = !(e.target.getAttribute('aria-pressed') === 'true'); e.target.setAttribute('aria-pressed', v); set(k, v); commit(); }
    if (e.target.matches('[data-reset]')) { set(k, undefined); const v = get(k); const tmp = document.createElement('div'); tmp.innerHTML = ctlHtml(d, v); row.replaceWith(tmp.firstElementChild); commit(); }
  });
}
function setCtlValue(root, k, v) { const row = root.querySelector(`.pc[data-k="${k}"]`); if (!row) return; const r = row.querySelector('[data-r]'), n = row.querySelector('[data-num]'); if (r) { r.value = v; SLIDERUI.sync(r); } if (n) { n.value = +(+v).toFixed(2); n.dataset.last = n.value; } }
