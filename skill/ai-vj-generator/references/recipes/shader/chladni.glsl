// Chladni figures: the nodal lines of a vibrating square plate, f = cos(n pi x) cos(m pi y) - cos(m pi x) cos(n pi y).
// Sand collects where f = 0. Two mode pairs are blended, so the figure morphs smoothly instead of jumping between modes.
// One plate per height-sized module on wide canvases, each module with a different mode pair.
// p1 mode n 2-9 · p2 offset m-n 1-5 · p3 line width 0.02-0.2 · p4 morph spread 1-3
void main(){
  float H=uRes.y; vec2 fc=gl_FragCoord.xy; float mi=floor(fc.x/H);
  vec2 q=vec2(fract(fc.x/H),fc.y/H);
  float P=TAU*.5;
  float n=floor(uP.x+.5)+mod(mi,3.), m=n+floor(uP.y+.5);
  float n2=n+floor(uP.w+.5), m2=m+2.+mod(mi,2.);
  float f1=cos(n*P*q.x)*cos(m*P*q.y)-cos(m*P*q.x)*cos(n*P*q.y);
  float f2=cos(n2*P*q.x)*cos(m2*P*q.y)-cos(m2*P*q.x)*cos(n2*P*q.y);
  float s=clamp(.5+.5*sin(TAU*uPh+mi*.9)+uMid*.25,0.,1.);
  float f=mix(f1,f2,s);
  float w=uP.z*(.6+.5*min(uBass,1.));
  float line=1.-smoothstep(0.,w,abs(f));
  float sand=hash(floor(fc*.5)+uSeed+floor(uPh*12.));
  float grain=mix(.65,1.,step(.35-uHigh*.3,sand));
  float fill=.1*step(0.,f);
  float edge=smoothstep(0.,.02,min(min(q.x,1.-q.x),min(q.y,1.-q.y)));
  float k=clamp((line*grain+fill+uHit*.12)*edge,0.,1.);
  gl_FragColor=outc(mix(uC1,uC2,clamp(abs(f)*.5+uHigh*.4,0.,1.)),k);
}
