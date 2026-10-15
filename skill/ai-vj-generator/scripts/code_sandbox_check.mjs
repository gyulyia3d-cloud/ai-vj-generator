#!/usr/bin/env node
// Teste do isolamento da camada `code` (P0.3): o código do usuário roda no mesmo contexto da página, então o que ele ALCANÇA é a fronteira de segurança.
// 1) Oráculo de alcance: dentro da camada, um passeio pelo grafo de objetos a partir de c, K e Math não pode achar window, nó do DOM nem os construtores de função reais.
// 2) Ataques conhecidos: `.constructor` montado por concatenação (o filtro de texto não vê), c.canvas.ownerDocument.defaultView, construtores async/gerador.
// 3) Controle negativo do oráculo: o mesmo passeio, sem o isolamento, TEM de achar o vazamento (senão o teste não prova nada).
// 4) Controle positivo: o código legítimo (K.bCenter, c.fillRect, K.t) continua desenhando.
//   node code_sandbox_check.mjs [--chrome caminho]     Sai com 1 se falhar; 3 se não houver navegador.
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { openPage } from './cdp.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const argv = process.argv.slice(2), chrome = argv.includes('--chrome') ? argv[argv.indexOf('--chrome') + 1] : undefined;
let fail = 0;
const ok = m => console.log('  ok   ' + m), bad = m => { fail++; console.log('  ERRO ' + m); };
const check = (c, good, why) => c ? ok(good) : bad(good + ' :: ' + why);

const page = await openPage(join(HERE, '..', 'assets', 'engine.html'), { chrome, width: 900, height: 600, waitFor: '!!(window.AIVJ && window.AIVJ.renderFrame && window.AIVJ.compileCode)' });
const E = s => page.evaluate(s);

