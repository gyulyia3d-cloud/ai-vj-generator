# comps 3-5, imported by build.py
import act3, act4, act5

def make(L, shader, flow, fxd, RELEVO, contorno, bloom, FORA):
    CONT3 = r"""
const ph=K.t.lph; const rise=Math.sin(Math.PI*K.clamp((ph-.06)/.86,0,1)); const a=.10+.5*rise*rise;
c.save(); c.globalAlpha=a*(.75+.25*K.t.pulse); K.drawImg(c,'linhas.png',K.w/2,K.h/2,K.w,K.h,K.col('primary'),1); c.restore();
"""
    CONT4 = r"""
const ph=K.t.lph; const g=Math.sin(Math.PI*K.clamp((ph-.04)/.9,0,1)); const a=.10+.45*g*g;
c.save(); c.globalAlpha=a*(.75+.25*K.t.pulse); K.drawImg(c,'linhas.png',K.w/2,K.h/2,K.w,K.h,K.col('secondary'),1); c.restore();
"""
    CONT5 = r"""
const ph=K.t.lph; const g=Math.sin(Math.PI*K.clamp((ph-.04)/.88,0,1)); const a=.12+.7*g*g;
c.save(); c.globalAlpha=a*(.7+.3*K.t.pulse); K.drawImg(c,'linhas.png',K.w/2,K.h/2,K.w,K.h,'#FFFFFF',1); c.restore();
"""
    comp3 = {"name":"ÁGUAS","hypothesis":"MARÉ — the probe reaches the Pantanal: water rises through the facade, the lower floors dissolve into caustics and reeds, and every window opens onto a sunrise horizon reflected on the flood.","motion":"smooth",
     "palette":{"primary":"#36F1FF","secondary":"#00C2FF","accent":"#FFB347"},
     "layers":[
      {"type":"bg","name":"NOITE ALAGADA","role":"ground: black, the water is the only light that rises","on":True,"p":{"grain":0}},
      shader('ÁGUA QUE SOBE','hero: the waterline climbs the stone with waves, caustics, bubbles and reeds, and drops ripple rings on every beat; above it, dawn colours the wall',act3.A,'secondary','accent','#021A3A'),
      shader('HORIZONTES','hero: each opening shows a sunrise horizon with its reflection on the water; the flood tints whatever sinks below the line',act3.B,'secondary','accent','#021A3A',alpha=True),
      flow('LIBÉLULAS','instrument: dragonflies, small fast sparks above the flood',count=260,color='accent',hot='primary',amp=.16,scale=3,alpha=.7,width=1.8,trail=5),
      RELEVO(.6), contorno(CONT3),
      fxd('FACHADA DERRETE EM ÁGUA','structure: a liquid-glass refraction melts the stone into the flood while the water is high','VIDRO LÍQUIDO',22,6,.6,.5,[0,0,.5,.9,.9,.6,.1,0],.8),
      bloom(16,.45,1.1,.7), FORA()]}
    comp4 = {"name":"BRASA","hypothesis":"SECA — Cerrado and Caatinga: heat rises from the ground cracking the stone, cornices and columns melt like wax, then the first rain blooms ipê flowers out of the cracks.","motion":"smooth",
     "palette":{"primary":"#36F1FF","secondary":"#FF8A00","accent":"#FF2E7A"},
     "layers":[
      {"type":"bg","name":"CHÃO SECO","role":"ground: black ground until the heat reaches it","on":True,"p":{"grain":0}},
      shader('TERRA RACHADA','hero: voronoi earth cracks lit from below by rising lava, then wax-like drips fall from every ledge, then ipê flowers open from the cells',act4.A,'secondary','accent','#2A0800'),
      shader('MIRAGENS','hero: openings show cerrado sunsets and caatinga cactus under heat shimmer; the eyes of the probe become embers',act4.B,'secondary','accent','#2A0800',alpha=True),
      flow('FAÍSCAS','instrument: embers rising with the heat',count=380,color='secondary',hot='accent',amp=.09,scale=2.4,alpha=.65,width=1.6,trail=6),
      RELEVO(.6), contorno(CONT4),
      fxd('MIRAGEM DE CALOR','structure: vertical heat shimmer displaces the image while the ground burns and melts','DESLOCAR',16,4,1,90,[0,.5,1,1,.7,.2,0,0],.75),
      bloom(18,.4,1.25,.75), FORA()]}
    comp5 = {"name":"CONVERGÊNCIA","hypothesis":"TRANSMISSÃO — Mata Atlântica and the meeting of all biomes: each architectural zone carries a different biome, the borders melt, the stars flare and the probe transmits everything it read before going dark.","motion":"smooth",
     "palette":{"primary":"#36F1FF","secondary":"#FF6F61","accent":"#8A5CFF"},
     "layers":[
      {"type":"bg","name":"NOITE DO BRASIL","role":"ground: black, the last act starts and ends in the dark","on":True,"p":{"grain":0}},
      shader('MOSAICO DE BIOMAS','hero: towers carry the forest, columns the flood, the upper floor the dry earth, the lower floor the Atlantic mist; their borders melt into one body at the climax',act5.A,'secondary','accent','#0A0A22'),
      shader('PORTAIS EM CARROSSEL','hero: every opening cycles through the five biomes, handing the world to the next window',act5.B,'secondary','accent','#0A0A22',alpha=True),
      flow('DADOS EM VOO','instrument: points of light carry the collected data up and away at the end',count=520,color='primary',hot='secondary',amp=.13,scale=2.8,alpha=.6,width=1.6,trail=8),
      RELEVO(.6), contorno(CONT5),
      fxd('FUSÃO DOS LIMITES','structure: auto-modulation folds the image into itself at the peak, the borders between biomes melt','AUTOMODULAÇÃO',26,1.3,1,0,[0,0,.2,.6,1,.7,.2,0],.7),
      bloom(20,.35,1.4,.85), FORA()]}
    return comp3, comp4, comp5
