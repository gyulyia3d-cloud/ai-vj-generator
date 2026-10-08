#!/usr/bin/env node
// Gera as miniaturas da biblioteca ISF (skill/ai-vj-generator/isf-library/thumbs/<id>.jpg): renderiza cada shader no motor, em 37% do loop.
// Uso: node scripts/isf-thumbs.mjs [--chrome caminho]   Depois: node scripts/embed-isf.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from '../skill/ai-vj-generator/scripts/cdp.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const SK = join(ROOT, 'skill', 'ai-vj-generator');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const man = JSON.parse(readFileSync(join(SK, 'isf-library', 'manifest.json'), 'utf8'));
const tmp = mkdtempSync(join(tmpdir(), 'aivj-thumbs-'));
const project = { schema: 'ai-vj-generator/2', id: 'thumbs', seed: 3, meta: { name: 'THUMBS', brief: 'x', lang: 'pt' }, canvas: { w: 256, h: 144, fps: 30, target: 'screen' },
  time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#F2F2F2', secondary: '#7A8896', accent: '#E8742A' },
  compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F' }] }] };
writeFileSync(join(tmp, 'p.json'), JSON.stringify(project));
execFileSync(process.execPath, [join(SK, 'scripts', 'make-artifact.mjs'), join(tmp, 'p.json'), '--out', join(tmp, 'p.html')], { stdio: 'pipe' });
const page = await openPage(join(tmp, 'p.html'), { chrome, width: 1200, height: 800 });
mkdirSync(join(SK, 'isf-library', 'thumbs'), { recursive: true });
try {
  for (let i = 0; i < 80; i++) { if (await page.evaluate('!!(window.AIVJ && window.AIVJ.isf)').catch(() => false)) break; await new Promise(r => setTimeout(r, 250)); }
  let n = 0;
  for (const it of man.items) {
    const b64 = await page.evaluate(`(() => { const A = AIVJ, P = A.project, c = P.compositions[0]; c.layers.length = 1;
      if (!A.isf.add(${JSON.stringify(it.id)})) return ''; const F = Math.round(P.time.bars * 4 * 60 / P.time.bpm * P.canvas.fps);
      const im = A.renderFrame(0, Math.round(F * 0.37), 0.5, true), cv = document.createElement('canvas'); cv.width = im.width; cv.height = im.height;
      cv.getContext('2d').putImageData(im, 0, 0); return cv.toDataURL('image/jpeg', 0.62).split(',')[1]; })()`);
    if (!b64) { console.log('sem miniatura: ' + it.id); continue; }
    writeFileSync(join(SK, 'isf-library', 'thumbs', it.id + '.jpg'), Buffer.from(b64, 'base64')); n++;
  }
  console.log(n + ' miniaturas');
} finally { await page.close(); }
