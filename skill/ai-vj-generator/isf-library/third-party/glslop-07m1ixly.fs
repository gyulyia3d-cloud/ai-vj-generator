/*{
  "DESCRIPTION": "A cluster of smooth-blended glass gems orbiting a dark nucleus, shaded with thin-film iridescence: hue is driven by the view-normal grazing angle (fresnel), not by density, so it stays vivid instead of muddying into grey. A closest-ray-approach halo lights the void even off the geometry. Camera is fixed; an integer number of full turns per loop keeps the rotation exactly seamless.",
  "CREDIT": "glslop agent (Claude)",
  "CATEGORIES": ["raymarching", "sdf", "csg", "iridescent", "thin-film", "seamless-loop"],
  "INPUTS": [
    { "NAME": "turns",       "TYPE": "float", "DEFAULT": 1.0,  "MIN": 1.0, "MAX": 3.0 },
    { "NAME": "spread",      "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.6, "MAX": 1.6 },
    { "NAME": "iridescence", "TYPE": "float", "DEFAULT": 1.1,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "coreColor",   "TYPE": "color", "DEFAULT": [0.07, 0.08, 0.13, 1.0] },
    { "NAME": "filmTint",    "TYPE": "color", "DEFAULT": [0.25, 0.55, 1.0, 1.0] },
    { "NAME": "haloGlow",    "TYPE": "float", "DEFAULT": 0.8,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "exposure",    "TYPE": "float", "DEFAULT": 1.3,  "MIN": 0.6, "MAX": 2.0 }
  ]
}*/

#define PI 3.14159265359
#define TAU 6.28318530718
#define PERIOD 6.0
#define NUM_GEMS 6

float sdSphere(vec3 p, float r){ return length(p) - r; }

float smin(float a, float b, float k){
  float h = clamp(0.5 + 0.5*(b - a)/k, 0.0, 1.0);
  return mix(b, a, h) - k*h*(1.0 - h);
}

// Everything here is a function of `ang` only (never raw TIME), and ang wraps
// by an exact integer multiple of TAU every PERIOD seconds -- so the whole
// scene state repeats exactly and the render loops seamlessly.
float map(vec3 p, float ang){
  float d = sdSphere(p, 0.40 + 0.03*sin(ang));

  for (int i = 0; i < NUM_GEMS; i++){
    float fi = float(i);
    float a = fi * (TAU / float(NUM_GEMS)) + ang;
    float orbitR = spread * (0.80 + 0.18*sin(fi*2.1));
    vec3 c = vec3(cos(a)*orbitR, 0.26*sin(a*1.5), sin(a)*orbitR);
    float r = 0.15 + 0.045*sin(fi*3.3 + ang);
    d = smin(d, sdSphere(p - c, r), 0.32);
  }
  return d;
}

vec3 normalAt(vec3 p, float ang){
  vec2 e = vec2(0.0015, 0.0);
  return normalize(vec3(
    map(p + e.xyy, ang) - map(p - e.xyy, ang),
    map(p + e.yxy, ang) - map(p - e.yxy, ang),
    map(p + e.yyx, ang) - map(p - e.yyx, ang)));
}

float softShadow(vec3 ro, vec3 rd, float ang, float maxT){
  float res = 1.0, t = 0.03;
  for (int i = 0; i < 24; i++){
    float h = map(ro + rd*t, ang);
    res = min(res, 10.0*h/t);
    t += clamp(h, 0.01, 0.2);
    if (res < 0.02 || t > maxT) break;
  }
  return clamp(res, 0.0, 1.0);
}

float ambientOcclusion(vec3 p, vec3 n, float ang){
  float occ = 0.0, sc = 1.0;
  for (int i = 1; i <= 5; i++){
    float h = 0.02 + 0.06*float(i);
    occ += (h - map(p + n*h, ang)) * sc;
    sc *= 0.6;
  }
  return clamp(1.0 - 1.7*occ, 0.0, 1.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy) / RENDERSIZE.y;

  float nTurns = floor(turns + 0.5);
  float ph = fract(TIME / PERIOD);
  float ang = nTurns * TAU * ph;

  // Fixed camera -- the object spins, not the eye, so the loop lives entirely
  // in `ang` and nothing about the camera path needs to be periodic.
  vec3 ro = vec3(0.0, 0.55, 3.4);
  vec3 ta = vec3(0.0, 0.0, 0.0);
  vec3 fw = normalize(ta - ro);
  vec3 rt = normalize(cross(fw, vec3(0.0, 1.0, 0.0)));
  vec3 up = cross(rt, fw);
  vec3 rd = normalize(fw*1.7 + rt*uv.x + up*uv.y);

  float t = 0.0; float hit = -1.0;
  for (int i = 0; i < 96; i++){
    float d = map(ro + rd*t, ang);
    if (d < 0.0008*max(1.0, t)){ hit = t; break; }
    t += d*0.55;
    if (t > 12.0) break;
  }

  // Closest approach of the ray to the origin -- gives a soft halo even where
  // the ray misses all geometry, so the void around the cluster isn't flat black.
  float tc = clamp(dot(-ro, rd), 0.0, 12.0);
  vec3 closest = ro + rd*tc;
  float haloD = length(closest);
  vec3 filmCol = filmTint.rgb;

  vec3 bg = mix(vec3(0.012, 0.014, 0.022), vec3(0.0), clamp(length(uv), 0.0, 1.0));
  bg += filmCol * haloGlow * exp(-haloD*haloD*2.2) * 0.5;

  vec3 col = bg;

  if (hit > 0.0){
    vec3 p = ro + rd*hit;
    vec3 n = normalAt(p, ang);
    vec3 v = -rd;
    float ao = ambientOcclusion(p, n, ang);

    vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
    float sh = softShadow(p + n*0.02, lightDir, ang, 3.0);
    float ndl = max(dot(n, lightDir), 0.0);
    float ndv = max(dot(n, v), 0.0);
    float fres = pow(1.0 - ndv, 3.0);

    vec3 base = coreColor.rgb;
    // Thin-film iridescence: hue keyed to the fresnel angle, not to any density
    // field, so it stays saturated at grazing angles instead of collapsing to mud.
    // A lower exponent than a "true" fresnel spreads the film across most of the
    // sphere instead of a knife-edge rim, so the colour actually reads.
    float film = pow(1.0 - ndv, 2.0);
    vec3 irid = 0.5 + 0.5*cos(TAU*(film*1.4 + iridescence*0.15 + vec3(0.0, 0.33, 0.67)));
    vec3 h = normalize(lightDir + v);
    float spec = pow(max(dot(n, h), 0.0), 48.0);

    vec3 surf = base * (0.5 + 0.85*ndl*sh) * ao;
    surf += mix(base, filmCol, 0.35) * 0.30 * ao;
    surf += irid * film * iridescence * (0.7 + 0.3*ao);
    surf += vec3(1.0) * spec * sh * 0.9;
    surf += filmCol * fres * 0.30 * ao;
    surf *= exp(-0.05*hit);

    col = surf;
  }

  col = col / (1.0 + 0.6*col);
  col = pow(max(col, 0.0), vec3(0.9)) * exposure;
  gl_FragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}
