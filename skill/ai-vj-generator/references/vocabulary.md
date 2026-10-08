# Vocabulary menu: what the engine can already do, by need

Read this when the briefing is being answered, before choosing layers. It is a **menu, not a preset list**: pick by the argument of the concept (`references/tension-and-release.md`), then change numbers, palette roles and audio mapping. Every entry exists, is tested, and closes the loop.

## 1. A ground (matter the figure is read against)
| Need | Use |
|---|---|
| a slow field, organic | `shader` presets `CAMPO FBM` `FLUXO WARP` `CÉLULAS` |
| geometric, measured | `shader` `GRADE SDF` `FAIXAS` `INTERFERÊNCIA` `ANÉIS SDF` `KALEIDO` |
| edit the picture as one line | `synth` chain (`references/synth-chain.md`), e.g. `noise(4,1).twirl(6,0.7).kaleid(5).tint()` |
| a ready generator from the ISF library | aba **ISF**, `isf-library/` (`references/isf-bridge.md`): 11 originals that close the loop (tunnel, plasma, voronoi, kaleido, lissajous, metaballs, aurora, LED ripples, moire, flow stripes, spiral) and 28 MIT + 45 CC0 third-party generators |
| equation-driven | recipes `superformula` `clifford` `pendulum-wave` `wave-interference` `spirograph` `kepler` `stagger-grid` `chladni` `quasicrystal` `domain-coloring` `julia-orbit` (`references/math-forms.md`) |
| flow, particles | `flow`, `organism`; the `sim` layer is baked in a loop (CPU) |

## 2. A figure (the one thing)
`shape`, `logo`, `typeset` (hierarchy, reveal, text on a path), `typewall`, `pixeltext`, `model` (OBJ), `parallax` (image + depth), `splat` (.ply). Recipe `hilbert-curve` (one line that covers a grid) and `superformula` work as figures.

## 3. Structure (rhythm and measure)
`structure`, `lines`, `tunnel`, `symbols`, `hazard`, `blocks`, `bitfield`, recipe `greeble-plate` (hard-surface panel detail from a seed), GLSL `vjHexTile` `vjRepeat` `vjPolarRepeat`.

## 4. Information
`instrument` (bars, radial, scope, radar, rings, heat: always tied to a real signal), `data`, `measure`, `hud`, `text`, and `blobs` (finds regions in the image below by brightness, contrast, colour or luminance zone, and marks them: `references/blob-layer.md`).

## 5. Finish (the last passes) and display emulation: the `fx` layer
`references/fx-layer.md` has the 22 presets. By intent:
- **Surface emulation:** `PAINEL DE LED` (pixel pitch, gamma, light bleed), `CRT`, `VHS`, `DITHER`, `PIXELATE`.
- **Print and drawing:** `HALFTONE`, `HACHURA` (hatching by darkness), `BORDAS NEON` (Sobel), `KUWAHARA` (painterly), `SABATTIER` (solarisation).
- **Light and lens:** `BLOOM`, `ABERRAÇÃO CROMÁTICA`, `VIDRO LÍQUIDO` (refraction), `GRADE E VINHETA`, `MAPA DE GRADIENTE` (palette from luminance).
- **Geometry and distortion:** `ESPELHO`, `REPETIR`, `POLAR (PLANETINHA)`, `DESLOCAR`, `AUTOMODULAÇÃO`.
- **Glitch:** `GLITCH EM BLOCOS`, `ARRASTO DE PIXEL`.
Also `post` (scanline and glitch drawn in 2D) and the per-layer `echo` for trails.

## 6. Motion (how things move)
- **Audio on any number:** `layer.mod` (`references/audio-bus.md`): sources `bass mid high rms hit mhit hhit pres kick onset flux onbeat bsin bsin2 bsin4 btri lfo`.
- **LFO shapes:** `sin tri saw spring` plus the attention vocabulary `bounce rubber shake jello tada heartbeat swing wobble pulse` (all return to the start: the loop closes).
- **Motion profile** (energy, elasticity, anticipation, continuity, rhythm) turns into a spring curve: `references/motion-profiles.md`.
- **Tempo:** the kick detector reports `kickBpm` (median) and `kickBpmK` with `kickConf` (Kalman, better under jitter and missed kicks).
- **Easing in GLSL:** modules `easing` and `easing.more` (Penner set, `vjSpring(t, zeta, wn)`).

## 7. Between compositions (`time.transition`, plays on the stage view)
`cut fade wipe glitch zoom slide iris blinds crosszoom spin radial diagonal slices flip blur drop`. Pick by argument: `crosszoom` for a plunge, `radial` for a clock or scan, `slices` for data, `flip` for a reveal, `drop` for weight, `blur` for a dissolve of mood.

## 8. GLSL building blocks (`#include module`, `references/glsl-library.md`)
`hash noise.simplex noise.cell noise.gradient noise.warp sdf2d sdf2d.more sdf3d raymarch color color.more dither space space.more easing easing.more post led filter math`.

## 9. Output and delivery
PNG sequence (alpha or RGB, layers, ZIP in parts, manifest) and **MP4 H.264** rendered frame by frame, in the browser (Export tab) or by command line (`node scripts/render.mjs`, `references/render-cli.md`). ISF export for Resolume. Slices XML for the media server. OBS + Spout2 as a bridge. Spout/NDI native: later phases.

## How to use this at briefing time
1. After the contract, list for each composition: ground / figure / structure / information / finish, naming the entry from this menu (not "some noise").
2. Say in the contract **why** each one serves the concept (traceability rule).
3. Check the cost: a composition at 4500x800 can afford roughly one heavy shader + one `fx` + the 2D layers at 30 fps on a laptop GPU (numbers in `docs/historico/RELATORIO-V9-githubs3.md`).
4. If an entry is missing, say so and write it (recipe, `synth` chain or `fx` pass) instead of faking it.
