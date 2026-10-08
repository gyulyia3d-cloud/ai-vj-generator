/*{
 "DESCRIPTION": "A few glowing Lissajous curves; the phase offset sweeps one full cycle per loop.",
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
   "NAME": "ax",
   "TYPE": "float",
   "DEFAULT": 3,
   "MIN": 1,
   "MAX": 8,
   "LABEL": "Frequency X"
  },
  {
   "NAME": "ay",
   "TYPE": "float",
   "DEFAULT": 2,
   "MIN": 1,
   "MAX": 8,
   "LABEL": "Frequency Y"
  },
  {
   "NAME": "lines",
   "TYPE": "float",
   "DEFAULT": 3,
   "MIN": 1,
   "MAX": 5,
   "LABEL": "Curves"
  },
  {
   "NAME": "glow",
   "TYPE": "float",
   "DEFAULT": 1,
   "MIN": 0.2,
   "MAX": 3,
   "LABEL": "Glow"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float fx = floor(ax+0.5), fy = floor(ay+0.5);
  float k = 0.0;
  for (int i=0;i<5;i++){
    if (float(i) >= lines) break;
    float fi = float(i);
    float dmin = 9.0;
    for (int s=0;s<64;s++){
      float t = float(s)/64.0*TAU;
      vec2 q = 0.38*vec2(sin(fx*t + TAU*phase + fi*0.7), sin(fy*t + fi*0.4));
      dmin = min(dmin, length(uv - q));
    }
    k += (0.0035*glow*(1.0+bass))/(dmin+0.002);
  }
  vec3 col = mix(c1.rgb, c2.rgb, clamp(length(uv)*1.8, 0.0, 1.0));
  gl_FragColor = vec4(cbg.rgb + col*min(k, 3.0)*(0.7+0.4*hit), 1.0);
}
