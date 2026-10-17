/* Camadas base L0 a L7 (fase 18): fundo, organismo em filotaxia, estrutura, medição, dados, moldura HUD, evento e pós.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores LAYERSBASE. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ===== L0 · FUNDO ===== */
let GRAIN = [];
function buildGrain() {
  GRAIN = [];
  for (let t = 0; t < 6; t++) {
    const cv = document.createElement('canvas'); cv.width = 384; cv.height = 216;
    const g = cv.getContext('2d'), im = g.createImageData(384, 216), d = im.data, r = mulberry(SEED + t * 977);
    for (let i = 0; i < d.length; i += 4) { const v = r() * 255; d[i] = d[i + 1] = d[i + 2] = v; d[i + 3] = r() < 0.5 ? 22 : 0; }
    g.putImageData(im, 0, 0); GRAIN.push(cv);
  }
}
reg('bg', 'Fundo', 'standard', [B('fill', 'Preencher', true), C('color', 'Cor', 'bg'), N('grain', 'Grão', 0.55, 0, 1), N('grainRate', 'Troca do grão (quadros)', 3, 1, 12, 1)], (c, R) => {
  const { p, F, comp, W, H } = R;
  if (p.fill) { c.fillStyle = col(comp, p.color); c.fillRect(-W, -H, W * 3, H * 3); }
  if (p.grain > 0 && GRAIN.length) {
    const tile = GRAIN[Math.floor(hr(Math.floor(F.n / p.grainRate), 5) * GRAIN.length)];
    c.globalAlpha = p.grain; c.imageSmoothingEnabled = false; c.drawImage(tile, 0, 0, W, H); c.imageSmoothingEnabled = true; c.globalAlpha = 1;
  }
});

