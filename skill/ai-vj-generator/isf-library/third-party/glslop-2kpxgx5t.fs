/*{
    "DESCRIPTION": "Signal Seance — a hallucinating broadcast: melting neon plasma-tech dreamscape torn apart by datamosh blocks, RGB channel rips, sync-roll dropouts and scanline static. Turn up 'glitch' for full corruption, 'dream' for deeper hallucination.",
    "CREDIT": "CC0",
    "CATEGORIES": ["generator", "glitch", "psychedelic"],
    "INPUTS": [
        { "NAME": "speed",    "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0, "MAX": 4.0 },
        { "NAME": "glitch",   "TYPE": "float", "DEFAULT": 0.55, "MIN": 0.0, "MAX": 1.0 },
        { "NAME": "dream",    "TYPE": "float", "DEFAULT": 0.65, "MIN": 0.0, "MAX": 1.0 },
        { "NAME": "rgbRip",   "TYPE": "float", "DEFAULT": 0.5,  "MIN": 0.0, "MAX": 1.0 },
        { "NAME": "scanrot",  "TYPE": "float", "DEFAULT": 0.4,  "MIN": 0.0, "MAX": 1.0 },
        { "NAME": "tintA",    "TYPE": "color", "DEFAULT": [0.10, 0.95, 0.80, 1.0] },
        { "NAME": "tintB",    "TYPE": "color", "DEFAULT": [0.95, 0.15, 0.75, 1.0] }
    ]
}*/

// ---------- hash & noise (ES 1.00 safe) ----------

float hash11(float p) {
    return fract(sin(p * 127.1) * 43758.5453123);
}

