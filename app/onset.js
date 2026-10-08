/* Detector de onset e de kick com histórico (fase 3): fluxo espectral + limiar adaptativo (média + k desvios do último segundo) + período refratário.
   Entrada: o espectro do AnalyserNode (Uint8Array de magnitudes), Hz por bin e o tempo em ms. Puro e testável (scripts/audio_check.mjs).
   Saídas por quadro: flux (0..1, energia de ataque geral), onset (pulso 1 que decai a cada ataque), kick (pulso só nos graves, com refratário maior) e kickBpm (mediana dos intervalos).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const ONSET = (() => {
  const clamp = (x, a, b) => x < a ? a : x > b ? b : x;
  class Detector {
    constructor(o) { this.o = Object.assign({ histMs: 1000, k: 1.5, onsetMinMs: 90, kickMinMs: 160, floor: 0.012, decayMs: 120, kickLo: 20, kickHi: 150, allLo: 40, allHi: 12000 }, o || {}); this.reset(); }
    reset() { this.prev = null; this.hist = []; this.kh = []; this.lastOn = -1e9; this.lastKick = -1e9; this.flux = 0; this.onset = 0; this.kick = 0; this.kickBpm = 0; this.kicks = []; this.peak = 0.02; this.t = null; this.pf = 0; this.pk = 0; this.sFlux = 0; }
    /* a média e o desvio do histórico (sem o valor atual) */
    static stat(h) { let s = 0; for (const e of h) s += e.v; const m = h.length ? s / h.length : 0; let q = 0; for (const e of h) q += (e.v - m) * (e.v - m); return { m, sd: h.length ? Math.sqrt(q / h.length) : 0 }; }
    push(fd, hz, tMs) {
      const o = this.o, dt = this.t == null ? 16.67 : clamp(tMs - this.t, 1, 100); this.t = tMs;
      this.onset *= Math.pow(0.5, dt / o.decayMs); this.kick *= Math.pow(0.5, dt / o.decayMs);
      const lo = Math.max(1, Math.floor(o.allLo / hz)), hi = Math.min(fd.length - 1, Math.ceil(o.allHi / hz)), klo = Math.max(1, Math.floor(o.kickLo / hz)), khi = Math.min(fd.length - 1, Math.ceil(o.kickHi / hz));
      let f = 0, fk = 0;
      if (this.prev) { for (let i = lo; i <= hi; i++) { const d = fd[i] - this.prev[i]; if (d > 0) f += d; } for (let i = klo; i <= khi; i++) { const d = fd[i] - this.prev[i]; if (d > 0) fk += d; } }
      else this.prev = new Uint8Array(fd.length);
      this.prev.set(fd);
      f = f / ((hi - lo + 1) * 255); fk = fk / (Math.max(1, khi - klo + 1) * 255);
      const trim = h => { while (h.length && tMs - h[0].t > o.histMs) h.shift(); };
      trim(this.hist); trim(this.kh);
      const sa = Detector.stat(this.hist), sk = Detector.stat(this.kh), thrA = Math.max(o.floor, sa.m + o.k * sa.sd), thrK = Math.max(o.floor * 2.5, sk.m + o.k * sk.sd);
      // ataque = o valor passou do limiar e está subindo; o período refratário impede contar o mesmo golpe duas vezes
      if (f > thrA && f > this.pf && tMs - this.lastOn >= o.onsetMinMs) { this.onset = clamp(0.5 + (f - thrA) / Math.max(thrA, o.floor) * 0.5, 0.5, 1); this.lastOn = tMs; }
      if (fk > thrK && fk > this.pk && tMs - this.lastKick >= o.kickMinMs) {
        this.kick = clamp(0.5 + (fk - thrK) / Math.max(thrK, o.floor) * 0.5, 0.5, 1);
        if (this.lastKick > 0) { const ioi = tMs - this.lastKick; if (ioi < 2000) { this.kicks.push(ioi); if (this.kicks.length > 8) this.kicks.shift(); } else this.kicks.length = 0; }
        this.lastKick = tMs;
        if (this.kicks.length >= 3) { const s = this.kicks.slice().sort((a, b) => a - b), med = s[s.length >> 1]; let bpm = 60000 / med; while (bpm < 70) bpm *= 2; while (bpm > 190) bpm /= 2; this.kickBpm = bpm; }
      }
      this.pf = f; this.pk = fk; this.hist.push({ t: tMs, v: f }); this.kh.push({ t: tMs, v: fk });
      this.peak = Math.max(f, this.peak * Math.pow(0.5, dt / 3000), 0.02); this.sFlux = Math.max(f / this.peak, this.sFlux * Math.pow(0.5, dt / 150)); this.flux = clamp(this.sFlux, 0, 1);
      return { flux: this.flux, onset: this.onset, kick: this.kick, kickBpm: this.kickBpm };
    }
  }
  return { Detector };
})();
