/* Receitas, cartões de teste e paleta OKLCH (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores RECIPESUI. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ---------- V5 · receitas, cartões de teste e paleta OKLCH ---------- */
const recipeById = id => RECIPES.find(r => r.id === id);
function recipeLayer(r, sets) {
  const base = { on: true, opacity: 1, blend: 'normal', role: 'Receita ' + r.title + ': ' + (r.means[0] || r.tier) };
  const name = r.title.toUpperCase().slice(0, 30);
  if (r.kind === 'code') {
    const L = Object.assign({ type: 'code', name, vars: clone(r.vars), p: { src: r.src } }, base);
    for (const [k, v] of Object.entries(sets || {})) { const d = r.vars.find(x => x.k === k); if (d && v !== d.d) L.p['v_' + k] = v; }
    return L;
  }
  return Object.assign({ type: 'shader', name, p: Object.assign({}, r.p, sets || {}, { src: r.src, alphaMode: 'alpha', res: 1, c1: 'primary', c2: 'accent' }) }, base);
}
function trustBundledCode(wasOk) {
  if (wasOk) { const sig = codeSig(P), l = store.get('codeOK', []); if (!l.includes(sig)) { l.push(sig); store.set('codeOK', l.slice(-40)); } ST.codeSig = sig; ST.codeAllow = true; const b = $('#codeBan'); if (b) b.hidden = true; }
  else gateCode(P);
}
function addRecipe(id) {
  const r = recipeById(id); if (!r) return; const comp = cur(), wasOk = ST.codeAllow, L = recipeLayer(r);
  const at = clamp(ST.sel + 1, 0, comp.layers.length); comp.layers.splice(at, 0, L); ST.sel = at;
  if (r.kind === 'code') trustBundledCode(wasOk);
  buildStage(); refreshAll(); commit(false, 'Receita ' + r.title);
  toast('Camada "' + L.name.toLowerCase() + '" adicionada. Ajuste em Parâm.', 2200);
}
function addTestCards() {
  const r = recipeById('testcard'), wasOk = ST.codeAllow, S = P.meta.spec, b = S && S.derived && S.derived.blend;
  const sets = {}; if (b) { sets.blendN = b.n; sets.blendPx = b.overlapPx; }
  const L = recipeLayer(r, sets); L.name = 'CARTÕES DE TESTE'; L.role = 'Ferramenta de calibração no local';
  const n = P.compositions.length + 1, cc = { id: 'c' + n, name: 'CARTÕES DE TESTE', hypothesis: 'Ferramenta: rode isto primeiro na superfície real.', motion: 'step', layers: [mk('bg', 'FUNDO', true, { grain: 0 }), L] };
  for (const [t, nm] of FIXED) cc.layers.push(mk(t, nm, false));
  P.compositions.push(cc); trustBundledCode(wasOk); ST.ci = P.compositions.length - 1; ST.sel = 1;
  buildStage(); refreshAll(); commit(false, 'Cartões de teste'); toast('Composição de cartões de teste criada', 2000);
}
/* paleta perceptual: porte de scripts/palette.py (o teste de paridade compara os dois) */
const PAL = (() => {
  const SURF = { led: { bg_l: 0.12, primary_l: 0.95, min_cr: 7.0 }, projection: { bg_l: 0.10, primary_l: 0.97, min_cr: 7.0 }, screen: { bg_l: 0.20, primary_l: 0.98, min_cr: 4.5 } };
  const s2l = c => c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4), l2s = c => { c = Math.max(0, c); return c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; };
  const h2rgb = h => { h = String(h).trim().replace(/^#/, ''); if (h.length === 3) h = h.split('').map(x => x + x).join(''); if (!/^[0-9a-f]{6}$/i.test(h)) return null; return [0, 2, 4].map(i => parseInt(h.slice(i, i + 2), 16) / 255); };
  const rgb2h = rgb => '#' + rgb.map(c => SC.pyRound(Math.min(1, Math.max(0, c)) * 255).toString(16).toUpperCase().padStart(2, '0')).join('');
  const cbrt = x => Math.sign(x) * Math.pow(Math.abs(x), 1 / 3);
  const lin2lab = (r, g, b) => { const l = cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b), m = cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b), s = cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
    return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s, 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s, 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s]; };
  const lab2lin = (L, a, b) => { const l = Math.pow(L + 0.3963377774 * a + 0.2158037573 * b, 3), m = Math.pow(L - 0.1055613458 * a - 0.0638541728 * b, 3), s = Math.pow(L - 0.0894841775 * a - 1.2914855480 * b, 3);
    return [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s, -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s, -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s]; };
  const inGamut = lin => lin.every(c => c >= -1e-4 && c <= 1 + 1e-4);
  function hexToOklch(h) { const rgb = h2rgb(h); if (!rgb) return null; const [L, a, b] = lin2lab(...rgb.map(s2l)); let hh = Math.atan2(b, a) * 180 / Math.PI; hh = ((hh % 360) + 360) % 360; return [L, Math.hypot(a, b), hh]; }
  function oklchToHex(L, C, h) {
    L = Math.min(1, Math.max(0, L)); const hr = h * Math.PI / 180; let lo = 0, hi = C, lin = lab2lin(L, C * Math.cos(hr), C * Math.sin(hr));
    if (!inGamut(lin)) { for (let i = 0; i < 24; i++) { const mid = (lo + hi) / 2; if (inGamut(lab2lin(L, mid * Math.cos(hr), mid * Math.sin(hr)))) lo = mid; else hi = mid; } C = lo; lin = lab2lin(L, C * Math.cos(hr), C * Math.sin(hr)); }
    return [rgb2h(lin.map(l2s)), C];
  }
  const lum = h => { const [r, g, b] = h2rgb(h).map(s2l); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
  const contrast = (a, b) => { const x = lum(a), y = lum(b), hi = Math.max(x, y), lo = Math.min(x, y); return (hi + 0.05) / (lo + 0.05); };
  const hues = (sch, h0) => ({ mono: [h0], analogous: [h0, h0 + 30, h0 - 30], complement: [h0, h0 + 180], split: [h0, h0 + 150, h0 + 210], triad: [h0, h0 + 120, h0 + 240], tetrad: [h0, h0 + 90, h0 + 180, h0 + 270] }[sch]);
  function checks(p, surface) {
    const S = SURF[surface], res = { contrast: {}, warnings: [] }, r2 = x => Math.round(x * 100) / 100;
    for (const k of ['primary', 'secondary', 'accent']) res.contrast[k + ':bg'] = r2(contrast(p[k], p.bg));
    res.contrast['primary:secondary'] = r2(contrast(p.primary, p.secondary));
    const [Lb, Cb] = hexToOklch(p.bg), [Lp] = hexToOklch(p.primary), [Ls] = hexToOklch(p.secondary), [La, Ca] = hexToOklch(p.accent), w = res.warnings;
    if (Lb > S.bg_l) w.push(`o fundo (L ${Lb.toFixed(2)}) está claro demais para ${surface}: o fundo deve ler como preto`);
    if (Lp > S.primary_l) w.push(`o primário (L ${Lp.toFixed(2)}) passa de ${S.primary_l}: pode estourar ou ofuscar em ${surface}`);
    if (res.contrast['primary:bg'] < S.min_cr) w.push(`contraste primário:fundo ${res.contrast['primary:bg']} está abaixo de ${S.min_cr}:1 para ${surface}`);
    if (res.contrast['accent:bg'] < 4.5) w.push('contraste acento:fundo abaixo de 4,5:1: o acento não lê de longe');
    if (Math.abs(Lp - Ls) < 0.15) w.push('primário e secundário estão a menos de 0,15 de luminosidade: os planos se misturam; separe por luminosidade, não por matiz');
    if (Math.abs(La - Lp) < 0.08 && Ca > 0.05) w.push('acento e primário têm luminosidade parecida: só se separam por matiz e somem em cinza ou para daltônicos');
    if (Ca < 0.06) w.push('o acento tem croma abaixo de 0,06: lê como cinza, não como evento');
    if ((surface === 'led' || surface === 'projection') && Cb > 0.04) w.push('o fundo é claramente colorido: em LED e projeção, fundo colorido lava a superfície toda');
    return res;
  }
  function scheme(hue, sch, chroma, surface) {
    const S = SURF[surface], hs = hues(sch, hue), accH = hs.length > 1 ? hs[1] : hue + 40;
    const roles = { bg: [surface !== 'screen' ? 0.07 : 0.12, 0.015, hue], primary: [Math.min(S.primary_l, 0.93), 0.02, hue], secondary: [0.62, 0.05, hs.length > 2 ? hs[2] : hue], accent: [0.72, chroma, accH] };
    const out = {}; for (const [k, [L, C, h]] of Object.entries(roles)) { const [hx, C2] = oklchToHex(L, C, h); out[k] = { hex: hx, oklch: [L, C2, ((h % 360) + 360) % 360] }; }
    out.checks = checks({ bg: out.bg.hex, primary: out.primary.hex, secondary: out.secondary.hex, accent: out.accent.hex }, surface);
    return out;
  }
  return { hexToOklch, oklchToHex, contrast, checks, scheme, SURF, h2rgb };
})();
