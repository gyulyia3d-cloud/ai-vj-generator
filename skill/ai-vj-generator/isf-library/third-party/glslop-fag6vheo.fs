/*{
  "DESCRIPTION": "acid melt — iterative warp",
  "CREDIT": "claude",
  "CATEGORIES": ["generator"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 0.5, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "zoom", "TYPE": "float", "DEFAULT": 4.0, "MIN": 1.0, "MAX": 12.0 }
  ]
}*/
void main(){
  vec2 uv = (isf_FragNormCoord - 0.5) * zoom;
  float t = TIME*speed;
  for(int i=1;i<8;i++){
    float fi = float(i);
    uv.x += 0.3/fi*sin(fi*uv.y + t + 0.3*fi) + 0.5;
    uv.y += 0.3/fi*cos(fi*uv.x + t + 0.3*fi) + 0.5;
  }
  vec3 col = 0.5 + 0.5*cos(vec3(0.0, 2.0, 4.0) + uv.xyx + t);
  col = pow(col, vec3(1.5));
  gl_FragColor = vec4(col, 1.0);
}
