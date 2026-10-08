/*{
  "DESCRIPTION": "Viscous Oil & Deep Currents",
  "CREDIT": "Converted to ISF",
  "CATEGORIES": ["generator"],
  "INPUTS": [
    { "NAME": "speed", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.0, "MAX": 4.0 },
    { "NAME": "colorShift", "TYPE": "float", "DEFAULT": 0.0, "MIN": 0.0, "MAX": 5.0 },
    { "NAME": "zoom", "TYPE": "float", "DEFAULT": 1.0, "MIN": 0.2, "MAX": 4.0 },
    { "NAME": "fluidDetail", "TYPE": "float", "DEFAULT": 0.35, "MIN": 0.0, "MAX": 1.0, "LABEL": "Warp Distortion" },
    { "NAME": "cellIntensity", "TYPE": "float", "DEFAULT": 0.4, "MIN": 0.0, "MAX": 1.0, "LABEL": "Cell Visibility" },
    { "NAME": "neonIntensity", "TYPE": "float", "DEFAULT": 2.5, "MIN": 0.0, "MAX": 8.0, "LABEL": "Deep Glow Power" },
    { "NAME": "neonColor", "TYPE": "color", "DEFAULT": [0.1, 0.8, 1.0, 1.0], "LABEL": "Deep Glow Color" },
    { "NAME": "specularBright", "TYPE": "float", "DEFAULT": 1.8, "MIN": 0.0, "MAX": 5.0, "LABEL": "Highlight Brightness" }
  ]
}*/

// --- VISCOUS OIL & DEEP CURRENTS ---

// ==========================================
// UTILITIES & NOISE
// ==========================================

vec2 r(vec2 v, float t) {
    float s = sin(t), c = cos(t);
    return mat2(c, -s, s, c) * v;
}

vec3 aces(vec3 c) { 
    mat3 m1 = mat3(0.59719, 0.07600, 0.02840, 0.35458, 0.90834, 0.13383, 0.04823, 0.01566, 0.83777);
    mat3 m2 = mat3(1.60475, -0.10208, -0.00327, -0.53108, 1.10813, -0.07276, -0.07367, -0.00605, 1.07602);
    vec3 v = m1 * c;
    vec3 a = v * (v + 0.0245786) - 0.000090537;
    vec3 b = v * (0.983729 * v + 0.4329510) + 0.238081;
    return m2 * (a / b);
}

float no(vec3 p) {
    const float PHI = 1.618033988;
    const mat3 GOLD = mat3(
        -0.571464913, +0.814921382, +0.096597072,
        -0.278044873, -0.303026659, +0.911518454,
        +0.772087367, +0.494042493, +0.399753815
    );
    return dot(cos(GOLD * p), sin(PHI * p * GOLD));
}

float hash21(vec2 p) {
    p = fract(p * vec2(233.14, 713.41));
    p += dot(p, p + 23.45);
    return fract(p.x * p.y);
}

vec2 random2(vec2 p) {
    return vec2(hash21(p), hash21(p + vec2(12.34, 56.78)));
}

// ==========================================
// ADVANCED FLUID DYNAMICS
// ==========================================

float voronoi(vec2 x) {
    vec2 n = floor(x);
    vec2 f = fract(x);
    float minDist = 1.0;
    
    for(int j = -1; j <= 1; j++) {
        for(int i = -1; i <= 1; i++) {
            vec2 g = vec2(float(i), float(j));
            vec2 o = random2(n + g);
            o = 0.5 + 0.5 * sin((TIME * speed) * 1.0 + 6.2831 * o);
            vec2 res = g + o - f;
            minDist = min(minDist, dot(res, res));
        }
    }
    return minDist; 
}

vec3 palette(in float t) {
    vec3 a = vec3(0.2, 0.4, 0.6); 
    vec3 b = vec3(0.2, 0.4, 0.4); 
    vec3 c = vec3(1.0, 1.0, 1.0);
    vec3 d = vec3(0.1, 0.8, 0.0); 
    return a + b * cos(6.28318 * (c * t + d));
}

float map(vec2 p) {
    float t = TIME * speed;
    vec2 q = vec2(no(vec3(p, t * 0.1)), no(vec3(p + 4.2, t * 0.08)));
    vec2 w = vec2(no(vec3(p + q * 2.0, t * 0.07)), no(vec3(p - q * 2.0, t * 0.12)));
    
    // Connected to new fluidDetail input
    p += w * fluidDetail;
    
    float rippleDist = length(p + vec2(2.5, 1.5));
    
    float microFlow = sin(p.x * 12.0 + t * 1.0) * cos(p.y * 12.0 - t * 0.8) * 0.015;
    
    float h = sin(rippleDist * 14.0 - t * 1.5 + w.x * 4.0);
    h += cos(rippleDist * 9.0 + t * 1.2 - w.y * 4.0) * 0.5; 
    h = h * 0.33 + 0.5; 
    
    float cells = voronoi(p * 3.5 + w * 2.0);
    cells = smoothstep(0.0, 1.0, cells);
    
    // Connected to new cellIntensity input
    h = mix(h, cells, cellIntensity * cells); 
    
    return pow(max(h + microFlow, 0.0), 1.2); 
}

