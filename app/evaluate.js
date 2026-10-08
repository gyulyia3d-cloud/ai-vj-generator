/* Avaliador estrutural (fase 2, no motor desde a fase 3): nota de 0 a 100 por composição, a partir de quadros reais.
   A CLI (scripts/evaluate.mjs) e a aba Gerar chamam a mesma função: AIVJ.evaluate(lang). Edite este arquivo; node scripts/embed-modules.mjs embute no index.html.
   Mede defeitos estruturais, não beleza (references/evaluation.md). */
const EVALUATOR = (() => {
  const WEIGHTS = { hierarchy: 20, contrast: 15, density: 10, breathing: 15, motion: 15, arc: 15, repetition: 10 };
  function measure() {
    const P = AIVJ.project, S = 24, GX = 16, GY = 9, SC = Math.min(0.2, 240 / P.canvas.w);
    const clamp = (x, a = 0, b = 1) => Math.min(b, Math.max(a, x)), ss = (a, b, x) => { const t = clamp((x - a) / (b - a)); return t * t * (3 - 2 * t); };
    const band = (x, lo0, lo1, hi1, hi0) => x < lo1 ? ss(lo0, lo1, x) : x > hi1 ? 1 - ss(hi1, hi0, x) : 1;   // 0 fora de [lo0,hi0], 1 dentro de [lo1,hi1]
    const hex = h => { const m = /^#?([0-9a-f]{6})$/i.exec(h || ''); if (!m) return [0, 0, 0]; const n = parseInt(m[1], 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
    const lum = (r, g, b) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const bg = hex(P.palette && P.palette.bg), lbg = lum(bg[0], bg[1], bg[2]), LF = AIVJ.loopFrames();
    const out = [], sigs = [], dn = (P.meta && P.meta.artBible && P.meta.artBible.density) || 'balanced';
    const DB = { sparse: [0.003, 0.03, 0.22, 0.6], balanced: [0.01, 0.1, 0.4, 0.8], dense: [0.04, 0.15, 0.6, 0.95] }[dn] || [0.01, 0.1, 0.4, 0.8];
    const BB = { sparse: [0.15, 0.4, 0.97, 1.2], balanced: [0, 0.2, 0.65, 0.97], dense: [0, 0.05, 0.5, 0.9] }[dn] || [0, 0.2, 0.65, 0.97];
    P.compositions.forEach((comp, ci) => {
      // o grão do fundo é ruído novo a cada quadro: não é movimento nem desenho, então sai da medição (e volta depois)
      const oldP = comp.layers.map(L => L.p); comp.layers.forEach(L => { if (L.type === 'bg') L.p = Object.assign({}, L.p, { grain: 0 }); });
      const ink = [], cells = new Array(GX * GY).fill(0), cnt = new Array(GX * GY).fill(0);
      const ser = [], cov = [], quiet = []; let w = 0, h = 0;
      try {
        for (let k = 0; k < S; k++) {
          const im = AIVJ.renderFrame(ci, Math.floor(LF * k / S), SC, false), d = im.data; w = im.width; h = im.height;
          const I = new Float32Array(w * h); let m = 0, c = 0;
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
            const i = (y * w + x) * 4, v = Math.abs(lum(d[i], d[i + 1], d[i + 2]) - lbg), p = y * w + x; I[p] = v; m += v; if (v > 0.12) c++;
            const q = Math.min(GY - 1, Math.floor(y * GY / h)) * GX + Math.min(GX - 1, Math.floor(x * GX / w)); cells[q] += v; cnt[q]++;
          }
          ink.push(I); ser.push(m / (w * h)); cov.push(c / (w * h));
          // fração de células quietas neste quadro
          const cs = new Array(GX * GY).fill(0), cc = new Array(GX * GY).fill(0);
          for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const q = Math.min(GY - 1, Math.floor(y * GY / h)) * GX + Math.min(GX - 1, Math.floor(x * GX / w)); cs[q] += I[y * w + x]; cc[q]++; }
          quiet.push(cs.filter((v, q) => v / Math.max(1, cc[q]) < 0.1).length / (GX * GY));
        }
      } finally { comp.layers.forEach((L, i) => { L.p = oldP[i]; if (L.p === undefined) delete L.p; }); }
      const E = cells.map((v, q) => v / Math.max(1, cnt[q])), tot = E.reduce((a, b) => a + b, 0) || 1e-9;
      const top = E.slice().sort((a, b) => b - a).slice(0, Math.ceil(GX * GY * 0.1)).reduce((a, b) => a + b, 0) / tot;
      let p99max = 0; ink.forEach(I => { const s = Float32Array.from(I).sort(); p99max = Math.max(p99max, s[Math.floor(s.length * 0.99)]); });
      const meanCov = cov.reduce((a, b) => a + b, 0) / S, meanQuiet = quiet.reduce((a, b) => a + b, 0) / S;
      // movimento: diferença média entre quadros consecutivos, incluindo a emenda (último → primeiro)
      const blk = I => { const bw = Math.max(1, Math.floor(w / 40)), bh = Math.max(1, Math.floor(h / 24)), nx = Math.floor(w / bw), ny = Math.floor(h / bh), o = new Float32Array(nx * ny);
        for (let y = 0; y < ny * bh; y++) for (let x = 0; x < nx * bw; x++) o[Math.floor(y / bh) * nx + Math.floor(x / bw)] += I[y * w + x] / (bw * bh); return o; };   // média por bloco: o grão do fundo se cancela, o movimento real não
      const bl = ink.map(blk), dk = []; for (let k = 0; k < S; k++) { const A = bl[k], B = bl[(k + 1) % S]; let s = 0; for (let i = 0; i < A.length; i++) s += Math.abs(A[i] - B[i]); dk.push(s / A.length); }
      const mean = dk.reduce((a, b) => a + b, 0) / S, med = dk.slice().sort((a, b) => a - b)[S >> 1], dead = dk.filter(v => v < 0.0005).length / S, seam = dk[S - 1];
      const seamJump = seam > 1.6 * Math.max(...dk.slice(0, S - 1)) + 0.004;   // a seam bigger than the biggest step anywhere else is a pop (stepped motion has big steps everywhere, so it is not flagged)
      // arco: variação da energia média ao longo do loop e onde fica o pico
      const am = ser.reduce((a, b) => a + b, 0) / S, rng = (Math.max(...ser) - Math.min(...ser)) / (am + 1e-6), pk = ser.indexOf(Math.max(...ser)) / S;
      // hierarquia estrutural pelo projeto: camadas fortes (opacidade >= 0.85) entre as que desenham
      const draw = comp.layers.filter(L => L.on !== false && L.type !== 'bg' && L.type !== 'post'), strong = draw.filter(L => (L.opacity == null ? 1 : L.opacity) >= 0.85).length;
      const tier = strong === 0 ? 0.3 : strong <= 3 ? 1 : strong === 4 ? 0.7 : 0.4;
      const dom = band(top, 0.1, 0.22, 0.5, 0.8);
      const sig = E.map(v => v / tot); sigs.push(sig);
      out.push({ index: ci, name: comp.name, raw: { declaredDensity: dn, dominance: top, p99: p99max, coverage: meanCov, quiet: meanQuiet, motion: mean, dead, seamJump, arcRange: rng, arcPeak: pk, strongLayers: strong, layers: comp.layers.length },
        score: { hierarchy: 0.6 * dom + 0.4 * tier, contrast: ss(0.25, 0.7, p99max), density: band(meanCov, ...DB), breathing: band(meanQuiet, ...BB),
          motion: band(mean, 0.0005, 0.004, 0.1, 0.3) * (1 - clamp((dead - 0.25) * 2)) * (seamJump ? 0.5 : 1), arc: ss(0.03, 0.22, rng) * (pk < 0.1 || pk > 0.9 ? 0.85 : 1) } });
    });
    // repetição: correlação do mapa de energia entre composições
    const corr = (a, b) => { const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n; let s = 0, va = 0, vb = 0; for (let i = 0; i < n; i++) { s += (a[i] - ma) * (b[i] - mb); va += (a[i] - ma) ** 2; vb += (b[i] - mb) ** 2; } return s / Math.sqrt(va * vb + 1e-12); };
    out.forEach((o, i) => { let c = -1, j0 = -1; sigs.forEach((s, j) => { if (j !== i) { const v = corr(sigs[i], s); if (v > c) { c = v; j0 = j; } } }); o.raw.maxCorrelation = c; o.raw.similarTo = j0; o.score.repetition = sigs.length < 2 ? 1 : 1 - ss(0.9, 0.995, c); });
    return { lang: (P.meta && P.meta.lang) || 'en', loopFrames: LF, comps: out };
  }
  const T = {
    en: {
      hierarchy: ['one clear hero over a quiet supporting cast', 'the eye has several competing centres or no centre: raise the hero, lower the opacity of everything else', 'the frame is dominated by one spot with nothing around it: add a structure layer to measure it against'],
      contrast: ['the brightest figure reads strongly against the ground', 'nothing separates enough from the ground: raise the hero, darken the ground field or lighten the figure'],
      density: ['the amount of drawing is about right', 'the frame is nearly empty: add matter or raise the hero scale', 'the frame is almost full: remove a layer or lower its opacity'],
      breathing: ['there is empty space for the figure to breathe', 'no quiet areas: let the ground field and one third of the frame stay empty', 'almost nothing but quiet: the piece may feel absent'],
      motion: ['movement is present, continuous and the loop seam is clean', 'the picture barely moves: raise the motion profile energy or add a layer.mod spring', 'the picture changes too much from frame to frame: lower energy or slow the fastest layer', 'long stretches stand still', 'the loop seam jumps compared with the rest of the motion'],
      arc: ['the energy rises and falls over the loop', 'the energy is flat over the loop: add a build and a release (opacity, scale or density that changes with the bars)'],
      repetition: ['this composition is clearly different from the others', 'this composition looks like composition {j} of the same set: change topology, hero generator or spatial behaviour'],
      strong: 'strong', ok: 'ok', weak: 'weak', total: 'Score'
    },
    pt: {
      hierarchy: ['um herói claro sobre um elenco de apoio calmo', 'o olho tem vários centros disputando, ou nenhum: aumente o herói e baixe a opacidade do resto', 'o quadro é dominado por um ponto sem nada em volta: acrescente uma camada de estrutura para medir contra ele'],
      contrast: ['a figura mais clara se lê bem contra o fundo', 'nada se separa o bastante do fundo: aumente o herói, escureça o campo de fundo ou clareie a figura'],
      density: ['a quantidade de desenho está adequada', 'o quadro está quase vazio: acrescente matéria ou aumente a escala do herói', 'o quadro está quase cheio: tire uma camada ou baixe a opacidade'],
      breathing: ['há espaço vazio para a figura respirar', 'não há áreas calmas: deixe o campo de fundo e um terço do quadro vazios', 'quase só há calma: a peça pode parecer ausente'],
      motion: ['há movimento contínuo e a emenda do loop está limpa', 'a imagem quase não se move: aumente a energia do perfil de movimento ou acrescente um layer.mod spring', 'a imagem muda demais de quadro a quadro: baixe a energia ou desacelere a camada mais rápida', 'há trechos longos parados', 'a emenda do loop salta em relação ao resto do movimento'],
      arc: ['a energia sobe e desce ao longo do loop', 'a energia é plana no loop: crie subida e alívio (opacidade, escala ou densidade que mudam com os compassos)'],
      repetition: ['esta composição é claramente diferente das outras', 'esta composição parece a composição {j} do mesmo set: mude topologia, gerador do herói ou comportamento espacial'],
      strong: 'forte', ok: 'ok', weak: 'fraco', total: 'Nota'
    }
  };
  
  
  function explain(o, lang) {
    const t = T[lang] || T.en, r = o.raw, s = o.score, why = {}, put = (k, i, extra) => { why[k] = t[k][i].replace('{j}', extra == null ? '' : String(extra)); };
    put('hierarchy', s.hierarchy >= 0.6 ? 0 : r.dominance < 0.3 ? 1 : 2);
    put('contrast', s.contrast >= 0.6 ? 0 : 1);
    put('density', s.density >= 0.6 ? 0 : r.coverage < 0.1 ? 1 : 2);
    put('breathing', s.breathing >= 0.6 ? 0 : r.quiet < 0.2 ? 1 : 2);
    put('motion', s.motion >= 0.6 ? 0 : r.seamJump ? 4 : r.dead > 0.25 ? 3 : r.motion < 0.004 ? 1 : 2);
    put('arc', s.arc >= 0.6 ? 0 : 1);
    put('repetition', s.repetition >= 0.6 ? 0 : 1, r.similarTo + 1);
    return why;
  }
  
  
  function total(score) { let n = 0, d = 0; for (const [k, w] of Object.entries(WEIGHTS)) { n += w * score[k]; d += w; } return Math.round(100 * n / d); }
  
  
  /* roda a medição (síncrona, alguns segundos em projetos grandes) e devolve o relatório; lang: 'pt' | 'en' (padrão: meta.lang do projeto) */
  function run(lang) {
    const res = measure(), lg = lang || res.lang || 'en', t = T[lg] || T.en;
    const report = res.comps.map(o => ({ index: o.index, name: o.name, total: total(o.score), score: Object.fromEntries(Object.entries(o.score).map(([k, v]) => [k, Math.round(v * 100)])), raw: o.raw, notes: explain(o, lg) }));
    return { lang: lg, loopFrames: res.loopFrames, set: report.length ? Math.round(report.reduce((a, b) => a + b.total, 0) / report.length) : 0, weights: WEIGHTS, labels: t, compositions: report };
  }
  return { run, WEIGHTS };
})();
