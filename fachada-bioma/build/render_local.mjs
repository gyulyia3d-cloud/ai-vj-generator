// render_local.mjs <html> <outdir> <comp> [start] [end] [quality] [scale]
// MP4 H.264 por AIVJ.mp4.render (quadro a quadro, sem gravar a tela), no HTML que já leva os assets embutidos.
import { openPage } from 'file:///C:/Users/gyuly/.claude/skills/ai-vj-generator/scripts/cdp.mjs';
import { writeFileSync, mkdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { resolve, join } from 'node:path';
const [,, html, outDir, comp = '0', start = '0', end = '-1', quality = 'high', scale = '1'] = process.argv;
mkdirSync(outDir, { recursive: true });
const page = await openPage(html, { url: pathToFileURL(resolve(html)).href + '?qa=1', width: 1400, height: 900 });
await page.evaluate("new Promise(async r=>{for(let i=0;i<240&&!document.querySelector('#aivj-qa[data-done]');i++)await new Promise(x=>setTimeout(x,500));r(1)})");
const ci = Number(comp), t0 = Date.now();
const meta = JSON.parse(await page.evaluate(`(async () => { const r = await AIVJ.mp4.render({ ci: ${ci}, start: ${start}, end: ${end}, scale: ${scale}, fps: null, bars: null, quality: ${JSON.stringify(quality)}, region: -1 });
  window.__mp4 = new Uint8Array(await r.blob.arrayBuffer()); return JSON.stringify({ w: r.w, h: r.h, fps: r.fps, frames: r.frames, codec: r.codec, bytes: window.__mp4.length, comp: r.comp }); })()`));
const parts = [];
for (let o = 0; o < meta.bytes; o += 3 << 20) parts.push(Buffer.from(await page.evaluate(`(() => { const b = window.__mp4.subarray(${o}, ${o + (3 << 20)}); let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode.apply(null, b.subarray(i, i + 0x8000)); return btoa(s); })()`), 'base64'));
const file = join(outDir, `ato${String(ci + 1).padStart(2, '0')}_${meta.w}x${meta.h}_${meta.fps}fps.mp4`);
writeFileSync(file, Buffer.concat(parts));
console.log(`${file}  ${meta.frames} quadros · ${meta.codec} · ${(meta.bytes / 1048576).toFixed(1)} MB · ${((Date.now() - t0) / 1000).toFixed(1)} s`);
await page.close();
