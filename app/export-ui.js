/* Salvar arquivo, exportação PNG, gravação, janelas de saída e ações (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores EXPORTUI. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- salvar arquivo ---------- */
let DL = null, DLtried = false;
async function saveFile(filename, blob) {
  if (!DLtried) { DLtried = true; try { DL = (window.claude && window.claude.use) ? await window.claude.use('downloads') : null; } catch (e) { DL = null; } }
  if (DL) { try { await DL.save({ filename, data: blob }); return 'saved'; } catch (e) { return e && e.code === 'declined' ? 'declined' : 'erro:' + (e && e.code); } }
  const a = document.createElement('a'), u = URL.createObjectURL(blob); a.href = u; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(u), 10000);
  return 'saved';
}

/* ---------- export PNG (alpha) ---------- */
const EXP = { what: 'comp', region: -1, alpha: true, luma: false, scale: 1, fps: null, bars: null, comps: 'current', start: 0, end: -1, prefix: '', layerSel: 0, partMB: 0, flashCheck: true, flashLimit: false, flashSwing: 0.08, mp4q: 'mid' };
/* região de render: -1 = projeto completo; n = o display n (recorte definido pelo usuário ou importado) em pixels já multiplicados pela escala. O render é o do projeto inteiro; o recorte só decide o que sai. */
function regionRect(idx, scale, even) {
  const d = idx != null && idx >= 0 ? (P.canvas.displays || [])[idx] : null; if (!d) return null;
  const sc = v => Math.round(v * scale), W = sc(P.canvas.w), H = sc(P.canvas.h);
  const x = clamp(sc(d.x), 0, W - 1), y = clamp(sc(d.y), 0, H - 1); let w = clamp(sc(d.w), 1, W - x), h = clamp(sc(d.h), 1, H - y);
  if (even) { w = Math.max(2, w & ~1); h = Math.max(2, h & ~1); }
  return { x, y, w, h, idx, name: d.name || 'D' + pad(idx + 1, 2) };
}
let CANCEL = false;
/* SHA-256 de um arquivo gravado (manifesto v2): crypto.subtle quando o contexto permite; sem ele o hash fica null e o manifesto diz isso, em vez de inventar */
async function shaBlob(b) { try { if (!(window.crypto && crypto.subtle)) return null; return [...new Uint8Array(await crypto.subtle.digest('SHA-256', await b.arrayBuffer()))].map(x => x.toString(16).padStart(2, '0')).join(''); } catch (e) { return null; } }
function lumaKey(ctx, w, h) { const im = ctx.getImageData(0, 0, w, h), d = im.data; for (let i = 0; i < d.length; i += 4) { const a = d[i + 3]; if (!a) continue; const v = Math.max(d[i], d[i + 1], d[i + 2]); d[i + 3] = (v * a / 255) | 0; d[i] = d[i + 1] = d[i + 2] = 255; } ctx.putImageData(im, 0, 0); }
async function prepMedia(comp, F) {
  for (const [i, L] of comp.layers.entries()) {
    if (L.type !== 'video' || !L.on) continue; const p = pm(L), m = MEDIA[p.media]; if (!m || !m.el) continue;
    m.el.pause(); await seekVideo(m.el, videoTime(m, p, layerFrame(F, p, i, comp.layers.length)));
  }
}
async function exportRun(info, bar) {
  if (EXPORTING) return;
  if (typeof JSZip === 'undefined') { info.textContent = 'A biblioteca de ZIP não carregou. Verifique a conexão e recarregue.'; return; }
  const projHash = FLASH.sha256(JSON.stringify(projectOut()));
  const bak = { fps: P.canvas.fps, bars: P.time.bars, live: ST.live };
  const fps = EXP.fps || P.canvas.fps, bars = EXP.bars || P.time.bars;
  P.canvas.fps = fps; P.time.bars = bars;
  const LF = loopFrames(), start = clamp(EXP.start, 0, LF - 1), end = EXP.end < 0 ? LF - 1 : clamp(EXP.end, start, LF - 1);
  const ciList = EXP.comps === 'all' ? P.compositions.map((_, i) => i) : [ST.ci];
  const alpha = EXP.what !== 'rgb', perLayer = EXP.what === 'layers', single = EXP.what === 'single';
  const v = validate({ scale: EXP.scale, fps, comps: ciList, alpha, start, end, layers: perLayer, layerCount: cur().layers.filter(l => l.on).length });
  const errs = v.out.filter(x => x.lvl === 'ERROR');
  if (errs.length) { P.canvas.fps = bak.fps; P.time.bars = bak.bars; renderExport(); info.textContent = `Export bloqueado: ${errs.length} erro(s). Veja a validação acima.`; return; }
  /* segurança de flash: mede o loop de cada composição (luminância relativa em baixa resolução) e, se pedido, calcula o ganho que suaviza as subidas bruscas só onde o teste falha */
  const flashInfo = [], gains = {};
  const doFlash = EXP.flashCheck || EXP.flashLimit;
  if (doFlash) { info.textContent = 'Analisando flashes…'; await new Promise(r => setTimeout(r, 30)); }
  for (const ci of (doFlash ? ciList : [])) {
    const ser = FLASH.seriesOf(ci, LF), an = FLASH.analyze(ser, fps), rec = { composition: P.compositions[ci].name, flashesPerSecondWorst: an.worst, pass: an.pass, atFrame: an.at, limited: false };
    if (!an.pass && EXP.flashLimit) { const g = FLASH.limit(ser, EXP.flashSwing, fps, an.bad), after = FLASH.analyze(ser.map((x, i) => x * g[i]), fps); gains[ci] = g; rec.limited = true; rec.after = { flashesPerSecondWorst: after.worst, pass: after.pass }; rec.maxSwing = EXP.flashSwing; }
    flashInfo.push(rec);
  }
  EXPORTING = true; CANCEL = false; ST.live = false; RENDER_ALPHA = alpha; bar.style.display = 'block';
  const W = P.canvas.w, H = P.canvas.h, w = Math.round(W * EXP.scale), h = Math.round(H * EXP.scale);
  const lay = document.createElement('canvas'); lay.width = w; lay.height = h; const lctx = lay.getContext('2d', EXP.luma ? { willReadFrequently: true } : undefined); /* leitura de pixels só no luma; fora dele o canvas fica em GPU */
  const cmp = document.createElement('canvas'); cmp.width = w; cmp.height = h; const cctx = cmp.getContext('2d');
  const reg = regionRect(EXP.region, EXP.scale, false), crop = reg ? document.createElement('canvas') : null, kctx = crop ? crop.getContext('2d') : null;
  if (crop) { crop.width = reg.w; crop.height = reg.h; }
  const view = c => { if (!reg) return c; kctx.clearRect(0, 0, reg.w, reg.h); kctx.drawImage(c, reg.x, reg.y, reg.w, reg.h, 0, 0, reg.w, reg.h); return crop; };
  let zip = new JSZip(); const PROJ = safe(P.meta.name), tag = (EXP.prefix ? safe(EXP.prefix) + '_' : '') + (reg ? safe(reg.name) + '_' : '');
  let files = 0, partBytes = 0, partFiles = 0; const parts = [], frameList = [];
  const baseName = () => `${PROJ}_${EXP.comps === 'all' ? 'ALL' : pad(ST.ci + 1, 2) + '_' + safe(cur().name)}_${reg ? reg.w : w}x${reg ? reg.h : h}_${fps}fps${reg ? '_' + safe(reg.name) : ''}${alpha ? '_ALPHA' : ''}${EXP.luma ? '_BRANCO' : ''}`;
  const put = async (path, canvas) => { const b = await new Promise(r => view(canvas).toBlob(r, 'image/png')); zip.file(path, b); partBytes += b.size; partFiles++; files++; frameList.push({ file: path, bytes: b.size, sha256: await shaBlob(b) }); };
  /* divisão em partes: quando o ZIP em memória passa do limite, ele é gravado e recomeça; as partes têm pastas disjuntas (quadros diferentes) e se extraem juntas */
  const flushPart = async (last) => {
    info.textContent = `Compactando a parte ${parts.length + 1}…`;
    const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' }), fn = `${baseName()}_p${pad(parts.length + 1, 2)}.zip`, r = await saveFile(fn, out);
    parts.push({ file: fn, bytes: out.size, files: zip.file(/./).length, saved: r === 'saved' });
    if (r !== 'saved') throw new Error('Download da parte ' + fn + ' não foi concluído (' + r + ')');
    if (!last) { zip = new JSZip(); partBytes = 0; partFiles = 0; }
  };
  const maybeFlush = async () => { if (EXP.partMB > 0 && partBytes > EXP.partMB * 1048576) await flushPart(false); };
  try {
    await document.fonts.ready;
    for (const ci of ciList) {
      TM.resetAll();
      const comp = P.compositions[ci], cn = pad(ci + 1, 2) + '_' + safe(comp.name);
      const onIdx = comp.layers.map((L, i) => i).filter(i => comp.layers[i].on);
      const tgt = single ? [clamp(EXP.layerSel, 0, comp.layers.length - 1)] : onIdx;
      for (let n = start; n <= end; n++) {
        if (CANCEL) throw new Error('Cancelado');
        const F = frameAt(n, comp); await prepMedia(comp, F);
        const pend = [];
        composeFrame(comp, F, { target: cmp, scale: EXP.scale, W, H, bgFill: (!alpha && !onIdx.some(i => comp.layers[i].type === 'bg')) ? col(comp, 'bg') : null, only: single ? tgt : null,
          vis: single ? () => true : undefined, skip: (i, L) => alpha && L.type === 'bg' && !single, luma: EXP.luma,
          onLayer: (i, lc, L) => { if (perLayer || single) pend.push(put(`${PROJ}/LAYERS/${cn}/L${i}_${safe(L.name)}/${tag}${cn}_L${i}_${pad(n, 6)}.png`, lc)); } });
        await Promise.all(pend);
        if (gains[ci] && gains[ci][n] < 0.999) { cctx.globalCompositeOperation = 'source-atop'; cctx.globalAlpha = 1 - FLASH.srgbFactor(gains[ci][n]); cctx.fillStyle = '#000'; cctx.fillRect(0, 0, w, h); cctx.globalCompositeOperation = 'source-over'; cctx.globalAlpha = 1; }   // dimensiona só onde já há pixel: o alpha não muda
        if (!single) await put(`${PROJ}/${alpha ? 'ALPHA' : 'COMPOSITIONS'}/${cn}/${tag}${cn}_${pad(n, 6)}.png`, cmp);
        if (n === start) { const pb = await new Promise(r => view(cmp).toBlob(r, 'image/png')); zip.file(`${PROJ}/PREVIEW/${cn}_frame0.png`, pb); }
        const k = (ciList.indexOf(ci) * (end - start + 1) + (n - start) + 1) / (ciList.length * (end - start + 1));
        bar.firstElementChild.style.width = (k * 90) + '%'; info.textContent = `Renderizando ${cn} · quadro ${n - start + 1} de ${end - start + 1} · ${files} PNG`;
        if (n % 2 === 0) await new Promise(r => setTimeout(r, 0));
        await maybeFlush();
      }
    }
    zip.file(`${PROJ}/PROJECT_DATA/project.json`, JSON.stringify(projectOut(), null, 2));
    zip.file(`${PROJ}/PROJECT_DATA/LEIAME.txt`, readme(fps, bars, reg ? reg.w : w, reg ? reg.h : h, end - start + 1, alpha));
    /* manifesto: tudo que é preciso para reproduzir ou conferir o export (a última parte leva o manifesto, o project.json e o LEIAME) */
    const manifest = {
      schema: 'ai-vj-generator/export-manifest/2', engine: VERSION, createdAt: new Date().toISOString(),
      project: { name: P.meta.name, id: P.id || null, seed: P.seed, sha256: projHash, bpm: P.time.bpm, bars, loop: P.time.loop, seamless: P.time.seamless, loopFrames: LF },
      canvas: { w: W, h: H, fps, target: P.canvas.target, folds: P.canvas.folds || [] },
      export: { mode: EXP.what, alpha, whiteAlpha: EXP.luma, scale: EXP.scale, size: reg ? [reg.w, reg.h] : [w, h], region: reg ? { name: reg.name, index: reg.idx, x: reg.x, y: reg.y, w: reg.w, h: reg.h, unit: 'px at export scale' } : 'full', start, end, frames: end - start + 1, compositions: ciList.map(ci => P.compositions[ci].name), prefix: EXP.prefix || '', files, naming: `${PROJ}/${alpha ? 'ALPHA' : 'COMPOSITIONS'}/NN_COMPOSICAO/${tag}NN_COMPOSICAO_QUADRO6.png (quadro com 6 dígitos, começa em ${pad(start, 6)})`, partMB: EXP.partMB || 0 },
      flash: { criterion: 'WCAG 2.3.1 general flash (luminância relativa média do quadro; flash vermelho saturado NÃO medido)', analyzed: doFlash, limiter: EXP.flashLimit, perComposition: flashInfo },
      alpha: { declared: alpha, claim: alpha ? 'PNG RGBA: onde não há desenho o quadro é transparente (a camada bg não entra). Quem mede é o verificador, nos pixels.' : 'PNG opaco: alpha 255 em todo pixel (o PNG é gravado em RGBA, mas sem transparência).', mp4: 'MP4 H.264 não guarda alpha; para transparência use a sequência PNG.' },
      hashes: { algorithm: 'SHA-256', frames: frameList.every(f => f.sha256) ? 'present' : 'unavailable (crypto.subtle indisponível neste contexto)' },
      frames: frameList.slice().sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0),
      parts: [],
    };
    const lastName = parts.length ? `${baseName()}_p${pad(parts.length + 1, 2)}.zip` : `${baseName()}.zip`;
    manifest.parts = parts.map(p2 => ({ file: p2.file, bytes: p2.bytes, files: p2.files })).concat([{ file: lastName, bytes: null, files: zip.file(/./).length + 1 }]);   // +1: o próprio manifesto
    zip.file(`${PROJ}/MANIFEST.json`, JSON.stringify(manifest, null, 2));
    const out = await zip.generateAsync({ type: 'blob', compression: 'STORE' }, m => { bar.firstElementChild.style.width = (90 + m.percent * 0.1) + '%'; });
    const fn = lastName, r = await saveFile(fn, out);
    parts.push({ file: fn, bytes: out.size, files: zip.file(/./).length, saved: r === 'saved' });
    EXP.lastManifest = manifest;
    const bad = flashInfo.filter(x => !x.pass), flashNote = !bad.length ? '' : bad.every(x => x.limited && x.after.pass) ? ` Flashes suavizados em ${bad.length} composição(ões).` : ` ATENÇÃO: ${bad.filter(x => !x.limited || !x.after.pass).length} composição(ões) passam de 3 flashes por segundo (WCAG 2.3.1); veja o manifesto.`;
    info.textContent = r === 'saved' ? `Pronto: ${files} PNG em ${parts.length > 1 ? parts.length + ' partes (extraia todas na mesma pasta)' : fn} (${(parts.reduce((a, x) => a + x.bytes, 0) / 1048576).toFixed(1)} MB).${flashNote}` : r === 'declined' ? 'Download recusado. Clique de novo para tentar.' : `Não deu para salvar aqui (${r}). Abra a versão do GitHub localmente e exporte por lá.`;
  } catch (e) { info.textContent = e.message === 'Cancelado' ? 'Export cancelado.' : 'Falhou no meio do render: ' + e.message; console.error(e); }
  P.canvas.fps = bak.fps; P.time.bars = bak.bars; ST.live = bak.live; RENDER_ALPHA = false;
  bar.style.display = 'none'; bar.firstElementChild.style.width = '0';
  EXPORTING = false; ST.t0 = performance.now() - ST.n / P.canvas.fps * 1000;
}
function readme(fps, bars, w, h, frames, alpha) {
  return [`AI VJ GENERATOR v${VERSION} — ${P.meta.name}`, `${P.meta.artist || ''}`, '',
    `Canvas ${w}x${h} · ${fps} FPS · ${P.time.bpm} BPM · ${bars} compassos · ${frames} quadros por composição · seed ${P.seed}`,
    `Saída: ${alpha ? 'PNG com alpha (fundo transparente)' : 'PNG RGB'}${EXP.luma ? ' · BRANCO α (luma → alpha, pinte no software)' : ''}`, '',
    'ESTRUTURA', 'COMPOSITIONS/ ou ALPHA/  composição completa por pasta', 'LAYERS/  uma pasta por camada (quando exportado por camada)', 'PREVIEW/  primeiro quadro de cada composição', 'PROJECT_DATA/  project.json reproduz tudo (abra no AI VJ Generator)', '',
    'USO', `Sequência de ${fps} FPS com ${bars * 4} batidas por loop: o último quadro encaixa no primeiro. Camadas exportadas separadas: empilhe L0 embaixo, maior número em cima, com o mesmo blend do projeto.`, EXP.luma ? 'BRANCO α: o RGB é branco e a luminância virou alpha; pinte por camada no software de destino.' : '', '',
    'GYULYIA.COM · @GYULYIA'].join('\r\n');
}

