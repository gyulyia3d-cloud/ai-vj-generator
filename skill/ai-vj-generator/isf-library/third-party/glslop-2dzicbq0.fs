/*{ "DESCRIPTION":"Rippling aurora nebula with flowing color bands", "INPUTS":[ {"NAME":"speed","TYPE":"float","DEFAULT":1.0,"MIN":0.0,"MAX":4.0}, {"NAME":"scale","TYPE":"float","DEFAULT":1.0,"MIN":0.3,"MAX":3.0}, {"NAME":"intensity","TYPE":"float","DEFAULT":1.0,"MIN":0.0,"MAX":2.0} ] }*/

// hash and noise utilities
float hash(vec2 p){
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float noise(vec2 p){
    vec2 i = floor(p);
    vec2 f = fract(p);
    f = f*f*(3.0-2.0*f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}

float fbm(vec2 p){
    float v = 0.0;
    float a = 0.5;
    for(int i = 0; i < 5; i++){
        v += a * noise(p);
        p *= 2.0;
        a *= 0.5;
    }
    return v;
}

void main(){
    float PERIOD = 16.0;
    float ph = fract(TIME * speed / PERIOD);
    float th = 6.2831853 * ph;
    
    vec2 uv = isf_FragNormCoord;
    vec2 p = (uv - 0.5) * scale;
    p.x *= RENDERSIZE.x / RENDERSIZE.y;
    
    // Aurora bands - vertical flowing curtains
    float t = th; // 0 to 2pi over period
    
    // Ripple distortion
    float ripple = sin(p.y * 8.0 + t * 1.0) * 0.1;
    p.x += ripple;
    
    // Nebula base
    float n1 = fbm(p * 2.0 + vec2(t * 0.0, 0.0));
    float n2 = fbm(p * 3.0 + vec2(0.0, t * 0.0) + n1);
    
    // Aurora curtain shape - multiple bands
    float band1 = sin(p.x * 3.0 + n2 * 4.0 + t * 1.0) * 0.5 + 0.5;
    float band2 = sin(p.x * 2.0 - n1 * 3.0 + t * 2.0) * 0.5 + 0.5;
    float band3 = sin(p.x * 5.0 + n2 * 2.0 - t * 1.0) * 0.5 + 0.5;
    
    // Vertical falloff for curtain feel
    float vfall = exp(-p.y * p.y * 2.0);
    
    // Colors - aurora palette
    vec3 green = vec3(0.2, 1.0, 0.4);
    vec3 cyan = vec3(0.1, 0.6, 1.0);
    vec3 purple = vec3(0.6, 0.2, 1.0);
    vec3 pink = vec3(1.0, 0.3, 0.7);
    
    vec3 col = vec3(0.0);
    col += green * band1 * vfall * n2;
    col += cyan * band2 * vfall * 0.7;
    col += purple * band3 * vfall * n1 * 0.8;
    col += pink * pow(band1, 3.0) * 0.3;
    
    // Nebula background
    vec3 neb = mix(vec3(0.02, 0.01, 0.05), vec3(0.05, 0.02, 0.1), n1);
    col += neb * 0.5;
    
    col *= intensity;
    
    // vignette
    float vig = 1.0 - dot(uv - 0.5, uv - 0.5) * 1.5;
    col *= clamp(vig, 0.0, 1.0);
    
    // gamma
    col = pow(col, vec3(0.85));
    
    gl_FragColor = vec4(col, 1.0);
}