/* ===== L1 · MATÉRIA — organismo em filotaxia ===== */
const ORGC = {};
function orgData(n) {
  if (ORGC.n === n && ORGC.seed === SEED) return ORGC;
  const R = 1.4, PX = new Float32Array(n), PY = new Float32Array(n), AR = new Float32Array(n), RA = new Float32Array(n), r = mulberry(SEED);
  for (let i = 0; i < n; i++) { const rr = R * Math.sqrt((i + 0.5) / n), th = i * GA; PX[i] = rr * Math.cos(th); PY[i] = rr * Math.sin(th); AR[i] = rr / R; RA[i] = r(); }
  const segs = [];
  const seg = (a, b) => segs.push(a[0], a[1], a[2], b[0], b[1], b[2]);
  const ring = (count, len, wid, off, droop) => {
    for (let q = 0; q < count; q++) {
      const a = q / count * TAU + off, ca = Math.cos(a), sa = Math.sin(a), rot = v => [v[0] * ca - v[1] * sa, v[0] * sa + v[1] * ca, v[2]];
      const pts = [], St = 22;
      for (let s = 0; s <= St; s++) { const t = s / St; pts.push(rot([R * 0.96 + t * len, wid * Math.sin(Math.PI * t) * (1 - 0.35 * t), -droop * t * t])); }
      for (let s = St; s >= 0; s--) { const t = s / St; pts.push(rot([R * 0.96 + t * len, -wid * Math.sin(Math.PI * t) * (1 - 0.35 * t), -droop * t * t])); }
      for (let k = 0; k < pts.length - 1; k++) seg(pts[k], pts[k + 1]);
      seg(rot([R * 0.96, 0, 0]), rot([R * 0.96 + len * 0.8, 0, -droop * 0.64]));
    }
  };
  ring(13, R * 0.75, 0.2, 0, 0.35); ring(21, R * 0.48, 0.11, Math.PI / 21, 0.12);
  const ringSegs = [];
  for (let k = 0; k < 96; k += 2) { const a1 = k / 96 * TAU, a2 = (k + 1) / 96 * TAU, rr = R * 1.95; ringSegs.push(rr * Math.cos(a1), rr * Math.sin(a1), -0.2, rr * Math.cos(a2), rr * Math.sin(a2), -0.2); }
  Object.assign(ORGC, { n, seed: SEED, R, PX, PY, AR, RA, segs: new Float32Array(segs), ringSegs: new Float32Array(ringSegs), E: null, P3: null });
  return ORGC;
}
function orgView(p, F, W, H, still) {
  const u = unitOf(W, H), sc = u * 540 * 3.487 * p.size, ls = loopSec(), seam = P.time.loop && P.time.seamless;
  let ang = 0;
  if (!still) {
    const c0 = p.spin * 0.06 * ls / TAU;
    if (seam) { const c = Math.round(c0); ang = c ? TAU * F.ph * c : 0.18 * p.spin * Math.sin(TAU * F.ph); } else ang = F.t * 0.06 * p.spin;
  }
  const tx = p.tiltX * Math.PI / 180, ty = p.tiltY * Math.PI / 180;
  const ca = Math.cos(ang), sa = Math.sin(ang), cx_ = Math.cos(tx), sx_ = Math.sin(tx), cy_ = Math.cos(ty), sy_ = Math.sin(ty);
  const ox = p.cx * W, oy = p.cy * H;
  const bc = seam ? Math.max(1, Math.round(0.9 * ls / TAU)) : 0.9 * ls / TAU, zc = seam ? Math.max(1, Math.round(1.3 * ls / TAU)) : 1.3 * ls / TAU;
  return {
    u, bA: TAU * F.ph * bc, zA: TAU * F.ph * zc,
    proj(x, y, z, o) {
      const X = x * ca - y * sa, Y = x * sa + y * ca;
      const X2 = X * cy_ + z * sy_, Z2 = -X * sy_ + z * cy_;
      const Y3 = Y * cx_ - Z2 * sx_, Z3 = Y * sx_ + Z2 * cx_;
      const d = 10 - Z3; o.x = ox + X2 * sc / d; o.y = oy - Y3 * sc / d; o.d = d; return o;
    }
  };
}
function orgPoint(D, i, p, v, o) {
  const rn = D.AR[i], k = 1 + 0.03 * p.breathe * Math.sin(v.bA + D.RA[i] * TAU);
  const z = 0.8 * (1 - rn * rn) + 0.12 * p.breathe * Math.sin(v.zA - rn * 9);
  return v.proj(D.PX[i] * k, D.PY[i] * k, z, o);
}
/* linhas e plexus do organismo (Elementos 3D): linhas seguem as espirais 13 e 21 da filotaxia; o plexus liga vizinhos no espaço 3D. Usa o render de app/elements3d.js. */
function orgMesh(c, D, p, v, scan, u, prim, acc) {
  const n = D.n, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), K = new Float32Array(n), hot = new Uint8Array(n), o = {}, Q = { X, Y, Z, K, n };
  for (let i = 0; i < n; i++) { orgPoint(D, i, p, v, o); X[i] = o.x; Y[i] = o.y; Z[i] = (10 - o.d) / 1.4; K[i] = 10 / o.d; if (Math.abs(D.AR[i] - scan) < 0.035) hot[i] = 1; }
  if (p.render === 'lines') {
    if (!D.E) { D.E = []; for (let i = 0; i < n; i++) { if (i >= 13) D.E.push([i, i - 13]); if (i >= 21) D.E.push([i, i - 21]); } }
    e3Lines(c, Q, D.E, hot, Math.max(0.5, u * p.dot), prim, acc);
  } else {
    if (!D.P3) D.P3 = Array.from({ length: n }, (_, i) => [D.PX[i] / D.R, D.PY[i] / D.R, 0.8 * (1 - D.AR[i] * D.AR[i]) / D.R]);
    e3Plexus(c, Q, D.P3, hot, p.reach, Math.max(0.5, u * p.dot), 2.4 * u * p.dot, prim, acc);
  }
}
function orgParams(comp) { const L = comp.layers.find(l => l.type === 'organism'); return pm(L || { type: 'organism', p: {} }); }
function orgCenter(comp, W, H) {
  const p = orgParams(comp), v = orgView(p, { ph: 0, t: 0 }, W, H, true);
  const C = v.proj(0, 0, 0.4, {}), a = v.proj(0, 0, 0, {}), b = v.proj(1.4, 0, 0, {});
  return { x: C.x, y: C.y, r: Math.hypot(b.x - a.x, b.y - a.y) };
}
reg('organism', 'Matéria · organismo', 'standard', [
  N('cx', 'Centro X', 0.62, 0, 1), N('cy', 'Centro Y', 0.5, 0, 1), N('size', 'Tamanho', 1, 0.1, 4), N('points', 'Pontos', 2400, 200, 8000, 10),
  N('dot', 'Ponto', 1, 0.2, 5), N('spin', 'Giro', 1, 0, 6), N('breathe', 'Respiração', 0.5, 0, 2),
  S('scanBars', 'Varredura (compassos)', '2', ['1', '2', '4', '8']), N('tiltX', 'Inclinação X °', -51.6, -90, 90, 0.1), N('tiltY', 'Inclinação Y °', -20, -90, 90, 0.1),
  B('petals', 'Pétalas', true), C('color', 'Cor', 'primary'), C('scanColor', 'Cor da varredura', 'accent'),
  S('render', 'Render', 'points', ['points', 'lines', 'plexus']), N('reach', 'Raio do plexus', 0.25, 0.05, 0.6), N('glow', 'Glow', 0, 0, 1)
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const D = orgData(Math.max(50, Math.round(p.points * ST.dens))), v = orgView(p, F, W, H), o = {};
  const scan = ((F.beatF / (4 * +p.scanBars)) % 1) * 1.15;
  const prim = col(comp, p.color), acc = col(comp, p.scanColor), [pr, pg, pb] = hexRgb(prim), [ar, ag, ab] = hexRgb(acc);
  const pulse = F.pulse;
  if (p.petals) {
    c.strokeStyle = prim; c.globalAlpha = 0.3; c.lineWidth = u; c.beginPath();
    const s = D.segs, o2 = {};
    for (let i = 0; i < s.length; i += 6) { v.proj(s[i], s[i + 1], s[i + 2], o); v.proj(s[i + 3], s[i + 4], s[i + 5], o2); c.moveTo(o.x, o.y); c.lineTo(o2.x, o2.y); }
    const r2 = D.ringSegs;
    for (let i = 0; i < r2.length; i += 6) { v.proj(r2[i], r2[i + 1], r2[i + 2], o); v.proj(r2[i + 3], r2[i + 4], r2[i + 5], o2); c.moveTo(o.x, o.y); c.lineTo(o2.x, o2.y); }
    c.stroke();
  }
  if (p.render === 'lines' || p.render === 'plexus') { orgMesh(c, D, p, v, scan, u, prim, acc); e3Glow(c, comp, p.glow); c.globalAlpha = 1; return; }
  c.fillStyle = prim;
  const hot = [];
  for (let i = 0; i < D.n; i++) {
    const rn = D.AR[i];
    orgPoint(D, i, p, v, o);
    const band = 1 - sstep(0, 0.035, Math.abs(rn - scan));
    const sz = (2.4 * (0.6 + 0.8 * (1 - rn)) + band * 3 + pulse * 1.4) * (10 / o.d) * u * p.dot;
    const a = (0.35 + 0.65 * (1 - rn * 0.6)) * (0.55 + 0.45 * D.RA[i]);
    if (band > 0.02) { hot.push(o.x, o.y, sz, Math.max(a, band), band); continue; }
    c.globalAlpha = a; c.fillRect(o.x - sz / 2, o.y - sz / 2, sz, sz);
  }
  for (let i = 0; i < hot.length; i += 5) {
    const b = hot[i + 4];
    c.fillStyle = `rgb(${Math.round(lerp(pr, ar, b))},${Math.round(lerp(pg, ag, b))},${Math.round(lerp(pb, ab, b))})`;
    c.globalAlpha = hot[i + 3]; c.fillRect(hot[i] - hot[i + 2] / 2, hot[i + 1] - hot[i + 2] / 2, hot[i + 2], hot[i + 2]);
  }
  c.globalAlpha = 1;
  e3Glow(c, comp, p.glow);
});

