/* Editor de modulação (fase 3): layer.mod sem escrever JSON. Fonte (banda, detector, onda do BPM, LFO ou curva de perfil de movimento) -> parâmetro numérico, com mínimo, máximo e modo.
   Aparece na aba Parâm., abaixo dos parâmetros da camada. Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Textos pela função T3 (gen-ui.js). */
const MOD_SOURCES = [
  ['bass', 'grave', 'bass'], ['mid', 'médio', 'mid'], ['high', 'agudo', 'high'], ['rms', 'volume', 'volume'], ['hit', 'golpe do grave', 'bass hit'], ['mhit', 'golpe do médio', 'mid hit'], ['hhit', 'golpe do agudo', 'high hit'],
  ['kick', 'kick (detector com histórico)', 'kick (detector with history)'], ['onset', 'ataque (qualquer)', 'onset (any)'], ['flux', 'fluxo espectral', 'spectral flux'], ['pres', 'presença', 'presence'],
  ['onbeat', 'onda: no beat', 'wave: on the beat'], ['bsin', 'onda: seno por beat', 'wave: sine per beat'], ['bsin2', 'onda: seno por 2 beats', 'wave: sine per 2 beats'], ['bsin4', 'onda: seno por 4 beats', 'wave: sine per 4 beats'], ['btri', 'onda: triângulo por beat', 'wave: triangle per beat'],
  ['lfo', 'LFO (ciclos inteiros por loop)', 'LFO (whole cycles per loop)'],
];
/* formas de atenção para o LFO (vocabulário que o animate.css popularizou, curvas escritas aqui): f(x) de 0..1 dentro do ciclo, sempre com f(0) = f(1) para o loop fechar */
const LFO_X = (() => {
  const T = Math.PI * 2, c = x => Math.max(0, Math.min(1, x)), g = (x, m, w) => Math.exp(-Math.pow((x - m) / w, 2)), hb0 = g(0, 0.08, 0.035) + 0.6 * g(0, 0.24, 0.045);
  return {
    bounce: x => c(Math.abs(Math.sin(Math.PI * 3 * x)) * Math.pow(1 - x, 1.2)),
    rubber: x => c(0.5 + 0.5 * Math.sin(T * 4 * x) * Math.exp(-5 * x)),
    shake: x => c(0.5 + 0.5 * Math.sin(T * 7 * x) * (1 - x) * Math.min(1, x * 8)),
    jello: x => c(0.5 + 0.5 * Math.sin(T * 3 * x) * Math.exp(-3.5 * x)),
    tada: x => c(0.5 + 0.5 * Math.sin(T * 5 * x) * Math.sin(Math.PI * x)),
    heartbeat: x => c(g(x, 0.08, 0.035) + 0.6 * g(x, 0.24, 0.045) - hb0),
    swing: x => c(0.5 + 0.5 * Math.sin(T * 3 * x) * (1 - x)),
    wobble: x => c(0.5 + 0.5 * Math.sin(T * 2 * x) * Math.sin(T * 3 * x)),
    pulse: x => Math.pow(0.5 + 0.5 * Math.cos(T * x), 6),
  };
})();
const MOD_FREE_SRC = ['lfo', 'onbeat', 'bsin', 'bsin2', 'bsin4', 'btri'];
function modNumericParams(L) { return paramGroups(L).flatMap(g => g[1]).filter(d => d.t === 'n' && d.k !== 'audio').map(d => ({ k: d.k, l: d.l, d: d.d, min: d.min, max: d.max })); }
function modPanel(host, L) {
  const old = host.querySelector('#modPanel'); if (old) old.remove();
  const box = document.createElement('div'); box.id = 'modPanel'; host.appendChild(box);
  const defs = modNumericParams(L), mods = Array.isArray(L.mod) ? L.mod : [], en = ST.lang === 'en';
  const reactive = (P.compositions[ST.ci] ? P.compositions[ST.ci].layers : []).filter(x => x.on !== false && Array.isArray(x.mod) && x.mod.some(m => m && !MOD_FREE_SRC.includes(m.src))).length;
  const opt = (arr, cur) => arr.map(([v, l]) => `<option value="${esc(v)}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`).join('');
  const num = (i, k, v, w = 56) => `<input type="text" data-mk="${k}" data-mi="${i}" value="${esc(v == null ? '' : v)}" style="width:${w}px" aria-label="${k}">`;
  const rows = mods.map((m, i) => `<div class="modrow" data-mrow="${i}"><div class="row">
      <select data-mk="k" data-mi="${i}" aria-label="${T3('Parâmetro', 'Parameter')}">${opt(defs.map(d => [d.k, d.l + ' (' + d.k + ')']), m.k)}${defs.some(d => d.k === m.k) ? '' : `<option selected>${esc(m.k)}</option>`}</select>
      <select data-mk="src" data-mi="${i}" aria-label="${T3('Fonte', 'Source')}">${opt(MOD_SOURCES.map(([v, pt, e]) => [v, en ? e : pt]), m.src)}</select>
      <select data-mk="mode" data-mi="${i}" aria-label="${T3('Modo', 'Mode')}">${opt([['set', T3('definir', 'set')], ['add', T3('somar', 'add')], ['mul', T3('multiplicar', 'multiply')]], m.mode || 'set')}</select>
      <button data-mdel="${i}" title="${T3('Remover', 'Remove')}">×</button></div>
      <div class="row"><span class="lbl">min</span>${num(i, 'min', m.min == null ? 0 : m.min)}<span class="lbl">max</span>${num(i, 'max', m.max == null ? 1 : m.max)}
      ${m.src === 'lfo' ? `<span class="lbl">${T3('ciclos', 'cycles')}</span>${num(i, 'cycles', m.cycles || 1, 44)}<select data-mk="shape" data-mi="${i}" aria-label="${T3('Forma', 'Shape')}">${opt([['sin', 'sin'], ['tri', 'tri'], ['saw', 'saw'], ['bounce', 'bounce'], ['rubber', 'rubber'], ['shake', 'shake'], ['jello', 'jello'], ['tada', 'tada'], ['heartbeat', 'heartbeat'], ['swing', 'swing'], ['wobble', 'wobble'], ['pulse', 'pulse'], ['spring', T3('mola (perfil)', 'spring (profile)')], ['env', T3('fases (envelope)', 'phases (envelope)')]], m.shape || 'sin')}</select>` : ''}</div>
      ${m.src === 'lfo' && m.shape === 'env' ? `<div class="row"><span class="lbl">${T3('valores por fase', 'phase values')}</span><span class="note">${esc((m.keys || []).join(' · '))}</span></div>` : ''}
      ${m.src === 'lfo' && m.shape === 'spring' ? `<div class="row"><span class="lbl">zeta</span>${num(i, 'zeta', m.zeta, 48)}<span class="lbl">wn</span>${num(i, 'wn', m.wn, 48)}<span class="lbl">${T3('antecip.', 'wind-up')}</span>${num(i, 'ta', m.ta == null ? 0 : m.ta, 48)}<span class="lbl">${T3('prof.', 'depth')}</span>${num(i, 'depth', m.depth == null ? 0 : m.depth, 48)}<span class="lbl">${T3('degraus', 'steps')}</span>${num(i, 'steps', m.steps == null ? 0 : m.steps, 44)}</div>` : ''}
    </div>`).join('');
  const pf = ST.modProf || (ST.modProf = { energy: 0.5, elasticity: 0.4, anticipation: 0.3, continuity: 0.8, rhythm: 0.3 });
  const names = { energy: T3('energia', 'energy'), elasticity: T3('elasticidade', 'elasticity'), anticipation: T3('antecipação', 'anticipation'), continuity: T3('continuidade', 'continuity'), rhythm: T3('ritmo', 'rhythm') };
  box.innerHTML = `<h2 class="sec">${T3('Modulação', 'Modulation')} <span class="lbl">${mods.length}</span></h2>
    <p class="note">${T3('Qualquer parâmetro numérico pode ser movido por uma fonte, sem escrever código. Fontes de áudio contam no limite de 3 camadas reativas por composição; LFO e ondas do BPM são livres e fecham o loop.', 'Any numeric parameter can be driven by a source, without writing code. Audio sources count toward the limit of 3 reactive layers per composition; LFO and BPM waves are free and close the loop.')}${reactive > 3 ? ` <b>${T3('Atenção: ' + reactive + ' camadas reativas nesta composição.', 'Warning: ' + reactive + ' reactive layers in this composition.')}</b>` : ''}</p>
    ${rows || `<p class="note">${T3('Sem modulação nesta camada.', 'No modulation on this layer.')}</p>`}
    <div class="row"><button id="modAdd" ${defs.length ? '' : 'disabled'}>${T3('+ Modulação', '+ Modulation')}</button></div>
    <details class="grp"><summary>${T3('Curva de perfil de movimento', 'Motion profile curve')}</summary>
      <p class="note">${T3('Cinco números viram uma curva de mola: sobe no golpe, oscila e volta antes do próximo. Escolha o parâmetro e aplique.', 'Five numbers become a spring curve: it rises on the hit, rings and returns before the next. Pick the parameter and apply.')}</p>
      ${Object.keys(names).map(k => `<div class="row"><span class="lbl" style="width:96px">${names[k]} <span data-pfv="${k}">${(+pf[k]).toFixed(2)}</span></span><input type="range" min="0" max="1" step="0.05" value="${pf[k]}" data-pf="${k}" style="flex:1"></div>`).join('')}
      <div class="row"><select id="pfTarget" aria-label="${T3('Parâmetro', 'Parameter')}">${opt(defs.map(d => [d.k, d.l + ' (' + d.k + ')']), ST.modTarget || (defs[0] && defs[0].k))}</select><button id="pfApply" ${defs.length ? '' : 'disabled'}>${T3('Aplicar como curva de mola', 'Apply as spring curve')}</button></div>
    </details>`;
  const save = label => { commit(false, label || T3('Modulação', 'Modulation')); };
  const re = () => modPanel(host, L);
  $$('[data-mk]', box).forEach(inp => inp.addEventListener('change', () => {
    const m = mods[+inp.dataset.mi], k = inp.dataset.mk, v = inp.value;
    if (['min', 'max', 'zeta', 'wn', 'ta', 'depth', 'steps', 'cycles'].includes(k)) { const n = evalExpr(v); if (!isFinite(n)) { toast(T3('Digite um número', 'Type a number'), 1400); re(); return; } m[k] = k === 'cycles' || k === 'steps' ? Math.max(k === 'cycles' ? 1 : 0, Math.round(n)) : n; }
    else m[k] = v;
    if (k === 'src' && v !== 'lfo') { delete m.cycles; delete m.shape; for (const q of ['zeta', 'wn', 'ta', 'depth', 'steps']) delete m[q]; }
    if (k === 'shape' && v === 'spring') { const pr = GENAI.profile(ST.modProf.energy, ST.modProf.elasticity, ST.modProf.anticipation, ST.modProf.continuity, ST.modProf.rhythm, P.time.bars), t = GENAI.toMod(pr, m.k); Object.assign(m, { zeta: t.zeta, wn: t.wn, cycles: t.cycles }); if (t.ta) { m.ta = t.ta; m.depth = t.depth; } if (t.steps) m.steps = t.steps; if (m.min == null || m.max == null || m.mode == null) { m.min = t.min; m.max = t.max; m.mode = t.mode; } }
    if (k === 'shape' && v !== 'spring') for (const q of ['zeta', 'wn', 'ta', 'depth', 'steps']) delete m[q];
    if (k === 'shape' && v === 'env' && !Array.isArray(m.keys)) m.keys = [0, 0.25, 1, 0.25, 0];
    if (k === 'shape' && v !== 'env') delete m.keys;
    save(); re();
  }));
  $$('[data-mdel]', box).forEach(b => b.addEventListener('click', () => { mods.splice(+b.dataset.mdel, 1); if (!mods.length) delete L.mod; else L.mod = mods; save(T3('Modulação removida', 'Modulation removed')); re(); }));
  const add = $('#modAdd', box); if (add) add.addEventListener('click', () => { const d = defs.find(x => x.k !== 'x' && x.k !== 'y') || defs[0]; L.mod = mods.concat([{ k: d.k, src: 'bass', min: d.min == null ? 0 : d.min, max: d.max == null ? 1 : d.max, mode: 'set' }]); save(T3('Modulação adicionada', 'Modulation added')); re(); });
  $$('[data-pf]', box).forEach(inp => inp.addEventListener('input', () => { ST.modProf[inp.dataset.pf] = +inp.value; $(`[data-pfv="${inp.dataset.pf}"]`, box).textContent = (+inp.value).toFixed(2); }));
  const tg = $('#pfTarget', box); if (tg) tg.addEventListener('change', () => { ST.modTarget = tg.value; });
  const ap = $('#pfApply', box); if (ap) ap.addEventListener('click', () => { const k = (tg && tg.value) || defs[0].k, pr = GENAI.profile(ST.modProf.energy, ST.modProf.elasticity, ST.modProf.anticipation, ST.modProf.continuity, ST.modProf.rhythm, P.time.bars); L.p = L.p || {}; if (L.p[k] === undefined) L.p[k] = pm(L)[k]; L.mod = (L.mod || []).filter(m => m.k !== k).concat([GENAI.toMod(pr, k)]); save(T3('Curva de movimento', 'Motion curve')); re(); toast(T3('Curva de mola aplicada a ', 'Spring curve applied to ') + k, 1600); });
}
