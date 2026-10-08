# Capability labels

The AI VJ Generator is a generative animation system: briefing and 2D surface information in, PNG sequence or MP4 out. It is not a performance tool, a media server or a mapping tool. Every claim about what the engine does carries one of four labels. Never present something outside these labels as a feature.

| Label | Meaning |
|---|---|
| `SUPPORTED` | Works directly in the generator / browser |
| `EXPORTABLE` | Produced as a file the user takes elsewhere |
| `INPUT / ANALYSIS ONLY` | The engine reads it as input and analyses it; it never generates it |
| `NOT SUPPORTED` | Outside the product scope. Do not promise, document as a feature or generate it |

## Status table for this engine

| Capability | Label | How |
|---|---|---|
| Generation from a briefing, composition, animation, 2D layers | SUPPORTED | The interface, or `portable/PROMPT.md` with any AI |
| Preview, fullscreen preview, composition switching, layer controls | SUPPORTED | The interface |
| Surface analysis (aspect ratio, regions, safe areas, legibility) | SUPPORTED | PROJETO / Superfície tabs |
| Audio analysis (microphone, line input, audio file) | SUPPORTED | Web Audio; the microphone needs the user's permission |
| Font and image import | SUPPORTED | File API, `FontFace` |
| ISF generator library as a layer type | SUPPORTED | Layer type ISF, 84 shaders chosen in the layer parameters |
| Project JSON export and import | SUPPORTED | PROJETO tab |
| PNG frame / PNG sequence (RGB, RGBA, white-alpha, per layer) | EXPORTABLE | Deterministic frame render, ZIP download |
| PNG sequence / MP4 of the full project or of a user-defined region (slice) | EXPORTABLE | Export tab (displays are regions) |
| **MP4 (H.264), frame by frame** | EXPORTABLE | Export tab or `node scripts/render.mjs`; WebCodecs, no screen capture (`render-cli.md`). H.264 has no alpha: use the PNG sequence when alpha matters |
| WebM live recording (the `Gravar` button) | EXPORTABLE, draft only | `MediaRecorder` over the viewport: a quick take of what is on screen, not a render. Deliver MP4 or PNG sequence |
| Contact sheet PNG | EXPORTABLE | Interface button or `scripts/contact_sheet.mjs` |
| Render manifest (fps, seed, resolution, SHA-256) | EXPORTABLE | Export tab |
| Blueprint, plan, pixel map, surface bitmap, photograph, mask, reference image | INPUT / ANALYSIS ONLY | Imported as surface or reference; the engine never creates a new blueprint or pixel map |
| MIDI, OSC, NDI, Spout, Syphon, SDI, WebSocket control | NOT SUPPORTED | Not a performance tool |
| Resolume, TouchDesigner, OBS integration, Advanced Output / mapping files | NOT SUPPORTED | Not a mapping or media-server tool. A PNG sequence or MP4 is an ordinary file any software can open |
| Projection mapping, projector simulation, 3D model of the installation, dome | NOT SUPPORTED | The surface is input and constraint, never a simulated environment |
| HAP / ProRes / DXV encoding in the browser | NOT SUPPORTED | Convert the PNG sequence with `ffmpeg` (commands in `render-cli.md`) |

## Declaring it in the project

```json
"capabilities": {
  "supported": ["preview", "fullscreenPreview", "audioInput"],
  "exportable": ["pngSequenceAlpha", "mp4"],
  "inputOnly": ["surfaceBitmap"],
  "notSupported": ["midi", "osc"]
}
```

The validator rejects MIDI, OSC, NDI, Spout, Syphon, SDI, WebSocket and mapping under `supported`, `exportable` or `inputOnly`.

**Migration.** Projects saved before 3.1 may carry `requiresBridge` and `conceptual`. They still open: the validator reads both as `notSupported` and warns with the replacement. Move those items to `notSupported`.

## Delivery

Native canvas size, alpha policy, fps, loop length, PNG sequence or video as requested. White-alpha: RGB set to white, luminance becomes alpha; document whether the destination expects straight or premultiplied alpha. Say honestly which format keeps alpha (PNG sequence) and which does not (MP4 H.264).
