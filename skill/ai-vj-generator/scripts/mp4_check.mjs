#!/usr/bin/env node
// Teste do render MP4: o motor desenha cada quadro e o WebCodecs codifica em H.264 (nada de gravação de tela nem WebM); o muxer próprio monta o .mp4.
// Confere o arquivo pela estrutura (ftyp, moov antes do mdat, contagem de amostras) e, se houver ffprobe/ffmpeg, pelo decodificador: codec, tamanho, quadros, imagem não preta,
// e que o primeiro quadro decodificado é igual ao PNG que o export de imagem produz (a mesma cena).
//   node mp4_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador. Sem WebCodecs H.264 no navegador: avisa e passa (pulado).
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-mp4-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const has = bin => { try { return spawnSync(bin, ['-version'], { stdio: 'pipe' }).status === 0; } catch (e) { return false; } };

const project = { schema: 'ai-vj-generator/2', id: 'mp4', seed: 5, meta: { name: 'MP4 TESTE', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 1 }, palette: { bg: '#101418', primary: '#F0F0F0', secondary: '#7A8896', accent: '#E8742A' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }, { type: 'shader', name: 'CEL', p: { preset: 'CÉLULAS' } }, { type: 'tunnel', name: 'T' }] }] };
const pj = join(tmp, 'p.json'); writeFileSync(pj, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), pj, '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
const E = s => page.evaluate(s);
try {
  for (let i = 0; i < 80; i++) { if (await E('!!(window.AIVJ && window.AIVJ.mp4)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  const sup = await E(`(async () => { const r = await AIVJ.mp4.X.pickCodec(640, 360, 30, 2000000); return JSON.stringify({ error: r.error || null, codec: r.codec || null }); })()`).then(JSON.parse);
  if (sup.error) { console.log('  pulado: ' + sup.error); console.log('\nmp4 pulado (sem H.264 neste navegador).'); await page.close(); process.exit(0); }
  ok('o navegador codifica H.264 (' + sup.codec + ')');
  const N = 12;
  const r = JSON.parse(await E(`(async () => { const r = await AIVJ.mp4.render({ ci: 0, start: 0, end: ${N - 1}, scale: 1, quality: 'mid' });
    const buf = new Uint8Array(await r.blob.arrayBuffer()); let s = ''; for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode.apply(null, buf.subarray(i, i + 0x8000));
    const cv = document.createElement('canvas'); cv.width = 640; cv.height = 360; const im = AIVJ.renderFrame(0, 0, 1, false); cv.getContext('2d').putImageData(im, 0, 0);
    return JSON.stringify({ b64: btoa(s), w: r.w, h: r.h, frames: r.frames, codec: r.codec, bytes: buf.length, png: cv.toDataURL('image/png').split(',')[1] }); })()`));
  const file = join(tmp, 'out.mp4'); writeFileSync(file, Buffer.from(r.b64, 'base64'));
  const buf = readFileSync(file), boxes = []; for (let o = 0; o + 8 <= buf.length;) { const sz = buf.readUInt32BE(o), t = buf.toString('latin1', o + 4, o + 8); boxes.push(t); if (sz < 8) break; o += sz; }
  check(boxes.join(',') === 'ftyp,moov,mdat', 'estrutura: ftyp, moov (índice no início), mdat', boxes.join(','));
  check(r.frames === N && r.w === 640 && r.h === 360 && r.bytes > 2000, `render devolveu ${r.frames} quadros ${r.w}x${r.h}, ${r.bytes} bytes`, JSON.stringify({ f: r.frames, w: r.w, h: r.h, b: r.bytes }));
  const rg = JSON.parse(await E(`(async () => { AIVJ.project.canvas.displays = [{ x: 0, y: 0, w: 320, h: 360, name: 'ESQ' }, { x: 320, y: 0, w: 320, h: 360, name: 'DIR' }];
    const r = await AIVJ.mp4.render({ ci: 0, start: 0, end: 3, scale: 1, quality: 'mid', region: 1 }); AIVJ.project.canvas.displays = []; return JSON.stringify({ w: r.w, h: r.h, frames: r.frames }); })()`));
  check(rg.w === 320 && rg.h === 360 && rg.frames === 4, 'MP4 por região: o display DIR sai como vídeo de 320×360 com os mesmos quadros pedidos', JSON.stringify(rg));
  const stsz = buf.indexOf('stsz'), n = buf.readUInt32BE(stsz + 12); check(n === N, 'a tabela de amostras tem ' + N + ' entradas', String(n));
  if (has('ffprobe') && has('ffmpeg')) {
    const pr = JSON.parse(execFileSync('ffprobe', ['-v', 'error', '-count_frames', '-select_streams', 'v:0', '-show_entries', 'stream=codec_name,width,height,nb_read_frames,avg_frame_rate,pix_fmt', '-of', 'json', file], { encoding: 'utf8' })).streams[0];
    check(pr.codec_name === 'h264' && +pr.width === 640 && +pr.height === 360 && +pr.nb_read_frames === N && pr.avg_frame_rate === '30/1', `ffprobe: ${pr.codec_name} ${pr.width}x${pr.height}, ${pr.nb_read_frames} quadros, ${pr.avg_frame_rate}`, JSON.stringify(pr));
    const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
    let sum = 0; for (let i = 0; i < raw.length; i++) sum += raw[i]; check(raw.length === 640 * 360 * 3 && sum / raw.length > 8, 'o primeiro quadro decodifica e não é preto (média ' + (sum / raw.length).toFixed(1) + ')', 'preto ou tamanho errado');
    writeFileSync(join(tmp, 'f0.png'), Buffer.from(r.png, 'base64'));
    const ref = execFileSync('ffmpeg', ['-v', 'error', '-i', join(tmp, 'f0.png'), '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
    let d = 0; for (let i = 0; i < ref.length; i++) d += Math.abs(ref[i] - raw[i]); d /= ref.length; check(d < 6, `o quadro 0 do MP4 se parece com o do PNG (diferença média ${d.toFixed(2)} de 255, perda do H.264)`, String(d));
    const last = execFileSync('ffmpeg', ['-v', 'error', '-i', file, '-vf', `select=eq(n\\,${N - 1})`, '-frames:v', '1', '-f', 'rawvideo', '-pix_fmt', 'rgb24', '-'], { maxBuffer: 64 << 20 });
    let dd = 0; for (let i = 0; i < last.length; i++) dd += Math.abs(last[i] - raw[i]); dd /= last.length; check(dd > 0.5, 'o último quadro difere do primeiro (a imagem anima: ' + dd.toFixed(1) + ')', 'parado');
  } else console.log('  pulado: ffprobe/ffmpeg não estão no PATH (a estrutura do arquivo foi conferida acima)');
  /* linha de comando: scripts/render.mjs gera MP4 e PNG sem abrir a interface */
  const ROOT = join(HERE, '..', '..', '..'), outDir = join(tmp, 'cli');
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'render.mjs'), pj, '--out', outDir, '--format', 'png', '--end', '3'], { stdio: 'pipe' });
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'render.mjs'), pj, '--out', outDir, '--format', 'mp4', '--end', '5', '--quality', 'low'], { stdio: 'pipe' });
  const { readdirSync } = await import('node:fs'), top = readdirSync(outDir), pngs = readdirSync(join(outDir, top.find(x => !x.endsWith('.mp4'))));
  check(pngs.length === 4 && pngs[0] === '000000.png', 'CLI: --format png grava 4 quadros numerados', pngs.join(','));
  const m4 = top.find(x => x.endsWith('.mp4')); check(!!m4 && /640x360_30fps/.test(m4) && readFileSync(join(outDir, m4)).length > 1000, 'CLI: --format mp4 grava o arquivo com tamanho e fps no nome', top.join(','));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nrender MP4 ok.');
process.exit(fail ? 1 : 0);
