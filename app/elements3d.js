/* Elementos 3D: objetos em nuvem de pontos com projetor próprio (sem biblioteca 3D) e render em pontos, linhas ou plexus, com glow.
   Cinco tipos: botanic (flor, folhagem), molecule (DNA, molécula), sigil (astrológico, alquímico, magick), terrain (voo rasante) e
   monument (torre, zigurate, corredor, corpo, globo, anel e toro: sólidos de caixas, esfera e toro com pontos amostrados nas faces).
   Cada forma devolve { P: [[x, y, z]], E: [[i, j]], H: [índices em acento], T: [[i, rótulo, acento]] } em espaço unitário (raio ~1).
   Tempo só entra por múltiplos inteiros de ph = TAU · fase do loop · ciclos inteiros: o loop fecha sem emenda. Sem relógio, sem acaso (hr).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores ELEMENTS3D. Mesmo escopo do motor (IIFE): sem import/export. */
const E3C = {};
const e3c = (key, f) => E3C[key] || (E3C[key] = f());
const g3 = () => ({ P: [], E: [], H: [], T: [] });
function g3Poly(g, pts, closed, hot) {
  const o = g.P.length;
  pts.forEach((p, i) => { g.P.push(p); if (i) g.E.push([o + i - 1, o + i]); if (hot) g.H.push(o + i); });
  if (closed && pts.length > 2) g.E.push([o + pts.length - 1, o]);
  return o;
}
function g3Line(g, a, b, n, hot) { const pts = []; for (let i = 0; i <= n; i++) { const q = i / n; pts.push([a[0] + (b[0] - a[0]) * q, a[1] + (b[1] - a[1]) * q, a[2] + (b[2] - a[2]) * q]); } return g3Poly(g, pts, false, hot); }
function g3Circ(g, n, f, hot) { const pts = []; for (let i = 0; i < n; i++) { const a = i / n * TAU; pts.push(f(Math.cos(a), Math.sin(a))); } return g3Poly(g, pts, true, hot); }
function g3Fib(g, c, r, n, hot) { const o = g.P.length; for (let i = 0; i < n; i++) { const y = 1 - 2 * (i + 0.5) / n, rr = Math.sqrt(1 - y * y), a = i * GA; g.P.push([c[0] + Math.cos(a) * rr * r, c[1] + y * r, c[2] + Math.sin(a) * rr * r]); if (hot) g.H.push(o + i); } }
function g3Fit(g) { let m = 1e-6; g.P.forEach(p => { m = Math.max(m, Math.abs(p[0]), Math.abs(p[1]), Math.abs(p[2])); }); g.P = g.P.map(p => [p[0] / m, p[1] / m, p[2] / m]); return g; }
const nS = (n, d) => Math.max(2, Math.round(n * d));

