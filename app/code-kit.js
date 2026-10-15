/* Parâmetros mesclados, easing, fonte em pixel, mídia, camada de código, kit e primitivos declarativos (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores CODEKIT. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- parâmetros mesclados ---------- */
/* =================================================================
   PAREDES · KIT · CAMADA DE CÓDIGO · PRIMITIVOS DE VJ
   Unidade lógica = pixel do canvas / u (u = min(H, W·9/16)/1080), a mesma
   de todos os geradores. Em 5120×500, u = 0,463 e a imagem lógica é 11059×1080.
   Cada dobra do canvas (canvas.folds) divide a imagem em paredes. Texto nunca
   cruza a calha da dobra; linha, campo e varredura podem cruzar.
   ================================================================= */
const LAYER_WARN = new Map();
function layerWarn(L, msg) { let s = LAYER_WARN.get(L); if (!s) LAYER_WARN.set(L, s = new Set()); if (s.size < 8) s.add(msg); }

const GEOM = { key: '', v: null };
function geom(W, H, u) {
  const fo = P.canvas.folds || [], g = P.canvas.gutter ?? 90, key = W + 'x' + H + '|' + fo.join(',') + '|' + g;
  if (GEOM.key === key) return GEOM.v;
  const lw = W / u, lh = H / u, folds = fo.map(x => x / u), edges = [0, ...folds, lw], walls = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const x0 = edges[i], x1 = edges[i + 1], fl = i > 0, fr = i < edges.length - 2, sx0 = x0 + (fl ? g / 2 : 0), sx1 = x1 - (fr ? g / 2 : 0), w = x1 - x0;
    walls.push({ k: i, x0, x1, w, cx: (x0 + x1) / 2, sx0, sx1, sw: sx1 - sx0, foldL: fl, foldR: fr,
      at: f => x0 + f * w, sat: f => sx0 + f * (sx1 - sx0),
      /* fração medida a partir da dobra: parede só com dobra à direita parte de x1; as demais, de x0 */
      near: f => (fr && !fl) ? x1 - f * w : x0 + f * w,
      /* sinal que aponta para longe da dobra mais próxima */
      away: (fr && !fl) ? -1 : 1 });
  }
  GEOM.key = key; return GEOM.v = { w: lw, h: lh, gutter: g, folds, walls, n: walls.length };
}
const crossesFold = (G, x0, x1) => G.folds.some(f => x0 < f + G.gutter / 2 && x1 > f - G.gutter / 2);

/* ---------- easing e tempo ---------- */
const eo4 = t => 1 - Math.pow(1 - clamp(t, 0, 1), 4);
const eBack = t => { t = clamp(t, 0, 1); const k = 2.2; return 1 + (k + 1) * Math.pow(t - 1, 3) + k * Math.pow(t - 1, 2); };
const eExpo = t => t >= 1 ? 1 : 1 - Math.pow(2, -10 * Math.max(0, t));
const eIn2 = t => { t = clamp(t, 0, 1); return t * t; };
const stepv = (t, n) => Math.floor(clamp(t, 0, 0.999999) * n) / n;
const envx = (x, k) => Math.exp(-Math.max(0, x) * (k || 6));

/* ---------- fonte em pixel-bloco 5×7 (desenhada aqui, sem arquivo de fonte) ---------- */
const PXF = {
  A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"], B: ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
  C: [".####", "#....", "#....", "#....", "#....", "#....", ".####"], D: ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
  E: ["#####", "#....", "#....", "####.", "#....", "#....", "#####"], F: ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
  G: [".####", "#....", "#....", "#.###", "#...#", "#...#", ".####"], H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
  I: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"], J: ["..###", "....#", "....#", "....#", "#...#", "#...#", ".###."],
  K: ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"], L: ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
  M: ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"], N: ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
  O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], P: ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
  Q: [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"], R: ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
  S: [".####", "#....", "#....", ".###.", "....#", "....#", "####."], T: ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
  U: ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."], V: ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
  W: ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"], X: ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
  Y: ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."], Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  "0": [".###.", "#..##", "#.#.#", "#.#.#", "##..#", "#...#", ".###."], "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"], "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
  "4": ["#...#", "#...#", "#...#", "#####", "....#", "....#", "....#"], "5": ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
  "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."], "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."], "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
  "-": [".....", ".....", ".....", ".###.", ".....", ".....", "....."], ".": [".....", ".....", ".....", ".....", ".....", ".....", "..#.."],
  ":": [".....", "..#..", ".....", ".....", ".....", "..#..", "....."], "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
  "_": [".....", ".....", ".....", ".....", ".....", ".....", "#####"], " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
  "%": ["##..#", "##..#", "...#.", "..#..", ".#...", "#..##", "#..##"], "=": [".....", ".....", "#####", ".....", "#####", ".....", "....."],
  "!": ["..#..", "..#..", "..#..", "..#..", "..#..", ".....", "..#.."], "?": [".###.", "#...#", "....#", "...#.", "..#..", ".....", "..#.."],
  "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."], "[": [".###.", ".#...", ".#...", ".#...", ".#...", ".#...", ".###."],
  "]": [".###.", "...#.", "...#.", "...#.", "...#.", "...#.", ".###."], ">": [".#...", "..#..", "...#.", "....#", "...#.", "..#..", ".#..."],
  "<": ["...#.", "..#..", ".#...", "#....", ".#...", "..#..", "...#."], "·": [".....", ".....", ".....", "..#..", ".....", ".....", "....."],
  "#": [".#.#.", "#####", ".#.#.", ".#.#.", ".#.#.", "#####", ".#.#."], "*": [".....", "#.#.#", ".###.", "#####", ".###.", "#.#.#", "....."],
  "@": [".###.", "#...#", "#.###", "#.#.#", "#.###", "#....", ".###."], "'": ["..#..", "..#..", ".....", ".....", ".....", ".....", "....."],
  "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."], ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."], ",": [".....", ".....", ".....", ".....", "..#..", "..#..", ".#..."]
};
const pxNorm = t => String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase();
const pxW = (txt, cell) => (pxNorm(txt).length * 6 - 1) * cell;
const pxFit = (txt, maxW, maxH) => Math.max(4, Math.min(maxH / 7, maxW / Math.max(1, pxNorm(txt).length * 6 - 1)));
/* retângulo encaixado no pixel do dispositivo: sem isso aparecem fios de antialias entre blocos */
function snapRect(m, x, y, w, h) {
  if (m.b || m.c) return [x, y, w, h];
  const X0 = Math.round(x * m.a + m.e), Y0 = Math.round(y * m.d + m.f); let X1 = Math.round((x + w) * m.a + m.e), Y1 = Math.round((y + h) * m.d + m.f);
  if (X1 <= X0) X1 = X0 + 1; if (Y1 <= Y0) Y1 = Y0 + 1;
  return [(X0 - m.e) / m.a, (Y0 - m.f) / m.d, (X1 - X0) / m.a, (Y1 - Y0) / m.d];
}
function snapFill(c, x, y, w, h) { const r = snapRect(c.getTransform(), x, y, w, h); c.fillRect(r[0], r[1], r[2], r[3]); }
/* reveal: fração de pixels acesos (ordem sorteada) · o.gap: fresta entre blocos (fração da célula) · o.shift(r,i): deslocamento da linha em células
   o.mask(r,q,i): retorna false para apagar o pixel (ex.: entrada por linhas ou colunas) */