/* ---------- gravação ---------- */
const REC = { r: null, chunks: [], stopAt: 0, mime: '' };
function recToggle() {
  if (REC.r) { REC.r.stop(); return; }
  if (!DOM.layers[0]) return;
  if (!COMP_CV.captureStream || typeof MediaRecorder === 'undefined') return toast('Este navegador não grava canvas. Use o export PNG.', 3600);
  COMP_CV.width = DOM.layers[0].cv.width; COMP_CV.height = DOM.layers[0].cv.height;
  compositeTo(COMP_CTX, cur(), DOM.layers.map(d => d.cv), { bgFill: '#000' });
  const stream = COMP_CV.captureStream(P.canvas.fps);
  const types = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'];
  REC.mime = types.find(t => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) || '';
  try { REC.r = new MediaRecorder(stream, REC.mime ? { mimeType: REC.mime, videoBitsPerSecond: 24e6 } : undefined); } catch (e) { return toast('Gravação indisponível: ' + e.message); }
  REC.chunks = [];
  REC.r.ondataavailable = ev => { if (ev.data.size) REC.chunks.push(ev.data); };
  REC.r.onstop = async () => {
    const ext = (REC.mime || 'video/webm').includes('mp4') ? 'mp4' : 'webm';
    const r = await saveFile(`${safe(P.meta.name)}_${pad(ST.ci + 1, 2)}_${safe(cur().name)}_${COMP_CV.width}x${COMP_CV.height}.${ext}`, new Blob(REC.chunks, { type: REC.mime || 'video/webm' }));
    REC.r = null; clearTimeout(REC.stopAt); $('#rec').setAttribute('aria-pressed', false); $('#rec').textContent = 'Gravar';
    toast(r === 'saved' ? 'Gravação salva (sem alpha)' : 'Gravação não salva: ' + r);
  };
  REC.r.start(250); $('#rec').setAttribute('aria-pressed', true); $('#rec').textContent = 'Parar';
  if (EXP.recLoop) { ST.t0 = performance.now(); REC.stopAt = setTimeout(() => REC.r && REC.r.stop(), loopSec() * 1000 + 120); toast(`Gravando 1 loop (${loopSec().toFixed(1)} s)`); } else toast('Gravando · R para parar');
}

