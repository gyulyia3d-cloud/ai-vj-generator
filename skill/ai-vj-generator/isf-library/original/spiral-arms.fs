/*{
 "DESCRIPTION": "Logarithmic spiral arms rotating a whole turn per loop.",
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
   "NAME": "arms",
   "TYPE": "float",
   "DEFAULT": 5,
   "MIN": 1,
   "MAX": 12,
   "LABEL": "Arms"
  },
  {
   "NAME": "twist",
   "TYPE": "float",
   "DEFAULT": 3,
   "MIN": -8,
   "MAX": 8,
   "LABEL": "Twist"
  },
  {
   "NAME": "sharp",
   "TYPE": "float",
   "DEFAULT": 0.25,
   "MIN": 0.05,
   "MAX": 0.5,
   "LABEL": "Sharpness"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float r = length(uv)+1e-4, a = atan(uv.y, uv.x);
  float s = a*floor(arms+0.5) + twist*log(r*4.0) - TAU*phase;
  float k = pow(0.5+0.5*sin(s), 6.0*(1.0-sharp)+1.0);
  k *= smoothstep(0.0, 0.1, r)*smoothstep(0.8, 0.3, r);
  vec3 col = mix(c1.rgb, c2.rgb, clamp(r*2.0, 0.0, 1.0));
  gl_FragColor = vec4(cbg.rgb + col*k*(0.8+0.8*bass+0.5*hit), 1.0);
}
