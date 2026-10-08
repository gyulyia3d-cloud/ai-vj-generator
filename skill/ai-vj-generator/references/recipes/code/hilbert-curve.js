// Hilbert curve: one continuous line that visits every cell of a 2^n by 2^n grid without crossing itself, the classic way to fold a line into a plane.
// The faint line is the whole path; a bright head with a tail runs along it once per loop (it fades in at the start of the curve and out at the end, so the seam is silent).
// `tiles` puts several curves side by side for wide canvases (each one starts a little later, so the heads travel as a wave). Pure arithmetic: no randomness.
const order=Math.round(K.v.order), n=1<<order, total=n*n, tiles=Math.max(1,Math.round(K.v.tiles));
const side=Math.min(K.w/tiles, K.h)*.9, gap=(K.w-side*tiles)/(tiles+1), top=(K.h-side)/2, cell=side/n;
function d2xy(d){ let x=0,y=0,t=d; for(let s=1;s<n;s*=2){ const rx=1&(t>>1), ry=1&(t^rx); if(ry===0){ if(rx===1){ x=s-1-x; y=s-1-y; } const q=x; x=y; y=q; } x+=s*rx; y+=s*ry; t=t>>2; } return [x,y]; }
const pts=[]; for(let d=0;d<total;d++) pts.push(d2xy(d));
const lw=Math.max(1,cell*K.v.weight), tail=Math.max(2,Math.round(total*K.v.tail));
c.lineCap='round'; c.lineJoin='round';
for(let k=0;k<tiles;k++){
  const x0=gap+k*(side+gap)+cell/2, y0=top+cell/2, px=p=>x0+p[0]*cell, py=p=>y0+p[1]*cell;
  c.globalAlpha=.22; c.strokeStyle=K.ink; c.lineWidth=lw*.6; c.beginPath(); pts.forEach((p,i)=>{ if(i)c.lineTo(px(p),py(p)); else c.moveTo(px(p),py(p)); }); c.stroke();
  const u=((K.t.lph+k/tiles*K.v.stagger)%1+1)%1, head=Math.floor(u*(total-1)), fade=Math.sin(Math.PI*u), boost=1+K.t.bass*.5;
  c.strokeStyle=K.accent; c.lineWidth=lw*1.6*boost;
  for(let j=0;j<tail;j++){ const i=head-j; if(i<1) break; const a=(1-j/tail)*fade; if(a<.02) continue; c.globalAlpha=Math.min(1,a*.95); c.beginPath(); c.moveTo(px(pts[i-1]),py(pts[i-1])); c.lineTo(px(pts[i]),py(pts[i])); c.stroke(); }
  const hp=pts[Math.max(0,head)]; c.globalAlpha=Math.min(1,fade); c.fillStyle=K.ink; c.beginPath(); c.arc(px(hp),py(hp),lw*2.2*boost,0,K.TAU); c.fill();
}
c.globalAlpha=1;
