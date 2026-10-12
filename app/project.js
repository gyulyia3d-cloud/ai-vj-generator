/* Auditoria, arquivos embutidos, folha de contato, projeto e normalização (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores PROJECT. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- auditoria: determinismo, tempo e camada em branco ---------- */
const AUDIT = new Map(), AUDIT_TYPES = ['code', 'pixeltext', 'symbols', 'hazard', 'blocks', 'logo', 'glyphs'];
function pixHash(ctx, w, h) {
  const d = ctx.getImageData(0, 0, w, h).data; let x = 2166136261, any = false;
  for (let i = 0; i < d.length; i += 16) { const a = d[i + 3]; if (a) any = true; x = Math.imul(x ^ (a | (d[i] << 8)), 16777619); }
  return { h: x >>> 0, any };
}
function layerAudit(comp, L, i) {
  const key = JSON.stringify([L.type, L.p, L.vars, P.canvas.w, P.canvas.h, P.canvas.folds, P.canvas.gutter, P.seed, P.time.bpm, P.time.bars, P.canvas.fps, Object.entries(MEDIA).map(([k, m]) => k + m.w).join('|')]);
  const hit = AUDIT.get(key); if (hit) return hit;
  const W = P.canvas.w, H = P.canvas.h, sc = Math.min(0.5, 1600 / W), w = Math.max(8, Math.round(W * sc)), h = Math.max(8, Math.round(H * sc));
  const cv = document.createElement('canvas'); cv.width = w; cv.height = h; const ctx = cv.getContext('2d', { willReadFrequently: true });
  const LF = loopFrames(), fr = [0, 0.17, 0.33, 0.5, 0.67, 0.83].map(f => Math.round(LF * f)), live = ST.live, hs = []; let ms = 0, any = false, det = true;
  const was = EXPORTING; EXPORTING = true; ST.live = false;
  try {
    const run = n => { const t0 = performance.now(); renderLayer(ctx, comp, L, i, frameAt(n, comp), sc, W, H); const dt = performance.now() - t0, ph = pixHash(ctx, w, h); return { dt, ph }; };
    fr.forEach((n, q) => { const o = run(n); if (q > 0) ms += o.dt; hs.push(o.ph.h); if (o.ph.any) any = true; });
    ms /= Math.max(1, fr.length - 1);
    const again = run(fr[1]); if (again.ph.h !== hs[1]) det = false;
    const again0 = run(fr[0]); if (again0.ph.h !== hs[0]) det = false;
  } catch (e) { det = true; }
  EXPORTING = was; ST.live = live;
  const a = { det, ms, blank: !any && !LAYER_ERR.has(L) }; if (AUDIT.size > 200) AUDIT.clear(); AUDIT.set(key, a); return a;
}

