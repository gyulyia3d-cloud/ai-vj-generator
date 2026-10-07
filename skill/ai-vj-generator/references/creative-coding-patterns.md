# Creative-coding patterns for the `code` layer

How the main generative and motion libraries think, and how to replicate each process **inside this engine** (a deterministic, frame-pure `draw(c, K)`). Libraries named here are teachers of technique; none is bundled. When a pattern needs state that a library keeps between frames (particles, feedback buffers, reaction-diffusion grids), the replacement is a closed form of the frame number, so any frame renders alone, exports exactly and loops.

## 1. Library map: what each is for and the engine equivalent

| Library / tool | Core idea | Replicate with |
|---|---|---|
| **p5.js / Processing** | `setup`/`draw`, `noise()`, `random()`, `PVector`, `createGraphics` buffers, `lerp/map/constrain` | A `code` layer: `K.rand/K.hash` instead of `random`, your own `noise2`, `K.lerp/K.clamp`; a buffer = a separate layer |
| **openFrameworks** | `ofNoise` 3-D fields sliced for u,v (out-of-phase slices), FBO trails (fade rectangle), particle modes (attract/repel), `ofSoundGetSpectrum` with peak-hold smoothing, signal waveforms (sine, saw, tri, noise) | Pattern A (flow field), `p.echo` for trails, the engine's audio bus (fast attack, slow release), §4 signals |
| **Three.js / React Three Fiber** | scene graph, camera, instancing, ShaderMaterial, post | A `code` layer with an explicit projection (see §3), or a shader raymarch; state the camera model in the contract |
| **regl / raw WebGL2** | draw commands, framebuffers, multipass | `shader` layer (single pass) plus `p.echo`; multi-pass feedback is not frame-pure |
| **PixiJS** | many sprites, containers, filters, meshes | Pattern E (grid / duplicator) in a `code` layer; the compositor already stacks layers |
| **Paper.js / SVG** | vector paths, boolean ops, morphing | `c.beginPath()` paths; morph by interpolating matched points |
| **GSAP / anime.js** | timelines, staggers, eases, MotionPath | `K.ease.*`, stagger as `phase` offsets, `Math.sin/cos` arcs; everything keyed to `K.t` |
| **D3** | data → marks, scales, layouts | map a data array to marks with `K.lerp` scales; `fixed` data goes in `vars` or the code |
| **Tone.js / Strudel / TidalCycles** | patterns of time (cycles, mini-notation, Euclidean, polymeter) | Pattern G, `K.t.beat/sub/bar`, `div` on layers |
| **Hydra** | chains of source → transform → blend, feedback, audio via `a.fft` | GLSL recipes (`glsl-recipes.md`), echo, band uniforms |
| **TouchDesigner** | TOP (image), CHOP (signal), SOP (geometry), COMP, instancing, feedback, GLSL TOP | signals → `K.t`/bands; instancing → Pattern E; GLSL TOP → `shader` layer |
| **Cavalry** | behaviours drive values; falloffs weight them; a duplicator distributes; stagger offsets; connect shapes | Pattern E and D; falloff = a function of distance or index |
| **Resolume Wire / ISF / Synesthesia** | nodes, slices, FFT, uniforms | `canvas.folds/displays`, band uniforms, `uHit`, `uBeat` |
| **Canvas-sketch, Shadertoy, Observable** | resolution-independent units, seeded randomness, exports | the engine's 1080-unit system, `K.rng(seed)`, PNG sequences |

## 2. The deterministic toolbox

```js
// value noise (smooth, seeded): put it at the top of a code layer that needs it
const nz=(x,y,s)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),h=(a,b)=>K.hash(a,b,s|0);
  return K.lerp(K.lerp(h(ix,iy),h(ix+1,iy),u),K.lerp(h(ix,iy+1),h(ix+1,iy+1),u),v);};
```

- **Loop-safe time:** `const A = K.TAU * K.t.ph;` then `Math.cos(A*n), Math.sin(A*n)` with integer `n`. To move through a noise field and return, sample at `(x*s + R*Math.cos(A), y*s + R*Math.sin(A))`: a point on a circle in the field.
- **Beat clocks:** `K.t.beat` (index), `K.t.bp` (phase 0–1 in the beat), `K.t.barT` (0–1 in the bar), `K.t.sub` (16th index), `K.t.bar`.
- **Audio:** `K.t.bass .mid .high .rms .hit` are live when a source is connected and BPM-locked synthetic otherwise, so they always move. Map each band to one role.
- **Randomness:** `K.rand(i,k)` per element; `K.rng(seed)` for sequences; never `Math.random`.
- **No kept state:** every frame computes from `K.t` and seeded values.

