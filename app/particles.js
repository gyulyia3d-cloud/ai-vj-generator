/* Partículas em GPU (fase 13), primeiro sem estado: a camada `particles` desenha de 50 a 20 mil pontos numa só chamada (gl.POINTS, sem buffer de vértices, o índice vem de gl_VertexID).
   Decisão (ADR em docs/ARQUITETURA-RENDER.md): a posição de cada partícula é uma FUNÇÃO EM FORMA FECHADA do índice, da semente e da fase do loop (uPh), calculada no vertex shader.
   Nada é simulado de um quadro para o outro: o quadro N sai igual se for pedido fora de ordem, o scrub e o render em paralelo valem, e o loop fecha por construção, porque toda frequência é inteira.
   O acaso por partícula é um hash de inteiros (uint, sem sin), igual em qualquer placa. Simulação COM estado (colisão, fluidos, atração entre partículas) fica para depois e passa pelo histórico
   do RenderGraph da fase 4 (textura de posição em ping-pong): não é feita aqui de propósito.
   Seis regras de movimento: órbitas, fonte, espiral, chuva, explosão e enxame (lissajous). O áudio entra só por uBass (alcance e tamanho) e uHit (brilho), e só se a declaração temporal deixar (fase 10).
   Teto do ponto: 64 px internos (o máximo que toda placa garante é menor, por isso o teto é fixo e não depende do aparelho). Isto não é um sistema de partículas de motor de jogo: sem emissor, sem colisão, sem relógio.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: skill/ai-vj-generator/references/particles-layer.md */
const PRT_VERT_PRE = '#version 300 es\nprecision highp float; precision highp int;\n' +
  'uniform vec2 uRes; uniform float uPh,uSeed,uBass,uHit,uExt,uDot; uniform vec4 uP; out float vK; out vec3 vC; uniform vec3 uC1,uC2;\n' +
  '#define TAU 6.28318530718\n' +
  'uint hs(uint x){x^=x>>16; x*=0x7feb352du; x^=x>>15; x*=0x846ca68bu; x^=x>>16; return x;} float hf(uint x){return float(hs(x))/4294967295.;}\n';
const PRT_VERT_MAIN =
`void main(){ uint id=uint(gl_VertexID)+uint(uSeed*1000.+.5)*7919u; float h1=hf(id*4u+1u),h2=hf(id*4u+2u),h3=hf(id*4u+3u),h4=hf(id*4u+4u);
vec2 pos; float life; kin(h1,h2,h3,h4,pos,life); pos*=uExt; float asp=uRes.x/uRes.y; gl_Position=vec4(pos.x/asp*2.,pos.y*2.,0.,1.);
gl_PointSize=clamp(uDot*(.55+.9*h4)*(1.+uBass*.5)*uRes.y/1080.*(.4+.6*life),1.,64.); vC=mix(uC1,uC2,fract(h2*3.+h1)); vK=clamp(life,0.,1.)*(1.+uHit*.6);}`;
const PRT_FRAG = 'uniform float uSoft; varying float vK; varying vec3 vC;\n' +
  'void main(){ float d=length(gl_PointCoord*2.-1.); if(d>1.) discard; float a=(1.-smoothstep(max(0.,1.-uSoft),1.,d))*clamp(vK,0.,1.); gl_FragColor=vec4(vC,a); }';
