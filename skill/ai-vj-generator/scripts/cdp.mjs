// Mínimo cliente do DevTools Protocol para dirigir o motor num Chrome/Edge headless, sem dependências.
//   import { openPage } from './cdp.mjs';
//   const page = await openPage('projeto.html');          // abre e espera window.AIVJ
//   const v = await page.evaluate('AIVJ.loopFrames()');   // avalia JS na página (aguarda Promises) e devolve o valor
//   await page.close();
// Precisa de Node 22+ (WebSocket global). Sai com código 3 se não houver navegador, como contact_sheet.mjs.
import { spawn } from 'node:child_process';
import { existsSync, mkdtempSync, rmSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { tmpdir } from 'node:os';

const sleep = ms => new Promise(r => setTimeout(r, ms));

export function findChrome(explicit) {
  const c = [explicit, process.env.CHROME_PATH,
    'C:/Program Files/Google/Chrome/Application/chrome.exe', 'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', 'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser', '/usr/bin/microsoft-edge'].filter(Boolean);
  return c.find(p => existsSync(p));
}

export async function openPage(file, { chrome, width = 1400, height = 900, waitFor = '!!(window.AIVJ && window.AIVJ.renderFrame)', url } = {}) {
  const exe = findChrome(chrome);
  if (!exe) { console.error('Nenhum Chrome/Edge encontrado. Passe --chrome <caminho> ou defina CHROME_PATH.'); process.exit(3); }
  if (typeof WebSocket === 'undefined') { console.error('Este script precisa de Node 22+ (WebSocket global).'); process.exit(3); }
  const port = 9300 + Math.floor(Math.random() * 600), profile = mkdtempSync(join(tmpdir(), 'aivj-cdp-'));
  const proc = spawn(exe, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--allow-file-access-from-files', '--no-first-run', '--no-default-browser-check',
    `--user-data-dir=${profile}`, `--remote-debugging-port=${port}`, `--window-size=${width},${height}`, url || pathToFileURL(resolve(file)).href], { stdio: 'ignore' });
  let closed = false;
  const close = async () => { if (closed) return; closed = true; try { proc.kill(); } catch {} await sleep(400); try { rmSync(profile, { recursive: true, force: true }); } catch {} };
  process.on('exit', () => { try { proc.kill(); } catch {} });
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { await sleep(250); try { target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find(t => t.type === 'page'); } catch {} }
  if (!target) { await close(); console.error('Não consegui falar com o navegador (DevTools).'); process.exit(3); }
  const ws = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.onopen = res; ws.onerror = () => rej(new Error('websocket')); });
  let id = 0; const wait = new Map(); const dialogs = [];
  ws.onmessage = e => {
    const m = JSON.parse(e.data);
    if (m.method === 'Page.javascriptDialogOpening') { dialogs.push(m.params.message); ws.send(JSON.stringify({ id: ++id, method: 'Page.handleJavaScriptDialog', params: { accept: true } })); }
    if (m.id && wait.has(m.id)) { wait.get(m.id)(m); wait.delete(m.id); }
  };
  const send = (method, params = {}) => new Promise(res => { const i = ++id; wait.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
  await send('Page.enable');
  const evaluate = async expression => {
    const m = await send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true });
    if (m.error) throw new Error(m.error.message);
    if (m.result.exceptionDetails) throw new Error(m.result.exceptionDetails.exception?.description || m.result.exceptionDetails.text || 'erro na página');
    return m.result.result.value;
  };
  for (let i = 0; i < 80; i++) { if (await evaluate(waitFor).catch(() => false)) break; await sleep(250); }
  await sleep(800);
  return { evaluate, close, dialogs, send };
}
