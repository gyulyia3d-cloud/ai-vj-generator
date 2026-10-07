//@module hash
//@doc vjHash22/31/33(x): hash to vec2/float/vec3; add uSeed yourself
vec2 vjHash22(vec2 p){p=vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3)));return fract(sin(p)*43758.5453123);}
float vjHash31(vec3 p){return fract(sin(dot(p,vec3(127.1,311.7,74.7)))*43758.5453123);}
vec3 vjHash33(vec3 p){p=vec3(dot(p,vec3(127.1,311.7,74.7)),dot(p,vec3(269.5,183.3,246.1)),dot(p,vec3(113.5,271.9,124.6)));return fract(sin(p)*43758.5453123);}
//@module noise.simplex
//@doc vjSimplex(vec2) -1..1 ; vjSimplexFbm(p) 4 octaves 0..1 ; vjCurl(p) divergence-free flow vec2 ; vjRidged(p)
vec3 vjPerm(vec3 x){return mod(((x*34.)+1.)*x,289.);}
float vjSimplex(vec2 v){const vec4 C=vec4(.211324865405187,.366025403784439,-.577350269189626,.024390243902439);
vec2 i=floor(v+dot(v,C.yy)),x0=v-i+dot(i,C.xx);vec2 i1=(x0.x>x0.y)?vec2(1.,0.):vec2(0.,1.);vec4 x12=x0.xyxy+C.xxzz;x12.xy-=i1;i=mod(i,289.);
vec3 p=vjPerm(vjPerm(i.y+vec3(0.,i1.y,1.))+i.x+vec3(0.,i1.x,1.));vec3 m=max(.5-vec3(dot(x0,x0),dot(x12.xy,x12.xy),dot(x12.zw,x12.zw)),0.);m=m*m;m=m*m;
vec3 x=2.*fract(p*C.www)-1.;vec3 h=abs(x)-.5;vec3 ox=floor(x+.5);vec3 a0=x-ox;m*=1.79284291400159-.85373472095314*(a0*a0+h*h);
vec3 g;g.x=a0.x*x0.x+h.x*x0.y;g.yz=a0.yz*x12.xz+h.yz*x12.yw;return 130.*dot(m,g);}
float vjSimplexFbm(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*(.5+.5*vjSimplex(p));p=p*2.02+vec2(3.1,1.7);a*=.5;}return v;}
vec2 vjCurl(vec2 p){float e=.01;float a=vjSimplex(p+vec2(0.,e))-vjSimplex(p-vec2(0.,e));float b=vjSimplex(p+vec2(e,0.))-vjSimplex(p-vec2(e,0.));return vec2(a,-b)/(2.*e);}
float vjRidged(vec2 p){float v=0.,a=.5;for(int i=0;i<4;i++){v+=a*(1.-abs(vjSimplex(p)));p=p*2.1+vec2(1.3,7.1);a*=.5;}return v;}
//@module noise.cell requires hash
//@doc vjWorley(p)->vec3(F1,F2,cellId) ; vjVoronoiEdge(p) distance to the nearest cell border
vec3 vjWorley(vec2 p){vec2 n=floor(p),f=fract(p);float d1=8.,d2=8.,id=0.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=vjHash22(n+g);vec2 r=g+o-f;float d=dot(r,r);if(d<d1){d2=d1;d1=d;id=o.x;}else if(d<d2){d2=d;}}return vec3(sqrt(d1),sqrt(d2),id);}
float vjVoronoiEdge(vec2 p){vec2 n=floor(p),f=fract(p);vec2 mg=vec2(0.),mr=vec2(0.);float md=8.;for(int j=-1;j<=1;j++)for(int i=-1;i<=1;i++){vec2 g=vec2(float(i),float(j));vec2 o=vjHash22(n+g);vec2 r=g+o-f;float d=dot(r,r);if(d<md){md=d;mr=r;mg=g;}}
md=8.;for(int j=-2;j<=2;j++)for(int i=-2;i<=2;i++){vec2 g=mg+vec2(float(i),float(j));vec2 o=vjHash22(n+g);vec2 r=g+o-f;if(dot(mr-r,mr-r)>.00001)md=min(md,dot(.5*(mr+r),normalize(r-mr)));}return md;}
//@module sdf2d
//@doc 2D distances (negative inside): vjSdSeg vjSdRing vjSdRoundBox vjSdNgon vjSdStar vjSdTri ; ops vjSmax vjOpSub vjOpOnion ; domain vjRepeat vjMirror vjPolarRepeat
float vjSdSeg(vec2 p,vec2 a,vec2 b){vec2 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h);}
float vjSdRing(vec2 p,float r,float w){return abs(length(p)-r)-w;}
float vjSdRoundBox(vec2 p,vec2 b,float r){vec2 d=abs(p)-b+r;return length(max(d,0.))+min(max(d.x,d.y),0.)-r;}
float vjSdNgon(vec2 p,float n,float r){float a=atan(p.x,p.y)+3.14159265,s=6.28318531/n;return cos(floor(.5+a/s)*s-a)*length(p)-r;}
float vjSdStar(vec2 p,float n,float r,float m){float an=3.14159265/n,en=3.14159265/m;vec2 acs=vec2(cos(an),sin(an)),ecs=vec2(cos(en),sin(en));float bn=mod(atan(p.x,p.y),2.*an)-an;p=length(p)*vec2(cos(bn),abs(sin(bn)));p-=r*acs;p+=ecs*clamp(-dot(p,ecs),0.,r*acs.y/ecs.y);return length(p)*sign(p.x);}
float vjSdTri(vec2 p,float r){const float k=1.7320508;p.x=abs(p.x)-r;p.y=p.y+r/k;if(p.x+k*p.y>0.)p=vec2(p.x-k*p.y,-k*p.x-p.y)/2.;p.x-=clamp(p.x,-2.*r,0.);return -length(p)*sign(p.y);}
float vjSmax(float a,float b,float k){return -vjSmin(-a,-b,k);}
float vjOpSub(float a,float b){return max(a,-b);}
float vjOpOnion(float d,float t){return abs(d)-t;}
vec2 vjRepeat(vec2 p,vec2 c){return mod(p+.5*c,c)-.5*c;}
vec2 vjMirror(vec2 p,float x){p.x=abs(p.x-x)+x;return p;}
vec2 vjPolarRepeat(vec2 p,float n){float s=6.28318531/n,a=atan(p.y,p.x)+s*.5;a=mod(a,s)-s*.5;return length(p)*vec2(cos(a),sin(a));}
//@module sdf3d
//@doc 3D distances: vjSdSphere vjSdBox3 vjSdTorus vjSdCapsule vjSdPlane ; rotations vjRotX/Y/Z(a) mat3 ; vjRepeat3
float vjSdSphere(vec3 p,float r){return length(p)-r;}
float vjSdBox3(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float vjSdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}
float vjSdCapsule(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;float h=clamp(dot(pa,ba)/dot(ba,ba),0.,1.);return length(pa-ba*h)-r;}
float vjSdPlane(vec3 p,float h){return p.y-h;}
mat3 vjRotX(float a){float c=cos(a),s=sin(a);return mat3(1.,0.,0.,0.,c,-s,0.,s,c);}
mat3 vjRotY(float a){float c=cos(a),s=sin(a);return mat3(c,0.,s,0.,1.,0.,-s,0.,c);}
mat3 vjRotZ(float a){float c=cos(a),s=sin(a);return mat3(c,-s,0.,s,c,0.,0.,0.,1.);}
vec3 vjRepeat3(vec3 p,vec3 c){return mod(p+.5*c,c)-.5*c;}
//@module raymarch
//@doc Define `float map(vec3 p)` in your shader after the include. vjMarch(ro,rd,maxT) distance or -1 ; vjNormal(p) ; vjAO(p,n) ; vjShadow(p,l) ; vjCam(uv,ro,target,fov)->rd
float map(vec3 p);
float vjMarch(vec3 ro,vec3 rd,float maxT){float t=0.;for(int i=0;i<72;i++){float d=map(ro+rd*t);if(d<.001*t)return t;t+=d;if(t>maxT)break;}return -1.;}
vec3 vjNormal(vec3 p){vec2 e=vec2(.002,0.);return normalize(vec3(map(p+e.xyy)-map(p-e.xyy),map(p+e.yxy)-map(p-e.yxy),map(p+e.yyx)-map(p-e.yyx)));}
float vjAO(vec3 p,vec3 n){float o=0.,s=1.;for(int i=1;i<=5;i++){float h=.03*float(i);o+=(h-map(p+n*h))*s;s*=.7;}return clamp(1.-3.*o,0.,1.);}
float vjShadow(vec3 p,vec3 l){float r=1.,t=.02;for(int i=0;i<32;i++){float h=map(p+l*t);r=min(r,8.*h/t);t+=clamp(h,.02,.4);if(h<.001||t>6.)break;}return clamp(r,0.,1.);}
vec3 vjCam(vec2 uv,vec3 ro,vec3 ta,float fov){vec3 f=normalize(ta-ro),r=normalize(cross(vec3(0.,1.,0.),f)),u=cross(f,r);return normalize(uv.x*r+uv.y*u+fov*f);}
//@module color
//@doc vjOklab(rgb) vjFromOklab(lab) vjMixOklab(a,b,t) ; vjHsv(h,s,v) ; vjAces(c) vjReinhard(c) ; vjGrade(c,contrast,sat) ; vjDuotone(lum,a,b)
vec3 vjOklab(vec3 c){float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b,m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b,s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;l=pow(max(l,0.),1./3.);m=pow(max(m,0.),1./3.);s=pow(max(s,0.),1./3.);return vec3(.2104542553*l+.793617785*m-.0040720468*s,1.9779984951*l-2.428592205*m+.4505937099*s,.0259040371*l+.7827717662*m-.808675766*s);}
vec3 vjFromOklab(vec3 c){float l=c.x+.3963377774*c.y+.2158037573*c.z,m=c.x-.1055613458*c.y-.0638541728*c.z,s=c.x-.0894841775*c.y-1.291485548*c.z;l=l*l*l;m=m*m*m;s=s*s*s;return vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.707614701*s);}
vec3 vjMixOklab(vec3 a,vec3 b,float t){return vjFromOklab(mix(vjOklab(a),vjOklab(b),t));}
vec3 vjHsv(float h,float s,float v){vec3 k=clamp(abs(mod(h*6.+vec3(0.,4.,2.),6.)-3.)-1.,0.,1.);return v*mix(vec3(1.),k,s);}
vec3 vjAces(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
vec3 vjReinhard(vec3 c){return c/(1.+c);}
vec3 vjGrade(vec3 c,float contrast,float sat){c=(c-.5)*contrast+.5;float l=dot(c,vec3(.2126,.7152,.0722));return clamp(mix(vec3(l),c,sat),0.,1.);}
vec3 vjDuotone(float lum,vec3 a,vec3 b){return mix(a,b,clamp(lum,0.,1.));}
//@module dither
//@doc vjBayer4(fragCoord) threshold 0..1 ; vjIgn(fragCoord) interleaved gradient noise ; vjQuant(c,levels,fragCoord) ; vjHalftone(uv,angle,cells,lum) coverage ; vjLineScreen(uv,angle,freq,lum)
float vjBayer2(vec2 a){a=floor(a);return fract(a.x*.5+a.y*a.y*.75);}
float vjBayer4(vec2 f){return vjBayer2(.5*f)*.25+vjBayer2(f);}
float vjIgn(vec2 f){return fract(52.9829189*fract(dot(f,vec2(.06711056,.00583715))));}
vec3 vjQuant(vec3 c,float levels,vec2 f){float t=vjIgn(f)-.5;return floor(c*levels+t+.5)/levels;}
float vjHalftone(vec2 uv,float ang,float cells,float lum){float c=cos(ang),s=sin(ang);vec2 p=mat2(c,-s,s,c)*uv*cells;vec2 g=fract(p)-.5;float r=sqrt(clamp(lum,0.,1.))*.707;return 1.-smoothstep(r-.04,r+.04,length(g));}
float vjLineScreen(vec2 uv,float ang,float freq,float lum){float c=cos(ang),s=sin(ang);float v=fract((uv.x*c-uv.y*s)*freq)-.5;return 1.-smoothstep(lum*.5-.03,lum*.5+.03,abs(v));}
//@module space
//@doc vjPolar(p)->(r,angle) ; vjSwirl(p,amt) ; vjBarrel(p,k) ; vjHexTile(p)->vec4(local.xy,id.xy) ; vjLogPolar(p) ; vjAspect(fragCoord) centered uv, height 1
vec2 vjPolar(vec2 p){return vec2(length(p),atan(p.y,p.x));}
vec2 vjSwirl(vec2 p,float amt){float r=length(p);float a=amt*(1.-smoothstep(0.,1.,r));float c=cos(a),s=sin(a);return mat2(c,-s,s,c)*p;}
vec2 vjBarrel(vec2 p,float k){return p*(1.+k*dot(p,p));}
vec4 vjHexTile(vec2 p){const vec2 s=vec2(1.7320508,1.);vec4 hC=floor(vec4(p,p-vec2(1.,.5))/s.xyxy)+.5;vec4 h=vec4(p-hC.xy*s,p-(hC.zw+.5)*s);return dot(h.xy,h.xy)<dot(h.zw,h.zw)?vec4(h.xy,hC.xy):vec4(h.zw,hC.zw+.5);}
vec2 vjLogPolar(vec2 p){return vec2(log(max(length(p),.0001)),atan(p.y,p.x));}
vec2 vjAspect(vec2 f){return (f-.5*uRes)/uRes.y;}
//@module easing
//@doc t in 0..1: vjSmoother vjInOut vjOutBack vjElastic vjBounce vjExpoOut vjGain(t,k)
float vjSmoother(float t){t=clamp(t,0.,1.);return t*t*t*(t*(t*6.-15.)+10.);}
float vjInOut(float t){t=clamp(t,0.,1.);return t<.5?4.*t*t*t:1.-pow(-2.*t+2.,3.)/2.;}
float vjOutBack(float t){t=clamp(t,0.,1.);float c1=1.70158,c3=c1+1.;return 1.+c3*pow(t-1.,3.)+c1*pow(t-1.,2.);}
float vjElastic(float t){t=clamp(t,0.,1.);if(t<=0.||t>=1.)return t;return pow(2.,-10.*t)*sin((t*10.-.75)*2.0943951)+1.;}
float vjBounce(float t){t=clamp(t,0.,1.);float n=7.5625,d=2.75;if(t<1./d)return n*t*t;if(t<2./d){t-=1.5/d;return n*t*t+.75;}if(t<2.5/d){t-=2.25/d;return n*t*t+.9375;}t-=2.625/d;return n*t*t+.984375;}
float vjExpoOut(float t){t=clamp(t,0.,1.);return t>=1.?1.:1.-pow(2.,-10.*t);}
float vjGain(float t,float k){float a=.5*pow(2.*(t<.5?t:1.-t),k);return t<.5?a:1.-a;}
//@module post
//@doc vjVignette(uv,amt) vjGlow(d,size,power) vjAA(d) coverage from a distance in 1080-units ; vjGrain(fragCoord,amt) (not on LED) ; vjScan(fragCoord,pitch,amt)
float vjVignette(vec2 uv,float amt){return 1.-amt*smoothstep(.4,1.2,length(uv));}
float vjGlow(float d,float size,float power){return pow(size/(abs(d)+size),power);}
float vjAA(float d){return clamp(.5-d*uRes.y,0.,1.);}
float vjGrain(vec2 f,float amt){return 1.+amt*(fract(sin(dot(f+uSeed*13.,vec2(12.9898,78.233)))*43758.5453)-.5);}
float vjScan(vec2 f,float pitch,float amt){return 1.-amt*(.5+.5*sin(f.y*6.2831853/pitch));}
//@module led
//@doc Emulate the surface: vjLedDots(fragCoord,pitchPx,fill) round LED pixels mask ; vjCrtMask(fragCoord) aperture grille ; vjBleed(c,amt)
float vjLedDots(vec2 f,float pitch,float fill){vec2 g=fract(f/pitch)-.5;return 1.-smoothstep(fill*.5-.06,fill*.5+.06,length(g));}
vec3 vjCrtMask(vec2 f){float m=mod(floor(f.x),3.);return m<1.?vec3(1.,.35,.35):(m<2.?vec3(.35,1.,.35):vec3(.35,.35,1.));}
vec3 vjBleed(vec3 c,float amt){float l=dot(c,vec3(.333));return c+amt*l*l*vec3(1.);}
