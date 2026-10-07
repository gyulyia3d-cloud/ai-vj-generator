// Interference of point sources: sum of sin(k d_s - w t) over orbiting sources, sampled on a dot grid.
// Sources orbit a whole number of times per loop and the wave advances 2 cycles per loop, so the loop closes.
// Where waves add, dots swell; where they cancel, the grid goes dark: the image is made by the physics.
const A=K.TAU*K.t.ph, S=Math.round(K.v.src), cell=K.v.cell, k=K.TAU/K.v.wl;
const rx=Math.min(K.w*.36,K.h*1.2), ry=K.h*.3, sx=[], sy=[];
for(let s=0;s<S;s++){
  const a0=K.TAU*K.rand(s,2), dir=(s%2)?1:-1, rev=1+(s%2);
  sx.push(K.w*.5+Math.cos(a0+dir*rev*A)*rx*(.5+.5*K.rand(s,3)));
  sy.push(K.h*.5+Math.sin(a0+dir*rev*A)*ry*(.5+.5*K.rand(s,4)));
}
const cols=Math.ceil(K.w/cell), rows=Math.ceil(K.h/cell);
for(let j=0;j<rows;j++)for(let i=0;i<cols;i++){
  const x=(i+.5)*cell, y=(j+.5)*cell; let v=0;
  for(let s=0;s<S;s++){const d=Math.hypot(x-sx[s],y-sy[s]); v+=Math.sin(k*d-2*A);}
  const a=v/S*.5+.5; if(a<.1) continue;
  const q=Math.pow(a,1.5)*(1+K.t.bass*.25), sz=Math.min(cell*.94,cell*.94*q);
  c.fillStyle=a>.86?K.accent:K.ink; c.globalAlpha=.35+.65*a;
  K.rect(c,x-sz/2,y-sz/2,sz,sz);
}
c.globalAlpha=1;
