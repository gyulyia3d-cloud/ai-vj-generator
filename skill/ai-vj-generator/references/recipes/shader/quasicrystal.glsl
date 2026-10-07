// Quasicrystal: n plane waves at equal angles over pi interfere into an aperiodic pattern with n-fold (odd n: 2n-fold)
// symmetry and no translational repeat, the optical cousin of Penrose tilings. Each wave advances a whole number of
// cycles per loop (1 or 2), so the loop closes; thresholding the sum gives islands, the iso-line gives their outline.
// p1 frequency 6-40 · p2 waves 5-11 · p3 threshold 0.4-0.9 · p4 outline 0-1
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  float n=floor(uP.y+.5), s=0.;
  for(int i=0;i<11;i++){
    float fi=float(i); if(fi>=n) break;
    float a=fi*(TAU*.5)/n+uSeed*.05;
    s+=cos(dot(uv,vec2(cos(a),sin(a)))*(uP.x+uMid*3.)+TAU*uPh*(1.+mod(fi,2.))+fi*1.3);
  }
  s=s/n*.5+.5;
  float thr=uP.z-uBass*.12;
  float fill=smoothstep(thr,thr+.012,s);
  float ring=(1.-smoothstep(0.,.008+.02*uP.w,abs(s-thr)));
  float k=clamp(fill*.5+ring*(.5+uP.w*.5)+uHit*.12,0.,1.);
  gl_FragColor=outc(mix(uC1,uC2,clamp(s+uHigh*.3,0.,1.)),k);
}