function pxText(c, txt, x, y, cell, o) {
  o = o || {}; const t = pxNorm(txt), g = (o.gap || 0) * cell, rv = o.reveal === undefined ? 1 : o.reveal, sd = o.seed || 0, m = c.getTransform();
  for (let i = 0; i < t.length; i++) {
    const rows = PXF[t[i]] || PXF[' '];
    for (let r = 0; r < 7; r++) {
      const dx = o.shift ? o.shift(r, i) * cell : 0, row = rows[r]; let run = -1;
      for (let q = 0; q <= 5; q++) {
        const on = q < 5 && row[q] === '#' && !(rv < 1 && hr(sd + i * 97 + r * 7 + q, 3) > rv) && !(o.mask && o.mask(r, q, i) === false);
        if (on && !g) { if (run < 0) run = q; continue; }
        if (run >= 0) { const s = snapRect(m, x + (i * 6 + run) * cell + dx, y + r * cell, (q - run) * cell, cell); c.fillRect(s[0], s[1], s[2], s[3]); run = -1; }
        if (on && g) { const s = snapRect(m, x + (i * 6 + q) * cell + dx + g, y + r * cell + g, cell - 2 * g, cell - 2 * g); c.fillRect(s[0], s[1], s[2], s[3]); }
      }
    }
  }
  return (t.length * 6 - 1) * cell;
}
/* símbolos de sinalização: S quadrado · . ponto · o anel · O anel com núcleo · x · + · s caixa · k caixa riscada */
function symDraw(c, t, x, y, s) {
  const lw = Math.max(6, s * 0.16), h = s / 2; c.lineWidth = lw;
  if (t === 'S') { c.fillRect(x - h, y - h, s, s); return; }
  if (t === '.') { c.fillRect(x - s * 0.14, y - s * 0.14, s * 0.28, s * 0.28); return; }
  c.beginPath();
  if (t === 'o' || t === 'O') { c.arc(x, y, h - lw / 2, 0, TAU); c.stroke(); if (t === 'O') { c.beginPath(); c.arc(x, y, s * 0.16, 0, TAU); c.fill(); } return; }
  if (t === 'x') { c.moveTo(x - h, y - h); c.lineTo(x + h, y + h); c.moveTo(x + h, y - h); c.lineTo(x - h, y + h); c.stroke(); return; }
  if (t === '+') { c.moveTo(x - h, y); c.lineTo(x + h, y); c.moveTo(x, y - h); c.lineTo(x, y + h); c.stroke(); return; }
  if (t === 's') { c.strokeRect(x - h + lw / 2, y - h + lw / 2, s - lw, s - lw); return; }
  if (t === 'k') { c.strokeRect(x - h + lw / 2, y - h + lw / 2, s - lw, s - lw); c.beginPath(); c.moveTo(x - h * 0.6, y - h * 0.6); c.lineTo(x + h * 0.6, y + h * 0.6); c.moveTo(x + h * 0.6, y - h * 0.6); c.lineTo(x - h * 0.6, y + h * 0.6); c.stroke(); }
}
function emblemDraw(c, cx, cy, r, ang) {
  c.save(); c.translate(cx, cy); c.rotate(ang);
  c.beginPath(); c.arc(0, 0, r, 0, TAU); c.arc(0, 0, r * 0.58, 0, TAU, true); c.fill('evenodd');
  c.globalCompositeOperation = 'destination-out'; c.fillRect(-r * 0.2, -r * 1.05, r * 0.4, r * 0.62); c.globalCompositeOperation = 'source-over';
  c.fillRect(-r * 0.2, -r * 0.2, r * 0.4, r * 0.4); c.restore();
}
function hazardDraw(c, x, y, w, h, step, off, dir) {
  const m = c.getTransform(), r = snapRect(m, x, y, w, h);
  c.save(); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip(); c.beginPath();
  for (let d = -h - step * 2; d < w + h + step * 2; d += step * 2) { const a = x + d + off; c.moveTo(a, y + h); c.lineTo(a + step, y + h); c.lineTo(a + step + h * dir, y); c.lineTo(a + h * dir, y); c.closePath(); }
  c.fill(); c.restore();
}

