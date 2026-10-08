/*{
  "DESCRIPTION": "Burning Ship — a slow breathing dive into the angular masts of the burning-ship fractal, glowing like wreckage adrift in space.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "zoom",  "TYPE": "float", "DEFAULT": 0.42, "MIN": 0.02, "MAX": 1.0 },
    { "NAME": "warmth","TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.7, "MIN": 0.0, "MAX": 1.5 },
    { "NAME": "stars", "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }

vec3 fire(float h){
  h = clamp(h, 0.0, 1.0);
  vec3 c = mix(vec3(0.04, 0.0, 0.02), vec3(0.6, 0.06, 0.02), smoothstep(0.0, 0.3, h));
  c = mix(c, vec3(1.0, 0.32, 0.0), smoothstep(0.3, 0.58, h));
  c = mix(c, vec3(1.0, 0.8, 0.25), smoothstep(0.58, 0.82, h));
  c = mix(c, vec3(1.0, 1.0, 0.9), smoothstep(0.82, 1.0, h));
  return c;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;

  vec2 center = vec2(-1.762, -0.035);
  float z0 = zoom * (0.88 + 0.18 * sin(TIME * 0.12));       // gentle breathing, ship stays framed
  vec2 c = center + uv * z0 + vec2(0.01 * sin(TIME * 0.06), 0.006 * cos(TIME * 0.05));

  vec2 z = vec2(0.0);
  float it = 0.0, m = 0.0, trap = 1e9;
  for (int i = 0; i < 170; i++){
    z = abs(z);
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    m = dot(z, z);
    trap = min(trap, m);
    if (m > 256.0) break;
    it += 1.0;
  }

  vec3 col;
  if (m > 256.0){
    float sm = it - log2(log2(m)) + 4.0;
    float edge = smoothstep(2.0, 45.0, sm);              // deep space = 0, boundary filaments = 1
    float v = fract(sm * 0.045 + 0.04 * TIME);
    col = fire(v) * edge * (0.6 + 0.8 * glow);
    col += fire(0.92) * glow * 0.55 * exp(-trap * 4.0) * edge;   // hot orbit-trap filaments
  } else {
    // interior hull: near-black with a faint ember rim glow
    col = vec3(0.015, 0.006, 0.01) + fire(0.55) * 0.3 * exp(-trap * 6.0) * glow;
  }

  // cosmic starfield
  float st = hash(floor(gl_FragCoord.xy * 0.9));
  col += smoothstep(0.992, 1.0, st) * (0.5 + 0.5 * sin(TIME * 3.0 + st * 40.0)) * stars * vec3(1.0, 0.9, 0.8);

  col = mix(col, col * vec3(1.0, 0.95, 1.05), 0.0);
  col = pow(max(col, 0.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
