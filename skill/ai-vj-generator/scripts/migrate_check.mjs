#!/usr/bin/env node
// Teste da migração de projetos (fase 19): meta.formatVersion e passos declarativos de registry/versions.json.
// Resposta conhecida num projeto antigo (rótulos de capacidade e arquétipos fora do produto); Python = navegador (projeto e relatório); a entrada nunca muda; idempotência;
// formato mais novo abre com aviso e sem reescrever; o motor migra ao importar; projetos de exemplo só ganham o carimbo; o gerador carimba; o validador avisa.
// Controles negativos: projeto já carimbado no formato atual NÃO é migrado (a versão manda); sem carimbo conta como formato 0.
//   node migrate_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-migrate-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const py = (code) => JSON.parse(execFileSync('python', ['-I', '-c', `import sys, json; sys.path.insert(0, ${JSON.stringify(HERE)}); sys.stdout.reconfigure(encoding='utf-8'); import migrate_project as M\n${code}`], { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }));
const migFile = (p, n = 0) => { const f = join(tmp, `m${n}.json`); writeFileSync(f, JSON.stringify(p)); return py(`p = json.load(open(${JSON.stringify(f)}, encoding='utf-8')); r = M.migrate(p); print(json.dumps({'p': r['project'], 'ch': [x for s in r['applied'] for x in s['changes']]}))`); };
const base = () => ({ schema: 'ai-vj-generator/2', id: 'm', seed: 1, meta: { name: 'M', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] });
const legacy = () => Object.assign(base(), { capabilities: { supported: ['preview'], notSupported: ['midi'], requiresBridge: ['osc', 'midi'], conceptual: ['x'] } });
const withArch = (a) => { const p = legacy(); p.meta.spec = { archetype: a, confirmed: {} }; return p; };
const FIX = { legacyArchList: withArch(['object-mapping', 'dooh', 'clip-pack']), legacyArchStr: withArch('immersive'), onlyRemoved: withArch(['dooh', 'immersive']), plain: base(), stamped: Object.assign(legacy(), { meta: Object.assign(legacy().meta, { formatVersion: 2 }) }) };
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify(base()));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.MIGRATE)' });
const E = s => page.evaluate(s);
try {
  const cur = JSON.parse(readFileSync(join(HERE, '..', 'registry', 'versions.json'), 'utf8')).format.current;
  /* 1) resposta conhecida em Python */
  const before = JSON.stringify(FIX.legacyArchList);
  const r = py(`p = json.loads(${JSON.stringify(JSON.stringify(FIX.legacyArchList))}); r = M.migrate(p); print(json.dumps({'r': r, 'same': p == json.loads(${JSON.stringify(before)})}))`);
  check(same(r.r.project.capabilities, { supported: ['preview'], notSupported: ['midi', 'osc', 'x'] }), 'capabilities legadas: requiresBridge e conceptual viram notSupported, sem repetir (midi uma vez)', JSON.stringify(r.r.project.capabilities));
  check(same(r.r.project.meta.spec.archetype, ['installation', 'clip-pack']) && r.r.project.meta.formatVersion === cur && r.r.from === 0 && r.r.to === cur, `arquétipos: object-mapping vira installation, dooh sai, clip-pack fica; formato 0 -> ${cur} carimbado`, JSON.stringify(r.r.project.meta));
  check(r.same, 'a entrada nunca muda (a migração roda numa cópia)', 'a entrada foi alterada');

  /* 2) Python = navegador (projeto e relatório) em todos os fixtures */
  const js = JSON.parse(await E(`JSON.stringify(Object.fromEntries(Object.entries(${JSON.stringify(FIX)}).map(([k, p]) => { const r = AIVJ.MIGRATE.run(p); return [k, { project: r.project, from: r.from, to: r.to, applied: r.applied, newer: r.newer, text: AIVJ.MIGRATE.describe(r) }]; })))`));
  const pyAll = py(`F = json.loads(${JSON.stringify(JSON.stringify(FIX))}); print(json.dumps({k: dict(M.migrate(p), text=M.describe(M.migrate(p))) for k, p in F.items()}))`);
  const diffKeys = Object.keys(FIX).filter(k => !same(js[k], pyAll[k]));
  check(!diffKeys.length, `Python e navegador dão a mesma migração e o mesmo relatório nos ${Object.keys(FIX).length} projetos de teste`, diffKeys.map(k => k + ' py=' + JSON.stringify(pyAll[k]).slice(0, 200) + ' js=' + JSON.stringify(js[k]).slice(0, 200)).join(' | '));
  check(!('archetype' in js.onlyRemoved.project.meta.spec) && js.legacyArchStr.project.meta.spec.archetype === undefined, 'arquétipo que só tinha itens removidos some (nada de lista vazia)', JSON.stringify(js.onlyRemoved.project.meta.spec));

  /* 3) idempotência */
  const idem = Object.keys(FIX).filter(k => { const a = js[k].project, b = JSON.parse(JSON.stringify(a)); const r2 = py(`p = json.loads(${JSON.stringify(JSON.stringify(a))}); r = M.migrate(p); print(json.dumps({'p': r['project'], 'ch': [x for s in r['applied'] for x in s['changes']]}))`); return !(same(r2.p, b) && !r2.ch.length); });
  check(!idem.length, 'idempotente: migrar um projeto já migrado não muda nada e não relata mudança', idem.join());

  /* 4) controles: a versão manda; sem carimbo vale 0; formato mais novo abre com aviso e sem reescrever */
  check(js.stamped.applied.every(a => !a.changes.length) && js.stamped.project.capabilities.requiresBridge !== undefined, 'controle negativo: projeto já carimbado no formato atual NÃO é migrado (o rótulo antigo fica; quem manda é a versão)', JSON.stringify(js.stamped.applied));
  check(js.plain.from === 0 && js.plain.project.meta.formatVersion === cur, 'sem meta.formatVersion o projeto conta como formato 0 e sai carimbado', JSON.stringify(js.plain.from));
  const newer = Object.assign(base(), { meta: Object.assign(base().meta, { formatVersion: 99, futuro: { x: 1 } }) });
  const nj = JSON.parse(await E(`(() => { const r = AIVJ.MIGRATE.run(${JSON.stringify(newer)}); const ok = AIVJ.importJson(${JSON.stringify(JSON.stringify(newer))}); return JSON.stringify({ newer: r.newer, kept: r.project.meta.formatVersion, extra: r.project.meta.futuro, text: AIVJ.MIGRATE.describe(r), ok, open: AIVJ.project.meta.formatVersion, extraOpen: AIVJ.project.meta.futuro }); })()`));
  check(nj.newer && nj.kept === 99 && nj.extra.x === 1 && nj.ok && nj.open === 99 && nj.extraOpen.x === 1 && /mais novo/.test(nj.text[0]), 'formato mais novo (99): abre, avisa, não reescreve a versão e não apaga campos desconhecidos', JSON.stringify(nj));

  /* 5) o motor migra ao importar */
  const eng = JSON.parse(await E(`(() => { AIVJ.importJson(${JSON.stringify(JSON.stringify(FIX.legacyArchList))}); const P = AIVJ.project; return JSON.stringify({ cap: P.capabilities, arch: P.meta.spec.archetype, fv: P.meta.formatVersion }); })()`));
  check(same(eng.cap.notSupported, ['midi', 'osc', 'x']) && eng.cap.requiresBridge === undefined && same(eng.arch, ['installation', 'clip-pack']) && eng.fv === cur, 'o motor migra ao importar o projeto antigo (capacidades, arquétipos e carimbo)', JSON.stringify(eng));

  /* 6) exemplos e galeria: só ganham o carimbo, e o resultado passa no validador */
  const dirs = [join(ROOT, 'examples'), join(ROOT, 'examples', 'gallery')], files = dirs.flatMap(d => readdirSync(d).filter(f => /\.(aivj\.)?json$/.test(f) && !/evaluation|manifest/.test(f)).map(f => join(d, f)));
  const ex = []; for (const f of files) { let p; try { p = JSON.parse(readFileSync(f, 'utf8')); } catch { continue; } if (!p || !String(p.schema || '').startsWith('ai-vj-generator/') || !p.compositions) continue; ex.push([f, p]); }
  const exBad = [];
  for (const [f, p] of ex) { const r = migFile(p); const q = JSON.parse(JSON.stringify(r.p)); if (q.meta) delete q.meta.formatVersion; const o = JSON.parse(JSON.stringify(p)); if (o.meta) delete o.meta.formatVersion; if (!same(q, o) || r.ch.length) exBad.push(f.split(/[\\/]/).pop()); }
  check(ex.length >= 8 && !exBad.length, `${ex.length} exemplos e projetos da galeria: a migração só acrescenta o carimbo (nenhum campo mudou)`, exBad.join());
  const g = ex.find(([f]) => /gallery/.test(f))[1]; const gf = join(tmp, 'g.json');
  writeFileSync(gf, JSON.stringify(migFile(g, 1).p));
  let code = 0, out = ''; try { out = execFileSync('python', [join(HERE, 'validate_project.py'), gf], { encoding: 'utf8', stdio: 'pipe' }); } catch (e2) { code = e2.status; out = String(e2.stdout); }
  check(code === 0, 'um projeto da galeria migrado passa no validador', out.split('\n').filter(l => /ERROR/.test(l)).slice(0, 3).join(' | '));

  /* 7) o gerador carimba (Python = navegador) e o validador avisa */
  const brief = { name: 'Versao', lang: 'pt', concept: 'Neutral piece with nothing to match.', verbs: ['drift', 'flow', 'morph'], mood: ['liquid'], energy: 0.5, surface: { type: 'screen', w: 1920, h: 1080, fps: 30 }, time: { bpm: 120, bars: 4 }, compositions: 3, text: { title: 'AIVJ' } };
  const bf = join(tmp, 'b.json'), of = join(tmp, 'o.json'); writeFileSync(bf, JSON.stringify(brief)); execFileSync('python', [join(HERE, 'brief_to_project.py'), bf, '--out', of], { stdio: 'pipe' });
  const gen = JSON.parse(readFileSync(of, 'utf8')), genJs = JSON.parse(await E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`));
  check(gen.meta.formatVersion === cur && genJs.meta.formatVersion === cur, `o gerador (Python e navegador) já entrega o formato ${cur}`, JSON.stringify([gen.meta.formatVersion, genJs.meta.formatVersion]));
  const val = (mut) => { const q = JSON.parse(JSON.stringify(gen)); mut(q); const f = join(tmp, 'v.json'); writeFileSync(f, JSON.stringify(q)); try { return execFileSync('python', [join(HERE, 'validate_project.py'), f], { encoding: 'utf8', stdio: 'pipe' }); } catch (e3) { return String(e3.stdout); } };
  check(!/formatVersion/.test(val(() => {})), 'projeto no formato atual não gera aviso de versão', '');
  check(/formatVersion.*newer/.test(val(q => { q.meta.formatVersion = 99; })) && /ERROR.*formatVersion/.test(val(q => { q.meta.formatVersion = -1; })) && /formatVersion is 0|formatVersion is absent/.test(val(q => { delete q.meta.formatVersion; })), 'validador: formato mais novo avisa, formato inválido é erro, projeto sem carimbo ganha uma nota', '');
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nMigração ok.');
process.exit(fail ? 1 : 0);
