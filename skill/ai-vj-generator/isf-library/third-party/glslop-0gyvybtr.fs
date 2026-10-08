/*{
  "DESCRIPTION": "Glass square-tube tunnel v5 — Lattice Edition",
  "CREDIT": "Craig",
  "CATEGORIES": ["generator"],
  "INPUTS": [
    { "NAME": "speed",      "TYPE": "float", "DEFAULT": 0.20, "MIN": 0.0,  "MAX": 2.0 },
    { "NAME": "yawAmt",     "TYPE": "float", "DEFAULT": 0.5,  "MIN": 0.0,  "MAX": 1.0 },
    { "NAME": "pitchAmt",   "TYPE": "float", "DEFAULT": 0.5,  "MIN": 0.0,  "MAX": 1.0 },
    { "NAME": "ringZ",      "TYPE": "float", "DEFAULT": 1.15, "MIN": 0.5,  "MAX": 3.0 },
    { "NAME": "wallR",      "TYPE": "float", "DEFAULT": 1.22, "MIN": 0.6,  "MAX": 1.30 },
    { "NAME": "paneT",      "TYPE": "float", "DEFAULT": 0.035,"MIN": 0.005,"MAX": 0.15 },
    { "NAME": "cellSize",   "TYPE": "float", "DEFAULT": 2.70, "MIN": 2.60, "MAX": 6.0 },
    { "NAME": "stepDR",     "TYPE": "float", "DEFAULT": 0.13, "MIN": 0.02, "MAX": 0.30 },
    { "NAME": "stepDW",     "TYPE": "float", "DEFAULT": 0.075,"MIN": 0.0,  "MAX": 0.20 },
    { "NAME": "barW",       "TYPE": "float", "DEFAULT": 0.36, "MIN": 0.10, "MAX": 0.60 },
    { "NAME": "barT",       "TYPE": "float", "DEFAULT": 0.085,"MIN": 0.02, "MAX": 0.25 },
    { "NAME": "chamfer",    "TYPE": "float", "DEFAULT": 0.06, "MIN": 0.0,  "MAX": 0.20 },
    { "NAME": "colRadius",  "TYPE": "float", "DEFAULT": 0.28, "MIN": 0.05, "MAX": 0.60 },
    { "NAME": "colPos",     "TYPE": "float", "DEFAULT": 0.95, "MIN": 0.40, "MAX": 1.40 },
    { "NAME": "focal",      "TYPE": "float", "DEFAULT": 1.05, "MIN": 0.40, "MAX": 2.50 },
    { "NAME": "fish",       "TYPE": "float", "DEFAULT": 0.22, "MIN": 0.0,  "MAX": 0.80 },
    { "NAME": "bounces",    "TYPE": "float", "DEFAULT": 7.0,  "MIN": 1.0,  "MAX": 12.0 },
    { "NAME": "hueShift",   "TYPE": "float", "DEFAULT": 0.0,  "MIN": 0.0,  "MAX": 1.0 },
    { "NAME": "saturation", "TYPE": "float", "DEFAULT": 1.0,  "MIN": 0.0,  "MAX": 2.0 },
    { "NAME": "exposure",   "TYPE": "float", "DEFAULT": 1.7,  "MIN": 0.2,  "MAX": 5.0 },
    { "NAME": "vignette",   "TYPE": "float", "DEFAULT": 0.45, "MIN": 0.0,  "MAX": 1.0 },
    { "NAME": "gamma",      "TYPE": "float", "DEFAULT": 1.15, "MIN": 0.5,  "MAX": 2.2 }
  ]
}*/

#define STEPS 4.
#define MOUSE_SENS_X 6.2831853
#define MOUSE_SENS_Y 3.0

vec3 gColor;
vec3 gId;
vec2 gCellId;
float gMatid;   // 0 = colored pane, 1 = terraced frame, 2 = corner column

mat2 rot(float a){ return mat2(cos(a),-sin(a),sin(a),cos(a)); }

// chamfered box in 2D
float cham(vec2 p, vec2 b){
    vec2 a = abs(p) - b;
    return max(max(a.x, a.y), (a.x + a.y)*0.7071 + chamfer);
}

float de(vec3 z){
    float CELL = max(cellSize, 2.0*wallR + 0.10);

    // 2D lattice: every cell is a parallel tunnel along z
    vec2 xy = mod(z.xy + CELL*0.5, CELL) - CELL*0.5;
    gCellId = floor((z.xy + CELL*0.5)/CELL);
    float q  = max(abs(xy.x), abs(xy.y));
    float zc = mod(z.z, ringZ) - ringZ*0.5;
    gId = vec3(gCellId, floor(z.z/ringZ));

    // terraced ring frame: ziggurat of chamfered frames
    float ring = 1e9;
    for (float k = 0.; k < STEPS; k++){
        float rr = wallR - barT - k*stepDR;
        float ww = barW - k*stepDW;
        ring = min(ring, cham(vec2(q - rr, zc), vec2(barT, ww)));
    }

    // thin accent ring halfway between the big frames
    float zc2 = mod(z.z + ringZ*0.5, ringZ) - ringZ*0.5;
    float ring2 = cham(vec2(q - (wallR - 0.16), zc2), vec2(0.05, 0.06));
    ring = min(ring, ring2);

    // scalloped corner crystal columns
    vec2 cq = abs(xy) - vec2(colPos);
    float ang = atan(cq.y, cq.x);
    float col = length(cq) - colRadius
              - 0.07*cos(zc/ringZ*6.2831)
              * (0.6 + 0.4*cos(ang*8.));

    // thin colored pane facing each bore
    float pane = abs(q - wallR) - paneT;

    float d = min(min(ring, col), pane);
    gMatid = d == pane ? 0. : (d == ring ? 1. : 2.);
    return d;
}

