/* Camada "blobs": detecção e marcação de manchas na imagem das camadas ABAIXO dela (como o fx, lê a pilha). Inspirada na ideia do BlobTracking.jl
   (achar regiões, dar um número a cada uma, ligar), com código próprio e sem câmera: a fonte é a própria composição. Quatro modos de achar as manchas:
   brilho (luminância acima do limiar), contraste (borda: gradiente local), cor (matiz perto de um alvo) e zonas (a luminância dividida em N faixas, uma faixa escolhida).
   Função pura do quadro: o mesmo quadro dá as mesmas manchas, os mesmos números e o mesmo desenho; o loop fecha quando a imagem de baixo fecha.
   Os números das manchas são por ordem de área (B01 é a maior): sem estado entre quadros, então não há "identidade" que sobreviva a um salto; o rastro de movimento fica para o fx com histórico.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: references/blob-layer.md */
const BLOBX = (() => {
  const lum = (r, g, b) => 0.299 * r + 0.587 * g + 0.114 * b;
  function hueOf(r, g, b) { const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn; if (d < 1e-6) return [0, 0, mx]; let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4; h = ((h / 6) % 1 + 1) % 1; return [h, d / (mx || 1), mx]; }
  /* d: Uint8ClampedArray RGBA de w por h. o: { mode, thr, hue, tol, zones, zone, minArea, max } -> { mask, blobs } */
  function analyze(d, w, h, o) {
    const mode = o.mode || 'brilho', thr = o.thr != null ? o.thr : 0.5, N = w * h, mask = new Uint8Array(N), L = new Float32Array(N);
    for (let i = 0; i < N; i++) L[i] = d[i * 4 + 3] < 8 ? 0 : lum(d[i * 4], d[i * 4 + 1], d[i * 4 + 2]) / 255;
    if (mode === 'brilho') { for (let i = 0; i < N; i++) mask[i] = L[i] >= thr && d[i * 4 + 3] >= 8 ? 1 : 0; }
    else if (mode === 'contraste') {
      for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) { const i = y * w + x, gx = L[i + 1] - L[i - 1] + 0.5 * (L[i - w + 1] - L[i - w - 1] + L[i + w + 1] - L[i + w - 1]), gy = L[i + w] - L[i - w] + 0.5 * (L[i + w - 1] - L[i - w - 1] + L[i + w + 1] - L[i - w + 1]); mask[i] = Math.sqrt(gx * gx + gy * gy) * 0.5 >= thr * 0.5 ? 1 : 0; }
    } else if (mode === 'cor') {
      const th = (o.hue != null ? o.hue : 0) % 1, tol = o.tol != null ? o.tol : 0.06, smin = o.sat != null ? o.sat : 0.25;
      for (let i = 0; i < N; i++) { if (d[i * 4 + 3] < 8) continue; const [hh, s, v] = hueOf(d[i * 4] / 255, d[i * 4 + 1] / 255, d[i * 4 + 2] / 255); let dh = Math.abs(hh - th); dh = Math.min(dh, 1 - dh); mask[i] = dh <= tol && s >= smin && v >= 0.12 ? 1 : 0; }
    } else if (mode === 'zonas') {
      const Z = Math.max(2, Math.round(o.zones || 4)), zi = Math.max(0, Math.min(Z - 1, Math.round(o.zone != null ? o.zone : Z - 1)));
      for (let i = 0; i < N; i++) { if (d[i * 4 + 3] < 8) continue; const z = Math.min(Z - 1, Math.floor(L[i] * Z)); mask[i] = z === zi ? 1 : 0; }
    }
    /* componentes conexas (4 vizinhos), união-busca */
    const par = new Int32Array(N).fill(-1), find = a => { while (par[a] !== a) { par[a] = par[par[a]]; a = par[a]; } return a; };
    for (let i = 0; i < N; i++) if (mask[i]) { par[i] = i; }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = y * w + x; if (!mask[i]) continue; if (x > 0 && mask[i - 1]) { const a = find(i), b = find(i - 1); if (a !== b) par[a] = b; } if (y > 0 && mask[i - w]) { const a = find(i), b = find(i - w); if (a !== b) par[a] = b; } }
    const map = new Map();
    for (let i = 0; i < N; i++) if (mask[i]) { const r = find(i); let b = map.get(r); if (!b) { b = { n: 0, sx: 0, sy: 0, x0: 1e9, y0: 1e9, x1: -1, y1: -1, root: r, lum: 0 }; map.set(r, b); } const x = i % w, y = (i / w) | 0; b.n++; b.sx += x; b.sy += y; b.lum += L[i]; if (x < b.x0) b.x0 = x; if (x > b.x1) b.x1 = x; if (y < b.y0) b.y0 = y; if (y > b.y1) b.y1 = y; }
    const minA = Math.max(1, Math.round((o.minArea != null ? o.minArea : 0.002) * N)), max = Math.max(1, Math.round(o.max || 12));
    const blobs = [...map.values()].filter(b => b.n >= minA).sort((a, b) => b.n - a.n || a.sy / a.n - b.sy / b.n || a.sx / a.n - b.sx / b.n).slice(0, max)
      .map((b, k) => ({ id: k + 1, area: b.n / N, cx: (b.sx / b.n + 0.5) / w, cy: (b.sy / b.n + 0.5) / h, x0: b.x0 / w, y0: b.y0 / h, x1: (b.x1 + 1) / w, y1: (b.y1 + 1) / h, lum: b.lum / b.n, root: b.root }));
    return { mask, blobs, w, h, find };
  }
  return { analyze, hueOf };
})();
let BLOBCV = null;
reg('blobs', 'Manchas · detectar e marcar (lê as camadas abaixo)', 'gen', [
  S('mode', 'Achar por', 'brilho', ['brilho', 'contraste', 'cor', 'zonas']), N('thr', 'Limiar (brilho e contraste)', 0.55, 0.02, 0.98, 0.01),
  N('hue', 'Cor alvo (matiz 0 a 1)', 0.08, 0, 1, 0.005), N('tol', 'Tolerância da cor', 0.06, 0.01, 0.5, 0.005), N('sat', 'Saturação mínima (cor)', 0.25, 0, 1, 0.01),
  N('zones', 'Zonas (nº de faixas de luminância)', 4, 2, 8, 1), N('zone', 'Zona escolhida (0 = mais escura)', 3, 0, 7, 1),
  N('minArea', 'Área mínima (fração da imagem)', 0.002, 0.0002, 0.2, 0.0002), N('max', 'Máximo de manchas', 12, 1, 64, 1), N('grid', 'Resolução da análise (colunas)', 128, 32, 320, 8),
  B('box', 'Caixas (cantos)', true), B('ids', 'Números e valores', true), B('cross', 'Cruz no centro', true), B('links', 'Linhas entre manchas vizinhas', true), B('fill', 'Preencher a mancha', false),
  N('weight', 'Espessura', 3.5, 0.5, 40, 0.5), N('pad', 'Folga da caixa', 0.01, 0, 0.1, 0.002), C('color', 'Cor', 'primary'), C('hot', 'Cor do destaque', 'accent'),
], (c, R) => {
  const { p, F, comp, W, H, below, u } = R; if (!below) return;
  const gw = Math.max(16, Math.round(p.grid)), gh = Math.max(9, Math.round(gw * below.height / below.width));
  if (!BLOBCV || BLOBCV.width !== gw || BLOBCV.height !== gh) { BLOBCV = document.createElement('canvas'); BLOBCV.width = gw; BLOBCV.height = gh; }
  const bx = BLOBCV.getContext('2d', { willReadFrequently: true }); bx.setTransform(1, 0, 0, 1, 0, 0); bx.clearRect(0, 0, gw, gh); bx.imageSmoothingEnabled = true; bx.drawImage(below, 0, 0, gw, gh);
  const im = bx.getImageData(0, 0, gw, gh), r = BLOBX.analyze(im.data, gw, gh, p), A = col(comp, p.color), Hc = col(comp, p.hot), lw = p.weight * u;
  if (!r.blobs.length) return;
  if (p.fill) { const hot = hexRgb(Hc), cvs = document.createElement('canvas'); cvs.width = gw; cvs.height = gh; const cx = cvs.getContext('2d'), out = cx.createImageData(gw, gh), keep = new Set(r.blobs.map(b => b.root));
    for (let i = 0; i < gw * gh; i++) if (r.mask[i] && keep.has(r.find(i))) { const o = i * 4; out.data[o] = hot[0]; out.data[o + 1] = hot[1]; out.data[o + 2] = hot[2]; out.data[o + 3] = 110; }
    cx.putImageData(out, 0, 0); c.imageSmoothingEnabled = false; c.drawImage(cvs, 0, 0, W, H); c.imageSmoothingEnabled = true; }
  c.lineWidth = lw; c.lineCap = 'square'; c.strokeStyle = A; c.fillStyle = A;
  if (p.links) { c.globalAlpha = 0.55; c.beginPath(); r.blobs.forEach((b, i) => { let best = -1, bd = 1e9; r.blobs.forEach((o, j) => { if (j === i) return; const d = (o.cx - b.cx) ** 2 + (o.cy - b.cy) ** 2; if (d < bd) { bd = d; best = j; } }); if (best >= 0) { c.moveTo(b.cx * W, b.cy * H); c.lineTo(r.blobs[best].cx * W, r.blobs[best].cy * H); } }); c.stroke(); c.globalAlpha = 1; }
  const fs = Math.max(11, Math.min(W, H) * 0.03);
  r.blobs.forEach((b, i) => {
    const pad = p.pad * Math.min(W, H), x0 = b.x0 * W - pad, y0 = b.y0 * H - pad, x1 = b.x1 * W + pad, y1 = b.y1 * H + pad, ck = Math.min(x1 - x0, y1 - y0) * 0.22, hot = i === 0;
    c.strokeStyle = hot ? Hc : A; c.fillStyle = hot ? Hc : A;
    if (p.box) { c.beginPath(); for (const [x, y, sx, sy] of [[x0, y0, 1, 1], [x1, y0, -1, 1], [x0, y1, 1, -1], [x1, y1, -1, -1]]) { c.moveTo(x + sx * ck, y); c.lineTo(x, y); c.lineTo(x, y + sy * ck); } c.stroke(); }
    if (p.cross) { const m = Math.min(x1 - x0, y1 - y0) * 0.12 + lw * 3; c.beginPath(); c.moveTo(b.cx * W - m, b.cy * H); c.lineTo(b.cx * W + m, b.cy * H); c.moveTo(b.cx * W, b.cy * H - m); c.lineTo(b.cx * W, b.cy * H + m); c.stroke(); }
    if (p.ids) { c.font = `700 ${fs}px ${fam('mono') || 'monospace'}`; c.textBaseline = 'bottom'; c.fillText(`B${String(b.id).padStart(2, '0')}  ${(b.area * 100).toFixed(1)}%`, x0, y0 - lw); c.textBaseline = 'alphabetic'; }
  });
});
