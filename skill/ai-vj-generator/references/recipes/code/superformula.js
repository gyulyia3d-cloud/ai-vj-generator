// Superformula contours (Gielis): r(t) = ( |cos(m t/4)|^n2 + |sin(m t/4)|^n3 )^(-1/n1)
// A stack of rings whose exponents travel in phase, so one morph wave runs inward to outward per loop.
// Closure: m even closes in one turn, m odd in two; every exponent moves with whole sine cycles of the loop.
const A=K.TAU*K.t.ph, m=Math.round(K.v.m), N=Math.round(K.v.rings);
const cx=K.w*.5, cy=K.h*.5, R0=K.h*.46, STEPS=220, turns=(m%2)?2:1;
c.lineJoin='round';
for(let i=0;i<N;i++){
  const u=i/(N-1), ph=A+u*Math.PI;
  const n1=1.0+.9*(.5+.5*Math.sin(ph))+K.t.bass*.25;
  const n2=1.8+K.v.wob*Math.sin(2*ph+1.3), n3=1.8+K.v.wob*Math.cos(2*ph+.4);
  const rs=(.16+.84*u)*R0*(1+K.t.bass*.05*(1-u));
  c.beginPath();
  for(let s=0;s<=STEPS*turns;s++){
    const th=s/STEPS*K.TAU;
    const a=Math.pow(Math.abs(Math.cos(m*th/4)),n2), b=Math.pow(Math.abs(Math.sin(m*th/4)),n3);
    const r=Math.min(Math.pow(a+b,-1/n1),2.2)*.95*rs;
    const x=cx+Math.cos(th)*r, y=cy+Math.sin(th)*r;
    if(s)c.lineTo(x,y); else c.moveTo(x,y);
  }
  c.closePath();
  const hot=(i%5===0);
  c.strokeStyle=hot?K.accent:K.ink; c.globalAlpha=hot?.95:.18+.5*u;
  c.lineWidth=K.v.weight*(hot?1.4:1)*(.6+.8*u);
  c.stroke();
}
c.globalAlpha=1;
