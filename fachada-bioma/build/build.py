import json, sys
sys.path.insert(0,'.')
import act1, act2

def L(type_, name, role, p=None, **kw):
    d={"type":type_,"name":name,"role":role,"on":True,"opacity":kw.pop('opacity',1),"blend":kw.pop('blend','normal'),"p":p or {}}
    d.update(kw); return d
def shader(name, role, src, c1='primary', c2='accent', cbg='bg', alpha=False, res=1, **kw):
    return L('shader',name,role,{"src":src,"alphaMode":"alpha" if alpha else "opaque","c1":c1,"c2":c2,"cbg":cbg,"res":res},**kw)
FORA=lambda: L('image','FORA DA FACHADA','finish: black outside the building silhouette, no light is wasted on the sky',{"media":"fora.png","fit":"fill"})
RELEVO=lambda op=.6: L('image','RELEVO DE PEDRA','structure: the clay render multiplies the light, so cornices, columns and recesses cast the shading that fakes real volume',{"media":"relevo.png","fit":"fill"},blend='multiply',opacity=op)
def contorno(src, name='CONTORNO DA SONDA'):
    return L('code',name,'instrument: the architect\'s own outline, drawn by the probe as it reads the facade',{"src":src})
def radar(cx,cy,name,size=.075):
    return L('instrument',name,'instrument: the star medallion becomes a sensor eye; radar sweeps once per bar',{"kind":"radar","n":48,"size":size,"cx":cx,"cy":cy,"weight":3,"color":"primary","hot":"accent"},blend='add')
def bloom(r=14,thr=.5,inten=1.0,mix=.7):
    return L('fx','BRILHO DA LENTE','finish: soft bloom, the lamp of the probe',{"preset":"BLOOM","p1":r,"p2":thr,"p3":inten,"p4":.3,"mix":mix,"res":.5})

CONT1 = r'''
const ph=K.t.lph; const rv=K.clamp((ph-.06)/.68,0,1); const fade=1-K.clamp((ph-.86)/.12,0,1);
c.save(); c.globalAlpha=(.25+.75*rv)*fade*(.7+.3*K.t.pulse);
c.beginPath(); c.rect(0,0,K.w,K.h*rv); c.clip();
K.drawImg(c,'linhas.png',K.w/2,K.h/2,K.w,K.h,K.col('primary'),1);
c.restore();
'''
comp1 = {"name":"CALIBRAÇÃO","hypothesis":"ABERTURA — the probe wakes in the dark and reads the facade: a sweep descends, sonar rings leave every opening, and the windows open as depth grids.","motion":"step",
 "palette":{"primary":"#36F1FF","secondary":"#E9FFFF","accent":"#FF3D9A"},
 "layers":[
  {"type":"bg","name":"NOITE DA PRAÇA","role":"ground: pure black, the facade only exists where the probe lights it","on":True,"p":{"grain":0}},
  shader('SONAR DAS ABERTURAS','hero: topographic rings, ticks and lattice that follow each opening, column and tower; revealed behind the descending scan',act1.A,'primary','accent','#0B2A55'),
  shader('TÚNEIS DE PROFUNDIDADE','hero: each window opens as a perspective grid tunnel, one after the other, to sell depth behind the wall',act1.B,'primary','accent','#0B2A55',alpha=True),
  RELEVO(.55), contorno(CONT1),
  radar(299/1920,482/1520,'OLHO ESQUERDO'), radar(1607/1920,469/1520,'OLHO DIREITO'),
  bloom(), FORA()]}


def flow(name,role,count=500,color='secondary',hot='accent',amp=.1,scale=2.2,alpha=.6,width=1.6,trail=7):
    return L('flow',name,role,{"count":count,"trail":trail,"amp":amp,"scale":scale,"radius":.9,"width":width,"alpha":alpha,"acc":.12,"color":color,"hot":hot},blend='add')
def fxd(name,role,preset,p1,p2,p3,p4,keys,mixmax,k='mix'):
    return L('fx',name,role,{"preset":preset,"p1":p1,"p2":p2,"p3":p3,"p4":p4,"mix":0.0,"res":.6},
             mod=[{"k":k,"src":"lfo","shape":"env","cycles":1,"keys":keys,"min":0,"max":mixmax,"mode":"set"}])
CONT2 = r"""
const ph=K.t.lph; const g=Math.sin(Math.PI*K.clamp((ph-.03)/.92,0,1)); const a=.12+.5*g*g;
c.save(); c.globalAlpha=a*(.75+.25*K.t.pulse); K.drawImg(c,'linhas.png',K.w/2,K.h/2,K.w,K.h,K.col('secondary'),1); c.restore();
"""
comp2 = {"name":"DOSSEL","hypothesis":"MERGULHO — the probe descends into the Amazon: vines grow from the stairs up the stone, and every window opens, as the vines reach it, onto a living canopy; the stars become jaguar eyes.","motion":"smooth",
 "palette":{"primary":"#36F1FF","secondary":"#7CFF3B","accent":"#FF2E97"},
 "layers":[
  {"type":"bg","name":"MATA FECHADA","role":"ground: black forest floor, the stone is only alive where vines have reached","on":True,"p":{"grain":0}},
  shader('SEIVA E CIPÓS','hero: a wavefront of veins, leaves and lianas grows from the stairs over walls, columns and towers, then withdraws',act2.A,'secondary','accent','#021A10'),
  shader('DOSSEL PROFUNDO','hero: each opening is a window into layered canopy with parallax, light shafts and fireflies; it opens when the vine front arrives',act2.B,'secondary','accent','#021A10',alpha=True),
  flow('ESPÓRULOS','instrument: spores drift through the wavefront, the air of the forest',count=420,amp=.12,alpha=.55),
  RELEVO(.6), contorno(CONT2),
  fxd('RESPIRO DA PEDRA','structure: the stone breathes, a slow displacement while the vines are alive','DESLOCAR',9,3,1,90,[0,.7,1,.7,0],.55),
  bloom(16,.45,1.1,.75), FORA()]}

import comps345
comp3,comp4,comp5=comps345.make(L,shader,flow,fxd,RELEVO,contorno,bloom,FORA)

def project(comps):
    return {"schema":"ai-vj-generator/2","id":"diario-de-campo","seed":20261010,
     "meta":{"lang":"pt","name":"DIÁRIO DE CAMPO","artist":"","context":"Video mapping de fachada, tema Natureza Brasileira","brief":"Sonda científica que explora os biomas brasileiros sobre uma fachada arquitetônica."},
     "canvas":{"w":1920,"h":1520,"fps":30,"target":"mapping","safe":0.03},
     "time":{"bpm":100,"bars":16,"loop":True,"seamless":True,"mode":"loop","transition":"fade","trBeats":1},
     "audio":{"reactive":True,"sens":1,"smooth":0.7},
     "palette":{"bg":"#000000","primary":"#36F1FF","secondary":"#B6FF3B","accent":"#FF3D9A"},
     "compositions":comps}
if __name__=='__main__':
    import meta
    json.dump(meta.apply(project([comp1,comp2,comp3,comp4,comp5])),open('../diario.aivj.json','w',encoding='utf-8'),ensure_ascii=False,indent=1)
    print('written')
