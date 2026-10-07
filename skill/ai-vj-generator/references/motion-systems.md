# Motion systems: staggers, timelines, special eases, paths, text

`animation-principles.md` covers the twelve principles, the basic eases and closed-form springs. This file adds the *choreography layer* that professional animation libraries and timeline tools are built around, translated into deterministic code-layer helpers: how to spread motion across many elements, how to sequence it on the bar grid, special eases, path drawing and morphing, text reveals. Everything below is a pure function of the frame (no timers, no kept state) and the helpers marked *tested* were run against assertions.

Sources studied (concepts only, no code copied; see `repo-analysis.md`): anime.js (stagger, spring, timeline, SVG draw/morph, text split), GSAP (custom wiggle and bounce, rough and slow-mo eases, motion path, FLIP), Motion Canvas (generator-based flow, signals).

## 1. Stagger: one idea, many elements

A stagger gives element `i` of `n` its own delay. The choice of *origin* and *shape* is the choreography.

| Option | Effect |
|---|---|
| `from: first / last` | a wave that travels one way |
| `from: center` | a pulse that spreads outward |
| `from: edges` | a gathering inward |
| `from: index` | a ripple from a chosen element |
| `grid: [cols, rows]` | distance on a grid, radial from the origin (a ripple across a screen of tiles) |
| `axis: x / y` | on a grid, only columns or only rows |
| `ease` on the delay | accelerating or decelerating waves (apply to the normalised distance) |
| `jitter` / `random` | seeded noise on the delay for organic arrival |
| range value | spread the delays between two durations instead of 0 to a maximum |

*Tested* helper (delay in `0..amount` for element `i`):

```js
const stagger=(i,n,amount,o={})=>{
  const from=o.from===undefined?'first':o.from, grid=o.grid; let d;
  if(grid){const cx=i%grid[0], cy=Math.floor(i/grid[0]);
    const f=Array.isArray(from)?from:from==='center'?[(grid[0]-1)/2,(grid[1]-1)/2]:from==='last'?[grid[0]-1,grid[1]-1]:[0,0];
    const dist=(x,y)=>Math.hypot(o.axis==='y'?0:x-f[0], o.axis==='x'?0:y-f[1]);
    const m=Math.max(dist(0,0),dist(grid[0]-1,0),dist(0,grid[1]-1),dist(grid[0]-1,grid[1]-1));
    d=dist(cx,cy)/(m||1);
  } else {
    const k=from==='first'?0:from==='last'?n-1:from==='center'?(n-1)/2:from==='edges'?null:+from;
    d=from==='edges'?Math.min(i,n-1-i)/((n-1)/2||1):Math.abs(i-k)/(Math.max(k,n-1-k)||1);
  }
  if(o.ease) d=o.ease(d);
  return d*amount;
};
```

Use: `const prog = seg(K.t.barT, 0.1 + stagger(i, N, 0.5, {from:'center'}), 0.4, K.ease.out)`. Keep total stagger under half a beat for UI-like type, up to a bar for atmospheric builds (`animation-principles.md` §6). Add `K.rand(i,k)` jitter for non-mechanical feel. A stagger that is too regular looks like a template; vary the origin per composition.

## 2. Timeline algebra on the bar grid

Timeline tools sequence events relative to each other: *after the previous*, *with the previous*, *at a label*, *offset by x*. In a frame-pure engine, everything is a function of one clock, so a timeline is a list of `{at, dur, ease}` in **beats or bars**, evaluated by `seg`:

```js
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const seg=(t,at,dur,ease=x=>x)=>ease(clamp((t-at)/dur,0,1));   // progress 0..1 of an event (tested)
```

Pattern: compute positions once, as plain arithmetic, from labels you name:

```js
const t=K.t.bt;                          // one clock: K.t.bt = beats 0-4 inside the bar (or K.t.barT, 0-1)
const A=0, B=A+1.0, C=B+0.5, D=C;        // 'after previous' = +duration; 'with previous' = same value
const a=seg(t,A,1.0,K.ease.out), b=seg(t,B,0.5,K.ease.back), c=seg(t,C,2.0,K.ease.expo);
```

Flow vocabulary from generator-based tools maps directly:

| Flow idea | Frame-pure equivalent |
|---|---|
| `all(a, b, c)` run together, wait for all | the same `at`, the block ends at `max(at+dur)` |
| `any(...)` first to finish wins | end = `min(at+dur)` |
| `chain(a, b, c)` one after another | `B = A+durA`, `C = B+durB` |
| `sequence(delay, a, b, c)` each starts `delay` after the previous | `at_i = at_0 + i·delay` (this is a stagger) |
| `loop(n, f)` | `f` of `t mod length` |
| `delay(x, f)` | shift `at` |
| `waitFor` / hold | a segment with no change; or hold the last value after `at+dur` (`seg` clamps) |
| signals (derived reactive values) | compute derived values from one clock each frame; there is no graph to update |

Rule: every composition has **one clock** (a bar, 4 beats, a loop phase). Name the beats of the arc (`ARRIVE`, `BUILD`, `RUPTURE`, `RELEASE`) as constants at the top of the layer so the choreography is readable and a retime is a one-line edit.

## 3. Special eases

*Tested* closed forms. Use them as adverbs: wiggle for nervous settle, squash for weight, slow-mid for suspense, rough for hand-made jitter.

