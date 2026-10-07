// Test cards for the first minutes on site (references/output-engineering.md §8). One card per bar in `auto`, or pick one.
// Everything is drawn in PROJECT pixels (K.pw x K.ph), converted to the layer's logical units, so 1 px really is 1 px of the pixel map.
const ux=K.w/K.pw, uy=K.h/K.ph, px=v=>v*ux, py=v=>v*uy;
const CARDS=['grade','pixel','rampa','barras','moldura','movimento','blend'];
const card=K.v.card==='auto'?CARDS[Math.floor(K.t.bar)%CARDS.length]:K.v.card;
const ink=K.ink, acc=K.accent, grey=v=>K.alpha?`rgba(255,255,255,${v/255})`:`rgb(${v},${v},${v})`;
const label=(t,x,y,s)=>{ c.font=`${Math.max(9,py(s||13))}px monospace`; c.textBaseline='top'; c.fillText(t,x,y); };
const line=(x0,y0,x1,y1,w)=>{ c.lineWidth=Math.max(w||1,.5*ux); c.beginPath(); c.moveTo(x0,y0); c.lineTo(x1,y1); c.stroke(); };
c.fillStyle=K.bg; c.fillRect(0,0,K.w,K.h);
c.fillStyle=ink; c.strokeStyle=ink;
if(card==='grade'){
  const st=Math.max(10,Math.round(K.v.step));
  for(let X=0;X<=K.pw;X+=st){ const major=(X/st)%5===0; c.globalAlpha=major?.9:.28; line(px(X),0,px(X),K.h,px(1)); if(major&&X<K.pw){ c.globalAlpha=1; label(String(X),px(X)+px(4),py(24)); } }
  for(let Y=0;Y<=K.ph;Y+=st){ const major=(Y/st)%5===0; c.globalAlpha=major?.9:.28; line(0,py(Y),K.w,py(Y),py(1)); if(major&&Y>0&&Y<K.ph){ c.globalAlpha=1; label(String(Y),px(4),py(Y)+py(4)); } }
  c.globalAlpha=1; c.strokeStyle=acc; line(K.w/2,0,K.w/2,K.h,px(2)); line(0,K.h/2,K.w,K.h/2,py(2));
  for(const f of K.folds){ c.setLineDash([px(8),px(6)]); line(f,0,f,K.h,px(2)); c.setLineDash([]); c.fillStyle=acc; label('DOBRA',f+px(6),K.h*.5+py(10)); }
  c.fillStyle=ink; c.strokeStyle=ink; c.lineWidth=px(2); c.strokeRect(px(1),py(1),K.w-px(2),K.h-py(2));
}
else if(card==='pixel'){
  const patch=(x0,y0,n)=>{ for(let j=0;j<n;j++)for(let i=0;i<n;i++){ if((i+j)&1) K.rect(c,x0+px(i),y0+py(j),px(1),py(1)); } };
  const n=Math.min(48,Math.floor(K.pw/8),Math.floor(K.ph/4));
  patch(px(8),py(8),n); patch(K.w-px(8+n),py(8),n); patch(px(8),K.h-py(8+n),n); patch(K.w-px(8+n),K.h-py(8+n),n); patch(K.w/2-px(n/2),K.h/2-py(n/2),n);
  c.fillStyle=ink; K.rect(c,0,0,K.w,py(1)); K.rect(c,0,K.h-py(1),K.w,py(1)); K.rect(c,0,0,px(1),K.h); K.rect(c,K.w-px(1),0,px(1),K.h);
  c.globalAlpha=.55; K.rect(c,px(4),py(4),K.w-px(8),py(1)); K.rect(c,px(4),K.h-py(5),K.w-px(8),py(1)); K.rect(c,px(4),py(4),px(1),K.h-py(8)); K.rect(c,K.w-px(5),py(4),px(1),K.h-py(8)); c.globalAlpha=1;
  c.fillStyle=ink; label('1 PX: XADREZ E BORDAS. NADA DEVE BORRAR OU REAMOSTRAR.',px(16),K.h/2+py(n/2+14),12);
}
else if(card==='rampa'){
  const steps=11, bw=K.w/steps, by=K.h*.1, bh=K.h*.36;
  for(let i=0;i<steps;i++){ c.fillStyle=grey(Math.round(255*i/10)); c.fillRect(i*bw,by,bw+1,bh); c.fillStyle=i<5?ink:K.bg; label(String(i*10),i*bw+px(6),by+bh-py(22),12); }
  const g=c.createLinearGradient(0,0,K.w,0); g.addColorStop(0,grey(0)); g.addColorStop(1,grey(255)); c.fillStyle=g; c.fillRect(0,K.h*.5,K.w,K.h*.12);
  const half=K.w*.3, gx=K.w*.35, gy=K.h*.68, gh=K.h*.22;
  c.fillStyle=grey(188); c.fillRect(gx,gy,half/2,gh);
  c.fillStyle=grey(255); for(let Y=0;Y<gh;Y+=py(2)) c.fillRect(gx+half/2,gy+Y,half/2,py(1));
  c.fillStyle=ink; label('GAMA: O LADO CINZA E O LADO LISTRADO DEVEM PARECER IGUAIS A DISTANCIA',gx,gy+gh+py(8),12); label('RAMPA 0-100% E DEGRADE: PROCURE FAIXAS E CORTES NO PRETO',px(10),K.h*.66+py(0),12);
}
else if(card==='barras'){
  const cols=K.alpha?[255,220,190,160,125,90,55]:null, rgb=['#ffffff','#ffff00','#00ffff','#00ff00','#ff00ff','#ff0000','#0000ff'];
  for(let i=0;i<7;i++){ c.fillStyle=cols?grey(cols[i]):rgb[i]; c.fillRect(i*K.w/7,0,K.w/7+1,K.h*.66); }
  c.fillStyle='#000'; c.fillRect(0,K.h*.66,K.w/2,K.h*.34); c.fillStyle='#fff'; c.fillRect(K.w/2,K.h*.66,K.w/2,K.h*.34);
  c.fillStyle='#fff'; label('PRETO TOTAL',px(12),K.h*.66+py(10),14); c.fillStyle='#000'; label('BRANCO TOTAL (CORTE NO PROCESSADOR?)',K.w/2+px(12),K.h*.66+py(10),14);
}
else if(card==='moldura'){
  for(const f of [.05,.1]){ const m=Math.min(K.w,K.h)*f; c.setLineDash(f<.06?[]:[px(10),px(8)]); c.strokeStyle=ink; c.lineWidth=px(2); c.strokeRect(m,m,K.w-2*m,K.h-2*m); label(Math.round(f*100)+'% DO LADO CURTO',m+px(6),m+py(6),12); }
  c.setLineDash([]); c.strokeStyle=acc; line(K.w/2,0,K.w/2,K.h,px(2)); line(0,K.h/2,K.w,K.h/2,py(2)); line(0,0,K.w,K.h,px(1)); line(K.w,0,0,K.h,px(1));
  c.strokeStyle=ink; c.lineWidth=px(3); c.beginPath(); c.arc(K.w/2,K.h/2,Math.min(K.w,K.h)*.4,0,K.TAU); c.stroke();
  c.fillStyle=ink; label(`${K.pw} x ${K.ph} PX · ${K.t.fps} FPS · ${(K.pw/K.ph).toFixed(3)}:1`,K.w/2-px(150),K.h/2+py(8),16);
  for(const [x,y] of [[0,0],[1,0],[0,1],[1,1]]){ const X=x?K.w:0, Y=y?K.h:0, sx=x?-1:1, sy=y?-1:1; line(X,Y+sy*py(2),X+sx*px(40),Y+sy*py(2),px(3)); line(X+sx*px(2),Y,X+sx*px(2),Y+sy*py(40),px(3)); }
}
else if(card==='movimento'){
  const w=K.w*.06, x=((K.t.barT%1)*(K.w+w))-w;
  c.fillStyle=ink; c.fillRect(x,K.h*.15,w,K.h*.3);
  const y=((K.t.barT*2)%1)*K.h; c.fillRect(K.w*.2,y,K.w*.6,py(6));
  c.globalAlpha=.5; for(let i=0;i<40;i++){ c.fillRect(i*K.w/40,K.h*.55,K.w/80,K.h*.3); } c.globalAlpha=1;
  c.fillStyle=ink; label('BARRA EM MOVIMENTO CONSTANTE: PROCURE JUDDER, TEARING E LINHAS PARTIDAS',px(12),K.h*.9,13);
}
else {
  const n=Math.max(2,Math.round(K.v.blendN)), ov=Math.max(1,K.v.blendPx), L=(K.pw+(n-1)*ov)/n;
  for(let i=0;i<n;i++){ const s=i*(L-ov)*ux, e=s+L*ux; c.globalAlpha=.1; c.fillRect(s,0,e-s,K.h); c.globalAlpha=1; c.strokeStyle=ink; c.lineWidth=px(2); c.strokeRect(s+px(1),py(1),e-s-px(2),K.h-py(2)); c.fillStyle=ink; label('PROJETOR '+(i+1),s+px(10),py(50),16); }
  for(let i=1;i<n;i++){ const s=i*(L-ov)*ux, zw=ov*ux; c.fillStyle=acc; c.globalAlpha=.35; c.fillRect(s,0,zw,K.h); c.globalAlpha=1; c.strokeStyle=acc; c.setLineDash([px(8),px(6)]); line(s,0,s,K.h,px(2)); line(s+zw,0,s+zw,K.h,px(2)); c.setLineDash([]); c.fillStyle=ink; label('ZONA DE BLEND '+ov+' PX',s+px(8),K.h*.5,13); }
  c.fillStyle=ink; label('NADA IMPORTANTE NA ZONA DE BLEND NEM NAS BORDAS EXTERNAS',px(12),K.h-py(30),12);
}
c.globalAlpha=1; c.fillStyle=ink; c.fillRect(0,0,K.w,py(18)); c.fillStyle=K.bg; label(`TESTE · ${card.toUpperCase()} · ${K.pw}×${K.ph} PX`,px(8),py(3),12);
