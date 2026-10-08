/*{
  "DESCRIPTION": "A ripple tank, solved rather than drawn. A row of point sources sits on a plane, each emitting circular waves in step, and every pixel sums the field they all arrive with: psi = SUM a_i cos(k |p - s_i| - k c t + phi_i), with a_i falling off as 1/sqrt(r) the way a cylindrical wave must. None of the fringes are painted. The hyperbolae fall out of path difference - crests coincide where the two path lengths differ by a whole number of wavelengths and cancel where they differ by a half - so two sources give the classic double slit, and winding the count up sharpens the same sum into a grating's principal maxima. The surface is lit from the field's exact analytic gradient, the sin() that sits beside the cos() in the same loop, so the ridges catch light like real water instead of being a colour ramp. In white light every wavelength runs at its own k and the fringes separate into spectra away from the centre line; colour comes from Wyman, Sloan and Shirley's analytic fit to the CIE 1931 colour matching functions, so a wavelength gets the colour it really has. Twenty-one sliders: speed, zoom, how many sources (up to 24) and how far apart, a bend that curls the row of sources into an arc and on into a closed ring without changing their spacing, fringe density, the row's angle and spin, a phase ramp along the row that steers the beam, a rake from looking straight down to a raked horizon with the sources at the vanishing point, relief and gloss for the surface shading, wavelength in nanometres, a dial from one colour to full white light, a scientific jet colour map, fringe hardness, amplitude falloff, exposure, bloom, grain and vignette.",
  "CREDIT": "CC0",
  "CATEGORIES": ["generator", "optics", "interference", "diffraction", "wave", "spectral", "physics", "2d"],
  "INPUTS": [
    { "NAME": "uSpeed",    "TYPE": "float", "DEFAULT": 1.0,    "MIN": 0.0,   "MAX": 3.0 },
    { "NAME": "uZoom",     "TYPE": "float", "DEFAULT": 1.0,    "MIN": 0.2,   "MAX": 4.0 },
    { "NAME": "uSources",  "TYPE": "float", "DEFAULT": 2.0,    "MIN": 1.0,   "MAX": 24.0 },
    { "NAME": "uSpacing",  "TYPE": "float", "DEFAULT": 0.95,   "MIN": 0.0,   "MAX": 3.0 },
    { "NAME": "uRing",     "TYPE": "float", "DEFAULT": 0.0,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uFreq",     "TYPE": "float", "DEFAULT": 9.0,    "MIN": 1.0,   "MAX": 40.0 },
    { "NAME": "uAngle",    "TYPE": "float", "DEFAULT": 0.0,    "MIN": -3.15, "MAX": 3.15 },
    { "NAME": "uSpin",     "TYPE": "float", "DEFAULT": 0.0,    "MIN": -1.0,  "MAX": 1.0 },
    { "NAME": "uSteer",    "TYPE": "float", "DEFAULT": 0.0,    "MIN": -1.0,  "MAX": 1.0 },
    { "NAME": "uPersp",    "TYPE": "float", "DEFAULT": 0.0,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uRelief",   "TYPE": "float", "DEFAULT": 0.8,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uGloss",    "TYPE": "float", "DEFAULT": 0.7,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uWave",     "TYPE": "float", "DEFAULT": 492.0,  "MIN": 400.0, "MAX": 700.0 },
    { "NAME": "uSpectral", "TYPE": "float", "DEFAULT": 0.0,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uJet",      "TYPE": "float", "DEFAULT": 0.0,    "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uBands",    "TYPE": "float", "DEFAULT": 0.35,   "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uDecay",    "TYPE": "float", "DEFAULT": 0.85,   "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uExposure", "TYPE": "float", "DEFAULT": 1.4,    "MIN": 0.0,   "MAX": 3.0 },
    { "NAME": "uBloom",    "TYPE": "float", "DEFAULT": 0.35,   "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uGrain",    "TYPE": "float", "DEFAULT": 0.04,   "MIN": 0.0,   "MAX": 1.0 },
    { "NAME": "uVignette", "TYPE": "float", "DEFAULT": 0.35,   "MIN": 0.0,   "MAX": 1.0 }
  ]
}*/

// DIFFRACTION - ISF port of the Shadertoy/WebGL2 version
// (GLSL ES 1.00: gl_FragColor, TIME/RENDERSIZE).

