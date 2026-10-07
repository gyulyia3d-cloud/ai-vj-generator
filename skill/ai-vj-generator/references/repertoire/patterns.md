# Patterns

Repetition with a rule. A pattern reads at any distance and carries rhythm by itself, which makes it the most reliable material for LED walls and wide formats. Each family below lists its origin, what it does perceptually, and the engine translation: a built-in generator or a GLSL recipe for the `shader` layer's `src`.

## Families

| Family | Origin | Perceptual effect | Engine |
|---|---|---|---|
| Parallel lines / gratings | Op Art (Riley), Swiss posters | Vibration, direction, speed | `lines` (dir, count, weight, scroll); recipe RILEY WAVES |
| Moiré | Physics of interference; Op Art | A third, undrawn figure appears and moves | recipe MOIRÉ |
| Checkerboard and its distortion | Vasarely (Vega series), Albers | Volume and bulge from a flat grid | recipe CHECKER WARP |
| Truchet tiles | Sébastien Truchet (1704); Smith's quarter-circle variant (1987) | Infinite paths from one tile and one coin flip | recipe TRUCHET |
| Halftone | Print reproduction; Lichtenstein; Pop | Tone from dot size; reads as "printed", mechanical | recipe HALFTONE |
| Binary / data stripes | Data visualization, barcodes, Ikeda's principle of raw data density | Information overload, precision, machine | recipe DATA STRIPES; `data` layer |
| Concentric rings and tunnels | Duchamp's Rotoreliefs (1935), Op Art | Depth, hypnosis, pull | `tunnel`; preset ANÉIS SDF |
| Voronoi / cells | Voronoi (1908), natural tessellation | Organic structure, cells, cracks | preset CÉLULAS |
| Phyllotaxis | Vogel's model (1979), golden angle 137.5° | Natural order, growth, the STANDARD organism | `organism` |
| Lissajous / harmonograph | Lissajous (1857); 19th-century harmonographs | Ratio, music made visible, closed curves | recipe LISSAJOUS |
| Wallpaper groups | Fedorov (1891): 17 plane symmetry groups | Order, ornament; Islamic geometric pattern | `shape` layout grid/radial + `rot`; build with `mod()` in GLSL |
| Flow fields | Perlin noise (1983); Tyler Hobbs' writing on flow fields | Wind, current, hair, orientation | `flow` |
| Noise fields | Perlin (1983–85), simplex (2001), FBM | Clouds, smoke, terrain, "organic tech" | preset CAMPO FBM |
| Bands / stripes with glitch | Industrial signage, CRT artifacts | Aggression, failure, rhythm | preset FAIXAS; `post` glitch |

## Design rules for patterns

- **One pattern, one variable.** Animate a single parameter (phase, rotation, density) and let the pattern do the rest. Animating everything kills the optical effect.
- **Loop-safe motion.** Move with `uPh` times a whole number, or with `loopv(r)`. Change state per bar with `floor(uBeat/4.)`; per sixteenth with `floor(uBeat*4.+uBp*4.)`.
- **Distance.** Moiré and fine gratings shimmer on LED (that is real moiré with the pixel grid). Use ≥ 4 px periods on LED, or make the shimmer the point and say so.
- **Photosensitivity.** High-contrast stripes that flip faster than 3 times per second over a large area are a seizure risk. Keep full-screen flips at bar or beat rate, never at 1/16.

## GLSL recipes

Paste the body into `p.src` of a `shader` layer. Set `p1`…`p4` explicitly in the JSON: custom code does not inherit preset defaults. All recipes use the engine helpers (`hash`, `fbm`, `loopv`, `outc`, `TAU`) and loop seamlessly.

### MOIRÉ
Two gratings, one slowly rotating. `p1` density (1–4), `p2` base angle (0–1), `p3` unused, `p4` unused.
```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float a=.035*sin(TAU*uPh)+uP.y*.05;
mat2 R=mat2(cos(a),-sin(a),sin(a),cos(a)); float f=uP.x*40.;
float g1=step(.5,fract(uv.x*f)), g2=step(.5,fract((R*uv).x*f));
gl_FragColor=outc(uC1,abs(g1-g2));}
```

