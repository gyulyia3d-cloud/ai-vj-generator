#!/usr/bin/env node
// Teste do export sem rede (fase 16): o motor não pode depender de CDN para exportar. O JSZip vai embutido (app/vendor/jszip.min.js, MIT/GPLv3, v3.10.1).
// 1) o HTML não carrega script de fora; 2) a página não faz nenhuma requisição http(s); 3) JSZip existe e é o embutido; 4) o export em ZIP roda de ponta a ponta
// e o verificador independente confere o ZIP baixado; 5) controle negativo: se o JSZip sumir, o export recusa com mensagem clara (não trava nem finge).
//   node export_offline_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage, findChrome } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = join(HERE, '..', '..', '..');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
if (!findChrome(chrome)) { console.log('  --   sem navegador: export sem rede pulado'); process.exit(3); }
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const tmp = mkdtempSync(join(tmpdir(), 'aivj-off-'));

const engine = join(ROOT, 'skill', 'ai-vj-generator', 'assets', 'engine.html'), html = readFileSync(engine, 'utf8');
const ext = [...html.matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]).filter(u => /^(https?:)?\/\//i.test(u));
check(ext.length === 0, 'o HTML do motor não carrega nenhum script de fora (sem CDN)', ext.join(', '));
const extCss = [...html.matchAll(/<link\b[^>]*\bhref\s*=\s*["']([^"']+)["']/gi)].map(m => m[1]).filter(u => /^(https?:)?\/\//i.test(u) && !/fonts\.(googleapis|gstatic)/.test(u));
check(extCss.length === 0, 'nenhuma folha de estilo de fora, além das fontes', extCss.join(', '));

const proj = join(tmp, 'p.aivj.json');
writeFileSync(proj, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'off', seed: 5, meta: { name: 'Offline', brief: 'x', lang: 'pt' }, canvas: { w: 160, h: 90, fps: 30 }, time: { bpm: 120, bars: 1, loop: true, seamless: true },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x', on: true, opacity: 1 }, { type: 'shape', name: 'S', role: 'x', on: true, opacity: 1, p: {} }] }] }));
const page = await openPage(engine, { chrome, width: 1000, height: 700, waitFor: '!!(window.AIVJ && window.AIVJ.expRun)' });
const E = s => page.evaluate(s);
try {
  const net = JSON.parse(await E(`JSON.stringify(performance.getEntriesByType('resource').map(r => r.name).filter(n => /^https?:/i.test(n) && !/fonts[.](googleapis|gstatic)[.]com/.test(n)))`));
  check(net.length === 0, 'a página carregou sem requisição http(s) além das fontes web (que têm fallback do sistema)', net.join(', '));
  const z = JSON.parse(await E(`(async () => { if (typeof JSZip === 'undefined') return JSON.stringify({ has: false }); const zz = new JSZip(); zz.file('a.txt', 'oi'); const b = await zz.generateAsync({ type: 'uint8array', compression: 'STORE' }); const back = await JSZip.loadAsync(b); return JSON.stringify({ has: true, v: JSZip.version, roundtrip: await back.file('a.txt').async('string') }); })()`));
  check(z.has && z.v === '3.10.1' && z.roundtrip === 'oi', 'JSZip 3.10.1 está embutido e grava e lê um ZIP', JSON.stringify(z));

  // export de ponta a ponta, o verificador independente confere o ZIP
  await E(`AIVJ.importJson(${JSON.stringify(readFileSync(proj, 'utf8'))}); window.__dl = []; HTMLAnchorElement.prototype.click = function () { const a = this; if (a.download) window.__dl.push(fetch(a.href).then(r => r.arrayBuffer()).then(b => ({ name: a.download, buf: b }))); }; AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = false; 0`);
  await E(`(async () => { const i = document.createElement('p'), b = document.createElement('div'); b.innerHTML = '<i></i>'; await AIVJ.expRun(i, b); window.__info = i.textContent; })()`);
  for (let k = 0; k < 120; k++) { if (await E(`window.__dl.length > 0`)) break; await new Promise(r => setTimeout(r, 250)); }
  const got = JSON.parse(await E(`(async () => { const fs = await Promise.all(window.__dl), o = []; for (const f of fs) { const u = new Uint8Array(f.buf); let s = ''; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); o.push({ name: f.name, b64: btoa(s) }); } return JSON.stringify({ o, info: window.__info }); })()`));
  check(got.o.length >= 1, 'o export em ZIP termina e baixa o arquivo (sem CDN)', got.info);
  const files = got.o.map(f => { const q = join(tmp, f.name); writeFileSync(q, Buffer.from(f.b64, 'base64')); return q; });
  let v; try { v = { code: 0, out: execFileSync(process.execPath, [join(ROOT, 'scripts', 'verify_export.mjs'), ...files], { stdio: 'pipe' }).toString() }; } catch (e) { v = { code: e.status, out: String(e.stdout) }; }
  check(v.code === 0 && /SHA-256 de todos os quadros bate/.test(v.out), 'o verificador independente confere o ZIP gerado sem rede', v.out.slice(-300));

  // controle negativo: sem JSZip o export avisa e não trava
  await E(`window.__JS = JSZip; window.JSZip = undefined; 0`);
  const msg = await E(`(async () => { const i = document.createElement('p'), b = document.createElement('div'); b.innerHTML = '<i></i>'; await AIVJ.expRun(i, b); return i.textContent; })()`);
  await E(`window.JSZip = window.__JS; 0`);
  check(/ZIP/.test(msg) && /não carregou|faltando|indispon/i.test(msg), 'controle negativo: sem o JSZip o export recusa com mensagem clara em vez de travar', msg);
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nexport sem rede ok.');
process.exit(fail ? 1 : 0);
