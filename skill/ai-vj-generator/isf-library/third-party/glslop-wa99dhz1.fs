/*{
  "DESCRIPTION": "Cymatic amethyst: hex crystal cluster with Chladni nodal lines and labyrinth ridges etched across violet facets, gold sand gathering on nodes, cyan glow where ridges pinch.",
  "CATEGORIES": ["generative"],
  "INPUTS": [
    { "NAME": "speed",  "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "hue",    "TYPE": "float", "DEFAULT": 0.74, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "irid",   "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "glowAmt","TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "count",  "TYPE": "long",  "DEFAULT": 7,    "MIN": 3,   "MAX": 9 }
  ]
}*/

#define PI  3.14159265359
#define TAU 6.28318530718
#define GA  2.39996323
const float PERIOD = 16.0;

vec3 pal(float t){ return 0.5 + 0.5*cos(TAU*(t + vec3(0.0, 0.33, 0.66))); }

mat3 rotY(float a){ float c=cos(a), s=sin(a); return mat3(c,0,-s, 0,1,0, s,0,c); }

mat3 align(vec3 d){
  vec3 z = normalize(d);
  vec3 up = abs(z.y) < 0.98 ? vec3(0.0,1.0,0.0) : vec3(1.0,0.0,0.0);
  vec3 x = normalize(cross(up, z));
  vec3 y = cross(z, x);
  return mat3(x, y, z);
}