/* passeio pelo grafo; vale tanto dentro da camada (via concatenação, como um atacante) quanto fora dela (controle negativo) */
const WALK = `(root) => {
  const GP = Object['getPrototyp' + 'eOf'], N = Object.getOwnPropertyNames, FP = GP(function () {});
  const FN = 'Func' + 'tion', PT = 'proto' + 'type', WD = 'win' + 'dow', SF = 'se' + 'lf';   /* sem as palavras que o filtro de texto recusa: o atacante também as monta */
  const NAMES = [FN, 'Async' + FN, 'Generator' + FN, 'AsyncGenerator' + FN];
  const bad = o => { try {
    if (o === null || (typeof o !== 'object' && typeof o !== 'function')) return '';
    if (o[WD] === o || o[SF] === o) return 'janela';
    if (typeof o.nodeType === 'number') return 'no-do-dom';
    if (typeof o === 'function' && NAMES.includes(o.name) && o[PT] && (o[PT] === FP || GP(o[PT]) === FP)) return 'construtor-' + o.name;
    return '';
  } catch (e) { return ''; } };
  const hits = [], seen = new Set([root]), q = [[root, 'raiz']]; let n = 0;
  while (q.length && n < 30000) {
    const [o, path] = q.shift(); n++;
    const b = bad(o); if (b) { hits.push(path + ' = ' + b); continue; }
    let keys = [], p = o; for (let d = 0; p && d < 8; d++) { try { keys = keys.concat(N(p)); } catch (e) {} p = GP(p); }
    const pr = GP(o); if (pr && !seen.has(pr)) { seen.add(pr); q.push([pr, path + '.<proto>']); }
    for (const k of keys) { if (k === 'caller' || k === 'callee' || k === 'arguments') continue; let v; try { v = o[k]; } catch (e) { continue; }
      if (v && (typeof v === 'object' || typeof v === 'function') && !seen.has(v)) { seen.add(v); q.push([v, path + '.' + k]); } }
  }
  return { hits: hits.slice(0, 6), n };
}`;
const ATTACKS = `
  const hits = [], R = (nome, f) => { try { const r = f(); if (r && (r['win' + 'dow'] === r || typeof r.nodeType === 'number')) hits.push(nome); } catch (e) {} };
  const C = 'constr' + 'uctor';
  R('construtor de função por concatenação', () => (() => 1)[C]('return this')());
  R('construtor de método do kit', () => K.ease.out[C]('return this')());
  R('construtor de array', () => [].map[C]('return this')());
  R('construtor async', () => (async () => 1)[C]('return this')());
  R('construtor de gerador', () => (function* () {})[C]('return this')());
  R('c.canvas até a janela', () => c['can' + 'vas']['owner' + 'Document']['default' + 'View']);
  R('c.canvas.parentNode', () => c['can' + 'vas']['parent' + 'Node']);
  R('classe', () => (class {})[C]('return this')());
`;
const run = async (src, label) => {
  await E(`(() => { const A = AIVJ; A.importJson(JSON.stringify({ schema: 'ai-vj-generator/2', id: 'sb', seed: 3, meta: { name: 'SB', brief: 'x', lang: 'pt' }, canvas: { w: 192, h: 108, fps: 30, target: 'screen' }, time: { bpm: 120, bars: 1 },
    palette: { bg: '#000000', primary: '#FFFFFF', secondary: '#808080', accent: '#FFFFFF' }, compositions: [{ name: 'A', hypothesis: 'x', layers: [{ type: 'bg', name: 'F', on: true, opacity: 1, blend: 'normal', p: {} }, { type: 'code', name: 'K', on: true, opacity: 1, blend: 'normal', p: { src: ${JSON.stringify(src)} } }] }] }));
    A.state.codeAllow = true; A.LAYERERR.clear(); return 1; })()`);
  const px = JSON.parse(await E(`(() => { const im = AIVJ.renderFrame(0, 0, 1, true), i = (54 * im.width + 96) * 4; return JSON.stringify({ rgba: [im.data[i], im.data[i + 1], im.data[i + 2]], errs: AIVJ.layerErrors().map(String) }); })()`));
  return px;
};
try {
  /* 3) o oráculo precisa enxergar um vazamento de verdade: o contexto 2D cru dá c.canvas.ownerDocument.defaultView */
  const neg = await E(`(() => { const w = ${WALK}; const cx = document.createElement('canvas').getContext('2d'); return JSON.stringify(w(cx)); })()`);
  const negR = JSON.parse(neg);
  check(negR.hits.some(h => /no-do-dom/.test(h)), 'controle negativo: o passeio acha o nó do DOM (c.canvas) no contexto 2D cru, sem a fachada', JSON.stringify(negR.hits));
  const fnWalk = await E(`(() => { const w = ${WALK}; return JSON.stringify(w({ f: Function })); })()`);
  check(JSON.parse(fnWalk).hits.some(h => /construtor-Function/.test(h)), 'controle negativo: o passeio acha o construtor Function real', fnWalk);

  /* 1) alcance a partir de c, K e Math, de dentro da camada */
  const reach = await run(`const walk = ${WALK}; const out = []; for (const [nome, raiz] of [['c', c], ['K', K], ['Math', Math]]) { const r = walk(raiz); for (const h of r.hits) out.push(nome + ':' + h); out.push('n' + nome + '=' + r.n); }
    const bad = out.filter(x => x.indexOf('=') > 0 && x[0] !== 'n'); throw new Error((bad.length ? 'SANDBOX_VAZOU ' + JSON.stringify(bad) : 'SANDBOX_OK ' + out.join(' ')));`);
  const e1 = reach.errs.find(s => /SANDBOX_/.test(s)) || '(sem resultado: ' + reach.errs.join(' | ').slice(0, 200) + ')';
  check(/SANDBOX_OK/.test(e1), 'oráculo de alcance: de c, K e Math não se chega à janela, a nó do DOM nem a construtor de função real', e1.slice(0, 600));

  /* 2) ataques conhecidos */
  const att = await run(`${ATTACKS} throw new Error(hits.length ? 'SANDBOX_VAZOU ' + hits.join(' | ') : 'SANDBOX_OK');`);
  const e2 = att.errs.find(s => /SANDBOX_/.test(s)) || '(sem resultado: ' + att.errs.join(' | ').slice(0, 200) + ')';
  check(/SANDBOX_OK/.test(e2), 'ataques por concatenação, c.canvas e construtores async/gerador não saem da camada', e2.slice(0, 600));

  /* 4) o código legítimo continua desenhando */
  const good = await run(`c.fillStyle = '#ff0000'; c.fillRect(0, 0, K.w, K.h); K.bCenter(c, 'OK', K.w / 2, K.h / 2, K.w * 0.5, K.h * 0.4, '#ffffff', {});`);
  check(!good.errs.length && good.rgba[0] > 200, 'controle positivo: fillRect, K.bCenter e K.w funcionam (sem erro, pixel vermelho)', JSON.stringify(good));

  /* o filtro de texto continua valendo como primeira barreira */
  const lint = JSON.parse(await E(`JSON.stringify(['(()=>1).constructor("x")', 'window.x=1', 'Math.random()'].map(s => AIVJ.lintCode(s).length))`));
  check(lint.every(n => n > 0), 'o filtro de texto continua recusando constructor, window e Math.random escritos por extenso', JSON.stringify(lint));
} catch (e) { bad('exceção: ' + (e.message || e)); }
await page.close();
console.log(fail ? `\n${fail} falha(s).` : '\nIsolamento da camada code ok.');
process.exit(fail ? 1 : 0);
