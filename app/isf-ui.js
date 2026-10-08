/* Aba "ISF": biblioteca de geradores ISF (Resolume, VDMX, MadMapper), importar arquivo .fs, exportar as camadas de shader como .fs.
   Porte do importador/exportador de skill/ai-vj-generator/scripts/isf.py (o teste isf_ui_check.mjs compara os dois na biblioteca inteira).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. A biblioteca (ISFLIB) é gerada por scripts/embed-isf.mjs. Textos pela função T3 (gen-ui.js). */
const ISFX = (() => {
  const HEAD_RE = /^\/\*\s*(\{[\s\S]*?\})\s*\*\//;
  const fnum = x => { const n = Number(x); return Number.isInteger(n) ? n.toFixed(1) : String(n); };   // GLSL ES 1.00 não converte int em float
  function parse(text) {
    const t = String(text).replace(/^﻿/, '').replace(/^\s+/, ''), m = HEAD_RE.exec(t);
    if (!m) throw new Error(T3('o arquivo não tem o cabeçalho JSON do ISF (/* { ... } */)', 'the file has no ISF JSON header (/* { ... } */)'));
    let h; try { h = JSON.parse(m[1]); } catch (e) { throw new Error(T3('cabeçalho ISF com JSON inválido: ', 'ISF header with invalid JSON: ') + e.message); }
    return { h, body: t.slice(m[0].length) };
  }
  function blockers(h, body) {
    const why = [];
    if (h.PASSES && h.PASSES.length) why.push(T3('vários passes ou buffers persistentes (PASSES): precisa da camada sim, ainda não existe', 'multi-pass or persistent buffers (PASSES): needs the sim layer, not available yet'));
    for (const i of h.INPUTS || []) if (['image', 'audio', 'audioFFT'].includes(i.TYPE)) why.push(T3(`a entrada ${i.NAME} é ${i.TYPE} (filtros e texturas de áudio não entram; só geradores)`, `input ${i.NAME} is ${i.TYPE} (filters and audio textures are not supported; generators only)`));
    if (h.IMPORTED) why.push(T3('imagens IMPORTED', 'IMPORTED images'));
    if (/\bIMG_\w+\s*\(|\bsampler2D\b|\btexture2D\b/.test(body)) why.push(T3('lê texturas', 'samples textures'));
    return why;
  }
  /* nomes que o motor já declara (hash, noise, fbm, uPulse...): o ISF que declara o mesmo nome é renomeado para isf_<nome>, senão o GLSL recusa a redefinição */
  function reserved() {
    const out = new Set();
    for (const m of GL_HEAD.matchAll(/uniform\s+\w+\s+([\w,\s]+);/g)) m[1].split(',').forEach(n => out.add(n.trim()));
    for (const m of GL_HEAD.matchAll(/^\s*(?:float|vec\d|mat\d|int|bool)\s+(\w+)\s*\(/gm)) out.add(m[1]);
    return out;
  }
  const NAMED = (bars, bpm) => ({ phase: 'uPh', loopBars: fnum(bars), bpm: fnum(bpm), bass: 'uBass', mid: 'uMid', high: 'uHigh', rms: 'uRms', hit: 'uHit', midhit: 'uMidHit', highhit: 'uHighHit', pres: 'uPres' });
  const NAMED_COL = { c1: 'uC1', c2: 'uC2', cbg: 'uBg' };
  function convert(text, fileName, bars = 4, bpm = 120) {
    const { h, body: body0 } = parse(text), why = blockers(h, body0);
    if (why.length) throw Object.assign(new Error(why.join('; ')), { why });
    const secs = bars * 4 * 60 / bpm, decl = [], setv = [], floats = [], colors = [], notes = [], named = NAMED(bars, bpm);
    const res = reserved(), rn = n => res.has(n) ? 'isf_' + n : n;
    for (const i of h.INPUTS || []) {
      const n = rn(i.NAME), ty = i.TYPE, d = i.DEFAULT;
      if (ty === 'float' && i.NAME in named) { decl.push(`float ${n};`); setv.push(`${n}=${named[i.NAME]};`); }
      else if (ty === 'color' && i.NAME in NAMED_COL) { decl.push(`vec4 ${n};`); setv.push(`${n}=vec4(${NAMED_COL[i.NAME]},1.0);`); }
      else if (ty === 'float') {
        if (floats.length < 4) { floats.push([n, d == null ? 0 : Number(d), i]); decl.push(`float ${n};`); setv.push(`${n}=uP.${'xyzw'[floats.length - 1]};`); }
        else { decl.push(`float ${n};`); setv.push(`${n}=${fnum(d != null ? d : 0)};`); notes.push(T3(`${n} fica no valor padrão (só p1..p4 são tocáveis)`, `${n} fixed at default (only p1..p4 are playable)`)); }
      } else if (ty === 'long') { const v = parseInt(d != null ? d : (i.VALUES || [0])[0], 10); decl.push(`int ${n};`); setv.push(`${n}=${v};`); }
      else if (ty === 'bool') { decl.push(`bool ${n};`); setv.push(`${n}=${d ? 'true' : 'false'};`); }
      else if (ty === 'event') { decl.push(`bool ${n};`); setv.push(`${n}=false;`); }
      else if (ty === 'color') {
        const c = d || [1, 1, 1, 1]; decl.push(`vec4 ${n};`);
        if (colors.length < 2) { setv.push(`${n}=vec4(${colors.length ? 'uC2' : 'uC1'},1.0);`); colors.push(n); }
        else setv.push(`${n}=vec4(${fnum(c[0])},${fnum(c[1])},${fnum(c[2])},${fnum(c.length > 3 ? c[3] : 1)});`);
      } else if (ty === 'point2D') { const c = d || [0.5, 0.5]; decl.push(`vec2 ${n};`); setv.push(`${n}=vec2(${fnum(c[0])},${fnum(c[1])});`); }
      else notes.push(T3(`entrada ${n} do tipo ${ty} ignorada`, `input ${n} of type ${ty} ignored`));
    }
    let body = body0.replace(/^[ \t]*#define[ \t]+TAU\b.*$/gm, '').replace(/^[ \t]*(?:const\s+)?float\s+TAU\s*=[^;]*;/gm, '');
    if (res.size) body = body.replace(new RegExp('\\b(' + [...res].join('|') + ')\\b', 'g'), 'isf_$1');
    const sub = [[/\bTIME\b/g, `(uPh*${secs.toFixed(6)})`], [/\bTIMEDELTA\b/g, '(1.0/30.0)'], [/\bRENDERSIZE\b/g, 'uRes'],
      [/\bFRAMEINDEX\b/g, `int(floor(uPh*${(secs * 30).toFixed(3)}))`], [/\bPASSINDEX\b/g, '0'], [/\b(isf|vv)_FragNormCoord\b/g, '(gl_FragCoord.xy/uRes)']];
    for (const [re, v] of sub) body = body.replace(re, v);
    const before = body; body = body.replace(/\bvoid\s+main\s*\(\s*(?:void)?\s*\)/, 'void isfMain()');
    if (body === before) throw Object.assign(new Error(T3('o ISF não tem main()', 'no main() in the ISF')), { why: [] });
    if (!/\bgl_FragCoord\b/.test(body) && !body.includes('uRes')) notes.push(T3('o shader não lê a posição do pixel', 'shader does not read the pixel position'));
    if (/\bfor\s*\([^;]*;[^;]*[<>=]\s*[A-Za-z_]/.test(body)) notes.push(T3('o limite de um `for` pode ser variável: o WebGL1 exige constante; o validador avisa', 'a `for` loop bound may be a variable: WebGL1 needs constant bounds; the validator will tell'));
    const hook = '\nvoid main(){ ' + setv.join(' ') + ' isfMain(); float a=1.0+.25*uBass+.12*uMid+.1*uHigh+.2*uHit; gl_FragColor.rgb*=a; }\n';
    const src = decl.join('\n') + '\n' + body + hook, credit = (h.CREDIT || 'unknown author').trim();
    const base = String(fileName || 'ISF').replace(/^.*[\\/]/, '').replace(/\.[^.]+$/, '');
    const layer = { type: 'shader', name: base.toUpperCase().slice(0, 28), on: true, opacity: 1, blend: 'add',
      role: `Imported ISF generator (${(h.DESCRIPTION || 'no description').slice(0, 80)}). Credit: ${credit}. Audio hook added by the importer.`,
      p: Object.assign({ src, alphaMode: 'opaque', c1: 'primary', c2: 'accent' }, ...floats.map((f, k) => ({ ['p' + (k + 1)]: f[1] }))) };
    return { layer, notes, mapped: floats.map((f, k) => ({ isf: f[0], to: 'p' + (k + 1), min: f[2].MIN, max: f[2].MAX, def: f[1] })) };
  }

  /* exportar: camada de shader do projeto -> .fs (mesmo prelúdio de isf.py) */
  const PRELUDE = seed => `// ISF prelude: maps the engine uniforms onto ISF inputs
#define uRes RENDERSIZE
#define uT TIME
#define uPh phase
#define uP vec4(p1,p2,p3,p4)
#define uC1 c1.rgb
#define uC2 c2.rgb
#define uBg cbg.rgb
#define uAlpha 1.0
#define uSeed ${seed}
#define uBpm (bpm/100.0)
#define uBeat floor(phase*loopBeats)
#define uBp fract(phase*loopBeats)
#define uOnBeat exp(-uBp*8.0)
#define uPulse exp(-uBp*5.0)
#define uBass bass
#define uMid mid
#define uHigh high
#define uRms rms
#define uHit hit
#define uMidHit midhit
#define uHighHit highhit
#define uPres pres
#define uAud bass
#define uBassT (phase*loopBars)
#define uMidT (phase*loopBars)
#define uHighT (phase*loopBars)
#define uAudT (phase*loopBars)
#define uBSin (0.5+0.5*sin(TAU*phase*loopBeats))
#define uBSin2 (0.5+0.5*sin(0.5*TAU*phase*loopBeats))
#define uBSin4 (0.5+0.5*sin(0.25*TAU*phase*loopBeats))
#define uBTri (1.0-abs(2.0*fract(phase*loopBeats)-1.0))
`;
  const hexrgb = h => { h = String(h).replace(/^#/, ''); return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255).concat([1]); };
  function exportLayer(proj, ci, li, helpers, shaderSrc) {
    const c = proj.compositions[ci], L = c.layers[li], p = L.p || {}, bpm = (proj.time || {}).bpm || 120, bars = (proj.time || {}).bars || 4, pal = proj.palette || {};
    const sh = shaderSrc(L), vals = ['p1', 'p2', 'p3', 'p4'].map((k, i) => p[k] != null ? p[k] : sh.d[i]);
    const f = (n, lab, d, lo, hi) => ({ NAME: n, LABEL: lab, TYPE: 'float', DEFAULT: d, MIN: lo, MAX: hi });
    const col = (key, dflt) => { const v = p[key] != null ? p[key] : dflt; return /^#/.test(v) ? hexrgb(v) : pal[v] ? hexrgb(pal[v]) : [1, 1, 1, 1]; };
    const inputs = [f('phase', 'Loop phase (0-1, automate)', 0, 0, 1), f('loopBars', 'Bars per loop', bars, 1, 64), f('bpm', 'BPM', bpm, 40, 240),
      f('p1', 'P1', vals[0], -40, 40), f('p2', 'P2', vals[1], -40, 40), f('p3', 'P3', vals[2], -40, 40), f('p4', 'P4', vals[3], -40, 40),
      { NAME: 'c1', LABEL: 'Colour 1', TYPE: 'color', DEFAULT: col('c1', 'primary') }, { NAME: 'c2', LABEL: 'Colour 2', TYPE: 'color', DEFAULT: col('c2', 'accent') },
      { NAME: 'cbg', LABEL: 'Background', TYPE: 'color', DEFAULT: col('cbg', 'bg') }];
    for (const n of ['bass', 'mid', 'high', 'rms', 'hit', 'midhit', 'highhit', 'pres']) inputs.push(f(n, 'Audio ' + n + ' (map from host audio)', 0, 0, 1.5));
    const hdr = { DESCRIPTION: `${(proj.meta || {}).name || 'project'} / ${c.name || ci} / ${L.name || li}`, CREDIT: 'ai-vj-generator', ISFVSN: '2.0', CATEGORIES: ['Generator', 'Audio Reactive'], INPUTS: inputs };
    const seed = (((proj.seed || 1) % 997) * 0.173).toFixed(3);
    const text = '/*' + JSON.stringify(hdr, null, 2) + '*/\n#define TAU 6.28318530718\n' + PRELUDE(seed) + '#define loopBeats (loopBars*4.0)\n' + helpers.replace('#define TAU 6.28318530718\n', '') + '\n' + sh.src + '\n';
    const name = (`${(proj.meta || {}).name || 'project'} ${c.name || ci} ${L.name || li}`).replace(/[^A-Za-z0-9._ -]+/g, '_').trim() + '.fs';
    return { name, text };
  }
  return { parse, blockers, convert, exportLayer, fnum };
})();

const ISFUI = { q: '', kind: 'todos', open: null, msg: null };
function isfHelpers() { return GL_HEAD.split('\n').slice(2).join('\n'); }
function isfShaderSrc(L) { const p = L.p || {}; if (p.src && p.src.trim()) return { src: p.src.trim(), d: [2.2, 0.7, 0.9, 1.4] }; const s = SHADERS[p.preset] || SHADERS['CAMPO FBM']; return { src: s.src.trim(), d: s.d }; }
function isfInsert(layer, notes) {
  const comp = cur(), at = clamp(ST.sel + 1, 0, comp.layers.length); comp.layers.splice(at, 0, layer); ST.sel = at;
  buildStage(); refreshAll(); commit(false, 'ISF ' + layer.name);
  const body = shaderBody(pm(layer)); glProg(body); const err = GL.err.get(body);
  ISFUI.msg = err ? { bad: true, text: T3('A camada entrou, mas o shader não compilou no WebGL1: ', 'The layer was added, but the shader did not compile in WebGL1: ') + err.split('\n')[0] }
    : { text: T3(`Camada "${layer.name.toLowerCase()}" adicionada. Ajuste em Parâm.`, `Layer "${layer.name.toLowerCase()}" added. Tune it in Params.`) + (notes.length ? ' ' + notes.join('; ') : '') };
  toast(ISFUI.msg.text, 2600); if (ST.tab === 'isf') renderIsf();
  return !err;
}
function isfAddLib(id) {
  const it = ISFLIB.find(x => x.id === id); if (!it) return false;
  try { const r = ISFX.convert(it.src, it.name, P.time.bars, P.time.bpm); r.layer.role = r.layer.role.replace('Imported ISF generator', 'ISF library (' + it.license + ')'); return isfInsert(r.layer, r.notes); }
  catch (e) { ISFUI.msg = { bad: true, text: e.message }; if (ST.tab === 'isf') renderIsf(); return false; }
}
async function isfImportFiles(files) {
  const out = [];
  for (const f of files) {
    try { const r = ISFX.convert(await f.text(), f.name, P.time.bars, P.time.bpm); const ok = isfInsert(r.layer, r.notes); out.push({ name: f.name, ok }); }
    catch (e) { out.push({ name: f.name, ok: false, why: e.message }); }
  }
  const bad = out.filter(o => !o.ok);
  ISFUI.msg = { bad: bad.length > 0, text: T3(`${out.length - bad.length} de ${out.length} arquivo(s) importado(s).`, `${out.length - bad.length} of ${out.length} file(s) imported.`) + bad.map(o => ` ${o.name}: ${o.why || T3('não compilou', 'did not compile')}.`).join('') };
  if (ST.tab === 'isf') renderIsf();
}
function isfExport(all) {
  const layers = []; P.compositions.forEach((c, ci) => c.layers.forEach((L, li) => { if (L.type === 'shader' && (all || (ci === ST.ci && li === ST.sel))) layers.push([ci, li]); }));
  if (!layers.length) { ISFUI.msg = { bad: true, text: all ? T3('O projeto não tem camada de shader.', 'The project has no shader layer.') : T3('Selecione uma camada de shader na aba Camadas.', 'Select a shader layer in the Layers tab.') }; return renderIsf(); }
  const files = layers.map(([ci, li]) => ISFX.exportLayer(P, ci, li, isfHelpers(), isfShaderSrc));
  files.forEach((f, i) => setTimeout(() => saveFile(f.name, new Blob([f.text], { type: 'text/plain' })), i * 250));
  ISFUI.msg = { text: T3(`${files.length} arquivo(s) .fs. Copie para Documentos/Resolume Arena/ISF e automatize o parâmetro phase de 0 a 1 durante o loop (${P.time.bars} compassos).`, `${files.length} .fs file(s). Copy to Documents/Resolume Arena/ISF and automate the phase input from 0 to 1 over the loop (${P.time.bars} bars).`) };
  renderIsf();
}
function renderIsf() {
  const el = pane('isf'); if (!el) return;
  const q = ISFUI.q.toLowerCase(), k = ISFUI.kind;
  const list = ISFLIB.filter(x => (k === 'todos' || x.origin === k) && (!q || (x.name + ' ' + x.credit + ' ' + x.description).toLowerCase().includes(q)));
  const chips = [['todos', T3('Todos', 'All')], ['original', T3('Originais do projeto', 'Project originals')], ['third-party', T3('De terceiros (MIT, CC0)', 'Third party (MIT, CC0)')]];
  const sel = cur().layers[ST.sel], canOne = sel && sel.type === 'shader';
  el.innerHTML = `<h2 class="sec">ISF <span class="lbl">${ISFLIB.length} ${T3('na biblioteca', 'in the library')}</span></h2>
    <p class="note">${T3('ISF é o formato de shader que Resolume, VDMX e MadMapper abrem. Aqui você usa shaders ISF como camadas, importa os seus e leva os shaders do projeto para o Resolume.', 'ISF is the shader format Resolume, VDMX and MadMapper open. Use ISF shaders as layers here, import your own, and take the project shaders to Resolume.')}</p>
    ${ISFUI.msg ? `<div class="${ISFUI.msg.bad ? 'val' : 'note'}" role="status"><p class="${ISFUI.msg.bad ? 'ERROR' : ''}">${esc(ISFUI.msg.text)}</p></div>` : ''}
    <h2 class="sec">${T3('Importar arquivo .fs', 'Import .fs file')}</h2>
    <div class="row"><input type="file" id="isfFile" accept=".fs,.frag,.txt" multiple aria-label="${T3('Arquivo ISF', 'ISF file')}"><span class="lbl">${T3('Só geradores de um passe (sem imagem de entrada, sem áudio como textura).', 'Single-pass generators only (no input image, no audio texture).')}</span></div>
    <h2 class="sec">${T3('Exportar para o Resolume', 'Export to Resolume')}</h2>
    <div class="row"><button id="isfExpOne" ${canOne ? '' : 'disabled'} title="${T3('A camada de shader selecionada', 'The selected shader layer')}">${T3('Exportar camada selecionada (.fs)', 'Export selected layer (.fs)')}</button><button id="isfExpAll">${T3('Exportar todas as camadas de shader', 'Export all shader layers')}</button></div>
    <h2 class="sec">${T3('Biblioteca', 'Library')}</h2>
    <div class="row"><input type="search" id="isfQ" placeholder="${T3('Buscar: spiral, noise, laser…', 'Search: spiral, noise, laser…')}" value="${esc(ISFUI.q)}" aria-label="${T3('Buscar shader ISF', 'Search ISF shader')}" style="flex:1;min-width:120px"></div>
    <div class="row chips">${chips.map(([v, l]) => `<button data-isfk="${v}" aria-pressed="${k === v}">${l}</button>`).join('')}</div>
    ${list.map(x => `<article class="rcard" data-isf="${esc(x.id)}"><header><b>${esc(x.name)}</b><span class="tag ${x.origin === 'original' ? 'd' : 'f'}">${x.origin === 'original' ? 'AIVJ' : esc(x.license)}</span></header>
      ${x.thumb ? `<img class="rcprev" src="${x.thumb}" alt="" width="128" style="display:block;max-width:100%;height:auto;border-radius:4px">` : ''}
      <p>${esc(x.description || '')}</p>
      <dl class="kv"><dt>${T3('Autoria', 'Credit')}</dt><dd>${esc(x.credit)}</dd><dt>${T3('Licença', 'Licence')}</dt><dd>${esc(x.license)}</dd><dt>${T3('Origem', 'Source')}</dt><dd>${esc(x.source)}</dd></dl>
      <div class="row"><button data-isfadd="${esc(x.id)}">${T3('Adicionar à composição', 'Add to composition')}</button></div></article>`).join('') || `<p class="note">${T3('Nenhum shader com esse termo.', 'No shader matches.')}</p>`}`;
  $('#isfFile').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) isfImportFiles(f); };
  $('#isfExpOne').onclick = () => isfExport(false); $('#isfExpAll').onclick = () => isfExport(true);
  $('#isfQ').oninput = e => { ISFUI.q = e.target.value; const pos = e.target.selectionStart; renderIsf(); const n = $('#isfQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-isfk]', el).forEach(b => b.onclick = () => { ISFUI.kind = b.dataset.isfk; renderIsf(); });
  $$('[data-isfadd]', el).forEach(b => b.onclick = () => isfAddLib(b.dataset.isfadd));
}