## 3. Depth without a 3-D engine

```js
// simple perspective: world (x,y,z) -> screen; camera at z=-d looking +z
const proj=(x,y,z,d=900)=>{const s=d/(d+z);return [K.w/2+x*s, K.h/2+y*s, s];};
```
Rotate points by `(rx, ry)` with `K.TAU*K.t.ph` times integers, project, scale size and opacity by `s`. A tilted phyllotaxis disc with a parabolic z bulge (`z = depth*(1 - r²)`) reads as a 3-D object with 2,400 dots. State camera and depth in the contract.

## 4. Signals (oF / TouchDesigner CHOP vocabulary)

sine `0.5+0.5*Math.sin(A*n)`; cosine; saw `(K.t.ph*n)%1`; triangle `1-Math.abs(2*((K.t.ph*n)%1)-1)`; square `((K.t.ph*n)%1)<0.5?1:0`; noise `nz(K.t.ph*n, k, s)` (not loop-safe; use the circular domain); rand per beat `K.hash(K.t.beat, k, s)`. Combine signals (add, multiply, max) before mapping to a property, and shape with an ease.

## 5. Patterns (each is a tested `src` body; vars in the JSON line)

Learn the move, then author your own with this brief's concept, roles, palette and audio map. Declare the `vars` so the VJ can tune them.

### A. Flow lines in a noise field (oF noise field, Hobbs flow fields)

Vars: `[{"k":"lines","l":"Linhas","t":"n","d":160,"min":40,"max":400,"step":1},{"k":"steps","l":"Passos","t":"n","d":26,"min":8,"max":60,"step":1},{"k":"curl","l":"Curvatura","t":"n","d":2,"min":0.3,"max":5,"step":0.05}]`

```js
const nz=(x,y,s)=>{const ix=Math.floor(x),iy=Math.floor(y),fx=x-ix,fy=y-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy),h=(a,b)=>K.hash(a,b,s|0);return K.lerp(K.lerp(h(ix,iy),h(ix+1,iy),u),K.lerp(h(ix,iy+1),h(ix+1,iy+1),u),v);};
const A=K.TAU*K.t.ph, R=.6, sc=.0028*K.v.curl, len=K.h*.011*(1+K.t.mid*.6);
c.lineCap='round'; c.lineJoin='round';
for(let i=0;i<K.v.lines;i++){
  let x=K.rand(i,1)*K.w, y=K.rand(i,2)*K.h; const hot=K.rand(i,3)<.04+K.t.hit*.1;
  c.beginPath(); c.moveTo(x,y);
  for(let s=0;s<K.v.steps;s++){
    const a=nz(x*sc+R*Math.cos(A),y*sc+R*Math.sin(A),7)*K.TAU*2;
    x+=Math.cos(a)*len; y+=Math.sin(a)*len; c.lineTo(x,y);
  }
  c.strokeStyle=hot?K.accent:K.ink; c.globalAlpha=hot?.9:.35+.25*K.rand(i,4);
  c.lineWidth=(1.2+1.6*K.rand(i,5))*(1+K.t.bass*.5); c.stroke();
}
c.globalAlpha=1;
```

### B. Phyllotaxis disc with a scan band (golden angle, parabolic depth)

Vars: `[{"k":"dots","l":"Pontos","t":"n","d":1400,"min":200,"max":4000,"step":10},{"k":"tilt","l":"Inclinação","t":"n","d":0.9,"min":0,"max":1.4,"step":0.01}]`

