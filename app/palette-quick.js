/* Paleta rápida (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores PALQUICK. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
const surfaceOf = () => { const t = P.canvas.target; return t === 'led' ? 'led' : (t === 'projection' || t === 'mapping') ? 'projection' : 'screen'; };
function renderPalX() {
  const pane0 = pane('prj'), anchor = [...pane0.querySelectorAll('h2.sec')].find(h => /Performance/.test(h.textContent)); if (!anchor) return;
  const old = $('#palX'); if (old) old.remove();
  const surf = ST.palSurf || surfaceOf(), pal = P.palette, white = pal.mode === 'white-alpha';
  const rows = ['bg', 'primary', 'secondary', 'accent'].map(k => { const o = PAL.hexToOklch(pal[k]) || [0, 0, 0], cr = k === 'bg' ? null : PAL.contrast(pal[k], pal.bg);
    return `<div class="prow" data-role="${k}"><span class="lbl">${esc(PNAMES[k])}</span><input type="text" data-hex value="${esc(pal[k])}" ${white ? 'disabled' : ''} aria-label="${esc(PNAMES[k])} em hexadecimal" maxlength="7" spellcheck="false">
      ${['L', 'C', 'h'].map((q, i) => `<input type="text" inputmode="decimal" data-lch="${i}" value="${(+o[i]).toFixed(i === 0 ? 3 : i === 1 ? 3 : 1)}" ${white ? 'disabled' : ''} aria-label="${q} de ${esc(PNAMES[k])}" title="${['Luminosidade 0 a 1', 'Croma 0 a 0,37', 'Matiz 0 a 360'][i]}">`).join('')}
      <span class="tag ${cr == null ? 'o' : cr >= 7 ? 'f' : cr >= 4.5 ? '' : 'd'}">${cr == null ? 'FUNDO' : cr.toFixed(1) + ':1'}</span></div>`; }).join('');
  const chk = PAL.checks({ bg: pal.bg, primary: pal.primary, secondary: pal.secondary, accent: pal.accent }, surf);
  anchor.insertAdjacentHTML('beforebegin', `<div id="palX"><h2 class="sec">Cor perceptual <span class="lbl">OKLCH · ${surf}</span></h2>
    <p class="note">Edite L (luminosidade), C (croma) e h (matiz) ou o hexadecimal. Contraste contra o fundo ao lado. O matiz vem do conceito, nunca de um padrão.</p>
    ${white ? '<p class="note">Modo branco α: as cores são níveis de branco. Saia do modo para editar.</p>' : ''}${rows}
    <div class="row"><span class="lbl">Superfície</span><select id="palSurf" aria-label="Superfície">${['led', 'projection', 'screen'].map(s => `<option value="${s}" ${s === surf ? 'selected' : ''}>${{ led: 'LED', projection: 'Projeção', screen: 'Tela' }[s]}</option>`).join('')}</select></div>
    <div class="row"><span class="lbl">Gerar esquema</span><input type="text" inputmode="decimal" id="palHue" value="${ST.palHue ?? 250}" style="width:64px" aria-label="Matiz do conceito, 0 a 360" title="Matiz 0-360: 30 vermelho, 110 amarelo, 145 verde, 195 ciano, 265 azul, 330 magenta">
      <select id="palSch" aria-label="Relação de matizes">${['mono', 'analogous', 'complement', 'split', 'triad', 'tetrad'].map(s => `<option value="${s}" ${s === (ST.palSch || 'complement') ? 'selected' : ''}>${{ mono: 'Mono', analogous: 'Análogo', complement: 'Complementar', split: 'Complementar dividido', triad: 'Tríade', tetrad: 'Tétrade' }[s]}</option>`).join('')}</select><button id="palGen" ${white ? 'disabled' : ''}>Gerar</button></div>
    <ul class="val">${chk.warnings.map(w => `<li class="WARNING"><b>Atenção</b>${esc(w)}</li>`).join('') || '<li class="OPTIMIZATION"><b>Paleta confere</b>Contraste e regras da superfície em ordem.</li>'}</ul></div>`);
  const apply = (k, hex, label) => { P.palette[k] = hex.toUpperCase(); delete P.palette.mode; commit(false, label); renderProject(); };
  $$('#palX .prow').forEach(row => { const k = row.dataset.role;
    row.querySelector('[data-hex]').onchange = e => { const rgb = PAL.h2rgb(e.target.value); if (!rgb) { toast('Cor inválida. Use #RRGGBB.', 1600); return renderPalX(); } apply(k, e.target.value.startsWith('#') ? e.target.value : '#' + e.target.value, 'Cor ' + PNAMES[k]); };
    $$('[data-lch]', row).forEach(inp => inp.onchange = () => { const v = $$('[data-lch]', row).map(i => evalExpr(i.value)); if (v.some(x => !isFinite(x))) { toast('Valor inválido. Use números.', 1600); return renderPalX(); } apply(k, PAL.oklchToHex(clamp(v[0], 0, 1), clamp(v[1], 0, 0.37), ((v[2] % 360) + 360) % 360)[0], 'Cor ' + PNAMES[k] + ' (OKLCH)'); }); });
  $('#palSurf').onchange = e => { ST.palSurf = e.target.value; renderPalX(); };
  $('#palGen').onclick = () => { const h = evalExpr($('#palHue').value); if (!isFinite(h)) return toast('Informe o matiz de 0 a 360', 1600); ST.palHue = h; ST.palSch = $('#palSch').value; const s = PAL.scheme(h, ST.palSch, 0.17, surf);
    for (const k of ['bg', 'primary', 'secondary', 'accent']) P.palette[k] = s[k].hex; delete P.palette.mode; P.palette.field = PAL.oklchToHex(((surf !== 'screen' ? 0.07 : 0.12) + Math.min(PAL.SURF[surf].primary_l, 0.93)) * 0.43, 0.01, h)[0]; commit(false, 'Esquema de cor'); renderProject(); toast('Esquema gerado para ' + surf, 1600); };
}

/* ---------- V5 · paleta rápida, idioma EN/PT-BR, ajuda ---------- */
const PAL_HUES = [['Vermelho', 30], ['Âmbar', 70], ['Amarelo', 110], ['Verde', 145], ['Ciano', 195], ['Azul', 265], ['Magenta', 330]];
const SCHEMES = [['mono', 'Mono'], ['analogous', 'Análogo'], ['complement', 'Complementar'], ['split', 'Compl. dividido'], ['triad', 'Tríade'], ['tetrad', 'Tétrade']];
function schemePalette(h, sch, surf) {
  const s = PAL.scheme(h, sch, 0.17, surf), o = {};
  for (const k of ['bg', 'primary', 'secondary', 'accent']) o[k] = s[k].hex;
  o.field = PAL.oklchToHex(((surf !== 'screen' ? 0.07 : 0.12) + Math.min(PAL.SURF[surf].primary_l, 0.93)) * 0.43, 0.01, h)[0];
  return o;
}
function setPalette(o, label, keepOpen) {
  delete P.palette.mode; Object.assign(P.palette, o);
  EXP.luma = P.palette.mode === 'white-alpha'; commit(false, label); renderProject(); if (keepOpen !== false) renderPop();
}
const swatch = p => `<span class="sw" aria-hidden="true">${['bg', 'primary', 'secondary', 'accent'].map(k => `<i style="background:${esc(p[k])}"></i>`).join('')}</span>`;
function renderPop() {
  const el = $('#palBody'); if (!el) return;
  const alpha = P.palette.mode === 'white-alpha', m = ST.palMode || (alpha ? 'alpha' : 'standard'), surf = ST.palSurf || surfaceOf();
  $$('#palModes [data-pm]').forEach(b => b.setAttribute('aria-pressed', b.dataset.pm === m));
  if (m === 'alpha') {
    el.innerHTML = `<p class="note">Tudo branco com opacidade (100 / 72 / 43 %). Você colore depois. Ideal para render com alfa.</p><div class="row">${swatch(PALS['BRANCO ALPHA'])}<button id="pmAlpha" aria-pressed="${alpha}">${alpha ? 'Branco α ativo' : 'Aplicar branco α'}</button></div>`;
    $('#pmAlpha').onclick = () => { ST.palMode = 'alpha'; setPalette(clone(PALS['BRANCO ALPHA']), 'Paleta branco α'); };
  } else if (m === 'standard') {
    const hue = ST.palHue ?? 250;
    el.innerHTML = `<p class="note">Esquemas gerados pela teoria das cores (OKLCH) a partir de um matiz, já ajustados para ${surf === 'led' ? 'LED' : surf === 'projection' ? 'projeção' : 'tela'}.</p>
      <div class="row chips">${PAL_HUES.map(([n, h]) => `<button data-ph="${h}" aria-pressed="${+hue === h}">${n}</button>`).join('')}<input type="text" inputmode="decimal" id="pmHue" value="${hue}" style="width:56px" aria-label="Matiz de 0 a 360" title="Matiz 0 a 360"></div>
      <div class="schemes">${SCHEMES.map(([s, n]) => { const p = schemePalette(+hue, s, surf); return `<button data-sch="${s}" title="${n}">${swatch(p)}<span>${n}</span></button>`; }).join('')}</div>`;
    $$('[data-ph]', el).forEach(b => b.onclick = () => { ST.palHue = +b.dataset.ph; renderPop(); });
    $('#pmHue').onchange = e => { const h = evalExpr(e.target.value); if (!isFinite(h)) return renderPop(); ST.palHue = ((h % 360) + 360) % 360; renderPop(); };
    $$('[data-sch]', el).forEach(b => b.onclick = () => setPalette(schemePalette(+hue, b.dataset.sch, surf), 'Paleta ' + b.title));
  } else if (m === 'custom') {
    const pal = P.palette, hx = v => PAL.h2rgb(v) || [0, 0, 0];
    el.innerHTML = `<p class="note">Escolha no seletor ou digite RGB (0 a 255) e HEX.</p>` + ['bg', 'primary', 'secondary', 'accent'].map(k => { const [r, g, b] = hx(pal[k]).map(x => Math.round(x * 255));
      return `<div class="crgb" data-k="${k}"><span class="lbl">${esc(PNAMES[k])}</span><input type="color" value="${esc(pal[k].toLowerCase())}" aria-label="Seletor de ${esc(PNAMES[k])}">
        ${[r, g, b].map((v, i) => `<input type="text" inputmode="numeric" data-ch="${i}" value="${v}" aria-label="${'RGB'[i]} de ${esc(PNAMES[k])}" title="${'RGB'[i]} 0 a 255">`).join('')}<input type="text" data-hexc value="${esc(pal[k].toUpperCase())}" maxlength="7" spellcheck="false" aria-label="HEX de ${esc(PNAMES[k])}"></div>`; }).join('');
    $$('.crgb', el).forEach(row => { const k = row.dataset.k, col = row.querySelector('input[type=color]'), hex = row.querySelector('[data-hexc]'), ch = $$('[data-ch]', row);
      const live = h => { P.palette[k] = h.toUpperCase(); delete P.palette.mode; col.value = h.toLowerCase(); hex.value = h.toUpperCase(); const [r, g, b] = hx(h).map(x => Math.round(x * 255)); [r, g, b].forEach((v, i) => ch[i].value = v); };
      col.oninput = () => live(col.value); col.onchange = () => { commit(false, 'Cor ' + PNAMES[k]); renderProject(); };
      hex.onchange = () => { const h = hex.value.startsWith('#') ? hex.value : '#' + hex.value; if (!PAL.h2rgb(h)) { toast('HEX inválido. Use #RRGGBB.', 1500); return renderPop(); } live(h); commit(false, 'Cor ' + PNAMES[k]); renderProject(); };
      ch.forEach(inp => inp.onchange = () => { const v = ch.map(i => evalExpr(i.value)); if (v.some(x => !isFinite(x))) { toast('Valor inválido. Use 0 a 255.', 1500); return renderPop(); }
        live('#' + v.map(x => clamp(Math.round(x), 0, 255).toString(16).padStart(2, '0')).join('').toUpperCase()); commit(false, 'Cor ' + PNAMES[k]); renderProject(); }); });
  } else {
    const b = P.meta.briefPalette;
    el.innerHTML = b ? `<p class="note">A paleta que o Claude gerou para este briefing.</p><div class="row">${swatch(b)}<button id="pmBrief">Restaurar paleta do briefing</button></div>` : `<p class="note">Este projeto não tem paleta de briefing. Carregue um projeto gerado pelo /vj.</p>`;
    if (b) $('#pmBrief').onclick = () => setPalette(Object.assign(clone(b)), 'Paleta do briefing');
  }
}
function setPop(open) {
  const pop = $('#palPop'), btn = $('#palBtn'); pop.hidden = !open; btn.setAttribute('aria-expanded', open);
  if (open) { const r = btn.getBoundingClientRect(); pop.style.left = clamp(r.left, 8, Math.max(8, innerWidth - pop.offsetWidth - 8)) + 'px'; pop.style.bottom = (innerHeight - r.top + 6) + 'px'; renderPop(); }
}
$('#palBtn').onclick = e => { e.stopPropagation(); setPop($('#palPop').hidden); };
$('#palPopX').onclick = () => setPop(false);
$$('#palModes [data-pm]').forEach(b => b.onclick = () => { ST.palMode = b.dataset.pm; renderPop(); });
document.addEventListener('pointerdown', e => { const pop = $('#palPop'); if (!pop.hidden && !pop.contains(e.target) && e.target !== $('#palBtn')) setPop(false); });
addEventListener('keydown', e => { if (e.key === 'Escape') { if (!$('#palPop').hidden) setPop(false); if (!$('#howto').hidden) setHow(false); } });
