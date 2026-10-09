/* Camada "fx": efeito de uma passada que lê tudo o que está ABAIXO dela na pilha (textura de entrada) e devolve a imagem processada.
   É o que faltava ao shader de passe único (L1): CRT, VHS, halftone, dither, bordas, pintura, vidro líquido, bloom, glitch, repetição e auto-modulação (ideia de cadeia do Hydra).
   Todo o código GLSL é do projeto. O tempo só entra por uPh (fase do loop) e por passos inteiros por loop, então o loop fecha como nos outros shaders.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: skill/ai-vj-generator/references/fx-layer.md */
const FX_PRE = 'uniform sampler2D uTex; uniform float uMixK; vec4 tx(vec2 q){return texture2D(uTex,q);} float fxLuma(vec3 c){return dot(c,vec3(.299,.587,.114));} ';
const FX = {
  PIXELATE: { labels: ['Célula (px)', 'Respiro', 'Suavizar', '—'], d: [14, 0.3, 0, 0], tag: 'tela', src:
`void main(){ float s=max(2.,uP.x*(1.+uP.y*.5*sin(TAU*uPh))); vec2 c=(floor(gl_FragCoord.xy/s)+.5)*s; vec4 a=tx(c/uRes), b=tx(gl_FragCoord.xy/uRes); gl_FragColor=mix(a,b,clamp(uP.z,0.,1.)*.5); }` },
  HALFTONE: { labels: ['Célula (px)', 'Ângulo (°)', 'Suavidade', 'Cor da fonte'], d: [9, 45, 0.9, 0.5], tag: 'impressão', src:
`void main(){ float s=max(3.,uP.x), a=uP.y*.0174533; mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a)), Ri=mat2(cos(a),sin(a),-sin(a),cos(a)); vec2 p=R*gl_FragCoord.xy, g=floor(p/s)+.5; vec4 t=tx((Ri*(g*s))/uRes);
  float l=fxLuma(t.rgb), r=sqrt(l)*s*.72, d=length(p-g*s), k=smoothstep(r+uP.z,r-uP.z,d); vec3 ink=mix(uC1,t.rgb,clamp(uP.w,0.,1.)); gl_FragColor=vec4(mix(uBg,ink,k),t.a); }` },
  DITHER: { labels: ['Níveis', 'Pixel (px)', 'Mistura de paleta', 'Duotom'], d: [3, 3, 0.8, 0], tag: 'tela', src:
`float b2(vec2 p){p=mod(p,2.);return p.x<1.?(p.y<1.?0.:3.):(p.y<1.?2.:1.);}
float b4(vec2 p){return (4.*b2(p)+b2(floor(p/2.)))/16.;}
void main(){ float s=max(1.,uP.y); vec2 q=floor(gl_FragCoord.xy/s); vec4 t=tx((q+.5)*s/uRes); float n=max(2.,uP.x), th=b4(q)-.5; vec3 c=t.rgb;
  if(uP.w>.5){ float l=fxLuma(c); l=floor(l*(n-1.)+.5+th)/(n-1.); c=mix(uBg,uC1,clamp(l,0.,1.)); } else c=floor(c*(n-1.)+.5+th)/(n-1.);
  gl_FragColor=vec4(mix(t.rgb,c,clamp(uP.z,0.,1.)),t.a); }` },
  CRT: { labels: ['Curvatura', 'Linhas de varredura', 'Máscara RGB', 'Brilho (glow)'], d: [0.12, 0.35, 0.3, 0.4], tag: 'tela', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes, c=uv*2.-1.; c*=1.+dot(c,c)*uP.x*.25; vec2 q=c*.5+.5; float inside=step(0.,q.x)*step(q.x,1.)*step(0.,q.y)*step(q.y,1.);
  vec4 t=tx(q); vec3 g=(tx(q+vec2(2.,0.)/uRes).rgb+tx(q-vec2(2.,0.)/uRes).rgb+tx(q+vec2(0.,2.)/uRes).rgb+tx(q-vec2(0.,2.)/uRes).rgb)*.25;
  float sl=1.-uP.y*(.5+.5*sin(q.y*uRes.y*3.14159)); float m=mod(floor(gl_FragCoord.x),3.); vec3 mk=vec3(m<1.?1.:1.-uP.z,(m>=1.&&m<2.)?1.:1.-uP.z,m>=2.?1.:1.-uP.z);
  vec3 col=(t.rgb+g*uP.w)*sl*mk*(1.15-.5*dot(c,c)*.5); gl_FragColor=vec4(col*inside,max(t.a,1.-inside)*step(.001,inside+t.a)); }` },
  VHS: { labels: ['Tremor', 'Vazamento de cor', 'Ruído', 'Faixa de rastreio'], d: [0.6, 0.6, 0.35, 0.5], tag: 'tela', src:
`float vh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes; float st=mod(floor(uPh*24.),24.), row=floor(gl_FragCoord.y/2.); float j=(vh(vec2(row,st))-.5)*uP.x*.01*step(.7,vh(vec2(row*.1,st+3.)));
  float band=fract(uPh), bd=smoothstep(.06,0.,abs(uv.y-(1.-band)))*uP.w; j+=bd*.03*sin(uv.y*80.);
  vec2 q=vec2(uv.x+j,uv.y); float bl=uP.y*.006; vec4 t=tx(q); vec3 c=vec3(tx(q+vec2(bl,0.)).r,t.g,tx(q-vec2(bl,0.)).b);
  c+= (vh(gl_FragCoord.xy+st)-.5)*uP.z*.35+bd*.2; c=mix(vec3(fxLuma(c)),c,.85); gl_FragColor=vec4(c,t.a); }` },
  'ABERRAÇÃO CROMÁTICA': { labels: ['Quantidade', 'Radial (0 a 1)', 'Ângulo (°)', 'Suavização'], d: [1.6, 1, 0, 0.3], tag: 'lente', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes, c=uv-.5; float a=uP.z*.0174533; vec2 dir=mix(vec2(cos(a),sin(a)),normalize(c+1e-5)*length(c)*2.,clamp(uP.y,0.,1.)); vec2 d=dir*uP.x*.01*(1.+uBass*.4);
  vec4 t=tx(uv); vec3 col=vec3(tx(uv+d).r,tx(uv).g,tx(uv-d).b); col=mix(col,vec3(tx(uv+d*.5).r,t.g,tx(uv-d*.5).b),clamp(uP.w,0.,1.)*.5); gl_FragColor=vec4(col,t.a); }` },
  'BORDAS NEON': { labels: ['Ganho', 'Largura (px)', 'Fonte visível', 'Contraste'], d: [2.2, 1.2, 0.25, 1.2], tag: 'traço', src:
`float lm(vec2 q){return fxLuma(tx(q).rgb);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes, e=max(.5,uP.y)/uRes; float a=lm(uv-e),b=lm(uv+vec2(0.,-e.y)),c=lm(uv+vec2(e.x,-e.y)),d=lm(uv-vec2(e.x,0.)),f=lm(uv+vec2(e.x,0.)),g=lm(uv+vec2(-e.x,e.y)),h=lm(uv+vec2(0.,e.y)),i=lm(uv+e);
  float gx=-a-2.*d-g+c+2.*f+i, gy=-a-2.*b-c+g+2.*h+i, m=clamp(pow(length(vec2(gx,gy))*uP.x,uP.w),0.,1.); vec4 t=tx(uv); vec3 ink=mix(uC1,uC2,.5+.5*sin(atan(gy,gx)+TAU*uPh));
  gl_FragColor=vec4(t.rgb*uP.z+ink*m*(1.+uHit*.6),max(t.a,m)); }` },
  KUWAHARA: { labels: ['Raio', 'Nitidez', '—', '—'], d: [3, 1, 0, 0], tag: 'pintura', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes, px=1./uRes; float R=floor(clamp(uP.x,1.,4.)+.5); vec3 m0=vec3(0.),m1=vec3(0.),m2=vec3(0.),m3=vec3(0.); vec3 s0=vec3(0.),s1=vec3(0.),s2=vec3(0.),s3=vec3(0.); float n=0.;
  for(int j=0;j<=4;j++){ for(int i=0;i<=4;i++){ if(float(i)>R||float(j)>R) continue; n+=1.; vec2 o=vec2(float(i),float(j))*px; vec3 a=tx(uv+vec2(-o.x,-o.y)).rgb,b=tx(uv+vec2(o.x,-o.y)).rgb,c=tx(uv+vec2(-o.x,o.y)).rgb,d=tx(uv+o).rgb;
    m0+=a;s0+=a*a;m1+=b;s1+=b*b;m2+=c;s2+=c*c;m3+=d;s3+=d*d; } }
  m0/=n;m1/=n;m2/=n;m3/=n; float v0=dot(abs(s0/n-m0*m0),vec3(1.)),v1=dot(abs(s1/n-m1*m1),vec3(1.)),v2=dot(abs(s2/n-m2*m2),vec3(1.)),v3=dot(abs(s3/n-m3*m3),vec3(1.));
  vec3 c=m0; float v=v0; if(v1<v){v=v1;c=m1;} if(v2<v){v=v2;c=m2;} if(v3<v){v=v3;c=m3;} vec4 t=tx(uv); gl_FragColor=vec4(mix(c,c*c*(3.-2.*c),clamp(uP.y-1.,0.,1.)),t.a); }` },
  'MAPA DE GRADIENTE': { labels: ['Níveis (0 = liso)', 'Contraste', 'Mistura com a fonte', 'Deslocar'], d: [0, 1.1, 0.15, 0], tag: 'cor', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 t=tx(uv); float l=clamp((fxLuma(t.rgb)-.5)*uP.y+.5+uP.w*sin(TAU*uPh)*.1,0.,1.); if(uP.x>1.5) l=floor(l*uP.x)/(uP.x-1.);
  vec3 g=l<.5?mix(uBg,uC2,l*2.):mix(uC2,uC1,l*2.-1.); gl_FragColor=vec4(mix(g,t.rgb,clamp(uP.z,0.,1.)),t.a); }` },
  'PAINEL DE LED': { labels: ['Passo (px)', 'Tamanho do LED', 'Gama', 'Vazamento de luz'], d: [10, 0.42, 1.2, 0.35], tag: 'tela', src:
`void main(){ float s=max(3.,uP.x); vec2 id=floor(gl_FragCoord.xy/s), f=fract(gl_FragCoord.xy/s)-.5; vec4 t=tx((id+.5)*s/uRes); float d=length(f), k=smoothstep(uP.y+.06,uP.y-.06,d), bl=smoothstep(.75,.0,d)*uP.w*.35;
  vec3 c=pow(t.rgb,vec3(uP.z)); gl_FragColor=vec4(c*(k+bl)+uBg*(1.-k)*.15,t.a); }` },
  'VIDRO LÍQUIDO': { labels: ['Refração', 'Suavidade (px)', 'Aberração', 'Brilho de borda'], d: [28, 6, 0.6, 0.5], tag: 'lente', src:
`float gl(vec2 q){return fxLuma(tx(q).rgb);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes, e=max(1.,uP.y)/uRes; float t0=TAU*uPh; vec2 w=vec2(sin(uv.y*5.+t0),cos(uv.x*4.-t0))*.004;
  vec2 n=vec2(gl(uv+vec2(e.x,0.)+w)-gl(uv-vec2(e.x,0.)+w),gl(uv+vec2(0.,e.y)+w)-gl(uv-vec2(0.,e.y)+w)); vec2 o=(n*uP.x+w*uP.x*2.)/uRes*.5;
  vec3 c=vec3(tx(uv+o*(1.+uP.z)).r,tx(uv+o).g,tx(uv+o*(1.-uP.z)).b); float rim=pow(clamp(length(n)*4.,0.,1.),1.5)*uP.w; vec4 t=tx(uv); gl_FragColor=vec4(c+uC1*rim*.5,t.a); }` },
  DESLOCAR: { labels: ['Quantidade (px)', 'Escala', 'Velocidade (voltas)', 'Direção (°)'], d: [18, 3, 1, 0], tag: 'distorção', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes; float a=uP.w*.0174533; vec2 L=loopv(floor(uP.z+.5)*.35)+uSeed; vec2 q=uv*uP.y+L; vec2 d=vec2(noise(q)-.5,noise(q+7.3)-.5)*2.; d=mix(d,vec2(cos(a),sin(a))*d.x,.0);
  gl_FragColor=tx(uv+d*uP.x/uRes*(1.+uBass*.5)); }` },
  ESPELHO: { labels: ['Dobras', 'Voltas por loop', 'Zoom', 'Mistura central'], d: [6, 1, 1, 0.2], tag: 'geometria', src:
`void main(){ vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv*=vjRot(TAU*uPh*floor(uP.y+.5)); vec2 k=vjKaleid(uv,max(2.,floor(uP.x+.5)))/max(.2,uP.z); vec2 q=k*uRes.y/uRes+.5; vec4 t=tx(q); vec4 o=tx(gl_FragCoord.xy/uRes);
  gl_FragColor=vec4(mix(t.rgb,o.rgb,clamp(uP.w,0.,1.)*smoothstep(.5,0.,length(uv))),max(t.a,o.a)); }` },
  BLOOM: { labels: ['Raio (px)', 'Limiar', 'Intensidade', 'Tom (cor 1)'], d: [14, 0.55, 1.2, 0.3], tag: 'luz', src:
`vec3 bp(vec2 q,float th){vec3 c=tx(q).rgb;return max(c-th,0.)/(1.-th+1e-3);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 t=tx(uv); vec3 acc=vec3(0.); float th=clamp(uP.y,0.,.95);
  for(int i=0;i<12;i++){ float a=float(i)*.5236; vec2 d=vec2(cos(a),sin(a)); acc+=bp(uv+d*uP.x/uRes,th)+bp(uv+d*uP.x*2./uRes,th)*.6; }
  acc/=12.*1.6; vec3 tint=mix(vec3(1.),uC1,clamp(uP.w,0.,1.)); gl_FragColor=vec4(t.rgb+acc*tint*uP.z*(1.+uBass*.5),t.a); }` },
  'ARRASTO DE PIXEL': { labels: ['Comprimento (px)', 'Limiar', 'Ângulo (°)', 'Mistura'], d: [90, 0.45, 90, 0.9], tag: 'glitch', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes; float a=uP.z*.0174533; vec2 dir=vec2(cos(a),sin(a))*uP.x/24./uRes; vec4 t=tx(uv); vec4 best=t; float on=1.;
  for(int i=1;i<=24;i++){ vec4 s=tx(uv-dir*float(i)); on*=step(uP.y,fxLuma(s.rgb)+.0*float(i)); best=mix(best,s,on*step(fxLuma(best.rgb),fxLuma(s.rgb))); } gl_FragColor=mix(t,best,clamp(uP.w,0.,1.)); }` },
  'GRADE E VINHETA': { labels: ['Contraste', 'Saturação', 'Vinheta', 'Grão'], d: [1.1, 1.05, 0.35, 0.12], tag: 'cor', src:
`float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec4 t=tx(uv); vec3 c=(t.rgb-.5)*uP.x+.5; float l=fxLuma(c); c=mix(vec3(l),c,uP.y); c*=1.-uP.z*smoothstep(.35,.95,length(uv-.5)*1.3); c+=(gh(gl_FragCoord.xy+mod(floor(uPh*24.),24.))-.5)*uP.w; gl_FragColor=vec4(c,t.a); }` },
  'GLITCH EM BLOCOS': { labels: ['Altura do bloco (px)', 'Deslocamento (px)', 'Probabilidade', 'Passos por loop'], d: [26, 90, 0.35, 12], tag: 'glitch', src:
`float gh(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes; float st=mod(floor(uPh*max(1.,floor(uP.w+.5))),max(1.,floor(uP.w+.5))), row=floor(gl_FragCoord.y/max(2.,uP.x)); float on=step(1.-clamp(uP.z,0.,1.)*(.6+uHit*.4),gh(vec2(row,st)));
  float sh=(gh(vec2(row+9.,st))-.5)*2.*uP.y/uRes.x*on; vec4 t=tx(vec2(uv.x+sh,uv.y)); float sp=.004*on; gl_FragColor=vec4(tx(vec2(uv.x+sh+sp,uv.y)).r,t.g,tx(vec2(uv.x+sh-sp,uv.y)).b,t.a); }` },
  REPETIR: { labels: ['Colunas', 'Linhas', 'Deslocar (voltas)', 'Espelhar'], d: [3, 3, 1, 0.5], tag: 'geometria', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 n=max(vec2(1.),floor(vec2(uP.x,uP.y)+.5)); vec2 q=uv*n; float row=floor(q.y); q.x+=row*.5*floor(uP.z+.5)*sin(TAU*uPh)*0.; vec2 f=fract(q);
  if(uP.w>.5){ f=mix(f,1.-f,step(.5,mod(floor(q),2.))); } gl_FragColor=tx(f); }` },
  AUTOMODULAÇÃO: { labels: ['Quantidade (px)', 'Escala', 'Rotação (voltas)', 'Canal (0 cor, 1 luz)'], d: [40, 1, 1, 0], tag: 'distorção', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes; vec2 c=uv-.5; c=vjRot(TAU*uPh*floor(uP.z+.5))*c/max(.3,uP.y)+.5; vec4 m=tx(c); vec2 d=uP.w>.5?vec2(fxLuma(m.rgb)-.5):(m.rg-.5); gl_FragColor=tx(uv+d*uP.x/uRes*(1.+uBass*.4)); }` },
  SABATTIER: { labels: ['Limiar', 'Suavidade', 'Linha de Mackie', 'Mistura de cor'], d: [0.5, 0.12, 0.8, 0.7], tag: 'foto', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes, e=1.5/uRes; vec4 t=tx(uv); vec3 c=t.rgb; float th=uP.x+.1*sin(TAU*uPh); vec3 sol=mix(c,1.-c,smoothstep(th-uP.y,th+uP.y,c));
  float l0=fxLuma(c), l1=fxLuma(tx(uv+vec2(e.x,0.)).rgb), l2=fxLuma(tx(uv+vec2(0.,e.y)).rgb); float ed=clamp((abs(l0-l1)+abs(l0-l2))*6.,0.,1.);
  vec3 o=mix(vec3(fxLuma(sol)),sol,clamp(uP.w,0.,1.)); o=mix(o,uC1,ed*uP.z*.5); gl_FragColor=vec4(o,t.a); }` },
  HACHURA: { labels: ['Espaçamento (px)', 'Espessura', 'Papel x tinta (0 a 1)', 'Cor da fonte'], d: [7, 0.32, 1, 0.15], tag: 'traço', src:
`float hl(vec2 p,float a,float sp,float w){float c=cos(a),s=sin(a);float q=(p.x*c+p.y*s)/sp;return smoothstep(w,w-.18,abs(fract(q)-.5)*2.);}
void main(){ vec2 uv=gl_FragCoord.xy/uRes, p=gl_FragCoord.xy; vec4 t=tx(uv); float d=1.-fxLuma(t.rgb), sp=max(3.,uP.x), w=clamp(uP.y,.05,.9);
  float k=hl(p,.7854,sp,w)*step(.22,d)+hl(p,-.7854,sp,w)*step(.45,d)+hl(p,0.,sp*1.1,w)*step(.68,d)+hl(p,1.5708,sp*1.1,w)*step(.85,d); k=clamp(k,0.,1.);
  vec3 paper=mix(uBg,uC1,clamp(uP.z,0.,1.)), ink=mix(uBg,t.rgb,clamp(uP.w,0.,1.)); gl_FragColor=vec4(mix(paper,ink,k),t.a); }` },
  'POLAR (PLANETINHA)': { labels: ['Voltas por loop', 'Potência do raio', 'Zoom', 'Mistura central'], d: [1, 0.8, 1, 0.1], tag: 'geometria', src:
`void main(){ vec2 uv=gl_FragCoord.xy/uRes, p=(uv-.5)*vec2(uRes.x/uRes.y,1.); float r=length(p)*2./max(.2,uP.z), a=atan(p.y,p.x)/TAU+.5+uPh*floor(uP.x+.5);
  vec2 q=vec2(fract(a),clamp(pow(r,max(.2,uP.y)),0.,1.)); vec4 t=tx(q); vec4 o=tx(uv); gl_FragColor=vec4(mix(t.rgb,o.rgb,clamp(uP.w,0.,1.)*smoothstep(.3,0.,r)),max(t.a,o.a)); }` },
};
const FX_NAMES = Object.keys(FX);
function fxBody(src) { return FX_PRE + src.replace(/void\s+main\s*\(\s*\)/, 'void fxMain()') + ' void main(){ fxMain(); vec4 o=tx(gl_FragCoord.xy/uRes); gl_FragColor=mix(o,gl_FragColor,uMixK); }'; }
const fxOf = p => FX[p.preset] || FX.PIXELATE;
/* o efeito entra no lugar do que está abaixo: com opacidade cheia e blend normal ele substitui a imagem (copy); senão mistura */
const fxOp = (L, op) => L.type === 'fx' && (L.opacity == null || L.opacity >= 0.999) && (!L.blend || L.blend === 'normal') ? 'copy' : op;
const BELOW_TYPES = new Set(['fx', 'blobs']);   // camadas que leem a imagem das camadas abaixo
let FXS = null;   // canvas de rascunho para a imagem "abaixo" na viewport
function fxLiveBelow(comp, i) {
  const src = DOM.layers[0] && DOM.layers[0].cv; if (!src) return null;
  if (!FXS) FXS = document.createElement('canvas'); if (FXS.width !== src.width || FXS.height !== src.height) { FXS.width = src.width; FXS.height = src.height; }
  compositeTo(FXS.getContext('2d'), comp, DOM.layers.map(d => d.cv), { bgFill: '#000', upTo: i });
  return FXS;
}
reg('fx', 'Efeito sobre as camadas abaixo', 'gen', [
  S('preset', 'Efeito', 'PIXELATE', FX_NAMES), N('p1', 'P1', 14, -400, 400), N('p2', 'P2', 0.3, -400, 400), N('p3', 'P3', 0, -400, 400), N('p4', 'P4', 0, -400, 400),
  N('mix', 'Mistura', 1, 0, 1), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const { p, W, H, k, below } = R; if (!below) return;
  const gl = glInit(); if (!gl) return;
  const prog = glProg(fxBody(fxOf(p).src)); if (!prog) return;
  const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(W * k * p.res))), h = Math.max(2, Math.min(4096, Math.round(H * k * p.res)));
  r.resize(w, h); r.viewport(w, h); r.use(prog);
  const tex = r.uploadCanvas(below, 0);
  { const l = r.loc(prog, 'uTex'); if (l) gl.uniform1i(l, 0); const m = r.loc(prog, 'uMixK'); if (m) gl.uniform1f(m, p.mix); }
  glFrameUniforms(r, prog, frameContext(R, w, h), R, 1);
  r.clear(); r.drawFullscreen(); r.textures.release(tex);
  c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
});
