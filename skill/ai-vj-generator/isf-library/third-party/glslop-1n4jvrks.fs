/*{
  "DESCRIPTION": "An endless impossible cathedral where two crystal processions dance through flowing gyroid light",
  "CREDIT": "OpenAI / Codex",
  "CATEGORIES": ["generator", "3d", "raymarch", "abstract"],
  "INPUTS": [
    {"NAME":"flightSpeed","TYPE":"float","DEFAULT":0.45,"MIN":0.0,"MAX":1.5},
    {"NAME":"danceSpeed","TYPE":"float","DEFAULT":0.75,"MIN":0.0,"MAX":2.0},
    {"NAME":"fold","TYPE":"float","DEFAULT":0.72,"MIN":0.0,"MAX":1.0},
    {"NAME":"hueDrift","TYPE":"float","DEFAULT":0.28,"MIN":0.0,"MAX":1.0},
    {"NAME":"radiance","TYPE":"float","DEFAULT":0.85,"MIN":0.0,"MAX":1.5}
  ]
}*/

#ifdef GL_ES
precision highp float;
#endif

#define PI 3.14159265359
#define TAU 6.28318530718

mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.0))+min(max(q.x,max(q.y,q.z)),0.0);}
float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xy)-t.x,p.z);return length(q)-t.y;}
float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*0.57735027;}
vec2 opU(vec2 a,vec2 b){return a.x<b.x?a:b;}

vec2 mapScene(vec3 p){
  vec2 res=vec2(20.0,0.0);
  float corridor=1.85;
  float zCell=mod(p.z+corridor*0.5,corridor)-corridor*0.5;
  float cell=floor((p.z+corridor*0.5)/corridor);
  float danceT=TIME*danceSpeed;

  vec3 t=p;
  t.xy*=rot(0.18*p.z+0.16*sin(TIME*0.42));
  float ang=atan(t.y,t.x);
  float sector=TAU/8.0;
  float ka=mod(ang+sector*0.5,sector)-sector*0.5;
  float radius=length(t.xy);

  float archRadius=1.34+0.045*sin(danceT*0.8+cell*1.7);
  vec3 archP=vec3(radius-archRadius,ka*radius,zCell);
  float arch=sdBox(archP,vec3(0.055,0.024,0.52));
  float crown=sdTorus(vec3(t.xy,zCell),vec2(archRadius,0.036));
  res=opU(res,vec2(min(arch,crown),1.0));

  float fineSector=TAU/24.0;
  float fa=mod(ang+danceT*0.08*sin(cell)+fineSector*0.5,fineSector)-fineSector*0.5;
  vec3 laceP=vec3(radius-1.12,fa*radius,zCell);
  float lace=sdBox(laceP,vec3(0.22,0.009,0.018));
  res=opU(res,vec2(lace,2.0));

  vec3 gp=t*vec3(3.2,3.2,2.5);
  gp.z+=danceT*0.72;
  gp.xy*=rot(sin(p.z*0.3+danceT*0.45)*0.58*fold);
  float gy=abs(dot(sin(gp),cos(gp.yzx)))/3.2-0.035;
  float shell=max(gy,abs(radius-1.47)-0.18);
  res=opU(res,vec2(shell,2.0));

  for(int i=0;i<8;i++){
    float fi=float(i);
    float phase=fi*TAU/8.0;
    float wobble=0.20*sin(danceT*1.6+fi*2.13+cell*0.7);
    float paradeAngle=phase+danceT*(0.48+0.05*sin(cell*1.37))+wobble;
    float paradeRadius=0.82+0.09*sin(danceT*1.25+fi*1.8+cell);
    float paradeZ=0.28*sin(danceT*1.35+fi*1.43+cell*0.8);
    vec2 paradeCenter=vec2(cos(paradeAngle),sin(paradeAngle))*paradeRadius;
    vec3 dancer=vec3(t.xy-paradeCenter,zCell-paradeZ);
    dancer.xy*=rot(danceT*0.9+fi*0.7);
    dancer.xz*=rot(0.65*sin(danceT+fi));
    float jewel=sdOcta(dancer,0.12+0.025*sin(danceT*2.0+fi));
    res=opU(res,vec2(jewel,3.0));

    float counterAngle=phase-danceT*0.36+cell*0.31;
    float counterRadius=0.48+0.055*cos(danceT*1.7+fi);
    float counterZ=-0.24*sin(danceT*1.1+fi*1.9-cell);
    vec2 counterCenter=vec2(cos(counterAngle),sin(counterAngle))*counterRadius;
    vec3 blade=vec3(t.xy-counterCenter,zCell-counterZ);
    blade.xy*=rot(-counterAngle+danceT);
    blade.yz*=rot(0.8+0.5*sin(danceT*1.4+fi));
    float smallDancer=sdBox(blade,vec3(0.035,0.105,0.035));
    res=opU(res,vec2(smallDancer,4.0));
  }
  return res;
}