/* ---------- janelas de saída ---------- */
const OUTS = [];
function openOutput(crop, label) {
  let w = null; try { w = window.open('', 'aivj_' + (label || 'out'), 'width=960,height=540'); } catch (e) { w = null; }
  if (!w) { toast('O ambiente bloqueou a janela de saída. Rode o HTML local (GitHub) ou use Tela cheia + segundo monitor.', 5200); return; }
  w.document.open();
  w.document.write('<!doctype html><title>AI VJ OUTPUT ' + (label || '') + '</title><style>html,body{margin:0;background:#000;height:100%;overflow:hidden;cursor:none}canvas{width:100vw;height:100vh;object-fit:contain;display:block}</style><canvas></canvas><script>addEventListener("dblclick",()=>document.documentElement.requestFullscreen&&document.documentElement.requestFullscreen());addEventListener("keydown",e=>{if(e.key==="f")document.documentElement.requestFullscreen()})<\/script>');
  w.document.close();
  OUTS.push({ w, cv: w.document.querySelector('canvas'), crop });
  toast('Janela de saída aberta · arraste para o 2º monitor e dê duplo clique para tela cheia', 4200);
}
function pumpOutputs() {
  for (let i = OUTS.length - 1; i >= 0; i--) {
    const o = OUTS[i]; if (o.w.closed) { OUTS.splice(i, 1); continue; }
    const k = COMP_CV.width / P.canvas.w, cr = o.crop || { x: 0, y: 0, w: P.canvas.w, h: P.canvas.h };
    const cw = Math.max(1, Math.round(cr.w * k)), ch = Math.max(1, Math.round(cr.h * k));
    if (o.cv.width !== cw) o.cv.width = cw; if (o.cv.height !== ch) o.cv.height = ch;
    o.cv.getContext('2d').drawImage(COMP_CV, cr.x * k, cr.y * k, cr.w * k, cr.h * k, 0, 0, cw, ch);
  }
}

