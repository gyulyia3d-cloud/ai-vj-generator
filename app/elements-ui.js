/* Elementos de interface animados: ícones, régua, contador, medidor, coordenadas, progresso, gráfico, rede, datacenter (Dados),
   letreiro (Texto) e geometria sagrada (Formas). Vocabulário do Layer Forge e dos módulos de leitura das gerações /vj, reescritos para o motor:
   posição em fração do quadro, tamanhos em px na referência 1080 (× u), tempo só pela fase do loop com ciclos inteiros (cyc), acaso só por hr().
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores ELEMENTSUI. Mesmo escopo do motor (IIFE): sem import/export. */
const EU_POS = () => [N('cx', 'Centro X', 0.5, -0.5, 1.5), N('cy', 'Centro Y', 0.5, -0.5, 1.5)];
const euMono = (c, px, wgt = 400) => setFont(c, wgt, px, FONTS.mono, 0);
const euPh = (F, n) => TAU * F.lph * cyc(F, n);
const euStep = (F, k) => k === 'bar' ? F.bar : k === 'beat' ? F.beat : F.sub;

/* ---------- Ícone: 12 ícones que animam sozinhos ---------- */
const EU_ICONS = {
  target(c, s, p) { c.beginPath(); c.arc(0, 0, s * 0.9, 0, TAU); c.moveTo(s * 0.4, 0); c.arc(0, 0, s * 0.4, 0, TAU); c.moveTo(-s, 0); c.lineTo(-s * 0.55, 0); c.moveTo(s * 0.55, 0); c.lineTo(s, 0); c.moveTo(0, -s); c.lineTo(0, -s * 0.55); c.moveTo(0, s * 0.55); c.lineTo(0, s);
    for (let i = 0; i < 12; i++) { const a = p + i * TAU / 12; c.moveTo(Math.cos(a) * s * 0.62, Math.sin(a) * s * 0.62); c.lineTo(Math.cos(a) * s * 0.78, Math.sin(a) * s * 0.78); } c.stroke(); },
  rec(c, s, p) { const a0 = c.globalAlpha; c.globalAlpha = a0 * (0.3 + 0.7 * (0.5 + 0.5 * Math.cos(p))); c.beginPath(); c.arc(0, 0, s * 0.5, 0, TAU); c.fill(); c.globalAlpha = a0; c.beginPath(); c.arc(0, 0, s * 0.9, 0, TAU); c.stroke(); },
  play(c, s, p) { c.beginPath(); c.moveTo(-s * 0.3, -s * 0.5); c.lineTo(s * 0.5, 0); c.lineTo(-s * 0.3, s * 0.5); c.closePath(); c.stroke(); const q = TAU * (0.5 - 0.5 * Math.cos(p)); if (q > 0.001) {   /* enche e esvazia: fecha o loop */ c.beginPath(); c.arc(0, 0, s * 0.9, -Math.PI / 2, -Math.PI / 2 + q); c.stroke(); } },
  arrow(c, s, p) { const o = Math.sin(p) * s * 0.14; c.beginPath(); c.moveTo(-s * 0.8 + o, 0); c.lineTo(s * 0.8 + o, 0); c.moveTo(s * 0.4 + o, -s * 0.4); c.lineTo(s * 0.8 + o, 0); c.lineTo(s * 0.4 + o, s * 0.4); c.stroke(); },
  eye(c, s, p) { const q = ((p % TAU) + TAU) % TAU, lid = q < 0.4 ? 0.12 + 0.88 * Math.abs(Math.cos(q / 0.4 * Math.PI / 2)) : 1; c.beginPath(); c.moveTo(-s, 0); c.quadraticCurveTo(0, -s * 0.95 * lid, s, 0); c.quadraticCurveTo(0, s * 0.95 * lid, -s, 0); c.stroke(); c.beginPath(); c.arc(Math.cos(p) * s * 0.16, 0, s * 0.3 * Math.min(1, lid + 0.2), 0, TAU); c.fill(); },
  pin(c, s, p) { c.beginPath(); c.moveTo(0, s * 0.85); c.bezierCurveTo(-s * 0.75, -s * 0.05, -s * 0.55, -s * 0.85, 0, -s * 0.85); c.bezierCurveTo(s * 0.55, -s * 0.85, s * 0.75, -s * 0.05, 0, s * 0.85); c.stroke(); c.beginPath(); c.arc(0, -s * 0.25, s * 0.2, 0, TAU); c.fill();
    const q = (((p / TAU) % 1) + 1) % 1, a0 = c.globalAlpha; c.globalAlpha = a0 * (1 - q); c.beginPath(); c.ellipse(0, s * 0.85, q * s * 0.95 + 0.01, q * s * 0.3 + 0.01, 0, 0, TAU); c.stroke(); c.globalAlpha = a0; },
  globe(c, s, p) { c.beginPath(); c.arc(0, 0, s * 0.9, 0, TAU); for (let k = 0; k < 3; k++) { c.moveTo(0, -s * 0.9); c.ellipse(0, 0, Math.abs(Math.cos(p + k * Math.PI / 3)) * s * 0.9 + 0.01, s * 0.9, 0, -Math.PI / 2, Math.PI * 1.5); }
    for (const y of [-0.5, 0, 0.5]) { const hw = Math.sqrt(0.81 - (y * 0.9) * (y * 0.9)) * s; c.moveTo(-hw, y * s * 0.9); c.lineTo(hw, y * s * 0.9); } c.stroke(); },
  cube(c, s, p) { const v = [], a = s * 0.55, cp = Math.cos(p), sp = Math.sin(p), ct = Math.cos(0.6), st = Math.sin(0.6);
    for (let i = 0; i < 8; i++) { const x = (i & 1 ? 1 : -1) * a, y = (i & 2 ? 1 : -1) * a, z = (i & 4 ? 1 : -1) * a, x2 = x * cp + z * sp, z2 = -x * sp + z * cp; v.push([x2, y * ct - z2 * st]); }
    c.beginPath(); for (let i = 0; i < 8; i++) for (const b of [1, 2, 4]) if (!(i & b)) { const j = i | b; c.moveTo(v[i][0], v[i][1]); c.lineTo(v[j][0], v[j][1]); } c.stroke(); },
  wave(c, s, p) { c.beginPath(); for (let k = 0; k <= 48; k++) { const x = -s + 2 * s * k / 48, y = Math.sin(k / 48 * TAU * 1.5 + p) * s * 0.45; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); },
  bars(c, s, p) { for (let i = 0; i < 5; i++) { const h = (0.25 + 0.75 * Math.abs(Math.sin(p + i * 1.1))) * s * 1.5; c.fillRect(-s * 0.9 + i * s * 0.44, s * 0.75 - h, s * 0.26, h); } },
  signal(c, s, p) { const ph = 0.5 - 0.5 * Math.cos(p), a0 = c.globalAlpha; for (let i = 0; i < 3; i++) { c.globalAlpha = a0 * clamp(1 - Math.abs(ph * 3 - i - 0.5) * 0.7, 0.2, 1); c.beginPath(); c.arc(0, s * 0.6, s * (0.4 + i * 0.3), -Math.PI * 0.8, -Math.PI * 0.2); c.stroke(); } c.globalAlpha = a0; c.beginPath(); c.arc(0, s * 0.6, s * 0.08, 0, TAU); c.fill(); },
  scan(c, s, p) { const l = s * 0.4, e = s * 0.9; c.beginPath(); for (const [sx, sy] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { c.moveTo(sx * e, sy * (e - l)); c.lineTo(sx * e, sy * e); c.lineTo(sx * (e - l), sy * e); } const y = Math.sin(p) * s * 0.62; c.moveTo(-s * 0.7, y); c.lineTo(s * 0.7, y); c.stroke(); }
};
reg('icon', 'Ícone animado', 'gen', [
  S('icon', 'Ícone', 'target', Object.keys(EU_ICONS)), ...EU_POS(), N('size', 'Tamanho (px)', 120, 8, 1600, 1), N('weight', 'Traço', 3, 0.5, 40, 0.1), N('cycles', 'Ciclos por loop', 1, 0, 16, 1), C('color', 'Cor', 'primary')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, s = p.size * u / 2;
  c.save(); c.translate(p.cx * W, p.cy * H); c.strokeStyle = c.fillStyle = col(comp, p.color); c.lineWidth = Math.max(0.5, p.weight * u); c.lineCap = 'butt';
  (EU_ICONS[p.icon] || EU_ICONS.target)(c, s, euPh(F, p.cycles)); c.restore();
});

/* ---------- Régua com cursor que percorre a escala ---------- */
reg('ruler', 'Régua animada', 'gen', [
  S('dir', 'Direção', 'h', ['h', 'v']), ...EU_POS(), N('len', 'Comprimento (fração)', 0.8, 0.05, 1.5), N('div', 'Divisões', 40, 2, 240, 1), N('major', 'Marca maior a cada', 5, 1, 40, 1),
  N('from', 'Valor inicial', 0, -100000, 100000, 1), N('to', 'Valor final', 100, -100000, 100000, 1), B('numbers', 'Números', true), B('cursor', 'Cursor', true), N('cycles', 'Ciclos por loop', 1, 0, 16, 1),
  N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 1.5, 0.3, 12, 0.1), C('color', 'Cor', 'primary'), C('hot', 'Cor do cursor', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, v = p.dir === 'v', len = p.len * (v ? H : W), fs = 20 * u * p.ui, tl = 14 * u, n = Math.max(2, Math.round(p.div)), mj = Math.max(1, Math.round(p.major));
  const P2 = (s, d) => v ? [p.cx * W + d, p.cy * H - s] : [p.cx * W + s, p.cy * H + d], ink = col(comp, p.color), ac = col(comp, p.hot);
  const dec = Math.abs(p.to - p.from) < 20 ? 1 : 0, fmt = x => x.toFixed(dec);
  c.strokeStyle = ink; c.lineWidth = Math.max(0.5, p.weight * u); c.beginPath(); let a = P2(-len / 2, 0), b = P2(len / 2, 0); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]);
  for (let i = 0; i <= n; i++) { const s = -len / 2 + len * i / n, d = tl * (i % mj === 0 ? 1.8 : 1); a = P2(s, 0); b = P2(s, d); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); }
  c.stroke(); euMono(c, fs);
  if (p.numbers) { c.fillStyle = col(comp, 'secondary'); c.textBaseline = 'middle'; c.textAlign = v ? 'left' : 'center'; for (let i = 0; i <= n; i += mj) { const s = -len / 2 + len * i / n, q = P2(s, tl * 1.8 + (v ? fs * 0.5 : fs)); c.fillText(fmt(p.from + (p.to - p.from) * i / n), q[0], q[1]); } }
  if (p.cursor) {
    const ph = 0.5 - 0.5 * Math.cos(euPh(F, p.cycles)), s = -len / 2 + len * ph, q0 = P2(s, -tl * 0.7), q1 = P2(s, tl * 2.6), z = P2(s, 0);
    c.strokeStyle = c.fillStyle = ac; c.lineWidth = Math.max(1, p.weight * u * 2); c.beginPath(); c.moveTo(q0[0], q0[1]); c.lineTo(q1[0], q1[1]); c.stroke(); c.fillRect(z[0] - tl * 0.4, z[1] - tl * 0.4, tl * 0.8, tl * 0.8);
    const t = fmt(p.from + (p.to - p.from) * ph), q = P2(s, -tl * 0.7 - fs * 0.9); c.textBaseline = 'middle'; c.textAlign = v ? 'right' : 'center'; c.fillText(t, v ? q[0] - fs * 0.4 : q[0], q[1]);
  }
  c.textAlign = 'left'; c.textBaseline = 'alphabetic';
});

