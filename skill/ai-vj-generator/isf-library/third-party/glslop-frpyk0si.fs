/*{
  "DESCRIPTION": "Moiré lens — interfering radial gratings seen through a warping glass bulge, beating in neon.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "freq", "TYPE": "float", "DEFAULT": 34.0, "MIN": 8.0, "MAX": 80.0 },
    { "NAME": "warp", "TYPE": "float", "DEFAULT": 1.4, "MIN": 0.0, "MAX": 4.0 },
    { "NAME": "spin", "TYPE": "float", "DEFAULT": 0.12, "MIN": 0.0, "MAX": 0.6 },
    { "NAME": "hue",  "TYPE": "float", "DEFAULT": 0.62, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 palette(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67) + hue)); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  float r = length(uv);

  // lens bulge — looking through a blob of warped glass
  vec2 p = uv / (1.0 + warp * r * r);
  float r2 = length(p);
  float a2 = atan(p.y, p.x);
  float t = TIME;

  // frequency eases down with radius so the rim doesn't alias into dirty speckle
  float fs = freq / (1.0 + 1.3 * r2 * r2);

  float gA = sin(r2 * fs - t * 1.5);
  float gB = sin(a2 * freq * 0.5 + r2 * fs * 0.7 + t);
  vec2  q  = p * rot(t * spin);
  float gC = sin(q.x * fs * 1.1 + sin(q.y * fs * 0.6));

  float m = 0.5 * gA * gB + 0.5 * gB * gC;       // ~[-1,1]

  // high-contrast neon op-art: near-black field, only the moiré fringes glow
  float edge = pow(1.0 - abs(m), 6.0);                       // thin bright zero-crossings
  float band = pow(0.5 + 0.5 * m, 3.0);                      // soft colored bands
  float ah = a2 / 6.28318;                                   // angle -> spectral spread
  vec3 col = palette(0.30 * r2 + 0.5 * ah - 0.04 * t) * band * 0.6;
  col += edge * palette(0.5 + 0.5 * ah + 0.2 * r2) * 1.3;    // neon fringe lines, rainbow by angle

  // glowing lens core -> strong focal point
  col += palette(0.15 + 0.08 * t) * 1.0 * exp(-r2 * r2 * 40.0);

  col *= 1.0 - 0.55 * r * r;                                 // deeper vignette
  col = col / (1.0 + 0.45 * col);
  col = pow(max(col, 0.0), vec3(0.82));
  gl_FragColor = vec4(col, 1.0);
}