/* ---------- mídia: máscara de alpha, tinta, mosaico, meio-tom ---------- */
const TINTS = new WeakMap(), MASKS = new Map();
function mediaImg(name) { const m = MEDIA[name]; return m && m.kind === 'image' && m.img ? m : null; }
function tintOf(m, color) {
  let bag = TINTS.get(m.img); if (!bag) TINTS.set(m.img, bag = new Map());
  let cv = bag.get(color); if (cv) return cv;
  const k = Math.min(1, 2400 / Math.max(m.w, m.h)); cv = document.createElement('canvas'); cv.width = Math.max(1, Math.round(m.w * k)); cv.height = Math.max(1, Math.round(m.h * k));
  const x = cv.getContext('2d'); x.drawImage(m.img, 0, 0, cv.width, cv.height); x.globalCompositeOperation = 'source-in'; x.fillStyle = color; x.fillRect(0, 0, cv.width, cv.height);
  bag.set(color, cv); return cv;
}
/* cobertura média do alpha em cols×rows (reduz em etapas: mede área, não amostra ponto) */
function maskOf(m, cols, rows) {
  const key = m.name + '|' + m.w + '|' + cols + 'x' + rows; if (MASKS.has(key)) return MASKS.get(key);
  let src = m.img, w = m.w, h = m.h;
  while (w > cols * 2 || h > rows * 2) { const nw = Math.max(cols, Math.ceil(w / 2)), nh = Math.max(rows, Math.ceil(h / 2)), t = document.createElement('canvas'); t.width = nw; t.height = nh; t.getContext('2d').drawImage(src, 0, 0, nw, nh); src = t; w = nw; h = nh; }
  const cv = document.createElement('canvas'); cv.width = cols; cv.height = rows; const x = cv.getContext('2d', { willReadFrequently: true }); x.imageSmoothingQuality = 'high'; x.drawImage(src, 0, 0, cols, rows);
  const p = x.getImageData(0, 0, cols, rows).data, a = new Float32Array(cols * rows); for (let i = 0; i < a.length; i++) a[i] = p[i * 4 + 3] / 255;
  if (MASKS.size > 60) MASKS.clear(); MASKS.set(key, a); return a;
}
const fitBox = (m, maxW, maxH) => { const k = Math.min(maxW / m.w, maxH / m.h); return [m.w * k, m.h * k]; };

/* ---------- comparação de código: filtros e execução ---------- */
const CODE_SHADOW = ['window', 'document', 'globalThis', 'fetch', 'XMLHttpRequest', 'WebSocket', 'localStorage', 'sessionStorage', 'indexedDB', 'navigator', 'Function', 'Worker', 'setTimeout', 'setInterval', 'requestAnimationFrame', 'Date', 'performance', 'importScripts', 'postMessage', 'Reflect', 'Proxy', 'WebAssembly', 'SharedArrayBuffer', 'Image', 'Audio'];
/* ---------- isolamento: o código do usuário roda no contexto da página, então o que ele ALCANÇA é a fronteira ----------
   (1) construtores de função mortos: (()=>1)['constr'+'uctor'] não devolve mais o Function real (new Function abaixo usa a referência global, que não muda);
   (2) o contexto 2D chega como fachada sem .canvas (c.canvas.ownerDocument.defaultView era o caminho até a janela);
   (3) mídia chega como cartão {w, h}: o elemento <img> fica atrás de um WeakMap que só a fachada desembrulha.
   O filtro de texto abaixo continua como primeira barreira, mas não é a fronteira: o teste code_sandbox_check.mjs mede o alcance de verdade. */
