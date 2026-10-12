/* Ficha de produção: calculadoras e aba Ficha (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores FICHA. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- ficha de produção: calculadoras (espelham scripts/surface_calc.py; scripts/ui_check.mjs compara os dois) ---------- */
const SC = (() => {
  const FPS_OK = [24, 25, 30, 50, 60], BARS_OK = [1, 2, 4, 8, 16, 32], PORT_PX = 650000, UHD_PX = 3840 * 2160;
  const pyRound = x => { const r = Math.round(x); return (Math.abs(x % 1) === 0.5 && r % 2 !== 0) ? r - 1 : r; }; /* arredondamento do Python: meio vai para o par */
  const r3 = x => Math.round(x * 1000) / 1000;
  const gcd = (a, b) => { while (b) [a, b] = [b, a % b]; return a || 1; };
  const ratio = (w, h) => { const g = gcd(Math.round(w), Math.round(h)); return [Math.round(w) / g, Math.round(h) / g]; };
  const unitK = (w, h) => Math.min(h, w * 9 / 16) / 1080;
  const family = (w, h) => { const r = w / h; return r >= 8 ? 'ultra-wide strip' : r >= 2.6 ? 'wide panorama (32:9 class)' : r >= 2 ? 'wide (2:1 to 21:9)' : r >= 1.6 ? 'landscape standard (16:9 / 16:10)' : r >= 1.15 ? 'near-square landscape (4:3 / 5:4)' : r >= 0.85 ? 'square' : r >= 0.5 ? 'portrait (9:16 class)' : r > 0.125 ? 'ultra-tall' : 'ultra-tall strip'; };
  const pos = (o, ...ks) => { for (const k of ks) if (!(o[k] > 0)) return `${k} deve ser maior que 0`; return null; };
  function led(a) {
    const e = pos(a, 'pitch', 'cabW', 'cabH'); if (e) return { error: e };
    const out = { assumptions: [], warnings: [] };
    const cpw = a.cabPxW || pyRound(a.cabW / a.pitch), cph = a.cabPxH || (a.cabPxW ? a.cabPxW : pyRound(a.cabH / a.pitch)), eff = a.cabW / cpw;
    if (!a.cabPxW && Math.abs(eff - a.pitch) / a.pitch > 0.02) out.assumptions.push(`gabinete ${a.cabW} mm no pitch nominal P${a.pitch} dá ${cpw} px, pitch real ${eff.toFixed(3)} mm; use os pixels do datasheet se tiver`);
    let cols, rows;
    if ((a.cols != null && a.cols < 1) || (a.rows != null && a.rows < 1)) return { error: 'colunas e linhas devem ser pelo menos 1' };
    if (a.cols && a.rows) { cols = a.cols; rows = a.rows; }
    else if (a.widthM && a.heightM) { cols = Math.max(1, pyRound(a.widthM * 1000 / a.cabW)); rows = Math.max(1, pyRound(a.heightM * 1000 / a.cabH)); out.assumptions.push(`${a.widthM} x ${a.heightM} m arredondado para gabinetes inteiros: ${cols} x ${rows}`); }
    else return { error: 'informe colunas e linhas, ou largura e altura em metros' };
    const w = cols * cpw, h = rows * cph, total = w * h, ra = ratio(w, h);
    Object.assign(out, { cabinet_px: [cpw, cph], cabinets: [cols, rows], cabinet_count: cols * rows, pixel_map: [w, h], total_pixels: total,
      size_m: [r3(cols * a.cabW / 1000), r3(rows * a.cabH / 1000)], area_m2: Math.round(cols * a.cabW * rows * a.cabH / 1e6 * 100) / 100, effective_pitch_mm: r3(eff),
      aspect: ra[0] + ':' + ra[1], aspect_decimal: r3(w / h), family: family(w, h), ports_1gbe: Math.ceil(total / PORT_PX), fits_one_uhd_output: total <= UHD_PX && w <= 3840 && h <= 2160,
      viewing_distance_m: { minimum: Math.round(eff * 10) / 10, comfortable: [Math.round(2 * eff * 10) / 10, Math.round(3 * eff * 10) / 10] }, unit_scale_k: Math.round(unitK(w, h) * 1e4) / 1e4 });
    out.assumptions.push(`portas: ~${PORT_PX.toLocaleString('pt-BR')} px por porta 1 GbE a 8 bit / 60 Hz é um valor típico; confira o processador`);
    if (!out.fits_one_uhd_output) out.warnings.push(`${w}x${h} (${(total / 1e6).toFixed(2)} MP) passa de uma saída 3840x2160: planeje divisão do canvas em várias saídas ou confirme que o processador aceita como uma entrada`);
    if (w / h >= 8) out.warnings.push('faixa ultra-larga: componha em módulos, nunca estique um 16:9');
    return out;
  }
  function projection(a) {
    const e = pos(a, 'lumens'); if (e) return { error: e };
    const out = { assumptions: [], warnings: [] }, [pw, ph] = a.res || [1920, 1080];
    let iw; if (a.imageWidth > 0) iw = a.imageWidth; else if (a.throw > 0 && a.dist > 0) iw = a.dist / a.throw; else return { error: 'informe a largura da imagem, ou a relação de projeção e a distância' };
    const ih = iw * ph / pw, ppm = pw / iw, lux = a.lumens / (iw * ih);
    Object.assign(out, { projector_px: [pw, ph], image_size_m: [Math.round(iw * 100) / 100, Math.round(ih * 100) / 100], px_per_metre: Math.round(ppm * 10) / 10, mm_per_pixel: Math.round(1000 / ppm * 100) / 100, illuminance_lux: Math.round(lux) });
    if (a.ambient != null && a.ambient >= 0) { const cr = 1 + lux / Math.max(a.ambient, 0.01); out.contrast_ratio_est = Math.round(cr * 10) / 10; out.contrast_verdict = cr < 3 ? 'lavado: só formas claras e simples leem' : cr < 10 ? 'serve para formas fortes; evite detalhe escuro' : cr < 40 ? 'bom: gradientes e detalhe escuro sobrevivem' : 'excelente (sala escura)'; }
    if (a.reflectance != null) out.apparent_luminance_nits = Math.round(lux * a.reflectance / Math.PI);
    out.assumptions.push('lux = lúmens / área da imagem (ideal, ganho 1); contraste = 1 + lux projetado / lux ambiente; nits = lux x refletância / pi (lambertiano). Superfície, lente e idade reduzem isso.');
    if (a.surface) { const [sw, sh] = a.surface, ov = a.overlap ?? 0.15, nx = sw > iw ? Math.max(1, Math.ceil((sw - iw * ov) / (iw * (1 - ov)))) : 1, ny = sh > ih ? Math.max(1, Math.ceil((sh - ih * ov) / (ih * (1 - ov)))) : 1;
      out.surface_m = [sw, sh]; out.projectors = { x: nx, y: ny, total: nx * ny, overlap_fraction: ov }; out.master_canvas_px = [Math.round(nx * pw - (nx - 1) * ov * pw), Math.round(ny * ph - (ny - 1) * ov * ph)];
      if (nx * ny > 1) out.warnings.push('vários projetores: use o blend para os recortes e use o mesmo modelo e taxa de atualização em todos (tearing)'); }
    return out;
  }
  function blend(a) {
    const e = pos(a, 'n', 'overlap'); if (e) return { error: e };
    const [W, H] = a.proj || [1920, 1080], vert = a.axis === 'y', L = vert ? H : W, n = a.n, ov = a.overlap;
    if (ov >= L) return { error: 'a sobreposição deve ser menor que o projetor no eixo' };
    const visible = n * L - (n - 1) * ov, discard = (n - 1) * ov / 2, other = vert ? W : H;
    const crops = Array.from({ length: n }, (_, i) => { const s = Math.round(discard + i * (L - ov)); return { projector: i + 1, start: s, end: s + L }; });
    const out = { axis: a.axis || 'x', projector_px: [W, H], n, overlap_px: ov, overlap_pct: Math.round(1000 * ov / L) / 10,
      content_full_raster_px: vert ? [other, n * L] : [n * L, other], content_visible_px: vert ? [other, visible] : [visible, other], discard_each_outer_edge_px: discard, crop_ranges_in_full_raster: crops, warnings: [], assumptions: [] };
    if (ov / L < 0.08 || ov / L > 0.25) out.warnings.push(`a sobreposição é ${(ov / L * 100).toFixed(0)}% do projetor: a faixa usual é 10 a 20%`);
    out.warnings.push('nenhum texto, rosto ou logo na zona de blend nem nas bordas descartadas');
    if (n === 1) out.warnings.push('n = 1: um projetor não tem zona de blend; a sobreposição é ignorada');
    return out;
  }
  function loop(a) {
    const e = pos(a, 'bpm', 'bars', 'fps'); if (e) return { error: e };
    const out = { bpm: a.bpm, bars: a.bars, fps: a.fps, warnings: [] }, sec = 60 / a.bpm * 4 * a.bars, fr = sec * a.fps;
    if (!FPS_OK.includes(a.fps)) out.warnings.push(`fps ${a.fps} não está em ${FPS_OK.join(', ')}: o motor só renderiza esses`);
    if (!BARS_OK.includes(a.bars)) out.warnings.push(`${a.bars} compassos não está em ${BARS_OK.join(', ')}`);
    Object.assign(out, { seconds: Math.round(sec * 1e4) / 1e4, frames_exact: r3(fr), frames_rounded: pyRound(fr), frame_error: r3(pyRound(fr) - fr), frames_per_beat: r3(a.fps * 60 / a.bpm), frames_per_bar: r3(a.fps * 240 / a.bpm) });
    if (Math.abs(out.frame_error) > 0.02) out.warnings.push(`${a.bars} compassos a ${a.bpm} BPM / ${a.fps} fps dá ${fr.toFixed(3)} quadros: o loop fecha por fase; não mude fps nem compassos para caçar um inteiro`);
    out.integer_frame_options = []; for (const f of FPS_OK) for (const b of BARS_OK) { const q = 60 / a.bpm * 4 * b * f; if (Math.abs(q - Math.round(q)) < 0.01) out.integer_frame_options.push({ fps: f, bars: b, frames: Math.round(q), seconds: r3(60 / a.bpm * 4 * b) }); }
    if (a.refresh > 0) { if (a.refresh % a.fps === 0) out.refresh = `${a.refresh} Hz é múltiplo de ${a.fps} fps: cadência uniforme`; else { const ok = FPS_OK.filter(f => a.refresh % f === 0); out.refresh = `${a.refresh} Hz não é múltiplo de ${a.fps} fps: cadência irregular (judder). Fps que dividem ${a.refresh}: ${ok.join(', ') || 'nenhum'}`; out.warnings.push(out.refresh); } }
    return out;
  }
  function aspect(a) {
    const e = pos(a, 'w', 'h'); if (e) return { error: e };
    const { w, h } = a, ra = ratio(w, h), k = unitK(w, h), out = { size_px: [w, h], ratio: ra[0] + ':' + ra[1], decimal: Math.round(w / h * 1e4) / 1e4, family: family(w, h), megapixels: Math.round(w * h / 1e4) / 100, unit_scale_k: Math.round(k * 1e4) / 1e4, warnings: [] };
    out.line_weight_for_2px_units = Math.round(2 / k * 10) / 10;
    if (w / h >= 2.6) out.strip_modules = { module_px: h, count: Math.round(w / h * 100) / 100 };
    if (h / w >= 2.6) out.strip_modules = { module_px: w, count: Math.round(h / w * 100) / 100 };
    if (k < 0.5) out.warnings.push(`k = ${k.toFixed(2)}: as unidades encolhem; use linhas de pelo menos ${(2 / k).toFixed(0)} unidades e texto grande`);
    if (w > 3840 || h > 2160) out.warnings.push('mais que uma saída UHD: confirme como o pixel map chega ao processador');
    return out;
  }
  function legibility(a) {
    const e = pos(a, 'pitch', 'dist'); if (e) return { error: e };
    const px = deg => { const mm = a.dist * 1000 * Math.tan(deg * Math.PI / 180); return [Math.round(mm), Math.max(1, pyRound(mm / a.pitch))]; };
    const cpd = f => a.dist * 1000 / (57.2958 * f), [mnMm, mnPx] = px(0.3), [cfMm, cfPx] = px(0.6), lineMm = a.dist * 1000 * Math.tan(3 / 60 * Math.PI / 180);
    const out = { pitch_mm: a.pitch, distance_m: a.dist, warnings: [],
      pattern_period: { best_read_px: Math.max(1, pyRound(cpd(4) / a.pitch)), best_read_mm: Math.round(cpd(4)), invisible_below_px: Math.max(1, pyRound(cpd(30) / a.pitch)) },
      cap_height_min: { mm: mnMm, px: Math.max(mnPx, 7) }, cap_height_comfortable: { mm: cfMm, px: Math.max(cfPx, 9) }, line_weight_min_px: Math.max(2, pyRound(lineMm / a.pitch)) };
    if (a.dist < a.pitch) out.warnings.push(`${a.dist} m é menos que 1 m por mm de pitch (${a.pitch} mm): os pixels individuais aparecem`);
    return out;
  }
  return { led, projection, blend, loop, aspect, legibility, pyRound };
})();

