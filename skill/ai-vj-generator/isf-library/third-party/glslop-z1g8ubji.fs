/*{
  "DESCRIPTION": "A fork of Blue Marble",
  "CREDIT": "glslop agent (Claude)",
  "CATEGORIES": ["planet","space","procedural","atmosphere","3d"],
  "INPUTS": [
    { "NAME": "speed",   "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "wrinkle", "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "hair",    "TYPE": "float", "DEFAULT": 0.6,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "dong",    "TYPE": "float", "DEFAULT": 2.0,  "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "zoom",    "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.6, "MAX": 1.8 }
  ]
}*/
 
#define PI  3.14159265359
#define TAU 6.28318530718
const float PERIOD = 8.0;
 
float hash1(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float noise3(vec3 p){
  vec3 i = floor(p), f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  float n000 = hash1(i+vec3(0,0,0)), n100 = hash1(i+vec3(1,0,0));
  float n010 = hash1(i+vec3(0,1,0)), n110 = hash1(i+vec3(1,1,0));
  float n001 = hash1(i+vec3(0,0,1)), n101 = hash1(i+vec3(1,0,1));
  float n011 = hash1(i+vec3(0,1,1)), n111 = hash1(i+vec3(1,1,1));
  return mix(mix(mix(n000,n100,f.x), mix(n010,n110,f.x), f.y),
             mix(mix(n001,n101,f.x), mix(n011,n111,f.x), f.y), f.z);
}
float fbm3(vec3 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 5; i++){ s += a*noise3(p); p = p*2.03 + 7.3; a *= 0.5; }
  return s;
}
mat3 rotX(float a){ float c=cos(a), s=sin(a); return mat3(1,0,0, 0,c,-s, 0,s,c); }
mat3 rotZ(float a){ float c=cos(a), s=sin(a); return mat3(c,-s,0, s,c,0, 0,0,1); }
float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b-a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0-h);
}
// IQ round cone (tapered capsule)
float sdRoundCone(vec3 p, vec3 a, vec3 b, float r1, float r2){
  vec3 ba = b - a; float l2 = dot(ba,ba);
  float rr = r1 - r2; float a2 = l2 - rr*rr; float il2 = 1.0/l2;
  vec3 pa = p - a; float y = dot(pa,ba); float z = y - l2;
  vec3 q = pa*l2 - ba*y; float x2 = dot(q,q);
  float y2 = y*y*l2; float z2 = z*z*l2;
  float k = sign(rr)*rr*rr*x2;
  if( sign(z)*a2*z2 > k ) return sqrt(x2 + z2)*il2 - r2;
  if( sign(y)*a2*y2 < k ) return sqrt(x2 + y2)*il2 - r1;
  return (sqrt(x2*a2*il2)+y*rr)*il2 - r1;
}
 
// the dong, in object space. reads global 'dong' as a length scale.
float mapDong(vec3 q, float th){
  float L = dong;
  vec3 a   = vec3(0.0,                 0.28,             0.55);
  vec3 mid = vec3(0.06*sin(th*1.3),    0.28 - 0.55*L,    0.74);
  vec3 tip = vec3(0.12*sin(th*1.3+0.6),0.28 - 1.15*L,    0.56);
  float d1 = sdRoundCone(q, a,   mid, 0.25, 0.20);
  float d2 = sdRoundCone(q, mid, tip, 0.20, 0.165);
  float shaft = smin(d1, d2, 0.14);
  float head  = length(q - tip) - 0.215;      // slightly fatter glans
  return smin(shaft, head, 0.10);
}
 
