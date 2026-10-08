/*{
  "DESCRIPTION": "Volumetric plasma torus: a raymarched emissive ring of twisted filaments, lit by glow x transmittance so it reads as real fog rather than see-through foam. Hue is driven by the angle AROUND the ring (decoupled from density) so the colour stays vivid instead of collapsing to one hue. Seamless 12s loop.",
  "CREDIT": "glslop agent",
  "CATEGORIES": ["volumetric", "raymarch", "plasma", "torus", "loop"],
  "INPUTS": [
    { "NAME": "density",  "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.3, "MAX": 2.2 },
    { "NAME": "twist",    "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 2.5 },
    { "NAME": "hueSpread","TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 2.0 },
    { "NAME": "exposure", "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.4, "MAX": 2.5 },
    { "NAME": "speed",    "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 3.0 }
  ]
}*/

#define TAU 6.28318530718
#define STEPS 96
const float PERIOD = 12.0;

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// cheap trig-fbm: loop-safe (only integer harmonics of th enter via the orbiting warp)
float wobble(vec3 p, float th){
  vec3 q = p + vec3(cos(th), sin(th), cos(th)) * 0.35;
  float f  = sin(q.x * 2.7) * sin(q.y * 3.1) * sin(q.z * 2.3);
  f += 0.5  * sin(q.x * 5.9 + q.z * 1.7) * sin(q.y * 6.3);
  f += 0.25 * sin(q.y * 12.1 + q.x * 3.3) * sin(q.z * 11.4);
  return f * 0.571;
}

// density of the filament ring at p; also returns the angle around the ring in ang
float field(vec3 p, float th, out float ang){
  ang = atan(p.z, p.x);
  vec2 cs = vec2(length(p.xz) - 1.0, p.y);       // torus cross-section coords
  cs = rot(ang * 3.0 * twist + th) * cs;         // twist the cross-section around the ring

  float w = wobble(p * 2.1, th);
  float tube = length(cs) - (0.15 + 0.055 * w);
  float d = smoothstep(0.055, -0.02, tube);

  // carve discrete filaments running along the tube
  float fil = 0.5 + 0.5 * sin(atan(cs.y, cs.x) * 6.0 + ang * 9.0 + w * 2.4);
  fil = pow(fil, 3.0);
  return d * (0.12 + 0.88 * fil);
}

// cohesive 2-tone: deep cyan-teal through hot magenta, with ember-orange cores added on top
vec3 pal(float t){
  return mix(vec3(0.00, 0.48, 0.85), vec3(1.00, 0.06, 0.42), 0.5 + 0.5 * cos(TAU * t));
}

// time-independent dither: breaks the fixed-step banding without touching the loop
float hash12(vec2 p){
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;

  float ph = fract(TIME * speed / PERIOD);
  float th = TAU * ph;

  // camera OUTSIDE the volume, above the ring plane looking down at it
  vec3 ro = vec3(0.0, 1.62, 4.16);
  vec3 rd = normalize(vec3(uv, -1.85));
  // tilt DOWN toward the origin, then spin the whole scene one full turn per loop
  rd.yz = rot(0.371) * rd.yz;
  ro.xz = rot(th) * ro.xz;
  rd.xz = rot(th) * rd.xz;

  float dt = 0.034;
  float t = 2.7;

  vec3 col = vec3(0.0);
  float trans = 1.0;

  for (int i = 0; i < STEPS; i++){
    vec3 p = ro + rd * t;
    float ang;
    float d = field(p, th, ang) * density;
    if (d > 0.002){
      // hue from ring angle + a slow phase sweep: decoupled from density on purpose
      float hueArg = ang / TAU * hueSpread + 0.35 * p.y + ph;
      vec3 emit = pal(hueArg);
      emit += vec3(1.0, 0.50, 0.15) * smoothstep(0.55, 1.0, d) * 1.3;   // ember cores
      col += emit * d * trans * dt * 8.0;
      trans *= exp(-d * dt * 15.0);
      if (trans < 0.01) break;
    }
    t += dt;
    if (t > 5.6) break;
  }

  // faint halo so the ring sits in space instead of on flat black
  float halo = exp(-length(uv) * 2.6);
  col += vec3(0.05, 0.03, 0.10) * halo;

  col *= exposure * 1.25;
  col = 1.0 - exp(-col);                 // soft knee: keeps colour in the highlights
  col = pow(max(col, 0.0), vec3(0.92));
  gl_FragColor = vec4(col, 1.0);
}
