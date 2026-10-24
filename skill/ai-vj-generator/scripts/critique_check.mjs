#!/usr/bin/env node
// Teste da crítica (fase 15): três eixos separados (estrutural, artístico, técnico) e falhas críticas, só com controles fabricados.
// Cada defeito é fabricado para cair no eixo e na falha certos; cada controle negativo mostra que o mesmo projeto sem o defeito não é reprovado.
//   node critique_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { execFileSync, spawnSync } from 'node:child_process';
import { mkdtempSync, writeFileSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chromeArg = argv.includes('--chrome') ? ['--chrome', argv[argv.indexOf('--chrome') + 1]] : [], chrome = chromeArg[1];
const tmp = mkdtempSync(join(tmpdir(), 'aivj-crit-'));
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);
const crit = (proj, name, extra = ['--no-flash']) => {
  const f = join(tmp, name + '.aivj.json'); writeFileSync(f, JSON.stringify(proj));
  const r = spawnSync(process.execPath, [join(HERE, 'critique.mjs'), f, '--json', '--lang', 'pt', ...extra, ...chromeArg], { encoding: 'utf8', maxBuffer: 1 << 28 });
  if (r.status === 3) { console.log('  --   crítica pulada (sem navegador)'); process.exit(3); }
  let rep; try { rep = JSON.parse(r.stdout); } catch (e) { throw new Error(name + ': ' + (r.stderr || r.stdout).slice(0, 400)); }
  return { rep, status: r.status };
};
const ids = c => c.critical.map(x => x.id);

const brief = { name: 'Controle', lang: 'pt', concept: 'Uma peça de controle para testar a crítica com defeitos fabricados.', mood: ['organic'], energy: 0.4, density: 'balanced', surface: { type: 'screen', w: 1280, h: 720 }, time: { bpm: 100, bars: 4 }, compositions: 2 };
writeFileSync(join(tmp, 'b.json'), JSON.stringify(brief));
execFileSync('python', [join(HERE, 'brief_to_project.py'), join(tmp, 'b.json'), '--out', join(tmp, 'good.json')], { stdio: 'pipe' });
const good = JSON.parse(readFileSync(join(tmp, 'good.json'), 'utf8')), clone = o => JSON.parse(JSON.stringify(o));

/* projeto bom: três eixos, nada crítico, determinístico */
const A = crit(good, 'good', []), A2 = crit(good, 'good2', []);
const a0 = A.rep.compositions[0];
check(a0.structural && a0.artistic && a0.technical && 'total' in a0.structural && 'items' in a0.artistic && 'items' in a0.technical, 'o relatório separa ESTRUTURAL, ARTÍSTICO e TÉCNICO', Object.keys(a0).join());
check(A.rep.compositions.every(c => c.critical.length === 0) && A.rep.compositions.every(c => c.technical.score === 100), 'projeto gerado: nenhuma falha crítica e técnico 100 (determinismo, camadas, flash, validação, emenda, dimensões)', JSON.stringify(A.rep.compositions.map(c => [c.critical.map(x => x.id), c.technical.score])));
check(JSON.stringify(A.rep) === JSON.stringify(A2.rep), 'duas execuções dão o mesmo relatório (a crítica é determinística)', 'relatórios diferentes');
const evalOut = JSON.parse(execFileSync(process.execPath, [join(HERE, 'evaluate.mjs'), join(tmp, 'good.aivj.json'), '--json', ...chromeArg], { encoding: 'utf8', maxBuffer: 1 << 28 }));
check(A.rep.compositions.every((c, i) => c.structural.total === evalOut.compositions[i].total && JSON.stringify(c.structural.score) === JSON.stringify(evalOut.compositions[i].score)), 'o eixo estrutural é o avaliador de sempre, sem mudar nenhuma nota', 'notas diferentes de evaluate.mjs');
check(a0.artistic.judged >= 1 && a0.artistic.items.find(i => i.id === 'palette').judged, 'o eixo artístico julga ao menos a paleta no projeto gerado', JSON.stringify(a0.artistic.items.map(i => [i.id, i.judged])));
check(a0.artistic.needsEye.length >= 1, 'o que só o olho decide (proibições da bíblia de arte) vai para needsEye, sem nota', JSON.stringify(a0.artistic.needsEye));

