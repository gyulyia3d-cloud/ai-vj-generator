#!/usr/bin/env node
// Registry (fase 1): fonte única de geradores, parâmetros, modulação e capacidades, em skill/ai-vj-generator/registry/.
//   node scripts/registry.mjs --write   regenera generators.json e parameters.json a partir do motor e grava os enums no esquema
//   node scripts/registry.mjs --check   confere motor, esquema, validador e docs contra o registry (sai com 1 se houver deriva)
// modulation.json, capabilities.json e versions.json são escritos à mão (são a decisão); generators.json e parameters.json vêm do motor,
// porque os parâmetros são declarados no código das camadas. O teste de deriva garante que nunca divergem.
import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from '../skill/ai-vj-generator/scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..'), SK = join(ROOT, 'skill', 'ai-vj-generator'), REG = join(SK, 'registry');
const rd = f => JSON.parse(readFileSync(f, 'utf8')), wr = (f, o) => writeFileSync(f, JSON.stringify(o, null, 1) + '\n');
const mode = process.argv.includes('--write') ? 'write' : 'check';
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const RENDER = { shader: 'shader', isf: 'shader', synth: 'shader', fx: 'shader', flow: 'particle', sim: 'particle', model: '3d', splat: '3d', parallax: '3d' };
const fam = rd(join(SK, 'references', 'families.json'));

/* 1) o que o motor declara */
const page = await openPage(join(ROOT, 'app', 'index.html'), { waitFor: '!!(window.AIVJ && window.AIVJ.GEN && window.AIVJ.modSources)' });
const eng = JSON.parse(await page.evaluate(`(() => { const A = AIVJ, TY = { n: 'number', s: 'select', c: 'color', b: 'boolean', t: 'text' };
  const pd = d => ({ id: d.k, type: TY[d.t] || d.t, default: d.d === undefined ? null : d.d, min: d.min ?? null, max: d.max ?? null, step: d.step ?? null, label: d.l, options: d.opts || null });
  const gens = Object.values(A.GEN).map(g => { const f = A.FAMILIES.find(x => x[1].some(y => y[0] === g.type)); const src = String(g.draw);
    return { id: g.type, category: f ? f[0] : null, name: f ? f[1].find(y => y[0] === g.type)[1] : g.label, parameters: g.params.map(pd), surfaceAware: /\\bfolds\\b|\\bdisplays\\b/.test(src) }; });
  const common = Object.entries(A.COMMON).map(([grp, defs]) => ({ group: grp, parameters: defs.map(pd) }));
  return JSON.stringify({ gens, common, mods: A.modSources() }); })()`));
await page.close();

const ROLE = { 'TRANSFORM': 'transform', 'APARÊNCIA': 'appearance', 'MOVIMENTO': 'motion', 'ÁUDIO': 'audio' };
const unitOf = l => /°/.test(l) ? 'deg' : /px/.test(l) ? 'px' : /%/.test(l) ? 'percent' : /quadros/.test(l) ? 'frames' : null;
const generators = {
  note: 'Gerado de app/index.html por scripts/registry.mjs --write. Não edite à mão.',
  generators: eng.gens.map(g => ({
    id: g.id, category: g.category, name: g.name, renderMode: RENDER[g.id] || 'canvas2d',
    parameters: g.parameters.map(p => ({ ...p, unit: unitOf(p.label || ''), semanticRole: 'generator' })),
    audioRoles: ['mass', 'body', 'detail', 'accent'], supportsAlpha: true, deterministic: true, surfaceAware: g.surfaceAware, performanceClass: (fam[g.id] || {}).cost || 'medium' })),
};
const parameters = { note: 'Parâmetros comuns a toda camada (transformação, aparência, movimento, áudio). Gerado por scripts/registry.mjs --write.',
  groups: eng.common.map(c => ({ role: ROLE[c.group] || c.group.toLowerCase(), parameters: c.parameters.map(p => ({ ...p, unit: unitOf(p.label || ''), semanticRole: ROLE[c.group] || c.group.toLowerCase() })) })) };
const mod = rd(join(REG, 'modulation.json')), cap = rd(join(REG, 'capabilities.json'));
const schemaPath = join(SK, 'schema', 'project.schema.json'), briefSchemaPath = join(SK, 'schema', 'brief.schema.json'), creative = rd(join(REG, 'creative.json'));
const creativeJs = '/* Gerado de skill/ai-vj-generator/registry/creative.json por node scripts/registry.mjs --write. Não edite. */\nconst CREATIVE_DATA = ' + JSON.stringify(creative) + ';\n';
const creativeJsPath = join(ROOT, 'app', 'creative-data.js');
const composition = rd(join(REG, 'composition.json'));
const compositionJs = '/* Gerado de skill/ai-vj-generator/registry/composition.json por node scripts/registry.mjs --write. Não edite. */\nconst COMPOSITION_DATA = ' + JSON.stringify(composition) + ';\n';
const compositionJsPath = join(ROOT, 'app', 'composition-data.js');
const verbIds = creative.verbs.map(v => v.id);

