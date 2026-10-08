/*{
  "DESCRIPTION": "Marbled endpaper — golden ebru veins raked and combed through a slow flow, the way ink swirls on water.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 2.6, "MIN": 1.0, "MAX": 5.0 },
    { "NAME": "comb",  "TYPE": "float", "DEFAULT": 0.45, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "flow",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.5 },
    { "NAME": "warm",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 5; i++){ s += a * noise(p); p = p * 2.02 + 5.0; a *= 0.5; } return s; }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * scale;
  float t = TIME * 0.05 * flow;

  // base swirl drift of the size (the ink floating on the bath)
  vec2 q = p + 0.3 * vec2(fbm(p * 0.6 + t), fbm(p * 0.6 + vec2(3.1, 1.7) - t));

  // marbling rakes: drag the coordinate in alternating directions (get-gel comb)
  q.x += comb * sin(q.y * 2.6 + fbm(q * 0.5 + t) * 5.0);
  q.y += comb * 0.8 * sin(q.x * 2.2 - fbm(q * 0.6 - t) * 5.0);
  // fine nonpareil comb
  q.x += comb * 0.18 * sin(q.y * 11.0);
  q.y += comb * 0.14 * sin(q.x * 13.0);

  // marbled veins follow the combed flow (two layered band scales -> nonpareil threads)
  float vein = fbm(q * 1.2);
  float band = 0.5 + 0.5 * sin(vein * 7.0 + q.x * 1.2 + q.y * 0.6);
  float fine = 0.5 + 0.5 * sin(vein * 22.0 + q.y * 5.0);    // fine combed threads
  float ridge = 1.0 - abs(2.0 * band - 1.0);
  float thread = pow(1.0 - abs(2.0 * fine - 1.0), 3.0);

  vec3 dark  = vec3(0.07, 0.035, 0.0);
  vec3 gold  = mix(vec3(0.78, 0.46, 0.12), vec3(0.88, 0.62, 0.2), warm);
  vec3 cream = vec3(1.0, 0.92, 0.66);

  vec3 col = mix(dark, gold, band);
  col = mix(col, cream, pow(ridge, 3.0) * 0.85);        // pale combed veins
  col += cream * thread * 0.35 * band;                  // fine nonpareil threads
  col += cream * pow(ridge, 9.0) * 0.5;                 // bright sheen on the finest threads

  col *= 1.0 - 0.25 * dot(uv, uv);
  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
