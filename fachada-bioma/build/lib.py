# Biblioteca GLSL da fachada: geometria analítica extraída da segmentação (coordenadas em px do canvas 1920x1520)
PORTALS = [
 # tipo, x0,y0,x1,y1
 ('r',254,650,394,858),('r',254,1112,392,1306),('r',1512,650,1662,858),('r',1510,1118,1662,1334),
 ('r',873,652,1022,858),('a',624,656,766,857),('a',1130,656,1272,858),('r',534,657,678,857),('r',1230,657,1362,858),
 ('r',621,1097,767,1320),('r',871,1097,1015,1420),('r',1127,1097,1273,1320),
 ('f',603,1030,787,1095),('f',853,1030,1037,1095),('f',1109,1030,1297,1095),
]
for cx in (521,568,614,660,707,758,1143,1190,1237,1284,1331,1378):
    PORTALS.append(('a',cx-11,366,cx+11,414))
PORTALS += [('r',813,369,835,400),('r',1069,369,1091,400),('c',245,428,353,536),('c',1553,415,1661,523)]

def portal_code():
    L=['float gdm; vec4 grc; float gpid;','void portals(vec2 P){ float dm=1e5; vec4 rc=vec4(0.); float pid=0.; float d;']
    for i,(t,x0,y0,x1,y1) in enumerate(PORTALS):
        r='vec4(%d.,%d.,%d.,%d.)'%(x0,y0,x1,y1)
        fn={'r':'bx','a':'ar','f':'fa','c':'ci'}[t]
        L.append(' d=%s(P,%s); if(d<dm){dm=d;rc=%s;pid=%d.;}'%(fn,r,r,i+1))
    L.append(' gdm=dm; grc=rc; gpid=pid; }')
    return '\n'.join(L)

LIB = r'''
#define PI 3.14159265
vec2 FP(){ return vec2(gl_FragCoord.x/uRes.x*1920., (1.-gl_FragCoord.y/uRes.y)*1520.); }
float bx(vec2 P,vec4 r){ vec2 c=(r.xy+r.zw)*.5,h=(r.zw-r.xy)*.5,d=abs(P-c)-h; return length(max(d,0.))+min(max(d.x,d.y),0.); }
float ar(vec2 P,vec4 r){ float rd=(r.z-r.x)*.5; return min(bx(P,vec4(r.x,r.y+rd,r.z,r.w)),length(P-vec2((r.x+r.z)*.5,r.y+rd))-rd); }
float fa(vec2 P,vec4 r){ vec2 c=vec2((r.x+r.z)*.5,r.w); float rx=(r.z-r.x)*.5, ry=r.w-r.y; float e=(length((P-c)/vec2(rx,ry))-1.)*min(rx,ry); return max(e,P.y-r.w); }
float ci(vec2 P,vec4 r){ return length(P-(r.xy+r.zw)*.5)-(r.z-r.x)*.5; }
float mkk(float d,float w){ return smoothstep(w,-w,d); }
float h11(float n){ return fract(sin(n*127.1)*43758.5453); }
float lw(float x,float w){ float f=fract(x); return 1.-smoothstep(0.,w,min(f,1.-f)); }
PORTAL_CODE
float gCol(vec2 P){ float d=bx(P,vec4(77.,587.,139.,1485.)); d=min(d,bx(P,vec4(117.,587.,213.,1485.))); d=min(d,bx(P,vec4(389.,587.,492.,1485.)));
  d=min(d,bx(P,vec4(1403.,580.,1505.,1485.))); d=min(d,bx(P,vec4(1691.,580.,1795.,1485.))); d=min(d,bx(P,vec4(1776.,604.,1853.,1485.))); return d; }
float colU(vec2 P){ float u=0.; float best=1e5; 
  float x0=77.,x1=139.; float d=bx(P,vec4(77.,587.,139.,1485.)); if(d<best){best=d;u=(P.x-108.)/31.;}
  d=bx(P,vec4(117.,587.,213.,1485.)); if(d<best){best=d;u=(P.x-165.)/48.;}
  d=bx(P,vec4(389.,587.,492.,1485.)); if(d<best){best=d;u=(P.x-440.)/51.;}
  d=bx(P,vec4(1403.,580.,1505.,1485.)); if(d<best){best=d;u=(P.x-1454.)/51.;}
  d=bx(P,vec4(1691.,580.,1795.,1485.)); if(d<best){best=d;u=(P.x-1743.)/52.;}
  d=bx(P,vec4(1776.,604.,1853.,1485.)); if(d<best){best=d;u=(P.x-1814.)/38.;}
  return clamp(u,-1.,1.); }
float gBalu(vec2 P){ return min(bx(P,vec4(249.,869.,392.,958.)),bx(P,vec4(1514.,869.,1662.,958.))); }
float gStair(vec2 P){ return bx(P,vec4(720.,1383.,1165.,1515.)); }
float gTow(vec2 P){ float a=abs(P.x-950.)-450.; return max(P.y-600.,-a); }
float gCrown(vec2 P){ float a=abs(P.x-950.)-450.; return max(P.y-602.,a); }
vec3 zones(vec2 P){ // x: colunas, y: torres+coroa, z: balaustres  (0..1)
  return vec3(mkk(gCol(P),3.), max(mkk(gTow(P),4.),mkk(gCrown(P),4.)), max(mkk(gBalu(P),2.),mkk(gStair(P),3.))); }
'''.replace('PORTAL_CODE',portal_code())

