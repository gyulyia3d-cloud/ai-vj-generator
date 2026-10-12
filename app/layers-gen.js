/* Geradores de camada (fase 18): linhas, túnel, bitfield, simulação, fluxo, paralaxe, splat, texto em parede e demais camadas `reg`.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores LAYERSGEN. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ===== geradores de briefing ===== */
reg('lines', 'Linhas · campo estrutural', 'gen', [
  S('dir', 'Direção', 'h', ['h', 'v', 'd']), N('count', 'Quantidade', 24, 1, 400, 1), N('weight', 'Espessura', 2, 0.2, 120, 0.1), N('scroll', 'Deslocamento (ciclos/loop)', 1, 0, 16, 1),
  B('stepped', 'Em degrau (por beat)', false), N('pulseAmt', 'Pulso na espessura', 0.6, 0, 6), N('accentEvery', 'Acento a cada N linhas', 0, 0, 40, 1), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const n = Math.max(1, Math.round(p.count)), diag = p.dir === 'd', vert = p.dir === 'v';
  const span = diag ? Math.hypot(W, H) * 1.2 : (vert ? W : H), sp = span / n;
  let off = F.lph * cyc(F, p.scroll); if (p.stepped) off = Math.floor(F.bF) / n * (p.scroll ? 1 : 0); off = ((off % 1) + 1) % 1 * sp;
  const w = p.weight * u * (1 + F.pulse * p.pulseAmt);
  c.save();
  if (diag) { c.translate(W / 2, H / 2); c.rotate(-Math.PI / 4); c.translate(-span / 2, -span / 2); }
  for (let i = -1; i <= n; i++) {
    const pos = i * sp + off;
    c.fillStyle = p.accentEvery > 0 && ((i + n) % p.accentEvery === Math.floor(F.bk) % p.accentEvery) ? col(comp, p.hot) : col(comp, p.color);
    if (vert) c.fillRect(pos - w / 2, 0, w, H); else c.fillRect(0, pos - w / 2, diag ? span : W, w);
  }
  c.restore();
});
/* instrumentos de informação (V7): sempre ligados ao sinal real; ao vivo usam o espectro do analisador, sem fonte usam as bandas sintéticas do BPM */
function specBins(F, n) {
  const out = new Array(n), live = AUD.live() && AUD.fd && AUD.ctx, b = F.bands, hz = live ? AUD.ctx.sampleRate / AUD.an.fftSize : 0, q = Math.floor(F.beatF * 4);
  for (let i = 0; i < n; i++) {
    const x = n > 1 ? i / (n - 1) : 0;
    if (live) { const f = 40 * Math.pow(14000 / 40, x), bi = Math.min(AUD.fd.length - 1, Math.max(1, Math.round(f / hz))); out[i] = AUD.fd[bi] / 255; }
    else {
      const w0 = Math.exp(-Math.pow((x - 0.08) / 0.14, 2)), w1 = Math.exp(-Math.pow((x - 0.45) / 0.22, 2)), w2 = Math.exp(-Math.pow((x - 0.85) / 0.2, 2));
      out[i] = clamp((w0 * b.bass + w1 * b.mid + w2 * b.high) * (0.55 + 0.45 * hr(i, q, 9)), 0, 1);
    }
  }
  return out;
}
reg('instrument', 'Instrumento · espectro, scope, radar', 'gen', [
  S('kind', 'Tipo', 'bars', ['bars', 'radial', 'scope', 'radar', 'rings', 'heat']), N('n', 'Elementos', 48, 4, 256, 1), N('size', 'Tamanho (fração)', 0.4, 0.05, 1.5), N('cx', 'Centro X', 0.5, -0.5, 1.5), N('cy', 'Centro Y', 0.5, -0.5, 1.5),
  N('weight', 'Espessura', 3, 0.3, 80, 0.1), N('gap', 'Vão', 0.3, 0, 0.9), B('mirror', 'Espelhar', false), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, n = Math.round(p.n), S = Math.min(W, H) * p.size, cx = W * p.cx, cy = H * p.cy, w = p.weight * u, A = col(comp, p.color), Hc = col(comp, p.hot);
  c.lineCap = 'butt'; c.lineJoin = 'round';
  if (p.kind === 'bars') {
    const bins = specBins(F, n), bw = W * p.size * 2 / n, x0 = cx - W * p.size, mh = H * p.size;
    for (let i = 0; i < n; i++) {
      const v = bins[i], hh = Math.max(w * 0.4, v * mh), x = x0 + i * bw, y = p.mirror ? cy - hh / 2 : cy;
      c.fillStyle = v > 0.82 ? Hc : A; c.fillRect(x, p.mirror ? y : y - hh, bw * (1 - p.gap), hh);
    }
  } else if (p.kind === 'radial') {
    const bins = specBins(F, n), r0 = S * 0.45;
    c.lineWidth = Math.max(1, w * 0.6);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 - Math.PI / 2, v = bins[i], r1 = r0 + v * S * 0.55 + w * 0.3;
      c.strokeStyle = v > 0.82 ? Hc : A; c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * r1, cy + Math.sin(a) * r1); c.stroke();
      if (p.mirror) { c.beginPath(); c.moveTo(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0); c.lineTo(cx + Math.cos(a) * (r0 - v * S * 0.3), cy + Math.sin(a) * (r0 - v * S * 0.3)); c.stroke(); }
    }
  } else if (p.kind === 'scope') {
    const live = AUD.live() && AUD.td, b = F.bands, N2 = Math.max(32, n * 4), x0 = cx - W * p.size, wd = W * p.size * 2;
    c.lineWidth = Math.max(1, w * 0.7); c.strokeStyle = A; c.beginPath();
    for (let i = 0; i < N2; i++) {
      const x = i / (N2 - 1); let y;
      if (live) y = (AUD.td[Math.floor(x * (AUD.td.length - 1))] - 128) / 128;
      else { const ph = F.lph * Math.PI * 2; y = Math.sin(x * 6.2832 * 3 + ph * 2) * b.bass * 0.7 + Math.sin(x * 6.2832 * 11 - ph * 5) * b.mid * 0.35 + Math.sin(x * 6.2832 * 29 + ph * 9) * b.high * 0.2; }
      const px = x0 + x * wd, py = cy - y * H * p.size * 0.5;
      i ? c.lineTo(px, py) : c.moveTo(px, py);
    }
    c.stroke();
    if (p.mirror) { c.strokeStyle = Hc; c.globalAlpha = 0.5; c.stroke(); c.globalAlpha = 1; }
  } else if (p.kind === 'radar') {
    const rings = 4, ang = F.lph * cyc(F, 1) * Math.PI * 2;
    c.lineWidth = Math.max(1, w * 0.3); c.strokeStyle = A; c.globalAlpha = 0.35;
    for (let i = 1; i <= rings; i++) { c.beginPath(); c.arc(cx, cy, S * i / rings, 0, Math.PI * 2); c.stroke(); }
    c.beginPath(); c.moveTo(cx - S, cy); c.lineTo(cx + S, cy); c.moveTo(cx, cy - S); c.lineTo(cx, cy + S); c.stroke(); c.globalAlpha = 1;
    for (let i = 0; i < 18; i++) {
      const a = hr(i, 2) * Math.PI * 2, r = (0.2 + 0.75 * hr(i, 3)) * S, d = (((ang - a) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2), glow = Math.exp(-d * 2.2) * (0.35 + 0.65 * Math.min(1, F.bands.hit + 0.4));
      c.globalAlpha = glow; c.fillStyle = Hc; c.beginPath(); c.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, Math.max(2, w * 1.2), 0, Math.PI * 2); c.fill();
    }
    c.globalAlpha = 1; c.lineWidth = Math.max(1.5, w * 0.7); c.strokeStyle = Hc; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang) * S, cy + Math.sin(ang) * S); c.stroke();
    for (let k = 1; k <= 10; k++) { c.globalAlpha = 0.07 * (11 - k) / 10; c.beginPath(); c.moveTo(cx, cy); c.lineTo(cx + Math.cos(ang - k * 0.045) * S, cy + Math.sin(ang - k * 0.045) * S); c.stroke(); }
    c.globalAlpha = 1;
  } else if (p.kind === 'rings') {
    const vals = [F.bands.bass, F.bands.mid, F.bands.high, F.bands.rms], k0 = 4; c.lineWidth = Math.max(1.5, w);
    for (let i = 0; i < k0; i++) {
      const r = S * (0.35 + 0.2 * i), v = clamp(vals[i] / 1.2, 0, 1);
      c.globalAlpha = 0.25; c.strokeStyle = A; c.beginPath(); c.arc(cx, cy, r, 0, Math.PI * 2); c.stroke(); c.globalAlpha = 1;
      c.strokeStyle = i === 0 ? Hc : A; c.beginPath(); c.arc(cx, cy, r, -Math.PI / 2, -Math.PI / 2 + v * Math.PI * 2); c.stroke();
    }
  } else {
    const cols = Math.max(2, Math.round(Math.sqrt(n * (W / H)))), rows = Math.max(2, Math.round(n / cols)), cw = W * p.size * 2 / cols, ch = H * p.size * 2 / rows, bins = specBins(F, cols), x0 = cx - W * p.size, y0 = cy - H * p.size, q = Math.floor(F.beatF * 2);
    for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
      const v = clamp(bins[i] * (1 - j / (rows * 1.25)) * (0.6 + 0.8 * hr(i, j, q)), 0, 1);
      c.globalAlpha = 0.12 + v * 0.88; c.fillStyle = v > 0.8 ? Hc : A; c.fillRect(x0 + i * cw, y0 + j * ch, cw * (1 - p.gap), ch * (1 - p.gap));
    }
    c.globalAlpha = 1;
  }
});
/* campo de bits (V7): padrões de operações bit a bit por célula (bytebeat visual). Só inteiros e tempo em degraus de potência de 2, então fecha o loop. */
const BITFORMS = [
  (x, y, t) => (x & y) ^ t, (x, y, t) => (x ^ y) + t, (x, y, t) => ((x | y) % (t + 7)) , (x, y, t) => ((x * y) >> 4) ^ t,
  (x, y, t) => (x & (y + t)) | ((x ^ t) & y), (x, y, t) => ((x - t) ^ (y + t)) & 63, (x, y, t) => ((x * 3) ^ (y * 5) ^ t) & 31, (x, y, t) => (x & y & ~t) | ((x ^ y) & t)
];
reg('bitfield', 'Campo de bits · bitwise', 'gen', [
  N('form', 'Fórmula (0–7)', 0, 0, 7, 1), N('cell', 'Célula (px)', 14, 2, 200, 1), N('steps', 'Passos por loop (8/16/32/64)', 16, 8, 64, 8), N('mask', 'Bit de corte (0–5)', 2, 0, 5, 1),
  N('levels', 'Níveis (2 ou 4)', 2, 2, 4, 2), B('invertHit', 'Inverter no golpe', true), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, cs = Math.max(2, p.cell * u), nx = Math.min(400, Math.ceil(W / cs)), ny = Math.min(400, Math.ceil(H / cs));
  const steps = [8, 16, 32, 64].reduce((a, b) => Math.abs(b - p.steps) < Math.abs(a - p.steps) ? b : a), tt = Math.floor(F.lph * cyc(F, 1) * steps) % steps, f = BITFORMS[Math.max(0, Math.min(7, Math.round(p.form)))];
  const inv = p.invertHit && F.bands.hit > 0.55, A = col(comp, p.color), Hc = col(comp, p.hot), sh = Math.round(p.mask);
  for (let j = 0; j < ny; j++) for (let i = 0; i < nx; i++) {
    const v = (f(i, j, tt) >> sh) & (p.levels > 2 ? 3 : 1), on = inv ? p.levels > 2 ? 3 - v : 1 - v : v;
    if (!on) continue;
    c.globalAlpha = p.levels > 2 ? 0.25 + 0.25 * on : 1; c.fillStyle = on === 3 ? Hc : A; c.fillRect(i * cs, j * cs, cs + 0.5, cs + 0.5);
  }
  c.globalAlpha = 1;
});
/* camada sim (V7): simulação com estado ASSADA em loop. Roda no CPU, sem GL, 100% determinística: aquece um loop, grava dois loops e funde os dois
   (saída[f] = (1-f/LF)·S[LF+f] + (f/LF)·S[f]), então o último quadro continua no primeiro e rolar/exportar dá o mesmo quadro sempre.
   Tipos: reaction (Gray-Scott, reação-difusão) e ink (tinta levada por um campo de corrente que fecha o loop; não é Navier-Stokes completo). */