vec3 abnormal(vec3 p){
    vec2 dx = vec2(1.0,-1.0);
    vec2 dp = 0.004*dx;
    return normalize(
          dx.xyy*de(p+dp.xyy)
        + dx.yyx*de(p+dp.yyx)
        + dx.yxy*de(p+dp.yxy)
        + dx.xxx*de(p+dp.xxx)
    );
}

vec3 hueRotate(vec3 c, float h){
    float a = h*6.2831853;
    float s = sin(a), co = cos(a);
    mat3 m = mat3(
        0.299+0.701*co+0.168*s, 0.587-0.587*co+0.330*s, 0.114-0.114*co-0.497*s,
        0.299-0.299*co-0.328*s, 0.587+0.413*co+0.035*s, 0.114-0.114*co+0.292*s,
        0.299-0.300*co+1.250*s, 0.587-0.588*co-1.050*s, 0.114+0.886*co-0.203*s
    );
    return clamp(c*m, 0.0, 4.0);
}

// discrete candy palette
vec3 candy(float sel){
    sel = mod(sel, 5.);
    if (sel < 1.) return vec3(1.0, 0.08, 0.85);
    if (sel < 2.) return vec3(1.0, 0.85, 0.05);
    if (sel < 3.) return vec3(0.05, 0.85, 1.0);
    if (sel < 4.) return vec3(0.45, 1.0, 0.12);
    return vec3(0.55, 0.12, 1.0);
}

vec3 facet_color(vec3 p, float m){
    float CELL = max(cellSize, 2.0*wallR + 0.10);
    vec2 xy = mod(p.xy + CELL*0.5, CELL) - CELL*0.5;
    float wall = abs(xy.x) > abs(xy.y) ? (xy.x > 0. ? 0. : 2.) : (xy.y > 0. ? 1. : 3.);
    float h = fract(sin(dot(vec3(wall, gId.z, dot(gId.xy, vec2(13.1, 7.7))),
                            vec3(12.9898, 78.233, 37.719)))*43758.5453);
    vec3 pal = candy(floor(h*5.));
    pal = hueRotate(pal, hueShift);
    float lum = dot(pal, vec3(0.299,0.587,0.114));
    pal = mix(vec3(lum), pal, saturation);
    if (m > 0.5) pal = mix(pal, vec3(1.0), 0.7)*0.55;
    if (m > 1.5) pal = vec3(0.28,0.22,0.38);
    return pal;
}

void march(vec3 ro_, vec3 rd){
    vec3 p, n, tp = vec3(1.0);
    vec3 ld = normalize(vec3(0.35,0.55,-0.75));
    float t = 0., numRF = 0.;
    for(int i = 0; i < 160; i++){
        p = ro_ + rd*t;
        float d = de(p);
        if (d < 0.0004){
            float m = gMatid;
            n = abnormal(p);
            vec3 pal = facet_color(p, m);
            float ndr  = abs(dot(n,rd));
            float fres = pow(1.0-ndr, 3.0);
            float diff = 0.35 + 0.65*max(0.0, dot(n, ld));
            vec3  hlf  = normalize(ld - rd);
            float spec = pow(max(0.0, dot(n, hlf)), 32.0);
            vec3 sheen = 0.5 + 0.5*cos(14.0*ndr + vec3(0.0, 2.1, 4.2));

            if (m < 0.5){
                gColor += tp * pal * (0.70 + 0.55*fres);
                tp *= pal*0.85;
                if (numRF > bounces || max(tp.x,max(tp.y,tp.z)) < 0.02) break;
                ro_ = p + rd*0.09;
                t = 0.0; numRF++; continue;
            } else if (m < 1.5){
                gColor += tp * (pal*diff*0.20 + spec*1.8 + fres*(sheen*0.7+0.15));
            } else {
                gColor += tp * (pal*diff*0.35 + spec*2.0 + fres*sheen*0.5);
            }

            if (numRF > bounces || max(tp.x,max(tp.y,tp.z)) < 0.02) break;
            tp *= mix(pal, vec3(1.0), 0.4)*0.5;
            rd  = reflect(rd, n);
            ro_ = p + n*0.003;
            t   = 0.01;
            numRF++;
            continue;
        }
        t += d*0.9;
        if (t > 40.0) break;
    }
    gColor += tp * vec3(0.75,0.78,0.8) * smoothstep(6.0, 40.0, t) * 0.5;
}

void main(){
    vec2 p = (2.0*gl_FragCoord.xy - RENDERSIZE.xy)/RENDERSIZE.y;

    gColor = vec3(0.0);

    float yaw   = (yawAmt   - 0.5) * MOUSE_SENS_X;
    float pitch = clamp((pitchAmt - 0.5) * MOUSE_SENS_Y, -1.5, 1.5);

    vec3 ro = vec3(0.0, 0.0, TIME * speed);
    vec3 fwd = vec3( sin(yaw)*cos(pitch), sin(pitch), cos(yaw)*cos(pitch) );
    vec3 rgt = normalize(cross(vec3(0.0,1.0,0.0), fwd));
    vec3 up  = cross(fwd, rgt);

    vec3 rd = normalize( p.x*rgt + p.y*up + (focal - fish*dot(p,p))*fwd );

    march(ro, rd);

    vec3 c = 1.0 - exp(-exposure*gColor);
    c *= 1.0 - vignette*smoothstep(0.55, 1.35, length(p));
    c = pow(c, vec3(gamma));
    gl_FragColor = vec4(c, 1.0);
}