// Radial stagger on a grid: every cell grows and shrinks once per bar, but each starts later in proportion to its
// distance from an origin, so one ripple crosses the wall. Grid, origin and wave shape are the choreography.
// State at the bar's first and last instant is identical (all cells small), so the loop closes.
const cell=K.v.cell, cols=Math.ceil(K.w/cell), rows=Math.ceil(K.h/cell), n=cols*rows;
const clamp=(x,a,b)=>Math.min(b,Math.max(a,x));
const seg=(t,at,dur,e)=>e(clamp((t-at)/dur,0,1));
const org=[cols*(.2+.6*K.rand(1,1)), rows*(.2+.6*K.rand(1,2))];       // seeded origin of the ripple
let dmax=0; for(const [x,y] of [[0,0],[cols,0],[0,rows],[cols,rows]]) dmax=Math.max(dmax,Math.hypot(x-org[0],y-org[1]));
const t=K.t.barT;
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const d=Math.hypot(i+.5-org[0],j+.5-org[1])/dmax;                  // 0 at the origin, 1 at the farthest corner
  const delay=Math.pow(d,K.v.curve)*Math.min(K.v.reach,.38);         // curve > 1: the wave accelerates outward; delay+.6 must stay under 1 so every cell is back to rest at the bar line
  const up=seg(t,delay,.22,K.ease.out), down=seg(t,delay+.3,.3,K.ease.in);
  const p=up*(1-down);
  const sz=cell*(.12+.5*p*(1+K.t.bass*.12));                         // never a flood: peak is about 60% of the cell
  const hot=p>.05&&p<.85&&up<1;
  c.fillStyle=hot?K.accent:K.ink; c.globalAlpha=hot?.95:.22+.5*p;
  K.rect(c,(i+.5)*cell-sz/2,(j+.5)*cell-sz/2,sz,sz);
}
c.globalAlpha=1;
