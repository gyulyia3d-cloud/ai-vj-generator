from lib import LIB, DIO
A = LIB + r'''
void main(){
  vec2 P=FP(); float ph=uPh; portals(P); float dm=gdm; vec3 z=zones(P);
  float env=smoothstep(0.,.07,ph)*(1.-smoothstep(.93,1.,ph));
  float g=smoothstep(.04,.52,ph)*(1.-smoothstep(.72,.97,ph));
  float dist=length((P-vec2(958.,1500.))*vec2(1.,1.2)); float front=g*3300.;
  float inside=1.-smoothstep(front-160.,front,dist);
  float edgeF=exp(-abs(dist-front)/14.)*step(.02,g);
  vec2 q=P*.0062; float w1=fbm(q*1.3+uSeed); vec2 qq=q+vec2(w1,fbm(q+3.1))*1.5+vec2(sin(ph*TAU),cos(ph*TAU))*.3;
  float vein=1.-smoothstep(0.,.04+.02*uBass,abs(fbm(qq*1.7)-.5)); float vein2=1.-smoothstep(0.,.012,abs(fbm(qq*3.6+9.)-.5));
  vec2 lg=P/36.; vec2 lid=floor(lg); vec2 lf=fract(lg)-.5; float lr=hash(lid+uSeed); lf=vjRot(lr*6.283)*lf;
  float leaf=smoothstep(.07,-.03,length(lf*vec2(1.,2.6))-.34)*step(.5,hash(lid*1.3+5.))*smoothstep(.1,.5,vein+fbm(qq*2.)*.5);
  vec3 lime=uC1, orch=uC2, deep=uBg;
  vec3 col=deep*(.5+.5*fbm(P*.005+ph*1.))*inside;
  col+=mix(deep*2.,lime,.55+.45*sin(P.y*.01+ph*TAU))*vein*inside*(.75+.5*uMid);
  col+=orch*vein2*inside*.5*(.5+uHigh); col+=mix(lime,vec3(.8,1.,.5),hash(lid))*leaf*inside*.8; float flo=step(.9,hash(lid*2.7+2.))*smoothstep(.22,.0,length(lf))*smoothstep(.2,.6,vein+leaf); col+=mix(orch,vec3(1.,.75,.1),hash(lid+1.))*flo*inside*1.3;
  float cu=colU(P); float cyl=.25+.75*sqrt(max(1.-cu*cu,0.)); 
  float liana=lw(cu*1.6+.28*sin(P.y*.017-ph*TAU*2.+cu*2.),.07); 
  col=mix(col,deep*cyl*.8,z.x*.8*inside)+z.x*(lime*liana*cyl*inside*.9+lime*.07*cyl*cyl*inside*fbm(vec2(cu*3.,P.y*.01+ph*TAU))+orch*step(.985,hash(floor(P/14.)+floor(ph*20.)+uSeed))*inside);
  float rs=min(length(P-vec2(299.,482.)),length(P-vec2(1607.,469.)));
  col+=orch*lw(rs/19.-ph*5.,.07)*z.y*inside*(.4+.8*uBass)*exp(-rs/420.);
  col+=lime*smoothstep(3.,1.,length(mod(P,26.)-13.))*z.y*inside*.35*(1.-z.x);
  col+=lime*lw(P.x/9.,.14)*z.z*inside*.7*(.5+.6*uMid);
  col+=mix(lime,vec3(1.),.5)*exp(-abs(dm)/5.)*inside*(.5+.9*uHit);
  col+=mix(lime,vec3(1.),.4)*edgeF*.7*(.6+uHit);
  col*=smoothstep(-2.,2.,dm); col*=env*(.88+.22*uRms); gl_FragColor=outc(col,1.); }
'''
B = LIB + DIO + r'''
void main(){
  vec2 P=FP(); portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid; vec2 c=(rc.xy+rc.zw)*.5; vec2 hs=(rc.zw-rc.xy)*.5; vec2 q=(P-c)/hs.x; float ph=uPh;
  float g=smoothstep(.04,.52,ph)*(1.-smoothstep(.72,.97,ph)); float dc=length((c-vec2(958.,1500.))*vec2(1.,1.2)); float open=clamp((g*3300.-dc)/260.,0.,1.);
  float R=open*(2.6+hs.y/hs.x); float ir=1.-smoothstep(R-.3,R,length(q));
  float t=ph*TAU; vec2 cam=vec2(sin(t+pid),.5*cos(t+pid*1.7))*.22; vec3 col=dioAmazon(q,cam,t,pid+uSeed);
  col*=(.85+.4*uRms+.5*uBass*exp(-length(q)));
  col+=vec3(.9,1.,.4)*uHigh*step(.97,hash(floor(q*14.)+floor(ph*30.)))*.6;
  float inner=smoothstep(0.,22.,-dm); col*=.35+.65*inner;
  if(pid>29.){ vec2 e=P-c; float r=length(e)/hs.x; float irisM=smoothstep(.98,.9,r); vec3 ic=mix(uC2,vec3(1.,.8,.2),smoothstep(.2,.9,r)); 
    float slit=smoothstep(.2,.1,abs(e.x/hs.x)*(1.+2.*abs(e.y/hs.x))*1.0+.0); float bl=1.-smoothstep(.0,.12,abs(fract(ph*4.)-.5)-.40);
    col=ic*irisM*(.6+.5*uBass)*(1.-slit*.97)*(1.-bl*.9)+vec3(.0,.05,.0)*irisM; col+=vec3(1.)*smoothstep(.12,.0,length(e-vec2(-.25,-.25)*hs.x))*.9*(1.-bl); }
  float al=mkk(dm+1.,1.5)*ir; gl_FragColor=outc(col,al); }
'''