/* ---------- ficha de produção: aba "Ficha" ---------- */
const ARCHETYPES = [['stage-led', 'LED de palco'], ['led-architecture', 'LED arquitetural'], ['facade-mapping', 'Fachada (superfície plana)'], ['clip-pack', 'Clip pack'], ['broadcast-xr', 'Broadcast / XR'], ['installation', 'Instalação'], ['corporate', 'Corporativo'], ['social', 'Social']];
const SPC = { led: { pitch: 3.9, cabW: 500, cabH: 500, cols: 20, rows: 8, widthM: 0, heightM: 0, by: 'cab' }, proj: { w: 1920, h: 1080, throw: 1.5, dist: 12, lumens: 10000, ambient: 20, reflectance: 0.3 },
  blend: { w: 1920, h: 1080, n: 2, overlap: 256, axis: 'x' }, loop: { refresh: 60 }, leg: { pitch: 3.9, dist: 15 }, open: { led: true } };
const KEYPT = { cabinet_px: 'px por gabinete', cabinets: 'gabinetes (col × lin)', cabinet_count: 'total de gabinetes', pixel_map: 'pixel map', total_pixels: 'pixels totais', size_m: 'tamanho (m)', area_m2: 'área (m²)',
  effective_pitch_mm: 'pitch real (mm)', aspect: 'proporção', aspect_decimal: 'proporção (decimal)', family: 'família de formato', ports_1gbe: 'portas 1 GbE', fits_one_uhd_output: 'cabe numa saída UHD', viewing_distance_m: 'distância de visão (m)', unit_scale_k: 'escala k (unidade → px)',
  projector_px: 'projetor (px)', image_size_m: 'imagem (m)', px_per_metre: 'px por metro', mm_per_pixel: 'mm por pixel', illuminance_lux: 'iluminância (lux)', contrast_ratio_est: 'contraste estimado', contrast_verdict: 'leitura', apparent_luminance_nits: 'luminância aparente (nits)', projectors: 'projetores', master_canvas_px: 'canvas mestre (px)',
  axis: 'eixo', n: 'projetores', overlap_px: 'sobreposição (px)', overlap_pct: 'sobreposição (%)', content_full_raster_px: 'conteúdo, raster cheio (px)', content_visible_px: 'conteúdo visível (px)', discard_each_outer_edge_px: 'descartar em cada borda externa (px)',
  bpm: 'BPM', bars: 'compassos', fps: 'fps', seconds: 'duração (s)', frames_exact: 'quadros exatos', frames_rounded: 'quadros (arredondado)', frame_error: 'erro (quadros)', frames_per_beat: 'quadros por tempo', frames_per_bar: 'quadros por compasso', refresh: 'display',
  pitch_mm: 'pitch (mm)', distance_m: 'distância (m)', pattern_period: 'período do padrão', cap_height_min: 'altura de letra mínima', cap_height_comfortable: 'altura de letra confortável', line_weight_min_px: 'traço mínimo (px)',
  size_px: 'tamanho (px)', ratio: 'proporção', decimal: 'proporção (decimal)', megapixels: 'megapixels', line_weight_for_2px_units: 'traço de 2 px (unidades)', strip_modules: 'módulos da faixa', best_read_px: 'melhor leitura (px)', best_read_mm: 'melhor leitura (mm)', invisible_below_px: 'invisível abaixo de (px)', minimum: 'mínima', comfortable: 'confortável', module_px: 'módulo (px)', count: 'quantidade', x: 'x', y: 'y', total: 'total', overlap_fraction: 'sobreposição' };
