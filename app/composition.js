/* Composition IR (fase 6): porta de skill/ai-vj-generator/scripts/composition_ir.py. Onde cada coisa fica, quanto espaço ocupa, onde nada entra e como isso muda ao longo do loop.
   Lê o Creative IR (verbos) e a superfície (tamanho e proporção). Os dados (12 gramáticas espaciais, afinidades, perfis das cinco fases) vêm de registry/composition.json,
   copiados para app/composition-data.js por node scripts/registry.mjs --write. Python e navegador dão o mesmo IR (scripts/composition_check.mjs).
   O IR também é aplicado às camadas (apply): posição e escala do herói e da estrutura, centro do instrumento e do texto, direção das linhas e um envelope de cinco fases
   (establish, develop, transform, peak, release) tocado como modulação `env`. Gerador e composição são independentes: trocar a gramática muda onde os mesmos geradores ficam.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const COMPOSITION = (() => {
  const D = COMPOSITION_DATA, G = {}, ENGINE_DEFAULT = { contrast: 1, speed: 1, rot: 0, sx: 1, sy: 1 }; D.grammars.forEach(g => { G[g.id] = g; });
  const pyRound = (x, nd = 0) => {
    if (!isFinite(x)) return x;
    const neg = x < 0, a = Math.abs(x), full = a.toFixed(100), dot = full.indexOf('.'), tail = full.slice(dot + 1 + nd);
    let out;
    if (/^50*$/.test(tail)) { const head = full.slice(0, dot + 1 + nd).replace(/\.$/, ''), last = +head.replace('.', '').slice(-1); out = last % 2 === 0 ? head : (a + Math.pow(10, -nd) / 2).toFixed(nd); }
    else out = a.toFixed(nd);
    const v = Number(out);
    return neg ? -v : v;
  };
  const r3 = x => pyRound(x, 3), r2 = x => pyRound(x, 2);
  const aspectClass = (w, h) => { const r = w / h; return r >= 3 ? 'ultrawide' : r >= 1.5 ? 'wide' : r > 0.8 ? 'standard' : r > 0.4 ? 'tall' : 'ultratall'; };
  function rankGrammars(ir, cls) {
    /* o conceito (verbos, como fração do peso total) e a forma da superfície votam juntos; a superfície ganha o primeiro lugar, o conceito molda o resto do set */
    const acc = {}; D.grammarOrder.forEach(g => { acc[g] = 0; });
    let total = 0; for (const v of ir.visualVerbs || []) total += ir.verbScores[v];
    for (const v of ir.visualVerbs || []) for (const [g, w] of Object.entries(D.verbGrammars[v] || {})) acc[g] += ir.verbScores[v] * w;
    const scores = {}; D.grammarOrder.forEach(g => { scores[g] = total ? D.weights.verb * acc[g] / total : 0; });
    for (const [g, w] of Object.entries(D.aspectClasses[cls])) scores[g] += D.weights.aspect * w;
    return D.grammarOrder.filter(g => scores[g] > 0).sort((a, b) => (scores[b] - scores[a]) || (D.grammarOrder.indexOf(a) - D.grammarOrder.indexOf(b)));
  }
  function rect(cx, cy, size, W, H) {
    const short = Math.min(W, H), w = Math.min(1.0, size * short / W), h = Math.min(1.0, size * short / H);
    const x = Math.min(Math.max(cx - w / 2, 0.0), 1.0 - w), y = Math.min(Math.max(cy - h / 2, 0.0), 1.0 - h);
    return { x: r3(x), y: r3(y), w: r3(w), h: r3(h) };
  }
  const center = z => [z.x + z.w / 2, z.y + z.h / 2];
  const inside = (z, px, py) => z.x <= px && px <= z.x + z.w && z.y <= py && py <= z.y + z.h;

  function compile(brief, ir, i) {
    const sf = brief.surface, W = sf.w, H = sf.h, cls = aspectClass(W, H), top = rankGrammars(ir, cls).slice(0, D.weights.setSize), g = G[top[i % top.length]];
    const hero = rect(g.hero[0], g.hero[1], g.hero[2], W, H), sec = rect(g.secondary[0], g.secondary[1], g.secondary[2], W, H), sup = rect(g.support[0], g.support[1], 0.3, W, H);
    const neg = { x: g.negative[0], y: g.negative[1], w: g.negative[2], h: g.negative[3], why: 'left empty on purpose: nothing is placed here' };
    const hm = g.heroMass, sm = r2((1 - hm) * 0.6), mass = { hero: hm, secondary: sm, support: r2(1 - hm - sm) };
    const hc = center(hero), sc = center(sec), pc = center(sup);
    const vx = mass.hero * hc[0] + mass.secondary * sc[0] + mass.support * pc[0], vy = mass.hero * hc[1] + mass.secondary * sc[1] + mass.support * pc[1];
    const dmap = [];
    for (let r = 0; r < 3; r++) { const row = []; for (let c = 0; c < 3; c++) { const px = (c + 0.5) / 3, py = (r + 0.5) / 3; row.push(inside(hero, px, py) ? 0.9 : inside(sec, px, py) ? 0.55 : inside(neg, px, py) ? 0.05 : 0.25); } dmap.push(row); }
    const arcId = (ir.arc && ir.arc.id) || 'drift', prof = D.phaseProfiles[arcId];
    const phases = D.phaseNames.map((name, k) => ({ name, at: r2(k / 5), heroScale: prof.heroScale[k], density: prof.density[k], contrast: prof.contrast[k], rotation: prof.rotation[k], motion: prof.motion[k] }));
    const base = D.weights.baseHeroSize;
    return {
      version: 1, grammar: g.id, grammarSet: top, aspectClass: cls,
      canvas: { w: W, h: H, aspect: r3(W / H), orientation: W > H * 1.1 ? 'wide' : H > W * 1.1 ? 'tall' : 'square' },
      hierarchy: { primary: 'hero', secondary: 'structure', tertiary: 'ground' },
      zones: { hero, secondary: sec, support: sup, background: { x: 0, y: 0, w: 1, h: 1 } },
      negativeSpace: [neg], focalPoint: { x: r3(hc[0]), y: r3(hc[1]) },
      visualMass: mass, balance: { type: g.balance, centre: { x: r3(vx), y: r3(vy) } },
      alignment: g.alignment, movementAxis: g.axis, densityMap: dmap,
      scaleHierarchy: { hero: r2(g.hero[2] / base), secondary: r2(g.secondary[2] / base), support: 0.4 },
      depthHierarchy: { hero: 'foreground', secondary: 'midground', support: 'midground', background: 'background' },
      safeAreas: { x: 0.05, y: 0.05, w: 0.9, h: 0.9 }, edgeBehavior: g.edge,
      textAnchor: { cx: g.text[0], cy: g.text[1], align: g.text[2] },
      temporal: { arc: arcId, phases }, description: g.description,
    };
  }
  function envMod(k, raw, mode) {
    const lo = Math.min(...raw), hi = Math.max(...raw); if (hi - lo < 1e-9) return null;
    return { k, src: 'lfo', shape: 'env', cycles: 1, min: pyRound(lo, 4), max: pyRound(hi, 4), mode, keys: raw.map(x => pyRound((x - lo) / (hi - lo), 4)) };
  }
  function apply(layers, comp, W, H) {
    const placeable = D.placeable, z = comp.zones, ph = comp.temporal.phases, col = key => ph.map(p => p[key]);
    for (const L of layers) {
      const nm = L.name, t = L.type; L.p = L.p || {}; const p = L.p;
      if (nm.startsWith('HER')) {
        if (placeable.includes(t)) { const c = center(z.hero); p.x = pyRound((c[0] - 0.5) * W); p.y = pyRound((c[1] - 0.5) * H); p.sx = p.sy = comp.scaleHierarchy.hero; }
        L.mod = L.mod || [];
        let specs = [['contrast', col('contrast'), 'mul'], ['speed', col('motion'), 'mul']];
        if (placeable.includes(t)) specs = [['sx', col('heroScale'), 'mul'], ['sy', col('heroScale'), 'mul'], ['rot', col('rotation'), 'add']].concat(specs);
        if (typeof p.count === 'number') specs.push(['count', col('density'), 'mul']);
        for (const [k, raw, mode] of specs) { const m = envMod(k, raw, mode); if (m) { if (p[k] === undefined) p[k] = k in ENGINE_DEFAULT ? ENGINE_DEFAULT[k] : 1; L.mod.push(m); } }
      } else if (nm.startsWith('ESTRUTURA')) {
        if (placeable.includes(t)) { const c = center(z.secondary); p.x = pyRound((c[0] - 0.5) * W); p.y = pyRound((c[1] - 0.5) * H); p.sx = p.sy = comp.scaleHierarchy.secondary; }
      } else if (t === 'instrument') {
        const c = center(z.support); p.cx = r2(Math.min(Math.max(c[0], 0.1), 0.9)); p.cy = r2(Math.min(Math.max(c[1], 0.1), 0.9));
      } else if (t === 'typeset') { const a = comp.textAnchor; p.cx = a.cx; p.cy = a.cy; p.align = a.align; }
    }
    return layers;
  }
  const lineDir = comp => D.lineDir[comp.movementAxis];
  return { compile, apply, lineDir, aspectClass, rankGrammars, DATA: D };
})();
