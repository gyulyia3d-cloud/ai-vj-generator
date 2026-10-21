/* Timeline T1 (somente leitura) e T2 (edita o atraso; fase 14b-T1/T2, docs/brand/UI-REDESIGN-PROPOSTA.md §13): painel acoplado embaixo da vista, recolhível e com altura arrastável.
   Mostra o que hoje só aparece como números: régua (compassos, tempos, quadros) com a cabeça de leitura ligada ao scrub; fases da composição (meta.compositionIR[i].temporal.phases)
   e eventos na batida (meta.animationIR[i].events); uma faixa por camada, na ordem do painel de Camadas, com o comportamento (Animation IR e semântica de áudio),
   o atraso em semicolcheias (p.phase), os ciclos das curvas e se o loop fecha (ciclos inteiros declarados); e a faixa de áudio (ao vivo, gravada ao tocar, ou a fonte sintética do BPM).
   T2: arrastar a barra de uma camada (ou ←/→ com foco nela) muda só p.phase, em semicolcheias inteiras, então o loop continua fechando; é um passo de histórico. Eventos seguem só de leitura
   (nada no render os lê). Sem campo novo, formato ou render: clicar na régua só posiciona a cabeça de leitura (como o scrub); o olho é o mesmo toggleLayer do painel de Camadas.
   Custo: a régua e o áudio são redesenhados só quando algo muda; a cada quadro só a cabeça de leitura anda (um transform).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores TIMELINE. Mesmo escopo do motor (IIFE): sem import/export. */