if (mode === 'write') {
  wr(join(REG, 'generators.json'), generators); wr(join(REG, 'parameters.json'), parameters);
  let s = readFileSync(schemaPath, 'utf8');
  const srcEnum = JSON.stringify(mod.sources.map(x => x.id)), typeEnum = JSON.stringify(generators.generators.map(g => g.id));
  s = s.replace(/("src": \{ "type": "string", "enum": )\[[^\]]*\]/, `$1${srcEnum}`);
  s = s.replace(/("type": \{ "type": "string", )(?:"minLength": 1|"enum": \[[^\]]*\]) \},(\s*"name": \{ "type": "string" \},\s*"role")/, `$1"enum": ${typeEnum} },$2`);
  writeFileSync(schemaPath, s);
  writeFileSync(creativeJsPath, creativeJs);
  writeFileSync(compositionJsPath, compositionJs);
  let b = rd(briefSchemaPath); b.properties.verbs = { type: 'array', items: { type: 'string', enum: verbIds }, description: 'Optional: visual verbs the author wants (the Creative IR adds them with extra weight). See registry/creative.json.' };
  writeFileSync(briefSchemaPath, JSON.stringify(b, null, 2) + '\n');
  console.log(`registry gravado: ${generators.generators.length} geradores, ${parameters.groups.reduce((a, g) => a + g.parameters.length, 0)} parâmetros comuns, ${mod.sources.length} fontes de modulação`);
  process.exit(0);
}

