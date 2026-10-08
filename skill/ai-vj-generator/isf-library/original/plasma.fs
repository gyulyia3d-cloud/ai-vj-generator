/*{
 "DESCRIPTION": "Sum of sines with integer harmonics of the loop phase: closes exactly.",
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
   "NAME": "scale",
   "TYPE": "float",
   "DEFAULT": 3,
   "MIN": 0.5,
   "MAX": 10,
   "LABEL": "Scale"
  },
  {
   "NAME": "warp",
   "TYPE": "float",
   "DEFAULT": 1,
   "MIN": 0,
   "MAX": 3,
   "LABEL": "Warp"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 p = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y*scale;
  float t = TAU*phase;
  float v = sin(p.x*1.3 + t) + sin(p.y*1.7 - t) + sin((p.x+p.y)*0.9 + 2.0*t);
  v += sin(length(p + warp*vec2(sin(t), cos(t)))*2.0 - t);
  v += warp*sin(p.x*p.y*0.4 + t);
  float k = 0.5+0.5*sin(v*1.2 + 0.6*bass*TAU);
  vec3 col = mix(c1.rgb, c2.rgb, k);
  gl_FragColor = vec4(cbg.rgb + col*(0.15+0.85*k*k)*(0.9+0.4*mid+0.5*hit), 1.0);
}