/* vazio */
const empty = clone(good); empty.compositions.forEach(c => c.layers = c.layers.filter(l => l.type === 'bg'));
const E = crit(empty, 'empty');
check(E.rep.compositions.every(c => ids(c).includes('EMPTY') && c.verdict === 'FAIL') && E.status === 1, 'projeto vazio: falha crítica EMPTY, veredito FAIL e saída 1', JSON.stringify(E.rep.compositions.map(c => [ids(c), c.verdict])));

/* parado: com e sem declaração de que é parado */
const still = clone(good); still.compositions.forEach(c => { c.layers = [{ type: 'bg', name: 'FUNDO', role: 'x' }, { type: 'shape', name: 'FORMA', role: 'x', on: true, opacity: 1, p: { kind: 'circle', size: 0.3 } }]; });
const S = crit(still, 'still');
check(S.rep.compositions.every(c => ids(c).includes('FROZEN')), 'imagem parada sem declaração: falha crítica FROZEN', JSON.stringify(S.rep.compositions.map(ids)));
const stillDeclared = clone(still); stillDeclared.compositions.forEach(c => { c.layers[1].temporal = { behavior: 'still', listens: [], reason: 'peça parada de propósito' }; });
const SD = crit(stillDeclared, 'stillDecl');
check(SD.rep.compositions.every(c => !ids(c).includes('FROZEN')), 'controle negativo: a mesma imagem com comportamento "still" declarado não é FROZEN', JSON.stringify(SD.rep.compositions.map(ids)));

/* flash: um campo que pisca a 8 Hz */
const strobe = clone(good); strobe.compositions.forEach(c => c.layers.splice(1, 0, { type: 'shader', name: 'PISCA', role: 'x', on: true, opacity: 1, p: { src: 'void main(){ float f = step(0.5, fract(uPh * 64.0)); gl_FragColor = outc(vec3(f), 1.0); }' } }));
const F = crit(strobe, 'strobe', []);
check(F.rep.compositions.every(c => ids(c).includes('FLASH_HAZARD') && c.technical.items.find(i => i.id === 'flash').raw.worst > 3), 'campo piscando a 8 Hz: FLASH_HAZARD com mais de 3 flashes por segundo', JSON.stringify(F.rep.compositions.map(c => [ids(c), c.technical.items.find(i => i.id === 'flash').raw])));
check(A.rep.compositions.every(c => c.technical.items.find(i => i.id === 'flash').raw.worst <= 3), 'controle negativo: o projeto gerado fica dentro do limite de 3 por segundo', '');

/* shader quebrado */
const broken = clone(good); broken.compositions.forEach(c => c.layers.splice(1, 0, { type: 'shader', name: 'QUEBRADO', role: 'x', on: true, opacity: 1, p: { src: 'void main(){ float x = nope; gl_FragColor = outc(vec3(x), 1.0); }' } }));
const B = crit(broken, 'broken');
check(B.rep.compositions.every(c => ids(c).includes('LAYER_ERROR') && c.technical.score < 100), 'shader que não compila: falha crítica LAYER_ERROR e nota técnica abaixo de 100', JSON.stringify(B.rep.compositions.map(c => [ids(c), c.technical.score])));

/* paleta ignorada */
const garish = clone(good); garish.compositions.forEach(c => c.layers.forEach(l => { if (l.type !== 'bg' && l.type !== 'post' && l.type !== 'shader' && l.type !== 'isf') l.p = Object.assign({}, l.p, { color: '#ff00ff', accent: '#00ffff', hot: '#ffff00' }); }));
const G = crit(garish, 'garish');
const palOf = c => c.artistic.items.find(i => i.id === 'palette');
check(G.rep.compositions.some(c => palOf(c).judged && palOf(c).raw.fit < 0.25 && ids(c).includes('PALETTE_IGNORED')) && G.rep.compositions.every((c, i) => !palOf(c).judged || palOf(c).raw.fit < palOf(A.rep.compositions[i]).raw.fit), 'cores fora da paleta declarada: PALETTE_IGNORED e a medida cai em relação ao projeto gerado', JSON.stringify(G.rep.compositions.map(c => [palOf(c).raw, ids(c)])));
check(A.rep.compositions.every(c => !ids(c).includes('PALETTE_IGNORED') && palOf(c).raw.fit >= 0.6), 'controle negativo: o projeto gerado cabe na paleta (≥ 60% da tinta)', JSON.stringify(A.rep.compositions.map(c => palOf(c).raw)));

