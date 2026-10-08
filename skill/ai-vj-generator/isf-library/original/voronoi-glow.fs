/*{
 "DESCRIPTION": "Cells whose seeds orbit on circles of the loop phase; glowing edges.",
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
   "NAME": "cells",
   "TYPE": "float",
   "DEFAULT": 6,
   "MIN": 2,
   "MAX": 16,
   "LABEL": "Cells"
  },
  {
   "NAME": "edge",
   "TYPE": "float",
   "DEFAULT": 0.06,
   "MIN": 0.01,
   "MAX": 0.2,
   "LABEL": "Edge glow"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y*cells;
  vec2 g = floor(uv), f = fract(uv);
  float d1 = 9.0, d2 = 9.0;
  for (int j=-1;j<=1;j++) for (int i=-1;i<=1;i++){
    vec2 o = vec2(float(i), float(j)), id = g+o;
    vec2 s = h22(id);
    vec2 pt = o + 0.5 + 0.4*vec2(sin(TAU*phase + s.x*TAU), cos(TAU*phase + s.y*TAU));
    float d = length(pt - f);
    if (d < d1){ d2 = d1; d1 = d; } else if (d < d2){ d2 = d; }
  }
  float e = d2 - d1;
  float k = smoothstep(edge*(1.0+bass), 0.0, e);
  vec3 col = mix(c1.rgb, c2.rgb, clamp(d1*1.4, 0.0, 1.0));
  gl_FragColor = vec4(cbg.rgb + col*(k*(1.0+hit) + 0.12*(1.0-d1)), 1.0);
}