/* ---------- kit sólido: caixas, esfera, toro e pontos amostrados nas faces ---------- */
function tfBox(w, h, d, ox = 0, oy = 0, oz = 0) {
  const v = []; for (const z of [-d / 2, d / 2]) for (const y of [-h / 2, h / 2]) for (const x of [-w / 2, w / 2]) v.push([x + ox, y + oy, z + oz]);
  return { v, e: [[0, 1], [1, 3], [3, 2], [2, 0], [4, 5], [5, 7], [7, 6], [6, 4], [0, 4], [1, 5], [2, 6], [3, 7]], f: [[0, 1, 3, 2], [5, 4, 6, 7], [4, 0, 2, 6], [1, 5, 7, 3], [2, 3, 7, 6], [4, 5, 1, 0]] };
}
function tfMerge(...q) { const v = [], e = [], f = []; q.forEach(s => { const o = v.length; v.push(...s.v); s.e.forEach(x => e.push([x[0] + o, x[1] + o])); s.f.forEach(x => f.push(x.map(i => i + o))); }); return { v, e, f }; }
function tfSphere(r, seg, ring) {
  const v = [], e = [], f = [], id = (i, j) => i * seg + ((j % seg + seg) % seg);
  for (let i = 0; i <= ring; i++) { const p = Math.PI * i / ring; for (let j = 0; j < seg; j++) { const a = TAU * j / seg; v.push([r * Math.sin(p) * Math.cos(a), r * Math.cos(p), r * Math.sin(p) * Math.sin(a)]); } }
  for (let i = 0; i <= ring; i++) for (let j = 0; j < seg; j++) { if (i < ring) e.push([id(i, j), id(i + 1, j)]); e.push([id(i, j), id(i, j + 1)]); }
  for (let i = 0; i < ring; i++) for (let j = 0; j < seg; j++) f.push([id(i, j), id(i, j + 1), id(i + 1, j + 1), id(i + 1, j)]);
  return { v, e, f };
}
function tfTorus(R, r, seg, ring) {
  const v = [], e = [], f = [], id = (i, j) => ((i % seg) + seg) % seg * ring + ((j % ring) + ring) % ring;
  for (let i = 0; i < seg; i++) { const a = TAU * i / seg; for (let j = 0; j < ring; j++) { const b = TAU * j / ring; v.push([(R + r * Math.cos(b)) * Math.cos(a), r * Math.sin(b), (R + r * Math.cos(b)) * Math.sin(a)]); } }
  for (let i = 0; i < seg; i++) for (let j = 0; j < ring; j++) { e.push([id(i, j), id(i + 1, j)]); e.push([id(i, j), id(i, j + 1)]); f.push([id(i, j), id(i + 1, j), id(i + 1, j + 1), id(i, j + 1)]); }
  return { v, e, f };
}
const MONUMENT = {
  torre: () => { const p = [tfBox(1.05, 3.3, 1.05, 0, 0.2, 0), tfBox(1.5, 0.34, 1.5, 0, -1.62, 0), tfBox(0.62, 0.5, 0.62, 0, 2.1, 0)]; for (let i = 0; i < 4; i++) p.push(tfBox(1.28, 0.1, 0.16, 0, -0.9 + i * 0.72, 0.6)); return tfMerge(...p); },
  zigurate: () => { const p = []; for (let i = 0; i < 6; i++) { const s = 2.5 - i * 0.38; p.push(tfBox(s, 0.34, s, 0, -1.4 + i * 0.36, 0)); } p.push(tfBox(0.16, 0.3, 0.16, 0, 0.95, 0)); return tfMerge(...p); },
  corredor: () => { const p = []; for (let r = 0; r < 9; r++) { const z = -2.6 + r * 0.72; p.push(tfBox(0.42, 1.7, 0.5, -1.15, 0, z), tfBox(0.42, 1.7, 0.5, 1.15, 0, z)); } p.push(tfBox(3.6, 0.06, 7.2, 0, -0.92, -0.2), tfBox(3.6, 0.06, 7.2, 0, 0.92, -0.2)); return tfMerge(...p); },
  corpo: () => tfMerge(tfBox(0.46, 0.5, 0.42, 0, 1.28, 0), tfBox(0.2, 0.2, 0.2, 0, 0.94, 0), tfBox(0.92, 1.16, 0.44, 0, 0.22, 0), tfBox(0.74, 0.42, 0.4, 0, -0.5, 0),
    tfBox(0.24, 1.02, 0.24, -0.62, 0.2, 0), tfBox(0.24, 1.02, 0.24, 0.62, 0.2, 0), tfBox(0.2, 0.26, 0.3, -0.62, -0.42, 0.04), tfBox(0.2, 0.26, 0.3, 0.62, -0.42, 0.04),
    tfBox(0.34, 1.24, 0.34, -0.24, -1.32, 0), tfBox(0.34, 1.24, 0.34, 0.24, -1.32, 0), tfBox(0.32, 0.16, 0.6, -0.24, -2.02, 0.12), tfBox(0.32, 0.16, 0.6, 0.24, -2.02, 0.12)),
  globo: () => tfSphere(1.55, 28, 14),
  anel: () => tfTorus(1.5, 0.42, 30, 12),
  toro: () => tfTorus(0.72, 0.3, 36, 18)
};
function monument(kind, d, sd) {
  return e3c('mon|' + kind + '|' + d + '|' + sd, () => {
    const geo = (MONUMENT[kind] || MONUMENT.torre)(), V = geo.v, g = g3(), n = Math.round(clamp(1100 * d, 200, 6000));
    const ar = geo.f.map(q => { const a = V[q[0]], b = V[q[1]], c = V[q[2]], ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2], wx = c[0] - a[0], wy = c[1] - a[1], wz = c[2] - a[2]; return Math.hypot(uy * wz - uz * wy, uz * wx - ux * wz, ux * wy - uy * wx); });
    const tot = ar.reduce((s, x) => s + x, 0) || 1;
    V.forEach(p => g.P.push(p.slice())); geo.e.forEach(e => g.E.push(e.slice()));
    geo.f.forEach((q, qi) => {
      const cnt = Math.max(1, Math.round(n * ar[qi] / tot)), a = V[q[0]], b = V[q[1]], dd = V[q[3]];
      for (let i = 0; i < cnt; i++) { const s = hr(qi, i, 61 + sd), t = hr(qi, i, 97 + sd); g.P.push([0, 1, 2].map(j => a[j] + (b[j] - a[j]) * s + (dd[j] - a[j]) * t)); }
    });
    if (V.length < 200) for (let i = 0; i < V.length; i++) g.H.push(i);   /* quinas das caixas em acento (pontos); esfera e toros não têm quina */
    g.hotEdges = false;   /* em linhas as arestas ficam na cor: toda aresta liga duas quinas */
    return g3Fit(g);
  });
}

