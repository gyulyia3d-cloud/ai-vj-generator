/* Composição de um quadro como RenderGraph (fase 18).
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores COMPOSE. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* ===== composição de um quadro como RenderGraph =====
   Source (acumulado) -> [Generator | Shader | Effect | History | Feedback] -> Composite -> ... -> Output.
   É o único caminho de render fora da viewport ao vivo (renderFrame, exportação PNG, MP4 e o replay dos efeitos temporais). Os canvas de camada vêm de um pool. */
let CANVAS_POOL_REAL = null;   /* RG vem de um módulo embutido mais abaixo: o pool nasce no primeiro uso */
const CANVAS_POOL = { get real() { return CANVAS_POOL_REAL || (CANVAS_POOL_REAL = new RG.CanvasPool()); }, acquire(w, h) { return this.real.acquire(w, h); }, release(c) { this.real.release(c); }, get stats() { return this.real.stats; } };
let COMPOSE_OPTS = null;
const nodeTypeOf = L => L.type === 'temporal' ? TM.presetOf(pm(L)).kind : (L.type === 'shader' || L.type === 'isf' || L.type === 'synth' || L.type === 'field' || L.type === 'solid' || L.type === 'particles') ? 'Shader' : BELOW_TYPES.has(L.type) ? 'Effect' : 'Generator';
function buildComposeGraph(comp, F, o) {
  const target = o.target, w = target.width, h = target.height, g = RG.create('quadro');
  g.add({ id: 'src', type: 'Source', run: () => { const x = target.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; x.clearRect(0, 0, w, h); if (o.bgFill) { x.fillStyle = o.bgFill; x.fillRect(0, 0, w, h); } return target; } });
  let acc = 'src';
  comp.layers.forEach((L, i) => {
    if (o.upTo != null && i >= o.upTo) return;
    if (o.only && !o.only.includes(i)) return;
    if (!(o.vis ? o.vis(i, L) : L.on)) return;
    if (o.skip && o.skip(i, L)) return;
    const needs = BELOW_TYPES.has(L.type);
    g.add({ id: 'L' + i, type: nodeTypeOf(L), deps: needs ? [acc] : [], run: ([below]) => {
      const lay = CANVAS_POOL.acquire(w, h), lx = lay.getContext('2d');
      renderLayer(lx, comp, L, i, F, o.scale, o.W, o.H, needs ? below : undefined);
      if (o.luma) lumaKey(lx, w, h);
      if (o.onLayer) o.onLayer(i, lay, L);
      return lay; } });
    g.add({ id: 'C' + i, type: 'Composite', deps: [acc, 'L' + i], inplace: true, run: ([a, lay]) => {
      const x = a.getContext('2d'); x.globalAlpha = L.opacity; x.globalCompositeOperation = fxOp(L, (BLENDS[L.blend] || BLENDS.normal)[0]); x.drawImage(lay, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; return a; } });
    acc = 'C' + i;
  });
  g.add({ id: 'out', type: 'Output', deps: [acc], run: ([a]) => a });
  return g;
}
function composeFrame(comp, F, o) {
  const top = !TM.replaying, prev = COMPOSE_OPTS; COMPOSE_OPTS = o;
  if (top && GL.r) GL.r.beginFrame();
  try { const g = buildComposeGraph(comp, F, o); g.execute({}, CANVAS_POOL); COMPOSE_OPTS = prev; return o.target; }
  finally { COMPOSE_OPTS = prev; if (top && GL.r) { GL.r.endFrame(); TM.sweep(); } }
}
/* a imagem das camadas abaixo de idx num quadro qualquer (usada pelo replay dos efeitos temporais) */
function renderBelow(comp, idx, F, k, W, H, target) {
  const o = COMPOSE_OPTS;
  return composeFrame(comp, F, { target, scale: k, W, H, upTo: idx, bgFill: o ? o.bgFill : '#000', skip: o && o.skip });
}
