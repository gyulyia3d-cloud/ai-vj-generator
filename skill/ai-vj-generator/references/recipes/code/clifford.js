// Clifford attractor cloud: x' = sin(a y) + c cos(a x), y' = sin(b x) + d cos(b y).
// Stateless: every seeded start point burns in 22 steps and then plots 28 more, so the picture is a pure function
// of the frame. a, b, c, d travel on a small circle (one revolution per loop), so the cloud breathes and closes.
// `copies` repeats the system across a wide canvas, each module with its own phase offset.
const A=K.TAU*K.t.ph, M=Math.round(K.v.seeds), cp=Math.round(K.v.copies);
const unit=Math.min(K.h,K.w/cp), sc=unit*.2*K.v.size, px=Math.max(1.4,K.h/600), mw=K.v.morph*(1+K.t.bass*.5);
const B=[[],[],[],[]];
for(let g=0;g<cp;g++){
  const off=cp>1?g*1.7:0;
  const a=-1.4+mw*Math.sin(A+off), b=1.6+mw*Math.cos(A+off), cc=1+mw*.6*Math.sin(2*A+off), d=.7+mw*.6*Math.cos(2*A-off);
  const cxg=K.w*(g+.5)/cp, cyg=K.h*.5;
  for(let i=0;i<M;i++){
    let x=K.rand(i,1+g*7)*2-1, y=K.rand(i,2+g*7)*2-1;
    for(let s=0;s<22;s++){const nx=Math.sin(a*y)+cc*Math.cos(a*x), ny=Math.sin(b*x)+d*Math.cos(b*y); x=nx; y=ny;}
    for(let s=0;s<28;s++){
      const nx=Math.sin(a*y)+cc*Math.cos(a*x), ny=Math.sin(b*x)+d*Math.cos(b*y); x=nx; y=ny;
      B[s&3].push(cxg+x*sc,cyg+y*sc);
    }
  }
}
const al=[.16,.26,.4,.62];
for(let k=0;k<4;k++){
  c.beginPath(); const P=B[k];
  for(let j=0;j<P.length;j+=2) c.rect(P[j],P[j+1],px,px);
  c.fillStyle=k===3?K.accent:K.ink; c.globalAlpha=al[k]; c.fill();
}
c.globalAlpha=1;
