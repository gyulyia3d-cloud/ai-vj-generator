#!/usr/bin/env node
// Gera os infográficos animados do README em docs/assets/*.svg: node scripts/readme-assets.mjs
// Linguagem do motor (GYULYIA DS): preto, branco e cinzas, linhas finas, Martian Mono, sem emoji; só o estado ativo vira branco cheio.
// Os números saem do próprio repositório (registry, app/fx.js, app/core.js, isf-library, galeria): se algo mudar, rode de novo.
// A fonte (Martian Mono, SIL OFL 1.1, subset latino) vai embutida em cada SVG, porque <img> não carrega fontes externas.
// Animação só com CSS e SMIL: o GitHub remove <script>, mas mantém ambos dentro de um SVG usado como imagem.
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)));
const OUT = join(ROOT, 'docs/assets');
const rd = p => readFileSync(join(ROOT, p), 'utf8');

/* ---------- fatos do repositório ---------- */
function facts() {
  const core = rd('app/core.js');
  const a = core.indexOf('const FAMILIES = ['), b = core.indexOf('\n];', a) + 3;
  const fam = vm.runInNewContext('(' + core.slice(a + 'const FAMILIES = '.length, b - 1) + ')').map(([n, l]) => [n, l.length]);
  const fx = rd('app/fx.js'), i = fx.indexOf('const FX_NAMES');
  const ctx = {}; vm.createContext(ctx); vm.runInContext(fx.slice(0, i) + ' this.K=Object.keys(FX);', ctx);
  const ui = rd('app/ui-core.js'), pa = ui.indexOf('const SURFACE_PRESETS'), pb = ui.indexOf('\n];', pa);
  const presets = (ui.slice(pa, pb).match(/\{ id: '/g) || []).length;
  const mod = JSON.parse(rd('skill/ai-vj-generator/registry/modulation.json')).sources;
  const free = JSON.parse('[' + rd('app/mod-ui.js').match(/MOD_FREE_SRC = \[([^\]]*)\]/)[1].replace(/'/g, '"') + ']');
  const isf = JSON.parse(rd('skill/ai-vj-generator/isf-library/manifest.json'));
  const gallery = readdirSync(join(ROOT, 'examples/gallery')).filter(f => f.endsWith('.aivj.json')).length;
  return {
    fam, types: fam.reduce((s, f) => s + f[1], 0), fx: ctx.K.length, presets, mod: mod.length, free: free.length,
    audio: mod.length - free.length, isf: Array.isArray(isf) ? isf.length : Object.keys(isf.shaders || isf.items || isf).length, gallery,
  };
}
const F = facts();

/* ---------- base visual ---------- */
const b64 = f => readFileSync(join(OUT, 'fonts', f)).toString('base64');
const FONT = `@font-face{font-family:'Martian Mono';font-weight:400;src:url(data:font/woff2;base64,${b64('mm-400.woff2')}) format('woff2')}
@font-face{font-family:'Martian Mono';font-weight:700;src:url(data:font/woff2;base64,${b64('mm-700.woff2')}) format('woff2')}`;
const BASE = `${FONT}
text{font-family:'Martian Mono',ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;fill:#fff;font-size:14px;white-space:pre}
.b{font-weight:700}.d{fill:#999}.f{fill:#555}.k{fill:#000}
.ln{fill:none;stroke:#fff;stroke-width:1.25}.dm{fill:none;stroke:#555;stroke-width:1}.rl{fill:none;stroke:#262626;stroke-width:1}
.fl{fill:#fff}.bk{fill:#000}
.flow{fill:none;stroke:#999;stroke-width:1.25;stroke-dasharray:3 5;animation:flow .9s linear infinite}
@keyframes flow{to{stroke-dashoffset:-16}}
.o{transform-box:fill-box}
@media (prefers-reduced-motion:reduce){*{animation:none!important}}`;

const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const T = (x, y, s, cls = '', sz) => `<text x="${x}" y="${y}"${cls ? ` class="${cls}"` : ''}${sz ? ` style="font-size:${sz}px"` : ''}>${esc(s)}</text>`;
const R = (x, y, w, h, cls = 'ln', extra = '') => `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="${cls}"${extra ? ' ' + extra : ''}/>`;
const L = (x1, y1, x2, y2, cls = 'rl') => `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" class="${cls}"/>`;
const f1 = n => +n.toFixed(1);

function corners(W, H) { // cantos em L, como as capas de gyulyia.com
  const m = 12, s = 12, p = (x, y, a, b) => `<path d="M ${x + a * s} ${y} L ${x} ${y} L ${x} ${y + b * s}" class="ln" style="opacity:.55"/>`;
  return p(m, m, 1, 1) + p(W - m, m, -1, 1) + p(m, H - m, 1, -1) + p(W - m, H - m, -1, -1);
}
function svg(name, W, H, title, desc, css, body) {
  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-labelledby="t d">
<title id="t">${esc(title)}</title><desc id="d">${esc(desc)}</desc>
<style>${BASE}
${css}</style>
<rect width="${W}" height="${H}" class="bk"/>
${body}
${corners(W, H)}
</svg>
`;
  writeFileSync(join(OUT, name), xml);
  console.log(name.padEnd(22), (xml.length / 1024).toFixed(1) + ' KB');
}
const head = (W, l, r) => T(32, 44, l, 'd') + `<text x="${W - 32}" y="44" class="b" text-anchor="end">${esc(r)}</text>` + L(32, 62, W - 32, 62);

/* ---------- 1. do briefing ao quadro ---------- */
function pipeline() {
  const W = 1200, H = 430, x0 = 32, nw = 196, gap = 39, ny = 118, nh = 96, N = 5, D = 3.6, C = D * N;
  const nodes = [
    ['01', 'BRIEFING', ['superfície', 'música', 'conceito']],
    ['02', 'IA OU GERADOR', ['PROMPT.md em', 'qualquer IA, ou a', 'aba Gerar (sem IA)']],
    ['03', 'PROJETO JSON', ['um arquivo', '.aivj.json', 'ai-vj-generator/2']],
    ['04', 'MOTOR', ['preview, avaliação', 'e loop fechado', 'em um só HTML']],
    ['05', 'SAÍDA', ['PNG sequence', '(RGB ou RGBA)', 'e MP4 H.264']],
  ];
  const pc = 100 / N;
  const css = `.nb{fill:#000;stroke:#fff;stroke-width:1.25;animation:ab ${C}s infinite}
.nt{animation:at ${C}s infinite}.nn{fill:#999;animation:an ${C}s infinite}.nc{fill:#999;animation:ac ${C}s infinite}
.pg{fill:#fff;transform-origin:0 50%;transform-box:fill-box;transform:scaleX(0);animation:pg ${C}s linear infinite}
@keyframes ab{0%,${pc - 1}%{fill:#fff}${pc + .5}%,100%{fill:#000}}
@keyframes at{0%,${pc - 1}%{fill:#000}${pc + .5}%,100%{fill:#fff}}
@keyframes an{0%,${pc - 1}%{fill:#555}${pc + .5}%,100%{fill:#999}}
@keyframes ac{0%,${pc - 1}%{fill:#fff}${pc + .5}%,100%{fill:#999}}
@keyframes pg{0%{transform:scaleX(0)}${pc}%{transform:scaleX(1)}${pc + .3}%,100%{transform:scaleX(0)}}`;
  let s = head(W, 'DO BRIEFING AO QUADRO', 'AI VJ GENERATOR');
  // raias: quem faz cada passo
  const lane = (i0, i1, label) => { const xa = x0 + i0 * (nw + gap), xb = x0 + i1 * (nw + gap) + nw; return L(xa, ny - 26, xb, ny - 26, 'dm') + L(xa, ny - 26, xa, ny - 18, 'dm') + L(xb, ny - 26, xb, ny - 18, 'dm') + T(xa, ny - 36, label, 'd'); };
  s += lane(0, 0, 'VOCÊ') + lane(1, 1, 'IA OU REGRAS') + lane(2, 2, 'ARQUIVO') + lane(3, 4, 'MOTOR · NAVEGADOR OU CLI');
  nodes.forEach(([n, t, cap], i) => {
    const x = x0 + i * (nw + gap), dl = i ? -(C - i * D) : 0, st = `style="animation-delay:${dl}s"`;
    s += `<rect x="${x}" y="${ny}" width="${nw}" height="${nh}" class="nb" ${st}/>`;
    s += `<text x="${x + 16}" y="${ny + 30}" class="nn" ${st}>${n}</text><text x="${x + 16}" y="${ny + 64}" class="b nt" style="font-size:16px;animation-delay:${dl}s">${esc(t)}</text>`;
    s += L(x, ny + nh + 8, x + nw, ny + nh + 8, 'rl') + `<rect x="${x}" y="${ny + nh + 7}" width="${nw}" height="2" class="pg" ${st}/>`;
    cap.forEach((c, k) => { s += `<text x="${x}" y="${ny + nh + 42 + k * 22}" class="nc" ${st}>${esc(c)}</text>`; });
    if (i < N - 1) {
      const xa = x + nw, xb = xa + gap, y = ny + nh / 2;
      s += `<path d="M ${xa + 2} ${y} H ${xb - 7}" class="flow"/><path d="M ${xb - 8} ${y - 4} L ${xb - 1} ${y} L ${xb - 8} ${y + 4}" class="ln"/>`;
      s += `<circle r="3" class="fl"><animateMotion dur="1.8s" begin="${i * .45}s" repeatCount="indefinite" path="M ${xa + 2} ${y} H ${xb - 7}"/></circle>`;
    }
  });
  s += L(32, 372, W - 32, 372) + T(32, 400, 'o motor monta as composições no seu computador · sem dependências de npm · um HTML autocontido', 'd');
  svg('pipeline.svg', W, H, 'Do briefing ao quadro', 'Fluxo em cinco passos: briefing, IA ou gerador, projeto JSON, motor e saída em PNG sequence ou MP4.', css, s);
}

/* ---------- 2. camadas: pilha explodida + gráfico de barras ---------- */
function layers() {
  const W = 1200, H = 620, cx = 236, a = 150, b = 36, sp = 40, y0 = 136, n = F.fam.length, cyc = 7;
  const mid = (n - 1) / 2, yc = y0 + mid * sp;
  const ex = i => y0 + i * sp;
  let css = `.sl{animation:xp ${cyc}s ease-in-out infinite}.lb{animation:lbl ${cyc}s ease-in-out infinite}
.br{transform-origin:0 50%;transform-box:fill-box;animation:gr ${cyc}s ease-in-out infinite}
@keyframes lbl{0%,12%{opacity:0}40%,88%{opacity:1}100%{opacity:0}}
@keyframes gr{0%,12%{transform:scaleX(0)}42%,88%{transform:scaleX(1)}100%{transform:scaleX(0)}}`;
  F.fam.forEach(([, c], i) => { css += `\n@keyframes xp${i}{0%,12%{transform:translateY(${f1(yc + (i - mid) * 9 - ex(i))}px)}42%,88%{transform:none}100%{transform:translateY(${f1(yc + (i - mid) * 9 - ex(i))}px)}}`; });
  let s = head(W, 'CAMADAS', `${F.types} TIPOS · ${n} CATEGORIAS`);
  F.fam.forEach(([name, c], i) => {
    const y = ex(i);
    s += `<g style="animation:xp${i} ${cyc}s ease-in-out infinite">`;
    s += `<path d="M ${cx - a} ${y} L ${cx} ${y - b} L ${cx + a} ${y} L ${cx} ${y + b} Z" fill="#000" class="ln"/>`;
    s += `<path d="M ${cx - a * .62} ${y} L ${cx} ${y - b * .62} L ${cx + a * .62} ${y} L ${cx} ${y + b * .62} Z" class="dm"/>`;
    s += `<g class="lb" style="animation-delay:0s">` + L(cx + a + 4, y, cx + a + 36, y, 'dm') + T(cx + a + 44, y + 5, String(i + 1).padStart(2, '0') + ' ' + name.toUpperCase(), '') + `</g></g>`;
  });
  // barras ordenadas por quantidade; direto rotulado, uma só escala
  const rows = F.fam.map(([nm, c]) => [nm, c]).sort((p, q) => q[1] - p[1] || p[0].localeCompare(q[0]));
  const bx = 838, unit = 20, ry0 = 206, rh = 34;
  s += T(640, 128, String(F.types), 'b', 64) + T(640 + String(F.types).length * 44.8 + 16, 106, 'tipos de camada', 'd') + T(640 + String(F.types).length * 44.8 + 16, 126, `em ${n} categorias`, 'd');
  s += T(640, 172, 'TIPOS POR CATEGORIA', 'd') + L(640, 184, W - 32, 184) + L(bx, 190, bx, ry0 + rows.length * rh - 4, 'rl');
  rows.forEach(([nm, c], i) => {
    const y = ry0 + i * rh;
    s += `<text x="${bx - 14}" y="${y + 18}" text-anchor="end">${esc(nm.toUpperCase())}</text>`;
    s += `<rect x="${bx}" y="${y + 4}" width="${c * unit}" height="18" class="fl br" style="animation-delay:${i * .06}s"/>`;
    s += `<text x="${bx + c * unit + 10}" y="${y + 19}" class="b lb" style="animation-delay:${i * .06}s">${c}</text>`;
  });
  s += L(32, H - 46, W - 32, H - 46) + T(32, H - 20, 'o tipo dentro da categoria se escolhe nos parâmetros da camada · o projeto guarda o tipo interno', 'd');
  svg('layers.svg', W, H, 'Camadas do motor', `${F.types} tipos de camada em ${n} categorias, com a pilha se abrindo em vista explodida e o gráfico de tipos por categoria.`, css, s);
}

/* ---------- 3. biblioteca de fábrica: gráfico de unidades ---------- */
function library() {
  const W = 1200, cols = 28, p = 16, sz = 10, dx = 310;
  const items = [
    ['SHADERS ISF', F.isf, 'créditos e licenças'],
    ['EFEITOS FX', F.fx, 'leem as camadas abaixo'],
    ['FONTES DE MODULAÇÃO', F.mod, `${F.audio} de áudio · ${F.free} sem áudio (BPM, LFO)`],
    ['PRESETS DE SUPERFÍCIE', F.presets, 'LED, telas, torres · projeção'],
    ['PROJETOS NA GALERIA', F.gallery, 'briefs curados · clima × superfície'],
  ];
  let y = 100, s = head(W, 'O QUE VEM DE FÁBRICA', '1 PONTO = 1 ITEM');
  const cyc = 6; let css = `.dt{fill:#fff;animation:lit ${cyc}s ease-in-out infinite}\n@keyframes lit{0%{opacity:.1}5%,86%{opacity:1}100%{opacity:.1}}`;
  items.forEach(([lab, n, note], r) => {
    const rows = Math.ceil(n / cols), h = rows * p - (p - sz);
    s += T(32, y + Math.min(h, 24) / 2 + 5, lab, 'd');
    for (let k = 0; k < n; k++) {
      const cx = dx + (k % cols) * p, cy = y + Math.floor(k / cols) * p;
      s += `<rect x="${cx}" y="${cy}" width="${sz}" height="${sz}" class="dt" style="animation-delay:${f1((r * 0.5 + k * 0.035))}s"/>`;
    }
    const nx = dx + cols * p + 32;
    s += T(nx, y + 30, String(n), 'b', 44) + T(nx + 84, y + 18, note.split(' · ')[0], 'd') + (note.includes(' · ') ? T(nx + 84, y + 38, note.split(' · ').slice(1).join(' · '), 'd') : '');
    y += Math.max(h, 30) + 34;
  });
  const H = y + 54;
  s += L(32, H - 44, W - 32, H - 44) + T(32, H - 18, 'contagem lida do próprio repositório: registry, app/fx.js, app/core.js, isf-library e examples/gallery', 'd');
  svg('library.svg', W, H, 'Biblioteca de fábrica', `${F.isf} shaders ISF, ${F.fx} efeitos fx, ${F.mod} fontes de modulação, ${F.presets} presets de superfície e ${F.gallery} projetos de galeria, um ponto por item.`, css, s);
}

/* ---------- 4. determinismo e loop ---------- */
function loop() {
  const W = 1200, H = 500, cx = 600, cy = 244, Rr = 118, dur = 8;
  const wave = (r0, amp, k, c, y, steps = 180) => { let d = ''; for (let i = 0; i <= steps; i++) { const t = i / steps * Math.PI * 2 - Math.PI / 2, r = r0 + amp * Math.sin(k * (t + Math.PI / 2)); d += (i ? 'L' : 'M') + f1(c + r * Math.cos(t)) + ' ' + f1(y + r * Math.sin(t)) + ' '; } return d + 'Z'; };
  const css = `.ph{transform-origin:${cx}px ${cy}px;animation:spin ${dur}s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}`;
  let s = head(W, 'CADA QUADRO É UMA FUNÇÃO PURA', 'MESMO PROJETO + MESMA SEMENTE = MESMOS QUADROS');
  // esquerda: a regra
  s += T(32, 128, 'CAMADA =', 'd') + T(32, 168, 'f(parâmetros, quadro)', 'b', 20);
  [['o relógio conta quadros,', 'não milissegundos'], ['toda aleatoriedade sai', 'de um hash com semente'], ['o mesmo código desenha', 'preview, PNG e MP4']].forEach(([p, q], i) => {
    const y = 226 + i * 66; s += `<rect x="32" y="${y - 11}" width="8" height="8" class="fl"/>` + T(54, y, p) + T(54, y + 22, q, 'd');
  });
  // anel
  s += `<circle cx="${cx}" cy="${cy}" r="${Rr}" class="ln"/><circle cx="${cx}" cy="${cy}" r="${Rr - 34}" class="rl"/>`;
  for (let i = 0; i < 16; i++) { const t = i / 16 * Math.PI * 2 - Math.PI / 2, major = i % 4 === 0, r1 = Rr, r2 = Rr + (major ? 16 : 8); s += `<line x1="${f1(cx + r1 * Math.cos(t))}" y1="${f1(cy + r1 * Math.sin(t))}" x2="${f1(cx + r2 * Math.cos(t))}" y2="${f1(cy + r2 * Math.sin(t))}" class="${major ? 'ln' : 'dm'}"/>`; }
  s += `<path d="${wave(Rr - 34, 14, 6, cx, cy)}" class="ln" style="opacity:.9"/>`;
  s += `<g class="ph"><line x1="${cx}" y1="${cy}" x2="${cx}" y2="${cy - Rr - 16}" class="ln"/></g>`;
  s += `<circle r="5" class="fl"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${wave(Rr - 34, 14, 6, cx, cy)}"/></circle><circle cx="${cx}" cy="${cy}" r="3" class="fl"/>`;
  s += `<text x="${cx}" y="${cy - Rr - 34}" text-anchor="middle">QUADRO 0 = ÚLTIMO + 1</text>`;
  s += `<text x="${cx}" y="${cy + Rr + 48}" text-anchor="middle" class="d">o loop fecha em compassos inteiros</text><text x="${cx}" y="${cy + Rr + 70}" text-anchor="middle" class="d">e em ciclos inteiros</text>`;
  // direita: três saídas idênticas
  const outs = [['PREVIEW', 'ao vivo, no navegador'], ['PNG SEQUENCE', 'RGB, RGBA, por camada'], ['MP4 H.264', 'quadro a quadro, sem alpha']];
  outs.forEach(([t, sub], i) => {
    const y = 134 + i * 96, x = 828, w = 340, mx = x + w - 44, my = y + 34;
    s += `<path d="M ${cx + Rr + 22} ${cy} C ${cx + Rr + 70} ${cy}, ${x - 40} ${my}, ${x - 2} ${my}" class="flow"/>`;
    s += R(x, y, w, 68, 'ln', 'fill="#000"') + T(x + 16, y + 30, t, 'b', 16) + T(x + 16, y + 52, sub, 'd');
    s += `<circle cx="${mx}" cy="${my}" r="24" class="dm"/><path d="${wave(15, 3.4, 6, mx, my, 90)}" class="ln" style="stroke-width:1"/>`;
    s += `<circle r="2.6" class="fl"><animateMotion dur="${dur}s" repeatCount="indefinite" path="${wave(15, 3.4, 6, mx, my, 90)}"/></circle>`;
  });
  s += L(32, H - 46, W - 32, H - 46) + T(32, H - 20, 'nunca há gravação de tela: cada saída desenha o quadro n do zero, então um render pode ser repetido e comparado', 'd');
  svg('loop.svg', W, H, 'Quadro como função pura', 'Cada camada é uma função pura de parâmetros e número do quadro; o loop fecha e preview, PNG sequence e MP4 mostram os mesmos quadros.', css, s);
}

/* ---------- 5. áudio -> modulação ---------- */
function audio() {
  const W = 1200, H = 520;
  const bars = 14, bx = 358, bw = 16, bg = 10, by = 308, bh = 112;
  let css = `.eq{transform-origin:50% 100%;transform-box:fill-box;fill:#fff;animation:eq 1.2s ease-in-out infinite}\n@keyframes eq{0%,100%{transform:scaleY(.18)}50%{transform:scaleY(1)}}`;
  const knobs = [[0.3, 0.85, 1.7, 0], [0.7, 0.2, 2.3, .4], [0.5, 0.95, 3.1, .9]];
  knobs.forEach(([a, b], i) => { css += `\n@keyframes kn${i}{0%,100%{transform:translateX(${f1(a * 220)}px)}50%{transform:translateX(${f1(b * 220)}px)}}`; });
  let s = head(W, 'ÁUDIO LIGADO A QUALQUER NÚMERO', `${F.mod} FONTES DE MODULAÇÃO`);
  // entradas
  s += T(32, 100, 'ENTRADA', 'd');
  ['MICROFONE', 'ARQUIVO', 'FONTE DE TESTE', 'SEM ÁUDIO · BPM'].forEach((t, i) => {
    const y = 120 + i * 68;
    s += R(32, y, 232, 48, i === 3 ? 'dm' : 'ln', 'fill="#000"') + T(48, y + 29, t, i === 3 ? 'd' : '');
    s += `<path d="M 264 ${y + 24} C 300 ${y + 24}, 310 ${i === 3 ? 400 : 200}, 346 ${i === 3 ? 400 : 200}" class="flow" style="opacity:${i === 3 ? .5 : 1}"/>`;
  });
  s += `<circle r="3" class="fl"><animateMotion dur="2.4s" repeatCount="indefinite" path="M 264 144 C 300 144, 310 200, 346 200"/></circle>`;
  // análise
  s += T(340, 100, `ANÁLISE · ${F.audio} SINAIS`, 'd') + R(340, 112, 400, 336, 'ln', 'fill="#000"');
  s += T(358, 144, 'bandas', 'b') + T(358 + 8 * 9.8 + 4, 144, 'bass · mid · high · rms', 'd');
  s += T(358, 172, 'golpes', 'b') + T(358 + 8 * 9.8 + 4, 172, 'hit · mhit · hhit · kick', 'd');
  s += T(358, 200, 'tempo', 'b') + T(358 + 8 * 9.8 + 4, 200, 'onset · flux · pres', 'd');
  s += L(358, 218, 722, 218) + T(358, 244, 'andamento por Kalman, com histórico', 'd') + T(358, 266, 'de golpes e onsets', 'd');
  for (let i = 0; i < bars; i++) { const h = bh * (0.35 + 0.65 * Math.abs(Math.sin(i * 1.7 + 1))); s += `<rect x="${bx + i * (bw + bg - 4)}" y="${by + bh - h}" width="${bw - 2}" height="${f1(h)}" class="eq" style="animation-duration:${f1(0.8 + (i * 37 % 9) / 9)}s;animation-delay:${f1(-(i * 53 % 11) / 7)}s"/>`; }
  s += L(358, by + bh + 1, 722, by + bh + 1, 'dm') + T(358, by - 14, 'espectro (esquema ilustrativo)', 'd');
  // destino
  s += T(800, 100, 'LAYER.MOD → PARÂMETRO', 'd') + R(800, 112, 368, 336, 'ln', 'fill="#000"');
  [['ESCALA', 'kick'], ['BRILHO', 'bass'], ['VELOCIDADE', 'lfo']].forEach(([p, src], i) => {
    const y = 160 + i * 84;
    s += T(820, y, p) + T(1148, y, '← ' + src, 'd').replace('<text', '<text text-anchor="end"');
    s += L(820, y + 28, 1148, y + 28, 'dm') + L(820, y + 28, 820 + 328, y + 28, 'rl');
    s += `<rect x="820" y="${y + 19}" width="9" height="19" class="fl o" style="animation:kn${i} ${knobs[i][2]}s ease-in-out infinite;animation-delay:${-knobs[i][3]}s"/>`;
  });
  s += `<path d="M 740 280 C 770 280, 770 280, 798 280" class="flow"/><circle r="3" class="fl"><animateMotion dur="1.2s" repeatCount="indefinite" path="M 740 280 H 798"/></circle>`;
  s += T(820, 420, 'qualquer número, qualquer fonte', 'd');
  s += L(32, H - 46, W - 32, H - 46) + T(32, H - 20, `${F.free} das ${F.mod} fontes (BPM e LFO) não precisam de áudio: sem áudio, tudo reage ao BPM de forma determinística`, 'd');
  svg('audio.svg', W, H, 'Áudio ligado a parâmetros', 'Microfone, arquivo ou fonte de teste alimentam bandas, golpes e onsets; layer.mod liga qualquer número a qualquer fonte.', css, s);
}

/* ---------- 6. instalação no Claude (terminal animado) ---------- */
function install() {
  const W = 1200, cw = 11.2, cyc = 20;
  const A = [
    [0.6, 3.2, '$ ', 'git clone https://github.com/gyulyia3d-cloud/ai-vj-generator.git && cd ai-vj-generator'],
    [3.7, 4.9, '$ ', 'sh adapters/claude/install.sh'],
    [5.3, 5.4, '', '  instalada: ai-vj-generator', 'd'], [5.6, 5.7, '', '  instalada: how-to-use', 'd'], [5.9, 6.0, '', '  instalada: vj', 'd'],
    [6.2, 6.3, '', '  instalada: vj-critique', 'd'], [6.5, 6.6, '', '  instalada: vj-reference', 'd'],
    [7.0, 7.1, '', 'Skills em ~/.claude/skills'], [7.4, 7.5, '', 'Reinicie o Claude Code e digite: /vj <seu briefing>'],
  ];
  const B = [
    [8.6, 11.6, '> ', '/vj Set de techno industrial: LED 5120×500 em duas paredes em L, 132 BPM, PNG com alpha'],
    [12.2, 13.6, '', '# a IA conduz o briefing e escreve o projeto .aivj.json', 'd'],
    [14.2, 15.8, '', '# abra app/index.html (Chrome ou Edge) e carregue o JSON', 'd'],
  ];
  const fade0 = 18.2, fade1 = 19.2, pct = t => f1(t / cyc * 100);
  let css = `.all{animation:fa ${cyc}s linear infinite}@keyframes fa{0%,${pct(fade0)}%{opacity:1}${pct(fade1)}%,100%{opacity:0}}
.cv{fill:#000;transform-origin:100% 50%;transform-box:fill-box;transform:scaleX(0)}.cu{fill:#fff;transform-box:fill-box;opacity:0}`;
  const line = (ln, i, x, y, tag) => {
    const [s0, e0, pre, txt, cls] = ln, n = (pre + txt).length, w = n * cw, one = e0 - s0 < .3, k = tag + i;
    css += `\n.${k}c{animation:${k}c ${cyc}s linear infinite}@keyframes ${k}c{0%{transform:scaleX(1)}${pct(s0)}%{transform:scaleX(1);animation-timing-function:steps(${one ? 1 : n},end)}${pct(e0)}%{transform:scaleX(0)}${pct(fade1)}%{transform:scaleX(0)}${f1(pct(fade1) + .1)}%,100%{transform:scaleX(1)}}`;
    if (!one) css += `\n.${k}u{animation:${k}u ${cyc}s linear infinite}@keyframes ${k}u{0%,${f1(pct(s0) - .1)}%{opacity:0;transform:translateX(0)}${pct(s0)}%{opacity:1;transform:translateX(0);animation-timing-function:steps(${n},end)}${pct(e0)}%{opacity:1;transform:translateX(${f1(w)}px)}${pct(e0 + .5)}%,100%{opacity:0;transform:translateX(${f1(w)}px)}}`;
    let o = `<text x="${x}" y="${y}" style="font-size:16px" class="${cls || ''}">${pre ? `<tspan class="d">${esc(pre)}</tspan>` : ''}${esc(txt)}</text>`;
    o += `<rect x="${x - 1}" y="${y - 15}" width="${f1(w + 3)}" height="22" class="cv ${k}c"/>`;
    if (!one) o += `<rect x="${x}" y="${y - 13}" width="8" height="18" class="cu ${k}u"/>`;
    return o;
  };
  const win = (y, h, name, right) => R(32, y, W - 64, h, 'ln', 'fill="#000"') + T(48, y + 24, name, 'b') + `<text x="${W - 48}" y="${y + 24}" text-anchor="end" class="d">${esc(right)}</text>` + L(32, y + 38, W - 32, y + 38);
  let s = head(W, 'INSTALAR NO CLAUDE CODE · 2 PASSOS', '/VJ');
  const ya = 82, ha = 46 + A.length * 26 + 14;
  s += win(ya, ha, '01  TERMINAL', 'macOS · Linux  (Windows: install.ps1)') + '<g class="all">';
  A.forEach((ln, i) => { s += line(ln, i, 52, ya + 70 + i * 26, 'a'); });
  const yb = ya + ha + 24, hb = 46 + B.length * 26 + 14;
  s += '</g>' + win(yb, hb, '02  CLAUDE CODE', 'reinicie o Claude Code antes') + '<g class="all">';
  B.forEach((ln, i) => { s += line(ln, i, 52, yb + 70 + i * 26, 'b'); });
  s += '</g>';
  const H = yb + hb + 22;
  svg('install-claude.svg', W, H, 'Instalação no Claude Code', 'Terminal animado: clonar o repositório, rodar adapters/claude/install.sh, reiniciar o Claude Code e digitar /vj com um briefing.', css, s);
}

/* ---------- 7. sem IA: três caminhos, um arquivo ---------- */
function noai() {
  const W = 1200, H = 446, bw = 230, bh = 56, gap = 36, x0 = 32, C = 14.4, N = 6, pc = 100 / N;
  const css = `.nb{fill:#000;stroke:#fff;stroke-width:1.25;animation:ab ${C}s infinite}.nt{animation:at ${C}s infinite}.nc{fill:#999;animation:ac ${C}s infinite}
@keyframes ab{0%,${pc - 1}%{fill:#fff}${pc + .5}%,100%{fill:#000}}
@keyframes at{0%,${pc - 1}%{fill:#000}${pc + .5}%,100%{fill:#fff}}
@keyframes ac{0%,${pc - 1}%{fill:#333}${pc + .5}%,100%{fill:#999}}`;
  const lanes = [
    ['NAVEGADOR · SEM TERMINAL', [['ABRIR', 'app/index.html'], ['GERAR BRIEFING', 'preencher o briefing']]],
    ['LINHA DE COMANDO', [['brief.json', 'de examples/briefs'], ['brief_to_project.py', 'gera o projeto']]],
    ['EXEMPLOS PRONTOS', [['GALERIA', '8 projetos prontos'], ['CARREGAR', 'o JSON no motor']]],
  ];
  const act = k => { const dl = k ? -(C - k * C / N) : 0; return dl; };
  let s = head(W, 'SEM IA: TRÊS CAMINHOS, UM ARQUIVO', 'AI VJ GENERATOR');
  const node = (x, y, w, h, title, lines, k, tsz = 14) => {
    const dl = act(k), st = `style="animation-delay:${dl}s"`;
    let o = `<rect x="${x}" y="${y}" width="${w}" height="${h}" class="nb" ${st}/><text x="${x + 14}" y="${y + 24}" class="b nt" style="font-size:${tsz}px;animation-delay:${dl}s">${esc(title)}</text>`;
    lines.forEach((l, i) => { o += `<text x="${x + 14}" y="${y + 44 + i * 18}" class="nc" ${st}>${esc(l)}</text>`; });
    return o;
  };
  const px = 584, py = 190, pw = 200, ph = 76, cy = py + ph / 2;
  lanes.forEach(([lab, steps], i) => {
    const y = 112 + i * 88;
    s += T(x0, y - 12, lab, 'd');
    steps.forEach(([t, sub], j) => { s += node(x0 + j * (bw + gap), y, bw, bh, t, [sub], i, t.length > 17 ? 13 : 14); });
    const xa = x0 + bw, xb = xa + gap, ym = y + bh / 2;
    s += `<path d="M ${xa + 2} ${ym} H ${xb - 7}" class="flow"/><path d="M ${xb - 8} ${ym - 4} L ${xb - 1} ${ym} L ${xb - 8} ${ym + 4}" class="ln"/>`;
    const ex = x0 + 2 * bw + gap, d = `M ${ex + 2} ${ym} C ${ex + 40} ${ym}, ${px - 44} ${cy}, ${px - 2} ${cy}`;
    s += `<path d="${d}" class="flow"/><circle r="3" class="fl"><animateMotion dur="2.4s" begin="${i * .8}s" repeatCount="indefinite" path="${d}"/></circle>`;
  });
  s += node(px, py, pw, ph, 'PROJETO', ['.aivj.json', 'ai-vj-generator/2'], 3);
  s += node(830, py, 150, ph, 'MOTOR', ['avaliar', 'ajustar'], 4);
  s += node(1018, py, 150, ph, 'EXPORTAR', ['PNG sequence', 'MP4 H.264'], 5);
  [[px + pw, 830], [980, 1018]].forEach(([a, b]) => { s += `<path d="M ${a + 2} ${cy} H ${b - 7}" class="flow"/><path d="M ${b - 8} ${cy - 4} L ${b - 1} ${cy} L ${b - 8} ${cy + 4}" class="ln"/>`; });
  s += L(32, H - 46, W - 32, H - 46) + T(32, H - 20, 'o mesmo briefing dá o mesmo projeto no navegador e no script (há teste de paridade)', 'd');
  svg('no-ai.svg', W, H, 'Usar sem IA', 'Três caminhos sem IA, pelo navegador, pela linha de comando ou pelos exemplos prontos, chegam ao mesmo arquivo de projeto, que o motor avalia, ajusta e exporta em PNG sequence ou MP4.', css, s);
}

pipeline(); layers(); library(); loop(); audio(); install(); noai();
