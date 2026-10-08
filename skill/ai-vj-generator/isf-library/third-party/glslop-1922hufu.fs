/*{
  "DESCRIPTION": "Golden orb — a Fibonacci sphere of glowing dots, slowly turning so its lattice shimmers with moiré.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "count", "TYPE": "float", "DEFAULT": 330.0, "MIN": 100.0, "MAX": 600.0 },
    { "NAME": "spin",  "TYPE": "float", "DEFAULT": 0.3, "MIN": 0.0, "MAX": 1.2 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.6, "MIN": 0.1, "MAX": 1.5 },
    { "NAME": "warm",  "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  float t = TIME;
  const float GA = 2.39996323;
  const float focal = 1.5;

  vec3 amber = mix(vec3(1.0, 0.55, 0.14), vec3(1.0, 0.78, 0.34), warm);
  vec3 L = normalize(vec3(0.45, 0.55, 0.7));            // key light
  vec3 col = vec3(0.02, 0.012, 0.006);                  // faint warm haze
  int N = int(count);
  for (int i = 0; i < 600; i++){
    if (i >= N) break;
    float fi = float(i);
    float y = 1.0 - 2.0 * (fi + 0.5) / count;     // -1..1
    float rad = sqrt(max(0.0, 1.0 - y * y));
    float th = fi * GA;
    vec3 p = vec3(cos(th) * rad, y, sin(th) * rad);

    // rotate the sphere
    p.xz *= rot(t * 0.3 * spin);
    p.yz *= rot(t * 0.22 * spin + 0.4);

    // perspective project (camera down -Z)
    float z = p.z + 3.0;
    vec2 sp = p.xy * focal / z;
    float front = smoothstep(-0.35, 1.0, p.z);           // 0 back .. 1 front

    float d = length(uv - sp);
    float size = 0.023 * focal / z;
    float core = smoothstep(size, size * 0.25, d);
    float halo = exp(-d * d / (size * size * 7.0));

    float lam = 0.42 + 0.65 * max(0.0, dot(normalize(p), L));   // lit like a sphere surface
    float bright = lam * (0.35 + 0.95 * front);
    vec3 c = mix(amber, vec3(1.0, 0.96, 0.84), front * lam);
    col += (core * 1.7 + halo * 0.55) * c * bright * glow;
    col += core * core * front * lam * 0.7 * vec3(1.0, 0.95, 0.85) * glow;   // hot bloom on lit side
  }

  col *= 1.0 - 0.3 * dot(uv, uv);
  col = col / (1.0 + col);
  col = pow(max(col, 0.0), vec3(0.85));
  gl_FragColor = vec4(col, 1.0);
}