function renderExport() {
  const el = pane('exp'), comp = cur(), fps = EXP.fps || P.canvas.fps, bars = EXP.bars || P.time.bars;
  const bak = [P.canvas.fps, P.time.bars]; P.canvas.fps = fps; P.time.bars = bars; const LF = loopFrames(); P.canvas.fps = bak[0]; P.time.bars = bak[1];
  const ciList = EXP.comps === 'all' ? P.compositions.map((_, i) => i) : [ST.ci], end = EXP.end < 0 ? LF - 1 : Math.min(EXP.end, LF - 1);
  const v = validate({ scale: EXP.scale, fps, comps: ciList, alpha: EXP.what !== 'rgb', start: EXP.start, end, layers: EXP.what === 'layers', layerCount: comp.layers.filter(l => l.on).length });
  const w = Math.round(P.canvas.w * EXP.scale), h = Math.round(P.canvas.h * EXP.scale);
  el.innerHTML = `<h2 class="sec">Export PNG sequence</h2>
    <p class="note">PNG com alpha dentro de um ZIP: é o formato que o navegador gera sem perder o canal alpha nem o quadro exato do loop. O navegador não codifica ProRes 4444 nem DXV3; para esses formatos converta a sequência com o ffmpeg.</p>
    <div class="row"><span class="lbl">Modo</span>${[['comp', 'Composição α'], ['rgb', 'Composição RGB'], ['layers', 'Camadas α'], ['single', 'Uma camada']].map(([k, n]) => `<button data-ew="${k}" aria-pressed="${EXP.what === k}">${n}</button>`).join('')}</div>
    ${EXP.what === 'single' ? `<div class="row fill"><select id="eLay" aria-label="Camada">${comp.layers.map((L, i) => `<option value="${i}" ${i === EXP.layerSel ? 'selected' : ''}>L${i} · ${esc(L.name)}</option>`).join('')}</select></div>` : ''}
    <div class="row"><span class="lbl">Composições</span><button data-ec="current" aria-pressed="${EXP.comps === 'current'}">Ativa (${pad(ST.ci + 1, 2)})</button><button data-ec="all" aria-pressed="${EXP.comps === 'all'}">Todas (${P.compositions.length})</button></div>
    <div class="row"><span class="lbl">Região</span><button data-er="-1" aria-pressed="${!regionRect(EXP.region, 1, false)}">Projeto completo</button>${(P.canvas.displays || []).map((d, i) => `<button data-er="${i}" aria-pressed="${EXP.region === i}" title="${d.w}×${d.h} em x ${d.x}, y ${d.y}">${esc(d.name || 'D' + pad(i + 1, 2))}</button>`).join('')}${(P.canvas.displays || []).length ? '' : '<span class="note">Sem regiões: crie na seção Regiões abaixo ou importe na aba Superfície.</span>'}</div>
    <div class="row"><span class="lbl">Resolução</span>${[0.25, 0.5, 1, 2].map(s => `<button data-es="${s}" aria-pressed="${EXP.scale === s}">${Math.round(P.canvas.w * s)}×${Math.round(P.canvas.h * s)}</button>`).join('')}</div>
    <div class="row"><span class="lbl">FPS</span>${[24, 25, 30, 50, 60].map(f => `<button data-ef="${f}" aria-pressed="${fps === f}">${f}</button>`).join('')}</div>
    <div class="row"><span class="lbl">Compassos</span>${[1, 2, 4, 8, 16].map(b => `<button data-eb="${b}" aria-pressed="${bars === b}">${b}</button>`).join('')}</div>
    <div class="row"><span class="lbl">Quadros</span><input type="number" id="eS" min="0" max="${LF - 1}" value="${EXP.start}" aria-label="Quadro inicial"><span class="lbl">a</span><input type="number" id="eE" min="0" max="${LF - 1}" value="${end}" aria-label="Quadro final"><span class="lbl">de ${LF}</span></div>
    <div class="row"><span class="lbl">Prefixo</span><input type="text" id="eP" value="${esc(EXP.prefix)}" placeholder="SHOT_01" aria-label="Prefixo dos arquivos"><button id="eLuma" aria-pressed="${EXP.luma}">Branco α (luma)</button></div>
    <div class="row"><span class="lbl">Dividir em partes</span>${[[0, 'Não'], [250, '250 MB'], [500, '500 MB'], [1000, '1 GB'], [2000, '2 GB']].map(([m, n]) => `<button data-epm="${m}" aria-pressed="${EXP.partMB === m}">${n}</button>`).join('')}</div>
    <div class="row"><span class="lbl">Flashes</span><button id="eFlChk" aria-pressed="${EXP.flashCheck}" title="Mede o loop antes de renderizar; em exports muito longos desligue para ganhar tempo">Analisar no export</button><button id="eFlTest">Testar flashes</button><button id="eFlLim" aria-pressed="${EXP.flashLimit}" title="Limita o contraste local (pico no máximo 0,08 acima do vale mais próximo) só nas composições que passam de 3 flashes por segundo">Suavizar se o teste falhar</button></div>
    <p class="note">${ciList.length} composição(ões) × ${end - EXP.start + 1} quadros · ${w}×${h} · ${v.files} PNG · ≈ ${v.mb < 1024 ? v.mb.toFixed(0) + ' MB' : (v.mb / 1024).toFixed(1) + ' GB'}. Nome: ${esc((EXP.prefix ? safe(EXP.prefix) + '_' : '') + pad(ST.ci + 1, 2) + '_' + safe(comp.name))}_000001.png</p>
    <h2 class="sec">Validação técnica <span class="lbl">${v.out.length ? v.out.length + ' item(ns)' : 'ok'}</span></h2>
    ${v.out.length ? `<ul class="val">${v.out.map(x => `<li class="${x.lvl}"><b>${x.lvl} · ${esc(x.t)}</b>${esc(x.m)}</li>`).join('')}</ul>` : '<p class="note">Canvas, FPS, loop, mídia e shaders conferidos. Nada a corrigir.</p>'}
    <div class="row"><button id="eGo" class="on">Renderizar e baixar ZIP</button><button id="eCancel">Cancelar</button><button id="eSheet" title="6 quadros do loop em uma imagem, com as dobras marcadas">Folha de contato PNG</button></div>
    <h2 class="sec">Vídeo MP4 (H.264)</h2>
    <p class="note">Gerado quadro a quadro pelo motor e codificado no navegador (WebCodecs): não é gravação de tela nem WebM. Usa a composição, a resolução, o FPS, os compassos e o intervalo de quadros acima. MP4 não tem alpha; para transparência use a sequência PNG. Acima de 4096 de largura o navegador pode recusar: reduza a resolução ou use PNG.</p>
    <div class="row"><span class="lbl">Qualidade</span>${[['high', 'Alta'], ['mid', 'Média'], ['low', 'Leve']].map(([k, n]) => `<button data-emq="${k}" aria-pressed="${EXP.mp4q === k}">${n}</button>`).join('')}<button id="eMp4" class="on">Renderizar e baixar MP4</button></div>
    <div class="prog" id="eBar"><i></i></div><p class="note" id="eInfo"></p>
    <pre class="tree">${esc(safe(P.meta.name))}/
├── COMPOSITIONS/   RGB, uma pasta por composição
├── ALPHA/          composição com transparência
├── LAYERS/         01_NOME/L1_MATERIA/…
├── PREVIEW/        primeiro quadro
└── PROJECT_DATA/   project.json · LEIAME.txt</pre>
    <h2 class="sec">Gravar tela</h2>
    <p class="note">Rascunho: GRAVAR captura a composição ao vivo em WebM (inclui áudio-reatividade real), mas pode travar em composições pesadas e não carrega alpha. Para entregar, use o MP4 ou a sequência PNG acima.</p>
    <div class="row"><button id="rLoop" aria-pressed="${!!EXP.recLoop}">Parar após 1 loop</button><button id="rGo">${REC.r ? 'Parar gravação' : 'Gravar composição'}</button></div>
    <h2 class="sec">Preview</h2>
    <div class="row"><button id="oOut">Abrir janela de preview</button><button id="oFs">Tela cheia da viewport</button></div>
    <h2 class="sec">Regiões <span class="lbl">recortes do canvas</span></h2>
    <div id="dispList">${(P.canvas.displays || []).map((d, i) => `<div class="row" data-di="${i}"><span class="lbl">D${pad(i + 1, 2)}</span>${['x', 'y', 'w', 'h'].map(k => `<input type="number" data-dk="${k}" value="${d[k]}" aria-label="D${i + 1} ${k}" style="width:64px">`).join('')}<button data-dopen="${i}">Abrir</button><button data-ddel="${i}">×</button></div>`).join('')}</div>
    <div class="row"><button id="dAdd">+ Região</button><button id="dSplit2">Dividir em 2</button><button id="dSplit3">Dividir em 3</button></div>
    <h2 class="sec">Formatos de entrega</h2>
    <p class="note">Entrega: PNG sequence (RGB ou RGBA, projeto completo, região ou camada) e MP4 H.264 (sem alpha). Os arquivos são comuns e abrem em qualquer software. O motor não faz transmissão, controle remoto nem mapping.</p>`;
  $$('[data-ew]', el).forEach(b => b.onclick = () => { EXP.what = b.dataset.ew; renderExport(); });
  $$('[data-ec]', el).forEach(b => b.onclick = () => { EXP.comps = b.dataset.ec; renderExport(); });
  $$('[data-er]', el).forEach(b => b.onclick = () => { EXP.region = +b.dataset.er; renderExport(); });
  $$('[data-es]', el).forEach(b => b.onclick = () => { EXP.scale = +b.dataset.es; renderExport(); });
  $$('[data-ef]', el).forEach(b => b.onclick = () => { EXP.fps = +b.dataset.ef; EXP.end = -1; EXP.start = 0; renderExport(); });
  $$('[data-eb]', el).forEach(b => b.onclick = () => { EXP.bars = +b.dataset.eb; EXP.end = -1; EXP.start = 0; renderExport(); });
  const eLay = $('#eLay'); if (eLay) eLay.onchange = e => { EXP.layerSel = +e.target.value; renderExport(); };
  $('#eS').onchange = e => { EXP.start = clamp(Math.round(+e.target.value || 0), 0, LF - 1); renderExport(); };
  $('#eE').onchange = e => { const v2 = Math.round(+e.target.value); EXP.end = v2 >= LF - 1 ? -1 : clamp(v2, 0, LF - 1); renderExport(); };
  $('#eP').onchange = e => { EXP.prefix = e.target.value; renderExport(); };
  $('#eLuma').onclick = () => { EXP.luma = !EXP.luma; renderExport(); };
  $$('[data-epm]', el).forEach(b => b.onclick = () => { EXP.partMB = +b.dataset.epm; renderExport(); });
  $('#eFlLim').onclick = () => { EXP.flashLimit = !EXP.flashLimit; renderExport(); };
  $('#eFlChk').onclick = () => { EXP.flashCheck = !EXP.flashCheck; renderExport(); };
  $('#eFlTest').onclick = async () => {
    const info = $('#eInfo'); info.textContent = 'Analisando flashes…'; await new Promise(r => setTimeout(r, 30));
    const bak2 = { fps: P.canvas.fps, bars: P.time.bars }; P.canvas.fps = fps; P.time.bars = bars; const LF2 = loopFrames();
    try { const res = ciList.map(ci => { const an = FLASH.analyze(FLASH.seriesOf(ci, LF2), fps); return `${P.compositions[ci].name}: ${an.worst.toFixed(1)} flash(es)/s no pior segundo (${an.pass ? 'passa' : 'NÃO passa'})`; }); info.textContent = res.join(' · ') + '. Critério geral do WCAG 2.3.1; flash vermelho não é medido; não substitui uma ferramenta homologada.'; }
    finally { P.canvas.fps = bak2.fps; P.time.bars = bak2.bars; }
  };
  $('#eGo').onclick = () => exportRun($('#eInfo'), $('#eBar'));
  $$('[data-emq]', el).forEach(b => b.onclick = () => { EXP.mp4q = b.dataset.emq; renderExport(); });
  $('#eMp4').onclick = () => exportMp4Run($('#eInfo'), $('#eBar'));
  $('#eCancel').onclick = () => { CANCEL = true; };
  $('#eSheet').onclick = async () => { const cv = contactSheet(ST.ci); const blob = await new Promise(res => cv.toBlob(res, 'image/png')); const r2 = await saveFile(safe(P.meta.name) + '_' + pad(ST.ci + 1, 2) + '_contato.png', blob); toast(r2 === 'saved' ? 'Folha de contato salva' : 'Não foi possível salvar'); };
  $('#rLoop').onclick = () => { EXP.recLoop = !EXP.recLoop; renderExport(); };
  $('#rGo').onclick = () => { recToggle(); setTimeout(renderExport, 50); };
  $('#oOut').onclick = () => openOutput(null, 'FULL');
  $('#oFs').onclick = toggleFs;
  const ds = () => P.canvas.displays || (P.canvas.displays = []);
  $('#dAdd').onclick = () => { ds().push({ x: 0, y: 0, w: Math.round(P.canvas.w / 2), h: P.canvas.h }); commit(); drawOverlay(); renderExport(); };
  const split = n => { P.canvas.displays = Array.from({ length: n }, (_, i) => ({ x: Math.round(P.canvas.w / n * i), y: 0, w: Math.round(P.canvas.w / n), h: P.canvas.h })); commit(); drawOverlay(); renderExport(); };
  $('#dSplit2').onclick = () => split(2); $('#dSplit3').onclick = () => split(3);
  $('#dispList').onchange = e => { const r = e.target.closest('[data-di]'); if (!r || !e.target.dataset.dk) return; ds()[+r.dataset.di][e.target.dataset.dk] = Math.round(+e.target.value || 0); commit(); drawOverlay(); };
  $('#dispList').onclick = e => { if (e.target.dataset.dopen != null) openOutput(ds()[+e.target.dataset.dopen], 'D' + (+e.target.dataset.dopen + 1)); if (e.target.dataset.ddel != null) { ds().splice(+e.target.dataset.ddel, 1); commit(); drawOverlay(); renderExport(); } };
}