/* ---------- Contador ---------- */
reg('counter', 'Contador', 'gen', [
  N('value', 'Valor', 128, -1e9, 1e9, 1), N('decimals', 'Decimais', 0, 0, 4, 1), T('pre', 'Prefixo', ''), T('suf', 'Sufixo', ''), T('label', 'Rótulo', 'BPM'),
  S('motion', 'Movimento', 'vai-e-volta', ['fixo', 'vai-e-volta', 'sorteio']), N('cycles', 'Ciclos por loop', 1, 1, 16, 1), ...EU_POS(), N('size', 'Tamanho (px)', 200, 10, 1600, 1),
  S('align', 'Alinhar', 'center', ['left', 'center', 'right']), S('font', 'Fonte', 'mono', ['mono', 'helvetica', 'archivo', 'bebas']), N('wgt', 'Peso', 700, 100, 900, 100),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do rótulo', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, fs = p.size * u, x = p.cx * W, y = p.cy * H;
  let v = p.value;
  if (p.motion === 'vai-e-volta') v = p.value * (0.5 - 0.5 * Math.cos(euPh(F, p.cycles)));   /* 0 → valor → 0: fecha o loop */
  else if (p.motion === 'sorteio') { const k = F.lbp; v = k < 0.35 ? p.value * hr(F.beat, F.sub, 53) : p.value; }   /* dígitos sorteiam no começo do beat e assentam */
  const txt = (p.pre || '') + v.toLocaleString('pt-BR', { minimumFractionDigits: p.decimals, maximumFractionDigits: p.decimals }) + (p.suf || '');
  c.textAlign = p.align; c.textBaseline = 'alphabetic'; setFont(c, p.wgt, fs, fam(p.font), -0.02); c.fillStyle = col(comp, p.color); c.fillText(txt, x, y + fs * 0.35);
  if (p.label) { setFont(c, 400, Math.max(8, fs * 0.16), FONTS.mono, 0.18); c.fillStyle = col(comp, p.hot); c.fillText(String(p.label).toUpperCase(), x, y + fs * 0.35 + fs * 0.3); }
  c.textAlign = 'left';
});

