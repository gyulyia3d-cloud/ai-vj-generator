/* Timeline (fase 14b). T1 lê: o loop como janela, com régua de compassos e batidas, fases da composição, eventos na batida,
   uma faixa por camada (comportamento temporal, atraso em semicolcheias, ciclos de LFO) e uma faixa de áudio.
   T2 edita só o que já existe, sem campo novo no esquema (sem migração): arrastar a barra de uma camada (ou setas na faixa) muda L.p.phase em passos inteiros
   de semicolcheia, e arrastar um evento (ou setas) muda meta.animationIR[].events[].beat em batidas inteiras, sem passar do vizinho. Um gesto = uma entrada no
   histórico; Esc cancela o arrasto. O atraso muda o render; o evento é só anotação do plano (nada no render lê events). Fases e eventos vêm de meta.compositionIR e meta.animationIR
   (projeto escrito à mão sem eles mostra só a régua e as camadas, e diz isso). O áudio da régua é o sintético do BPM (pseudoAudio), nunca o ao vivo.
   A cabeça de leitura é um elemento só que se move por quadro; o resto é refeito quando a assinatura do que ele mostra muda.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores TIMELINE. */
const TIMELINE = (() => {
  const root = () => $('#tl');
  const S = { open: store.get('tlOpen', null), h: store.get('tlH', 190), sig: '', tickN: 0, lastN: -1 };
  const pct = f => (Math.max(0, Math.min(1, f)) * 100).toFixed(3) + '%';
  const irOf = (arr, ci) => Array.isArray(arr) ? arr[ci] : null;

  function model() {
    const comp = cur(), ci = ST.ci, M = P.meta || {}, cir = irOf(M.compositionIR, ci), ani = irOf(M.animationIR, ci);
    const LF = loopFrames(), bars = P.time.bars, fps = P.canvas.fps;
    const phases = cir && cir.temporal && Array.isArray(cir.temporal.phases) ? cir.temporal.phases.map((p, k, a) => ({ name: p.name, from: p.at, to: k + 1 < a.length ? a[k + 1].at : 1 })) : [];
    const events = ani && Array.isArray(ani.events) ? ani.events.map((e, k) => ({ k, name: e.name, at: e.at, beat: e.beat })) : [];
    const lanes = comp.layers.map((L, i) => {
      const tp = L.temporal && typeof L.temporal === 'object' ? L.temporal : null;
      const phase = L.p && isFinite(+L.p.phase) ? +L.p.phase : 0, steps = Math.round(phase * bars * 16 * 1000) / 1000;
      const mods = Array.isArray(L.mod) ? L.mod.filter(m => m && m.src === 'lfo' && m.shape !== 'env' && isFinite(+m.cycles)) : [];
      return { i, name: L.name || L.type, type: L.type, on: !!L.on, behavior: tp ? tp.behavior : null, listens: tp && Array.isArray(tp.listens) ? tp.listens : [], phase: ((phase % 1) + 1) % 1, steps, cycles: mods.length ? Math.max(...mods.map(m => Math.round(+m.cycles))) : 0 };
    });
    return { LF, bars, fps, bpm: P.time.bpm, ci, lanes, phases, events, hasIR: !!(cir || ani), loop: !!P.time.loop, seamless: !!P.time.seamless, mode: P.time.mode };
  }
  const signature = m => JSON.stringify([m.LF, m.bars, m.bpm, m.ci, m.hasIR, m.phases, m.events, m.lanes, ST.sel, ST.lang, m.mode]);

  function rulerHtml(m) {
    const beats = m.bars * 4, out = [];
    for (let b = 0; b < beats; b++) out.push(`<i class="${b % 4 === 0 ? 'bar' : 'beat'}" style="left:${pct(b / beats)}">${b % 4 === 0 ? `<b>C${pad(b / 4 + 1, 2)}</b>` : ''}</i>`);
    return out.join('');
  }
  const r1 = x => Math.round(x * 10) / 10;
  function laneInner(ln) {
    const beh = ln.behavior, label = beh ? beh.toUpperCase() : T3('SEM COMPORTAMENTO', 'NO BEHAVIOUR');
    const ticks = ln.cycles ? Array.from({ length: ln.cycles }, (_, k) => `<u style="left:${pct(((k / ln.cycles) + ln.phase) % 1)}"></u>`).join('') : '';
    const bar = ln.phase > 0
      ? `<span class="bar ${beh || 'none'}" data-part="main" style="left:${pct(ln.phase)};width:${pct(1 - ln.phase)}"></span><span class="bar wrap ${beh || 'none'}" data-part="wrap" style="left:0;width:${pct(ln.phase)}"></span><em style="left:${pct(ln.phase)}"></em>`
      : `<span class="bar ${beh || 'none'}" data-part="main" style="left:0;width:100%"></span>`;
    return `${bar}${ticks}<small>${esc(label)}${ln.steps > 0 ? ' · +' + r1(ln.steps) + '/16' : ''}</small>`;
  }
  function laneAria(ln) {
    const beh = ln.behavior, label = beh ? beh.toUpperCase() : T3('SEM COMPORTAMENTO', 'NO BEHAVIOUR');
    const delay = ln.steps > 0 ? T3(`atraso ${r1(ln.steps)} semicolcheias`, `delay ${r1(ln.steps)} sixteenths`) : T3('sem atraso', 'no delay');
    const cyc = ln.cycles ? T3(`, LFO ${ln.cycles} ciclos por loop`, `, LFO ${ln.cycles} cycles per loop`) : '';
    const listens = ln.listens.length ? T3(`, ouve ${ln.listens.join('/')}`, `, listens ${ln.listens.join('/')}`) : T3(', não ouve a música', ', does not listen');
    return `${ln.name}: ${label}, ${delay}${cyc}${listens}${ln.on ? '' : T3(', desligada', ', off')}`;
  }
  function laneHtml(m, ln) {
    const sel = ln.i === ST.sel, S16 = m.bars * 16;
    return `<div class="tlrow ${sel ? 'sel' : ''} ${ln.on ? '' : 'off'}" data-i="${ln.i}"><span class="tlname" title="${esc(ln.name)}"><span class="k">L${ln.i}</span> ${esc(ln.name)}</span>
      <div class="tllane" role="slider" tabindex="0" aria-label="${esc(laneAria(ln))}" aria-valuemin="0" aria-valuemax="${S16 - 1}" aria-valuenow="${Math.round(ln.steps)}" aria-valuetext="${esc(T3(`atraso ${r1(ln.steps)} de ${S16} semicolcheias`, `delay ${r1(ln.steps)} of ${S16} sixteenths`))}" data-behavior="${esc(ln.behavior || '')}" data-steps="${ln.steps}" data-phase="${ln.phase}">${laneInner(ln)}</div></div>`;
  }

  function build() {
    const el = root(); if (!el || !$('#tlBody')) return;
    const m = model(); S.m = m;
    const strip = m.phases.length ? m.phases.map((p, k) => `<span class="ph p${k}" style="left:${pct(p.from)};width:${pct(p.to - p.from)}" data-phase="${esc(p.name)}">${esc(p.name)}</span>`).join('') : '';
    const evs = m.events.map(e => `<span class="ev" role="slider" tabindex="0" style="left:${pct(e.at)}" data-event="${esc(e.name)}" data-k="${e.k}" data-beat="${e.beat}" aria-label="${esc(T3('Evento ' + e.name + ' (anotação do plano, não muda o render)', 'Event ' + e.name + ' (plan note, does not change the render)'))}" aria-valuemin="0" aria-valuemax="${m.bars * 4 - 1}" aria-valuenow="${e.beat}" title="${esc(e.name)} · ${T3('batida', 'beat')} ${e.beat}"><b>${esc(e.name)}</b></span>`).join('');
    $('#tlBody').innerHTML = `
      <div class="tlrow tlhead"><span class="tlname"></span><div class="tlruler" id="tlRuler" role="slider" tabindex="0" aria-label="${T3('Posição no loop', 'Position in the loop')}" aria-valuemin="0" aria-valuemax="${m.LF - 1}" aria-valuenow="${Math.max(0, S.lastN)}">${rulerHtml(m)}</div></div>
      <div class="tlrow tlphases"><span class="tlname">${T3('FASES', 'PHASES')}</span><div class="tllane tlstrip">${strip}${evs}${m.hasIR ? '' : `<small class="tlnote">${T3('sem Animation IR neste projeto: só régua e camadas', 'no Animation IR in this project: ruler and layers only')}</small>`}</div></div>
      ${m.lanes.map(l => laneHtml(m, l)).join('')}
      <div class="tlrow tlaudio"><span class="tlname">${T3('ÁUDIO', 'AUDIO')}</span><div class="tllane"><canvas id="tlAud" width="800" height="36" role="img" aria-label="${T3('Bandas sintéticas do BPM ao longo do loop', 'Synthetic BPM bands across the loop')}"></canvas><small>${T3('SINTÉTICO DO BPM · graves, médios, agudos', 'SYNTHETIC FROM THE BPM · bass, mid, high')}</small></div></div>
      <div id="tlHead" aria-hidden="true"></div>`;
    $('#tlInfo').textContent = `${m.bars} ${T3('compassos', 'bars')} · ${m.bpm} BPM · ${m.LF} ${T3('quadros', 'frames')} · ${m.loop && m.seamless ? T3('LOOP FECHA', 'LOOP CLOSES') : m.loop ? 'LOOP' : T3('SEM LOOP', 'NO LOOP')}`;
    drawAudio(m); S.lastN = -1; place(ST.n); fitHead();
  }
  const fitHead = () => { const hd = $('#tlHead'), b = $('#tlBody'); if (hd && b) hd.style.height = b.scrollHeight + 'px'; };
  function drawAudio(m) {
    const cv = $('#tlAud'); if (!cv) return;
    const w = cv.clientWidth > 40 ? Math.round(cv.clientWidth) : 800, h = 36; cv.width = w; cv.height = h;
    const c = cv.getContext('2d'); c.clearRect(0, 0, w, h);
    const css = getComputedStyle(root()), cols = [css.getPropertyValue('--fg') || '#fff', css.getPropertyValue('--accent') || '#0f0', css.getPropertyValue('--dim') || '#999'];
    ['bass', 'mid', 'high'].forEach((band, bi) => {
      c.beginPath(); c.strokeStyle = cols[bi].trim() || '#fff'; c.lineWidth = bi === 0 ? 1.5 : 1; c.globalAlpha = bi === 0 ? 1 : 0.7;
      for (let x = 0; x < w; x++) { const F = { beatF: (x / w) * m.bars * 4, fps: m.fps, fpb: m.fps * 60 / m.bpm, LF: m.LF, ph: x / w, n: Math.round(x / w * m.LF) }; const v = clamp(pseudoAudio(F)[band], 0, 1); x ? c.lineTo(x, h - 2 - v * (h - 6)) : c.moveTo(x, h - 2 - v * (h - 6)); }
      c.stroke();
    });
    c.globalAlpha = 1;
  }
  function place(n) {
    const hd = $('#tlHead'), m = S.m; if (!hd || !m) return;
    hd.style.left = `calc(var(--tl-name) + (100% - var(--tl-name)) * ${(m.LF > 1 ? n / (m.LF - 1) : 0).toFixed(5)})`;
    const r = $('#tlRuler'); if (r) r.setAttribute('aria-valuenow', n);
    $('#tlPos').textContent = `${pad(n, 4)}/${pad(m.LF, 4)}`; S.lastN = n;
  }

  /* chamado por tick(): a cabeça acompanha o quadro; o resto só refaz quando a assinatura muda (conferida a cada 12 quadros) */
  function tick(F) {
    const el = root(); if (!el || !S.open) return;
    if (S.tickN++ % 12 === 0 && !drag) { const m = model(), s = signature(m); if (s !== S.sig) { S.sig = s; build(); } }
    if (F.n !== S.lastN) place(F.n);
  }

  function setOpen(v, persist = true) {
    S.open = !!v; const el = root(); if (!el) return;
    el.hidden = !S.open; $('#tlToggle').setAttribute('aria-expanded', S.open);
    $('#tlShow').hidden = S.open; $('#app').classList.toggle('tlopen', S.open);
    if (persist) store.set('tlOpen', S.open);
    if (S.open) { S.sig = ''; S.tickN = 0; }
    setTimeout(fit, 30);
  }
  function setHeight(h, persist) {
    const vh = $('#view').getBoundingClientRect().height || 600, max = Math.max(120, Math.round(vh * 0.55));
    S.h = clamp(Math.round(h), 110, max); root().style.setProperty('--tl-h', S.h + 'px'); $('#app').style.setProperty('--tl-h', S.h + 'px'); if (persist) store.set('tlH', S.h); setTimeout(() => { fit(); fitHead(); }, 30);
  }

  /* leitura de posição: arrastar ou apertar na régua move a cabeça de leitura (o mesmo que o scrub); nada do projeto muda */
  function seekAt(clientX) {
    const r = $('#tlRuler').getBoundingClientRect(), m = S.m; if (!m || r.width <= 0) return;
    const n = Math.round(clamp((clientX - r.left) / r.width, 0, 1) * (m.LF - 1)); scrubbing = true; ST.n = n; if (!ST.paused) setPause(true); place(n);
  }
  function seekBy(d) { const m = S.m; if (!m) return; const n = clamp(ST.n + d, 0, m.LF - 1); scrubbing = true; ST.n = n; if (!ST.paused) setPause(true); place(n); setTimeout(() => { scrubbing = false; }, 0); }

  /* T2: edição do que já existe. Atraso da camada (L.p.phase, fração do loop em passos de semicolcheia) e batida do evento (meta.animationIR[ci].events[k].beat). */
  const rnd = (x, d) => { const f = Math.pow(10, d); return Math.round(x * f) / f; };
  const stepsOf = L => { const v = L.p && isFinite(+L.p.phase) ? +L.p.phase : 0; return (((v % 1) + 1) % 1) * (P.time.bars * 16); };
  function setSteps(i, steps) {
    const L = cur().layers[i]; if (!L) return null; const S16 = P.time.bars * 16, n = clamp(Math.round(steps), 0, S16 - 1);
    if (n === 0) { if (L.p) delete L.p.phase; } else { L.p = L.p || {}; L.p.phase = rnd(n / S16, 6); }
    return n;
  }
  function paintLane(i) {
    const m = model(), ln = m.lanes[i], row = $(`#tlBody .tlrow[data-i="${i}"] .tllane`); if (!ln || !row) return;
    S.m = m; S.sig = signature(m); row.innerHTML = laneInner(ln); row.dataset.steps = ln.steps; row.dataset.phase = ln.phase;
    row.setAttribute('aria-label', laneAria(ln)); row.setAttribute('aria-valuenow', Math.round(ln.steps));
    row.setAttribute('aria-valuetext', T3(`atraso ${r1(ln.steps)} de ${m.bars * 16} semicolcheias`, `delay ${r1(ln.steps)} of ${m.bars * 16} sixteenths`));
  }
  function evList() { const a = (P.meta || {}).animationIR, ani = Array.isArray(a) ? a[ST.ci] : null; return ani && Array.isArray(ani.events) ? ani.events : null; }
  function phaseAt(at) { const M = P.meta || {}, c = Array.isArray(M.compositionIR) ? M.compositionIR[ST.ci] : null, ph = c && c.temporal && c.temporal.phases; if (!Array.isArray(ph)) return null; let hit = null; ph.forEach(p => { if (at >= p.at) hit = p.name; }); return hit; }
  /* batida inteira dentro do loop e sem passar do vizinho (a validação exige ordem); devolve a batida aplicada */
  function setBeat(k, beat) {
    const evs = evList(); if (!evs || !evs[k]) return null; const beats = P.time.bars * 4;
    const lo = k > 0 ? evs[k - 1].beat : 0, hi = k + 1 < evs.length ? evs[k + 1].beat : beats - 1, b = clamp(Math.round(beat), lo, Math.max(lo, hi));
    evs[k].beat = b; evs[k].at = rnd(b / beats, 4); const ph = phaseAt(evs[k].at); if (ph) evs[k].phase = ph; return b;
  }
  function repaintAll() { build(); S.sig = signature(S.m); }
  const laneLabel = i => T3('Atraso ', 'Delay ') + 'L' + i + ' ' + ((cur().layers[i] || {}).name || '');
  const evLabel = k => T3('Evento ', 'Event ') + evList()[k].name + ' ' + T3('batida ', 'beat ') + evList()[k].beat;
  function afterEdit() { try { renderParams(); } catch (e) { /* painel ainda não montado */ } }

  /* arrasto: estado vivo no projeto, uma só entrada de histórico no fim; Esc devolve o valor de antes */
  let drag = null;
  function dragStart(e, kind, id, host) {
    if (e.button !== 0) return; const m = S.m; if (!m) return; e.preventDefault(); host.setPointerCapture(e.pointerId);
    const box = (kind === 'lane' ? host : host.parentElement).getBoundingClientRect();
    const L = kind === 'lane' ? cur().layers[id] : null, evs = kind === 'event' ? evList() : null;
    drag = { kind, id, host, x0: e.clientX, w: box.width, left: box.left, S16: m.bars * 16, beats: m.bars * 4, s0: kind === 'lane' ? stepsOf(L) : 0, b0: kind === 'event' ? evs[id].beat : 0,
      orig: kind === 'lane' ? JSON.stringify(L.p && 'phase' in L.p ? L.p.phase : null) : JSON.stringify(evs.map(v => [v.beat, v.at, v.phase])), moved: false };
    if (kind === 'lane' && ST.sel !== id) selLayer(id);
    host.focus({ preventScroll: true });
    const mv = ev => dragMove(ev), end = c => { host.removeEventListener('pointermove', mv); host.removeEventListener('pointerup', up); host.removeEventListener('pointercancel', cn); dragEnd(c); }, up = () => end(false), cn = () => end(true);
    host.addEventListener('pointermove', mv); host.addEventListener('pointerup', up); host.addEventListener('pointercancel', cn);
    drag.cancel = () => end(true);
  }
  function dragMove(e) {
    const d = drag; if (!d || d.w <= 0) return;
    if (d.kind === 'lane') { const n = setSteps(d.id, d.s0 + (e.clientX - d.x0) / (d.w / d.S16)); if (n !== null) { d.moved = d.moved || n !== Math.round(d.s0); paintLane(d.id); } }
    else { const b = setBeat(d.id, (e.clientX - d.left) / d.w * d.beats); if (b !== null) { d.moved = d.moved || b !== d.b0; d.host.style.left = pct(evList()[d.id].at); d.host.dataset.beat = b; d.host.setAttribute('aria-valuenow', b); d.host.title = d.host.dataset.event + ' · ' + T3('batida', 'beat') + ' ' + b; } }
  }
  function dragEnd(cancelled) {
    const d = drag; drag = null; if (!d) return;
    if (cancelled) {
      if (d.kind === 'lane') { const L = cur().layers[d.id], v = JSON.parse(d.orig); if (v === null) { if (L.p) delete L.p.phase; } else { L.p = L.p || {}; L.p.phase = v; } paintLane(d.id); }
      else { const evs = evList(); JSON.parse(d.orig).forEach((o, k) => { evs[k].beat = o[0]; evs[k].at = o[1]; evs[k].phase = o[2]; }); repaintAll(); }
      return;
    }
    if (!d.moved) return;
    if (d.kind === 'lane') { commit(true, laneLabel(d.id) + ' ' + r1(stepsOf(cur().layers[d.id])) + '/16'); afterEdit(); }
    else { commit(true, evLabel(d.id)); repaintAll(); const ev = $(`#tlBody .ev[data-k="${d.id}"]`); if (ev) ev.focus({ preventScroll: true }); }
  }
  /* teclado: ± uma semicolcheia (evento: uma batida); PageUp/PageDown ± 4 (uma batida na camada, 4 batidas no evento); Home/End nas pontas; uma rajada vira uma só entrada de histórico */
  function keyEdit(e) {
    const lane = e.target.closest('.tllane[role=slider]'), ev = e.target.closest('.ev[role=slider]'); if (!lane && !ev) return;
    if (e.key === 'Escape') { if (drag) { e.preventDefault(); e.stopPropagation(); drag.cancel(); } return; }
    const d = { ArrowLeft: -1, ArrowRight: 1, PageUp: -4, PageDown: 4 }[e.key];
    if (d === undefined && e.key !== 'Home' && e.key !== 'End') return;
    e.preventDefault(); e.stopPropagation();
    if (lane) {
      const i = +lane.closest('.tlrow').dataset.i, S16 = P.time.bars * 16, now = Math.round(stepsOf(cur().layers[i]));
      if (setSteps(i, e.key === 'Home' ? 0 : e.key === 'End' ? S16 - 1 : now + d) === null) return;
      paintLane(i); commit(false, laneLabel(i) + ' ' + r1(stepsOf(cur().layers[i])) + '/16'); setTimeout(afterEdit, 0);
    } else {
      const k = +ev.dataset.k, evs = evList(); if (!evs || !evs[k]) return; const beats = P.time.bars * 4;
      if (setBeat(k, e.key === 'Home' ? 0 : e.key === 'End' ? beats : evs[k].beat + d) === null) return;
      commit(false, evLabel(k)); repaintAll(); const nev = $(`#tlBody .ev[data-k="${k}"]`); if (nev) nev.focus({ preventScroll: true });
    }
  }

  const el = root();
  if (el) {
    const narrow = innerWidth < 1100 || innerHeight < 700;
    if (S.open === null) S.open = !narrow;
    setHeight(S.h, false); setOpen(S.open, false);
    $('#tlToggle').onclick = () => setOpen(false);
    $('#tlShow').onclick = () => setOpen(true);
    $('#tlBtns').addEventListener('click', e => {
      const b = e.target.closest('[data-tl]'); if (!b) return; const a = b.dataset.tl;
      if (a === 'start') seekBy(-ST.n); else if (a === 'prev') seekBy(-1); else if (a === 'next') seekBy(1); else if (a === 'play') setPause(!ST.paused);
    });
    $('#tlBody').addEventListener('pointerdown', e => {
      const evh = e.target.closest('.ev[role=slider]'); if (evh) { dragStart(e, 'event', +evh.dataset.k, evh); return; }
      const lh = e.target.closest('.tllane[role=slider]'); if (lh) { dragStart(e, 'lane', +lh.closest('.tlrow').dataset.i, lh); return; }
      const r = e.target.closest('#tlRuler'); if (!r) return; r.setPointerCapture(e.pointerId); seekAt(e.clientX);
      const mv = ev => seekAt(ev.clientX), up = () => { r.removeEventListener('pointermove', mv); r.removeEventListener('pointerup', up); scrubbing = false; };
      r.addEventListener('pointermove', mv); r.addEventListener('pointerup', up);
    });
    $('#tlBody').addEventListener('keydown', e => {
      if (!e.target.closest('#tlRuler')) { keyEdit(e); return; } const m = S.m; if (!m) return; const fpb = Math.round(m.fps * 60 / m.bpm);
      const d = { ArrowLeft: -1, ArrowRight: 1, PageUp: -fpb, PageDown: fpb }[e.key];
      if (d !== undefined) { e.preventDefault(); e.stopPropagation(); seekBy(d); }
      else if (e.key === 'Home') { e.preventDefault(); e.stopPropagation(); seekBy(-ST.n); } else if (e.key === 'End') { e.preventDefault(); e.stopPropagation(); seekBy(m.LF); }
    });
    $('#tlBody').addEventListener('click', e => { const r = e.target.closest('.tlrow[data-i]'); if (r && ST.sel !== +r.dataset.i && !e.target.closest('#tlRuler')) { /* só leitura de seleção: espelha o painel Camadas */ selLayer(+r.dataset.i); } });
    const sp = $('#tlSplit'), drag = e => { setHeight(innerHeight - e.clientY - ($('#foot') ? $('#foot').getBoundingClientRect().height : 0), false); };
    sp.addEventListener('pointerdown', e => { sp.setPointerCapture(e.pointerId); document.body.classList.add('resizing'); const up = () => { sp.removeEventListener('pointermove', drag); sp.removeEventListener('pointerup', up); document.body.classList.remove('resizing'); store.set('tlH', S.h); }; sp.addEventListener('pointermove', drag); sp.addEventListener('pointerup', up); });
    sp.addEventListener('keydown', e => { const d = { ArrowUp: 16, ArrowDown: -16 }[e.key]; if (d) { e.preventDefault(); e.stopPropagation(); setHeight(S.h + d, true); sp.setAttribute('aria-valuenow', S.h); } });
    addEventListener('resize', () => { if (S.open) { S.sig = ''; } });
  }
  return { tick, build, setOpen, setHeight, seekBy, setSteps, setBeat, get open() { return S.open; }, get model() { return S.m; }, get height() { return S.h; } };
})();