/* ===== evento (compartilhado por L2, L4, L6) ===== */
function evAt(comp, F) {
  const L = comp.layers.find(l => l.type === 'event');
  if (!L || !L.on) return null;
  const p = pm(L);
  let best = null;
  if (p.every > 0) { const k = Math.floor((F.bar - p.at) / p.every); best = { idx: k, start: (k * p.every + p.at) * 4 }; }
  if (ST.manEv != null && ST.live && F.beatF >= ST.manEv && (!best || ST.manEv > best.start)) best = { idx: 7000 + Math.floor(ST.manEv), start: ST.manEv };
  if (!best) return null;
  const el = F.beatF - best.start;
  const words = String(p.words || P.meta.name || 'EVENTO').split('|').map(s => s.trim()).filter(Boolean);
  return { p, idx: best.idx, start: best.start, el, active: el >= 0 && el < p.dur, end: best.start + p.dur, word: words[Math.floor(hr(best.idx, 11) * words.length)] || '' };
}

/* ===== L2 · ESTRUTURA ===== */
reg('structure', 'Estrutura · grade e réguas', 'standard', [
  N('grid', 'Grade (px)', 120, 20, 600, 1), N('gridA', 'Opacidade grade', 0.07, 0, 1), B('rulers', 'Réguas', true), B('rings', 'Anéis', true),
  B('spiral', 'Espiral áurea', false), B('angle', 'Ângulo áureo', false), B('drawOn', 'Desenho após evento', true), N('ui', 'Escala do texto', 1, 0.3, 4),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do ângulo', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const Cn = orgCenter(comp, W, H), RPX = Cn.r, prim = col(comp, p.color), hotc = col(comp, p.hot);
  let ms = 1e9;
  if (p.drawOn) { const ev = evAt(comp, F); if (ev && ev.p.every > 0) { let end = ev.end; if (end > F.beatF) end -= ev.p.every * 4; if (end >= 0 || !P.time.loop) ms = (F.beatF - end) * beatMs(); } }
  let d = 0;
  const prog = k => { if (ms >= 1e8) return 1; const t = (ms - (k % 48) * 16) / 600; return t <= 0 ? 0 : t >= 1 ? 1 : Math.floor(t * 10) / 10; };
  const vis = k => { if (ms >= 1e8) return true; const t = (ms - (k % 48) * 16) / 250; return t >= 1 || (t >= 0.3 && t < 0.45) || (t >= 0.7); };
  c.lineWidth = u;
  const L = (x1, y1, x2, y2, a, s = prim) => { const f = prog(d++); if (f <= 0) return; c.globalAlpha = a; c.strokeStyle = s; c.beginPath(); c.moveTo(x1, y1); c.lineTo(x1 + (x2 - x1) * f, y1 + (y2 - y1) * f); c.stroke(); };
  const fs = 11 * u * p.ui;
  const Tx = (x, y, s, a = 0.55, fill = prim, size = fs, al = 'left') => { if (!vis(d++)) return; setFont(c, 400, size, FONTS.mono, 0.08); c.textAlign = al; c.globalAlpha = a; c.fillStyle = fill; c.fillText(s, x, y); };
  const g = p.grid * u;
  for (let x = g; x < W; x += g) L(x, 0, x, H, p.gridA);
  for (let y = g; y < H; y += g) L(0, y, W, y, p.gridA);
  if (p.rulers) {
    const x0 = 72 * u, x1 = W - 72 * u, ry = 128 * u;
    L(x0, ry, x1, ry, 0.5);
    for (let x = x0, i = 0; x <= x1 + 0.1; x += 24 * u, i++) { const big = i % 10 === 0; L(x, ry, x, ry - (big ? 14 : 6) * u, 0.5); if (big) Tx(x + 4 * u, ry - 20 * u, pad(Math.round(x - x0), 4)); }
    const y0 = 176 * u, y1 = H - 80 * u;
    L(40 * u, y0, 40 * u, y1, 0.5);
    for (let y = y0, i = 0; y <= y1 + 0.1; y += 24 * u, i++) { const big = i % 5 === 0; L(40 * u, y, (40 + (big ? 14 : 6)) * u, y, 0.5); }
  }
  if (p.rings) {
    c.strokeStyle = prim; c.lineWidth = u;
    [[0.5, 0.22, 0], [1.3, 0.3, 1], [2.05, 0.22, 0]].forEach(([k, a, dash]) => { c.globalAlpha = a; c.setLineDash(dash ? [4 * u, 10 * u] : []); c.beginPath(); c.arc(Cn.x, Cn.y, RPX * k, 0, TAU); c.stroke(); });
    c.setLineDash([]);
  }
  if (p.spiral) {
    const b = Math.log(1.6180339887) / (Math.PI / 2), rot = 0.6, pts = [];
    for (let th = 0; ; th += 0.04) { const r = 3 * u * Math.exp(b * th); if (r > RPX * 2.05) break; pts.push(Cn.x + r * Math.cos(th + rot), Cn.y + r * Math.sin(th + rot)); }
    const f = prog(d++);
    if (f > 0) { c.globalAlpha = 0.55; c.strokeStyle = prim; c.lineWidth = 1.2 * u; c.beginPath(); const m = Math.floor(pts.length / 2 * f); for (let i = 0; i < m; i++) i ? c.lineTo(pts[i * 2], pts[i * 2 + 1]) : c.moveTo(pts[0], pts[1]); c.stroke(); }
  }
  if (p.angle) {
    const a2 = -137.508 * Math.PI / 180, rr = RPX * 1.6, ar = 96 * u;
    c.lineWidth = u;
    L(Cn.x, Cn.y, Cn.x + rr, Cn.y, 0.9, hotc);
    L(Cn.x, Cn.y, Cn.x + rr * Math.cos(a2), Cn.y + rr * Math.sin(a2), 0.9, hotc);
    const f = prog(d++); if (f > 0) { c.globalAlpha = 0.9; c.strokeStyle = hotc; c.beginPath(); c.arc(Cn.x, Cn.y, ar, 0, a2 * f, true); c.stroke(); }
    const am = a2 / 2;
    Tx(Cn.x + 128 * u * Math.cos(am), Cn.y + 128 * u * Math.sin(am), '137.508°', 1, hotc, 14 * u * p.ui);
    Tx(Cn.x + rr + 10 * u, Cn.y + 4 * u, 'Φ 1.618034');
  }
  L(Cn.x - RPX * 2.25, Cn.y, Cn.x - RPX * 1.4, Cn.y, 0.35);
  L(Cn.x, Cn.y + RPX * 1.4, Cn.x, Cn.y + RPX * 2.25, 0.35);
  L(Cn.x, Cn.y - RPX * 2.25, Cn.x, Cn.y - RPX * 1.75, 0.35);
  Tx(Cn.x - RPX * 2.25, Cn.y - 8 * u, `R ${(RPX * 2.05).toFixed(0)} PX`);
  c.globalAlpha = 1;
});

