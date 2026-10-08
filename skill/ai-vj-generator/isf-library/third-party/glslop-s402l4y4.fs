/*{
  "DESCRIPTION": "Spectral liquid matrix rain with orbiting catalysts and flowing glyphs",
  "CATEGORIES": ["generative"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.05, "MAX": 2.0 },
    { "NAME": "columns", "TYPE": "float", "DEFAULT": 50.0, "MIN": 15.0, "MAX": 100.0 },
    { "NAME": "warp", "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "ripples", "TYPE": "float", "DEFAULT": 0.8, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "catalyst", "TYPE": "float", "DEFAULT": 0.7, "MIN": 0.0, "MAX": 1.5 },
    { "NAME": "hue", "TYPE": "float", "DEFAULT": 0.3, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "brightness", "TYPE": "float", "DEFAULT": 1.5, "MIN": 0.5, "MAX": 5.0 }
  ]
}*/

#define TAU 6.28318530718

float hash11(float n) {
  return fract(sin(n * 91.7) * 43758.5453);
}

float hash21(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = hash21(i);
  float b = hash21(i + vec2(1.0, 0.0));
  float c = hash21(i + vec2(0.0, 1.0));
  float d = hash21(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 5; i++) {
    v += noise(p) * a;
    p *= 2.0;
    a *= 0.5;
  }
  return v;
}

// Blended palette from all 3 parents
vec3 palette(float t) {
  vec3 p1 = 0.5 + 0.5 * cos(TAU * (t + 0.56 + vec3(0.0, 0.19, 0.43)));
  vec3 p2 = 0.5 + 0.5 * cos(TAU * (t + vec3(0.0, 0.33, 0.66)));
  vec3 p3 = 0.5 + 0.5 * cos(TAU * t + vec3(0.0, 2.0, 4.0) + hue * TAU);
  return (p1 + p2 + p3) / 3.0;
}

// glyph from parent 2
float glyph(vec2 p, float seed) {
  p = floor(p * 6.0);
  float pattern = fract(sin(seed + p.x * 12.3 + p.y * 45.7) * 43758.0);
  float v = 0.0;
  if (pattern > 0.42) v = 1.0;
  if (mod(p.x + p.y, 3.0) < 1.0 && pattern < 0.75) v *= 0.3;
  return v;
}

// orbiting catalyst centers from parent 1
vec3 catalystField(vec2 uv, float t) {
  vec2 oA = vec2(0.5 + 0.30 * cos(t * 0.29), 0.5 + 0.22 * sin(t * 0.43));
  vec2 oB = vec2(0.5 + 0.23 * cos(t * 0.21 + 3.14), 0.5 + 0.30 * sin(t * 0.37 + 1.3));
  vec2 oC = vec2(0.5 + 0.18 * sin(t * 0.61 + 0.8), 0.5 + 0.28 * cos(t * 0.33 - 0.6));
  float pulseA = 0.45 + 0.55 * sin(t * 2.2);
  float pulseB = 0.50 + 0.50 * sin(t * 1.63 + 2.1);
  float pulseC = 0.50 + 0.50 * sin(t * 2.85 + 4.0);
  float dA = length(uv - oA);
  float dB = length(uv - oB);
  float dC = length(uv - oC);
  float field = exp(-dA * 30.0) * pulseA + exp(-dB * 35.0) * pulseB + exp(-dC * 40.0) * pulseC;
  return vec3(field, dA, dB); // we can use distances for coloring too
}

void main() {
  vec2 uv = isf_FragNormCoord;
  vec2 p = uv - 0.5;
  p.x *= RENDERSIZE.x / RENDERSIZE.y;
  
  float t = TIME * speed * 0.15;
  
  // liquid flow from parent 3
  vec2 flow;
  flow.x = fbm(uv * 1.8 + t);
  flow.y = fbm(uv * 1.8 - t);
  vec2 warpedUV = uv + (flow - 0.5) * warp;
  
  // catalyst field from parent 1
  float cat = catalystField(warpedUV, TIME).x * catalyst;
  
  // ripple field from parent 3, modulated by catalyst
  float ripple = sin(length(p) * 8.0 - t * 3.0 + fbm(p * 2.5) * 5.0 + cat * 3.0);
  ripple *= 0.15 * ripples;
  
  float liquid = fbm(p * 3.0 + ripple);
  liquid = smoothstep(0.15, 0.85, liquid);
  
  // matrix rain structure from parent 2
  float id = floor(warpedUV.x * columns);
  float seed = hash11(id);
  float offset = seed * 10.0;
  float fall = fract(TIME * speed * (0.2 + seed) + offset);
  float rows = 22.0;
  float row = floor(warpedUV.y * rows);
  vec2 cell;
  cell.x = fract(warpedUV.x * columns);
  cell.y = fract(warpedUV.y * rows);
  float ch = glyph(cell, seed + row * 3.1 + cat * 10.0);
  float position = fract(row / rows + fall + cat * 0.3);
  float trail = smoothstep(1.0, 0.05, position);
  float leader = smoothstep(0.03, 0.0, abs(position));
  
  // blend liquid and matrix
  vec3 col = palette(liquid + id / columns + TIME * 0.03);
  
  col *= ch * trail * brightness;
  col += leader * palette(id / columns + TIME * 0.05) * 3.0;
  
  // catalyst glow
  col += cat * palette(TIME * 0.1) * 0.5;
  
  // glossy highlights from parent 3
  col += pow(liquid, 5.0) * 0.25;
  
  gl_FragColor = vec4(col, 1.0);
}