#!/usr/bin/env node
// Teste V7: vocabulário de áudio estendido (tempo integrado fecha o loop), layer.mod e uniforms novos no shader.
//   node v7_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { openPage } from './cdp.mjs';


/* PNG sintético (zlib) para testar o parallax: imagem de listras e mapa de profundidade em gradiente */
import { deflateSync, crc32 } from 'node:zlib';
const mkPng = (w, h, fn) => { const raw = Buffer.alloc((w * 3 + 1) * h); for (let y = 0; y < h; y++) { raw[y * (w * 3 + 1)] = 0; for (let x = 0; x < w; x++) { const c = fn(x, y); raw.set(c, y * (w * 3 + 1) + 1 + x * 3); } }
  const ch = (t, d) => { const b = Buffer.alloc(4 + 4 + d.length + 4); b.writeUInt32BE(d.length, 0); b.write(t, 4); d.copy(b, 8); b.writeUInt32BE(crc32(Buffer.concat([Buffer.from(t), d])) >>> 0, 8 + d.length); return b; };
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 2;
  return 'data:image/png;base64,' + Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), ch('IHDR', ih), ch('IDAT', deflateSync(raw)), ch('IEND', Buffer.alloc(0))]).toString('base64'); };
const imgUrl = mkPng(96, 54, (x, y) => [(x * 5) % 256, (y * 9) % 256, ((x >> 3) % 2) * 255]), depUrl = mkPng(96, 54, (x) => { const v = Math.round(x / 95 * 255); return [v, v, v]; });
const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-v7-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const src = 'void main(){vec2 uv=gl_FragCoord.xy/uRes; float k=0.5+0.5*sin(TAU*(uBassT+uMidT+uHighT+uAudT)+uv.x*6.)+uMidHit*.1+uHighHit*.1+uPres*.1+uOnBeat*.1+uBSin*.1+uBTri*.1+uBSin2*.1+uBSin4*.1+uBpm*.01+uBass*.1+uHit*.1; gl_FragColor=outc(uC1,clamp(k,0.,1.));}';
const layers = [{ type: 'bg', name: 'FUNDO', role: 'x' }, { type: 'shader', name: 'CAMPO', role: 'x', on: true, p: { src, alphaMode: 'alpha' }, mod: [{ k: 'p1', src: 'lfo', min: 0, max: 4, cycles: 2 }] }];
const project = { assets: { 'img.png': { kind: 'image', data: imgUrl }, 'dep.png': { kind: 'image', data: depUrl } }, schema: 'ai-vj-generator/2', id: 'v7', seed: 3, meta: { name: 'V7', brief: 'x', lang: 'pt' }, canvas: { w: 960, h: 540, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers }] };
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(project));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });

