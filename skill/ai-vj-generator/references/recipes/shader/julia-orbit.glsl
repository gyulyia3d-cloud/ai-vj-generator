// Julia set on an orbit: z <- z^2 + c with c = r e^{i 2 pi phase}. One revolution of c per loop morphs the whole set
// (dendrite, dust, spiral, island) and returns exactly. Smooth escape time drives travelling bands that move outward
// (2 cycles per loop). Interior can be filled or left dark.
// p1 zoom 0.8-3 · p2 band density 4-30 · p3 radius of c 0.6-0.85 · p4 interior fill 0-1
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 z=uv*uP.x;
  float a=TAU*uPh, r=uP.z*(1.+uBass*.02);
  vec2 c=r*vec2(cos(a),sin(a));
  float it=0.; float esc=0.;
  for(int i=0;i<56;i++){
    if(dot(z,z)>64.){esc=1.; break;}
    z=vec2(z.x*z.x-z.y*z.y,2.*z.x*z.y)+c; it+=1.;
  }
  float mu=it-log2(log2(dot(z,z)+1.001)+.001);
  float bands=.5+.5*sin(mu*uP.y*.35-TAU*uPh*2.);
  float outside=esc*smoothstep(.35,.95,bands)*(1.-smoothstep(10.,56.,it)*.7);
  float inside=(1.-esc)*uP.w;
  float k=clamp(outside+inside+uHit*.1,0.,1.);
  gl_FragColor=outc(mix(uC1,uC2,clamp(mu/40.+uHigh*.3+uMid*.2,0.,1.)),k);
}
