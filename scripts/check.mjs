#!/usr/bin/env node
// Verificações rápidas antes de commit/release: node scripts/check.mjs
// 1. sintaxe do JS do motor  2. skill/assets/engine.html idêntico a app/index.html
// 3. exemplos com forma válida e só tipos de camada conhecidos  4. frontmatter da skill
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const SKILL = join(ROOT, 'skill', 'ai-vj-generator');
let fail = 0;
const skippedBrowser = [], skipB = m => { skippedBrowser.push(m); console.log('  --   ' + m); };
const ok = m => console.log('  ok  ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };

const html = await readFile(join(ROOT, 'app', 'index.html'), 'utf8');
const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
const tmp = join(tmpdir(), 'aivj-check.js');
await writeFile(tmp, js);
try { execFileSync(process.execPath, ['--check', tmp], { stdio: 'pipe' }); ok('sintaxe do motor'); } catch (e) { bad('sintaxe do motor: ' + e.stderr); }
html.includes('/*__PROJECT_JSON__*/') ? ok('marcador do projeto presente') : bad('marcador /*__PROJECT_JSON__*/ ausente');

try {
  const eng = await readFile(join(SKILL, 'assets', 'engine.html'), 'utf8');
  eng === html ? ok('skill/assets/engine.html sincronizado') : bad('skill/assets/engine.html diferente de app/index.html — rode: node scripts/sync-skill.mjs');
} catch { bad('skill/assets/engine.html ausente — rode: node scripts/sync-skill.mjs'); }

const types = new Set([...js.matchAll(/reg\('([a-z]+)'/g)].map(m => m[1]));
ok(`${types.size} geradores registrados: ${[...types].join(' ')}`);
for (const dir of [join(ROOT, 'examples'), join(SKILL, 'assets', 'examples')]) {
  let files = [];
  try { files = (await readdir(dir)).filter(f => f.endsWith('.json')); } catch { continue; }
  for (const f of files) {
    try {
      const p = JSON.parse(await readFile(join(dir, f), 'utf8'));
      if (!['ai-vj-generator/1', 'ai-vj-generator/2'].includes(p.schema)) throw new Error('schema');
      if (!p.compositions?.length) throw new Error('sem composições');
      for (const c of p.compositions) for (const L of c.layers) if (!types.has(L.type)) throw new Error(`tipo desconhecido "${L.type}" em ${c.name}`);
      if (![24, 25, 30, 50, 60].includes(p.canvas?.fps ?? 30)) throw new Error('fps fora do padrão');
      ok(`${dir.includes('assets') ? 'skill/' : ''}examples/${f} · ${p.compositions.length} composições`);
    } catch (e) { bad(`${f}: ${e.message}`); }
  }
}

// cada briefing começa do zero: o motor não gera nada sozinho e a skill não carrega exemplos
!/composeFromBrief|EXAMPLE_BRIEF/.test(html) ? ok('motor sem geração própria (sem composeFromBrief/EXEMPLO)') : bad('o motor ainda tem geração por regras ou exemplo embutido');
try { await readdir(join(SKILL, 'assets', 'examples')); bad('skill/assets/examples existe: a skill não deve carregar exemplos'); } catch { ok('skill sem exemplos prontos'); }
for (const d of (await readdir(join(ROOT, 'skill'), { withFileTypes: true })).filter(e => e.isDirectory())) {
  try {
    const t = await readFile(join(ROOT, 'skill', d.name, 'SKILL.md'), 'utf8');
    const f = t.match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] || '';
    f.includes('name: ' + d.name) && /description:\s*\S/.test(f) ? ok(`skill "${d.name}" com frontmatter`) : bad(`skill "${d.name}": frontmatter incompleto`);
  } catch { bad(`skill/${d.name}/SKILL.md ausente`); }
}
for (const f of ['briefing-flow.md', 'attachments.md', 'interview.md', 'repertoire/index.md']) {
  try { await readFile(join(SKILL, 'references', f), 'utf8'); ok('referência ' + f); } catch { bad('referência ausente: ' + f); }
}
const sk = await readFile(join(SKILL, 'SKILL.md'), 'utf8');
for (const f of ['briefing-flow.md', 'attachments.md', 'interview.md', 'repertoire/index.md']) sk.includes(f) ? ok('SKILL.md aponta para ' + f) : bad('SKILL.md não aponta para ' + f);
const fm = sk.match(/^---\n([\s\S]*?)\n---/);
if (!fm) bad('SKILL.md sem frontmatter');
else {
  const name = fm[1].match(/^name:\s*(.+)$/m)?.[1], desc = fm[1].match(/^description:\s*(.+)$/m)?.[1] || '';
  name === 'ai-vj-generator' ? ok('nome da skill') : bad('nome da skill');
  desc.startsWith('Use when') && fm[1].length <= 1024 ? ok(`descrição (${fm[1].length}/1024 caracteres)`) : bad('descrição deve começar com "Use when" e caber em 1024 caracteres');
}
// V4: SKILL.md é um roteador (máx. 500 linhas) e todo caminho que ele cita existe
const skLines = sk.split('\n').length;
skLines <= 500 ? ok(`SKILL.md compacto (${skLines} linhas)`) : bad(`SKILL.md com ${skLines} linhas: mova o detalhe para references/`);
const cited = [...new Set([...sk.matchAll(/`((?:references|scripts|assets)\/[\w./-]+)`/g)].map(m => m[1]))].filter(x => !/[<>*]/.test(x) && /\.\w+$/.test(x));
for (const rel of cited) { try { await readFile(join(SKILL, rel)); } catch { bad('SKILL.md cita arquivo inexistente: ' + rel); } }
ok(`SKILL.md: ${cited.length} caminhos citados conferidos`);
for (const f of ['creative-contract.md', 'behavior-to-technique.md', 'surface-model.md', 'audio-bus.md', 'capabilities.md', 'quality-gates.md', 'library-matrix.md', 'provenance.md', 'engine-operation.md', 'craft-and-finish.md', 'animation-principles.md', 'design-laws.md', 'software-techniques.md', 'effects-glossary.md', 'aspect-ratios.md', 'glsl-recipes.md', 'creative-coding-patterns.md', 'knowledge/semiotics-art-color-composition.md', 'knowledge/motion-generative-gpu.md', 'knowledge/visual-dna-diversity-critique.md', 'knowledge/red-flags-and-final-loop.md']) {
  try { await readFile(join(SKILL, 'references', f), 'utf8'); ok('referência V4 ' + f); } catch { bad('referência V4 ausente: ' + f); }
}
// links relativos entre references (`foo.md`, `knowledge/foo.md`) apontam para arquivos reais
for (const dir of ['', 'knowledge', 'briefing']) {
  for (const f of (await readdir(join(SKILL, 'references', dir))).filter(x => x.endsWith('.md'))) {
    const t = await readFile(join(SKILL, 'references', dir, f), 'utf8');
    for (const m of t.matchAll(/`((?:\.\.\/)?(?:knowledge\/|repertoire\/|briefing\/)?[a-z][\w-]*\.md)`/g)) {
      const target = join(SKILL, 'references', dir, m[1]);
      try { await readFile(target); } catch { try { await readFile(join(SKILL, 'references', m[1].replace(/^\.\.\//, ''))); } catch { try { await readFile(join(SKILL, 'references', 'repertoire', m[1])); } catch { if (m[1] !== 'direcao-de-arte.md') bad(`references/${dir ? dir + '/' : ''}${f} cita ${m[1]} que não existe`); } } }
    }
  }
}
// o validador rejeita transporte desonesto e aceita um projeto honesto (schema 2)
try {
  const ex = JSON.parse(await readFile(join(ROOT, 'examples', 'contrato-v4-formato.json'), 'utf8'));
  const run = async (obj, name) => { const f = join(tmpdir(), name); await writeFile(f, JSON.stringify(obj)); try { execFileSync('python', [join(SKILL, 'scripts', 'validate_project.py'), f], { stdio: 'pipe' }); return 0; } catch (e) { return e.status; } };
  const bad1 = structuredClone(ex); bad1.capabilities = { supported: ['osc', 'midi'] };
  (await run(ex, 'aivj-v2-good.json')) === 0 ? ok('validador aceita o exemplo schema 2') : bad('validador recusou o exemplo schema 2');
  (await run(bad1, 'aivj-v2-bad.json')) === 1 ? ok('validador recusa OSC/MIDI como supported') : bad('validador deixou passar OSC/MIDI como supported');
} catch (e) { console.log('  --   teste do validador pulado: ' + String(e.message).split('\n')[0]); }
// os geradores são neutros: nenhum texto de peça anterior (coordenadas, cidade, rótulos) fora do bloco STD_P/STD_TELE do STANDARD
const MAXN = { 'SÃO PAULO': 1, '−23.5226': 1, 'ORG_01': 1, 'PADRÃO DETECTADO': 2 };
const leak = Object.entries(MAXN).filter(([s, n]) => html.split(s).length - 1 > n).map(([s]) => s);
leak.length ? bad('texto de peça anterior vazando para os geradores: ' + leak.join(', ')) : ok('geradores neutros (textos de peça só no STANDARD)');
// paredes, camada de código, arquivos embutidos e QA headless
for (const t of ['code', 'pixeltext', 'symbols', 'hazard', 'blocks', 'logo']) types.has(t) ? ok('gerador ' + t) : bad('gerador ausente: ' + t);
for (const k of ['folds', 'white-alpha', 'ASSET_JOBS', 'async function qaRun', 'function contactSheet', 'function layerAudit', 'function gateCode']) html.includes(k) ? ok('motor: ' + k) : bad('motor sem ' + k);
for (const rel of ['scripts/contact_sheet.mjs', 'scripts/assets.mjs', 'scripts/validate_project.py', 'references/walls-code-assets.md']) {
  try { await readFile(join(SKILL, rel), 'utf8'); ok(rel); } catch { bad('ausente: ' + rel); }
}
sk.includes('walls-code-assets.md') ? ok('SKILL.md aponta para walls-code-assets.md') : bad('SKILL.md não aponta para walls-code-assets.md');
// o motor nunca carrega composições de projetos anteriores
!/tecnofeudo/i.test(html) ? ok('motor sem referência a projetos anteriores') : bad('o motor cita um projeto anterior');
// exemplos passam pelo validador estático (precisa de python)
try {
  for (const ex of (await readdir(join(ROOT, 'examples'))).filter(x => x.endsWith('.json'))) {
    try { execFileSync('python', [join(SKILL, 'scripts', 'validate_project.py'), join(ROOT, 'examples', ex)], { stdio: 'pipe' }); ok('validate_project ' + ex); }
    catch (e) { bad('validate_project ' + ex + ': ' + String(e.stdout || e.stderr).split('\n').filter(l => /^ERROR/.test(l)).join(' | ')); }
  }
} catch { console.log('  --   python indisponível: validador estático pulado'); }
// QA headless: abre um exemplo no Chrome/Edge e confere a folha de contato (pulado se não houver navegador)
try {
  const out = join(tmpdir(), 'aivj-qa-check');
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'make-artifact.mjs'), join(ROOT, 'examples', 'duas-paredes-codigo.json'), '--out', join(out, 'ex.html')], { stdio: 'pipe' });
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'contact_sheet.mjs'), join(out, 'ex.html'), join(out, 'contato')], { stdio: 'pipe' });
  ok('QA headless: folha de contato do exemplo sem ERROR');
} catch (e) {
  const msg = String(e.stderr || e.stdout || e.message).slice(0, 300);
  e.status === 3 ? skipB('QA headless pulado: ' + msg.trim().split('\n')[0]) : bad('QA headless: ' + msg);
}
// V5: calculadora de superfície e paleta (testes unitários) e galeria de receitas renderizada no motor
for (const tst of ['test_surface_calc.py', 'test_palette.py', 'test_recipes.py', 'test_export_slices.py']) {
  try { execFileSync('python', [join(SKILL, 'scripts', tst)], { stdio: 'pipe' }); ok('testes ' + tst); }
  catch (e) { bad('testes ' + tst + ': ' + String(e.stderr || e.stdout).split('\n').slice(-6).join(' | ')); }
}
try {
  const out = join(tmpdir(), 'aivj-recipes-check'), g = join(out, 'gal.aivj.json');
  (await import('node:fs')).mkdirSync(out, { recursive: true });
  execFileSync('python', [join(SKILL, 'scripts', 'recipes.py'), 'gallery', '--out', g], { stdio: 'pipe' });
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'make-artifact.mjs'), g, '--out', join(out, 'gal.html')], { stdio: 'pipe' });
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'contact_sheet.mjs'), join(out, 'gal.html'), join(out, 'contato')], { stdio: 'pipe' });
  ok('receitas: todas compilam e renderizam sem ERROR');
  // fechamento de loop: todas as receitas devem fechar; e um teste que não consegue falhar não prova nada,
  // então um controle negativo (1,5 ciclo por loop) PRECISA ser reprovado
  try {
    execFileSync(process.execPath, [join(SKILL, 'scripts', 'loop_check.mjs'), join(out, 'gal.html')], { stdio: 'pipe' });
    ok('loop_check: todas as receitas fecham o loop');
  } catch (e) { e.status === 3 ? skipB('loop_check pulado') : bad('loop_check: ' + String(e.stdout).split('\n').filter(l => /EMENDA/.test(l)).slice(0, 4).join(' | ')); }
  try {
    const fs = await import('node:fs'), P = JSON.parse(fs.readFileSync(g, 'utf8'));
    P.compositions = [{ name: 'CONTROLE NEGATIVO', hypothesis: 'x', layers: [P.compositions[0].layers[0],
      { type: 'shader', name: 'QUEBRADO', role: 'controle negativo', p: { p1: 1, p2: 1, p3: 1, p4: 1, alphaMode: 'alpha', res: 1, c1: 'primary', c2: 'accent',
        src: 'void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float v=.5+.5*sin(uv.x*9.+TAU*uPh*1.5); gl_FragColor=outc(mix(uC1,uC2,v),smoothstep(.45,.55,v)*(.6+uBass*.0+uMid*.0+uHigh*.0));}' } }] }];
    fs.writeFileSync(join(out, 'neg.aivj.json'), JSON.stringify(P));
    execFileSync(process.execPath, [join(SKILL, 'scripts', 'make-artifact.mjs'), join(out, 'neg.aivj.json'), '--out', join(out, 'neg.html')], { stdio: 'pipe' });
    try { execFileSync(process.execPath, [join(SKILL, 'scripts', 'loop_check.mjs'), join(out, 'neg.html')], { stdio: 'pipe' }); bad('loop_check não reprovou um loop quebrado (o teste não consegue falhar)'); }
    catch (e) { e.status === 1 ? ok('loop_check reprova o controle negativo') : skipB('controle negativo pulado'); }
  } catch (e) { bad('controle negativo: ' + String(e.message).slice(0, 200)); }
} catch (e) {
  const msg = String(e.stderr || e.stdout || e.message).slice(0, 300);
  e.status === 3 ? console.log('  --   receitas puladas: ' + msg.trim().split('\n')[0]) : bad('receitas: ' + msg);
}
// V5: aba Ficha (paridade das calculadoras JS x Python, fluxo, JSON exportado, injeção de HTML)
try {
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'ui_check.mjs')], { stdio: 'pipe' });
  ok('interface: aba Ficha (paridade, fluxo, segurança)');
} catch (e) {
  e.status === 3 ? skipB('ui_check pulado (sem navegador)') : bad('ui_check: ' + String(e.stdout).split('\n').filter(l => /ERRO/.test(l)).slice(0, 4).join(' | '));
}
// V5: receitas embutidas, paleta OKLCH (paridade com palette.py) e aba Receitas
try {
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'recipes_ui_check.mjs')], { stdio: 'pipe' });
  ok('interface: receitas e paleta OKLCH (embutido, histórico, paridade, segurança)');
} catch (e) {
  e.status === 3 ? skipB('recipes_ui_check pulado (sem navegador)') : bad('recipes_ui_check: ' + String(e.stdout).split('\n').filter(l => /ERRO/.test(l)).slice(0, 4).join(' | '));
}
// V5: layout, tema, histórico, números e coordenadas
try {
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'ui_layout_check.mjs')], { stdio: 'pipe' });
  ok('interface: layout, tema, histórico, números e coordenadas');
} catch (e) {
  e.status === 3 ? skipB('ui_layout_check pulado (sem navegador)') : bad('ui_layout_check: ' + String(e.stdout).split('\n').filter(l => /ERRO/.test(l)).slice(0, 4).join(' | '));
}
// receitas embutidas no motor = references/recipes
try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'embed-recipes.mjs'), '--check'], { stdio: 'pipe' }); ok('receitas embutidas no motor em dia'); }
catch (e) { bad('receitas embutidas: ' + String(e.stderr || e.stdout).trim().slice(0, 160)); }
// V6: botão Cor, menu na linha do divisor, +Efeitos com prévia, ajuda, idioma EN/PT-BR e objeto 3D
try {
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'features_check.mjs')], { stdio: 'pipe' });
  ok('interface: paletas, +Efeitos, ajuda, idioma e objeto 3D');
} catch (e) {
  e.status === 3 ? skipB('features_check pulado (sem navegador)') : bad('features_check: ' + String(e.stdout).split('\n').filter(l => /ERRO/.test(l)).slice(0, 4).join(' | '));
}
try { execFileSync(process.execPath, [join(ROOT, 'scripts', 'embed-glsl-lib.mjs'), '--check'], { stdio: 'pipe' }); ok('biblioteca GLSL embutida no motor em dia'); }
catch (e) { bad('GLSL embed: ' + String(e.stderr || e.stdout).trim().slice(0, 160)); }
// V7: vocabulário de áudio estendido, layer.mod e ponte ISF
const NL = String.fromCharCode(10);
for (const [f, label] of [['v7_check.mjs', 'áudio V7 (tempo integrado fecha o loop) e layer.mod'], ['isf_check.mjs', 'ponte ISF (exportar, importar, compilar)'], ['lib_check.mjs', 'biblioteca GLSL (#include) compila e desenha'], ['generator_check.mjs', 'gerador sem IA (12 climas), brief, esquema e estratégia de áudio']]) {
  try { execFileSync(process.execPath, [join(SKILL, 'scripts', f)], { stdio: 'pipe' }); ok(label); }
  catch (e) { e.status === 3 ? skipB(`${f} pulado (sem navegador)`) : bad(`${f}: ` + String(e.stdout).split(NL).filter(l => /ERRO/.test(l)).slice(0, 4).join(' | ')); }
}
// visualizador de arquivos gerados (OUTPUT.html)
try {
  const dir = (await import('node:fs')).mkdtempSync(join(tmpdir(), 'aivj-out-')), fs = await import('node:fs');
  fs.writeFileSync(join(dir, 'a.aivj.json'), '{"x":"<script>alert(1)</script>"}'); fs.writeFileSync(join(dir, 'b.md'), '# oi');
  execFileSync(process.execPath, [join(SKILL, 'scripts', 'output_viewer.mjs'), dir, '--lang', 'pt'], { stdio: 'pipe' });
  const h = fs.readFileSync(join(dir, 'OUTPUT.html'), 'utf8');
  /<details/.test(h) && !/<script>alert/.test(h) && h.includes('a.aivj.json') ? ok('output_viewer gera OUTPUT.html e escapa o conteúdo') : bad('output_viewer: página inválida ou sem escape');
} catch (e) { bad('output_viewer: ' + String(e.message).slice(0, 160)); }
const needBrowser = process.argv.includes('--require-browser');
if (skippedBrowser.length) {
  console.log(`\nATENCAO: ${skippedBrowser.length} teste(s) de navegador foram PULADOS; o motor nao foi exercitado.`);
  console.log('  Defina CHROME_PATH (ou --chrome) e rode de novo. Use --require-browser para tratar isso como falha.');
  if (needBrowser) fail++;
}
console.log(fail ? `\n${fail} problema(s).` : skippedBrowser.length ? '\nTudo certo, MAS sem testes de navegador (veja o aviso acima).' : '\nTudo certo.');
process.exit(fail ? 1 : 0);