const PRT = {
  ORBITA: { labels: ['Raio', 'Achatamento', 'Dispersão do raio', 'Voltas por loop'], d: [0.32, 0.45, 0.5, 1], tag: 'órbita', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float r=uP.x*(1.+(h2-.5)*uP.z*1.6)*(1.+uBass*.15); float k=max(1.,floor(uP.w+.5))*(1.+floor(h3*3.));
float a=TAU*(h1+uPh*k*(fract(h4*7.)<.5?1.:-1.)); float tl=(h4-.5)*2.4; vec2 q=vec2(cos(a),sin(a)*uP.y); pos=r*vec2(cos(tl)*q.x-sin(tl)*q.y,sin(tl)*q.x+cos(tl)*q.y); life=1.; }` },
  FONTE: { labels: ['Altura', 'Abertura', 'Largura da base', 'Jatos por loop'], d: [0.55, 0.6, 0.08, 2], tag: 'balístico', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float c=max(1.,floor(uP.w+.5)); float t=fract(uPh*c+h1);
pos=vec2((h2-.5)*uP.y*t*1.2+(h3-.5)*uP.z,-.45+uP.x*4.*t*(1.-t)*(.6+.4*h4)); life=1.-t*.7; }` },
  ESPIRAL: { labels: ['Raio', 'Torção', 'Braços', 'Voltas por loop'], d: [0.42, 3.2, 3, 1], tag: 'galáxia', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float nb=max(1.,floor(uP.z+.5)); float r=sqrt(h1)*uP.x; float rn=r/uP.x;
float a=TAU*floor(h2*nb)/nb+rn*uP.y+TAU*uPh*max(1.,floor(uP.w+.5))+(h3-.5)*.6/(.3+rn*3.); pos=r*(1.+uBass*.08)*vec2(cos(a),sin(a)); life=1.-.55*rn; }` },
  CHUVA: { labels: ['Altura', 'Deriva lateral', 'Oscilação', 'Quedas por loop'], d: [1, 0.12, 0.05, 1], tag: 'queda', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float k=max(1.,floor(uP.w+.5))*(1.+floor(h2*3.)); float t=fract(h1+uPh*k); float asp=uRes.x/uRes.y;
float sw=uP.z*sin(TAU*(uPh*(1.+floor(h4*3.))+h2))+uP.y*(t-.5); pos=vec2((h3-.5)*asp+sw,(.5-t)*uP.x); life=smoothstep(0.,.08,t)*smoothstep(1.,.85,t); }` },
  EXPLOSAO: { labels: ['Alcance', 'Dispersão', 'Atraso entre ondas', 'Explosões por loop'], d: [0.5, 0.5, 0.3, 1], tag: 'radial', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float c=max(1.,floor(uP.w+.5)); float t=fract(uPh*c+floor(h4*3.)*uP.z*.2); float e=1.-pow(1.-t,3.);
float r=uP.x*e*(.3+.7*h2)*(1.+(h3-.5)*uP.y*2.)*(1.+uBass*.2); float a=TAU*h1; pos=r*vec2(cos(a),sin(a)); life=1.-t; }` },
  ENXAME: { labels: ['Amplitude', 'Frequência em X', 'Frequência em Y', 'Coesão'], d: [0.38, 2, 3, 0.7], tag: 'lissajous', src:
`void kin(float h1,float h2,float h3,float h4,out vec2 pos,out float life){ float fx=max(1.,floor(uP.y+.5)),fy=max(1.,floor(uP.z+.5)); float s=TAU*(h1+uPh);
pos=uP.x*vec2(sin(fx*s),sin(fy*s+1.5708))+(vec2(h2,h3)-.5)*(1.-clamp(uP.w,0.,1.))*uP.x*1.2*(1.+uBass*.25); life=.55+.45*h4; }` },
};
const PRT_NAMES = Object.keys(PRT);
const prtOf = p => PRT[p.kind] || PRT.ORBITA;
const prtVert = p => PRT_VERT_PRE + prtOf(p).src + PRT_VERT_MAIN;
const prtFrag = () => shaderResolve(PRT_FRAG);
const prtKey = p => 'P13:' + p.kind;
const prtProg = p => glProgV(prtKey(p), prtVert(p), prtFrag());
const PRT_BLENDS = ['soma', 'normal'];
reg('particles', 'Partículas GPU (órbita, fonte, espiral, chuva, explosão, enxame)', 'gen', [
  S('kind', 'Regra de movimento', 'ORBITA', PRT_NAMES), N('size', 'Extensão', 1, 0.3, 2.5), N('p1', 'P1', 0.32, -400, 400), N('p2', 'P2', 0.45, -400, 400), N('p3', 'P3', 0.5, -400, 400), N('p4', 'P4', 1, -400, 400),
  N('count', 'Quantidade', 3000, 50, 20000, 1), N('dot', 'Tamanho da partícula (px a 1080)', 6, 0.5, 40), N('soft', 'Maciez do ponto', 0.6, 0.05, 1), S('blend', 'Mistura', 'soma', PRT_BLENDS),
  S('alphaMode', 'Saída', 'alpha', ['alpha', 'opaque']), N('res', 'Resolução interna', 1, 0.25, 1),
  C('c1', 'Cor 1', 'primary'), C('c2', 'Cor 2', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const { p, W, H, k } = R;
  const gl = glInit(); if (!gl) return;
  const prog = prtProg(p); if (!prog) return;
  const r = GL.r, w = Math.max(2, Math.min(4096, Math.round(W * k * p.res))), h = Math.max(2, Math.min(4096, Math.round(H * k * p.res)));
  r.resize(w, h); r.viewport(w, h); r.use(prog);
  for (const [n, v] of [['uExt', p.size], ['uDot', p.dot], ['uSoft', p.soft]]) { const l = r.loc(prog, n); if (l) gl.uniform1f(l, v); }
  glFrameUniforms(r, prog, frameContext(R, w, h), R, p.alphaMode === 'alpha' ? 1 : 0);
  if (p.alphaMode === 'alpha') r.clear(); else { const bg = hexRgb(col(R.comp, p.cbg)).map(v => v / 255); gl.clearColor(bg[0], bg[1], bg[2], 1); gl.clear(gl.COLOR_BUFFER_BIT); }
  r.setBlend(p.blend === 'normal' ? 'normal' : 'soma');
  r.drawPoints(Math.max(1, Math.min(20000, Math.round(p.count))));
  r.setBlend(null);
  c.drawImage(GL.cv, 0, 0, w, h, 0, 0, W, H);
});
