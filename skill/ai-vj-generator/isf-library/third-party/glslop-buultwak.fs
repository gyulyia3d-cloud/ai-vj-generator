/*{
  "DESCRIPTION": "Newton's basins — the fractal frontier where Newton's method on z^3-1 can't decide which root it falls to, writhing in electric neon.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "zoom",  "TYPE": "float", "DEFAULT": 1.6, "MIN": 0.6, "MAX": 4.0 },
    { "NAME": "relax", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.8, "MIN": 0.2, "MAX": 1.6 },
    { "NAME": "hue",   "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

vec2 cmul(vec2 a, vec2 b){ return vec2(a.x * b.x - a.y * b.y, a.x * b.y + a.y * b.x); }
vec2 cdiv(vec2 a, vec2 b){ float d = dot(b, b) + 1e-9; return vec2(dot(a, b), a.y * b.x - a.x * b.y) / d; }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67) + hue)); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 z = uv * zoom;

  vec2 a = vec2(1.0, 0.0) + relax * 0.35 * vec2(cos(TIME * 0.3), sin(TIME * 0.3));   // animated complex relaxation

  float it = 0.0;
  for (int i = 0; i < 64; i++){
    vec2 z2 = cmul(z, z);
    vec2 f = cmul(z2, z) - vec2(1.0, 0.0);     // z^3 - 1
    vec2 fp = 3.0 * z2;
    z -= cmul(a, cdiv(f, fp));
    it += 1.0;
    if (dot(f, f) < 1e-6) break;
  }

  // which of the 3 cube roots did it land on
  vec2 r0 = vec2(1.0, 0.0), r1 = vec2(-0.5, 0.8660254), r2 = vec2(-0.5, -0.8660254);
  float d0 = length(z - r0), d1 = length(z - r1), d2 = length(z - r2);
  float root = d0 < d1 ? (d0 < d2 ? 0.0 : 2.0) : (d1 < d2 ? 1.0 : 2.0);

  float shade = it / 64.0;                       // slow convergence = near a basin boundary
  vec3 basin = pal(root / 3.0);

  // animated contour bands flowing toward the roots -> electric current in the basins
  float band = 0.5 + 0.5 * sin(it * 0.7 - TIME * 1.2);
  float frontier = smoothstep(0.1, 0.45, shade);

  vec3 col = basin * (0.10 + 0.4 * band) * (1.0 - 0.6 * shade);   // dark basins with flowing contours
  col += pal(root / 3.0 + 0.5) * frontier * (0.7 + glow) * 1.4;   // bright neon fractal frontier
  col += vec3(1.0) * pow(frontier, 4.0) * 0.7 * glow;             // white-hot filigree on the edge

  col *= 1.0 - 0.28 * dot(uv, uv);
  col = col / (1.0 + 0.4 * col);
  col = pow(max(col, 0.0), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
