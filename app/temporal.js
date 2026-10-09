/* Camada "temporal" (fase 4): efeitos que dependem de quadros anteriores, em GPU, sem relógio e sem estado escondido.
   TRILHA e FEEDBACK leem a própria saída do quadro anterior (nós Feedback do grafo: dois buffers A/B, a saída vira histórico por copyTexSubImage2D, sem passe extra).
   SLIT SCAN e DESLOCAR leem os últimos N quadros da entrada guardados num TEXTURE_2D_ARRAY (nós History).
   DETERMINISMO: a saída de um quadro é função dos quadros anteriores, não do que aconteceu antes. Seguindo em ordem (quadro n depois de n-1) o histórico continua; num salto
   (rolar a linha do tempo, abrir, exportar) o histórico é zerado e reconstruído renderizando os quadros anteriores (replay), com uma janela W em que a persistência cai
   abaixo de 1/255 (cada passo perde 1,5/255, então chega a zero). Exportar duas vezes dá a mesma imagem; o loop fecha porque frameAt dá a volta no loop.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. */
const TM = (() => {
  const PRE = 'precision highp sampler2DArray; uniform sampler2D uTex; uniform sampler2D uPrev; uniform sampler2DArray uHist; uniform float uMixK, uHead, uN; ' +
    'vec4 tx(vec2 q){return texture2D(uTex,q);} vec4 pv(vec2 q){return texture2D(uPrev,q);} vec4 hs(vec2 q,float lag){float s=mod(uHead-lag+uN*2.,uN);return texture(uHist,vec3(q,s));} float fxLuma(vec3 c){return dot(c,vec3(.299,.587,.114));} ';
  const EPS = 'vec4(1.5/255.)';
  const PRESETS = {
    TRILHA: { labels: ['Persistência', 'Brilho da trilha', '—', '—'], d: [0.8, 1, 0, 0], kind: 'Feedback', ring: 0, decay: 0, tag: 'trilha',
      src: `void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 c=tx(uv); vec4 p=max(pv(uv)*clamp(uP.x,0.,.96)*clamp(uP.y,0.,1.5)-${EPS},vec4(0.)); gl_FragColor=max(c,p); }` },
    FEEDBACK: { labels: ['Persistência', 'Zoom', 'Rotação (°)', 'Deriva (px)'], d: [0.85, 1.02, 1, 2], kind: 'Feedback', ring: 0, decay: 0, tag: 'feedback',
      src: `void main(){ vec2 uv=gl_FragCoord.xy/uRes; float asp=uRes.x/uRes.y, a=uP.z*.0174533; mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a)); vec2 pp=(uv-.5)*vec2(asp,1.); pp=R*pp/max(.2,uP.y);
  vec2 q=pp/vec2(asp,1.)+.5+vec2(uP.w,0.)/uRes; float inside=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.); vec4 c=tx(uv); vec4 f=max(pv(q)*inside*clamp(uP.x,0.,.96)-${EPS},vec4(0.)); gl_FragColor=max(c,f); }` },
    'SLIT SCAN': { labels: ['Quadros (2 a 24)', 'Eixo (0 = X, 1 = Y)', 'Inverter (0 ou 1)', 'Curvatura'], d: [16, 0, 0, 0], kind: 'History', ring: 'p1', decay: 0, tag: 'tempo',
      src: `void main(){ vec2 uv=gl_FragCoord.xy/uRes; float t=uP.y>.5?uv.y:uv.x; if(uP.z>.5) t=1.-t; t=pow(clamp(t,0.,1.),1.+max(-.8,uP.w)); float n=clamp(floor(uP.x+.5),2.,24.); float lag=floor(t*(n-1.)+.5); gl_FragColor=hs(uv,lag); }` },
    DESLOCAR: { labels: ['Quantidade (px)', 'Ganho', '—', '—'], d: [12, 1.5, 0, 0], kind: 'History', ring: 2, decay: 0, tag: 'tempo',
      src: 'void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 c=tx(uv), b=hs(uv,1.); vec2 d=(b.rg-c.rg)*uP.y; gl_FragColor=tx(uv+d*uP.x/uRes); }' },
  };
  const NAMES = Object.keys(PRESETS);
  const body = src => PRE + src.replace(/void\s+main\s*\(\s*\)/, 'void tmMain()') + ' void main(){ tmMain(); vec4 o=tx(gl_FragCoord.xy/uRes); gl_FragColor=mix(o,gl_FragColor,uMixK); }';
  const presetOf = p => PRESETS[p.preset] || PRESETS.TRILHA;
  const ringOf = (S, p) => S.ring === 'p1' ? Math.max(2, Math.min(24, Math.round(p.p1))) : (S.ring || 0);
  /* quadros de replay: a persistência cai abaixo de 1/255 em ln(1/255)/ln(k); a perda fixa de 1,5/255 por passo garante o fim */
  const replayOf = (S, p, n) => S.kind === 'Feedback' ? Math.max(1, Math.min(40, Math.ceil(Math.log(1 / 255) / Math.log(Math.max(0.05, Math.min(0.96, p.p1)))) )) : Math.max(1, n - 1);

  const ALL = new Set(), BY = new WeakMap();
  let replayDepth = 0;
  function stateOf(L, w, h, sig, ringN) {
    const slot = BY.get(L) || {}; BY.set(L, slot); const key = (replayDepth > 0 ? 'r' : 'm') + w + 'x' + h + '|' + sig + '|' + ringN; let st = slot[key];
    const r = GL.r;
    if (!st || st.dead) {
      st = slot[key] = { slot, key, w, h, sig, ringN, last: null, head: 0, filled: 0, used: r.frame, prev: r.textures.acquire({ w, h, usage: 'history' }), out: r.textures.acquire({ w, h, usage: 'history' }),
        arr: ringN ? r.arrays.acquire({ w, h, layers: ringN, usage: 'history' }) : null, scr: document.createElement('canvas') };
      st.scr.width = w; st.scr.height = h; ALL.add(st);
    }
    return st;
  }
  function free(st) { if (!GL.r) return; GL.r.textures.release(st.prev); GL.r.textures.release(st.out); if (st.arr) GL.r.arrays.release(st.arr); ALL.delete(st); st.dead = true; if (st.slot && st.slot[st.key] === st) delete st.slot[st.key]; }
  const reset = st => { st.last = null; st.head = 0; st.filled = 0; GL.r.clearTexture(st.prev); GL.r.clearTexture(st.out); };
  /* libera o histórico das camadas que sumiram ou pararam (apagadas, desligadas) */
  function sweep() { if (!GL.r) return; for (const st of [...ALL]) if (GL.r.frame - st.used > 90) free(st); }
  function resetAll() { for (const st of [...ALL]) free(st); }

  function draw(c, R) {
    const { p, L, W, H, k, below, idx, comp } = R; if (!below) return;
    const gl = glInit(); if (!gl) return;
    const S = presetOf(p), prog = glProg(body(S.src)); if (!prog) return;
    const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(below.width * p.res))), h = Math.max(2, Math.min(4096, Math.round(below.height * p.res))), ringN = ringOf(S, p);
    const st = stateOf(L, w, h, p.preset, ringN), raw = R.F.raw, LF = loopFrames(), cont = (st.last == null) ? false : P.time.loop ? ((st.last + 1) % LF) : st.last + 1;
    st.used = r.frame;
    const step = (src, advance) => {
      const sx = st.scr.getContext('2d'); sx.setTransform(1, 0, 0, 1, 0, 0); sx.globalCompositeOperation = 'copy'; sx.drawImage(src, 0, 0, w, h);
      if (ringN) { if (advance) { st.head = (st.head + 1) % ringN; st.filled = Math.min(ringN, st.filled + 1); } r.uploadSlice(st.arr, st.head, st.scr); }
      if (S.kind === 'Feedback' && advance) { const t = st.prev; st.prev = st.out; st.out = t; }
      r.resize(w, h); r.viewport(w, h); r.use(prog);
      const tex = r.uploadCanvas(st.scr, 0); r.bindTexture(st.prev.tex, 1); if (ringN) r.bindArray(st.arr, 2);
      for (const [n, v] of [['uTex', 0], ['uPrev', 1], ['uHist', 2]]) { const l = r.loc(prog, n); if (l) gl.uniform1i(l, v); }
      { const l = r.loc(prog, 'uMixK'); if (l) gl.uniform1f(l, p.mix); const hd = r.loc(prog, 'uHead'); if (hd) gl.uniform1f(hd, st.head); const nn = r.loc(prog, 'uN'); if (nn) gl.uniform1f(nn, ringN || 1); }
      glFrameUniforms(r, prog, frameContext(R, w, h), R, 1);
      r.bindFramebuffer(null); r.clear(); r.drawFullscreen();
      if (S.kind === 'Feedback') r.copyScreenTo(st.out, 0);
      r.textures.release(tex);
    };
    let mode = raw === st.last ? 'redraw' : raw === cont ? 'advance' : 'reset';
    if (mode === 'reset') {
      reset(st);
      if (replayDepth === 0) {   /* num replay interno a camada começa fria: o erro some dentro da janela da camada de cima */
        const n = replayOf(S, p, ringN), cv = below.__tmScratch || (below.__tmScratch = document.createElement('canvas'));
        replayDepth++;
        try {
          for (let j = n; j >= 1; j--) {
            const rj = P.time.loop ? (((raw - j) % LF) + LF) % LF : raw - j; if (rj < 0) continue;
            cv.width = below.width; cv.height = below.height;
            renderBelow(comp, idx, frameAt(rj, comp), k, W, H, cv); step(cv, true);
          }
        } finally { replayDepth--; }
      }
      mode = 'advance';
    }
    step(below, mode === 'advance'); st.last = raw;
    c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
  }
  return { PRESETS, NAMES, PRE, body, presetOf, draw, resetAll, sweep, ringOf, replayOf, get replaying() { return replayDepth > 0; }, enterReplay() { replayDepth++; }, leaveReplay() { replayDepth--; } };
})();
reg('temporal', 'Tempo (trilha, feedback, slit scan)', 'gen', [
  S('preset', 'Efeito', 'TRILHA', TM.NAMES), N('p1', 'P1', 0.8, -400, 400), N('p2', 'P2', 1, -400, 400), N('p3', 'P3', 0, -400, 400), N('p4', 'P4', 0, -400, 400),
  N('mix', 'Mistura', 1, 0, 1), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => TM.draw(c, R));