const nice = k => KEYPT[k] || String(k).replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/_/g, ' ').toLowerCase();
const fmt = v => typeof v === 'boolean' ? (v ? 'sim' : 'não') : typeof v === 'number' ? (Number.isInteger(v) && Math.abs(v) >= 100000 ? v.toLocaleString('pt-BR') : String(v)) : Array.isArray(v) ? v.map(fmt).join(' × ') : (v && typeof v === 'object') ? Object.entries(v).map(([k, x]) => `${nice(k)} ${fmt(x)}`).join(', ') : String(v);
const specOf = create => { if (!P.meta.spec && create) { const c = P.canvas; P.meta.spec = { archetype: [], confirmed: { pixelMap: [c.w, c.h] }, derived: {}, zones: {}, assumed: [], show: { bpm: [P.time.bpm, P.time.bpm] }, risks: [] }; } return P.meta.spec; };
function kvHtml(o, skip = []) { return `<dl class="kv">${Object.entries(o || {}).filter(([k]) => !skip.includes(k)).map(([k, v]) => `<dt>${esc(nice(k))}</dt><dd>${esc(fmt(v))}</dd>`).join('')}</dl>`; }
function resHtml(r) {
  if (!r) return '';
  if (r.error) return `<ul class="val"><li class="ERROR"><b>Entrada inválida</b>${esc(r.error)}</li></ul>`;
  const main = Object.entries(r).filter(([k]) => !['warnings', 'assumptions', 'integer_frame_options', 'crop_ranges_in_full_raster'].includes(k));
  let h = `<dl class="kv">${main.map(([k, v]) => `<dt>${esc(nice(k))}</dt><dd>${esc(fmt(v))}</dd>`).join('')}</dl>`;
  if (r.crop_ranges_in_full_raster) h += `<dl class="kv">${r.crop_ranges_in_full_raster.map(c => `<dt>projetor ${c.projector}</dt><dd>${c.start} → ${c.end}</dd>`).join('')}</dl>`;
  if (r.integer_frame_options) h += `<p class="note">Fecha em quadros inteiros: ${r.integer_frame_options.length ? r.integer_frame_options.slice(0, 8).map(o => `${o.bars} comp. a ${o.fps} fps = ${o.frames}`).join(' · ') : 'nenhuma combinação nesse BPM; o loop fecha por fase'}</p>`;
  h += `<ul class="val">${(r.warnings || []).map(w => `<li class="WARNING"><b>Atenção</b>${esc(w)}</li>`).join('')}${(r.assumptions || []).map(w => `<li class="OPTIMIZATION"><b>Premissa</b>${esc(w)}</li>`).join('')}</ul>`;
  return h;
}
function numIn(grp, key, label, step = 'any', min = '0') { return `<label class="row" style="margin:0"><span class="lbl">${label}</span><input type="number" data-sc="${grp}.${key}" value="${Number(SPC[grp][key]) || 0}" step="${step}" min="${min}" style="width:78px"></label>`; }
function calcSections() {
  const L = SPC.led, c = P.canvas, T = P.time, S = specOf(false);
  const led = SC.led({ pitch: L.pitch, cabW: L.cabW, cabH: L.cabH, ...(L.by === 'm' ? { widthM: L.widthM, heightM: L.heightM } : { cols: L.cols, rows: L.rows }) });
  const pr = SC.projection({ res: [SPC.proj.w, SPC.proj.h], throw: SPC.proj.throw, dist: SPC.proj.dist, lumens: SPC.proj.lumens, ambient: SPC.proj.ambient, reflectance: SPC.proj.reflectance });
  const bl = SC.blend({ proj: [SPC.blend.w, SPC.blend.h], n: SPC.blend.n, overlap: SPC.blend.overlap, axis: SPC.blend.axis });
  const lo = SC.loop({ bpm: T.bpm, bars: T.bars, fps: c.fps, refresh: SPC.loop.refresh });
  const lg = SC.legibility({ pitch: S?.confirmed?.pitchMm || c.pitch || SPC.leg.pitch, dist: SPC.leg.dist });
  const ar = SC.aspect({ w: c.w, h: c.h });
  const sec = (id, title, body, apply) => `<details data-sec="${id}" ${SPC.open[id] ? 'open' : ''}><summary class="lbl" style="cursor:pointer;padding:6px 0">${title}</summary>${body}${apply ? `<div class="row"><button data-apply="${id}" ${(apply === 'off') ? 'disabled' : ''}>Aplicar ao canvas e à ficha</button></div>` : ''}</details>`;
  return sec('led', 'LED: gabinetes e pitch → pixel map', `<div class="row">${numIn('led', 'pitch', 'Pitch mm', '0.01', '0.1')}${numIn('led', 'cabW', 'Gab. L mm', '1', '50')}${numIn('led', 'cabH', 'Gab. A mm', '1', '50')}</div>
      <div class="row"><button data-by="cab" aria-pressed="${L.by !== 'm'}">Gabinetes</button><button data-by="m" aria-pressed="${L.by === 'm'}">Metros</button>
      ${L.by === 'm' ? numIn('led', 'widthM', 'Largura m', '0.1', '0') + numIn('led', 'heightM', 'Altura m', '0.1', '0') : numIn('led', 'cols', 'Colunas', '1', '1') + numIn('led', 'rows', 'Linhas', '1', '1')}</div><div id="r-led">${resHtml(led)}</div>`, led.error ? 'off' : 'on')
    + sec('proj', 'Projeção: lúmens, distância, contraste', `<div class="row">${numIn('proj', 'w', 'Res. L', '1', '16')}${numIn('proj', 'h', 'Res. A', '1', '16')}${numIn('proj', 'throw', 'Throw', '0.01', '0.1')}${numIn('proj', 'dist', 'Dist. m', '0.1', '0.1')}</div>
      <div class="row">${numIn('proj', 'lumens', 'Lúmens', '100', '100')}${numIn('proj', 'ambient', 'Lux amb.', '0.1', '0')}${numIn('proj', 'reflectance', 'Refletância', '0.01', '0')}</div><div id="r-proj">${resHtml(pr)}</div>`)
    + sec('blend', 'Blend de projetores: recortes e sobreposição', `<div class="row">${numIn('blend', 'w', 'Proj. L', '1', '16')}${numIn('blend', 'h', 'Proj. A', '1', '16')}${numIn('blend', 'n', 'Projetores', '1', '1')}${numIn('blend', 'overlap', 'Sobrep. px', '1', '1')}
      <select data-sc="blend.axis" aria-label="Eixo do blend"><option value="x" ${SPC.blend.axis === 'x' ? 'selected' : ''}>horizontal</option><option value="y" ${SPC.blend.axis === 'y' ? 'selected' : ''}>vertical</option></select></div><div id="r-blend">${resHtml(bl)}</div>`, bl.error ? 'off' : 'on')
    + sec('loop', 'Loop: BPM, compassos, fps, taxa do display', `<div class="row">${numIn('loop', 'refresh', 'Display Hz', '1', '0')}</div><p class="note">BPM, compassos e fps vêm da aba Projeto.</p><div id="r-loop">${resHtml(lo)}</div>`)
    + sec('leg', 'Legibilidade: pitch e distância', `<div class="row">${numIn('leg', 'pitch', 'Pitch mm', '0.01', '0.1')}${numIn('leg', 'dist', 'Dist. m', '0.5', '0.5')}</div><div id="r-leg">${resHtml(lg)}</div>`)
    + sec('asp', `Canvas atual: ${c.w}×${c.h}`, `<div id="r-asp">${resHtml(ar)}</div>`);
}
function specMarkdown() {
  const S = specOf(false), c = P.canvas, T = P.time; if (!S) return '';
  const rows = o => Object.entries(o || {}).map(([k, v]) => `| ${k} | ${fmt(v)} |`).join('\n');
  return `# ${P.meta.name}: ficha de produção\n\n- Arquétipo: ${(S.archetype || []).join(', ') || 'não definido'}\n- Canvas: ${c.w} × ${c.h} px, ${c.fps} fps, destino ${c.target}\n- Tempo: ${T.bpm} BPM, ${T.bars} compassos\n${(c.folds || []).length ? `- Dobras (x px): ${c.folds.join(', ')}, calha ${c.gutter ?? 90} un.\n` : ''}\n## Confirmado\n\n| Campo | Valor |\n|---|---|\n${rows(S.confirmed)}\n\n## Derivado\n\n| Campo | Valor |\n|---|---|\n${rows(S.derived)}\n\n## Zonas (fração do canvas)\n\n${Object.entries(S.zones || {}).map(([k, z]) => (Array.isArray(z) ? z : [z]).filter(Boolean).map(q => `- ${k}: x ${q.x}, y ${q.y}, w ${q.w}, h ${q.h}`).join('\n')).filter(Boolean).join('\n') || '- nenhuma'}\n\n## Premissas (confirmar com o técnico ou o cliente)\n\n${(S.assumed || []).map(a => `- ${a.field} = ${fmt(a.value)}: ${a.why}${a.risk ? ` (risco: ${a.risk})` : ''}`).join('\n') || '- nenhuma'}\n\n## Show\n\n| Campo | Valor |\n|---|---|\n${rows(S.show)}\n\n## Riscos\n\n${(S.risks || []).map(r => `- ${r}`).join('\n') || '- nenhum registrado'}\n\n## Cartões de teste a rodar primeiro no local\n\n1. grade de alinhamento e réguas de pixel, com as dobras; 2. xadrez e bordas de 1 px; 3. rampa de cinza e tira de gama; 4. barras de cor, tela toda branca e toda preta; 5. moldura de área segura e cruz central; 6. barra horizontal em movimento (judder, tearing); 7. marcas da zona de blend.\n`;
}
function renderSpec() {
  const el = pane('spc'), S = specOf(false), c = P.canvas;
  let body;
  if (!S) body = `<p class="note">Este projeto não tem ficha de produção. A ficha guarda o que foi confirmado e o que foi assumido sobre a superfície, as zonas que o público não vê e os riscos. Ela viaja dentro do JSON (<code>meta.spec</code>).</p><div class="row"><button id="spMake">Criar ficha a partir do canvas</button></div>`;
  else {
    const pm = S.confirmed?.pixelMap, mism = pm && (pm[0] !== c.w || pm[1] !== c.h);
    body = `${mism ? `<ul class="val"><li class="ERROR"><b>Ficha e canvas divergem</b>A ficha confirma ${esc(pm[0])}×${esc(pm[1])} e o canvas é ${c.w}×${c.h}. O canvas deve ser o pixel map confirmado.</li></ul><div class="row"><button id="spToCanvas">Usar o pixel map da ficha no canvas</button><button id="spToSpec">Atualizar a ficha com o canvas</button></div>` : (pm ? `<ul class="val"><li class="OPTIMIZATION"><b>Ficha e canvas conferem</b>${esc(pm[0])}×${esc(pm[1])} px</li></ul>` : '')}
      <h2 class="sec">Arquétipo</h2><div class="row">${ARCHETYPES.map(([k, l]) => `<button data-arch="${k}" aria-pressed="${(S.archetype || []).includes(k)}">${l}</button>`).join('')}</div>
      <h2 class="sec">Confirmado</h2>${kvHtml(S.confirmed)}
      <h2 class="sec">Derivado</h2>${Object.keys(S.derived || {}).length ? kvHtml(S.derived) : '<p class="note">Os números calculados abaixo entram aqui quando você aplica.</p>'}
      <h2 class="sec">Assumido <span class="lbl">${(S.assumed || []).length}</span></h2>
      ${(S.assumed || []).map((a, i) => `<ul class="val"><li class="WARNING"><b>${esc(a.field)} = ${esc(fmt(a.value))}</b>${esc(a.why || '')}${a.risk ? ` · risco: ${esc(a.risk)}` : ''}<span class="row"><button data-confirm="${i}">Confirmar</button><button data-dropas="${i}" aria-label="Remover premissa">✕</button></span></li></ul>`).join('') || '<p class="note">Nenhuma premissa pendente.</p>'}
      <div class="row"><input type="text" id="spAsF" placeholder="campo (ex.: viewingDistanceM)" style="flex:1"><input type="text" id="spAsV" placeholder="valor" style="width:70px"><input type="text" id="spAsW" placeholder="por quê" style="flex:2"><button id="spAsAdd">+ premissa</button></div>
      <h2 class="sec">Zonas <span class="lbl">fração do canvas</span></h2>
      <div class="row"><button id="spZones" aria-pressed="${ST.zones !== false}">Mostrar na viewport</button><select id="spZName" aria-label="Tipo de zona"><option>performer</option><option>occluded</option><option>text-safe</option><option>blend</option></select><button id="spZAdd">+ zona</button><button id="spZDraw" aria-pressed="${!!ST.zoneDraw}">Desenhar na vista</button></div>
      ${Object.entries(S.zones || {}).flatMap(([k, zs]) => (Array.isArray(zs) ? zs : [zs]).filter(Boolean).map((z, j) => ({ k, j, z }))).map(({ k, j, z }) => `<div class="row" data-zone="${esc(k)}:${j}"><span class="lbl" style="width:74px">${esc(k)}</span>${['x', 'y', 'w', 'h'].map(f => `<input type="number" data-zf="${f}" value="${Number(z[f]) || 0}" step="0.01" min="0" max="1" style="width:56px" aria-label="${f}">`).join('')}<button data-zdel="1" aria-label="Remover zona">✕</button></div>`).join('') || '<p class="note">Sem zonas. Marque onde fica o performer, a mesa do DJ ou o que o público não vê: o hero, o texto e o brilho saem dali.</p>'}
      <h2 class="sec">Show</h2>
      <div class="row"><label class="row" style="margin:0"><span class="lbl">BPM de</span><input type="number" id="spBpmA" value="${esc(S.show?.bpm?.[0] ?? '')}" style="width:58px"></label><label class="row" style="margin:0"><span class="lbl">a</span><input type="number" id="spBpmB" value="${esc(S.show?.bpm?.[1] ?? '')}" style="width:58px"></label><label class="row" style="margin:0"><span class="lbl">Duração min</span><input type="number" id="spDur" value="${esc(S.show?.durationMin ?? '')}" style="width:58px"></label></div>
      <h2 class="sec">Riscos <span class="lbl">um por linha</span></h2><textarea id="spRisks" rows="3" aria-label="Riscos">${esc((S.risks || []).join('\n'))}</textarea>
      <div class="row"><button id="spCopy">Copiar PRODUCTION_SPEC.md</button><button id="spSave">Baixar PRODUCTION_SPEC.md</button></div>`;
  }
  el.innerHTML = `<h2 class="sec">Ficha de produção <span class="lbl">${S ? (S.archetype || []).length ? esc(S.archetype.join(' · ')) : 'sem arquétipo' : 'não criada'}</span></h2>${body}<h2 class="sec">Calculadoras <span class="lbl">espelham surface_calc.py</span></h2><div id="spCalcs">${calcSections()}</div>`;
  bindSpec(el);
}
function refreshCalcs() { const h = $('#spCalcs'); if (!h) return; const a = document.activeElement, id = a && a.dataset && a.dataset.sc, sel = a && a.selectionStart; h.innerHTML = calcSections(); bindCalcs(h); if (id) { const n = h.querySelector(`[data-sc="${id}"]`); if (n) { n.focus(); try { n.setSelectionRange(sel, sel); } catch (e) { } } } }
function bindCalcs(root) {
  $$('details[data-sec]', root).forEach(d => d.ontoggle = () => { SPC.open[d.dataset.sec] = d.open; });
  $$('[data-sc]', root).forEach(i => i.onchange = () => { const [g, k] = i.dataset.sc.split('.'); SPC[g][k] = i.tagName === 'SELECT' ? i.value : (parseFloat(String(i.value).replace(',', '.')) || 0); refreshCalcs(); });
  $$('[data-by]', root).forEach(b => b.onclick = () => { SPC.led.by = b.dataset.by; refreshCalcs(); });
  $$('[data-apply]', root).forEach(b => b.onclick = () => applyCalc(b.dataset.apply));
}
function applyCalc(id) {
  const S = specOf(true), c = P.canvas;
  if (id === 'led') {
    const L = SPC.led, r = SC.led({ pitch: L.pitch, cabW: L.cabW, cabH: L.cabH, ...(L.by === 'm' ? { widthM: L.widthM, heightM: L.heightM } : { cols: L.cols, rows: L.rows }) }); if (r.error) return toast(r.error);
    [c.w, c.h] = r.pixel_map; c.pitch = L.pitch; c.target = 'led';
    S.confirmed = { ...S.confirmed, pixelMap: r.pixel_map, pitchMm: L.pitch }; S.derived = { ...S.derived, aspect: r.aspect, cabinets: r.cabinets, ports_1gbe: r.ports_1gbe, size_m: r.size_m };
    if (!(S.archetype || []).length) S.archetype = ['stage-led'];
  } else if (id === 'blend') {
    const B = SPC.blend, r = SC.blend({ proj: [B.w, B.h], n: B.n, overlap: B.overlap, axis: B.axis }); if (r.error) return toast(r.error);
    [c.w, c.h] = r.content_visible_px; c.target = 'projection';
    S.confirmed = { ...S.confirmed, pixelMap: r.content_visible_px }; S.derived = { ...S.derived, blend: { n: B.n, overlapPx: B.overlap, axis: B.axis, fullRaster: r.content_full_raster_px, crops: r.crop_ranges_in_full_raster.map(q => `${q.start}-${q.end}`) } };
    if (!(S.archetype || []).length) S.archetype = ['facade-mapping'];
  } else return;
  commit(); refreshAll(); toast('Canvas e ficha atualizados: ' + c.w + '×' + c.h);
}
function bindSpec(el) {
  const S = specOf(false), c = P.canvas; bindCalcs($('#spCalcs'));
  if (!S) { $('#spMake').onclick = () => { specOf(true); commit(); renderSpec(); }; return; }
  const save = (redraw = true) => { commit(); drawOverlay(); if (redraw) renderSpec(); };
  $('#spToCanvas') && ($('#spToCanvas').onclick = () => { [c.w, c.h] = S.confirmed.pixelMap; commit(); refreshAll(); });
  $('#spToSpec') && ($('#spToSpec').onclick = () => { S.confirmed.pixelMap = [c.w, c.h]; save(); });
  $$('[data-arch]', el).forEach(b => b.onclick = () => { const a = new Set(S.archetype || []); a.has(b.dataset.arch) ? a.delete(b.dataset.arch) : a.add(b.dataset.arch); S.archetype = [...a]; save(); });
  $$('[data-confirm]', el).forEach(b => b.onclick = () => { const a = S.assumed.splice(+b.dataset.confirm, 1)[0]; S.confirmed[a.field] = a.value; save(); });
  $$('[data-dropas]', el).forEach(b => b.onclick = () => { S.assumed.splice(+b.dataset.dropas, 1); save(); });
  $('#spAsAdd').onclick = () => { const f = $('#spAsF').value.trim(), w = $('#spAsW').value.trim(); if (!f || !w) return toast('Preencha o campo e o porquê'); const v = $('#spAsV').value.trim(); S.assumed = S.assumed || []; S.assumed.push({ field: f, value: isFinite(+v) && v !== '' ? +v : v, why: w }); save(); };
  $('#spZones').onclick = () => { ST.zones = ST.zones === false; drawOverlay(); renderSpec(); };
  $('#spZDraw').onclick = () => setZoneDraw(ST.zoneDraw ? null : $('#spZName').value);
  $('#spZAdd').onclick = () => { const k = $('#spZName').value; S.zones = S.zones || {}; const cur0 = S.zones[k]; const z = { x: 0.3, y: 0.4, w: 0.4, h: 0.6 }; S.zones[k] = Array.isArray(cur0) ? [...cur0, z] : cur0 ? [cur0, z] : z; ST.zones = true; save(); };
  $$('[data-zone]', el).forEach(row => { const [k, j] = row.dataset.zone.split(':'); const list = () => Array.isArray(S.zones[k]) ? S.zones[k] : [S.zones[k]];
    $$('[data-zf]', row).forEach(i => i.onchange = () => { const z = list()[+j]; z[i.dataset.zf] = clamp(+i.value || 0, 0, 1); save(false); });
    row.querySelector('[data-zdel]').onclick = () => { const l = list().filter((_, q) => q !== +j); if (l.length) S.zones[k] = l.length === 1 ? l[0] : l; else delete S.zones[k]; save(); }; });
  const showSet = () => { const a = parseFloat($('#spBpmA').value), b = parseFloat($('#spBpmB').value), d = parseFloat($('#spDur').value); S.show = S.show || {}; if (isFinite(a) && isFinite(b)) S.show.bpm = [a, b]; if (isFinite(d)) S.show.durationMin = d; commit(); };
  ['spBpmA', 'spBpmB', 'spDur'].forEach(id => $('#' + id).onchange = showSet);
  $('#spRisks').onchange = e => { S.risks = e.target.value.split('\n').map(s => s.trim()).filter(Boolean); commit(); };
  $('#spCopy').onclick = () => copyText(specMarkdown(), 'PRODUCTION_SPEC.md copiado');
  $('#spSave').onclick = async () => { const r = await saveFile('PRODUCTION_SPEC.md', new Blob([specMarkdown()], { type: 'text/markdown' })); toast(r === 'saved' ? 'Ficha salva' : r === 'declined' ? 'Download recusado' : 'Ficha pronta'); };
}
