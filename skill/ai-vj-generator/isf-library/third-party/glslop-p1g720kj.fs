/*{
  "DESCRIPTION": "Domain-warped plasma with flowing interference ridges — seamless loop via circular time orbits (all motion on integer multiples of 2*PI*phase).",
  "CREDIT": "claude via glslop llms.txt dogfood",
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 3.0 },
    { "NAME": "warp",  "TYPE": "float", "DEFAULT": 0.55, "MIN": 0.0, "MAX": 1.4 },
    { "NAME": "zoom",  "TYPE": "float", "DEFAULT": 2.6, "MIN": 1.0, "MAX": 6.0 },
    { "NAME": "hue",   "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 1.0 }
  ]
}*/

#define PI 3.14159265359
#define PERIOD 14.0

// IQ cosine palette — vivid, unit-period so it cycles cleanly with phase
vec3 pal(float t){
  return 0.5 + 0.5*cos(2.0*PI*(t + vec3(0.0, 0.33, 0.67)));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5*RENDERSIZE.xy) / RENDERSIZE.y;

  float ph = fract(TIME*speed/PERIOD);   // 0..1 loop phase
  float th = 2.0*PI*ph;                  // full-turn loop angle

  vec2 p = uv*zoom;

  // iterative domain warp; every time-term rides th (coeff 1) -> seamless loop
  for(int i=0;i<4;i++){
    float fi = float(i);
    p += warp*vec2(
      sin(p.y*1.6 + th + fi*1.7 + 0.7*cos(p.x*0.9 - th)),
      cos(p.x*1.6 - th + fi*2.3 + 0.7*sin(p.y*0.9 + th))
    );
  }

  // interference field from the warped coordinate (continuous -> loop-safe colour)
  float f  = sin(p.x + th) + sin(p.y - th) + sin((p.x + p.y)*0.8 + th);
  float r  = length(p)*0.35;
  float v  = 0.5 + 0.5*sin(f*1.4 + r);

  // caustic-like brightness: sharp on the field crests, dark in the troughs
  float caust = pow(v, 2.2);

  // two ridge families (coarse + fine) for filament structure
  float ridge1 = smoothstep(0.86, 1.0, abs(sin(f*1.7 - th)));
  float ridge2 = smoothstep(0.93, 1.0, abs(sin(f*3.3 + 0.5*r - th)));

  vec3 col = pal(v*0.55 + hue + ph*0.25);
  col *= 0.35 + 0.9*caust;                 // deepen troughs, brighten crests
  col = mix(col, vec3(1.0), ridge1*0.5 + ridge2*0.35);   // hot filaments

  // contrast lift + soft vignette so it reads punchy, never muddy
  col = pow(col, vec3(0.82));
  float vig = smoothstep(1.45, 0.15, length(uv));
  col *= 0.4 + 0.7*vig;

  gl_FragColor = vec4(col, 1.0);
}
