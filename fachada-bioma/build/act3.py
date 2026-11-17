from lib import LIB, DIO
WL = "float wlv(vec2 P,float ph){ float rise=smoothstep(.06,.46,ph)*(1.-smoothstep(.62,.92,ph)); return mix(1580.,640.,rise)+11.*sin(P.x*.021+ph*TAU*3.)+6.*sin(P.x*.057-ph*TAU*5.)*(1.-.4*rise); }\n"
A = LIB + WL + r'''
void main(){
  vec2 P=FP(); float ph=uPh; portals(P); float dm=gdm; vec3 z=zones(P);
  float env=smoothstep(0.,.06,ph)*(1.-smoothstep(.94,1.,ph));
  float rise=smoothstep(.06,.46,ph)*(1.-smoothstep(.62,.92,ph));
  float wl=wlv(P,ph); float under=smoothstep(wl-2.,wl+2.,P.y); float depth=clamp((P.y-wl)/700.,0.,1.);
  float yy=P.y/1520.; vec3 sky=mix(vec3(.06,.14,.55),vec3(1.,.38,.40),smoothstep(.05,.75,yy)); sky=mix(sky,vec3(1.,.85,.35),smoothstep(.55,1.,yy)*.75);
  float cl=fbm(vec2(P.x*.004+sin(ph*TAU)*.5,P.y*.009+uSeed)); sky*=(.30+.7*cl)*(.45+.25*uMid)*rise*1.5;
  vec3 wcol=mix(uC1*.30,uBg,depth*.85);
  float c1=sin(P.x*.03+sin(P.y*.04+ph*TAU*2.)*2.)*sin(P.y*.028+sin(P.x*.05-ph*TAU*3.)*2.); float ca=pow(1.-abs(c1),7.);
  wcol+=mix(uC1,vec3(1.),.4)*ca*.7*(1.-depth*.6)+vec3(.8,1.,1.)*ca*uHigh*.6;
  vec2 bg=vec2(P.x/22.,P.y/22.+ph*TAU*3.); vec2 bi=floor(bg); wcol+=vec3(.7,1.,1.)*smoothstep(.2,.0,length(fract(bg)-.5-(vec2(hash(bi),hash(bi+4.))-.5)*.5))*step(.82,hash(bi+uSeed))*.7;
  vec3 col=mix(sky,wcol,under)*step(.001,rise);
  col+=mix(uC1,vec3(1.),.7)*exp(-abs(P.y-wl)/3.)*step(.01,rise)*(.8+uHit);
  float sw=sin(ph*TAU*2.+P.x*.02); float cell=floor(P.x/9.); float hb=(50.+300.*hash(vec2(cell,uSeed)))*smoothstep(.04,.3,ph)*(1.-smoothstep(.9,.99,ph));
  float by=1520.-P.y; float taper=1.-by/max(hb,1.); float blade=step(by,hb)*step(abs(fract(P.x/9.+sw*.0004*by)-.5),.30*taper+.02);
  col+=mix(vec3(.1,.7,.25),vec3(.9,.95,.3),by/max(hb,1.))*blade*.8;
  float beatF=ph*64.; float bI=floor(beatF);
  for(int k=0;k<3;k++){ float bi2=bI-float(k); vec2 dp=vec2(hash(vec2(bi2,uSeed))*1920.,min(wl+60.+hash(vec2(bi2,5.))*400.,1500.)); float age=beatF-bi2; float rr=age*95.;
    col+=vec3(.9,1.,1.)*exp(-abs(length((P-dp)*vec2(1.,2.4))-rr)/3.)*(1.-age/3.)*step(age,3.)*under*.7; }
  float cu=colU(P); float cyl=.3+.7*sqrt(max(1.-cu*cu,0.));
  col=mix(col,col*cyl,z.x);
  col+=uC1*lw(P.y/8.+cu*.5,.1)*z.x*under*.5*(.5+uMid);
  float rs=min(length(P-vec2(299.,482.)),length(P-vec2(1607.,469.)));
  col+=vec3(1.,.8,.35)*exp(-rs/150.)*z.y*rise*(.5+.8*uBass)+uC2*lw(rs/18.-ph*5.,.07)*z.y*rise*exp(-rs/360.)*.6;
  col+=uC2*lw(P.x/8.,.16)*z.z*rise*.6*(.5+uMid);
  col+=mix(uC1,vec3(1.),.5)*exp(-abs(dm)/5.)*rise*(.5+.9*uHit);
  col*=smoothstep(-2.,2.,dm); col*=env*(.9+.2*uRms); gl_FragColor=outc(col,1.); }
'''
B = LIB + DIO + WL + r'''
void main(){
  vec2 P=FP(); portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid; vec2 c=(rc.xy+rc.zw)*.5; vec2 hs=(rc.zw-rc.xy)*.5; vec2 q=(P-c)/hs.x; float ph=uPh;
  float open=clamp((ph-.08-.2*hash(vec2(pid,3.+uSeed)))/.12,0.,1.)*(1.-smoothstep(.86,.95,ph));
  float R=open*(2.6+hs.y/hs.x); float ir=1.-smoothstep(R-.3,R,length(q));
  float t=ph*TAU; vec2 cam=vec2(sin(t+pid),.4*cos(t+pid*1.7))*.25; vec3 col=dioPantanal(q,cam,t,pid+uSeed);
  float wl=wlv(P,ph); col=mix(col,vec3(.0,.35,.5)*(.4+.6*exp(-(P.y-wl)*.004)),smoothstep(wl-2.,wl+2.,P.y)*.7);
  col*=(.85+.4*uRms+.4*uBass*exp(-length(q))); col+=vec3(1.,.9,.5)*uHigh*step(.97,hash(floor(q*16.)+floor(ph*30.)))*.5;
  float inner=smoothstep(0.,22.,-dm); col*=.4+.6*inner;
  if(pid>29.){ vec2 e=P-c; float r=length(e)/hs.x; float sun=smoothstep(.95,.7,r); col=mix(vec3(.05,.1,.3),mix(vec3(1.,.4,.2),vec3(1.,.95,.6),smoothstep(.9,.0,r)),sun)*(.7+.6*uBass);
    col+=vec3(1.,.8,.4)*pow(.5+.5*sin(atan(e.y,e.x)*10.+ph*TAU*2.),4.)*smoothstep(1.,.2,r)*.5*sun; }
  float al=mkk(dm+1.,1.5)*ir; gl_FragColor=outc(col,al); }
'''