/* ---------- arquivos embutidos no projeto: imagens e fontes viajam dentro do JSON ---------- */
const FONT_DATA = {};
const imgFrom = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('imagem inválida')); i.src = src; });
const readDataUrl = f => new Promise(res => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = () => res(''); fr.readAsDataURL(f); });
const dataToBuf = d => { const b = atob(d.slice(d.indexOf(',') + 1)), u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u.buffer; };
const ASSET_JOBS = [];
function loadAssets(pr) { const p = loadAssets0(pr); ASSET_JOBS.push(p); return p; }
async function loadAssets0(pr) {
  const as = (pr && pr.assets) || {}; let n = 0; const logos = [];
  for (const [name, a] of Object.entries(as)) {
    if (!a || typeof a.data !== 'string' || a.data.slice(0, 5) !== 'data:') continue;
    try {
      if (a.kind === 'image' && !MEDIA[name]) { const img = await imgFrom(a.data); MEDIA[name] = { kind: 'image', name, img, url: a.data, data: a.data, w: img.naturalWidth, h: img.naturalHeight }; n++; if (a.logo) logos.push(name); }
      else if (a.kind === 'splat' && !MEDIA[name]) { const o = splatUnpack(a.data); MEDIA[name] = Object.assign(o, { name, url: a.data, data: a.data }); n++; }
      else if (a.kind === 'model' && !MEDIA[name]) { const mod = await modelFromData(a.name || name, a.data); MEDIA[name] = Object.assign(mod, { name, url: a.data, data: a.data }); n++; }
      else if (a.kind === 'font' && !CUSTOM_FONTS.includes(name)) { const ff = new FontFace(name, dataToBuf(a.data)); await ff.load(); document.fonts.add(ff); CUSTOM_FONTS.push(name); FONT_DATA[name] = a.data; n++; }
    } catch (e) { console.warn('arquivo embutido', name, e); }
  }
  for (const name of logos) await toLogo(name);
  if (n) { renderMedia(); renderLayers(); renderParams(); }
}
function collectAssets() {
  const o = {};
  for (const [id, m] of Object.entries(MEDIA)) if (m.kind === 'image' && m.data) o[id] = { kind: 'image', data: m.data }; else if (m.kind === 'model' && m.data) o[id] = { kind: 'model', name: id, data: m.data }; else if (m.kind === 'splat' && m.data) o[id] = { kind: 'splat', name: id, data: m.data };
  for (const [n, d] of Object.entries(FONT_DATA)) o[n] = { kind: 'font', data: d };
  return o;
}
const projectOut = () => Object.assign({}, P, { assets: collectAssets() });
/* logo → máscara branca com alpha: tira o fundo (pelo contraste com os cantos), pinta de branco e recorta rente */
async function toLogo(id) {
  const m = MEDIA[id]; if (!m || m.kind !== 'image') return;
  const k = Math.min(1, 2400 / Math.max(m.w, m.h)), cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(m.w * k)); cv.height = Math.max(1, Math.round(m.h * k));
  const x = cv.getContext('2d', { willReadFrequently: true }); x.drawImage(m.img, 0, 0, cv.width, cv.height);
  const d = x.getImageData(0, 0, cv.width, cv.height), q = d.data; let varia = false;
  for (let i = 3; i < q.length; i += 4) if (q[i] < 250) { varia = true; break; }
  if (!varia) {
    const cs = [[0, 0], [cv.width - 1, 0], [0, cv.height - 1], [cv.width - 1, cv.height - 1]].map(([a, b]) => (b * cv.width + a) * 4), bg = [0, 1, 2].map(c => cs.reduce((t, o) => t + q[o + c], 0) / 4);
    for (let i = 0; i < q.length; i += 4) { const dist = Math.max(Math.abs(q[i] - bg[0]), Math.abs(q[i + 1] - bg[1]), Math.abs(q[i + 2] - bg[2])); q[i + 3] = Math.round(255 * clamp((dist - 60) / 105, 0, 1)); }
  }
  let x0 = cv.width, y0 = cv.height, x1 = 0, y1 = 0;
  for (let i = 0; i < q.length; i += 4) { q[i] = q[i + 1] = q[i + 2] = 255; if (q[i + 3] > 8) { const p = i / 4, xx = p % cv.width, yy = (p / cv.width) | 0; if (xx < x0) x0 = xx; if (xx > x1) x1 = xx; if (yy < y0) y0 = yy; if (yy > y1) y1 = yy; } }
  x.putImageData(d, 0, 0);
  let out = cv; if (x1 > x0 && y1 > y0) { out = document.createElement('canvas'); out.width = x1 - x0 + 1; out.height = y1 - y0 + 1; out.getContext('2d').drawImage(cv, x0, y0, out.width, out.height, 0, 0, out.width, out.height); }
  const data = out.toDataURL('image/png'), img = await imgFrom(data);
  MEDIA[id] = Object.assign({}, m, { img, url: data, data, w: img.naturalWidth, h: img.naturalHeight });
  AUDIT.clear(); renderMedia(); if (!ST.qa) toast('Logo convertido: branco com alpha, recortado rente'); commit();
}

