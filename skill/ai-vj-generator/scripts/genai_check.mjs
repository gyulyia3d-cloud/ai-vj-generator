#!/usr/bin/env node
// Paridade do gerador sem IA: o brief_to_project.py (Python) e o GENAI (JavaScript do motor) têm de produzir o MESMO projeto, campo a campo,
// para os 12 climas, os 8 briefs da galeria e casos de borda (título/legenda/dados, perfil de movimento, paleta exata, denso, 6 composições, sem clima, seed).
// Também confere que o brief inválido é recusado com mensagem em português, e que há controle negativo (um campo alterado é detectado).
//   node genai_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url)), GAL = join(HERE, '..', '..', '..', 'examples', 'gallery');
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
const tmp = mkdtempSync(join(tmpdir(), 'aivj-genai-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const MOODS = ['industrial', 'organic', 'cosmic', 'urban', 'ritual', 'glitch', 'minimal', 'liquid', 'crystalline', 'retro', 'aggressive', 'calm'];
const cases = [];
MOODS.forEach((mood, k) => cases.push([`clima ${mood}`, { name: 'Teste ' + mood, lang: k % 2 ? 'pt' : 'en', concept: 'A piece about ' + mood + ' made to test the generator end to end.', mood: [mood], energy: (k % 5) / 4,
  surface: { type: ['led', 'screen', 'projection'][k % 3], w: [1920, 1080, 4500][k % 3], h: [1080, 1920, 800][k % 3], fps: 30 }, time: { bpm: 100 + k * 3, bars: [4, 2, 8][k % 3] }, compositions: 2 + (k % 3) }]));
if (existsSync(GAL)) for (const f of readdirSync(GAL).filter(f => f.endsWith('.brief.json'))) cases.push(['galeria ' + f.replace('.brief.json', ''), JSON.parse(readFileSync(join(GAL, f), 'utf8'))]);
const base = { name: 'Borda', lang: 'pt', concept: 'Uma peça de borda para testar caminhos raros do gerador.', surface: { type: 'screen', w: 1920, h: 1080 }, time: { bpm: 120 } };
cases.push(['sem clima, sem energia', base]);
cases.push(['título + legenda + dados + círculo', { ...base, mood: ['minimal'], text: { title: 'Vão', caption: 'três telas', data: '120 BPM', path: 'circle' } }]);
cases.push(['palavras (typewall)', { ...base, mood: ['urban', 'aggressive'], text: { words: ['SINAL', 'PRESSÃO'] }, compositions: 4 }]);
cases.push(['perfil de movimento sobrescrito', { ...base, mood: ['liquid'], motionProfile: { elasticity: 0.95, anticipation: 0.7, continuity: 0.2, rhythm: 1 }, time: { bpm: 90, bars: 16 } }]);
cases.push(['paleta exata, white-alpha, seed', { ...base, mood: ['cosmic'], palette: { colors: ['#000000', '#FFFFFF', '#888888', '#FF8800'] }, output: { mode: 'white-alpha' }, seed: 4242 }]);
cases.push(['denso, 6 composições, três climas', { ...base, mood: ['glitch', 'retro', 'crystalline'], density: 'dense', energy: 1, compositions: 6, surface: { type: 'led', w: 4500, h: 2160, folds: [2250], pitchMm: 3.9, viewingDistanceM: [8, 40] } }]);
cases.push(['esparso, matiz e esquema do brief, áudio none', { ...base, mood: ['calm'], density: 'sparse', palette: { hue: 12.5, scheme: 'tetrad' }, audio: { strategy: 'none', reason: 'peça muda' }, banned: ['glow', 'flare'], focalEvent: 'um círculo que respira' }]);
cases.push(['superfície multi vertical', { ...base, mood: ['industrial'], surface: { type: 'multi', w: 540, h: 1920, fps: 60 }, time: { bpm: 175, bars: 1 }, energy: 0.35 }]);

const diff = (a, b, path = '$') => {
  if (a === b) return null;
  if (typeof a !== typeof b || a === null || b === null || typeof a !== 'object') return `${path}: py=${JSON.stringify(a)} js=${JSON.stringify(b)}`;
  if (Array.isArray(a) !== Array.isArray(b)) return `${path}: tipo diferente`;
  const ks = new Set([...Object.keys(a), ...Object.keys(b)]);
  for (const k of ks) { if (!(k in a)) return `${path}.${k}: só no JS`; if (!(k in b)) return `${path}.${k}: só no Python`; const d = diff(a[k], b[k], `${path}.${k}`); if (d) return d; }
  return null;
};

const py = [];
for (const [i, [name, brief]] of cases.entries()) {
  const bf = join(tmp, `b${i}.json`), pf = join(tmp, `p${i}.json`); writeFileSync(bf, JSON.stringify(brief));
  try { execFileSync('python', [join(HERE, 'brief_to_project.py'), bf, '--out', pf], { stdio: 'pipe' }); py.push(JSON.parse(readFileSync(pf, 'utf8'))); } catch (e) { py.push(null); bad(`${name}: o Python falhou: ${String(e.stderr || e.stdout).slice(0, 200)}`); }
}
const json = join(tmp, 'p.aivj.json'), html = join(tmp, 'p.html');
writeFileSync(json, JSON.stringify({ schema: 'ai-vj-generator/2', id: 'g', seed: 1, meta: { name: 'G', brief: 'x', lang: 'pt' }, canvas: { w: 640, h: 360, fps: 30 }, time: { bpm: 120, bars: 4 }, palette: { bg: '#000000', primary: '#E8E8E8', secondary: '#808890', accent: '#E19000' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', role: 'x' }] }] }));
execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), json, '--out', html], { stdio: 'pipe' });
const page = await openPage(html, { chrome, width: 900, height: 600 });
try {
  const js = JSON.parse(await page.evaluate(`(() => { const out = []; for (const b of ${JSON.stringify(cases.map(c => c[1]))}) { try { out.push(AIVJ.GENAI.build(b)); } catch (e) { out.push({ error: String(e.message) }); } } return JSON.stringify(out); })()`));
  for (const [i, [name]] of cases.entries()) { if (!py[i]) continue; const d = diff(py[i], js[i]); check(!d, `paridade Python = JavaScript: ${name}`, d); }
  const mut = JSON.parse(JSON.stringify(js[0])); mut.compositions[0].layers[3].p.audio = 0.99;
  check(diff(py[0], mut) !== null, 'controle negativo: um parâmetro alterado é apontado pela comparação', 'comparação cega');
  const inv = JSON.parse(await page.evaluate(`(() => { try { AIVJ.GENAI.build({ name: 'x', concept: 'curto', surface: { w: 10, h: 1080 }, time: { bpm: 500 } }); return JSON.stringify({ ok: true }); } catch (e) { return JSON.stringify({ msg: e.message }); } })()`));
  check(inv.msg && /conceito/.test(inv.msg) && /largura/.test(inv.msg) && /BPM/.test(inv.msg), 'brief inválido é recusado com mensagens em português', JSON.stringify(inv));
  const r = JSON.parse(await page.evaluate(`(() => { const P = AIVJ.GENAI.build(${JSON.stringify(cases[1][1])}); AIVJ.importJson(JSON.stringify(P)); AIVJ.LAYERERR.clear(); const d = AIVJ.renderFrame(0, 20, 0.3, true).data; let lit = 0; for (let i = 3; i < d.length; i += 4) if (d[i] > 0) lit++; return JSON.stringify({ lit, err: [...AIVJ.LAYERERR.values()], comps: AIVJ.project.compositions.length }); })()`));
  check(r.lit > 0 && !r.err.length, 'o projeto gerado no navegador abre e desenha sem erro de camada', JSON.stringify(r));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\ngerador do navegador ok.');
process.exit(fail ? 1 : 0);
