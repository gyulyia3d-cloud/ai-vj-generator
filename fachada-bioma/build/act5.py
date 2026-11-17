from lib import LIB, DIO, VOR
TEX = r'''
vec3 tAmaz(vec2 P,float ph,vec3 lime,vec3 deep){ vec2 q=P*.0062; vec2 qq=q+vec2(fbm(q*1.3+uSeed),fbm(q+3.1))*1.5+vec2(sin(ph*TAU),cos(ph*TAU))*.3;
  float vein=1.-smoothstep(0.,.045+.02*uBass,abs(fbm(qq*1.7)-.5)); return deep*.7+lime*vein*(.8+.4*uMid)+vec3(1.,.2,.6)*(1.-smoothstep(0.,.012,abs(fbm(qq*3.6+9.)-.5)))*.5; }
vec3 tAgua(vec2 P,float ph,vec3 aq){ float c1=sin(P.x*.03+sin(P.y*.04+ph*TAU*2.)*2.)*sin(P.y*.028+sin(P.x*.05-ph*TAU*3.)*2.); float ca=pow(1.-abs(c1),7.);
  return aq*.45+mix(aq,vec3(1.),.4)*ca*1.1; }
vec3 tTerra(vec2 P,float ph,vec3 am){ vec4 v=vor(P/74.); float crack=1.-smoothstep(0.,.07,v.z); vec3 tile=mix(vec3(.50,.18,.05),vec3(.16,.04,.03),v.w);
  return tile*(.6+.4*uMid)+mix(am,vec3(1.,.9,.3),crack)*crack*(.9+.7*uBass); }
vec3 tMata(vec2 P,float ph,vec3 co,vec3 vi){ float n=fbm(vec2(P.x*.003+sin(ph*TAU)*.6,P.y*.012)+uSeed); float band=smoothstep(.45,.55,n); vec3 c=mix(vi*.5,co,band);
  float rain=step(.93,hash(vec2(floor(P.x/6.),floor(P.y/90.+ph*TAU*6.)+uSeed))); return c*.7+vec3(.8,1.,1.)*rain*.4+co*smoothstep(.46,.5,n)*(1.-smoothstep(.5,.55,n))*.8; }
'''
A = LIB + VOR + TEX + r'''
void main(){
  vec2 P=FP(); float ph=uPh; portals(P); float dm=gdm; vec3 z=zones(P);
  float env=smoothstep(0.,.05,ph)*(1.-smoothstep(.90,1.,ph));
  float merge=smoothstep(.38,.66,ph)*(1.-smoothstep(.74,.9,ph)); float flash=smoothstep(.62,.70,ph)*(1.-smoothstep(.70,.8,ph));
  vec2 Pw=P+merge*vec2(fbm(P*.004+ph*3.)-.5,fbm(P*.004+7.))*160.;
  float upper=step(600.,P.y)*step(P.y,985.)*(1.-z.x)*(1.-z.y); float lower=step(985.,P.y)*(1.-z.x)*(1.-z.y);
  float wA=z.y+merge*.2; float wW=z.x+merge*.2; float wT=upper+merge*.2; float wM=lower+merge*.2;
  float ws=max(wA+wW+wT+wM,.001);
  vec3 col=(tAmaz(Pw,ph,vec3(.4,1.,.2),vec3(.0,.12,.05))*wA+tAgua(Pw,ph,vec3(.1,.7,1.))*wW+tTerra(Pw,ph,vec3(1.,.5,.05))*wT+tMata(Pw,ph,vec3(1.,.42,.38),vec3(.5,.25,1.))*wM)/ws;
  float rise=smoothstep(.04,.2,ph); col*=rise;
  float cu=colU(P); col=mix(col,col*(.3+.7*sqrt(max(1.-cu*cu,0.))),z.x);
  vec2 e1=P-vec2(299.,482.), e2=P-vec2(1607.,469.); float rs=min(length(e1),length(e2)); vec2 ee=(length(e1)<length(e2))?e1:e2;
  float ang=atan(ee.y,ee.x); float beams=pow(.5+.5*sin(ang*9.+ph*TAU*3.),6.)*exp(-rs/900.)*flash*(.7+uHit);
  col+=vec3(1.,.95,.85)*beams*1.0+vec3(1.,.9,.7)*exp(-rs/130.)*(flash*1.2+.35*rise)*(.6+.6*uBass);
  col+=mix(uC1,vec3(1.),.5)*exp(-abs(dm)/5.)*rise*(.5+.9*uHit)+uC2*step(.985,hash(floor(P/9.)+floor(ph*40.)+uSeed))*uHigh*rise;
  col+=vec3(1.)*flash*.10*(.4+.6*fbm(P*.01+ph));
  col*=smoothstep(-2.,2.,dm); col*=env*(.9+.2*uRms); gl_FragColor=outc(col,1.); }
'''
B = LIB + DIO + r'''
void main(){
  vec2 P=FP(); portals(P); float dm=gdm; vec4 rc=grc; float pid=gpid; vec2 c=(rc.xy+rc.zw)*.5; vec2 hs=(rc.zw-rc.xy)*.5; vec2 q=(P-c)/hs.x; float ph=uPh;
  float open=clamp((ph-.06-.2*hash(vec2(pid,3.+uSeed)))/.12,0.,1.)*(1.-smoothstep(.86,.95,ph));
  float R=open*(2.6+hs.y/hs.x); float ir=1.-smoothstep(R-.3,R,length(q));
  float t=ph*TAU; vec2 cam=vec2(sin(t+pid),.4*cos(t+pid*1.7))*.25; float k=pid*.7+ph*5.;
  vec3 col=mix(dio(floor(k),q,cam,t,pid+uSeed),dio(floor(k)+1.,q,cam,t,pid+uSeed),smoothstep(.55,.95,fract(k)));
  col*=(.85+.4*uRms+.4*uBass*exp(-length(q))); col+=vec3(1.)*uHigh*step(.97,hash(floor(q*16.)+floor(ph*30.)))*.5;
  float inner=smoothstep(0.,22.,-dm); col*=.4+.6*inner;
  if(pid>29.){ vec2 e=P-c; float r=length(e)/hs.x; float sun=smoothstep(1.,.5,r); float fl=smoothstep(.62,.70,ph)*(1.-smoothstep(.70,.8,ph));
    col=mix(col*.3,vec3(1.,.97,.9),sun*(.35+.65*fl+.2*uBass)); }
  float al=mkk(dm+1.,1.5)*ir; gl_FragColor=outc(col,al); }
'''