/* ---------- botânica ---------- */
function flower(ph, d, sd) {
  const g = g3(), br = 0.5 + 0.5 * Math.sin(ph), nu = nS(16, d), nv = Math.max(2, Math.round(6 * d));
  [[5, 0.52, 0.62], [8, 0.78, 0.34], [13, 1, 0.12]].forEach(([n, len, cup], li) => {
    const op = cup * (1 - 0.4 * br);
    for (let q = 0; q < n; q++) {
      const a0 = q / n * TAU + li * 0.37 + hr(q, li, 11 + sd) * 0.08, wd = Math.PI / n * 0.92, o = g.P.length, row = 2 * nv + 1;
      for (let a = 0; a <= nu; a++) { const t = a / nu; for (let b = -nv; b <= nv; b++) { const v = b / nv, an = a0 + v * wd * Math.sin(Math.PI * Math.min(1, t * 1.15)), r = len * t; g.P.push([r * Math.cos(an), op * t * t * 1.15 - 0.15 + 0.06 * v * v * t, r * Math.sin(an)]); } }
      for (let a = 0; a <= nu; a++) for (let b = 0; b < row; b++) { const i = o + a * row + b; if (a < nu) g.E.push([i, i + row]); if (b < row - 1 && (a === nu || a === Math.round(nu / 2))) g.E.push([i, i + 1]); }
    }
  });
  const c = g.P.length, M = nS(150, d);
  for (let i = 0; i < M; i++) { const r = 0.2 * Math.sqrt((i + 0.5) / M), a = i * GA; g.P.push([r * Math.cos(a), -0.05 + 0.1 * (1 - r / 0.2) + 0.02 * Math.sin(2 * ph + i * 0.3), r * Math.sin(a)]); g.H.push(c + i); if (i >= 8) g.E.push([c + i, c + i - 8]); }
  return g;
}
function fern(ph, d, sd) {
  const g = g3(), K = nS(16, d), m = nS(12, d);
  [0, 2.1, 4.2].forEach((rot0, fi) => {
    const rot = rot0 + hr(fi, 3, 13 + sd) * 0.4, sc = 1 - fi * 0.12, cr = Math.cos(rot), sr = Math.sin(rot), sw = 0.12 * Math.sin(ph + fi * 2.1);
    const W = p => [(p[0] * cr + p[2] * sr) * sc, p[1] * sc - 0.08 * fi, (-p[0] * sr + p[2] * cr) * sc];
    const spine = s => [0.08 * Math.sin(ph + s * 3 + fi), -1 + 1.9 * s, (0.75 + sw) * s * s], rach = [];
    const nr = nS(48, d); for (let i = 0; i <= nr; i++) rach.push(W(spine(i / nr)));
    g3Poly(g, rach);
    for (let k = 0; k < K; k++) {
      const s = 0.1 + 0.86 * k / K, b = spine(s), Lk = 0.8 * Math.pow(Math.sin(Math.PI * Math.min(1, (1 - s) * 1.05)), 0.8) * (0.45 + 0.55 * (1 - s));
      [-1, 1].forEach(side => {
        const pin = [];
        for (let j = 0; j <= m; j++) {
          const t = j / m, p = [b[0] + side * Lk * t, b[1] + Lk * 0.28 * t - 0.18 * Lk * t * t, b[2] + 0.12 * Lk * t + 0.04 * Math.sin(ph + k * 0.7 + t * 2)];
          pin.push(W(p));
          if (j && j < m) { const l = 0.26 * Lk * (1 - t * 0.7); g3Line(g, W(p), W([p[0] + side * l * 0.35, p[1] + l * 0.25, p[2] + l]), nS(4, d)); }
        }
        g3Poly(g, pin); if (k % 4 === 0) g.H.push(g.P.length - 1);
      });
    }
  });
  return g;
}