/* ---------- folha de contato: o QA visual que a skill e a pessoa conferem antes de exportar ---------- */
function contactSheet(ci, o) {
  o = o || {}; ci = ci ?? ST.ci; const comp = P.compositions[ci], W = P.canvas.w, H = P.canvas.h, beats = o.beats || [0.15, 1.1, 2.25, 3.3, 3.85, 5.2], sc = Math.min(1, (o.width || 2560) / W), w = Math.round(W * sc), h = Math.round(H * sc);
  const sheet = document.createElement('canvas'); sheet.width = w; sheet.height = h * beats.length; const sx = sheet.getContext('2d');
  const lay = document.createElement('canvas'); lay.width = w; lay.height = h; const lx = lay.getContext('2d', { willReadFrequently: true });
  const cmp = document.createElement('canvas'); cmp.width = w; cmp.height = h; const cx = cmp.getContext('2d');
  const live = ST.live, was = EXPORTING, wasA = RENDER_ALPHA; ST.live = false; EXPORTING = true; RENDER_ALPHA = true;
  const fpb = P.canvas.fps * 60 / P.time.bpm, luma = o.luma ?? (EXP.luma || P.palette.mode === 'white-alpha');
  try {
    sx.fillStyle = '#000'; sx.fillRect(0, 0, sheet.width, sheet.height);
    beats.forEach((b, row) => {
      const F = frameAt(Math.round(b * fpb), comp); cx.setTransform(1, 0, 0, 1, 0, 0); cx.globalCompositeOperation = 'source-over'; cx.globalAlpha = 1; cx.clearRect(0, 0, w, h);
      comp.layers.forEach((L, i) => {
        if (!L.on || L.type === 'bg') return;
        renderLayer(lx, comp, L, i, F, sc, W, H, BELOW_TYPES.has(L.type) ? cmp : undefined); if (luma) lumaKey(lx, w, h);
        cx.globalAlpha = L.opacity; cx.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); cx.drawImage(lay, 0, 0); cx.globalAlpha = 1; cx.globalCompositeOperation = 'source-over';
      });
      sx.drawImage(cmp, 0, row * h);
      if (o.guides !== false) {
        sx.fillStyle = 'rgba(255,42,61,.85)'; (P.canvas.folds || []).forEach(f => { sx.fillRect(Math.round(f * sc) - 1, row * h, 2, Math.max(6, h * 0.03)); const gu = (P.canvas.gutter ?? 90) * unitOf(W, H) * sc; sx.fillRect(Math.round(f * sc - gu / 2), row * h, 1, Math.max(4, h * 0.02)); sx.fillRect(Math.round(f * sc + gu / 2), row * h, 1, Math.max(4, h * 0.02)); });
        sx.fillRect(0, row * h + h - 1, w, 1);
      }
    });
  } finally { ST.live = live; EXPORTING = was; RENDER_ALPHA = wasA; }
  return sheet;
}

function defaults(type) { const o = {}; for (const d of COMMON_FLAT) o[d.k] = d.d; const g = GEN[type]; if (g) for (const d of g.params) o[d.k] = d.d; if (type === 'shader') { const s = SHADERS['CAMPO FBM']; ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => o[k] = s.d[i]); o.audio = 0.8; o.band = 'bass'; } return o; }
const DEFCACHE = {};
function pm(L) {
  const d = DEFCACHE[L.type] || (DEFCACHE[L.type] = defaults(L.type)), o = Object.assign({}, d, L.p);
  if (L.type === 'shader') { const s = SHADERS[o.preset]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => { if (L.p[k] == null) o[k] = s.d[i]; }); }
  if (L.type === 'fx') { const s = FX[o.preset]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => { if (L.p[k] == null) o[k] = s.d[i]; }); }
  if (L.type === 'temporal') { const s = TM.PRESETS[o.preset]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => { if (L.p[k] == null) o[k] = s.d[i]; }); }
  if (L.type === 'field') { const s = FLD[o.kind]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => { if (L.p[k] == null) o[k] = s.d[i]; }); }
  if (L.type === 'solid') { const s = SOL[o.kind]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((k, i) => { if (L.p[k] == null) o[k] = s.d[i]; }); }
  if (L.vars) for (const d of L.vars) if (o['v_' + d.k] === undefined) o['v_' + d.k] = d.d;
  return o;
}

