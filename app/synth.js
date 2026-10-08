/* Camada "synth": uma cadeia de uma linha vira um shader. Inspirada na ideia de encadear fontes e transformações do Hydra (livecoding de vídeo),
   com gramática, operadores e código GLSL próprios do projeto. Uso: osc(30,1).kaleid(6).modulate(noise(3),0.2).tint().pixelate(80,45)
   Regras do projeto: o tempo só entra por ciclos INTEIROS por loop (o loop fecha), os números aceitam expressões com o áudio (bass, mid, high, hit, rms, pulse) e P1..P4,
   e o resultado passa por outc() como todo shader (alpha ou opaco). Fonte de verdade: este arquivo; node scripts/embed-modules.mjs embute no index.html. Docs: references/synth-chain.md */
const SYN = (() => {
  const E = (pt, en) => (typeof T3 === 'function' ? T3(pt, en) : pt);
  const IDENT = { bass: 'uBass', mid: 'uMid', high: 'uHigh', hit: 'uHit', rms: 'uRms', pulse: 'uPulse', phase: 'uPh', tau: 'TAU', pi: '3.14159265', p1: 'uP.x', p2: 'uP.y', p3: 'uP.z', p4: 'uP.w', beat: 'uOnBeat' };
  const FN = new Set(['sin', 'cos', 'abs', 'min', 'max', 'floor', 'fract', 'mod', 'sqrt', 'pow', 'mix', 'clamp', 'step', 'smoothstep', 'exp', 'sign']);
  /* nome: [quantidade de argumentos numéricos, padrões]; os que levam sub-cadeia têm sub:true (o primeiro argumento) */
  const SRC = { osc: [3, [30, 1, 0.5]], noise: [2, [6, 1]], voronoi: [3, [5, 0.4, 1]], shape: [3, [4, 0.35, 0.02]], gradient: [1, [1]], solid: [4, [0, 0, 0, 1]], rings: [2, [24, 1]], grid: [2, [8, 0.08]], stripes: [2, [14, 1]] };
  const CO = { rotate: [2, [0.25, 0]], scale: [3, [1.2, 1, 1]], pixelate: [2, [60, 34]], repeat: [4, [3, 3, 0, 0]], repeatX: [2, [3, 0]], repeatY: [2, [3, 0]], scroll: [3, [0, 0, 1]], scrollX: [2, [0.25, 1]], scrollY: [2, [0.25, 1]], kaleid: [1, [6]], mirror: [1, [1]], warp: [3, [0.08, 3, 1]], twirl: [2, [2, 0.6]] };
  const CL = { color: [4, [1, 1, 1, 1]], hue: [2, [0.25, 0]], saturate: [1, [1.5]], contrast: [2, [1.4, 0.5]], brightness: [1, [0.1]], invert: [1, [1]], posterize: [2, [4, 0.6]], thresh: [2, [0.5, 0.05]], luma: [2, [0.5, 0.1]], tint: [1, [1]], gamma: [1, [1.2]] };
  const BL = { add: [1, [0.5]], sub: [1, [0.5]], mult: [1, [0.5]], diff: [1, [1]], blend: [1, [0.5]], layer: [0, []], mask: [0, []] };
  const MO = { modulate: [1, [0.1]], modulateScale: [2, [1, 0]], modulateRotate: [2, [1, 0]], modulatePixelate: [2, [10, 20]], modulateKaleid: [1, [4]] };
  const kind = n => n in SRC ? 'src' : n in CO ? 'co' : n in CL ? 'cl' : n in BL ? 'bl' : n in MO ? 'mo' : null;
  const sig = n => SRC[n] || CO[n] || CL[n] || BL[n] || MO[n];
  const fl = x => { const s = String(x); return /^-?\d+$/.test(s) ? s + '.0' : s; };

  function expr(s, ctx) {   // número ou expressão segura -> GLSL float
    const t = s.trim(); if (!t) throw new Error(E('argumento vazio', 'empty argument'));
    if (!/^[\w\s.+\-*/(),]+$/.test(t)) throw new Error(E(`caracter não permitido em "${t}"`, `character not allowed in "${t}"`));
    return t.replace(/\b(\d+\.?\d*(?:e[-+]?\d+)?)\b|\b([A-Za-z_]\w*)\b/g, (m, num, id) => {
      if (num !== undefined) return /^\d+$/.test(num) ? num + '.0' : num;
      if (id in IDENT) return IDENT[id]; if (FN.has(id)) return id;
      throw new Error(E(`nome desconhecido "${id}" (use bass mid high hit rms pulse phase p1..p4 ou funções como sin e max)`, `unknown name "${id}" (use bass mid high hit rms pulse phase p1..p4 or functions like sin and max)`));
    });
  }
  /* analisador: devolve { ops: [{ name, args: [string | cadeia] }] } */
  function parse(str) {
    let i = 0; const n = str.length, ws = () => { while (i < n && /\s/.test(str[i])) i++; };
    function chain() {
      const ops = [];
      for (;;) {
        ws(); const m = /^[A-Za-z_]\w*/.exec(str.slice(i)); if (!m) throw new Error(E(`esperava um nome de operador em "${str.slice(i, i + 12)}"`, `expected an operator name at "${str.slice(i, i + 12)}"`));
        const name = m[0]; i += name.length; ws();
        if (name === 'out') { if (str[i] === '(') { i++; ws(); if (str[i] !== ')') throw new Error('out() sem argumentos'); i++; } ws(); if (str[i] === '.') { i++; continue; } break; }
        if (str[i] !== '(') throw new Error(E(`faltou "(" depois de ${name}`, `missing "(" after ${name}`)); i++;
        const args = []; ws();
        if (str[i] !== ')') for (;;) {
          ws(); const rest = str.slice(i), m2 = /^([A-Za-z_]\w*)\s*\(/.exec(rest);
          if (m2 && kind(m2[1]) === 'src') args.push(chain());
          else { let d = 0, j = i; for (; j < n; j++) { const ch = str[j]; if (ch === '(') d++; else if (ch === ')') { if (d === 0) break; d--; } else if (ch === ',' && d === 0) break; } args.push(str.slice(i, j)); i = j; }
          ws(); if (str[i] === ',') { i++; continue; } break;
        }
        ws(); if (str[i] !== ')') throw new Error(E(`faltou ")" em ${name}(...)`, `missing ")" in ${name}(...)`)); i++;
        ops.push({ name, args }); ws();
        if (str[i] === '.') { i++; continue; } break;
      }
      return { ops };
    }
    const c = chain(); ws(); if (i < n) throw new Error(E(`sobrou texto: "${str.slice(i, i + 16)}"`, `trailing text: "${str.slice(i, i + 16)}"`)); return c;
  }

  const HELP = `float syH(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
vec2 syAc(vec2 s){return (s-.5)*vec2(uRes.x/uRes.y,1.);} vec2 syBk(vec2 s){return s/vec2(uRes.x/uRes.y,1.)+.5;}
vec2 syRot(vec2 s,float a){s=syAc(s);float c=cos(a),n=sin(a);s=mat2(c,-n,n,c)*s;return syBk(s);}
vec2 syKal(vec2 s,float k){s=syAc(s);float a=atan(s.y,s.x),r=length(s),g=TAU/max(2.,floor(k+.5));a=abs(mod(a,g)-.5*g);return syBk(r*vec2(cos(a),sin(a)));}
vec3 syHue(vec3 c,float h){float a=h*TAU,cs=cos(a),sn=sin(a);mat3 m=mat3(.299,.299,.299,.587,.587,.587,.114,.114,.114)+mat3(.701,-.299,-.300,-.587,.413,-.588,-.114,-.114,.886)*cs+mat3(.168,-.328,1.25,.330,.035,-.050,-.497,.292,-.203)*sn;return clamp(m*c,0.,1.);}
float syL(vec3 c){return dot(c,vec3(.299,.587,.114));}
`;
  function compile(text) {
    const tree = parse(String(text || '').trim()), fns = []; let uid = 0;
    const ex = a => { if (typeof a !== 'string') throw new Error(E('esperava um número, não uma cadeia', 'expected a number, not a chain')); return expr(a); };
    function emit(ch) {
      const id = 'sy' + (++uid) + '_'; let prev = null, k = 0;
      ch.ops.forEach((op, oi) => {
        const nm = op.name, kd = kind(nm), sg = sig(nm); if (!kd) throw new Error(E(`operador desconhecido: ${nm}`, `unknown operator: ${nm}`));
        if (oi === 0 && kd !== 'src') throw new Error(E(`a cadeia precisa começar por uma fonte (osc, noise, voronoi, shape, gradient, solid, rings, grid, stripes), não por ${nm}`, `the chain must start with a source (osc, noise, voronoi, shape, gradient, solid, rings, grid, stripes), not ${nm}`));
        if (oi > 0 && kd === 'src') throw new Error(E(`${nm} é uma fonte: só pode abrir a cadeia ou entrar como argumento de add, blend, modulate…`, `${nm} is a source: it can only start a chain or be an argument of add, blend, modulate…`));
        let args = op.args.slice(), sub = null;
        if (kd === 'bl' || kd === 'mo') { sub = args.shift(); if (!sub || typeof sub === 'string') throw new Error(E(`${nm} precisa de uma cadeia como primeiro argumento, por exemplo ${nm}(noise(3), 0.2)`, `${nm} needs a chain as its first argument, e.g. ${nm}(noise(3), 0.2)`)); }
        if (args.length > (sg[0])) throw new Error(E(`${nm} aceita até ${sg[0]} número(s)`, `${nm} takes at most ${sg[0]} number(s)`));
        const v = []; for (let q = 0; q < sg[0]; q++) v.push(q < args.length ? ex(args[q]) : fl(sg[1][q]));
        const cyc = x => `floor(${x}+.5)`, T = x => `TAU*uPh*${cyc(x)}`, f = `${id}${k++}`;
        let body, subName = null; if (sub) subName = emit(sub);
        const P = prev;   // função anterior: vec4 P(vec2)
        switch (nm) {
          // fontes
          case 'osc': body = `vec4 ${f}(vec2 s){float w=${v[0]}*s.x+${T(v[1])};float o=${v[2]};return vec4(.5+.5*sin(w),.5+.5*sin(w+o*2.0944),.5+.5*sin(w+o*4.1888),1.);}`; break;
          case 'noise': body = `vec4 ${f}(vec2 s){float n=noise(s*${v[0]}+loopv(${cyc(v[1])}*.35)+uSeed);return vec4(vec3(n),1.);}`; break;
          case 'voronoi': body = `vec4 ${f}(vec2 s){vec2 q=s*${v[0]},g=floor(q),f=fract(q);float d=9.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 o=vec2(float(i),float(j)),h=vec2(syH(g+o),syH(g+o+7.3));vec2 pt=o+.5+${v[1]}*.5*vec2(sin(TAU*(h.x+uPh*${cyc(v[2])})),cos(TAU*(h.y+uPh*${cyc(v[2])})));d=min(d,length(pt-f));}return vec4(vec3(d),1.);}`; break;
          case 'shape': body = `vec4 ${f}(vec2 s){vec2 q=syAc(s);float sd=max(3.,floor(${v[0]}+.5)),a=atan(q.x,q.y)+3.14159265,r=TAU/sd;float d=cos(floor(.5+a/r)*r-a)*length(q);float m=1.-smoothstep(${v[1]}-${v[2]},${v[1]}+${v[2]},d);return vec4(vec3(m),m);}`; break;
          case 'gradient': body = `vec4 ${f}(vec2 s){return vec4(s,.5+.5*sin(${T(v[0])}),1.);}`; break;
          case 'solid': body = `vec4 ${f}(vec2 s){return vec4(${v[0]},${v[1]},${v[2]},${v[3]});}`; break;
          case 'rings': body = `vec4 ${f}(vec2 s){float d=length(syAc(s));float w=.5+.5*sin(d*${v[0]}-${T(v[1])});return vec4(vec3(w),1.);}`; break;
          case 'grid': body = `vec4 ${f}(vec2 s){vec2 q=fract(s*${v[0]})-.5;float e=min(.5-abs(q.x),.5-abs(q.y));return vec4(vec3(1.-smoothstep(0.,${v[1]},e)),1.);}`; break;
          case 'stripes': body = `vec4 ${f}(vec2 s){float w=${v[0]}*(s.x+s.y*.5)+${T(v[1])};return vec4(vec3(smoothstep(-.1,.1,sin(w))),1.);}`; break;
          // coordenadas: aplicam-se ao que vem ANTES na cadeia (como no Hydra)
          case 'rotate': body = `vec4 ${f}(vec2 s){return ${P}(syRot(s,TAU*(${v[0]}+uPh*${cyc(v[1])})));}`; break;
          case 'scale': body = `vec4 ${f}(vec2 s){vec2 q=syAc(s)/(max(.01,${v[0]})*vec2(max(.01,${v[1]}),max(.01,${v[2]})));return ${P}(syBk(q));}`; break;
          case 'pixelate': body = `vec4 ${f}(vec2 s){vec2 n=max(vec2(1.),vec2(${v[0]},${v[1]}));return ${P}((floor(s*n)+.5)/n);}`; break;
          case 'repeat': body = `vec4 ${f}(vec2 s){vec2 n=max(vec2(1.),floor(vec2(${v[0]},${v[1]})+.5));vec2 q=s*n;q.x+=floor(q.y)*${v[2]};q.y+=floor(q.x)*${v[3]};return ${P}(fract(q));}`; break;
          case 'repeatX': body = `vec4 ${f}(vec2 s){float n=max(1.,floor(${v[0]}+.5));vec2 q=vec2(s.x*n,s.y);q.y+=floor(q.x)*${v[1]};return ${P}(vec2(fract(q.x),fract(q.y)));}`; break;
          case 'repeatY': body = `vec4 ${f}(vec2 s){float n=max(1.,floor(${v[0]}+.5));vec2 q=vec2(s.x,s.y*n);q.x+=floor(q.y)*${v[1]};return ${P}(vec2(fract(q.x),fract(q.y)));}`; break;
          case 'scroll': body = `vec4 ${f}(vec2 s){return ${P}(fract(s+vec2(${v[0]},${v[1]})*uPh*${cyc(v[2])}));}`; break;
          case 'scrollX': body = `vec4 ${f}(vec2 s){return ${P}(fract(s+vec2(${v[0]}*uPh*${cyc(v[1])},0.)));}`; break;
          case 'scrollY': body = `vec4 ${f}(vec2 s){return ${P}(fract(s+vec2(0.,${v[0]}*uPh*${cyc(v[1])})));}`; break;
          case 'kaleid': body = `vec4 ${f}(vec2 s){return ${P}(syKal(s,${v[0]}));}`; break;
          case 'mirror': body = `vec4 ${f}(vec2 s){vec2 q=abs(s-.5)+.5;q=mix(s,q,clamp(${v[0]},0.,1.));return ${P}(q);}`; break;
          case 'warp': body = `vec4 ${f}(vec2 s){vec2 L=loopv(${cyc(v[2])}*.3)+uSeed;vec2 d=vec2(noise(s*${v[1]}+L),noise(s*${v[1]}+L+5.2))-.5;return ${P}(s+d*${v[0]}*2.);}`; break;
          case 'twirl': body = `vec4 ${f}(vec2 s){vec2 q=syAc(s);float r=length(q);float a=${v[0]}*(1.-smoothstep(0.,${v[1]},r));return ${P}(syRot(s,a));}`; break;
          // cor
          case 'color': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(c.rgb*vec3(${v[0]},${v[1]},${v[2]}),c.a*${v[3]});}`; break;
          case 'hue': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(syHue(c.rgb,${v[0]}+uPh*${cyc(v[1])}),c.a);}`; break;
          case 'saturate': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(mix(vec3(syL(c.rgb)),c.rgb,${v[0]}),c.a);}`; break;
          case 'contrast': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4((c.rgb-${v[1]})*${v[0]}+${v[1]},c.a);}`; break;
          case 'brightness': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(c.rgb+${v[0]},c.a);}`; break;
          case 'invert': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(mix(c.rgb,1.-c.rgb,clamp(${v[0]},0.,1.)),c.a);}`; break;
          case 'posterize': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);float b=max(2.,${v[0]});return vec4(pow(floor(pow(max(c.rgb,0.),vec3(${v[1]}))*b)/b,vec3(1./${v[1]})),c.a);}`; break;
          case 'thresh': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);float m=smoothstep(${v[0]}-${v[1]},${v[0]}+${v[1]},syL(c.rgb));return vec4(vec3(m),c.a);}`; break;
          case 'luma': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);float m=smoothstep(${v[0]}-${v[1]},${v[0]}+${v[1]},syL(c.rgb));return vec4(c.rgb*m,c.a*m);}`; break;
          case 'tint': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);float l=clamp(syL(c.rgb),0.,1.);vec3 g=l<.5?mix(uBg,uC2,l*2.):mix(uC2,uC1,l*2.-1.);return vec4(mix(c.rgb,g,clamp(${v[0]},0.,1.)),c.a);}`; break;
          case 'gamma': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s);return vec4(pow(max(c.rgb,0.),vec3(1./max(.05,${v[0]}))),c.a);}`; break;
          // mistura com outra cadeia
          case 'add': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return vec4(c.rgb+g.rgb*${v[0]},max(c.a,g.a*${v[0]}));}`; break;
          case 'sub': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return vec4(c.rgb-g.rgb*${v[0]},c.a);}`; break;
          case 'mult': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return vec4(mix(c.rgb,c.rgb*g.rgb,${v[0]}),c.a);}`; break;
          case 'diff': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return vec4(mix(c.rgb,abs(c.rgb-g.rgb),${v[0]}),c.a);}`; break;
          case 'blend': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return mix(c,g,clamp(${v[0]},0.,1.));}`; break;
          case 'layer': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);return vec4(mix(c.rgb,g.rgb,g.a),max(c.a,g.a));}`; break;
          case 'mask': body = `vec4 ${f}(vec2 s){vec4 c=${P}(s),g=${subName}(s);float m=syL(g.rgb);return vec4(c.rgb*m,c.a*m);}`; break;
          // modulação: a outra cadeia desloca as coordenadas desta
          case 'modulate': body = `vec4 ${f}(vec2 s){vec4 g=${subName}(s);return ${P}(s+(g.rg-.5)*${v[0]});}`; break;
          case 'modulateScale': body = `vec4 ${f}(vec2 s){vec4 g=${subName}(s);float k=${v[1]}+${v[0]}*(syL(g.rgb)-.5);return ${P}(syBk(syAc(s)/max(.05,k+1.)));}`; break;
          case 'modulateRotate': body = `vec4 ${f}(vec2 s){vec4 g=${subName}(s);return ${P}(syRot(s,(${v[1]}+${v[0]}*syL(g.rgb))*TAU));}`; break;
          case 'modulatePixelate': body = `vec4 ${f}(vec2 s){vec4 g=${subName}(s);float n=max(2.,${v[1]}+${v[0]}*syL(g.rgb)*10.);return ${P}((floor(s*n)+.5)/n);}`; break;
          case 'modulateKaleid': body = `vec4 ${f}(vec2 s){vec4 g=${subName}(s);return ${P}(syKal(s,${v[0]}+syL(g.rgb)*2.));}`; break;
          default: throw new Error('operador sem implementação: ' + nm);
        }
        fns.push(body); prev = f;
      });
      return prev;
    }
    const last = emit(tree);
    return HELP + fns.join('\n') + `\nvoid main(){vec4 c=${last}(gl_FragCoord.xy/uRes);gl_FragColor=outc(clamp(c.rgb,0.,1.),clamp(c.a,0.,1.));}`;
  }
  const EXAMPLES = {
    'FAIXAS MODULADAS': 'osc(18,1,0.6).rotate(0.1,1).modulate(noise(3,1),0.12).tint().contrast(1.25)',
    'KALEIDO DE RUÍDO': 'noise(5,1).kaleid(7).modulateRotate(osc(6,1),0.4).tint().pixelate(160,90)',
    'CÉLULAS EM ESPELHO': 'voronoi(7,0.5,1).mirror(1).modulate(rings(10,1),0.04).tint().posterize(5,0.7)',
    'RETÍCULA RESPIRANDO': 'grid(10,0.1).scale(1.0+0.2*bass).modulateScale(noise(2,1),0.6).tint().add(shape(6,0.3,0.02),0.5)',
    'ANÉIS HIPNÓTICOS': 'rings(30,1).modulate(osc(8,1,0.2),0.05+0.1*hit).kaleid(4).tint()',
    'FORMA SOBRE CAMPO': 'noise(3,1).tint().layer(shape(5,0.25,0.01).color(1,1,1).modulate(noise(4,1),0.05))',
    'FLUXO DE LISTRAS': 'stripes(14,1).warp(0.12,3,1).scroll(0.5,0,1).tint().pixelate(240,135)',
    'VÓRTICE': 'noise(4,1).twirl(6,0.7).kaleid(5).tint().contrast(1.3)',
    'CHECAGEM TRAVADA': 'osc(12,1,0.8).repeat(4,4,0,0).modulatePixelate(noise(2,1),1,20).tint()',
    'DIFERENÇA ORGÂNICA': 'voronoi(4,0.6,1).diff(noise(6,1),0.8).hue(0.2,1).tint(0.7).saturate(1.4)',
  };
  const ok = text => { try { compile(text); return null; } catch (e) { return e.message; } };
  return { compile, parse, expr, ok, EXAMPLES, SRC, CO, CL, BL, MO, IDENT, FN };
})();
const SYN_NAMES = Object.keys(SYN.EXAMPLES);
function synthSrc(p) { return SYN.compile((p.chain && p.chain.trim()) || SYN.EXAMPLES[p.preset] || SYN.EXAMPLES[SYN_NAMES[0]]); }
reg('synth', 'Cadeia (osc, noise, kaleid, modulate…)', 'gen', [
  S('preset', 'Exemplo (se a cadeia estiver vazia)', SYN_NAMES[0], SYN_NAMES), T('chain', 'Cadeia: fonte.operador(…).operador(…). Fontes: osc noise voronoi shape gradient solid rings grid stripes. Números aceitam bass mid high hit rms pulse p1..p4 e sin, max…'),
  N('p1', 'P1', 1, -40, 40), N('p2', 'P2', 1, -40, 40), N('p3', 'P3', 1, -40, 40), N('p4', 'P4', 1, -40, 40),
  S('alphaMode', 'Saída', 'opaque', ['alpha', 'opaque']), N('res', 'Resolução interna', 1, 0.25, 1), C('c1', 'Cor 1 (tint)', 'primary'), C('c2', 'Cor 2 (tint)', 'accent'), C('cbg', 'Fundo', 'bg'),
], (c, R) => {
  const src = synthSrc(R.p);   // se a cadeia estiver errada, o erro sobe e aparece na camada
  GEN.shader.draw(c, Object.assign({}, R, { p: Object.assign({}, R.p, { src }) }));
});