/* ---------- molecular ---------- */
function helix(ph, d, sd) {
  const g = g3(), ns = nS(180, d), turns = 2.4, len = 2.1, A = [], B = [], R0 = 0.42;
  for (let i = 0; i < ns; i++) {
    const t = i / (ns - 1), y = -len / 2 + len * t, a = t * turns * TAU, r = R0 * (1 + 0.05 * Math.sin(2 * ph + y * 3));
    A.push([r * Math.cos(a), y, r * Math.sin(a)]); B.push([r * Math.cos(a + Math.PI * 0.78), y, r * Math.sin(a + Math.PI * 0.78)]);
  }
  g3Poly(g, A); g3Poly(g, B);
  const nr = Math.round(turns * 10), h = nS(6, d);
  for (let k = 0; k < nr; k++) {
    const i = Math.round((k + 0.5) / nr * (ns - 1)), hot = hr(k, 5, 17 + sd) > 0.5, mid = [(A[i][0] + B[i][0]) / 2, A[i][1], (A[i][2] + B[i][2]) / 2];
    g3Line(g, A[i], mid, h, hot); g3Line(g, mid, B[i], h, !hot);   /* par de bases: metade em acento, metade na cor */
  }
  return g;
}
function moleculeTopo(d, sd) {
  return e3c('mol|' + d + '|' + sd, () => {
    const n = Math.round(clamp(10 * d, 6, 30)), at = [[0, 0, 0]], bd = [];
    for (let k = 1; k < n; k++) {
      let got = null;
      for (let tr = 0; tr < 12 && !got; tr++) {
        const par = k < 3 ? k - 1 : (hr(k, tr, 23 + sd) < 0.7 ? k - 1 : Math.floor(hr(k, tr, 29 + sd) * k)), z = 2 * hr(k, tr, 31 + sd) - 1, a = TAU * hr(k, tr, 37 + sd), rr = Math.sqrt(1 - z * z);
        const p = [at[par][0] + rr * Math.cos(a) * 0.5, at[par][1] + z * 0.5, at[par][2] + rr * Math.sin(a) * 0.5];
        if (at.every(q => Math.hypot(q[0] - p[0], q[1] - p[1], q[2] - p[2]) > 0.4)) got = { p, par };
      }
      if (!got) break;
      at.push(got.p); bd.push([got.par, at.length - 1]);
    }
    const c = [0, 1, 2].map(j => at.reduce((s, p) => s + p[j], 0) / at.length); let m = 1e-6;
    at.forEach(p => { for (let j = 0; j < 3; j++) { p[j] -= c[j]; m = Math.max(m, Math.abs(p[j])); } });
    at.forEach(p => { for (let j = 0; j < 3; j++) p[j] *= 0.8 / m; });
    return { at, bd, ty: at.map((p, i) => hr(i, 7, 41 + sd)), k: 0.8 / m };
  });
}
function molecule(ph, d, sd) {
  const T = moleculeTopo(d, sd), g = g3(), pos = T.at.map((p, i) => [p[0] + 0.015 * Math.sin(2 * ph + i), p[1] + 0.015 * Math.cos(2 * ph + i * 1.3), p[2]]);
  T.bd.forEach(([a, b]) => g3Line(g, pos[a], pos[b], nS(8, d)));
  pos.forEach((p, i) => {
    const ty = T.ty[i], r = (ty > 0.75 ? 0.2 : ty > 0.4 ? 0.15 : 0.11) * T.k * 1.4, hot = ty > 0.75, nr = nS(18, d);   /* átomo maior = heteroátomo, em acento */
    g3Fib(g, p, r, nS(40 * r / 0.12, d), hot);
    g3Circ(g, nr, (c, s) => [p[0] + c * r, p[1] + s * r, p[2]], hot); g3Circ(g, nr, (c, s) => [p[0] + c * r, p[1], p[2] + s * r], hot);
  });
  return g;
}