/* ---------- projeto ---------- */
const FIXED = [['shader', 'SHADER'], ['image', 'IMAGEM'], ['video', 'VÍDEO'], ['model', 'OBJETO 3D'], ['shape', 'FORMA'], ['text', 'TEXTO']];
const mk = (type, name, on = true, p = {}, opacity = 1, blend = 'normal') => ({ type, name, on, opacity, blend, p });
const fixedSlots = () => FIXED.map(([t, n]) => mk(t, n, false));
/* o STANDARD (biblioteca original) fixa seus textos aqui; os geradores em si são neutros e não carregam nada de nenhuma peça */
const STD_P = {
  structure: { spiral: true, angle: true },
  measure: { tag: 'ALVO', conf: true },
  data: { teleTxt: STD_TELE, tags: 'SCAN,ORG,PHYLLO,NODE,TRACK,SIG,BIO,GRID,CFTV,NEUR' },
  hud: { sub: 'SISTEMA DE LEITURA / ORGANISMO 01 / SCAN ATIVO', date: '25.26.27.09 · 02.03.10.2026 · SÃO PAULO', foot: 'N 2400 · ÂNGULO ÁUREO 137.508° · FILOTAXIA', retLabel: 'ORG_01 / CENTRO' },
  event: { words: 'PADRÃO DETECTADO', sub: 'ALVO {ID} · 137.508° · CONF {CONF}' }
};
function stdLayers(over = {}) {
  const o = k => Object.assign({}, over[k] || {}, { p: Object.assign({}, STD_P[k] || {}, (over[k] || {}).p || {}) });
  return [
    mk('bg', 'FUNDO', o('bg').on ?? true, o('bg').p || {}), mk('organism', 'MATÉRIA', o('organism').on ?? true, o('organism').p || {}, o('organism').opacity ?? 1),
    mk('structure', 'ESTRUTURA', o('structure').on ?? true, o('structure').p || {}), mk('measure', 'MEDIÇÃO', o('measure').on ?? true, o('measure').p || {}),
    mk('data', 'DADOS', o('data').on ?? true, o('data').p || {}), mk('hud', 'MOLDURA HUD', o('hud').on ?? true, o('hud').p || {}),
    mk('event', 'EVENTO', o('event').on ?? true, o('event').p || {}), mk('post', 'PÓS', o('post').on ?? true, o('post').p || {}),
    ...fixedSlots()
  ];
}
function standardProject() {
  return {
    schema: 'ai-vj-generator/1', id: 'standard',
    meta: { name: 'GYULYIA® — MOTOR DE CAMADAS', artist: 'GYULYIA', context: 'STANDARD · biblioteca original', brief: 'Graphic Realism: um organismo em filotaxia sendo lido por um aparelho de vigilância. Cada camada tem uma função, um tipo de movimento e um tempo.',
      grammar: { form: 'Pontos em ângulo áureo, grade, réguas, colchetes', motion: 'Interface em degrau, matéria em curva', rhythm: 'Beat comanda tudo; ¼ de beat atualiza dados', color: 'Preto, osso, cinza; um acento como alerta (5%)', density: 'Densa em dados, vazia ao redor do organismo', depth: 'Pilha de 8 planos', texture: 'Grão vivo, scanline', transition: 'Wipe de 3 quadros', audio: 'Pulso no beat; áudio opcional' } },
    canvas: { w: 1920, h: 1080, fps: 30, target: 'screen', safe: 0.05, displays: [] },
    time: { bpm: 128, bars: 8, loop: true, seamless: true, mode: 'loop', transition: 'cut', trBeats: 1 },
    audio: { reactive: true, sens: 1, smooth: 0.7 },
    seed: 184729,
    palette: clone(PALS.STANDARD),
    compositions: [
      { id: 's1', name: 'MOTOR', hypothesis: 'O motor original completo: as 8 camadas como no artefato de referência.', motion: 'step', layers: stdLayers() },
      { id: 's2', name: 'ESTRUTURA', hypothesis: 'Só o aparelho: grade, réguas e retícula. O organismo vira fantasma.', motion: 'step', layers: stdLayers({ organism: { opacity: 0.3 }, data: { on: false }, measure: { on: false }, post: { p: { prob: 0.15 } } }) },
      { id: 's3', name: 'VARREDURA', hypothesis: 'O organismo no centro, maior, em movimento suave; a leitura fica em segundo plano.', motion: 'smooth', palette: { accent: '#1F3BFF' }, layers: stdLayers({ organism: { p: { cx: 0.5, size: 1.45, scanBars: '1', breathe: 1 } }, data: { on: false }, structure: { p: { gridA: 0.04 } } }) },
      { id: 's4', name: 'DADOS', hypothesis: 'Densidade de informação: logs longos, evento a cada 4 compassos, glitch frequente.', motion: 'step', layers: stdLayers({ data: { p: { rows: 60 } }, event: { p: { every: 4 } }, post: { p: { prob: 0.7, slices: 12 } } }) },
      { id: 's5', name: 'ALARME', hypothesis: 'O evento domina: acento vermelho, palavra a cada 2 compassos, matéria acelerada.', motion: 'step', palette: { accent: '#FF2A3D' }, layers: stdLayers({ event: { p: { every: 2, words: 'PADRÃO DETECTADO|ANOMALIA|LOCK' } }, organism: { p: { spin: 3 } } }) }
    ]
  };
}