/* espaço negativo ocupado: declarar vazia a região onde está o herói */
const focalOf = c => c.artistic.items.find(i => i.id === 'focal');
const neg = clone(good), foc = clone(good);
neg.meta.compositionIR.forEach((cir, i) => { const h = focalOf(A.rep.compositions[i]); if (!h.judged) return; const c = h.raw.hero; cir.negativeSpace = [{ x: Math.max(0, c.x - 0.15), y: 0, w: 0.3, h: 1, why: 'fabricado: vazio onde está o herói' }]; });
const N = crit(neg, 'neg');
const negOf = c => c.artistic.items.find(i => i.id === 'negative');
check(N.rep.compositions.some(c => negOf(c).judged && negOf(c).raw.ratio > 1 && ids(c).includes('NEGATIVE_SPACE_FILLED')), 'região declarada vazia onde está o herói: NEGATIVE_SPACE_FILLED', JSON.stringify(N.rep.compositions.map(c => [negOf(c).raw, ids(c)])));
check(A.rep.compositions.every(c => !ids(c).includes('NEGATIVE_SPACE_FILLED')), 'controle negativo: o espaço negativo do projeto gerado não é reprovado', JSON.stringify(A.rep.compositions.map(c => negOf(c).raw)));

/* foco perdido: ponto focal declarado no canto oposto */
foc.meta.compositionIR.forEach((cir, i) => { const h = focalOf(A.rep.compositions[i]); if (!h.judged) return; cir.focalPoint = { x: h.raw.hero.x < 0.5 ? 1 : 0, y: h.raw.hero.y < 0.5 ? 1 : 0 }; });
const FO = crit(foc, 'focus');
check(FO.rep.compositions.some(c => focalOf(c).judged && focalOf(c).raw.dist > 0.5 && ids(c).includes('FOCUS_LOST')) && FO.rep.compositions.every((c, i) => !focalOf(c).judged || focalOf(c).score < focalOf(A.rep.compositions[i]).score), 'ponto focal declarado no canto oposto: FOCUS_LOST e a nota do foco cai', JSON.stringify(FO.rep.compositions.map(c => [focalOf(c).raw, ids(c)])));

/* sem intenção declarada: o que não foi declarado não é julgado (nunca vira 100) */
const bare = clone(good); ['compositionIR', 'animationIR', 'depthIR', 'creativeIR', 'surfaceIR'].forEach(k => delete bare.meta[k]);
const U = crit(bare, 'bare');
check(U.rep.compositions.every(c => ['focal', 'negative', 'arc'].every(k => !c.artistic.items.find(i => i.id === k).judged && c.artistic.items.find(i => i.id === k).score === null)), 'sem Composition IR: foco, espaço negativo e arco ficam "não julgados" (sem nota), não 100', JSON.stringify(U.rep.compositions.map(c => c.artistic.items.map(i => [i.id, i.judged]))));
check(U.rep.compositions.every(c => c.artistic.judged < c.artistic.of), 'a nota artística diz quantos itens julgou (menos que o total)', JSON.stringify(U.rep.compositions.map(c => [c.artistic.judged, c.artistic.of])));

/* não determinístico: o motor devolve um quadro diferente na segunda vez (mutação do detector) */
{
  const f = join(tmp, 'good.aivj.json'); const html = join(tmp, 'p.html');
  execFileSync(process.execPath, [join(HERE, 'make-artifact.mjs'), f, '--out', html], { stdio: 'pipe' });
  const page = await openPage(html, { chrome, width: 1200, height: 800 });
  try {
    const r = JSON.parse(await page.evaluate(`(() => { const orig = AIVJ.renderFrame; let k = 0; AIVJ.renderFrame = (ci, n, s, a) => { const im = orig(ci, n, s, a); if (s === 0.15) im.data[0] = (im.data[0] + (k++)) & 255; return im; }; try { return JSON.stringify(AIVJ.critique('pt', { flash: false }).compositions.map(c => [c.critical.map(x => x.id), c.verdict])); } finally { AIVJ.renderFrame = orig; } })()`));
    check(r.every(([c, v]) => c.includes('NONDETERMINISTIC') && v === 'FAIL'), 'quadro que muda entre duas renderizações: NONDETERMINISTIC e FAIL', JSON.stringify(r));
  } catch (e) { bad('exceção (determinismo): ' + (e.message || e)); }
  await page.close();
}

/* veredito e código de saída */
check(A.rep.compositions.every(c => c.critical.length === 0 && c.verdict !== 'FAIL') && A.status === 0, 'sem falha crítica a saída é 0', `status ${A.status}`);
console.log(fail ? `\n${fail} falha(s).` : '\ncrítica ok.');
process.exit(fail ? 1 : 0);