/* ---------- símbolos ---------- */
function armillary(ph, d, sd) {
  const g = g3(), nr = nS(72, d), e = 23.44 * Math.PI / 180, se = Math.sin(e), ce = Math.cos(e);
  g3Circ(g, nr, (c, s) => [c, 0, s]); g3Circ(g, nr, (c, s) => [c, s * se, s * ce], true); g3Circ(g, nr, (c, s) => [c, s, 0]); g3Circ(g, nr, (c, s) => [0, s, c]);
  g3Circ(g, nS(66, d), (c, s) => [c * ce, se, s * ce]); g3Circ(g, nS(66, d), (c, s) => [c * ce, -se, s * ce]); g3Line(g, [0, -1.18, 0], [0, 1.18, 0], nS(12, d));
  const ec = (a, r) => [Math.cos(a) * r, Math.sin(a) * se * r, Math.sin(a) * ce * r], Z = '♈♉♊♋♌♍♎♏♐♑♒♓';
  for (let k = 0; k < 12; k++) { const a = k / 12 * TAU; g3Line(g, ec(a, 1), ec(a, 1.1), 3); g.P.push(ec(a + TAU / 24, 1.24)); g.T.push([g.P.length - 1, Z[k] + '︎', false]); }
  '☉☽☿♀♂♃♄'.split('').forEach((pl, i) => {
    const sp = [1, 3, 2, 1, 2, 1, 1][i], a = ph * sp * (i % 2 ? -1 : 1) + hr(i, 9, 43 + sd) * TAU, r = 0.3 + 0.09 * i;
    g3Circ(g, Math.max(12, Math.round(nr * r * 0.5)), (c, s) => [c * r, s * r * se, s * r * ce]);
    g.P.push(ec(a, r)); g.H.push(g.P.length - 1); g.T.push([g.P.length - 1, pl + '︎', true]);
  });
  g3Fib(g, [0, 0, 0], 0.12, nS(60, d));
  return g;
}
function alchemy(ph, d) {
  const g = g3(), ln = (a, b, z, hot) => g3Line(g, [a[0], a[1], z], [b[0], b[1], z], Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 22 * d)), hot);
  g3Circ(g, nS(120, d), (c, s) => [c, s, -0.36]);
  const tri = [90, 210, 330].map(a => [Math.cos(a * Math.PI / 180), Math.sin(a * Math.PI / 180)]); tri.forEach((p, i) => ln(p, tri[(i + 1) % 3], -0.12));
  const s2 = 0.402, sq = [[-s2, -0.5], [s2, -0.5], [s2, 0.304], [-s2, 0.304]]; sq.forEach((p, i) => ln(p, sq[(i + 1) % 4], 0.12));   /* quadrado inscrito no triângulo de raio 1 */
  g3Circ(g, nS(64, d), (c, s) => [c * s2, s * s2 - 0.098, 0.36], true); g3Circ(g, 12, (c, s) => [c * 0.05, s * 0.05 - 0.098, 0.36], true);
  ['FOGO', 'ÁGUA', 'AR', 'TERRA'].forEach((nm, k) => {
    const up = k === 0 || k === 2, f = k * TAU / 4, cx = Math.cos(f) * 1.3, cz = Math.sin(f) * 1.3, tx = -Math.sin(f), tz = Math.cos(f), r = 0.22, sp = 2 * ph * (k % 2 ? -1 : 1), cs = Math.cos(sp), sn = Math.sin(sp);
    const L = (x, y) => { const x2 = x * cs - y * sn, y2 = x * sn + y * cs; return [cx + tx * x2, y2, cz + tz * x2]; };
    const v = [90, 210, 330].map(a => { const A = (up ? a : a + 180) * Math.PI / 180; return L(Math.cos(A) * r, Math.sin(A) * r); });
    v.forEach((p, i) => g3Line(g, p, v[(i + 1) % 3], nS(8, d), k === 0));
    if (k >= 2) g3Line(g, L(-r * 0.62, 0), L(r * 0.62, 0), nS(6, d));   /* ar e terra: triângulo cortado */
    g.P.push([cx, -0.42, cz]); g.T.push([g.P.length - 1, nm, false]);
  });
  return g;
}
function magick(ph, d) {
  const g = g3(), seg = (a, b) => g3Line(g, a, b, Math.max(4, Math.round(Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]) * 20 * d)));
  g3Circ(g, nS(140, d), (c, s) => [c, s, 0.05]); g3Circ(g, nS(130, d), (c, s) => [c * 0.9, s * 0.9, -0.05]);
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU; seg([Math.cos(a) * 0.9, Math.sin(a) * 0.9, 0], [Math.cos(a) * 1.08, Math.sin(a) * 1.08, 0]); }
  const hv = []; for (let k = 0; k < 7; k++) { const a = k / 7 * TAU - ph + Math.PI / 2; hv.push([Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0]); }
  hv.forEach((p, k) => seg(p, hv[(k + 3) % 7])); hv.forEach(p => { g.P.push(p); g.H.push(g.P.length - 1); });   /* heptagrama {7/3} */
  const pv = []; for (let k = 0; k < 5; k++) { const a = k / 5 * TAU + 2 * ph; pv.push([0, Math.sin(a) * 0.6, Math.cos(a) * 0.6]); }
  pv.forEach((p, k) => seg(p, pv[(k + 2) % 5])); pv.forEach(p => { g.P.push(p); g.H.push(g.P.length - 1); });   /* pentagrama {5/2} no plano perpendicular */
  g3Circ(g, nS(60, d), (c, s) => [c * 0.3, 0, s * 0.3], true);
  return g;
}