vec3 normalAt(vec3 p){
  vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(
    mapScene(p+e.xyy).x-mapScene(p-e.xyy).x,
    mapScene(p+e.yxy).x-mapScene(p-e.yxy).x,
    mapScene(p+e.yyx).x-mapScene(p-e.yyx).x));
}

vec3 palette(float x){
  return 0.5+0.5*cos(TAU*(vec3(0.05,0.32,0.62)+x+vec3(0.0,0.12,0.24)));
}

void main(){
  vec2 uv=isf_FragNormCoord*2.0-1.0;
  uv.x*=RENDERSIZE.x/RENDERSIZE.y;

  float travel=TIME*flightSpeed;
  vec3 ro=vec3(0.12*sin(TIME*0.21),0.10*cos(TIME*0.17),travel);
  vec3 ta=vec3(0.0,0.0,travel+2.2);
  vec3 fw=normalize(ta-ro);
  vec3 rt=normalize(cross(fw,vec3(0.0,1.0,0.0)));
  vec3 up=cross(rt,fw);
  float roll=0.08*sin(TIME*0.13);
  rt.xy*=rot(roll);
  up=cross(rt,fw);
  vec3 rd=normalize(fw+uv.x*rt*0.72+uv.y*up*0.72);

  float depth=0.0;
  float mat=0.0;
  bool hit=false;
  vec3 glow=vec3(0.0);
  for(int i=0;i<104;i++){
    vec3 pos=ro+rd*depth;
    vec2 h=mapScene(pos);
    float halo=0.00025/(0.003+abs(h.x));
    if(h.y>1.5&&h.y<2.5) glow+=palette(pos.z*0.035+hueDrift)*halo;
    if(h.y>2.5&&h.y<3.5) glow+=vec3(1.0,0.03,0.32)*halo*1.3;
    if(h.y>3.5) glow+=vec3(0.08,0.72,1.0)*halo*1.5;
    if(h.x<0.0014){hit=true;mat=h.y;break;}
    depth+=max(h.x*0.58,0.003);
    if(depth>18.0)break;
  }

  float tunnel=pow(max(0.0,1.0-length(uv)*0.58),4.0);
  vec3 col=vec3(0.001,0.002,0.009)+vec3(0.006,0.012,0.04)*tunnel;
  if(hit){
    vec3 pos=ro+rd*depth;
    vec3 n=normalAt(pos);
    vec3 key=normalize(vec3(-0.4,0.7,-0.2));
    float dif=0.12+0.88*max(dot(n,key),0.0);
    float rim=pow(1.0-max(dot(n,-rd),0.0),3.0);
    vec3 base;
    if(mat<1.5) base=mix(vec3(0.08,0.012,0.004),vec3(1.0,0.48,0.06),0.5+0.5*sin(pos.z*2.0));
    else if(mat<2.5) base=palette(pos.z*0.04+hueDrift+n.x*0.08);
    else if(mat<3.5) base=vec3(0.92,0.02,0.20);
    else base=vec3(0.04,0.68,1.0);
    col=base*dif+rim*palette(hueDrift+pos.z*0.02);
    col=mix(col,vec3(0.004,0.008,0.025),1.0-exp(-depth*0.055));
  }

  col+=glow*radiance;
  float spokes=pow(max(0.0,cos(atan(uv.y,uv.x)*8.0-TIME*0.07)),18.0);
  col+=palette(hueDrift+length(uv))*spokes*0.018/(0.15+length(uv));
  col=col/(1.0+col);
  col=pow(col,vec3(0.72));
  col*=1.0-0.24*dot(uv*0.58,uv*0.58);
  gl_FragColor=vec4(col,1.0);
}
