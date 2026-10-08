/*{
 "DESCRIPTION": "Two ring systems whose centres drift on circles; the interference is the picture.",
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
   "NAME": "density",
   "TYPE": "float",
   "DEFAULT": 36,
   "MIN": 8,
   "MAX": 90,
   "LABEL": "Ring density"
  },
  {
   "NAME": "drift",
   "TYPE": "float",
   "DEFAULT": 0.22,
   "MIN": 0,
   "MAX": 0.5,
   "LABEL": "Centre drift"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  vec2 o = drift*vec2(cos(TAU*phase), sin(TAU*phase));
  float a = sin(length(uv - o)*density*(1.0+0.05*bass));
  float b = sin(length(uv + o)*density);
  float m = smoothstep(0.0, 0.15, a*b);
  vec3 col = mix(c1.rgb, c2.rgb, 0.5+0.5*sin(TAU*phase + length(uv)*3.0));
  gl_FragColor = vec4(cbg.rgb + col*m*(0.8+0.5*hit+0.3*mid), 1.0);
}