const page = await openPage(html, { chrome, width: 1200, height: 800 });
const E = x => page.evaluate(x);
try {
  const nb = 16;
  const t0 = await E(`JSON.stringify(AIVJ.synthTimes({beatF:0}))`), tEnd = await E(`JSON.stringify(AIVJ.synthTimes({beatF:${nb}-1e-9}))`);
  const a = JSON.parse(t0), z = JSON.parse(tEnd);
  check(Math.abs(a.bt) < 1e-9 && Math.abs(a.mt) < 1e-9 && Math.abs(a.ht) < 1e-9, 'tempo integrado começa em 0', t0);
  check(Math.abs(z.bt - 4) < 1e-6 && Math.abs(z.mt - 4) < 1e-6 && Math.abs(z.ht - 4) < 1e-6, 'tempo integrado vale 4 (compassos) no fim do loop: fecha', tEnd);
  const mono = await E(`(() => { let p = -1; for (let i = 0; i < 160; i++) { const v = AIVJ.synthTimes({beatF: i / 10}).bt; if (v < p - 1e-12) return false; p = v; } return true; })()`);
  check(mono, 'tempo integrado nunca volta', 'não monotônico');
  const accel = await E(`(() => { const d = x => AIVJ.synthTimes({beatF: x + 0.1}).bt - AIVJ.synthTimes({beatF: x}).bt; return d(0) > d(0.8); })()`);
  check(accel, 'avança mais rápido no golpe (início do tempo) que no vão', 'sem aceleração');
  const same = await E(`JSON.stringify(AIVJ.pseudoAudio({beatF:3.3})) === JSON.stringify(AIVJ.pseudoAudio({beatF:3.3}))`);
  check(same, 'AIVJ.pseudoAudio determinístico', 'diferiu');
  const m = await E(`JSON.stringify([AIVJ.applyMods({p1:1}, {mod:[{k:'p1',src:'lfo',min:0,max:2,cycles:1}]}, {lph:0.5,bands:{}}).p1, AIVJ.applyMods({p1:1}, {mod:[{k:'p1',src:'bass',min:0,max:2,mode:'add'}]}, {lph:0,bands:{bass:0.5}}).p1, AIVJ.applyMods({p1:3}, {mod:[{k:'nada',src:'bass'}]}, {lph:0,bands:{bass:1}}).p1, AIVJ.applyMods({p1:3}, {mod:[{k:'p1',src:'lfo',cycles:2}]}, {lph:0,bands:{}}).p1 === AIVJ.applyMods({p1:3}, {mod:[{k:'p1',src:'lfo',cycles:2}]}, {lph:1,bands:{}}).p1])`);
  check(m === '[2,2,3,true]', 'layer.mod: lfo, add por banda, chave inexistente ignorada, lfo fecha o loop', m);
  const lit = await E(`(() => { const d = AIVJ.renderFrame(0, 20, 0.2, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return s; })()`);
  const err = await E(`JSON.stringify([...AIVJ.GLERR.values()])`);
  check(lit > 0 && err === '[]', 'shader com todos os uniforms novos compila e desenha', 'lit=' + lit + ' err=' + err);
  const k = await E(`JSON.stringify(['mhit','hhit','bt','mt','ht','at','pres','onbeat','bsin','btri','bsin2','bsin4'].every(n => typeof AIVJ.layerFrame(AIVJ.frameAt(5), AIVJ.pm({type:'shader',p:{}}), 0, 2, 'shader').bands[n] === 'number'))`);
  check(k === 'true', 'AIVJ.layerFrame expõe as bandas novas (também em K.t)', k);
} catch (e) { bad('exceção: ' + (e.message || e)); }
/* gerador instrument: todos os tipos desenham sem erro, com bandas sintéticas */
try {
  for (const kind of ['bars', 'radial', 'scope', 'radar', 'rings', 'heat']) {
    const r = await page.evaluate(`(() => { const P = AIVJ.project; P.compositions[0].layers = [{ type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: { grain: 0 } }, { type: 'instrument', name: 'I', on: true, opacity: 1, blend: 'normal', p: { kind: '${kind}', mirror: true } }]; AIVJ.LAYERERR.clear(); const d = AIVJ.renderFrame(0, 14, 0.3, true).data; let s = 0; for (let i = 3; i < d.length; i += 4) s += d[i]; return JSON.stringify({ s, e: [...AIVJ.LAYERERR.values()] }); })()`);
    const o = JSON.parse(r); check(o.s > 0 && !o.e.length, 'instrument ' + kind + ' desenha', r);
  }
  for (const form of [0, 3, 7]) {
    const r = await page.evaluate(`(() => { const P = AIVJ.project; P.compositions[0].layers = [{ type: 'bitfield', name: 'B', on: true, opacity: 1, blend: 'normal', p: { form: ${form}, levels: 4 } }]; AIVJ.LAYERERR.clear(); const a = AIVJ.renderFrame(0, 0, 0.3, true).data, b = AIVJ.renderFrame(0, AIVJ.loopFrames(), 0.3, true).data; let s = 0, d = 0; for (let i = 3; i < a.length; i += 4) { s += a[i]; if (a[i] !== b[i]) d++; } return JSON.stringify({ s, d, e: [...AIVJ.LAYERERR.values()] }); })()`);
    const o = JSON.parse(r); check(o.s > 0 && o.d === 0 && !o.e.length, 'bitfield fórmula ' + form + ' desenha e o último quadro fecha com o primeiro', r);
  }
  for (const kind of ['reaction', 'ink']) {
    const r = await page.evaluate(`(() => { const P = AIVJ.project; P.compositions[0].layers = [{ type: 'sim', name: 'S', on: true, opacity: 1, blend: 'normal', p: { kind: '${kind}' } }]; AIVJ.LAYERERR.clear(); const LF = AIVJ.loopFrames(), f = n => AIVJ.renderFrame(0, n, 0.3, true).data, t0 = performance.now(); const a = f(0), t1 = performance.now(); const mid = f(Math.floor(LF / 2)), last = f(LF - 1), z = f(LF), s10 = f(10), s11 = f(11); const diff = (x, y) => { let s = 0; for (let i = 3; i < x.length; i += 4) s += Math.abs(x[i] - y[i]); return s / (x.length / 4) / 255; }; let cov = 0; for (let i = 3; i < mid.length; i += 4) cov += mid[i]; return JSON.stringify({ ms: Math.round(t1 - t0), cov: cov / (mid.length / 4) / 255, dMid: diff(a, mid), seam: diff(last, z), step: diff(s10, s11), wrap: diff(a, z), e: [...AIVJ.LAYERERR.values()] }); })()`);
    const o = JSON.parse(r); check(o.ms < 6000 && o.cov > 0.01 && o.dMid > 0.005 && o.wrap === 0 && o.seam < Math.max(0.01, o.step * 6) && !o.e.length, 'sim ' + kind + ': assa em < 6 s, desenha, move e a emenda do loop é do tamanho de poucos passos', r);
  }
  {
    const r = await page.evaluate(`(() => { const P = AIVJ.project; P.compositions[0].layers = [{ type: 'parallax', name: 'PX', on: true, opacity: 1, blend: 'normal', p: { media: 'img.png', mediad: 'dep.png', amp: 0.08 } }]; AIVJ.LAYERERR.clear(); const LF = AIVJ.loopFrames(), f = n => AIVJ.renderFrame(0, n, 0.3, true).data, a = f(0), q = f(Math.floor(LF / 4)), z = f(LF); let d = 0, w = 0, cov = 0; for (let i = 0; i < a.length; i++) { if (a[i] !== q[i]) d++; if (a[i] !== z[i]) w++; } for (let i = 3; i < a.length; i += 4) cov += a[i]; return JSON.stringify({ d, w, cov: cov / (a.length / 4) / 255, e: [...AIVJ.LAYERERR.values()] }); })()`);
    const o = JSON.parse(r); check(o.cov > 0.9 && o.d > 100 && o.w === 0 && !o.e.length, 'parallax: cobre o quadro, move com a profundidade e fecha o loop', r);
    const r2 = await page.evaluate(`(() => { AIVJ.project.compositions[0].layers[0].p.mediad = ''; AIVJ.LAYERERR.clear(); const d = AIVJ.renderFrame(0, 7, 0.3, true).data; let c = 0; for (let i = 3; i < d.length; i += 4) c += d[i]; return JSON.stringify({ cov: c / (d.length / 4) / 255, e: [...AIVJ.LAYERERR.values()] }); })()`);
    const o2 = JSON.parse(r2); check(o2.cov > 0.9 && !o2.e.length, 'parallax sem mapa usa a luminância', r2);
  }
  {
    /* PLY binário sintético no formato do 3D Gaussian Splatting: x y z f_dc_0..2 opacity scale_0..2 */
    const NPT = 4000, props = ['x', 'y', 'z', 'f_dc_0', 'f_dc_1', 'f_dc_2', 'opacity', 'scale_0', 'scale_1', 'scale_2'], NLN = String.fromCharCode(10), hdr = ['ply', 'format binary_little_endian 1.0', 'element vertex ' + NPT, ...props.map(k => 'property float ' + k), 'end_header', ''].join(NLN);
    const body = Buffer.alloc(NPT * props.length * 4); for (let i = 0; i < NPT; i++) { const a = i * 2.399963, z = 1 - 2 * (i + 0.5) / NPT, r = Math.sqrt(1 - z * z), v = [Math.cos(a) * r, Math.sin(a) * r, z, 1.2 * z, 0.3, -0.8 * z, 1.5, -4, -4, -4]; v.forEach((x, j) => body.writeFloatLE(x, (i * props.length + j) * 4)); }
    const b64 = Buffer.concat([Buffer.from(hdr), body]).toString('base64');
    const r = await page.evaluate(`(async () => { const bin = Uint8Array.from(atob('${b64}'), c => c.charCodeAt(0)); const o = AIVJ.parsePly(bin.buffer); const f = new File([bin], 'sphere.ply'); AIVJ.project.compositions[0].layers = [{ type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: { grain: 0 } }]; await AIVJ.importFile(f); const L = AIVJ.project.compositions[0].layers.find(l => l.type === 'splat'); const LF = AIVJ.loopFrames(), fr = n => AIVJ.renderFrame(0, n, 0.4, true).data; AIVJ.LAYERERR.clear(); const a = fr(0), q = fr(Math.floor(LF / 4)), z = fr(LF); let cov = 0, d = 0, w = 0; for (let i = 0; i < a.length; i += 4) { cov += a[i + 3]; } for (let i = 0; i < a.length; i++) { if (a[i] !== q[i]) d++; if (a[i] !== z[i]) w++; } return JSON.stringify({ n: o.n, hasScale: o.hasScale, layer: !!L && L.p.media === 'sphere.ply', cov: cov / (a.length / 4) / 255, d, w, e: [...AIVJ.LAYERERR.values()], embed: !!(AIVJ.projectOut && JSON.stringify(AIVJ.projectOut()).includes('x-aivj-splat')) }); })()`);
    const o = JSON.parse(r); check(o.n === 4000 && o.hasScale && o.layer && o.cov > 0.02 && o.d > 100 && o.w === 0 && !o.e.length && o.embed, 'splat: importa PLY gaussiano, cria a camada, desenha, gira e fecha o loop, e vai embutido no projeto', r);
  }
  const b = JSON.parse(await page.evaluate(`JSON.stringify(AIVJ.specBins(AIVJ.layerFrame(AIVJ.frameAt(3), AIVJ.pm({type:'instrument',p:{}}), 0, 2, 'instrument'), 16))`));
  check(b.length === 16 && b.every(v => v >= 0 && v <= 1), 'specBins devolve 16 valores 0..1', JSON.stringify(b).slice(0, 80));
} catch (e) { bad('instrument: ' + (e.message || e)); }
await page.close();
/* modo palco para OBS/Spout: ?stage=1&alpha=1 esconde a interface e o fundo */
const sp = await openPage(html, { chrome, width: 1000, height: 600, url: pathToFileURL(html).href + '?stage=1&alpha=1&comp=1' });
try {
  const st = await sp.evaluate(`JSON.stringify({ clean: document.querySelector('#app').classList.contains('clean'), cls: document.documentElement.classList.contains('stagemode'), alpha: !!AIVJ.state.alphaStage, panel: getComputedStyle(document.querySelector('#panel')).display, bg: getComputedStyle(document.body).backgroundColor })`);
  const o = JSON.parse(st);
  check(o.clean && o.cls && o.alpha && o.panel === 'none' && o.bg === 'rgba(0, 0, 0, 0)', 'modo palco (?stage=1&alpha=1): interface escondida e fundo transparente', st);
} catch (e) { bad('palco: ' + (e.message || e)); }
await sp.close();
console.log(fail ? `\n${fail} falha(s).` : '\nV7 ok.');
process.exit(fail ? 1 : 0);
