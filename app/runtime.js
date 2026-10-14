/* Estado, relógio, render de camada e áudio (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores RUNTIME. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- estado ---------- */
let SLOTS = { standard: standardProject(), briefing: null };
let P = SLOTS.standard;
const ST = { mode: 'standard', ci: 0, sel: 1, solo: -1, paused: false, exploded: false, t0: performance.now(), n: 0, lastNow: performance.now(), quality: 0.75, dens: 1, zoom: 1, grid: false, safe: false,
  manEv: null, live: true, rx: 58, rz: -32, tap: [], hist: [], future: [], clip: null, tr: null, lastBeat: -1, ps: 0.5, fitS: 1, fpsA: 60, ms: 0, tab: 'par', lib: 'comp' };
const cur = () => P.compositions[ST.ci] || P.compositions[0];
const isVis = i => { const L = cur().layers[i]; return !!L && L.on && (ST.solo < 0 || ST.solo === i) && !(ST.alphaStage && L.type === 'bg'); };

/* ---------- relógio ---------- */
const loopFrames = () => Math.max(1, Math.round(loopSec() * P.canvas.fps));
function frameAt(n, comp) {
  const fps = P.canvas.fps, fpb = fps * 60 / P.time.bpm, LF = loopFrames();
  let m = n;
  if (P.time.loop) {
    m = ((n % LF) + LF) % LF;
    const md = P.time.mode;
    if (md === 'pingpong') { const k = ((n % (2 * LF)) + 2 * LF) % (2 * LF); m = k < LF ? k : 2 * LF - 1 - k; }
    else if (md === 'reverse') m = LF - 1 - m;
    else if (md === 'random') { const li = Math.floor(n / LF), off = Math.floor(hr(li, 77) * P.time.bars) * Math.round(4 * fpb); m = (m + off) % LF; }
  }
  const beatF = m / fpb, beat = Math.floor(beatF);
  const F = { n: m, raw: m, fps, fpb, LF, t: m / fps, ph: m / LF, beatF, beat, bp: beatF - beat, bar: Math.floor(beat / 4), sub: Math.floor(beatF * 4), jx: 0 };
  const post = comp && comp.layers.find(l => l.type === 'post' && l.on);
  if (post) { const pp = pm(post); const g = glitchAt(F, pp); if (g.on && pp.jitter) F.jx = (hr(beat, 31) < 0.5 ? -1 : 1) * (g.strong ? 10 : 4); }
  return F;
}
const DIVM = { '1/1': 0.25, '1/2': 0.5, '1/4': 1, '1/8': 2, '1/16': 4 };
function layerFrame(F, p, idx, count, type, tp) {
  const m = DIVM[p.div] || 1;
  const lph = F.ph + p.phase + (P.time.mode === 'phase' && P.time.loop ? idx / count : 0);
  const bF = (F.beatF + p.phase * 4) * m, bk = Math.floor(bF), lbp = bF - bk;
  /* REGRA: todo shader é audioreativo. A resposta nunca cai abaixo de 0.35, com áudio ao vivo ou com as bandas sintéticas do BPM. */
  /* semântica de áudio (fase 10): a camada com declaração temporal só ouve se o comportamento ouve, e só as classes de banda que declara; sem declaração, a regra antiga */
  const shader = type === 'shader', GT = AUDIOSEM.state(tp), gain = GT ? (GT.open ? (shader ? Math.max(p.audio, 0.35) : p.audio) : 0) : shader ? Math.max(p.audio, 0.35) : p.audio;
  const live = AUD.live(), A = live ? AUD : pseudoAudio(F), sens = P.audio.sens, bg = shader ? gain : (gain > 0 ? gain : 1);
  const a = (live || shader) && gain > 0 ? clamp(A[p.band] * gain * sens, 0, 1.5) : 0;
  /* bandas para shaders e para K.t.* das camadas de código: ao vivo ou sintéticas do BPM; só o shader é obrigado a usá-las */
  const bands = { bass: clamp(A.bass * bg * sens, 0, 1.5), mid: clamp(A.mid * bg * sens, 0, 1.5), high: clamp(A.high * bg * sens, 0, 1.5), rms: clamp(A.rms * bg * sens, 0, 1.5), hit: clamp(A.hit * bg * sens, 0, 1.5) };
  /* vocabulário estendido (V7): transientes por banda, tempo integrado (cresce com a música, fecha em número inteiro por loop), presença, ondas do BPM */
  /* estratégia de áudio declarada (audio.strategy): none zera o que reage, subtle/structural/rhythmic/full escalam; os tempos integrados e as ondas do BPM seguem (movimento sem reação) */
  const SG = { none: 0, subtle: 0.4, structural: 0.7, rhythmic: 1, full: 1.3 }[P.audio.strategy], sg = SG === undefined ? 1 : SG;
  if (sg !== 1) for (const k of ['bass', 'mid', 'high', 'rms', 'hit']) bands[k] *= sg;
  Object.assign(bands, { kick: clamp((A.kick || 0) * bg * sens * sg, 0, 1.5), onset: clamp((A.onset || 0) * bg * sens * sg, 0, 1.5), flux: clamp((A.flux || 0) * bg * sens * sg, 0, 1.5), mhit: clamp((A.mhit || 0) * bg * sens * sg, 0, 1.5), hhit: clamp((A.hhit || 0) * bg * sens * sg, 0, 1.5), bt: A.bt || 0, mt: A.mt || 0, ht: A.ht || 0, at: A.at || 0, pres: clamp((A.pres || 0) * bg * sens * sg, 0, 1.5), bpm: P.time.bpm / 100 }, bpmWaves(F));
  if (GT) AUDIOSEM.mask(bands, GT);
  const pulse = a > 0 ? Math.min(1, a) : Math.exp(-lbp * 5);
  return Object.assign({}, F, { lph, bF, bk, lbp, pulse, a, bands, speed: p.speed });
}