/* 2) conferência */
const gOld = rd(join(REG, 'generators.json')), pOld = rd(join(REG, 'parameters.json'));
check(JSON.stringify(gOld) === JSON.stringify(generators), `generators.json = motor (${generators.generators.length} tipos de camada)`, 'rode node scripts/registry.mjs --write');
check(JSON.stringify(pOld) === JSON.stringify(parameters), 'parameters.json = parâmetros comuns do motor', 'rode node scripts/registry.mjs --write');
const ids = mod.sources.map(x => x.id), same = (a, b) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
check(same(ids, eng.mods), `modulação: interface do motor = registry (${ids.length} fontes)`, `motor ${eng.mods.join(',')}`);
const schema = rd(schemaPath), find = (o, k) => { if (o && typeof o === 'object') { if (k in o) return o[k]; for (const v of Object.values(o)) { const r = find(v, k); if (r) return r; } } return null; };
const lay = schema.properties.compositions.items.properties.layers.items.properties;
check(same(ids, lay.mod.items.properties.src.enum || []), 'modulação: esquema (enum de layer.mod.src) = registry', `esquema ${(lay.mod.items.properties.src.enum || []).join(',')}`);
check(same(lay.type.enum || [], generators.generators.map(g => g.id)), 'camadas: esquema (enum de layer.type) = registry', 'enum diferente ou ausente: rode --write');
const py = readFileSync(join(SK, 'scripts', 'validate_project.py'), 'utf8');
check(/modulation\.json/.test(py) && !/MOD_SRC = \{"bass"/.test(py), 'modulação: o validador lê o registry (sem lista própria)', 'validate_project.py ainda tem lista fixa');
const word = (txt, w) => new RegExp('\\b' + w + '\\b').test(txt);
const audioDoc = readFileSync(join(SK, 'references', 'audio-bus.md'), 'utf8');
check(ids.every(i => word(audioDoc, i)), 'modulação: audio-bus.md cita todas as fontes', ids.filter(i => !word(audioDoc, i)).join(','));
const schemaDoc = readFileSync(join(SK, 'references', 'project-schema.md'), 'utf8');
check(generators.generators.every(g => word(schemaDoc, g.id)), 'camadas: project-schema.md cita todos os tipos', generators.generators.filter(g => !word(schemaDoc, g.id)).map(g => g.id).join(','));
const inScope = ['supported', 'exportable', 'inputOnly'].flatMap(k => cap.items[k].map(y => y.toLowerCase()));
check(cap.labels.length === 4 && !cap.outOfScope.some(x => inScope.includes(x)), 'capabilities: nenhum item fora de escopo em supported, exportable ou inputOnly', inScope.filter(x => cap.outOfScope.includes(x)).join(','));
const capDoc = readFileSync(join(SK, 'references', 'capabilities.md'), 'utf8');
check(cap.labels.every(l => capDoc.includes(l)) && Object.keys(cap.legacyLabels).every(l => py.includes(l)), 'capabilities: capabilities.md e o validador usam os rótulos do registry', '');
/* Creative IR: dados únicos, copiados para o navegador, aceitos pelo esquema do briefing */
check(readFileSync(creativeJsPath, 'utf8').replace(/\r\n/g, '\n') === creativeJs, 'creative.json = app/creative-data.js (dados do Creative IR no navegador)', 'rode node scripts/registry.mjs --write');
const bs = rd(briefSchemaPath);
check(bs.properties.verbs && same(bs.properties.verbs.items.enum, verbIds), `brief.schema.json aceita os ${verbIds.length} verbos de creative.json`, 'rode --write');
check(verbIds.length === 32 && new Set(verbIds).size === 32, 'o vocabulário tem 32 verbos distintos', String(verbIds.length));
const VK = ['geometry', 'motion', 'spatial', 'temporal', 'densityNote', 'audio', 'transition', 'material', 'composition', 'motif', 'scale', 'families', 'shaders', 'structure', 'axes', 'density', 'arc'];
check(creative.verbs.every(v => VK.every(k => v[k] !== undefined && v[k] !== '') && creative.arcs[v.arc]), 'todo verbo define geometria, movimento, espaço, tempo, densidade, áudio, transição, material e composição, e aponta para um arco existente', creative.verbs.filter(v => !VK.every(k => v[k] !== undefined && v[k] !== '') || !creative.arcs[v.arc]).map(v => v.id).join(','));
check(creative.concepts.every(c => Object.keys(c.verbs).every(v => verbIds.includes(v))) && Object.values(creative.moods).every(m => Object.keys(m).every(v => verbIds.includes(v))), 'conceitos e humores só citam verbos que existem', '');
check(creative.verbs.every(v => Object.keys(v.families).every(t => creative.heroTypes.includes(t)) && v.shaders.every(s => creative.shaderOrder.includes(s)) && v.structure.every(s => creative.structureOrder.includes(s))), 'famílias, shaders e estruturas dos verbos existem nas listas de ordem', '');
/* Composition IR: dados únicos, copiados para o navegador, coerentes entre si */
check(readFileSync(compositionJsPath, 'utf8').replace(/\r\n/g, '\n') === compositionJs, 'composition.json = app/composition-data.js (dados do Composition IR no navegador)', 'rode node scripts/registry.mjs --write');
const GI = composition.grammarOrder;
check(GI.length === 12 && composition.grammars.every(g => ['hero', 'secondary', 'support', 'text', 'negative'].every(k => Array.isArray(g[k])) && ['x', 'y', 'diag', 'radial'].includes(g.axis)), 'as 12 gramáticas espaciais definem herói, secundário, apoio, texto, espaço negativo e eixo de movimento', '');
check(Object.keys(composition.verbGrammars).every(v => verbIds.includes(v) && Object.keys(composition.verbGrammars[v]).every(g => GI.includes(g))) && verbIds.every(v => composition.verbGrammars[v]), 'todo verbo do Creative IR aponta para gramáticas que existem', verbIds.filter(v => !composition.verbGrammars[v]).join(','));
check(Object.values(composition.aspectClasses).every(c => Object.keys(c).every(g => GI.includes(g))) && Object.values(creative.verbs.reduce((o, v) => (o[v.arc] = 1, o), {})).length === Object.keys(composition.phaseProfiles).length && Object.keys(creative.arcs).every(a => composition.phaseProfiles[a]), 'proporções e arcos do Creative IR têm gramática e perfil de fases', '');
/* o PROMPT.md (qualquer IA) ensina o vocabulário inteiro */
const promptDoc = readFileSync(join(SK, 'portable', 'PROMPT.md'), 'utf8');
check(verbIds.every(v => new RegExp('\\b' + v + '\\b').test(promptDoc)) && GI.every(g => promptDoc.includes(g)) && /plan_ir\.py/.test(promptDoc) && /meta\.creativeIR/.test(promptDoc) && /meta\.compositionIR/.test(promptDoc), 'PROMPT.md cita os 32 verbos, as 12 gramáticas, plan_ir.py e os dois campos do projeto', [...verbIds.filter(v => !new RegExp('\\b' + v + '\\b').test(promptDoc)), ...GI.filter(g => !promptDoc.includes(g))].join(','));
console.log(fail ? `\n${fail} deriva(s).` : '\nregistry ok.');
process.exit(fail ? 1 : 0);
