# Archetype spec sheets

One section per project type. Read **only the section(s) that match** (`diagnosis.md` §2). Each gives: the documents to request, the Round 1 questions (the CRITICAL ones, worded ready to send, in the user's language), Round 2 questions, what to compute with `scripts/surface_calc.py`, what the answers change in the design, and the traps. Questions in Portuguese are templates: adapt the options to the brief; never send them verbatim if the attachments already answer them.

Conventions: `→` marks what an answer changes. Numbers below are planning figures; the venue's own documents win.

---

## A. Stage LED wall (concert, festival, club backdrop)

**Ask for:** tech rider; LED map or a screenshot of the processor's canvas layout (Novastar, Brompton, Colorlight, Megapixel); stage plot with sightlines; photos of past shows on this screen, front and from the back of the room.

**Round 1**
1. *Mapa de pixels.* "Qual o tamanho do canvas, em pixels, que entra no processador, e como as telas se organizam: um retângulo único, central + laterais, escada, curvo, ou com recortes? Se você só sabe metros e pitch (ex.: 10 × 4 m, P3.9), eu calculo e você confere." → canvas, folds, aspect, module size.
2. *Distância e câmera.* "Qual a menor e a maior distância da plateia à tela, e tem câmera (IMAG, transmissão, celulares do palco) olhando para ela?" → minimum text and line weight, moiré rules (no scanlines or fine halftone when a camera sees it), contrast.
3. *Zona do performer.* "Quem fica na frente da tela (DJ, banda, dançarinos) e o que da tela fica escondido (mesa do DJ, bateria, truss)? Onde fica o rosto de quem se apresenta?" → performer zone and occluded zones: no hero, no text, no bright field behind a face or a booth.
4. *Música e formato.* "Gênero, faixa de BPM, quanto dura o set, e o conteúdo é um pack de clips para o set inteiro ou uma peça para uma música/momento?" → loop length, energy ladder, how many compositions, tempo-independence.

**Round 2**
- Quem controla a luz? O LD lava a tela com luz de cena? (palette clash, black lift) → palette and contrast discipline.
- Brilho: o técnico limita o branco (muitos processadores cortam branco puro à noite)? → primary near #F2F0EA instead of pure white.
- Texto: o nome do artista aparece? Em quais momentos? Fonte ou logo fornecidos? → typography layer, exact strings.
- Entrega: Resolume? Qual versão e codec (DXV3 ou HAP)? Alpha, camadas, ou "branco que eu coloro"? Saída em 60 Hz? → export mode.
- Segurança: há restrição de strobe? → ≤ 3 flashes per second.

**Compute:** `led`, `aspect`, `legibility`, `loop`.

**Design consequences:** scale to the far read first, then add the near read; black reads as void; hierarchy by size and brightness, not by hairlines; the screen is a stage element, so keep contrast with the performer; sections of the set map to compositions with an energy ladder (arrive, build, peak, break, release).

**Traps:** stretching a 16:9 across a 5:2 wall; centring a hero behind a DJ table; pure white at full area (clipping, glare, strobing look); fine lines (moiré on camera); 24 fps content on a 60 Hz processor (uneven cadence); a loop whose seam is visible on a 40 m wall.

---

## B. LED architecture and pixel-mapped fixtures (ribbons, strips, columns, cubes, tubes, small matrices)

**Ask for:** drawing or photo with positions; fixture sheet (pixels per fixture, colour order, protocol); the controller's mapping tool export; a list of universes if already patched.

**Round 1**
1. *Endereçamento.* "É um painel de vídeo (recebe a imagem direto) ou pixels endereçados por Art-Net/sACN/DMX (cada tubo, barra ou fita tem N pixels)? Quantos pixels no total?" → native resolution (often tiny), whether to design in true pixels.
2. *Geometria.* "Como estão dispostos: fitas paralelas, colunas, cubo, anel, malha irregular? Em que ordem os pixels percorrem (serpentina)? Alguma peça é girada ou espelhada?" → the 2D map the engine renders into; layout rotation per panel.
3. *Resolução e leitura.* "Qual o espaçamento entre pixels e de que distância se vê? O que eles precisam mostrar: formas, texto, ou só luz e cor?" → pitch-to-distance rule, whether text is possible.
4. *Entrega.* "Quem converte o vídeo em dados de pixel (Resolume, MadMapper, TouchDesigner, um controlador próprio) e que resolução ele espera?" → exact export size.

**Round 2:** gamma and brightness limit of the strip (cheap LED strips need a gamma near 2.2 to 2.5 to avoid washed mid-tones); power limit at full white; colour order and RGBW; maximum useful fps on the controller (a full DMX universe refreshes about 44 Hz).

**Compute:** `pixelmap`, `aspect`, `legibility`.

**Design consequences:** with few pixels, design *at* the native grid and let edges be hard; a single moving highlight can be the whole idea; use motion and colour, not detail; motion that crosses fixtures has to respect the physical order of the pixels; test content at 1:1 pixels first.

**Traps:** anti-aliased gradients on 16 px bars (muddy), text on a matrix without the legibility numbers, 60 fps promises on a controller that sends 30, assuming square pixels when strips are 1-D.

---

## C. Facade projection mapping

**Ask for:** a frontal photo (as perpendicular as possible, with one known measure in frame); elevation or CAD drawing; photos from the viewing spots at night; projector datasheet (lumens, native resolution, lens); the projector positions; the mapping software.

**Round 1**
1. *A fachada.* "Largura × altura reais, material e cor, relevo (cornijas, sacadas, colunas) e quanto é janela de vidro? E a pergunta principal: você quer iluminar a *arquitetura* (arestas, janelas, colunas) ou usar a fachada como uma tela plana?" → whether layers follow edges and openings (the usual best answer) or treat a flat screen; glass becomes holes.
2. *Projeção.* "Quantos projetores, de quantos lúmens e qual resolução, a que distância? Qual software faz o mapeamento e qual a resolução do canvas mestre? Já existem máscaras por superfície?" → master canvas size, blend zones, per-surface layers (the `facade-blueprint` skill can generate masks).
3. *Luz e público.* "Quanta luz ambiente há na fachada (postes, letreiros vizinhos), a que horas começa, e de onde o público assiste (distância, ângulo, um ponto principal ou muita gente circulando)?" → contrast budget, whether forced perspective is possible, text size.
4. *Formato.* "É um loop ambiente ou um show narrativo de alguns minutos com trilha? Qual a duração e há restrições (vizinhos, patrimônio, horário)?" → loop vs timeline, music, strobe ban.

**Round 2:** história do edifício e da marca (the story seed); momentos-assinatura; logotipos obrigatórios (supplied); cores permitidas e proibidas; tolerância a brilho total (full flood washes the facade and the neighbours); whether there is sound; how the show starts and ends (black before and after).

**Compute:** `projection`, `blend`, `ramp`, `aspect`, `legibility` (with `--pitch` = mm per projected pixel).

**Design consequences:** let the architecture write the rhythm (windows as a pixel grid, floors as bars, cornices as lines); fake relief with shading and light that behaves physically (depth cues from the real shadows); dark detail is lost, so work in light on black with bold forms; coloured surfaces multiply every colour; keep text for a few large, short moments; export per-surface layers in alpha.

**Traps:** composing a 16:9 and warping it; full-white floods; legible text across relief or windows; relying on a pixel-perfect edge when the projector drifts (keep 3 to 5% safe margin on key edges); a 3D illusion for a moving crowd; forgetting the blend zone eats pixels (content is `n·L − (n−1)·overlap` wide).

---

## D. Object, set and sculpture mapping

**Ask for:** a 3D model or photogrammetry; per-face dimensions; the UV or face layout of the mapping tool; projector positions; viewpoints.

**Round 1:** (1) "O objeto tem modelo 3D? Me mande, ou as dimensões de cada face." → face layers. (2) "Quantos projetores, onde estão, e de onde se vê?" → seams, shadows, viewpoint. (3) "O material é branco fosco, espelhado, tecido ou translúcido? Há partes móveis?" → brightness, kinetic updates. (4) "O mapeamento é por UV exportada ou projeção a partir de uma câmera virtual?" → how many islands to export.

**Compute:** `aspect` per face, `projection` for light.

**Design consequences:** one layer set per face or per island; edges and corners are the story (light that wraps a corner reads as 3D); keep features off seams; consistent texture scale across faces.

**Traps:** a continuous image across faces that do not share a viewpoint; projecting dark detail onto a shiny material.

---

## E. Immersive room, cave and dome

**Ask for:** a drawing with the planes (walls, floor, ceiling) and projector layout; the master canvas and how it is cut; the position of the audience.

**Round 1:** (1) "Quais superfícies recebem imagem (paredes, piso, teto) e qual a resolução mestre?" → folds and canvas. (2) "O público está sentado, em pé ou circulando? Há um ponto central (sweet spot)?" → comfort, anamorphosis. (3) "Domo: é fisheye (master quadrado, ex. 4096²) ou mapeado em partes?" → polar thinking. (4) "Por quanto tempo uma pessoa fica dentro, e há som espacial?" → dwell time, pacing.

**Compute:** `aspect`, `blend`.

**Design consequences:** slow, large motion; avoid fast rotation of the horizon (vection discomfort); keep detail away from the dome rim and pole; the floor is the strongest sense of motion; compose each wall as a complete reading and let fields cross corners.

**Traps:** strobing and fast global translation; high-frequency patterns across a curved seam; text on a dome.

---

## F. VJ clip pack / Resolume deck for unknown venues

**Ask for:** examples of earlier packs the user liked; the Resolume version; a typical venue's screen type.

**Round 1**
1. "Para onde vai: que tipos de local (clube com telão 16:9, palco com LED largo, projeção em parede) e preciso entregar mais de uma proporção?" → base format plus variants.
2. "Gênero(s) e faixa de BPM? Os clips precisam funcionar com qualquer BPM ou são para uma faixa?" → loop grammar, tempo-independence (a 4-bar loop at 128 BPM drifts at 140).
3. "Quantos clips, e qual a escada de energia (intro, build, pico, quebra, saída)? Cada clip deve funcionar sozinho ou ser misturado em camadas?" → standalone vs mixable (negative space, blend-friendly, white-alpha).
4. "Como entregar: versão do Resolume, codec (DXV3 ou HAP), alpha, branco-alfa, nomes de pasta e se há logo ou assinatura?" → export, naming.

**Compute:** `loop`, `aspect`.

**Design consequences:** centre-weighted compositions with a safe cross that survives cropping to wider or narrower frames; a family of compositions, each with a different job in a mix; clips that can be layered (alpha, quiet backgrounds, one hero); loop length chosen so the seam is invisible across tempos.

**Traps:** every clip equally dense (nothing to mix); a hard 16:9 hero cropped on a strip; a loop that only closes at one BPM.

---

## G. DOOH and anamorphic billboards

**Ask for:** the screen's pixel map and photo; the street viewpoint(s); the content-slot rules of the operator.

**Round 1**
1. "Geometria da tela: plana, em quina (duas faces em ângulo), curva ou pilar? Resolução de cada face?" → folds, anamorphic mapping.
2. "De onde a ilusão é vista (ponto principal, distância, altura do olho) e para quem passa a pé ou de carro?" → single-viewpoint perspective, dwell, legibility.
3. "Qual o tempo do slot (6, 10, 15 s) e o que vem antes e depois no loop do operador?" → duration, start and end frames (a clean cut in and out), looping.
4. "Marca, texto e logos obrigatórios? Regras do operador (brilho, vermelho piscando, sem som)?" → text safe time, no audio dependence.

**Compute:** `aspect`, `legibility`, `loop`.

**Design consequences:** the hero must read in the first 0.5 s; one strong silhouette and one motion idea; the illusion lives at the corner, so keep the object's shadow and contact line consistent with the real floor; silent by design; a seamless loop, because the operator repeats it.

**Traps:** anamorphic art judged from the wrong viewpoint; slow builds that waste a 6-second slot; text that needs more reading time than the pass-by.

---

## H. Broadcast, XR and virtual-production LED

**Ask for:** camera model, shutter, frame rate and genlock; colour pipeline; the LED processor's refresh and scan mode; the camera tracking system.

**Round 1:** (1) "Frame rate de entrega e se há genlock?" → 24 / 25 / 30 / 50 / 60 only; 29.97 and 59.94 are conformed on the server. (2) "Quem vê é a câmera ou a plateia, ou os dois?" → camera-first rules. (3) "Pipeline de cor (Rec.709, HDR, ACES) e brilho do LED?" → saturation, highlight clipping. (4) "O fundo é uma placa 2D ou há câmera trackeada com frustum?" → engine is 2D; tracked content is `REQUIRES BRIDGE`.

**Design consequences:** moiré and banding rule the look (soft gradients with dither, no fine regular patterns); no flicker below the camera's shutter beat; saturation with headroom.

**Traps:** promising live tracking or genlock from a browser (not supported); strobing through a rolling shutter.

---

## I. Installation, gallery and always-on

**Ask for:** the space, the hardware that plays it, the daily hours.

**Round 1:** (1) "Quantas horas por dia fica ligado e há um tempo mínimo que alguém permanece?" → cycle length (32 bars or a long non-looping cycle), pacing. (2) "A obra reage a algo (som do ambiente, movimento)? O som é parte da obra?" → interactivity is a bridge; audio reactivity from a mic. (3) "De que distância se vê, e é perto o bastante para ver o pixel?" → fine detail allowed. (4) "O que pode mudar de dia para dia?" → seed variants.

**Design consequences:** slow evolution; seeds for daily variants; no hard loop seam in view; high craft at close range.

**Traps:** a 4-bar loop for an eight-hour exhibit; promising sensors without a bridge.

---

## J. Corporate, launch and fashion

**Ask for:** brand book; the run of show with cues; supplied fonts, logos, exact strings.

**Round 1:** (1) "Qual a ordem do evento e em que momentos a tela muda (cue list)?" → cue-based clips, not loops. (2) "Marca: paleta, tipografia, logotipo, o que nunca pode acontecer?" → colour discipline. (3) "Quem aprova e quando?" → rounds, deliverable freeze. (4) "Entrega com som? Quem opera?" → files, naming, a safe fallback clip.

**Design consequences:** a reveal moment per cue; type hierarchy from the brand; calm holding states between cues; a black and a neutral "panic" clip.

**Traps:** a loop where a build is needed; invented logos or fonts (never; only supplied files).

---

## K. Social and vertical derivative

**Ask for:** platform, duration, whether sound is on.

**Round 1:** (1) "Qual plataforma e formato (9:16, 4:5, 1:1) e duração?" (2) "Som ligado ou desligado?" → sound-off legibility. (3) "O hook acontece nos primeiros segundos?" → hero in the first second. (4) "Há texto, legenda ou logo?" → platform UI covers roughly the top 15% and bottom 20% of a vertical frame (approximate; check the platform's current template).

**Compute:** `aspect` for `1080×1920`.

**Design consequences:** vertical tiers, hero in the central third, vertical travel, a loop that restarts without a visible cut.

**Traps:** content under the UI overlays; an intro that waits.