/* ---------- render de camada (preview, export e gravação usam a mesma função) ---------- */
const LAYER_ERR = new Map();
let ECHO_CV = null;
function echoScratch(w, h) { if (!ECHO_CV) ECHO_CV = document.createElement('canvas'); if (ECHO_CV.width !== w || ECHO_CV.height !== h) { ECHO_CV.width = w; ECHO_CV.height = h; } return ECHO_CV; }
function renderLayer(ctx, comp, L, idx, F, k, W, H, below) {
  const cv = ctx.canvas, g = GEN[L.type]; if (!g) return;
  const p = pm(L), ec = L.type === 'video' ? 0 : Math.min(8, Math.round(p.echo || 0));
  paintLayer(ctx, comp, L, idx, F, k, W, H, true, below);
  if (ec > 0) {
    /* eco: cópias da própria camada em quadros anteriores (função pura do quadro: determinístico e fecha o loop).
       As cópias entram ATRÁS da camada atual, com queda geométrica de opacidade. */
    const sc = echoScratch(cv.width, cv.height), sx = sc.getContext('2d'), step = Math.max(1, Math.round(p.echoStep || 3)), fade = clamp(p.echoFade ?? 0.6, 0.1, 0.95);
    const now = document.createElement('canvas'); now.width = cv.width; now.height = cv.height; now.getContext('2d').drawImage(cv, 0, 0);
    ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none'; ctx.clearRect(0, 0, cv.width, cv.height);
    for (let j = ec; j >= 1; j--) {
      const Fj = frameAt(F.raw - j * step, comp); paintLayer(sx, comp, L, idx, Fj, k, W, H, true);
      ctx.globalAlpha = Math.pow(fade, j); ctx.drawImage(sc, 0, 0);
    }
    ctx.globalAlpha = 1; ctx.drawImage(now, 0, 0);
  }
}
function paintLayer(ctx, comp, L, idx, F, k, W, H, clr, below) {
  const cv = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
  if (clr) ctx.clearRect(0, 0, cv.width, cv.height);
  const g = GEN[L.type]; if (!g) return;
  let p = pm(L); const u = unitOf(W, H), LF = layerFrame(F, p, idx, comp.layers.length, L.type, L.temporal); p = applyMods(p, L, LF);
  p = DEPTH.adjust(p, L, comp, F, W, H);   /* 2.5D (fase 11): a câmera da composição move, escala, desfoca e esmaece a camada que tem z; sem câmera nem z, p fica intacto */
  ctx.setTransform(k, 0, 0, k, 0, 0);
  const ax = p.ax * W, ay = p.ay * H;
  ctx.translate(ax + p.x + F.jx * u, ay + p.y); if (p.rot) ctx.rotate(p.rot * Math.PI / 180); if (p.sx !== 1 || p.sy !== 1) ctx.scale(p.sx, p.sy); ctx.translate(-ax, -ay);
  const f = [];
  if (p.bright !== 1) f.push(`brightness(${p.bright})`); if (p.contrast !== 1) f.push(`contrast(${p.contrast})`); if (p.sat !== 1) f.push(`saturate(${p.sat})`);
  if (p.hue) f.push(`hue-rotate(${p.hue}deg)`); if (p.blur > 0) f.push(`blur(${p.blur * k}px)`); if (p._alpha !== undefined && p._alpha < 1) f.push(`opacity(${p._alpha})`);
  if (f.length) ctx.filter = f.join(' ');
  ctx.lineJoin = 'miter'; ctx.lineCap = 'butt'; ctx.textBaseline = 'alphabetic';
  try { ctx.save(); g.draw(ctx, { L, p, F: LF, comp, W, H, u, k, idx, below }); ctx.restore(); LAYER_ERR.delete(L); }
  catch (e) { ctx.restore(); if (!LAYER_ERR.has(L)) console.error('camada', L.name, e); LAYER_ERR.set(L, String(e.message || e)); }
  ctx.filter = 'none'; ctx.setTransform(1, 0, 0, 1, 0, 0);
}
function compositeTo(ctx, comp, layerCanvases, opts = {}) {
  const cv = ctx.canvas;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.clearRect(0, 0, cv.width, cv.height);
  if (opts.bgFill) { ctx.fillStyle = opts.bgFill; ctx.fillRect(0, 0, cv.width, cv.height); }
  comp.layers.forEach((L, i) => {
    if (opts.upTo != null && i >= opts.upTo) return;
    const lc = layerCanvases[i]; if (!lc || !(opts.vis ? opts.vis(i) : isVis(i))) return;
    ctx.globalAlpha = L.opacity; ctx.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]);
    ctx.drawImage(lc, 0, 0, cv.width, cv.height);
  });
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
}