/* ---------- Medidor: dial (arco de 270°) ou anéis segmentados girando em degraus ---------- */
reg('gauge', 'Medidor', 'gen', [
  S('kind', 'Tipo', 'dial', ['dial', 'aneis']), ...EU_POS(), N('size', 'Raio (px)', 260, 20, 1600, 1), N('value', 'Valor %', 72, 0, 100, 1), S('motion', 'Movimento', 'vai-e-volta', ['fixo', 'vai-e-volta']),
  T('label', 'Rótulo', 'SYNC'), N('density', 'Densidade dos anéis', 0.6, 0.05, 1), N('cycles', 'Ciclos por loop', 1, 0, 16, 1), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 2, 0.3, 20, 0.1),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, x = p.cx * W, y = p.cy * H, r = p.size * u, ink = col(comp, p.color), ac = col(comp, p.hot), mu = col(comp, 'secondary'), lw = Math.max(0.5, p.weight * u);
  const v = (p.motion === 'fixo' ? p.value : p.value * (0.5 - 0.5 * Math.cos(euPh(F, p.cycles)))) / 100;
  c.save(); c.translate(x, y);
  if (p.kind === 'aneis') {
    [[1, 26, 0.09], [0.78, 18, 0.14], [0.58, 12, 0.2]].forEach(([k, n, w], ri) => {
      const rot = Math.floor(F.lph * 24) / 24 * TAU * cyc(F, p.cycles) * (ri % 2 ? -1 : 1), rr = r * k;
      for (let i = 0; i < n; i++) {
        const f = hr(i, ri, 59); if (f > 0.15 + p.density * 0.7) continue;
        const a0 = rot + i / n * TAU; c.strokeStyle = i % 7 === 0 ? ac : ink; c.globalAlpha = i % 7 === 0 ? 1 : 0.55; c.lineWidth = rr * w;
        c.beginPath(); c.arc(0, 0, rr * (1 - w / 2), a0, a0 + TAU / n * (0.3 + f * 0.6)); c.stroke();
      }
    });
    c.globalAlpha = 1; c.lineWidth = lw; c.strokeStyle = ink; c.beginPath(); c.arc(0, 0, r * 0.34, 0, TAU); c.stroke();
    c.textAlign = 'center'; euMono(c, 26 * u * p.ui, 700); c.fillStyle = ink; c.fillText(String(p.label || '').toUpperCase(), 0, 8 * u);
    euMono(c, 18 * u * p.ui); c.fillStyle = mu; c.fillText(String(Math.round(v * 9999)).padStart(4, '0') + ' / 9999', 0, 40 * u * p.ui);
  } else {
    const a0 = Math.PI * 0.75, a1 = Math.PI * 2.25, R2 = r * 0.82;
    c.strokeStyle = col(comp, 'secondary'); c.globalAlpha = 0.35; c.lineWidth = lw * 3; c.beginPath(); c.arc(0, 0, R2, a0, a1); c.stroke(); c.globalAlpha = 1;
    c.strokeStyle = ac; c.beginPath(); c.arc(0, 0, R2, a0, a0 + (a1 - a0) * v); c.stroke();
    c.lineWidth = lw; c.strokeStyle = mu; c.beginPath(); for (let i = 0; i <= 30; i++) { const a = a0 + (a1 - a0) * i / 30, l = i % 5 ? R2 * 0.1 : R2 * 0.18; c.moveTo(Math.cos(a) * R2 * 0.78, Math.sin(a) * R2 * 0.78); c.lineTo(Math.cos(a) * (R2 * 0.78 - l), Math.sin(a) * (R2 * 0.78 - l)); } c.stroke();
    c.textAlign = 'center'; c.textBaseline = 'middle'; setFont(c, 500, R2 * 0.5, FONTS.mono, 0); c.fillStyle = ink; c.fillText(Math.round(v * 100) + '%', 0, -R2 * 0.05);
    if (p.label) { euMono(c, 22 * u * p.ui); c.fillStyle = mu; c.fillText(String(p.label).toUpperCase(), 0, R2 * 0.45); }
  }
  c.restore(); c.textAlign = 'left'; c.textBaseline = 'alphabetic';
});

