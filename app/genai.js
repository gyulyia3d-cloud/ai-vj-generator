/* Gerador sem IA (fase 3): porta de skill/ai-vj-generator/scripts/brief_to_project.py + motion_profiles.py.
   Mesmo brief, mesmo projeto, no navegador, sem Python e sem IA. A paridade com o Python é testada por scripts/genai_check.mjs (12 climas + a galeria).
   Edite este arquivo, não o trecho embutido em app/index.html: node scripts/embed-genai.mjs reembute (e --check confere). */
const GENAI = (() => {
  const SPEC_BARS = [1, 2, 4, 8, 16, 32], MOOD_NAMES = ['industrial', 'organic', 'cosmic', 'urban', 'ritual', 'glitch', 'minimal', 'liquid', 'crystalline', 'retro', 'aggressive', 'calm'];
  /* Python round(): o valor binário exato arredondado ao decimal mais próximo, empate exato para o par (0.125 -> 0.12, 2.5 -> 2).
     toFixed já arredonda o valor exato; só o empate exato precisa de tratamento (ele sobe no JS e vai para o par no Python). */
  const pyRound = (x, nd = 0) => {
    if (!isFinite(x)) return x;
    const neg = x < 0, a = Math.abs(x), full = a.toFixed(100), dot = full.indexOf('.'), tail = full.slice(dot + 1 + nd);
    let out;
    if (/^50*$/.test(tail)) { const head = full.slice(0, dot + 1 + nd).replace(/\.$/, ''), last = +head.replace('.', '').slice(-1); out = last % 2 === 0 ? head : (a + Math.pow(10, -nd) / 2).toFixed(nd); }
    else out = a.toFixed(nd);
    const v = Number(out);
    return neg ? -v : v;
  };
  const clamp01 = x => x < 0 ? 0 : x > 1 ? 1 : x;
  const crc32 = str => { const b = new TextEncoder().encode(str); let c, crc = 0xFFFFFFFF; for (let n = 0; n < b.length; n++) { c = (crc ^ b[n]) & 0xFF; for (let k = 0; k < 8; k++) c = c & 1 ? (c >>> 1) ^ 0xEDB88320 : c >>> 1; crc = (crc >>> 8) ^ c; } return (crc ^ 0xFFFFFFFF) >>> 0; };
  const clone = o => JSON.parse(JSON.stringify(o));

  /* ---- perfis de movimento (motion_profiles.py) ---- */
  const AXES = ['energy', 'elasticity', 'anticipation', 'continuity', 'rhythm'], PER_BAR = [1, 2, 4, 8];
  const MOOD_MOTION = { industrial: [0.15, 0.10, 0.15, 0.55], organic: [0.55, 0.55, 1.00, 0.20], cosmic: [0.40, 0.30, 1.00, 0.10], urban: [0.20, 0.25, 0.20, 0.60], ritual: [0.30, 0.65, 0.90, 0.15], glitch: [0.05, 0.00, 0.05, 0.90],
    minimal: [0.10, 0.20, 1.00, 0.10], liquid: [0.70, 0.40, 1.00, 0.25], crystalline: [0.10, 0.10, 0.25, 0.50], retro: [0.10, 0.05, 0.10, 0.60], aggressive: [0.35, 0.50, 0.10, 0.85], calm: [0.45, 0.35, 1.00, 0.05] };
  const overshoot = z => z >= 1 ? 0 : pyRound(Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)), 4);
  function profile(energy = 0.5, elasticity = 0.3, anticipation = 0.3, continuity = 0.8, rhythm = 0.3, bars = 4) {
    const [e, el, an, co, rh] = [energy, elasticity, anticipation, continuity, rhythm].map(v => clamp01(+v));
    const zeta = pyRound(1.0 - 0.88 * el, 4), wn = pyRound(7.0 + 11.0 * e, 3), ta = pyRound(0.14 * an, 4), depth = pyRound(0.30 * an, 4);
    const steps = co >= 0.85 ? 0 : pyRound(4 + 28 * co), perBar = PER_BAR[Math.min(3, pyRound(rh * 3))], cycles = Math.max(1, Math.trunc(bars) * perBar), amp = pyRound(0.10 + 0.50 * e, 4);
    return { zeta, wn, ta, depth, steps, cycles, amp, overshoot: overshoot(zeta), axes: { energy: e, elasticity: el, anticipation: an, continuity: co, rhythm: rh } };
  }
  function toMod(prof, k, mode = 'mul', amp = null) {
    const a = amp == null ? prof.amp : amp, [lo, hi] = mode === 'mul' ? [1.0, pyRound(1.0 + a, 4)] : [0.0, pyRound(a, 4)];
    const m = { k, src: 'lfo', shape: 'spring', cycles: prof.cycles, zeta: prof.zeta, wn: prof.wn, min: lo, max: hi, mode };
    if (prof.ta) { m.ta = prof.ta; m.depth = prof.depth; }
    if (prof.steps) m.steps = prof.steps;
    return m;
  }
  const moodProfile = (mood, energy, bars) => { const [el, an, co, rh] = MOOD_MOTION[mood] || [0.30, 0.30, 0.80, 0.30]; return profile(energy, el, an, co, rh, bars); };

  /* ---- tabelas do gerador (brief_to_project.py) ---- */
  const MOODS = {
    industrial: { hue: 250, scheme: 'analogous', motion: 'step', info: true, why: 'cold steel and signal blue',
      hero: [['tunnel', { shape: 'rect', count: 14, cycles: 1 }], ['lines', { dir: 'v', count: 36, weight: 3, stepped: true }], ['bitfield', { form: 5, cell: 18, levels: 2 }]],
      shader: ['GRADE SDF', 'FAIXAS', 'INTERFERÊNCIA'], structure: [['structure', { grid: 120 }], ['lines', { dir: 'h', count: 18, weight: 2 }]] },
    organic: { hue: 145, scheme: 'analogous', motion: 'smooth', info: false, why: 'living green, soft growth',
      hero: [['organism', { size: 1.1, points: 2400 }], ['sim', { kind: 'reaction', feed: 0.037, kill: 0.06 }], ['flow', { count: 900, trail: 10 }]],
      shader: ['CAMPO FBM', 'FLUXO WARP', 'CÉLULAS'], structure: [['shape', { kind: 'ring', layout: 'radial', count: 12, size: 90, spread: 300 }], ['lines', { dir: 'd', count: 20, weight: 1.5 }]] },
    cosmic: { hue: 290, scheme: 'split', motion: 'smooth', info: true, why: 'deep violet and a cold accent',
      hero: [['organism', { size: 1.3, points: 3600, dot: 0.8 }], ['sim', { kind: 'ink', dissipate: 0.998 }], ['flow', { count: 1400, trail: 14, amp: 0.2 }]],
      shader: ['KALEIDO', 'CAMPO FBM', 'ANÉIS SDF'], structure: [['tunnel', { shape: 'circle', count: 10, cycles: 1 }], ['shape', { kind: 'circle', layout: 'radial', count: 24, size: 14, spread: 380 }]] },
    urban: { hue: 60, scheme: 'complement', motion: 'step', info: true, why: 'sodium yellow against dark asphalt',
      hero: [['typewall', { rows: 3, weight: 800 }], ['lines', { dir: 'h', count: 22, weight: 8, stepped: true }], ['tunnel', { shape: 'rect', count: 9 }]],
      shader: ['FAIXAS', 'GRADE SDF', 'CÉLULAS'], structure: [['structure', { grid: 90 }], ['lines', { dir: 'v', count: 14, weight: 4 }]] },
    ritual: { hue: 25, scheme: 'mono', motion: 'smooth', info: false, why: 'ember and bone, a single warm family',
      hero: [['tunnel', { shape: 'circle', count: 12, cycles: 1, weight: 4 }], ['organism', { size: 1.0 }], ['shape', { kind: 'ring', layout: 'radial', count: 8, size: 150, spread: 260 }]],
      shader: ['ANÉIS SDF', 'KALEIDO', 'CAMPO FBM'], structure: [['shape', { kind: 'hex', layout: 'radial', count: 6, size: 120, spread: 330 }], ['lines', { dir: 'd', count: 16, weight: 2 }]] },
    glitch: { hue: 330, scheme: 'triad', motion: 'step', info: true, why: 'magenta fault lines on black',
      hero: [['bitfield', { form: 3, cell: 12, levels: 4 }], ['lines', { dir: 'v', count: 60, weight: 2, stepped: true }], ['typewall', { rows: 2, weight: 900 }]],
      shader: ['FAIXAS', 'INTERFERÊNCIA', 'GRADE SDF'], structure: [['structure', { grid: 60 }], ['shape', { kind: 'square', layout: 'grid', count: 48, size: 30, spread: 520 }]] },
    minimal: { hue: 230, scheme: 'mono', motion: 'smooth', info: false, why: 'one cool hue, large quiet fields',
      hero: [['shape', { kind: 'circle', layout: 'single', size: 220 }], ['lines', { dir: 'h', count: 8, weight: 2 }], ['tunnel', { shape: 'circle', count: 5, weight: 10 }]],
      shader: ['CAMPO FBM', 'FAIXAS', 'ANÉIS SDF'], structure: [['lines', { dir: 'v', count: 5, weight: 1.5 }], ['shape', { kind: 'line', layout: 'linear', count: 3, size: 400 }]] },
    liquid: { hue: 205, scheme: 'analogous', motion: 'smooth', info: false, why: 'water cyan sliding into deep blue',
      hero: [['sim', { kind: 'ink', flow: 1.4 }], ['flow', { count: 1100, trail: 18, amp: 0.16 }], ['organism', { size: 0.9, breathe: 0.9 }]],
      shader: ['FLUXO WARP', 'CAMPO FBM', 'INTERFERÊNCIA'], structure: [['lines', { dir: 'd', count: 14, weight: 2 }], ['shape', { kind: 'ring', layout: 'radial', count: 7, size: 110, spread: 280 }]] },
    crystalline: { hue: 190, scheme: 'split', motion: 'step', info: true, why: 'ice cyan, hard facets',
      hero: [['tunnel', { shape: 'hex', count: 12 }], ['bitfield', { form: 6, cell: 16 }], ['lines', { dir: 'd', count: 30, weight: 2 }]],
      shader: ['CÉLULAS', 'KALEIDO', 'GRADE SDF'], structure: [['structure', { grid: 100, spiral: false }], ['shape', { kind: 'triangle', layout: 'radial', count: 9, size: 100, spread: 340 }]] },
    retro: { hue: 140, scheme: 'mono', motion: 'step', info: true, why: 'phosphor green, scanline texture',
      hero: [['data', { rows: 40 }], ['lines', { dir: 'h', count: 40, weight: 2, stepped: true }], ['bitfield', { form: 1, cell: 10 }]],
      shader: ['INTERFERÊNCIA', 'FAIXAS', 'GRADE SDF'], structure: [['structure', { grid: 80 }], ['hud', {}]] },
    aggressive: { hue: 28, scheme: 'complement', motion: 'step', info: true, why: 'alarm orange against cold black',
      hero: [['typewall', { rows: 2, weight: 900, outline: 'alt' }], ['tunnel', { shape: 'rect', count: 16, pulseAmt: 2 }], ['lines', { dir: 'v', count: 24, weight: 10, stepped: true }]],
      shader: ['FAIXAS', 'GRADE SDF', 'INTERFERÊNCIA'], structure: [['structure', { grid: 140 }], ['shape', { kind: 'cross', layout: 'grid', count: 24, size: 40, spread: 500 }]] },
    calm: { hue: 215, scheme: 'analogous', motion: 'smooth', info: false, why: 'slow blue, long breaths',
      hero: [['sim', { kind: 'ink', flow: 0.6 }], ['organism', { size: 1.0, spin: 0.4 }], ['flow', { count: 500, trail: 24, amp: 0.08 }]],
      shader: ['CAMPO FBM', 'FLUXO WARP', 'ANÉIS SDF'], structure: [['shape', { kind: 'ring', layout: 'single', size: 260 }], ['lines', { dir: 'h', count: 6, weight: 1.5 }]] },
  };
  /* primeiro exemplar de cada tipo de gerador entre todos os climas, na ordem da tabela: parâmetros de partida quando o conceito escolhe um tipo que o clima não tem */
  const POOL_HERO = {}, POOL_STRUCT = {};
  for (const mm of Object.values(MOODS)) { for (const [t, pp] of mm.hero) if (!(t in POOL_HERO)) POOL_HERO[t] = pp; for (const [t, pp] of mm.structure) if (!(t in POOL_STRUCT)) POOL_STRUCT[t] = pp; }
  POOL_STRUCT.structure = POOL_STRUCT.structure || { grid: 100 };
  /* fase 8: campo e glifos não estão em nenhuma tabela de humor; entram só pelo conceito (verbos) */
  POOL_HERO.field = { kind: 'ISOLINHAS' }; POOL_HERO.glyphs = { source: 'noise', cell: 18 };
  const pickBy = (ir, map, i, dflt) => ir.visualVerbs.length ? (map[ir.visualVerbs[i % ir.visualVerbs.length]] || dflt) : dflt;
  /* a rampa dos glifos vem do título: ' ' + as letras sem repetir, na ordem em que aparecem */
  const glyphRamp = brief => { const t = Array.from(String((brief.text || {}).title || '').toUpperCase().replace(/\s+/g, '')), u = []; for (const ch of t) if (!u.includes(ch)) u.push(ch); return u.length ? ' ' + u.join('') : null; };
  const QUIET = { 'GRADE SDF': [5, 1, 0.3, 0.06], FAIXAS: [8, 1, 0.35, 0.15], 'INTERFERÊNCIA': [6, 1, 0.25, 0.3], 'CÉLULAS': [4, 1, 0.25, 0.08], 'ANÉIS SDF': [6, 1, 0.2, 0.35], KALEIDO: [6, 2.5, 0.4, 0.3], 'CAMPO FBM': [1.6, 0.5, 0.7, 1.0], 'FLUXO WARP': [1.2, 0.8, 0.4, 1.0] };
  const INSTR = { low: ['rings', 'radar', 'scope'], high: ['bars', 'radial', 'heat'] };
  const ARC = ['ESTABLISH', 'BUILD', 'PEAK', 'RELEASE', 'TURN', 'CODA'], ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
  const ARCH = { led: 'stage-led', projection: 'facade-mapping', mapping: 'installation', multi: 'led-architecture', screen: 'clip-pack' };
  const HERO_TARGET = { tunnel: 'size', lines: 'weight', shape: 'size', organism: 'breathe', flow: 'amp', typewall: 'fill', field: 'gain', glyphs: 'gain' }, STRUCT_TARGET = { tunnel: 'size', lines: 'weight', shape: 'size' };
  const TARGET_DEFAULT = { size: 1, weight: 2, breathe: 0.5, amp: 0.12, fill: 0.82, gain: 1 };
  const AUDIO_LINE = { none: 'the picture ignores the music.', subtle: 'the music only breathes the ground.', structural: 'the music drives structure and scale, never every hit.', rhythmic: 'kick drives the hero, hats drive the structure, at most three reactive layers.', full: 'the music drives most layers; the instrument layer shows the signal.' };
  const tension = e => e < 0.35 ? 'relaxed' : (e < 0.7 ? 'balanced' : 'assertive');

  function palette(brief, mood) {
    const pal = brief.palette || {}, surf = (brief.surface || {}).type || 'screen';
    if (pal.colors && pal.colors.length) { const [bg, primary, secondary, accent] = pal.colors; return [{ bg, primary, secondary, accent }, 'exact colours supplied in the brief']; }
    const hue = pal.hue != null ? pal.hue : (mood ? mood.hue : crc32(brief.concept) % 360), scheme = pal.scheme || (mood ? mood.scheme : 'analogous');
    const s = PAL.scheme(hue, scheme, 0.17, surf === 'led' || surf === 'multi' ? 'led' : (surf === 'projection' || surf === 'mapping' ? 'projection' : 'screen'));
    const why = mood ? mood.why : 'hue taken from the concept text';
    return [{ bg: s.bg.hex, primary: s.primary.hex, secondary: s.secondary.hex, accent: s.accent.hex }, `${scheme} scheme, OKLCH hue ${pyRound(hue)} (${why})`];
  }
  function capLines(p, W, H, share = 0.3) {
    const u = Math.min(H, W * 0.5625) / 1080, dir = p.dir == null ? 'h' : p.dir, span = dir === 'v' ? W : dir === 'h' ? H : Math.hypot(W, H) * 1.2;
    const cov = (p.count == null ? 24 : p.count) * (p.weight == null ? 2 : p.weight) * u / span * (1 + 0.6 * (p.pulseAmt == null ? 0.6 : p.pulseAmt));
    if (cov > share) p.count = Math.max(3, Math.trunc(p.count * share / cov));
    return p;
  }
  const layer = (t, name, role, p, opacity = 1, blend = 'normal') => { const L = { type: t, name, on: true, opacity, blend, role }; if (p !== undefined && p !== null) L.p = p; return L; };

  function buildComp(i, n, brief, mood, strat, prof, ir, cmp) {
    const e = +(brief.energy == null ? 0.5 : brief.energy); let dens = { sparse: 0.6, balanced: 1.0, dense: 1.5 }[brief.density || 'balanced'] || 1.0; const drv = !!(ir && ir.drives);
    if (drv) dens = dens * ir.density * (0.7 + 0.6 * ir.arc.energy[Math.min(i, 5)]);
    const surf = (brief.surface || {}).type || 'screen', led = ['led', 'multi', 'projection', 'mapping'].includes(surf), m = mood || MOODS.minimal;
    const moods = brief.mood || [], tag = (moods.length ? moods[i % Math.max(1, moods.length)] : 'composition').toUpperCase(), reactive = strat !== 'none';
    let [heroT, heroP] = m.hero[i % m.hero.length]; heroP = Object.assign({}, heroP);
    if (drv) { heroT = ir.hierarchy.hero[i % ir.hierarchy.hero.length]; const mine = m.hero.find(h => h[0] === heroT); heroP = Object.assign({}, mine ? mine[1] : (POOL_HERO[heroT] || {})); if (heroT === 'lines' && COMPOSITION.lineDir(cmp)) heroP.dir = COMPOSITION.lineDir(cmp);
      if (heroT === 'field') heroP.kind = pickBy(ir, CREATIVE.DATA.fieldKinds, i, 'ISOLINHAS');
      if (heroT === 'glyphs') { heroP.source = pickBy(ir, CREATIVE.DATA.glyphSources, i, 'noise'); const rp = glyphRamp(brief); if (rp) heroP.ramp = rp; } }
    let texture = null;
    if (heroT === 'bitfield') {
      texture = heroP; const alt = m.hero.filter(h => h[0] !== 'bitfield');
      [heroT, heroP] = alt.length ? alt[i % alt.length] : ['tunnel', { shape: 'rect', count: 10 }]; heroP = Object.assign({}, heroP);
    }
    if (led) {
      for (const [k, f] of [['weight', 3], ['stroke', 3]]) if (['tunnel', 'lines', 'shape'].includes(heroT) && typeof heroP[k] === 'number') heroP[k] = pyRound(heroP[k] * f, 1);
      if (heroT === 'tunnel' && heroP.weight === undefined) heroP.weight = 9;
      if (heroT === 'bitfield') heroP.cell = Math.trunc((heroP.cell == null ? 14 : heroP.cell) * 2);
    }
    for (const k of ['count', 'points', 'rows']) if (typeof heroP[k] === 'number') heroP[k] = Math.max(1, pyRound(heroP[k] * dens));
    if (reactive && !['sim', 'data', 'hud'].includes(heroT)) { heroP.audio = pyRound(0.45 + 0.4 * e, 2); heroP.band = 'bass'; }
    if (heroT === 'sim') { if (heroP.threshold === undefined) heroP.threshold = 0.5; if (heroP.soft === undefined) heroP.soft = 0.15; }
    if (heroT === 'organism') heroP.dot = Math.max(heroP.dot == null ? 1 : heroP.dot, 2.2);
    if (heroT === 'flow') { heroP.width = Math.max(heroP.width == null ? 1.2 : heroP.width, 2.4); heroP.alpha = 0.9; }
    if (heroT === 'lines') capLines(heroP, brief.surface.w, brief.surface.h, 0.1);
    const sh = drv ? ir.hierarchy.ground[i % ir.hierarchy.ground.length] : m.shader[i % m.shader.length];
    let [stT, stP] = m.structure[i % m.structure.length]; stP = Object.assign({}, stP); let stOp = 0.3;
    if (drv) { stT = ir.hierarchy.structure[i % ir.hierarchy.structure.length]; const mine = m.structure.find(s => s[0] === stT); stP = Object.assign({}, mine ? mine[1] : (POOL_STRUCT[stT] || {})); if (stT === 'lines' && COMPOSITION.lineDir(cmp)) stP.dir = COMPOSITION.lineDir(cmp); }
    if (texture !== null) { stT = 'bitfield'; stP = Object.assign({}, texture, { levels: 2 }); stOp = 0.1; }
    if (stT === 'lines') capLines(stP, brief.surface.w, brief.surface.h, 0.15);
    if (reactive && ['lines', 'structure', 'tunnel'].includes(stT) && heroT !== stT) { stP.audio = 0.5; stP.band = 'high'; }
    const kinds = INSTR[e >= 0.5 ? 'high' : 'low'], tx = brief.text || {}, words = tx.words || [], title = tx.title || '';
    const sh2 = drv ? ir.hierarchy.ground[(i + 1) % ir.hierarchy.ground.length] : m.shader[(i + 1) % m.shader.length], q1 = QUIET[sh], q2 = QUIET[sh2];
    const L = [layer('bg', 'FUNDO', 'ground colour of the piece; the quiet reference everything else is read against', { grain: led ? 0 : 0.4 })];
    L.push(layer('shader', `CAMPO ${tag} ${ROMAN[i]}`, 'ground field: slow matter that gives the figure something to cut against', { preset: sh, p1: q1[0], p2: q1[1], p3: q1[2], p4: q1[3], c1: 'secondary', c2: 'secondary', res: led ? 0.5 : 1, alphaMode: 'alpha' }, dens <= 1 ? 0.3 : 0.22));
    L.push(layer('shader', `ATMOSFERA ${ROMAN[i]}`, 'atmosphere: a second, fainter field in the accent that adds depth without competing with the hero', { preset: sh2, p1: q2[0], p2: q2[1], p3: q2[2], p4: q2[3], c1: 'accent', c2: 'accent', res: 0.5, alphaMode: 'alpha' }, dens <= 1 ? 0.12 : 0.18, 'add'));
    const heroL = layer(heroT, `HERÓI ${tag} ${ROMAN[i]}`, `hero: the single dominant figure of this composition (${brief.focalEvent != null ? brief.focalEvent : 'the focal event'})`, heroP, 1); L.push(heroL);
    if (prof && HERO_TARGET[heroT]) {
      const tk = HERO_TARGET[heroT]; if (heroP[tk] === undefined) heroP[tk] = (heroT === 'shape' && tk === 'size') ? 160 : TARGET_DEFAULT[tk];
      heroL.mod = [toMod(prof, tk)];
    }
    const stL = layer(stT, `ESTRUTURA ${ROMAN[i]}`, 'structure: the grid or rhythm the eye measures the hero against', stP, stOp); L.push(stL);
    if (prof && STRUCT_TARGET[stT] && stT !== heroT) {
      const ax = prof.axes, soft = profile(ax.energy * 0.7, ax.elasticity * 0.5, 0, ax.continuity, ax.rhythm, 1); soft.cycles = prof.cycles;
      const tk = STRUCT_TARGET[stT]; if (stP[tk] === undefined) stP[tk] = stT === 'shape' ? 160 : TARGET_DEFAULT[tk];
      stL.mod = [toMod(soft, tk, 'mul', pyRound(prof.amp * 0.5, 4))];
    }
    const kind = kinds[i % kinds.length];
    L.push(layer('instrument', `INSTRUMENTO ${ROMAN[i]}`, 'instrument: shows the real signal that drives the picture (cause and effect)', { kind, size: 0.28, cx: 0.5, cy: ['rings', 'radar', 'radial'].includes(kind) ? 0.5 : 0.86, n: 36, weight: 3 }, 0.8));
    if (words.length) L.push(layer('typewall', `PALAVRA ${ROMAN[i]}`, 'event: the exact words, one per phase, large and few', { words: words.join('|'), rows: 1, weight: 800, hit: true }, 0.9, m.motion === 'step' ? 'difference' : 'normal'));
    else if (title && (tx.caption || tx.data)) {
      const tp = { title, caption: tx.caption || '', data: tx.data || '', size: led ? 190 : 150, font: 'archivo', reveal: 'glyph', path: tx.path || 'none', cy: 0.5 };
      if (m.motion === 'step' || (prof && prof.axes.continuity < 0.5)) { tp.reveal = 'word'; tp.stagger = 0.2; }
      L.push(layer('typeset', `TIPOGRAFIA ${ROMAN[i]}`, 'event: title, caption and data as one hierarchy; reveals on the build and clears before the loop ends', tp, 0.95));
    } else if (m.info) L.push(layer('hud', `INFORMAÇÃO ${ROMAN[i]}`, 'information: small, calm, always the same place; it tells the viewer the system is alive', { title: title || String(brief.name).toUpperCase() }, 0.8));
    else L.push(layer('shape', `MARCA ${ROMAN[i]}`, 'event: one clean mark that appears on the hit and gives the loop a landmark', { kind: 'ring', layout: 'single', size: 120 + 40 * i, pulseAmt: 0.4 }, 0.9));
    L.push(layer('post', 'ACABAMENTO', 'finish: vignette and a touch of tension; scanlines only where the surface is a screen', { scan: led ? 0 : 0.2, vig: 0.35, prob: 0.1 + 0.3 * e }));
    const arc = n > 1 ? (drv ? ir.arc.sequence : ARC)[Math.min(i, ARC.length - 1)] : (drv ? ir.arc.sequence[0] : 'ESTABLISH');
    return { name: `${tag} ${ROMAN[i]}`, hypothesis: `${arc}: ${brief.concept.trim().slice(0, 140)}`, motion: prof ? (prof.axes.continuity < 0.5 ? 'step' : 'smooth') : m.motion, layers: L };
  }
  /* o conceito (Creative IR) pesa 65% nos eixos de movimento e o humor 35%; o que o brief declara em motionProfile vale mais que os dois */
  function makeProfile(brief, moodName, energy, bars, ir) {
    let p = moodProfile(moodName, energy, bars); const ov = brief.motionProfile || {}, drives = ir && ir.drives;
    if (drives || Object.keys(ov).length) {
      const ax = Object.assign({}, p.axes), c = CREATIVE.DATA.weights.conceptBlend;
      if (drives) for (const k of AXES) ax[k] = pyRound(c * ir.motion.axes[k] + (1 - c) * ax[k], 3);
      for (const k of AXES) if (ov[k] !== undefined) ax[k] = ov[k];
      p = profile(ax.energy, ax.elasticity, ax.anticipation, ax.continuity, ax.rhythm, bars);
    }
    return p;
  }
  function motionSentence(p, bars) {
    const ax = p.axes, feel = ax.continuity < 0.5 ? 'stepped, quantised to the beat grid' : 'smooth, eased';
    const ring = p.zeta >= 1 || ax.elasticity < 0.1 ? 'critically damped (no overshoot)' : `springy (zeta ${pyNum(p.zeta)}, ${pyRound(p.overshoot * 100)}% overshoot)`;
    return `Profile: ${feel}; ${ring}; ${p.ta ? 'with a wind-up dip before each hit' : 'with no wind-up'}; ${p.cycles} move(s) per loop of ${bars} bar(s), so the loop closes. Played as layer.mod spring curves (scripts/motion_profiles.py).`;
  }
  /* Python imprime float inteiro como "1.0"; em texto o número aparece como o Python o escreve (zeta é sempre fracionário aqui, mas por garantia) */
  const pyNum = x => Number.isInteger(x) ? x.toFixed(1) : String(x);

  function makeArtBible(brief, tags, contract, prof, strat, led, ir) {
    const mood = tags.join(', ') || 'minimal', tx = brief.text || {};
    return {
      thesis: brief.concept.trim().slice(0, 200),
      material: ir && ir.drives ? `Light on a dark ground (${mood}); ${ir.materialBehavior}; no fake materials, no gradients that pretend to be objects.` : `Light on a dark ground (${mood}); additive matter, no fake materials, no gradients that pretend to be objects.`,
      space: led ? 'Read from far away: heavy strokes, large forms, the hero on the focal third, information at the edge.' : "Read at arm's length: fine detail allowed, the hero on the focal third, information at the edge.",
      motion: contract.motionLanguage,
      dramaturgy: contract.temporalArc + ` Tension: ${contract.tension}; one dominant figure per composition; the ground field is the release.`,
      color: contract.colorLogic,
      typography: (tx.words && tx.words.length) || tx.title ? 'Uppercase, one family, exact words from the brief only; a calm hierarchy: title, caption at 0.4x, data at 0.16x; revealed by glyph on the build and cleared before the loop ends.' : 'No text unless the brief supplies exact words; if added: uppercase, one family, three sizes at most.',
      audio: `Strategy ${strat}: ` + AUDIO_LINE[strat],
      banned: contract.banned,
      motionProfile: Object.assign({}, prof.axes),
      density: brief.density || 'balanced',
    };
  }

  /* ---- validação do brief (o essencial de schema/brief.schema.json, com mensagens para quem não programa) ---- */
  function checkBrief(b) {
    const errs = [], num = (v, lo, hi) => typeof v === 'number' && isFinite(v) && v >= lo && v <= hi;
    if (!b || typeof b !== 'object') return ['o brief precisa ser um objeto'];
    if (typeof b.name !== 'string' || b.name.trim().length < 2) errs.push('nome: use pelo menos 2 letras');
    if (typeof b.concept !== 'string' || b.concept.trim().length < 12) errs.push('conceito: escreva uma ou duas frases (pelo menos 12 letras): sobre o que é a peça e o que o público deve sentir');
    const s = b.surface || {}; if (!Number.isInteger(s.w) || s.w < 16 || s.w > 16384) errs.push('superfície: a largura precisa estar entre 16 e 16384 px'); if (!Number.isInteger(s.h) || s.h < 16 || s.h > 16384) errs.push('superfície: a altura precisa estar entre 16 e 16384 px');
    if (s.type !== undefined && !['screen', 'led', 'projection', 'mapping', 'multi'].includes(s.type)) errs.push('superfície: tipo desconhecido');
    if (s.fps !== undefined && ![24, 25, 30, 50, 60].includes(s.fps)) errs.push('superfície: fps precisa ser 24, 25, 30, 50 ou 60');
    const t = b.time || {}; if (!num(t.bpm, 40, 240)) errs.push('tempo: o BPM precisa estar entre 40 e 240'); if (t.bars !== undefined && !SPEC_BARS.includes(t.bars)) errs.push('tempo: compassos precisam ser 1, 2, 4, 8, 16 ou 32');
    if (b.mood !== undefined && (!Array.isArray(b.mood) || b.mood.length > 3 || b.mood.some(x => !MOOD_NAMES.includes(x)))) errs.push('clima: de 0 a 3 climas da lista');
    if (b.energy !== undefined && !num(b.energy, 0, 1)) errs.push('energia: de 0 a 1');
    if (b.density !== undefined && !['sparse', 'balanced', 'dense'].includes(b.density)) errs.push('densidade: sparse, balanced ou dense');
    if (b.compositions !== undefined && !(Number.isInteger(b.compositions) && b.compositions >= 1 && b.compositions <= 6)) errs.push('composições: de 1 a 6');
    const a = b.audio && b.audio.strategy; if (a !== undefined && !['none', 'subtle', 'structural', 'rhythmic', 'full'].includes(a)) errs.push('áudio: estratégia desconhecida');
    const p = b.palette || {}; if (p.colors !== undefined && (!Array.isArray(p.colors) || p.colors.length !== 4 || p.colors.some(c => !/^#[0-9A-Fa-f]{6}$/.test(c)))) errs.push('paleta: 4 cores no formato #RRGGBB (fundo, primária, secundária, acento)');
    if (p.hue !== undefined && !num(p.hue, 0, 360)) errs.push('paleta: matiz de 0 a 360');
    return errs;
  }

  function build(brief) {
    const errs = checkBrief(brief); if (errs.length) throw new Error('o brief não é válido:\n  ' + errs.join('\n  '));
    const seed = brief.seed !== undefined ? brief.seed : crc32(brief.name) % 900000 + 1000, tags = brief.mood || [], mood = tags.length ? MOODS[tags[0]] : null;
    const [pal, colorWhy] = palette(brief, mood), sf = brief.surface, tm = brief.time, surf = sf.type || 'screen', strat = (brief.audio || {}).strategy || 'rhythmic', n = brief.compositions === undefined ? 3 : brief.compositions;
    const e = +(brief.energy == null ? 0.5 : brief.energy), bars = tm.bars === undefined ? 4 : tm.bars, led = ['led', 'multi', 'projection', 'mapping'].includes(surf);
    const ir = CREATIVE.compile(brief), drv = ir.drives; ir.colorLogic = colorWhy;
    { const mt = tags.length ? new Set(MOODS[tags[0]].hero.map(h => h[0])) : new Set(), hh = ir.hierarchy.hero; ir.novelty = tags.length ? pyRound(1 - hh.filter(t => mt.has(t)).length / hh.length, 2) : 1.0; }
    const profs = Array.from({ length: n }, (_, i) => makeProfile(brief, tags.length ? tags[i % tags.length] : null, e, bars, ir));
    const cirs = Array.from({ length: n }, (_, i) => COMPOSITION.compile(brief, ir, i));
    const anis = Array.from({ length: n }, (_, i) => ANIMATION.compile(brief, ir, cirs[i], i, profs[i].axes));
    const comps = profs.map((pr, i) => buildComp(i, n, brief, tags.length ? MOODS[tags[i % tags.length]] : null, strat, pr, ir, cirs[i])), prof0 = profs[0], pt = brief.lang === 'pt';
    const contract = {
      concept: brief.concept, audienceEffect: (pt ? 'O público deve sentir ' : 'The audience should feel ') + brief.concept.slice(0, 100),
      semioticIntent: drv ? ir.semioticIntent : `Mood ${tags.join(', ') || 'unspecified'}: ` + brief.concept.slice(0, 100),
      visualLanguage: drv ? `Concept ${ir.concept || 'from the verbs'}: verbs ${ir.visualVerbs.join(', ')}; motifs ${ir.visualMotifs.join(', ')}; one dominant figure per composition over a quiet ground.` : `Generator tiers from the mood table (${tags.join(', ') || 'minimal'}); one dominant figure per composition over a quiet ground.`,
      formLanguage: 'Forms follow the hero generator of each composition; the structure layer keeps one module and one grid.',
      materialLanguage: drv ? `Light on a dark ground: ${ir.materialBehavior}.` : 'Light on a dark ground: additive matter, no fake materials.',
      colorLogic: colorWhy + '; one accent used for events only.',
      spatialLogic: `Canvas ${sf.w}x${sf.h} (${surf}); the hero sits on the focal zone, structure on the grid, information at the edge.`,
      motionLanguage: motionSentence(prof0, bars), typographyLanguage: 'Uppercase, one family; text only when the brief supplies exact words.',
      temporalArc: drv ? `${ir.temporalBehavior}; over ${bars} bars per composition, the set follows ${ir.arc.sequence.slice(0, Math.min(n, 6)).join(', ').toLowerCase()}.` : `Each composition: establish, evolve, peak, release over ${bars} bars; the set follows ${ARC.slice(0, Math.min(n, ARC.length)).join(', ').toLowerCase()}.`,
      loopGrammar: 'cyclic: the loop closes on whole bars and every layer moves in whole cycles',
      technicalStrategy: 'Generated without AI by brief_to_project.py from the structured brief; native pixels, deterministic seed, engine generators only.',
      forbiddenShortcuts: (brief.banned || []).join(', ') || 'Do not stretch 16:9 across another aspect; no unseeded randomness; no effect without a reason in the contract.',
      focalEvent: brief.focalEvent || 'One dominant figure per composition; everything else supports or releases it.',
      releaseZone: 'The ground field and the empty third of the frame; no layer fills it.',
      banned: (brief.banned || []).join(', ') || 'shockwave rings on every hit; particle bursts; neon glow everywhere', tension: tension(e),
    };
    /* Composition IR: uma por composição; só é aplicada às camadas quando o Creative IR conduz (senão fica apenas registrada) */
    if (drv) comps.forEach((c, i) => COMPOSITION.apply(c.layers, cirs[i], sf.w, sf.h));
    /* Animation IR: uma por composição, aplicada depois da composição (curvas em layer.mod e atrasos em p.phase); só quando o Creative IR conduz */
    if (drv) { comps.forEach((c, i) => ANIMATION.apply(c.layers, anis[i])); contract.motionLanguage += ` Animation IR archetypes: ${anis.map(x => x.archetype).join(', ')} (${anis[0].description}).`; }
    const artBible = makeArtBible(brief, tags, contract, prof0, strat, led, ir);
    if (strat === 'none') contract.audioStrategyReason = (brief.audio || {}).reason || 'The brief asks for a silent, music-independent piece.';
    const spec = { archetype: [ARCH[surf] || 'clip-pack'], confirmed: { pixelMap: [sf.w, sf.h] }, assumed: [{ field: 'surface', why: "generated from the brief without AI; the facts are the brief's own", risk: 'confirm the pixel map and distances with the venue before delivery' }] };
    if (sf.pitchMm) spec.confirmed.pitchMm = sf.pitchMm; if (sf.viewingDistanceM) spec.confirmed.viewingDistanceM = sf.viewingDistanceM;
    const canvas = { w: sf.w, h: sf.h, fps: sf.fps || 30, target: ['screen', 'led', 'projection', 'mapping', 'multi'].includes(surf) ? surf : 'screen' }; if (sf.folds) canvas.folds = sf.folds;
    if (sf.regions && sf.regions.length) canvas.displays = sf.regions.map(r => { const o = {}; for (const k of ['x', 'y', 'w', 'h', 'name', 'source']) if (k in r) o[k] = r[k]; return o; });
    const id = String(brief.name).toLowerCase().split('').map(c => /[\p{L}\p{N}]/u.test(c) ? c : '-').join('').replace(/^-+|-+$/g, '') || 'project';
    return { schema: 'ai-vj-generator/2', id, seed, meta: { name: String(brief.name).toUpperCase(), lang: brief.lang || 'en', brief: brief.concept, contract, artBible, spec, creativeIR: ir, compositionIR: cirs, animationIR: anis, surfaceIR: SURFACEIR.compile(sf) }, canvas,
      time: { bpm: tm.bpm, bars, loop: true, seamless: true, mode: 'loop', transition: prof0.axes.continuity >= 0.5 ? 'fade' : 'wipe' }, audio: { reactive: strat !== 'none', sens: 1, smooth: 0.7, strategy: strat },
      palette: Object.assign({}, pal, (brief.output || {}).mode === 'white-alpha' ? { mode: 'white-alpha' } : {}), compositions: comps };
  }
  return { build, checkBrief, compileIR: CREATIVE.compile, profile, toMod, moodProfile, pyRound, crc32, MOODS: MOOD_NAMES, MOOD_TABLE: MOODS };
})();
