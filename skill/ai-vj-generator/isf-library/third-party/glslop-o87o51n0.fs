/*{
  "DESCRIPTION": "Neon Liquid Water",
  "CREDIT": "you",
  "CATEGORIES": [
    "Generator"
  ],
  "INPUTS": [
    {
      "NAME": "speed",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.0,
      "MAX": 4.0
    },
    {
      "NAME": "hue",
      "TYPE": "float",
      "DEFAULT": 0.5,
      "MIN": 0.0,
      "MAX": 1.0
    }
  ]
}*/

#ifdef GL_ES
precision mediump float;
#endif

//------------------------------------------------------------

float hash(vec2 p)
{
    p = fract(p*vec2(234.34,435.345));
    p += dot(p,p+34.23);
    return fract(p.x*p.y);
}

float noise(vec2 p)
{
    vec2 i=floor(p);
    vec2 f=fract(p);

    f=f*f*(3.0-2.0*f);

    float a=hash(i);
    float b=hash(i+vec2(1.0,0.0));
    float c=hash(i+vec2(0.0,1.0));
    float d=hash(i+vec2(1.0,1.0));

    return mix(
        mix(a,b,f.x),
        mix(c,d,f.x),
        f.y);
}

float fbm(vec2 p)
{
    float v=0.0;
    float a=.5;

    for(int i=0;i<6;i++)
    {
        v+=a*noise(p);
        p*=2.03;
        a*=0.5;
    }

    return v;
}

vec3 hsv2rgb(vec3 c)
{
    vec3 rgb=clamp(abs(mod(c.x*6.0+vec3(0,4,2),6.0)-3.0)-1.0,0.0,1.0);
    rgb=rgb*rgb*(3.0-2.0*rgb);
    return c.z*mix(vec3(1.0),rgb,c.y);
}

//------------------------------------------------------------

void main()
{
    vec2 uv=isf_FragNormCoord;

    uv-=0.5;
    uv.x*=RENDERSIZE.x/RENDERSIZE.y;

    float t=TIME*speed;

    //--------------------------------------------------------
    // Domain warp
    //--------------------------------------------------------

    vec2 q;

    q.x=fbm(uv*2.5+vec2(t*0.15,t*0.08));
    q.y=fbm(uv*2.5+vec2(-t*0.12,t*0.18));

    vec2 r;

    r.x=fbm(uv*4.0+q*2.5+vec2(t*.30,-t*.25));
    r.y=fbm(uv*4.0-q*2.2+vec2(-t*.25,t*.28));

    float f=fbm(uv*5.5+r*3.0);

    //--------------------------------------------------------
    // Liquid ripples
    //--------------------------------------------------------

    float ripple=sin(14.0*f+t*2.0);
    ripple+=sin(10.0*(uv.x+uv.y)+t);
    ripple*=0.5;

    float glow=smoothstep(.25,.95,f+ripple*.18);

    //--------------------------------------------------------
    // Neon palette
    //--------------------------------------------------------

    float h=fract(
        hue+
        f*0.55+
        ripple*0.08+
        TIME*0.04
    );

    vec3 col=hsv2rgb(vec3(h,1.0,1.0));

    //--------------------------------------------------------
    // Bright liquid highlights
    //--------------------------------------------------------

    col*=1.2+glow*1.8;

    col+=vec3(
        pow(glow,4.0),
        pow(glow,3.0),
        pow(glow,2.0)
    )*0.8;

    //--------------------------------------------------------
    // Water depth
    //--------------------------------------------------------

    col*=0.45+0.75*f;

    col=pow(col,vec3(.9));

    gl_FragColor=vec4(col,1.0);
}