/* ---------- áudio ---------- */
const AUD = {
  det: null, flux: 0, onset: 0, kick: 0, kickBpm: 0, kickBpmK: 0, kickConf: 0,
  ctx: null, an: null, src: null, el: null, stream: null, fd: null, td: null, bass: 0, mid: 0, high: 0, rms: 0, hit: 0, pb: 0, beat: false, avg: 0.2, pk: { bass: 0.2, mid: 0.2, high: 0.2 }, name: '', timer: 0, nodes: [],
  live() { return P.audio.reactive && !!this.an && !!this.src && !EXPORTING; },
  ensure() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) throw new Error('Este navegador não tem Web Audio.'); this.ctx = new AC(); this.an = this.ctx.createAnalyser(); this.an.fftSize = 2048; this.an.smoothingTimeConstant = 0.5; this.fd = new Uint8Array(this.an.frequencyBinCount); this.td = new Uint8Array(this.an.fftSize); } if (this.ctx.state === 'suspended') this.ctx.resume(); },
  stop() { clearInterval(this.timer); this.timer = 0; try { this.src && this.src.disconnect(); } catch (e) {} try { this.an && this.an.disconnect(); } catch (e) {} this.nodes.forEach(n => { try { n.disconnect(); } catch (e) {} try { n.stop && n.stop(); } catch (e) {} }); this.nodes = []; if (this.el) { this.el.pause(); } if (this.stream) this.stream.getTracks().forEach(t => t.stop()); this.src = null; this.el = null; this.stream = null; this.name = ''; },
  async mic() { this.ensure(); this.stop(); this.stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false } }); this.src = this.ctx.createMediaStreamSource(this.stream); this.src.connect(this.an); this.name = 'MICROFONE / ENTRADA DE LINHA'; },
  file(f) { this.ensure(); this.stop(); const el = new Audio(); el.src = URL.createObjectURL(f); el.loop = true; el.crossOrigin = 'anonymous'; this.el = el; this.src = this.ctx.createMediaElementSource(el); this.src.connect(this.an); this.an.connect(this.ctx.destination); el.play().catch(() => {}); this.name = f.name; },
  /* fonte interna (kick + chimbal + lead no BPM do projeto): confere a reatividade sem microfone nem arquivo, também no Artifact */
  test() {
    this.ensure(); this.stop(); const ctx = this.ctx, bus = ctx.createGain(); bus.gain.value = 0.9; bus.connect(this.an);
    const mon = ctx.createGain(); mon.gain.value = 0.12; this.an.connect(mon); mon.connect(ctx.destination); this.nodes.push(mon);
    const nb = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.1), ctx.sampleRate), nd = nb.getChannelData(0); for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
    const spb = () => 60 / P.time.bpm; let nxt = ctx.currentTime + 0.05, n = 0;
    const kick = at => { const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(130, at); o.frequency.exponentialRampToValueAtTime(42, at + 0.14); g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(1, at + 0.005); g.gain.exponentialRampToValueAtTime(0.001, at + 0.38); o.connect(g); g.connect(bus); o.start(at); o.stop(at + 0.4); };
    const hat = (at, v) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(), g = ctx.createGain(); s.buffer = nb; f.type = 'highpass'; f.frequency.value = 7000; g.gain.setValueAtTime(v, at); g.gain.exponentialRampToValueAtTime(0.001, at + 0.06); s.connect(f); f.connect(g); g.connect(bus); s.start(at); };
    const lead = (at, fr) => { const o = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain(); o.type = 'sawtooth'; o.frequency.value = fr; f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 2; g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(0.35, at + 0.01); g.gain.exponentialRampToValueAtTime(0.001, at + 0.22); o.connect(f); f.connect(g); g.connect(bus); o.start(at); o.stop(at + 0.25); };
    const sched = () => { while (nxt < ctx.currentTime + 0.6) { const b = spb(); if (n % 2 === 0) kick(nxt); hat(nxt + b / 2, n % 2 ? 0.5 : 0.3); if (n % 4 === 2) lead(nxt, [220, 261.6, 329.6, 392][(n >> 2) % 4]); nxt += b; n++; } };
    sched(); this.timer = setInterval(sched, 120); this.src = bus; this.nodes.push(bus); this.name = 'FONTE DE TESTE · kick + chimbal + lead';
  },
  update() {
    if (!this.an || !this.src) { this.bass = this.mid = this.high = this.rms = this.hit = this.flux = this.onset = this.kick = 0; return; }
    this.an.getByteFrequencyData(this.fd); this.an.getByteTimeDomainData(this.td);
    const hz = this.ctx.sampleRate / this.an.fftSize, band = (a, b) => { let s = 0, n = 0; for (let i = Math.max(1, Math.floor(a / hz)); i <= Math.min(this.fd.length - 1, Math.ceil(b / hz)); i++) { s += this.fd[i]; n++; } return n ? s / n / 255 : 0; };
    const sm = clamp(P.audio.smooth, 0, 0.98);
    /* ataque rápido, queda lenta (pico retido): o impacto aparece no quadro do kick e some em ~200 ms */
    for (const [k, a, b] of [['bass', 20, 150], ['mid', 150, 2000], ['high', 2000, 12000]]) { const v = band(a, b); this.pk[k] = Math.max(v, this.pk[k] * 0.996, 0.05); const x = v / this.pk[k]; this[k] = x > this[k] ? this[k] + (x - this[k]) * (1 - sm * 0.5) : this[k] * (0.5 + sm * 0.45); }
    let s = 0; for (let i = 0; i < this.td.length; i++) { const v = (this.td[i] - 128) / 128; s += v * v; } const r = Math.min(1, Math.sqrt(s / this.td.length) * 3); this.rms = r > this.rms ? this.rms + (r - this.rms) * (1 - sm * 0.5) : this.rms * (0.5 + sm * 0.45);
    this.hit = Math.max(this.hit * 0.86, clamp((this.bass - this.pb) * 3.2, 0, 1)); this.pb = this.bass;
    { const now = performance.now(), dt = clamp((now - (this.tl || now)) / 1000, 0, 0.1); this.tl = now; this.mhit = Math.max((this.mhit || 0) * 0.86, clamp((this.mid - (this.pm || 0)) * 3.2, 0, 1)); this.pm = this.mid; this.hhit = Math.max((this.hhit || 0) * 0.86, clamp((this.high - (this.ph || 0)) * 3.2, 0, 1)); this.ph = this.high;
      this.pres = clamp((this.mid + this.high) * 0.5 / Math.max(0.15, this.bass + this.mid + this.high) * 1.6, 0, 1);
      this.bt = (this.bt || 0) + dt * 0.2 * (this.bass * 2 + this.pres + this.hit * 2); this.mt = (this.mt || 0) + dt * 0.2 * (this.mid * 2 + this.pres + this.mhit * 2); this.ht = (this.ht || 0) + dt * 0.2 * (this.high * 2 + this.pres + this.hhit * 2); this.at = (this.bt + this.mt + this.ht) / 3; }
    this.beat = this.bass > this.avg * 1.35 && this.bass > 0.3; this.avg = this.avg * 0.96 + this.bass * 0.04;
    if (!this.det) this.det = new ONSET.Detector(); const o = this.det.push(this.fd, hz, performance.now()); this.flux = o.flux; this.onset = o.onset; this.kick = o.kick; this.kickBpm = o.kickBpm; this.kickBpmK = o.kickBpmK; this.kickConf = o.kickConf;
  }
};
/* áudio sem fonte: bandas sintéticas presas ao BPM (determinísticas, fecham o loop). Todo shader usa isto quando não há fonte,
   então ele reage sempre: ao vivo com a música, no export e no preview pelo pulso do compasso. */