function renderGuide() {
  pane('gui').innerHTML = `<h2 class="sec">Como funciona</h2>
    <p class="note">Um briefing vira uma gramática visual; a gramática vira 5 composições com hipóteses diferentes; cada composição é uma pilha de camadas independentes. Cada camada é uma função pura de parâmetros + quadro: o mesmo código desenha o preview, o PNG e a gravação. Por isso o loop fecha exato e a seed reproduz tudo.</p>
    <table class="tbl"><tr><th>Modo</th><th>O que é</th></tr>
      <tr><td><b>STANDARD</b></td><td>O motor de camadas original (organismo, estrutura, medição, dados, HUD, evento, pós), portado para relógio por quadros. Baseline, fallback e biblioteca.</td></tr>
      <tr><td><b>BRIEFING</b></td><td>O sistema gerado pelo entrevistador ou pela skill no Claude (JSON). Usa a mesma biblioteca e adiciona geradores: linhas, fluxo, túnel, parede tipográfica, shader.</td></tr>
      <tr><td><b>CUSTOM</b></td><td>Qualquer parâmetro: slider + campo numérico, reset, copiar e colar entre camadas, GLSL editável.</td></tr>
      <tr><td><b>PERFORMANCE</b></td><td>Aba Projeto: preview e densidade reduzidos para manter FPS ao vivo.</td></tr>
      <tr><td><b>EXPORT</b></td><td>PNG alpha por composição ou por camada, WebM, janela de saída.</td></tr></table>
    <h2 class="sec">Com o Claude</h2>
    <p class="note">Instale a skill <b>ai-vj-generator</b>. No chat, descreva o projeto: ela entrevista, propõe a gramática, escreve o PROJECT JSON (incluindo shaders GLSL próprios) e publica este gerador já carregado. Também dá para colar o JSON em Projeto → Importar.</p>
    <h2 class="sec">Atalhos</h2>
    <dl class="keys"><dt>Espaço</dt><dd>tap tempo (o 1º toque alinha o downbeat)</dd><dt>Enter</dt><dd>alinha o downbeat sem mudar o BPM</dd><dt>↑ ↓</dt><dd>BPM ±1 (Shift ±5)</dd><dt>Shift+1…9</dt><dd>trocar composição</dd><dt>0–9</dt><dd>liga / desliga camada</dd>
      <dt>P</dt><dd>pausa</dd><dt>E</dt><dd>mostrar camadas (arraste para girar)</dd><dt>S</dt><dd>degrau / suave</dd><dt>C</dt><dd>trocar acento</dd><dt>A</dt><dd>áudio reativo</dd>
      <dt>R</dt><dd>gravar</dd><dt>H</dt><dd>tela limpa</dd><dt>F</dt><dd>tela cheia</dd><dt>G</dt><dd>menu</dd><dt>Ctrl+Z</dt><dd>desfazer qualquer alteração</dd><dt>Ctrl+Y · Ctrl+Shift+Z</dt><dd>refazer</dd><dt>Duplo clique no rótulo</dt><dd>volta o número ao padrão</dd><dt>← → no divisor</dt><dd>largura do menu (Home minimiza)</dd><dt>, .</dt><dd>quadro anterior / próximo (pausado)</dd></dl>
    <h2 class="sec">Regras de direção</h2>
    <ul class="val">
      <li class="OPTIMIZATION"><b>Um herói por compasso</b>Densidade sim, disputa de atenção não. Defina primária, secundária, terciária e fundo.</li>
      <li class="OPTIMIZATION"><b>Cor é evento</b>Fundo 70%, primária 15%, secundária 10%, acento 5%.</li>
      <li class="OPTIMIZATION"><b>Interface em degrau, matéria em curva</b>Máquina move em saltos; organismo move em ease.</li>
      <li class="OPTIMIZATION"><b>Pense no espaço</b>LED pede linha grossa e nada de scanline; projeção pede margem; parede larga pede leitura horizontal.</li>
      <li class="OPTIMIZATION"><b>Áudio com parcimônia</b>Só a peça principal reage; o resto segue o BPM.</li></ul>
    <p class="note">AI VJ Generator v${VERSION} · open source MIT · GYULYIA.COM · @GYULYIA. Linguagem de referência do STANDARD: Graphic Realism. Glifos, códigos e pictogramas são originais.</p>`;
}

