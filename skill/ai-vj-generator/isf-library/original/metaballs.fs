/*{
 "DESCRIPTION": "Six orbiting blobs drawn as iso-contours; orbits are whole loops.",
 "CREDIT": "ai-vj-generator (original, MIT)",
 "ISFVSN": "2.0",
 "CATEGORIES": [
  "Generator",
  "Audio Reactive"
 ],
 "INPUTS": [
  {
   "NAME": "phase",
   "TYPE": "float",
   "DEFAULT": 0.0,
   "MIN": 0.0,
   "MAX": 1.0,
   "LABEL": "Loop phase (0-1, automate)"
  },
  {
   "NAME": "bass",
   "TYPE": "float",
   "DEFAULT": 0.0,
   "MIN": 0.0,
   "MAX": 1.5
  },
  {
   "NAME": "mid",
   "TYPE": "float",
   "DEFAULT": 0.0,
   "MIN": 0.0,
   "MAX": 1.5
  },
  {
   "NAME": "high",
   "TYPE": "float",
   "DEFAULT": 0.0,
   "MIN": 0.0,
   "MAX": 1.5
  },
  {
   "NAME": "hit",
   "TYPE": "float",
   "DEFAULT": 0.0,
   "MIN": 0.0,
   "MAX": 1.5
  },
  {
   "NAME": "c1",
   "TYPE": "color",
   "DEFAULT": [
    1.0,
    1.0,
    1.0,
    1.0
   ]
  },
  {
   "NAME": "c2",
   "TYPE": "color",
   "DEFAULT": [
    1.0,
    0.25,
    0.2,
    1.0
   ]
  },
  {
   "NAME": "cbg",
   "TYPE": "color",
   "DEFAULT": [
    0.0,
    0.0,
    0.0,
    1.0
   ]
  },
  {
   "NAME": "size",
   "TYPE": "float",
   "DEFAULT": 0.09,
   "MIN": 0.03,
   "MAX": 0.3,
   "LABEL": "Blob size"
  },
  {
   "NAME": "rings",
   "TYPE": "float",
   "DEFAULT": 4,
   "MIN": 1,
   "MAX": 10,
   "LABEL": "Contour rings"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float f = 0.0;
  for (int i=0;i<6;i++){
    float fi = float(i);
    float sp = 1.0 + mod(fi, 2.0);
    vec2 c = 0.3*vec2(cos(TAU*phase*sp + fi*1.7), sin(TAU*phase*sp + fi*2.3)) * (0.6+0.4*sin(fi));
    float d = length(uv - c);
    f += size*size*(1.0+0.6*bass)/(d*d + 0.002);
  }
  float band = abs(fract(f*floor(rings+0.5)*0.35) - 0.5)*2.0;
  float body = smoothstep(0.9, 1.4, f);
  float line = smoothstep(0.12, 0.0, band)*smoothstep(0.3, 0.9, f);
  vec3 col = mix(c1.rgb, c2.rgb, clamp(f*0.25, 0.0, 1.0));
  gl_FragColor = vec4(cbg.rgb + col*(0.45*body + 0.7*line)*(0.9+0.5*hit), 1.0);
}