```js
const N=K.v.dots, ga=Math.PI*(3-Math.sqrt(5)), R=K.h*.4*(1+K.t.bass*.04), A=K.TAU*K.t.ph, cx=K.w*.5, cy=K.h*.5;
const scan=(K.t.ph*2)%1, ct=Math.cos(K.v.tilt), st=Math.sin(K.v.tilt);
for(let i=0;i<N;i++){
  const rn=Math.sqrt((i+.5)/N), th=i*ga+A*.25, br=1+.015*Math.sin(A*2+i*.37);
  let x=R*rn*br*Math.cos(th), y=R*rn*br*Math.sin(th), z=R*.35*(1-rn*rn);
  const yy=y*ct-z*st, zz=y*st+z*ct, s=900/(900+zz);
  const band=Math.abs(rn-scan)<.03;
  c.globalAlpha=band?1:(.3+.5*(1-rn*.6))*(.55+.45*K.rand(i,1));
  c.fillStyle=band?K.accent:K.ink;
  const r=(1.1+2.4*(1-rn))*s*(1+K.t.hit*.35)*(band?1.8:1);
  c.beginPath(); c.arc(cx+x*s,cy+yy*s,r,0,K.TAU); c.fill();
}
c.globalAlpha=1;
```

### C. Lissajous ribbon with a decaying tail (arcs, harmonic motion)

Vars: `[{"k":"a","l":"Freq X","t":"n","d":3,"min":1,"max":7,"step":1},{"k":"b","l":"Freq Y","t":"n","d":2,"min":1,"max":7,"step":1}]`

```js
const A=K.TAU*K.t.ph, cx=K.w*.5, cy=K.h*.5, ax=K.h*.62*(1+K.t.bass*.08), ay=K.h*.36, S=140;
for(let j=S;j>=0;j--){
  const u=j/S, ph=A-u*.5;
  const x=cx+ax*Math.sin(K.v.a*ph+.6), y=cy+ay*Math.sin(K.v.b*ph);
  c.globalAlpha=Math.pow(1-u,2)*.9; c.fillStyle=j===0?K.accent:K.ink;
  c.beginPath(); c.arc(x,y,(1-u)*K.h*.012*(1+K.t.hit*.8)+1,0,K.TAU); c.fill();
}
c.globalAlpha=1;
```

### D. Particle burst, closed-form lifecycle (Reeves particle systems)

Vars: `[{"k":"n","l":"Partículas","t":"n","d":260,"min":40,"max":900,"step":10},{"k":"cycles","l":"Rajadas por loop","t":"n","d":2,"min":1,"max":8,"step":1}]`

```js
const cx=K.w*.5, cy=K.h*.5;
for(let i=0;i<K.v.n;i++){
  const age=(K.t.ph*K.v.cycles+K.rand(i,3))%1, dir=K.rand(i,1)*K.TAU, spd=.35+.65*K.rand(i,2);
  const r=K.ease.out(age)*spd*K.h*.55, g=age*age*K.h*.12;
  const x=cx+Math.cos(dir)*r, y=cy+Math.sin(dir)*r+g, fade=Math.pow(1-age,2);
  c.globalAlpha=fade*.9; c.fillStyle=K.rand(i,4)<.08?K.accent:K.ink;
  const s=(1-age)*K.h*.008*(1+K.t.bass*.8)+.6; c.fillRect(x-s/2,y-s/2,s,s);
}
c.globalAlpha=1;
```

### E. Duplicator grid with a moving falloff and stagger (Cavalry duplicator + falloff + noise behaviour)

Vars: `[{"k":"cols","l":"Colunas","t":"n","d":36,"min":8,"max":90,"step":1},{"k":"rad","l":"Raio do falloff","t":"n","d":0.32,"min":0.05,"max":0.8,"step":0.01}]`

```js
const cols=K.v.cols, cell=K.w/cols, rows=Math.ceil(K.h/cell), A=K.TAU*K.t.ph;
const fx=K.w*(.5+.32*Math.sin(A)), fy=K.h*(.5+.28*Math.sin(A*2)), R=K.h*K.v.rad;
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=(i+.5)*cell, y=(j+.5)*cell, d=Math.hypot(x-fx,y-fy), f=Math.max(0,1-d/R), idx=(i*7+j*13)%17/17;
  const pul=Math.max(0,Math.sin(A*2-idx*Math.PI*2))*.5;
  const s=cell*(.12+.5*f*(1+K.t.bass)+.12*pul);
  c.globalAlpha=.25+.75*f; c.fillStyle=f>.7&&K.t.hit>.2?K.accent:K.ink;
  K.rect(c,x-s/2,y-s/2,s,s);
}
c.globalAlpha=1;
```