const SIMC = new Map(); let SIMCV = null;
function simBake(p, W, H, LF) {
  const loopBeats = Math.max(1, P.time.bars) * 4, key = JSON.stringify([p.kind, Math.round(p.res), p.feed, p.kill, p.drops, p.speed, p.flow, p.dissipate, SEED, LF, loopBeats, Math.round(W / H * 100)]);
  const hit = SIMC.get(key); if (hit) return hit;
  const cw = Math.max(32, Math.min(400, Math.round(p.res))), ch = Math.max(18, Math.round(cw * H / W)), n = cw * ch, TAU = Math.PI * 2;
  const every = Math.max(1, Math.round(loopBeats / Math.max(1, p.drops)));
  const A = new Float32Array(n), B = new Float32Array(n), A2 = new Float32Array(n), B2 = new Float32Array(n);
  const ink = p.kind === 'ink';
  const drop = (beat, k, r, val) => { const cx = hr(beat, 11, k) * cw, cy = hr(beat, 12, k) * ch; for (let y = Math.floor(cy - r); y <= cy + r; y++) for (let x = Math.floor(cx - r); x <= cx + r; x++) { const d = Math.hypot(x - cx, y - cy); if (d > r) continue; const i = ((y + ch) % ch) * cw + ((x + cw) % cw); if (ink) A[i] = Math.min(1, A[i] + val * (1 - d / r)); else { B[i] = val; A[i] = 0.5; } } };
  if (!ink) { A.fill(1); for (let k = 0; k < 6; k++) drop(900 + k, k, 3, 1); }
  const steps = Math.max(1, Math.round(p.speed * 4)), total = LF * 3, S = [];
  const SX = [0, 1, 2].map(() => new Float32Array(cw)), CX = [0, 1, 2].map(() => new Float32Array(cw)), SY = [0, 1, 2].map(() => new Float32Array(ch)), CY = [0, 1, 2].map(() => new Float32Array(ch));
  for (let k = 0; k < 3; k++) for (let x = 0; x < cw; x++) { const X = TAU * ((k + 1) * (x / cw) + hr(k, 21) * 7); SX[k][x] = Math.sin(X); CX[k][x] = Math.cos(X); }
  const Du = 0.2097, Dv = 0.105, F = p.feed, K = p.kill, psi = (x, y, ph) => { let s = 0; for (let k = 0; k < 3; k++) s += Math.sin(TAU * ((k + 1) * x + hr(k, 21) * 7)) * Math.sin(TAU * ((k + 2) * y + hr(k, 22) * 7) + ph * (k % 2 ? 1 : -1)) / (k + 1.5); return s; };
  for (let f = 0; f < total; f++) {
    const tl = f % LF, beatF = tl / LF * loopBeats, beat = Math.floor(beatF), prevBeat = Math.floor(((f - 1 + LF) % LF) / LF * loopBeats);
    if (f === 0 || beat !== prevBeat) { if (beat % every === 0) { drop(beat, 0, ink ? cw * 0.06 : 3, 1); if (beat % (every * 2) === 0) drop(beat, 1, ink ? cw * 0.04 : 2, ink ? 0.9 : 1); } }
    if (ink) {
      /* corrente = rotacional de uma função de corrente periódica (freqüências inteiras e 1 ciclo por loop): sem fontes nem sumidouros, fecha o loop */
      const ph = TAU * tl / LF, dt = p.flow * 0.35 * cw / 160, sxs = SX, cxs = CX;
      for (let k = 0; k < 3; k++) { const wk = 1 / (k + 1.5), sg = k % 2 ? 1 : -1; for (let y = 0; y < ch; y++) { const Y = TAU * ((k + 2) * (y / ch) + hr(k, 22) * 7) + sg * ph; SY[k][y] = Math.sin(Y) * wk; CY[k][y] = Math.cos(Y) * wk; } }
      for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
        let vx = 0, vy = 0;
        for (let k = 0; k < 3; k++) { vx += TAU * (k + 2) * sxs[k][x] * CY[k][y]; vy -= TAU * (k + 1) * cxs[k][x] * SY[k][y]; }
        let sx = x - vx * dt * 0.45, sy = y - vy * dt * 0.45; sx = ((sx % cw) + cw) % cw; sy = ((sy % ch) + ch) % ch;
        const x0 = Math.floor(sx), y0 = Math.floor(sy), fx = sx - x0, fy = sy - y0, x1 = (x0 + 1) % cw, y1 = (y0 + 1) % ch;
        B[y * cw + x] = ((A[y0 * cw + x0] * (1 - fx) + A[y0 * cw + x1] * fx) * (1 - fy) + (A[y1 * cw + x0] * (1 - fx) + A[y1 * cw + x1] * fx) * fy) * p.dissipate;
      }
      A.set(B);
    } else {
      for (let s = 0; s < steps; s++) {
        for (let y = 0; y < ch; y++) { const yu = ((y + ch - 1) % ch) * cw, yd = ((y + 1) % ch) * cw, yc = y * cw; for (let x = 0; x < cw; x++) {
          const xl = (x + cw - 1) % cw, xr = (x + 1) % cw, i = yc + x, a = A[i], b = B[i], ab2 = a * b * b;
          A2[i] = a + Du * (A[yc + xl] + A[yc + xr] + A[yu + x] + A[yd + x] - 4 * a) - ab2 + F * (1 - a);
          B2[i] = b + Dv * (B[yc + xl] + B[yc + xr] + B[yu + x] + B[yd + x] - 4 * b) + ab2 - (F + K) * b;
        } }
        A.set(A2); B.set(B2);
      }
    }
    if (f >= LF) { const q = new Uint8Array(n), src = ink ? A : B, sc = ink ? 255 : 255 / 0.5; for (let i = 0; i < n; i++) q[i] = ink ? Math.max(0, Math.min(255, Math.pow(Math.max(0, src[i]), 0.5) * 255)) : Math.max(0, Math.min(255, src[i] * sc)); S.push(q); }
  }
  /* S tem 2·LF quadros: S[j] é o instante j do segundo e do terceiro loop. Fusão: out[f] = (1-f/LF)·S[LF+f] + (f/LF)·S[f] */
  const out = [];
  for (let f = 0; f < LF; f++) { const w = f / LF, a = S[LF + f], b = S[f], q = new Uint8Array(n); for (let i = 0; i < n; i++) q[i] = a[i] * (1 - w) + b[i] * w; out.push(q); }
  const res = { cw, ch, out, LF }; if (SIMC.size > 5) SIMC.delete(SIMC.keys().next().value); SIMC.set(key, res); return res;
}
reg('sim', 'Simulação · reação-difusão e tinta (assada em loop)', 'gen', [
  S('kind', 'Tipo', 'reaction', ['reaction', 'ink']), N('res', 'Resolução da grade (células)', 160, 32, 400, 8), N('feed', 'Feed (reaction)', 0.037, 0.01, 0.08, 0.001), N('kill', 'Kill (reaction)', 0.06, 0.04, 0.07, 0.001),
  N('speed', 'Velocidade da simulação', 2, 0.5, 6, 0.5), N('drops', 'Injeções por loop', 8, 1, 64, 1), N('flow', 'Força da corrente (ink)', 1, 0.1, 4), N('dissipate', 'Dissipação (ink)', 0.998, 0.95, 1, 0.001),
  N('threshold', 'Limiar', 0.25, 0, 1), N('soft', 'Maciez da borda', 0.25, 0.01, 1), B('smooth', 'Suavizar ao ampliar', true), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H } = R, LF = loopFrames(), b = simBake(p, W, H, LF), q = b.out[((Math.floor(F.lph * LF) % LF) + LF) % LF];
  if (!SIMCV || SIMCV.width !== b.cw || SIMCV.height !== b.ch) { SIMCV = document.createElement('canvas'); SIMCV.width = b.cw; SIMCV.height = b.ch; }
  const cx = SIMCV.getContext('2d'), im = cx.createImageData(b.cw, b.ch), A = hexRgb(col(comp, p.color)), Hc = hexRgb(col(comp, p.hot)), th = p.threshold * 255, sf = Math.max(1, p.soft * 255), boost = 1 + F.bands.hit * 0.25;
  for (let i = 0; i < q.length; i++) {
    const v = q[i], a = Math.max(0, Math.min(1, (v - th) / sf)) * Math.min(1, boost), k = Math.max(0, Math.min(1, (v - th - sf) / (255 - th - sf + 1))), o = i * 4;
    im.data[o] = A[0] + (Hc[0] - A[0]) * k; im.data[o + 1] = A[1] + (Hc[1] - A[1]) * k; im.data[o + 2] = A[2] + (Hc[2] - A[2]) * k; im.data[o + 3] = a * 255;
  }
  cx.putImageData(im, 0, 0); c.imageSmoothingEnabled = !!p.smooth; c.imageSmoothingQuality = 'high'; c.drawImage(SIMCV, 0, 0, W, H);
});
/* parallax 2.5D (V7): uma imagem + um mapa de profundidade viram faixas de profundidade que deslizam em velocidades diferentes. Sem mapa, usa a luminância como profundidade.
   O mapa vem de scripts/depth_estimate.py (modelo aberto, se instalado) ou de qualquer app (claro = perto). Função pura do quadro; o movimento usa ciclos inteiros. */
