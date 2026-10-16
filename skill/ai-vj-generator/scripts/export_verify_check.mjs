#!/usr/bin/env node
// Teste do verificador de export (fase 16): scripts/render.mjs grava a entrega com MANIFEST.json (esquema export-manifest/2) e scripts/verify_export.mjs a confere.
// Casos bons: PNG opaco, PNG com alfa e MP4 passam. Controles negativos: byte trocado, quadro apagado, project.json adulterado, alfa declarado opaco com PNG transparente,
// manifesto de MP4 que promete alfa, e arquivo do manifesto ausente. Cada controle TEM de reprovar, senão o verificador não prova nada.
//   node export_verify_check.mjs     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, writeFileSync, readdirSync, rmSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { findChrome } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), ROOT = resolve(HERE, '..', '..', '..');
if (!findChrome()) { console.log('  --   sem navegador: verificação de export pulada'); process.exit(3); }
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const tmp = mkdtempSync(join(tmpdir(), 'aivj-ver-'));
const ver = dir => { try { return { code: 0, out: execFileSync(process.execPath, [join(ROOT, 'scripts', 'verify_export.mjs'), dir], { stdio: 'pipe' }).toString() }; } catch (e) { return { code: e.status, out: String(e.stdout) }; } };
const render = (args) => execFileSync(process.execPath, [join(ROOT, 'scripts', 'render.mjs'), join(ROOT, 'examples', 'gallery', '01-pressao-led.aivj.json'), ...args], { stdio: 'pipe', timeout: 240000 });
const frames = d => readdirSync(d).filter(f => f.endsWith('.png')).sort();
try {
  const rgb = join(tmp, 'rgb'), alp = join(tmp, 'alpha'), vid = join(tmp, 'mp4');
  render(['--out', rgb, '--format', 'png', '--scale', '0.25', '--end', '5']);
  render(['--out', alp, '--format', 'png', '--scale', '0.25', '--end', '5', '--alpha']);
  const R = join(rgb, readdirSync(rgb)[0]), A = join(alp, readdirSync(alp)[0]);

  const r0 = ver(R), a0 = ver(A);
  check(r0.code === 0 && /alfa 255 em todos os pixels amostrados/.test(r0.out) && /SHA-256 de todos os quadros bate/.test(r0.out), 'PNG opaco: a entrega confere (hash de cada quadro, quadros contíguos, alfa 255 medido)', r0.out.slice(-400));
  check(a0.code === 0 && /export com alfa: \d+ de \d+ quadros amostrados têm transparência medida/.test(a0.out), 'PNG com alfa: a entrega confere e a transparência é medida nos pixels', a0.out.slice(-400));

  // controles negativos, cada um numa cópia
  const mut = (src, name, f) => { const d = join(tmp, name); cpSync(src, d, { recursive: true }); f(d); return ver(d); };
  const n1 = mut(R, 'neg-byte', d => { const p = join(d, frames(d)[2]), b = readFileSync(p); b[b.length - 20] ^= 0xff; writeFileSync(p, b); });
  check(n1.code === 1 && /SHA-256 diferente/.test(n1.out), 'controle negativo: um byte trocado num PNG reprova pelo SHA-256', n1.out.slice(-300));
  const n2 = mut(R, 'neg-gap', d => rmSync(join(d, frames(d)[2])));
  check(n2.code === 1 && /faltam quadros/.test(n2.out) && /não estão na entrega/.test(n2.out), 'controle negativo: um quadro apagado reprova (buraco na sequência e arquivo do manifesto ausente)', n2.out.slice(-300));
  const n3 = mut(R, 'neg-proj', d => { const p = join(d, 'project.json'), j = JSON.parse(readFileSync(p, 'utf8')); j.seed = (j.seed || 0) + 1; writeFileSync(p, JSON.stringify(j, null, 2)); });
  check(n3.code === 1 && /project\.json não bate/.test(n3.out), 'controle negativo: project.json adulterado reprova', n3.out.slice(-300));
  const n4 = mut(A, 'neg-alpha', d => { const p = join(d, 'MANIFEST.json'), m = JSON.parse(readFileSync(p, 'utf8')); m.export.alpha = false; m.alpha.declared = false; writeFileSync(p, JSON.stringify(m, null, 2)); });
  check(n4.code === 1 && /declarado OPACO/.test(n4.out), 'controle negativo: PNG transparente declarado como opaco reprova (o alfa é medido, não confiado)', n4.out.slice(-300));
  const n5 = mut(R, 'neg-empty', d => rmSync(join(d, 'MANIFEST.json')));
  check(n5.code === 1 && /MANIFEST\.json não encontrado/.test(n5.out), 'controle negativo: entrega sem manifesto reprova', n5.out.slice(-300));
  const n6 = mut(R, 'neg-size', d => { const p = join(d, 'MANIFEST.json'), m = JSON.parse(readFileSync(p, 'utf8')); m.export.size = [m.export.size[0] + 1, m.export.size[1]]; writeFileSync(p, JSON.stringify(m, null, 2)); });
  check(n6.code === 1 && /dimensão diferente/.test(n6.out), 'controle negativo: dimensão declarada diferente da dos PNG reprova', n6.out.slice(-300));

  // MP4 (WebCodecs): o sidecar declara que não há alfa e traz o hash do arquivo
  let mp4ok = true; try { render(['--out', vid, '--format', 'mp4', '--scale', '0.25', '--end', '5', '--quality', 'low']); } catch (e) { mp4ok = false; console.log('  --   render MP4 indisponível neste navegador: casos de MP4 pulados'); }
  if (mp4ok) {
    const v0 = ver(vid);
    check(v0.code === 0 && /SHA-256 do MP4 bate/.test(v0.out) && /não tem alfa/.test(v0.out), 'MP4: arquivo, bytes e SHA-256 conferem, e o manifesto declara que não há alfa', v0.out.slice(-300));
    const m1 = mut(vid, 'neg-mp4', d => { const p = join(d, readdirSync(d).find(f => f.endsWith('.mp4'))), b = readFileSync(p); b[b.length - 5] ^= 0xff; writeFileSync(p, b); });
    check(m1.code === 1 && /SHA-256 do MP4 não bate/.test(m1.out), 'controle negativo: MP4 adulterado reprova', m1.out.slice(-300));
    const m2 = mut(vid, 'neg-mp4a', d => { const p = join(d, readdirSync(d).find(f => f.endsWith('.manifest.json'))), m = JSON.parse(readFileSync(p, 'utf8')); m.alpha = true; writeFileSync(p, JSON.stringify(m, null, 2)); });
    check(m2.code === 1 && /alpha: false/.test(m2.out), 'controle negativo: manifesto que promete alfa em MP4 reprova', m2.out.slice(-300));
  }
} catch (e) { bad('exceção: ' + (e.message || e) + String(e.stdout || '').slice(0, 300)); }
console.log(fail ? `\n${fail} falha(s).` : '\nverificação de export ok.');
process.exit(fail ? 1 : 0);
