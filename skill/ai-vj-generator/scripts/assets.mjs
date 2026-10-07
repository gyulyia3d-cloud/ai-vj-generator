// Embute imagens e fontes de uma pasta dentro de project.assets (data URLs), para o HTML viajar sozinho.
//   pasta/logos/*.png|svg   → logos: o motor tira o fundo e converte para branco com alpha ao abrir
//   pasta/**/*.png|jpg|webp → imagens (usadas por media / media2 nas camadas, ou K.img('arquivo.png') no código)
//   pasta/**/*.ttf|otf|woff|woff2 → fontes (use o nome do arquivo sem extensão em "font")
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, basename } from 'node:path';

const IMG = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.gif': 'image/gif', '.svg': 'image/svg+xml' };
const FNT = { '.ttf': 'font/ttf', '.otf': 'font/otf', '.woff': 'font/woff', '.woff2': 'font/woff2' };

async function walk(dir, depth = 0) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory() && depth < 3) out.push(...await walk(p, depth + 1));
    else if (e.isFile()) out.push(p);
  }
  return out;
}

export async function collectAssets(dir, opt = {}) {
  const maxTotal = opt.maxTotal ?? 12 * 1048576, assets = {}, warnings = []; let bytes = 0;
  for (const p of (await walk(dir)).sort()) {
    const ext = extname(p).toLowerCase(), rel = relative(dir, p).split(String.fromCharCode(92)).join('/');
    const kind = IMG[ext] ? 'image' : FNT[ext] ? 'font' : null; if (!kind) { warnings.push(`ignorado (formato não suportado): ${rel}`); continue; }
    const buf = await readFile(p); bytes += buf.length;
    const mime = IMG[ext] || FNT[ext];
    const key = kind === 'font' ? basename(p, ext).replace(/[^\w -]/g, '') : basename(p);
    if (assets[key]) warnings.push(`nome repetido, o último vence: ${key}`);
    assets[key] = { kind, data: `data:${mime};base64,${buf.toString('base64')}` };
    if (kind === 'image' && (/(^|\/)logos?(\/|$)/i.test(rel) || /^logo/i.test(basename(p)))) assets[key].logo = true;
    if (kind === 'image' && buf.length > 3 * 1048576) warnings.push(`imagem pesada (${(buf.length / 1048576).toFixed(1)} MB): ${rel}. Reduza para ≤ 2400 px no maior lado.`);
  }
  if (bytes > maxTotal) warnings.push(`arquivos somam ${(bytes / 1048576).toFixed(1)} MB (limite recomendado ${maxTotal / 1048576} MB; o Artifact aceita 16 MB por página, e o base64 pesa +33%).`);
  return { assets, bytes, warnings };
}
