/* Render em MP4 (H.264) quadro a quadro: WebCodecs codifica cada quadro que o motor desenhou, sem gravar a tela e sem WebM,
   e o muxer abaixo (escrito para o projeto, só vídeo, sem B-frames) monta o arquivo .mp4 com o índice no início (moov antes do mdat).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. O teste mp4_check.mjs confere o arquivo com o ffprobe/ffmpeg quando existem. */
const MP4X = (() => {
  const u32 = n => [(n >>> 24) & 255, (n >>> 16) & 255, (n >>> 8) & 255, n & 255], u16 = n => [(n >>> 8) & 255, n & 255];
  const str = s => [...s].map(c => c.charCodeAt(0));
  const cat = parts => { let n = 0; for (const p of parts) n += p.length; const o = new Uint8Array(n); let k = 0; for (const p of parts) { o.set(p, k); k += p.length; } return o; };
  const box = (type, ...payload) => { const body = cat(payload.map(p => p instanceof Uint8Array ? p : Uint8Array.from(p))); return cat([Uint8Array.from([...u32(8 + body.length), ...str(type)]), body]); };
  const full = (type, ver, flags, ...payload) => box(type, [ver, (flags >> 16) & 255, (flags >> 8) & 255, flags & 255], ...payload);
  const MATRIX = [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0x40, 0, 0, 0];   // identidade 16.16 / 2.30

  /* samples: [{ data: Uint8Array (AVCC, com prefixo de tamanho), key: bool }]; description: avcC (Uint8Array); timescale: fps*1000, cada amostra dura 1000 */
  function mux({ w, h, fps, description, samples }) {
    const timescale = Math.round(fps * 1000), dur = 1000, n = samples.length, total = n * dur;
    const ftyp = box('ftyp', str('isom'), u32(512), str('isom'), str('iso2'), str('avc1'), str('mp41'));
    const avc1 = box('avc1', [0, 0, 0, 0, 0, 0, 0, 1], [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], u16(w), u16(h), u32(0x00480000), u32(0x00480000), u32(0), u16(1),
      new Array(32).fill(0), u16(0x18), u16(0xffff), box('avcC', description));
    const stsd = full('stsd', 0, 0, u32(1), avc1);
    const stts = full('stts', 0, 0, u32(1), u32(n), u32(dur));
    const keys = samples.map((s, i) => s.key ? i + 1 : 0).filter(Boolean);
    const stss = full('stss', 0, 0, u32(keys.length), ...keys.map(k => u32(k)));
    const stsc = full('stsc', 0, 0, u32(1), u32(1), u32(n), u32(1));
    const stsz = full('stsz', 0, 0, u32(0), u32(n), ...samples.map(s => u32(s.data.length)));
    const moov = off => {
      const stco = full('stco', 0, 0, u32(1), u32(off));
      const stbl = box('stbl', stsd, stts, stss, stsc, stsz, stco);
      const minf = box('minf', full('vmhd', 0, 1, u16(0), u16(0), u16(0), u16(0)), box('dinf', full('dref', 0, 0, u32(1), full('url ', 0, 1))), stbl);
      const mdia = box('mdia', full('mdhd', 0, 0, u32(0), u32(0), u32(timescale), u32(total), u16(0x55c4), u16(0)), full('hdlr', 0, 0, u32(0), str('vide'), u32(0), u32(0), u32(0), [...str('VideoHandler'), 0]), minf);
      const trak = box('trak', full('tkhd', 0, 3, u32(0), u32(0), u32(1), u32(0), u32(total), u32(0), u32(0), u16(0), u16(0), u16(0), u16(0), MATRIX, u32(w << 16), u32(h << 16)), mdia);
      return box('moov', full('mvhd', 0, 0, u32(0), u32(0), u32(timescale), u32(total), u32(0x00010000), u16(0x0100), u16(0), u32(0), u32(0), MATRIX, new Array(24).fill(0), u32(2)), trak);
    };
    const head = cat([ftyp, moov(0)]), mdatHead = Uint8Array.from([...u32(8 + samples.reduce((a, s) => a + s.data.length, 0)), ...str('mdat')]);
    const real = cat([ftyp, moov(head.length + mdatHead.length)]);
    return new Blob([real, mdatHead, ...samples.map(s => s.data)], { type: 'video/mp4' });
  }

  const CODECS = ['avc1.640034', 'avc1.64002A', 'avc1.640028', 'avc1.4D0028', 'avc1.42001F'];   // High 5.2, 4.2, 4.0, Main 4.0, Baseline 3.1
  async function pickCodec(w, h, fps, bitrate) {
    if (typeof VideoEncoder === 'undefined') return { error: 'Este navegador não tem WebCodecs (VideoEncoder). Use o Chrome ou o Edge atual, ou exporte a sequência PNG.' };
    for (const codec of CODECS) {
      try { const r = await VideoEncoder.isConfigSupported({ codec, width: w, height: h, bitrate, framerate: fps, avc: { format: 'avc' } }); if (r.supported) return { codec, config: r.config }; } catch (e) { /* tenta o próximo */ }
    }
    return { error: `Este navegador não codifica H.264 em ${w}×${h}. Reduza a escala (a maioria aceita até 4096 de largura) ou exporte a sequência PNG e codifique com o ffmpeg.` };
  }
  const bitrateFor = (w, h, fps, q) => Math.round(w * h * fps * ({ high: 0.25, mid: 0.14, low: 0.07 }[q] || 0.14));

  /* getFrame(i) devolve um canvas (ou OffscreenCanvas) com o quadro i já desenhado; os quadros são lidos em ordem */
  async function encode({ w, h, fps, frames, getFrame, quality = 'mid', bitrate, gop, onProgress, cancelled }) {
    w -= w % 2; h -= h % 2;
    const br = bitrate || bitrateFor(w, h, fps, quality), pick = await pickCodec(w, h, fps, br);
    if (pick.error) throw new Error(pick.error);
    const samples = []; let description = null, fail = null;
    const enc = new VideoEncoder({ output: (chunk, meta) => { const d = new Uint8Array(chunk.byteLength); chunk.copyTo(d); if (meta && meta.decoderConfig && meta.decoderConfig.description && !description) description = new Uint8Array(meta.decoderConfig.description); samples.push({ data: d, key: chunk.type === 'key' }); }, error: e => { fail = e; } });
    enc.configure({ codec: pick.codec, width: w, height: h, bitrate: br, framerate: fps, avc: { format: 'avc' }, latencyMode: 'quality' });
    const g = gop || Math.max(1, Math.round(fps * 2));
    for (let i = 0; i < frames; i++) {
      if (cancelled && cancelled()) { enc.close(); throw new Error('Cancelado'); }
      if (fail) throw new Error('Erro no codificador H.264: ' + fail.message);
      const cv = await getFrame(i), vf = new VideoFrame(cv, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      enc.encode(vf, { keyFrame: i % g === 0 }); vf.close();
      while (enc.encodeQueueSize > 6) await new Promise(r => setTimeout(r, 1));
      if (onProgress) onProgress(i + 1, frames);
    }
    await enc.flush(); enc.close();
    if (fail) throw new Error('Erro no codificador H.264: ' + fail.message);
    if (!description || samples.length !== frames) throw new Error(`O codificador devolveu ${samples.length} de ${frames} quadros${description ? '' : ' e nenhuma configuração avcC'}.`);
    return { blob: mux({ w, h, fps, description, samples }), codec: pick.codec, bitrate: br, w, h, frames, bytes: samples.reduce((a, s) => a + s.data.length, 0) };
  }
  return { mux, encode, pickCodec, bitrateFor, CODECS };
})();

/* ---- integração com o motor: desenha cada quadro como o export PNG (camada por camada, mesmo blend e opacidade) e entrega ao codificador ---- */
async function mp4Render({ ci = ST.ci, start = 0, end = -1, scale = 1, fps = null, bars = null, quality = 'mid', bitrate, onProgress, cancelled, region = -1 } = {}) {
  const bak = { fps: P.canvas.fps, bars: P.time.bars, live: ST.live };
  if (fps) P.canvas.fps = fps; if (bars) P.time.bars = bars;
  const f = P.canvas.fps, LF = loopFrames(), s = clamp(start, 0, LF - 1), e = end < 0 ? LF - 1 : clamp(end, s, LF - 1);
  const W = P.canvas.w, H = P.canvas.h, w = Math.round(W * scale) & ~1, h = Math.round(H * scale) & ~1, comp = P.compositions[ci];
  EXPORTING = true; ST.live = false; RENDER_ALPHA = false;
  try {
    await document.fonts.ready;
    const lay = document.createElement('canvas'); lay.width = w; lay.height = h; const lctx = lay.getContext('2d');
    const cmp = document.createElement('canvas'); cmp.width = w; cmp.height = h; const cctx = cmp.getContext('2d');
    const rr = regionRect(region, scale, true), out = rr ? document.createElement('canvas') : cmp, octx = rr ? out.getContext('2d') : null; if (rr) { out.width = rr.w; out.height = rr.h; }
    const on = comp.layers.map((L, i) => i).filter(i => comp.layers[i].on), hasBg = on.some(i => comp.layers[i].type === 'bg');
    const getFrame = async i => {
      const n = s + i, F = frameAt(n, comp); await prepMedia(comp, F);
      cctx.setTransform(1, 0, 0, 1, 0, 0); cctx.globalCompositeOperation = 'source-over'; cctx.globalAlpha = 1; cctx.clearRect(0, 0, w, h);
      if (!hasBg) { cctx.fillStyle = col(comp, 'bg'); cctx.fillRect(0, 0, w, h); }
      for (const idx of on) {
        const L = comp.layers[idx]; renderLayer(lctx, comp, L, idx, F, scale, W, H, BELOW_TYPES.has(L.type) ? cmp : undefined);
        cctx.globalAlpha = L.opacity; cctx.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); cctx.drawImage(lay, 0, 0, w, h);
      }
      cctx.globalAlpha = 1; cctx.globalCompositeOperation = 'source-over';
      if (rr) { octx.drawImage(cmp, rr.x, rr.y, rr.w, rr.h, 0, 0, rr.w, rr.h); return out; }
      return cmp;
    };
    const r = await MP4X.encode({ w: rr ? rr.w : w, h: rr ? rr.h : h, fps: f, frames: e - s + 1, getFrame, quality, bitrate, onProgress, cancelled });
    return Object.assign(r, { fps: f, start: s, end: e, comp: comp.name, ci });
  } finally { P.canvas.fps = bak.fps; P.time.bars = bak.bars; ST.live = bak.live; RENDER_ALPHA = false; EXPORTING = false; ST.t0 = performance.now() - ST.n / P.canvas.fps * 1000; }
}
async function exportMp4Run(info, bar) {
  if (EXPORTING) return;
  const fps = EXP.fps || P.canvas.fps, bars = EXP.bars || P.time.bars, ciList = EXP.comps === 'all' ? P.compositions.map((_, i) => i) : [ST.ci];
  CANCEL = false; bar.style.display = 'block'; const t0 = performance.now(), done = [];
  try {
    for (const ci of ciList) {
      const r = await mp4Render({ ci, start: EXP.start, end: EXP.end, scale: EXP.scale, fps, bars, quality: EXP.mp4q || 'mid', region: EXP.region, cancelled: () => CANCEL,
        onProgress: (i, n) => { bar.firstElementChild.style.width = ((done.length + i / n) / ciList.length * 100) + '%'; info.textContent = `MP4 · ${P.compositions[ci].name} · quadro ${i} de ${n}`; } });
      const fn = `${safe(P.meta.name)}_${pad(ci + 1, 2)}_${safe(P.compositions[ci].name)}_${r.w}x${r.h}_${r.fps}fps${EXP.region >= 0 && regionRect(EXP.region, 1, true) ? '_' + safe(regionRect(EXP.region, 1, true).name) : ''}.mp4`, res = await saveFile(fn, r.blob);
      if (res !== 'saved') { info.textContent = res === 'declined' ? 'Download recusado.' : 'Download falhou: ' + res; return; }
      done.push({ fn, mb: r.blob.size / 1048576, frames: r.frames, codec: r.codec });
    }
    info.textContent = `Pronto: ${done.map(d => `${d.fn} (${d.frames} quadros, ${d.mb.toFixed(1)} MB, ${d.codec})`).join(' · ')} em ${((performance.now() - t0) / 1000).toFixed(1)} s. Gerado quadro a quadro, sem gravar a tela. MP4 não guarda alpha: use a sequência PNG para transparência.`;
  } catch (e) { info.textContent = e.message === 'Cancelado' ? 'Export cancelado.' : e.message; console.error(e); }
  bar.style.display = 'none'; bar.firstElementChild.style.width = '0';
}
