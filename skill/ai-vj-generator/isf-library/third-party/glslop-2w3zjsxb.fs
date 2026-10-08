/*{
  "DESCRIPTION": "Reliquary — a slowly tumbling orb of nested lace shells, each one a perforated gyroid membrane cut into a concentric sphere. The layers are translucent, so you look down through shell after shell to a burning heart at the centre. Thin-film interference tints every layer a different colour. Seamless loop.",
  "CREDIT": "Claude Opus 4.8",
  "CATEGORIES": ["generative", "3d", "raymarch", "abstract"],
  "INPUTS": [
    { "NAME": "shells",    "TYPE": "float", "DEFAULT": 3.6,   "MIN": 1.0,  "MAX": 6.0  },
    { "NAME": "thickness", "TYPE": "float", "DEFAULT": 0.050, "MIN": 0.02, "MAX": 0.14 },
    { "NAME": "filigree",  "TYPE": "float", "DEFAULT": 1.0,   "MIN": 0.0,  "MAX": 2.0  },
    { "NAME": "heat",      "TYPE": "float", "DEFAULT": 1.0,   "MIN": 0.0,  "MAX": 2.0  }
  ]
}*/

#define PI  3.14159265359
#define TAU 6.28318530718
#define PERIOD 24.0
#define WS     3.1      // gyroid frequency
#define STEPS  140
#define MAXD   7.0
#define ROUT   1.72     // outer radius of the reliquary
#define RIN    0.34     // hollow core: room for the heart to burn

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }

float gSpin;   // this frame's rotation phase (set in main)

// ---- gyroid: triply-periodic minimal surface, period 2*pi on every axis ----
float gyr(vec3 p, float s){ p *= s; return dot(sin(p), cos(p.yzx)) / s; }
float gyrRaw(vec3 p, float s){ p *= s; return dot(sin(p), cos(p.yzx)); }

// Each shell tumbles INDEPENDENTLY, at its own rate and on its own axis, so
// the nested layers grind past one another like an armillary sphere.
// Every rate is an integer number of whole turns per loop -> still exact.
vec3 tumble(vec3 p, float si){
  float a = 1.0 + mod(si, 3.0);          // 1, 2 or 3 turns per loop
  float b = 1.0 + mod(si + 1.0, 2.0);    // 1 or 2 turns, opposite axis
  p.xz = rot(gSpin * a) * p.xz;
  p.xy = rot(-gSpin * b) * p.xy;
  return p;
}

float map(vec3 p){
  float rr = length(p);
  // which nested shell are we in? (constant within a shell, so the independent
  // rotation below is continuous everywhere the membrane actually exists)
  float si = floor(rr * shells);
  vec3  q  = tumble(p, si);

  // the membrane: a thickened gyroid, lace carved into it
  float g = abs(gyr(q, WS)) - thickness;
  g -= filigree * 0.030 * gyrRaw(q, WS * 3.07);
  g -= filigree * 0.012 * gyrRaw(q, WS * 7.13);

  // concentric shells: repeat distance-from-centre so the membrane only
  // survives inside a stack of thin spherical rinds -> nested lace spheres
  float sh = abs(fract(rr * shells) - 0.5) / shells - 0.030;

  float d = max(g, sh);
  d = max(d, rr - ROUT);   // bound it to a ball
  d = max(d, RIN - rr);    // hollow out the core
  return d * 0.40;   // tighter: shells rotate independently, field is less smooth
}

vec3 calcNormal(vec3 p){
  vec2 e = vec2(0.0012, 0.0);
  return normalize(vec3(
    map(p + e.xyy) - map(p - e.xyy),
    map(p + e.yxy) - map(p - e.yxy),
    map(p + e.yyx) - map(p - e.yyx)));
}

vec3 thinFilm(float ct, float thick){
  float t = thick / max(ct, 0.40);
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.00, 0.33, 0.67)));
}

vec3 env(vec3 d){
  float up = d.y * 0.5 + 0.5;
  vec3 c = mix(vec3(0.02, 0.03, 0.07), vec3(0.20, 0.30, 0.50), smoothstep(0.0, 1.0, up));
  vec3 sd = normalize(vec3(0.55, 0.65, -0.4));
  c += vec3(1.0, 0.90, 0.75) * pow(max(dot(d, sd), 0.0), 26.0) * 2.4;
  c += vec3(0.30, 0.70, 1.0) * pow(max(dot(d, -sd), 0.0), 9.0)  * 0.55;
  return c;
}

// ---- cheap hashes for the scattered dot shells ----
float h31(vec3 p){
  return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453);
}
vec3 h33(vec3 p){
  return fract(sin(vec3(dot(p, vec3(127.1, 311.7,  74.7)),
                        dot(p, vec3(269.5, 183.3, 246.1)),
                        dot(p, vec3(113.5, 271.9, 124.6)))) * 43758.5453);
}

// Scattered dots living exactly ON a sphere of radius R. We only ever evaluate
// this at points already known to be on that sphere (found analytically), so
// it costs one hash instead of a march.
float dotField(vec3 p, float R, float dens, float sz){
  vec3 d = p / R;                       // unit direction on the shell
  vec3 g = d * dens;
  vec3 c = floor(g);
  vec3 f = g - c - 0.5;
  vec3 o = (h33(c) - 0.5) * 0.30;       // jitter, kept small: jitter+radius must stay under 0.5
                                        // or the dot is clipped square by its own cell
  float on = step(0.72, h31(c + 7.3));  // only some cells carry a dot at all
  float dd = length(f - o);
  // bright core plus a soft bloom halo so each dot reads at small sizes
  return on * (smoothstep(sz, 0.0, dd) + 0.30 * smoothstep(sz * 1.7, 0.0, dd));
}