/* ---------- terreno: relevo periódico na direção do voo (o quadro do fim do loop é o do começo) ---------- */
function terrain(ph, d, sd, relief) {
  const g = g3(), G = Math.round(clamp(28 * Math.sqrt(d), 12, 80)), q = (((ph / TAU) % 1) + 1) % 1, o = sd * 37;
  const n = (a, b) => vn(a * 2.6 + o, b * 5.5) * 0.65 + vn(a * 6 + o + 13, b * 11) * 0.35, Hf = (x, s) => n(x, s) * (1 - s) + n(x, s - 1) * s;
  for (let j = 0; j < G; j++) for (let i = 0; i < G; i++) {
    const x = -1.15 + 2.3 * i / (G - 1), z = -1.15 + 2.3 * j / (G - 1), s = ((j / G + q) % 1 + 1) % 1, y = (Hf(x, s) - 0.45) * 1.05 * relief - 0.1, k = j * G + i;
    g.P.push([x, y, z]); if (i) g.E.push([k - 1, k]); if (j) g.E.push([k - G, k]); if (y > 0.2 * relief) g.H.push(k);
  }
  return g;
}

/* ---------- projetor e render (compartilhado; o organismo usa as mesmas funções de linhas, plexus e glow) ---------- */
const E3NB = 6;
const e3bin = z => Math.min(E3NB - 1, Math.floor(clamp((z + 1.1) / 2.2, 0, 0.999) * E3NB));
const e3alpha = b => 0.2 + 0.8 * (b + 0.5) / E3NB;
function e3Project(P, view) {
  const n = P.length, X = new Float32Array(n), Y = new Float32Array(n), Z = new Float32Array(n), K = new Float32Array(n);
  const cy = Math.cos(view.yaw), sy = Math.sin(view.yaw), cx = Math.cos(view.tx), sx = Math.sin(view.tx), cz = Math.cos(view.ty), sz = Math.sin(view.ty), CAM = 3.4;
  for (let i = 0; i < n; i++) {
    const p = P[i], x1 = p[0] * cy + p[2] * sy, z1 = -p[0] * sy + p[2] * cy;
    const y2 = p[1] * cx - z1 * sx, z2 = p[1] * sx + z1 * cx, x3 = x1 * cz - z2 * sz, z3 = x1 * sz + z2 * cz, k = CAM / (CAM - z3);
    X[i] = view.ox + x3 * k * view.r; Y[i] = view.oy - y2 * k * view.r; Z[i] = z3; K[i] = k;
  }
  return { X, Y, Z, K, n };
}
function e3Dots(c, Q, ids, sz, color, hot, want) {
  const paths = []; for (let b = 0; b < E3NB; b++) paths.push(new Path2D());
  for (const i of ids) { if (want !== undefined && !!hot[i] !== want) continue; const s = Math.max(0.6, sz * Q.K[i] * (hot[i] ? 1.7 : 1)); paths[e3bin(Q.Z[i])].rect(Q.X[i] - s / 2, Q.Y[i] - s / 2, s, s); }
  const a0 = c.globalAlpha; c.fillStyle = color; paths.forEach((p, b) => { c.globalAlpha = a0 * e3alpha(b); c.fill(p); }); c.globalAlpha = a0;
}
function e3Lines(c, Q, E, hot, lw, color, hotColor, hotEdges = true) {
  const paths = [], hp = new Path2D(); for (let b = 0; b < E3NB; b++) paths.push(new Path2D());
  for (const [a, b] of E) { if (a >= Q.n || b >= Q.n) continue; const p = hotEdges && hot[a] && hot[b] ? hp : paths[e3bin((Q.Z[a] + Q.Z[b]) / 2)]; p.moveTo(Q.X[a], Q.Y[a]); p.lineTo(Q.X[b], Q.Y[b]); }
  const a0 = c.globalAlpha; c.lineWidth = lw; c.strokeStyle = color; paths.forEach((p, b) => { c.globalAlpha = a0 * e3alpha(b); c.stroke(p); });
  c.globalAlpha = a0; c.strokeStyle = hotColor; c.lineWidth = lw * 1.5; c.stroke(hp);
}
/* plexus: liga pares de pontos mais próximos que o raio (no espaço 3D, então a malha não depende do ângulo de câmera); até ~260 pontos */
function e3Plexus(c, Q, P, hot, reach, lw, dot, color, hotColor) {
  const st = Math.max(1, Math.ceil(Q.n / 260)), sub = [];
  for (let i = 0; i < Q.n; i += st) sub.push(i);
  for (let i = 0; i < Q.n; i++) if (hot[i] && i % st) sub.push(i);
  const NA = 4, paths = []; for (let b = 0; b < NA; b++) paths.push(new Path2D());
  const r2 = reach * reach;
  for (let a = 0; a < sub.length; a++) {
    const i = sub[a], p = P[i];
    for (let b = a + 1; b < sub.length; b++) {
      const j = sub[b], q = P[j], dx = p[0] - q[0], dy = p[1] - q[1], dz = p[2] - q[2], dd = dx * dx + dy * dy + dz * dz;
      if (dd >= r2) continue;
      const v = (1 - Math.sqrt(dd) / reach) * (0.35 + 0.65 * clamp(((Q.Z[i] + Q.Z[j]) / 2 + 1.1) / 2.2, 0, 1)), pt = paths[Math.min(NA - 1, Math.floor(v * NA))];
      pt.moveTo(Q.X[i], Q.Y[i]); pt.lineTo(Q.X[j], Q.Y[j]);
    }
  }
  const a0 = c.globalAlpha; c.lineWidth = lw * 0.8; c.strokeStyle = color; paths.forEach((p, b) => { c.globalAlpha = a0 * (0.12 + 0.88 * (b + 0.5) / NA); c.stroke(p); }); c.globalAlpha = a0;
  e3Dots(c, Q, sub, dot, color, hot, false); e3Dots(c, Q, sub, dot, hotColor, hot, true);
}
/* glow: a camada já desenhada é reduzida em meias escalas (blur igual em qualquer navegador, sem ctx.filter) e somada; em fundo claro o halo vai por baixo */
const E3GLOW = [];
function e3Glow(c, comp, amt) {
  const cv = c.canvas, w = cv.width, h = cv.height; if (!(amt > 0) || w < 8 || h < 8) return;
  let src = cv, lw = w, lh = h;
  for (let i = 0; i < 5; i++) {
    lw = Math.max(1, Math.round(lw / 2)); lh = Math.max(1, Math.round(lh / 2));
    const b = E3GLOW[i] || (E3GLOW[i] = document.createElement('canvas')); if (b.width !== lw || b.height !== lh) { b.width = lw; b.height = lh; }
    const x = b.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.filter = 'none'; x.clearRect(0, 0, lw, lh); x.imageSmoothingEnabled = true; x.drawImage(src, 0, 0, lw, lh);
    src = b;
  }
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.filter = 'none'; c.imageSmoothingEnabled = true; c.globalCompositeOperation = lum(col(comp, 'bg')) < 0.5 ? 'lighter' : 'destination-over';
  [[4, 1.2], [2, 1], [0, 0.7]].forEach(([i, k]) => { c.globalAlpha = clamp(amt * k, 0, 1); c.drawImage(E3GLOW[i], 0, 0, w, h); });
  c.restore();
}
function e3Labels(c, Q, T, fs, mu, ac) {
  c.textAlign = 'center'; c.textBaseline = 'middle'; const a0 = c.globalAlpha;
  T.forEach(([i, txt, hot]) => {
    if (i >= Q.n) return; const f = fs * (txt.length < 3 ? 1.6 : 0.9) * Q.K[i];
    c.font = `400 ${f}px ${FONTS.mono},"Segoe UI Symbol","Noto Sans Symbols 2","Apple Symbols",serif`; c.globalAlpha = a0 * e3alpha(e3bin(Q.Z[i])); c.fillStyle = hot ? ac : mu; c.fillText(txt, Q.X[i] + (hot ? f * 0.9 : 0), Q.Y[i]);
  });
  c.globalAlpha = a0; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
}
function e3View(p, F, W, H, u, extra = {}) {
  return { yaw: TAU * F.lph * cyc(F, p.spin) * (extra.spin ?? 1) + (extra.yaw || 0), tx: ((p.tiltX ?? 20) + (extra.tilt || 0)) * Math.PI / 180, ty: (p.tiltY || 0) * Math.PI / 180, ox: p.cx * W, oy: p.cy * H, r: u * 380 * p.size };
}
function e3Draw(c, R, g, extra) {
  const { p, F, comp, W, H, u } = R;
  if (!g.P.length) return;
  const Q = e3Project(g.P, e3View(p, F, W, H, u, extra)), hot = new Uint8Array(Q.n), ink = col(comp, p.color), ac = col(comp, p.hot), dot = 2.2 * u * p.dot * (1 + 0.25 * (F.pulse || 0)), lw = Math.max(0.5, u * p.weight);
  g.H.forEach(i => { if (i < Q.n) hot[i] = 1; });
  const all = []; for (let i = 0; i < Q.n; i++) all.push(i);
  if (p.render === 'lines') { e3Lines(c, Q, g.E, hot, lw, ink, ac, g.hotEdges !== false); e3Dots(c, Q, all.filter(i => hot[i]), dot * 0.8, ac, hot); }
  else if (p.render === 'plexus') e3Plexus(c, Q, g.P, hot, p.reach, lw, dot * 1.4, ink, ac);
  else { e3Dots(c, Q, all, dot, ink, hot, false); e3Dots(c, Q, all, dot, ac, hot, true); }
  if (p.labels && g.T.length) e3Labels(c, Q, g.T, 22 * u, col(comp, 'secondary'), ac);
  e3Glow(c, comp, p.glow);
}
const E3_RENDER = ['points', 'lines', 'plexus'];
const E3_COMMON = () => [
  S('render', 'Render', 'points', E3_RENDER), N('glow', 'Glow', 0, 0, 1), N('reach', 'Raio do plexus', 0.25, 0.05, 0.6),
  N('cx', 'Centro X', 0.5, 0, 1), N('cy', 'Centro Y', 0.5, 0, 1), N('size', 'Tamanho', 1, 0.1, 4), N('density', 'Densidade', 1, 0.2, 4), N('dot', 'Ponto', 1, 0.2, 5), N('weight', 'Traço', 1, 0.2, 8, 0.1),
  N('spin', 'Giro (ciclos/loop)', 1, 0, 6, 1), N('cycles', 'Ciclos por loop', 1, 0, 8, 1), N('tiltX', 'Inclinação X °', 20, -90, 90, 0.1), N('tiltY', 'Inclinação Y °', 0, -90, 90, 0.1),
  N('seed', 'Semente', 1, 1, 99, 1), C('color', 'Cor', 'primary'), C('hot', 'Cor do acento', 'accent')
];
const e3ph = (F, p) => TAU * F.lph * cyc(F, p.cycles);
const e3d = p => Math.round(clamp(p.density * ST.dens, 0.1, 4) * 20) / 20;

