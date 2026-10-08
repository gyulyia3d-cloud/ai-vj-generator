/*{ "DESCRIPTION":"Nocturnal Reliquary Tide — a dark animated rose-orb where nested gyroid shells, stained-glass symmetry, and a drifting vesica tunnel interlace in deep teal, violet, and ember light.", "CATEGORIES":["generative"], "INPUTS":[] }*/
#define PI 3.14159265359
#define TAU 6.28318530718

mat2 rot(float a){
  float c=cos(a),s=sin(a);
  return mat2(c,-s,s,c);
}

float hash21(vec2 p){
  return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);
}

vec3 palette(float x){
  return 0.5+0.5*cos(TAU*(x+vec3(0.58,0.78,0.98)));
}

float ring(vec2 p,vec2 c,float r){
  return abs(length(p-c)-r);
}

float line(float d,float w,float aa){
  return 1.0-smoothstep(w,w+aa,d);
}

void main(){
  vec2 uv=(gl_FragCoord.xy-0.5*RENDERSIZE.xy)/RENDERSIZE.y;
  float t=TIME*0.16;
  float r=length(uv);
  float a=atan(uv.y,uv.x);

  uv*=1.0+0.025*sin(TAU*t);
  r=length(uv);
  a=atan(uv.y,uv.x);

  float N=12.0;
  float sec=TAU/N;
  float fa=mod(a+t,sec)-0.5*sec;
  fa=abs(fa);
  vec2 rose=vec2(cos(fa),sin(fa))*r;

  float px=2.0/RENDERSIZE.y;
  float aa=px*5.0;

  vec3 col=vec3(0.006,0.008,0.025);
  col+=vec3(0.025,0.018,0.070)*smoothstep(1.25,0.05,r);

  /* Nested reliquary membranes */
  float shellCoord=r*6.2+0.10*sin(fa*24.0-t*3.0);
  float shell=line(abs(fract(shellCoord)-0.5),0.035,aa*3.0);

  vec2 gq=rose*5.0;
  float gy=sin(gq.x+t)*cos(gq.y-t)+sin(gq.y*1.13-t)*cos(gq.x*0.87+t);
  float lace=line(abs(gy),0.075,0.035);
  float shellTint=fract(floor(shellCoord)+0.23*sin(fa*8.0));
  vec3 shellCol=palette(shellTint+0.12*sin(t));
  col+=shellCol*shell*(0.35+0.75*lace);

  /* Flower-of-life vesica lattice in a scrolling log-polar tunnel */
  float lr=log(max(r,0.012))/1.05+t;
  float ly=fa*N/TAU*2.0;
  vec2 lp=vec2(lr,ly);
  vec2 cell=fract(lp*2.15)-0.5;
  vec2 cid=floor(lp*2.15);
  float vd=9.0;

  for(int j=-1;j<=1;j++){
    for(int i=-1;i<=1;i++){
      vec2 o=vec2(float(i),float(j));
      vec2 c=o;
      c.x+=mod(cid.y+o.y,2.0)*0.5-0.25;
      vd=min(vd,ring(cell,c,0.61));
    }
  }

  float lattice=line(vd,0.018,aa*2.0);
  float phase=0.5+0.5*sin(TAU*(lr+0.13*sin(t)));
  vec3 irid=mix(vec3(0.10,0.42,0.48),vec3(0.38,0.10,0.48),phase);
  col+=irid*lattice*(0.65+0.5*lace);

  /* Counterwoven logarithmic spiral filaments */
  float arm=abs(fract(lr*2.0+a/TAU*3.0+0.15*sin(t))-0.5);
  float arm2=abs(fract(lr*2.0-a/TAU*2.0-t*0.12)-0.5);
  float spiral=line(min(arm,arm2),0.014,aa*2.0);
  col+=vec3(0.55,0.20,0.07)*spiral*0.9;

  /* Rose-window mullions and concentric stone rims */
  float spoke=line(fa,0.012,aa*2.0);
  float rim=line(abs(r-0.73),0.018,aa*2.0);
  float rim2=line(abs(r-0.38),0.012,aa*2.0);
  col+=vec3(0.045,0.055,0.105)*(spoke+rim+rim2)*1.7;

  /* Burning hollow heart */
  float heart=exp(-18.0*r*r);
  float pulse=0.65+0.35*sin(TAU*t*2.0);
  col+=vec3(0.34,0.055,0.035)*heart*pulse;
  col+=vec3(0.85,0.28,0.07)*exp(-70.0*r*r)*pulse;

  /* Travelling stained-glass glints */
  float gl=pow(max(0.0,sin(lr*9.0-fa*17.0-t*4.0)),18.0);
  col+=palette(0.08+phase)*gl*0.8;

  float vign=smoothstep(1.18,0.30,r);
  col*=vign;
  col=pow(max(col,0.0),vec3(0.82));
  gl_FragColor=vec4(col,1.0);
}