(function sealCtors() {
  const stub = function () { throw new Error('Construtores de função são proibidos na camada de código.'); };
  for (const proto of [Function.prototype, Object.getPrototypeOf(async function () {}), Object.getPrototypeOf(function* () {}), Object.getPrototypeOf(async function* () {})])
    try { Object.defineProperty(proto, 'constructor', { value: stub, writable: false, configurable: false }); } catch (e) { /* já selado */ }
})();
const UNWRAP = new WeakMap(), SAFE_CTX = new WeakMap();
function safeCtx(c) {
  let s = SAFE_CTX.get(c); if (s) return s; const fns = new Map(), un = x => UNWRAP.get(x) || x;
  s = new Proxy(c, {
    get(t, k) { if (k === 'canvas') return undefined; const v = t[k]; if (typeof v !== 'function') return v; let f = fns.get(k); if (!f) fns.set(k, f = (...a) => { const r = v.apply(t, a.map(un)); return r === t ? s : r; }); return f; },
    set(t, k, v) { if (k === 'canvas') return true; t[k] = v; return true; }
  });
  UNWRAP.set(s, c); SAFE_CTX.set(c, s); return s;
}
function mediaCard(m) { const h = Object.freeze({ kind: m.kind, name: m.name, w: m.w, h: m.h }); UNWRAP.set(h, m.img); return h; }
const CODE_LINT = [
  [/\bMath\s*\.\s*random\b/, 'Math.random é proibido: o render precisa ser determinístico. Use K.rand(i, k) ou K.rng(seed).'],
  [/\b(Date|performance|setTimeout|setInterval|requestAnimationFrame)\b/, 'Relógio real é proibido: use K.t (quadro, fase do loop, beat).'],
  [/\b(window|document|globalThis|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|navigator|Worker|importScripts|postMessage|WebAssembly|SharedArrayBuffer)\b/, 'Acesso à página, rede ou armazenamento é proibido numa camada de código.'],
  [/\b(self|parent|top|location|opener|frames)\s*[.\[]/, 'Acesso a self/parent/top/location é proibido.'],
  [/\beval\b|\bFunction\b|\bimport\b|\brequire\b|\bprocess\b|\bReflect\b|\bProxy\b/, 'eval, Function, import, Reflect e Proxy são proibidos.'],
  [/\bconstructor\b|__proto__|\bprototype\b|\bgetPrototypeOf\b/, 'constructor, prototype e __proto__ são proibidos.']
];
function lintCode(src) { const out = []; for (const [re, msg] of CODE_LINT) if (re.test(src)) out.push(msg); return out; }
const SAFE_MATH = (() => { const o = {}; for (const k of Object.getOwnPropertyNames(Math)) if (k !== 'random') o[k] = Math[k]; return Object.freeze(o); })();
const CODE_CACHE = new Map();
function compileCode(src) {
  src = String(src || ''); let hit = CODE_CACHE.get(src); if (hit) return hit;
  const probs = lintCode(src); let r;
  if (probs.length) r = { err: probs.join(' ') };
  else { try { r = { f: new Function('c', 'K', 'Math', ...CODE_SHADOW, '"use strict";\n' + src) }; } catch (e) { r = { err: 'Erro de sintaxe: ' + e.message }; } }
  if (CODE_CACHE.size > 80) CODE_CACHE.clear(); CODE_CACHE.set(src, r); return r;
}
const projectHasCode = pr => pr.compositions.some(c => c.layers.some(L => L.type === 'code'));
function codeSig(pr) { let s = ''; pr.compositions.forEach(c => c.layers.forEach(L => { if (L.type === 'code') s += '\u0001' + (L.p && L.p.src || ''); })); let h = 5381; for (let i = 0; i < s.length; i++) h = ((h << 5) + h + s.charCodeAt(i)) | 0; return pr.id + ':' + (h >>> 0).toString(36); }
/* permissão: o código só roda depois que a pessoa autoriza este projeto, neste navegador */
function gateCode(pr) {
  const has = projectHasCode(pr), sig = has ? codeSig(pr) : '';
  ST.codeAllow = !has || store.get('codeOK', []).includes(sig); ST.codeSig = sig;
  const b = $('#codeBan'); if (b) b.hidden = ST.codeAllow;
}
function allowCode() {
  const l = store.get('codeOK', []); if (!l.includes(ST.codeSig)) { l.push(ST.codeSig); store.set('codeOK', l.slice(-40)); }
  ST.codeAllow = true; const b = $('#codeBan'); if (b) b.hidden = true; toast('Código autorizado neste navegador'); renderLayers();
}

/* ---------- variáveis regulagens de uma camada de código ---------- */
function cleanVars(v) {
  if (!Array.isArray(v)) return [];
  return v.slice(0, 24).map(d => {
    if (!d || !/^[A-Za-z_][A-Za-z0-9_]*$/.test(String(d.k))) return null;
    const t = ['n', 's', 'b', 'c', 't'].includes(d.t) ? d.t : 'n', o = { k: String(d.k), t, l: String(d.l || d.k), d: d.d };
    if (t === 'n') { o.min = isFinite(+d.min) ? +d.min : 0; o.max = isFinite(+d.max) ? +d.max : Math.max(1, Math.abs(+d.d || 1) * 4); o.step = +d.step > 0 ? +d.step : 0.01; o.d = isFinite(+d.d) ? +d.d : o.min; }
    if (t === 's') { o.opts = (Array.isArray(d.opts) ? d.opts : []).map(String).slice(0, 24); o.d = o.opts.includes(String(d.d)) ? String(d.d) : (o.opts[0] ?? ''); }
    if (t === 'b') o.d = !!d.d;
    if (t === 'c') o.d = d.d || 'primary';
    if (t === 't') { o.d = String(d.d ?? ''); o.area = !!d.area; }
    return o;
  }).filter(Boolean);
}
const varDefs = L => (L.vars || []).map(d => Object.assign({}, d, { k: 'v_' + d.k }));

/* ---------- o kit entregue a cada camada de código e aos primitivos ---------- */
function makeKit(c, R) {
  const { p, F, comp, W, H, u, L } = R, G = geom(W, H, u), pal = Object.assign({}, P.palette, comp.palette || {}), warn = m => layerWarn(L, m);
  const cell0 = 120, v = {}; for (const d of (L.vars || [])) v[d.k] = p['v_' + d.k] ?? d.d;
  const bt = (F.beat % 4) + F.bp;
  const K = {
    R, w: G.w, h: G.h, W, H, u, k: R.k, pw: P.canvas.w, ph: P.canvas.h, walls: G.walls, folds: G.folds, gutter: G.gutter, name: P.meta.name, v, seed: P.seed, comp: comp.name,
    t: { n: F.n, fps: F.fps, fpb: F.fpb, LF: F.LF, ph: F.ph, lph: F.lph, beat: F.beat, bp: F.bp, bar: F.bar, sub: F.sub, beatF: F.beatF, bk: F.bk, lbp: F.lbp, bt, barT: bt / 4, pulse: F.pulse, aud: F.a, bass: F.bands.bass, mid: F.bands.mid, high: F.bands.high, rms: F.bands.rms, hit: F.bands.hit, mhit: F.bands.mhit, hhit: F.bands.hhit, bassT: F.bands.bt, midT: F.bands.mt, highT: F.bands.ht, audT: F.bands.at, pres: F.bands.pres, onbeat: F.bands.onbeat, bsin: F.bands.bsin, btri: F.bands.btri, bsin2: F.bands.bsin2, bsin4: F.bands.bsin4, bars: P.time.bars, bpm: P.time.bpm },
    bg: pal.bg, ink: pal.primary, a: [pal.primary, pal.secondary, pal.field], accent: pal.accent, field: pal.field, support: pal.secondary, alpha: pal.mode === 'white-alpha',
    col: n => col(comp, n), font: n => fam(n),
    TAU, clamp, lerp, hash: hr, rand: (i, k = 0) => hr(i | 0, k | 0, 7), rng: s => mulberry((s | 0) + SEED), env: envx,
    ease: { out: eo4, back: eBack, expo: eExpo, in: eIn2, step: stepv, smooth: sstep },
    snap: (x, y, w, h) => snapRect(c.getTransform(), x, y, w, h), rect: (cc, x, y, w, h) => snapFill(cc, x, y, w, h),
    px: PXF, bW: pxW, bFit: pxFit, sym: symDraw, emblem: emblemDraw,
    checkFold: (x0, x1, what) => { if (crossesFold(G, x0, x1)) { warn('texto' + (what ? ' "' + String(what).slice(0, 24) + '"' : '') + ' cruza a calha de uma dobra'); return true; } return false; },
    bText(cc, txt, x, y, cell, o) { K.checkFold(x, x + pxW(txt, cell), txt); return pxText(cc, txt, x, y, cell, o); },
    bCenter(cc, txt, cx, cy, maxW, maxH, color, o) { const cell = pxFit(txt, maxW, maxH), w = pxW(txt, cell); cc.fillStyle = color || K.ink; K.checkFold(cx - w / 2, cx + w / 2, txt); pxText(cc, txt, cx - w / 2, cy - 3.5 * cell, cell, o); return cell; },
    fit(cc, txt, maxW, maxH, fontKey, weight) {
      cc.font = (weight || 800) + ' 100px ' + fam(fontKey || 'archivo'); const w = Math.max(1, cc.measureText(txt).width), s = Math.max(4, Math.min(maxW / w * 100, maxH / 0.74)); cc.font = (weight || 800) + ' ' + s + 'px ' + fam(fontKey || 'archivo'); return s;
    },
    big(cc, txt, cx, cy, maxW, maxH, color, fontKey, weight) {
      const s = K.fit(cc, txt, maxW, maxH, fontKey, weight), w = cc.measureText(txt).width; K.checkFold(cx - w / 2, cx + w / 2, txt);
      cc.fillStyle = color || K.ink; cc.textAlign = 'center'; cc.textBaseline = 'middle'; cc.fillText(txt, cx, cy + s * 0.04); cc.textAlign = 'left'; cc.textBaseline = 'alphabetic'; return s;
    },
    /* recorte DENTRO da camada (destination-out). Entre camadas o recorte não existe: use K.field como fundo */
    erase(cc, fn) { cc.save(); cc.globalCompositeOperation = 'destination-out'; cc.fillStyle = '#000'; cc.strokeStyle = '#000'; fn(); cc.restore(); },
    hazard(cc, x, y, w, h, step, off, dir) { hazardDraw(cc, x, y, w, h, step || 120, off || 0, dir || 1); },
    checker(cc, x, y, w, h, cell, phase) { const m = cc.getTransform(); for (let j = 0; j * cell < h; j++) for (let i = 0; i * cell < w; i++) if ((i + j + (phase | 0)) % 2 === 0) { const s = snapRect(m, x + i * cell, y + j * cell, Math.min(cell, w - i * cell), Math.min(cell, h - j * cell)); cc.fillRect(s[0], s[1], s[2], s[3]); } },
    /* janela de glitch: 2 quadros por beat, 4 no beat 1 do compasso */
    glitchOn(amt, salt) { const strong = F.beat % 4 === 0, fb = F.bp * F.fpb; if (fb >= (strong ? 4 : 2)) return false; if (!strong && hr(F.beat, (salt | 0) + 91) > 0.3 + (amt ?? 0.5) * 0.5) return false; return true; },
    /* glitch em bloco: copia blocos da PRÓPRIA camada deslocados em células inteiras, ou pinta blocos cheios. Chame por último. */
    glitch(cc, amt, salt, o) {
      amt = amt ?? 0.5; o = o || {}; if (!K.glitchOn(amt, salt)) return; const cell = o.cell || cell0, strong = F.beat % 4 === 0, n = Math.round((strong ? 4 : 2) + amt * 6), src = (UNWRAP.get(cc) || cc).canvas, m = cc.getTransform();
      const sol = o.solid ?? false;
      for (let i = 0; i < n; i++) {
        const sd = F.beat * 31 + i * 7 + (salt | 0), wl = G.walls[Math.floor(hr(sd, 1) * G.walls.length)], cw = 2 + Math.floor(hr(sd, 2) * 6), ch = 1 + Math.floor(hr(sd, 3) * 3);
        const cols = Math.max(1, Math.floor(wl.sw / cell)), rows = Math.max(1, Math.floor(G.h / cell)), col0 = Math.floor(hr(sd, 4) * Math.max(1, cols - cw)), row0 = Math.floor(hr(sd, 5) * Math.max(1, rows - ch + 1));
        const x = wl.sx0 + col0 * cell, y = row0 * cell, w = Math.min(cw * cell, wl.sx1 - x), h = ch * cell, mode = hr(sd, 8);
        if (!sol && mode < 0.55) {
          const sh = (1 + Math.floor(hr(sd, 6) * 3)) * cell * (hr(sd, 7) < 0.5 ? -1 : 1), sx = clamp(x + sh, wl.sx0, wl.sx1 - w), s = snapRect(m, x, y, w, h);
          cc.drawImage(src, sx * m.a + m.e, y * m.d + m.f, w * m.a, h * m.d, s[0], s[1], s[2], s[3]);
        } else { cc.fillStyle = mode < 0.85 ? K.a[Math.floor(hr(sd, 9) * 3)] : K.ink; snapFill(cc, x, y, w, h); }
      }
    },
    /* strobe de parede: pisca uma parede por meia batida, 2 quadros */
    strobe(cc, amt, color) { if (!(amt > 0.02)) return; const q = F.fpb / 2, t = F.n % q; if (t >= 2) return; const wl = G.walls[Math.floor(F.n / q) % G.walls.length]; cc.fillStyle = color || K.ink; cc.globalAlpha = 0.5 + amt * 0.5; cc.fillRect(wl.x0, 0, wl.w, G.h); cc.globalAlpha = 1; },
    /* mídia importada (aba Mídia): K.img('logo.png') */
    img: name => { const m = mediaImg(name); return m ? mediaCard(m) : null; },
    imgBox: (name, maxW, maxH) => { const m = mediaImg(name); return m ? fitBox(m, maxW, maxH) : null; },
    drawImg(cc, name, cx, cy, maxW, maxH, color, sc) {
      const m = mediaImg(name); if (!m) return null; const tcv = tintOf(m, color || K.ink), b = fitBox(m, maxW, maxH), w = b[0] * (sc || 1), h = b[1] * (sc || 1);
      const r = snapRect(cc.getTransform(), cx - w / 2, cy - h / 2, w, h); cc.drawImage(tcv, r[0], r[1], r[2], r[3]); return r;
    },
    cutImg(cc, name, cx, cy, maxW, maxH, sc) { let r = null; K.erase(cc, () => { r = K.drawImg(cc, name, cx, cy, maxW, maxH, '#000', sc); }); return r; },
    mosaic(cc, name, cx, cy, maxW, maxH, cell, color, o) {
      o = o || {}; const m = mediaImg(name); if (!m) return null; const b = fitBox(m, maxW, maxH), cols = Math.max(1, Math.round(b[0] / cell)), rows = Math.max(1, Math.round(b[1] / cell)), a = maskOf(m, cols, rows);
      const x0 = cx - cols * cell / 2, y0 = cy - rows * cell / 2, mm = cc.getTransform(), g = o.gap ?? cell * 0.1, thr = o.thr ?? 0.42; cc.fillStyle = color || K.ink;
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const val = a[r * cols + q]; if (val < thr) continue; if (o.fn && !o.fn(q, r, val, cols, rows)) continue; const s = snapRect(mm, x0 + q * cell + g / 2, y0 + r * cell + g / 2, cell - g, cell - g); cc.fillRect(s[0], s[1], s[2], s[3]); }
      return [x0, y0, cols * cell, rows * cell];
    },
    dots(cc, name, cx, cy, maxW, maxH, sp, color, radFn) {
      const m = mediaImg(name); if (!m) return; const b = fitBox(m, maxW, maxH), cols = Math.max(1, Math.round(b[0] / sp)), rows = Math.max(1, Math.round(b[1] / sp)), a = maskOf(m, cols, rows);
      const x0 = cx - cols * sp / 2 + sp / 2, y0 = cy - rows * sp / 2 + sp / 2; cc.fillStyle = color || K.ink; cc.beginPath();
      for (let r = 0; r < rows; r++) for (let q = 0; q < cols; q++) { const val = a[r * cols + q]; if (val < 0.06) continue; const x = x0 + q * sp, y = y0 + r * sp, rr = Math.min(sp * 0.62, Math.sqrt(val) * sp * 0.5 * (radFn ? radFn(x, y) : 1)); if (rr < 2) continue; cc.moveTo(x + rr, y); cc.arc(x, y, rr, 0, TAU); }
      cc.fill();
    },
    /* ponto da imagem com tinta, para câmeras que saltam de detalhe em detalhe */
    anchor(name, seed) { const m = mediaImg(name); if (!m) return [0.5, 0.5]; const a = maskOf(m, 24, 12); for (let t = 0; t < 40; t++) { const q = Math.floor(hr(seed, t * 2 + 1) * 24), r = Math.floor(hr(seed, t * 2 + 2) * 12); if (a[r * 24 + q] > 0.6) return [(q + 0.5) / 24, (r + 0.5) / 12]; } return [0.5, 0.5]; }
  };
  return K;
}
/* executa um corpo de desenho em unidades lógicas */
function withKit(c, R, fn) { const K = makeKit(c, R); c.save(); c.scale(R.u, R.u); try { fn(K, R.p, c); } finally { c.restore(); } }

