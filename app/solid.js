/* 3D generativo (fase 12): a camada `solid` desenha uma forma 3D por distância assinada (SDF) com raymarching num fragment shader WebGL2. Decisão (ADR em docs/ARQUITETURA-RENDER.md):
   código próprio sobre o renderer da fase 2, sem biblioteca 3D (three.js, babylon). Motivos: o produto é gerar animação 2D a partir de uma intenção, o 3D é só meio; uma biblioteca traria cena, malha,
   carregador de modelos e relógio próprio, que o projeto não usa e que quebram o determinismo; um SDF cabe numa função de ~10 linhas, é puro (mesmo quadro, mesmos pixels), cabe no pool de
   texturas/FBO e no render graph como qualquer camada, e a saída é uma camada com alfa como as outras. A câmera é uma órbita em voltas INTEIRAS por loop, então o loop fecha por construção.
   Oito formas: esfera deformada, toro torcido, cristais (dobras), giroide, colunas, anéis orbitais, ondas e esponja. Três materiais: fosco, metal, vidro.
   O áudio entra só por uBass (deformação) e uHit (luz), e só se a declaração temporal da camada deixar (fase 10). O tempo só entra por uPh em voltas inteiras: nada de relógio.
   Isto não é cena 3D da instalação: a superfície continua sendo restrição 2D (Surface IR) e a camada é um herói como outro qualquer, que o Depth IR pode pôr num plano.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: skill/ai-vj-generator/references/solid-layer.md */
const SOL_PRE = 'uniform float uEl,uDist,uLt,uMat,uOrb,uFog; mat2 sR(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);} ' +
  'float sBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);} float sTor(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;} ' +
  'float sLoop(float k){return TAU*uPh*floor(k+.5);} ';
