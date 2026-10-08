/*{
 "DESCRIPTION": "Polar tunnel of rings and spokes; the loop closes after `cycles` ring steps.",
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
   "NAME": "cycles",
   "TYPE": "float",
   "DEFAULT": 2,
   "MIN": 1,
   "MAX": 6,
   "LABEL": "Ring steps per loop"
  },
  {
   "NAME": "spokes",
   "TYPE": "float",
   "DEFAULT": 12,
   "MIN": 3,
   "MAX": 32,
   "LABEL": "Spokes"
  },
  {
   "NAME": "width",
   "TYPE": "float",
   "DEFAULT": 0.5,
   "MIN": 0.1,
   "MAX": 1.0,
   "LABEL": "Line width"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float r = length(uv)+1e-4, a = atan(uv.y, uv.x);
  float cy = floor(cycles+0.5);
  float z = 0.25/r + cy*phase;
  float ring = abs(fract(z)-0.5)*2.0;
  float sp = abs(fract(a/TAU*floor(spokes+0.5) + 0.5*cy*phase)-0.5)*2.0;
  float w = 0.06*width*(1.0+0.8*bass+hit);
  float k = smoothstep(w*2.0, 0.0, 1.0-ring) + smoothstep(w*2.0, 0.0, 1.0-sp)*0.6;
  k *= smoothstep(0.0, 0.25, r);
  vec3 col = mix(c1.rgb, c2.rgb, 0.5+0.5*sin(TAU*(z*0.25)));
  gl_FragColor = vec4(cbg.rgb + col*k*(0.8+0.5*high), 1.0);
}
