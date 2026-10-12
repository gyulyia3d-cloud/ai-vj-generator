/* Camadas fixas (fase 18): resolução de #include, shader, imagem, vídeo, forma, texto e objeto 3D.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores LAYERSFIXED. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* #include modulo[.sub] em shaders: o corpo do módulo (e dependências) entra no lugar da primeira linha include, numa linha só, então os números de linha dos erros não mudam */
function shaderResolve(src) {
  const want = [], re = /^[ 	]*#include[ 	]+([\w.]+)[ 	]*$/gm; let m;
  while ((m = re.exec(src))) want.push(m[1]);
  if (!want.length) return src;
  const out = [], seen = new Set(), add = n => { if (seen.has(n)) return; seen.add(n); const g = GLIB[n]; if (!g) return; g.req.forEach(add); out.push(g.src); };
  want.forEach(add);
  let first = true;
  return src.replace(re, () => { if (!first) return ''; first = false; return out.join(' '); });
}
function shaderBody(p) { return shaderResolve((p.src && p.src.trim()) ? p.src : (SHADERS[p.preset] || SHADERS['CAMPO FBM']).src); }
reg('shader', 'Shader GLSL', 'fixed', [
  S('preset', 'Preset', 'CAMPO FBM', Object.keys(SHADERS)), N('p1', 'P1', 2.2, 0, 40), N('p2', 'P2', 0.7, 0, 10), N('p3', 'P3', 0.9, 0, 4), N('p4', 'P4', 1.4, 0, 6),
  S('alphaMode', 'Saída', 'alpha', ['alpha', 'opaque']), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
  T('src', 'Código GLSL (vazio = preset). Uniforms: uRes uPh uT uBeat uBp uPulse uAud uBass uMid uHigh uRms uHit uC1 uC2 uBg uP uSeed · helpers: hash noise fbm loopv outc vjRot vjPal vjSdBox vjSdCircle vjSmin vjKaleid vjEaseOut vjPulse. Todo shader reage ao áudio.', '', true)
], (c, R) => {
  const { p, W, H, k } = R;
  const gl = glInit(); if (!gl) return;
  const prog = glProg(shaderBody(p)); if (!prog) return;
  const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(W * k * p.res))), h = Math.max(2, Math.min(4096, Math.round(H * k * p.res)));
  r.resize(w, h); r.viewport(w, h); r.use(prog);
  glFrameUniforms(r, prog, frameContext(R, w, h), R, p.alphaMode === 'alpha' ? 1 : 0);
  r.clear(); r.drawFullscreen();
  c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
});

const MEDIA = {}; // id -> {kind,name,img|el,url,w,h}
function fitRect(iw, ih, W, H, mode) {
  if (mode === 'fill') return [0, 0, W, H];
  if (mode === 'none') return [(W - iw) / 2, (H - ih) / 2, iw, ih];
  const s = mode === 'contain' ? Math.min(W / iw, H / ih) : Math.max(W / iw, H / ih);
  return [(W - iw * s) / 2, (H - ih * s) / 2, iw * s, ih * s];
}
function drawMedia(c, R, src, iw, ih) {
  const { p, F, W, H } = R;
  const cl = p.cropL * iw, ct = p.cropT * ih, cw = iw * (1 - p.cropL - p.cropR), ch = ih * (1 - p.cropT - p.cropB);
  if (cw <= 0 || ch <= 0) return;
  let [x, y, w, h] = fitRect(cw, ch, W, H, p.fit);
  let s = 1; if (p.anim === 'pulse') s = 1 + F.pulse * 0.06; if (p.anim === 'flash' && F.lbp > 0.5) return;
  c.save(); c.translate(W / 2, H / 2); c.scale((p.mirror ? -1 : 1) * s, (p.flip ? -1 : 1) * s); c.translate(-W / 2, -H / 2);
  if (p.tint !== 'none') {
    const tmp = TMP(Math.max(1, Math.round(w * R.k)), Math.max(1, Math.round(h * R.k)));
    const t = tmp.getContext('2d'); t.globalCompositeOperation = 'source-over'; t.clearRect(0, 0, tmp.width, tmp.height);
    t.drawImage(src, cl, ct, cw, ch, 0, 0, tmp.width, tmp.height); t.globalCompositeOperation = 'source-in'; t.fillStyle = col(R.comp, p.tint); t.fillRect(0, 0, tmp.width, tmp.height);
    c.drawImage(tmp, x, y, w, h);
  } else c.drawImage(src, cl, ct, cw, ch, x, y, w, h);
  c.restore();
}
let _tmp = null; function TMP(w, h) { if (!_tmp) _tmp = document.createElement('canvas'); if (_tmp.width !== w) _tmp.width = w; if (_tmp.height !== h) _tmp.height = h; return _tmp; }
const MEDIA_P = [S('fit', 'Encaixe', 'cover', ['cover', 'contain', 'fill', 'none']), B('mirror', 'Espelhar', false), B('flip', 'Inverter vertical', false),
  N('cropL', 'Corte esq.', 0, 0, 0.49), N('cropR', 'Corte dir.', 0, 0, 0.49), N('cropT', 'Corte topo', 0, 0, 0.49), N('cropB', 'Corte base', 0, 0, 0.49),
  S('anim', 'Animação', 'none', ['none', 'pulse', 'flash']), C('tint', 'Colorir (none = original)', 'none')];
