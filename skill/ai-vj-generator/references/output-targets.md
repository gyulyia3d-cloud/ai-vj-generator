# Output targets, transport and Resolume workflow

Separate VISUAL GENERATION (the engine) from OUTPUT TRANSPORT (how pixels reach the surface). Never claim a transport the browser cannot do.

## Truth table

| Destination | Status | How |
|---|---|---|
| Fullscreen / second monitor (HDMI, DisplayPort) | SUPPORTED | Output window or fullscreen viewport; the GPU carries the signal. |
| PNG sequence with alpha, per composition or per layer | SUPPORTED | EXPORTAR tab → ZIP. Deterministic, frame-exact loop. |
| WebM screen recording | SUPPORTED | GRAVAR. No alpha (browser codecs). Captures live audio reaction. |
| Resolume, TouchDesigner, Notch, MadMapper | EXPORTABLE | PNG sequence → Alley DXV3 alpha / Movie File In TOP / sequence import. |
| NDI | REQUIRES BRIDGE | Output window → OBS (window capture) → DistroAV (NDI) plugin → NDI source in Resolume. |
| Spout (Windows) / Syphon (macOS) | REQUIRES BRIDGE | OBS + Spout2 / Syphon plugin, or TouchDesigner Web Render TOP loading the HTML → Spout/Syphon Out TOP. |
| SDI | REQUIRES BRIDGE | Blackmagic / AJA output card fed by the system display. |
| OSC, MIDI, WebSocket control | CONCEPTUAL | Not implemented in v1. Describe as roadmap only. |

When asked for a bridged transport, answer as REQUISITE → METHOD → SOFTWARE → CONFIGURATION.

## LED

- Canvas = processor pixel map (e.g. 5120×500 for two 2560×500 walls in an L). Add `canvas.displays` for each wall. Static heroes and short text stay inside one wall; elements that scroll or span the full width (typewall, lines, shaders) may cross the corner, since that crossing is the point of an L.
- `canvas.pitch` (mm) and `canvas.dist` (m) let the engine estimate legibility. Rule of thumb: minimum viewing distance ≈ 1 m per mm of pitch.
- Lines ≥ 2 px (use `weight` ≥ 4 and `ui` ≥ 2 on wide walls), `post.scan` = 0 (moiré), `bg.grain` = 0, `organism.dot` ≥ 2.
- Black is "off" on LED: negative space reads as void. Flat accents read; subtle gradients disappear.
- Many LED processors clip pure white at night: offer `palette.primary` slightly below white (#F2F0EA).

## Projection and mapping

- Projector black is grey: avoid large dark-grey fields; prefer true black and light forms.
- Keep 3–5% margin (`canvas.safe`) for keystone and warp.
- Mapping: export alpha per layer (mode "Camadas α") so each layer masks to a surface in Resolume Advanced Output or MadMapper. Draw surfaces as `displays`.
- Increase text scale; distance and focus soften detail.

## Multi-display

Define each output as a crop of the master canvas in `canvas.displays`. Each can open in its own output window (local/GitHub build; claude.ai blocks pop-ups for most viewers).

## Resolume workflow

1. Export → "Composição α" (or "Camadas α" for separate layers), FPS 30 or 60, loop in whole bars.
2. Optional "Branco α (luma)": everything white, opacity in alpha — colorize per layer in Resolume.
3. Open Alley → drag the folder → codec DXV3 with Alpha, same FPS → convert to .mov.
4. Clip → Transport → BPM Sync, beats = 4 × bars. The last frame meets the first.
5. Stack layers bottom (L0) to top, with the same blend modes as the project.
6. Layer toggles become separate clips with "Camadas α": `PROJECT/LAYERS/01_NAME/L3_NAME/01_NAME_L3_000000.png`, one folder per layer that was on at export time. "Branco α (luma)" works on every layer, shaders included: luminance becomes alpha.
7. File naming: `PROJECT/ALPHA/01_NAME/01_NAME_000000.png`; `PROJECT_DATA/project.json` reopens everything.

## Performance

Live: PROJETO tab → preview 50% and density 60% if FPS drops; at most one `shader` at `res` ≤ 0.7 per composition; `flow.count` ≤ 1500 at 4K. The browser does not expose GPU load: report it as N/D, never invent it. Exports always render at full density.
