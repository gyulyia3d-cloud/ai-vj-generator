/*{
 "DESCRIPTION": "Curtains of value noise walking on a circle of the loop phase (seamless).",
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
   "NAME": "curtains",
   "TYPE": "float",
   "DEFAULT": 4,
   "MIN": 1,
   "MAX": 8,
   "LABEL": "Curtains"
  },
  {
   "NAME": "sway",
   "TYPE": "float",
   "DEFAULT": 0.5,
   "MIN": 0,
   "MAX": 1.5,
   "LABEL": "Sway"
  }
 ]
}*/
#define TAU 6.28318530718
float h21(vec2 p){ p = fract(p*vec2(123.34, 456.21)); p += dot(p, p+45.32); return fract(p.x*p.y); }
vec2 h22(vec2 p){ float n = h21(p); return vec2(n, h21(p+n+7.7)); }
float vn(vec2 p){ vec2 i = floor(p), f = fract(p); f = f*f*(3.0-2.0*f);
  return mix(mix(h21(i), h21(i+vec2(1.0,0.0)), f.x), mix(h21(i+vec2(0.0,1.0)), h21(i+vec2(1.0,1.0)), f.x), f.y); }
void main(){
  vec2 uv = gl_FragCoord.xy/RENDERSIZE.xy;
  vec2 loopv = 0.8*vec2(cos(TAU*phase), sin(TAU*phase));
  vec3 acc = vec3(0.0);
  for (int i=0;i<8;i++){
    if (float(i) >= curtains) break;
    float fi = float(i);
    float n = vn(vec2(uv.x*3.0 + fi*5.1, fi*3.3) + loopv*(0.6+0.2*fi));
    float y = 0.35 + 0.4*n + sway*0.1*sin(uv.x*6.0 + TAU*phase + fi);
    float band = smoothstep(0.28, 0.0, abs(uv.y - y)) * (1.0 - 0.5*fi/curtains);
    acc += mix(c1.rgb, c2.rgb, fi/max(curtains-1.0, 1.0)) * band;
  }
  gl_FragColor = vec4(cbg.rgb + acc*(0.55+0.35*mid+0.4*hit), 1.0);
}