function pseudoAudio(F) {
  const bf = F.beatF, bp = bf - Math.floor(bf), s16 = bf * 4, sp = s16 - Math.floor(s16), hb = Math.floor(bf) % 4;
  const bass = Math.exp(-bp * 4.2) * (hb % 2 === 0 ? 1 : 0.62);
  const mid = Math.exp(-((bf * 2) % 1) * 6) * (0.45 + 0.55 * (hb === 1 || hb === 3 ? 1 : 0.4));
  const high = Math.exp(-sp * 8) * (0.35 + 0.65 * hr(Math.floor(s16), 5));
  const T = synthTimes(F);
  return { bass, mid, high, rms: 0.3 + 0.3 * bass + 0.2 * mid, hit: Math.exp(-bp * 9) * (hb === 0 ? 1 : 0.55), mhit: Math.exp(-((bf * 2) % 1) * 14) * (hb === 1 || hb === 3 ? 1 : 0.4), hhit: Math.exp(-sp * 18) * hr(Math.floor(s16), 5),
    pres: clamp(0.5 * mid + 0.5 * high + 0.2 * bass, 0, 1), bt: T.bt, mt: T.mt, ht: T.ht, at: T.at,
    kick: Math.exp(-bp * 9) * (hb % 2 === 0 ? 1 : 0.62), onset: Math.max(Math.exp(-bp * 9) * (hb === 0 ? 1 : 0.55), Math.exp(-((bf * 2) % 1) * 14) * (hb === 1 || hb === 3 ? 1 : 0.4), Math.exp(-sp * 18) * hr(Math.floor(s16), 5)),
    flux: clamp(0.6 * Math.exp(-bp * 6) + 0.25 * Math.exp(-((bf * 2) % 1) * 8) + 0.25 * Math.exp(-sp * 10) * hr(Math.floor(s16), 5), 0, 1) };
}
/* ondas do BPM (tipo Synesthesia BPMSin/Tri): determinísticas, fecham o loop porque o loop tem compassos inteiros */
function bpmWaves(F) {
  const bf = F.beatF, tri = x => { x -= Math.floor(x); return 1 - Math.abs(2 * x - 1); }, bp = bf - Math.floor(bf);
  return { onbeat: Math.exp(-bp * 8), bsin: 0.5 + 0.5 * Math.sin(Math.PI * 2 * bf), bsin2: 0.5 + 0.5 * Math.sin(Math.PI * bf), bsin4: 0.5 + 0.5 * Math.sin(Math.PI * bf / 2), btri: tri(bf) };
}
/* tempo integrado sintético: integral fechada do envelope de cada banda, normalizada para valer um número inteiro (compassos) por loop.
   Use sin(uBassT*TAU) ou fract(uBassT): move mais rápido nos golpes e fecha o loop. Com áudio ao vivo o tempo integra de verdade (não fecha). */