const DEFAULT_CODE = `// Corpo de draw(c, K). Unidades lógicas: K.w × K.h (altura-base 1080).
// K.walls[i]: { x0, x1, cx, sx0, sx1, sw, at(f), near(f), away }  ·  K.t: { beat, bp, bar, bt, barT, ph, pulse }
// Texto não cruza a calha da dobra. Recorte (K.erase) só vale dentro desta camada.
const wl = K.walls[0];
K.bCenter(c, K.name, wl.cx, K.h * 0.46, wl.sw * 0.8, K.h * 0.5, K.ink, { reveal: K.ease.out(K.t.barT * 3) });`;

reg('code', 'Código · camada livre', 'code', [T('src', 'Código (corpo de draw(c, K))', DEFAULT_CODE, true)], (c, R) => {
  if (!ST.codeAllow) return;
  const fn = compileCode(R.p.src); if (fn.err) throw new Error(fn.err);
  const K = makeKit(c, R); c.scale(R.u, R.u);
  fn.f(safeCtx(c), K, SAFE_MATH);
});

/* ===== primitivos declarativos: o que a skill usa quando o briefing não pede código ===== */
const WALL_OPT = ['all', '0', '1', '2', '3'];
const wallsSel = (K, sel) => sel === 'all' ? K.walls : K.walls.filter(w => String(w.k) === String(sel));
const perBeats = per => ({ beat: 1, '2beats': 2, bar: 4, '2bars': 8 }[per] || 0);
/* qual item da lista fica em cada parede neste momento, e há quantos beats ele está no ar */
function slot(K, per, wallIdx, off) { const len = perBeats(per); if (!len) return { i: wallIdx * off, bs: K.t.bk + K.t.lbp, len: 0 }; const b = K.t.beat; return { i: Math.floor(b / len) + wallIdx * off, bs: (b % len) + K.t.bp, len }; }