/* ---------- Coordenadas: ponto em Lissajous com leitura cartesiana, polar ou geográfica ---------- */
reg('coords', 'Coordenadas', 'gen', [
  S('mode', 'Sistema', 'cart', ['cart', 'polar', 'geo']), ...EU_POS(), N('w', 'Largura (px)', 600, 40, 4000, 1), N('h', 'Altura (px)', 600, 40, 4000, 1), N('cycles', 'Ciclos por loop', 1, 0, 16, 1),
  N('lat', 'Latitude base', -23.5505, -90, 90, 0.0001), N('lon', 'Longitude base', -46.6333, -180, 180, 0.0001), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 1.5, 0.3, 12, 0.1),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do ponto', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, w = p.w * u, h = p.h * u, fs = 18 * u * p.ui, lw = Math.max(0.5, p.weight * u), ink = col(comp, p.color), ac = col(comp, p.hot), mu = col(comp, 'secondary');
  c.save(); c.translate(p.cx * W, p.cy * H); euMono(c, fs);
  c.strokeStyle = mu; c.lineWidth = lw; c.strokeRect(-w / 2, -h / 2, w, h); c.beginPath(); c.moveTo(-w / 2, 0); c.lineTo(w / 2, 0); c.moveTo(0, -h / 2); c.lineTo(0, h / 2);
  for (let i = -5; i <= 5; i++) { const x = i * w / 10, y = i * h / 10; c.moveTo(x, -fs * 0.4); c.lineTo(x, fs * 0.4); c.moveTo(-fs * 0.4, y); c.lineTo(fs * 0.4, y); }
  if (p.mode === 'polar') for (let i = 1; i <= 4; i++) { const rr = Math.min(w, h) / 2 * i / 4; c.moveTo(rr, 0); c.arc(0, 0, rr, 0, TAU); }
  c.stroke();
  const ph = euPh(F, p.cycles), px = q => Math.sin(q + 0.4) * 0.8, py = q => Math.sin(2 * q + 1) * 0.7;
  c.strokeStyle = ink; c.globalAlpha = 0.5; c.beginPath(); for (let k = 0; k < 30; k++) { const q = ph - k * 0.07, x = px(q) * w / 2, y = py(q) * h / 2; k ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); c.globalAlpha = 1;
  const X = px(ph), Y = py(ph), x = X * w / 2, y = Y * h / 2; c.strokeStyle = ac; c.lineWidth = lw * 1.3; c.beginPath(); c.moveTo(x - fs, y); c.lineTo(x + fs, y); c.moveTo(x, y - fs); c.lineTo(x, y + fs); c.stroke(); c.strokeRect(x - fs * 0.6, y - fs * 0.6, fs * 1.2, fs * 1.2);
  const rd = p.mode === 'polar' ? 'R ' + Math.hypot(X, Y).toFixed(3) + '  θ ' + (Math.atan2(-Y, X) * 180 / Math.PI).toFixed(1) + '°'
    : p.mode === 'geo' ? 'LAT ' + (p.lat - Y * 0.05).toFixed(5) + '  LON ' + (p.lon + X * 0.05).toFixed(5) : 'X ' + (X >= 0 ? '+' : '') + X.toFixed(3) + '  Y ' + (-Y >= 0 ? '+' : '') + (-Y).toFixed(3);
  c.fillStyle = mu; c.fillText(rd, -w / 2 + fs * 0.5, h / 2 - fs * 0.6); c.restore();
});

