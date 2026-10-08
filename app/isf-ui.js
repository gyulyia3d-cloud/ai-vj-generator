/* Aba "ISF" e camada "isf": biblioteca de 84 geradores ISF escolhidos nos parâmetros da camada, e importação de arquivos .fs como camada de shader.
   Porte do importador de skill/ai-vj-generator/scripts/isf.py (o teste isf_ui_check.mjs compara os dois na biblioteca inteira).
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

  return { parse, blockers, convert, fnum };
})();

const ISFUI = { q: '', kind: 'todos', open: null, msg: null };
function isfInsert(layer, notes) {
  const comp = cur(), at = clamp(ST.sel + 1, 0, comp.layers.length); comp.layers.splice(at, 0, layer); ST.sel = at;
  buildStage(); refreshAll(); commit(false, 'ISF ' + layer.name);
  const body = shaderBody(layer.type === 'isf' ? { src: isfLib(layer.p.lib).src } : pm(layer)); glProg(body); const err = GL.err.get(body);
  ISFUI.msg = err ? { bad: true, text: T3('A camada entrou, mas o shader não compilou no WebGL1: ', 'The layer was added, but the shader did not compile in WebGL1: ') + err.split('\n')[0] }
    : { text: T3(`Camada "${layer.name.toLowerCase()}" adicionada. Ajuste em Parâm.`, `Layer "${layer.name.toLowerCase()}" added. Tune it in Params.`) + (notes.length ? ' ' + notes.join('; ') : '') };
  toast(ISFUI.msg.text, 2600); if (ST.tab === 'isf') renderIsf();
  return !err;
}
function isfAddLib(id) {
  const it = ISFLIB.find(x => x.id === id); if (!it) return false;
  try { isfLib(id); return isfInsert({ type: 'isf', name: it.name.toUpperCase().slice(0, 28), on: true, opacity: 1, blend: 'add', role: `ISF library (${it.license}). Credit: ${it.credit}.`, p: { lib: id } }, []); }
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
function renderIsf() {
  const el = pane('isf'); if (!el) return;
  const q = ISFUI.q.toLowerCase(), k = ISFUI.kind;
  const list = ISFLIB.filter(x => (k === 'todos' || x.origin === k) && (!q || (x.name + ' ' + x.credit + ' ' + x.description).toLowerCase().includes(q)));
  const chips = [['todos', T3('Todos', 'All')], ['original', T3('Originais do projeto', 'Project originals')], ['third-party', T3('De terceiros (MIT, CC0)', 'Third party (MIT, CC0)')]];
  
  el.innerHTML = `<h2 class="sec">ISF <span class="lbl">${ISFLIB.length} ${T3('na biblioteca', 'in the library')}</span></h2>
    <p class="note">${T3('ISF é um formato de shader GLSL com cabeçalho JSON. Aqui você adiciona geradores da biblioteca como camadas (tipo ISF; o shader é escolhido nos parâmetros da camada) e importa os seus .fs.', 'ISF is a GLSL shader format with a JSON header. Add library generators as layers here (type ISF; the shader is chosen in the layer parameters) and import your own .fs.')}</p>
    ${ISFUI.msg ? `<div class="${ISFUI.msg.bad ? 'val' : 'note'}" role="status"><p class="${ISFUI.msg.bad ? 'ERROR' : ''}">${esc(ISFUI.msg.text)}</p></div>` : ''}
    <h2 class="sec">${T3('Importar arquivo .fs', 'Import .fs file')}</h2>
    <div class="row"><input type="file" id="isfFile" accept=".fs,.frag,.txt" multiple aria-label="${T3('Arquivo ISF', 'ISF file')}"><span class="lbl">${T3('Só geradores de um passe (sem imagem de entrada, sem áudio como textura).', 'Single-pass generators only (no input image, no audio texture).')}</span></div>
    <h2 class="sec">${T3('Biblioteca', 'Library')}</h2>
    <div class="row"><input type="search" id="isfQ" placeholder="${T3('Buscar: spiral, noise, laser…', 'Search: spiral, noise, laser…')}" value="${esc(ISFUI.q)}" aria-label="${T3('Buscar shader ISF', 'Search ISF shader')}" style="flex:1;min-width:120px"></div>
    <div class="row chips">${chips.map(([v, l]) => `<button data-isfk="${v}" aria-pressed="${k === v}">${l}</button>`).join('')}</div>
    ${list.map(x => `<article class="rcard" data-isf="${esc(x.id)}"><header><b>${esc(x.name)}</b><span class="tag ${x.origin === 'original' ? 'd' : 'f'}">${x.origin === 'original' ? 'AIVJ' : esc(x.license)}</span></header>
      ${x.thumb ? `<img class="rcprev" src="${x.thumb}" alt="" width="128" style="display:block;max-width:100%;height:auto;border-radius:4px">` : ''}
      <p>${esc(x.description || '')}</p>
      <dl class="kv"><dt>${T3('Autoria', 'Credit')}</dt><dd>${esc(x.credit)}</dd><dt>${T3('Licença', 'Licence')}</dt><dd>${esc(x.license)}</dd><dt>${T3('Origem', 'Source')}</dt><dd>${esc(x.source)}</dd></dl>
      <div class="row"><button data-isfadd="${esc(x.id)}">${T3('Adicionar à composição', 'Add to composition')}</button></div></article>`).join('') || `<p class="note">${T3('Nenhum shader com esse termo.', 'No shader matches.')}</p>`}`;
  $('#isfFile').onchange = e => { const f = [...e.target.files]; e.target.value = ''; if (f.length) isfImportFiles(f); };
  $('#isfQ').oninput = e => { ISFUI.q = e.target.value; const pos = e.target.selectionStart; renderIsf(); const n = $('#isfQ'); n.focus(); n.setSelectionRange(pos, pos); };
  $$('[data-isfk]', el).forEach(b => b.onclick = () => { ISFUI.kind = b.dataset.isfk; renderIsf(); });
  $$('[data-isfadd]', el).forEach(b => b.onclick = () => isfAddLib(b.dataset.isfadd));
}

/* camada "isf": o shader da biblioteca é escolhido em lib; p1..p4 são as quatro primeiras entradas float do ISF, de 0 a 1 na faixa MIN..MAX da entrada (-1 = valor padrão do ISF).
   A conversão depende só do ISF, dos compassos e do BPM, então o quadro continua função pura do projeto. */
