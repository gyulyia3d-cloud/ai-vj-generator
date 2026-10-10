/* Surface IR (fase 9): porta de skill/ai-vj-generator/scripts/surface_ir.py. O que se sabe da superfície, com que confiança e o que isso obriga na composição.
   Cada fato leva um rótulo: EXPLICIT (o autor declarou), DETECTED (medido numa forma que o autor entregou: máscara, geometria das regiões), INFERRED (palpite por regra, só aconselha)
   e UNKNOWN (faltou o dado: vira pergunta, nunca chute). A força da restrição segue a confiança: EXPLICIT e DETECTED são `hard`, INFERRED é `soft`, UNKNOWN não restringe.
   A superfície é entrada, restrição e contexto: nunca ambiente 3D nem mapping. Dados em registry/surface.json, copiados para app/surface-ir-data.js por node scripts/registry.mjs --write.
   Python e navegador dão o mesmo IR (scripts/surface_ir_check.mjs). Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const SURFACEIR = (() => {
  const D = SURFACEIR_DATA, N = D.grid, HARD = D.strength.hardFrom;
  const pyRound = (x, nd = 0) => {
    if (!isFinite(x)) return x;
    const neg = x < 0, a = Math.abs(x), full = a.toFixed(100), dot = full.indexOf('.'), tail = full.slice(dot + 1 + nd);
    let out;
    if (/^50*$/.test(tail)) { const head = full.slice(0, dot + 1 + nd).replace(/\.$/, ''), last = +head.replace('.', '').slice(-1); out = last % 2 === 0 ? head : (a + Math.pow(10, -nd) / 2).toFixed(nd); }
    else out = a.toFixed(nd);
    const v = Number(out);
    return neg ? -v : v;
  };
  const r3 = x => pyRound(x, 3), r2 = x => pyRound(x, 2), num = v => typeof v === 'number' && isFinite(v);
  const aspectClass = (w, h) => { const r = w / h; return r >= 3 ? 'ultrawide' : r >= 1.5 ? 'wide' : r > 0.8 ? 'standard' : r > 0.4 ? 'tall' : 'ultratall'; };
  const sum = (a, f) => a.reduce((s, x) => s + f(x), 0);

  function cleanRegions(raw, W, H) {
    const out = [];
    for (const r of raw || []) {
      if (!r || typeof r !== 'object' || !['x', 'y', 'w', 'h'].every(k => num(r[k]))) continue;
      const x0 = Math.max(0, r.x), y0 = Math.max(0, r.y), x1 = Math.min(W, r.x + r.w), y1 = Math.min(H, r.y + r.h);
      if (x1 - x0 > 0 && y1 - y0 > 0) out.push({ x: x0, y: y0, w: x1 - x0, h: y1 - y0, source: r.source || null });
    }
    return out;
  }
  const groups = (vals, gap) => { const vs = vals.slice().sort((a, b) => a - b); let n = 1; for (let i = 1; i < vs.length; i++) if (vs[i] - vs[i - 1] > gap) n++; return n; };
  function layoutOf(rs) {
    const n = rs.length; if (n === 1) return 'single';
    const mh = sum(rs, r => r.h) / n, mw = sum(rs, r => r.w) / n;
    const rows = groups(rs.map(r => r.y + r.h / 2), D.layoutGap * mh), cols = groups(rs.map(r => r.x + r.w / 2), D.layoutGap * mw);
    if (rows === 1 && cols === 1) return 'single'; if (rows === 1) return 'row'; if (cols === 1) return 'column';
    return n >= D.gridFill * rows * cols ? 'grid' : 'scattered';
  }
  function coverage(rs, W, H) {
    const g = [];
    for (let r = 0; r < N; r++) {
      const row = [];
      for (let c = 0; c < N; c++) {
        const x0 = c * W / N, x1 = (c + 1) * W / N, y0 = r * H / N, y1 = (r + 1) * H / N;
        const area = sum(rs, q => Math.max(0, Math.min(x1, q.x + q.w) - Math.max(x0, q.x)) * Math.max(0, Math.min(y1, q.y + q.h) - Math.max(y0, q.y)));
        row.push(r2(Math.min(1.0, area / ((x1 - x0) * (y1 - y0)))));
      }
      g.push(row);
    }
    return g;
  }
  function symmetry(g, vertical) {
    let nm = 0, dn = 0;
    for (let r = 0; r < N; r++) for (let c = 0; c < N; c++) { const a = g[r][c], b = vertical ? g[N - 1 - r][c] : g[r][N - 1 - c]; nm += Math.abs(a - b); dn += a + b; }
    return dn ? r2(1 - nm / dn) : 1.0;
  }
  function legibility(pitch, dist) {
    const L = D.legibility, rad = Math.PI / 180, capMm = dist * 1000 * Math.tan(L.capDeg * rad), lineMm = dist * 1000 * Math.tan((L.lineArcmin / 60) * rad);
    return { capPx: Math.max(Math.max(1, pyRound(capMm / pitch)), L.minCapPx), linePx: Math.max(L.minLinePx, pyRound(lineMm / pitch)) };
  }

  function compile(sf) {
    const W = sf.w, H = sf.h, cls = aspectClass(W, H), facts = [], constraints = [];
    const fact = (id, value, confidence, basis) => facts.push({ id, value, confidence, basis }), strength = c => HARD.includes(c) ? 'hard' : 'soft';
    fact('size', [W, H], 'EXPLICIT', 'declared canvas size in pixels');
    fact('aspect', r3(W / H), 'EXPLICIT', 'exact arithmetic on the declared size');

    const edges = [...new Set((sf.folds || []).filter(f => num(f) && f > 0 && f < W))].sort((a, b) => a - b), pts = [0].concat(edges, [W]);
    const walls = pts.slice(1).map((b, i) => ({ from: r3(pts[i] / W), to: r3(b / W) }));
    if (edges.length) {
      fact('walls', walls.length, 'EXPLICIT', 'folds declared by the author');
      const hw = D.foldHalfWidth;
      constraints.push({ id: 'foldBands', kind: 'seam', strength: 'hard', confidence: 'EXPLICIT', bands: edges.map(e => ({ at: r3(e / W), from: r3(e / W - hw), to: r3(e / W + hw) })), rule: 'hero, structure and support zones do not straddle a fold; text keeps off the fold' });
    } else fact('walls', 1, 'INFERRED', 'no folds declared: one wall is assumed');

    const rs = cleanRegions(sf.regions, W, H); let regions = null, grid = null;
    if (rs.length) {
      const conf = rs[0].source === 'mask' ? 'DETECTED' : 'EXPLICIT';
      grid = coverage(rs, W, H);
      const share = r3(Math.min(1.0, sum(rs, q => q.w * q.h) / (W * H)));
      const x0 = Math.min(...rs.map(q => q.x)), y0 = Math.min(...rs.map(q => q.y)), x1 = Math.max(...rs.map(q => q.x + q.w)), y1 = Math.max(...rs.map(q => q.y + q.h));
      const bbox = { x: r3(x0 / W), y: r3(y0 / H), w: r3((x1 - x0) / W), h: r3((y1 - y0) / H) }, lay = layoutOf(rs), sym = { h: symmetry(grid, false), v: symmetry(grid, true) };
      regions = { count: rs.length, source: conf === 'DETECTED' ? 'mask' : 'list', activeShare: share, bbox, layout: lay, symmetry: sym };
      fact('activeArea', share, conf, conf === 'EXPLICIT' ? 'regions given by the author' : 'regions measured on the mask the author gave');
      fact('layout', lay, 'DETECTED', 'measured on the geometry of the regions');
      fact('symmetry', sym, 'DETECTED', 'measured on an 8x8 coverage grid of the regions');
      constraints.push({ id: 'activeArea', kind: 'region', strength: strength(conf), confidence: conf, minCoverage: D.minCoverage, rule: 'the centre of each zone sits on a grid cell whose coverage is at least minCoverage' });
      const i = D.safeInset, safe = { x: r3(bbox.x + bbox.w * i), y: r3(bbox.y + bbox.h * i), w: r3(bbox.w * (1 - 2 * i)), h: r3(bbox.h * (1 - 2 * i)) };
      constraints.push({ id: 'safeArea', kind: 'margin', strength: strength(conf), confidence: conf, value: safe, rule: 'inset of the bounding box of the active regions' });
    } else {
      fact('activeArea', 1.0, 'INFERRED', 'no regions given: the whole canvas is treated as surface');
      fact('layout', null, 'UNKNOWN', 'no regions to measure');
      fact('symmetry', null, 'UNKNOWN', 'no regions to measure');
      constraints.push({ id: 'safeArea', kind: 'margin', strength: 'soft', confidence: 'INFERRED', value: Object.assign({}, D.defaultSafe), rule: 'default margin: no regions to measure' });
    }

    const ra = D.readingAxis, axis = W / H >= ra.wideFrom ? 'x' : W / H <= ra.tallTo ? 'y' : 'none';
    fact('readingAxis', axis, 'INFERRED', 'the long side of the canvas is where the eye travels');
    constraints.push({ id: 'readingAxis', kind: 'advice', strength: 'soft', confidence: 'INFERRED', value: axis, rule: 'movement along the long side reads better than across it' });

    let pitch = sf.pitchMm, dist = (sf.viewingDistanceM || [null, null]).slice(-1)[0];
    const unknowns = D.unknowns.map(u => ({ id: u.id, why: u.why, ask: u.ask })), miss = D.unknownsIfMissing;
    if (num(pitch) && pitch > 0) fact('pitch', pitch, 'EXPLICIT', 'declared by the author');
    else { pitch = null; fact('pitch', null, 'UNKNOWN', miss.pitch.why); unknowns.push({ id: 'pitch', why: miss.pitch.why, ask: miss.pitch.ask }); }
    if (num(dist) && dist > 0) fact('viewingDistance', dist, 'EXPLICIT', 'declared by the author (the farthest viewer)');
    else { dist = null; fact('viewingDistance', null, 'UNKNOWN', miss.distance.why); unknowns.push({ id: 'viewingDistance', why: miss.distance.why, ask: miss.distance.ask }); }
    if (pitch && dist) {
      const lg = legibility(pitch, dist);
      fact('legibility', lg, 'INFERRED', 'visual-angle rules of thumb applied to the declared pitch and distance');
      constraints.push({ id: 'legibility', kind: 'advice', strength: 'soft', confidence: 'INFERRED', value: lg, rule: 'smallest text and stroke that read, in pixels (rules of thumb)' });
    } else fact('legibility', null, 'UNKNOWN', 'needs the LED pitch and the viewing distance');
    if (!rs.length) unknowns.push({ id: 'regions', why: miss.regions.why, ask: miss.regions.ask });

    const summary = {}; D.confidence.order.forEach(k => { summary[k] = 0; }); facts.forEach(x => { summary[x.confidence]++; });
    return { version: 1, canvas: { w: W, h: H, aspect: r3(W / H), aspectClass: cls, orientation: W > H * 1.1 ? 'wide' : H > W * 1.1 ? 'tall' : 'square' }, facts, walls, regions, grid, constraints, unknowns, summary };
  }
  function fromProject(proj) {
    const c = proj.canvas, cf = ((proj.meta || {}).spec || {}).confirmed || {}, sf = { w: c.w, h: c.h };
    if (c.folds && c.folds.length) sf.folds = c.folds.slice();
    if (c.displays && c.displays.length) sf.regions = c.displays.map(d => Object.assign({}, d));
    if (cf.pitchMm) sf.pitchMm = cf.pitchMm; if (cf.viewingDistanceM) sf.viewingDistanceM = cf.viewingDistanceM;
    return sf;
  }
  const hard = (sx, id) => sx.constraints.find(c => c.id === id && c.strength === 'hard') || null;
  return { compile, fromProject, hard, aspectClass, pyRound, DATA: D };
})();