### F. Spring chain: follow-through and overlap (damped spring from a beat impulse)

Vars: `[{"k":"n","l":"Barras","t":"n","d":14,"min":4,"max":40,"step":1},{"k":"zeta","l":"Amortecimento","t":"n","d":0.28,"min":0.1,"max":1,"step":0.01}]`

```js
const n=K.v.n, z=K.v.zeta, w=K.TAU*2.2, wd=w*Math.sqrt(1-z*z), spb=60/K.t.bpm, bh=K.h*.72/n;
for(let i=0;i<n;i++){
  const s=Math.max(0,K.t.bp*spb-i*.018);               // seconds since this bar's impulse (staggered)
  const spring=1-Math.exp(-z*w*s)*(Math.cos(wd*s)+(z/Math.sqrt(1-z*z))*Math.sin(wd*s));
  const len=K.w*(.12+.62*spring), y=K.h*.14+i*bh;
  c.globalAlpha=.4+.5*(1-i/n); c.fillStyle=i%4===0?K.accent:K.ink;
  K.rect(c,K.w*.08,y,len,bh*.5);
}
c.globalAlpha=1;
```

### G. Euclidean rhythm rows (Strudel / Tidal patterns of time)

Vars: `[{"k":"cell","l":"Célula","t":"n","d":64,"min":24,"max":140,"step":1}]`

```js
const rows=[[3,8],[5,8],[7,16],[4,16],[9,16]], cell=K.v.cell;
rows.forEach((r,j)=>{
  const k=r[0], n=r[1], step=K.t.sub%n, y=K.h*.2+j*cell*1.5;
  for(let i=0;i<n;i++){
    const on=((i*k)%n)<k, now=i===step, x=K.w*.1+i*cell*(16/n)*.9;
    c.globalAlpha=on?(now?1:.6):.14; c.fillStyle=now&&on?K.accent:K.ink;
    K.rect(c,x,y,cell*.7*(now&&on?1+K.t.hit*.4:1),cell*.7);
  }
});
c.globalAlpha=1;
```

### More tested code layers

Superformula rings, Clifford attractor, pendulum wave, wave interference, spirograph with a tracing head, Kepler orbits and a radial stagger grid are in `recipes/code/`; build a layer with `python scripts/recipes.py layer <id>`. Choreography helpers (stagger, timeline, special eases, path morph) are in `motion-systems.md`.

## 6. Choosing

Many agents each following a rule: D, A. A structured field responding to a moving influence: E. A disc, organism or radial form: B. A gesture or ribbon: C. Physical response to a beat: F. Rhythm itself as the image: G. Pixel-parallel field: a shader (`glsl-recipes.md`). Exact lettering, logo, wall type: the generators `pixeltext`, `logo`, `symbols`, `hazard`, `blocks`.

## 7. Performance notes

Keep draw calls under a few thousand per layer; batch with one `beginPath` per colour; avoid `shadowBlur`; draw at logical units (the engine scales). A 5120-wide canvas costs the same code but more pixels: prefer fewer, larger marks on walls. If a layer is heavy, split it into two layers of different density and let the VJ mute one.

## 8. Study notes from the references attached to this skill

- *oF noise field example:* sample a 3-D noise at `(t + phase, x*c + phase, y*c + phase)` for `u` and `(t - phase, x*c - phase, y*c + phase)` for `v`, so the two components are decorrelated; here that is "two independent noise samples at offset origins" (pattern A uses one angle field; use two for vector fields).
- *oF fboTrails:* fade the buffer with a low-alpha rectangle each frame; here use `p.echo`.
- *oF soundPlayerFFT:* peak-hold smoothing (`smoothed *= 0.96; smoothed = max(smoothed, incoming)`); the engine's bands use fast attack and slow release for the same reason.
- *Hydra:* `src → transform → blend → out` chains with `() => a.fft[i]` arrows; here uniforms and band roles.
- *Strudel:* everything is a pattern over cycles; `stack` layers voices; `perlin` for organic modulation; `mask`/`struct` for arrangement. Treat a composition as a stack of voices with different cycle lengths.
- *The Clawb skill:* visuals must be audio-reactive, no strobing above 3 Hz, modulate parameters with bass/mid/high, build gradually. This engine adopts all three; "never replace wholesale, change one or two things per step" is a good live-performance habit.
