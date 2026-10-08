# Brief diagnosis: what runs before the first question

The V4 interview asked well-formed questions in a fixed order. V5 asks fewer, sharper ones because it first works out **what is already known, what the project is, and which unknowns would invalidate the work if guessed wrong**. The questions that survive are the ones whose answers change the pixels, the physics or the meaning.

Read this file at the start of every `/vj`. Then read only the matching section of `archetypes.md`, and `question-bank.md` when a creative, music or risk question is due.

## 1. The Brief Ledger

Build it privately from the message and every attachment, before asking anything. One row per field, each tagged with its source and status.

| Source tag | Meaning |
|---|---|
| `said` | the user wrote it |
| `seen` / `measured` | read from an attachment (photo, rider, video, script output) |
| `inferred` | deduced; say with what confidence; candidate for the readback |
| `default` | a technical default from `interview.md`; never a creative default |
| `unknown` | nothing yet |

Status per field: **CRITICAL** (a wrong guess means rebuilding the project), **SHAPING** (changes the art, recoverable), **DEFAULTABLE** (a stated default is fine).

| Group | Field | Class |
|---|---|---|
| Surface | native pixel map, or physical size + pitch / projector data | CRITICAL |
| | planes and folds (where each wall starts), cut-outs, curvature | CRITICAL |
| | viewing distance (nearest and farthest), angle, how many viewpoints | CRITICAL |
| | zones the audience will not see (performer, DJ table, truss, windows that do not reflect) | CRITICAL |
| | ambient light, black level, brightness budget | CRITICAL for projection and outdoor LED |
| Time | display refresh and delivery fps | CRITICAL when not 30 / 60 Hz |
| | loop (whole bars), or one long non-looping cycle, or a cue timeline | CRITICAL |
| | BPM (fixed / range / none) and whether the music is available | SHAPING |
| Delivery | which files are needed (PNG sequence or MP4, alpha, full project or regions), resolution and fps | CRITICAL |
| | alpha, white-alpha, per-layer export, codec | CRITICAL when mapping |
| Meaning | concept or theme, the occasion, the audience, what must be felt | SHAPING |
| | story of the place / artist / event; the one image people should remember | SHAPING |
| | text, logos, fonts that must appear (exact strings, supplied files) | CRITICAL if present |
| | palette, brand, "colour it later" | SHAPING |
| Taste | density, order, dimension, energy, texture, hierarchy, boundaries (`interview.md` Gate E) | SHAPING |
| Risk | photosensitivity (flash rate), cultural or legal limits, brand rules, hardware limits | CRITICAL |
| Success | how the result will be judged (the room, a photo, a client, a camera) | SHAPING |

A brief of one line fills perhaps 10% of this ledger. A brief with a rider and a stage plot may fill 80%. Ask only for the CRITICAL and high-impact SHAPING rows that are still `unknown` or `inferred` with doubt.

## 2. Classify the project

Name one or more **archetypes**. Signals come from words, attachments and the surface.

| Archetype | Signals in the brief | Spec sheet |
|---|---|---|
| Stage LED wall | palco, festival, show, backdrop, telão, painel de LED, pitch P2.6…P4.8, "atrás do DJ" | `archetypes.md` §A |
| LED architecture and pixel-mapped fixtures | ribbon, fita, tubo, coluna, cubo, barra de pixel, matriz pequena, Art-Net, tira, fachada de LED | §B |
| Facade (flat 2D surface) | fachada, prédio, mapping, projeção em edifício, janelas, projetores | §C |
| VJ clip pack | pack, clips, loops para sets, "para tocar em várias festas", deck | §F |
| Broadcast / XR / virtual production | câmera, LED volume, XR, transmissão, genlock, TV | §H |
| Installation / gallery / always-on | galeria, instalação, museu, exposição, ficar ligado dias | §I |
| Corporate / launch / fashion show | lançamento, evento corporativo, desfile, marca, keynote | §J |
| Social / vertical derivative | reels, stories, 9:16, para redes | §K |

Combinations are normal (a festival main stage LED plus side projection on a tent is §A + §C). When the archetype is unclear, the first question is *where it will be seen*, nothing else.

## 3. Choose the questions: value of information

For every `unknown` CRITICAL or SHAPING row, score:

`score = impact (1 to 3) × irreversibility (1 to 3) × cannot-be-inferred (1 to 3)`

- **impact**: how many layers, parameters or decisions change with the answer.
- **irreversibility**: 3 = the project must be rebuilt, 2 = a composition must be redone, 1 = a slider.
- **cannot-be-inferred**: 3 = nothing in the brief or attachments hints at it, 1 = a reasonable default exists.

Ask the top four (five when the brief is rich) per round. Everything else becomes a stated assumption.

### Rules that make the questions sharp

1. **Physics before art.** A wrong pixel map invalidates every beautiful decision. Surface and viewing conditions come first, unless the attachments already settle them.
2. **Ask for documents before facts.** "Pode mandar o rider técnico, o mapa de pixels do processador de LED, uma planta do palco ou fotos do local à noite?" gets ten answers in one file. When a document is not available, ask for one number at a time.
3. **Say who knows.** Group a question by who can answer it (the user, the LED technician, the client, the promoter) and write the exact sentence to forward: "Pergunte ao técnico de LED: *qual é a resolução do canvas que entra no processador e como as telas estão mapeadas?*".
4. **Read numbers back instead of asking for them.** If the user gives metres and pitch, compute the pixel map with `scripts/surface_calc.py` and ask "isso dá 2560×1024 (5:2), confere?". It proves you understood and exposes mistakes.
5. **Closed questions with options derived from this brief.** Offer 3 to 5 concrete choices built from what was said or seen, plus "não sei, assuma X". Never a generic list.
6. **Give the default and its risk.** "Se não souber, eu assumo 15 m de distância de leitura; risco: texto pequeno demais se a plateia ficar a 40 m."
7. **Never ask what an attachment answers, and never ask what you would ignore.** If no design decision depends on the answer, do not ask it.
8. **Ask the "why" only when it changes the design.** "Por que a tela é baixa?" matters (a DJ table in front) only if the occlusion is not already stated.
9. **Prefer scenarios over adjectives.** "Quando o drop entra, o que a plateia deve ver acontecer?" outperforms "qual a energia?".
10. **One round, one theme.** Do not mix surface physics with taste in the same round unless the brief is already rich.

