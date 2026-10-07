// Hypotrochoid family: x=(R-r)cos t + d cos((R-r)/r t), y=(R-r) sin t - d sin((R-r)/r t).
// R:r = p:q with gcd 1 closes after q turns, so each curve is a closed figure. A bright head traces its curve exactly
// once per loop (stroke progress, the DrawSVG idea) and drags a fading tail; the pen distance d breathes with the loop.
const A=K.TAU*K.t.ph, cx=K.w*.5, cy=K.h*.5, Rm=K.h*.46, n=Math.round(K.v.curves);
const PQ=[[5,3],[7,4],[8,3],[9,4],[11,5],[13,8],[7,2],[9,2]];
const pick=Math.floor(K.rand(0,9)*PQ.length);
for(let j=0;j<n;j++){
  const pq=PQ[(pick+j*3)%PQ.length], R=pq[0], r=pq[1], q=r, kk=(R-r)/r;
  const d=K.v.pen*r*(.62+.38*Math.sin(A+j*1.3))*(1+K.t.bass*.12);
  const sc=Rm*(.38+.62*(j+1)/n)/(R-r+d), S=Math.min(1400,110*q);
  const pt=s=>{const t=s/S*K.TAU*q; return [cx+((R-r)*Math.cos(t)+d*Math.cos(kk*t))*sc, cy+((R-r)*Math.sin(t)-d*Math.sin(kk*t))*sc];};
  c.beginPath(); for(let s=0;s<=S;s++){const P=pt(s); if(s)c.lineTo(P[0],P[1]); else c.moveTo(P[0],P[1]);}
  c.strokeStyle=K.ink; c.globalAlpha=.14; c.lineWidth=Math.max(1,K.h/540); c.stroke();
  const head=K.t.ph, tail=K.v.tail;
  c.lineWidth=Math.max(1.5,K.h/300)*(1+.3*j/n); c.lineCap='round';
  for(let s=0;s<S;s++){
    const u=((head-s/S)%1+1)%1; if(u>tail) continue;
    const P=pt(s), Q=pt(s+1); c.beginPath(); c.moveTo(P[0],P[1]); c.lineTo(Q[0],Q[1]);
    c.strokeStyle=u<tail*.12?K.accent:K.ink; c.globalAlpha=1-u/tail; c.stroke();
  }
}
c.globalAlpha=1;
