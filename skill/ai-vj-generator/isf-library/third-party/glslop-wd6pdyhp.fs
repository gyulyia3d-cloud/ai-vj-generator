/*{
  "DESCRIPTION": "Rainbow Matrix Falling Characters",
  "CREDIT": "you",
  "CATEGORIES": ["generator"],
  "INPUTS": [
    {
      "NAME": "speed",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.1,
      "MAX": 5.0
    },
    {
      "NAME": "density",
      "TYPE": "float",
      "DEFAULT": 45.0,
      "MIN": 10.0,
      "MAX": 120.0
    },
    {
      "NAME": "characterSize",
      "TYPE": "float",
      "DEFAULT": 18.0,
      "MIN": 5.0,
      "MAX": 50.0
    },
    {
      "NAME": "rainbow",
      "TYPE": "float",
      "DEFAULT": 1.0,
      "MIN": 0.0,
      "MAX": 1.0
    }
  ]
}*/


// random generator
float hash(float n)
{
    return fract(sin(n)*43758.5453123);
}


// pseudo character pattern
float character(vec2 p, float seed)
{
    p *= 5.0;

    float r = hash(seed);

    float pattern = step(
        0.45,
        fract(
            sin(
                dot(
                    floor(p),
                    vec2(12.9898,78.233)
                )
            )*43758.5453
        )
    );

    return pattern;
}


// HSV rainbow
vec3 hsv(float h)
{
    vec3 rgb = clamp(
        abs(
            mod(
                h*6.0 + vec3(0.0,4.0,2.0),
                6.0
            )-3.0
        )-1.0,
        0.0,
        1.0
    );

    return rgb;
}


void main()
{

    vec2 uv = isf_FragNormCoord;

    vec3 color = vec3(0.0);


    // columns
    float columns = density;

    float xIndex = floor(uv.x * columns);

    float columnSeed = hash(xIndex);


    // falling animation
    float fall =
        fract(
            TIME *
            speed *
            (0.3 + columnSeed)
            +
            columnSeed
        );


    float y =
        uv.y * columns;


    float stream =
        fract(
            uv.y * columns
            +
            fall
        );


    // character positions
    vec2 charUV;

    charUV.x =
        fract(uv.x * columns);

    charUV.y =
        fract(
            uv.y *
            characterSize
        );


    float mask =
        character(
            charUV,
            columnSeed +
            floor(y)
        );


    // distance fade trail
    float trail =
        smoothstep(
            1.0,
            0.0,
            stream
        );


    // rainbow color
    vec3 rainColor =
        hsv(
            fract(
                xIndex /
                columns
                +
                TIME *
                0.05
            )
        );


    rainColor *= rainbow + 0.15;


    color +=
        rainColor *
        mask *
        trail;


    // glow
    color +=
        rainColor *
        0.15 *
        trail;


    gl_FragColor =
        vec4(
            color,
            1.0
        );
}