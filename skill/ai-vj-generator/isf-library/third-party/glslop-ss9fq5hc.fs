/*{
  "DESCRIPTION": "Cooling crust — dark basalt plates drifting apart over molten cracks that glow from within, like a lava lake skinning over.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 5.0, "MIN": 2.0, "MAX": 11.0 },
    { "NAME": "heat",  "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.3, "MAX": 2.0 },
    { "NAME": "crack", "TYPE": "float", "DEFAULT": 0.09, "MIN": 0.03, "MAX": 0.2 },
    { "NAME": "drift", "TYPE": "float", "DEFAULT": 0.4, "MIN": 0.0, "MAX": 1.5 }
  ]
}*/

vec2 hash2(vec2 p){ p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3))); return fract(sin(p) * 43758.5453); }
float hash(vec2 p){ p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p){
  vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
  float a = hash(i), b = hash(i + vec2(1.0, 0.0)), c = hash(i + vec2(0.0, 1.0)), d = hash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
vec3 fire(float h){
  h = clamp(h, 0.0, 1.0);
  vec3 c = mix(vec3(0.4, 0.02, 0.0), vec3(1.0, 0.3, 0.0), smoothstep(0.0, 0.45, h));
  c = mix(c, vec3(1.0, 0.78, 0.2), smoothstep(0.45, 0.8, h));
  c = mix(c, vec3(1.0, 1.0, 0.9), smoothstep(0.8, 1.0, h));
  return c;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * scale;
  vec2 ip = floor(p), fp = fract(p);
  float t = TIME * drift;

  float f1 = 9.0, f2 = 9.0;
  vec2 nearId = vec2(0.0);
  for (int y = -1; y <= 1; y++){
    for (int x = -1; x <= 1; x++){
      vec2 g = vec2(float(x), float(y));
      vec2 o = hash2(ip + g);
      o = 0.5 + 0.35 * sin(t * 0.7 + 6.2831 * o);     // plates drift slowly
      vec2 r = g + o - fp;
      float d = dot(r, r);
      if (d < f1){ f2 = f1; f1 = d; nearId = ip + g; }
      else if (d < f2){ f2 = d; }
    }
  }
  f1 = sqrt(f1); f2 = sqrt(f2);
  float border = f2 - f1;                              // distance to the crack between plates

  float crackMask = smoothstep(crack, 0.0, border);    // 1 inside the molten crack
  float rnd = hash(nearId);

  // dark basalt plate, domed (darker toward the cracked edges = cooled rim)
  vec3 plate = mix(vec3(0.05, 0.025, 0.018), vec3(0.13, 0.06, 0.035), rnd);
  plate *= 0.55 + 0.5 * noise(p * 6.0 + rnd * 10.0);   // crust texture
  plate *= 0.4 + 0.6 * smoothstep(0.0, 0.45, f1);      // darker (cooler) near the rim

  // molten crack glow — hotter (whiter) at the very centre of the crack, pulsing
  float hot = smoothstep(crack, 0.0, border) * (0.6 + 0.4 * sin(t * 2.0 + rnd * 20.0));
  hot = pow(hot, 0.7);
  vec3 lava = fire(hot) * heat;

  vec3 col = mix(plate, lava, crackMask);
  col += lava * crackMask * 0.5;                        // bloom from the cracks
  col += fire(0.9) * heat * 0.25 * pow(crackMask, 3.0); // hottest seams

  // heat bleeds from the cracks into the surrounding crust (embers under the skin)
  float bleed = exp(-max(0.0, border - crack) * 9.0) * (1.0 - crackMask);
  col += fire(0.3) * heat * bleed * 0.45;

  col *= 1.0 - 0.3 * dot(uv, uv);
  col = col / (1.0 + 0.4 * col);
  col = pow(max(col, 0.0), vec3(0.9));
  gl_FragColor = vec4(col, 1.0);
}
