# GLSL library (`#include`)

Original, independently written functions (public maths: simplex noise, Worley, distance functions, Oklab, Bayer, easings). No third-party shader library code is bundled. Use it instead of re-writing noise, SDFs or colour maths in every shader.

```text
#include noise.simplex
#include sdf2d
#include color
void main(){ ... }
```

Rules: one module per line, at the top of the `src`. Dependencies are pulled in (`noise.cell` pulls `hash`). The module text replaces the first include line, on one line, so error line numbers do not move. All functions are prefixed `vj` so they never clash with `hash noise fbm` of the engine. Unknown module = validator error. Source of truth: `references/glsl-lib/lib.glsl`; the engine embeds it with `node scripts/embed-glsl-lib.mjs`.

| Module | Gives you |
|---|---|
| `hash` | `vjHash22 vjHash31 vjHash33` |
| `noise.simplex` | `vjSimplex` (-1..1), `vjSimplexFbm`, `vjCurl` (flow without sinks), `vjRidged` |
| `noise.cell` | `vjWorley` (F1, F2, cell id), `vjVoronoiEdge` |
| `sdf2d` | `vjSdSeg vjSdRing vjSdRoundBox vjSdNgon vjSdStar vjSdTri`, `vjSmax vjOpSub vjOpOnion`, `vjRepeat vjMirror vjPolarRepeat` |
| `sdf3d` | `vjSdSphere vjSdBox3 vjSdTorus vjSdCapsule vjSdPlane`, `vjRotX/Y/Z`, `vjRepeat3` |
| `raymarch` | you define `float map(vec3 p)`; `vjMarch vjNormal vjAO vjShadow vjCam` |
| `color` | `vjOklab vjFromOklab vjMixOklab`, `vjHsv`, `vjAces vjReinhard`, `vjGrade`, `vjDuotone` |
| `dither` | `vjBayer4 vjIgn vjQuant vjHalftone vjLineScreen` |
| `space` | `vjPolar vjSwirl vjBarrel vjHexTile vjLogPolar vjAspect` |
| `easing` | `vjSmoother vjInOut vjOutBack vjElastic vjBounce vjExpoOut vjGain` |
| `post` | `vjVignette vjGlow vjAA vjGrain vjScan` |
| `led` | `vjLedDots vjCrtMask vjBleed` (preview the real surface: pitch in render pixels) |

## Examples (compiled by `lib_check.mjs`)

Integrated time, curl flow and Oklab: the image travels with the bass and cools towards `uC2` on the highs.

```glsl
#include noise.simplex
#include color
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 p=uv*2.5+vjCurl(uv*1.5+sin(TAU*uBassT)*.3)*.08;
  float f=vjSimplexFbm(p+vec2(cos(TAU*uMidT),sin(TAU*uMidT))*.6+uSeed);
  float k=smoothstep(.35,.8,f)+uHit*.12;
  gl_FragColor=outc(vjMixOklab(uC1,uC2,clamp(uHigh+f*.4,0.,1.)),clamp(k,0.,1.));
}
```

Cells that light on the hit and edges that follow the beat sine.

```glsl
#include noise.cell
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec3 w=vjWorley(uv*(4.+uBass*1.5)+uSeed);
  float edge=1.-smoothstep(0.,.06+.04*uBSin,w.y-w.x);
  float lit=step(1.-uHit*.8-.05,w.z);
  gl_FragColor=outc(mix(uC1,uC2,lit),clamp(edge*.8+lit*.5*(1.-w.x),0.,1.));
}
```

A raymarched object on the surface, rotating with the integrated mid time.

```glsl
#include sdf3d
#include raymarch
float map(vec3 p){
  p=vjRotY(TAU*uMidT)*p;
  return vjSmin(vjSdTorus(p,vec2(.7+.1*uBass,.18)),vjSdSphere(p,.3+.15*uHit),.25);
}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec3 ro=vec3(0.,.6,-3.),rd=vjCam(uv,ro,vec3(0.),1.6);
  float t=vjMarch(ro,rd,8.);
  float k=0.;
  if(t>0.){vec3 p=ro+rd*t,n=vjNormal(p);k=(.2+.8*max(dot(n,normalize(vec3(1.,1.,-1.))),0.))*vjAO(p,n);}
  gl_FragColor=outc(mix(uC2,uC1,k),clamp(k+.0,0.,1.)*step(0.,t));
}
```

Why these shapes: time that is integrated from the music (`uBassT`…) moves the pattern in the music's own time without ever jumping; fixed periodic parts (`uPh`, `uBSin`) keep the loop closed. Use `sin/cos/fract` of integrated time for anything that must loop.
