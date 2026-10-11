/* Semântica de áudio (fase 10): porta de skill/ai-vj-generator/scripts/audio_semantics.py. Toda camada declara um comportamento temporal; só algumas ouvem o áudio.
   Comportamentos (registry/audio.json): still, drift, beat (não ouvem: o áudio nunca chega à camada) e follow, accent, section (ouvem as bandas que declaram).
   A estratégia dá o orçamento de camadas que ouvem (none 0, subtle 1, structural 2, rhythmic 3, full 3) e quem conta cada história: o herói os graves, a estrutura os médios,
   um campo de chão os agudos, a marca de evento os golpes. O motor respeita a declaração (state/pass: a camada que não ouve não recebe banda nenhuma) e o validador confere.
   O instrumento é o medidor e fica fora do orçamento. Dados: registry/audio.json, copiados para app/audio-sem-data.js por node scripts/registry.mjs --write.
   Python e navegador dão as mesmas declarações (scripts/audio_check.mjs). Depende de ANIMATION (tierOf) só em tempo de execução: embutido depois do ANIMATION.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const AUDIOSEM = (() => {
  const D = AUDIOSEM_DATA, B = D.behaviors, DEFAULT_AUDIO = 0.5;
  const reactive = b => !!(B[b] && B[b].reactive);
  function tierOf(L) {
    if (L.type === 'bg') return 'background';
    if (L.type === 'instrument') return 'instrument';
    if (L.type === 'post') return 'finish';
    const t = ANIMATION.tierOf(L); if (t) return t;
    const role = String(L.role || '').trim().toLowerCase();
    for (const key of Object.keys(D.tiers)) if (role.startsWith(key)) return D.tiers[key];
    return null;
  }
  const reason = (b, tier) => D.reasons[b + '.' + tier] || D.reasons[b] || B[b].description;
  function declare(layers, strategy, archetype) {
    strategy = strategy || 'rhythmic';
    const plan = D.plan[strategy] || D.plan.rhythmic, slotOf = new Map();
    for (const slot of plan) for (const L of layers) if (L.on !== false && !slotOf.has(L) && tierOf(L) === slot.tier) { slotOf.set(L, slot); break; }
    const rows = [];
    for (const L of layers) {
      const tier = tierOf(L), slot = slotOf.get(L); let behavior, listens;
      if (tier === 'background') { behavior = D.background; listens = []; }
      else if (tier === 'instrument') { behavior = D.instrument.behavior; listens = D.instrument.listens.slice(); }
      else if (slot) { const acc = slot.accent && D.accentArchetypes.includes(archetype) ? slot.accent : null; behavior = acc || slot.behavior; listens = (acc ? slot.accentListens : slot.listens).slice(); }
      else { behavior = D.fallback[tier] || 'drift'; listens = []; }
      L.temporal = { behavior, listens, reason: reason(behavior, tier) };
      L.p = L.p || {}; const p = L.p;
      if (reactive(behavior)) { if (L.type !== 'shader' && L.type !== 'instrument' && !(typeof p.audio === 'number' && p.audio > 0)) p.audio = DEFAULT_AUDIO; }
      else if ('audio' in p) delete p.audio;
      rows.push({ name: L.name === undefined ? null : L.name, tier: tier || 'other', behavior, listens });
    }
    let n = 0; layers.forEach((L, i) => { if (reactive(rows[i].behavior) && !D.exempt.includes(rows[i].tier) && L.on !== false) n++; });
    return { version: 1, strategy, budget: D.budget[strategy] === undefined ? 3 : D.budget[strategy], archetype: archetype === undefined ? null : archetype, reactive: n, layers: rows };
  }
  /* estado do portão de uma camada: null = sem declaração (projeto antigo: regra antiga); senão { open, allow } com as classes que passam */
  function state(tp) {
    if (!tp || !B[tp.behavior]) return null;
    return { open: reactive(tp.behavior), allow: new Set(reactive(tp.behavior) && Array.isArray(tp.listens) ? tp.listens : []) };
  }
  const INSTANT = ['bass', 'mid', 'high', 'rms', 'hit', 'kick', 'onset', 'flux', 'mhit', 'hhit', 'pres'];
  /* zera as bandas instantâneas fora do que a camada declara ouvir; os tempos integrados (bt, mt, ht, at) e as ondas do BPM seguem: movimento sem reação */
  function mask(bands, st) {
    if (!st) return bands;
    for (const k of INSTANT) if (!(st.open && st.allow.has(D.sources[k]))) bands[k] = 0;
    return bands;
  }
  function audit(layers, strategy) {
    const e = [], w = [], budget = D.budget[strategy] === undefined ? 3 : D.budget[strategy]; let n = 0;
    for (const L of layers) {
      if (L.on === false) continue;
      const tp = L.temporal, nm = L.name || L.type;
      if (tp === undefined || tp === null) { if (L.type !== 'bg') w.push(`${nm}: sem declaração temporal`); continue; }
      if (typeof tp !== 'object' || !B[tp.behavior]) { e.push(`${nm}.temporal.behavior inválido`); continue; }
      const ls = tp.listens === undefined ? [] : tp.listens;
      if (!Array.isArray(ls) || ls.some(c => !D.classes.includes(c))) { e.push(`${nm}.temporal.listens inválido`); continue; }
      if (reactive(tp.behavior)) { if (!ls.length) e.push(`${nm}: ${tp.behavior} ouve o áudio e precisa de listens`); if (!D.exempt.includes(L.type)) n++; }
      else if (ls.length) e.push(`${nm}: ${tp.behavior} não ouve o áudio mas declara listens`);
    }
    if (n > budget) e.push(`${n} camadas ouvem o áudio e a estratégia ${strategy} permite ${budget}`);
    if (n > 3) e.push(`${n} camadas ouvem o áudio: no máximo 3`);
    return { errors: e, warnings: w };
  }
  return { declare, state, mask, audit, tierOf, reactive, DATA: D };
})();
