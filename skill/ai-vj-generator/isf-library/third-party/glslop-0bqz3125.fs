/*{
  "DESCRIPTION": "Quasicrystal — plane waves summed across symmetric axes into an aperiodic n-fold tiling, slowly phasing through jewel light.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "sym",   "TYPE": "float", "DEFAULT": 7.0, "MIN": 3.0, "MAX": 12.0 },
    { "NAME": "freq",  "TYPE": "float", "DEFAULT": 52.0, "MIN": 6.0, "MAX": 90.0 },
    { "NAME": "sharp", "TYPE": "float", "DEFAULT": 2.6, "MIN": 0.6, "MAX": 4.0 },
    { "NAME": "hue",   "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

#define PI 3.14159265
vec3 pal(float t){ return 0.5 + 0.5 * cos(2.0 * PI * (t + vec3(0.0, 0.33, 0.67) + hue)); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * freq;
  float t = TIME;

  int N = int(sym);
  float v = 0.0;
  for (int k = 0; k < 12; k++){
    if (k >= N) break;
    float a = PI * float(k) / float(N);
    vec2 d = vec2(cos(a), sin(a));
    v += cos(dot(p, d) + t * 0.3 + float(k) * 0.7);     // each wave drifts -> morphing crystal
  }
  v /= float(N);                                         // ~[-1,1]

  float q = 0.5 + 0.5 * v;
  // sharpen the quasiperiodic cells into bright facets
  float facet = pow(q, sharp);
  float edge = pow(1.0 - abs(v), 6.0);                   // bright veins at the zero-set

  vec3 jewel = pal(0.5 * v + 0.35 * length(uv) + 0.05 * t);   // varied gem tones across the tiling
  vec3 col = jewel * facet * 1.2;
  col *= smoothstep(-0.05, 0.4, q);                           // deepen the dark cells
  col += pal(0.5 * v + 0.6 + 0.2 * length(uv)) * edge * 1.3;   // bright glowing jewel veins
  col += vec3(1.0) * pow(facet, 5.0) * 0.55;                  // hot facet cores

  col *= 1.0 - 0.3 * dot(uv, uv);
  col = col / (1.0 + 0.4 * col);
  col = pow(max(col, 0.0), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
