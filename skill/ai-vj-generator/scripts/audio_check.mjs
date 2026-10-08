#!/usr/bin/env node
// Teste do áudio da fase 3: o detector de onset e de kick (fluxo espectral, limiar adaptativo, refratário, histórico) contra espectros sintéticos com
// verdade conhecida, e a integração no motor (fontes kick/onset/flux em layer.mod e como banda da camada, sem áudio ao vivo = bandas sintéticas do BPM).
//   node audio_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-audio-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

/* ---- 1) detector puro, com espectros sintéticos ---- */
const src = readFileSync(join(HERE, '..', '..', '..', 'app', 'onset.js'), 'utf8');
const { Detector } = new Function(src + '; return ONSET;')();
const N = 1024, HZ = 21.5, FPS = 60, DT = 1000 / FPS;
let seed = 12345; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296;
const bin = hz => Math.round(hz / HZ);
/* um sintetizador de espectro: ruído de fundo, kicks (graves) e chimbais (agudos) em instantes dados (ms), com decaimento */
function render(ms, { kicks = [], hats = [], gain = 1, floor = 6, hold = 4 }) {
  const out = [], frames = Math.round(ms / DT);
  for (let f = 0; f < frames; f++) {
    const t = f * DT, fd = new Uint8Array(N);
    for (let i = 1; i < N; i++) fd[i] = floor + rnd() * 3;
    for (const k of kicks) { const a = (t - k) / DT; if (a >= 0 && a < 14) { const v = (a < hold ? 230 : 230 * Math.exp(-(a - hold) / 3)) * gain; for (let i = bin(30); i <= bin(120); i++) fd[i] = Math.min(255, Math.max(fd[i], v)); } }
    for (const h of hats) { const a = (t - h) / DT; if (a >= 0 && a < 6) { const v = 150 * Math.exp(-a / 1.5) * gain; for (let i = bin(7000); i <= bin(11000); i++) fd[i] = Math.min(255, Math.max(fd[i], v)); } }
    out.push([fd, t]);
  }
  return out;
}
function run(spec, opt) {
  const d = new Detector(opt), kicks = [], onsets = []; let bpm = 0, fluxMax = 0, fluxIdle = 0;
  for (const [fd, t] of spec) { const was = [d.kick, d.onset], r = d.push(fd, HZ, t); if (r.kick > was[0] + 0.3) kicks.push(t); if (r.onset > was[1] + 0.3) onsets.push(t); bpm = r.kickBpm || bpm; fluxMax = Math.max(fluxMax, r.flux); }
  return { kicks, onsets, bpm, fluxMax };
}
const near = (list, t, tol = 3 * DT) => list.some(x => x >= t - 1 && x <= t + tol);
const KT = Array.from({ length: 16 }, (_, i) => 500 + i * 500);   // 120 BPM, 16 kicks
const HT = Array.from({ length: 32 }, (_, i) => 750 + i * 250);   // chimbais entre os kicks
let r = run(render(9000, { kicks: KT, hats: HT }));
const hit = KT.filter(t => near(r.kicks, t)).length;
check(hit >= 15, `kick: ${hit} de 16 kicks a 120 BPM detectados no quadro certo (até 3 quadros de atraso)`, JSON.stringify(r.kicks.slice(0, 20)));
const falseKicks = r.kicks.filter(t => !KT.some(k => t >= k - 1 && t <= k + 3 * DT)).length;
check(falseKicks === 0, 'kick: os chimbais (só agudos) não geram kick falso', falseKicks + ' falsos');
check(Math.abs(r.bpm - 120) < 3, `kick: o BPM estimado pelos intervalos é ${r.bpm.toFixed(1)} (esperado 120)`, String(r.bpm));
const onHit = [...KT, ...HT].filter(t => near(r.onsets, t)).length;
check(onHit >= 0.9 * (KT.length + HT.length), `onset: ${onHit} de ${KT.length + HT.length} ataques (kick + chimbal) detectados`, JSON.stringify({ n: r.onsets.length }));
r = run(render(6000, {}));
check(r.kicks.length === 0 && r.onsets.length === 0, 'silêncio com ruído de fundo: nenhum kick nem onset (sem falso positivo)', JSON.stringify({ k: r.kicks.length, o: r.onsets.length }));
const dbl = run(render(3000, { kicks: [1000, 1060, 1120] }));
check(dbl.kicks.length === 1, 'refratário: três golpes em 120 ms contam uma vez só', JSON.stringify(dbl.kicks));
const quiet = run(render(9000, { kicks: KT, hats: HT, gain: 0.35 }));
check(KT.filter(t => near(quiet.kicks, t)).length >= 14, 'adaptativo: a 35% do volume os kicks ainda são pegos (o limiar acompanha o histórico)', JSON.stringify(quiet.kicks.length));
const mixed = run([...render(4000, { kicks: KT.slice(0, 7), gain: 1 }), ...render(4000, { kicks: KT.slice(0, 7).map(t => t), gain: 0.35 }).map(([fd, t]) => [fd, t + 4000])]);
check(mixed.kicks.length >= 12, 'volume que cai pela metade no meio da música: os dois trechos têm kicks detectados', JSON.stringify(mixed.kicks.length));
check(r.fluxMax <= 1 && run(render(2000, { kicks: [500, 1000] })).fluxMax > 0.5, 'flux fica entre 0 e 1 e sobe nos ataques', 'fluxo fora da faixa');

