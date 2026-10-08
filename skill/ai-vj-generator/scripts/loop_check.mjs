#!/usr/bin/env node
// Verifica se cada composição fecha o loop, camada por camada, sem abrir a interface.
//
//   node loop_check.mjs projeto.html [--scale 0.2] [--chrome caminho] [--json]
//
// Como funciona: abre o HTML num Chrome/Edge headless, liga o DevTools Protocol e usa o gancho de teste do motor
// (AIVJ.renderFrame) para renderizar quadros determinísticos. Para cada composição e para cada camada ligada
// (as outras são desligadas por um instante) mede:
//   step    = diferença média entre quadros vizinhos em 8 pontos do loop (o "passo normal")
//   barStep = diferença média nos inícios de compasso internos (mesmo golpe de grave e mesmos eventos da emenda)
//   seam    = diferença entre o último quadro e o primeiro (a emenda)
// O loop fecha quando seam <= max(2 * barStep, 2.5 * step, 0.004). Camadas estáticas (step ~ 0) passam se seam ~ 0.
// Camadas guiadas por compasso (barT) podem ter um evento legítimo na emenda; o relatório mostra os números e o
// veredito automático é só um guia: olhe o quadro antes de reprovar.
//
// Sem dependências: usa o Node (WebSocket global, Node 22+) e o Chrome ou Edge já instalado.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const pos = argv.filter((a, i) => !a.startsWith('--') && !['--scale', '--chrome'].includes(argv[i - 1]));
if (!pos[0]) { console.error('uso: node loop_check.mjs projeto.html [--scale 0.2] [--chrome caminho] [--json]'); process.exit(2); }
const html = resolve(pos[0]), scale = +opt('--scale', 0.2), asJson = argv.includes('--json');

const CANDIDATES = [opt('--chrome'), process.env.CHROME_PATH,
  'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'].filter(Boolean);
const chrome = CANDIDATES.find(p => existsSync(p));
if (!chrome) { console.error('Nenhum Chrome/Edge encontrado. Passe --chrome <caminho> ou defina CHROME_PATH.'); process.exit(3); }
if (typeof WebSocket === 'undefined') { console.error('Este script precisa de Node 22+ (WebSocket global).'); process.exit(3); }

const port = 9300 + Math.floor(Math.random() * 600);
const profile = mkdtempSync(join(tmpdir(), 'aivj-loop-'));
const proc = spawn(chrome, ['--headless=new', ...(process.getuid?.() === 0 ? ['--no-sandbox', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] : []), '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run',
  '--no-default-browser-check', `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, '--window-size=1400,900', pathToFileURL(html).href], { stdio: 'ignore' });
const cleanup = () => { try { proc.kill(); } catch {} setTimeout(() => { try { rmSync(profile, { recursive: true, force: true }); } catch {} }, 500); };
process.on('exit', cleanup);

const sleep = ms => new Promise(r => setTimeout(r, ms));
let target = null;
for (let i = 0; i < 60 && !target; i++) {
  await sleep(250);
  try { const list = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json(); target = list.find(t => t.type === 'page'); } catch {}
}
if (!target) { console.error('Não consegui falar com o navegador (DevTools).'); cleanup(); process.exit(3); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket')); });
let id = 0; const wait = new Map();
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); } };
const evaluate = expression => new Promise((res, rej) => {
  const i = ++id; wait.set(i, m => m.error ? rej(new Error(m.error.message)) : m.result.exceptionDetails ? rej(new Error(m.result.exceptionDetails.exception?.description || 'erro na página')) : res(m.result.result.value));
  ws.send(JSON.stringify({ id: i, method: 'Runtime.evaluate', params: { expression, awaitPromise: true, returnByValue: true } }));
});

for (let i = 0; i < 80; i++) { if (await evaluate('!!(window.AIVJ && window.AIVJ.renderFrame)').catch(() => false)) break; await sleep(250); }
await sleep(800); // fontes e ativos

const PAGE = `(async () => {
  const A = window.AIVJ, P = A.project, scale = ${scale}; A.state.codeAllow = true;
  const F = A.loopFrames();
  const d = (a, b) => { let s = 0; const x = a.data, y = b.data; for (let i = 0; i < x.length; i += 4) s += Math.abs(x[i]-y[i]) + Math.abs(x[i+1]-y[i+1]) + Math.abs(x[i+2]-y[i+2]) + Math.abs(x[i+3]-y[i+3]); return s / (x.length * 255); };
  const probe = ci => {
    const pts = [0.07, 0.19, 0.31, 0.43, 0.55, 0.67, 0.79, 0.91].map(u => Math.floor(u * F));
    let step = 0; for (const k of pts) step += d(A.renderFrame(ci, k, scale, true), A.renderFrame(ci, k + 1, scale, true)); step /= pts.length;
    /* inicios de compasso internos: carregam o mesmo golpe de grave e o mesmo evento da emenda, então são a comparação justa */
    const bars = P.time.bars, bs = []; for (let j = 1; j < bars; j++) bs.push(Math.round(F * j / bars));
    let bstep = 0; for (const k of bs) bstep += d(A.renderFrame(ci, k - 1, scale, true), A.renderFrame(ci, k, scale, true)); bstep = bs.length ? bstep / bs.length : step;
    const seam = d(A.renderFrame(ci, F - 1, scale, true), A.renderFrame(ci, F, scale, true));
    return { step: +step.toFixed(5), barStep: +bstep.toFixed(5), seam: +seam.toFixed(5), ok: seam <= Math.max(2 * bstep, 2.5 * step, 0.004) };
  };
  const out = { loopFrames: F, comps: [] };
  for (let ci = 0; ci < P.compositions.length; ci++) {
    const comp = P.compositions[ci], on = comp.layers.map(l => l.on);
    const whole = probe(ci), layers = [];
    comp.layers.forEach((L, i) => { if (!on[i] || L.type === 'bg') return;
      comp.layers.forEach((M, j) => { M.on = (j === i); });
      layers.push(Object.assign({ i, name: L.name, type: L.type }, probe(ci)));
    });
    comp.layers.forEach((M, j) => { M.on = on[j]; });
    out.comps.push({ i: ci, name: comp.name, whole, layers });
  }
  return JSON.stringify(out);
})()`;
let res;
try { res = JSON.parse(await evaluate(PAGE)); } catch (e) { console.error('Falha ao medir: ' + e.message); cleanup(); process.exit(3); }
ws.close(); cleanup();

if (asJson) console.log(JSON.stringify(res, null, 2));
else {
  console.log(`loop = ${res.loopFrames} quadros · escala ${scale}\n`);
  for (const c of res.comps) {
    console.log(`[${c.i + 1}] ${c.name}: composição ${c.whole.ok ? 'FECHA' : 'EMENDA VISÍVEL'} (passo ${c.whole.step}, compasso ${c.whole.barStep}, emenda ${c.whole.seam})`);
    for (const l of c.layers) console.log(`     ${l.ok ? 'ok   ' : 'EMENDA'} ${String(l.name).padEnd(34)} ${l.type.padEnd(10)} passo ${String(l.step).padEnd(8)} compasso ${String(l.barStep).padEnd(8)} emenda ${l.seam}`);
  }
}
process.exit(res.comps.some(c => !c.whole.ok) ? 1 : 0);