#define PI   3.14159265359
#define TAU  6.28318530718
#define NW   24          // wavelength samples in white light
// Hard ceiling on sources. Both loops below are nested and constant-bound,
// which is the shape ANGLE likes to fully unroll — 24x24 would be 576 inlined
// copies. iq's ZERO trick is the usual defence, but GLSL ES 1.00 Appendix A
// requires a constant loop initialiser and ISF validation rejects it, so the
// bounds stay literal and the early `break` in each loop carries the cost
// instead. Measured link time is ~200ms, so this is fine as it stands.
#define MAXS 24

float hash12(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// ---- CIE 1931 colour matching, analytic ---------------------
// Wyman, Sloan & Shirley — multi-lobe piecewise Gaussians. Cheap,
// and close enough that a wavelength comes out the right colour.
float pg(float x, float mu, float s1, float s2){
    float t = (x - mu) * ((x < mu) ? 1.0 / s1 : 1.0 / s2);
    return exp(-0.5 * t * t);
}

vec3 xyzBar(float w){
    return vec3(
        1.056 * pg(w, 599.8, 37.9, 31.0) + 0.362 * pg(w, 442.0, 16.0, 26.7)
              - 0.065 * pg(w, 501.1, 20.4, 26.2),
        0.821 * pg(w, 568.8, 46.9, 40.5) + 0.286 * pg(w, 530.9, 16.3, 31.1),
        1.217 * pg(w, 437.0, 11.8, 36.0) + 0.681 * pg(w, 459.0, 26.0, 13.8));
}

vec3 xyz2rgb(vec3 c){
    return vec3( 3.2406 * c.x - 1.5372 * c.y - 0.4986 * c.z,
                -0.9689 * c.x + 1.8758 * c.y + 0.0415 * c.z,
                 0.0557 * c.x - 0.2040 * c.y + 1.0570 * c.z);
}

// the plotting-package colour map, for when it should look like data
vec3 jetMap(float t){
    t = clamp(t, 0.0, 1.0);
    return clamp(vec3(1.5 - abs(4.0 * t - 3.0),
                      1.5 - abs(4.0 * t - 2.0),
                      1.5 - abs(4.0 * t - 1.0)), 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord){
    vec2  R  = RENDERSIZE;
    vec2  uv = (fragCoord - 0.5 * R) / R.y;
    float t  = TIME * uSpeed;

    // ---- where on the tank is this pixel ---------------------
    // Straight down, the plane is just the screen. Raked over, the
    // screen is a camera looking along a ground plane: depth goes as
    // 1/(horizon - y), which is what puts the sources up near the
    // vanishing point and rushes the fringes toward the viewer.
    float hz = 0.30;
    float dy = max(hz - uv.y, 0.045);
    vec2  gp = vec2(uv.x / dy, 1.0 / dy) * 0.30;
    vec2  p  = mix(uv * 2.2, gp, uPersp) * uZoom;

    // Pixel footprint on the plane. Under perspective it grows as
    // 1/dy^2, and near the horizon a fringe lands inside one pixel —
    // which aliases into moire mush unless the contrast is faded out
    // before it gets there.
    float foot = mix(2.2, 0.30 / (dy * dy), uPersp) * uZoom / R.y;

    float n    = clamp(floor(uSources + 0.5), 1.0, float(MAXS));
    float mid  = (n - 1.0) * 0.5;
    mat2  rotm = rot(uAngle + t * uSpin);
    // with the camera raked over, the sources belong out in the distance
    vec2  ctr  = vec2(0.0, mix(0.0, 2.2, uPersp));

    // The row is bent rather than re-laid-out: arc length along it is
    // preserved, so the sources keep their spacing the whole way from a
    // straight line to a closed circle. Radius = length / bend angle, which
    // runs to infinity as the bend goes to zero — hence the clamps, not a
    // branch, so there is no seam at the straight end.
    float rowL = max((n - 1.0) * uSpacing, 1e-4);
    float bend = uRing * TAU;
    float bendR = rowL / max(bend, 1e-3);
    // The arc bends off to one side, so recentre it on its own span or the
    // whole pattern drifts as it curls. At a full turn this works out to
    // exactly the bend radius, which is the circle's centre; at zero bend it
    // is exactly zero, so a straight row is untouched.
    float bendC = bendR * sin(bend * 0.25) * sin(bend * 0.25);

    float k0   = TAU * uFreq;
    float nyq  = smoothstep(2.4, 0.65, k0 * foot);   // fade past Nyquist

    // Stratified sampling with a per-pixel offset. Sampling white light
    // at fixed wavelengths lays discrete red/green/blue copies of the
    // pattern on top of each other; jittering the strata turns that
    // banding into fine noise, which the eye reads as a smooth spectrum.
    float jit = hash12(fragCoord * 1.7 + fract(TIME) * 53.0);

    vec3  XYZ  = vec3(0.0);
    float norm = 0.0;
    float hgt  = 0.0;        // luminance-weighted field, for shading
    vec2  grd  = vec2(0.0);

    for (int iw = 0; iw < NW; iw++){
        // monochromatic is the common case and one sample is exact for it
        if (iw > 0 && uSpectral < 0.02) break;

        float f = (float(iw) + jit) / float(NW);
        float w = mix(uWave, mix(402.0, 698.0, f), uSpectral);
        vec3  bar = xyzBar(w);
        // shorter wavelengths pack more fringes into the same distance
        float k = k0 * (560.0 / w);

        float psi = 0.0;
        vec2  g   = vec2(0.0);
        for (int is = 0; is < MAXS; is++){
            if (float(is) >= n) break;
            float o  = float(is) - mid;
            float sl = o * uSpacing;                  // arc length from centre
            float ba = sl / bendR;
            // 2sin^2(a/2) rather than 1-cos(a): at the straight end the bend
            // radius is enormous and the angle tiny, where 1-cos cancels away
            // most of its float32 significand and the row picks up a wobble
            float hs = sin(ba * 0.5);
            vec2  lp = vec2(bendR * sin(ba), bendR * 2.0 * hs * hs - bendC);
            vec2  dv = p - (ctr + rotm * lp);
            float r  = length(dv);
            float a  = mix(1.0, inversesqrt(r + 0.35), uDecay);
            float ph = k * (r - 0.30 * t) + o * uSteer * 2.4;
            psi += a * cos(ph);
            // exact gradient: the derivative of the same term, so the
            // relief is the field's own slope and not a filtered guess
            g   += (-a * k * sin(ph)) * dv / max(r, 1e-4);
        }
        psi /= n;
        g   /= n * max(k, 1e-3);      // slope, normalised out of frequency

        float Y = max(bar.y, 0.0);
        XYZ  += bar * clamp(psi * 0.5 + 0.5, 0.0, 1.0);
        hgt  += psi * Y;
        grd  += g   * Y;
        norm += Y;
    }
    norm = max(norm, 1e-4);
    XYZ /= norm;
    hgt  = hgt * nyq / norm;
    grd  = grd * nyq / norm;

    // ---- height -> fringe ------------------------------------
    float v = clamp(hgt * 0.5 + 0.5, 0.0, 1.0);
    v = mix(v, smoothstep(0.40, 0.60, v), uBands);

    // Hue at unit luminance, kept apart from brightness so the fringe
    // shaping above stays a pure intensity operation.
    vec3 hue = max(xyz2rgb(XYZ / max(XYZ.y, 1e-4)), 0.0);
    hue /= max(max(hue.r, max(hue.g, hue.b)), 1e-3);
    vec3 base = mix(hue, jetMap(v), uJet);

    // ---- shade it as a surface -------------------------------
    vec3 nrm = normalize(vec3(-grd * uRelief * 3.2, 1.0));
    vec3 L   = normalize(vec3(-0.38, 0.52, 0.76));
    float dif = max(dot(nrm, L), 0.0);
    float spe = pow(max(dot(reflect(-L, nrm), vec3(0.0, 0.0, 1.0)), 0.0),
                    mix(10.0, 96.0, uGloss));

    vec3 col = base * v * (0.34 + 0.92 * dif) * uExposure;
    col += vec3(1.0, 0.98, 0.94) * spe * uGloss * (0.25 + 0.75 * v) * 0.85;

    if (uBloom > 0.001){
        float l = dot(col, vec3(0.299, 0.587, 0.114));
        col += col * smoothstep(0.55, 1.35, l) * uBloom * 0.9;
    }

    // sky above the horizon, once the camera is raked over
    col *= mix(1.0, smoothstep(hz + 0.005, hz - 0.09, uv.y), uPersp);

    vec2 q = fragCoord / R;
    float vig = pow(16.0 * q.x * q.y * (1.0 - q.x) * (1.0 - q.y), 0.25);
    col *= mix(1.0, vig, uVignette);

    col += (hash12(fragCoord + fract(TIME) * 311.0) - 0.5) * uGrain * 0.09;

    fragColor = vec4(clamp(col, 0.0, 1.0), 1.0);
}

void main(){
    vec4 c;
    mainImage(c, gl_FragCoord.xy);
    gl_FragColor = c;
}