/* ---------- normalização (JSON vindo da skill) ---------- */
const WARN_LOAD = [];
function normalize(o) {
  WARN_LOAD.length = 0;
  if (!o || typeof o !== 'object') throw new Error('JSON vazio');
  const mig = MIGRATE.run(o); o = mig.project; MIGRATE.describe(mig).forEach(w => WARN_LOAD.push(w));   /* fase 19: projeto antigo sobe até o formato atual numa cópia */
  const pr = Object.assign({ schema: 'ai-vj-generator/2', id: 'proj-' + Date.now().toString(36) }, o); /* /1 continua válido: /2 só acrescenta meta.contract, capabilities e layer.role */
  pr.meta = Object.assign({ name: 'SEM TÍTULO', artist: '', context: '', brief: '', grammar: {} }, o.meta || {});
  pr.canvas = Object.assign({ w: 1920, h: 1080, fps: 30, target: 'screen', safe: 0.05, displays: [] }, o.canvas || {});
  pr.canvas.w = clamp(Math.round(+pr.canvas.w || 1920), 16, 16384); pr.canvas.h = clamp(Math.round(+pr.canvas.h || 1080), 16, 16384);
  if (!pr.meta.briefPalette && pr.palette && pr.palette.mode !== 'white-alpha' && pr.palette.bg) pr.meta.briefPalette = { bg: pr.palette.bg, primary: pr.palette.primary, secondary: pr.palette.secondary, accent: pr.palette.accent, field: pr.palette.field };
  pr.time = Object.assign({ bpm: 120, bars: 4, loop: true, seamless: true, mode: 'loop', transition: 'cut', trBeats: 1 }, o.time || {});
  pr.time.bpm = clamp(+pr.time.bpm || 120, 40, 240);
  pr.audio = Object.assign({ reactive: true, sens: 1, smooth: 0.7 }, o.audio || {});
  pr.seed = Math.floor(+o.seed || 184729);
  pr.palette = Object.assign(clone(PALS.MONO), o.palette || {});
  if (pr.palette.mode === 'white-alpha') { const q = o.palette || {}; Object.assign(pr.palette, { bg: '#000000', primary: '#FFFFFF', secondary: q.secondary || '#B8B8B8', accent: q.accent || '#FFFFFF', field: q.field || '#6E6E6E' }); }
  else { delete pr.palette.mode; if (!(o.palette && o.palette.field)) pr.palette.field = mixHex(pr.palette.bg, pr.palette.primary, 0.43); }
  /* paredes: dobras em px do canvas (x), calha em unidades de 1080 */
  pr.canvas.folds = (Array.isArray(pr.canvas.folds) ? pr.canvas.folds : []).map(Number).filter(x => x > 0 && x < pr.canvas.w).sort((a, b) => a - b);
  pr.canvas.gutter = clamp(+pr.canvas.gutter || 90, 0, 600);
  pr.assets = o.assets && typeof o.assets === 'object' ? o.assets : {};
  pr.compositions = (Array.isArray(o.compositions) ? o.compositions : []).map((c, i) => {
    const cc = Object.assign({ id: 'c' + (i + 1), name: 'COMP ' + pad(i + 1, 2), hypothesis: '', motion: 'step' }, c);
    cc.layers = (c.layers || []).filter(L => { if (!GEN[L.type]) { WARN_LOAD.push(`Camada "${L.name || L.type}" ignorada: tipo desconhecido.`); return false; } return true; })
      .map(L => Object.assign({ name: GEN[L.type].label.toUpperCase(), on: true, opacity: 1, blend: 'normal', p: {} }, L, { p: Object.assign({}, L.p || {}) }));
    cc.layers.forEach(L => { if (L.vars !== undefined) L.vars = cleanVars(L.vars); });
    for (const [t, n] of FIXED) if (!cc.layers.some(L => L.type === t)) cc.layers.push(mk(t, n, false));
    return cc;
  });
  if (!pr.compositions.length) throw new Error('O projeto não tem composições.');
  return pr;
}
