import json, os
CONTRACT = {
 "concept": "Uma sonda científica de campo explora os biomas brasileiros e usa a própria fachada como espécime: lê a arquitetura, abre cada janela como portal para um bioma, deixa a pedra crescer, afogar, derreter e florescer, e transmite tudo antes de apagar.",
 "audienceEffect": "O público de frente à fachada deve sentir que a pedra deixou de ser sólida: tem profundidade atrás das janelas, volume nas colunas, peso na água e no calor, e ainda reconhece cada segmento arquitetônico.",
 "semioticIntent": "pesquisa (sonda, varredura, anéis de sonar) → descoberta (portal que abre) → bioma (cor, matéria, luz) → transformação (crescer, subir, derreter, florescer) → transmissão (convergência e escuro).",
 "visualLanguage": "Luz sobre preto. Cada região arquitetônica é uma superfície diferente (torres, colunas, balcões, coroa, janelas) e cada janela é um diorama com parallax. O ciano da sonda é a constante tecnológica; a cor de cada ato é a do bioma.",
 "formLanguage": "Anéis topográficos em torno das aberturas, veias e folhas, cáusticas, rachaduras de voronoi, gotas e flores de cinco pétalas, grades de perspectiva. Tudo nasce da geometria real da fachada, em px do canvas.",
 "materialLanguage": "Luz aditiva modulada por um relevo de argila multiplicado sobre o resultado, que dá sombra de cornija, coluna e reentrância. Sem texturas fotográficas, sem texto.",
 "colorLogic": "Ciano #36F1FF é a sonda (varredura, olhos, contornos). Amazônia verde-limão com orquídea; Pantanal azul-piscina com amanhecer dourado; Brasa âmbar com ipê magenta e amarelo; Convergência coral, violeta e todas as anteriores. O acento fica em olhos, flores e flashes.",
 "spatialLogic": "Canvas único 1920x1520 (5:4) alinhado às fotos de referência. Zonas: torres e coroa, colunas, balcões e escada, paredes alta e baixa, 31 aberturas (janelas, arcos, leques, medalhões). Ponto de vista frontal único; o fora da silhueta fica sempre preto.",
 "motionLanguage": "Matéria é suave (crescimento, maré, calor); a interface é em passos (varredura, ticks, radar). Cada ato nasce no escuro, tem um evento dominante e volta ao escuro, então o loop de 16 compassos fecha e a sequência de atos encaixa.",
 "typographyLanguage": "Sem texto, por decisão do briefing.",
 "temporalArc": "CALIBRAÇÃO (leitura) → DOSSEL (crescer) → ÁGUAS (subir) → BRASA (derreter e florescer) → CONVERGÊNCIA (fundir e transmitir). 5 atos de 16 compassos a 100 BPM = 192 s.",
 "loopGrammar": "evolutionary",
 "technicalStrategy": "Geometria analítica em GLSL (SDF das aberturas, zonas, colunas) extraída da segmentação da foto 2, porque os shaders do motor não amostram texturas. Relevo e silhueta entram como camadas de imagem; contornos como camada de código. Efeitos de derretimento e deslocamento com fx e modulação em envelope.",
 "forbiddenShortcuts": "Nada de glow como ideia principal; nada de textura de bioma em foto; nada de rotação constante; nada de texto ou logo; nada de flash acima de 3 por segundo; nada de projeção no céu.",
 "focalEvent": "Cada ato tem um: varredura que desce (1), frente de cipós que alcança cada janela (2), nível da água no pico (3), cascata de gotas e depois floração (4), clarão dos dois olhos (5).",
 "releaseZone": "O terço superior de céu, preto por máscara, e o escuro de início e fim de cada ato.",
 "banned": "texto, logo, strobe, glow constante, rotação contínua, céu iluminado",
 "tension": "balanced",
 "imperfection": "A frente de cipós e a maré têm borda irregular por ruído; os olhos piscam fora do compasso."
}
SPEC = {
 "archetype": ["facade-mapping"],
 "confirmed": {"pixelMap": [1920, 1520], "viewingDistanceM": [40, 40], "refreshHz": 30},
 "derived": {"aspect": "5:4", "framesPerBar": 72, "loopFrames": 1152, "loopSeconds": 38.4, "showSeconds": 192},
 "zones": {"ignore": [{"x": 0, "y": 0, "w": 1, "h": 0.04, "why": "céu acima das agulhas"}]},
 "assumed": [
  {"field": "viewingDistanceM", "value": 40, "why": "não informado; ponto frontal principal", "risk": "linhas finas de contorno somem acima de ~60 m"},
  {"field": "projectors", "value": "canvas mestre único 1920x1520, sem blend", "why": "o usuário confirmou 1920x1520 como canvas do mapping", "risk": "se houver mais de um projetor, o overlap é feito no software de mapping"},
  {"field": "bpm", "value": 100, "why": "sem trilha ainda", "risk": "hits sintéticos não casam com a música final; trocar o BPM e re-renderizar"},
  {"field": "glassWindows", "value": "janelas projetadas como portais", "why": "decisão do usuário", "risk": "vidro reflete menos; contraste menor nos portais"},
  {"field": "ambientLight", "value": "noite escura, poucos postes", "why": "não informado", "risk": "com luz forte, os pretos viram cinza e os detalhes escuros se perdem"}
 ],
 "show": {"genre": "narrativo", "bpm": [100, 100], "durationMin": 3.2, "audio": "none yet"},
 "risks": ["flash máximo 3 por segundo (clarão do ato 5 dura 8 quadros)", "sem texto", "ilusão de profundidade depende de um ponto de vista frontal"]
}
BIBLE = {
 "thesis": "A pedra é um espécime: a sonda a lê, abre, afoga, derrete e faz florescer.",
 "material": "luz aditiva sobre preto, sombreada por um relevo de argila multiplicado",
 "space": "uma fachada frontal; profundidade só dentro das aberturas (parallax) e no relevo",
 "motion": "matéria suave, interface em passos; cada ato nasce e volta ao escuro",
 "dramaturgy": "ler, crescer, subir, derreter e florescer, fundir e transmitir",
 "color": "ciano da sonda constante; uma cor-guia por bioma; acento só em olhos, flores e flashes",
 "typography": "nenhuma: o briefing pede imagem pura, sem texto nem logo, para a leitura vir só da arquitetura",
 "audio": "sem trilha: bandas sintéticas a 100 BPM; baixo pulsa anéis e olhos, médios movem a matéria, agudos faíscam",
 "banned": "texto, logo, strobe, glow constante, rotação contínua",
 "motionProfile": {"energy": 0.55, "elasticity": 0.3, "anticipation": 0.5, "continuity": 0.8, "rhythm": 0.4},
 "density": "balanced"
}
def apply(p):
    p['meta']['contract']=CONTRACT; p['meta']['spec']=SPEC; p['meta']['artBible']=BIBLE
    p['meta']['moods']=['technological','organic','luminous']
    p['meta']['grammar']={"form":"anéis, veias, cáusticas, rachaduras, flores","motion":"crescer, subir, derreter, florescer","rhythm":"16 compassos por ato","color":"ciano da sonda + cor por bioma","density":"balanced","depth":"portais com parallax e relevo de argila","texture":"luz sobre preto","transition":"fade pelo escuro","audio":"bandas sintéticas a 100 BPM"}
    cp=os.path.join(os.path.dirname(__file__),'..','work','diario_copy.aivj.json')
    if os.path.exists(cp):
        q=json.load(open(cp,encoding='utf-8'))
        for k in ('creativeIR','compositionIR','animationIR','surfaceIR'):
            if k in q['meta']: p['meta'][k]=q['meta'][k]
    p['capabilities']={"supported":["preview","fullscreenPreview"],"exportable":["pngSequenceAlpha","mp4","pngSequence"],"inputOnly":["surfaceBitmap"],"notSupported":["midi","osc","ndi","spout","syphon","resolume","madmapper","pixelMap","blueprint"]}
    return p