const SOL = {
  ESFERA: { labels: ['Deformação', 'Frequência', 'Raio', 'Voltas da deformação'], d: [0.35, 3, 1, 1], tag: 'orgânico', src:
`float sMap(vec3 p){float a=sLoop(uP.w); float n=sin(p.x*uP.y+a+uSeed)*sin(p.y*uP.y-a*2.)*sin(p.z*uP.y+a+uSeed*.7); float amt=uP.x*(1.+uBass*.5);
return (length(p)-uP.z+amt*n)*.6;}` },
  TORO: { labels: ['Torções', 'Espessura', 'Raio maior', 'Voltas por loop'], d: [3, 0.34, 1.1, 1], tag: 'orgânico', src:
`float sMap(vec3 p){vec2 q=vec2(length(p.xz)-uP.z,p.y); float a=atan(p.z,p.x)*floor(uP.x+.5)*.5+sLoop(uP.w); q*=sR(a);
return (length(max(abs(q)-vec2(uP.y*.55),0.))-uP.y*.45)*.8;}` },
  CRISTAIS: { labels: ['Dobras', 'Ângulo', 'Tamanho do cristal', 'Respiração'], d: [4, 0.7, 0.55, 0.15], tag: 'facetado', src:
`float sMap(vec3 p){float nb=clamp(floor(uP.x+.5),1.,6.); float br=uP.w*sin(TAU*uPh); for(int i=0;i<6;i++){ if(float(i)>=nb) break; p=abs(p)-vec3(.42+br,.3,.2); p.xy*=sR(uP.y+uSeed*.05); p.yz*=sR(uP.y*.7);}
return sBox(p,vec3(uP.z*.5,uP.z*.22,uP.z*.14))*.75;}` },
  GIROIDE: { labels: ['Espessura', 'Frequência', 'Raio', 'Voltas da fase'], d: [1, 4.5, 1.25, 1], tag: 'topologia', src:
`float sMap(vec3 p){float a=sLoop(uP.w); float f=uP.y; float g=dot(sin(p*f+a+uSeed),cos(p.zxy*f-a)); float d=abs(g)/f-uP.x*.025; return max(d*.6,length(p)-uP.z);}` },
  COLUNAS: { labels: ['Altura máxima', 'Densidade', 'Largura', 'Respirações por loop'], d: [1.3, 1.7, 0.6, 1], tag: 'arquitetônico', src:
`float sMap(vec3 p){float c=1./uP.y; vec2 id=floor((p.xz+.5*c)/c); vec2 q=mod(p.xz+.5*c,c)-.5*c; float h0=hash(id+uSeed); float k=.5+.5*sin(TAU*(uPh*floor(uP.w+.5)+h0));
float h=.12+uP.x*h0*(.55+.45*k)*(1.+uBass*.35); float d=sBox(vec3(q.x,p.y+.9-h*.5,q.y),vec3(c*.5*uP.z,h*.5,c*.5*uP.z)); return max(d*.8,length(p.xz)-1.5);}` },
  ANEIS: { labels: ['Anéis', 'Espaçamento', 'Espessura', 'Voltas por loop'], d: [5, 0.2, 0.05, 1], tag: 'orbital', src:
`float sMap(vec3 p){float nb=clamp(floor(uP.x+.5),1.,8.); float d=1e3; float o=floor(uP.w+.5); for(int i=0;i<8;i++){ if(float(i)>=nb) break; float fi=float(i); vec3 q=p;
q.xy*=sR(fi*.55+uSeed*.1); q.yz*=sR(TAU*uPh*o*(1.+mod(fi,3.))*(mod(fi,2.)<.5?1.:-1.)+fi); d=min(d,sTor(q,vec2(.45+fi*uP.y,uP.z)));} return d*.8;}` },
  ONDAS: { labels: ['Altura', 'Frequência', 'Cristas', 'Ciclos por loop'], d: [0.5, 4.2, 2, 1], tag: 'paisagem', src:
`float sMap(vec3 p){float o=floor(uP.w+.5); float a=TAU*uPh*o; float w=sin(p.x*uP.y+a)*.5+sin(p.z*uP.y*1.3-a+uSeed)*.35+sin((p.x+p.z)*uP.y*.7+a*2.)*.25*floor(uP.z+.5)*.5;
float h=uP.x*w*(1.+uBass*.4)-.3; return max((p.y-h)*.45,length(p.xz)-2.1);}` },
  ESPONJA: { labels: ['Iterações', 'Furo', 'Tamanho', 'Voltas por loop'], d: [3, 1, 0.95, 1], tag: 'fractal', src:
`float sMap(vec3 p){p.xz*=sR(sLoop(uP.w)+uSeed*.1); p.xy*=sR(.5); float d=sBox(p,vec3(uP.z)); float s=1.; float nb=clamp(floor(uP.x+.5),1.,4.);
for(int i=0;i<4;i++){ if(float(i)>=nb) break; vec3 a=mod(p*s/uP.z,2.)-1.; s*=3.; vec3 r=abs(1.-3.*abs(a)); float da=max(r.x,r.y),db=max(r.y,r.z),dc=max(r.z,r.x); float c=(min(da,min(db,dc))-uP.y)/s*uP.z; d=max(d,c);} return d;}` },
};
const SOL_MAIN =
`vec3 sNor(vec3 p){vec2 e=vec2(1.,-1.)*.0012; return normalize(e.xyy*sMap(p+e.xyy)+e.yyx*sMap(p+e.yyx)+e.yxy*sMap(p+e.yxy)+e.xxx*sMap(p+e.xxx));}
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float az=TAU*uPh*floor(uOrb+.5);
vec3 ro=uDist*vec3(cos(uEl)*sin(az),sin(uEl),cos(uEl)*cos(az)); vec3 ww=normalize(-ro),uu=normalize(cross(ww,vec3(0.,1.,0.))),vv=cross(uu,ww); vec3 rd=normalize(uv.x*uu+uv.y*vv+1.8*ww);
float t=0.,md=1e3,hit=0.,st=0.;
for(int i=0;i<72;i++){ float d=sMap(ro+rd*t); md=min(md,d); st+=1.; if(d<.0011*(1.+t)){hit=1.;break;} t+=d*.9; if(t>16.) break; }
vec3 L=normalize(vec3(sin(uLt),.85,cos(uLt)));
if(hit>.5){ vec3 p=ro+rd*t; vec3 n=sNor(p); float dif=clamp(dot(n,L),0.,1.)*(1.+uHit*.45); float fre=pow(1.-clamp(dot(n,-rd),0.,1.),3.); float ao=clamp(1.-st/72.*1.4,.25,1.);
vec3 base=mix(uC1,uC2,clamp(.5+.5*n.y+p.y*.25,0.,1.)); vec3 r=reflect(rd,n); vec3 env=mix(uBg*.6+uC1*.15,uC2,smoothstep(-.3,.9,r.y))+pow(max(dot(r,L),0.),22.)*uC2*1.2; vec3 c; float k=1.;
if(uMat<.5) c=base*(.22+.78*dif)*ao+fre*uC2*.35;
else if(uMat<1.5) c=mix(base*.35,env,.6+.4*fre)*(.45+.55*dif)*ao;
else { c=mix(base*.3,env*1.15,.35+.65*fre)+pow(max(dot(r,L),0.),40.)*uC2; k=clamp(.4+.6*fre,0.,1.); }
float fg=1.-exp(-t*uFog*.14); c=mix(c,uBg,clamp(fg,0.,1.)*.85); gl_FragColor=outc(c,k*(1.-fg*.5)); }
else { float g=exp(-max(md,0.)*16.)*.32; gl_FragColor=outc(uC2,clamp(g*(1.+uBass*.4),0.,1.)); }}`;
const SOL_NAMES = Object.keys(SOL);
const solOf = p => SOL[p.kind] || SOL.ESFERA;
const solBody = p => shaderResolve(SOL_PRE + solOf(p).src + SOL_MAIN);
const SOL_MATERIALS = ['fosco', 'metal', 'vidro'];
reg('solid', 'Sólido 3D (esfera, toro, cristais, giroide…)', 'gen', [
  S('kind', 'Forma', 'ESFERA', SOL_NAMES), N('size', 'Tamanho', 1, 0.3, 2.5), N('p1', 'P1', 0.35, -400, 400), N('p2', 'P2', 3, -400, 400), N('p3', 'P3', 1, -400, 400), N('p4', 'P4', 1, -400, 400),
  S('material', 'Material', 'fosco', SOL_MATERIALS), N('orbit', 'Voltas da câmera por loop', 1, 0, 4, 1), N('elev', 'Elevação da câmera (°)', 20, -80, 80, 1), N('dist', 'Distância da câmera', 4, 2.5, 10),
  N('light', 'Ângulo da luz (°)', 40, -180, 180, 1), N('fog', 'Névoa', 0.3, 0, 2), S('alphaMode', 'Saída', 'alpha', ['alpha', 'opaque']), N('res', 'Resolução interna', 0.75, 0.25, 1),
  C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const { p, W, H, k } = R;
  const gl = glInit(); if (!gl) return;
  const prog = glProg(solBody(p)); if (!prog) return;
  const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(W * k * p.res))), h = Math.max(2, Math.min(4096, Math.round(H * k * p.res)));
  r.resize(w, h); r.viewport(w, h); r.use(prog);
  const D = Math.PI / 180, mat = Math.max(0, SOL_MATERIALS.indexOf(p.material));
  for (const [n, v] of [['uEl', p.elev * D], ['uDist', p.dist / Math.max(0.3, p.size)], ['uLt', p.light * D], ['uMat', mat], ['uOrb', p.orbit], ['uFog', p.fog]]) { const l = r.loc(prog, n); if (l) gl.uniform1f(l, v); }
  glFrameUniforms(r, prog, frameContext(R, w, h), R, p.alphaMode === 'alpha' ? 1 : 0);
  r.clear(); r.drawFullscreen();
  c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
});
