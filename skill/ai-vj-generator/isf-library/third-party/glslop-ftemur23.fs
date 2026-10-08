/*{
  "DESCRIPTION": "Clean-room GLSL engine lowering of canonical Superflow-inspired Nested Orbit: a 121-torus ternary hierarchy held inside an authored eye-reliquary cage. Canonical build superflow:1.0.0:nested-orbit:fd54de938971; manifest SHA-256 fd54de9389716be0fbac8e249b90f167c52aaf7004ac812e9d5bc8b9dac2b9dc; schema 1.0.0; seed null/not_applicable; composition procedural_transform_led; modern experimental depth rates 1/2/4/8/16. The cage, materials, lights, and camera are reversible appearance lowering, not recovered Polarflow or proprietary topology.",
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.25, "MAX": 2.0 },
    { "NAME": "ignite", "TYPE": "color", "DEFAULT": [1.0, 0.48, 0.12, 1.0] },
    { "NAME": "worldMode", "TYPE": "long", "DEFAULT": 0, "VALUES": [0, 1], "LABELS": ["Hero", "Object Field"] },
    { "NAME": "density", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "patternZoom", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.5, "MAX": 5.0 },
    { "NAME": "primaryColor", "TYPE": "color", "DEFAULT": [0.02, 0.34, 0.42, 1.0] },
    { "NAME": "secondaryColor", "TYPE": "color", "DEFAULT": [0.48, 0.02, 0.28, 1.0] },
    { "NAME": "accentColor", "TYPE": "color", "DEFAULT": [1.0, 0.34, 0.04, 1.0] },
    { "NAME": "paletteMix", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "colorCycle", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "keyIntensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "rimIntensity", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "ambientLevel", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "roughness", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.4, "MAX": 2.0 },
    { "NAME": "metallic", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "exposure", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.4, "MAX": 2.0 }
  ]
}*/

#define PI 3.14159265359
#define TAU 6.28318530718
#define PERIOD 16.0
#define DNA_RADIUS 2.10

mat2 rot(float a){ float c=cos(a), s=sin(a); return mat2(c,-s,s,c); }
vec3 rotX(vec3 p,float a){ p.yz=rot(a)*p.yz; return p; }
vec3 rotY(vec3 p,float a){ p.xz=rot(a)*p.xz; return p; }
vec3 rotZ(vec3 p,float a){ p.xy=rot(a)*p.xy; return p; }

float hash21(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453123);
}

float sdTorus(vec3 p, vec2 t){
  vec2 q=vec2(length(p.xy)-t.x,p.z);
  return length(q)-t.y;
}

// Map return: distance, material zone, canonical depth, structural ignition.
vec4 opPick(vec4 a, vec4 b){ return (a.x<b.x)?a:b; }

// A whole canonical depth is lowered into one fluted shell. Its harmonic count
// is the number of carriers at that depth (3/9/27/81), so the full 121-node
// identity survives without evaluating 121 independent torus SDFs per step.
vec4 harmonicShell(vec3 p,float ph,float major,float tube,float carriers,
                   float rate,float depth,float material,float tilt){
  p=rotX(p,tilt+14.0*depth*PI/180.0);
  p=rotY(p,18.0*depth*PI/180.0);
  p.y*=1.12; // horizontal eye silhouette
  float a=atan(p.y,p.x);
  float wave=a*carriers-TAU*ph*rate;
  float amp=0.15/(1.0+0.30*depth*depth);
  if(depth<2.5) amp*=1.0+0.20*sin(TAU*ph*(depth+1.0)+0.65*depth);
  if(depth>0.5&&depth<3.0)
    major+=0.040*sin(TAU*ph*(depth+1.0)+0.90*depth);
  float zAmp=0.055/(1.0+0.35*depth);
  float tubeMod=0.18/(1.0+0.55*depth);
  float ridge=cos(wave);
  vec2 q=vec2(length(p.xy)-(major+amp*ridge),
              p.z+zAmp*sin(wave));
  float d=(length(q)-tube*(1.0-tubeMod+tubeMod*cos(wave+0.8)))*0.82;
  float ign=pow(max(0.0,cos(wave-0.45)),18.0);
  return vec4(d,material,depth,ign);
}