reg('pixeltext', 'Texto em pixel-bloco', 'gen', [
  T('words', 'Palavras (separe por |)', 'SINAL|PRESSÃO', false), S('wall', 'Parede', 'all', WALL_OPT), S('per', 'Troca', 'bar', ['beat', '2beats', 'bar', '2bars', 'static']),
  S('words2', 'Palavra por parede', 'offset', ['same', 'offset']), S('reveal', 'Entrada', 'pixels', ['none', 'pixels', 'rows', 'cols']), N('revBeats', 'Duração da entrada (beats)', 1, 0.1, 4),
  S('exit', 'Saída', 'cut', ['cut', 'dissolve']), N('size', 'Largura (fração da parede)', 0.88, 0.1, 1), N('hmax', 'Altura máxima (fração)', 0.6, 0.1, 1), N('cy', 'Posição vertical', 0.46, 0, 1),
  N('gap', 'Fresta entre blocos', 0, 0, 0.4), N('shift', 'Salto de linhas (células)', 0, 0, 6, 1), B('plate', 'Placa vazada', false), C('color', 'Cor', 'primary')
], (c, R) => withKit(c, R, (K, p) => {
  const list = String(p.words).split('|').map(s => s.trim()).filter(Boolean); if (!list.length) return;
  wallsSel(K, p.wall).forEach((wl, j) => {
    const s = slot(K, p.per, j, p.words2 === 'offset' ? 1 : 0), word = list[((s.i % list.length) + list.length) % list.length];
    const cell = pxFit(word, wl.sw * p.size, K.h * p.hmax), w = pxW(word, cell), x = wl.cx - w / 2, y = K.h * p.cy - 3.5 * cell;
    let rv = 1; const rb = Math.max(0.05, p.revBeats);
    if (p.reveal !== 'none') rv = eo4(s.bs / rb);
    if (p.exit === 'dissolve' && s.len && s.len - s.bs < 0.5) rv = Math.max(0, (s.len - s.bs) / 0.5);
    const o = { gap: p.gap, seed: K.t.beat * 13 + j };
    if (p.reveal === 'pixels' || p.exit === 'dissolve') o.reveal = rv;
    if (p.reveal === 'rows') o.mask = r => r / 7 < rv + 0.001;
    if (p.reveal === 'cols') o.mask = (r, q, i) => (i * 6 + q) / (word.length * 6) < rv + 0.001;
    if (p.shift > 0 && K.t.beat % 2 === 1 && K.t.bp < 0.5) o.shift = (r, i) => Math.round((hr(K.t.sub * 13 + r, i) - 0.5) * 2 * p.shift) * (hr(K.t.sub + r, i + 3) < 0.4 ? 1 : 0);
    const color = K.col(p.color);
    if (p.plate) { c.fillStyle = color; snapFill(c, x - cell * 2, y - cell * 1.5, w + cell * 4, cell * 10); K.erase(c, () => pxText(c, word, x, y, cell, o)); }
    else { c.fillStyle = color; K.checkFold(x, x + w, word); pxText(c, word, x, y, cell, o); }
  });
}));

