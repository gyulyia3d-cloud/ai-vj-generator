#!/usr/bin/env node
// Verificador de export (fase 16): confere uma entrega contra o próprio MANIFEST.json, sem o motor e sem rede.
//   node scripts/verify_export.mjs <pasta | parte.zip ...> [--quiet]
// Aceita uma pasta (sequência extraída ou saída do render.mjs) ou todas as partes .zip de um export (o ZIP do motor é gravado sem compressão).
// Confere: manifesto legível; hash do project.json; quadros contíguos e na quantidade declarada; SHA-256, tamanho em bytes e dimensões de cada PNG (manifesto v2);
// honestidade do alfa MEDIDA NOS PIXELS (export opaco tem de ter alfa 255 em tudo; export com alfa só é avisado se nenhum quadro amostrado tiver transparência);
// MP4: arquivo, bytes, SHA-256 e a declaração de que não há alfa. Sai com 1 se algo reprovar; avisos não reprovam.
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, resolve, extname, basename } from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { inflateSync, inflateRawSync } from 'node:zlib';

const sha = b => createHash('sha256').update(b).digest('hex');

/* ---------- entrada: pasta ou ZIPs (STORE ou deflate) viram um mapa caminho -> leitor de bytes ---------- */
function walk(dir, base = '') { const o = []; for (const n of readdirSync(dir)) { const p = join(dir, n), rel = base ? base + '/' + n : n; if (statSync(p).isDirectory()) o.push(...walk(p, rel)); else o.push([rel, () => readFileSync(p)]); } return o; }
function readZip(buf) {
  let e = buf.length - 22; while (e >= 0 && buf.readUInt32LE(e) !== 0x06054b50) e--; if (e < 0) throw new Error('ZIP sem diretório central');
  const n = buf.readUInt16LE(e + 10); let p = buf.readUInt32LE(e + 16); const out = [];
  for (let i = 0; i < n; i++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error('diretório central inválido');
    const method = buf.readUInt16LE(p + 10), csize = buf.readUInt32LE(p + 20), nl = buf.readUInt16LE(p + 28), xl = buf.readUInt16LE(p + 30), cl = buf.readUInt16LE(p + 32), off = buf.readUInt32LE(p + 42), name = buf.toString('utf8', p + 46, p + 46 + nl);
    p += 46 + nl + xl + cl; if (name.endsWith('/')) continue;
    out.push([name, () => { const lh = off, l2 = buf.readUInt16LE(lh + 26), x2 = buf.readUInt16LE(lh + 28), d = buf.subarray(lh + 30 + l2 + x2, lh + 30 + l2 + x2 + csize); return method === 0 ? d : inflateRawSync(d); }]);
  }
  return out;
}

/* ---------- PNG: cabeçalho e canal alfa (8 bits, sem entrelaçamento: o que o canvas grava) ---------- */
function pngInfo(buf, wantAlpha) {
  if (buf.length < 33 || buf.readUInt32BE(0) !== 0x89504e47) throw new Error('não é PNG');
  const w = buf.readUInt32BE(16), h = buf.readUInt32BE(20), depth = buf[24], ct = buf[25], il = buf[28], r = { w, h, depth, colorType: ct, alphaMin: 255, alphaMax: 255, alpha: ct === 6 || ct === 4 };
  if (!wantAlpha || !r.alpha) return r;
  if (depth !== 8 || il !== 0) { r.alphaMin = r.alphaMax = null; return r; }
  const idat = []; for (let p = 8; p < buf.length;) { const len = buf.readUInt32BE(p), t = buf.toString('ascii', p + 4, p + 8); if (t === 'IDAT') idat.push(buf.subarray(p + 8, p + 8 + len)); if (t === 'IEND') break; p += 12 + len; }
  const raw = inflateSync(Buffer.concat(idat)), bpp = ct === 6 ? 4 : 2, stride = w * bpp, cur = Buffer.alloc(stride), prev = Buffer.alloc(stride);
  let lo = 255, hi = 0;
  for (let y = 0; y < h; y++) {
    const f = raw[y * (stride + 1)], row = raw.subarray(y * (stride + 1) + 1, (y + 1) * (stride + 1));
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0; let v = row[i];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1; else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      cur[i] = v & 255;
    }
    for (let x = bpp - 1; x < stride; x += bpp) { const v = cur[x]; if (v < lo) lo = v; if (v > hi) hi = v; }
    cur.copy(prev);
  }
  r.alphaMin = lo; r.alphaMax = hi; return r;
}

