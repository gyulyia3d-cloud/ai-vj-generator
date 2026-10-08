/* Aba "Gerar" (fase 3): do briefing ao set, sem IA e sem terminal. Formulário -> GENAI.build -> projeto aberto no motor -> Avaliar.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html.
   Também guarda SURFACE_PRESETS, usados aqui e na aba Projeto. Texto próprio em PT e EN (função L), sem depender do dicionário do motor. */
const T3 = (pt, en) => ST.lang === 'en' ? en : pt;
const SURFACE_PRESETS = [
  { id: 'led-4500x800', pt: 'Parede LED em L · 4500×800 (duas paredes, dobra no meio)', en: 'LED wall in L · 4500×800 (two walls, fold in the middle)', type: 'led', w: 4500, h: 800, folds: [2250], pitchMm: 3.9, viewingDistanceM: [8, 40] },
  { id: 'led-ultrawide', pt: 'LED ultrawide · 3840×720', en: 'LED ultrawide · 3840×720', type: 'led', w: 3840, h: 720, pitchMm: 3.9, viewingDistanceM: [8, 40] },
  { id: 'led-fita', pt: 'LED fita · 4096×256', en: 'LED strip · 4096×256', type: 'led', w: 4096, h: 256, pitchMm: 6, viewingDistanceM: [5, 30] },
  { id: 'led-torre', pt: 'LED torre vertical · 540×1920', en: 'LED vertical tower · 540×1920', type: 'led', w: 540, h: 1920, pitchMm: 6, viewingDistanceM: [5, 30] },
  { id: 'led-16x9', pt: 'LED palco 16:9 · 3840×2160', en: 'LED stage 16:9 · 3840×2160', type: 'led', w: 3840, h: 2160, pitchMm: 3.9, viewingDistanceM: [10, 50] },
  { id: 'multi-3', pt: 'Três telas lado a lado · 5760×1080', en: 'Three screens side by side · 5760×1080', type: 'multi', w: 5760, h: 1080, folds: [1920, 3840], pitchMm: 2.5 },
  { id: 'proj-hd', pt: 'Projeção · 1920×1080', en: 'Projection · 1920×1080', type: 'projection', w: 1920, h: 1080 },
  { id: 'proj-fachada', pt: 'Fachada (mapping) · 3840×2160', en: 'Facade (mapping) · 3840×2160', type: 'mapping', w: 3840, h: 2160 },
  { id: 'screen-hd', pt: 'Tela 16:9 · 1920×1080', en: 'Screen 16:9 · 1920×1080', type: 'screen', w: 1920, h: 1080 },
  { id: 'screen-4k', pt: 'Tela 4K · 3840×2160', en: 'Screen 4K · 3840×2160', type: 'screen', w: 3840, h: 2160 },
  { id: 'screen-vertical', pt: 'Tela vertical 9:16 · 1080×1920', en: 'Vertical screen 9:16 · 1080×1920', type: 'screen', w: 1080, h: 1920 },
  { id: 'screen-square', pt: 'Quadrado · 2048×2048', en: 'Square · 2048×2048', type: 'screen', w: 2048, h: 2048 },
];
const GEN_MOODS = { industrial: ['industrial', 'industrial'], organic: ['orgânico', 'organic'], cosmic: ['cósmico', 'cosmic'], urban: ['urbano', 'urban'], ritual: ['ritual', 'ritual'], glitch: ['glitch', 'glitch'], minimal: ['minimalista', 'minimal'], liquid: ['líquido', 'liquid'], crystalline: ['cristalino', 'crystalline'], retro: ['retrô', 'retro'], aggressive: ['agressivo', 'aggressive'], calm: ['calmo', 'calm'] };
const GEN_DEFAULT = { name: '', concept: '', mood: [], energy: 0.5, density: 'balanced', preset: 'led-4500x800', type: 'led', w: 4500, h: 800, fps: 30, pitchMm: 3.9, distMin: 8, distMax: 40, folds: '2250', bpm: 128, bars: 4, compositions: 3, audio: 'rhythmic', audioReason: '', title: '', caption: '', data: '', words: '', path: 'none', paletteMode: 'auto', hue: 230, scheme: 'analogous', colors: ['#000000', '#E8E8E8', '#808890', '#E19000'], focalEvent: '', banned: '', lang: '' };
const genFresh = () => Object.assign({}, GEN_DEFAULT, { mood: [], colors: GEN_DEFAULT.colors.slice() });   // arrays novos: o padrão nunca é alterado por quem edita
const GU = { v: Object.assign(genFresh(), store.get('gen', {})), brief: null, result: null, evalRes: null, busy: false };

