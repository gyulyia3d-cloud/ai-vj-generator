# GLSL recipes (compile-tested in the engine)

Vocabulary, not presets. Each recipe is a complete `shader.p.src` body (authoring dialect GLSL ES 1.00, compiled as ES 3.00 on WebGL2) that compiles in this engine. Use it to learn the move, then write a shader for **this** briefing: change the topology, the numbers, the palette roles and the audio mapping. Never ship a recipe unchanged, and never start a composition from one.

More compile-tested shaders (Chladni figures, quasicrystal, domain colouring, Julia on an orbit) live in `recipes/shader/`; list and build them with `python scripts/recipes.py` (`math-forms.md`).

## Rules every shader follows

1. **Loop closes.** Time-driven motion uses `uPh` times a whole number (`TAU*uPh*floor(uP.y+.5)`), or `loopv(r)` to travel through noise space. Never `uT` for looping motion.
2. **Every shader is audio-reactive** (project rule, enforced by the engine and `validate_project.py`). The engine feeds `uBass uMid uHigh uRms uHit` (and `uAud`, the band chosen in the layer's AUDIO panel) from the music when a source is connected, and from deterministic BPM-locked synthetic bands when not. A shader that ignores all of them is rejected. Map by role:
   - `uBass` weight, scale, pressure, warp amount, line thickness
   - `uMid` displacement, flow, scale drift, deformation
   - `uHigh` edge sparkle, texture, colour mix toward `uC2`, fine detail
   - `uHit` a transient (decays in ~150 ms): flashes, fills, cuts, shock rings
   - `uRms` overall level; `uBp` beat phase 0..1; `uBeat` beat index; `uPulse` combined pulse
3. **Colour from the palette only:** `uC1`, `uC2`, `uBg`, written through `outc(color, coverage)`. A second colour role means a second shader layer.
4. **Seed:** add `uSeed` to every `hash`/`noise`/`fbm` argument so a new seed gives a sibling piece.
5. **Size in resolution-independent units:** `uv=(gl_FragCoord.xy-.5*uRes)/uRes.y` (height = 1). For tall or very wide canvases scale the pattern by aspect (`uRes.x/uRes.y`) deliberately (`aspect-ratios.md`).
6. **ES 1.00:** floats written `1.0`, `mod(x,y)` not `%`, constant loop bounds, no `texture2D` or `#version`. Helpers available: `hash noise fbm loopv outc vjRot vjPal vjSdBox vjSdCircle vjSmin vjKaleid vjEaseOut vjPulse`.
7. `p1…p4` = `uP.x…uP.w`; keep them inside the UI ranges so a slider nudge never jumps.

## Hydra and Synesthesia vocabulary, in this engine

| Hydra / Synesthesia | Here |
|---|---|
| `osc(freq, sync, offset)` | `sin((uv.x*f + TAU*uPh*n))`, recipe OSC |
| `.kaleid(n)` | `vjKaleid(uv, n)` |
| `.modulate(src, amt)` | add `(fbm(…) - .5) * amt` to `uv` before the pattern (domain warp) |
| `.rotate(a, speed)` | `vjRot(a) * uv`, speed as `TAU*uPh*n` |
| `.pixelate(x, y)` | `uv = (floor(uv*n)+.5)/n` |
| `.repeat(x, y)` / `.scroll` | `fract(uv*n)` / add `loopv()` or `uPh*n` |
| `.thresh` / `.luma` | `smoothstep` into the coverage argument of `outc` |
| `.colorama` / `.hue` | mix `uC1`→`uC2` by a field, or `vjPal` when the palette is spectral |
| `src(o0)` feedback | not a pure function of the frame; use layer **echo** (copies at earlier frames, deterministic) |
| `a.fft[0..3]` | `uBass uMid uHigh` (+ `uHit`) |
| `syn_BassLevel / syn_Hits` | `uBass / uHit` |
| `syn_BPMSin / syn_BPMTri` | `sin(TAU*uPh*n)` / `abs(fract(uPh*n)*2.-1.)` |
| `syn_OnBeat` | `exp(-uBp*5.)` (already the engine's `uPulse` fallback) |
| `syn_ToggleOnBeat` | `mod(floor(uBeat),2.)` |

## 1. OSC: modulated stripes (Hydra `osc` + `modulate`)
`p1` frequency 3–30, `p2` cycles 1–4, `p3` softness 0–1.

Start values: `{"p1": 12, "p2": 1, "p3": 0.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
vec2 w=vec2(fbm(uv*2.+loopv(.5)+uSeed),fbm(uv*2.+4.2-loopv(.5)+uSeed));
uv+=(w-.5)*(.25+uBass*.5);
float v=sin(uv.x*uP.x+TAU*uPh*floor(uP.y+.5))*.5+.5;
float k=smoothstep(.5-uP.z*.4,.5+uP.z*.1,v)*(1.-smoothstep(.7,1.3,length(uv)));
gl_FragColor=outc(mix(uC1,uC2,clamp(v*uMid+uHigh*.3,0.,1.)),clamp(k+uHit*.15,0.,1.));}
```

## 2. Kaleidoscope fold with warp (Hydra `kaleid` + `modulate`)
`p1` sides 3–12, `p2` zoom 1–6, `p3` warp 0–1.

Start values: `{"p1": 6, "p2": 2.5, "p3": 0.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; uv=vjRot(TAU*uPh)*uv;
uv=vjKaleid(uv*(1.+uBass*.2),floor(uP.x+.5));
uv+=(vec2(fbm(uv*3.+loopv(.7)+uSeed),fbm(uv*3.+7.3-loopv(.7)))-.5)*uP.z*(.4+uMid);
float v=abs(sin(uv.x*uP.y*4.)*sin(uv.y*uP.y*4.));
float k=smoothstep(.08,.5,v)*(1.-smoothstep(.6,1.1,length(uv)));
gl_FragColor=outc(mix(uC1,uC2,clamp(v+uHigh*.3,0.,1.)),clamp(k+uHit*.2,0.,1.));}
```

## 3. Domain-warped field (Inigo Quilez, domain warping)
`p1` scale 0.8–4, `p2` warp 0–2, `p3` contrast 0.5–3.

Start values: `{"p1": 1.6, "p2": 1.1, "p3": 1.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 p=uv*uP.x; vec2 L=loopv(.6)+uSeed;
vec2 q=vec2(fbm(p+L),fbm(p+vec2(5.2,1.3)-L));
vec2 r=vec2(fbm(p+2.*q+vec2(1.7,9.2)+L*.5),fbm(p+2.*q+vec2(8.3,2.8)-L*.5));
float f=fbm(p+(uP.y+uBass*.8)*r);
float k=clamp((f-.25)*uP.z*2.,0.,1.);
gl_FragColor=outc(mix(uC1,uC2,smoothstep(.4,.9,f+uHigh*.1)),clamp(k+uHit*.1,0.,1.));}
```

## 4. Metaballs with smooth minimum (SDF)
`p1` count feel 1–5 (orbit radius), `p2` softness 0.05–0.5, `p3` edge 0–1.

Start values: `{"p1": 1.4, "p2": 0.18, "p3": 0.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float d=9.;
for(int i=0;i<6;i++){float fi=float(i); float a=TAU*(uPh*(1.+mod(fi,2.))+fi/6.);
vec2 c=vec2(cos(a),sin(a*(1.+mod(fi,3.))))*.28*uP.x*(.6+.4*hash(vec2(fi,uSeed)));
d=vjSmin(d,vjSdCircle(uv-c,.09+.05*hash(vec2(fi,3.))+uBass*.05),uP.y);}
float fill=1.-smoothstep(0.,.01,d); float edge=1.-smoothstep(0.,.012+uP.z*.02,abs(d-.015));
gl_FragColor=outc(mix(uC1,uC2,clamp(edge+uHigh*.4,0.,1.)),clamp(max(fill*.55,edge)+uHit*.12*fill,0.,1.));}
```

## 5. Pixelated quantised noise (Hydra `pixelate` + `thresh`)
`p1` cell count 10–120, `p2` cycles 1–3, `p3` threshold 0.2–0.8.

Start values: `{"p1": 40, "p2": 1, "p3": 0.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float n=max(4.,uP.x*(1.-uBass*.15));
vec2 id=floor(uv*n); float h=hash(id+uSeed);
float v=noise(id*.35+loopv(1.)+uSeed)*.7+h*.3;
v=.5+.5*sin(TAU*(v+uPh*floor(uP.y+.5)));
float k=step(uP.z,v)*(1.-smoothstep(.7,1.4,length(uv)));
gl_FragColor=outc(mix(uC1,uC2,clamp(h*uHigh*1.5+uHit*.5,0.,1.)),k);}
```

## 6. Truchet tiles
`p1` tiles 3–20, `p2` line weight 0.03–0.2, `p3` re-orient rate (per beat) 0–1.

Start values: `{"p1": 8, "p2": 0.08, "p3": 0.3}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y*uP.x; vec2 id=floor(uv),g=fract(uv)-.5;
float h=hash(id+uSeed+floor(uBeat*uP.z)); if(h>.5) g.x=-g.x;
float d=min(abs(length(g-vec2(.5))-.5),abs(length(g+vec2(.5))-.5));
float k=1.-smoothstep(uP.y*.5+uBass*.03,uP.y*.5+uBass*.03+.02,d);
gl_FragColor=outc(mix(uC1,uC2,clamp(hash(id+9.)*uMid*1.6+uHigh*.3,0.,1.)),clamp(k+uHit*.15*k,0.,1.));}
```

## 7. Beat shockwave (physics: expanding ring, decaying amplitude)
`p1` ring width 0.02–0.2, `p2` rings 1–4, `p3` decay 1–6.

Start values: `{"p1": 0.05, "p2": 3, "p3": 3.5}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float r=length(uv); float k=0.;
for(int i=0;i<4;i++){float fi=float(i); float age=fract(uBp*1.+(fi*.25)); float rad=vjEaseOut(age)*.9;
float amp=exp(-age*uP.z)*(1.-fi*.18); k+=amp*(1.-smoothstep(0.,uP.x,abs(r-rad)));}
k=clamp(k*(.5+uHit*.9+uBass*.5),0.,1.);
gl_FragColor=outc(mix(uC1,uC2,clamp(r*1.2+uHigh*.3,0.,1.)),k);}
```

## 8. Flow lines along a noise field (generative flow, Tyler Hobbs / oF noise field)
`p1` density 20–120, `p2` curl 0.5–4, `p3` width 0.1–0.5.

Start values: `{"p1": 60, "p2": 2, "p3": 0.25}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 L=loopv(.5)+uSeed;
float a=fbm(uv*uP.y+L)*TAU*(1.+uMid*.5); vec2 dir=vec2(cos(a),sin(a));
float s=dot(uv,vec2(-dir.y,dir.x))*uP.x+fbm(uv*1.5+L)*3.;
float line=1.-smoothstep(uP.z*.5,uP.z*.5+.12,abs(fract(s)-.5)*2.);
float k=line*smoothstep(1.2,.2,length(uv));
gl_FragColor=outc(mix(uC1,uC2,clamp(a/TAU+uHigh*.2,0.,1.)),clamp(k*(.55+uBass*.6)+uHit*.1*k,0.,1.));}
```

## 9. Rotating moiré (two gratings, interference)
`p1` line density 20–140, `p2` angle between gratings (rad) 0.01–0.3, `p3` contrast 0.3–1.

Start values: `{"p1": 60, "p2": 0.08, "p3": 0.8}` (set them explicitly: the preset defaults are for another shader).

```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
vec2 a=vjRot(TAU*uPh*.0+uP.y*.5)*uv, b=vjRot(-uP.y*.5+TAU*uPh)*uv;
float g=sin(a.x*uP.x*(1.+uBass*.04))*sin(b.x*uP.x);
float k=smoothstep(-.2,.8,g*uP.z+.2)*(1.-smoothstep(.8,1.5,length(uv)));
gl_FragColor=outc(mix(uC1,uC2,clamp(.5+.5*g+uHigh*.3,0.,1.)),clamp(k+uHit*.1,0.,1.));}
```

## Writing your own (checklist)

1. Name the **behavior** first (spec in the creative contract), then pick the operations.
2. Loop: `uPh` x integer or `loopv`. 3. Audio: assign each band a role in one line of the layer's `role`.
4. Palette: `uC1`/`uC2`/`uBg` only. 5. Seed everything. 6. Check large walls: bigger forms, `res` 1 for hairlines.
7. Run `validate_project.py`, build, read the contact sheet at several loop positions, and check the validation panel for compile errors with line numbers.
