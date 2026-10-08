/*{
  "DESCRIPTION": "Frozen sea — a calm raymarched water plane rippling under a pale ice sky, a single cold sun glinting on the swell.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "ripple", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.2, "MAX": 2.0 },
    { "NAME": "speed",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "sun",    "TYPE": "float", "DEFAULT": 0.7, "MIN": 0.0, "MAX": 1.5 },
    { "NAME": "tint",   "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float waterH(vec2 q, float t){
  float h = 0.0;
  h += 0.06 * sin(q.x * 0.7 + t * 0.5);
  h += 0.04 * sin(q.y * 1.0 - t * 0.4);
  h += 0.03 * sin((q.x + q.y) * 1.3 + t * 0.7);
  h += 0.02 * noise(q * 2.0 + t * 0.2);
  return h * ripple;
}

vec3 sky(vec3 rd, vec3 sunDir){
  float up = clamp(rd.y * 1.5 + 0.2, 0.0, 1.0);
  vec3 horizon = mix(vec3(0.75, 0.85, 0.95), vec3(0.55, 0.7, 0.9), tint);
  vec3 zenith  = vec3(0.18, 0.32, 0.55);
  vec3 c = mix(horizon, zenith, up);
  float s = max(0.0, dot(rd, sunDir));
  c += vec3(1.0, 0.98, 0.92) * smoothstep(0.9986, 0.9992, s) * sun * 1.2;   // small crisp sun disc
  c += vec3(0.95, 0.9, 0.85) * pow(s, 12.0) * 0.18 * sun;        // sun haze
  return c;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  float t = TIME * speed;

  vec3 ro = vec3(0.0, 1.1, t * 0.6);
  vec3 ta = ro + vec3(0.0, -0.18, 1.0);              // look slightly down toward the horizon
  vec3 fwd = normalize(ta - ro);
  vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fwd));
  vec3 up = cross(fwd, rt);
  vec3 rd = normalize(uv.x * rt + uv.y * up + 1.4 * fwd);

  vec3 sunDir = normalize(vec3(0.25, 0.06, 1.0));

  // march the height field
  float tt = 0.0;
  bool hit = false;
  vec3 p;
  for (int i = 0; i < 90; i++){
    p = ro + rd * tt;
    float diff = p.y - waterH(p.xz, t);
    if (diff < 0.01){ hit = true; break; }
    tt += max(diff * 0.4, 0.05);
    if (tt > 70.0) break;
  }

  vec3 col;
  if (hit && rd.y < 0.0){
    vec2 e = vec2(0.05, 0.0);
    float hL = waterH(p.xz - e.xy, t), hR = waterH(p.xz + e.xy, t);
    float hD = waterH(p.xz - e.yx, t), hU = waterH(p.xz + e.yx, t);
    vec3 n = normalize(vec3(hL - hR, 0.5, hD - hU));
    // micro-ripples perturb the normal -> the glint shatters into sparkles
    float micro = exp(-tt * 0.05);                  // fade micro-detail with distance
    n.xz += 0.18 * micro * vec2(noise(p.xz * 22.0 + t), noise(p.xz * 24.0 - t) - 0.5);
    n = normalize(n);
    vec3 refl = reflect(rd, n);
    float fres = 0.04 + 0.96 * pow(1.0 - max(0.0, dot(n, -rd)), 5.0);

    vec3 deep = mix(vec3(0.02, 0.08, 0.16), vec3(0.04, 0.12, 0.2), tint);
    vec3 rcol = sky(refl, sunDir);
    col = mix(deep, rcol, fres);
    col += vec3(1.0, 0.97, 0.9) * pow(max(0.0, dot(refl, sunDir)), 80.0) * sun * 1.4;  // glint + sparkle

    float fog = 1.0 - exp(-tt * 0.045);
    col = mix(col, sky(rd, sunDir), fog);           // distance fog to the horizon
  } else {
    col = sky(rd, sunDir);
  }

  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
