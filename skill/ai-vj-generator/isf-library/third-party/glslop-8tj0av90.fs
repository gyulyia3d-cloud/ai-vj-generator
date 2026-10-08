/*{
  "DESCRIPTION": "Clean Liquid Flow Noise",
  "CREDIT": "you",
  "CATEGORIES": ["generator"],
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
    },
    {
      "NAME": "warp",
      "TYPE": "float",
      "DEFAULT": 0.8,
      "MIN":0.0,
      "MAX":2.0
    },
    {
      "NAME": "ripples",
      "TYPE":"float",
      "DEFAULT":0.7,
      "MIN":0.0,
      "MAX":3.0
    }
  ]
}*/


float hash(vec2 p)
{
    return fract(
        sin(dot(p,vec2(127.1,311.7)))
        *43758.5453
    );
}


float noise(vec2 p)
{

    vec2 i = floor(p);
    vec2 f = fract(p);

    f = f*f*(3.0-2.0*f);


    float a = hash(i);
    float b = hash(i+vec2(1.0,0.0));
    float c = hash(i+vec2(0.0,1.0));
    float d = hash(i+vec2(1.0,1.0));


    return mix(
        mix(a,b,f.x),
        mix(c,d,f.x),
        f.y
    );

}



float fbm(vec2 p)
{

    float value = 0.0;
    float amplitude = 0.5;


    for(int i = 0; i < 5; i++)
    {

        value += noise(p) * amplitude;

        p *= 2.0;

        amplitude *= 0.5;

    }


    return value;

}



void main()
{

    vec2 uv = isf_FragNormCoord;


    uv -= 0.5;

    uv.x *= RENDERSIZE.x / RENDERSIZE.y;



    float time = TIME * speed * 0.15;



    // smooth liquid motion
    vec2 flow;

    flow.x = fbm(
        uv*1.8 + time
    );

    flow.y = fbm(
        uv*1.8 - time
    );



    // gentle warp
    uv += (flow - 0.5) * warp;



    // prevent edge artifacts
    uv = clamp(
        uv,
        -1.5,
        1.5
    );



    // water ripple field
    float ripple = sin(
        length(uv)*8.0
        -
        time*3.0
        +
        fbm(uv*2.5)*5.0
    );



    ripple *= 0.15;



    float liquid = fbm(
        uv*3.0 + ripple*ripples
    );



    // smooth liquid contrast
    liquid = smoothstep(
        0.15,
        0.85,
        liquid
    );



    // your original rainbow color idea
    vec3 col = 0.5 + 0.5*cos(
        liquid*6.2831
        +
        vec3(
            0.0,
            2.0,
            4.0
        )
        +
        hue*6.2831
    );



    // soft glossy highlights
    col += pow(liquid,5.0)*0.25;



    gl_FragColor = vec4(
        col,
        1.0
    );

}