const PARC = new Map();
function parallaxBuild(m, dm, bands, invert) {
  const key = [m.name, dm ? dm.name : '-', m.w, m.h, bands, invert ? 1 : 0].join('|'), hit = PARC.get(key); if (hit) return hit;
  const sc = Math.min(1, 1024 / Math.max(m.w, m.h)), sw = Math.max(8, Math.round(m.w * sc)), sh = Math.max(8, Math.round(m.h * sc));
  const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh; const cx = cv.getContext('2d', { willReadFrequently: true });
  cx.drawImage(m.img, 0, 0, sw, sh); const im = cx.getImageData(0, 0, sw, sh), px = im.data;
  cx.clearRect(0, 0, sw, sh); const src = dm ? dm.img : m.img; cx.drawImage(src, 0, 0, sw, sh); const dp = cx.getImageData(0, 0, sw, sh).data;
  const lum = new Float32Array(sw * sh); let lo = 1, hi = 0;
  for (let i = 0; i < sw * sh; i++) { const l = (0.2126 * dp[i * 4] + 0.7152 * dp[i * 4 + 1] + 0.0722 * dp[i * 4 + 2]) / 255; lum[i] = invert ? 1 - l : l; if (lum[i] < lo) lo = lum[i]; if (lum[i] > hi) hi = lum[i]; }
  /* sem mapa: suaviza a luminância (profundidade grosseira) */
  if (!dm) { const t2 = new Float32Array(lum.length), r = Math.max(2, Math.round(sw / 60)); for (let y = 0; y < sh; y++) for (let x = 0; x < sw; x++) { let s = 0, n = 0; for (let dy = -r; dy <= r; dy += r) for (let dx = -r; dx <= r; dx += r) { const xx = Math.min(sw - 1, Math.max(0, x + dx)), yy = Math.min(sh - 1, Math.max(0, y + dy)); s += lum[yy * sw + xx]; n++; } t2[y * sw + x] = s / n; } lum.set(t2); }
  const span = Math.max(1e-6, hi - lo), N = Math.max(2, Math.min(32, Math.round(bands))), layers = [];
  for (let k = 0; k < N; k++) { const c2 = document.createElement('canvas'); c2.width = sw; c2.height = sh; layers.push({ cv: c2, im: new ImageData(sw, sh), d: (k + 0.5) / N }); }
  for (let i = 0; i < sw * sh; i++) { const d = Math.min(0.9999, Math.max(0, (lum[i] - lo) / span)), k = Math.floor(d * N), o = i * 4, L = layers[k].im.data; L[o] = px[o]; L[o + 1] = px[o + 1]; L[o + 2] = px[o + 2]; L[o + 3] = px[o + 3]; }
  layers.forEach(l => { l.cv.getContext('2d').putImageData(l.im, 0, 0); delete l.im; });
  const back = document.createElement('canvas'); back.width = sw; back.height = sh; back.getContext('2d').putImageData(im, 0, 0);
  const res = { layers, back, sw, sh }; if (PARC.size > 3) PARC.delete(PARC.keys().next().value); PARC.set(key, res); return res;
}
reg('parallax', 'Parallax 2.5D · imagem + profundidade', 'gen', [
  S('media', 'Imagem', '', []), S('mediad', 'Mapa de profundidade (vazio = luminância)', '', []), N('bands', 'Faixas de profundidade', 14, 4, 32, 1), S('orbit', 'Câmera', 'sway', ['sway', 'circle', 'dolly']),
  N('amp', 'Amplitude (fração da largura)', 0.03, 0, 0.2, 0.001), N('cycles', 'Ciclos por loop', 1, 1, 8, 1), N('zoom', 'Zoom', 0.04, 0, 0.5, 0.005), N('hitPush', 'Empurrão no golpe', 0.01, 0, 0.1, 0.001),
  B('invertDepth', 'Inverter profundidade', false), S('fit', 'Encaixe', 'cover', ['cover', 'contain', 'fill'])
], (c, R) => {
  const { p, F, W, H } = R, m = mediaImg(p.media); if (!m) return; const dm = p.mediad ? mediaImg(p.mediad) : null;
  const B2 = parallaxBuild(m, dm, p.bands, p.invertDepth), [x, y, w, h] = fitRect(m.w, m.h, W, H, p.fit), cyc2 = Math.max(1, Math.round(p.cycles)), a = Math.PI * 2 * F.lph * cyc2, push = 1 + F.bands.hit * p.hitPush;
  const sx = p.orbit === 'circle' ? Math.cos(a) : p.orbit === 'dolly' ? 0 : Math.sin(a), sy = p.orbit === 'circle' ? Math.sin(a) : p.orbit === 'dolly' ? 0 : 0.0, zz = p.orbit === 'dolly' ? 0.5 - 0.5 * Math.cos(a) : 0;
  const draw = (cv, dep) => { const dz = dep - 0.5, s = 1 + p.zoom + zz * p.zoom * 4 * dep, ox = sx * p.amp * W * dz * 2 * push, oy = sy * p.amp * W * dz * 2 * push; c.save(); c.translate(x + w / 2 + ox, y + h / 2 + oy); c.scale(s, s); c.drawImage(cv, -w / 2, -h / 2, w, h); c.restore(); };
  c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip(); draw(B2.back, 0.5 - 0.5);
  for (const l of B2.layers) draw(l.cv, l.d);
  c.restore();
});
/* splats 3D e nuvens de pontos (V7): .ply (3D Gaussian Splatting ou nuvem comum, binário little-endian ou ASCII). O motor 2D desenha cada splat como um disco macio
   ordenado de trás para frente, com raio vindo da escala do splat (aproximação isotrópica: não é o rasterizador anisotrópico completo). Reduz a ≤ 60 mil pontos na importação. */