vec3 getNormal(vec2 p) {
    vec2 e = vec2(0.01, 0.0);
    float dx = map(p + e.xy) - map(p - e.xy);
    float dy = map(p + e.yx) - map(p - e.yx);
    vec3 n = normalize(vec3(dx, dy, 0.35));
    
    float flowNoise = no(vec3(p * 8.0, (TIME * speed) * 0.8)) * 0.02;
    n.xy += flowNoise;
    
    return normalize(n);
}

vec3 getFluidColor(vec2 uv) {
    float t = TIME * speed;
    float dist = length(uv);
    float height = map(uv);
    vec3 normal = getNormal(uv);
    
    float isPolarized = sin(dist * 5.0 - t * 1.5 + normal.x * 2.0) * 0.5 + 0.5;
    
    float lightX = sin(t * 0.5) * 1.5;
    float lightY = cos(t * 0.3) * 1.5;
    vec3 lightDir = normalize(vec3(lightX, lightY, 1.2));
    vec3 viewDir = vec3(0.0, 0.0, 1.0);
    
    float diff = max(dot(normal, lightDir), 0.0);
    float fresnel = 1.0 - max(dot(normal, viewDir), 0.0);
    
    float baseColorIndex = dist * 0.3                        
                         + sin(uv.x * 3.0 + uv.y * 4.0 + t * 0.3) * 0.2  
                         + fresnel * 0.9                    
                         - t * 0.15                      
                         + height * 0.8                     
                         + isPolarized * 0.6
                         + colorShift; 
                         
    float chromOffset = dist * 0.08 + fresnel * 0.04; 
    vec3 oilColor;
    oilColor.r = palette(baseColorIndex - chromOffset).r;
    oilColor.g = palette(baseColorIndex).g;
    oilColor.b = palette(baseColorIndex + chromOffset).b;
    
    vec3 col = oilColor * (diff * 0.6 + 0.3); 
    
    vec3 glowPhase = vec3(3.0, 1.5, 0.5) + isPolarized * vec3(2.0, -2.0, 1.0);
    vec3 shader2Glow = (1.0 + 1.5 * sin(height * 6.0 + length(uv * 6.0) + t * 0.8 + glowPhase));
    float creviceMask = smoothstep(0.5, 0.05, height);
    col += shader2Glow * creviceMask * 0.4;

    float specR = pow(max(dot(reflect(-lightDir, normal + vec3(0.03, 0.0, 0.0)), viewDir), 0.0), 22.0);
    float specG = pow(max(dot(reflect(-lightDir, normal), viewDir), 0.0), 28.0);
    float specB = pow(max(dot(reflect(-lightDir, normal - vec3(0.03, 0.0, 0.0)), viewDir), 0.0), 34.0);
    
    // Connected to new specularBright input
    vec3 prismaticSpec = vec3(specR, specG, specB) * specularBright * vec3(0.85, 0.95, 1.0); 
    
    col += prismaticSpec; 
    col += pow(fresnel, 3.5) * palette(baseColorIndex + 0.4) * 0.7;
    col *= height * 0.7 + 0.3;
    
    float deepMask = smoothstep(0.2, -0.05, height); 
    float deepNoise = no(vec3(uv * 10.0 - normal.xy * 2.0, t * 1.0));
    
    // Connected to neonColor and neonIntensity inputs
    vec3 deepNeon = neonColor.rgb * (deepNoise * 0.5 + 0.5); 
    col += deepNeon * deepMask * neonIntensity;

    vec3 polarizedCol = col.brg * vec3(1.5, 0.8, 1.3); 
    col = mix(col, polarizedCol, isPolarized * 0.7);

    return col;
}

// ==========================================
// MAIN COMPOSITION
// ==========================================

void main() {
    vec2 uv = ((gl_FragCoord.xy - 0.5 * RENDERSIZE.xy) / RENDERSIZE.y) * zoom;
    float dist = length(uv);
    
    vec3 finalColor = getFluidColor(uv);
    
    finalColor *= smoothstep(1.4 * zoom, 0.15 * zoom, dist);
    
    finalColor = aces(finalColor);

    gl_FragColor = vec4(finalColor, 1.0);
}