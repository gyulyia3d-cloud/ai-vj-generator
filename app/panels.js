/* Painéis da interface e validação técnica (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores PANELS. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- painéis ---------- */
const pane = n => $(`.pane[data-pane="${n}"]`);
function refreshAll() { fit(); buildStage(); renderTop(); renderBar(); renderComp(); renderLayers(); renderParams(); renderText(); renderMedia(); renderAudio(); renderProject(); renderSpec(); renderExport(); if ($('#palPop') && !$('#palPop').hidden) renderPop(); }
function renderTop() {
  $('#projName').textContent = P.meta.name + ' · ' + cur().name;
  $('#mStd').setAttribute('aria-pressed', ST.mode === 'standard'); $('#mBrief').setAttribute('aria-pressed', ST.mode === 'briefing');
  $('#bpmv').textContent = +P.time.bpm.toFixed(1);
  $('#stepBtn').setAttribute('aria-pressed', (cur().motion || 'step') === 'step'); $('#stepBtn').textContent = (cur().motion || 'step') === 'step' ? 'Degrau' : 'Suave';
  $('#audBtn').setAttribute('aria-pressed', !!P.audio.reactive);
  $('#undoBtn').disabled = !ST.hist.length;
}
function renderBar() {
  $('#compBtns').innerHTML = P.compositions.map((c, i) => `<button data-ci="${i}" aria-pressed="${i === ST.ci}" title="${esc(c.name)} · Shift+${i + 1}">${pad(i + 1, 2)}</button>`).join('') + `<button data-add title="Duplicar composição ativa">+</button>`;
}
function selectComp(i, quiet) {
  if (i === ST.ci || !P.compositions[i]) return;
  const prev = cur(); startTransition(prev);
  ST.ci = i; ST.solo = -1; ST.sel = Math.min(ST.sel, cur().layers.length - 1);
  buildStage(); renderTop(); renderBar(); renderComp(); renderLayers(); renderParams(); renderText();
  if (!quiet) toast(`${pad(i + 1, 2)} · ${cur().name}`, 1200);
}

/* Contrato criativo (schema 2, opcional): o porquê do projeto, escrito pela skill antes do código */
const CONTRACT_KEYS = [['concept', 'Conceito'], ['audienceEffect', 'Efeito no público'], ['semioticIntent', 'Intenção semiótica'], ['visualLanguage', 'Linguagem visual'], ['formLanguage', 'Forma'], ['materialLanguage', 'Material'], ['colorLogic', 'Lógica de cor'], ['spatialLogic', 'Lógica espacial'], ['motionLanguage', 'Movimento'], ['typographyLanguage', 'Tipografia'], ['temporalArc', 'Arco temporal'], ['loopGrammar', 'Gramática do loop'], ['technicalStrategy', 'Estratégia técnica'], ['forbiddenShortcuts', 'Atalhos proibidos']];
function contractHtml() {
  const c = P.meta.contract; if (!c || typeof c !== 'object') return '';
  const rows = CONTRACT_KEYS.filter(([k]) => c[k]).map(([k, l]) => `<dt>${l}</dt><dd>${esc(Array.isArray(c[k]) ? c[k].join(' · ') : c[k])}</dd>`).join('');
  return rows ? `<h2 class="sec">Contrato criativo</h2><dl class="kv">${rows}</dl>` : '';
}
/* Bíblia de arte (fase 2, opcional): as regras do visual, escritas logo depois do contrato */
const BIBLE_KEYS = [['thesis', 'Tese'], ['material', 'Material'], ['space', 'Espaço'], ['motion', 'Movimento'], ['dramaturgy', 'Dramaturgia'], ['color', 'Cor'], ['typography', 'Tipografia'], ['audio', 'Áudio'], ['banned', 'Banidos']];
function artBibleHtml() {
  const b = P.meta.artBible; if (!b || typeof b !== 'object') return '';
  let rows = BIBLE_KEYS.filter(([k]) => b[k]).map(([k, l]) => `<dt>${l}</dt><dd>${esc(b[k])}</dd>`).join('');
  const mp = b.motionProfile; if (mp && typeof mp === 'object') rows += `<dt>Perfil de movimento</dt><dd>${['energy', 'elasticity', 'anticipation', 'continuity', 'rhythm'].filter(k => typeof mp[k] === 'number').map(k => `${({ energy: 'energia', elasticity: 'elasticidade', anticipation: 'antecipação', continuity: 'continuidade', rhythm: 'ritmo' })[k]} ${mp[k]}`).join(' · ')}</dd>`;
  return rows ? `<h2 class="sec">Bíblia de arte</h2><dl class="kv">${rows}</dl>` : '';
}
function summaryHtml() {
  const g = P.meta.grammar || {}, c = P.canvas, t = P.time;
  return `<dl class="kv">
    <dt>Projeto</dt><dd>${esc(P.meta.name)}${P.meta.artist ? ' · ' + esc(P.meta.artist) : ''}</dd>
    <dt>Direção de arte</dt><dd>${esc(g.form || P.meta.brief || '—')}</dd>
    <dt>Canvas</dt><dd>${c.w}×${c.h} · ${aspectName(c.w, c.h)} · ${esc(TARGETS[c.target]?.n || c.target)}</dd>
    <dt>FPS / duração</dt><dd>${c.fps} FPS · ${t.bars} compassos = ${loopSec().toFixed(2)} s · ${loopFrames()} quadros</dd>
    <dt>BPM</dt><dd>${+t.bpm.toFixed(2)}</dd>
    <dt>Áudio</dt><dd>${P.audio.reactive ? 'Reativo' : 'Autônomo no BPM'}</dd>
    <dt>Loop</dt><dd>${t.loop ? 'On' : 'Off'} · seamless ${t.seamless ? 'on' : 'off'} · ${t.mode.toUpperCase()}</dd>
    <dt>Composições</dt><dd>${P.compositions.map(c2 => esc(c2.name)).join(' · ')}</dd>
    <dt>Camadas</dt><dd>${cur().layers.filter(l => l.on).length} ligadas de ${cur().layers.length} na ativa</dd>
    <dt>Seed</dt><dd>${P.seed}</dd></dl>
    ${contractHtml()}
    ${artBibleHtml()}
    ${g.motion ? `<h2 class="sec">Gramática visual</h2><dl class="kv">${['form', 'motion', 'rhythm', 'color', 'density', 'depth', 'texture', 'transition', 'audio'].filter(k => g[k]).map(k => `<dt>${({ form: 'Forma', motion: 'Movimento', rhythm: 'Ritmo', color: 'Cor', density: 'Densidade', depth: 'Profundidade', texture: 'Textura', transition: 'Transição', audio: 'Relação sonora' })[k]}</dt><dd>${esc(g[k])}</dd>`).join('')}</dl>` : ''}`;
}
function renderComp() {
  const el = pane('comp');
  el.innerHTML = `<h2 class="sec">Composições <span class="lbl">${ST.mode === 'standard' ? 'STANDARD' : 'BRIEFING'}</span></h2>
    ${P.compositions.map((c, i) => `<div class="crow ${i === ST.ci ? 'act' : ''}" data-ci="${i}">
      <canvas id="th${i}" width="224" height="126" title="Ativar ${esc(c.name)}"></canvas>
      <div><div class="row" style="margin:0"><span class="lbl">${pad(i + 1, 2)}</span><input type="text" value="${esc(c.name)}" data-rename aria-label="Nome da composição ${i + 1}"></div>
      <div class="hy">${esc(c.hypothesis || '')}</div>
      <div class="row"><button data-act="go">Ativar</button><button data-act="dup">Duplicar</button><button data-act="reset">Reset</button><button data-act="exp">Exportar</button>${P.compositions.length > 1 ? '<button data-act="del">Remover</button>' : ''}</div></div></div>`).join('')}
    <div class="row"><button data-act="new">+ Nova composição (duplica a ativa)</button>${ST.mode === 'standard' ? '<button data-act="stdreset">Restaurar STANDARD original</button>' : ''}</div>
    <h2 class="sec">Resumo do projeto</h2>${summaryHtml()}
    ${ST.mode === 'briefing' && P.meta.brief ? `<h2 class="sec">Briefing</h2><p class="note">${esc(P.meta.brief)}</p>` : ''}`;
  P.compositions.forEach((_, i) => drawThumb(i));
}
const ORIG = {};
function rememberOrig() { P.compositions.forEach(c => { if (!ORIG[P.id + c.id]) ORIG[P.id + c.id] = clone(c); }); }

