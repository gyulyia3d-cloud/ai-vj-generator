/* Crítica (fase 15): três juízos SEPARADOS sobre cada composição, mais as falhas críticas.
   STRUCTURAL  o avaliador de sempre (evaluate.js): hierarquia, contraste, densidade, respiro, movimento, arco, repetição. Mede defeito estrutural, não beleza.
   ARTISTIC    a peça cumpre o que ela mesma declarou? Compara o que foi MEDIDO nos quadros com a intenção gravada no projeto: paleta (project.palette), ponto focal e
               espaço negativo (meta.compositionIR), arco de densidade das fases (meta.compositionIR.temporal). Sem intenção declarada o item fica "não julgado": nunca vira 100.
               O que só o olho decide (meta.artBible.banned, contract.forbiddenShortcuts) vai para needsEye, sem nota.
   TECHNICAL   a peça se renderiza e exporta sem defeito: determinismo, erros de camada e de shader, segurança de flash, validação de export, emenda do loop, dimensões pares.
   CRITICAL    falha que reprova a composição de uma vez, qualquer que seja a nota (vazio, parada, salto na emenda, não determinística, erro de camada ou shader, flash acima
               de 3 por segundo, bloqueio de export, paleta ignorada, espaço negativo ocupado, foco perdido). Veredito: FAIL se houver uma, REVIEW se algum eixo julgado ficar
               abaixo de 60, senão PASS.
   Reaproveita os quadros do avaliador (uma só medição) e não muda nenhuma nota dele. Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const CRITIQUE = (() => {
  const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
  const R2 = x => Math.round(x * 100) / 100, PCT = x => Math.round(x * 100);
  const MEDIA_TYPES = ['image', 'video', 'model'];
  const T = {
    pt: {
      axes: { structural: 'ESTRUTURAL', artistic: 'ARTÍSTICO', technical: 'TÉCNICO' },
      palette: ['{v}% da tinta cai na paleta declarada', 'só {v}% da tinta cai na paleta declarada: as cores da peça não são as do projeto', 'camada de mídia traz cor própria: paleta não julgada', 'pouca tinta para medir a paleta'],
      focal: ['o herói fica a {v}% do ponto focal declarado', 'o herói fica a {v}% do ponto focal declarado: ele não está onde a composição disse', 'sem ponto focal declarado (meta.compositionIR)'],
      negative: ['as figuras põem {v}% da tinta média nas regiões vazias declaradas (o campo de fundo não conta)', 'as figuras põem {v}% da tinta média nas regiões declaradas como vazias: o espaço negativo foi ocupado', 'sem espaço negativo declarado (meta.compositionIR)'],
      arc: ['a cobertura acompanha o arco de densidade declarado (correlação {v})', 'a cobertura não acompanha o arco de densidade declarado (correlação {v}): a peça não sobe e desce como as fases dizem', 'sem arco de densidade declarado nas fases'],
      determinism: ['o mesmo quadro sai idêntico, mesmo fora de ordem', 'o mesmo quadro sai diferente depois de renderizar outro: algo usa tempo real, aleatório ou estado'],
      layers: ['nenhuma camada ou shader deu erro', '{v} erro(s) de camada ou shader: veja a lista'],
      flash: ['no máximo {v} flashes por segundo (limite 3)', '{v} flashes por segundo, acima do limite de 3: reduza o contraste das batidas'],
      validate: ['o export passa pela validação sem erro', '{v} erro(s) de validação de export: veja a lista'],
      seam: ['a emenda do loop está limpa', 'há salto na emenda do loop: o último quadro não encaixa no primeiro'],
      dims: ['dimensões pares ({w}×{h})', 'dimensão ímpar ({w}×{h}): H.264 exige largura e altura pares'],
      critical: {
        EMPTY: 'quase nada é desenhado: o quadro está vazio', FROZEN: 'a imagem não se move e nenhuma camada declara ficar parada', SEAM_POP: 'salto na emenda do loop',
        NONDETERMINISTIC: 'o render não é determinístico', LAYER_ERROR: 'erro de camada ou shader', FLASH_HAZARD: 'flashes acima de 3 por segundo', EXPORT_BLOCKER: 'a validação do export reprova',
        PALETTE_IGNORED: 'a paleta declarada foi ignorada', NEGATIVE_SPACE_FILLED: 'o espaço negativo declarado foi ocupado', FOCUS_LOST: 'o foco da composição está longe do ponto focal declarado'
      },
      unjudged: 'não julgado'
    },
    en: {
      axes: { structural: 'STRUCTURAL', artistic: 'ARTISTIC', technical: 'TECHNICAL' },
      palette: ['{v}% of the ink falls inside the declared palette', 'only {v}% of the ink falls inside the declared palette: the colours are not the project\'s', 'a media layer brings its own colour: palette not judged', 'too little ink to measure the palette'],
      focal: ['the hero sits {v}% from the declared focal point', 'the hero sits {v}% from the declared focal point: it is not where the composition said', 'no focal point declared (meta.compositionIR)'],
      negative: ['the figures put {v}% of the average ink in the declared empty regions (the ground field does not count)', 'the figures put {v}% of the average ink in the regions declared empty: negative space was filled', 'no negative space declared (meta.compositionIR)'],
      arc: ['coverage follows the declared density arc (correlation {v})', 'coverage does not follow the declared density arc (correlation {v}): the piece does not rise and fall as the phases say', 'no density arc declared in the phases'],
      determinism: ['the same frame comes out identical, even out of order', 'the same frame differs after rendering another one: something uses wall time, randomness or state'],
      layers: ['no layer or shader failed', '{v} layer or shader error(s): see the list'],
      flash: ['at most {v} flashes per second (limit 3)', '{v} flashes per second, over the limit of 3: lower the contrast of the hits'],
      validate: ['export validation passes with no error', '{v} export validation error(s): see the list'],
      seam: ['the loop seam is clean', 'the loop seam pops: the last frame does not meet the first'],
      dims: ['even dimensions ({w}×{h})', 'odd dimension ({w}×{h}): H.264 needs even width and height'],
      critical: {
        EMPTY: 'almost nothing is drawn: the frame is empty', FROZEN: 'the picture does not move and no layer declares standing still', SEAM_POP: 'the loop seam pops',
        NONDETERMINISTIC: 'the render is not deterministic', LAYER_ERROR: 'layer or shader error', FLASH_HAZARD: 'flashes above 3 per second', EXPORT_BLOCKER: 'export validation fails',
        PALETTE_IGNORED: 'the declared palette was ignored', NEGATIVE_SPACE_FILLED: 'the declared negative space was filled', FOCUS_LOST: 'the composition focus is far from the declared focal point'
      },
      unjudged: 'not judged'
    }
  };
  const say = (t, k, i, o) => { let s = t[k][i]; if (o) for (const [a, b] of Object.entries(o)) s = s.replace('{' + a + '}', b); return s; };
  const hashOf = d => { let h = 2166136261; for (let i = 0; i < d.length; i += 2) h = Math.imul(h ^ d[i], 16777619) >>> 0; return h; };

  /* O espaço negativo e o ponto focal falam das FIGURAS (herói, estrutura, informação), não do campo de fundo que cobre o quadro todo por desenho.
     Camadas de chão (plano "ground" do Depth IR, ou role que começa com ground/atmosphere/finish) saem da medição; o bg fica (sem grão) e o post sai.
     Sem camada de chão identificável, as figuras são o quadro inteiro e a grade do avaliador serve. Devolve { grid, hero, frames } ou null. */
  function figureGrid(ci, comp, ex, rects) {
    const P = AIVJ.project, M = P.meta || {}, di = Array.isArray(M.depthIR) ? M.depthIR[ci] : null, tier = {};
    if (di && Array.isArray(di.planes)) di.planes.forEach(pl => { tier[pl.name] = pl.tier; });
    const isGround = L => L.type !== 'bg' && L.type !== 'post' && (tier[L.name] === 'ground' || /^\s*(ground|atmosphere|finish)\b/i.test(L.role || ''));
    const gl = comp.layers.filter(L => L.on !== false && isGround(L));
    let inkIn = 0, inkAll = 0, pxIn = 0, pxAll = 0;
    const GX = ex.GX, GY = ex.GY, SC = Math.min(0.2, 240 / P.canvas.w), F = 8, cells = new Array(GX * GY).fill(0), cnt = new Array(GX * GY).fill(0);
    const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [0, 0, 0]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, bg = hex(P.palette && P.palette.bg), lbg = lum(bg[0], bg[1], bg[2]), LF = AIVJ.loopFrames();
    const saved = comp.layers.map(L => [L.on, L.p]);
    comp.layers.forEach(L => { if (isGround(L) || L.type === 'post') L.on = false; if (L.type === 'bg') L.p = Object.assign({}, L.p, { grain: 0 }); });
    try {
      for (let k = 0; k < F; k++) {
        const im = AIVJ.renderFrame(ci, Math.floor(LF * k / F), SC, false), d = im.data, w = im.width, h = im.height;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, q = Math.min(GY - 1, Math.floor(y * GY / h)) * GX + Math.min(GX - 1, Math.floor(x * GX / w)); const v = Math.abs(lum(d[i], d[i + 1], d[i + 2]) - lbg); cells[q] += v; cnt[q]++; if (rects && rects.length) { const fx = (x + 0.5) / w, fy = (y + 0.5) / h; const inside = rects.some(r => fx >= r.x && fx < r.x + r.w && fy >= r.y && fy < r.y + r.h); pxAll++; inkAll += v; if (inside) { pxIn++; inkIn += v; } } }
      }
    } finally { comp.layers.forEach((L, i) => { L.on = saved[i][0]; L.p = saved[i][1]; if (L.p === undefined) delete L.p; if (L.on === undefined) delete L.on; }); }
    const E = cells.map((v, q) => v / Math.max(1, cnt[q])), tot = E.reduce((a, b) => a + b, 0);
    const neg = pxIn > 0 && inkAll > 1e-9 ? { ratio: (inkIn / pxIn) / (inkAll / pxAll), area: pxIn / pxAll } : (pxIn > 0 ? { ratio: 0, area: pxIn / pxAll } : null);
    if (tot < 1e-6) return { grid: E.map(() => 0), hero: null, frames: F, neg };
    const order = E.map((v, q) => q).sort((a, b) => E[b] - E[a]).slice(0, Math.ceil(GX * GY * 0.1)); let hw = 0, hx = 0, hy = 0;
    order.forEach(q => { hw += E[q]; hx += E[q] * ((q % GX) + 0.5) / GX; hy += E[q] * (Math.floor(q / GX) + 0.5) / GY; });
    return { grid: E.map(v => v / tot), hero: { x: hx / hw, y: hy / hw }, frames: F, neg };
  }

  /* O ponto focal declarado é onde o HERÓI fica: centroide da tinta só das camadas com role "hero" (bg fica, o resto sai). Sem camada hero, volta ao centroide das células mais fortes. */
  function heroCentroid(ci, comp) {
    const heroes = comp.layers.filter(L => L.on !== false && /^\s*hero\b/i.test(L.role || '') && L.type !== 'bg' && L.type !== 'post'); if (!heroes.length) return null;
    const P = AIVJ.project, SC = Math.min(0.2, 240 / P.canvas.w), F = 6, LF = AIVJ.loopFrames(), saved = comp.layers.map(L => [L.on, L.p]);
    const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [0, 0, 0]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }, bg = hex(P.palette && P.palette.bg);
    const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255, lbg = lum(bg[0], bg[1], bg[2]);
    comp.layers.forEach(L => { if (L.type === 'bg') L.p = Object.assign({}, L.p, { grain: 0 }); else if (!heroes.includes(L)) L.on = false; });
    let sw = 0, sx = 0, sy = 0;
    try {
      for (let k = 0; k < F; k++) { const im = AIVJ.renderFrame(ci, Math.floor(LF * k / F), SC, false), d = im.data, w = im.width, h = im.height;
        for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const i = (y * w + x) * 4, v = Math.abs(lum(d[i], d[i + 1], d[i + 2]) - lbg); if (v > 0.05) { sw += v; sx += v * (x + 0.5) / w; sy += v * (y + 0.5) / h; } } }
    } finally { comp.layers.forEach((L, i) => { L.on = saved[i][0]; L.p = saved[i][1]; if (L.p === undefined) delete L.p; if (L.on === undefined) delete L.on; }); }
    return sw > 1e-6 ? { x: sx / sw, y: sy / sw } : null;
  }

  function artistic(ci, comp, ex, t) {
    const P = AIVJ.project, M = P.meta || {}, cir = Array.isArray(M.compositionIR) ? M.compositionIR[ci] : null, items = [];
    const media = comp.layers.some(L => L.on !== false && MEDIA_TYPES.includes(L.type));
    // paleta
    if (media) items.push({ id: 'palette', judged: false, note: say(t, 'palette', 2) });
    else if (ex.palFit == null) items.push({ id: 'palette', judged: false, note: say(t, 'palette', 3) });
    else { const s = ss(0.35, 0.8, ex.palFit); items.push({ id: 'palette', judged: true, score: s, raw: { fit: R2(ex.palFit), accentShare: R2(ex.accentShare || 0) }, note: say(t, 'palette', s >= 0.6 ? 0 : 1, { v: PCT(ex.palFit) }) }); }
    // ponto focal
    const fp = cir && cir.focalPoint, rects = cir && Array.isArray(cir.negativeSpace) ? cir.negativeSpace.filter(r => r && r.w > 0 && r.h > 0) : [], fig = figureGrid(ci, comp, ex, rects), hero = heroCentroid(ci, comp) || fig.hero;
    if (!fp || !hero) items.push({ id: 'focal', judged: false, note: say(t, 'focal', 2) });
    else { const dist = Math.hypot(hero.x - fp.x, hero.y - fp.y), s = 1 - ss(0.12, 0.4, dist); items.push({ id: 'focal', judged: true, score: s, raw: { dist: R2(dist), hero: { x: R2(hero.x), y: R2(hero.y) }, focal: fp }, note: say(t, 'focal', s >= 0.6 ? 0 : 1, { v: PCT(dist) }) }); }
    // espaço negativo
    if (!fig.neg || fig.neg.area < 0.02) items.push({ id: 'negative', judged: false, note: say(t, 'negative', 2) });
    else { const ratio = fig.neg.ratio, s = 1 - ss(0.35, 1.0, ratio); items.push({ id: 'negative', judged: true, score: s, raw: { ratio: R2(ratio), area: R2(fig.neg.area) }, note: say(t, 'negative', s >= 0.6 ? 0 : 1, { v: PCT(ratio) }) }); }
    // arco de densidade: a cobertura medida acompanha a curva das fases?
    const ph = cir && cir.temporal && Array.isArray(cir.temporal.phases) ? cir.temporal.phases.filter(p => isFinite(+p.density) && isFinite(+p.at)) : [];
    const S = ex.cov.length;
    if (ph.length >= 2 && S >= 8) {
      const decl = ex.cov.map((_, k) => { let v = ph[0].density; ph.forEach(p => { if (k / S >= p.at) v = p.density; }); return v; });
      const mean = a => a.reduce((x, y) => x + y, 0) / a.length, md = mean(decl), mc = mean(ex.cov); let sxy = 0, sxx = 0, syy = 0;
      for (let k = 0; k < S; k++) { sxy += (decl[k] - md) * (ex.cov[k] - mc); sxx += (decl[k] - md) ** 2; syy += (ex.cov[k] - mc) ** 2; }
      if (sxx < 1e-6) items.push({ id: 'arc', judged: false, note: say(t, 'arc', 2) });
      else { const corr = syy < 1e-10 ? 0 : sxy / Math.sqrt(sxx * syy), s = ss(0, 0.7, corr); items.push({ id: 'arc', judged: true, score: s, raw: { corr: R2(corr) }, note: say(t, 'arc', s >= 0.6 ? 0 : 1, { v: R2(corr) }) }); }
    } else items.push({ id: 'arc', judged: false, note: say(t, 'arc', 2) });
    const judged = items.filter(i => i.judged), score = judged.length ? judged.reduce((a, b) => a + b.score, 0) / judged.length : null;
    const eye = []; const AB = M.artBible || {}, CT = M.contract || {};
    if (AB.banned) eye.push({ id: 'banned', text: String(AB.banned) });
    if (CT.forbiddenShortcuts) eye.push({ id: 'forbiddenShortcuts', text: String(CT.forbiddenShortcuts) });
    return { score: score == null ? null : PCT(score), judged: judged.length, of: items.length, items: items.map(i => Object.assign({}, i, { score: i.judged ? PCT(i.score) : null })), needsEye: eye };
  }

  function technical(ci, o, ctx, t) {
    const P = AIVJ.project, items = [], add = (id, weight, ok, partial, note, raw) => items.push({ id, weight, ok, score: ok ? 100 : PCT(partial), note, raw });
    add('determinism', 25, ctx.det[ci], 0, say(t, 'determinism', ctx.det[ci] ? 0 : 1));
    add('layers', 25, ctx.layerErrors === 0, 0, say(t, 'layers', ctx.layerErrors === 0 ? 0 : 1, { v: ctx.layerErrors }), { errors: ctx.errorList });
    const fl = ctx.flash[ci]; add('flash', 20, fl.pass, 0, say(t, 'flash', fl.pass ? 0 : 1, { v: fl.worst }), { worst: fl.worst, at: fl.at });
    const ve = ctx.val[ci].filter(x => x.lvl === 'ERROR'), vw = ctx.val[ci].filter(x => x.lvl === 'WARNING');
    add('validate', 15, ve.length === 0, 0, say(t, 'validate', ve.length === 0 ? 0 : 1, { v: ve.length }), { errors: ve.map(x => x.t + ': ' + x.m), warnings: vw.map(x => x.t) });
    add('seam', 10, !(o.raw.seamJump && P.time.loop), 0, say(t, 'seam', o.raw.seamJump && P.time.loop ? 1 : 0));
    const even = P.canvas.w % 2 === 0 && P.canvas.h % 2 === 0; add('dims', 5, even, 0, say(t, 'dims', even ? 0 : 1, { w: P.canvas.w, h: P.canvas.h }));
    const sum = items.reduce((a, b) => a + b.weight, 0), score = Math.round(items.reduce((a, b) => a + b.weight * b.score / 100, 0) / sum * 100);
    return { score, items };
  }

  /* roda a crítica; opts.flash:false pula a análise de flash (a mais demorada em loops longos) */
  function run(lang, opts) {
    opts = opts || {}; const P = AIVJ.project, res = EVALUATOR.measure(), lg = lang || res.lang || 'en', t = T[lg] || T.en;
    const rep = EVALUATOR.run(lg, res), LF = AIVJ.loopFrames(), n = P.compositions.length;
    // determinismo: o quadro a, outro quadro b, e o quadro a de novo têm de ser idênticos
    const det = P.compositions.map((_, ci) => { const a = Math.floor(LF * 0.31), b = Math.floor(LF * 0.77), r = n2 => hashOf(AIVJ.renderFrame(ci, n2, 0.15, false).data); const h1 = r(a); r(b); return h1 === r(a); });
    const flash = P.compositions.map((_, ci) => opts.flash === false ? { pass: true, worst: 0, at: 0 } : FLASH.analyze(FLASH.seriesOf(ci, LF), P.canvas.fps));
    const val = P.compositions.map((_, ci) => { try { return AIVJ.validate({ scale: 1, fps: P.canvas.fps, comps: [ci] }).out; } catch (e) { return [{ lvl: 'ERROR', t: 'validação', m: String(e.message || e) }]; } });
    const errorList = AIVJ.layerErrors().concat([...AIVJ.GLERR.values()].filter(Boolean).map(String)), ctx = { det, flash, val, layerErrors: errorList.length, errorList };
    const comps = res.comps.map((o, ci) => {
      const comp = P.compositions[ci], ex = o.extra, st = rep.compositions[ci], art = artistic(ci, comp, ex, t), tec = technical(ci, o, ctx, t), crit = [];
      const push = (id, axis) => crit.push({ id, axis, note: t.critical[id] });
      const drawing = comp.layers.filter(L => L.on !== false && L.type !== 'bg' && L.type !== 'post');
      const declaredStill = drawing.length > 0 && drawing.every(L => L.temporal && (L.temporal.behavior === 'still' || L.temporal.behavior === 'hold'));
      if (o.raw.coverage < 0.002 && o.raw.p99 < 0.1) push('EMPTY', 'structural');
      if (o.raw.dead > 0.9 && !declaredStill) push('FROZEN', 'structural');
      if (o.raw.seamJump && P.time.loop) push('SEAM_POP', 'technical');
      if (!det[ci]) push('NONDETERMINISTIC', 'technical');
      if (errorList.length) push('LAYER_ERROR', 'technical');
      if (!flash[ci].pass) push('FLASH_HAZARD', 'technical');
      if (val[ci].some(x => x.lvl === 'ERROR')) push('EXPORT_BLOCKER', 'technical');
      const it = id => art.items.find(i => i.id === id);
      if (it('palette').judged && it('palette').raw.fit < 0.25) push('PALETTE_IGNORED', 'artistic');
      if (it('negative').judged && it('negative').raw.ratio > 1.0) push('NEGATIVE_SPACE_FILLED', 'artistic');
      if (it('focal').judged && it('focal').raw.dist > 0.5) push('FOCUS_LOST', 'artistic');
      const axes = [st.total, art.score, tec.score].filter(v => v != null);
      const verdict = crit.length ? 'FAIL' : Math.min(...axes) < 60 ? 'REVIEW' : 'PASS';
      return { index: ci, name: comp.name, verdict, critical: crit, structural: { total: st.total, score: st.score, notes: st.notes, raw: st.raw }, artistic: art, technical: tec };
    });
    const worst = comps.some(c => c.verdict === 'FAIL') ? 'FAIL' : comps.some(c => c.verdict === 'REVIEW') ? 'REVIEW' : 'PASS';
    return { lang: lg, loopFrames: LF, verdict: worst, labels: t.axes, unjudged: t.unjudged, weights: rep.weights, compositions: comps };
  }
  return { run };
})();
