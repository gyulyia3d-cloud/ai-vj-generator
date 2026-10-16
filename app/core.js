/* Núcleo do motor (fase 18): aleatoriedade controlada, paletas, definições de parâmetros, biblioteca de geradores (reg) e o tempo do projeto.
   Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html entre os marcadores CORE. Mesmo escopo do motor (IIFE do index.html): sem import/export. */
/* =====================================================================
   AI VJ GENERATOR · motor de composição generativa
   GYULYIA® · MIT
   Princípios: relógio por contagem de quadros (o loop fecha exato),
   aleatoriedade por hash com seed (reproduzível), cada camada é uma
   função pura de (parâmetros, quadro) → o mesmo código desenha o preview,
   o export PNG alpha e a gravação.
   ===================================================================== */
const VERSION = '3.20.0';
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const TAU = Math.PI * 2, GA = Math.PI * (3 - Math.sqrt(5));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const pad = (n, l) => String(n).padStart(l, '0');
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const clone = o => JSON.parse(JSON.stringify(o));
const sstep = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const safe = s => String(s || 'SEM_NOME').normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_|_$/g, '') || 'X';
const store = {
  get(k, d) { try { const v = localStorage.getItem('aivj-' + k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
  set(k, v) { try { localStorage.setItem('aivj-' + k, JSON.stringify(v)); } catch (e) {} }
};

/* ---------- aleatoriedade controlada ---------- */
let SEED = 184729;
function hr(a, b = 0, c = 0) {
  let x = (Math.imul(a | 0, 374761393) + Math.imul(b | 0, 668265263) + Math.imul(c | 0, -1640531535) + Math.imul(SEED | 0, -1028477379)) | 0;
  x = Math.imul(x ^ (x >>> 15), -2048144777); x = Math.imul(x ^ (x >>> 13), -1028477379); x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}
function mulberry(a) { return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
function vn(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi;
  const u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
  const a = hr(xi, yi, 7), b = hr(xi + 1, yi, 7), c = hr(xi, yi + 1, 7), d = hr(xi + 1, yi + 1, 7);
  return lerp(lerp(a, b, u), lerp(c, d, u), v);
}

/* ---------- paletas ---------- */
const ACC = [
  { n: 'Verde ácido', h: '#00FF3C' }, { n: 'Azul elétrico', h: '#1F3BFF' },
  { n: 'Vermelho alarme', h: '#FF2A3D' }, { n: 'Amarelo sinal', h: '#E8FF00' }, { n: 'Osso', h: '#F4F3EF' }
];
const PALS = {
  STANDARD: { bg: '#050505', primary: '#F4F3EF', secondary: '#6B6F76', accent: '#00FF3C' },
  MONO: { bg: '#000000', primary: '#FFFFFF', secondary: '#666666', accent: '#FFFFFF' },
  'BRANCO ALPHA': { bg: '#000000', primary: '#FFFFFF', secondary: '#B8B8B8', accent: '#FFFFFF', field: '#6E6E6E', mode: 'white-alpha' },
  INDUSTRIAL: { bg: '#060606', primary: '#E9E6DF', secondary: '#5A5D63', accent: '#FF4A1C' },
  ORGÂNICO: { bg: '#03060A', primary: '#D8F3E7', secondary: '#3C6E71', accent: '#9BFFCE' },
  NOTURNO: { bg: '#02020A', primary: '#DCE2FF', secondary: '#46507A', accent: '#7B5CFF' },
  SOLAR: { bg: '#0A0603', primary: '#FFF1DA', secondary: '#7A5A3A', accent: '#FFB300' },
  ALARME: { bg: '#050505', primary: '#F4F3EF', secondary: '#6B6F76', accent: '#FF2A3D' }
};
const PKEYS = ['bg', 'primary', 'secondary', 'accent', 'field'];
const PNAMES = { bg: 'Fundo', primary: 'Primária', secondary: 'Secundária', accent: 'Acento', field: 'Campo' };
/* campo: a cor do plano de fundo de uma figura (43% entre fundo e tinta). Em BRANCO α a hierarquia é 100 / 72 / 43 %:
   primária = figura, secundária = apoio, campo = fundo de outra camada. A tinta vira alpha no export (luma → alpha). */
function mixHex(a, b, t) { const A = hexRgb(a), B = hexRgb(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); }
for (const k in PALS) if (!PALS[k].field) PALS[k].field = mixHex(PALS[k].bg, PALS[k].primary, 0.43);
const FONTS = {
  mono: '"Martian Mono",ui-monospace,monospace', helvetica: '"Helvetica Neue",Helvetica,Arial,sans-serif',
  archivo: '"Archivo Black","Arial Black",Impact,sans-serif', bebas: '"Bebas Neue",Impact,"Arial Narrow",sans-serif'
};
const CUSTOM_FONTS = [];
const fam = k => FONTS[k] || (CUSTOM_FONTS.includes(k) ? `"${k}",${FONTS.mono}` : FONTS.mono);
function hexRgb(h) { h = String(h || '#fff').replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16) || 0; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
const lum = h => { const [r, g, b] = hexRgb(h); return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255; };

/* ---------- definições de parâmetros ---------- */
const N = (k, l, d, min, max, step = 0.01) => ({ k, t: 'n', l, d, min, max, step });
const S = (k, l, d, opts) => ({ k, t: 's', l, d, opts });
const C = (k, l, d) => ({ k, t: 'c', l, d });
const B = (k, l, d) => ({ k, t: 'b', l, d });
const T = (k, l, d, area) => ({ k, t: 't', l, d, area });
const COMMON = {
  TRANSFORM: [N('x', 'Posição X', 0, -8000, 8000, 1), N('y', 'Posição Y', 0, -8000, 8000, 1), N('sx', 'Escala X', 1, 0, 6), N('sy', 'Escala Y', 1, 0, 6), N('rot', 'Rotação °', 0, -360, 360, 0.1), N('ax', 'Âncora X', 0.5, 0, 1), N('ay', 'Âncora Y', 0.5, 0, 1)],
  APARÊNCIA: [N('bright', 'Brilho', 1, 0, 3), N('contrast', 'Contraste', 1, 0, 3), N('sat', 'Saturação', 1, 0, 3), N('hue', 'Matiz °', 0, -180, 180, 1), N('blur', 'Blur px', 0, 0, 60, 0.1)],
  MOVIMENTO: [N('speed', 'Velocidade', 1, 0, 8), N('phase', 'Fase', 0, 0, 1), S('div', 'Divisão BPM', '1/4', ['1/1', '1/2', '1/4', '1/8', '1/16']), N('echo', 'Eco · cópias', 0, 0, 8, 1), N('echoStep', 'Eco · passo (quadros)', 3, 1, 24, 1), N('echoFade', 'Eco · queda', 0.6, 0.1, 0.95)],
  'ÁUDIO': [N('audio', 'Resposta', 0, 0, 1), S('band', 'Banda', 'bass', ['bass', 'mid', 'high', 'rms', 'hit', 'kick', 'onset', 'flux'])]
};
const COMMON_FLAT = Object.values(COMMON).flat();
const BLENDS = { normal: ['source-over', 'normal'], add: ['lighter', 'plus-lighter'], screen: ['screen', 'screen'], multiply: ['multiply', 'multiply'], difference: ['difference', 'difference'], overlay: ['overlay', 'overlay'], lighten: ['lighten', 'lighten'] };

const SHADERS = {
  'CAMPO FBM': { labels: ['Escala', 'Deriva', 'Dobra', 'Contraste'], d: [2.2, 0.7, 0.9, 1.4], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float s=uP.x*(1.+uMid*.12); vec2 L=loopv(uP.y)+uSeed;
vec2 q=vec2(fbm(uv*s+L),fbm(uv*s-L+5.2));
float f=fbm(uv*s+q*(uP.z+uBass*.5)*3.+L*.5);
float k=clamp((f-.38)*(uP.w+uBass*.8)*2.6+uPulse*.1+uAud*.15,0.,1.);
vec3 c=mix(uC1,uC2,smoothstep(.72-uHigh*.12,.95,f));
gl_FragColor=outc(c,k);}` },
  'CÉLULAS': { labels: ['Densidade', 'Ciclos', 'Borda', 'Preench.'], d: [6, 1, 0.4, 0.3], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x; vec2 i=floor(uv),f=fract(uv); float d1=8.,d2=8.;
for(int y=-1;y<=1;y++)for(int x=-1;x<=1;x++){vec2 g=vec2(float(x),float(y)); vec2 h=vec2(hash(i+g+uSeed),hash(i+g+19.1+uSeed));
vec2 o=.5+.45*sin(TAU*(uPh*floor(uP.y+.5)+h)); float d=length(g+o-f); if(d<d1){d2=d1;d1=d;}else if(d<d2){d2=d;}}
float e=1.-smoothstep(0.,uP.z*.08+.006+uBass*.03,d2-d1); float fl=uP.w*(1.-smoothstep(0.,.7,d1));
float k=clamp(max(e,fl*.6)+uPulse*e*.3+uHit*e*.5+uMid*fl*.3,0.,1.); gl_FragColor=outc(mix(uC1,uC2,clamp(e*uPulse+uHigh*e*.6,0.,1.)),k);}` },
  'ANÉIS SDF': { labels: ['Anéis', 'Ciclos', 'Espessura', 'Distorção'], d: [9, 1, 0.35, 0.5], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float a=atan(uv.y,uv.x);
float r=length(uv)+(uP.w+uMid*.6)*.06*sin(a*6.+TAU*uPh)*fbm(uv*3.+loopv(1.)+uSeed);
float v=fract(r*uP.x-uPh*floor(uP.y+.5)); float th=uP.z*.22+uBass*.12+uHit*.1;
float k=(1.-smoothstep(th*.5,th*.5+.015,abs(v-.5)))*(1.-smoothstep(.05,1.6,r));
gl_FragColor=outc(mix(uC1,uC2,clamp(uPulse+uHigh*.5,0.,1.)),k);}` },
  'FAIXAS': { labels: ['Linhas', 'Ciclos', 'Duty', 'Glitch'], d: [14, 1, 0.55, 0.5], src:
`void main(){vec2 uv=gl_FragCoord.xy/uRes; float y=uv.y*uP.x; float row=floor(y); float sp=(mod(row,2.)<1.?1.:-1.)*floor(uP.y+.5);
float x=fract(uv.x*uRes.x/uRes.y*.25+sp*uPh+hash(vec2(row,3.)+uSeed));
float jit=step(1.-clamp(uP.w*.3+uHit*.35,0.,1.),hash(vec2(row,floor(uBeat))));
float k=step(x,uP.z+uBass*.15)*step(.12,fract(y)); k=max(k*(1.-jit),jit*step(.5,fract(y*3.)));
gl_FragColor=outc(mix(uC1,uC2,clamp(jit+uPulse*step(.85,hash(vec2(row,7.))),0.,1.)),k);}` },
  'KALEIDO': { labels: ['Lados', 'Zoom', 'Textura', 'Detalhe'], d: [6, 3, 0.6, 0.5], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv=vjRot(TAU*uPh)*uv; uv=vjKaleid(uv*(1.+uBass*.15),floor(uP.x+.5));
vec2 L=loopv(.8)+uSeed; float v=sin(uv.x*uP.y*3.+uMid*2.)*sin(uv.y*uP.y*3.-TAU*uPh)+(fbm(uv*uP.w*6.+L)-.5)*uP.z*3.;
float k=smoothstep(.15,.85,abs(v))*(1.-smoothstep(.55,1.1,length(uv)*(.7+uBass*.1)));
gl_FragColor=outc(mix(uC1,uC2,clamp(abs(v)+uHigh*.4,0.,1.)),clamp(k+uHit*.15,0.,1.));}` },
  'FLUXO WARP': { labels: ['Escala', 'Dobra', 'Detalhe', 'Contraste'], d: [1.6, 1.1, 0.5, 1.5], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 p=uv*uP.x*(1.+uMid*.1); vec2 L=loopv(.6)+uSeed;
vec2 w=vec2(fbm(p+L),fbm(p+vec2(3.1,1.7)-L)); p+=(uP.y+uBass*.7)*(w-.5)*2.;
float f=fbm(p*(1.+uP.z*2.)+L*.5); float k=clamp((f-.3)*uP.w*2.,0.,1.)*(.55+.45*smoothstep(.2,.9,fbm(p*3.-L)));
gl_FragColor=outc(mix(uC1,uC2,smoothstep(.45,.85+uHigh*.1,f)),clamp(k+uHit*.12,0.,1.));}` },
  'GRADE SDF': { labels: ['Células', 'Ciclos', 'Traço', 'Preench.'], d: [8, 1, 0.5, 0.35], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x; vec2 id=floor(uv),g=fract(uv)-.5; float h=hash(id+uSeed);
float s=.3+.12*sin(TAU*(uPh*floor(uP.y+.5)+h))+uBass*.1; float d=vjSdBox(g,vec2(s)); float ln=1.-smoothstep(0.,.03+uP.z*.04,abs(d));
float fill=step(h,uP.w*.5+uHit*.45)*(1.-smoothstep(0.,.02,d)); float k=clamp(max(ln,fill*.8),0.,1.);
gl_FragColor=outc(mix(uC1,uC2,clamp(fill+uHigh*h,0.,1.)),k);}` },
  'INTERFERÊNCIA': { labels: ['Frequência', 'Ciclos', 'Espessura', 'Distância'], d: [9, 1, 0.5, 0.45], src:
`void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 c=loopv(uP.w*.5); float a=length(uv-c)*uP.x, b=length(uv+c)*uP.x; float ph=TAU*uPh*floor(uP.y+.5);
float v=sin(a*TAU-ph)+sin(b*TAU+ph); float th=.35+uP.z*.5+uBass*.3; float k=smoothstep(th,th+.2,v*.5+.5)*(1.-smoothstep(.4,1.2,length(uv)));
gl_FragColor=outc(mix(uC1,uC2,clamp(uHigh+uPulse*.4,0.,1.)),clamp(k+uHit*.1,0.,1.));}` }
};

/* ---------- biblioteca de geradores ---------- */
const GEN = {};
const reg = (type, label, group, params, draw) => { GEN[type] = { type, label, group, params, draw }; };
/* Categorias de camada: o menu e o inspetor mostram 9 categorias de até duas palavras; o tipo dentro da categoria se escolhe nos parâmetros da camada.
   O projeto JSON continua guardando o tipo interno (L.type), então projetos antigos, o gerador e os testes não mudam. */
const FAMILIES = [
  ['Fundo', [['bg', 'Fundo']]],
  ['Shader', [['shader', 'Preset GLSL'], ['isf', 'Biblioteca ISF'], ['synth', 'Cadeia'], ['field', 'Campo'], ['solid', 'Sólido 3D'], ['particles', 'Partículas GPU']]],
  ['Formas', [['shape', 'Forma'], ['lines', 'Linhas'], ['tunnel', 'Túnel'], ['organism', 'Organismo'], ['structure', 'Estrutura'], ['symbols', 'Símbolos'], ['hazard', 'Faixa risco'], ['bitfield', 'Campo bits']]],
  ['Texto', [['text', 'Texto'], ['typeset', 'Tipografia'], ['typewall', 'Parede'], ['pixeltext', 'Texto pixel'], ['glyphs', 'Glifos']]],
  ['Mídia', [['image', 'Imagem'], ['video', 'Vídeo'], ['model', 'Objeto 3D'], ['parallax', 'Parallax'], ['splat', 'Splat 3D'], ['logo', 'Logo']]],
  ['Dados', [['measure', 'Medição'], ['data', 'Telemetria'], ['hud', 'HUD'], ['instrument', 'Instrumento'], ['blobs', 'Manchas']]],
  ['Partículas', [['flow', 'Fluxo'], ['sim', 'Simulação']]],
  ['Efeito', [['fx', 'Filtro'], ['temporal', 'Tempo'], ['post', 'Pós'], ['event', 'Evento'], ['blocks', 'Glitch']]],
  ['Código', [['code', 'Código']]],
];
const famOf = type => FAMILIES.find(f => f[1].some(x => x[0] === type));
const typeLabel = type => { const f = famOf(type); const x = f && f[1].find(y => y[0] === type); return x ? x[1] : (GEN[type] ? GEN[type].label : type); };

/* utilidades de desenho */
function col(comp, key) { if (typeof key === 'string' && key[0] === '#') return key; const pal = Object.assign({}, P.palette, comp.palette || {}); return pal[key] || pal.primary || '#fff'; }
const unitOf = (W, H) => Math.min(H, W * 0.5625) / 1080;
function cyc(F, base) { const c = base * F.speed; return (P.time.loop && P.time.seamless) ? Math.round(c) : c; }
function setFont(c, wgt, px, family, track) { c.font = `${wgt} ${px}px ${family}`; if ('letterSpacing' in c) c.letterSpacing = (track || 0) * px + 'px'; }
const CH = '01#/<>ABCDEF%+=*';
function scr(txt, done, n, s = 0) { let o = ''; for (let i = 0; i < txt.length; i++) o += (i / txt.length < done || txt[i] === ' ') ? txt[i] : CH[Math.floor(hr(n, i, s + 3) * CH.length)]; return o; }
const loopSec = () => 60 / P.time.bpm * 4 * P.time.bars;
const beatMs = () => 60000 / P.time.bpm;
