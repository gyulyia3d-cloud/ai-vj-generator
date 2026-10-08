/*{
  "DESCRIPTION": "Neon rain — overlapping ripple wavefronts interfering on a dark wet surface, crests catching magenta and cyan light.",
  "CREDIT": "claude-opus-4-8",
  "INPUTS": [
    { "NAME": "freq",  "TYPE": "float", "DEFAULT": 16.0, "MIN": 6.0, "MAX": 36.0 },
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "glow",  "TYPE": "float", "DEFAULT": 0.9, "MIN": 0.2, "MAX": 1.8 },
    { "NAME": "hue",   "TYPE": "float", "DEFAULT": 0.85, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

vec3 pal(float t){ return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67) + hue)); }

vec2 drop(int i, float t){
  float fi = float(i);
  return 0.8 * vec2(sin(t * 0.2 + fi * 2.3), cos(t * 0.17 + fi * 1.7));
}

// summed ripple height from several expanding sources
float H(vec2 p, float t){
  float h = 0.0;
  for (int i = 0; i < 5; i++){
    vec2 c = drop(i, t);
    float r = length(p - c);
    float decay = exp(-r * 0.7);
    float amp = 0.6 + 0.4 * sin(t * 0.8 + float(i) * 1.7);   // each source pulses
    h += sin(r * freq - t * 2.5 * speed) * decay * amp;
  }
  return h;
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE) / RENDERSIZE.y;
  vec2 p = uv * 2.2;
  float t = TIME;

  float h = H(p, t);
  // surface normal from the height gradient
  float e = 0.012;
  float hx = H(p + vec2(e, 0.0), t) - H(p - vec2(e, 0.0), t);
  float hy = H(p + vec2(0.0, e), t) - H(p - vec2(0.0, e), t);
  vec3 n = normalize(vec3(-hx, -hy, 0.18));

  // dark wet surface reflecting a magenta/cyan neon environment (synthwave duo)
  vec3 magenta = mix(vec3(1.0, 0.12, 0.7), vec3(1.0, 0.45, 0.1), clamp((hue - 0.85) * 4.0, 0.0, 1.0));  // hue>0.85 warms it
  vec3 cyan = vec3(0.1, 0.85, 1.0);
  vec3 deep = vec3(0.015, 0.0, 0.035);
  vec3 env = mix(magenta, cyan, n.y * 0.5 + 0.5);
  float fres = pow(1.0 - max(0.0, n.z), 2.2);

  vec3 col = deep;
  col += env * fres * (0.5 + 0.9 * glow);                       // neon reflection on the slopes
  // crisp bright crest lines where the wave peaks
  float hn = h * 0.5 + 0.5;
  float crest = pow(smoothstep(0.55, 0.95, hn), 2.0);
  col += mix(magenta, vec3(1.0), 0.4) * crest * glow * 1.1;
  // sharp glints
  float spec = pow(max(0.0, reflect(normalize(vec3(0.3, 0.4, 0.85)), n).z), 28.0);
  col += vec3(1.0) * spec * glow;

  col *= 1.0 - 0.3 * dot(uv, uv);
  col = col / (1.0 + 0.4 * col);
  col = pow(max(col, 0.0), vec3(0.88));
  gl_FragColor = vec4(col, 1.0);
}