reg('image', 'Imagem', 'fixed', [S('media', 'Arquivo', '', []), ...MEDIA_P], (c, R) => {
  const m = MEDIA[R.p.media]; if (!m || !m.img) return; drawMedia(c, R, m.img, m.w, m.h);
});
reg('video', 'Vídeo', 'fixed', [S('media', 'Arquivo', '', []), ...MEDIA_P, N('rate', 'Velocidade', 1, 0.05, 4), N('start', 'Início (s)', 0, 0, 600, 0.01), N('end', 'Fim (s, 0 = final)', 0, 0, 600, 0.01),
  S('play', 'Reprodução', 'loop', ['loop', 'reverse', 'pingpong', 'sync'])], (c, R) => {
  const m = MEDIA[R.p.media]; if (!m || !m.el || m.el.readyState < 2) return;
  if (ST.live && !EXPORTING) videoDrive(m, R.p, R.F);
  drawMedia(c, R, m.el, m.el.videoWidth, m.el.videoHeight);
});
/* ---------- objeto 3D (OBJ, GLB, STL): shader, wireframe, nuvem de pontos ---------- */
const MODEL_MAX_TRIS = 400000;
function modelFinish(pos, tri, fmt) {
  const n = pos.length / 3; if (!n || !tri.length) throw new Error('modelo sem geometria');
  if (tri.length / 3 > MODEL_MAX_TRIS) throw new Error('modelo com ' + Math.round(tri.length / 3000) + 'k triângulos (limite ' + MODEL_MAX_TRIS / 1000 + 'k). Reduza a malha.');
  let x0 = 1e30, y0 = 1e30, z0 = 1e30, x1 = -1e30, y1 = -1e30, z1 = -1e30;
  for (let i = 0; i < n; i++) { const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; if (z < z0) z0 = z; if (z > z1) z1 = z; }
  const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, cz = (z0 + z1) / 2; let r = 0;
  for (let i = 0; i < n; i++) { const x = pos[i * 3] - cx, y = pos[i * 3 + 1] - cy, z = pos[i * 3 + 2] - cz; r = Math.max(r, Math.hypot(x, y, z)); }
  r = r || 1; const v = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { v[i * 3] = (pos[i * 3] - cx) / r; v[i * 3 + 1] = (pos[i * 3 + 1] - cy) / r; v[i * 3 + 2] = (pos[i * 3 + 2] - cz) / r; }
  /* arestas únicas */
  const seen = new Set(), ed = []; const T = tri.length;
  for (let i = 0; i < T; i += 3) for (let k = 0; k < 3; k++) { const a = tri[i + k], b = tri[i + (k + 1) % 3], lo = Math.min(a, b), hi = Math.max(a, b), key = lo * n + hi; if (!seen.has(key)) { seen.add(key); ed.push(lo, hi); } }
  /* nuvem: vértices + amostras sobre as faces, determinístico */
  const target = Math.min(24000, Math.max(n, 6000)), cl = new Float32Array(target * 3); let q = 0;
  for (let i = 0; i < n && q < target; i++, q++) { cl[q * 3] = v[i * 3]; cl[q * 3 + 1] = v[i * 3 + 1]; cl[q * 3 + 2] = v[i * 3 + 2]; }
  let s = 1234567; const rnd = () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; const nt = T / 3;
  while (q < target) { const f = Math.floor(rnd() * nt) * 3, a = tri[f], b = tri[f + 1], c = tri[f + 2]; let u = rnd(), w = rnd(); if (u + w > 1) { u = 1 - u; w = 1 - w; } const t = 1 - u - w;
    cl[q * 3] = v[a * 3] * t + v[b * 3] * u + v[c * 3] * w; cl[q * 3 + 1] = v[a * 3 + 1] * t + v[b * 3 + 1] * u + v[c * 3 + 1] * w; cl[q * 3 + 2] = v[a * 3 + 2] * t + v[b * 3 + 2] * u + v[c * 3 + 2] * w; q++; }
  return { kind: 'model', fmt, v, t: Uint32Array.from(tri), e: Uint32Array.from(ed), cloud: cl, w: n, h: T / 3 };
}
function parseOBJ(txt) {
  const pos = [], tri = [];
  for (const raw of txt.split('\n')) {
    const l = raw.trim(); if (l[0] === 'v' && l[1] === ' ') { const a = l.split(/\s+/); pos.push(+a[1] || 0, +a[2] || 0, +a[3] || 0); }
    else if (l[0] === 'f' && l[1] === ' ') { const a = l.split(/\s+/).slice(1).map(s => { let i = parseInt(s, 10); return i < 0 ? pos.length / 3 + i : i - 1; }); for (let i = 1; i < a.length - 1; i++) tri.push(a[0], a[i], a[i + 1]); }
  }
  return modelFinish(pos, tri.filter(i => i >= 0 && i < pos.length / 3), 'obj');
}
function parseSTL(buf) {
  const dv = new DataView(buf), head = new TextDecoder().decode(new Uint8Array(buf, 0, Math.min(80, buf.byteLength)));
  const nTri = buf.byteLength >= 84 ? dv.getUint32(80, true) : 0, bin = 84 + nTri * 50 === buf.byteLength;
  const map = new Map(), pos = [], tri = [], add = (x, y, z) => { const k = x + ',' + y + ',' + z; let i = map.get(k); if (i == null) { i = pos.length / 3; map.set(k, i); pos.push(x, y, z); } return i; };
  if (bin) { for (let t = 0; t < nTri; t++) { const o = 84 + t * 50 + 12; for (let k = 0; k < 3; k++) tri.push(add(dv.getFloat32(o + k * 12, true), dv.getFloat32(o + k * 12 + 4, true), dv.getFloat32(o + k * 12 + 8, true))); } }
  else if (/^\s*solid/.test(head)) { const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g, txt = new TextDecoder().decode(buf); let m; while ((m = re.exec(txt))) tri.push(add(+m[1], +m[2], +m[3])); tri.length -= tri.length % 3; }
  else throw new Error('STL inválido');
  return modelFinish(pos, tri, 'stl');
}
function parseGLB(buf) {
  const dv = new DataView(buf); if (dv.getUint32(0, true) !== 0x46546C67) throw new Error('GLB inválido (use .glb binário)');
  let o = 12, json = null, bin = null;
  while (o < buf.byteLength) { const len = dv.getUint32(o, true), type = dv.getUint32(o + 4, true); if (type === 0x4E4F534A) json = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, o + 8, len))); else if (type === 0x004E4942 && !bin) bin = new Uint8Array(buf, o + 8, len); o += 8 + len; }
  if (!json || !bin) throw new Error('GLB sem dados');
  if ((json.extensionsUsed || []).some(e => /draco|meshopt/i.test(e))) throw new Error('GLB comprimido (Draco/Meshopt) não é suportado. Exporte sem compressão.');
  const rd = (ai, comps) => { const A = json.accessors[ai], V = json.bufferViews[A.bufferView], base = bin.byteOffset + (V.byteOffset || 0) + (A.byteOffset || 0), cnt = A.count, ct = A.componentType, sz = { 5120: 1, 5121: 1, 5122: 2, 5123: 2, 5125: 4, 5126: 4 }[ct], stride = V.byteStride || sz * comps;
    const d = new DataView(bin.buffer), out = new Float64Array(cnt * comps);
    for (let i = 0; i < cnt; i++) for (let k = 0; k < comps; k++) { const p = base + i * stride + k * sz; out[i * comps + k] = ct === 5126 ? d.getFloat32(p, true) : ct === 5125 ? d.getUint32(p, true) : ct === 5123 ? d.getUint16(p, true) : ct === 5122 ? d.getInt16(p, true) : ct === 5121 ? d.getUint8(p) : d.getInt8(p); }
    return out; };
  const pos = [], tri = [];
  for (const M of json.meshes || []) for (const pr of M.primitives || []) {
    if (pr.mode != null && pr.mode !== 4) continue; if (pr.attributes?.POSITION == null) continue;
    const base = pos.length / 3, P0 = rd(pr.attributes.POSITION, 3); for (let i = 0; i < P0.length; i++) pos.push(P0[i]);
    const idx = pr.indices != null ? rd(pr.indices, 1) : Array.from({ length: P0.length / 3 }, (_, i) => i);
    for (let i = 0; i + 2 < idx.length; i += 3) tri.push(base + idx[i], base + idx[i + 1], base + idx[i + 2]);
  }
  return modelFinish(pos, tri, 'glb');
}
function parseModel(name, buf) { const ext = (name.match(/\.(\w+)$/) || [])[1]?.toLowerCase(); if (ext === 'obj') return parseOBJ(new TextDecoder().decode(buf)); if (ext === 'stl') return parseSTL(buf); if (ext === 'glb') return parseGLB(buf); throw new Error('use .obj, .glb ou .stl'); }
const modelFromData = async (name, data) => parseModel(name, await (await fetch(data)).arrayBuffer());