let _ST = { key: '', cum: null };
function synthTimes(F) {
  const nb = Math.max(1, P.time.bars) * 4, key = nb + '|' + SEED;
  if (_ST.key !== key) {
    const base = 0.35, c = { b: [0], m: [0], h: [0] };
    for (let i = 0; i < nb; i++) {
      const hb = i % 4, ab = hb % 2 === 0 ? 1 : 0.62, fm = 0.45 + 0.55 * (hb === 1 || hb === 3 ? 1 : 0.4);
      c.b.push(c.b[i] + base + ab * (1 - Math.exp(-4.2)) / 4.2);
      c.m.push(c.m[i] + base + fm * (1 - Math.exp(-6)) / 6);
      let h = 0; for (let j = 0; j < 4; j++) h += 0.25 * (0.35 + 0.65 * hr(i * 4 + j, 5)) * (1 - Math.exp(-8)) / 8;
      c.h.push(c.h[i] + base + h);
    }
    _ST = { key, cum: c, nb };
  }
  const c = _ST.cum, bf = ((F.beatF % nb) + nb) % nb, i = Math.min(nb - 1, Math.floor(bf)), x = bf - i, hb = i % 4, base = 0.35;
  const part = (arr, inner) => (arr[i] + base * x + inner) / arr[nb] * (nb / 4);
  const ab = hb % 2 === 0 ? 1 : 0.62, fm = 0.45 + 0.55 * (hb === 1 || hb === 3 ? 1 : 0.4);
  const bI = ab * (1 - Math.exp(-4.2 * x)) / 4.2, hh = Math.floor(x * 2), mI = fm * 0.5 * (hh * (1 - Math.exp(-6)) + (1 - Math.exp(-6 * (x * 2 - hh)))) / 6;
  let hI = 0; for (let j = 0; j < 4; j++) { const y = Math.min(1, Math.max(0, x * 4 - j)); hI += 0.25 * (0.35 + 0.65 * hr(i * 4 + j, 5)) * (1 - Math.exp(-8 * y)) / 8; }
  const bt = part(c.b, bI), mt = part(c.m, mI), ht = part(c.h, hI);
  return { bt, mt, ht, at: (bt + mt + ht) / 3 };
}
/* modulação por parâmetro (V7): layer.mod = [{ k:'p1', src:'bass|mid|high|rms|hit|mhit|hhit|pres|kick|onset|flux|onbeat|bsin|bsin2|bsin4|btri|lfo', min, max, mode:'set|add|mul', cycles, shape:'sin|tri|saw|spring' (spring: zeta, wn, ta, depth, steps; sem limite 0..1, ver motionCurve) }]
   fonte 0..1 vira min..max. LFO usa ciclos inteiros por loop (fecha o loop). */