/* ===== L3 · MEDIÇÃO ===== */
const TG = [140, 430, 820, 1260, 1720, 2180];
function bracket(c, x, y, s, u) { const k = Math.min(12 * u, s * 0.45); c.beginPath(); c.moveTo(x - s, y - s + k); c.lineTo(x - s, y - s); c.lineTo(x - s + k, y - s); c.moveTo(x + s - k, y - s); c.lineTo(x + s, y - s); c.lineTo(x + s, y - s + k); c.moveTo(x + s, y + s - k); c.lineTo(x + s, y + s); c.lineTo(x + s - k, y + s); c.moveTo(x - s + k, y + s); c.lineTo(x - s, y + s); c.lineTo(x - s, y + s - k); c.stroke(); }
reg('measure', 'Medição · rastreio', 'standard', [N('targets', 'Alvos', 6, 1, 6, 1), T('tag', 'Rótulo do alvo', 'MARCA'), B('conf', 'Mostrar confiança', false), B('net', 'Rede', true), B('rays', 'Raios', true), N('ui', 'Escala do texto', 1, 0.3, 4), C('color', 'Cor', 'primary'), C('hot', 'Cor do alvo', 'accent')], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const op = orgParams(comp), D = orgData(Math.max(50, Math.round(op.points * ST.dens)));
  const step = (comp.motion || 'step') === 'step';
  let Fx = F;
  if (step) { const ns = Math.floor(F.sub * F.fpb / 4); Fx = Object.assign({}, F, { n: ns, t: ns / F.fps, ph: ns / F.LF + (F.raw - F.n) / F.LF }); }
  const v = orgView(op, Fx, W, H), Cn = orgCenter(comp, W, H), prim = col(comp, p.color), hotc = col(comp, p.hot);
  const pts = [], o = {};
  for (let j = 0; j < p.targets; j++) { orgPoint(D, Math.min(D.n - 1, Math.floor(TG[j] / 2400 * D.n)), op, v, o); pts.push([o.x, o.y, Math.floor(TG[j] / 2400 * D.n)]); }
  c.lineWidth = u; c.strokeStyle = prim;
  if (p.rays) { c.globalAlpha = 0.14; c.beginPath(); pts.forEach(q => { c.moveTo(Cn.x, Cn.y); c.lineTo(q[0], q[1]); }); c.stroke(); }
  if (p.net) { c.globalAlpha = 0.35; c.beginPath(); pts.forEach((q, i) => i ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1])); c.stroke(); }
  const conf = 0.86 + hr(F.beat, 3) * 0.13, fs = 12 * u * p.ui;
  pts.forEach((q, i) => {
    const hot = i === 0, s = (26 + (i % 3) * 14) * u + (hot ? F.pulse * 10 * u : 0);
    c.globalAlpha = 1; c.strokeStyle = hot ? hotc : prim; c.lineWidth = (hot ? 2.5 : 1.5) * u; bracket(c, q[0], q[1], s, u);
    c.fillStyle = hot ? hotc : prim; setFont(c, 400, fs, FONTS.mono, 0.06); c.textAlign = 'left';
    c.fillText(hot ? `${p.tag || 'MARCA'}_01${p.conf ? `  CONF ${conf.toFixed(2)}` : ''}` : `N_${pad(q[2], 4)}`, q[0] + s + 10 * u, q[1] - s + 10 * u);
    c.globalAlpha = 0.6; setFont(c, 400, fs * 0.92, FONTS.mono, 0.06);
    c.fillText(`X ${pad(q[0].toFixed(1), 6)}  Y ${pad(q[1].toFixed(1), 6)}`, q[0] + s + 10 * u, q[1] - s + 26 * u);
  });
  c.globalAlpha = 1;
});

