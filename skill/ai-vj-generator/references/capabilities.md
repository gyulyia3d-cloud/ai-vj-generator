# Capability labels

Every transport, export or integration claim carries one of four labels. Never present a bridge-only feature as native.

| Label | Meaning |
|---|---|
| `SUPPORTED` | Works directly in the generator / browser |
| `EXPORTABLE` | Produced as a file the user takes elsewhere |
| `REQUIRES BRIDGE` | Needs a local tool or plugin between the browser and the destination |
| `CONCEPTUAL` | Design only; no runtime support in this version |

## Status table for this engine

| Capability | Label | How |
|---|---|---|
| Live preview, composition switching, layer controls | SUPPORTED | The interface |
| Fullscreen, output window (no editor UI), cropped displays | SUPPORTED | Move the window to the secondary display by hand; the browser cannot manage the OS display topology |
| Microphone / line input / audio file | SUPPORTED | Web Audio; microphone needs the user's permission |
| Font and image import | SUPPORTED | File API, `FontFace` |
| Project JSON export and import | SUPPORTED | PROJETO tab |
| PNG frame / PNG sequence (alpha, per layer, white-alpha) | EXPORTABLE | Deterministic frame render, ZIP download |
| WebM recording | EXPORTABLE | `MediaRecorder` over the canvas stream; where the browser supports it |
| Contact sheet PNG | EXPORTABLE | Interface button or `scripts/contact_sheet.mjs` |
| Resolume (PNG sequence + Alley → DXV3 / HAP, or WebM) | EXPORTABLE | See `delivery.md` |
| TouchDesigner | EXPORTABLE / REQUIRES BRIDGE | Movie File In TOP reads the sequence; Web Render TOP can show the HTML live |
| NDI | REQUIRES BRIDGE | Output window → OBS → DistroAV / NDI plugin → NDI source |
| Spout (Windows) / Syphon (macOS) | REQUIRES BRIDGE | OBS + Spout2 / Syphon plugin, or TouchDesigner Web Render TOP → Spout/Syphon Out |
| SDI | REQUIRES BRIDGE | Capture / output card (Blackmagic, AJA) fed by the screen output |
| OSC (UDP) | REQUIRES BRIDGE | A browser cannot open UDP sockets: `generator → WebSocket → local bridge → UDP OSC → Resolume` |
| WebSocket | CONCEPTUAL | A page can open a WebSocket to a local server, but this version has no sender and the bridge is not bundled |
| MIDI | CONCEPTUAL | Web MIDI works in Chrome / Edge but is not implemented in this version |
| Direct MP4 / HAP encoding in the browser | CONCEPTUAL | Not implemented; use WebM or the PNG sequence and an external encoder |

If a bridge is requested, generate the OSC address schema, the parameter map and the WebSocket payloads as documentation, and label the delivery `REQUIRES BRIDGE`. Do not write code that implies the browser sends UDP.

## Declaring it in the project (schema 2)

```json
"capabilities": {
  "supported": ["preview", "outputWindow", "audioInput"],
  "exportable": ["pngSequenceAlpha", "pngSequenceWhiteAlpha", "webm"],
  "requiresBridge": ["ndi", "spout", "osc"],
  "conceptual": ["midi"]
}
```

Optional, but the validator checks that `osc`, `ndi`, `spout`, `syphon`, `sdi`, `midi`, `websocket` never appear under `supported` or `exportable`, and that OSC, NDI, Spout, Syphon and SDI are not claimed anywhere except `requiresBridge`.

## Resolume-friendly delivery

Native canvas size, alpha policy, fps, loop length, PNG sequence or video as requested, and a compact routing note. White-alpha: RGB set to white, luminance becomes alpha; document whether the destination expects straight or premultiplied alpha.
