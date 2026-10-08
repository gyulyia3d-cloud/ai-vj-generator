/*{
  "DESCRIPTION": "Golden Cathedral — a living phyllotaxis seed-head. Thousands of florets on a golden-angle lattice, packed into domed stained-glass Voronoi cells with luminous seams. As the divergence angle drifts, the spiral families (parastichies) reorganize and swim. Seamless loop.",
  "CREDIT": "Claude Opus 4.8",
  "CATEGORIES": ["generative", "geometry", "abstract"],
  "INPUTS": [
    { "NAME": "seedScale", "TYPE": "float", "DEFAULT": 0.052, "MIN": 0.030, "MAX": 0.090 },
    { "NAME": "drift",     "TYPE": "float", "DEFAULT": 0.13,  "MIN": 0.0,   "MAX": 0.40  },
    { "NAME": "seamGlow",  "TYPE": "float", "DEFAULT": 1.0,   "MIN": 0.2,   "MAX": 2.0   }
  ]
}*/

#define PI  3.14159265359
#define TAU 6.28318530718
#define PERIOD 20.0
#define GOLDEN 2.39996322973   // golden angle in radians (~137.5 deg)
#define WIN 48                 // half-window of floret indices to test per pixel

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c,-s,s,c); }

// iridescent cosine palette (thin-film-ish)
vec3 pal(float t){
  return 0.5 + 0.5 * cos(TAU * (t + vec3(0.00, 0.28, 0.55)));
}

void main(){
  vec2 uv = (gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y;

  float ph = fract(TIME / PERIOD);
  float spin = TAU * ph;

  // gently animate the divergence angle -> parastichy families swim & reorganize.
  // cos() returns to start at ph=0/1 so the loop is exact.
  float ga  = GOLDEN + drift * 0.02 * (1.0 - cos(spin));
  float rot0 = 0.35 * spin;                      // slow bloom rotation

  float r = length(uv);
  float n0 = r / seedScale; n0 = n0 * n0;        // inverse of radius = scale*sqrt(n)

  // find the two nearest florets (for Voronoi cell + seam)
  float best1 = 1e9, best2 = 1e9;
  float bestN = 1.0;
  vec2  bestP = vec2(0.0);
  float base = floor(n0);

  for (int i = 0; i < 2*WIN; i++){
    float n = base + float(i - WIN);
    if (n < 1.0) continue;
    float ang = n * ga + rot0;
    float rad = seedScale * sqrt(n);
    vec2  p   = rad * vec2(cos(ang), sin(ang));
    float d   = distance(uv, p);
    if (d < best1){ best2 = best1; best1 = d; bestN = n; bestP = p; }
    else if (d < best2){ best2 = d; }
  }

  // local seed spacing ~ d(radius)/dn = seedScale / (2 sqrt(n))
  float spacing = seedScale / (2.0 * sqrt(max(n0, 1.0)));

  // ---- shade the cell as a little domed gem ----
  // dome radius sized to fill the Voronoi cell out to its corners
  float domeR = spacing * 1.32;
  float cd = clamp(best1 / max(domeR, 1e-4), 0.0, 1.0);  // 0 center -> 1 rim (clamped!)

  // dome: fake a hemisphere z = sqrt(1 - cd^2); light from upper-left
  float z  = sqrt(max(1.0 - cd * cd, 0.0));
  vec2  gdir = (uv - bestP) / max(best1, 1e-4);   // radial normal in-plane
  vec3  nrm = normalize(vec3(gdir * cd, z));
  vec3  L   = normalize(vec3(-0.5, 0.7, 0.8));
  float diff = max(dot(nrm, L), 0.0);
  float spec = pow(max(dot(reflect(-L, nrm), vec3(0.0,0.0,1.0)), 0.0), 24.0);

  // seam: bright ridge along the Voronoi boundary (where best1 ~ best2)
  float edge = (best2 - best1) / max(spacing, 1e-4);
  float seam = smoothstep(0.42, 0.0, edge);       // 1 on the boundary, 0 in cell interior

  // color: hue travels SMOOTHLY across space (angle + radius) so neighbouring
  // florets share a tone and the parastichy spirals read as coherent colour
  // streams. A whisper of the floret index adds sparkle without chaos.
  float ang = atan(uv.y, uv.x);
  float hue = ang / TAU + r * 0.55 + bestN * 0.004 + ph;
  vec3  cell = pal(hue);
  cell = mix(vec3(dot(cell, vec3(0.33))), cell, 1.28);   // richer saturation

  // assemble: deep glossy domed cabochon isolated by dark leading
  float body = 0.28 + 0.75 * diff;                // lit gem, dark moody floor
  vec3 col = cell * body;
  col += cell * pow(max(1.0 - cd, 0.0), 2.5) * 0.45;  // backlight bloom toward center
  col *= 0.52 + 0.48 * z;                          // rounding: rims fall to shadow
  col += vec3(1.0, 0.97, 0.9) * spec * 1.30;       // glassy highlight per seed

  // iridescent fresnel rim: each gem catches a lit edge -> jewel facet
  float fres = pow(1.0 - z, 3.0);
  col += pal(hue + 0.15) * fres * 0.40;

  // dark leading: thin shadowed channel between glass cells (rose-window came)
  float lead = smoothstep(0.16, 0.0, edge);        // 1 exactly on the seam
  col *= 1.0 - 0.72 * lead;
  // a hairline of cool light riding the very center of the leading -> depth
  col += pal(hue + 0.5) * smoothstep(0.05, 0.0, edge) * seamGlow * 0.55;

  // faint glossy pip at each seed center
  col += vec3(1.0) * smoothstep(0.10, 0.0, cd) * 0.35;

  // radial vignette so the head reads as one domed bloom on black
  col *= smoothstep(1.16, 0.05, r);
  col += pal(ph + 0.1) * 0.05 * smoothstep(0.45, 0.0, r);

  // soft-knee tone map so specular pips don't clip flat
  col = col / (1.0 + col * 0.75);
  col = pow(col, vec3(0.88));

  gl_FragColor = vec4(col, 1.0);
}