const ISF_CACHE = new Map();
function isfLib(id) {
  const it = ISFLIB.find(x => x.id === id) || ISFLIB[0], key = it.id + '|' + P.time.bars + '|' + P.time.bpm;
  if (!ISF_CACHE.has(key)) { const r = ISFX.convert(it.src, it.name, P.time.bars, P.time.bpm); ISF_CACHE.set(key, { src: r.layer.p.src, mapped: r.mapped }); }
  return ISF_CACHE.get(key);
}
reg('isf', 'ISF (biblioteca)', 'gen', [
  S('lib', 'Shader ISF (' + ISFLIB.length + ' na biblioteca)', ISFLIB[0].id, ISFLIB.map(x => x.id)),
  N('p1', 'P1 · 1ª entrada do ISF (−1 = padrão)', -1, -1, 1), N('p2', 'P2 · 2ª entrada (−1 = padrão)', -1, -1, 1), N('p3', 'P3 · 3ª entrada (−1 = padrão)', -1, -1, 1), N('p4', 'P4 · 4ª entrada (−1 = padrão)', -1, -1, 1),
  S('alphaMode', 'Saída', 'opaque', ['alpha', 'opaque']), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const lib = isfLib(R.p.lib), q = {};
  lib.mapped.forEach((m, k) => { const f = R.p['p' + (k + 1)]; q['p' + (k + 1)] = f == null || f < 0 ? m.def : (m.min != null && m.max != null ? m.min + f * (m.max - m.min) : f); });
  GEN.shader.draw(c, Object.assign({}, R, { p: Object.assign({}, R.p, q, { src: lib.src }) }));
});
