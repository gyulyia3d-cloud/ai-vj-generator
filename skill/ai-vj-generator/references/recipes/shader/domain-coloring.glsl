// Domain colouring of a rational function f(z) = (z^2-1)(z-a) / (z^2+b+0.3). The plane IS the complex plane; zeros and
// poles are where the iso-lines of argument converge. a and b orbit on circles (1 and 2 turns per loop), so the
// zeros and poles dance and the loop closes. Two colour roles only (palette discipline): sector parity and modulus rings.
// p1 zoom 0.8-3 · p2 argument sectors 2-12 · p3 modulus rings 0.5-4 · p4 line softness 0-0.2
vec2 cmul(vec2 a,vec2 b){return vec2(a.x*b.x-a.y*b.y,a.x*b.y+a.y*b.x);}
vec2 cdiv(vec2 a,vec2 b){return vec2(dot(a,b),a.y*b.x-a.x*b.y)/(dot(b,b)+1e-5);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 z=uv*uP.x*(1.+uBass*.08);
  float t=TAU*uPh;
  vec2 a=.6*vec2(cos(t),sin(t)), b=.55*vec2(cos(2.*t+1.),sin(2.*t+1.));
  vec2 f=cdiv(cmul(cmul(z,z)-vec2(1.,0.),z-a),cmul(z,z)+b+vec2(.3,0.));
  float arg=atan(f.y,f.x), mag=length(f);
  float sect=abs(fract(arg/TAU*uP.y)-.5)*2.;
  float ring=abs(fract(log(mag+1e-3)*uP.z*.5+.5)-.5)*2.;
  float soft=.08+uP.w+uHigh*.06;
  float k=max((1.-smoothstep(0.,soft,sect))*.9,(1.-smoothstep(0.,soft,ring))*.55);
  k*=1.-smoothstep(.7,1.5,length(uv)*.9);
  float par=smoothstep(.4,.6,fract(arg/TAU*uP.y*.5));
  gl_FragColor=outc(mix(uC1,uC2,clamp(par+uMid*.25,0.,1.)),clamp(k+uHit*.1,0.,1.));
}
