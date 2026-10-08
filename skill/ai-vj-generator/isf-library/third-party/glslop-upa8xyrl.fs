/*{
  "DESCRIPTION": "Neon nebula: domain-warped fractal-noise plasma that flows and curls as glowing electric gas, hot filament cores over deep space. The warp orbits a circle so it loops seamlessly. Real-time, 16s loop.",
  "CREDIT": "glslop agent (Claude); domain-warp technique after Inigo Quilez",
  "CATEGORIES": ["plasma", "nebula", "neon", "noise"],
  "INPUTS": [
    { "NAME": "speed",  "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "glow",   "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.3, "MAX": 3.0 },
    { "NAME": "hue",    "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "warp",   "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 7.0 },
    { "NAME": "zoom",   "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.4, "MAX": 2.5 },
    { "NAME": "swirl",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.5 }
  ]
}*/

#define PI  3.14159265359
#define TAU 6.28318530718

const float PERIOD = 16.0;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

vec3 pal(float t){
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.55, 0.40, 0.18)));   // cyan / magenta / violet
}

float hash(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash(i);
  float b = hash(i + vec2(1.0, 0.0));
  float c = hash(i + vec2(0.0, 1.0));
  float d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){
  float s = 0.0, a = 0.5;
  for (int i = 0; i < 6; i++){
    s += a * noise(p);
    p = rot(0.5) * p * 2.0;            // rotate each octave -> less grid-aligned
    a *= 0.5;
  }
  return s;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;
  vec2 p = uv * (2.6 / zoom);

  float ph = fract(TIME * speed / PERIOD);
  float th = TAU * ph;
  float ct = cos(th), st = sin(th);

  // a slow global swirl + the seamless circular drift of the warp
  p = rot(swirl * 0.4 * sin(th)) * p;

  vec2 q = vec2(fbm(p + vec2(0.0, 0.0)),
                fbm(p + vec2(5.2, 1.3)));
  vec2 r = vec2(fbm(p + warp * q + vec2(1.7 * ct, 9.2 * st) + 0.15),
                fbm(p + warp * q + vec2(8.3 * st, 2.8 * ct) + 0.35));
  float f = fbm(p + warp * r);

  // saturated electric colour; hue swept SPATIALLY by the warp vectors (decoupled
  // from density) -> distinct cyan / magenta / gold regions across the nebula
  vec3 col = pal(hue + 0.55 * q.x + 0.55 * r.y + 0.30 * f);

  // punch up saturation so the gas glows electric rather than painterly
  col = mix(vec3(dot(col, vec3(0.3, 0.59, 0.11))), col, 1.45);
  col = clamp(col, 0.0, 1.0);

  // density: deep-space black in the voids, bright only in the dense filaments
  float dens = smoothstep(0.22, 0.92, f);
  col *= dens * dens * 2.6 * glow;
  // hot cores: white-hot centre with a coloured halo
  col += pal(hue + 0.5) * pow(dens, 4.0) * 1.4 * glow;
  col += vec3(1.0) * pow(dens, 9.0) * 1.2 * glow;

  // tone map + gentle vignette
  col = col / (1.0 + col);
  col = pow(col, vec3(0.72));
  col *= 1.0 - 0.20 * dot(uv, uv);

  gl_FragColor = vec4(col, 1.0);
}
