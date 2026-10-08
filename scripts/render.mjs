#!/usr/bin/env node
// Render por linha de comando, sem abrir a interface: MP4 (H.264) ou sequência PNG, quadro a quadro (não é gravação de tela).
//   node scripts/render.mjs <projeto.aivj.json> --out <pasta> [--format mp4|png] [--comp N|all] [--scale 1] [--fps 30] [--bars N] [--start 0] [--end -1] [--quality high|mid|low] [--alpha] [--region N]
// Usa o Chrome/Edge instalado (AIVJ_GPU=1 liga a placa de vídeo; sem isso o Chrome roda por software, mais lento).
// MP4: codificado no navegador por WebCodecs (H.264, sem alpha). PNG: um arquivo por quadro; --alpha mantém a transparência.
// Para ProRes, HAP ou DXV a partir da sequência PNG: ffmpeg -framerate 30 -i %06d.png -c:v prores_ks -profile:v 4 -pix_fmt yuva444p10le saida.mov
import { execFileSync } from 'node:child_process';
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, dirname, resolve, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from '../skill/ai-vj-generator/scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SK = join(ROOT, 'skill', 'ai-vj-generator');
const a = process.argv.slice(2), proj = a.find((x, i) => !x.startsWith('--') && !(i > 0 && a[i - 1].startsWith('--') && !['--alpha'].includes(a[i - 1])));
const opt = (k, d) => a.includes(k) ? a[a.indexOf(k) + 1] : d;
if (!proj || !a.includes('--out')) { console.error('uso: node scripts/render.mjs <projeto.aivj.json> --out <pasta> [--format mp4|png] [--comp N|all] [--scale 1] [--fps 30] [--bars N] [--start 0] [--end -1] [--quality mid] [--alpha]'); process.exit(2); }
const format = opt('--format', 'mp4'), out = resolve(opt('--out')), scale = Number(opt('--scale', 1)), fps = opt('--fps') ? Number(opt('--fps')) : null, bars = opt('--bars') ? Number(opt('--bars')) : null;
const start = Number(opt('--start', 0)), end = Number(opt('--end', -1)), quality = opt('--quality', 'mid'), alpha = a.includes('--alpha'), compArg = opt('--comp', '0'), region = Number(opt('--region', -1));   // --region N: display N (0 = o primeiro) em vez do projeto completo
if (!['mp4', 'png'].includes(format)) { console.error('--format deve ser mp4 ou png'); process.exit(2); }
const tmp = mkdtempSync(join(tmpdir(), 'aivj-render-'));
execFileSync(process.execPath, [join(SK, 'scripts', 'make-artifact.mjs'), resolve(proj), '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { width: 1400, height: 900 });
mkdirSync(out, { recursive: true });
const b64 = async expr => { const s = await page.evaluate(expr); return Buffer.from(s, 'base64'); };
try {
  for (let i = 0; i < 80; i++) { if (await page.evaluate('!!(window.AIVJ && window.AIVJ.mp4)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const nComps = await page.evaluate('AIVJ.project.compositions.length'), name = basename(proj).replace(/\.aivj\.json$|\.json$/i, '');
  const list = compArg === 'all' ? [...Array(nComps).keys()] : [Number(compArg)];
  for (const ci of list) {
    const t0 = Date.now();
    if (format === 'mp4') {
      const meta = JSON.parse(await page.evaluate(`(async () => { const r = await AIVJ.mp4.render({ ci: ${ci}, start: ${start}, end: ${end}, scale: ${scale}, fps: ${fps}, bars: ${bars}, quality: ${JSON.stringify(quality)}, region: ${region} });
        window.__mp4 = new Uint8Array(await r.blob.arrayBuffer()); return JSON.stringify({ w: r.w, h: r.h, fps: r.fps, frames: r.frames, codec: r.codec, bytes: window.__mp4.length, comp: r.comp }); })()`));
      const parts = []; for (let o = 0; o < meta.bytes; o += 3 << 20) parts.push(await b64(`(() => { const b = window.__mp4.subarray(${o}, ${o + (3 << 20)}); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); })()`));
      const file = join(out, `${name}_${String(ci + 1).padStart(2, '0')}_${meta.w}x${meta.h}_${meta.fps}fps${region >= 0 ? '_R' + (region + 1) : ''}.mp4`); writeFileSync(file, Buffer.concat(parts));
      console.log(`${file}  ${meta.frames} quadros · ${meta.codec} · ${(meta.bytes / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(1)} s (${(meta.frames / ((Date.now() - t0) / 1000)).toFixed(1)} quadros/s)`);
    } else {
      const info = JSON.parse(await page.evaluate(`(() => { const A = AIVJ; const P = A.project; const f = ${fps}; if (f) P.canvas.fps = f; ${bars ? `P.time.bars = ${bars};` : ''} const R = A.region(${region}, ${scale}, false); return JSON.stringify({ lf: A.loopFrames(), w: R ? R.w : Math.round(P.canvas.w * ${scale}), h: R ? R.h : Math.round(P.canvas.h * ${scale}), r: R }); })()`));
      const e = end < 0 ? info.lf - 1 : Math.min(end, info.lf - 1), dir = join(out, `${name}_${String(ci + 1).padStart(2, '0')}${region >= 0 && info.r ? '_R' + (region + 1) : ''}`); mkdirSync(dir, { recursive: true });
      for (let n = start; n <= e; n++) {
        writeFileSync(join(dir, String(n).padStart(6, '0') + '.png'), await b64(`(() => { const im = AIVJ.renderFrame(${ci}, ${n}, ${scale}, ${alpha}), c = document.createElement('canvas'); const R = ${JSON.stringify(info.r)}; c.width = R ? R.w : im.width; c.height = R ? R.h : im.height; if (R) c.getContext('2d').putImageData(im, -R.x, -R.y, R.x, R.y, R.w, R.h); else c.getContext('2d').putImageData(im, 0, 0); return c.toDataURL('image/png').split(',')[1]; })()`));
        if ((n - start) % 10 === 0) process.stdout.write(`\r${dir}  quadro ${n - start + 1}/${e - start + 1}`);
      }
      console.log(`\r${dir}  ${e - start + 1} PNG ${info.w}x${info.h}${alpha ? ' com alpha' : ''} · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
    }
  }
} finally { await page.close(); }