reg('botanic', 'Botânica · flor e folhagem 3D', 'gen', [S('kind', 'Forma', 'flor', ['flor', 'folhagem']), ...E3_COMMON()], (c, R) => {
  const { p, F } = R, ph = e3ph(F, p), d = e3d(p);
  e3Draw(c, R, p.kind === 'folhagem' ? fern(ph, d, p.seed) : flower(ph, d, p.seed), p.kind === 'folhagem' ? {} : { tilt: 28 });
});
reg('molecule', 'Molecular · DNA e molécula', 'gen', [S('kind', 'Forma', 'dna', ['dna', 'molecula']), ...E3_COMMON()], (c, R) => {
  const { p, F } = R, ph = e3ph(F, p), d = e3d(p);
  e3Draw(c, R, p.kind === 'molecula' ? molecule(ph, d, p.seed) : helix(ph, d, p.seed));
});
reg('sigil', 'Símbolos 3D · astrológico, alquímico, magick', 'gen', [S('kind', 'Forma', 'astrologico', ['astrologico', 'alquimico', 'magick']), B('labels', 'Rótulos', true), ...E3_COMMON()], (c, R) => {
  const { p, F } = R, ph = e3ph(F, p), d = e3d(p);
  e3Draw(c, R, p.kind === 'alquimico' ? alchemy(ph, d) : p.kind === 'magick' ? magick(ph, d) : armillary(ph, d, p.seed));
});
reg('terrain', 'Terreno 3D · voo rasante', 'gen', [N('relief', 'Relevo', 1, 0, 3), ...E3_COMMON().map(x => x.k === 'render' ? S('render', 'Render', 'lines', E3_RENDER) : x.k === 'spin' ? N('spin', 'Giro (ciclos/loop)', 0, 0, 6, 1) : x.k === 'tiltX' ? N('tiltX', 'Inclinação X °', 36, -90, 90, 0.1) : x)], (c, R) => {
  const { p, F } = R;
  e3Draw(c, R, terrain(e3ph(F, p), e3d(p), p.seed, p.relief), { yaw: 0.6 });
});
reg('monument', 'Monumento · sólidos arquitetônicos', 'gen', [S('kind', 'Forma', 'torre', Object.keys(MONUMENT)), ...E3_COMMON()], (c, R) => {
  const { p } = R;
  e3Draw(c, R, monument(p.kind, e3d(p), p.seed));
});
