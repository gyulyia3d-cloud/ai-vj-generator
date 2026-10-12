/* Migração de projetos (fase 19): porta de skill/ai-vj-generator/scripts/migrate_project.py. Um projeto guarda a versão do FORMATO em meta.formatVersion (ausente = 0, projeto de antes do pipeline).
   Os passos são declarativos (registry/versions.json: `steps`, na ordem) e rodam sobre uma CÓPIA: o objeto de entrada nunca muda. Cada passo é idempotente (rodar duas vezes dá o mesmo que uma).
   Projeto de formato mais novo que o do motor não é recusado nem reescrito: abre com aviso, porque campos desconhecidos são ignorados, nunca apagados.
   Regra para as fases seguintes: mudança aditiva (campo novo com padrão) não precisa de passo; mudança que renomeia, move ou remove campo traz um passo novo em versions.json e sobe format.current.
   Python e navegador dão a mesma migração e o mesmo relatório (scripts/migrate_check.mjs). Dados: registry/versions.json, copiados para app/versions-data.js por node scripts/registry.mjs --write.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: skill/ai-vj-generator/references/migration.md */
const MIGRATE = (() => {
  const D = VERSIONS_DATA, KEY = D.format.key.split('.'), CUR = D.format.current;
  const clone = o => JSON.parse(JSON.stringify(o));
  const isObj = v => v && typeof v === 'object' && !Array.isArray(v);
  const getVer = o => { let v = o; for (const k of KEY) v = isObj(v) ? v[k] : undefined; return Number.isInteger(v) && v >= 0 ? v : D.format.unversioned; };
  const setVer = (o, n) => { if (!isObj(o.meta)) o.meta = {}; o.meta[KEY[KEY.length - 1]] = n; };
  const OPS = {
    /* capabilities[from] some e seus itens entram em capabilities[to], sem repetir */
    renameCapability(o, step, note) {
      const cap = o.capabilities; if (!isObj(cap)) return;
      for (const [from, to] of Object.entries(step.map)) {
        if (!(from in cap)) continue;
        const items = Array.isArray(cap[from]) ? cap[from] : [], dest = Array.isArray(cap[to]) ? cap[to] : [];
        for (const it of items) if (!dest.includes(it)) dest.push(it);
        cap[to] = dest; delete cap[from]; note(`capabilities.${from} -> capabilities.${to}`);
      }
    },
    /* meta.spec.archetype (texto ou lista): troca pelo mapa; destino null remove; lista que esvazia some */
    remapArchetype(o, step, note) {
      const spec = isObj(o.meta) ? o.meta.spec : null; if (!isObj(spec) || spec.archetype === undefined) return;
      const was = Array.isArray(spec.archetype) ? spec.archetype : [spec.archetype], out = [];
      for (const a of was) { if (a in step.map) { note(`meta.spec.archetype ${a} -> ${step.map[a] === null ? '(removido)' : step.map[a]}`); if (step.map[a] !== null && !out.includes(step.map[a])) out.push(step.map[a]); } else if (!out.includes(a)) out.push(a); }
      if (out.length === was.length && out.every((a, i) => a === was[i])) return;
      if (!out.length) delete spec.archetype; else spec.archetype = Array.isArray(spec.archetype) ? out : out[0];
    },
  };
  /* sobe o projeto até o formato atual: { project, from, to, applied: [{ id, changes }], newer } */
  function run(input) {
    const o = clone(input), from = getVer(o), applied = [];
    if (from > CUR) return { project: o, from, to: from, applied, newer: true };
    for (const step of D.steps) {
      if (step.to <= from) continue;
      const changes = []; OPS[step.op](o, step, c => changes.push(c));
      applied.push({ id: step.id, changes });
    }
    setVer(o, CUR);
    return { project: o, from, to: CUR, applied, newer: false };
  }
  const describe = r => r.newer ? [`o projeto é do formato ${r.from}, mais novo que o deste motor (${CUR}): abre sem mudança, campos desconhecidos são ignorados`]
    : r.applied.filter(a => a.changes.length).map(a => `migrado (${a.id}): ${a.changes.join('; ')}`);
  return { run, describe, getVer, CURRENT: CUR, DATA: D };
})();