```js
const TAU=Math.PI*2;
const wiggle=(t,n,decay=1)=>Math.sin(TAU*n*t)*Math.pow(1-t,decay);         // 0 -> n oscillations -> 0
const slowMid=(t,k=.7)=>t+k*Math.sin(TAU*t)/TAU;                            // fast ends, slow middle (0<=k<1), monotonic
const squash=(v,k=.35)=>{const sy=1+k*v;return [1/sy,sy];};                 // [scaleX, scaleY], volume preserved
const rough=(t,seed,amt=.08,steps=24)=>{const h=Math.sin((Math.floor(t*steps)+seed*13.7)*127.1)*43758.5453;
  return Math.min(1,Math.max(0,t+(h-Math.floor(h)-.5)*amt*Math.sin(Math.PI*t)));};   // jittered; 0 at start, 1 at end
```

- **Wiggle**: multiply a displacement by `wiggle(progress, n)`; the thing shakes, then rests exactly at the end.
- **Squash and stretch**: drive `v` from velocity or from `uHit`; scale `x` and `y` by the pair so the area is preserved (it reads as weight, not as scaling).
- **Slow-mid** is the "slow-motion" move: a travel that races, lingers at the centre, and leaves.
- **Spring by bounce and duration**: animation tools let the artist set a perceived duration and a bounce from −1 to 1 instead of stiffness and damping; map to `ω₀ = 2π/duration` and a damping ratio `ζ = 1 − bounce` (clamped), then use the closed-form spring of `animation-principles.md` §4.
- **Stepped** (`K.ease.step`) for mechanical and interface motion; alternate a stepped and a smooth layer to show two worlds.

## 4. Paths: draw, follow, morph

A closed path is a list of points; the three operations below are the foundation of most logo, line and shape animation.

*Tested* helpers:

```js
const resample=(pts,N)=>{const L=[0];for(let i=1;i<=pts.length;i++){const a=pts[i-1],b=pts[i%pts.length];L.push(L[i-1]+Math.hypot(b[0]-a[0],b[1]-a[1]));}
  const T=L[L.length-1],out=[];for(let k=0;k<N;k++){const d=T*k/N;let i=1;while(L[i]<d)i++;const a=pts[i-1],b=pts[i%pts.length],u=(d-L[i-1])/((L[i]-L[i-1])||1);
    out.push([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);}return out;};                    // N points equally spaced by arc length
const matchStart=(A,B)=>{const N=A.length;let best=0,bd=1e18;for(let s=0;s<N;s++){let d=0;for(let i=0;i<N;i++){const q=B[(i+s)%N];d+=(A[i][0]-q[0])**2+(A[i][1]-q[1])**2;}if(d<bd){bd=d;best=s;}}
  return B.map((_,i)=>B[(i+best)%N]);};                                                // rotate B's start to the best match with A
const morph=(A,B,u)=>A.map((p,i)=>[p[0]+(B[i][0]-p[0])*u,p[1]+(B[i][1]-p[1])*u]);
const partial=(pts,p)=>pts.slice(0,Math.max(1,Math.floor(pts.length*p))+1);              // stroke progress, the "draw on" idea
```

- **Draw on**: reveal a stroke to progress `p` (`partial`), or move a bright head along the path with a fading tail (`recipes/code/spirograph.js`).
- **Follow a path**: position = `pts[floor(p·N)]`, orientation from the neighbour difference; keep `p` on a whole number of loops.
- **Morph**: resample both shapes to the same N, match the start index, then interpolate (`morph`). Morph between shapes with the same meaning, or the transform reads as a glitch.
- **Hole-aware shapes** (letters with counters) morph per contour; do not merge contours.

## 5. Layout transitions (FLIP)

Animate a change of layout without simulating it: **F**irst (measure the start), **L**ast (measure the end), **I**nvert (draw the element at its end layout but displaced and scaled back to its start), **P**lay (animate the displacement to zero). In a code layer: compute `startPos[i]` and `endPos[i]` as pure functions, then draw at `lerp(startPos, endPos, ease(p))`. This is how a grid reorders into a ring, a list sorts, or a word rearranges into another, with no collisions to simulate.

## 6. Inertia and throw (closed forms)

| Motion | Form |
|---|---|
| Constant acceleration | `x = x₀ + v₀t + ½at²` |
| Friction (velocity decays) | `v(t) = v₀e^{−ft}`, `x(t) = x₀ + (v₀/f)(1 − e^{−ft})` |
| Throw to a stop at a chosen distance | choose `f` and `v₀ = f·distance`, so `x(∞) = x₀ + distance` |
| Gravity and bounce | `y = h|cos(πs/T)|e^{−ds}` (`animation-principles.md` §4) |

Trigger from a beat: `s = time since the last beat`, evaluated with the forms above, gives a hit that decays before the next one.

## 7. Text: split, stagger, scramble

- **Split** a string into characters, words or lines and give each its own stagger delay: type becomes an ensemble instead of a block.
- **Scramble reveal**: for character `i` with reveal progress `p`, show the true glyph when `p·N > i`, otherwise a glyph from a fixed set chosen by `K.hash(i, floor(time·rate))` (seeded, so it is reproducible). Rate 12 to 24 changes per second reads as decoding.
- **Kinetic type** rules, fonts and exact strings: `repertoire/kinetic-type.md`. Never invent words or substitute a font the user did not supply.

## 8. Reading rules for choreography

1. One clock per composition; name the beats of the arc as constants.
2. Pair every stagger with an origin that *means* something (centre = emergence, edges = gathering, a point = an impact).
3. Use three different eases in a composition; at least one stepped or mechanical, one organic.
4. Keep the hero's motion simpler than its surroundings, or stillest, so it reads (`perception-and-gestalt.md` §2).
5. Check aliasing: pattern period `P` px with per-frame speed `v` must satisfy `v < P/4`.
