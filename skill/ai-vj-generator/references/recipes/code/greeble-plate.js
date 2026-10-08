// Greeble plate: the hard-surface detail of sci-fi hulls and machine panels, built by recursive subdivision of the canvas. Each leaf is a panel with its own small detail
// (vent slots, rivets, a chip block, a hatch, a light bar). The layout is a pure function of the seed, so it never changes between frames or loops; only a scanning light
// (one pass per loop) and the bass move. Use it as a texture band behind information, or as the structure layer of an industrial piece.
const rng=K.rng(K.v.seed+7), depth=Math.round(K.v.depth), minW=K.h*.05;
const panels=[];
function split(x,y,w,h,d){
  const stop=d>=depth||w<minW*2||h<minW*2||(d>=2&&rng()<.18);
  if(stop){ panels.push([x,y,w,h]); return; }
  const vertical=w*(.7+rng()*.6)>h, t=.3+rng()*.4;
  if(vertical){ split(x,y,w*t,h,d+1); split(x+w*t,y,w*(1-t),h,d+1); } else { split(x,y,w,h*t,d+1); split(x,y+h*t,w,h*(1-t),d+1); }
}
const m=K.h*.03; split(m,m,K.w-2*m,K.h-2*m,0);
const lw=Math.max(1,K.h/540*K.v.weight), scan=((K.t.lph%1)+1)%1, band=K.w*.12, sx=scan*(K.w+band)-band;
c.lineJoin='miter';
panels.forEach((P,i)=>{
  const [x,y,w,h]=P, g=3, r=rng(), lit=Math.max(0,1-Math.abs((x+w/2)-(sx+band/2))/band), pulse=1+K.t.bass*.4*lit;
  c.globalAlpha=.55; c.strokeStyle=K.ink; c.lineWidth=lw; c.strokeRect(x+g,y+g,w-2*g,h-2*g);
  c.globalAlpha=.12+.5*lit; c.fillStyle=K.accent; if(lit>.02) c.fillRect(x+g,y+g,w-2*g,h-2*g);
  c.globalAlpha=.7; c.fillStyle=K.ink; c.strokeStyle=K.ink;
  if(r<.28){ const n=Math.max(2,Math.floor(h/(K.h*.014))); for(let k=0;k<n;k++){ const yy=y+g*3+(h-g*6)*k/n; c.fillRect(x+w*.18,yy,w*.64,Math.max(1,lw*1.4)); } }
  else if(r<.5){ const rr=Math.max(1.5,K.h*.004); [[x+g*3,y+g*3],[x+w-g*3,y+g*3],[x+g*3,y+h-g*3],[x+w-g*3,y+h-g*3]].forEach(q=>{ c.beginPath(); c.arc(q[0],q[1],rr,0,K.TAU); c.fill(); }); }
  else if(r<.66){ const cw=Math.min(w,h)*.34; c.globalAlpha=.85; c.fillRect(x+w/2-cw/2,y+h/2-cw/2,cw,cw); c.globalAlpha=.4; c.strokeRect(x+w/2-cw,y+h/2-cw,cw*2,cw*2); }
  else if(r<.8){ c.save(); c.beginPath(); c.rect(x+g*2,y+g*2,w-g*4,h-g*4); c.clip(); c.globalAlpha=.4; c.lineWidth=lw*.8; const st=Math.max(5,K.h*.012); c.beginPath(); for(let k=-h;k<w;k+=st){ c.moveTo(x+k,y+h); c.lineTo(x+k+h,y); } c.stroke(); c.restore(); }
  else if(r<.9){ c.globalAlpha=.9; c.fillStyle=K.accent; const bh=Math.max(2,h*.08); c.fillRect(x+w*.12,y+h/2-bh/2,Math.min(w*.76,w*.76*(.4+.6*lit)*pulse),bh); }
});
c.globalAlpha=1;
