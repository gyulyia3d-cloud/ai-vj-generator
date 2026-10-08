/*{
 "DESCRIPTION": "Domain-warped stripes that flow and return to the start after one loop.",
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
   "NAME": "stripes",
   "TYPE": "float",
   "DEFAULT": 14,
   "MIN": 3,
   "MAX": 40,
   "LABEL": "Stripes"
  },
  {
   "NAME": "warp",
   "TYPE": "float",
   "DEFAULT": 0.6,
   "MIN": 0,
   "MAX": 1.5,
   "LABEL": "Warp"
  },
  {
   "NAME": "soft",
   "TYPE": "float",
   "DEFAULT": 0.35,
   "MIN": 0.05,
   "MAX": 0.6,
   "LABEL": "Softness"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float t = TAU*phase;
  vec2 w = uv + warp*0.25*vec2(sin(uv.y*3.0 + t) + 0.5*sin(uv.y*7.0 - 2.0*t), cos(uv.x*3.0 - t));
  float s = sin(w.x*stripes + 4.0*w.y + t);
  float k = smoothstep(-soft, soft, s);
  vec3 col = mix(c2.rgb, c1.rgb, k);
  float edge = smoothstep(0.12, 0.0, abs(s));
  gl_FragColor = vec4(cbg.rgb + col*(0.2+0.6*k) + c1.rgb*edge*(0.4+hit), 1.0);
}
