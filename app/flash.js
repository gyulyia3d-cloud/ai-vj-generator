/* Segurança de flash e utilitários de export (fase 3): análise de flashes (critério geral do WCAG 2.3.1), limitador que suaviza subidas bruscas e SHA-256 para o manifesto.
   A análise mede luminância relativa média do quadro; o critério de flash vermelho saturado NÃO é medido. Isto ajuda, não certifica: peças para público com fotossensibilidade
   precisam de revisão humana e de um teste com ferramenta homologada (Harding/PEAT). Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const FLASH = (() => {
  const SWING = 0.1, DARK = 0.8, MAX_FLASHES = 3;
  const lin = c => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const relLum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  /* pivôs do ziguezague: extremos separados por uma variação de pelo menos thr */
  function pivots(s, thr) {
    const out = []; let dir = 0, hi = s[0], hiI = 0, lo = s[0], loI = 0;
    for (let i = 1; i < s.length; i++) {
      const x = s[i];
      if (dir === 0) {
        if (x > hi) { hi = x; hiI = i; } if (x < lo) { lo = x; loI = i; }
        if (x - lo >= thr) { out.push({ i: loI, v: lo }); dir = 1; hi = x; hiI = i; }
        else if (hi - x >= thr) { out.push({ i: hiI, v: hi }); dir = -1; lo = x; loI = i; }
      } else if (dir === 1) {
        if (x > hi) { hi = x; hiI = i; } else if (hi - x >= thr) { out.push({ i: hiI, v: hi }); dir = -1; lo = x; loI = i; }
      } else {
        if (x < lo) { lo = x; loI = i; } else if (x - lo >= thr) { out.push({ i: loI, v: lo }); dir = 1; hi = x; hiI = i; }
      }
    }
    return out;
  }
  /* series: luminância relativa 0..1 por quadro de um loop; o loop é tratado como cíclico. Devolve o pior segundo e o veredito. */
  function analyze(series, fps) {
    const n = series.length; if (n < 2) return { frames: n, fps, worst: 0, transitions: 0, pass: true, at: 0, bad: new Uint8Array(n) };
    const tri = []; for (let k = 0; k < 3; k++) for (let i = 0; i < n; i++) tri.push(series[i]);
    const pv = pivots(tri, SWING), tr = [];
    for (let k = 1; k < pv.length; k++) if (Math.min(pv[k].v, pv[k - 1].v) < DARK) tr.push(pv[k].i);   // pares que ficam o tempo todo acima de 0,8 de luminância são isentos
    const win = Math.max(1, Math.round(fps)); let worst = 0, at = 0;
    for (let t = n; t < 2 * n; t++) { let c = 0; for (const x of tr) if (x >= t && x < t + win) c++; if (c > worst) { worst = c; at = t - n; } }
    // quadros dentro de janelas de 1 s que passam do limite (cíclico): é onde o limitador age
    const bad = new Uint8Array(n);
    for (let t = n; t < 2 * n; t++) { let c = 0; for (const x of tr) if (x >= t && x < t + win) c++; if (c / 2 > MAX_FLASHES) for (let k = 0; k < win; k++) bad[(t - n + k) % n] = 1; }
    return { frames: n, fps, transitions: worst, worst: worst / 2, pass: worst / 2 <= MAX_FLASHES, at, bad };
  }
  /* limitador de contraste local: nenhum quadro pode passar do mais escuro da vizinhança (meio segundo para cada lado, cíclico) por mais que maxSwing.
     Como a análise só conta variações de 0,1 ou mais, um pico limitado a 0,08 acima do vale não é flash. Só dimensiona (ganho <= 1): vales e subidas lentas ficam intactos. */
  function limit(series, maxSwing, fps, bad) {
    const n = series.length, w = Math.max(1, Math.round(0.5 * (fps || 30))), g = new Float32Array(n).fill(1);
    // máscara: o ganho só vale nas janelas reprovadas (e meio segundo ao redor, com rampa), para não mexer em fades lentos e trechos calmos
    let m = null; if (bad) { m = new Float32Array(n); for (let i = 0; i < n; i++) if (bad[i]) for (let k = -w; k <= w; k++) { const j = ((i + k) % n + n) % n, v = 1 - Math.abs(k) / (w + 1); if (v > m[j]) m[j] = v; } }
    for (let i = 0; i < n; i++) {
      let lo = Infinity; for (let k = -w; k <= w; k++) { const v = series[((i + k) % n + n) % n]; if (v < lo) lo = v; }
      const cap = lo + maxSwing, L = series[i]; if (L > cap && L > 1e-6) g[i] = cap / L;
      if (m) g[i] = 1 - (1 - g[i]) * m[i];
    }
    return g;
  }
  /* ganho linear de luminância -> fator de brilho em sRGB (aproximação gama 2,2), para dimensionar pixels */
  const srgbFactor = g => Math.pow(Math.max(0, Math.min(1, g)), 1 / 2.2);
  /* luminância relativa média de um ImageData (composta sobre preto) */
  function frameLum(d) { let s = 0, n = d.length / 4; for (let i = 0; i < d.length; i += 4) s += relLum(d[i], d[i + 1], d[i + 2]) * (d[i + 3] / 255); return s / Math.max(1, n); }
  /* renderiza o loop em baixa resolução (precisa de window.AIVJ.renderFrame) e devolve a série de luminância */
  function seriesOf(ci, LF, scale = 0.08) { const out = new Float32Array(LF); for (let n = 0; n < LF; n++) out[n] = frameLum(window.AIVJ.renderFrame(ci, n, scale, false).data); return out; }
  /* SHA-256 em JavaScript puro (crypto.subtle não existe em todo contexto de arquivo local) */
  function sha256(str) {
    const b = new TextEncoder().encode(str), l = b.length, K = [], H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    for (let p = 2, c = 0; c < 64; p++) { let pr = true; for (let d = 2; d * d <= p; d++) if (p % d === 0) { pr = false; break; } if (pr) { K[c++] = Math.floor((Math.pow(p, 1 / 3) % 1) * 4294967296) >>> 0; } }
    const n = (((l + 9) >> 6) + 1) << 6, m = new Uint8Array(n); m.set(b); m[l] = 0x80; const dv = new DataView(m.buffer); dv.setUint32(n - 8, Math.floor(l * 8 / 4294967296)); dv.setUint32(n - 4, (l * 8) >>> 0);
    const w = new Uint32Array(64), rr = (x, k) => (x >>> k) | (x << (32 - k));
    for (let o = 0; o < n; o += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(o + i * 4);
      for (let i = 16; i < 64; i++) { const s0 = rr(w[i - 15], 7) ^ rr(w[i - 15], 18) ^ (w[i - 15] >>> 3), s1 = rr(w[i - 2], 17) ^ rr(w[i - 2], 19) ^ (w[i - 2] >>> 10); w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0; }
      let [a, bb, c, d, e, f, g, h] = H;
      for (let i = 0; i < 64; i++) { const S1 = rr(e, 6) ^ rr(e, 11) ^ rr(e, 25), ch = (e & f) ^ (~e & g), t1 = (h + S1 + ch + K[i] + w[i]) >>> 0, S0 = rr(a, 2) ^ rr(a, 13) ^ rr(a, 22), mj = (a & bb) ^ (a & c) ^ (bb & c), t2 = (S0 + mj) >>> 0; h = g; g = f; f = e; e = (d + t1) >>> 0; d = c; c = bb; bb = a; a = (t1 + t2) >>> 0; }
      H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + bb) >>> 0; H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0; H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0; H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
    }
    return H.map(x => x.toString(16).padStart(8, '0')).join('');
  }
  return { analyze, limit, srgbFactor, frameLum, relLum, seriesOf, sha256, pivots, SWING, DARK, MAX_FLASHES };
})();