/* ---- 2) motor: fontes novas em layer.mod, banda por camada, sem áudio ao vivo ---- */
const project = { schema: 'ai-vj-generator/2', id: 'a', seed: 3, meta: { name: 'A', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30 }, time: { bpm: 120, bars: 2 }, audio: { reactive: true, strategy: 'rhythmic' },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x', on: true, opacity: 1 }, { type: 'shape', name: 'FORMA', role: 'x', on: true, opacity: 1, blend: 'normal', p: { kind: 'circle', size: 100, audio: 1, band: 'kick' }, mod: [{ k: 'size', src: 'kick', min: 100, max: 300, mode: 'set' }] }] }] };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
let v = ''; try { v = execFileSync('python', [join(HERE, 'validate_project.py'), json], { encoding: 'utf8' }); } catch (e) { v = String(e.stdout); }
check(!/ERROR.*mod\[0\]\.src/.test(v) && !/band.*not one of/.test(v), 'o validador aceita src kick/onset/flux e a banda kick', v.split('\n').filter(l => /^ERROR/.test(l)).slice(0, 2).join(' | '));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1000, height: 700 });
try {
  const m = JSON.parse(await page.evaluate(`(() => { const P = AIVJ.project, L = P.compositions[0].layers[1], LF = AIVJ.loopFrames(), fpb = P.canvas.fps * 60 / P.time.bpm, sizes = [], bands = [];
    for (let n = 0; n < Math.round(fpb * 4); n++) { const F = AIVJ.frameAt(n, P.compositions[0]), lf = AIVJ.layerFrame(F, AIVJ.pm(L), 1, 2, 'shape'), q = AIVJ.applyMods(AIVJ.pm(L), L, lf); sizes.push(q.size); const ls = AIVJ.layerFrame(F, AIVJ.pm(L), 1, 2, 'shader'); bands.push({ kick: lf.bands.kick, onset: lf.bands.onset, flux: lf.bands.flux, a: ls.a }); }
    return JSON.stringify({ sizes, bands, fpb }); })()`));
  const mx = Math.max(...m.sizes), mn = Math.min(...m.sizes), k0 = m.bands[0].kick, kMid = m.bands[Math.round(m.fpb / 2)].kick;
  check(mx > 250 && mn < 160 && m.sizes[0] > 250, `layer.mod com src kick: o tamanho salta no golpe (${m.sizes[0].toFixed(0)} px) e cai entre golpes (${mn.toFixed(0)} px)`, JSON.stringify(m.sizes.slice(0, 8)));
  check(k0 > 0.9 && kMid < k0 * 0.5 && m.bands.every(b => b.flux >= 0 && b.flux <= 1.5 && b.onset >= 0), 'sem áudio ao vivo: kick, onset e flux vêm das bandas sintéticas do BPM, dentro da faixa', JSON.stringify(m.bands[0]));
  check(m.bands[0].a > 0.8 && m.bands[Math.round(m.fpb / 2)].a < m.bands[0].a * 0.5, 'a banda kick escolhida na camada (p.band, aqui num shader) também reage ao golpe', JSON.stringify([m.bands[0].a, m.bands[Math.round(m.fpb / 2)].a]));
  // o analisador ao vivo do motor (AUD.update) com um AnalyserNode falso e relógio controlado: a mesma lógica que roda com microfone ou arquivo
  const live = JSON.parse(await page.evaluate(`(() => { const A = AIVJ.audio, realNow = performance.now; let t = 0, seed = 7; const rnd = () => (seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296; performance.now = () => t;
    const kicks = Array.from({ length: 12 }, (_, i) => 500 + i * 500), spec = new Uint8Array(1024);
    A.ctx = { sampleRate: 44100 }; A.an = { fftSize: 2048, getByteFrequencyData(d) { d.set(spec); }, getByteTimeDomainData(d) { d.fill(128); } }; A.src = {}; A.fd = new Uint8Array(1024); A.td = new Uint8Array(2048); A.det = null;
    const seen = [], hz = 44100 / 2048; let bpm = 0;
    for (let f = 0; f < 480; f++) { t = f * 1000 / 60; for (let i = 1; i < 1024; i++) spec[i] = 6 + rnd() * 3; for (const k of kicks) { const a = (t - k) / (1000 / 60); if (a >= 0 && a < 14) { const v = a < 4 ? 230 : 230 * Math.exp(-(a - 4) / 3); for (let i = Math.round(30 / hz); i <= Math.round(120 / hz); i++) spec[i] = Math.max(spec[i], v); } }
      const before = A.kick; A.update(); if (A.kick > before + 0.3) seen.push(Math.round(t)); bpm = A.kickBpm || bpm; }
    performance.now = realNow; A.an = null; A.src = null; A.det = null;
    return JSON.stringify({ seen, bpm, matched: kicks.filter(k => seen.some(s => s >= k && s <= k + 60)).length }); })()`));
  check(live.matched >= 11 && live.seen.length <= 13 && Math.abs(live.bpm - 120) < 3, `AUD.update (analisador ao vivo simulado): ${live.matched} de 12 kicks, ${live.seen.length} disparos, BPM ${live.bpm.toFixed(1)}`, JSON.stringify(live));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
/* ---- Kalman do andamento: intervalos ruidosos, kicks perdidos, kick duplo e mudança de andamento ---- */
{
  const { TempoKalman } = new Function(src + '; return ONSET;')(), tk = new TempoKalman();
  let sd = 7; const rn = () => (sd = (sd * 1664525 + 1013904223) >>> 0) / 4294967296;
  const run = (bpm, n, jit, miss = 0) => { for (let i = 0; i < n; i++) { let ioi = 60000 / bpm + (rn() - 0.5) * 2 * jit; if (miss && i % miss === miss - 1) ioi *= 2; tk.update(ioi); } };
  run(120, 24, 15); check(Math.abs(tk.bpm - 120) < 1.5 && tk.conf > 0.5, `Kalman: 120 BPM com jitter de ±15 ms -> ${tk.bpm.toFixed(1)} (confiança ${tk.conf.toFixed(2)})`, tk.bpm + ' ' + tk.conf);
  run(120, 24, 15, 6); check(Math.abs(tk.bpm - 120) < 2, `Kalman: kick perdido (intervalo dobrado) não derruba a estimativa (${tk.bpm.toFixed(1)})`, String(tk.bpm));
  tk.update(250); tk.update(500); tk.update(500); check(Math.abs(tk.bpm - 120) < 2, `Kalman: um intervalo de metade (kick duplo) é dobrado de volta (${tk.bpm.toFixed(1)})`, String(tk.bpm));
  run(128, 14, 15); check(Math.abs(tk.bpm - 128) < 2.5, `Kalman: o andamento muda para 128 e ele acompanha em 14 kicks (${tk.bpm.toFixed(1)})`, String(tk.bpm));
  const t2 = new TempoKalman(); for (let i = 0; i < 40; i++) t2.update(60000 / 140 + (rn() - 0.5) * 120); check(Math.abs(t2.bpm - 140) < 6, `Kalman: jitter grande (±60 ms) ainda converge perto de 140 (${t2.bpm.toFixed(1)})`, String(t2.bpm));
  const med = a => { const q = a.slice().sort((x, y) => x - y); return q[q.length >> 1]; };
  let ek = 0, em = 0; const ioi = []; const t3 = new TempoKalman(); for (let i = 0; i < 60; i++) { const v = 60000 / 124 + (rn() - 0.5) * 70; ioi.push(v); t3.update(v); if (i >= 20) { ek += Math.abs(t3.bpm - 124); em += Math.abs(60000 / med(ioi.slice(-8)) - 124); } }
  check(ek <= em * 1.15, `Kalman erra tanto quanto a mediana (ou menos): ${(ek / 40).toFixed(2)} contra ${(em / 40).toFixed(2)} BPM`, `${ek} ${em}`);
}
/* ---- formas de atenção do LFO: fecham o loop (f(0) = f(1)), ficam em 0..1 e se movem ---- */
{
  const LFO_X = new Function(readFileSync(join(HERE, '..', '..', '..', 'app', 'mod-ui.js'), 'utf8') + '; return LFO_X;')();
  for (const [nm, f] of Object.entries(LFO_X)) {
    let lo = 1, hi = 0; for (let k = 0; k <= 200; k++) { const v = f(k / 200); lo = Math.min(lo, v); hi = Math.max(hi, v); }
    check(Math.abs(f(0) - f(1)) < 0.01 && lo >= 0 && hi <= 1 && hi - lo > 0.3, `LFO ${nm}: f(0)=f(1) (${f(0).toFixed(3)} / ${f(1).toFixed(3)}), em 0..1 (${lo.toFixed(2)}..${hi.toFixed(2)}), tem movimento`, `${f(0)} ${f(1)} ${lo} ${hi}`);
  }
}
console.log(fail ? `\n${fail} falha(s).` : '\náudio ok.');
process.exit(fail ? 1 : 0);