vec4 hierarchy(vec3 p, float ph){
  p=rotX(p,-0.10);
  vec3 rootP=rotX(rotY(p,0.35*sin(TAU*ph)),0.20*cos(TAU*ph));
  rootP.y*=1.28;
  float rootA=atan(rootP.y,rootP.x);
  float rootR=0.29+0.055*cos(3.0*rootA-TAU*ph);
  vec4 hit=vec4((length(vec2(length(rootP.xy)-rootR,rootP.z))-0.105)*0.78,
                1.0,0.0,
                pow(max(0.0,cos(rootA-TAU*ph)),22.0));
  hit=opPick(hit,harmonicShell(p,ph,0.61,0.135,3.0,2.0,1.0,2.0,-0.18));
  hit=opPick(hit,harmonicShell(p,ph,1.00,0.116,9.0,4.0,2.0,3.0,0.13));
  hit=opPick(hit,harmonicShell(p,ph,1.39,0.088,27.0,8.0,3.0,4.0,-0.09));
  hit=opPick(hit,harmonicShell(p,ph,1.78,0.068,81.0,16.0,4.0,5.0,0.06));
  return hit;
}

vec4 mapDNA(vec3 p,float ph){
  // Normalize the canonical metre-scale hierarchy into one presentation body.
  vec4 h=hierarchy(p*0.92,ph); h.x/=0.92;
  return h;
}

// Object DNA -> World Modes ABI v1 pilot. The Hero branch is deliberately an
// identity call. Weave Tile folds a non-overlapping XY cell, applies only
// distance-preserving static orientation, and offsets phase deterministically.
vec4 mapScene(vec3 p,float ph){
  if(worldMode==0) return mapDNA(p,ph);

  float objectScale=mix(0.42,0.30,density);
  float cellSize=2.24*DNA_RADIUS*objectScale;
  vec2 cell=floor(p.xy/cellSize+0.5);
  vec2 local=p.xy-cell*cellSize;
  vec3 q=vec3(local,p.z);

  float parity=mod(abs(cell.x+cell.y),2.0);
  if(parity>0.5) q.x=-q.x;
  float turn=floor(hash21(cell+vec2(19.0,7.0))*4.0);
  q.xy=rot(turn*0.5*PI)*q.xy;

  float cellPhase=hash21(cell+vec2(3.0,17.0));
  vec4 h=mapDNA(q/objectScale,fract(ph+cellPhase));
  h.x*=objectScale;
  return h;
}
float mapD(vec3 p,float ph){ return mapScene(p,ph).x; }

vec3 zoneColor(float m,float depth){
  if(m<1.5) return vec3(0.025,0.16,0.30); // root: deep sapphire
  if(m<2.5) return vec3(0.015,0.34,0.34); // depth 1: teal
  if(m<3.5) return vec3(0.08,0.12,0.48);  // depth 2: blue
  if(m<4.5) return vec3(0.30,0.055,0.48);// depth 3: amethyst
  if(m<5.5) return vec3(0.16,0.045,0.36);// depth 4: deep violet
  return vec3(0.48,0.28,0.055);          // cage: aged gold
}

vec3 hueRotate(vec3 c,float a){
  vec3 axis=vec3(0.57735027);
  return clamp(c*cos(a)+cross(axis,c)*sin(a)+axis*dot(axis,c)*(1.0-cos(a)),0.0,1.0);
}

vec3 artistPalette(vec3 base,float materialId,float phase){
  vec3 target=(materialId<2.5)?primaryColor.rgb:
              ((materialId<4.5)?secondaryColor.rgb:accentColor.rgb);
  return hueRotate(mix(base,target,paletteMix),TAU*phase*colorCycle);
}

float zoneRoughness(float m){
  if(m<1.5) return 0.24; // polished sapphire core
  if(m<2.5) return 0.31; // teal enamel
  if(m<3.5) return 0.40; // satin blue band against lacquered neighbors
  if(m<4.5) return 0.28; // amethyst lacquer
  return 0.19;           // fine violet-metal ridge
}

vec3 zoneF0(float m,vec3 base){
  if(m<1.5) return vec3(0.105,0.062,0.030); // warm core specular, not emission
  if(m<2.5) return mix(vec3(0.045),base,0.18);
  if(m<4.5) return mix(vec3(0.055),base,0.31);
  return mix(vec3(0.075),base,0.48);
}

