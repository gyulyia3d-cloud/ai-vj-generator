/* 2D generativo avançado (fase 8): campos, topologias, tipografia e imagem como fonte. Duas camadas novas:
   `field`  (GPU): um CAMPO escalar (ruído fbm que anda numa volta fechada por loop, ou a luminância de uma imagem do projeto) vira desenho por uma de 12 regras:
            isolinhas, correntes (linhas de fluxo), células (Voronoi), Truchet, pontos em favo, moiré, metabolas, interferência, pontilhado, relevo, grade deformada e polar.
            A imagem escolhida em `media` vira a fonte do campo: o mesmo desenho, outra origem. Sem imagem, o campo é ruído. O tempo só entra por uPh e por voltas inteiras, então o loop fecha.
   `glyphs` (canvas 2D): TIPOGRAFIA generativa em grade. Cada célula escolhe um caractere de uma rampa (a string `ramp`, do mais vazio ao mais cheio) segundo o campo
            (ruído, radial, onda, espiral ou luminância de uma imagem) e uma cor entre c1 e c2. Função pura do quadro: determinística, o loop fecha.
   Todo o código é do projeto. Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: skill/ai-vj-generator/references/field-layer.md */
const FLD_PRE = 'uniform sampler2D uTex; uniform float uImg, uGain, uInv; float fLum(vec2 q){return dot(texture2D(uTex,q).rgb,vec3(.299,.587,.114));} ' +
  'float fS(vec2 uv,float sc,float dr){float s; if(uImg>.5) s=fLum(uv*vec2(uRes.y/uRes.x,1.)+.5); else s=fbm(uv*sc+loopv(dr)+uSeed); s=clamp((s-.5)*uGain+.5,0.,1.); return uInv>.5?1.-s:s;} ' +
  'vec2 fR(vec2 p,float a){float c=cos(a),s=sin(a);return vec2(c*p.x-s*p.y,s*p.x+c*p.y);} float fSmin(float a,float b,float k){float h=max(k-abs(a-b),0.)/k;return min(a,b)-h*h*k*.25;} ';
