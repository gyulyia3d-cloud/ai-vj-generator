from lib import LIB, DIO
A = LIB + r'''
void main(){
  vec2 P=FP(); float ph=uPh; portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid; vec3 z=zones(P);
  float env=smoothstep(0.,.08,ph)*(1.-smoothstep(.88,1.,ph));
  float sy=mix(-120.,1700.,smoothstep(.06,.74,ph));
  float reach=1.-smoothstep(sy-30.,sy,P.y);
  float trail=exp(-(sy-P.y)/420.)*step(P.y,sy);
  vec3 col=vec3(0.);
  float iso=lw(dm/24.-ph*8.,.05+.025*uBass)*exp(-max(dm,0.)/230.)*step(0.,dm);
  col+=uC1*iso*(.55+.5*trail)*reach;
  float tick=lw(P.y/20.,.05)*(.3+.7*lw(P.y/100.,.05)); col+=uC1*tick*z.x*reach*(.45+.4*uMid);
  float dots=smoothstep(2.4,1.0,length(mod(P,24.)-12.)); col+=uC1*dots*.28*reach*(1.-z.x);
  float rs=min(length(P-vec2(299.,482.)),length(P-vec2(1607.,469.)));
  col+=mix(uC1,vec3(1.),.4)*lw(rs/17.-ph*8.,.06)*reach*z.y*(.5+.6*uBass)*exp(-rs/380.);
  float bars=lw(P.x/7.,.18)*step(P.y,mix(960.,880.,.5+.5*sin(floor(P.x/7.)*.8+ph*PI*8.+uMid*3.))); col+=uC2*bars*z.z*reach*.8;
  float edge=exp(-abs(dm)/4.5); col+=mix(uC1,vec3(1.),.55)*edge*reach*(.5+.9*uHit);
  float band=exp(-abs(P.y-sy)/5.)+.35*exp(-abs(P.y-sy)/46.); col+=mix(uC1,vec3(1.),.6+.4*uHit)*band*(1.-step(1700.,sy))*smoothstep(0.,.08,ph);
  col+=uC2*step(.985,hash(floor(P/9.)+floor(ph*40.)+uSeed))*uHigh*reach*.9;
  col*=smoothstep(-2.,2.,dm); col+=uBg*.12*reach*trail*(1.-smoothstep(-2.,2.,dm)*0.);
  col*=env*(.85+.25*uRms); gl_FragColor=outc(col,1.); }
'''
B = LIB + r'''
void main(){
  vec2 P=FP(); portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid;
  vec2 c=(rc.xy+rc.zw)*.5; vec2 hs=(rc.zw-rc.xy)*.5; vec2 qn=(P-c)/hs; float ph=uPh;
  float syy=mix(-120.,1700.,smoothstep(.06,.74,ph)); float open=clamp((syy-c.y)/300.,0.,1.)*(1.-smoothstep(.84,.95,ph));
  float R=open*2.4; float ir=1.-smoothstep(R-.25,R,length(qn));
  float r=max(max(abs(qn.x),abs(qn.y)),.0001); float zz=1./r;
  float rings=lw(zz*1.15-ph*6.,.07); float a=atan(qn.y,qn.x); float rays=lw(a/(PI/8.),.035)*smoothstep(.02,.25,r);
  vec3 col=mix(uBg*1.4,uC1,.3+.7*smoothstep(.0,1.,r))*.12;
  vec3 gc=mix(uC2,uC1,smoothstep(.05,.95,r));
  col+=gc*(rings*.85+rays*.55)*(.6+.5*uMid);
  float nodes=rings*rays; col+=vec3(1.)*nodes*(.3+uHigh*1.4);
  col+=uC2*exp(-r*3.2)*(.35+uBass*.9);
  float inner=smoothstep(0.,26.,-dm); col*=.4+.6*inner;
  if(pid>29.){ vec2 qc=P-c; float ang=atan(qc.y,qc.x); float sw=fract(ang/TAU-ph*3.); float tr=pow(sw,4.)*step(length(qc),hs.x); float rg=lw(length(qc)/(hs.x/4.)-.0,.06);
    col=uBg*.25+uC1*(tr*1.2+rg*.35)+vec3(1.)*smoothstep(.2,0.,length(qc))*(.3+uHit); }
  float al=mkk(dm+1.,1.5)*ir; gl_FragColor=outc(col*(.85+.25*uRms),al); }
'''