float distributionGGX(vec3 n,vec3 h,float rough){
  float a=rough*rough, a2=a*a;
  float nh=max(dot(n,h),0.0), d=nh*nh*(a2-1.0)+1.0;
  return a2/max(PI*d*d,0.0001);
}

float geometrySchlickGGX(float nv,float rough){
  float k=(rough+1.0); k=k*k*0.125;
  return nv/max(nv*(1.0-k)+k,0.0001);
}

float geometrySmith(vec3 n,vec3 v,vec3 l,float rough){
  return geometrySchlickGGX(max(dot(n,v),0.0),rough)
        *geometrySchlickGGX(max(dot(n,l),0.0),rough);
}

vec3 fresnelSchlick(float hv,vec3 f0){
  return f0+(1.0-f0)*pow(1.0-clamp(hv,0.0,1.0),5.0);
}

vec3 studioEnvironment(vec3 r){
  float sky=clamp(0.5+0.5*r.y,0.0,1.0);
  vec3 env=mix(vec3(0.008,0.012,0.028),vec3(0.055,0.095,0.16),sky);
  float coolPanel=pow(max(dot(r,normalize(vec3(0.70,0.35,-0.62))),0.0),18.0);
  float warmPanel=pow(max(dot(r,normalize(vec3(-0.58,0.52,-0.63))),0.0),28.0);
  return env+vec3(0.10,0.34,0.55)*coolPanel+vec3(0.52,0.22,0.075)*warmPanel;
}

float softShadow(vec3 ro,vec3 rd,float ph,float maxT){
  float res=1.0, t=0.035;
  for(int i=0;i<18;i++){
    float h=mapD(ro+rd*t,ph);
    res=min(res,14.0*h/t);
    t+=clamp(h,0.025,0.28);
    if(res<0.02||t>maxT) break;
  }
  return clamp(res,0.0,1.0);
}

float ambientOcclusion(vec3 p,vec3 n,float ph){
  float occ=0.0, sc=1.0;
  for(int i=1;i<=6;i++){
    float h=0.018+0.070*float(i);
    occ+=(h-mapD(p+n*h,ph))*sc;
    sc*=0.63;
  }
  return clamp(1.0-1.82*occ,0.0,1.0);
}

vec3 normalAt(vec3 p,float ph){
  vec2 e=vec2(0.0015,0.0);
  return normalize(vec3(
    mapD(p+e.xyy,ph)-mapD(p-e.xyy,ph),
    mapD(p+e.yxy,ph)-mapD(p-e.yxy,ph),
    mapD(p+e.yyx,ph)-mapD(p-e.yyx,ph)));
}

vec3 directBRDF(vec3 n,vec3 v,vec3 l,vec3 radiance,vec3 base,
                vec3 f0,float rough,float metal,float visibility){
  vec3 h=normalize(v+l);
  float nl=max(dot(n,l),0.0), nv=max(dot(n,v),0.0);
  float d=distributionGGX(n,h,rough);
  float g=geometrySmith(n,v,l,rough);
  vec3 f=fresnelSchlick(max(dot(h,v),0.0),f0);
  vec3 spec=d*g*f/max(4.0*nl*nv,0.001);
  vec3 kd=(1.0-f)*(1.0-metal);
  return (kd*base/PI+spec)*radiance*nl*visibility;
}