const FLD = {
  ISOLINHAS: { labels: ['Escala do campo', 'Níveis', 'Espessura', 'Deriva'], d: [3, 10, 0.16, 0.5], tag: 'campo', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float f=fS(uv,uP.x,uP.w); float v=f*max(1.,uP.y)+uBass*.15; float d=abs(fract(v)-.5)*2.; float w=uP.z*(1.+uHit*.6);
float k=smoothstep(1.-w-.07,1.-w,d); gl_FragColor=outc(mix(uC1,uC2,f),clamp(k+uPulse*.05,0.,1.));}` },
  CORRENTES: { labels: ['Escala do campo', 'Comprimento do fio', 'Densidade dos fios', 'Deriva'], d: [2.5, 0.5, 50, 0.4], tag: 'campo', src:
`vec2 fv(vec2 p){float e=.02; float a=fS(p+vec2(0.,e),uP.x,uP.w)-fS(p-vec2(0.,e),uP.x,uP.w); float b=fS(p+vec2(e,0.),uP.x,uP.w)-fS(p-vec2(e,0.),uP.x,uP.w); return normalize(vec2(a,-b)+vec2(1e-5));}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 p=uv; float acc=0.; float st=uP.y/10.;
for(int i=0;i<10;i++){p+=fv(p)*st; acc+=noise(p*uP.z+uSeed);} float v=clamp((acc/10.-.5)*3.2+.5+uBass*.1,0.,1.);
gl_FragColor=outc(mix(uC1,uC2,fS(uv,uP.x,uP.w)),v);}` },
  CELULAS: { labels: ['Densidade', 'Modo (0 bordas, 1 cheias, 2 mosaico)', 'Borda', 'Ciclos'], d: [7, 0, 0.4, 1], tag: 'topologia', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x; vec2 i=floor(uv),f=fract(uv); float d1=8.,d2=8.; vec2 best=vec2(0.);
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)); vec2 h=vec2(hash(i+g+uSeed),hash(i+g+19.1+uSeed));
vec2 o=.5+.45*sin(TAU*(uPh*floor(uP.w+.5)+h)); float d=length(g+o-f); if(d<d1){d2=d1;d1=d;best=i+g+o;}else if(d<d2){d2=d;}}
float e=1.-smoothstep(0.,uP.z*.08+.006+uBass*.03,d2-d1); float s=fS(best/uP.x,2.5,.3); float m=floor(uP.y+.5); if(m>1.5) s=floor(s*4.+.5)/4.;
vec3 c=mix(uC1,uC2,s); float k=1.; if(m<.5) k=e; else c=mix(c,uBg,e*.85); gl_FragColor=outc(c,clamp(k+uHit*e*.4,0.,1.));}` },
  TRUCHET: { labels: ['Células', 'Limiar da fonte', 'Espessura', 'Varredura do limiar'], d: [10, 0.5, 0.12, 0.2], tag: 'topologia', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x+vec2(uSeed*3.,0.); vec2 id=floor(uv),f=fract(uv);
float s=uImg>.5?fS((id+.5-vec2(uSeed*3.,0.))/uP.x,1.,0.):hash(id+uSeed); float th=uP.y+uP.w*sin(TAU*uPh); if(s>th) f.x=1.-f.x;
float d=min(abs(length(f)-.5),abs(length(f-vec2(1.))-.5)); float w=uP.z*(1.+uBass*.4); float k=1.-smoothstep(w-.02,w+.02,d); gl_FragColor=outc(mix(uC1,uC2,s),k);}` },
  PONTOS: { labels: ['Densidade', 'Raio mínimo', 'Raio máximo', 'Ondulação das fileiras'], d: [26, 0.08, 0.46, 0.3], tag: 'topologia', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x; float sh=.5*mod(floor(uv.y),2.)*(1.+uP.w*sin(TAU*uPh)); vec2 us=vec2(uv.x+sh,uv.y); vec2 id=floor(us),f=fract(us)-.5;
vec2 cen=vec2(id.x+.5-sh,id.y+.5)/uP.x; float s=fS(cen,3.,.4); float r=mix(uP.y,uP.z,s)*(1.+uBass*.3); float k=1.-smoothstep(r-.05,r+.05,length(f)); gl_FragColor=outc(mix(uC1,uC2,s),k);}` },
  MOIRE: { labels: ['Frequência', 'Ângulo entre as grades (°)', 'Distorção pela fonte', 'Voltas por loop'], d: [48, 5, 0.5, 1], tag: 'interferência', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float f=fS(uv,2.,.4); float wp=(f-.5)*uP.z; float a=uP.y*.0174533;
float g1=.5+.5*sin(TAU*(uv.x*uP.x+wp)); vec2 r=fR(uv,a); float g2=.5+.5*sin(TAU*(r.x*uP.x-wp)+TAU*uPh*floor(uP.w+.5));
float k=smoothstep(.2,.65,g1*g2*(1.+uBass*.5)*1.6); gl_FragColor=outc(mix(uC1,uC2,f),k);}` },
  METABOLAS: { labels: ['Corpos', 'Suavidade da união', 'Raio', 'Órbitas por loop'], d: [6, 0.2, 0.16, 1], tag: 'sdf', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float nb=clamp(floor(uP.x+.5),1.,10.); float orb=floor(uP.w+.5); float d=1000.;
for(int i=0;i<10;i++){ if(float(i)>=nb) break; float fi=float(i); float a=TAU*(uPh*orb*(1.+mod(fi,3.))+hash(vec2(fi,uSeed)));
vec2 c=vec2(cos(a),sin(a))*(.16+.24*hash(vec2(fi,7.+uSeed)))*vec2(uRes.x/uRes.y*.7,1.); float r=uP.z*(.55+.9*fS(c,2.,.3))*(1.+uBass*.25);
d=fSmin(d,length(uv-c)-r,max(.01,uP.y)); }
float k=1.-smoothstep(0.,.012,d); float g=exp(-max(d,0.)*9.)*.45; gl_FragColor=outc(mix(uC1,uC2,clamp(-d*6.,0.,1.)),clamp(k+g,0.,1.));}` },
  INTERFERENCIA: { labels: ['Fontes de onda', 'Frequência', 'Contraste', 'Ciclos de fase'], d: [4, 22, 1.4, 1], tag: 'interferência', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float ns=clamp(floor(uP.x+.5),2.,8.); float acc=0.; float fq=uP.y*(1.+(fS(uv,2.,.3)-.5)*.6);
for(int i=0;i<8;i++){ if(float(i)>=ns) break; float fi=float(i); float a=TAU*(fi/ns+.07); vec2 c=vec2(cos(a),sin(a))*vec2(.5*uRes.x/uRes.y,.35)*(.55+.45*hash(vec2(fi,uSeed)));
acc+=sin(TAU*(length(uv-c)*fq-uPh*floor(uP.w+.5))); }
float v=.5+.5*acc/ns; float k=clamp((v-.5)*uP.z+.5+uBass*.1,0.,1.); gl_FragColor=outc(mix(uC1,uC2,v),k);}` },
  PONTILHADO: { labels: ['Colunas', 'Ganho', 'Ângulo da grade (°)', 'Suavidade'], d: [56, 1.3, 15, 0.1], tag: 'meio-tom', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float a=uP.z*.0174533; vec2 g=fR(uv,a)*uP.x; vec2 id=floor(g)+.5; vec2 cuv=fR(id/uP.x,-a); float s=fS(cuv,3.,.4);
float r=sqrt(clamp(s*uP.y,0.,1.))*.55*(1.+uBass*.2); float d=length(g-id); float k=1.-smoothstep(r-uP.w-.02,r+uP.w+.02,d); gl_FragColor=outc(mix(uC1,uC2,s),k);}` },
  RELEVO: { labels: ['Linhas', 'Altura do relevo', 'Espessura', 'Deriva'], d: [38, 1, 0.006, 0.4], tag: 'relevo', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float n=max(4.,uP.x); float j0=floor(uv.y*n); float best=1000.; float sv=0.;
for(int j=-2;j<=2;j++){ float y0=(j0+float(j))/n; float s=fS(vec2(uv.x,y0),3.,uP.w); float yl=y0+(s-.5)*uP.y*4./n*(1.+uBass*.3); float dd=abs(uv.y-yl); if(dd<best){best=dd;sv=s;} }
float w=uP.z*(1.+uHit*.5); float k=1.-smoothstep(w,w*1.8+.001,best); gl_FragColor=outc(mix(uC1,uC2,sv),k);}` },
  'GRADE DEFORMADA': { labels: ['Células', 'Deformação', 'Espessura', 'Deriva'], d: [12, 0.5, 0.04, 0.4], tag: 'topologia', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 w=vec2(fS(uv,2.,uP.w),fS(fR(uv,1.1)*.9,2.,uP.w))-.5; vec2 q=(uv+w*uP.y)*uP.x; vec2 f=min(fract(q),1.-fract(q));
float d=min(f.x,f.y); float th=uP.z*(1.+uBass*.5); float k=1.-smoothstep(th,th+.03,d); gl_FragColor=outc(mix(uC1,uC2,fS(uv,2.,uP.w)),k);}` },
  POLAR: { labels: ['Braços', 'Torção', 'Anéis', 'Voltas por loop'], d: [6, 2, 8, 1], tag: 'topologia', src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float r=length(uv)*2.; float a=atan(uv.y,uv.x)/TAU; float s=fS(uv,2.5,.4); float o=floor(uP.w+.5);
float tw=a*floor(uP.x+.5)+r*uP.y+(s-.5)*.6-uPh*o; float sp=abs(fract(tw)-.5)*2.; float rg=abs(fract(r*uP.z+(s-.5)*.4-uPh*o)-.5)*2.;
float w=.12*(1.+uBass*.5); float k=max(smoothstep(1.-w-.06,1.-w,sp),smoothstep(1.-w*.6-.06,1.-w*.6,rg)*.6); gl_FragColor=outc(mix(uC1,uC2,s),clamp(k,0.,1.));}` },
};
const FLD_NAMES = Object.keys(FLD);
const fldOf = p => FLD[p.kind] || FLD.ISOLINHAS;
const fldBody = p => shaderResolve(FLD_PRE + fldOf(p).src);
/* a imagem-fonte entra numa tela do tamanho do campo, com o encaixe pedido; fora da imagem o campo vale 0 (preto) */
let FLDCV = null;
function fldSource(m, w, h, fit) {
  if (!FLDCV) FLDCV = document.createElement('canvas'); if (FLDCV.width !== w || FLDCV.height !== h) { FLDCV.width = w; FLDCV.height = h; }
  const x = FLDCV.getContext('2d'); x.setTransform(1, 0, 0, 1, 0, 0); x.fillStyle = '#000'; x.fillRect(0, 0, w, h);
  const [dx, dy, dw, dh] = fitRect(m.w, m.h, w, h, fit || 'cover'); x.drawImage(m.img, dx, dy, dw, dh); return FLDCV;
}
reg('field', 'Campo (isolinhas, correntes, células, Truchet…)', 'gen', [
  S('kind', 'Regra', 'ISOLINHAS', FLD_NAMES), S('media', 'Imagem-fonte (vazio = campo de ruído)', '', []), S('fit', 'Encaixe da imagem', 'cover', ['cover', 'contain', 'fill']),
  B('invert', 'Inverter o campo', false), N('gain', 'Contraste do campo', 1, 0, 4), N('p1', 'P1', 3, -400, 400), N('p2', 'P2', 10, -400, 400), N('p3', 'P3', 0.16, -400, 400), N('p4', 'P4', 0.5, -400, 400),
  S('alphaMode', 'Saída', 'alpha', ['alpha', 'opaque']), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const { p, W, H, k } = R;
  const gl = glInit(); if (!gl) return;
  const prog = glProg(fldBody(p)); if (!prog) return;
  const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(W * k * p.res))), h = Math.max(2, Math.min(4096, Math.round(H * k * p.res)));
  r.resize(w, h); r.viewport(w, h); r.use(prog);
  const m = p.media && MEDIA[p.media], img = !!(m && m.img); let tex = null;
  if (img) { tex = r.uploadCanvas(fldSource(m, Math.min(w, 1024), Math.max(2, Math.round(Math.min(w, 1024) * h / w)), p.fit), 0); const l = r.loc(prog, 'uTex'); if (l) gl.uniform1i(l, 0); }
  for (const [n, v] of [['uImg', img ? 1 : 0], ['uGain', p.gain], ['uInv', p.invert ? 1 : 0]]) { const l = r.loc(prog, n); if (l) gl.uniform1f(l, v); }
  glFrameUniforms(r, prog, frameContext(R, w, h), R, p.alphaMode === 'alpha' ? 1 : 0);
  r.clear(); r.drawFullscreen(); if (tex) r.textures.release(tex);
  c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
});

/* ---- glyphs: tipografia generativa em grade ---- */
const GLY = (() => {
  const TAU = Math.PI * 2;
  /* hash inteiro determinístico (sem Math.random); valor em [0,1) */
  const h2 = (x, y, s) => { let h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263) ^ Math.imul(s | 0, 1442695041); h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };
  const sm = t => t * t * (3 - 2 * t);
  const vn = (x, y, s) => { const ix = Math.floor(x), iy = Math.floor(y), fx = sm(x - ix), fy = sm(y - iy); const a = h2(ix, iy, s), b = h2(ix + 1, iy, s), c = h2(ix, iy + 1, s), d = h2(ix + 1, iy + 1, s); return (a + (b - a) * fx) * (1 - fy) + (c + (d - c) * fx) * fy; };
  const fbm = (x, y, s) => { let v = 0, a = 0.5; for (let i = 0; i < 3; i++) { v += a * vn(x, y, s + i); x = x * 2.03 + 1.7; y = y * 2.03 + 9.2; a *= 0.5; } return v / 0.875; };
  /* valor do campo em (u,v), coordenadas centradas e divididas pela altura; ph = fase do loop (0..1); cyc = voltas inteiras */
  function field(src, u, v, ph, cyc, sc, seed) {
    const a = TAU * ph * cyc;
    if (src === 'radial') return 0.5 + 0.5 * Math.sin(TAU * (Math.hypot(u, v) * sc * 0.5 - ph * cyc));
    if (src === 'wave') return Math.min(1, Math.max(0, 0.5 + 0.5 * Math.sin(TAU * (u * sc * 0.4 + v * sc * 0.2 - ph * cyc)) + (fbm(u * sc * 0.5, v * sc * 0.5, seed) - 0.5) * 0.4));
    if (src === 'spiral') return 0.5 + 0.5 * Math.sin(TAU * (Math.atan2(v, u) / TAU * 3 + Math.hypot(u, v) * sc * 0.5 - ph * cyc));
    return fbm(u * sc + Math.cos(a) * 0.6, v * sc + Math.sin(a) * 0.6, seed);   // noise: anda numa volta fechada
  }
  return { h2, field, TAU };
})();
let GLYCV = null, GLYKEY = '', GLYDATA = null;
reg('glyphs', 'Glifos (tipografia generativa em grade)', 'gen', [
  S('source', 'Campo', 'noise', ['noise', 'radial', 'wave', 'spiral', 'image']), T('ramp', 'Rampa de caracteres (do mais vazio ao mais cheio)', ' .:-=+*#%@'),
  N('cell', 'Célula (px a 1080)', 18, 6, 160, 1), S('font', 'Fonte', 'mono', ['archivo', 'bebas', 'mono', 'helvetica']), N('weight', 'Peso', 700, 100, 900, 100),
  N('scale', 'Escala do campo', 3, 0.5, 20), N('cycles', 'Voltas por loop', 1, 0, 8, 1), N('gain', 'Contraste do campo', 1, 0, 4), B('invert', 'Inverter', false),
  N('shuffle', 'Embaralhar (passos por loop)', 0, 0, 1), S('media', 'Imagem-fonte (campo = image)', '', []), S('fit', 'Encaixe da imagem', 'cover', ['cover', 'contain', 'fill']),
  C('c1', 'Cor dos valores baixos', 'secondary'), C('c2', 'Cor dos valores altos', 'primary'),
], (c, R) => {
  const { p, F, comp, W, H, u } = R;
  const ramp = Array.from(String(p.ramp == null ? ' .:-=+*#%@' : p.ramp)); if (ramp.length < 2) return;
  let px = Math.max(4, p.cell * u); const maxCells = 40000;
  while (Math.ceil(W / px) * Math.ceil(H / px) > maxCells) px *= 1.15;
  const cols = Math.ceil(W / px), rows = Math.ceil(H / px), ph = F.lph, cyc = Math.round(p.cycles), seed = Math.round(P.seed || 0) % 9973, bass = F.bands ? F.bands.bass : 0;
  let img = null;
  if (p.source === 'image') {
    const m = p.media && MEDIA[p.media]; if (!m || !m.img) return;
    const key = [p.media, m.w, cols, rows, p.fit].join('|');
    if (key !== GLYKEY) {
      if (!GLYCV) GLYCV = document.createElement('canvas'); GLYCV.width = cols; GLYCV.height = rows;
      const x = GLYCV.getContext('2d', { willReadFrequently: true }); x.fillStyle = '#000'; x.fillRect(0, 0, cols, rows); const [dx, dy, dw, dh] = fitRect(m.w, m.h, cols, rows, p.fit || 'cover'); x.imageSmoothingEnabled = true; x.drawImage(m.img, dx, dy, dw, dh);
      GLYDATA = x.getImageData(0, 0, cols, rows).data; GLYKEY = key;
    }
    img = GLYDATA;
  }
  const lo = hexRgb(col(comp, p.c1)), hi = hexRgb(col(comp, p.c2)), BINS = 12, bins = [];
  for (let b = 0; b < BINS; b++) { const t = b / (BINS - 1); bins.push(`rgb(${Math.round(lo[0] + (hi[0] - lo[0]) * t)},${Math.round(lo[1] + (hi[1] - lo[1]) * t)},${Math.round(lo[2] + (hi[2] - lo[2]) * t)})`); }
  c.font = `${p.weight} ${px * 1.05}px ${fam(p.font)}`; c.textAlign = 'center'; c.textBaseline = 'middle';
  const step = Math.floor(ph * 8) % 8, last = ramp.length - 1, aspect = W / H;
  for (let j = 0; j < rows; j++) for (let i = 0; i < cols; i++) {
    let v;
    if (img) { const o = (j * cols + i) * 4; v = (0.299 * img[o] + 0.587 * img[o + 1] + 0.114 * img[o + 2]) / 255; }
    else v = GLY.field(p.source, ((i + 0.5) * px - W / 2) / H, ((j + 0.5) * px - H / 2) / H, ph, cyc, p.scale, seed);
    v = Math.min(1, Math.max(0, (v - 0.5) * p.gain + 0.5 + bass * 0.12)); if (p.invert) v = 1 - v;
    let idx = Math.round(v * last);
    if (p.shuffle > 0) idx = Math.min(last, Math.max(0, idx + Math.round((GLY.h2(i, j, seed + step * 31) - 0.5) * 2 * p.shuffle * last * 0.5)));
    const ch = ramp[idx]; if (ch === ' ') continue;
    c.fillStyle = bins[Math.min(BINS - 1, Math.floor(v * BINS))]; c.fillText(ch, (i + 0.5) * px, (j + 0.5) * px);
  }
});