function renderLayers() {
  const el = pane('lay'), comp = cur();
  el.innerHTML = `<h2 class="sec">Camadas · ${esc(comp.name)} <span class="lbl">0–9 liga · clique seleciona</span></h2>
    <div id="lrows">${comp.layers.map((L, i) => `<div class="lrow ${ST.sel === i ? 'sel' : ''} ${ST.solo === i ? 'solo' : ''}" data-i="${i}">
      <button class="tg" data-vis aria-pressed="${L.on}" aria-label="Ligar ${esc(L.name)}"></button><span class="k">L${i}</span>
      <span style="min-width:0"><span class="nm">${esc(L.name)}</span><span class="ty">${esc((famOf(L.type) || [''])[0])} · ${esc(typeLabel(L.type))}${LAYER_ERR.has(L) ? ' · ERRO' : ''}</span></span>
      <input type="number" min="0" max="1" step="0.05" value="${L.opacity}" data-op aria-label="Opacidade ${esc(L.name)}">
      <select data-bl aria-label="Blend ${esc(L.name)}">${Object.keys(BLENDS).map(b => `<option ${b === L.blend ? 'selected' : ''}>${b}</option>`).join('')}</select></div>`).join('')}</div>
    <div class="row"><button data-la="solo" aria-pressed="${ST.solo === ST.sel}">Solo</button><button data-la="up">↑</button><button data-la="down">↓</button><button data-la="dup">Duplicar</button><button data-la="ren">Renomear</button><button data-la="reset">Reset</button><button data-la="del">Remover</button></div>
    <div class="row"><button data-la="copy">Copiar parâmetros</button><button data-la="paste" ${ST.clip ? '' : 'disabled'}>Colar parâmetros</button><button data-la="copyL">Copiar camada</button><button data-la="pasteL" ${ST.clipL ? '' : 'disabled'}>Colar camada</button></div>
    <div class="row fill"><select id="addCat" aria-label="Categoria">${FAMILIES.map(f => `<option value="${f[0]}">${esc(f[0])}</option>`).join('')}</select><select id="addType" aria-label="Tipo de camada"></select><button data-la="add" style="flex:0 0 auto">Adicionar</button></div>
    <p class="note">As camadas valem só para esta composição. Mostrar camadas (E) abre a pilha em 3D; arraste para girar. Na viewport, arrastar move a camada selecionada; Shift + arrastar escala; Alt + arrastar gira.</p>`;
  fillAddTypes();
}
function fillAddTypes() { const c = $('#addCat'), t = $('#addType'); if (!c || !t) return; const f = FAMILIES.find(x => x[0] === c.value) || FAMILIES[0]; t.innerHTML = f[1].map(x => `<option value="${x[0]}">${esc(x[1])}</option>`).join(''); c.onchange = fillAddTypes; }
function selLayer(i) { ST.sel = i; $$('#lrows .lrow').forEach((r, k) => r.classList.toggle('sel', k === i)); syncLayerDom(); renderParams(); }