// sparse starfield so the orb reads as suspended in space
float stars(vec3 d){
  float s = sin(d.x * 130.0) * sin(d.y * 148.0) * sin(d.z * 121.0);
  return pow(max(s, 0.0), 45.0);
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;

  float ph   = fract(TIME / PERIOD);
  float spin = TAU * ph;
  gSpin = spin;

  // ---- camera orbits the reliquary once per loop ----
  float ca = spin;
  vec3 ro = vec3(6.50 * sin(ca), 1.40 * sin(2.0 * ca), 6.50 * cos(ca));
  vec3 ww = normalize(-ro);
  vec3 uu = normalize(cross(vec3(0.0, 1.0, 0.0), ww));
  vec3 vv = cross(ww, uu);
  vec3 rd = normalize(uv.x * uu + uv.y * vv + 1.6 * ww);

  // ---- layered march: don't stop at the first hit. Each shell contributes
  // colour weighted by how much light still gets through -> real depth. ----
  vec3  acc   = vec3(0.0);
  float trans = 1.0;          // remaining transmittance toward the camera
  float glow  = 0.0;
  float t     = 0.0;
  float firstT = -1.0;

  for (int i = 0; i < STEPS; i++){
    vec3 p = ro + rd * t;
    float d = map(p);

    glow += exp(-abs(d) * 10.0) * 0.010;

    if (d < 0.0016){
      if (firstT < 0.0) firstT = t;
      vec3 n = calcNormal(p);
      float ct = clamp(dot(n, -rd), 0.0, 1.0);

      // each shell gets its own film thickness -> layers read as distinct
      float rr = length(p);
      float thick = 0.95 + 1.05 * rr + 0.30 * sin(spin - rr * 4.0);
      vec3  film  = thinFilm(ct, thick);

      vec3  L    = normalize(vec3(0.5, 0.7, -0.45));
      float diff = max(dot(n, L), 0.0);
      float fres = pow(max(1.0 - ct, 0.0), 4.0);

      vec3 c = film * (0.20 + 0.65 * diff);
      c += env(reflect(rd, n)) * (0.08 + 0.75 * fres) * 0.75;
      c += vec3(1.0, 0.95, 0.85)
         * pow(max(dot(reflect(-L, n), -rd), 0.0), 44.0) * 1.1;

      // heat from the core leaks outward through the lace
      c += vec3(1.0, 0.45, 0.14) * heat * 0.55 / (1.0 + rr * rr * 3.0);

      // glancing angles are more opaque, face-on lets you see deeper in
      float a = clamp(0.17 + 0.52 * fres, 0.0, 1.0);
      acc   += c * a * trans;
      trans *= 1.0 - a;

      if (trans < 0.02) break;
      t += 0.028;              // step past this shell and keep going inward
      continue;
    }

    t += d;
    if (t > MAXD) break;
  }

  // ---- scattered dot shells ----------------------------------------------
  // Solved analytically: a ray hits a sphere of radius R at t = -b +/- sqrt(...),
  // so each shell is one quadratic instead of a march. Four shells cost less
  // than a single extra raymarch step.
  float bq = dot(ro, rd);
  float cq = dot(ro, ro);
  float tEnter = length(ro) - 2.4;
  vec3  dots = vec3(0.0);

  for (int i = 0; i < 4; i++){
    float R = 0.62 + 0.52 * float(i);     // 3 inner shells + 1 outer halo
    float disc = bq * bq - (cq - R * R);
    if (disc <= 0.0) continue;            // ray misses this shell entirely
    float sq = sqrt(disc);

    for (int k = 0; k < 2; k++){          // near and far intersection
      float th = -bq + (k == 0 ? -sq : sq);
      if (th <= 0.0) continue;

      vec3 pq = tumble(ro + rd * th, float(i));   // dots ride their own shell
      float dv = dotField(pq, R, 20.0, 0.20);
      if (dv <= 0.0) continue;

      // dots deeper inside the orb are dimmed by the lace in front of them
      float w = mix(1.0, trans, clamp((th - tEnter) / 4.8, 0.0, 1.0));
      vec3 tint = mix(vec3(1.0, 0.80, 0.48), vec3(0.58, 0.86, 1.0), float(i) / 3.0);
      float twinkle = 0.75 + 0.45 * sin(spin * 2.0 + float(i) * 2.1 + th * 3.0);
      dots += tint * dv * w * twinkle;
    }
  }

  // ---- the burning heart, seen through everything still transparent ----
  float b = length(cross(rd, -ro));          // ray's closest approach to centre
  float core = exp(-b * b * 5.5) + 1.6 * exp(-b * b * 34.0);
  vec3 heartCol = mix(vec3(1.0, 0.55, 0.18), vec3(1.0, 0.90, 0.65), core);
  acc += heartCol * core * heat * 1.9 * trans;

  vec3 col = acc + dots * 1.15;

  // volumetric haze pooling around the lace
  vec3 hazeCol = mix(vec3(0.20, 0.45, 0.90), vec3(0.95, 0.40, 0.65),
                     0.5 + 0.5 * sin(spin * 2.0));
  col += hazeCol * glow * 1.1;

  // background: deep space + stars, only where we still see through
  col += (vec3(0.012, 0.016, 0.035) + vec3(0.9, 0.95, 1.0) * stars(rd) * 0.45) * trans;

  col *= 1.0 - 0.42 * dot(uv, uv);           // vignette

  col = col / (1.0 + col * 0.58);            // soft-knee tone map
  col = pow(max(col, 0.0), vec3(0.87));

  gl_FragColor = vec4(col, 1.0);
}