/* ---------- Progresso ---------- */
reg('progress', 'Barra de progresso', 'gen', [
  ...EU_POS(), N('w', 'Largura (px)', 900, 40, 6000, 1), N('h', 'Altura (px)', 22, 2, 400, 1), N('value', 'Valor % (-1 = segue o loop)', 64, -1, 100, 1), S('motion', 'Movimento', 'fixo', ['fixo', 'vai-e-volta']),
  N('cycles', 'Ciclos por loop', 1, 1, 16, 1), T('label', 'Rótulo ({pct} = valor)', 'RENDER {pct}'), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 1.5, 0.3, 12, 0.1), C('color', 'Cor', 'accent'), C('text', 'Cor do rótulo', 'secondary')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, w = p.w * u, h = p.h * u, x = p.cx * W - w / 2, y = p.cy * H - h / 2, lw = Math.max(0.5, p.weight * u);
  let v = p.value < 0 ? F.lph % 1 : p.value / 100; if (p.value >= 0 && p.motion === 'vai-e-volta') v *= 0.5 - 0.5 * Math.cos(euPh(F, p.cycles));
  c.strokeStyle = c.fillStyle = col(comp, p.color); c.lineWidth = lw; c.strokeRect(x, y, w, h); const g = Math.min(h * 0.2, lw * 2); c.fillRect(x + g, y + g, Math.max(0, (w - 2 * g) * v), h - 2 * g);
  if (p.label) { euMono(c, 18 * u * p.ui); if ('letterSpacing' in c) c.letterSpacing = 18 * u * p.ui * 0.14 + 'px'; c.fillStyle = col(comp, p.text); c.textBaseline = 'bottom'; c.fillText(String(p.label).toUpperCase().replace(/\{PCT\}/g, Math.round(v * 100) + '%'), x, y - 8 * u); c.textBaseline = 'alphabetic'; }
});

/* ---------- Gráfico: mercado (linha + volume), barras ou linha; tudo periódico no loop ---------- */
reg('chart', 'Gráfico animado', 'gen', [
  S('kind', 'Tipo', 'mercado', ['mercado', 'barras', 'linha']), ...EU_POS(), N('w', 'Largura (px)', 1200, 60, 6000, 1), N('h', 'Altura (px)', 380, 30, 3000, 1), N('n', 'Pontos', 120, 8, 600, 1),
  N('cycles', 'Ciclos por loop', 1, 0, 16, 1), B('grid', 'Grade', true), T('label', 'Rótulo', 'VOL {n}  ·  Δ {d}%'), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 2.5, 0.3, 20, 0.1),
  C('color', 'Cor', 'primary'), C('hot', 'Cor da linha', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, w = p.w * u, h = p.h * u, x0 = p.cx * W - w / 2, y0 = p.cy * H + h / 2, n = Math.round(p.n), ph = euPh(F, p.cycles), ink = col(comp, p.color), ac = col(comp, p.hot);
  const val = i => (Math.sin(i * 0.12 * 120 / n + ph) + Math.sin(i * 0.05 * 120 / n + 2 * ph) * 0.6 + Math.sin(i * 0.7 * 120 / n + hr(i, 3, 61)) * 0.2) * 0.25 + 0.5;
  if (p.grid) { c.strokeStyle = ink; c.globalAlpha = 0.4; c.lineWidth = Math.max(0.5, u); c.strokeRect(x0, y0 - h, w, h); c.beginPath(); for (let i = 1; i < 5; i++) { c.moveTo(x0, y0 - h * i / 5); c.lineTo(x0 + w, y0 - h * i / 5); } c.stroke(); c.globalAlpha = 1; }
  if (p.kind !== 'linha') { c.fillStyle = ink; c.globalAlpha = p.kind === 'barras' ? 0.9 : 0.6; const nb = p.kind === 'barras' ? Math.max(4, Math.round(n / 4)) : Math.round(n * 0.8);
    for (let i = 0; i < nb; i++) { const k = p.kind === 'barras' ? val(i * n / nb) * 0.95 : (Math.abs(Math.sin(i * 1.7 + 2 * ph)) * 0.4 + 0.05) * 0.5, bh = k * h; c.fillRect(x0 + i * (w / nb), y0 - bh, w / nb * 0.7, bh); } c.globalAlpha = 1; }
  if (p.kind !== 'barras') { c.strokeStyle = ac; c.lineWidth = Math.max(0.5, p.weight * u); c.beginPath(); for (let i = 0; i < n; i++) { const x = x0 + i / (n - 1) * w, y = y0 - val(i) * h; i ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke(); }
  if (p.label) { euMono(c, 22 * u * p.ui); c.fillStyle = ink; c.fillText(String(p.label).replace('{n}', String(Math.round(F.lph * 99999) % 99999).padStart(5, '0')).replace('{d}', (Math.sin(ph) * 4).toFixed(2)), x0, y0 + 34 * u * p.ui); }
});

/* ---------- Rede: nós, ligações por distância, nós ativos piscando e pacotes viajando ---------- */
reg('network', 'Rede de nós', 'gen', [
  N('nodes', 'Nós', 48, 4, 300, 1), N('reach', 'Alcance (fração)', 0.22, 0.03, 0.8), N('active', 'Ativos', 0.3, 0, 1), N('packets', 'Pacotes', 12, 0, 120, 1), ...EU_POS(),
  N('w', 'Largura (fração)', 0.9, 0.05, 1.5), N('h', 'Altura (fração)', 0.8, 0.05, 1.5), B('labels', 'Rótulos', true), T('prefix', 'Prefixo', 'DC_'), N('cycles', 'Ciclos por loop', 1, 0, 16, 1),
  N('seed', 'Semente', 1, 1, 99, 1), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 1, 0.3, 12, 0.1), C('color', 'Cor', 'primary'), C('hot', 'Cor ativa', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, n = Math.round(p.nodes), w = p.w * W, h = p.h * H, x0 = p.cx * W - w / 2, y0 = p.cy * H - h / 2, ph = euPh(F, p.cycles), ink = col(comp, p.color), ac = col(comp, p.hot);
  const ns = []; for (let i = 0; i < n; i++) ns.push([x0 + hr(i, 1, 70 + p.seed) * w, y0 + hr(i, 2, 70 + p.seed) * h, hr(i, 3, 70 + p.seed)]);
  const lim = p.reach * Math.min(w, h), E = [];
  for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) if (Math.hypot(ns[i][0] - ns[j][0], ns[i][1] - ns[j][1]) < lim) E.push([i, j]);
  c.strokeStyle = ink; c.globalAlpha = 0.25; c.lineWidth = Math.max(0.5, p.weight * u); c.beginPath(); E.forEach(([a, b]) => { c.moveTo(ns[a][0], ns[a][1]); c.lineTo(ns[b][0], ns[b][1]); }); c.stroke();
  c.globalAlpha = 1; c.fillStyle = ac;
  for (let k = 0; k < Math.min(E.length, Math.round(p.packets)); k++) { const e = E[Math.floor(hr(k, 5, 71 + p.seed) * E.length)], t = ((F.lph * cyc(F, p.cycles) + hr(k, 6, 71)) % 1), a = ns[e[0]], b = ns[e[1]], s = 6 * u; c.fillRect(a[0] + (b[0] - a[0]) * t - s / 2, a[1] + (b[1] - a[1]) * t - s / 2, s, s); }
  euMono(c, 16 * u * p.ui);
  ns.forEach((q, i) => {
    const act = Math.sin(ph + i * 2.3) > 1 - 2 * p.active; c.fillStyle = act ? ac : ink; c.globalAlpha = act ? 1 : 0.7; const s = (6 + q[2] * 10) * u; c.fillRect(q[0] - s / 2, q[1] - s / 2, s, s);
    if (p.labels && i % 3 === 0) { c.globalAlpha = 0.7; c.fillText((p.prefix || '') + String(i).padStart(3, '0') + (act ? ' UP' : ' --'), q[0] + 10 * u, q[1] + 4 * u); }
  });
  c.globalAlpha = 1;
});