### RILEY WAVES
Vertical stripes displaced by a travelling wave. `p1` stripes (0.5–3), `p2` wave frequency (0.5–4), `p3` amplitude (0–1).
```glsl
void main(){vec2 uv=gl_FragCoord.xy/uRes.y; float w=sin(uv.y*uP.y*6.+TAU*uPh)*uP.z*.08;
float k=step(.5,fract((uv.x+w*sin(uv.y*3.))*uP.x*20.)); gl_FragColor=outc(uC1,k);}
```

### CHECKER WARP
Checkerboard with a lens that orbits once per loop and swells on the beat. `p1` cells (0.5–3), `p3` bulge (0–3).
```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; vec2 d=uv-loopv(.25); float r=length(d);
uv+=d*uP.z*exp(-r*r*8.)*(1.+.3*uPulse); vec2 g=floor(uv*uP.x*10.);
gl_FragColor=outc(uC1,mod(g.x+g.y,2.));}
```

### TRUCHET
Quarter-circle tiles that re-flip every bar. `p1` tiles per height (4–30), `p3` line width (0.2–2). Accent shows on flipped tiles with the pulse.
```glsl
void main(){vec2 uv=gl_FragCoord.xy/uRes.y*uP.x; vec2 id=floor(uv), f=fract(uv)-.5;
float flip=step(.5,hash(id+floor(uBeat/4.)+uSeed)); if(flip>.5) f.x=-f.x;
float d=min(abs(length(f-.5)-.5),abs(length(f+.5)-.5));
float k=1.-smoothstep(uP.z*.05,uP.z*.05+.02,d); gl_FragColor=outc(mix(uC1,uC2,flip*uPulse),k);}
```

### HALFTONE
Dot screen whose dot size follows a drifting noise field. `p1` dots (0.5–3), `p2` drift (0–2), `p3` dot scale (0.5–2).
```glsl
void main(){vec2 uv=gl_FragCoord.xy/uRes.y*uP.x*20.; vec2 id=floor(uv), f=fract(uv)-.5;
float v=fbm(id*.08+loopv(uP.y)+uSeed); float r=v*uP.z*.6+uPulse*.05;
gl_FragColor=outc(uC1,1.-smoothstep(r,r+.04,length(f)));}
```

### DATA STRIPES
Columns of binary state re-drawn every sixteenth note. `p1` columns (0.5–4, ×200), `p2` row split (0–4), `p3` density threshold (0–1; lower = denser).
```glsl
void main(){vec2 uv=gl_FragCoord.xy/uRes; float x=floor(uv.x*uP.x*200.);
float t=floor(uBeat*4.+uBp*4.); float on=step(uP.z,hash(vec2(x,t)+uSeed));
float row=step(.5,fract(uv.y*uP.y*2.+hash(vec2(x,1.))));
gl_FragColor=outc(uC1,on*mix(1.,row,step(.5,hash(vec2(x,t+7.)))));}
```

### LISSAJOUS
A closed curve with integer frequency ratio, phase turning once per loop. `p1` x frequency (1–7), `p2` y frequency (1–7), `p3` line width (0.5–4). Costly: keep `res` ≤ 0.6.
```glsl
void main(){vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y; float d=1e3; float a=floor(uP.x+.5), b=floor(uP.y+.5);
for(int i=0;i<200;i++){float t=float(i)/200.*TAU; vec2 p=.42*vec2(sin(a*t+TAU*uPh),sin(b*t)); d=min(d,length(uv-p));}
gl_FragColor=outc(uC1,1.-smoothstep(uP.z*.006,uP.z*.006+.003,d));}
```

### Building your own

Start from the space (`uv` centered for radial work, `gl_FragCoord.xy/uRes.y` for grids that keep square cells), add one rule (`fract`, `floor`, `mod`, `step`), add one motion (`uPh` × integer, `loopv`, `floor(uBeat…)`), then output coverage with `outc(color, k)`. If it needs more than ~15 lines, it is probably two layers.
