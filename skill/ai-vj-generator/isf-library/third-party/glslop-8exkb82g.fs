/*{
  "DESCRIPTION": "Aurora Fold — a folded, flowing field of light. Domain-warped sinusoids run through a kaleidoscopic fold and a soft aurora palette. CC0.",
  "CREDIT": "made with the glslop skill",
  "CATEGORIES": ["generator", "abstract"],
  "INPUTS": [
    { "NAME": "speed",  "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "warp",   "TYPE": "float", "DEFAULT": 1.3, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "folds",  "TYPE": "float", "DEFAULT": 5.0, "MIN": 1.0, "MAX": 10.0 },
    { "NAME": "glow",   "TYPE": "float", "DEFAULT": 0.55, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "tintA",  "TYPE": "color", "DEFAULT": [0.10, 0.85, 0.70, 1.0] },
    { "NAME": "tintB",  "TYPE": "color", "DEFAULT": [0.55, 0.15, 0.95, 1.0] }
  ]
}*/

// Aurora Fold — single-pass ISF / GLSL ES 1.00.
// No #version, writes gl_FragColor, constant loop bounds, no round/tanh/dFdx.

const float PI = 3.14159265359;

// 2x2 rotation
mat2 rot(float a){
  float c = cos(a), s = sin(a);
  return mat2(c, -s, s, c);
}

void main(){
  // aspect-correct, centered coords (-1..1 on the short axis)
  vec2 res = RENDERSIZE;
  vec2 uv = (gl_FragCoord.xy - 0.5 * res) / min(res.x, res.y);

  float t = TIME * speed;

  // kaleidoscopic fold: wrap the angle into 'folds' wedges and mirror it
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  float seg = (2.0 * PI) / max(folds, 1.0);
  a = mod(a, seg);
  a = abs(a - 0.5 * seg);          // mirror within the wedge
  vec2 p = vec2(cos(a), sin(a)) * r;

  // domain warp: a few octaves of swirling sinusoids feeding back on themselves
  vec2 q = p * 3.0;
  float acc = 0.0;
  for (int i = 0; i < 5; i++){
    q = rot(0.5 + 0.21 * float(i) + 0.15 * t) * q;
    q += warp * vec2(
      sin(q.y * 1.7 + t * 1.3),
      cos(q.x * 1.7 - t * 1.1)
    );
    acc += sin(q.x + q.y + t) / float(i + 2);
  }

  // shape the field into glowing filaments
  float field = 0.5 + 0.5 * sin(acc * PI + t);
  float core  = smoothstep(0.05, 0.95, field);
  float fil   = pow(core, mix(0.7, 3.0, glow));         // ribbons, but keep them lit
  float halo  = 0.9 * pow(core, 1.2) / (0.25 + r);      // radial bloom toward center

  // aurora palette: blend the two tints by the field, lift with the bloom
  vec3 base = mix(tintA.rgb, tintB.rgb, field);
  vec3 col  = base * (0.25 + 1.3 * fil);                // ambient floor + lit ribbons
  col += halo * mix(tintA.rgb, tintB.rgb, 0.5);
  col += 0.15 * base;                                   // keep some color in the shadows

  // subtle vignette so the edges fall to black
  col *= smoothstep(1.2, 0.15, r);

  // filmic-ish tone map, then a touch of gamma + saturation
  col = col / (col + vec3(0.7));
  col = pow(col, vec3(0.78));
  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, 1.25);                      // boost saturation

  gl_FragColor = vec4(col, 1.0);
}