function genToBrief(v) {
  const num = (x, d) => { const n = typeof x === 'number' ? x : evalExpr(String(x)); return isFinite(n) ? n : d; };
  const b = { name: String(v.name || '').trim(), lang: v.lang || ST.lang, concept: String(v.concept || '').trim(), surface: { type: v.type, w: Math.round(num(v.w, 0)), h: Math.round(num(v.h, 0)), fps: Math.round(num(v.fps, 30)) }, time: { bpm: num(v.bpm, 0), bars: Math.round(num(v.bars, 4)) }, energy: num(v.energy, 0.5), density: v.density, compositions: Math.round(num(v.compositions, 3)), audio: { strategy: v.audio } };
  if (v.mood.length) b.mood = v.mood.slice(0, 3);
  if (v.pitchMm !== '' && v.pitchMm != null && num(v.pitchMm, 0) > 0) b.surface.pitchMm = num(v.pitchMm, 0);
  if (num(v.distMin, 0) > 0 && num(v.distMax, 0) >= num(v.distMin, 0)) b.surface.viewingDistanceM = [num(v.distMin, 0), num(v.distMax, 0)];
  const folds = String(v.folds || '').split(/[,;\s]+/).map(Number).filter(n => Number.isInteger(n) && n > 0 && n < b.surface.w); if (folds.length) b.surface.folds = folds;
  if (v.audio === 'none') b.audio.reason = v.audioReason || (v.lang === 'en' || ST.lang === 'en' ? 'The piece is deliberately silent: the picture does not depend on the music.' : 'A peça é muda de propósito: a imagem não depende da música.');
  const tx = {}; if (v.title.trim()) tx.title = v.title.trim(); if (v.caption.trim()) tx.caption = v.caption.trim(); if (v.data.trim()) tx.data = v.data.trim();
  const words = String(v.words).split('|').map(s => s.trim()).filter(Boolean); if (words.length) tx.words = words; if (v.path && v.path !== 'none') tx.path = v.path;
  if (Object.keys(tx).length) b.text = tx;
  if (v.paletteMode === 'hue') b.palette = { hue: num(v.hue, 230), scheme: v.scheme }; else if (v.paletteMode === 'exact') b.palette = { colors: v.colors.map(c => String(c).toUpperCase()) };
  if (v.focalEvent.trim()) b.focalEvent = v.focalEvent.trim(); const ban = String(v.banned).split(',').map(s => s.trim()).filter(Boolean); if (ban.length) b.banned = ban;
  return b;
}
function genFromBrief(b) {
  const v = genFresh(), s = b.surface || {}, t = b.time || {}, tx = b.text || {}, p = b.palette || {};
  v.name = b.name || ''; v.concept = b.concept || ''; v.mood = (b.mood || []).slice(0, 3); v.energy = b.energy == null ? 0.5 : b.energy; v.density = b.density || 'balanced';
  v.type = s.type || 'screen'; v.w = s.w || 1920; v.h = s.h || 1080; v.fps = s.fps || 30; v.pitchMm = s.pitchMm || ''; v.distMin = (s.viewingDistanceM || [])[0] || ''; v.distMax = (s.viewingDistanceM || [])[1] || ''; v.folds = (s.folds || []).join(', ');
  v.preset = (SURFACE_PRESETS.find(q => q.type === v.type && q.w === v.w && q.h === v.h) || { id: 'custom' }).id;
  v.bpm = t.bpm || 120; v.bars = t.bars || 4; v.compositions = b.compositions || 3; v.audio = (b.audio || {}).strategy || 'rhythmic'; v.audioReason = (b.audio || {}).reason || '';
  v.title = tx.title || ''; v.caption = tx.caption || ''; v.data = tx.data || ''; v.words = (tx.words || []).join(' | '); v.path = tx.path || 'none';
  if (p.colors) { v.paletteMode = 'exact'; v.colors = p.colors.slice(); } else if (p.hue != null) { v.paletteMode = 'hue'; v.hue = p.hue; v.scheme = p.scheme || 'analogous'; } else v.paletteMode = 'auto';
  v.focalEvent = b.focalEvent || ''; v.banned = (b.banned || []).join(', '); v.lang = b.lang || '';
  return v;
}
function genApplyPreset(id) {
  const q = SURFACE_PRESETS.find(x => x.id === id); GU.v.preset = id; if (!q) return;
  Object.assign(GU.v, { type: q.type, w: q.w, h: q.h, fps: 30, pitchMm: q.pitchMm || '', distMin: (q.viewingDistanceM || [])[0] || '', distMax: (q.viewingDistanceM || [])[1] || '', folds: (q.folds || []).join(', ') });
}
function genSave() { store.set('gen', GU.v); }
function genSummary(P2) {
  const nl = P2.compositions.reduce((a, c) => a + c.layers.length, 0);
  return T3(`Projeto "${esc(P2.meta.name)}" aberto: ${P2.compositions.length} composições, ${nl} camadas, ${P2.canvas.w}×${P2.canvas.h} a ${P2.canvas.fps} FPS, ${P2.time.bpm} BPM, loop de ${P2.time.bars} compassos. Desfazer (Ctrl+Z) volta ao projeto anterior.`, `Project "${esc(P2.meta.name)}" opened: ${P2.compositions.length} compositions, ${nl} layers, ${P2.canvas.w}×${P2.canvas.h} at ${P2.canvas.fps} FPS, ${P2.time.bpm} BPM, ${P2.time.bars}-bar loop. Undo (Ctrl+Z) returns to the previous project.`);
}
function genEvalHtml(r) {
  if (!r) return '';
  const lg = r.lang, names = { hierarchy: T3('hierarquia', 'hierarchy'), contrast: T3('contraste', 'contrast'), density: T3('densidade', 'density'), breathing: T3('respiro', 'breathing'), motion: T3('movimento', 'motion'), arc: T3('arco', 'arc'), repetition: T3('repetição', 'repetition') };
  return `<h2 class="sec">${T3('Avaliação estrutural', 'Structural evaluation')} <span class="lbl">${r.set}/100</span></h2>
    <p class="note">${T3('Mede defeitos de estrutura, não beleza: nota alta quer dizer "sem defeito estrutural". Olhe a vista e use o seu olho.', 'It measures structural defects, not beauty: a high score means "no structural defect". Look at the view and trust your eye.')}</p>
    ${r.compositions.map(c => `<article class="rcard"><header><b>${esc(c.name)}</b><span class="tag ${c.total >= 75 ? 'f' : 'd'}">${c.total}/100</span></header>
      <dl class="kv">${Object.keys(r.weights).map(k => `<dt>${names[k]} ${c.score[k]}</dt><dd>${c.score[k] >= 60 ? '<span class="dim">' + esc(c.notes[k]) + '</span>' : esc(c.notes[k])}</dd>`).join('')}</dl></article>`).join('')}`;
}
function renderGen() {
  const el = pane('gen'); if (!el) return; const v = GU.v, en = ST.lang === 'en';
  const sel = (id, opts, cur) => `<select id="${id}">${opts.map(([k, l]) => `<option value="${esc(k)}" ${String(cur) === String(k) ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const field = (lab, inner, wide) => `<label class="gf" style="display:flex;flex-direction:column;gap:2px;flex:${wide ? '1 1 100%' : '1 1 120px'};min-width:0"><span class="lbl">${lab}</span>${inner}</label>`;
  const tin = (id, val, ph, type = 'text') => `<input type="${type}" id="${id}" value="${esc(val)}" placeholder="${esc(ph || '')}" autocomplete="off">`;
  const presetOpts = SURFACE_PRESETS.map(q => [q.id, en ? q.en : q.pt]).concat([['custom', T3('Personalizada (digite abaixo)', 'Custom (type below)')]]);
  el.innerHTML = `<h2 class="sec">${T3('Gerar sem IA', 'Generate without AI')} <span class="lbl">${T3('do briefing ao set', 'from brief to set')}</span></h2>
    <p class="note">${T3('Preencha o briefing e clique em Gerar e abrir. O projeto sai pronto, com camadas em tiers, paleta por teoria das cores, movimento por perfil e áudio por estratégia. Tudo é determinístico: o mesmo briefing dá o mesmo projeto.', 'Fill in the brief and click Generate and open. The project comes out ready, with tiered layers, a colour-theory palette, profile-driven motion and strategy-driven audio. Everything is deterministic: the same brief gives the same project.')}</p>
    <div class="row">${field(T3('Nome', 'Name'), tin('gNome', v.name, T3('ex.: Pressão', 'e.g. Pressure')))}${field(T3('Idioma do projeto', 'Project language'), sel('gLang', [['', T3('o da interface', 'the interface one')], ['pt', 'Português'], ['en', 'English']], v.lang))}</div>
    <div class="row">${field(T3('Conceito: sobre o que é a peça e o que o público deve sentir', 'Concept: what the piece is about and what the audience should feel'), `<textarea id="gConceito" rows="3" placeholder="${esc(T3('Uma parede de sinal frio que aperta com a batida e solta na quebra; o público deve sentir pressão contida.', 'A wall of cold signal that tightens with the beat and releases on the break; the crowd should feel contained pressure.'))}">${esc(v.concept)}</textarea>`, true)}</div>
    <h2 class="sec">${T3('Clima (até 3)', 'Mood (up to 3)')}</h2><div class="row chips" id="gMoods">${Object.entries(GEN_MOODS).map(([k, n]) => `<button data-gm="${k}" aria-pressed="${v.mood.includes(k)}">${en ? n[1] : n[0]}</button>`).join('')}</div>
    <div class="row">${field(`${T3('Energia', 'Energy')} <span id="gEnV">${(+v.energy).toFixed(2)}</span>`, `<input type="range" id="gEn" min="0" max="1" step="0.05" value="${v.energy}">`)}${field(T3('Densidade', 'Density'), sel('gDens', [['sparse', T3('esparsa', 'sparse')], ['balanced', T3('equilibrada', 'balanced')], ['dense', T3('densa', 'dense')]], v.density))}</div>
    <h2 class="sec">${T3('Superfície', 'Surface')}</h2>
    <div class="row">${field(T3('Preset', 'Preset'), sel('gPreset', presetOpts, v.preset), true)}</div>
    <div class="row">${field(T3('Tipo', 'Type'), sel('gType', [['led', 'LED'], ['multi', T3('multi-telas', 'multi-screen')], ['projection', T3('projeção', 'projection')], ['mapping', 'mapping'], ['screen', T3('tela', 'screen')]], v.type))}${field(T3('Largura px', 'Width px'), tin('gW', v.w, '', 'text'))}${field(T3('Altura px', 'Height px'), tin('gH', v.h, '', 'text'))}${field('FPS', sel('gFps', [24, 25, 30, 50, 60].map(x => [x, x]), v.fps))}</div>
    <div class="row">${field(T3('Passo do LED (mm)', 'LED pitch (mm)'), tin('gPitch', v.pitchMm, '3.9'))}${field(T3('Distância mín. (m)', 'Min distance (m)'), tin('gDmin', v.distMin, '8'))}${field(T3('Distância máx. (m)', 'Max distance (m)'), tin('gDmax', v.distMax, '40'))}${field(T3('Dobras: x em px, separados por vírgula', 'Folds: x in px, comma separated'), tin('gFolds', v.folds, '2250'))}</div>
    <h2 class="sec">${T3('Tempo e som', 'Time and sound')}</h2>
    <div class="row">${field('BPM', tin('gBpm', v.bpm))}${field(T3('Compassos do loop', 'Loop bars'), sel('gBars', [1, 2, 4, 8, 16, 32].map(x => [x, x]), v.bars))}${field(T3('Composições', 'Compositions'), sel('gComps', [1, 2, 3, 4, 5, 6].map(x => [x, x]), v.compositions))}${field(T3('Estratégia de áudio', 'Audio strategy'), sel('gAudio', [['none', T3('nenhuma (peça muda)', 'none (silent piece)')], ['subtle', T3('sutil', 'subtle')], ['structural', T3('estrutural', 'structural')], ['rhythmic', T3('rítmica', 'rhythmic')], ['full', T3('completa', 'full')]], v.audio))}</div>
    <div class="row" id="gReasonRow" ${v.audio === 'none' ? '' : 'hidden'}>${field(T3('Por que a peça é muda', 'Why the piece is silent'), tin('gReason', v.audioReason, ''), true)}</div>
    <h2 class="sec">${T3('Texto (só palavras exatas)', 'Text (exact words only)')}</h2>
    <div class="row">${field(T3('Título', 'Title'), tin('gTitle', v.title))}${field(T3('Legenda', 'Caption'), tin('gCap', v.caption))}${field(T3('Dados', 'Data'), tin('gData', v.data))}</div>
    <div class="row">${field(T3('Palavras grandes, separadas por |', 'Big words, separated by |'), tin('gWords', v.words, 'SINAL | PRESSÃO'), true)}${field(T3('Texto em caminho', 'Text on a path'), sel('gPath', [['none', T3('reto', 'straight')], ['circle', T3('círculo', 'circle')], ['wave', T3('onda', 'wave')], ['line', T3('linha inclinada', 'slanted line')]], v.path))}</div>
    <h2 class="sec">${T3('Cor', 'Colour')}</h2>
    <div class="row">${field(T3('Como escolher', 'How to choose'), sel('gPalMode', [['auto', T3('automática pelo clima', 'automatic from the mood')], ['hue', T3('matiz e esquema', 'hue and scheme')], ['exact', T3('4 cores exatas', '4 exact colours')]], v.paletteMode))}
      <span id="gPalHue" ${v.paletteMode === 'hue' ? '' : 'hidden'} class="row" style="flex:2 1 240px">${field(T3('Matiz 0–360', 'Hue 0–360'), tin('gHue', v.hue))}${field(T3('Esquema', 'Scheme'), sel('gScheme', ['mono', 'analogous', 'complement', 'split', 'triad', 'tetrad'].map(x => [x, x]), v.scheme))}</span>
      <span id="gPalEx" ${v.paletteMode === 'exact' ? '' : 'hidden'} class="row" style="flex:2 1 240px">${['bg', 'primary', 'secondary', 'accent'].map((r, i) => `<label class="gf"><span class="lbl">${{ bg: T3('fundo', 'ground'), primary: T3('primária', 'primary'), secondary: T3('secundária', 'secondary'), accent: T3('acento', 'accent') }[r]}</span><input type="color" data-gc="${i}" value="${esc(v.colors[i])}" style="min-height:28px;width:56px;padding:0"></label>`).join('')}</span></div>
    <h2 class="sec">${T3('Direção', 'Direction')}</h2>
    <div class="row">${field(T3('Evento focal: a única coisa que domina a peça', 'Focal event: the one thing that dominates the piece'), tin('gFocal', v.focalEvent, T3('um túnel de retângulos que estala no bumbo', 'a tunnel of rectangles that snaps on the kick')), true)}</div>
    <div class="row">${field(T3('Banidos, separados por vírgula', 'Banned, comma separated'), tin('gBan', v.banned, T3('flare, brilho neon, explosões de partículas', 'lens flares, neon glow, particle bursts')), true)}</div>
    <div class="row"><button id="gGo" class="on">${T3('Gerar e abrir', 'Generate and open')}</button><button id="gEval" ${GU.result ? '' : 'disabled'}>${T3('Avaliar o projeto', 'Evaluate the project')}</button><button id="gSave">${T3('Salvar briefing (.json)', 'Save brief (.json)')}</button><button id="gLoad">${T3('Carregar briefing…', 'Load brief…')}</button><button id="gReset">${T3('Limpar', 'Clear')}</button><input type="file" id="gFile" accept=".json,application/json" hidden></div>
    <div id="gMsg" class="note" role="status" aria-live="polite">${GU.err ? `<b>${T3('Corrija:', 'Fix:')}</b><br>${GU.err.map(esc).join('<br>')}` : GU.result ? genSummary(GU.result) : ''}</div>
    <div id="gEvalOut">${GU.busy ? `<p class="note">${T3('Avaliando… (renderiza 24 quadros por composição)', 'Evaluating… (renders 24 frames per composition)')}</p>` : genEvalHtml(GU.evalRes)}</div>`;
  genBind(el);
}
function genBind(el) {
  const v = GU.v, q = id => $('#' + id, el), on = (id, ev, fn) => { const n = q(id); if (n) n.addEventListener(ev, fn); };
  const text = (id, key) => on(id, 'input', e => { v[key] = e.target.value; genSave(); });
  text('gNome', 'name'); text('gConceito', 'concept'); text('gW', 'w'); text('gH', 'h'); text('gPitch', 'pitchMm'); text('gDmin', 'distMin'); text('gDmax', 'distMax'); text('gFolds', 'folds'); text('gBpm', 'bpm'); text('gReason', 'audioReason');
  text('gTitle', 'title'); text('gCap', 'caption'); text('gData', 'data'); text('gWords', 'words'); text('gHue', 'hue'); text('gFocal', 'focalEvent'); text('gBan', 'banned');
  const pick = (id, key, num) => on(id, 'change', e => { v[key] = num ? +e.target.value : e.target.value; genSave(); });
  pick('gLang', 'lang'); pick('gDens', 'density'); pick('gFps', 'fps', true); pick('gBars', 'bars', true); pick('gComps', 'compositions', true); pick('gPath', 'path'); pick('gScheme', 'scheme');
  on('gType', 'change', e => { v.type = e.target.value; v.preset = 'custom'; q('gPreset').value = 'custom'; genSave(); });
  ['gW', 'gH'].forEach(id => on(id, 'input', () => { v.preset = 'custom'; q('gPreset').value = 'custom'; }));
  on('gEn', 'input', e => { v.energy = +e.target.value; q('gEnV').textContent = v.energy.toFixed(2); genSave(); });
  on('gAudio', 'change', e => { v.audio = e.target.value; q('gReasonRow').hidden = v.audio !== 'none'; genSave(); });
  on('gPalMode', 'change', e => { v.paletteMode = e.target.value; q('gPalHue').hidden = v.paletteMode !== 'hue'; q('gPalEx').hidden = v.paletteMode !== 'exact'; genSave(); });
  $$('[data-gc]', el).forEach(i => i.addEventListener('input', () => { v.colors[+i.dataset.gc] = i.value; genSave(); }));
  on('gPreset', 'change', e => { genApplyPreset(e.target.value); genSave(); renderGen(); });
  $$('#gMoods [data-gm]', el).forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.gm, i = v.mood.indexOf(k);
    if (i >= 0) v.mood.splice(i, 1); else if (v.mood.length < 3) v.mood.push(k); else { toast(T3('No máximo 3 climas: tire um antes.', 'At most 3 moods: remove one first.'), 1800); return; }
    b.setAttribute('aria-pressed', v.mood.includes(k)); genSave();
  }));
  on('gGo', 'click', genGo); on('gEval', 'click', genEval); on('gSave', 'click', genSaveBrief);
  on('gLoad', 'click', () => q('gFile').click());
  on('gFile', 'change', async e => { const f = e.target.files[0]; if (!f) return; try { Object.assign(GU.v, genFromBrief(JSON.parse(await f.text()))); genSave(); GU.err = null; renderGen(); toast(T3('Briefing carregado: confira e clique em Gerar', 'Brief loaded: check it and click Generate'), 2400); } catch (err) { toast(T3('Arquivo inválido: ', 'Invalid file: ') + err.message, 3600); } e.target.value = ''; });
  on('gReset', 'click', () => { GU.v = genFresh(); GU.err = null; GU.result = null; GU.evalRes = null; genSave(); renderGen(); });
}
function genGo() {
  const brief = genToBrief(GU.v), errs = GENAI.checkBrief(brief); GU.brief = brief; GU.evalRes = null;
  if (errs.length) { GU.err = errs; renderGen(); toast(T3('Faltam dados no briefing', 'The brief is incomplete'), 2400); return; }
  GU.err = null;
  try { const proj = GENAI.build(brief); if (importJson(JSON.stringify(proj))) { GU.result = P; } } catch (e) { GU.err = [String(e.message)]; }
  renderGen();
}
async function genEval() {
  if (GU.busy || !GU.result) return; GU.busy = true; renderGen(); await new Promise(r => setTimeout(r, 60));
  try { GU.evalRes = EVALUATOR.run(ST.lang); } catch (e) { GU.err = [String(e.message)]; }
  GU.busy = false; renderGen();
}
function genSaveBrief() {
  const brief = genToBrief(GU.v), errs = GENAI.checkBrief(brief);
  if (errs.length) { GU.err = errs; renderGen(); return; }
  saveFile((brief.name || 'briefing').toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.brief.json', new Blob([JSON.stringify(brief, null, 2) + '\n'], { type: 'application/json' }));
}
