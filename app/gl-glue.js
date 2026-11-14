/* Cola entre o motor e o WebGLRenderer (fase 18): cabeçalho GLSL comum, programas, uniforms do quadro.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores GLGLUE. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
const GL = { cv: null, gl: null, r: null, failure: '', progs: new Map(), err: new Map() };
const GL_HEAD = `precision highp float;
uniform vec2 uRes; uniform float uPh,uT,uBeat,uBp,uPulse,uAud,uAlpha,uSeed,uBass,uMid,uHigh,uRms,uHit,uMidHit,uHighHit,uBassT,uMidT,uHighT,uAudT,uPres,uOnBeat,uBSin,uBTri,uBSin2,uBSin4,uBpm; uniform vec3 uC1,uC2,uBg; uniform vec4 uP;
#define TAU 6.28318530718
uint vjU32(uint x){x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;x^=x>>16u;return x;}
float hash(vec2 p){uvec2 q=floatBitsToUint(p);q.x=q.x==0x80000000u?0u:q.x;q.y=q.y==0x80000000u?0u:q.y;return float(vjU32(q.x^vjU32(q.y))>>8u)*(1./16777216.);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.,1.)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p=p*2.03+vec2(1.7,9.2);a*=.5;}return v;}
vec2 loopv(float r){return vec2(cos(TAU*uPh),sin(TAU*uPh))*r;}
vec4 outc(vec3 c,float k){return uAlpha>.5?vec4(c,k):vec4(mix(uBg,c,k),1.);}
mat2 vjRot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
vec3 vjPal(float t,vec3 a,vec3 b,vec3 c,vec3 d){return a+b*cos(TAU*(c*t+d));}
float vjSdBox(vec2 p,vec2 b){vec2 d=abs(p)-b;return length(max(d,0.))+min(max(d.x,d.y),0.);}
float vjSdCircle(vec2 p,float r){return length(p)-r;}
float vjSmin(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
vec2 vjKaleid(vec2 p,float n){float a=atan(p.y,p.x),r=length(p),s=TAU/n;a=abs(mod(a,s)-s*.5);return r*vec2(cos(a),sin(a));}
float vjEaseOut(float t){t=clamp(t,0.,1.);return 1.-pow(1.-t,3.);}
float vjPulse(float x,float k){float h=k*x;return h*exp(1.-h);}
`;
const GL_HEAD_LINES = GL_HEAD.split('\n').length - 1;
function glInit() {
  if (GL.gl) return GL.gl;
  if (GL.failure) return null;
  const cv = document.createElement('canvas'), r = WEBGL.create(cv);
  if (r.error) { GL.failure = r.error; glFailureNotice(); return null; }
  GL.cv = cv; GL.gl = r.gl; GL.r = r; r.progs = GL.progs; r.errors = GL.err;
  return r.gl;
}
/* sem WebGL2 não há volta silenciosa ao WebGL1: um aviso técnico fica na tela e as camadas de shader mostram o erro */
function glFailureNotice() {
  if (document.getElementById('glFail')) return;
  const d = document.createElement('div'); d.id = 'glFail'; d.setAttribute('role', 'alert');
  d.style.cssText = 'position:fixed;left:16px;right:16px;bottom:16px;z-index:50;padding:10px 14px;border:1px solid #c33;background:#2a0d0d;color:#fff;font:13px/1.4 system-ui,sans-serif;border-radius:6px';
  d.textContent = 'WebGL2 indisponível: ' + GL.failure + ' As camadas de shader, ISF, cadeia e filtro não serão desenhadas.';
  document.body.appendChild(d);
}
function glProg(body) {
  const gl = glInit(); if (!gl) return null;
  return GL.r.program(body, GL_HEAD + body, { lineOffset: GL_HEAD_LINES });
}
/* programa com vertex shader próprio (partículas, fase 13): key identifica o par, frag recebe o cabeçalho comum */
function glProgV(key, vert, frag) {
  const gl = glInit(); if (!gl) return null;
  return GL.r.program(key, GL_HEAD + frag, { lineOffset: GL_HEAD_LINES, vert });
}
/* FrameContext: tudo que o render de um quadro pode ler, montado a partir do quadro (nunca de relógio, Date.now ou Math.random) */
function frameContext(R, w, h) {
  const { F, comp } = R;
  return Object.freeze({
    frameIndex: F.n, fps: F.fps, frameTime: F.t, normalizedTime: F.ph, loopPhase: F.lph, seed: SEED, bpm: P.time.bpm, beatPhase: F.lbp, beat: Math.floor(F.bF), pulse: F.pulse,
    audio: Object.freeze({ level: F.a, bands: F.bands }), surface: Object.freeze({ w: P.canvas.w, h: P.canvas.h, folds: P.canvas.folds || [], displays: P.canvas.displays || [] }), resolution: [w, h],
  });
}
/* uniforms por grupo: frame, audio, appearance, project. Os nomes u* continuam os de sempre (os shaders guardados nos projetos dependem deles) */
const U_AUDIO_T = [['uMidHit', 'mhit'], ['uHighHit', 'hhit'], ['uBassT', 'bt'], ['uMidT', 'mt'], ['uHighT', 'ht'], ['uAudT', 'at'], ['uPres', 'pres'], ['uOnBeat', 'onbeat'], ['uBSin', 'bsin'], ['uBTri', 'btri'], ['uBSin2', 'bsin2'], ['uBSin4', 'bsin4'], ['uBpm', 'bpm']];
function glFrameUniforms(r, prog, ctx, R, alpha) {
  const gl = r.gl, U = n => r.loc(prog, n), f1 = (n, v) => { const l = U(n); if (l) gl.uniform1f(l, v); }, rgb = h2 => hexRgb(h2).map(v => v / 255), { p, comp } = R, A = ctx.audio.bands;
  /* frame */
  { const l = U('uRes'); if (l) gl.uniform2f(l, ctx.resolution[0], ctx.resolution[1]); }
  f1('uPh', ctx.loopPhase); f1('uT', ctx.frameTime); f1('uBeat', ctx.beat); f1('uBp', ctx.beatPhase); f1('uPulse', ctx.pulse); f1('uSeed', (ctx.seed % 997) * 0.173);
  /* audio */
  f1('uAud', ctx.audio.level); f1('uBass', A.bass); f1('uMid', A.mid); f1('uHigh', A.high); f1('uRms', A.rms); f1('uHit', A.hit);
  for (const [n, v] of U_AUDIO_T) f1(n, A[v]);
  /* appearance */
  f1('uAlpha', alpha);
  for (const [n, k] of [['uC1', 'c1'], ['uC2', 'c2'], ['uBg', 'cbg']]) { const l = U(n); if (l) gl.uniform3fv(l, rgb(col(comp, p[k]))); }
  /* project */
  { const l = U('uP'); if (l) gl.uniform4f(l, p.p1, p.p2, p.p3, p.p4); }
}