float sdHexPrism(vec3 p, vec2 h){
  const vec3 k = vec3(-0.8660254, 0.5, 0.57735);
  p = abs(p);
  p.xy -= 2.0*min(dot(k.xy, p.xy), 0.0)*k.xy;
  vec2 d = vec2(length(p.xy - vec2(clamp(p.x, -k.z*h.x, k.z*h.x), h.x))*sign(p.y - h.x),
                p.z - h.y);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

float crystal(vec3 q, float len, float rad){
  float apex = len + rad*1.9;
  float body = sdHexPrism(q - vec3(0.0, 0.0, apex*0.5), vec2(rad, apex*0.5));
  float ax = apex - q.z;
  float cone = length(q.xy) - max(0.0, ax)*0.60;
  return max(body, cone);
}

// From Parent 2: fbm for labyrinth ridges
float hash2(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float vnoise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f*f*(3.0 - 2.0*f);
  float a = hash2(i), b = hash2(i+vec2(1,0)), c = hash2(i+vec2(0,1)), d = hash2(i+vec2(1,1));
  return mix(mix(a,b,f.x), mix(c,d,f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for(int i = 0; i < 4; i++){ s += a*vnoise(p); p = p*2.02 + 7.3; a *= 0.5; }
  return s;
}

// From Parent 3: Chladni standing wave
float chladni(vec2 p, float n, float m){
  return cos(n*PI*p.x)*cos(m*PI*p.y) - cos(m*PI*p.x)*cos(n*PI*p.y);
}

float map(vec3 p){
  float d = 1e9;
  for(int i = 0; i < 9; i++){
    if(i >= int(count)) break;
    float fi = float(i);
    float tilt = 0.10 + 0.62*fract(fi*0.37 + 0.13);
    float az   = fi*GA;
    vec3 dir = vec3(sin(tilt)*cos(az), cos(tilt), sin(tilt)*sin(az));
    float len = 0.85 + 0.55*fract(fi*0.61);
    float rad = 0.085 + 0.04*fract(fi*0.53);
    vec3 base = dir*0.12;
    vec3 q = (p - base) * align(dir);
    d = min(d, crystal(q, len, rad));
  }
  return d;
}

vec3 normal(vec3 p){
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(
    map(p+e.xyy) - map(p-e.xyy),
    map(p+e.yxy) - map(p-e.yxy),
    map(p+e.yyx) - map(p-e.yyx)));
}

// Surface texture combining Chladni + fbm ridges
vec3 surfaceTex(vec3 p, vec3 n, float th, vec2 off){
  // Project position onto facet plane using normal
  vec3 u = normalize(abs(n.y) < 0.99 ? cross(n, vec3(0,1,0)) : cross(n, vec3(1,0,0)));
  vec3 v = cross(n, u);
  vec2 uv = vec2(dot(p, u), dot(p, v)) * 3.5;
  
  // Chladni pattern (Parent 3)
  float n_mode = 3.0 + 1.6*cos(th);
  float m_mode = 4.5 + 1.6*sin(th);
  float chl = chladni(uv, n_mode, m_mode);
  float chlAbs = abs(chl);
  float sand = 0.04 / (chlAbs + 0.04);
  sand = pow(sand, 2.3);
  
  // Fbm ridges (Parent 2)
  float field = fbm(uv + off) + 0.35*fbm(uv*2.1 - off*1.6 + 4.0);
  float rv = sin(field*14.0 - 2.0*th);
  float ridge = abs(rv);
  float line = 0.13 / (ridge*ridge + 0.010);
  float pinchAmt = smoothstep(0.62, 1.05, fbm(uv*1.7 + off));
  
  // Blend palettes: violet amethyst + cyan ridges + gold sand
  vec3 amethyst = pal(hue + 0.02*p.z);
  vec3 cyanRidge = vec3(0.25, 0.95, 0.85);
  vec3 magenta = vec3(1.0, 0.22, 0.55);
  vec3 gold = vec3(1.0, 0.85, 0.52);
  
  vec3 col = amethyst * 0.3;
  col += gold * sand * 0.8;
  col += mix(cyanRidge, magenta, pinchAmt) * line * 0.4;
  
  return col;
}

void main(){
  vec2 uv = (2.0*gl_FragCoord.xy - RENDERSIZE.xy) / RENDERSIZE.y;

  float ph = fract(TIME * speed / PERIOD);
  float th = TAU * ph;

  mat3 spin = rotY(th);

  vec3 ro = spin * vec3(0.0, 0.45, 2.35);
  vec3 ta = vec3(0.0, 0.62, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0,1,0), fw));
  vec3 up = cross(fw, rt);
  vec3 rd = normalize(uv.x*rt + uv.y*up + 2.0*fw);

  // fbm orbiting offset (Parent 2 motion)
  vec2 off = 0.42*vec2(cos(th), sin(th));

  float t = 0.0;
  float glow = 0.0;
  bool hit = false;
  for(int i = 0; i < 90; i++){
    vec3 p = ro + rd*t;
    float d = map(p);
    glow += glowAmt * 0.012 / (1.0 + 28.0*d*d);
    if(d < 0.0006*t){ hit = true; break; }
    t += d*0.8;
    if(t > 8.0) break;
  }

  vec3 col = vec3(0.0);
  vec3 bg = mix(vec3(0.02,0.015,0.045), vec3(0.005,0.005,0.02), uv.y*0.5+0.5);
  col = bg;

  if(hit){
    vec3 p = ro + rd*t;
    vec3 n = normal(p);
    float fres = pow(1.0 - max(0.0, dot(n, -rd)), 3.0);
    
    // Surface texture from blended parents
    vec3 surfCol = surfaceTex(p, n, th, off);
    
    // Fresnel edge: amethyst + iridescence
    float iridShift = irid * (0.5 + 0.5*sin(p.z*8.0 + th*3.0));
    vec3 fresCol = pal(hue + iridShift);
    vec3 edgeCol = mix(pal(hue), fresCol, fres) * fres * 2.0;
    
    // Inner glow (violet)
    vec3 innerGlow = pal(hue + 0.05) * 0.15;
    
    col = surfCol + innerGlow + edgeCol;
  }

  // Volumetric glow from Parent 1
  vec3 glowCol = pal(hue + 0.1) * glow;
  col += glowCol;

  col = col / (1.0 + col);
  col = pow(col, vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}