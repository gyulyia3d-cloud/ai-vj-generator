/*{
  "DESCRIPTION": "Coral bloom — Turing-pattern labyrinth rendered as fleshy 3D relief, slowly growing in sunset tones.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "scale",  "TYPE": "float", "DEFAULT": 5.2, "MIN": 1.5, "MAX": 9.0 },
    { "NAME": "morph",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "relief", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.2, "MAX": 2.0 },
    { "NAME": "warm",   "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
float fbm(vec2 p){ float s = 0.0, a = 0.5; for (int i = 0; i < 4; i++){ s += a * noise(p); p = p * 2.0 + 7.0; a *= 0.5; } return s; }

// smooth band-passed field -> clean Turing labyrinth height (rounded coral lobes)
float H(vec2 p){
  return noise(p) - noise(p * 1.7 + 9.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * scale + vec2(0.0, TIME * 0.04 * morph);
  p += 0.25 * vec2(sin(TIME * 0.09 * morph), cos(TIME * 0.07 * morph));   // slow growth

  float f = H(p);

  // 3D relief from the height gradient + fine coral micro-bumps
  vec2 e = vec2(0.02, 0.0);
  float micro = (noise(p * 7.0) - 0.5) * 0.12;
  float fx = (H(p + e.xy) - H(p - e.xy)) + (noise((p + e.xy) * 7.0) - noise((p - e.xy) * 7.0)) * 0.18;
  float fy = (H(p + e.yx) - H(p - e.yx)) + (noise((p + e.yx) * 7.0) - noise((p - e.yx) * 7.0)) * 0.18;
  vec3 n = normalize(vec3(-fx * relief * 2.2, -fy * relief * 2.2, 0.06));
  vec3 ld = normalize(vec3(0.5, 0.65, 0.7));
  float diff = 0.35 + 0.75 * max(0.0, dot(n, ld));
  float spec = pow(max(0.0, dot(reflect(-ld, n), vec3(0.0, 0.0, 1.0))), 24.0);

  float lobe = smoothstep(-0.05, 0.03, f + micro);   // crisp fleshy lobes (wider coverage)
  float groove = smoothstep(0.025, -0.015, abs(f));  // valleys between lobes

  vec3 deep  = vec3(0.20, 0.05, 0.16);               // warm purple subsurface
  vec3 red   = vec3(0.80, 0.17, 0.15);
  vec3 orange= vec3(0.98, 0.48, 0.22);
  vec3 peach = vec3(1.0, 0.85, 0.6);
  vec3 col = mix(deep, red, lobe);
  col = mix(col, orange, smoothstep(-0.02, 0.12, f) * lobe);
  col += deep * 0.4 * groove;                         // faint subsurface glow in the channels
  col = mix(col, peach, spec);                        // glossy highlights on lobe crests
  col *= diff;
  col *= 1.0 - 0.32 * groove;                         // darken the grooves (gently)

  col *= 1.0 - 0.38 * dot(uv, uv);
  col = pow(max(col, 0.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
