/* Camada "isf": biblioteca de 84 geradores ISF escolhidos nos parâmetros da camada. O conversor também importa um arquivo .fs (scripts/isf.py import).
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
    if (/\bfor\s*\([^;]*;[^;]*[<>=]\s*[A-Za-z_]/.test(body)) notes.push(T3('o limite de um `for` pode ser variável: o GLSL pode exigir constante; o validador avisa', 'a `for` loop bound may be a variable: WebGL1 needs constant bounds; the validator will tell'));
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
