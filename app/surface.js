/* Superfície (fase 3): presets de superfície, fatias para o Resolume (XML de Advanced Output), pixel map por CSV ou PNG e avisos de legibilidade.
   O cálculo das fatias é a porta de skill/ai-vj-generator/scripts/export_slices.py (parity testada por scripts/surface_check.mjs: o XML sai idêntico).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const SURFX = (() => {
  const pyRound = GENAI.pyRound;
  const PAL_TILE = [[230, 57, 70], [42, 157, 143], [244, 162, 97], [69, 123, 157], [168, 218, 220], [233, 196, 106], [131, 56, 236], [6, 214, 160]];

  /* ---- fatias em colunas (o que o export_slices.py faz) ---- */
  function pieces(W, folds, maxW) {
    const cuts = [...new Set([0, W, ...folds.filter(f => f > 0 && f < W)])].sort((a, b) => a - b), out = [];
    for (let i = 0; i + 1 < cuts.length; i++) {
      const a = cuts[i], b = cuts[i + 1], n = Math.ceil((b - a) / maxW), step = Math.ceil((b - a) / n);
      for (let x = a; x < b; x += step) out.push({ x, y: 0, w: Math.min(step, b - x) });
    }
    return out;
  }
  /* linha por linha; devolve [{screen, x, y, w, h, ox, oy}] ou { error } */
  function pack(pcs, H, OW, OH) {
    if (H > OH) return { error: `a altura do canvas (${H}) não cabe na altura da saída (${OH}): escolha uma saída mais alta ou gire o conteúdo` };
    const res = []; let screen = 0, x = 0, y = 0;
    for (const p of pcs) {
      if (p.w > OW) return { error: `a fatia de ${p.w} px não cabe na largura da saída (${OW})` };
      if (x + p.w > OW) { x = 0; y += H; }
      if (y + H > OH) { screen++; x = 0; y = 0; }
      res.push({ screen, x: p.x, y: 0, w: p.w, h: H, ox: x, oy: y }); x += p.w;
    }
    return res;
  }
  /* fatias retangulares quaisquer (pixel map): prateleiras da esquerda para a direita; a prateleira tem a altura do maior retângulo */
  function packRects(rects, OW, OH) {
    const res = []; let screen = 0, x = 0, y = 0, shelf = 0;
    for (const r of rects) {
      if (r.w > OW || r.h > OH) return { error: `o módulo ${r.name || ''} (${r.w}×${r.h}) não cabe na saída ${OW}×${OH}` };
      if (x + r.w > OW) { x = 0; y += shelf; shelf = 0; }
      if (y + r.h > OH) { screen++; x = 0; y = 0; shelf = 0; }
      res.push({ screen, x: r.x, y: r.y, w: r.w, h: r.h, ox: x, oy: y, name: r.name }); x += r.w; shelf = Math.max(shelf, r.h);
    }
    return res;
  }

  /* ---- XML de Advanced Output do Resolume Arena (estrutura copiada de arquivos que o próprio Arena salva) ---- */
  const v = (x, y, ind) => `${ind}<v x="${x}" y="${y}"/>\n`;
  const rectPts = (x, y, w, h, ind) => v(x, y, ind) + v(x + w, y, ind) + v(x + w, y + h, ind) + v(x, y + h, ind);
  const RANGE = (n, d, val, lo, hi, ind) => `${ind}<ParamRange name="${n}" default="${d}" value="${val}"><ValueRange name="defaultRange" min="${lo}" max="${hi}"/></ParamRange>\n`;
  const sp = n => ' '.repeat(n);
  function sliceXml(uid, name, W, H, p) {
    const dx = p.ox - p.x, dy = p.oy - p.y, I = sp(24);
    let s = `                    <Slice uniqueId="${uid}">\n`;
    s += '                        <Params name="Common">\n' + `${I}<Param name="Name" default="Layer" value="${name}"/>\n` + `${I}<Param name="Enabled" default="1" value="1"/>\n                        </Params>\n`;
    s += '                        <Params name="Input">\n' + `${I}<ParamChoice name="Input Source" default="0:1" value="0:1" storeChoices="0"/>\n${I}<Param name="Input Opacity" default="1" value="1"/>\n${I}<Param name="Input Bypass/Solo" default="1" value="1"/>\n${I}<Param name="SoftEdgeEnable" default="0" value="0"/>\n                        </Params>\n`;
    s += '                        <Params name="Output">\n' + `${I}<Param name="Flip" default="0" value="0"/>\n`;
    for (const n of ['Brightness', 'Contrast', 'Red', 'Green', 'Blue']) s += RANGE(n, 0, 0, -1, 1, I);
    s += `${I}<Param name="Is Key" default="0" value="0"/>\n${I}<Param name="Black BG" default="0" value="0"/>\n`;
    for (const n of ['BRed', 'BGreen', 'BBlue']) s += RANGE(n, 0, 0, 0, 0.4, I);
    s += '                        </Params>\n';
    s += '                        <InputRect orientation="0">\n' + rectPts(0, 0, W, H, sp(28)) + '                        </InputRect>\n';
    s += '                        <OutputRect orientation="0">\n' + rectPts(dx, dy, W, H, sp(28)) + '                        </OutputRect>\n';
    s += '                        <Warper>\n                            <Params name="Warper"><ParamChoice name="Point Mode" default="PM_LINEAR" value="PM_LINEAR" storeChoices="0"/></Params>\n';
    s += '                            <BezierWarper controlWidth="4" controlHeight="4">\n                                <vertices>\n';
    for (let j = 0; j < 4; j++) for (let i = 0; i < 4; i++) s += v(pyRound(dx + W * i / 3), pyRound(dy + H * j / 3), sp(36));
    s += '                                </vertices>\n                            </BezierWarper>\n                            <Homography>\n                                <src>\n' + rectPts(0, 0, W, H, sp(36));
    s += '                                </src>\n                                <dst>\n' + rectPts(dx, dy, W, H, sp(36)) + '                                </dst>\n                            </Homography>\n                        </Warper>\n';
    s += '                        <SliceMask>\n                            <Params name="Input Mask">\n' + `${I}<Param name="Name" default="Mask" value="Mask"/>\n${I}<Param name="Enabled" default="1" value="1"/>\n${I}<Param name="Invert" default="1" value="1"/>\n                            </Params>\n`;
    s += '                            <ShapeObject>\n                                <Params name="Shape">\n                                    <ParamChoice name="Point Mode" default="PM_LINEAR" value="PM_LINEAR" storeChoices="0"/>\n                                </Params>\n';
    s += '                                <Rect orientation="0">\n' + rectPts(p.x, p.y, p.w, p.h, sp(36)) + '                                </Rect>\n';
    s += '                                <Shape>\n                                    <Contour closed="1">\n                                        <points>\n' + v(p.x, p.y, sp(44)) + v(p.x, p.y + p.h, sp(44)) + v(p.x + p.w, p.y + p.h, sp(44)) + v(p.x + p.w, p.y, sp(44));
    s += '                                        </points>\n                                        <segments>LLLL</segments>\n                                    </Contour>\n                                </Shape>\n                            </ShapeObject>\n                        </SliceMask>\n                    </Slice>\n';
    return s;
  }
  function buildXml(name, W, H, OW, OH, placed) {
    const screens = [...new Set(placed.map(p => p.screen))].sort((a, b) => a - b), ID = ' '.repeat(20);
    let x = `<?xml version="1.0" encoding="utf-8"?>\n<XmlState name="${name}">\n    <versionInfo name="Resolume Arena" majorVersion="5" minorVersion="0" microVersion="0" revision="00000"/>\n`;
    x += '    <ScreenSetup name="ScreenSetup">\n        <Params name="ScreenSetupParams"/>\n        <sizing>\n            <inputs>\n' + `                <InputSize name="0:1" width="${W}" height="${H}"/>\n            </inputs>\n        </sizing>\n        <screens>\n`;
    let uid = 1000;
    for (const sc of screens) {
      x += `            <Screen name="Output #${sc + 1}" uniqueId="${14150 + sc}">\n                <Params name="Params">\n                    <Param name="Name" default="" value="Output #${sc + 1}"/>\n                    <Param name="Enabled" default="1" value="1"/>\n                    <Param name="Hidden" default="0" value="0"/>\n                </Params>\n`;
      x += '                <Params name="Output">\n' + RANGE('Opacity', 1, 1, 0, 1, ID) + ['Brightness', 'Contrast', 'Red', 'Green', 'Blue'].map(n => RANGE(n, 0, 0, -1, 1, ID)).join('') + '                </Params>\n                <layers>\n';
      placed.forEach((p, k) => { if (p.screen !== sc) return; uid += 1000; x += sliceXml(uid, `${name} ${String(k + 1).padStart(2, '0')}`, W, H, p); });
      x += '                </layers>\n                <OutputDevice>\n' + `                    <OutputDeviceVirtual name="Virtual" deviceId="Virtual" idHash="0" width="${OW}" height="${OH}">\n                        <Params name="Params">\n`;
      x += RANGE('Width', 1920, OW, 1, 32768, sp(28)) + RANGE('Height', 1080, OH, 1, 32768, sp(28)) + '                        </Params>\n                    </OutputDeviceVirtual>\n                </OutputDevice>\n            </Screen>\n';
    }
    x += '        </screens>\n        <SoftEdging>\n            <Params name="Soft Edge">\n';
    x += RANGE('Gamma Red', 2, 2, 1, 3, sp(16)) + RANGE('Gamma Green', 2, 2, 1, 3, sp(16)) + RANGE('Gamma Blue', 2, 2, 1, 3, sp(16)) + RANGE('Gamma', 1, 1, 0, 1, sp(16)) + RANGE('Luminance', 0.5, 0.5, 0, 1, sp(16)) + RANGE('Power', 2, 2, 0.1, 7, sp(16));
    return x + '            </Params>\n        </SoftEdging>\n    </ScreenSetup>\n</XmlState>\n';
  }
  const cleanName = n => String(n || 'project').replace(/[<>&"]/g, '');
  /* plano completo: modo "columns" (dobras, igual ao Python) ou "rects" (um módulo do pixel map por fatia) */
  function plan(canvas, opt) {
    const W = canvas.w, H = canvas.h, [OW, OH] = opt.out, name = cleanName(opt.name);
    let placed;
    if (opt.mode === 'rects') placed = packRects(opt.rects || [], OW, OH); else placed = pack(pieces(W, canvas.folds || [], OW), H, OW, OH);
    if (placed.error) return placed;
    const map = { input: [W, H], output: [OW, OH], folds: canvas.folds || [], slices: placed.map((p, k) => ({ slice: k + 1, screen: p.screen + 1, input: { x: p.x, y: p.y, w: p.w, h: p.h }, output: { x: p.ox, y: p.oy } })) };
    map.slices.forEach((s, k) => { if (placed[k].name) s.name = placed[k].name; });
    return { placed, name, xml: buildXml(name, W, H, OW, OH, placed), map, screens: new Set(placed.map(p => p.screen)).size, usedPixels: placed.reduce((a, p) => a + p.w * p.h, 0) };
  }

  /* ---- pixel map: CSV de retângulos (nome,x,y,w,h) ou PNG máscara ---- */
  function parseCsv(text, W, H) {
    const rects = [], errs = []; let first = true;
    String(text).replace(/\r/g, '').split('\n').forEach((raw, ln) => {
      const line = raw.trim(); if (!line || line.startsWith('#')) return;
      const c = line.split(/[,;\t]/).map(s => s.trim()), tail = c.slice(-4);
      if (first) { first = false; if (tail.some(s => s === '' || !isFinite(+s))) return; }   // a primeira linha de dados pode ser o cabeçalho (name,x,y,w,h)
      if (c.length < 4 || c.length > 5 || tail.some(s => s === '' || !isFinite(+s))) { errs.push(`linha ${ln + 1}: use nome,x,y,largura,altura (o nome é opcional)`); return; }
      const [x, y, w, h] = tail.map(s => Math.round(+s)), name = c.length === 5 && c[0] ? c[0] : 'M' + String(rects.length + 1).padStart(2, '0');
      if (w < 1 || h < 1) { errs.push(`linha ${ln + 1}: largura e altura precisam ser positivas`); return; }
      if (x < 0 || y < 0 || x + w > W || y + h > H) { errs.push(`linha ${ln + 1}: o retângulo ${x},${y} ${w}×${h} sai do canvas ${W}×${H}`); return; }
      rects.push({ name, x, y, w, h });
    });
    if (rects.length > 500) errs.push('mais de 500 módulos: simplifique o mapa');
    return { rects: rects.slice(0, 500), errs };
  }
  /* máscara: pixel ativo = opaco e mais claro que 6%; componentes conexos (4 vizinhos) numa grade de até 1024 de largura; cada componente vira o retângulo que o contém */
  function maskToRects(rgba, w, h, W, H) {
    const act = new Uint8Array(w * h); let n = 0;
    for (let i = 0; i < w * h; i++) { const a = rgba[i * 4 + 3]; if (a > 16 && (0.2126 * rgba[i * 4] + 0.7152 * rgba[i * 4 + 1] + 0.0722 * rgba[i * 4 + 2]) > 16) { act[i] = 1; n++; } }
    const seen = new Uint8Array(w * h), out = [], stack = [];
    for (let s = 0; s < w * h; s++) {
      if (!act[s] || seen[s]) continue;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, cnt = 0; stack.push(s); seen[s] = 1;
      while (stack.length) {
        const i = stack.pop(), x = i % w, y = (i - x) / w; cnt++; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
        if (x > 0 && act[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); } if (x < w - 1 && act[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
        if (y > 0 && act[i - w] && !seen[i - w]) { seen[i - w] = 1; stack.push(i - w); } if (y < h - 1 && act[i + w] && !seen[i + w]) { seen[i + w] = 1; stack.push(i + w); }
      }
      if (cnt < 4) continue;
      const fx = W / w, fy = H / h; out.push({ x: Math.round(x0 * fx), y: Math.round(y0 * fy), w: Math.max(1, Math.round((x1 + 1 - x0) * fx)), h: Math.max(1, Math.round((y1 + 1 - y0) * fy)) });
    }
    out.sort((a, b) => a.y - b.y || a.x - b.x);
    return { rects: out.slice(0, 500).map((r, i) => Object.assign({ name: 'M' + String(i + 1).padStart(2, '0') }, r)), activeShare: n / (w * h), truncated: out.length > 500 };
  }
  const rectsCsv = rects => 'name,x,y,w,h\n' + rects.map(r => [r.name, r.x, r.y, r.w, r.h].join(',')).join('\n') + '\n';
  const activePixels = rects => rects.reduce((a, r) => a + r.w * r.h, 0);

  /* ---- avisos de legibilidade: o menor texto e o traço mais fino do projeto contra o que o passo do LED e a distância permitem ---- */
  function legibility(proj, pitchMm, distM) {
    const lg = SC.legibility({ pitch: pitchMm, dist: distM }); if (lg.error) return { error: lg.error };
    const W = proj.canvas.w, H = proj.canvas.h, u = Math.min(H, W * 0.5625) / 1080, warns = [];
    proj.compositions.forEach(comp => comp.layers.forEach(L => {
      if (L.on === false) return; const p = pm(L);
      const tag = `${comp.name} · ${L.name}`;
      if (L.type === 'typeset') { const lv = ['title', 'caption', 'data'].filter(k => String(p[k] || '').trim()).length, small = p.size * u * Math.pow(p.scale, Math.max(0, lv - 1)); if (small < lg.cap_height_min.px) warns.push(`${tag}: o menor nível do texto tem ~${Math.round(small)} px de altura; precisa de ${lg.cap_height_min.px} px ou mais a ${distM} m`); }
      if (L.type === 'text' || L.type === 'pixeltext') { const px = (p.size || 0) * u; if (px && px < lg.cap_height_min.px) warns.push(`${tag}: texto de ~${Math.round(px)} px; precisa de ${lg.cap_height_min.px} px ou mais a ${distM} m`); }
      const stroke = L.type === 'tunnel' || L.type === 'lines' ? p.weight : L.type === 'shape' ? p.strokeW : L.type === 'instrument' ? p.weight : null;
      if (stroke && stroke * u < lg.line_weight_min_px && !(L.opacity < 0.5)) warns.push(`${tag}: traço de ${(stroke * u).toFixed(1)} px; o mínimo legível é ${lg.line_weight_min_px} px a ${distM} m com passo de ${pitchMm} mm`);
    }));
    return { limits: lg, warnings: warns };
  }
  return { pieces, pack, packRects, buildXml, plan, parseCsv, maskToRects, rectsCsv, activePixels, legibility, cleanName, PAL_TILE };
})();