vec3 filmicACES(vec3 x){
  float a=2.51,b=0.03,c=2.43,d=0.59,e=0.14;
  return clamp((x*(a*x+b))/(x*(c*x+d)+e),0.0,1.0);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float ph=fract(TIME*speed/PERIOD);

  // Fixed cameras per mode: geometry, never camera motion, carries the loop.
  vec3 ro=(worldMode==0)?vec3(0.25,0.27,-6.35):vec3(0.0,0.0,-5.15);
  vec3 ta=(worldMode==0)?vec3(0.0,0.05,0.0):vec3(0.0,0.0,0.0);
  vec3 fw=normalize(ta-ro);
  vec3 rt=normalize(cross(fw,vec3(0.0,1.0,0.0)));
  vec3 up=cross(rt,fw);
  float lens=(worldMode==0)?1.58:1.42*patternZoom;
  vec3 rd=normalize(fw*lens+rt*uv.x+up*uv.y);

  float t=0.0, hit=-1.0;
  vec4 res=vec4(0.0);
  for(int i=0;i<90;i++){
    res=mapScene(ro+rd*t,ph);
    if(res.x<0.00065*max(1.0,t)){ hit=t; break; }
    t+=max(0.0015,res.x*0.46);
    if(t>10.0) break;
  }

  float vign=1.0-0.24*dot(uv,uv);
  vec3 col=mix(vec3(0.002,0.004,0.012),vec3(0.008,0.018,0.035),
               clamp(0.55+0.55*uv.y,0.0,1.0))*vign;

  if(hit>0.0){
    vec3 p=ro+rd*hit;
    vec3 n=normalAt(p,ph);
    vec3 v=-rd;
    vec3 base=artistPalette(zoneColor(res.y,res.z),res.y,ph);
    float ao=ambientOcclusion(p,n,ph);

    // Stable, low-amplitude surface variation breaks the analytic perfection
    // without introducing time noise or frame-to-frame shimmer.
    vec3 micro=sin(p*vec3(12.7,14.3,11.1)+vec3(0.0,1.7,3.1));
    n=normalize(n+0.010*(micro-n*dot(micro,n)));
    float rough=zoneRoughness(res.y);
    rough=clamp(rough*roughness+0.014*sin(dot(p,vec3(9.7,12.1,8.3))+res.z*2.2),0.06,0.85);
    float metalBase=(res.y<2.5)?0.08:((res.y<4.5)?0.32:0.54);
    float metal=clamp(metalBase+(metallic-0.5)*0.9,0.0,1.0);
    vec3 f0=zoneF0(res.y,base);
    f0=clamp(f0+(metal-metalBase)*(base-vec3(0.04)),vec3(0.02),vec3(0.95));

    vec3 l1=normalize(vec3(-0.52,0.76,-0.40));
    vec3 l2=normalize(vec3(0.74,0.12,-0.56));
    vec3 l3=normalize(vec3(-0.30,-0.68,0.50));
    float sh1=softShadow(p+n*0.018,l1,ph,3.3);
    float sh2=softShadow(p+n*0.018,l2,ph,2.5);
    vec3 surf=directBRDF(n,v,l1,vec3(4.0,3.15,2.35)*keyIntensity,base,f0,rough,metal,sh1);
    surf+=directBRDF(n,v,l2,vec3(0.42,1.25,2.05),base,f0,rough,metal,sh2)*0.72;
    surf+=directBRDF(n,v,l3,vec3(0.88,0.26,1.22),base,f0,rough,metal,1.0)*0.42;

    float nv=max(dot(n,v),0.0);
    vec3 envF=fresnelSchlick(nv,f0);
    vec3 env=studioEnvironment(reflect(-v,n));
    surf+=env*(envF*(0.62+0.38*(1.0-rough))
              +base*(1.0-metal)*0.055)*ao*ambientLevel;
    surf+=base*vec3(0.035,0.052,0.075)*ao*ambientLevel; // groundless studio fill

    float edge=pow(1.0-nv,3.2);
    vec3 rim=mix(vec3(0.025,0.34,0.62),vec3(0.40,0.055,0.66),
                 0.5+0.5*sin(TAU*(ph+0.09*res.z)));
    vec3 emission=mix(mix(ignite.rgb,accentColor.rgb,paletteMix),base,0.45)*res.w*(0.25+0.48*edge);
    float focal=exp(-2.4*length(p.xy))*max(dot(n,normalize(vec3(-0.2,0.35,-1.0))),0.0);
    surf=surf*ao*1.12
             +rim*edge*(0.18+0.30*ao)*rimIntensity
             +emission*0.82
             +vec3(0.65,0.22,0.055)*focal*0.28;
    surf*=exp(-0.045*hit);
    col=surf;
  }

  // ACES-style filmic shoulder retains colored highlights and deep black sides.
  col=filmicACES(col*1.08*exposure);
  col=pow(max(col,0.0),vec3(0.94));
  gl_FragColor=vec4(col,1.0);
}