reg('symbols', 'Matriz de símbolos', 'gen', [
  S('pattern', 'Padrão', 'ring', ['ring', 'checker', 'rain', 'diagonal', 'random', 'wave']), T('set', 'Símbolos (o O x s + k S .)', 'oOxs+kS', false), S('wall', 'Parede', 'all', WALL_OPT),
  N('cell', 'Célula', 120, 40, 400, 1), N('size', 'Tamanho do símbolo', 0.62, 0.2, 1), S('step', 'Passo', 'beat', ['beat', 'sub', 'bar']), N('density', 'Densidade', 0.8, 0.05, 1), C('color', 'Cor', 'primary')
], (c, R) => withKit(c, R, (K, p) => {
  const set = String(p.set || 'oOxs+kS').split(''); if (!set.length) return;
  const pt = p.step === 'sub' ? K.t.sub : p.step === 'bar' ? K.t.bar : K.t.beat, cell = p.cell, s = cell * p.size;
  c.fillStyle = K.col(p.color); c.strokeStyle = K.col(p.color);
  wallsSel(K, p.wall).forEach(wl => {
    const nc = Math.max(1, Math.floor(wl.sw / cell)), nr = Math.max(1, Math.floor(K.h / cell)), x0 = wl.foldR && !wl.foldL ? wl.sx1 : wl.sx0, dir = wl.foldR && !wl.foldL ? -1 : 1, ox = x0 + dir * cell / 2, oy = (K.h - nr * cell) / 2 + cell / 2;
    c.save(); c.beginPath(); c.rect(wl.sx0, 0, wl.sw, K.h); c.clip();
    for (let i = 0; i < nc; i++) for (let j = 0; j < nr; j++) {
      let t = null; const d = Math.hypot(i, j - (nr - 1) / 2);
      if (p.pattern === 'ring') { const q = Math.floor(d - pt); t = set[((q % set.length) + set.length) % set.length]; if (hr(i * 7 + j, 5) > p.density + 0.25) t = '.'; }
      else if (p.pattern === 'checker') t = (i + j + pt) % 2 === 0 ? set[(i + j + pt >> 1) % set.length] : null;
      else if (p.pattern === 'rain') { const ph = Math.floor(hr(i, 11) * nr * 2), q = ((j - pt * 2 + ph) % (nr * 2) + nr * 2) % (nr * 2); t = q < 3 ? set[q % set.length] : (q < 4 ? '.' : null); }
      else if (p.pattern === 'diagonal') t = (i + j - pt) % 4 === 0 ? set[(i + pt) % set.length] : ((i + j) % 4 === 1 ? '.' : null);
      else if (p.pattern === 'wave') { const v = Math.sin((i * 0.7 + j * 0.4) - pt * 0.9); t = v > 1 - p.density * 1.2 ? set[Math.floor((v + 1) * set.length / 2) % set.length] : null; }
      else t = hr(i * 31 + j, pt, 17) < p.density * 0.6 ? set[Math.floor(hr(i, j, pt) * set.length)] : null;
      if (t) symDraw(c, t, ox + dir * i * cell, oy + j * cell, s);
    }
    c.restore();
  });
}));

reg('hazard', 'Faixa de risco', 'gen', [
  N('y', 'Posição vertical', 0.8, 0, 1), N('h', 'Altura', 110, 20, 600, 1), N('step', 'Listra', 120, 30, 400, 1), S('wall', 'Parede', 'all', WALL_OPT),
  S('motion', 'Movimento', 'beat', ['beat', 'continuous', 'static']), S('lean', 'Inclinação', 'mirror', ['mirror', '/', '\\']), N('reach', 'Alcance (fração da parede)', 1, 0.1, 1), C('color', 'Cor', 'secondary')
], (c, R) => withKit(c, R, (K, p) => {
  c.fillStyle = K.col(p.color);
  wallsSel(K, p.wall).forEach(wl => {
    const off = p.motion === 'static' ? 0 : p.motion === 'continuous' ? K.t.beatF * p.step : p.step * ((K.t.bk % 2) + eBack(K.t.lbp / 0.4)), w = wl.w * p.reach;
    const x = wl.foldR && !wl.foldL ? wl.x1 - w : wl.x0, dir = p.lean === '/' ? 1 : p.lean === '\\' ? -1 : (wl.foldR && !wl.foldL ? -1 : 1);
    hazardDraw(c, x, K.h * p.y - p.h / 2, w, p.h, p.step, off * dir, dir);
  });
}));

reg('blocks', 'Glitch e strobe em bloco', 'gen', [
  N('amt', 'Intensidade', 0.5, 0, 1), N('cell', 'Célula', 120, 40, 400, 1), N('strobe', 'Strobe de parede', 0, 0, 1), S('tone', 'Tom', 'mix', ['ink', 'mix', 'support']), N('salt', 'Variação', 0, 0, 99, 1)
], (c, R) => withKit(c, R, (K, p) => {
  const tone = { ink: [K.ink], mix: [K.a[0], K.a[1], K.a[2]], support: [K.a[1]] }[p.tone] || [K.ink];
  if (K.glitchOn(p.amt, p.salt)) {
    const strong = K.t.beat % 4 === 0, n = Math.round((strong ? 4 : 2) + p.amt * 6);
    for (let i = 0; i < n; i++) {
      const sd = K.t.beat * 31 + i * 7 + p.salt, wl = K.walls[Math.floor(hr(sd, 1) * K.walls.length)], cw = 2 + Math.floor(hr(sd, 2) * 6), ch = 1 + Math.floor(hr(sd, 3) * 3);
      const cols = Math.max(1, Math.floor(wl.sw / p.cell)), rows = Math.max(1, Math.floor(K.h / p.cell)), x = wl.sx0 + Math.floor(hr(sd, 4) * Math.max(1, cols - cw)) * p.cell, y = Math.floor(hr(sd, 5) * Math.max(1, rows - ch + 1)) * p.cell;
      c.fillStyle = tone[Math.floor(hr(sd, 9) * tone.length)]; snapFill(c, x, y, Math.min(cw * p.cell, wl.sx1 - x), ch * p.cell);
    }
  }
  K.strobe(c, p.strobe, K.ink);
}));