## 4. Consistency checks (run on every ledger)

Contradictions are the cheapest source of wrong projects. Check these before the readback and turn each hit into a question.

| Check | How |
|---|---|
| Aspect vs pixel map | the stated ratio equals the stated pixels? (`surface_calc.py aspect`) |
| Metres + pitch vs pixels | recompute (`surface_calc.py led`) and compare |
| Pitch vs viewing distance | closer than 1 m per mm of pitch the pixels show; farther than about 3 m per mm the fine detail is wasted (`surface_calc.py legibility`) |
| Text size vs distance | the requested text height in pixels vs the angular minimum (`legibility`) |
| FPS vs refresh | 24, 25, 30, 50, 60 against the display Hz (`loop --refresh`); uneven cadence judders |
| Loop vs BPM | frames per bar from `loop`; a range of BPMs means a loop that does not depend on one tempo |
| Blend vs content | the content canvas must be `n·L − (n−1)·overlap` visible pixels, not `n·L` (`blend`) |
| Brightness vs mood | "dark and subtle" on daylight LED or an outdoor facade with street lights will not read |
| 3D illusion vs viewpoints | anamorphic or forced perspective needs one principal viewpoint; a crowd moving around breaks it |
| Duration vs format | a 90-minute set from a 4-bar loop; a 6-second ad slot from a 4-minute story |
| Colour vs surface | coloured bricks multiply every colour; glass swallows light |
| Strobe vs venue | flash content near residences, or for a photosensitive audience, against the 3-flashes-per-second ceiling |
| Delivery vs engine | requests for NDI, Spout, OSC, MIDI, mapping files or live interactivity are `NOT SUPPORTED` (`capabilities.md`): say so and offer the PNG sequence or MP4 |

## 5. The readback (before the creative contract)

After the answers, and before any code, show the user what you understood. A short table, in their language:

```
ENTENDI ASSIM
  Onde        fachada do edifício X, vista da praça a ~60 m, ângulo frontal
  Superfície  24 m × 9 m, 2 projetores 1920×1080, overlap 256 px  →  canvas 3584×1080 visível
  Tempo       show de 6 min com trilha, sem loop; teaser em loop 8 compassos @ 124 BPM
  Luz         ~20 lux de poste; projetor 12.000 lm  →  contraste estimado 1:19 (bom para formas, evitar detalhe escuro)
  Zonas       janelas do 3º andar (vidro): tratadas como furos; entrada: centro-esquerda
  Assumido    fps 30, 4 bars de teaser, sem texto
  Decisões que isso força: formas grandes e claras; ritmo vem das janelas; nada de texto abaixo de 3 m de altura.
```

Confirm it before the contract. If the user said "decide o resto", skip the confirmation but still print the table.

## 6. What the diagnosis writes: `meta.spec`

The confirmed and derived numbers go into the project (schema 2, optional but expected for `led`, `projection`, `mapping`, `multi`):

```json
"spec": {
  "archetype": ["stage-led"],
  "confirmed": { "pixelMap": [2560, 1024], "pitchMm": 3.91, "viewingDistanceM": [8, 40], "refreshHz": 60 },
  "derived":   { "aspect": "5:2", "cabinets": [20, 8], "ports": 5, "capHeightMinPx": 20 },
  "zones":     { "performer": { "x": 0.33, "y": 0.45, "w": 0.34, "h": 0.55 }, "ignore": [] },
  "assumed":   [ { "field": "viewingDistanceM", "value": 15, "why": "not given; FOH typical", "risk": "small text" } ],
  "show":      { "genre": "techno", "bpm": [128, 134], "durationMin": 60, "audio": "line-in" },
  "risks":     ["strobe limited to 3 flashes per second", "camera on stage: no scanlines or fine halftone"]
}
```

`zones` are fractions of the canvas, so they survive a change of resolution. `validate_project.py` checks that `spec.confirmed.pixelMap` agrees with `canvas`, and warns when a physical target has no spec. The same facts go in `PRODUCTION_SPEC.md` next to the project, as the sheet the technician can check.

## 7. Round protocol

| Round | Theme | Typical content |
|---|---|---|
| 1 | Physical reality and purpose | the archetype's four CRITICAL questions, plus "where will it be seen" if unclear |
| 2 | Music, performer, meaning | `question-bank.md` §Music, §Performer, §Concept seeds |
| 3 | Refine and taste | Gate E of `interview.md`; risks; success criteria; deliverables |

Stop when the creative contract can be written and every CRITICAL row is `said`, `seen`, `measured`, or a confirmed `default`. Show 2 to 3 directions "in words" (`interview.md`) before asking taste questions when the user has few references.

## 8. When the user says "decide o resto"

Do not ask more. Print one assumptions block that includes the aesthetic ones, each with a one-line reason and its risk, and proceed. The ledger rows stay marked `assumed` in `meta.spec.assumed` so a later correction is a patch, not a restart.