/* ===== L4 · DADOS ===== */
const STD_TELE = 'LAT −23.5226\nLON −46.7036\nÂNGULO 137.508°\nΦ 1.618034\nPONTOS {N}\nBPM {BPM}\nCOMPASSO {BAR}\n*CONF {CONF}\nHASH {HASH}';
reg('data', 'Dados · logs e telemetria', 'standard', [
  N('rows', 'Linhas de log', 35, 4, 80, 1), T('tags', 'Etiquetas', 'SIG,GRID,NODE,SYNC,LOCK,SCAN'), B('log', 'Log', true),
  B('tele', 'Telemetria', true), T('teleTxt', 'Telemetria (tokens {BPM} {BAR} {CONF} {HASH} {N}; * = acento)', 'BPM {BPM}\nCOMPASSO {BAR}\nHASH {HASH}', true),
  N('ui', 'Escala do texto', 1, 0.3, 4), C('color', 'Cor', 'primary'), C('hot', 'Cor do destaque', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const prim = col(comp, p.color), hotc = col(comp, p.hot), tags = String(p.tags).split(',').map(s => s.trim()).filter(Boolean);
  const STAT = ['OK', 'OK', 'OK', 'OK', 'LOCK', 'DRIFT', 'WARN'];
  const ev = comp.layers.find(l => l.type === 'event' && l.on), ep = ev ? pm(ev) : null;
  if (p.log) {
    const fs = 13 * u * p.ui, lh = 22 * u * p.ui, x0 = 72 * u, y0 = 176 * u, hMax = H - y0 - 80 * u;
    const rows = Math.max(1, Math.min(Math.round(p.rows), Math.floor(hMax / lh)));
    const spl = Math.round(F.LF / F.fpb * 4);
    setFont(c, 400, fs, FONTS.mono, 0); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
    for (let j = 0; j < rows; j++) {
      let s = F.sub - (rows - 1 - j);
      if (s < 0) { if (P.time.loop) s += spl; else continue; }
      const ms = s * beatMs() / 4, clk = `${pad(Math.floor(ms / 60000), 2)}:${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(Math.floor(ms) % 1000, 3)}`;
      let txt = `[${clk}] ${(tags[Math.floor(hr(s, 1) * tags.length)] || 'SIG').padEnd(6)}_${pad(Math.floor(hr(s, 2) * 99), 2)}  n=${pad(Math.floor(hr(s, 3) * 2400), 4)}  θ=${(hr(s, 4) * 360).toFixed(3).padStart(7, '0')}  ${STAT[Math.floor(hr(s, 5) * STAT.length)]}`;
      let hot = false;
      if (ep && ep.every > 0 && s % 16 === 0) { const b = s / 16; if (((b - ep.at) % ep.every + ep.every) % ep.every === 0) { hot = true; const words = String(ep.words).split('|').map(q => q.trim()); const idx = Math.floor((b - ep.at) / ep.every); txt = `[${clk}] >> ${(words[Math.floor(hr(idx, 11) * words.length)] || '').toUpperCase()} EM N_${pad(Math.floor(hr(idx, 12) * 2400), 4)} — LOCK`; } }
      if (j === rows - 1) { const age = (F.beatF * 4 - F.sub) * beatMs() / 4; txt = scr(txt, Math.min(1, age / 260), F.n, j); }
      c.fillStyle = hot ? hotc : prim; c.globalAlpha = hot ? 1 : 0.72;
      c.fillText(txt, x0, y0 + lh * (j + 1));
    }
  }
  if (p.tele) {
    const fs = 15 * u * p.ui, lh = 27 * u * p.ui, xr = W - 64 * u, yb = H - 112 * u;
    const lines = String(p.teleTxt).split('\n');
    const op = orgParams(comp);
    const rep = s => s.replace('{BPM}', P.time.bpm).replace('{BAR}', `${pad(F.bar + 1, 3)}:${(F.beat % 4) + 1}`).replace('{CONF}', (0.86 + hr(F.beat, 3) * 0.13).toFixed(3))
      .replace('{HASH}', Math.floor(hr(F.beat, 8) * 0xffffff).toString(16).toUpperCase().padStart(6, '0')).replace('{N}', Math.round(op.points));
    c.textAlign = 'right';
    lines.forEach((ln, i) => {
      const y = yb - (lines.length - 1 - i) * lh, star = ln[0] === '*', t = rep(star ? ln.slice(1) : ln), sp = t.indexOf(' ');
      if (star) { setFont(c, 400, fs, FONTS.mono, 0); c.fillStyle = hotc; c.globalAlpha = 1; c.fillText(t, xr, y); return; }
      const lab = sp > 0 ? t.slice(0, sp + 1) : '', val = sp > 0 ? t.slice(sp + 1) : t;
      setFont(c, 700, fs, FONTS.mono, 0); c.fillStyle = prim; c.globalAlpha = 1; c.fillText(val, xr, y);
      const vw = c.measureText(val).width; setFont(c, 400, fs, FONTS.mono, 0); c.globalAlpha = 0.72; c.fillText(lab, xr - vw, y);
    });
  }
  c.globalAlpha = 1;
});

/* ===== L5 · MOLDURA HUD ===== */
reg('hud', 'Moldura HUD', 'standard', [
  T('title', 'Título (vazio = nome do projeto)', ''), T('sub', 'Subtítulo', ''), T('date', 'Linha de data', ''),
  T('foot', 'Rodapé', ''), T('retLabel', 'Rótulo da retícula', ''), B('reticle', 'Retícula', true), B('beats', 'Contador de beat', true), N('ui', 'Escala do texto', 1, 0.3, 4),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do beat 1', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const prim = col(comp, p.color), hotc = col(comp, p.hot), m = 28 * u, s = 22 * u, k = p.ui;
  c.strokeStyle = prim; c.lineWidth = 1.5 * u; c.globalAlpha = 1; c.beginPath();
  [[m, m, 1, 1], [W - m, m, -1, 1], [m, H - m, 1, -1], [W - m, H - m, -1, -1]].forEach(([x, y, dx, dy]) => { c.moveTo(x, y + dy * s); c.lineTo(x, y); c.lineTo(x + dx * s, y); });
  c.stroke();
  c.fillStyle = prim; c.textAlign = 'left';
  setFont(c, 600, 15 * u * k, FONTS.mono, 0.12); c.fillText(String(p.title || P.meta.name || 'AI VJ GENERATOR').toUpperCase(), 72 * u, 62 * u);
  setFont(c, 400, 11 * u * k, FONTS.mono, 0.12); c.globalAlpha = 0.55; c.fillText(String(p.sub || '').toUpperCase(), 72 * u, 84 * u);
  c.textAlign = 'right'; c.globalAlpha = 1; setFont(c, 400, 13 * u * k, FONTS.mono, 0.12);
  const ms = F.t * 1000; c.fillText(`${pad(Math.floor(ms / 60000), 2)}:${pad(Math.floor(ms / 1000) % 60, 2)}.${pad(Math.floor(ms) % 1000, 3)}`, W - 72 * u, 62 * u);
  setFont(c, 400, 11 * u * k, FONTS.mono, 0.12); c.globalAlpha = 0.55; c.fillText(String(p.date || '').toUpperCase(), W - 72 * u, 84 * u);
  const yb = H - 64 * u;
  if (p.beats) {
    for (let i = 0; i < 4; i++) { const x = W - 72 * u - (4 - i) * 22 * u, on = i === F.beat % 4; c.globalAlpha = 1; if (on) { c.fillStyle = i === 0 ? hotc : prim; c.fillRect(x, yb - 12 * u, 14 * u, 14 * u); } else { c.strokeStyle = prim; c.lineWidth = u; c.strokeRect(x, yb - 12 * u, 14 * u, 14 * u); } }
    c.fillStyle = prim; c.globalAlpha = 0.55; c.textAlign = 'right'; c.fillText(`COMP ${pad(F.bar + 1, 3)}:${(F.beat % 4) + 1}`, W - 72 * u - 96 * u, yb);
  }
  c.textAlign = 'left'; c.fillStyle = prim; c.globalAlpha = 0.55;
  c.fillText(String(p.foot || '').toUpperCase(), 72 * u, yb); c.fillText('MOVIMENTO: ' + ((comp.motion || 'step') === 'step' ? 'DEGRAU' : 'SUAVE'), 72 * u, yb + 20 * u);
  if (p.reticle) {
    const Cn = orgCenter(comp, W, H), step = (comp.motion || 'step') === 'step';
    const ang = step ? F.beat * 22.5 * Math.PI / 180 : TAU * F.ph * cyc(F, Math.max(1, Math.round(40 / 360 * loopSec())));
    c.save(); c.translate(Cn.x, Cn.y); c.rotate(ang); c.strokeStyle = prim; c.lineWidth = 1.5 * u;
    c.globalAlpha = 0.45; c.beginPath(); c.arc(0, 0, 46 * u, 0, TAU); c.stroke(); c.globalAlpha = 1; c.beginPath();
    for (let a = 0; a < 4; a++) { const an = a * Math.PI / 2; c.moveTo(52 * u * Math.cos(an), 52 * u * Math.sin(an)); c.lineTo(70 * u * Math.cos(an), 70 * u * Math.sin(an)); }
    c.moveTo(-6 * u, 0); c.lineTo(6 * u, 0); c.moveTo(0, -6 * u); c.lineTo(0, 6 * u); c.stroke(); c.restore();
    if (p.retLabel) { c.globalAlpha = 0.55; c.fillText(String(p.retLabel).toUpperCase(), Cn.x + 78 * u, Cn.y + 74 * u); }
  }
  c.globalAlpha = 1;
});

/* ===== L6 · EVENTO ===== */
reg('event', 'Evento · wipe e palavra', 'standard', [
  N('every', 'A cada N compassos (0 = manual)', 8, 0, 64, 1), N('at', 'Deslocamento (compassos)', 0, 0, 63, 1), N('dur', 'Duração (beats)', 2, 0.5, 16, 0.25),
  T('words', 'Palavras (separe por |; vazio = nome do projeto)', ''), T('sub', 'Linha de apoio ({ID} {CONF})', ''),
  S('mode', 'Forma', 'band', ['band', 'full', 'word']), N('size', 'Tamanho da palavra', 1, 0.2, 4), C('color', 'Cor do bloco', 'accent'), C('ink', 'Cor do texto (auto = contraste)', 'auto')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const ev = evAt(comp, F); if (!ev || !ev.active) return;
  const acc = col(comp, p.color), ink = p.ink === 'auto' ? (lum(acc) > 0.5 ? '#000000' : '#F4F3EF') : col(comp, p.ink);
  const ms = ev.el * beatMs();
  c.globalAlpha = 1; c.fillStyle = acc;
  if (ev.el < 0.25 && p.mode !== 'word') { const pr = Math.ceil(Math.min(1, ms / 100) * 3) / 3; c.fillRect(0, 0, W * pr, H); return; }
  const by = p.mode === 'full' ? 0 : 356 / 1080 * H, bh = p.mode === 'full' ? H : 350 / 1080 * H;
  if (p.mode !== 'word') c.fillRect(0, by, W, bh);
  const d = Math.min(1, (ms - 0.25 * beatMs()) / 420);
  const big = 188 * u * p.size, word = String(ev.word).toUpperCase();
  c.fillStyle = p.mode === 'word' ? acc : ink; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
  setFont(c, 800, big, FONTS.mono, -0.02); if ('fontStretch' in c) c.fontStretch = 'condensed';
  const yb = (p.mode === 'band' ? by + 24 * u : H / 2 - big * 0.5) + big * 0.8;
  c.fillText(scr(`${word} — ${word} — ${word}`, d, F.n), 72 * u, yb);
  if ('fontStretch' in c) c.fontStretch = 'normal';
  setFont(c, 500, 22 * u * p.size, FONTS.mono, 0.14);
  const sub = String(p.sub).replace('{ID}', pad(Math.floor(hr(ev.idx, 12) * 2400), 4)).replace('{CONF}', (0.93 + hr(ev.idx, 13) * 0.069).toFixed(3));
  if (sub.trim()) c.fillText(scr(sub.toUpperCase(), Math.min(1, d * 1.6), F.n, 9), 78 * u, yb + 56 * u * p.size);
});

/* ===== L7 · PÓS ===== */
let RENDER_ALPHA = false;
function glitchAt(F, p) { const strong = F.beat % 4 === 0, fb = F.bp * F.fpb, len = strong ? 3 : 2; return { on: fb < len && (strong || hr(F.beat, 99) < p.prob), strong }; }
reg('post', 'Pós · scanline e glitch', 'standard', [
  N('scan', 'Scanlines', 0.34, 0, 1), N('pitch', 'Passo da scanline', 1, 0.5, 6), N('vig', 'Vinheta', 0.55, 0, 1), N('prob', 'Prob. de glitch por beat', 0.35, 0, 1),
  N('slices', 'Fatias', 7, 0, 24, 1), B('jitter', 'Tremor de quadro', true), C('color', 'Cor da fatia', 'primary'), C('hot', 'Cor da fatia acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  /* em export alpha, escurecer o transparente não faz sentido: scanline e vinheta viram véu preto. Só as fatias de glitch saem. */
  if (p.scan > 0 && !RENDER_ALPHA) { c.fillStyle = `rgba(0,0,0,${p.scan})`; const st = 4 * u * p.pitch; for (let y = st / 2; y < H; y += st) c.fillRect(0, y, W, st / 2); }
  if (p.vig > 0 && !RENDER_ALPHA) { const g = c.createRadialGradient(W * 0.55, H / 2, 0, W * 0.55, H / 2, Math.hypot(W, H) * 0.55); g.addColorStop(0.55, 'rgba(0,0,0,0)'); g.addColorStop(1, `rgba(0,0,0,${p.vig})`); c.fillStyle = g; c.fillRect(0, 0, W, H); }
  const gl = glitchAt(F, p);
  if (gl.on) {
    const n = gl.strong ? p.slices : Math.ceil(p.slices * 0.43), sx = W / 1920;
    for (let k = 0; k < n; k++) {
      c.fillStyle = hr(F.beat, k, 21) < 0.3 ? col(comp, p.hot) : col(comp, p.color); c.globalAlpha = 0.85;
      c.fillRect(lerp(-200, 1200, hr(F.beat, k, 22)) * sx, hr(F.beat, k, 23) * H, lerp(160, 900, hr(F.beat, k, 24)) * sx, lerp(2, gl.strong ? 26 : 10, hr(F.beat, k, 25)) * u);
    }
  }
  c.globalAlpha = 1;
});