/* perfil de movimento (fase 2): "chute e toque", a mesma função de scripts/motion_profiles.py (curve). Pura, fecha o loop. */
function motionCurve(f, zeta, wn, ta, depth, steps) {
  f = f - Math.floor(f); ta = ta || 0; depth = depth || 0;
  if (steps > 0) f = Math.floor(f * steps) / steps;
  if (ta > 0 && f >= 1 - ta) return -depth * Math.sin(Math.PI * (f - (1 - ta)) / ta);
  const x = ta > 0 ? f / (1 - ta) : f, z = Math.min(zeta, 1);
  let h;
  if (z < 1) { const wd = wn * Math.sqrt(1 - z * z), xs = Math.atan2(wd, z * wn) / wd, pk = Math.exp(-z * wn * xs) * Math.sin(wd * xs); h = Math.exp(-z * wn * x) * Math.sin(wd * x) / pk; }
  else { const pk = Math.exp(-1) / wn; h = x * Math.exp(-wn * x) / pk; }
  const t = Math.min(1, Math.max(0, (x - 0.75) / 0.25));
  return h * (1 - t * t * (3 - 2 * t));
}
function applyMods(p, L, LF) {
  if (!Array.isArray(L.mod) || !L.mod.length) return p;
  const q = Object.assign({}, p), b = LF.bands;
  for (const m of L.mod) {
    if (!m || !m.k || !(m.k in q) || typeof q[m.k] !== 'number') continue;
    let v;
    if (m.src === 'lfo' && m.shape === 'spring') { const c = Math.max(1, Math.round(m.cycles || 1)); v = motionCurve(LF.lph * c, m.zeta == null ? 0.5 : +m.zeta, m.wn || 12, m.ta, m.depth, m.steps); const lo = m.min == null ? 0 : +m.min, hi = m.max == null ? 1 : +m.max, val = lo + v * (hi - lo); q[m.k] = m.mode === 'add' ? q[m.k] + val : m.mode === 'mul' ? q[m.k] * val : val; continue; }
    if (m.src === 'lfo' && m.shape === 'env' && Array.isArray(m.keys) && m.keys.length > 1) { const N = m.keys.length, x = LF.lph * Math.max(1, Math.round(m.cycles || 1)), u = (x - Math.floor(x)) * N, i0 = Math.floor(u) % N, f = u - Math.floor(u), s = f * f * (3 - 2 * f); v = m.keys[i0] + (m.keys[(i0 + 1) % N] - m.keys[i0]) * s; }
    else if (m.src === 'lfo') { const c = Math.max(1, Math.round(m.cycles || 1)), x = LF.lph * c; const f = x - Math.floor(x); v = LFO_X[m.shape] ? LFO_X[m.shape](f) : m.shape === 'saw' ? f : m.shape === 'tri' ? 1 - Math.abs(2 * f - 1) : 0.5 - 0.5 * Math.cos(Math.PI * 2 * x); }
    else v = b[m.src] !== undefined ? b[m.src] : 0;
    v = clamp(v, 0, 1); const lo = m.min == null ? 0 : +m.min, hi = m.max == null ? 1 : +m.max, val = lo + v * (hi - lo);
    q[m.k] = m.mode === 'add' ? q[m.k] + val : m.mode === 'mul' ? q[m.k] * val : val;
  }
  return q;
}