reg('model', 'Objeto 3D', 'fixed', [
  S('media', 'Arquivo', '', []), S('mode', 'Render', 'shader', ['shader', 'wireframe', 'pointcloud']),
  N('size', 'Tamanho (%)', 70, 5, 200, 1), N('spin', 'Giro Y (voltas/loop)', 1, -8, 8, 1), N('tilt', 'Inclinação X (°)', 20, -90, 90, 1), N('roll', 'Giro Z (°)', 0, -180, 180, 1),
  N('persp', 'Perspectiva', 0.35, 0, 1.5), N('px', 'Posição X', 0, -1, 1), N('py', 'Posição Y', 0, -1, 1),
  N('lineW', 'Espessura da linha', 1.5, 0.2, 12, 0.1), N('pointSize', 'Tamanho do ponto', 2, 0.5, 16, 0.1), N('density', 'Densidade dos pontos', 0.6, 0.02, 1, 0.01),
  N('light', 'Direção da luz (°)', 35, -180, 180, 1), N('ambient', 'Luz ambiente', 0.25, 0, 1), N('pulseAmt', 'Pulso no beat', 0.08, 0, 1),
  C('c1', 'Cor', 'primary'), C('c2', 'Cor da borda de luz', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R, m = MEDIA[p.media]; if (!m || m.kind !== 'model' || !m.v) return;
  const rot = TAU * F.lph * cyc(F, p.spin), tl = p.tilt * Math.PI / 180, rl = p.roll * Math.PI / 180, ca = Math.cos(rot), sa = Math.sin(rot), ct = Math.cos(tl), st = Math.sin(tl), cr = Math.cos(rl), sr = Math.sin(rl);
  const Rad = Math.min(W, H) * 0.5 * p.size / 100 * (1 + F.pulse * p.pulseAmt), cx = W / 2 + p.px * W / 2, cy = H / 2 - p.py * H / 2, v = m.v, n = v.length / 3;
  const proj = (src, cnt) => { const o = new Float32Array(cnt * 3);
    for (let i = 0; i < cnt; i++) { let x = src[i * 3], y = src[i * 3 + 1], z = src[i * 3 + 2];
      const x1 = x * ca + z * sa, z1 = -x * sa + z * ca; const y2 = y * ct - z1 * st, z2 = y * st + z1 * ct; const x3 = x1 * cr - y2 * sr, y3 = x1 * sr + y2 * cr;
      const s = 1 / Math.max(0.25, 1 - p.persp * z2 * 0.5); o[i * 3] = cx + x3 * s * Rad; o[i * 3 + 1] = cy - y3 * s * Rad; o[i * 3 + 2] = z2; }
    return o; };
  const base = hexRgb(col(comp, p.c1)), rim = hexRgb(col(comp, p.c2)), rgb = (a, k) => `rgb(${Math.round(clamp(a[0] * k, 0, 255))},${Math.round(clamp(a[1] * k, 0, 255))},${Math.round(clamp(a[2] * k, 0, 255))})`;
  c.save();
  if (p.mode === 'pointcloud') {
    const cl = m.cloud, cnt = Math.max(1, Math.floor(cl.length / 3 * p.density)), P2 = proj(cl, cnt), ps = Math.max(1, p.pointSize * u), B = [[], [], []];
    for (let i = 0; i < cnt; i++) B[P2[i * 3 + 2] > 0.33 ? 2 : P2[i * 3 + 2] > -0.33 ? 1 : 0].push(i);
    [0.35, 0.65, 1].forEach((k, b) => { c.fillStyle = rgb(base, k); c.beginPath(); for (const i of B[b]) c.rect(P2[i * 3] - ps / 2, P2[i * 3 + 1] - ps / 2, ps, ps); c.fill(); });
  } else if (p.mode === 'wireframe') {
    const P2 = proj(v, n), e = m.e, ne = e.length / 2, stride = Math.max(1, Math.ceil(ne / 120000)), B = [[], [], []];
    for (let i = 0; i < ne; i += stride) { const a = e[i * 2], b = e[i * 2 + 1], z = (P2[a * 3 + 2] + P2[b * 3 + 2]) / 2; B[z > 0.33 ? 2 : z > -0.33 ? 1 : 0].push(a, b); }
    c.lineWidth = Math.max(0.5, p.lineW * u); c.lineCap = 'round';
    [0.35, 0.65, 1].forEach((k, bi) => { c.strokeStyle = rgb(base, k); c.beginPath(); const L = B[bi]; for (let i = 0; i < L.length; i += 2) { c.moveTo(P2[L[i] * 3], P2[L[i] * 3 + 1]); c.lineTo(P2[L[i + 1] * 3], P2[L[i + 1] * 3 + 1]); } c.stroke(); });
  } else {
    const P2 = proj(v, n), t = m.t, nt = t.length / 3, stride = Math.max(1, Math.ceil(nt / 30000)), la = p.light * Math.PI / 180, L = [Math.cos(la) * 0.6, -0.55, Math.sin(la) * 0.6 + 0.6], ll = Math.hypot(...L), faces = [];
    for (let f = 0; f < nt; f += stride) { const a = t[f * 3] * 3, b = t[f * 3 + 1] * 3, d = t[f * 3 + 2] * 3;
      const ux = P2[b] - P2[a], uy = P2[b + 1] - P2[a + 1], vx = P2[d] - P2[a], vy = P2[d + 1] - P2[a + 1];
      /* normal em espaço de câmera: reconstruída das posições 3D rotacionadas (z guardado) */
      const uz = (P2[b + 2] - P2[a + 2]) * Rad, vz = (P2[d + 2] - P2[a + 2]) * Rad; let nx = -(uy * vz - uz * vy), ny = -(uz * vx - ux * vz), nz = ux * vy - uy * vx; const nl = Math.hypot(nx, ny, nz) || 1; nx /= nl; ny /= nl; nz /= nl;
      if (nz < 0) { nx = -nx; ny = -ny; nz = -nz; }
      const lam = clamp((nx * L[0] + ny * L[1] + nz * L[2]) / ll, 0, 1), rimK = Math.pow(1 - nz, 3);
      faces.push([(P2[a + 2] + P2[b + 2] + P2[d + 2]) / 3, a, b, d, p.ambient + (1 - p.ambient) * lam, rimK]); }
    faces.sort((x, y) => x[0] - y[0]);
    for (const [, a, b, d, k, rk] of faces) { const rr = clamp(rk * 0.6, 0, 1); c.fillStyle = `rgb(${Math.round(clamp(base[0] * k * (1 - rr) + rim[0] * rr, 0, 255))},${Math.round(clamp(base[1] * k * (1 - rr) + rim[1] * rr, 0, 255))},${Math.round(clamp(base[2] * k * (1 - rr) + rim[2] * rr, 0, 255))})`;
      c.strokeStyle = c.fillStyle; c.lineWidth = 0.6; c.beginPath(); c.moveTo(P2[a], P2[a + 1]); c.lineTo(P2[b], P2[b + 1]); c.lineTo(P2[d], P2[d + 1]); c.closePath(); c.fill(); c.stroke(); }
  }
  c.restore();
});
function videoTime(m, p, F) {
  const dur = m.el.duration || 1, a = clamp(p.start, 0, dur), b = p.end > a ? Math.min(p.end, dur) : dur, len = Math.max(0.04, b - a);
  const t = F.t * p.rate;
  if (p.play === 'reverse') return b - (t % len);
  if (p.play === 'pingpong') { const k = t % (2 * len); return a + (k < len ? k : 2 * len - k); }
  if (p.play === 'sync') return a + ((F.lph % 1 + 1) % 1) * len;
  return a + (t % len);
}
function videoDrive(m, p, F) {
  const el = m.el;
  if (p.play === 'loop' && !ST.paused) {
    if (el.paused) el.play().catch(() => {});
    el.playbackRate = clamp(p.rate, 0.0625, 16);
    const dur = el.duration || 0, b = p.end > p.start ? Math.min(p.end, dur) : dur;
    if (el.currentTime < p.start - 0.05 || el.currentTime > b) el.currentTime = p.start;
  } else { if (!el.paused) el.pause(); const t = videoTime(m, p, F); if (Math.abs(el.currentTime - t) > 0.04 && !el.seeking) el.currentTime = t; }
}
function seekVideo(el, t) { return new Promise(r => { if (Math.abs(el.currentTime - t) < 0.001 && el.readyState >= 2) return r(); const done = () => { el.removeEventListener('seeked', done); r(); }; el.addEventListener('seeked', done); el.currentTime = t; setTimeout(done, 1500); }); }

reg('shape', 'Forma', 'fixed', [
  S('kind', 'Tipo', 'ring', ['circle', 'ring', 'square', 'triangle', 'line', 'cross', 'hex']), N('size', 'Tamanho', 160, 1, 4000, 1), N('count', 'Repetição', 1, 1, 200, 1),
  S('layout', 'Distribuição', 'single', ['single', 'linear', 'radial', 'grid']), N('spread', 'Espaçamento', 260, 0, 4000, 1), B('fill', 'Preencher', false), C('fillC', 'Preenchimento', 'primary'),
  C('stroke', 'Traço', 'primary'), N('strokeW', 'Espessura do traço', 3, 0, 120, 0.1), N('radius', 'Raio do canto', 0, 0, 400, 1), N('spin', 'Giro (ciclos/loop)', 0, 0, 16, 1),
  N('pulseAmt', 'Pulso no beat', 0.2, 0, 3), B('alt', 'Alternar acento no beat', false), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const n = Math.round(p.count), pos = [];
  if (p.layout === 'single' || n === 1) pos.push([W / 2, H / 2]);
  else if (p.layout === 'linear') for (let i = 0; i < n; i++) pos.push([W / 2 + (i - (n - 1) / 2) * p.spread * u, H / 2]);
  else if (p.layout === 'radial') for (let i = 0; i < n; i++) { const a = i / n * TAU; pos.push([W / 2 + Math.cos(a) * p.spread * u, H / 2 + Math.sin(a) * p.spread * u]); }
  else { const cols = Math.ceil(Math.sqrt(n)), rows = Math.ceil(n / cols); for (let i = 0; i < n; i++) pos.push([W / 2 + (i % cols - (cols - 1) / 2) * p.spread * u, H / 2 + (Math.floor(i / cols) - (rows - 1) / 2) * p.spread * u]); }
  const rot = TAU * F.lph * cyc(F, p.spin), s0 = p.size * u * (1 + F.pulse * p.pulseAmt);
  pos.forEach(([x, y], i) => {
    const hot = p.alt && i % Math.max(1, n) === Math.floor(F.bk) % Math.max(1, n);
    c.save(); c.translate(x, y); c.rotate(rot + (p.layout === 'radial' ? i / n * TAU : 0));
    c.beginPath(); const s = s0 / 2;
    switch (p.kind) {
      case 'circle': case 'ring': c.arc(0, 0, s, 0, TAU); break;
      case 'square': if (p.radius > 0 && c.roundRect) c.roundRect(-s, -s, s * 2, s * 2, Math.min(s, p.radius * u)); else c.rect(-s, -s, s * 2, s * 2); break;
      case 'triangle': for (let q = 0; q <= 3; q++) { const a = q / 3 * TAU - Math.PI / 2; q ? c.lineTo(Math.cos(a) * s, Math.sin(a) * s) : c.moveTo(Math.cos(a) * s, Math.sin(a) * s); } break;
      case 'hex': for (let q = 0; q <= 6; q++) { const a = q / 6 * TAU; q ? c.lineTo(Math.cos(a) * s, Math.sin(a) * s) : c.moveTo(Math.cos(a) * s, Math.sin(a) * s); } break;
      case 'line': c.moveTo(-s, 0); c.lineTo(s, 0); break;
      case 'cross': c.moveTo(-s, 0); c.lineTo(s, 0); c.moveTo(0, -s); c.lineTo(0, s); break;
    }
    if (p.fill && p.kind !== 'line' && p.kind !== 'cross' && p.kind !== 'ring') { c.fillStyle = col(comp, hot ? p.hot : p.fillC); c.fill(); }
    if (p.strokeW > 0) { c.strokeStyle = col(comp, hot ? p.hot : p.stroke); c.lineWidth = p.strokeW * u; c.stroke(); }
    c.restore();
  });
});

reg('text', 'Texto', 'fixed', [
  T('content', 'Conteúdo', 'AI VJ GENERATOR', true), S('font', 'Fonte', 'mono', ['mono', 'helvetica', 'archivo', 'bebas']), N('size', 'Tamanho', 96, 4, 2000, 1), N('weight', 'Peso', 700, 100, 900, 100),
  N('tracking', 'Tracking (em)', 0.02, -0.3, 2), N('leading', 'Entrelinha', 1.05, 0.5, 4), S('align', 'Alinhamento', 'center', ['left', 'center', 'right']), B('upper', 'Caixa alta', true),
  B('fill', 'Preencher', true), C('color', 'Cor', 'primary'), N('outline', 'Contorno', 0, 0, 40, 0.1), C('outlineC', 'Cor do contorno', 'primary'),
  N('shadow', 'Sombra', 0, 0, 80, 0.5), N('glow', 'Brilho (glow)', 0, 0, 120, 0.5), C('glowC', 'Cor do glow', 'accent'),
  S('anim', 'Animação', 'static', ['static', 'pulse', 'scramble', 'strobe', 'marquee', 'type'])
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  let txt = String(p.content ?? ''); if (p.upper) txt = txt.toUpperCase();
  if (p.anim === 'strobe' && F.lbp > 0.5) return;
  if (p.anim === 'scramble') txt = scr(txt, Math.min(1, F.lbp * 2.2), F.n);
  if (p.anim === 'type') { const f = (F.lph % 1 + 1) % 1; txt = txt.slice(0, Math.floor(txt.length * Math.min(1, f * 1.6))); }
  const fs = p.size * u, lines = txt.split('\n'), lh = fs * p.leading;
  setFont(c, p.weight, fs, fam(p.font), p.tracking); c.textAlign = p.align; c.textBaseline = 'middle';
  let s = 1; if (p.anim === 'pulse') s = 1 + F.pulse * 0.08;
  let x = p.align === 'left' ? W * 0.06 : p.align === 'right' ? W * 0.94 : W / 2, mx = 0;
  if (p.anim === 'marquee') { const tw = Math.max(...lines.map(l => c.measureText(l).width)) + W * 0.2; mx = -(((F.lph * cyc(F, 1)) % 1 + 1) % 1) * (tw + W) + W * 0.5 + tw / 2; c.textAlign = 'center'; x = W / 2; }
  c.save(); c.translate(x + mx, H / 2); c.scale(s, s);
  const y0 = -(lines.length - 1) * lh / 2;
  lines.forEach((ln, i) => {
    const y = y0 + i * lh;
    if (p.glow > 0) { c.shadowColor = col(comp, p.glowC); c.shadowBlur = p.glow * u * R.k; } else if (p.shadow > 0) { c.shadowColor = 'rgba(0,0,0,.8)'; c.shadowBlur = p.shadow * u * R.k; c.shadowOffsetY = p.shadow * 0.3 * u * R.k; }
    if (p.fill) { c.fillStyle = col(comp, p.color); c.fillText(ln, 0, y); }
    c.shadowColor = 'transparent'; c.shadowBlur = 0; c.shadowOffsetY = 0;
    if (p.outline > 0) { c.strokeStyle = col(comp, p.outlineC); c.lineWidth = p.outline * u; c.strokeText(ln, 0, y); }
  });
  c.restore(); c.textBaseline = 'alphabetic';
});

/* tipografia (fase 2): hierarquia título / legenda / dados, revelação por glifo ou palavra e texto em caminho. Tudo função pura da fase do loop;
   o envelope de cada nível sobe e volta a 0 antes do fim do loop, então o último quadro fecha no primeiro. */
reg('typeset', 'Tipografia · hierarquia, revelação e caminho', 'gen', [
  T('title', 'Título', 'TÍTULO'), T('caption', 'Legenda', ''), T('data', 'Dados', ''),
  S('font', 'Fonte', 'archivo', ['archivo', 'bebas', 'mono', 'helvetica']), N('size', 'Tamanho do título (px lógicos)', 150, 8, 1200, 1), N('scale', 'Razão entre níveis', 0.4, 0.15, 0.8), N('weight', 'Peso', 800, 100, 900, 100),
  N('tracking', 'Tracking (em)', 0.04, -0.2, 1), N('gapY', 'Distância entre níveis (em)', 0.5, 0, 3), B('upper', 'Caixa alta', true),
  N('cx', 'Centro X', 0.5, -0.2, 1.2), N('cy', 'Centro Y', 0.5, -0.2, 1.2), S('align', 'Alinhamento', 'center', ['left', 'center', 'right']),
  S('reveal', 'Revelação', 'glyph', ['none', 'glyph', 'word']), N('inAt', 'Entrada (fração do loop)', 0.08, 0, 0.6), N('inLen', 'Duração da entrada', 0.18, 0.02, 0.6), N('outLen', 'Duração da saída', 0.16, 0.02, 0.6), N('cascade', 'Atraso entre níveis', 0.07, 0, 0.3), N('stagger', 'Escalonamento entre glifos', 0.8, 0, 3),
  S('path', 'Caminho', 'none', ['none', 'circle', 'wave', 'line']), N('radius', 'Raio do círculo', 360, 20, 3000, 1), N('amp', 'Amplitude da onda', 60, 0, 600, 1), N('waves', 'Ondas no comprimento (inteiro)', 1.5, 0.5, 8, 0.5), N('angle', 'Ângulo da linha (°)', 0, -90, 90, 1), N('drift', 'Deriva ao longo do caminho (ciclos/loop)', 0, -4, 4, 1),
  N('pulse', 'Pulso no beat', 0.03, 0, 0.3), C('color', 'Cor', 'primary'), C('subColor', 'Cor da legenda e dados', 'secondary'), C('hot', 'Cor do acento', 'accent')
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  let lv = [[String(p.title || ''), 1, p.color], [String(p.caption || ''), p.scale, p.subColor], [String(p.data || ''), p.scale * p.scale, p.subColor]].filter(l => l[0].trim());
  if (!lv.length) return;
  if (p.upper) lv = lv.map(l => [l[0].toUpperCase(), l[1], l[2]]);
  const ph = ((F.lph % 1) + 1) % 1, fs0 = p.size * u, fam0 = fam(p.font), pls = 1 + F.pulse * p.pulse;
  const ss = (a, b, x) => { const t = Math.min(1, Math.max(0, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
  c.textBaseline = 'middle'; c.textAlign = 'left';
  const ga = c.globalAlpha, hs = lv.map(l => fs0 * l[1]), tot = hs.reduce((a, h, i) => a + h + (i ? p.gapY * h : 0), 0);
  let pos = H * p.cy - tot / 2; const ys = hs.map((h, i) => { const cy0 = pos + (i ? p.gapY * h : 0) + h / 2; pos = cy0 + h / 2; return cy0; });
  lv.forEach((l, li) => {
    const y = ys[li];
    const [txt, rel, ck] = l, fs = fs0 * rel * (li === 0 ? pls : 1), t0 = p.inAt + p.cascade * li;
    const env = p.reveal === 'none' ? 1 : Math.min(ss(t0, t0 + p.inLen, ph), 1 - ss(1 - p.outLen, 1, ph));
    if (env <= 0) return;
    setFont(c, p.weight, fs, fam0, 0);
    const units = p.reveal === 'word' ? txt.split(/(\s+)/) : Array.from(txt), adv = units.map(g => c.measureText(g).width + (p.reveal === 'word' ? 0 : p.tracking * fs));
    const len = adv.reduce((a, b) => a + b, 0), n = units.length;
    const prog = i => p.reveal === 'none' ? 1 : Math.min(1, Math.max(0, env * (1 + p.stagger) - p.stagger * (n > 1 ? i / (n - 1) : 0)));
    let x0 = p.align === 'left' ? W * (p.cx - 0.5) + W * 0.06 : p.align === 'right' ? W * (p.cx + 0.5) - W * 0.06 : W * p.cx - len / 2, run = 0;
    const accent = F.bands.hit > 0.55 && li === 0;
    units.forEach((g, i) => {
      const q = prog(i), w = adv[i]; if (q <= 0 || !g.trim()) { run += w; return; }
      const e = 1 - Math.pow(1 - q, 3);
      let gx, gy, rot = 0;
      if (p.path === 'circle') { const r = Math.max(fs0 * 0.2, p.radius * u - (ys[li] - ys[0])), a0 = -Math.PI / 2 - len / r / 2 + (p.drift ? ((F.lph * Math.round(p.drift)) % 1 + 1) % 1 * Math.PI * 2 : 0), a = a0 + (run + w / 2) / r; gx = W * p.cx + Math.cos(a) * r; gy = H * p.cy + Math.sin(a) * r; rot = a + Math.PI / 2; }
      else if (p.path === 'wave' || p.path === 'line') {
        const th = p.angle * Math.PI / 180, s = run + w / 2 - len / 2, dr = p.drift ? ((F.lph * Math.round(p.drift)) % 1 + 1) % 1 : 0, wv = Math.round(p.waves * 2) / 2, k = p.path === 'wave' ? Math.PI * 2 * wv / Math.max(1, len) : 0;
        const off = p.path === 'wave' ? p.amp * u * Math.sin(k * s + Math.PI * 2 * dr) : 0, slope = p.path === 'wave' ? p.amp * u * k * Math.cos(k * s + Math.PI * 2 * dr) : 0;
        gx = W * p.cx + Math.cos(th) * s - Math.sin(th) * (off + (ys[li] - ys[0])); gy = H * p.cy + Math.sin(th) * s + Math.cos(th) * (off + (ys[li] - ys[0])); rot = th + Math.atan(slope);
      } else { gx = x0 + run + w / 2; gy = y; }
      c.save(); c.translate(gx, gy + (1 - e) * fs * 0.35); c.rotate(rot); c.globalAlpha = ga * Math.min(1, q * 1.6); c.scale(0.9 + 0.1 * e, 0.9 + 0.1 * e);
      c.fillStyle = col(comp, accent ? p.hot : ck); c.textAlign = 'center'; c.fillText(g, 0, 0); c.restore();
      run += w;
    });
  });
  c.globalAlpha = ga; c.textAlign = 'left'; c.textBaseline = 'alphabetic';
});
