/*{
  "DESCRIPTION": "Seahorse valley — a slow meditative breath into a Mandelbrot spiral, its filaments traced in glowing neon.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "zoom",  "TYPE": "float", "DEFAULT": 0.008, "MIN": 0.002, "MAX": 0.1 },
    { "NAME": "swirl", "TYPE": "float", "DEFAULT": 0.06, "MIN": 0.0, "MAX": 0.4 },
    { "NAME": "hue",   "TYPE": "float", "DEFAULT": 0.55, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.7, "MIN": 0.0, "MAX": 1.5 }
  ]
}*/

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }
vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67) + hue)); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;

  vec2 center = vec2(-0.74364388703, 0.13182590421);     // a seahorse-valley spiral
  float z0 = zoom * exp(0.6 * sin(TIME * 0.08));          // slow breathing zoom
  vec2 c = center + (rot(TIME * swirl) * uv) * z0;

  vec2 z = vec2(0.0);
  float it = 0.0, m = 0.0;
  for (int i = 0; i < 240; i++){
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m = dot(z, z);
    if (m > 256.0) break;
    it += 1.0;
  }

  vec3 col;
  if (m > 256.0){
    float sm = it - log2(log2(m)) + 4.0;                  // smooth escape
    float edge = smoothstep(2.0, 28.0, sm);               // dark fast-escape, glowing deep boundary
    float band = 0.5 + 0.5 * sin(0.4 * sm);               // concentric filament bands
    vec3 c = pal(0.012 * sm + 0.04 * TIME);               // slow, cohesive neon hue
    col = c * edge * (0.35 + 0.8 * band);
    col += pal(0.012 * sm + 0.5) * pow(band, 6.0) * edge * glow * 0.8;   // glowing filament crests
  } else {
    col = vec3(0.0, 0.004, 0.012);                        // interior
  }

  col *= 1.0 - 0.25 * dot(uv, uv);
  col = col / (1.0 + 0.4 * col);
  col = pow(max(col, 0.0), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
