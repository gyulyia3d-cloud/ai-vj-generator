/*{
 "DESCRIPTION": "Dot matrix lit by rings that radiate from the centre; made for LED walls.",
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
   "NAME": "cols",
   "TYPE": "float",
   "DEFAULT": 48,
   "MIN": 8,
   "MAX": 160,
   "LABEL": "Dots across"
  },
  {
   "NAME": "rippleN",
   "TYPE": "float",
   "DEFAULT": 2,
   "MIN": 1,
   "MAX": 6,
   "LABEL": "Rings per loop"
  },
  {
   "NAME": "dotsize",
   "TYPE": "float",
   "DEFAULT": 0.38,
   "MIN": 0.1,
   "MAX": 0.5,
   "LABEL": "Dot size"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 res = RENDERSIZE.xy;
  float n = floor(cols+0.5);
  vec2 uv = gl_FragCoord.xy/res.y*n;
  vec2 id = floor(uv), f = fract(uv)-0.5;
  vec2 ctr = 0.5*vec2(res.x/res.y*n, n);
  float d = length((id+0.5) - ctr)/n;
  float rn = floor(rippleN+0.5);
  float wave = 0.5+0.5*cos(TAU*(d*2.0*rn - phase*rn));
  float lit = pow(wave, 3.0)*(1.0+0.6*bass);
  float m = smoothstep(dotsize+0.04, dotsize-0.04, length(f))*lit;
  vec3 col = mix(c1.rgb, c2.rgb, wave);
  gl_FragColor = vec4(cbg.rgb + col*m*(0.9+0.5*hit), 1.0);
}