const SPLAT_MAX = 60000;
function parsePly(buf) {
  const u8 = new Uint8Array(buf), head = new TextDecoder().decode(u8.subarray(0, Math.min(u8.length, 8192))), he = head.indexOf('end_header');
  if (!head.startsWith('ply') || he < 0) throw new Error('não é um arquivo PLY');
  const lines = head.slice(0, he).split(/\r?\n/), bodyStart = he + 'end_header'.length + (head[he + 10] === '\r' ? 2 : 1);
  let fmt = '', n = 0, props = [], inV = false;
  for (const l of lines) { const w = l.trim().split(/\s+/); if (w[0] === 'format') fmt = w[1]; else if (w[0] === 'element') { inV = w[1] === 'vertex'; if (inV) n = +w[2]; } else if (w[0] === 'property' && inV) props.push({ t: w[1], k: w[2] }); }
  if (!n || !props.length) throw new Error('PLY sem vértices');
  const SZ = { char: 1, uchar: 1, int8: 1, uint8: 1, short: 2, ushort: 2, int16: 2, uint16: 2, int: 4, uint: 4, int32: 4, uint32: 4, float: 4, float32: 4, double: 8, float64: 8 };
  const idx = {}; props.forEach((p, i) => { idx[p.k] = i; });
  const get = new Array(n); let readers;
  if (fmt === 'binary_little_endian') {
    const dv = new DataView(buf, bodyStart); let stride = 0; const offs = props.map(p => { const o = stride; stride += SZ[p.t] || 4; return o; });
    const rd = (p, o) => { switch (p.t) { case 'float': case 'float32': return dv.getFloat32(o, true); case 'double': case 'float64': return dv.getFloat64(o, true); case 'uchar': case 'uint8': return dv.getUint8(o); case 'char': case 'int8': return dv.getInt8(o); case 'short': case 'int16': return dv.getInt16(o, true); case 'ushort': case 'uint16': return dv.getUint16(o, true); case 'int': case 'int32': return dv.getInt32(o, true); default: return dv.getUint32(o, true); } };
    readers = (i, k) => (idx[k] === undefined ? undefined : rd(props[idx[k]], i * stride + offs[idx[k]]));
    if (bodyStart + n * stride > buf.byteLength) throw new Error('PLY truncado');
  } else if (fmt === 'ascii') {
    const rows = new TextDecoder().decode(u8.subarray(bodyStart)).split(/\r?\n/); readers = (i, k) => { if (idx[k] === undefined) return undefined; const r = rows[i]; if (!r) return 0; const w = r.trim().split(/\s+/); return +w[idx[k]]; };
  } else throw new Error('PLY ' + fmt + ' não suportado (use binary_little_endian ou ascii)');
  if (idx.x === undefined || idx.y === undefined || idx.z === undefined) throw new Error('PLY sem x y z');
  const keep = Math.min(n, SPLAT_MAX), step = n / keep, pos = new Float32Array(keep * 3), rgb = new Uint8Array(keep * 3), a = new Uint8Array(keep), s = new Float32Array(keep);
  const hasSH = idx.f_dc_0 !== undefined, hasRGB = idx.red !== undefined, hasS = idx.scale_0 !== undefined, hasO = idx.opacity !== undefined;
  for (let q = 0; q < keep; q++) {
    const i = Math.min(n - 1, Math.floor(q * step));
    pos[q * 3] = readers(i, 'x'); pos[q * 3 + 1] = readers(i, 'y'); pos[q * 3 + 2] = readers(i, 'z');
    if (hasSH) for (let c = 0; c < 3; c++) rgb[q * 3 + c] = Math.max(0, Math.min(255, (0.5 + 0.28209479 * readers(i, 'f_dc_' + c)) * 255));
    else if (hasRGB) { rgb[q * 3] = readers(i, 'red'); rgb[q * 3 + 1] = readers(i, 'green'); rgb[q * 3 + 2] = readers(i, 'blue'); }
    else rgb[q * 3] = rgb[q * 3 + 1] = rgb[q * 3 + 2] = 220;
    a[q] = hasO ? Math.round(255 / (1 + Math.exp(-readers(i, 'opacity')))) : 255;
    s[q] = hasS ? (Math.exp(readers(i, 'scale_0')) + Math.exp(readers(i, 'scale_1')) + Math.exp(readers(i, 'scale_2'))) / 3 : 0;
  }
  return splatNorm({ pos, rgb, a, s, n: keep, total: n, hasScale: hasS });
}
function splatNorm(o) {
  const { pos, n } = o; let sx = 0, sy = 0, sz = 0; for (let i = 0; i < n; i++) { sx += pos[i * 3]; sy += pos[i * 3 + 1]; sz += pos[i * 3 + 2]; } sx /= n; sy /= n; sz /= n;
  const dd = new Float32Array(n); for (let i = 0; i < n; i++) dd[i] = Math.hypot(pos[i * 3] - sx, pos[i * 3 + 1] - sy, pos[i * 3 + 2] - sz);
  const sorted = Array.from(dd).sort((a, b) => a - b), r = sorted[Math.min(n - 1, Math.floor(n * 0.98))] || 1;   /* percentil 98: ignora pontos soltos longe */
  for (let i = 0; i < n; i++) { pos[i * 3] = (pos[i * 3] - sx) / r; pos[i * 3 + 1] = (pos[i * 3 + 1] - sy) / r; pos[i * 3 + 2] = (pos[i * 3 + 2] - sz) / r; o.s[i] /= r; }
  let ms = 0; for (let i = 0; i < n; i++) ms += o.s[i]; o.meanS = ms / n || 0.01; o.kind = 'splat'; return o;
}
function splatPack(o) {
  const n = o.n, b = new ArrayBuffer(4 + n * 12 + n * 3 + n + n * 4), dv = new DataView(b); dv.setUint32(0, n, true);
  new Float32Array(b, 4, n * 3).set(o.pos); new Uint8Array(b, 4 + n * 12, n * 3).set(o.rgb); new Uint8Array(b, 4 + n * 15, n).set(o.a); new Float32Array(b, 4 + n * 16, n).set(o.s);
  let bin = ''; const u = new Uint8Array(b); for (let i = 0; i < u.length; i += 0x8000) bin += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000));
  return 'data:application/x-aivj-splat;base64,' + btoa(bin);
}
function splatUnpack(data) {
  const bin = atob(data.slice(data.indexOf(',') + 1)), u = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i);
  const b = u.buffer, n = new DataView(b).getUint32(0, true), o = { n, pos: new Float32Array(b.slice(4, 4 + n * 12)), rgb: new Uint8Array(b.slice(4 + n * 12, 4 + n * 15)), a: new Uint8Array(b.slice(4 + n * 15, 4 + n * 16)), s: new Float32Array(b.slice(4 + n * 16, 4 + n * 20)) };
  let ms = 0; for (let i = 0; i < n; i++) ms += o.s[i]; o.meanS = ms / n || 0.01; o.kind = 'splat'; return o;
}
const SPLAT_ORD = new Map();
reg('splat', 'Splat 3D · nuvem de pontos (.ply)', 'gen', [
  S('media', 'Arquivo .ply', '', []), N('max', 'Pontos desenhados', 15000, 2000, 60000, 1000), N('size', 'Tamanho do objeto (fração)', 0.42, 0.05, 1.5), N('dot', 'Tamanho do ponto', 1, 0.2, 6), N('turns', 'Voltas por loop', 1, 0, 4, 1),
  N('tilt', 'Inclinação °', -12, -80, 80, 1), N('dist', 'Distância da câmera', 3.2, 1.5, 12), N('depthFade', 'Escurecer ao fundo', 0.5, 0, 1), S('colorMode', 'Cor', 'palette', ['palette', 'source']), N('alpha', 'Opacidade', 0.8, 0.05, 1), B('hitPulse', 'Pulso no golpe', true),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, m = MEDIA[p.media]; if (!m || m.kind !== 'splat') return;
  const n = Math.min(m.n, Math.round(p.max)), stp = m.n / n, yaw = Math.PI * 2 * F.lph * Math.round(p.turns), tl = p.tilt * Math.PI / 180, cy = Math.cos(yaw), sy = Math.sin(yaw), ct = Math.cos(tl), st = Math.sin(tl);
  const S0 = Math.min(W, H) * p.size, d0 = p.dist, f = d0 * 1.0, pos = m.pos, ids = new Int32Array(n), zs = new Float32Array(n), xs = new Float32Array(n), ys = new Float32Array(n);
  for (let q = 0; q < n; q++) {
    const i = Math.floor(q * stp), x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2], x1 = x * cy + z * sy, z1 = -x * sy + z * cy, y2 = y * ct - z1 * st, z2 = y * st + z1 * ct;
    ids[q] = i; xs[q] = x1; ys[q] = y2; zs[q] = z2;
  }
  const ord = Array.from({ length: n }, (_, q) => q).sort((a, b) => (zs[b] - zs[a]) || (a - b));   /* longe primeiro; desempate pelo índice: determinístico */
  const A = hexRgb(col(comp, p.color)), Hc = hexRgb(col(comp, p.hot)), push = 1 + (p.hitPulse ? F.bands.hit * 0.08 : 0), dotPx = Math.max(0.6, p.dot * u * 1.2), base = Math.max(0.004, m.meanS) * S0 * 2.2;
  for (const q of ord) {
    const z = zs[q], k = f / (d0 + z); if (d0 + z < 0.2) continue;
    const i = ids[q], px = W / 2 + xs[q] * S0 * k * push * 1.0, py = H / 2 - ys[q] * S0 * k * push, depth = Math.max(0, Math.min(1, 0.5 - z / 2.2)), r = Math.max(dotPx, (m.s[i] > 0 ? m.s[i] * S0 * 2.2 : base) * k * p.dot);
    if (px < -r || px > W + r || py < -r || py > H + r) continue;
    let cr, cg, cb; const fade = 1 - p.depthFade * (1 - depth);
    if (p.colorMode === 'source') { cr = m.rgb[i * 3]; cg = m.rgb[i * 3 + 1]; cb = m.rgb[i * 3 + 2]; }
    else { const l = (m.rgb[i * 3] * 0.3 + m.rgb[i * 3 + 1] * 0.59 + m.rgb[i * 3 + 2] * 0.11) / 255, k2 = Math.max(0, Math.min(1, depth * 0.6 + l * 0.6 - 0.1)); cr = A[0] + (Hc[0] - A[0]) * k2; cg = A[1] + (Hc[1] - A[1]) * k2; cb = A[2] + (Hc[2] - A[2]) * k2; }
    c.globalAlpha = Math.max(0, Math.min(1, m.a[i] / 255 * p.alpha * fade)); c.fillStyle = `rgb(${cr | 0},${cg | 0},${cb | 0})`;
    if (r < 2.2) c.fillRect(px - r, py - r, r * 2, r * 2); else { c.beginPath(); c.arc(px, py, r, 0, 6.2832); c.fill(); }
  }
  c.globalAlpha = 1;
});
reg('flow', 'Fluxo · partículas em campo', 'gen', [
  N('count', 'Partículas', 900, 20, 6000, 10), N('trail', 'Rastro', 8, 1, 30, 1), N('amp', 'Amplitude', 0.12, 0, 1), N('scale', 'Escala do ruído', 2.5, 0.2, 12),
  N('radius', 'Raio da órbita', 0.8, 0, 4), N('width', 'Espessura', 1.2, 0.2, 12, 0.1), N('alpha', 'Opacidade', 0.7, 0, 1), N('acc', 'Fração em acento', 0.06, 0, 1),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const n = Math.max(1, Math.round(p.count * ST.dens)), M = Math.min(W, H), cy = cyc(F, 1) || 0, ang = TAU * F.lph * cy;
  c.lineWidth = p.width * u * (1 + F.pulse * 0.5); c.globalAlpha = p.alpha; c.lineCap = 'round';
  const path = (hot) => {
    c.beginPath();
    for (let i = 0; i < n; i++) {
      if ((hr(i, 9, 41) < p.acc) !== hot) continue;
      const bx = hr(i, 1, 41), by = hr(i, 2, 41);
      for (let j = 0; j < p.trail; j++) {
        const a = ang - j * 0.05 * (1 + hr(i, 3, 41)), ox = Math.cos(a) * p.radius, oy = Math.sin(a) * p.radius;
        const nx = vn(bx * p.scale + ox, by * p.scale + oy) - 0.5, ny = vn(bx * p.scale + ox + 19.7, by * p.scale + oy + 7.3) - 0.5;
        const x = bx * W + nx * p.amp * 2 * M, y = by * H + ny * p.amp * 2 * M;
        j ? c.lineTo(x, y) : c.moveTo(x, y);
      }
    }
    c.strokeStyle = col(comp, hot ? p.hot : p.color); c.stroke();
  };
  path(false); if (p.acc > 0) path(true);
  c.globalAlpha = 1; c.lineCap = 'butt';
});
reg('tunnel', 'Túnel · formas concêntricas', 'gen', [
  S('shape', 'Forma', 'rect', ['rect', 'circle', 'tri', 'hex']), N('count', 'Quantidade', 18, 2, 80, 1), N('cycles', 'Ciclos por loop', 1, 0, 16, 1), N('power', 'Perspectiva', 2.2, 0.5, 5),
  N('size', 'Tamanho', 1, 0.1, 3), N('aspect', 'Proporção', 1.78, 0.2, 6), N('weight', 'Espessura', 3, 0.2, 60, 0.1), N('spin', 'Giro (ciclos/loop)', 0, 0, 8, 1),
  N('twist', 'Torção', 0, -3, 3), N('pulseAmt', 'Pulso', 1.2, 0, 6), N('cx', 'Centro X', 0.5, 0, 1), N('cy', 'Centro Y', 0.5, 0, 1), B('hit', 'Anel acento no beat', true),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const n = Math.round(p.count), cx = p.cx * W, cy = p.cy * H, maxR = Math.hypot(W, H) * 0.6 * p.size, cc = cyc(F, p.cycles), rot = TAU * F.lph * cyc(F, p.spin);
  for (let i = 0; i < n; i++) {
    const z = (((i / n) + F.lph * cc) % 1 + 1) % 1, s = Math.pow(z, p.power) * maxR;
    if (s < 1) continue;
    const hot = p.hit && i === Math.floor(F.bk) % n;
    c.globalAlpha = Math.min(1, z * 2.5); c.strokeStyle = col(comp, hot ? p.hot : p.color);
    c.lineWidth = p.weight * u * (0.3 + z) * (1 + (hot ? F.pulse * p.pulseAmt : 0));
    c.save(); c.translate(cx, cy); c.rotate(rot + p.twist * z); c.beginPath();
    if (p.shape === 'circle') c.arc(0, 0, s, 0, TAU);
    else if (p.shape === 'rect') { const w = s * Math.sqrt(p.aspect), h = s / Math.sqrt(p.aspect); c.rect(-w, -h, w * 2, h * 2); }
    else { const k = p.shape === 'tri' ? 3 : 6; for (let q = 0; q <= k; q++) { const a = q / k * TAU - Math.PI / 2; q ? c.lineTo(Math.cos(a) * s, Math.sin(a) * s) : c.moveTo(Math.cos(a) * s, Math.sin(a) * s); } }
    c.stroke(); c.restore();
  }
  c.globalAlpha = 1;
});
reg('typewall', 'Parede tipográfica', 'gen', [
  T('words', 'Palavras (separe por |)', 'SIGNAL|PRESSURE|SYSTEM'), N('rows', 'Linhas', 4, 1, 16, 1), N('fill', 'Altura da letra', 0.82, 0.2, 1.4), S('font', 'Fonte', 'archivo', ['archivo', 'bebas', 'mono', 'helvetica']),
  N('weight', 'Peso', 800, 100, 900, 100), N('scroll', 'Rolagem (ciclos/loop)', 1, 0, 12, 1), B('change', 'Troca no beat', true), S('outline', 'Contorno', 'alt', ['none', 'alt', 'all']),
  N('stroke', 'Traço do contorno', 2, 0.5, 20, 0.1), T('sep', 'Separador', '  /  '), B('upper', 'Caixa alta', true), B('hit', 'Linha acento no beat', true),
  C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const words = String(p.words || 'SIGNAL').split('|').map(s => s.trim()).filter(Boolean); if (!words.length) return;
  const rows = Math.max(1, Math.round(p.rows)), rh = H / rows, fs = rh * p.fill;
  setFont(c, p.weight, fs, fam(p.font), 0); c.textBaseline = 'middle'; c.textAlign = 'left';
  for (let r = 0; r < rows; r++) {
    const w = p.change ? words[Math.floor(hr(Math.floor(F.bk), r, 5) * words.length)] : words[r % words.length];
    const s = (p.upper ? w.toUpperCase() : w) + p.sep, tw = Math.max(1, c.measureText(s).width), dir = r % 2 ? 1 : -1;
    const off = (((F.lph * cyc(F, p.scroll) * dir) % 1) + 1) % 1 * tw, y = rh * (r + 0.5);
    const hot = p.hit && r === Math.floor(F.bk) % rows, outl = p.outline === 'all' || (p.outline === 'alt' && (r + Math.floor(F.bk)) % 2 === 1);
    c.fillStyle = c.strokeStyle = col(comp, hot ? p.hot : p.color); c.lineWidth = p.stroke * u;
    for (let x = -off; x < W; x += tw) outl ? c.strokeText(s, x, y) : c.fillText(s, x, y);
  }
  c.textBaseline = 'alphabetic';
});