float mapSack(vec3 p, float th, out float side){
  vec3 pa = p - vec3( 0.52, 0.02, 0.0);
  vec3 pb = p - vec3(-0.52, -0.06, 0.0);
  pa.y *= 0.86; pb.y *= 0.86;
  float da = length(pa) - 0.72;
  float db = length(pb) - 0.72;
  side = da < db ? 1.0 : -1.0;
  float sack = smin(da, db, 0.34);
  float dg   = mapDong(p, th);
  return smin(sack, dg, 0.20);
}
float mapScene(vec3 p, float th, out vec3 op, out float side){
  float sway = 0.18 * sin(th);
  mat3 M = rotZ(sway) * rotX(0.10*sin(th*2.0) - 0.15);
  op = M * p;
  return mapSack(op, th, side);
}
vec3 calcNormal(vec3 p, float th){
  vec2 e = vec2(0.0015, 0.0);
  float s; vec3 o;
  return normalize(vec3(
    mapScene(p+e.xyy, th, o, s) - mapScene(p-e.xyy, th, o, s),
    mapScene(p+e.yxy, th, o, s) - mapScene(p-e.yxy, th, o, s),
    mapScene(p+e.yyx, th, o, s) - mapScene(p-e.yyx, th, o, s)
  ));
}
 
// combed procedural hair: thousands of fine curved filaments in columns down
// the surface. returns darkening in .x, backlit glint in .y
vec2 hairField(vec3 op, vec3 n, vec3 rd, vec3 key){
  vec3 d = normalize(op);
  float u   = atan(d.x, d.z);          // longitude around vertical axis
  float lat = d.y;                     // -1 bottom .. +1 top
  float fres = pow(1.0 - max(dot(n, -rd), 0.0), 1.6);
  float glint = pow(max(dot(n, key), 0.0), 3.0);
 
  float dark = 0.0, lite = 0.0;
  // three layers at different densities so it never reads as a regular comb
  for(int L = 0; L < 3; L++){
    float fl = float(L);
    float lf = 1.0 + fl*0.63;                       // 1.0, 1.63, 2.26
    float dens = 62.0 * lf * (0.4 + 0.8*hair);      // many fine columns
    // each strand curls: horizontal wander that grows toward the tips (downward)
    float curl = 0.9*sin(lat*4.0 + u*3.0 + fl*2.1)
               + 0.35*sin(lat*11.0 + fl*5.0);       // secondary wiggle
    curl *= smoothstep(0.6, -1.1, lat);
    float x  = (u/PI)*dens + curl;
    float ci = floor(x);
    float fx = fract(x) - 0.5;
    // per-strand identity
    float r0 = hash1(vec3(ci, 3.0 + fl*7.0, 11.0));
    float r1v= hash1(vec3(ci, 9.0 + fl*7.0, 4.0));
    float exists = step(0.35, r0);                  // not every column carries a hair
    float jitter = (r1v - 0.5) * 0.7;               // offset strand within its column
    float thick  = 0.035 + 0.06*r1v;                // FINE — individual fibers
    float core = smoothstep(thick, 0.0, abs(fx - jitter));
    // each strand roots at a random latitude and has a finite length -> wispy
    float root = 0.55 - 0.9*hash1(vec3(ci, 21.0+fl, 2.0));
    float len  = 0.5 + 0.7*r1v;
    float along = smoothstep(root+0.02, root-0.02, lat) * smoothstep(root-len, root-len+0.2, lat);
    float strand = core * exists * along;
    // fuzz reads strongest at grazing angles (silhouette) and lower down
    strand *= (0.3 + 0.8*fres) * smoothstep(0.8, -0.4, lat);
    dark += strand;
    lite += strand * glint;
  }
  dark = clamp(dark, 0.0, 1.2) * clamp(hair, 0.0, 2.0);
  lite = clamp(lite, 0.0, 1.0) * clamp(hair, 0.0, 2.0);
  return vec2(dark, lite);
}
 