/* ---------- Datacenter: racks com LEDs em bloco piscando no passo ---------- */
reg('rack', 'Datacenter', 'gen', [
  N('racks', 'Racks', 6, 1, 32, 1), N('units', 'Unidades por rack', 12, 3, 60, 1), N('fill', 'Ocupação', 0.58, 0, 1), S('step', 'Passo', 'sub', ['bar', 'beat', 'sub']), ...EU_POS(),
  N('w', 'Largura (fração)', 0.86, 0.05, 1.5), N('h', 'Altura (fração)', 0.72, 0.05, 1.5), N('gap', 'Respiro', 0.35, 0, 2), B('labels', 'Rótulos', true), N('seed', 'Semente', 1, 1, 99, 1), N('ui', 'Escala do texto', 1, 0.3, 4),
  C('color', 'Cor dos LEDs', 'primary'), C('hot', 'Cor do alerta', 'accent'), C('frame', 'Cor da moldura', 'secondary')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, n = Math.round(p.racks), w = p.w * W, h = p.h * H, rw = w / (n + (n - 1) * p.gap), gx = rw * p.gap, x0 = p.cx * W - w / 2, top = p.cy * H - h / 2, U = Math.round(p.units), uh = h / U, st = euStep(F, p.step);
  const led = col(comp, p.color), hot = col(comp, p.hot), fr = col(comp, p.frame);
  for (let r = 0; r < n; r++) {
    const x = x0 + r * (rw + gx);
    c.fillStyle = fr; c.globalAlpha = 0.18; c.fillRect(x, top, rw, h); c.globalAlpha = 1; c.strokeStyle = fr; c.lineWidth = Math.max(1, rw * 0.05); c.strokeRect(x + c.lineWidth / 2, top + c.lineWidth / 2, rw - c.lineWidth, h - c.lineWidth);
    for (let k = 0; k < U; k++) { if (hr(r * 31 + k, st, 80 + p.seed) > p.fill) continue; c.fillStyle = hr(r, k, 81 + p.seed) < 0.2 ? hot : led; c.fillRect(x + rw * 0.12, top + k * uh + uh * 0.2, rw * 0.76, uh * 0.6); }
    if (p.labels) { setFont(c, 700, 26 * u * p.ui, FONTS.mono, 0); c.fillStyle = led; c.fillText('RACK ' + String(r + 1).padStart(2, '0'), x, top - 14 * u); }
  }
});

