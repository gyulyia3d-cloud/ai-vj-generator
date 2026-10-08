#!/usr/bin/env node
// Teste do export: manifesto (hash do projeto, quadros, arquivos, nomes), divisão em partes, e segurança de flash (análise e limitador), com controles.
// O download é interceptado no navegador e o ZIP é aberto de volta com o JSZip da própria página; sem rede (JSZip vem de um CDN) os testes de ZIP são pulados.
//   node export_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-exp-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const calm = 'void main(){ vec2 uv=gl_FragCoord.xy/uRes; float k=.5+.5*sin(TAU*uPh+uv.x*3.)+uBass*.01; gl_FragColor=outc(vec3(k*.5),1.); }';
const strobe = 'void main(){ float f=step(.5,fract(uPh*16.)); gl_FragColor=outc(vec3(f)+uBass*.0,1.); }';
const mk = (name, src) => ({ schema: 'ai-vj-generator/2', id: name, seed: 7, meta: { name, brief: 'x', lang: 'pt' }, canvas: { w: 320, h: 180, fps: 30 }, time: { bpm: 120, bars: 1, loop: true, seamless: true }, audio: { reactive: true, strategy: 'rhythmic' },
  palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x', on: true, opacity: 1 }, { type: 'shader', name: 'S', role: 'x', on: true, opacity: 1, blend: 'normal', p: { src, alphaMode: 'alpha' } }] }] });
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify(mk('Calmo', calm)));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 1200, height: 800 });
const E = x => page.evaluate(x);
try {
  // SHA-256 e análise de flash: unidades puras dentro do navegador
  const u = JSON.parse(await E(`(() => { const F = AIVJ.flash, sq = (n, per, lo, hi) => Array.from({ length: n }, (_, i) => Math.floor(i / (per / 2)) % 2 ? hi : lo), a = (s) => F.analyze(s, 30);
    return JSON.stringify({ sha: F.sha256('abc'), steady: a(Array(60).fill(.5)).pass, strobe: a(sq(60, 3, 0, 1)), slow: a(sq(60, 15, 0, 1)).pass, small: a(sq(60, 3, .5, .55)).pass, bright: a(sq(60, 3, .85, 1)).pass,
      wrap: a([1, 0, 1, 0, 1, ...Array(50).fill(.5), 0, 1, 0, 1, 0]).pass, wrapOpen: a([1, 0, 1, 0, 1, ...Array(50).fill(.5), 1, 1, 1, 1, 1]).pass, lim: (() => { const s = sq(60, 3, 0, 1), an = a(s), g = F.limit(s, .08, 30, an.bad); return { pass: a(s.map((v, i) => v * g[i])).pass, max: Math.max(...g) }; })(), slowFade: (() => { const s = Array.from({ length: 90 }, (_, i) => i < 45 ? i / 44 : (89 - i) / 44), an = a(s), g = F.limit(s, .08, 30, an.bad); return { pass: an.pass, min: Math.min(...g) }; })(), burst: (() => { const s = [...Array(60).fill(.3), ...Array.from({ length: 30 }, (_, i) => i % 2 ? 1 : 0), ...Array(60).fill(.3)], an = a(s), g = F.limit(s, .08, 30, an.bad), out = s.map((v, i) => v * g[i]); return { before: an.pass, after: a(out).pass, calmUntouched: [...g.slice(10, 40)].every(v => v === 1), burstDimmed: Math.min(...g.slice(62, 88)) < 0.5 }; })() }); })()`));
  check(u.sha === 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 confere com o vetor de teste ("abc")', u.sha);
  check(u.steady && u.slow && u.small && u.bright, 'luz estável, 2 Hz, tremor pequeno e flicker sempre claro passam na análise de flash', JSON.stringify(u));
  check(!u.strobe.pass && u.strobe.worst >= 9, `estrobo de 10 Hz é reprovado (${u.strobe.worst} flashes por segundo)`, JSON.stringify(u.strobe));
  check(u.wrap === false && u.wrapOpen === true, 'flashes que cruzam a emenda do loop são pegos (série cíclica); a mesma rajada sem o outro lado da emenda passa', JSON.stringify({ wrap: u.wrap, wrapOpen: u.wrapOpen }));
  check(u.lim.pass && u.lim.max <= 1, 'o limitador torna o estrobo aprovado e nunca clareia (ganho <= 1)', JSON.stringify(u.lim));
  check(u.slowFade.pass && u.slowFade.min === 1, 'um fade lento de ida e volta passa na análise e o limitador não mexe em nenhum quadro', JSON.stringify(u.slowFade));
  check(u.burst.before === false && u.burst.after === true && u.burst.calmUntouched && u.burst.burstDimmed, 'uma rajada de estrobo no meio de um trecho calmo é suavizada; o trecho calmo fica intacto', JSON.stringify(u.burst));

  const haveZip = await E(`typeof JSZip !== 'undefined'`);
  if (!haveZip) console.log('  --   JSZip não carregou (sem rede): testes de ZIP pulados');
  else {
    // intercepta downloads e abre os ZIPs de volta
    await E(`window.__dl = []; HTMLAnchorElement.prototype.click = function () { const a = this; if (a.download) { window.__dl.push(fetch(a.href).then(r => r.arrayBuffer()).then(b => ({ name: a.download, buf: b }))); } }; 0`);
    const run = async (setup) => { await E(`window.__dl = []; ${setup}; (async () => { const i = document.createElement('p'), b = document.createElement('div'); b.innerHTML = '<i></i>'; await AIVJ.expRun(i, b); window.__info = i.textContent; })()`); for (let k = 0; k < 120; k++) { const st = await E(`window.__info !== undefined`); if (st) break; await new Promise(r => setTimeout(r, 250)); } const info = await E(`window.__info`); await E(`window.__info = undefined`);
      return JSON.parse(await E(`(async () => { const files = await Promise.all(window.__dl); const out = []; for (const f of files) { const z = await JSZip.loadAsync(f.buf); out.push({ name: f.name, bytes: f.buf.byteLength, entries: Object.keys(z.files).filter(n => !z.files[n].dir), manifest: z.file(/MANIFEST\\.json$/)[0] ? JSON.parse(await z.file(/MANIFEST\\.json$/)[0].async('string')) : null }); } return JSON.stringify({ parts: out, info: ${JSON.stringify(info)} }); })()`)); };

    // A) export simples: manifesto, nomes e contagem
    const hash0 = await E(`AIVJ.flash.sha256(JSON.stringify(AIVJ.projectOut()))`);
    const A = await run(`AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = false`);
    const a = A.parts[0], m = a && a.manifest, frames = m && m.export.frames;
    check(A.parts.length === 1 && m && m.schema === 'ai-vj-generator/export-manifest/1', 'export simples gera um ZIP com MANIFEST.json', JSON.stringify(A).slice(0, 300));
    check(m && m.project.sha256 === hash0 && /^[0-9a-f]{64}$/.test(m.project.sha256), 'o manifesto traz o hash SHA-256 do projeto (o mesmo que o motor calcula antes do export)', m && m.project.sha256);
    const pngs = a ? a.entries.filter(n => n.endsWith('.png') && /\/ALPHA\//.test(n)) : [];
    check(m && pngs.length === frames && frames === m.project.loopFrames && /\/ALPHA\/01_A\/01_A_000000\.png$/.test(pngs.sort()[0]) && /01_A_0000(59)\.png$/.test(pngs.sort().slice(-1)[0]), `${pngs.length} PNG com nomes previsíveis (ALPHA/01_A/01_A_000000.png … 000059) e quadros = quadros do loop`, JSON.stringify(pngs.slice(0, 2)));
    check(m && m.canvas.w === 320 && m.canvas.fps === 30 && m.project.seed === 7 && m.project.bars === 1 && m.export.size.join() === '320,180', 'o manifesto registra canvas, fps, seed, compassos e tamanho', JSON.stringify(m && { c: m.canvas, p: m.project }));
    check(a && a.entries.some(n => /PROJECT_DATA\/project\.json$/.test(n)) && a.entries.some(n => /PREVIEW\//.test(n)), 'o ZIP leva project.json e a prévia', JSON.stringify(a && a.entries.filter(n => !n.endsWith('.png'))));

    // B) divisão em partes
    const B = await run(`AIVJ.EXP.partMB = 0.02; AIVJ.EXP.flashLimit = false`);
    const names = B.parts.flatMap(p => p.entries.filter(n => n.endsWith('.png') && /\/ALPHA\//.test(n)));
    const withMan = B.parts.filter(p => p.manifest);
    check(B.parts.length >= 2 && new Set(names).size === pngs.length && names.length === pngs.length, `com limite de 20 KB o export vira ${B.parts.length} partes e juntas têm os mesmos ${pngs.length} PNG, sem repetir`, JSON.stringify(B.parts.map(p => [p.name, p.entries.length])));
    check(withMan.length === 1 && B.parts[B.parts.length - 1].manifest && /_p01\.zip$/.test(B.parts[0].name) && /Extraia|extraia/.test(B.info), 'só a última parte leva o manifesto; as partes se chamam _p01, _p02…; a mensagem manda extrair tudo na mesma pasta', B.info);
    check(B.parts[B.parts.length - 1].manifest.parts.length === B.parts.length, 'o manifesto lista todas as partes', JSON.stringify(B.parts[B.parts.length - 1].manifest.parts));
    const mp = B.parts[B.parts.length - 1].manifest.parts;
    check(B.parts.every((pt, i) => mp[i].file === pt.name && mp[i].files === pt.entries.length), 'a contagem de arquivos de cada parte no manifesto bate com o que há dentro do ZIP (prévias e dados inclusos)', JSON.stringify(mp.map((x, i) => [x.files, B.parts[i].entries.length])));
    check(A.parts[0].manifest.parts[0].files === A.parts[0].entries.length, 'export simples: a contagem de arquivos do manifesto bate com o ZIP', JSON.stringify([A.parts[0].manifest.parts[0].files, A.parts[0].entries.length]));

    // C) segurança de flash: estrobo de 8 Hz sem e com limitador; o PNG exportado é medido de volta
    await E(`AIVJ.importJson(${JSON.stringify(JSON.stringify(mk('Estrobo', strobe)))})`);
    const luma = async (part, ci) => JSON.parse(await E(`(async () => { const z = await JSZip.loadAsync(window.__lastBuf), names = Object.keys(z.files).filter(n => /\\/ALPHA\\/.*\\.png$/.test(n)).sort(), s = []; for (const n of names) { const im = new Image(); im.src = URL.createObjectURL(await z.file(n).async('blob')); await im.decode(); const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; const x = c.getContext('2d'); x.drawImage(im, 0, 0); s.push(AIVJ.flash.frameLum(x.getImageData(0, 0, c.width, c.height).data)); } return JSON.stringify({ n: s.length, a: AIVJ.flash.analyze(s, 30) }); })()`));
    const C0 = await run(`AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = false`);
    await E(`window.__lastBuf = undefined`);
    const fl0 = C0.parts[0].manifest.flash.perComposition[0];
    check(!fl0.pass && fl0.flashesPerSecondWorst >= 6 && !fl0.limited && /ATENÇÃO/.test(C0.info), `estrobo de 8 Hz sem limitador: o manifesto registra ${fl0.flashesPerSecondWorst} flashes por segundo e a mensagem avisa`, JSON.stringify(fl0) + C0.info);
    const C1 = await run(`AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = true`);
    const fl1 = C1.parts[0].manifest.flash.perComposition[0];
    check(fl1.limited && fl1.after.pass && fl1.after.flashesPerSecondWorst <= 3 && /suavizados/.test(C1.info), `com o limitador o manifesto registra a correção (${fl1.flashesPerSecondWorst} → ${fl1.after.flashesPerSecondWorst} flashes por segundo)`, JSON.stringify(fl1) + C1.info);
    // medida de volta nos PNG gravados
    const back = async (flag) => { await E(`window.__dl = []; AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = ${flag}; (async () => { const i = document.createElement('p'), b = document.createElement('div'); b.innerHTML = '<i></i>'; await AIVJ.expRun(i, b); window.__info = i.textContent; })()`); for (let k = 0; k < 120; k++) { if (await E(`window.__info !== undefined`)) break; await new Promise(r => setTimeout(r, 250)); } await E(`(async () => { window.__info = undefined; window.__lastBuf = (await window.__dl[0]).buf; })()`); return luma(); };
    const b0 = await back(false), b1 = await back(true);
    check(!b0.a.pass && b1.a.pass && b0.n === b1.n, `medindo os PNG gravados: sem limitador ${b0.a.worst} flashes/s (reprova), com limitador ${b1.a.worst} (aprova), mesmo número de quadros`, JSON.stringify({ b0: b0.a, b1: b1.a }));
    // controle: peça calma não é tocada pelo limitador
    await E(`AIVJ.importJson(${JSON.stringify(JSON.stringify(mk('Calmo', calm)))})`);
    const D = await run(`AIVJ.EXP.partMB = 0; AIVJ.EXP.flashLimit = true`);
    const fl2 = D.parts[0].manifest.flash.perComposition[0];
    check(fl2.pass && !fl2.limited, 'controle: uma peça calma passa na análise e o limitador não mexe nela', JSON.stringify(fl2));
  }
} catch (e) { bad('exceção: ' + (e.message || e) + (e.stack ? '\n' + e.stack.split('\n').slice(0, 3).join('\n') : '')); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nexport ok.');
process.exit(fail ? 1 : 0);
