# Interface research: what the studied repositories suggest for the generator's UI

Input for the interface phase (after the documentation phase). Nothing here is built yet; this is the backlog distilled from the repositories (`repo-analysis.md`), ordered by value for the skill's actual job: opening a finished project, looking at it honestly, playing it, and delivering it. The interface stays the **last** step of a project; it invents nothing (`SKILL.md` §4).

## Principles taken from the studies

1. **Schema-driven controls.** One description of every parameter (name, type, range, default, group, editor) generates the panel, the validation and the control map (the form-designer pattern). The engine registry and `recipes/manifest.json` already hold most of it.
2. **Everything addressable.** Each parameter has a stable address, so a controller, a saved state and a control-map export all refer to the same thing (the clip, layer, effect, parameter hierarchy of a clip launcher, with an address per parameter).
3. **The assistant drafts; the human publishes and operates.** Tools that read, validate and prepare, but never send to the rig or change a live show without the person.
4. **Live and safe.** Recompile on demand, flash the code that just ran, keep autosave and a backup, keep the output window clean.
5. **Perception is part of the editor.** Show the viewer what the audience will see, not what the laptop shows.

## Status

Feito: **painel de ficha de produção**, **calculadora de superfície**, **zonas na viewport** (aba Ficha), **navegador de receitas** com prévia, **cartões de teste** com um clique, **painel de cor OKLCH** (L C h e hex, contraste, esquema por superfície), **menu com largura ajustável ou minimizado**, **tema escuro, claro e sistema**, **layout responsivo** (celular a 4K, em pé e deitado), **desfazer e refazer universais** com histórico nomeado (Ctrl+Z, Ctrl+Y), **campos numéricos digitáveis** com contas (`1920/2`), setas, Shift/Alt, arrastar o rótulo e duplo clique para o padrão, **leitura de coordenadas** e **zona desenhada na vista**. Falta: visão do público, monitor de segurança, mutate com histórico, paleta de comandos (Ctrl+K), tour de boas-vindas, mini-mapa do grafo de camadas.

## Backlog, by priority

### P1: makes the new briefing and recipes usable

| Feature | From | What it does |
|---|---|---|
| **Production spec panel** | diagnosis (`meta.spec`) | shows archetype, confirmed vs assumed facts (with a "confirmed" toggle), derived numbers, risks; draws `zones` on the stage (performer and occluded zones as shaded overlays), folds, gutter, safe area, blend zones |
| **Surface calculator** | `surface_calc.py` | LED, projection, blend, loop, legibility in the page; "apply to canvas" writes `canvas` and `meta.spec` |
| **Recipe browser** | `recipes/manifest.json`, schema-driven controls | gallery with a live thumbnail per recipe, "add as layer" into the active composition, sliders generated from `vars` / `p` ranges |
| **Test cards** | output engineering §8 | one click adds a test composition (grid, 1-px checks, grey ramp, colour bars, safe frame, moving bar, blend markers) sized to the canvas |
| **Palette panel** | `palette.py` | OKLCH picker for the four roles, live contrast and surface checks, "check against surface" badge |

### P2: honest viewing

| Feature | From | What it does |
|---|---|---|
| **Audience view** | perception docs | toggles: far-read (blur to 5% scale), greyscale, squint; **LED simulation** that pixelates to the declared pitch and distance with gaps; **projector simulation** that lifts black to the ambient level |
| **Safety monitor** | perception §5 | flash-rate meter (flashes per second over the field), red-flash and global-motion warnings, aliasing warnings per repeating pattern |
| **Performance monitor** | clip-launcher UIs | fps, frame time, layers and shaders cost, per-layer toggle to find the bottleneck, `res` suggestions |
| **Mutate with history** | Hydra's mutator and undo stack | seeded perturbation of parameters inside their ranges (with lock toggles per layer or parameter), unlimited undo and redo, "keep this one" snapshots |

### P3: playing it

| Feature | From | What it does |
|---|---|---|
| **Output windows** | live-coding environments | visuals-only popup, view-only mode (editor hidden), exhibit mode (no links), kiosk URL for installations |
| **Live code panel** | live-coding editors | for `code` layers: soft recompile on demand, flash of the evaluated lines, snippet library from the recipes, error line numbers, autosave and a periodic backup export |

### P4: production batch tools (from motion-design script collections)

| Feature | What it does |
|---|---|
| Rename layers by pattern, find and replace text across compositions | cleanup before delivery |
| Convert frame rate preserving timing | re-time keyframed content; warns that procedural motion keeps its own clock |
| Export variants by aspect family | recompose a set for other surfaces from the same JSON, never by stretching (`aspect-ratios.md`) |
| Localise text | export all strings to CSV, re-import translations, duplicate compositions per language |

## Constraints for the build

- The engine is one HTML file (about 245 KB); changes go through `assets/engine.html` and are verified with `scripts/contact_sheet.mjs` (QA mode) and by opening the page in a browser. Keep the QA mode working.
- New panels read from the project JSON (`meta.spec`, `meta.contract`); nothing is stored only in the interface (`creative-contract.md`: the JSON is the source of truth).
- Honest labels: OSC, MIDI, NDI, Spout and Syphon are NOT SUPPORTED (`capabilities.md`); do not design panels that send them.
- Accessibility and layout: keyboard operable, readable at phone width, 16 px gutters, light and dark themes.
- One feature at a time, each verified in the browser before the next.
