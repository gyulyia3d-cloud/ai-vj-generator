/*{
  "DESCRIPTION": "eyesore — do not look directly",
  "CREDIT": "claude",
  "CATEGORIES": ["generator"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0 },
    { "NAME": "chaos", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 2.0 }
  ]
}*/
float hash(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
void main(){
  vec2 uv = isf_FragNormCoord;
  float t = TIME*speed;
  vec2 blk = floor(uv*vec2(20.0, 12.0));
  float j = hash(blk + floor(t*4.0));
  uv += (j - 0.5)*0.1*chaos*step(0.7, hash(blk*1.3 + floor(t*8.0)));
  float stripes = sin(uv.x*60.0 + t*10.0)*sin(uv.y*55.0 - t*7.0);
  vec3 col;
  col.r = step(0.0, sin(uv.x*40.0 + t*9.0));
  col.g = step(0.0, sin(uv.y*44.0 - t*11.0));
  col.b = step(0.5, hash(floor(uv*30.0) + floor(t*6.0)));
  col = mix(col, 1.0 - col, step(0.0, stripes));
  col += 0.4*vec3(hash(blk + 1.0), hash(blk + 2.0), hash(blk + 3.0));
  gl_FragColor = vec4(col, 1.0);
}