/* ---------- Letreiro: faixa de texto em rolagem contínua entre réguas ---------- */
reg('ticker', 'Letreiro', 'gen', [
  T('text', 'Texto', 'REAL-TIME + MAPPING + VJ + LED + GENERATIVE'), T('sep', 'Separador', '   +   '), N('cy', 'Posição vertical', 0.9, -0.2, 1.2), N('h', 'Altura da faixa (px)', 70, 8, 800, 1),
  N('fill', 'Altura da letra', 0.55, 0.1, 1.2), N('cycles', 'Ciclos por loop (sinal = sentido)', 1, -16, 16, 1), B('rules', 'Réguas', true), S('font', 'Fonte', 'mono', ['mono', 'helvetica', 'archivo', 'bebas']),
  N('wgt', 'Peso', 500, 100, 900, 100), B('upper', 'Caixa alta', true), C('color', 'Cor', 'primary'), C('rule', 'Cor das réguas', 'secondary')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, h = p.h * u, y = p.cy * H, fs = h * p.fill;
  if (p.rules) { c.strokeStyle = col(comp, p.rule); c.lineWidth = Math.max(1, u); c.beginPath(); c.moveTo(0, y - h / 2); c.lineTo(W, y - h / 2); c.moveTo(0, y + h / 2); c.lineTo(W, y + h / 2); c.stroke(); }
  c.save(); c.beginPath(); c.rect(0, y - h / 2, W, h); c.clip(); setFont(c, p.wgt, fs, fam(p.font), 0.04); c.fillStyle = col(comp, p.color); c.textBaseline = 'middle';
  const unit = (p.upper ? String(p.text).toUpperCase() : String(p.text)) + (p.sep || ' '), tw = Math.max(8, c.measureText(unit).width), off = -(((F.lph * cyc(F, p.cycles) * tw) % tw) + tw) % tw;
  for (let x = off - tw; x < W + tw; x += tw) c.fillText(unit, x, y);
  c.restore(); c.textBaseline = 'alphabetic';
});