/* ---------- ações ---------- */
function toggleLayer(i, v) {
  const L = cur().layers[i]; if (!L) return;
  L.on = v === undefined ? !L.on : !!v; syncLayerDom();
  const r = $(`#lrows .lrow[data-i="${i}"] [data-vis]`); if (r) r.setAttribute('aria-pressed', L.on);
  commit();
}
function setBpm(b) {
  b = clamp(+b || 120, 40, 240); const now = performance.now(), fps = P.canvas.fps;
  const beatF = ST.n / (fps * 60 / P.time.bpm); P.time.bpm = Math.round(b * 100) / 100;
  ST.n = Math.round(beatF * fps * 60 / P.time.bpm); ST.t0 = now - ST.n / fps * 1000;
  $('#bpmv').textContent = +P.time.bpm.toFixed(1); commit();
  const tc = $('#timeCtl'); if (tc) setCtlValue(tc, 'bpm', P.time.bpm);
}
function tap() {
  const n = performance.now();
  if (ST.tap.length && n - ST.tap[ST.tap.length - 1] > 2000) ST.tap.length = 0;
  ST.tap.push(n); if (ST.tap.length > 6) ST.tap.shift();
  if (ST.tap.length >= 2) setBpm(Math.round(60000 / ((ST.tap[ST.tap.length - 1] - ST.tap[0]) / (ST.tap.length - 1)) * 10) / 10);
  else resync(); /* só o primeiro toque de uma série alinha o downbeat; os seguintes só ajustam o tempo */
}
function resync() { ST.t0 = performance.now(); ST.n = 0; }
function setMode(m, quiet) {
  if (m === 'briefing' && !SLOTS.briefing) { openWiz(); return; }
  ST.mode = m; P = SLOTS[m]; ST.ci = Math.min(ST.ci, P.compositions.length - 1); ST.sel = Math.min(ST.sel, cur().layers.length - 1); ST.solo = -1;
  SEED = P.seed; buildGrain(); rememberOrig(); gateCode(P); LAYER_WARN.clear(); AUDIT.clear(); EXP.luma = P.palette.mode === 'white-alpha'; loadAssets(P); refreshAll(); commit();
  if (!quiet) toast(m === 'standard' ? 'STANDARD · motor de camadas original' : 'BRIEFING · ' + P.meta.name);
}
function toggleFs() { const t = $('#vp'); try { if (document.fullscreenElement) document.exitFullscreen(); else (t.requestFullscreen || t.webkitRequestFullscreen).call(t).catch?.(() => toast('Tela cheia indisponível aqui')); } catch (e) { toast('Tela cheia indisponível aqui'); } }
function setExplode(v) { ST.exploded = v; stage.classList.toggle('exploded', v); $('#explode').setAttribute('aria-pressed', v); vp.classList.toggle('cross', !v); }
function cycleAccent() { const comp = cur(); comp.palette = comp.palette || {}; const curA = (comp.palette.accent || P.palette.accent).toUpperCase(); const i = ACC.findIndex(a => a.h === curA); const nx = ACC[(i + 1) % ACC.length]; comp.palette.accent = nx.h; commit(); toast('Acento: ' + nx.n, 1000); }
