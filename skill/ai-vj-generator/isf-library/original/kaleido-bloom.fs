/*{
 "DESCRIPTION": "Mirror-folded petals that breathe; whole rotation turns per loop.",
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
   "NAME": "folds",
   "TYPE": "float",
   "DEFAULT": 6,
   "MIN": 2,
   "MAX": 16,
   "LABEL": "Mirror folds"
  },
  {
   "NAME": "turns",
   "TYPE": "float",
   "DEFAULT": 1,
   "MIN": 0,
   "MAX": 4,
   "LABEL": "Turns per loop"
  },
  {
   "NAME": "petals",
   "TYPE": "float",
   "DEFAULT": 5,
   "MIN": 1,
   "MAX": 12,
   "LABEL": "Petals"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float r = length(uv), a = atan(uv.y, uv.x) + TAU*floor(turns+0.5)*phase;
  float seg = TAU/floor(folds+0.5);
  a = abs(mod(a, seg) - 0.5*seg);
  vec2 p = r*vec2(cos(a), sin(a));
  float b = 0.5+0.5*sin(TAU*phase);
  float k = 0.0;
  for (int i=0;i<4;i++){
    float fi = float(i);
    float rr = 0.12 + 0.11*fi + 0.04*b + 0.03*bass;
    k += smoothstep(0.012, 0.0, abs(length(p - vec2(rr, 0.0)) - 0.05 - 0.02*sin(a*floor(petals+0.5) + fi)));
  }
  vec3 col = mix(c1.rgb, c2.rgb, clamp(r*1.6, 0.0, 1.0));
  gl_FragColor = vec4(cbg.rgb + col*(k + 0.08/(r*6.0+0.4))*(0.9+0.6*hit), 1.0);
}