/* ---------- Geometria sagrada: flor da vida, árvore da vida, micélio, espiral áurea e grade polar ---------- */
reg('sacred', 'Geometria sagrada', 'gen', [
  S('kind', 'Forma', 'flor', ['flor', 'arvore', 'micelio', 'espiral', 'polar']), ...EU_POS(), N('size', 'Raio (px)', 360, 20, 2000, 1), N('density', 'Densidade', 0.5, 0.05, 1), N('cycles', 'Ciclos por loop', 1, 0, 16, 1),
  B('labels', 'Rótulos', true), N('seed', 'Semente', 1, 1, 99, 1), N('ui', 'Escala do texto', 1, 0.3, 4), N('weight', 'Traço', 1.5, 0.3, 12, 0.1), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, R0 = p.size * u, ph = euPh(F, p.cycles), lw = Math.max(0.5, p.weight * u), ink = col(comp, p.color), ac = col(comp, p.hot), mu = col(comp, 'secondary'), fs = 18 * u * p.ui;
  const circ = (x, y, r) => { c.beginPath(); c.arc(x, y, Math.max(0.1, r), 0, TAU); c.stroke(); };
  c.save(); c.translate(p.cx * W, p.cy * H); c.lineWidth = lw; euMono(c, fs); c.textAlign = 'center'; c.textBaseline = 'middle';
  if (p.kind === 'flor') {
    const rings = Math.max(1, Math.round(1 + p.density * 4)), r = R0 / (rings * 1.5 + 1.5), cs = [];
    for (let q = -rings; q <= rings; q++) for (let s = -rings; s <= rings; s++) { const t = -q - s; if (Math.abs(t) > rings) continue; cs.push([r * 1.5 * q, r * Math.sqrt(3) * (s + q / 2), Math.max(Math.abs(q), Math.abs(s), Math.abs(t))]); }
    cs.forEach(([x, y, d]) => { c.globalAlpha = 0.4 + 0.6 * (0.5 + 0.5 * Math.cos(ph - d * 0.7)); c.strokeStyle = d === 0 ? ac : d < 2 ? ink : mu; circ(x, y, r); });
    c.globalAlpha = 1; c.strokeStyle = mu; circ(0, 0, r * (rings * 1.5 + 1));
    if (p.labels) { c.fillStyle = mu; for (let i = 0; i < 12; i += 3) { const a = i / 12 * TAU; c.fillText(i * 30 + '°', Math.cos(a) * r * (rings * 1.5 + 1.6), Math.sin(a) * r * (rings * 1.5 + 1.6)); } }
  } else if (p.kind === 'arvore') {
    const Nn = [[0, -0.92], [0.5, -0.66], [-0.5, -0.66], [0.5, -0.26], [-0.5, -0.26], [0, 0], [0.5, 0.36], [-0.5, 0.36], [0, 0.64], [0, 0.92]], E = [[0, 1], [0, 2], [1, 2], [1, 3], [2, 4], [1, 5], [2, 5], [3, 4], [3, 5], [4, 5], [3, 6], [4, 7], [5, 6], [5, 7], [5, 8], [6, 7], [6, 8], [7, 8], [6, 9], [7, 9], [8, 9], [0, 5]], s = R0;
    c.strokeStyle = mu; c.beginPath(); E.forEach(([a, b]) => { c.moveTo(Nn[a][0] * s, Nn[a][1] * s); c.lineTo(Nn[b][0] * s, Nn[b][1] * s); }); c.stroke();
    const q = (((F.lph * cyc(F, p.cycles)) % 1) + 1) % 1 * E.length, e = E[Math.floor(q) % E.length], f = q % 1, A = Nn[e[0]], B2 = Nn[e[1]], d = 8 * u;   /* um pulso percorre os 22 caminhos por ciclo */
    c.fillStyle = ac; c.fillRect((A[0] + (B2[0] - A[0]) * f) * s - d / 2, (A[1] + (B2[1] - A[1]) * f) * s - d / 2, d, d);
    Nn.forEach((pt, i) => { const r = R0 * (i === 5 ? 0.075 : 0.055) * (1 + 0.15 * Math.sin(ph + i)); c.fillStyle = col(comp, 'bg'); c.beginPath(); c.arc(pt[0] * s, pt[1] * s, r, 0, TAU); c.fill(); c.strokeStyle = i === 5 ? ac : ink; circ(pt[0] * s, pt[1] * s, r); });
  } else if (p.kind === 'micelio') {
    const g = 0.5 - 0.5 * Math.cos(ph), D = Math.round(4 + p.density * 5);   /* cresce e recolhe: fecha o loop */
    const seg = (x, y, a, l, d) => { if (d > D) return; const q = clamp(g * (D + 1) - d, 0, 1); if (q <= 0) return; const x2 = x + Math.cos(a) * l * q, y2 = y + Math.sin(a) * l * q; c.lineWidth = Math.max(0.5, (D - d + 1) * lw * 0.35); c.beginPath(); c.moveTo(x, y); c.lineTo(x2, y2); c.stroke(); if (q < 1) return;
      seg(x2, y2, a + 0.5 * (hr(d, Math.round(x), 90 + p.seed) - 0.1), l * 0.76, d + 1); seg(x2, y2, a - 0.5 * (hr(d, Math.round(y), 91 + p.seed) - 0.1), l * 0.72, d + 1); };
    c.strokeStyle = ink; seg(0, R0, -Math.PI / 2, R0 * 0.62, 0); c.strokeStyle = mu; seg(0, R0, -Math.PI / 2 - 0.9, R0 * 0.5, 1); seg(0, R0, -Math.PI / 2 + 0.9, R0 * 0.5, 1); c.fillStyle = ac; c.fillRect(-5 * u, R0 - 5 * u, 10 * u, 10 * u);
  } else if (p.kind === 'espiral') {
    const b = Math.log(1.6180339) / (Math.PI / 2), rot = ph;
    c.strokeStyle = ink; c.globalAlpha = 0.7; c.beginPath(); for (let th = 0; th < 12; th += 0.05) { const r = R0 * 0.008 * Math.exp(b * th); if (r > R0) break; const x = r * Math.cos(th + rot), y = r * Math.sin(th + rot); th ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
    c.globalAlpha = 0.3; const rr = R0 * 0.2; c.beginPath(); for (let i = 0; i < 6; i++) { const x = Math.cos(i * Math.PI / 3) * rr, y = Math.sin(i * Math.PI / 3) * rr; c.moveTo(x + rr, y); c.arc(x, y, rr, 0, TAU); } c.moveTo(rr, 0); c.arc(0, 0, rr, 0, TAU); c.stroke();
    c.globalAlpha = 1; c.strokeStyle = ac; const a2 = -137.508 * Math.PI / 180; c.beginPath(); c.moveTo(0, 0); c.lineTo(R0 * 0.92, 0); c.moveTo(0, 0); c.lineTo(R0 * 0.92 * Math.cos(a2), R0 * 0.92 * Math.sin(a2)); c.stroke(); c.beginPath(); c.arc(0, 0, R0 * 0.24, a2, 0); c.stroke();
    if (p.labels) { c.textAlign = 'left'; c.fillStyle = ac; c.fillText('137.508°', R0 * 0.28, -R0 * 0.16); c.fillStyle = mu; c.fillText('Φ 1.618034', R0 * 0.95, fs * 0.2); }
  } else {
    const sw = ph;   /* grade polar com varredura de 360° por ciclo */
    c.strokeStyle = ink; c.globalAlpha = 0.3; c.beginPath(); for (let i = 1; i <= 5; i++) { c.moveTo(R0 * i / 5, 0); c.arc(0, 0, R0 * i / 5, 0, TAU); }
    for (let a = 0; a < 360; a += 7.5) { const r = a * Math.PI / 180, l = a % 45 === 0 ? R0 : R0 * 0.96; c.moveTo(Math.cos(r) * R0 * 0.2, Math.sin(r) * R0 * 0.2); c.lineTo(Math.cos(r) * l, Math.sin(r) * l); } c.stroke();
    c.globalAlpha = 1; c.strokeStyle = ac; c.lineWidth = lw * 1.5; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(sw) * R0, Math.sin(sw) * R0); c.stroke();
    if (p.labels) { c.fillStyle = mu; c.globalAlpha = 0.8; for (let a = 0; a < 360; a += 45) c.fillText(String(a).padStart(3, '0') + '°', Math.cos(a * Math.PI / 180) * (R0 + fs * 1.6), Math.sin(a * Math.PI / 180) * (R0 + fs * 1.6)); }
  }
  c.restore(); c.globalAlpha = 1; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
});
