/*{
  "DESCRIPTION": "Chemical clock — Belousov-Zhabotinsky spiral and target waves spreading from pacemakers and annihilating where they collide.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "freq",  "TYPE": "float", "DEFAULT": 26.0, "MIN": 6.0, "MAX": 44.0 },
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 0.85, "MIN": 0.4, "MAX": 2.5 },
    { "NAME": "tox",   "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

vec2 src(int i, float t){
  float fi = float(i);
  return vec2(sin(t * 0.13 + fi * 1.7) * 0.7, cos(t * 0.11 + fi * 2.3) * 0.7);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * scale;
  float t = TIME * speed;

  // assign each pixel to its NEAREST pacemaker (Voronoi domain), render that source's spiral wave
  float r1 = 1e9, r2 = 1e9, wave1 = 0.0, rNear = 0.0;
  for (int i = 0; i < 6; i++){
    float fi = float(i);
    vec2 d = p - src(i, t);
    float r = length(d);
    if (r < r1){
      r2 = r1; r1 = r;
      float a = atan(d.y, d.x);
      float arm = (mod(fi, 2.0) < 0.5 ? 1.0 : -1.0) * mod(fi, 3.0);   // mix of targets (0) + spirals (±1,±2)
      wave1 = 0.5 + 0.5 * sin(r * freq - t * (3.0 + 0.25 * fi) + arm * a + fi * 1.3);
      rNear = r;
    } else if (r < r2){ r2 = r; }
  }

  float wall = smoothstep(0.0, 0.05, r2 - r1);     // Voronoi collision fronts
  float bands = wave1;
  float closest = rNear;

  vec3 dark  = vec3(0.02, 0.06, 0.0);
  vec3 green = mix(vec3(0.12, 0.55, 0.03), vec3(0.06, 0.45, 0.3), tox);
  vec3 acid  = mix(vec3(0.85, 1.0, 0.2), vec3(0.5, 1.0, 0.55), tox);
  // crisp concentric wave bands
  vec3 col = mix(dark, green, smoothstep(0.32, 0.55, bands));
  col = mix(col, acid, smoothstep(0.62, 0.88, bands));
  col += acid * pow(max(0.0, bands), 8.0) * 0.5;   // bright leading wavefronts
  col *= 0.22 + 0.78 * wall;                       // dark annihilation lines
  col += acid * 0.5 * exp(-closest * closest * 30.0);   // glowing pacemaker cores

  col *= 1.0 - 0.3 * dot(uv, uv);
  col = pow(max(col, 0.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
