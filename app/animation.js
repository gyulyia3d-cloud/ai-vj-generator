/* Animation IR (fase 7): porta de skill/ai-vj-generator/scripts/animation_ir.py. Como as coisas se movem: o comportamento de cada camada ao longo do loop, em tempo musical.
   Lê o Creative IR (verbos e os cinco eixos de movimento), o Composition IR (as cinco fases) e o relógio (bpm, compassos, fps). Os dados (8 arquétipos de movimento, voto dos verbos,
   quem lidera e quem segue, atrasos em semicolcheias, easings, transições) vêm de registry/animation.json, copiados para app/animation-data.js por node scripts/registry.mjs --write.
   Python e navegador dão o mesmo IR (scripts/animation_check.mjs). O IR é aplicado às camadas (apply): curvas em layer.mod e atrasos em p.phase, sempre em ciclos inteiros, então o loop fecha.
   Gerador, composição e animação são independentes: trocar o arquétipo muda como as mesmas figuras, nos mesmos lugares, se movem.
   Depende de GENAI (profile, pyRound) só em tempo de execução: este módulo é embutido depois do GENAI.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const ANIMATION = (() => {
  const D = ANIMATION_DATA, ARCH = D.archetypes, AXES = ['energy', 'elasticity', 'anticipation', 'continuity', 'rhythm'];
  const R = (x, nd) => GENAI.pyRound(x, nd), r2 = x => R(x, 2), r3 = x => R(x, 3), r4 = x => R(x, 4);
  const overshoot = z => z >= 1 ? 0 : r4(Math.exp(-Math.PI * z / Math.sqrt(1 - z * z)));
  function rankArchetypes(ir, axes, forced) {
    const order = D.archetypeOrder, acc = {}; order.forEach(a => { acc[a] = 0; });
    let total = 0; for (const v of ir.visualVerbs || []) total += ir.verbScores[v];
    for (const v of ir.visualVerbs || []) for (const [a, w] of Object.entries(D.verbArchetypes[v] || {})) acc[a] += ir.verbScores[v] * w;
    const scores = {}; order.forEach(a => { scores[a] = total ? D.weights.verb * acc[a] / total : 0; });
    let ranked = order.filter(a => scores[a] > 0).sort((a, b) => (scores[b] - scores[a]) || (order.indexOf(a) - order.indexOf(b)));
    if (!ranked.length) { const fb = D.fallback; ranked = [axes.continuity < 0.5 ? fb.stepped : axes.elasticity >= 0.3 ? fb.springy : fb.smooth]; }
    if (forced && ARCH[forced]) ranked = [forced].concat(ranked.filter(a => a !== forced));
    return ranked;
  }
  const cyclesOf = (rule, prof, bars) => rule === 'profile' ? prof.cycles : rule === 'one' ? 1 : rule === 'bar' ? Math.trunc(bars) : Math.max(1, Math.trunc(bars / 2));
  const adjust = (prof, a, cycles) => ({ zeta: Math.max(prof.zeta, a.zetaMin), wn: prof.wn, ta: r4(prof.ta * a.taMul), depth: r4(prof.depth * a.taMul), steps: a.steps || prof.steps, cycles });

  function compile(brief, ir, cmp, i, axes) {
    const tm = brief.time || {}, bpm = tm.bpm === undefined ? 120 : tm.bpm, bars = tm.bars === undefined ? 4 : tm.bars, fps = (brief.surface || {}).fps === undefined ? 30 : brief.surface.fps;
    const ax = Object.assign({}, axes || ir.motion.axes), prof = GENAI.profile(ax.energy, ax.elasticity, ax.anticipation, ax.continuity, ax.rhythm, bars);
    const top = rankArchetypes(ir, ax, brief.motionArchetype).slice(0, D.weights.setSize), aid = top[i % top.length], a = ARCH[aid];
    const cyc = cyclesOf(a.cycles, prof, bars), sp = adjust(prof, a, cyc), amp = Math.max(D.weights.ampFloor, r4(prof.amp * a.ampMul));
    sp.amp = amp; sp.overshoot = overshoot(sp.zeta);
    const loopFrames = R(bars * 240 * fps / bpm), sixteenths = bars * 16, fpc = r2(loopFrames / cyc), settle = r3(Math.min(1.0, 4 / (sp.zeta * sp.wn)));
    const lag = steps => ({ steps, lag: r4(steps / sixteenths), frames: r2(steps * loopFrames / sixteenths) });
    const soft = GENAI.profile(ax.energy * 0.7, ax.elasticity * 0.5, 0, ax.continuity, ax.rhythm, 1), ssp = adjust(soft, a, cyc);
    const hStruct = { behavior: a.structure, shape: a.shape, cycles: cyc, drive: a.structure === 'counter' ? 'rot' : a.drive, amp: r4(amp * 0.5), spring: { zeta: ssp.zeta, wn: ssp.wn, ta: 0, depth: 0, steps: ssp.steps }, lag: lag(a.structure !== 'counter' ? a.lag.structure : 0) };
    const phases = cmp.temporal.phases, choreo = phases.map((ph, k) => ({ name: ph.name, at: ph.at, lead: a.phaseLead[k], energy: ph.motion, transition: a.transition }));
    const events = D.events.map(ev => { const beat = R(ev.phase / 5 * bars * 4); return { name: ev.name, phase: phases[ev.phase].name, beat, at: r4(beat / (bars * 4)) }; });
    return {
      version: 1, archetype: aid, archetypeSet: top, axes: Object.fromEntries(AXES.map(k => [k, ax[k]])),
      timing: { bpm, bars, fps, loopFrames, cyclesPerLoop: cyc, framesPerCycle: fpc, beatsPerCycle: r3(bars * 4 / cyc), sixteenthFrames: r2(loopFrames / sixteenths) },
      easing: { id: a.easing, description: D.easings[a.easing] },
      spring: sp,
      anticipation: { fraction: sp.ta, frames: r2(sp.ta * fpc) },
      settle: { fraction: settle, frames: r2(settle * fpc) },
      hold: a.hold,
      hierarchy: {
        hero: { behavior: 'lead', shape: a.shape, cycles: cyc, drive: a.drive, amp, spring: { zeta: sp.zeta, wn: sp.wn, ta: sp.ta, depth: sp.depth, steps: sp.steps }, lag: lag(0) },
        structure: hStruct,
        ground: { behavior: a.ground, lag: lag(a.lag.ground) },
        instrument: { behavior: 'accent' },
        text: { behavior: 'reveal' },
      },
      choreography: choreo, events,
      transitions: { phases: a.transition, description: D.transitions[a.transition] },
      loop: { closes: true, wholeCycles: true, seamless: true },
      description: a.description,
    };
  }
  /* hero e estrutura como no Composition IR; chão = os campos de shader (nome CAMPO / ATMOSFERA, ou role que começa com ground / atmosphere) */
  function tierOf(L) {
    const nm = String(L.name || '').toUpperCase(), role = String(L.role || '').trim().toLowerCase();
    if (nm.startsWith('HER') || role.startsWith('hero')) return 'hero';
    if (nm.startsWith('ESTRUTURA') || role.startsWith('structure')) return 'structure';
    if (D.groundTypes.includes(L.type) && (nm.startsWith('CAMPO') || nm.startsWith('ATMOSFERA') || role.startsWith('ground') || role.startsWith('atmosphere'))) return 'ground';
    return null;
  }
  function makeMod(key, spec, rotSign) {
    const mode = key === 'rot' ? 'add' : 'mul', lo = key === 'rot' ? 0 : 1.0, hi = key === 'rot' ? 360 * rotSign : r4(1.0 + spec.amp);
    if (spec.shape === 'spring') {
      const sp = spec.spring, m = { k: key, src: 'lfo', shape: 'spring', cycles: spec.cycles, zeta: sp.zeta, wn: sp.wn, min: lo, max: hi, mode };
      if (sp.ta) { m.ta = sp.ta; m.depth = sp.depth; }
      if (sp.steps) m.steps = sp.steps;
      return m;
    }
    return { k: key, src: 'lfo', shape: spec.shape, cycles: spec.cycles, min: lo, max: hi, mode };
  }
  const own = (m, keys) => m.src === 'lfo' && m.shape !== 'env' && keys.includes(m.k);
  function apply(layers, an) {
    const H = an.hierarchy; let heroType = null;
    for (const L of layers) if (tierOf(L) === 'hero') { heroType = L.type; break; }
    for (const L of layers) {
      const t = L.type, tier = tierOf(L);
      if (tier !== 'hero' && tier !== 'structure' && tier !== 'ground') continue;
      L.p = L.p || {}; const p = L.p;
      if (tier === 'ground') { if (H.ground.lag.lag > 0) p.phase = H.ground.lag.lag; continue; }
      if (!Array.isArray(L.mod)) L.mod = [];
      const spec = H[tier], tgt = (tier === 'hero' ? D.heroTarget : D.structTarget)[t], key = spec.drive === 'rot' ? 'rot' : tgt;
      L.mod = L.mod.filter(m => !own(m, [tgt, 'rot']));
      if (tier === 'structure' && spec.behavior === 'hold') continue;
      if (tier === 'structure' && spec.behavior === 'follow' && t === heroType) continue;
      if (key === undefined || key === null) continue;
      if (key === 'rot') { if (p.rot === undefined) p.rot = 0; }
      else if (!(key in p)) p[key] = (t === 'shape' && key === 'size') ? D.shapeSizeDefault : D.targetDefault[key];
      L.mod.push(makeMod(key, spec, spec.behavior === 'counter' ? -1 : 1));
      if (tier === 'structure' && spec.lag.lag > 0) p.phase = spec.lag.lag;
    }
    return layers;
  }
  return { compile, apply, rankArchetypes, tierOf, makeMod, DATA: D };
})();