DIO = r'''
float leafLayer(vec2 uv,float sd){ vec2 g=uv; vec2 id0=floor(g-.5); float cov=0.;
  for(int j=0;j<=1;j++){ for(int i=0;i<=1;i++){ vec2 id=id0+vec2(float(i),float(j)); float r=hash(id+sd); vec2 ce=id+.5+(vec2(hash(id+sd+9.),hash(id+sd+21.))-.5)*.4;
    vec2 f=vjRot(r*6.2832)*(g-ce); float k=smoothstep(.06,-.06,length(f*vec2(1.,2.6))-.5)*step(.2,hash(id*1.7+sd+3.)); cov=max(cov,k); } }
  return cov; }
vec3 dioAmazon(vec2 q,vec2 cam,float t,float sd){
  vec3 col=mix(vec3(.03,.24,.12),vec3(.62,1.,.28),smoothstep(1.4,-1.8,q.y)*.6);
  vec2 s=q-vec2(.15+cam.x*.5,-1.9); float ang=atan(s.x,s.y);
  float rays=pow(.5+.5*sin(ang*16.+sd*7.+sin(t)*.8),3.)*smoothstep(3.4,.2,length(s));
  col+=vec3(1.,.95,.4)*rays*.55;
  for(int i=0;i<4;i++){ float fi=float(i); float sc=1.7-fi*.3; vec2 uv=q*sc+cam*(.4+fi*.7)+vec2(sd*13.,fi*5.); float k=leafLayer(uv,fi*19.+sd);
    vec3 lc=mix(vec3(.10,.62,.28),vec3(.0,.05,.03),fi/3.)+vec3(.45,1.,.25)*pow(1.-fi/3.,2.)*.5*(.4+.6*hash(floor(uv)+fi));
    col=mix(col,lc,k*(.6+fi*.1));
    vec2 fg=uv*2.; vec2 fi2=floor(fg); float fl=smoothstep(.2,.0,length(fract(fg)-.5))*step(.93,hash(fi2*2.7+fi+sd)); col=mix(col,mix(vec3(1.,.15,.55),vec3(1.,.7,.1),hash(fi2)),fl*.9*step(fi,2.5)); }
  vec2 fq=q*3.+vec2(cam.x*2.,t*.5); vec2 fid=floor(fq); vec2 fo=vec2(hash(fid)-.5,hash(fid+7.)-.5)*.5; float fl=smoothstep(.12,0.,length(fract(fq)-.5-fo*sin(t+hash(fid)*6.)));
  col+=vec3(.9,1.,.4)*fl*(.5+.5*sin(t*2.+hash(fid)*9.)); return col; }
vec3 dioPantanal(vec2 q,vec2 cam,float t,float sd){
  float hz=.05+cam.y*.15; vec3 col;
  if(q.y<hz){ float u=smoothstep(hz,-1.8,q.y); col=mix(vec3(1.,.62,.28),vec3(.10,.28,.85),u); col=mix(col,vec3(1.,.25,.5),smoothstep(.0,.6,u)*(1.-smoothstep(.6,1.,u))*.5);
    float sd2=length(q-vec2(cam.x*.4,hz-.14)); col+=vec3(1.,.85,.4)*(smoothstep(.2,.17,sd2)+.35*smoothstep(.9,0.,sd2)); }
  else { float dd=q.y-hz; vec2 rq=vec2(q.x+.05*sin(dd*34.+t)*dd,hz-dd); float u=smoothstep(hz,-1.8,rq.y); col=mix(vec3(.9,.45,.25),vec3(.06,.22,.7),u);
    col=mix(col,vec3(.0,.35,.45),.35+.4*smoothstep(0.,1.2,dd)); float g=pow(.5+.5*sin(q.x*60.+dd*40.-t*2.),6.)*exp(-abs(q.x-cam.x*.4)*4.)*exp(-dd*1.5); col+=vec3(1.,.9,.5)*g*.6;
    vec2 lg=vec2(q.x*4.+sd*5.,dd*9.); vec2 li=floor(lg); float lp=smoothstep(.3,.26,length((fract(lg)-.5)*vec2(1.,2.2))); col=mix(col,vec3(.1,.6,.2),lp*step(.55,hash(li+sd))*smoothstep(.1,.5,dd)); }
  float bl=lw(q.x*7.+sd+sin(q.y*3.+t+q.x)*.1,.1); float bh=.55+.35*hash(vec2(floor(q.x*7.+sd),2.)); col=mix(col,vec3(.02,.14,.06),bl*step(q.y,2.)*step(bh*1.0+.35,q.y+.55)*smoothstep(.2,1.,q.y+.3));
  return col; }
float hills(float x,float s,float a){ return a*(noise(vec2(x*1.7+s,s))-.5); }
vec3 dioCerrado(vec2 q,vec2 cam,float t,float sd){
  float hz=.15; vec3 col=mix(vec3(1.,.82,.25),vec3(.75,.10,.40),smoothstep(hz,-1.8,q.y)); float sd2=length(q-vec2(cam.x*.3,hz-.22));
  col+=vec3(1.,.55,.15)*(smoothstep(.33,.30,sd2)*.9+.4*smoothstep(1.2,0.,sd2));
  for(int i=0;i<4;i++){ float fi=float(i); float y=hz+.05+fi*.28+hills(q.x+cam.x*(.2+fi*.3),fi*3.+sd,.5); vec3 hc=mix(vec3(.65,.2,.25),vec3(.12,.02,.10),fi/3.); col=mix(col,hc,smoothstep(.01,-.01,y-q.y)); }
  float gr=lw(q.x*14.+sd+sin(q.y*2.+t+q.x*3.)*.15,.12); col=mix(col,vec3(1.,.7,.1),gr*smoothstep(.6,1.4,q.y)*.8);
  return col; }
vec3 dioCaatinga(vec2 q,vec2 cam,float t,float sd){
  float hz=.35; vec3 col=mix(vec3(1.,.45,.2),vec3(.35,.05,.55),smoothstep(hz,-1.6,q.y)); float sd2=length(q-vec2(-cam.x*.3+.2,hz-.3)); col+=vec3(1.,.8,.3)*smoothstep(.2,.17,sd2);
  if(q.y>hz){ vec2 g=vec2(q.x*3.,(q.y-hz)*3.+cam.y); vec2 id=floor(g); float c=lw(g.x+hash(id)*.3,.05)+lw(g.y+hash(id+3.)*.3,.05); col=mix(vec3(.55,.22,.1),vec3(.2,.05,.05),smoothstep(hz,1.6,q.y)); col+=vec3(1.,.4,.1)*clamp(c,0.,1.)*.35; }
  for(int i=0;i<3;i++){ float fi=float(i); float cx=(fi-1.)*.7+cam.x*(.4+fi*.2)+sd*.3; float w=.07+.03*fi; vec2 p=q-vec2(cx,hz+.05+fi*.1);
    float body=length(vec2(max(abs(p.x)-w,0.),max(-p.y-(.5+fi*.1),0.)+max(p.y,0.)))-w*.1; float arm=length(vec2(p.x-.2*sign(sin(fi*5.+sd)),max(abs(p.y+.3)-.12,0.)))-w*.8; col=mix(col,vec3(.04,.18,.10),smoothstep(.015,-.01,min(body,arm))); }
  return col; }
vec3 dioMata(vec2 q,vec2 cam,float t,float sd){
  vec3 col=mix(vec3(.05,.45,.55),vec3(1.,.55,.50),smoothstep(-1.5,.8,q.y)); 
  for(int i=0;i<5;i++){ float fi=float(i); float y=-.55+fi*.32+hills(q.x+cam.x*(.15+fi*.25),fi*4.+sd,.6); vec3 rc=mix(vec3(.50,.85,.85),vec3(.02,.20,.18),fi/4.); float k=smoothstep(.015,-.015,y-q.y); col=mix(col,rc,k); col=mix(col,vec3(.95,.80,.85),smoothstep(.0,.6,q.y-y+.1)*smoothstep(.7,.0,q.y-y+.1)*.25*(1.-k)); }
  vec2 rq=vec2(q.x*9.+q.y*2.,q.y*3.-t*3.); col+=vec3(.7,.95,1.)*step(.93,hash(floor(rq)+sd))*.35; return col; }
vec3 dio(float k,vec2 q,vec2 cam,float t,float sd){ k=mod(k,5.); if(k<1.) return dioAmazon(q,cam,t,sd); if(k<2.) return dioPantanal(q,cam,t,sd); if(k<3.) return dioCerrado(q,cam,t,sd); if(k<4.) return dioCaatinga(q,cam,t,sd); return dioMata(q,cam,t,sd); }

'''

VOR = r'''
vec4 vor(vec2 p){ vec2 n=floor(p), f=fract(p); float d1=8., d2=8.; vec2 cid=vec2(0.), rb=vec2(0.);
  for(int j=-1;j<=1;j++){ for(int i=-1;i<=1;i++){ vec2 g=vec2(float(i),float(j)); vec2 o=vec2(hash(n+g+uSeed),hash(n+g+vec2(37.,17.))); vec2 r=g+o-f; float d=dot(r,r);
    if(d<d1){ d2=d1; d1=d; cid=n+g; rb=r; } else if(d<d2){ d2=d; } } }
  return vec4(rb,sqrt(d2)-sqrt(d1),hash(cid)); }
'''
