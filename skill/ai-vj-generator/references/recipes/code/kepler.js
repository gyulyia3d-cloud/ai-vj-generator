// Orbital mechanics, closed form: each body moves on a Kepler ellipse (focus at the centre) with the mean anomaly
// M = 2*pi*n*phase; Kepler's equation E - e sin E = M is solved with 7 Newton steps per frame.
// n is a whole number of orbits per loop and follows Kepler's third law (inner bodies fast, outer slow), so the
// system is physical and the loop still closes. Tails are the same body evaluated a little earlier in M.
const A=K.TAU*K.t.ph, N=Math.round(K.v.bodies), cx=K.w*.5, cy=K.h*.5, Rm=Math.min(K.h*.47,K.w*.47);
const kep=(M,e)=>{let E=M; for(let i=0;i<7;i++) E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E)); return E;};
const pos=(a,e,w,M)=>{const E=kep(M,e), b=a*Math.sqrt(1-e*e), x=a*(Math.cos(E)-e), y=b*Math.sin(E);
  return [cx+x*Math.cos(w)-y*Math.sin(w), cy+x*Math.sin(w)+y*Math.cos(w)];};
c.lineCap='round';
for(let i=0;i<N;i++){
  const u=(i+1)/N, a=Rm*(.14+.72*u), e=K.v.ecc*(.3+.7*K.rand(i,1)), w=K.TAU*K.rand(i,2);
  const n=Math.max(1,Math.min(12,Math.round(4/Math.pow(u,1.5)))), M0=K.TAU*K.rand(i,3);
  c.beginPath(); for(let s=0;s<=120;s++){const P=pos(a,e,w,s/120*K.TAU); if(s)c.lineTo(P[0],P[1]); else c.moveTo(P[0],P[1]);}
  c.strokeStyle=K.ink; c.globalAlpha=.12; c.lineWidth=Math.max(1,K.h/600); c.stroke();
  const Mn=M0+n*A, span=K.v.tail*K.TAU/Math.max(1,n/2);
  for(let s=0;s<14;s++){
    const P=pos(a,e,w,Mn-span*s/14), Q=pos(a,e,w,Mn-span*(s+1)/14);
    c.beginPath(); c.moveTo(P[0],P[1]); c.lineTo(Q[0],Q[1]);
    c.strokeStyle=K.ink; c.globalAlpha=.75*(1-s/14); c.lineWidth=Math.max(1.4,K.h/330)*(1-s/20); c.stroke();
  }
  const B=pos(a,e,w,Mn), rb=Math.max(2.5,K.h*(.006+.012*u));
  c.globalAlpha=1; c.fillStyle=(i%4===0)?K.accent:K.ink; c.beginPath(); c.arc(B[0],B[1],rb,0,K.TAU); c.fill();
}
c.globalAlpha=1; c.fillStyle=K.accent; c.beginPath(); c.arc(cx,cy,K.h*.018*(1+K.t.bass*.8),0,K.TAU); c.fill();
