/* Creative IR (fase 5): porta de skill/ai-vj-generator/scripts/creative_ir.py. Compila a intenção do briefing num plano estruturado antes de escolher qualquer gerador:
   briefing -> requisitos -> conceito -> verbos visuais -> motivos -> estratégia de composição e animação -> famílias de gerador -> faixas de parâmetro.
   Os dados (32 verbos, 16 conceitos, pesos de humor, arcos) vêm de registry/creative.json (copiados para app/creative-data.js por node scripts/registry.mjs --write).
   O conceito pesa 3 vezes mais que o humor: só o humor nunca decide os geradores. Python e navegador dão o mesmo IR (scripts/creative_check.mjs).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const CREATIVE = (() => {
  const D = CREATIVE_DATA, W = D.weights, VERBS = {}, VORDER = {};
  D.verbs.forEach((v, i) => { VERBS[v.id] = v; VORDER[v.id] = i; });
  const pyRound = (x, nd = 0) => {
    if (!isFinite(x)) return x;
    const neg = x < 0, a = Math.abs(x), full = a.toFixed(100), dot = full.indexOf('.'), tail = full.slice(dot + 1 + nd);
    let out;
    if (/^50*$/.test(tail)) { const head = full.slice(0, dot + 1 + nd).replace(/\.$/, ''), last = +head.replace('.', '').slice(-1); out = last % 2 === 0 ? head : (a + Math.pow(10, -nd) / 2).toFixed(nd); }
    else out = a.toFixed(nd);
    const v = Number(out);
    return neg ? -v : v;
  };
  const norm = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
  const tokens = s => norm(s).split(/[^a-z0-9]+/).filter(Boolean);
  const rank = (scores, order) => Object.keys(scores).filter(k => scores[k] > 0).sort((a, b) => (scores[b] - scores[a]) || (order.indexOf(a) - order.indexOf(b)));
  const pad = (picked, order, n) => { const out = picked.slice(0, n); for (const k of order) { if (out.length >= n) break; if (!out.includes(k)) out.push(k); } return out; };

  function compile(brief) {
    const text = String(brief.concept || '') + ' ' + (typeof brief.focalEvent === 'string' ? brief.focalEvent : ''), toks = tokens(text), matched = [];
    for (const c of D.concepts) { const hits = c.stems.filter(stem => toks.some(t => t.startsWith(stem))).length; if (hits) matched.push([c, Math.min(3, hits)]); }
    const explicit = []; for (const v of brief.verbs || []) if (VERBS[v] && !explicit.includes(v)) explicit.push(v);
    const scores = {}, add = (v, n) => { scores[v] = (scores[v] || 0) + n; };
    for (const [c, s] of matched) for (const [v, w] of Object.entries(c.verbs)) add(v, s * w * W.concept);
    for (const v of explicit) add(v, W.explicitVerb);
    for (const m of (brief.mood || []).slice(0, 3)) for (const [v, w] of Object.entries(D.moods[m] || {})) add(v, w);
    const drives = matched.length > 0 || explicit.length > 0, order = Object.keys(VORDER), top = rank(scores, order).slice(0, W.topVerbs);
    let total = 0; for (const v of top) total += scores[v];
    let concept = null;
    if (matched.length) { const cid = D.concepts.map(c => c.id); concept = matched.slice().sort((a, b) => (b[1] - a[1]) || (cid.indexOf(a[0].id) - cid.indexOf(b[0].id)))[0][0].id; }
    const mean = f => { let acc = 0; for (const v of top) acc += scores[v] * f(VERBS[v]); return acc / total; };
    const ir = { version: 1, drives, concept, concepts: matched.map(([c]) => c.id), visualVerbs: top, verbScores: Object.fromEntries(top.map(v => [v, scores[v]])) };
    const fam = {}, shd = {}, stc = {};
    for (const t of D.heroTypes) { let a = 0; for (const v of top) a += scores[v] * (VERBS[v].families[t] || 0); fam[t] = a; }
    for (const p of D.shaderOrder) { let a = 0; for (const v of top) { const i = VERBS[v].shaders.indexOf(p); if (i >= 0) a += scores[v] * (VERBS[v].shaders.length - i); } shd[p] = a; }
    for (const t of D.structureOrder) { let a = 0; for (const v of top) { const i = VERBS[v].structure.indexOf(t); if (i >= 0) a += scores[v] * (VERBS[v].structure.length - i); } stc[t] = a; }
    ir.hierarchy = { hero: pad(rank(fam, D.heroTypes), D.heroTypes, 3), structure: pad(rank(stc, D.structureOrder), D.structureOrder, 2), ground: pad(rank(shd, D.shaderOrder), D.shaderOrder, 3) };
    if (top.length) {
      const mot = top.map(v => VERBS[v].motif); ir.visualMotifs = mot.filter((m, i) => !mot.slice(0, i).includes(m));
      const axes = {}; for (const k of ['energy', 'elasticity', 'anticipation', 'continuity', 'rhythm']) axes[k] = pyRound(mean(v => v.axes[k]), 3);
      ir.motion = { axes }; ir.density = pyRound(mean(v => v.density), 2); ir.rhythm = axes.rhythm;
      const tally = {}; for (const v of top) tally[VERBS[v].scale] = (tally[VERBS[v].scale] || 0) + scores[v];
      const SC = ['large', 'medium', 'small']; ir.scale = Object.keys(tally).sort((a, b) => (tally[b] - tally[a]) || (SC.indexOf(a) - SC.indexOf(b)))[0];
      const arc = D.arcs[VERBS[top[0]].arc]; ir.arc = { id: VERBS[top[0]].arc, sequence: arc.sequence.slice(), energy: arc.energy.slice(), description: arc.description };
      const two = top.slice(0, 2);
      ir.spatialBehavior = two.map(v => VERBS[v].spatial).join('; '); ir.temporalBehavior = arc.description + '; ' + VERBS[top[0]].temporal;
      ir.materialBehavior = two.map(v => VERBS[v].material).join('; '); ir.audioRole = VERBS[top[0]].audio;
      ir.compositionStrategy = two.map(v => VERBS[v].composition).join('; '); ir.animationStrategy = two.map(v => VERBS[v].motion + ' (' + VERBS[v].transition + ')').join('; ');
    } else {
      Object.assign(ir, { visualMotifs: [], motion: { axes: { energy: 0.5, elasticity: 0.3, anticipation: 0.3, continuity: 0.8, rhythm: 0.3 } }, density: 1.0, rhythm: 0.3, scale: 'medium',
        arc: { id: null, sequence: ['ESTABLISH', 'BUILD', 'PEAK', 'RELEASE', 'TURN', 'CODA'], energy: [0.4, 0.7, 1.0, 0.5, 0.8, 0.3], description: 'establish, build, peak, release' },
        spatialBehavior: '', temporalBehavior: '', materialBehavior: '', audioRole: '', compositionStrategy: '', animationStrategy: '' });
    }
    ir.audienceEffect = String(brief.audienceEffect || String(brief.concept || '').trim().slice(0, 140));
    ir.semioticIntent = `${concept || 'mood'}: ` + top.join(' + ');
    const banned = brief.banned || []; ir.forbiddenMotifs = Array.isArray(banned) ? banned.slice() : [String(banned)];
    ir.novelty = null; ir.colorLogic = '';
    return ir;
  }
  return { compile, VERBS, DATA: D, tokens, norm };
})();
