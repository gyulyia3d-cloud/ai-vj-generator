// Pendulum wave seen from the side: pendulum i swings f = base + floor(i*spread) whole cycles per loop, so the row
// re-synchronises exactly at the loop seam and, in between, draws travelling waves, standing waves and moire.
// Neighbouring pendulums differ by spread cycles, so the spatial wavelength sweeps from infinite (all in step) down
// to two pendulums (spread 0.5 reaches it only at the seam, which avoids aliasing). Stems show each swing; the
// accent polyline is the wave itself.
const A=K.TAU*K.t.ph, N=Math.round(K.v.count), n0=Math.round(K.v.base), sp=K.v.spread;
const pad=K.h*.08, W=K.w-2*pad, cy=K.h*.5, H=K.h*.4*K.v.amp*(1+K.t.bass*.15), rb=Math.max(1.6,Math.min(K.h*.012,W/N*.38));
const P=[];
for(let i=0;i<N;i++){ const f=n0+Math.floor(i*sp); P.push([pad+W*(i+.5)/N, cy+Math.sin(f*A)*H]); }
c.lineCap='round';
c.strokeStyle=K.ink; c.globalAlpha=.16; c.lineWidth=Math.max(1,K.h/540);
c.beginPath(); c.moveTo(pad,cy); c.lineTo(pad+W,cy); c.stroke();
c.globalAlpha=.3;
for(const q of P){ c.beginPath(); c.moveTo(q[0],cy); c.lineTo(q[0],q[1]); c.stroke(); }
c.globalAlpha=.9; c.strokeStyle=K.accent; c.lineWidth=Math.max(1.5,K.h/320);
c.beginPath(); P.forEach((q,i)=>{ if(i)c.lineTo(q[0],q[1]); else c.moveTo(q[0],q[1]); }); c.stroke();
c.globalAlpha=1; c.fillStyle=K.ink;
P.forEach((q,i)=>{ c.beginPath(); c.arc(q[0],q[1],rb*(i%8===0?1.6:1),0,K.TAU); c.fill(); });