reg('logo', 'Logo em máscara', 'gen', [
  S('media', 'Logo 1', '', []), S('media2', 'Logo 2', '', []), S('media3', 'Logo 3', '', []), S('media4', 'Logo 4', '', []),
  S('mode', 'Modo', 'fit', ['fit', 'mosaic', 'halftone', 'slices', 'steps', 'fragment']), S('wall', 'Parede', 'all', WALL_OPT), S('per', 'Troca', 'bar', ['beat', '2beats', 'bar', '2bars', 'static']),
  S('pair', 'Entre paredes', 'offset', ['same', 'offset']), N('size', 'Tamanho', 0.8, 0.1, 1.4), N('cy', 'Posição vertical', 0.46, 0, 1), N('cell', 'Célula', 120, 20, 400, 1), B('plate', 'Placa vazada (modo fit)', false), C('color', 'Cor', 'primary')
], (c, R) => withKit(c, R, (K, p) => {
  const names = [p.media, p.media2, p.media3, p.media4].filter(n => n && mediaImg(n)); if (!names.length) return;
  const color = K.col(p.color);
  wallsSel(K, p.wall).forEach((wl, j) => {
    const s = slot(K, p.per, j, p.pair === 'offset' ? 1 : 0), name = names[((s.i % names.length) + names.length) % names.length], mw = wl.sw * p.size, mh = K.h * 0.6 * p.size, cx = wl.cx, cy = K.h * p.cy;
    const bt = K.t.bt, glitch = K.t.beat % 2 === 1 && K.t.bp < 0.5;
    c.save(); c.beginPath(); c.rect(wl.sx0, 0, wl.sw, K.h); c.clip();
    if (p.mode === 'fit') {
      const sc = 1 + 0.05 * envx(K.t.lbp * 3, 1);
      if (p.plate) { const b = K.imgBox(name, mw, mh); c.fillStyle = color; snapFill(c, cx - b[0] * sc / 2 - 60, cy - b[1] * sc / 2 - 60, b[0] * sc + 120, b[1] * sc + 120); K.cutImg(c, name, cx, cy, mw, mh, sc); }
      else K.drawImg(c, name, cx, cy, mw, mh, color, sc);
    } else if (p.mode === 'mosaic') {
      const cells = [p.cell, p.cell / 2, p.cell / 4, 0], st = Math.min(3, Math.floor((s.len ? s.bs / s.len : bt / 4) * 4)); if (cells[st]) K.mosaic(c, name, cx, cy, mw, mh, cells[st], color); else K.drawImg(c, name, cx, cy, mw, mh, color);
    } else if (p.mode === 'halftone') {
      const front = eo4(K.t.bp / 0.8) * wl.w * 1.1; K.dots(c, name, cx, cy, mw, mh, p.cell / 2, color, x => 0.8 + 0.5 * Math.exp(-Math.abs(Math.abs(x - wl.near(0)) - front) / 480));
    } else if (p.mode === 'slices') {
      const b = K.imgBox(name, mw, mh), y0 = cy - b[1] / 2;
      for (let bd = Math.floor(y0 / p.cell); bd * p.cell < y0 + b[1]; bd++) {
        const sd = K.t.beat * 19 + bd * 7 + j * 3, dx = glitch && hr(sd, 1) < 0.55 ? Math.round((hr(sd, 2) - 0.5) * 8) * p.cell / 2 : 0, inv = glitch && hr(sd, 3) < 0.22;
        c.save(); const r = snapRect(c.getTransform(), wl.sx0, bd * p.cell, wl.sw, p.cell); c.beginPath(); c.rect(r[0], r[1], r[2], r[3]); c.clip();
        if (inv) { c.fillStyle = color; snapFill(c, cx - b[0] / 2 + dx - p.cell, bd * p.cell, b[0] + p.cell * 2, p.cell); K.cutImg(c, name, cx + dx, cy, mw, mh); } else K.drawImg(c, name, cx + dx, cy, mw, mh, color);
        c.restore();
      }
    } else if (p.mode === 'steps') {
      const nr = Math.ceil(K.h / p.cell), nC = Math.ceil(wl.w / p.cell), u0 = s.len ? s.bs : bt, len = s.len || 4; let rg = new Path2D();
      for (let r = 0; r < nr; r++) {
        const d = Math.abs(r - (nr - 1) / 2) * 0.05, v = u0 < len - 0.5 ? eo4((u0 - d) / 0.7) : 1 - eIn2((u0 - (len - 0.5) - d) / 0.42), w = Math.ceil(clamp(v, 0, 1) * nC) * p.cell;
        if (w > 0) { const x = wl.foldR && !wl.foldL ? wl.x1 - w : wl.x0; const q = snapRect(c.getTransform(), x, r * p.cell, w, p.cell); rg.rect(q[0], q[1], q[2], q[3]); }
      }
      c.save(); c.clip(rg); K.drawImg(c, name, cx, cy, mw, mh, color); c.restore();
    } else { /* fragment: ampliado além da parede; a câmera salta de detalhe em detalhe */
      const m = mediaImg(name), sBig = Math.max(K.h * 1.9 / m.h, wl.sw * 1.25 / m.w), sFit = Math.min(mw / m.w, mh / m.h), b = K.t.beat % 4, t = eExpo(K.t.bp / 0.35);
      const aP = b ? K.anchor(name, K.t.bar * 17 + b - 1 + j * 50) : [0.5, 0.5], aN = K.anchor(name, K.t.bar * 17 + b + j * 50);
      let u0 = aP[0] + (aN[0] - aP[0]) * t, v0 = aP[1] + (aN[1] - aP[1]) * t, sc = sBig;
      if (b === 3 && K.t.bar % 2 === 1) { const z = eBack(K.t.bp / 0.45); sc = sBig + (sFit - sBig) * z; u0 = aN[0] + (0.5 - aN[0]) * z; v0 = aN[1] + (0.5 - aN[1]) * z; } else if (b === 0) sc = sFit + (sBig - sFit) * eExpo(K.t.bp / 0.3);
      const w = m.w * sc, h = m.h * sc, r = snapRect(c.getTransform(), cx - u0 * w, cy - v0 * h, w, h); c.drawImage(tintOf(m, color), r[0], r[1], r[2], r[3]);
    }
    c.restore();
  });
}));