/* ---------- verificação ---------- */
export function verify(entries) {
  const res = [], pass = m => res.push({ s: 'ok', m }), fail = m => res.push({ s: 'ERRO', m }), warn = m => res.push({ s: 'aviso', m });
  const files = new Map(entries); const names = [...files.keys()];
  const mn = names.find(n => /(^|\/)MANIFEST\.json$/.test(n)) || names.find(n => /\.manifest\.json$/.test(n));
  if (!mn) { fail('MANIFEST.json não encontrado na entrega'); return res; }
  let M; try { M = JSON.parse(files.get(mn)().toString('utf8')); } catch (e) { fail('MANIFEST.json ilegível: ' + e.message); return res; }
  const v2 = M.schema === 'ai-vj-generator/export-manifest/2', v1 = M.schema === 'ai-vj-generator/export-manifest/1';
  if (!v1 && !v2) { fail('esquema de manifesto desconhecido: ' + M.schema); return res; }
  pass(`manifesto lido (${M.schema}, motor ${M.engine})`);
  const root = mn.includes('/') ? mn.slice(0, mn.lastIndexOf('/') + 1) : '';

  if (M.kind === 'mp4') return verifyMp4(M, files, names, mn, res, pass, fail, warn);

  /* hash do projeto */
  const pj = names.find(n => /(^|\/)project\.json$/.test(n));
  if (!pj) warn('project.json ausente: o hash do projeto não foi conferido');
  else { let h; try { h = sha(Buffer.from(JSON.stringify(JSON.parse(files.get(pj)().toString('utf8'))))); } catch (e) { h = null; } h === M.project.sha256 ? pass('project.json bate com o SHA-256 do manifesto') : fail(`project.json não bate com o manifesto (${h && h.slice(0, 12)} ≠ ${String(M.project.sha256).slice(0, 12)})`); }

  /* quadros de sequência: pelos nomes (v1/v2) e pela lista do manifesto (v2) */
  const pngs = names.filter(n => /\.png$/i.test(n) && !/(^|\/)PREVIEW\//.test(n));
  const folders = new Map(); for (const n of pngs) { const d = n.includes('/') ? n.slice(0, n.lastIndexOf('/')) : ''; const m = /(\d+)\.png$/i.exec(n); if (!m) { warn('PNG sem número de quadro: ' + n); continue; } (folders.get(d) || folders.set(d, []).get(d)).push(+m[1]); }
  const E = M.export || {}, want = E.frames, startN = E.start;
  let seqOk = true;
  for (const [d, nums] of folders) {
    nums.sort((a, b) => a - b); const gaps = []; for (let i = 1; i < nums.length; i++) if (nums[i] !== nums[i - 1] + 1) gaps.push(nums[i - 1] + 1 + (nums[i] - nums[i - 1] > 2 ? '…' + (nums[i] - 1) : ''));
    if (gaps.length) { seqOk = false; fail(`${d || '.'}: faltam quadros (${gaps.slice(0, 4).join(', ')})`); }
    if (want != null && nums.length !== want) { seqOk = false; fail(`${d || '.'}: ${nums.length} quadros, o manifesto declara ${want}`); }
    if (startN != null && nums[0] !== startN) { seqOk = false; fail(`${d || '.'}: começa no quadro ${nums[0]}, o manifesto declara ${startN}`); }
  }
  if (!folders.size) { seqOk = false; fail('nenhum PNG de sequência encontrado'); }
  if (seqOk) pass(`${pngs.length} PNG em ${folders.size} pasta(s): quadros contíguos e na quantidade declarada${want != null ? ` (${want} por pasta)` : ''}`);

  /* v2: hash e bytes de cada arquivo declarado */
  if (v2) {
    const list = M.frames || []; let miss = 0, badSha = 0, badBytes = 0, nullSha = 0;
    for (const f of list) {
      const key = names.find(n => n === f.file || n === root + f.file || n.endsWith('/' + f.file)); if (!key) { miss++; continue; }
      const b = files.get(key)(); if (f.bytes != null && b.length !== f.bytes) badBytes++; if (f.sha256 == null) nullSha++; else if (sha(b) !== f.sha256) badSha++;
    }
    miss ? fail(`${miss} arquivo(s) do manifesto não estão na entrega (partes faltando?)`) : pass(`os ${list.length} arquivos do manifesto estão na entrega`);
    badBytes ? fail(`${badBytes} arquivo(s) com tamanho diferente do manifesto`) : pass('tamanhos em bytes batem com o manifesto');
    if (nullSha === list.length && list.length) warn('o manifesto não traz SHA-256 por arquivo (gerado sem crypto.subtle): integridade por arquivo não conferida');
    else badSha ? fail(`${badSha} arquivo(s) com SHA-256 diferente do manifesto`) : pass('SHA-256 de todos os quadros bate com o manifesto');
    if (list.length < pngs.length) warn(`${pngs.length - list.length} PNG na entrega não constam no manifesto`);
  } else warn('manifesto v1: sem hash por arquivo; só contagem, nomes e hash do projeto foram conferidos');

  /* dimensões e alfa medidos nos pixels: primeiro, meio e último de cada pasta */
  const size = E.size; let dimBad = 0, opaqueBad = 0, seen = 0, transparentSeen = 0; const alphaDecl = !!(M.alpha ? M.alpha.declared : E.alpha);
  for (const [d, nums] of folders) {
    const pick = [...new Set([0, nums.length >> 1, nums.length - 1])].map(i => nums[i]);
    for (const k of pick) {
      const n = pngs.find(x => (x.includes('/') ? x.slice(0, x.lastIndexOf('/')) : '') === d && +/(\d+)\.png$/i.exec(x)[1] === k); if (!n) continue;
      let info; try { info = pngInfo(files.get(n)(), true); } catch (e) { fail(`${n}: PNG ilegível (${e.message})`); continue; }
      seen++; if (size && (info.w !== size[0] || info.h !== size[1])) dimBad++;
      if (info.alphaMin === null) { warn(`${n}: PNG fora do formato 8 bits sem entrelaçamento, alfa não medido`); continue; }
      if (info.alphaMin < 255) transparentSeen++;
      if (!alphaDecl && info.alphaMin < 255) opaqueBad++;
    }
  }
  size ? (dimBad ? fail(`${dimBad} quadro(s) amostrado(s) com dimensão diferente de ${size.join('×')}`) : pass(`dimensões ${size.join('×')} conferidas em ${seen} quadros amostrados`)) : warn('manifesto sem tamanho de export');
  if (!alphaDecl) opaqueBad ? fail(`export declarado OPACO, mas ${opaqueBad} quadro(s) amostrado(s) têm pixels transparentes`) : pass('export opaco: alfa 255 em todos os pixels amostrados');
  else transparentSeen ? pass(`export com alfa: ${transparentSeen} de ${seen} quadros amostrados têm transparência medida`) : warn('export declarado com alfa, mas nenhum quadro amostrado tem pixel transparente (a arte pode cobrir o quadro todo)');
  return res;
}

function verifyMp4(M, files, names, mn, res, pass, fail, warn) {
  const f = M.file, key = names.find(n => n === f || n.endsWith('/' + f));
  if (!key) { fail(`arquivo MP4 ${f} não está na entrega`); return res; }
  const b = files.get(key)();
  b.length === M.bytes ? pass(`MP4 com ${b.length} bytes, como declarado`) : fail(`MP4 com ${b.length} bytes, o manifesto declara ${M.bytes}`);
  sha(b) === M.sha256 ? pass('SHA-256 do MP4 bate com o manifesto') : fail('SHA-256 do MP4 não bate com o manifesto');
  b.subarray(4, 8).toString('ascii') === 'ftyp' ? pass('contêiner MP4 (ftyp) reconhecido') : fail('o arquivo não começa com ftyp: não é MP4');
  M.alpha === false || (M.alpha && M.alpha.declared === false) ? pass('o manifesto declara que o MP4 não tem alfa (honesto: H.264 não garante transparência)') : fail('o manifesto de MP4 tem de declarar alpha: false');
  return res;
}

/* ---------- linha de comando ---------- */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const a = process.argv.slice(2).filter(x => !x.startsWith('--')), quiet = process.argv.includes('--quiet');
  if (!a.length) { console.error('uso: node scripts/verify_export.mjs <pasta | parte.zip ...> [--quiet]'); process.exit(2); }
  let entries = [];
  for (const x of a) { const p = resolve(x), st = statSync(p); if (st.isDirectory()) entries.push(...walk(p)); else if (extname(p).toLowerCase() === '.zip') entries.push(...readZip(readFileSync(p))); else entries.push([basename(p), () => readFileSync(p)]); }
  const res = verify(entries); let bad = 0;
  for (const r of res) { if (r.s === 'ERRO') bad++; if (!quiet || r.s !== 'ok') console.log(`  ${r.s.padEnd(5)} ${r.m}`); }
  console.log(bad ? `\n${bad} problema(s): a entrega NÃO confere com o manifesto.` : '\nentrega confere com o manifesto.');
  process.exit(bad ? 1 : 0);
}
