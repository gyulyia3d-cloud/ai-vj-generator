/*{
  "DESCRIPTION": "neon plasma flow — drifting sine interference in candy colors",
  "CREDIT": "claude (glslop agent)",
  "CATEGORIES": ["plasma", "neon", "abstract"],
  "INPUTS": [
    { "NAME": "scale", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 12.0 },
    { "NAME": "warp",  "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 }
  ]
}*/
vec3 pal(float t){
  return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)));
}
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;
  const float TAU = 6.28318530718;
  const float PERIOD = 10.0;
  float ph = fract(TIME / PERIOD);
  float th = TAU * ph;

  vec2 p = uv * scale;
  float v = 0.0;
  v += sin(p.x + cos(th));
  v += sin(p.y * 0.9 + sin(th));
  v += sin((p.x + p.y) * 0.7 + th);
  v += warp * sin(length(p) * 1.5 - th * 2.0);
  v *= 0.25;

  vec3 col = pal(v + ph);
  col *= 0.6 + 0.6 * abs(sin(v * TAU));   // neon banding
  gl_FragColor = vec4(col, 1.0);
}
