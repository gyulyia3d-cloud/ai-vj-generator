/* Superfície: entrada e restrição de composição. Lê regiões de um CSV ou de uma máscara PNG (só entrada: o motor não gera pixel map, mapping nem arquivos de saída) e avisa sobre legibilidade.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const SURFX = (() => {
  /* ---- regiões de entrada: CSV de retângulos (nome,x,y,w,h) ou PNG máscara ---- */
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
  return { parseCsv, maskToRects, activePixels, legibility };
})();