const TIMELINE = (() => {
  const S = { hidden: !!store.get('tlHidden', false), open: store.get('tlOpen', null), h: store.get('tlH', 200), zoom: 1, sig: '', k: 0, LF: 0, rec: null, recAt: 0, dirtyAud: true };
  const BEH_PT = { still: 'parada', drift: 'deriva', beat: 'na batida', follow: 'segue', accent: 'acento', section: 'seção', lead: 'lidera', counter: 'contra', ambient: 'ambiente', reveal: 'revela', hold: 'segura' };
  const TIER_PT = { hero: 'herói', structure: 'estrutura', ground: 'chão', instrument: 'instrumento', text: 'texto' };
  const BANDS = [['bass', 'G'], ['mid', 'M'], ['high', 'A'], ['rms', 'N']];
  const q = s => document.querySelector(s);
  const word = (m, k) => k ? (ST.lang === 'en' ? k : (m[k] || k)) : '';
  const meta = () => P.meta || {};
  const phasesOf = () => { const c = (meta().compositionIR || [])[ST.ci]; return c && c.temporal && Array.isArray(c.temporal.phases) ? c.temporal.phases : null; };
  const animOf = () => (meta().animationIR || [])[ST.ci] || null;
  const isText = t => { const f = famOf(t); return !!f && f[0] === 'Texto'; };
  function tierOf(L) { const t = ANIMATION.tierOf(L); return t || (L.type === 'instrument' ? 'instrument' : isText(L.type) ? 'text' : null); }
  const lfoCycles = L => (Array.isArray(L.mod) ? L.mod : []).filter(m => m && m.src === 'lfo' && m.cycles != null).map(m => +m.cycles);
  /* fecha o loop = loop sem emenda ligado e toda curva LFO da camada com ciclos inteiros (o mesmo critério que o motor arredonda em cyc) */
  const closes = L => !!(P.time.loop && P.time.seamless) && lfoCycles(L).every(c => Number.isInteger(c));
  function rowInfo(L, i) {
    const p = pm(L), sx = P.time.bars * 16, ph = ((+p.phase || 0) % 1 + 1) % 1, an = animOf(), tier = tierOf(L);
    const ab = an && tier && an.hierarchy && an.hierarchy[tier] ? an.hierarchy[tier].behavior : null, tb = L.temporal && L.temporal.behavior;
    const cyc = lfoCycles(L), c = cyc.length ? Math.max(...cyc) : 0;
    return { i, L, ph, steps: Math.round(ph * sx * 100) / 100, tier, ab, tb, listens: (L.temporal && L.temporal.listens) || [], cycles: c, closes: closes(L) };
  }
  function rowText(r) {
    const parts = [r.tier ? word(TIER_PT, r.tier) : null, r.ab ? word(BEH_PT, r.ab) : null, r.tb ? word(BEH_PT, r.tb) + (r.listens.length ? ' (' + r.listens.join(', ') + ')' : '') : null].filter(Boolean);
    return parts.join(' · ') || T3('sem comportamento declarado', 'no declared behaviour');
  }
  function rowLabel(r) {
    return `L${r.i} ${r.L.name}: ${rowText(r)}; ${T3('atraso', 'delay')} ${r.steps} ${T3('semicolcheia(s)', 'sixteenth(s)')}` + (r.cycles ? `; ${r.cycles} ${T3('ciclo(s)', 'cycle(s)')}` : '') + `; ${r.closes ? T3('fecha o loop', 'closes the loop') : T3('não fecha o loop', 'does not close the loop')}` + (r.L.on ? '' : '; ' + T3('desligada', 'off'));
  }
  /* faixa da camada: um slider (atraso em semicolcheias inteiras, 0 a bars*16-1); o aria-label segue dizendo comportamento, ciclos e se fecha */
  function rowAttrs(r) {
    const sx = P.time.bars * 16, k = Math.round(r.ph * sx) % sx;
    return `role="slider" tabindex="0" data-tlrow="${r.i}" aria-label="${esc(rowLabel(r))}" aria-valuemin="0" aria-valuemax="${sx - 1}" aria-valuenow="${k}" aria-valuetext="${esc(T3('atraso ', 'delay ') + r.steps + T3(' semicolcheia(s)', ' sixteenth(s)')) }"`;
  }
  function rowInner(r) {
    const cls = 'tlbar' + (r.tier === 'hero' ? ' hero' : '') + (r.L.on ? '' : ' off');
    const txt = rowText(r) + (r.steps ? ` · +${r.steps}♬` : '') + (r.cycles ? ` · ${r.cycles}×` : '');
    return `${seg(cls, r.ph, 1, r.cycles, false, txt)}${r.ph > 0 ? seg(cls + ' wrap', 0, r.ph, r.cycles, true, '') : ''}<span class="tlend ${r.closes ? 'ok' : 'no'}" title="${r.closes ? T3('fecha o loop', 'closes the loop') : T3('não fecha o loop', 'does not close the loop')}">${r.closes ? '↻' : '≠'}</span>`;
  }
  /* regrava só a faixa da camada (sem refazer a régua nem o áudio) */
  function refreshRow(i) {
    const el = q(`#tlIn .tlr.ly[data-tlrow="${i}"]`), L = cur().layers[i]; if (!el || !L) return;
    const r = rowInfo(L, i), tpl = document.createElement('div'); tpl.innerHTML = `<div ${rowAttrs(r)}></div>`;
    for (const a of tpl.firstChild.attributes) el.setAttribute(a.name, a.value);
    el.innerHTML = rowInner(r); S.sig = sigOf();
  }
  /* muda o atraso para k semicolcheias (módulo o loop); sem tocar em mais nada */
  function setDelay(i, k) {
    const L = cur().layers[i]; if (!L) return false; const sx = P.time.bars * 16;
    L.p = L.p || {}; L.p.phase = (((Math.round(k) % sx) + sx) % sx) / sx; refreshRow(i);
    if (ST.sel === i) renderParams();
    return true;
  }
  const kOf = (i) => Math.round((((+pm(cur().layers[i]).phase || 0) % 1 + 1) % 1) * P.time.bars * 16);
  const pct = x => (x * 100).toFixed(4) + '%';
  function seg(cls, a, b, cyc, wrapRight, txt) {
    const w = b - a; if (w <= 0) return '';
    const bg = cyc ? `background-size:${(100 / (cyc * w)).toFixed(4)}% 100%;background-position:${wrapRight ? 'right' : 'left'} 0` : '';
    return `<span class="${cls}" style="left:${pct(a)};width:${pct(w)};${bg}">${txt ? esc(txt) : ''}</span>`;
  }
  function sigOf() {
    const c = cur(); return [ST.ci, ST.lang, P.id, P.time.bpm, P.time.bars, P.time.loop, P.time.seamless, P.time.mode, P.canvas.fps, !!phasesOf(), !!animOf(),
      c.layers.map(L => [L.type, L.name, L.on, (L.p || {}).phase, L.temporal && L.temporal.behavior, lfoCycles(L).join(',')].join('|')).join(';')].join('#');
  }

  function build() {
    const box = q('#tl'); if (!box) return;
    const comp = cur(), LF = loopFrames(), bars = P.time.bars, ph = phasesOf(), an = animOf(), rows = comp.layers.map(rowInfo), allClose = rows.every(r => r.closes);
    S.LF = LF; if (!S.rec || S.rec.n !== LF) S.rec = { n: LF, bass: new Float32Array(LF), mid: new Float32Array(LF), high: new Float32Array(LF), rms: new Float32Array(LF), hit: new Float32Array(LF), has: new Uint8Array(LF) };
    const names = [`<div class="tln rl">${T3('Régua', 'Ruler')}</div>`, `<div class="tln">${T3('Fases', 'Phases')}</div>`, `<div class="tln">${T3('Eventos', 'Events')}</div>`]
      .concat(rows.map(r => `<div class="tln ly${r.L.on ? '' : ' off'}"><button class="tg" data-tlvis="${r.i}" aria-pressed="${r.L.on}" aria-label="${T3('Ligar', 'Toggle')} ${esc(r.L.name)}"></button><span class="k">L${r.i}</span><span class="nm">${esc(r.L.name)}</span></div>`))
      .concat([`<div class="tln au">${T3('Áudio', 'Audio')}</div>`]).join('');
    const phRow = ph ? ph.map((x, k) => seg('tlph' + (k % 2 ? ' b' : ''), +x.at, k + 1 < ph.length ? +ph[k + 1].at : 1, 0, false, x.name)).join('')
      : `<span class="tlnone">${T3('sem fases (projeto sem Composition IR)', 'no phases (project without Composition IR)')}</span>`;
    const evRow = an && Array.isArray(an.events) ? an.events.map(e => `<span class="tlev" style="left:${pct(+e.at)}" title="${esc(e.name + ' · ' + T3('tempo ', 'beat ') + (e.beat + 1))}"><i></i>${esc(e.name)}</span>`).join('')
      : `<span class="tlnone">${T3('sem eventos (projeto sem Animation IR)', 'no events (project without Animation IR)')}</span>`;
    const lyRows = rows.map(r => `<div class="tlr ly" ${rowAttrs(r)}>${rowInner(r)}</div>`).join('');
    q('#tlNames').innerHTML = names;
    q('#tlTracks').innerHTML = `<div id="tlIn" style="width:${S.zoom * 100}%">
      <div class="tlr rl" id="tlRuler" role="slider" tabindex="0" aria-label="${T3('Posição no loop', 'Loop position')}" aria-valuemin="0" aria-valuemax="${LF - 1}"><canvas id="tlRc" aria-hidden="true"></canvas><span class="tlend ${allClose ? 'ok' : 'no'}">${allClose ? T3('fecha', 'closes') : T3('não fecha', 'open')}</span></div>
      <div class="tlr" id="tlPh">${phRow}</div><div class="tlr" id="tlEv">${evRow}</div>${lyRows}
      <div class="tlr au"><canvas id="tlAc" aria-hidden="true"></canvas><span id="tlAuL" class="tlnote"></span></div>
      <div id="tlHead" aria-hidden="true"></div></div>`;
    q('#tlPos') && (q('#tlPos').dataset.bars = bars);
    S.dirtyAud = true; drawRuler(); drawAudio(); tick(ST.F || frameAt(ST.n, comp), true);
  }
  function canvasFit(cv) {
    const r = cv.getBoundingClientRect(), d = Math.min(2, window.devicePixelRatio || 1), w = Math.max(2, Math.round(r.width * d)), h = Math.max(2, Math.round(r.height * d));
    if (cv.width !== w) cv.width = w; if (cv.height !== h) cv.height = h; return { c: cv.getContext('2d'), w, h, d };
  }
  const css = v => getComputedStyle(q('#tl')).getPropertyValue(v).trim() || '#888';
  function drawRuler() {
    const cv = q('#tlRc'); if (!cv) return;
    const { c, w, h, d } = canvasFit(cv), bars = P.time.bars, beats = bars * 4, fg = css('--fg'), dim = css('--faint');
    c.clearRect(0, 0, w, h); c.font = `${10 * d}px ${css('--font-title') || 'monospace'}`; c.textBaseline = 'top';
    const pxBeat = w / beats, sixteenth = pxBeat / 4 >= 5 * d, beatLab = pxBeat >= 28 * d;
    for (let s = 0; s <= beats * 4; s++) {
      const x = Math.round(s / (beats * 4) * w) + 0.5, isBar = s % 16 === 0, isBeat = s % 4 === 0;
      if (!isBeat && !sixteenth) continue;
      c.strokeStyle = isBar ? fg : dim; c.globalAlpha = isBar ? 1 : isBeat ? 0.8 : 0.35; c.beginPath(); c.moveTo(x, h); c.lineTo(x, h - (isBar ? h * 0.7 : isBeat ? h * 0.4 : h * 0.2)); c.stroke();
      c.globalAlpha = 1; c.fillStyle = isBar ? fg : dim;
      if (isBar && s < beats * 4) c.fillText(String(s / 16 + 1), x + 3 * d, 2 * d);
      else if (isBeat && beatLab && s < beats * 4) c.fillText('.' + (s / 4 % 4 + 1), x + 3 * d, 2 * d);
    }
  }
  function drawAudio() {
    const cv = q('#tlAc'); if (!cv) return; S.dirtyAud = false;
    const { c, w, h, d } = canvasFit(cv), comp = cur(), LF = S.LF || loopFrames(), live = AUD.live(), R = S.rec;
    c.clearRect(0, 0, w, h);
    const val = (k, m) => R.has[m] ? R[k][m] : null;
    const synth = [];
    if (!live) for (let n = 0; n < LF; n++) { const F = frameAt(n, comp); synth[F.n] = pseudoAudio(F); }
    const get = (k, m) => live ? val(k, m) : synth[m] ? synth[m][k] : null;
    const lane = h / BANDS.length;
    BANDS.forEach(([k], bi) => {
      c.strokeStyle = bi === 0 ? css('--accent') : css('--dim'); c.globalAlpha = bi === 0 ? 0.9 : 0.6; c.lineWidth = d; c.beginPath(); let pen = false;
      for (let m = 0; m < LF; m++) { const v = get(k, m); if (v == null) { pen = false; continue; } const x = (m + 0.5) / LF * w, y = (bi + 1) * lane - Math.min(1, v) * (lane - 2 * d); pen ? c.lineTo(x, y) : c.moveTo(x, y); pen = true; }
      c.stroke();
    });
    /* golpes: pico local do hit acima de 0,5 */
    c.globalAlpha = 1; c.fillStyle = css('--fg');
    for (let m = 0; m < LF; m++) { const v = get('hit', m), a = get('hit', (m + LF - 1) % LF), b = get('hit', (m + 1) % LF); if (v != null && v > 0.5 && (a == null || v >= a) && (b == null || v > b)) c.fillRect(Math.round(m / LF * w), 0, Math.max(1, d), 4 * d); }
    const l = q('#tlAuL'); if (l) l.textContent = live ? T3('ao vivo: gravado ao tocar (G M A N, golpes no topo)', 'live: recorded as it plays (B M H L, hits on top)') : T3('fonte sintética do BPM (G M A N, golpes no topo)', 'synthetic BPM source (B M H L, hits on top)');
  }
  /* a cada quadro: só a cabeça de leitura e o rótulo; a cada 30 quadros confere se o projeto mudou */
  function tick(F, force) {
    const box = q('#tl'); if (!box || !S.open || S.hidden || !F) return;
    if (++S.k % 30 === 0 || force) { const s = sigOf(); if (s !== S.sig) { S.sig = s; if (!force) return build(); } if (S.zoom > 1 && !force) follow(F); }
    if (S.pz !== ST.paused) { S.pz = ST.paused; labels(); }
    const LF = F.LF || S.LF || 1, x = F.n / LF, hd = q('#tlHead'), rl = q('#tlRuler');
    if (hd) hd.style.left = pct(x);
    if (rl) { rl.setAttribute('aria-valuenow', F.n); rl.setAttribute('aria-valuetext', `${T3('quadro', 'frame')} ${F.n} · ${T3('compasso', 'bar')} ${F.bar + 1} ${T3('tempo', 'beat')} ${F.beat % 4 + 1}`); }
    const pos = q('#tlPos'); if (pos) pos.textContent = `${pad(F.n, 4)}/${pad(LF, 4)} · C${pad(F.bar + 1, 2)}:${F.beat % 4 + 1}`;
    if (AUD.live() && S.rec && S.rec.n === LF) { const R = S.rec; for (const k of ['bass', 'mid', 'high', 'rms', 'hit']) R[k][F.n] = AUD[k] || 0; R.has[F.n] = 1; if (++S.recAt % 15 === 0) S.dirtyAud = true; }
    if (S.dirtyAud && S.k % 15 === 0) drawAudio();
  }
  function follow(F) { const t = q('#tlTracks'), inn = q('#tlIn'); if (!t || !inn || ST.paused) return; const x = F.n / (F.LF || 1) * inn.offsetWidth; if (x < t.scrollLeft || x > t.scrollLeft + t.clientWidth) t.scrollLeft = x - 16; }

  /* posicionar a cabeça de leitura: como o scrub (pausa e vai ao quadro); no modo reverse o quadro mostrado é LF-1-n */
  function seek(m) {
    const LF = loopFrames(); m = clamp(Math.round(m), 0, LF - 1);
    setPause(true); ST.n = P.time.loop && P.time.mode === 'reverse' ? LF - 1 - m : m; tick(frameAt(ST.n, cur()), true);
  }
  function setOpen(v, quiet) {
    S.open = !!v; store.set('tlOpen', S.open); const box = q('#tl'); if (!box) return;
    APP.classList.toggle('tlon', S.open && !S.hidden); box.classList.toggle('closed', !S.open);
    const b = q('#tlTog'); b.setAttribute('aria-expanded', String(S.open)); b.textContent = S.open ? T3('Timeline ▾', 'Timeline ▾') : T3('Timeline ▴', 'Timeline ▴');
    applyH(); if (S.open && !S.hidden) { S.sig = ''; build(); } setTimeout(fit, 30);
    if (!quiet) toast(S.open ? T3('Timeline aberta', 'Timeline open') : T3('Timeline recolhida: o scrub volta', 'Timeline collapsed: the scrub is back'), 1100);
  }
  /* ocultar: tira a timeline inteira (e devolve o scrub); o botão Timeline na régua da vista traz de volta, como o Ocultar e o Barra da barra flutuante */
  function setHidden(v, quiet) {
    S.hidden = !!v; store.set('tlHidden', S.hidden); APP.classList.toggle('tlhide', S.hidden);
    const sh = q('#tlShow'); if (sh) sh.hidden = !S.hidden;
    setOpen(S.open, true);
    if (S.hidden) { const sh2 = q('#tlShow'); if (sh2 && quiet !== 'nofocus' && document.activeElement && document.activeElement.closest && document.activeElement.closest('#tl')) sh2.focus({ preventScroll: true }); }
    else { const h = q('#tlHide'); if (h && quiet !== 'nofocus' && document.activeElement === q('#tlShow')) h.focus({ preventScroll: true }); }
    if (!quiet) toast(S.hidden ? T3('Timeline oculta: o botão Timeline, no alto da vista, traz de volta', 'Timeline hidden: the Timeline button, above the view, brings it back') : T3('Timeline de volta', 'Timeline back'), 1400);
  }
  function applyH() {
    const box = q('#tl'); S.h = clamp(Math.round(S.h), 96, Math.max(120, Math.round(innerHeight * 0.6)));
    box.style.height = S.open ? S.h + 'px' : ''; ROOT_EL.style.setProperty('--tl-h', (S.hidden ? 0 : S.open ? S.h : box.offsetHeight || 0) + 'px');
    const g = q('#tlGrip'); g.setAttribute('aria-valuenow', S.h); g.setAttribute('aria-valuemax', Math.max(120, Math.round(innerHeight * 0.6)));
  }
  function setZoom(z) { S.zoom = clamp(z, 1, 16); const inn = q('#tlIn'); if (inn) inn.style.width = S.zoom * 100 + '%'; q('#tlZv').textContent = S.zoom + '×'; drawRuler(); drawAudio(); }
  function labels() {
    const L = (id, pt, en, al) => { const b = q(id); if (!b) return; b.title = T3(pt, en); b.setAttribute('aria-label', T3(al || pt, al ? al : en)); };
    L('#tlStart', 'Início do loop', 'Loop start'); L('#tlPrev', 'Quadro anterior', 'Previous frame'); L('#tlNext', 'Próximo quadro', 'Next frame');
    L('#tlZo', 'Diminuir zoom da timeline', 'Timeline zoom out'); L('#tlZi', 'Aumentar zoom da timeline', 'Timeline zoom in');
    const pl = q('#tlPlay'); if (pl) { pl.textContent = ST.paused ? 'Play' : T3('Pausa', 'Pause'); pl.setAttribute('aria-pressed', String(!ST.paused)); }
    const au = q('#tlAud'); if (au) { au.textContent = T3('Áudio', 'Audio'); au.setAttribute('aria-pressed', $('#audBtn').getAttribute('aria-pressed')); }
    const hi = q('#tlHide'); if (hi) { hi.textContent = T3('Ocultar', 'Hide'); hi.title = T3('Ocultar a timeline (o botão Timeline, no alto da vista, traz de volta)', 'Hide the timeline (the Timeline button above the view brings it back)'); }
    const sh = q('#tlShow'); if (sh) { sh.textContent = T3('Timeline ▴', 'Timeline ▴'); sh.title = T3('Mostrar a timeline', 'Show the timeline'); sh.setAttribute('aria-label', T3('Mostrar a timeline', 'Show the timeline')); }
    const g = q('#tlGrip'); if (g) g.setAttribute('aria-label', T3('Altura da timeline, arraste ou use as setas', 'Timeline height, drag or use the arrows'));
  }

  function init() {
    if (q('#tl')) return;
    const box = document.createElement('section'); box.id = 'tl'; box.setAttribute('aria-label', 'Timeline');
    box.innerHTML = `<div id="tlGrip" role="separator" tabindex="0" aria-orientation="horizontal" aria-valuemin="96"></div>
      <div id="tlBar"><button id="tlStart">⏮</button><button id="tlPrev">‹</button><button id="tlPlay"></button><button id="tlNext">›</button><button id="tlAud"></button>
      <span id="tlPos" class="rd">0000/0000</span><span class="sp"></span><button id="tlZo">−</button><span id="tlZv" class="rd">1×</span><button id="tlZi">+</button><button id="tlTog" aria-controls="tlBody"></button><button id="tlHide"></button></div>
      <div id="tlBody"><div id="tlNames"></div><div id="tlTracks"></div></div>`;
    const view = q('#view'); view.appendChild(box);
    const vt = q('#vtool'); if (vt) { const sh = document.createElement('button'); sh.id = 'tlShow'; sh.hidden = true; sh.setAttribute('aria-controls', 'tl'); sh.onclick = () => setHidden(false); vt.appendChild(sh); }
    box.addEventListener('click', e => {
      const b = e.target.closest('button'); if (!b) return; const F = ST.F || frameAt(ST.n, cur());
      if (b.dataset.tlvis != null) { toggleLayer(+b.dataset.tlvis); S.sig = ''; build(); return; }
      if (b.id === 'tlStart') seek(0); else if (b.id === 'tlPrev') seek((F.n - 1 + F.LF) % F.LF); else if (b.id === 'tlNext') seek((F.n + 1) % F.LF);
      else if (b.id === 'tlPlay') setPause(!ST.paused); else if (b.id === 'tlAud') $('#audBtn').click();
      else if (b.id === 'tlHide') { setHidden(true); return; } else if (b.id === 'tlZo') setZoom(S.zoom / 2); else if (b.id === 'tlZi') setZoom(S.zoom * 2); else if (b.id === 'tlTog') setOpen(!S.open);
      labels();
    });
    /* régua e faixas: clicar ou arrastar posiciona a cabeça de leitura (não edita nada) */
    let drag = false; const at = e => { const inn = q('#tlIn'), r = inn.getBoundingClientRect(); return (e.clientX - r.left) / r.width * loopFrames(); };
    /* arrastar a barra de uma camada: relativo ao ponto de partida (clicar sem mover não muda nada); um passo de histórico ao soltar; Esc cancela */
    let ld = null;
    const lend = (cancel) => {
      if (!ld) return; const d = ld; ld = null;
      if (cancel) { const L = cur().layers[d.i]; if (d.p0 === undefined) delete L.p.phase; else L.p.phase = d.p0; refreshRow(d.i); if (ST.sel === d.i) renderParams(); return; }
      if (d.moved && kOf(d.i) !== d.k0) commit(true, T3('Atraso da camada: ', 'Layer delay: ') + cur().layers[d.i].name);
    };
    box.addEventListener('pointerdown', e => {
      const row = e.button === 0 && e.target.closest && e.target.closest('#tlIn .tlr.ly'); if (!row || e.target.closest('button')) return;
      const i = +row.dataset.tlrow; flushCommit(); row.focus({ preventScroll: true });
      ld = { i, x0: e.clientX, k0: kOf(i), p0: (cur().layers[i].p || {}).phase, w: q('#tlIn').getBoundingClientRect().width, moved: false }; row.setPointerCapture && row.setPointerCapture(e.pointerId); e.stopPropagation();
    }, true);
    box.addEventListener('pointermove', e => {
      if (!ld) return; const sx = P.time.bars * 16, dk = Math.round((e.clientX - ld.x0) / ld.w * sx);
      if (!ld.moved && !dk) return; ld.moved = true; setDelay(ld.i, ld.k0 + dk);
    });
    box.addEventListener('pointerup', () => lend(false)); box.addEventListener('pointercancel', () => lend(true));
    box.addEventListener('keydown', e => { if (ld && e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); lend(true); } }, true);
    box.addEventListener('pointerdown', e => { if (e.button !== 0 || !e.target.closest('#tlIn') || e.target.closest('button')) return; drag = true; e.target.setPointerCapture && e.target.setPointerCapture(e.pointerId); seek(at(e)); labels(); });
    box.addEventListener('pointermove', e => { if (drag) seek(at(e)); });
    const end = () => { drag = false; }; box.addEventListener('pointerup', end); box.addEventListener('pointercancel', end);
    box.addEventListener('keydown', e => {
      const F = ST.F || frameAt(ST.n, cur());
      if (e.target.id === 'tlRuler') {
        const step = e.shiftKey ? Math.round(F.fpb) : 1; let m = null;
        if (e.key === 'ArrowRight') m = (F.n + step) % F.LF; else if (e.key === 'ArrowLeft') m = (F.n - step + F.LF * 4) % F.LF; else if (e.key === 'Home') m = 0; else if (e.key === 'End') m = F.LF - 1;
        if (m != null) { e.preventDefault(); e.stopPropagation(); seek(m); labels(); }
      }
      if (e.target.dataset && e.target.dataset.tlrow != null && e.target.classList.contains('ly')) {
        const i = +e.target.dataset.tlrow, st = e.shiftKey ? 4 : 1; let k = null;
        if (e.key === 'ArrowRight') k = kOf(i) + st; else if (e.key === 'ArrowLeft') k = kOf(i) - st; else if (e.key === 'Home') k = 0;
        if (k != null) { e.preventDefault(); e.stopPropagation(); setDelay(i, k); commit(false, T3('Atraso da camada: ', 'Layer delay: ') + cur().layers[i].name); e.target.focus(); }
      }
      if (e.target.id === 'tlGrip') {
        const st = e.shiftKey ? 48 : 16; let used = true;
        if (e.key === 'ArrowUp') S.h += st; else if (e.key === 'ArrowDown') S.h -= st; else if (e.key === 'Enter' || e.key === ' ') setOpen(!S.open, true); else used = false;
        if (used) { e.preventDefault(); e.stopPropagation(); store.set('tlH', S.h); applyH(); setTimeout(() => { fit(); drawRuler(); drawAudio(); }, 30); }
      }
    });
    const grip = q('#tlGrip'); let gd = null;
    grip.addEventListener('pointerdown', e => { if (!S.open) return; grip.setPointerCapture(e.pointerId); gd = { y: e.clientY, h: S.h }; document.body.classList.add('resizing'); e.preventDefault(); });
    grip.addEventListener('pointermove', e => { if (!gd) return; S.h = gd.h - (e.clientY - gd.y); applyH(); });
    const gend = () => { if (!gd) return; gd = null; document.body.classList.remove('resizing'); store.set('tlH', S.h); applyH(); fit(); drawRuler(); drawAudio(); };
    grip.addEventListener('pointerup', gend); grip.addEventListener('pointercancel', gend);
    q('#tlTracks').addEventListener('scroll', () => { q('#tlNames').scrollTop = q('#tlTracks').scrollTop; });
    q('#tlNames').addEventListener('wheel', e => { q('#tlTracks').scrollTop += e.deltaY; }, { passive: true });
    new ResizeObserver(() => { if (S.open) { drawRuler(); S.dirtyAud = true; drawAudio(); } }).observe(q('#tlTracks'));
    /* aberta por padrão em tela larga e alta; o que a pessoa escolheu fica salvo */
    if (S.open == null) S.open = innerWidth > 900 && innerHeight >= 700;
    labels(); setHidden(S.hidden, 'nofocus');
  }
  function refresh() { if (!q('#tl')) return; labels(); setOpen(S.open, true); }
  if (typeof document !== 'undefined' && typeof $ === 'function') init();
  return { tick, build, seek, setOpen, setHidden, setZoom, refresh, rowInfo, closes, setDelay, get state() { return { hidden: S.hidden, open: S.open, h: S.h, zoom: S.zoom, LF: S.LF }; } };
})();
