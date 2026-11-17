from lib import LIB, DIO, VOR
A = LIB + VOR + r'''
void main(){
  vec2 P=FP(); float ph=uPh; portals(P); float dm=gdm; vec3 z=zones(P);
  float env=smoothstep(0.,.06,ph)*(1.-smoothstep(.94,1.,ph));
  float heat=smoothstep(.04,.30,ph)*(1.-smoothstep(.45,.58,ph)); float melt=smoothstep(.34,.62,ph)*(1.-smoothstep(.70,.80,ph)); float bl=smoothstep(.56,.80,ph)*(1.-smoothstep(.90,.98,ph));
  vec4 v=vor(P/74.); float crack=1.-smoothstep(0.,.07,v.z);
  vec3 tile=mix(vec3(.50,.18,.05),vec3(.16,.04,.03),v.w)*(.55+.45*noise(P*.02+uSeed));
  float heatH=heat*1750.; float lavaM=smoothstep(1520.-heatH-140.,1520.-heatH,P.y)*step(.003,heat);
  float vis=clamp(lavaM+(1.-lavaM)*smoothstep(.34,.5,ph)*(1.-smoothstep(.9,.98,ph)),0.,1.);
  vec3 col=tile*vis*(.55+.35*uMid);
  col+=mix(uC1,vec3(1.,.9,.3),crack)*crack*(heat*1.3+.35*bl+.2)*(.75+.7*uBass)*vis;
  for(int i=0;i<5;i++){ float Y=430.+float(i)*0.; if(i==1) Y=602.; if(i==2) Y=862.; if(i==3) Y=963.; if(i==4) Y=1000.;
    float cell=floor(P.x/11.); float hh=hash(vec2(cell,Y+uSeed)); float len=melt*(40.+300.*hh)*step(.5,hash(vec2(cell,Y+9.))); float dy=P.y-Y; float fx=(fract(P.x/11.)-.5)*11.;
    float in1=step(0.,dy)*step(dy,len)*(1.-smoothstep(3.2,4.6,abs(fx))); float tip=smoothstep(7.,4.,length(vec2(fx,dy-len)))*step(.5,melt);
    float dr=max(in1,tip); col+=mix(vec3(.95,.2,.05),vec3(1.,.9,.35),dy/max(len,1.))*dr*1.3; }
  float rr=length(v.xy*74.); float a=atan(v.y,v.x); float rad=(12.+14.*v.w)*bl*step(.45,hash(vec2(v.w*91.,3.)));
  float pe=rad*(.5+.5*abs(cos(2.5*a+v.w*6.)));
  float fl=1.-smoothstep(pe-1.5,pe+1.5,rr);
  col=mix(col,mix(uC2,vec3(1.,.82,.1),step(.5,hash(vec2(v.w*13.,7.)))),fl); col+=vec3(1.,.5,.1)*(1.-smoothstep(0.,3.,rr))*bl*step(.45,hash(vec2(v.w*91.,3.)));
  float cu=colU(P); float cyl=.3+.7*sqrt(max(1.-cu*cu,0.)); float stk=fbm(vec2(cu*2.5,P.y*.004)+uSeed);
  col=mix(col,col*cyl+mix(vec3(.8,.15,.03),vec3(1.,.7,.15),stk)*stk*.6*vis*(heat+melt),z.x);
  float rs=min(length(P-vec2(299.,482.)),length(P-vec2(1607.,469.)));
  col+=vec3(1.,.55,.15)*exp(-rs/160.)*z.y*(heat+.3*bl)*(.6+.8*uBass)+uC1*lw(rs/18.-ph*5.,.07)*z.y*vis*exp(-rs/360.)*.6;
  col+=uC2*lw(P.x/8.,.16)*z.z*bl*.7*(.5+uMid); col+=uC1*step(.985,hash(floor(P/9.)+floor(ph*40.)+uSeed))*uHigh*vis;
  col+=mix(uC1,vec3(1.),.4)*exp(-abs(dm)/5.)*vis*(.5+.9*uHit);
  col*=smoothstep(-2.,2.,dm); col*=env*(.9+.2*uRms); gl_FragColor=outc(col,1.); }
'''
B = LIB + DIO + r'''
void main(){
  vec2 P=FP(); portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid; vec2 c=(rc.xy+rc.zw)*.5; vec2 hs=(rc.zw-rc.xy)*.5; vec2 q=(P-c)/hs.x; float ph=uPh;
  float open=clamp((ph-.30-.16*hash(vec2(pid,3.+uSeed)))/.12,0.,1.)*(1.-smoothstep(.86,.95,ph));
  float R=open*(2.6+hs.y/hs.x); float ir=1.-smoothstep(R-.3,R,length(q));
  float t=ph*TAU; vec2 cam=vec2(sin(t+pid),.4*cos(t+pid*1.7))*.25; q.x+=.03*sin(q.y*18.+t*3.);
  vec3 col=(mod(pid,2.)<1.)?dioCerrado(q,cam,t,pid+uSeed):dioCaatinga(q,cam,t,pid+uSeed);
  col*=(.85+.4*uRms+.4*uBass*exp(-length(q))); col+=vec3(1.,.8,.3)*uHigh*step(.97,hash(floor(q*16.)+floor(ph*30.)))*.5;
  float inner=smoothstep(0.,22.,-dm); col*=.4+.6*inner;
  if(pid>29.){ vec2 e=P-c; float r=length(e)/hs.x; float sun=smoothstep(.95,.8,r); float flick=.8+.2*sin(ph*TAU*12.+pid);
    col=mix(vec3(.05,.0,.0),mix(vec3(1.,.15,.05),vec3(1.,.85,.2),smoothstep(.9,.1,r)),sun)*flick*(.7+.6*uBass); col*=1.-smoothstep(.25,.18,r)*.9; }
  float al=mkk(dm+1.,1.5)*ir; gl_FragColor=outc(col,al); }
'''
