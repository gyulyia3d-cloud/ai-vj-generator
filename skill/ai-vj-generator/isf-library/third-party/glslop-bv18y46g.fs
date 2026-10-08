/*{
  "DESCRIPTION": "Moire Eye - two counter-rotating radial line fans beat against a breathing dot lattice around a movable focal point. Crisp duotone op-art interference, seamless 12s loop.",
  "CREDIT": "glslop agent test",
  "CATEGORIES": ["op-art", "moire", "geometric"],
  "INPUTS": [
    { "NAME": "focus",      "TYPE": "point2D", "DEFAULT": [0.5, 0.5] },
    { "NAME": "ink",        "TYPE": "color",   "DEFAULT": [0.05, 0.85, 0.78, 1.0] },
    { "NAME": "paper",      "TYPE": "color",   "DEFAULT": [0.04, 0.02, 0.10, 1.0] },
    { "NAME": "spokes",     "TYPE": "float",   "DEFAULT": 60.0, "MIN": 8.0,  "MAX": 160.0 },
    { "NAME": "detune",     "TYPE": "float",   "DEFAULT": 6.0,  "MIN": 0.0,  "MAX": 24.0 },
    { "NAME": "ringFreq",   "TYPE": "float",   "DEFAULT": 22.0, "MIN": 2.0,  "MAX": 60.0 },
    { "NAME": "dotScale",   "TYPE": "float",   "DEFAULT": 26.0, "MIN": 6.0,  "MAX": 70.0 },
    { "NAME": "swirl",      "TYPE": "float",   "DEFAULT": 1.0,  "MIN": 0.0,  "MAX": 3.0 },
    { "NAME": "contrast",   "TYPE": "float",   "DEFAULT": 1.0,  "MIN": 0.2,  "MAX": 2.0 },
    { "NAME": "invert",     "TYPE": "bool",    "DEFAULT": false }
  ]
}*/

// ---- Moire Eye ---------------------------------------------------------------
// Pure op-art interference. No noise, no raymarch, no tiling. Two rotating
// radial spoke fans whose counts differ by `detune` create the primary moire;
// a concentric ring pattern and a breathing dot lattice add the second and third
// beat. Everything is driven by INTEGER multiples of a single looping phase so
// the 12s loop is seamless.

const float PI     = 3.14159265359;
const float TWO_PI = 6.28318530718;
const float PERIOD = 12.0;          // seconds per seamless loop

// crisp band: 1 inside the line, 0 outside, anti-aliased by the signal slope.
float band(float x, float duty, float aa) {
  // x is a 0..1 sawtooth-ish phase; fold to a triangle distance from a line center
  float t = abs(fract(x) - 0.5) * 2.0;   // 0 at line center .. 1 between lines
  return smoothstep(duty + aa, duty - aa, t);
}

void main() {
  vec2 res = RENDERSIZE.xy;
  // square, centered coords with the focal point as origin
  vec2 fc  = gl_FragCoord.xy / res;          // 0..1
  vec2 p   = (fc - focus);                    // recenter on the movable focus
  p.x *= res.x / res.y;                        // aspect-correct (square here, safe anyway)

  float r   = length(p);
  float ang = atan(p.y, p.x);                  // -PI..PI

  // --- single looping phase -------------------------------------------------
  float ph = fract(TIME / PERIOD);             // 0..1
  float th = TWO_PI * ph;                       // looping angle

  // gentle swirl that returns to start every loop (integer phase => seamless)
  float swirlAmt = swirl * 0.35 * sin(th);
  ang += swirlAmt / (r + 0.12);                 // tighter swirl near the focus

  // --- layer 1+2: two counter-rotating radial spoke fans (the moire core) ---
  float spinA = ang +  TWO_PI * ph;            // +1 turn / loop
  float spinB = ang -  TWO_PI * ph;            // -1 turn / loop
  float fanA  = band( spinA * (spokes)            / TWO_PI, 0.5, 0.06 );
  float fanB  = band( spinB * (spokes + detune)   / TWO_PI, 0.5, 0.06 );
  // multiply the two fans: where both are bright the moire lattice lights up
  float fans  = fanA * fanB;

  // --- layer 3: concentric rings breathing in/out (radial moire) ------------
  float ringPhase = r * ringFreq - 2.0 * th;   // 2 inward pulses per loop (integer)
  float rings = band( ringPhase, 0.42, 0.07 );

  // --- layer 4: breathing hex-ish dot lattice -------------------------------
  // scale pulses by an integer-phase factor so the lattice "breathes" and loops
  float breathe = 1.0 + 0.18 * cos(th);        // 1 pulse / loop
  vec2  g  = p * dotScale * breathe;
  // offset alternate rows for a denser interference
  g.x += 0.5 * floor(g.y);
  vec2  cell = abs(fract(g) - 0.5);
  float dotd = length(cell);
  float dots = smoothstep(0.34, 0.30, dotd);   // crisp dots

  // --- combine: XOR-like interference between fans and rings ----------------
  // op-art "weave": coverage shows where exactly one of (fans, rings) is on -> XOR
  float weave = abs(fans - rings);             // 0..1, sharp interference
  // dots punch through as negative space (eyelets)
  float cov   = clamp(weave + 0.6 * fans - dots, 0.0, 1.0);

  // contrast / hard edge
  cov = clamp((cov - 0.5) * contrast + 0.5, 0.0, 1.0);
  cov = smoothstep(0.45, 0.55, cov);

  // central bright pupil so the focal point reads as an "eye"
  float pupil = smoothstep(0.16, 0.10, r);
  cov = mix(cov, 1.0 - cov, pupil);            // invert the weave inside the pupil

  if (invert) cov = 1.0 - cov;

  // duotone: lerp paper color -> ink color by coverage
  vec3 outc = mix(paper.rgb, ink.rgb, cov);

  // subtle radial vignette toward paper at the edges keeps it graphic
  float vig = smoothstep(1.25, 0.2, r);
  outc = mix(paper.rgb, outc, vig);

  gl_FragColor = vec4(outc, 1.0);
}
