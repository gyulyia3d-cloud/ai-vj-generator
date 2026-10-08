/*{
    "DESCRIPTION": "Procedural Matrix Digital Rain — trails now stream up behind the falling heads, and the fade drops out the bottom instead of the top.",
    "CREDIT": "ChatGPT, direction fix by Claude",
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

    // isf_FragNormCoord is y-up, so cells above the head are the ones the
    // drop has already passed. Measuring y-head (not head-y) puts the trail
    // there instead of below the head.
    float trail=mod(y-head+grid.y,grid.y);

    //------------------------------------
    // character
    //------------------------------------

    // floor(t) so glyphs flip in place rather than sliding the whole field
    float charID=floor(mod(cell.y+floor(t*7.0)+rnd*100.0,96.0));

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
    // subtle fog — dissolve toward the bottom, where the rain exits
    //------------------------------------

    color*=1.0-smoothstep(.0,1.2,1.0-uv.y);

    gl_FragColor=vec4(color,1.0);
}
