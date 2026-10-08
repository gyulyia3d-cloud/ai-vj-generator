/*{
  "DESCRIPTION": "Flower-of-life circle lattice breathing through a log-polar tunnel, phase-iridescent linework on void. Seamless loop.",
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.25, "MAX": 3.0 },
    { "NAME": "fold",  "TYPE": "long",  "DEFAULT": 6, "VALUES": [6, 5, 8], "LABELS": ["hex", "penta", "octa"] }
  ]
}*/

#define PI 3.141592653589793
#define TAU 6.283185307179586

// rotate
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// distance to circle ring of radius r centered at c
float sdRing(vec2 p, vec2 c, float r){ return abs(length(p - c) - r); }

// crisp AA line from a distance field, w = half-width in field units
float lineAA(float d, float w, float aa){ return smoothstep(w + aa, w - aa, d); }

// phase-driven iridescence: 2-tone cyan/magenta wheel driven by phase, not density
vec3 irid(float phase){
  return 0.5 + 0.5 * cos(TAU * phase + vec3(0.0, 2.094, 4.188));
}

void main(){
  float PERIOD = 12.0;
  float ph = fract(TIME * speed / PERIOD);          // 0..1 master phase

  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;

  float N = max(float(fold), 3.0);                   // symmetry order (guard div-by-zero)

  // ---- log-polar tunnel domain ----
  float r = length(uv);
  float a = atan(uv.y, uv.x);
  // log radius; scroll by exactly one tile per loop -> seamless
  float tile = 1.1;                                  // log-radial tile size
  float lr = log(max(r, 1e-5)) / tile + ph;          // scroll one tile per period
  // kaleidoscopic angular fold
  float sector = TAU / N;
  float aa2 = mod(a + sector * 0.5, sector) - sector * 0.5; // folded angle
  // rebuild folded plane coords in log-polar space
  vec2 lp = vec2(lr, aa2 * N / TAU * 2.0);           // x: log-radius (scrolling), y: folded angle

  // ---- flower-of-life lattice in the folded log-polar plane ----
  // hex-ish lattice of circles: repeat cells, circles at cell centers + edges
  vec2 cell = fract(lp * 2.0) - 0.5;                 // cell coords -0.5..0.5
  vec2 cid = floor(lp * 2.0);

  float d = 1e9;
  // circles at neighboring lattice points, radius ~ lattice spacing (FoL overlap)
  for (int i = -1; i <= 1; i++){
    for (int j = -1; j <= 1; j++){
      vec2 o = vec2(float(i), float(j));
      // offset every other row for hex packing
      vec2 c = o;
      c.x += mod(cid.y + o.y, 2.0) * 0.5 - 0.25;
      float ringR = 0.62;                            // overlapping circles = vesica fields
      d = min(d, sdRing(cell, c, ringR));
    }
  }

  // ---- golden-angle spiral arm family (second line family, world space) ----
  // log spirals are straight lines in (log r, angle); lr carries +ph so drift/loop = 2 (integer, seamless)
  float arm = 1e9;
  for (int k = 0; k < 3; k++){
    float fk = float(k);
    float spiralD = abs(fract(lr * 2.0 + (a / TAU) * 3.0 + fk * 0.3333333) - 0.5);
    arm = min(arm, spiralD);
  }

  // ---- AA widths scale with pixel size in field units ----
  float px = 2.0 / RENDERSIZE.y;                     // approx pixel in uv units
  float aaF = px * 6.0;                              // field-space AA fudge

  float lat = lineAA(d, 0.015, aaF);                 // lattice lines: crisp
  float spr = lineAA(arm, 0.01, aaF) * 0.6;          // spiral filaments: thin + crisp

  // ---- color: cohesive duotone (electric cyan <-> deep violet), phase from log radius ----
  float huePhase = 0.5 + 0.5 * sin(TAU * lr);        // integer multiple of lr: seamless traveling bands
  vec3 CYAN   = vec3(0.08, 0.84, 0.95);
  vec3 VIOLET = vec3(0.42, 0.16, 0.95);
  vec3 GOLD   = vec3(1.0, 0.78, 0.25);
  vec3 colA = mix(VIOLET, CYAN, huePhase);

  vec3 col = vec3(0.0);
  col += colA * lat * 1.35;
  col += GOLD * spr * 0.85;                          // gold spiral filament family

  // fade the innermost moire into void, vignette the edge
  float centerFade = smoothstep(0.03, 0.16, r);
  col *= centerFade;
  float vig = smoothstep(1.15, 0.4, r);
  col *= 0.3 + 0.7 * vig;
  col += CYAN * 0.06 * exp(-r * 4.0) * centerFade;   // faint cyan core halo

  // deep void floor, no grey wash
  col = max(col, vec3(0.0));
  gl_FragColor = vec4(col, 1.0);
}
