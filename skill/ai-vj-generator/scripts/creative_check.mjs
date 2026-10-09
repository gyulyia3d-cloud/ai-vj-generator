#!/usr/bin/env node
// Teste do Creative IR (fase 5): o compilador de intenção dá o mesmo plano em Python e no navegador, o conceito pesa mais que o humor, o mesmo humor com
// conceitos diferentes dá peças estruturalmente diferentes (topologia, movimento, densidade, arranjo, arco, família de gerador, material), e o projeto gerado continua válido.
//   node creative_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-cir-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const base = (over) => Object.assign({ name: 'Teste IR', lang: 'pt', concept: 'x', mood: ['calm', 'minimal'], energy: 0.4, density: 'balanced', surface: { type: 'led', w: 4500, h: 800, fps: 30 }, time: { bpm: 100, bars: 4 }, compositions: 4 }, over);
const A = base({ concept: 'Uma estrutura que sofre decadência: erosão lenta, ruína e desgaste até sobrar quase nada.' });
const B = base({ concept: 'Algo que surge do vazio: um nascimento lento que cresce e floresce, emergindo aos poucos.' });
const grid = [A, B,
  base({ concept: 'Pressão contida, tensão e compressão sem saída.', mood: ['industrial'] }),
  base({ concept: 'A fluid river of memory, flow and echo.', mood: ['liquid'] }),
  base({ concept: 'Quebra e fratura: uma ruptura, glitch e caos.', mood: ['glitch', 'aggressive'] }),
  base({ concept: 'Subida: ascent into the sky, a rise and a lift.', mood: [] }),
  base({ concept: 'Uma peça qualquer sem palavra de conceito conhecida.', mood: ['retro'] }),
  base({ concept: 'Neutral piece with nothing to match.', mood: [] }),
  base({ concept: 'Ciclo e órbita, ritmo circular, loop eterno.', mood: ['ritual'], verbs: ['breathe'] }),
  base({ concept: 'Rede, conexão e teia de dados e sinal.', mood: ['cosmic', 'urban', 'crystalline'] }),
  base({ concept: 'Neutral piece with nothing to match.', mood: ['calm'], verbs: ['fracture', 'scatter'] }),
  base({ concept: 'Vazio, silêncio e contemplação.', mood: ['minimal'], banned: ['flare', 'neon'] }),
];
for (const f of readdirSync(join(ROOT, 'examples', 'gallery')).filter(f => f.endsWith('.brief.json'))) grid.push(JSON.parse(readFileSync(join(ROOT, 'examples', 'gallery', f), 'utf8')));
const html = join(tmp, 'p.html'), pj = join(tmp, 'p.json');
writeFileSync(pj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'c', seed: 1, meta: { name: 'C', brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.GENAI)' });
const E = s => page.evaluate(s);
const py = (brief, name) => { const f = join(tmp, name + '.json'); writeFileSync(f, JSON.stringify(brief)); return JSON.parse(execFileSync('python', [join(HERE, 'creative_ir.py'), f], { encoding: 'utf8' })); };
const jsIR = brief => E(`JSON.stringify(AIVJ.GENAI.compileIR(${JSON.stringify(brief)}))`).then(JSON.parse);
const build = brief => E(`JSON.stringify(AIVJ.GENAI.build(${JSON.stringify(brief)}))`).then(JSON.parse);
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
try {
  /* 1) paridade do compilador */
  let par = 0; const parBad = [];
  for (let i = 0; i < grid.length; i++) { const a = py(grid[i], 'b' + i), b = await jsIR(grid[i]); if (same(JSON.parse(JSON.stringify(a)), b)) par++; else parBad.push(i + ':' + Object.keys(a).filter(k => !same(a[k], b[k])).join('/')); }
  check(!parBad.length, `o Creative IR do Python é igual ao do navegador em ${par}/${grid.length} briefings`, parBad.join(' '));
  const t1 = await jsIR(A), t2 = await jsIR(A);
  check(same(t1, t2), 'compilar duas vezes o mesmo briefing dá o mesmo IR (determinístico)', '');

  /* 2) conteúdo do IR: todos os campos do roadmap */
  const ir = await jsIR(A);
  const need = ['concept', 'audienceEffect', 'semioticIntent', 'visualVerbs', 'visualMotifs', 'hierarchy', 'spatialBehavior', 'temporalBehavior', 'materialBehavior', 'colorLogic', 'density', 'scale', 'rhythm', 'audioRole', 'novelty', 'forbiddenMotifs'];
  check(need.every(k => k in ir) && ir.visualVerbs.length >= 3 && ir.concept === 'decay', 'o IR traz conceito, efeito no público, intenção semiótica, verbos, motivos, hierarquia, comportamento espacial, temporal e de material, cor, densidade, escala, ritmo, papel do áudio, novidade e motivos proibidos', JSON.stringify(Object.keys(ir)));
  check(['erode', 'sink', 'dissolve', 'fragment', 'collapse'].some(v => ir.visualVerbs.includes(v)), `"decadência" vira verbos de perda (${ir.visualVerbs.join(', ')})`, ir.visualVerbs.join());

  /* 3) mesmo humor, conceitos diferentes: peças estruturalmente diferentes */
  const pa = await build(A), pb = await build(B), sig = p => ({
    hero: p.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)).type), ground: p.compositions.map(c => c.layers.find(l => /^CAMPO/.test(l.name)).p.preset),
    structure: p.compositions.map(c => c.layers.find(l => /^ESTRUTURA/.test(l.name)).type), count: p.compositions.map(c => c.layers.reduce((s, l) => s + (l.p && (l.p.count || l.p.points || l.p.rows) || 0), 0)),
    axes: p.meta.artBible.motionProfile, arc: p.compositions.map(c => c.hypothesis.split(':')[0]), material: p.meta.contract.materialLanguage, fams: [...new Set(p.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)).type))].sort().join() });
  const sa = sig(pa), sb = sig(pb);
  const dims = { topologia: !same(sa.hero, sb.hero), movimento: !same(sa.axes, sb.axes), densidade: !same(sa.count, sb.count), arranjo: !same(sa.structure, sb.structure) || !same(sa.ground, sb.ground), 'arco temporal': !same(sa.arc, sb.arc), 'família de gerador': sa.fams !== sb.fams, material: sa.material !== sb.material };
  check(Object.values(dims).every(Boolean), `"frio, contemplativo" com decadência e com emergência diferem em ${Object.keys(dims).join(', ')}`, JSON.stringify(dims) + ' A=' + JSON.stringify(sa) + ' B=' + JSON.stringify(sb));
  check(pa.meta.creativeIR && pa.meta.creativeIR.concept === 'decay' && pb.meta.creativeIR.concept === 'emergence', 'o IR fica gravado em meta.creativeIR do projeto', '');

  /* 4) o conceito pesa mais que o humor; sem conceito reconhecido, o humor manda como antes */
  const ind = await build(base({ concept: 'Algo que surge do vazio: um nascimento lento que cresce e floresce.', mood: ['industrial'] }));
  const industrialHeroes = ['tunnel', 'lines', 'bitfield'];
  check(ind.compositions[0].layers.find(l => /^HER/.test(l.name)).type === 'organism' && ind.meta.creativeIR.visualVerbs[0] === 'emerge', 'humor industrial com conceito de emergência: o conceito decide (organism, verbo emerge), o humor só tempera', ind.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)).type).join());
  const neutral = await build(base({ concept: 'Neutral piece with nothing to match.', mood: ['industrial'], compositions: 3 }));
  check(neutral.meta.creativeIR.drives === false && neutral.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)).type).join() === 'tunnel,lines,tunnel', 'sem conceito reconhecido o IR não conduz e o clima industrial escolhe como antes (tunnel, lines, e o bitfield vira textura de estrutura)', neutral.compositions.map(c => c.layers.find(l => /^HER/.test(l.name)).type).join());
  const ex = await jsIR(base({ concept: 'Neutral piece with nothing to match.', mood: [], verbs: ['fracture'] }));
  check(ex.drives && ex.visualVerbs[0] === 'fracture' && ex.concept === null, 'verbos pedidos no briefing conduzem mesmo sem conceito reconhecido', JSON.stringify(ex.visualVerbs));

  /* 5) o projeto continua válido */
  for (const [i, b] of [[0, A], [1, B], [2, grid[2]], [3, grid[5]]]) {
    const proj = await build(b), f = join(tmp, 'gen' + i + '.json'); writeFileSync(f, JSON.stringify(proj));
    let r = 0; try { execFileSync('python', [join(HERE, 'validate_project.py'), f], { stdio: 'pipe' }); } catch (e) { r = e.status; }
    check(r === 0, `projeto gerado a partir do briefing ${i} passa no validador`, 'validador recusou');
  }
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nCreative IR ok.');
process.exit(fail ? 1 : 0);