void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;
  uv /= zoom;
  uv.y -= 0.22;                          // frame room for the dangle
 
  float ph = fract(TIME * speed / PERIOD);
  float th = TAU * ph;
 
  vec3 ro = vec3(0.0, 0.0, 3.5);
  vec3 rd = normalize(vec3(uv, -2.05));
  vec3 key = normalize(vec3(0.5, 0.7, 0.6));
  vec3 fill = normalize(vec3(-0.6, -0.2, 0.4));
 
  vec3 col;
  float vig = 1.0 - 0.6*dot(uv*0.7, uv*0.7);
  col = mix(vec3(0.10,0.10,0.13), vec3(0.20,0.20,0.24), vig) * vig;
 
  float t = 0.0, side = 0.0;
  vec3 op = vec3(0.0);
  bool hit = false;
  for(int i = 0; i < 110; i++){
    vec3 p = ro + rd*t;
    float s;
    float d = mapScene(p, th, op, s);
    if(d < 0.0008){ side = s; hit = true; break; }
    t += d;
    if(t > 7.0) break;
  }
 
  if(hit){
    vec3 p = ro + rd*t;
    vec3 n = calcNormal(p, th);
 
    // glans region (smoother, shinier, pinker)
    vec3 tip = vec3(0.12*sin(th*1.3+0.6), 0.28 - 1.15*dong, 0.56);
    float glans = smoothstep(0.30, 0.12, length(op - tip));
 
    float wr = fbm3(op*7.0 + 3.0);
    float fine = fbm3(op*18.0);
    float crease = (0.5 - abs(wr - 0.5)) * 2.0;
    crease = pow(crease, 1.5) * wrinkle * (1.0 - 0.85*glans);
 
    vec2 e = vec2(0.02, 0.0);
    vec3 g = vec3(
      fbm3((op+e.xyy)*7.0+3.0) - fbm3((op-e.xyy)*7.0+3.0),
      fbm3((op+e.yxy)*7.0+3.0) - fbm3((op-e.yxy)*7.0+3.0),
      fbm3((op+e.yyx)*7.0+3.0) - fbm3((op-e.yyx)*7.0+3.0)
    );
    n = normalize(n - (g*3.0 + (fbm3(op*18.0+1.0)-0.5)*0.6) * wrinkle * (1.0 - 0.85*glans));
 
    float raphe = smoothstep(0.06, 0.0, abs(op.x)) * smoothstep(-1.4, 0.5, op.y) * (1.0 - glans);
 
    vec3 skin = vec3(0.72, 0.50, 0.44);
    skin = mix(skin, vec3(0.55, 0.30, 0.28), crease*0.6);
    skin = mix(skin, vec3(0.42, 0.20, 0.20), raphe*0.7);
    skin = mix(skin, vec3(0.74, 0.42, 0.42), glans*0.6);   // pinker head
    skin *= 0.9 + 0.2*fine;
 
    float kd = max(dot(n, key), 0.0);
    float fd = max(dot(n, fill), 0.0);
    float wrap = max(0.0, (dot(n, key) + 0.4) / 1.4);
    vec3 sss = vec3(0.9, 0.35, 0.30) * pow(wrap, 2.0) * 0.5;
 
    vec3 lit = skin * (0.15 + 1.0*kd) + skin * fill.z * fd * 0.25;
    lit += sss;
 
    vec3 h = normalize(key - rd);
    float spec = pow(max(dot(n, h), 0.0), 18.0 + 40.0*glans);
    lit += vec3(1.0, 0.9, 0.85) * spec * (0.35 + 0.6*glans) * (1.0 - crease*0.5);
 
    // --- hair ---
    vec2 hf = hairField(op, n, rd, key);
    lit *= 1.0 - 0.6*hf.x;                              // strands darken
    lit += vec3(0.85, 0.72, 0.55) * hf.y * 0.5;          // backlit glint
 
    float rim = pow(1.0 - max(dot(n, -rd), 0.0), 3.0);
    lit += vec3(0.5, 0.45, 0.55) * rim * 0.4;
 
    lit *= 0.7 + 0.3*clamp(1.0 - crease*0.8, 0.0, 1.0);
    lit *= 0.6 + 0.4*smoothstep(-1.5, -0.4, op.y);
 
    col = lit;
  }
 
  col = col / (1.0 + col);
  col = pow(col, vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}