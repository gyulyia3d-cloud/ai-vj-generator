/*{
    "DESCRIPTION": "Procedural Matrix Digital Rain",
    "CREDIT": "ChatGPT",
    "CATEGORIES": [
        "Generator"
    ],
    "INPUTS": [
        {
            "NAME":"speed",
            "TYPE":"float",
            "DEFAULT":1.0,
            "MIN":0.0,
            "MAX":4.0
        },
        {
            "NAME":"density",
            "TYPE":"float",
            "DEFAULT":1.0,
            "MIN":0.5,
            "MAX":3.0
        },
        {
            "NAME":"glow",
            "TYPE":"float",
            "DEFAULT":1.2,
            "MIN":0.0,
            "MAX":3.0
        },
        {
            "NAME":"brightness",
            "TYPE":"float",
            "DEFAULT":1.0,
            "MIN":0.2,
            "MAX":3.0
        }
    ]
}*/

float hash(float n)
{
    return fract(sin(n)*43758.5453123);
}

float hash2(vec2 p)
{
    return fract(sin(dot(p,vec2(27.3,91.7)))*43758.5453);
}

// 5x7 procedural glyph
float glyph(vec2 uv,float id)
{
    uv*=vec2(5.0,7.0);

    vec2 cell=floor(uv);

    float n=hash(dot(cell,vec2(17.0,31.0))+id*83.0);

    return step(0.55,n);
}

void main()
{
    vec2 uv=isf_FragNormCoord;

    uv.x*=RENDERSIZE.x/RENDERSIZE.y;

    float cols=90.0*density;

    vec2 grid=vec2(cols,floor(cols*1.8));

    vec2 g=uv*grid;

    vec2 cell=floor(g);

    vec2 local=fract(g);

    //------------------------------------
    // randomize each column
    //------------------------------------

    float column=floor(cell.x);

    float rnd=hash(column);

    float speedMul=mix(.5,2.2,rnd);

    float t=TIME*speed*speedMul;

    //------------------------------------
    // falling position
    //------------------------------------

    float y=mod(cell.y+t*20.0+rnd*300.0,grid.y);

    float head=hash(column*9.0)*grid.y;

    float trail=head-y;

    trail=mod(trail+grid.y,grid.y);

    //------------------------------------
    // character
    //------------------------------------

    float charID=floor(mod(cell.y+t*7.0+rnd*100.0,96.0));

    float pix=glyph(local,charID);

    //------------------------------------
    // fade trail
    //------------------------------------

    float fade=exp(-trail*0.12);

    //------------------------------------
    // bright leading character
    //------------------------------------

    float leader=smoothstep(1.5,0.0,trail);

    //------------------------------------
    // random flicker
    //------------------------------------

    float flicker=.6+.4*sin(TIME*20.0+column*3.1+cell.y);

    //------------------------------------
    // color
    //------------------------------------

    vec3 green=vec3(0.05,1.0,0.15);

    vec3 color=green*pix*fade*flicker*brightness;

    color+=vec3(1.0)*leader*pix;

    //------------------------------------
    // bloom
    //------------------------------------

    color+=green*leader*glow;

    //------------------------------------
    // subtle fog
    //------------------------------------

    color*=1.0-smoothstep(.0,1.2,uv.y);

    gl_FragColor=vec4(color,1.0);
}