function paramGroups(L) {
  const g = GEN[L.type];
  let gp = g.params;
  if (L.type === 'temporal') { const s = TM.presetOf(pm(L)); gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  if (L.type === 'particles') { const s = PRT[pm(L).kind] || PRT.ORBITA; gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  if (L.type === 'solid') { const s = SOL[pm(L).kind] || SOL.ESFERA; gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  if (L.type === 'field') { const s = FLD[pm(L).kind] || FLD.ISOLINHAS; gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  if (L.type === 'fx') { const s = FX[pm(L).preset] || FX.PIXELATE; gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  if (L.type === 'shader') { const s = SHADERS[pm(L).preset] || SHADERS['CAMPO FBM']; gp = gp.map(d => /^p[1-4]$/.test(d.k) ? Object.assign({}, d, { l: 'P' + d.k[1] + ' · ' + s.labels[+d.k[1] - 1], d: s.d[+d.k[1] - 1] }) : d); }
  const vd = varDefs(L);
  return [...(vd.length ? [['VARIÁVEIS', vd, true]] : []), [typeLabel(L.type).toUpperCase(), gp, !vd.length], ['TRANSFORM', COMMON.TRANSFORM], ['APARÊNCIA', COMMON['APARÊNCIA']], ['MOVIMENTO', COMMON.MOVIMENTO], ['ÁUDIO', COMMON['ÁUDIO']]];
}
function paramPanel(host, L, title) {
  const comp = cur(), p = pm(L), groups = paramGroups(L), all = groups.flatMap(g => g[1]);
  host.innerHTML = '<div></div>'; const el = host.firstElementChild;
  el.innerHTML = `<h2 class="sec">${esc(title)} <span class="lbl">L${comp.layers.indexOf(L)} · ${esc(L.type)}</span></h2>
    <div class="row"><button data-pa="on" aria-pressed="${L.on}">${L.on ? 'Ligada' : 'Desligada'}</button><button data-pa="copy">Copiar</button><button data-pa="paste" ${ST.clip ? '' : 'disabled'}>Colar</button><button data-pa="reset">Reset</button></div>
    <div class="row"><span class="lbl">Categoria</span><select id="pCat" aria-label="Categoria">${FAMILIES.map(f => `<option value="${f[0]}" ${famOf(L.type) === f ? 'selected' : ''}>${esc(f[0])}</option>`).join('')}</select><span class="lbl">Tipo</span><select id="pTyp" aria-label="Tipo">${(famOf(L.type) || FAMILIES[0])[1].map(x => `<option value="${x[0]}" ${x[0] === L.type ? 'selected' : ''}>${esc(x[1])}</option>`).join('')}</select></div>
    ${L.type === 'code' || L.type === 'shader' ? `<div class="row"><span class="lbl">Receita</span><select id="pRec" aria-label="Receita"><option value="">—</option>${RECIPES.filter(r => r.kind === L.type).map(r => `<option value="${esc(r.id)}">${esc(r.title)}${r.tier === 'tool' ? ' (ferramenta)' : ''}</option>`).join('')}</select></div>` : ''}
    ${groups.map(([name, defs, open]) => `<details class="grp" ${open ? 'open' : ''}><summary>${esc(name)}</summary>${defs.map(d => ctlHtml(d, p[d.k])).join('')}</details>`).join('')}
    ${L.type === 'shader' ? `<div id="glErr"></div>` : ''}${LAYER_ERR.has(L) ? `<ul class="val"><li class="ERROR"><b>ERROR</b>${esc(LAYER_ERR.get(L))}</li></ul>` : ''}`;
  const set = (k, v) => {
    if (v === undefined) delete L.p[k]; else L.p[k] = v;
    if (L.type === 'temporal' && k === 'preset') { const s = TM.PRESETS[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'particles' && k === 'kind') { const s = PRT[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'solid' && k === 'kind') { const s = SOL[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'field' && k === 'kind') { const s = FLD[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'fx' && k === 'preset') { const s = FX[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'shader' && k === 'preset') { const s = SHADERS[v]; if (s) ['p1', 'p2', 'p3', 'p4'].forEach((q, i) => L.p[q] = s.d[i]); paramPanel(host, L, title); }
    if (L.type === 'shader') showGlErr(L);
    if (L.type === 'code' && k === 'src') { ST.codeSig = codeSig(P); const ok = store.get('codeOK', []); if (!ok.includes(ST.codeSig)) { ok.push(ST.codeSig); store.set('codeOK', ok.slice(-40)); } ST.codeAllow = true; const cb = $('#codeBan'); if (cb) cb.hidden = true; }
  };
  bindCtls(el, all, k => pm(L)[k], set);
  el.querySelector('[data-pa="on"]').onclick = () => { toggleLayer(comp.layers.indexOf(L)); paramPanel(host, L, title); };
  const swap = t => { if (t === L.type) return; const keep = {}; COMMON_FLAT.forEach(d => { if (L.p && d.k in L.p) keep[d.k] = L.p[d.k]; }); if (L.name === typeLabel(L.type).toUpperCase()) L.name = typeLabel(t).toUpperCase(); L.type = t; L.p = keep; commit(true, 'Tipo ' + typeLabel(t)); refreshAll(); };
  el.querySelector('#pTyp').onchange = e => swap(e.target.value);
  const pr = el.querySelector('#pRec'); if (pr) pr.onchange = e => { const r = recipeById(e.target.value); if (!r) return; const wasOk = ST.codeAllow, N = recipeLayer(r); L.p = N.p; if (N.vars) L.vars = N.vars; else delete L.vars; L.role = N.role; L.name = N.name; if (r.kind === 'code') trustBundledCode(wasOk); commit(true, 'Receita ' + r.title); refreshAll(); paramPanel(host, L, title); };
  el.querySelector('#pCat').onchange = e => swap(FAMILIES.find(f => f[0] === e.target.value)[1][0][0]);
  el.querySelector('[data-pa="copy"]').onclick = () => { ST.clip = { type: L.type, p: clone(L.p) }; toast('Parâmetros copiados'); paramPanel(host, L, title); renderLayers(); };
  el.querySelector('[data-pa="paste"]').onclick = () => pasteParams(L, () => paramPanel(host, L, title));
  el.querySelector('[data-pa="reset"]').onclick = () => { L.p = {}; commit(); paramPanel(host, L, title); toast('Parâmetros restaurados'); };
  if (L.type === 'shader') showGlErr(L);
}
function showGlErr(L) { const b = $('#glErr'); if (!b) return; const body = shaderBody(pm(L)); if (!GL.progs.has(body)) glProg(body); const e = GL.err.get(body); b.innerHTML = e ? `<ul class="val"><li class="ERROR"><b>ERRO DE SHADER</b>${esc(e)}</li></ul>` : (glInit() ? '<p class="note">Shader compilado.</p>' : '<ul class="val"><li class="ERROR"><b>ERROR</b>WebGL indisponível neste navegador.</li></ul>'); }
function pasteParams(L, after) {
  if (!ST.clip) return;
  const keys = new Set([...COMMON_FLAT.map(d => d.k), ...GEN[L.type].params.map(d => d.k), ...varDefs(L).map(d => d.k)]);
  let n = 0; for (const [k, v] of Object.entries(ST.clip.p)) if (keys.has(k) && (ST.clip.type === L.type || COMMON_FLAT.some(d => d.k === k))) { L.p[k] = clone(v); n++; }
  commit(); after && after(); toast(n ? `${n} parâmetros colados` : 'Nada compatível para colar');
}
function renderParams() {
  const L = cur().layers[ST.sel]; const el = pane('par');
  if (!L) { el.innerHTML = '<p class="note">Selecione uma camada.</p>'; return; }
  paramPanel(el, L, L.name); modPanel(el, L);
}
function renderText() {
  const el = pane('txt'), comp = cur(), tl = comp.layers.map((L, i) => [L, i]).filter(([L]) => L.type === 'text');
  if (ST.txtSel == null || !comp.layers[ST.txtSel] || comp.layers[ST.txtSel].type !== 'text') ST.txtSel = tl[0] ? tl[0][1] : null;
  el.innerHTML = `<h2 class="sec">Texto <span class="lbl">camadas de texto desta composição</span></h2>
    <div class="row">${tl.map(([L, i]) => `<button data-tx="${i}" aria-pressed="${ST.txtSel === i}">L${i} · ${esc(L.name)}</button>`).join('')}<button data-tx="add">+ Texto</button></div>
    <div class="row"><label class="filebtn">Importar fonte (.ttf .otf .woff)<input type="file" accept=".ttf,.otf,.woff,.woff2,font/*" data-font></label><span class="lbl">${CUSTOM_FONTS.length ? 'Fontes: ' + CUSTOM_FONTS.map(esc).join(', ') : ''}</span></div>
    <div id="txtPanel"></div>`;
  if (ST.txtSel != null) paramPanel($('#txtPanel'), comp.layers[ST.txtSel], 'Parâmetros do texto');
}
function renderMedia() {
  const el = pane('med'), list = Object.entries(MEDIA);
  el.innerHTML = `<h2 class="sec">Importar mídia</h2>
    <div class="row"><label class="filebtn">Imagem<input type="file" accept="image/*" data-mimp="image"></label><label class="filebtn">Vídeo<input type="file" accept="video/*" data-mimp="video"></label><label class="filebtn">Objeto 3D<input type="file" accept=".obj,.glb,.stl" data-mimp="model"></label><label class="filebtn">Splat / nuvem (.ply)<input type="file" accept=".ply" data-mimp="splat"></label><label class="filebtn">Fonte<input type="file" accept=".ttf,.otf,.woff,.woff2" data-font></label></div>
    <p class="note">Ou arraste o arquivo para a viewport: ele entra na camada fixa IMAGEM, VÍDEO ou OBJETO 3D da composição ativa. Objeto 3D aceita .obj, .glb (sem compressão) e .stl; em Parâm. escolha o render: shader, wireframe ou nuvem de pontos. Imagens e fontes importadas viajam dentro do JSON ao salvar o projeto; vídeos ficam só neste navegador e o JSON avisa quando faltam. Para logos use "Logo → branco α": o fundo sai, a arte vira branco com alpha e entra nos modos mosaico, meio-tom e fatiado.</p>
    <h2 class="sec">Biblioteca <span class="lbl">${list.length}</span></h2>
    ${list.length ? list.map(([id, m]) => `<div class="media"><span class="th" ${m.kind === 'image' ? `style="background-image:url('${m.url}')"` : ''}>${m.kind === 'video' ? 'VÍDEO' : ''}</span><span style="min-width:0"><span class="nm" style="display:block;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${esc(m.name)}</span><span class="lbl">${m.kind === 'model' ? m.fmt + ' · ' + m.w + ' vértices · ' + m.h + ' faces' : m.kind + ' · ' + m.w + '×' + m.h}${m.dur ? ' · ' + m.dur.toFixed(1) + ' s' : ''}</span></span><button data-use="${esc(id)}">Usar</button>${m.kind === 'image' ? `<button data-logo="${esc(id)}" title="Tira o fundo, pinta de branco e recorta rente">Logo → branco α</button>` : ''}</div>`).join('') : '<p class="note">Nenhum arquivo importado ainda.</p>'}`;
}
const TARGETS = {
  screen: { n: 'Tela', recos: ['Use 16:9 do monitor ou a resolução nativa da tela.', 'Texto de interface a partir de 11 px lê bem a 1 m.'] },
  led: { n: 'LED', recos: ['Trabalhe na resolução física do painel (pixels do processador), não em 1920×1080 genérico.', 'Linhas abaixo de 2 px desaparecem ou geram moiré: use espessura ≥ 2× o pitch visual.', 'Desligue scanlines: o padrão do LED + scanline gera moiré.', 'Preto é desligado no LED: o preto trabalha como vazio, use-o.', 'Contraste alto e acentos chapados leem de longe; evite gradientes sutis.'] },
  projection: { n: 'Projeção', recos: ['O preto do projetor é cinza: evite fundos grandes em cinza escuro, prefira preto absoluto e formas claras.', 'Deixe 3–5% de margem para keystone e warp.', 'Detalhe fino se perde com a distância e o foco: aumente a escala do texto.'] },
  mapping: { n: 'Superfície irregular', recos: ['Exporte em alpha por camada ou por região para tratar cada parte da superfície separadamente.', 'Desenhe as máscaras da superfície como guias (Safe/Multi-display).', 'Evite movimento de câmera que contradiga a geometria real.'] },
  multi: { n: 'Multi-display', recos: ['Defina cada região como um recorte do canvas total (aba Exportar → Regiões).', 'Mantenha elementos críticos longe das emendas entre telas.'] },
  software: { n: 'Arquivo para outro software', recos: ['Exporte PNG com alpha: qualquer software abre a sequência.', 'MP4 (H.264) não guarda alpha.'] },
  export: { n: 'Só exportação', recos: ['Feche o loop em compassos inteiros para a emenda ser limpa.', 'Prefira 30 ou 60 FPS.'] }
};
const PRESETS_RES = [['1920×1080 · Full HD 16:9', 1920, 1080], ['3840×2160 · 4K 16:9', 3840, 2160], ['1080×1920 · vertical 9:16', 1080, 1920], ['2160×1080 · 2:1', 2160, 1080], ['3840×1080 · 32:9', 3840, 1080], ['7680×2160 · 32:9 8K', 7680, 2160], ['5120×500 · paredes em L', 5120, 500], ['1080×1080 · 1:1', 1080, 1080], ['1080×1350 · 4:5', 1080, 1350], ['1280×720 · HD', 1280, 720]];
function renderAudio() {
  const el = pane('aud');
  el.innerHTML = `<h2 class="sec">Audioreatividade</h2>
    <div class="row"><button id="aOn" aria-pressed="${!!P.audio.reactive}">Audio reactive: ${P.audio.reactive ? 'ON' : 'OFF'}</button></div>
    <p class="note">Todo SHADER reage sempre (resposta mínima 0,35): com a música quando há fonte conectada, e pelas bandas sintéticas do BPM quando não há. As outras camadas reagem só se "Resposta" for maior que zero. Poucas camadas reagindo soam mais musicais do que todas.</p>
    <div class="row"><button id="aMic">Microfone / entrada de linha</button><label class="filebtn">Arquivo de áudio<input type="file" accept="audio/*" id="aFile"></label><button id="aTest">Fonte de teste</button><button id="aStop">Parar fonte</button></div>
    <p class="note" id="aSrc">${AUD.name ? 'Fonte: ' + esc(AUD.name) : 'Sem fonte de áudio: os shaders usam as bandas sintéticas do BPM. Conecte um arquivo, o microfone ou a fonte de teste.'}</p>
    <div id="meters">${['bass', 'mid', 'high', 'rms'].map(k => `<div class="meter"><span class="lbl">${k}</span><i><s data-m="${k}" style="width:0"></s></i><span data-mv="${k}">0.00</span></div>`).join('')}<div class="meter"><span class="lbl">beat</span><i><s data-m="beat" style="width:0"></s></i><span></span></div></div>
    <div id="audCtl"></div>
    <h2 class="sec">Resposta por camada</h2><div id="audLayers"></div>`;
  const defs = [N('sens', 'Sensibilidade', 1, 0, 4), N('smooth', 'Suavização', 0.7, 0, 0.98)];
  const ac = $('#audCtl'); ac.innerHTML = defs.map(d => ctlHtml(d, P.audio[d.k])).join(''); bindCtls(ac, defs, k => P.audio[k], (k, v) => { P.audio[k] = v === undefined ? defs.find(d => d.k === k).d : v; });
  const comp = cur(), al = $('#audLayers');
  al.innerHTML = comp.layers.map((L, i) => `<div class="pc" data-k="a${i}" data-t="n"><label title="${esc(L.name)}">L${i} ${esc(L.name)}</label><input type="range" min="0" max="1" step="0.01" value="${pm(L).audio}" data-r><select data-band aria-label="Banda L${i}">${['bass', 'mid', 'high', 'rms'].map(b => `<option ${pm(L).band === b ? 'selected' : ''}>${b}</option>`).join('')}</select><span></span></div>`).join('');
  al.oninput = e => { const row = e.target.closest('.pc'); if (!row || !e.target.matches('[data-r]')) return; comp.layers[+row.dataset.k.slice(1)].p.audio = +e.target.value; };
  al.onchange = e => { const row = e.target.closest('.pc'); if (!row) return; const L = comp.layers[+row.dataset.k.slice(1)]; if (e.target.matches('[data-band]')) L.p.band = e.target.value; commit(); const n = comp.layers.filter(l => pm(l).audio > 0).length; if (n > 3) toast(`${n} camadas reagindo: considere deixar só a peça principal`); };
  $('#aOn').onclick = () => { setAudio(!P.audio.reactive); renderAudio(); };
  $('#aMic').onclick = async () => { try { await AUD.mic(); if (!P.audio.reactive) setAudio(true); renderAudio(); toast('Microfone conectado'); } catch (e) { toast('Microfone indisponível aqui. Use um arquivo de áudio.', 3600); } };
  $('#aFile').onchange = e => { const f = e.target.files[0]; if (!f) return; try { AUD.file(f); if (!P.audio.reactive) setAudio(true); renderAudio(); } catch (err) { toast(err.message); } };
  $('#aTest').onclick = () => { try { AUD.test(); if (!P.audio.reactive) setAudio(true); renderAudio(); toast('Fonte de teste: kick + chimbal + lead no BPM do projeto'); } catch (err) { toast(err.message); } };
  $('#aStop').onclick = () => { AUD.stop(); renderAudio(); };
}
function updateMeters() { ['bass', 'mid', 'high', 'rms'].forEach(k => { const s = $(`[data-m="${k}"]`), v = $(`[data-mv="${k}"]`); if (s) s.style.width = clamp(AUD[k], 0, 1) * 100 + '%'; if (v) v.textContent = AUD[k].toFixed(2); }); const b = $('[data-m="beat"]'); if (b) b.style.width = AUD.beat ? '100%' : '0'; }
function setAudio(v) { P.audio.reactive = !!v; renderTop(); commit(); toast(v ? (AUD.src ? 'Áudio reativo ON' : 'Áudio reativo ON · conecte uma fonte na aba Áudio') : 'Áudio reativo OFF · BPM autônomo'); }

function renderProject() {
  const el = pane('prj'), c = P.canvas, t = P.time;
  el.innerHTML = `<h2 class="sec">Projeto</h2>
    <div class="pc wide"><label for="pName">Nome</label><input type="text" id="pName" value="${esc(P.meta.name)}"><span></span></div>
    <div class="pc wide"><label for="pArtist">Artista</label><input type="text" id="pArtist" value="${esc(P.meta.artist)}"><span></span></div>
    <h2 class="sec">Canvas <span class="lbl">${aspectName(c.w, c.h)}</span></h2>
    <div class="row fill"><select id="pPreset" aria-label="Predefinição de canvas"><option value="">Predefinições…</option>${PRESETS_RES.map(([n, w, h]) => `<option value="${w}x${h}">${n}</option>`).join('')}</select></div>
    <div class="row"><span class="lbl">W</span><input type="number" id="pW" min="16" max="16384" value="${c.w}" aria-label="Largura"><span class="lbl">H</span><input type="number" id="pH" min="16" max="16384" value="${c.h}" aria-label="Altura"><button id="pSwap" title="Trocar W e H">⇄</button><span class="lbl">FPS</span><select id="pFps" aria-label="FPS">${[24, 25, 30, 50, 60].map(f => `<option ${f === c.fps ? 'selected' : ''}>${f}</option>`).join('')}</select></div>
    <div class="row"><span class="lbl">Saída</span><select id="pTarget" aria-label="Destino">${Object.entries(TARGETS).map(([k, v]) => `<option value="${k}" ${k === c.target ? 'selected' : ''}>${v.n}</option>`).join('')}</select></div>
    <ul class="val">${(TARGETS[c.target]?.recos || []).map(r => `<li class="OPTIMIZATION"><b>${esc(TARGETS[c.target].n)}</b>${esc(r)}</li>`).join('')}</ul>
    <div id="ledCtl"></div>
    <h2 class="sec">Paredes e dobras <span class="lbl">${(c.folds || []).length + 1} parede(s)</span></h2>
    <div class="row"><span class="lbl">Dobras (x em px)</span><input type="text" id="pFolds" value="${(c.folds || []).join(', ')}" placeholder="ex.: 2560  ou  1920, 3840" aria-label="Posição das dobras em pixels"><button id="pFoldGuide" aria-pressed="${ST.foldGuide !== false}">Guia</button></div>
    <div class="row"><span class="lbl">Calha (un.)</span><input type="number" id="pGut" min="0" max="600" value="${c.gutter ?? 90}" aria-label="Largura da calha da dobra"></div>
    <p class="note">Cada dobra é um canto físico entre superfícies. As paredes ficam entre as dobras; texto, rosto e logo nunca cruzam a calha, linha, campo de cor e varredura podem cruzar. Sem dobras o canvas é uma parede só.</p>
    <h2 class="sec">Tempo e loop</h2><div id="timeCtl"></div>
    <div class="row"><span class="lbl">Compassos</span><select id="pBars" aria-label="Compassos do loop">${[1, 2, 4, 8, 16, 32].map(b => `<option ${b === t.bars ? 'selected' : ''}>${b}</option>`).join('')}</select>
      <button id="pLoop" aria-pressed="${t.loop}">Loop ${t.loop ? 'on' : 'off'}</button><button id="pSeam" aria-pressed="${t.seamless}">Seamless ${t.seamless ? 'on' : 'off'}</button></div>
    <div class="row"><span class="lbl">Modo</span><select id="pMode" aria-label="Modo de loop">${[['loop', 'LOOP'], ['pingpong', 'PING-PONG'], ['reverse', 'REVERSE'], ['random', 'RANDOM LOOP'], ['phase', 'PHASE LOOP'], ['audio', 'AUDIO LOOP'], ['manual', 'MANUAL (scrub)']].map(([k, n]) => `<option value="${k}" ${k === t.mode ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <p class="note">Duração do loop: ${loopSec().toFixed(3)} s = ${loopFrames()} quadros a ${c.fps} FPS. PHASE desloca a fase de cada camada; AUDIO congela no silêncio; MANUAL anda só pelo scrub.</p>
    <div class="row"><span class="lbl">Transição</span><select id="pTr" aria-label="Transição entre composições">${['cut', 'fade', 'wipe', 'glitch', 'zoom', 'slide', 'iris', 'blinds', 'crosszoom', 'spin', 'radial', 'diagonal', 'slices', 'flip', 'blur', 'drop'].map(k => `<option ${k === t.transition ? 'selected' : ''}>${k}</option>`).join('')}</select><span class="lbl">beats</span><input type="number" id="pTrB" min="0.25" max="32" step="0.25" value="${t.trBeats || 1}" aria-label="Duração da transição em beats"></div>
    <h2 class="sec">Seed</h2>
    <div class="row"><input type="number" id="pSeed" value="${P.seed}" step="1" aria-label="Seed"><button id="pSeedLock" aria-pressed="${!!P.seedLock}">${P.seedLock ? 'Travada' : 'Travar'}</button><button id="pSeedRnd" ${P.seedLock ? 'disabled' : ''}>Aleatória</button><button id="pSeedCopy">Copiar</button></div>
    <h2 class="sec">Paleta ${P.palette.mode === 'white-alpha' ? '<span class="lbl">BRANCO α · 100 / 72 / 43 %</span>' : ''}</h2>
    <div class="row"><button id="pWhite" title="Tudo branco com opacidade: a cor se muda no software de destino">Branco α (colorir depois)</button></div>
    <div class="row">${PKEYS.map(k => `<label class="row" style="margin:0"><input type="color" data-pal="${k}" value="${P.palette[k]}" aria-label="${PNAMES[k]}"><span class="lbl">${PNAMES[k]}</span></label>`).join('')}</div>
    <div class="row"><span class="lbl">Acento desta composição</span>${ACC.map((a, i) => `<button data-acc="${i}" title="${a.n}"><span style="display:inline-block;width:10px;height:10px;background:${a.h};vertical-align:-1px"></span></button>`).join('')}<button data-acc="-1">Herdar</button></div>
    <h2 class="sec">Performance</h2>
    <div class="row"><span class="lbl">Preview</span>${[0.35, 0.5, 0.75, 1].map(q => `<button data-q="${q}" aria-pressed="${ST.quality === q}">${Math.round(q * 100)}%</button>`).join('')}</div>
    <div class="row"><span class="lbl">Densidade</span>${[0.35, 0.6, 1].map(q => `<button data-dn="${q}" aria-pressed="${ST.dens === q}">${q === 1 ? 'Total' : Math.round(q * 100) + '%'}</button>`).join('')}</div>
    <p class="note">Modo performance: reduza preview e densidade (partículas, pontos) para manter 60 FPS ao vivo. O export sempre usa densidade total. GPU load não é exposta pelo navegador e aparece como N/D.</p>
    <h2 class="sec">Arquivo do projeto</h2>
    <div class="row"><button id="pSave">Salvar JSON</button><label class="filebtn">Abrir JSON<input type="file" accept=".json,application/json" id="pOpen"></label><button id="pCopy">Copiar JSON</button></div>
    <textarea id="pPaste" rows="3" placeholder="Cole aqui o PROJECT JSON da skill e clique em Importar" aria-label="Colar JSON"></textarea>
    <div class="row"><button id="pImport">Importar no modo Briefing</button></div>`;
  const tdefs = [N('bpm', 'BPM', 120, 40, 240, 0.1)];
  const tc = $('#timeCtl'); tc.innerHTML = tdefs.map(d => ctlHtml(d, P.time.bpm)).join('');
  bindCtls(tc, tdefs, () => P.time.bpm, (k, v) => setBpm(v === undefined ? 120 : v));
  if (c.target === 'led') {
    const ld = [N('pitch', 'Pitch (mm)', c.pitch || 3.9, 0.9, 20, 0.1), N('dist', 'Distância (m)', c.dist || 15, 1, 200, 0.5)];
    const lc = $('#ledCtl'); lc.innerHTML = ld.map(d => ctlHtml(d, c[d.k] ?? d.d)).join('') + `<p class="note" id="ledNote"></p>`;
    const note = () => { const pmm = c.pitch || 3.9, dm = c.dist || 15, mind = pmm * 1; $('#ledNote').textContent = `Distância mínima de visão ≈ ${mind.toFixed(1)} m (regra 1 m por mm de pitch). A ${dm} m, 1 px ≈ ${(pmm).toFixed(1)} mm: linhas com menos de 2 px somem. Altura física aprox.: ${(c.h * pmm / 1000).toFixed(2)} m × ${(c.w * pmm / 1000).toFixed(2)} m.`; };
    bindCtls(lc, ld, k => c[k], (k, v) => { c[k] = v === undefined ? ld.find(d => d.k === k).d : v; note(); }); note();
  }
  const reCanvas = () => { commit(); refreshAll(); };
  $('#pName').onchange = e => { P.meta.name = e.target.value.toUpperCase(); renderTop(); commit(); };
  $('#pArtist').onchange = e => { P.meta.artist = e.target.value; commit(); };
  $('#pPreset').onchange = e => { if (!e.target.value) return; const [w, h] = e.target.value.split('x').map(Number); c.w = w; c.h = h; c.folds = (w === 5120 && h === 500) ? [2560] : []; reCanvas(); };
  $('#pFolds').onchange = e => { c.folds = String(e.target.value).split(/[,;\s]+/).map(Number).filter(x => x > 0 && x < c.w).sort((a, b) => a - b); commit(); drawOverlay(); renderProject(); };
  $('#pGut').onchange = e => { c.gutter = clamp(+e.target.value || 0, 0, 600); commit(); drawOverlay(); };
  $('#pFoldGuide').onclick = () => { ST.foldGuide = ST.foldGuide === false; drawOverlay(); renderProject(); };
  $('#pW').onchange = e => { c.w = clamp(Math.round(+e.target.value || 1920), 16, 16384); reCanvas(); };
  $('#pH').onchange = e => { c.h = clamp(Math.round(+e.target.value || 1080), 16, 16384); reCanvas(); };
  $('#pSwap').onclick = () => { [c.w, c.h] = [c.h, c.w]; reCanvas(); };
  $('#pFps').onchange = e => { const n = ST.n / c.fps; c.fps = +e.target.value; ST.n = Math.round(n * c.fps); ST.t0 = performance.now() - n * 1000; reCanvas(); };
  $('#pTarget').onchange = e => { c.target = e.target.value; commit(); renderProject(); renderComp(); };
  $('#pBars').onchange = e => { t.bars = +e.target.value; commit(); renderProject(); renderComp(); };
  $('#pLoop').onclick = () => { t.loop = !t.loop; commit(); renderProject(); };
  $('#pSeam').onclick = () => { t.seamless = !t.seamless; commit(); renderProject(); };
  $('#pMode').onchange = e => { t.mode = e.target.value; commit(); renderProject(); };
  $('#pTr').onchange = e => { t.transition = e.target.value; commit(); };
  $('#pTrB').onchange = e => { t.trBeats = clamp(+e.target.value || 1, 0.25, 32); commit(); };
  $('#pSeed').onchange = e => { if (P.seedLock) { e.target.value = P.seed; return toast('Seed travada'); } setSeed(Math.floor(+e.target.value || 1)); };
  $('#pSeedLock').onclick = () => { P.seedLock = !P.seedLock; commit(); renderProject(); };
  $('#pSeedRnd').onclick = () => setSeed(Math.floor(Math.random() * 900000) + 100000);
  $('#pSeedCopy').onclick = () => copyText(String(P.seed), 'Seed copiada');
  $$('[data-pal]', el).forEach(i => i.oninput = e => { P.palette[e.target.dataset.pal] = e.target.value; delete P.palette.mode; });
  $('#pWhite').onclick = () => { Object.assign(P.palette, clone(PALS['BRANCO ALPHA'])); EXP.luma = true; commit(); renderProject(); toast('BRANCO α: figura 100%, apoio 72%, campo 43%'); };
  $$('[data-pal]', el).forEach(i => i.onchange = () => commit());
  $$('[data-acc]', el).forEach(b => b.onclick = () => { const i = +b.dataset.acc, comp = cur(); comp.palette = comp.palette || {}; if (i < 0) delete comp.palette.accent; else comp.palette.accent = ACC[i].h; commit(); toast(i < 0 ? 'Acento herdado do projeto' : 'Acento: ' + ACC[i].n); });
  $$('[data-q]', el).forEach(b => b.onclick = () => { ST.quality = +b.dataset.q; store.set('quality', ST.quality); fit(); buildStage(); renderProject(); });
  $$('[data-dn]', el).forEach(b => b.onclick = () => { ST.dens = +b.dataset.dn; renderProject(); });
  $('#pSave').onclick = async () => { const r = await saveFile(safe(P.meta.name) + '.aivj.json', new Blob([JSON.stringify(projectOut(), null, 2)], { type: 'application/json' })); toast(r === 'saved' ? 'Projeto salvo' : r === 'declined' ? 'Download recusado' : 'Não foi possível salvar'); };
  $('#pOpen').onchange = e => { const f = e.target.files[0]; if (!f) return; f.text().then(importJson); };
  $('#pCopy').onclick = () => copyText(JSON.stringify(projectOut(), null, 2), 'JSON copiado');
  $('#pImport').onclick = () => importJson($('#pPaste').value);
  renderPalX();
}
function setSeed(s) { P.seed = s; SEED = s; buildGrain(); commit(); renderProject(); toast('Seed ' + s); }
function copyText(s, msg) { try { navigator.clipboard.writeText(s).then(() => toast(msg), () => toast('Copie manualmente: a área de transferência foi recusada')); } catch (e) { toast('Copie manualmente'); } }
function importJson(txt) {
  try {
    const o = typeof txt === 'string' ? JSON.parse(txt.trim().replace(/^```(json)?|```$/g, '')) : txt;
    const pr = normalize(o);
    commit(true); SLOTS.briefing = pr; ST.ci = 0; setMode('briefing', true); commit(true);
    toast(`Importado: ${pr.meta.name} · ${pr.compositions.length} composições${WARN_LOAD.length ? ' · ' + WARN_LOAD.length + ' aviso(s)' : ''}`, 3600);
    return true;
  } catch (e) { toast('JSON inválido: ' + e.message, 4200); return false; }
}

/* ---------- validação técnica ---------- */
function validate(o) {
  const out = [], W = Math.round(P.canvas.w * o.scale), H = Math.round(P.canvas.h * o.scale), add = (lvl, t, m) => out.push({ lvl, t, m });
  if (W > 8192 || H > 8192) add('ERROR', 'Canvas grande demais', `${W}×${H} passa de 8192 px num lado: o navegador não aloca. Use escala 0.5 ou exporte em partes.`);
  if (W * H > 40e6) add('ERROR', 'Área grande demais', `${(W * H / 1e6).toFixed(1)} MP por quadro. Reduza a escala.`);
  if (!P.time.loop) add('WARNING', 'Loop desligado', 'A sequência não fecha: o último quadro não encaixa no primeiro.');
  if (!P.time.seamless) add('WARNING', 'Seamless desligado', 'Rotações e derivas não são arredondadas para ciclos inteiros: pode haver salto no fim do loop.');
  if (![24, 25, 30, 50, 60].includes(o.fps)) add('WARNING', 'FPS incomum', `${o.fps} FPS não é padrão de mídia server.`);
  const fpb = o.fps * 60 / P.time.bpm; if (Math.abs(fpb - Math.round(fpb)) > 0.01) add('OPTIMIZATION', 'Beat fracionário', `A ${P.time.bpm} BPM e ${o.fps} FPS, um beat dura ${fpb.toFixed(3)} quadros. O loop fecha, mas o beat não cai exatamente num quadro.`);
  if (P.audio.reactive && AUD.src) add('WARNING', 'Áudio no export', 'O export é determinístico: usa o pulso do BPM no lugar do áudio ao vivo. Para capturar a reação real, use GRAVAR.');
  o.comps.forEach(ci => {
    const comp = P.compositions[ci], nm = comp.name;
    comp.layers.forEach((L, i) => {
      if (!L.on) return; const p = pm(L);
      if ((L.type === 'image' || L.type === 'video' || L.type === 'model') && !MEDIA[p.media]) add('ERROR', `${nm} · L${i} mídia ausente`, p.media ? `"${p.media}" não está carregada neste navegador. Importe na aba Mídia.` : 'Camada ligada sem arquivo.');
      if (L.type === 'isf') { try { const b = shaderBody({ src: isfLib(p.lib).src }); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} ISF`, GL.err.get(b)); } catch (e) { add('ERROR', `${nm} · L${i} ISF`, e.message); } }
      if (L.type === 'synth') { try { const b = shaderBody({ src: synthSrc(p) }); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} cadeia`, GL.err.get(b)); } catch (e) { add('ERROR', `${nm} · L${i} cadeia`, e.message); } }
      if (L.type === 'temporal') { const b = TM.body(TM.presetOf(p).src); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} tempo`, GL.err.get(b)); }
      if (L.type === 'particles') { prtProg(p); const kk = prtKey(p); if (GL.err.get(kk)) add('ERROR', `${nm} · L${i} partículas`, GL.err.get(kk)); }
      if (L.type === 'solid') { const b = solBody(p); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} sólido`, GL.err.get(b)); }
      if (L.type === 'field') { if (p.media && !MEDIA[p.media]) add('ERROR', `${nm} · L${i} mídia ausente`, `"${p.media}" não está carregada neste navegador. Importe na aba Mídia.`); const b = fldBody(p); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} campo`, GL.err.get(b)); }
      if (L.type === 'glyphs' && p.source === 'image' && !MEDIA[p.media]) add('ERROR', `${nm} · L${i} mídia ausente`, p.media ? `"${p.media}" não está carregada neste navegador. Importe na aba Mídia.` : 'Campo = image sem imagem escolhida.');
      if (L.type === 'fx') { const b = fxBody(fxOf(p).src); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} efeito`, GL.err.get(b)); }
      if (L.type === 'shader') { const b = shaderBody(p); glProg(b); if (GL.err.get(b)) add('ERROR', `${nm} · L${i} shader`, GL.err.get(b)); if (!glInit()) add('ERROR', 'WebGL', 'WebGL indisponível.'); }
      if (L.type === 'organism' && (P.time.bars % +p.scanBars)) add('WARNING', `${nm} · L${i} varredura`, `A varredura de ${p.scanBars} compassos não divide o loop de ${P.time.bars}: ela salta no fim.`);
      if (L.type === 'event' && p.every > P.time.bars && P.time.loop) add('OPTIMIZATION', `${nm} · L${i} evento`, `Evento a cada ${p.every} compassos num loop de ${P.time.bars}: dispara só no compasso ${p.at + 1} de cada loop.`);
      if (L.type === 'bg' && o.alpha) add('OPTIMIZATION', `${nm} · fundo`, 'No export alpha a camada FUNDO é omitida para manter a transparência.');
      if (P.canvas.target === 'led') {
        const u = unitOf(P.canvas.w, P.canvas.h);
        if (L.type === 'post' && p.scan > 0) add('OPTIMIZATION', `${nm} · LED`, 'Scanlines geram moiré no LED: zere "Scanlines".');
        if (L.type === 'lines' && p.weight * u < 2) add('OPTIMIZATION', `${nm} · LED`, `Linhas de ${(p.weight * u).toFixed(1)} px somem no LED: use ≥ 2 px.`);
        if (L.type === 'text' && p.size * u < 24) add('OPTIMIZATION', `${nm} · LED`, 'Texto pequeno para leitura à distância.');
      }
      if (L.type === 'code' && !ST.codeAllow) add('ERROR', `${nm} · L${i} código bloqueado`, 'Autorize o código deste projeto no aviso da tela para ele aparecer no export.');
      if (AUDIT_TYPES.includes(L.type) && (L.type !== 'code' || ST.codeAllow)) {
        const a = layerAudit(comp, L, i);
        if (a.det === false) add('ERROR', `${nm} · L${i} não determinístico`, 'O mesmo quadro desenhou duas imagens diferentes. Tire Math.random, Date e estado guardado fora do quadro: o loop não fecha e o PNG muda a cada export.');
        if (a.ms > 40) add('WARNING', `${nm} · L${i} pesada`, `${a.ms.toFixed(0)} ms por quadro a meia resolução: pode engasgar ao vivo. Reduza densidade ou o tamanho do laço.`);
        if (a.blank) add('OPTIMIZATION', `${nm} · L${i} em branco`, 'A camada ligada não desenhou nada em 6 quadros do loop. Se for intencional, desligue-a.');
      }
      { const lw = LAYER_WARN.get(L); if (lw) for (const m of lw) add('WARNING', `${nm} · L${i}`, m); }
      if (LAYER_ERR.has(L)) add('ERROR', `${nm} · L${i}`, LAYER_ERR.get(L));
    });
  });
  if (P.palette.mode === 'white-alpha' && !EXP.luma && o.alpha) add('OPTIMIZATION', 'Branco α', 'A paleta é BRANCO α mas "Branco α (luma)" está desligado no export: os cinzas sairiam como cinza opaco, não como opacidade.');
  const frames = Math.max(0, o.end - o.start + 1), per = W * H * (o.alpha ? 0.9 : 1.6) / 1e6, files = frames * o.comps.length * (o.layers ? 1 + o.layerCount : 1);
  const mb = files * per; if (mb > 1800) add('WARNING', 'Arquivo grande', `Estimativa ${(mb / 1024).toFixed(1)} GB em memória. Exporte menos compassos ou menor escala.`);
  return { out, frames, files, mb };
}