float hash21(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float vnoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    float a = hash21(i);
    float b = hash21(i + vec2(1.0, 0.0));
    float c = hash21(i + vec2(0.0, 1.0));
    float d = hash21(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p) {
    float v = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {           // constant bounds only
        v += amp * vnoise(p);
        p = p * 2.03 + vec2(17.7, -9.3);
        amp *= 0.5;
    }
    return v;
}

// soft limiter — tanh() forbidden in ES 1.00, use rational sigmoid
float softsat(float x) {
    return x / (1.0 + abs(x));
}

// iq-style cosine palette
vec3 palette(float t, vec3 a, vec3 b) {
    return 0.5 + 0.5 * cos(6.28318 * (t + vec3(0.0, 0.33, 0.67)))
         * mix(a, b, 0.5 + 0.5 * sin(t * 3.1));
}

// ---------- the hallucination underneath the static ----------

vec3 dreamScene(vec2 uv, float t, float depth) {
    vec2 p = uv * 2.0 - 1.0;
    p.x *= RENDERSIZE.x / RENDERSIZE.y;

    // melting domain warp — the picture never holds still
    vec2 w1 = vec2(fbm(p * 2.1 + t * 0.31), fbm(p * 2.1 - t * 0.27));
    vec2 w2 = vec2(fbm(p * 3.7 + w1 * 2.5 + t * 0.13),
                   fbm(p * 3.7 - w1 * 2.5 - t * 0.17));
    p += (w2 - 0.5) * (1.2 + 2.2 * depth);

    // collapsing tech-tunnel
    float r = length(p) + 0.0001;
    float ang = atan(p.y, p.x);
    float tunnel = 1.0 / r - t * 1.7;
    float spokes = sin(ang * 9.0 + t + sin(tunnel * 2.0) * depth * 3.0);

    // circuit-grid ghosting, quantized like dying VRAM
    vec2 g = p * (6.0 + 4.0 * sin(t * 0.21));
    vec2 cell = abs(fract(g) - 0.5);
    float grid = smoothstep(0.42, 0.5, max(cell.x, cell.y));
    float gridPulse = grid * (0.5 + 0.5 * sin(tunnel * 3.0 + floor(g.x) * 1.7));

    float field = sin(tunnel * 2.2) * 0.6 + spokes * 0.35 + w2.x * 2.0 * depth;

    vec3 col = palette(field * 0.35 + t * 0.05, tintA.rgb, tintB.rgb);
    col += gridPulse * mix(tintA.rgb, tintB.rgb, 0.5 + 0.5 * sin(t * 0.4)) * 0.8;
    col *= 0.55 + 0.45 * softsat(2.5 / r * 0.3);       // hot core, dim rim
    col += pow(max(1.0 - r, 0.0), 3.0) * tintB.rgb * depth;

    return col;
}

// ---------- corrupted transport layer ----------

void main() {
    float t = TIME * speed;
    vec2 uv = gl_FragCoord.xy / RENDERSIZE.xy;

    // time quantizes when glitch spikes — motion stutters like dropped frames
    float burstSeed = floor(t * 2.7);
    float burst = step(1.0 - glitch * 0.5, hash11(burstSeed)); // occasional full seizure
    float gAmt = glitch * (0.35 + 0.65 * burst);
    float tq = mix(t, floor(t * 12.0) / 12.0, burst * 0.8);

    // vertical sync roll
    uv.y = fract(uv.y + burst * scanrot * 0.35 * sin(t * 21.0) * step(0.5, hash11(burstSeed + 7.0)));

    // datamosh: rows of blocks shear sideways
    float rowScale = mix(6.0, 28.0, hash11(burstSeed + 3.0));
    float row = floor(uv.y * rowScale);
    float rowRand = hash21(vec2(row, burstSeed));
    float shear = (rowRand - 0.5) * gAmt * gAmt * (0.05 + 0.45 * step(0.75, rowRand));
    uv.x = fract(uv.x + shear);

    // block-freeze: some macroblocks sample a stale, quantized UV
    vec2 blockId = floor(uv * vec2(10.0, 7.0));
    float blockRand = hash21(blockId + burstSeed * 0.37);
    float frozen = step(1.0 - gAmt * 0.35, blockRand);
    vec2 uvGlitched = mix(uv, floor(uv * 24.0) / 24.0 + (blockRand - 0.5) * 0.06, frozen);

    // chromatic rip: each channel hallucinates its own reality
    float rip = rgbRip * (0.004 + 0.05 * gAmt) * (1.0 + burst * 2.0);
    vec2 dir = vec2(1.0, 0.13 * sin(t * 3.0));
    float depth = dream;
    vec3 col;
    col.r = dreamScene(uvGlitched + dir * rip,        tq,         depth).r;
    col.g = dreamScene(uvGlitched,                    tq + rip * 4.0, depth).g;
    col.b = dreamScene(uvGlitched - dir * rip * 1.6,  tq,         depth).b;

    // dropout bands: signal replaced by seething static
    float band = hash21(vec2(floor(uv.y * 40.0), floor(t * 9.0)));
    float dropout = step(1.0 - gAmt * 0.18, band);
    float staticNoise = hash21(gl_FragCoord.xy + fract(t) * 100.0);
    col = mix(col, vec3(staticNoise) * mix(vec3(1.0), tintA.rgb, 0.4), dropout);

    // bit-crush posterize during bursts
    col = mix(col, floor(col * 5.0) / 5.0, burst * glitch * 0.7);

    // scanlines + interlace flicker
    float scan = 0.85 + 0.15 * sin(gl_FragCoord.y * 3.14159 + t * 40.0 * scanrot);
    col *= mix(1.0, scan, scanrot);
    col += (hash21(gl_FragCoord.xy * 0.7 + t) - 0.5) * 0.06 * (0.3 + gAmt);

    // vignette + soft-clip so bursts never blow out to pure white
    vec2 v = uv - 0.5;
    col *= 1.0 - dot(v, v) * 0.9;
    col = vec3(softsat(col.r * 1.4), softsat(col.g * 1.4), softsat(col.b * 1.4)) * 1.35;

    gl_FragColor = vec4(max(col, 0.0), 1.0);
}
