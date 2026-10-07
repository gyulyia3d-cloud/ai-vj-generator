# Getting the engine into Resolume (OBS + Spout2) and onto the LED wall (slices)

Browsers cannot send Spout, NDI or Syphon (`capabilities.md`). Two routes work today.

## A. Live: engine → OBS Browser Source → Spout2 → Resolume (Windows)

1. Install OBS Studio and the **Spout2 plugin for OBS** (Off-World-Live `obs-spout2-plugin`, installer `OBS_Spout2_Plugin_Install_*.exe`; it is GPL: install it, do not bundle it). Restart OBS.
2. In OBS: Settings → Video: Base and Output resolution = your canvas (e.g. 4500×800), FPS = project fps.
3. Add a **Browser** source: tick *Local file*, choose `engine.html` (or the generated project HTML) and set width/height to the canvas. Do not use *Shutdown source when not visible*. Add the URL parameters by using a URL instead of a file: `file:///C:/path/project.html?stage=1&alpha=1&comp=1`.
4. OBS: Tools → *Spout2 Output* (the plugin) → enable. Name it, e.g. `AIVJ`.
5. Resolume Arena: add a Source → *Spout* → `AIVJ`. The engine's own audio is not carried: feed Resolume's audio and the engine separately (or route the same input to both).

URL parameters (engine):

| Parameter | Effect |
|---|---|
| `stage=1` | hides the whole interface; only the picture, fitted to the window |
| `alpha=1` | with `stage=1`: transparent background (background layers are skipped), for light-on-black blending in Resolume (Add) |
| `comp=N` | start on composition N (1-based) |
| `play=0` | start paused |
| `q=1` | render quality 0.25–2 (1 = pixel for pixel) |

Checklist: resolution equals the canvas (no scaling in OBS), fps equals project fps, alpha shows as transparent in the OBS preview, one clip per composition (open the page once per composition with `comp=`), audio reaches the page (ÁUDIO tab: microphone/line-in, or the test source) or the synthetic BPM bands are used. The loop is not locked to Resolume's clock: set the project BPM to the show BPM, or export clips (route B) when exact sync matters.

## B. Clip files: PNG sequence → Alley → DXV/HAP, then Resolume as usual
Export tab (PNG sequence with alpha, ZIP), encode in Resolume Alley. Use `scripts/isf.py export` instead when the look is a single shader and you want it live inside Resolume with its own BPM sync.

## C. Long walls: cut the stageview for the media server

```bash
python scripts/export_slices.py project.aivj.json --out-size 3840x2160 --out slices
```

Splits the canvas at `canvas.folds` (physical corners first), splits anything wider than the output, packs the pieces into rows and extra screens, and writes:
- `*.slices.xml`: Resolume **Advanced Output** (Output → Advanced Output → Load). One slice per piece. Layout follows files saved by Arena itself (checked against a real 10400×416 → 3840×2160 file: same slice order, rectangles and masks).
- `*.map.json`: the same mapping for other tools. `*.stageview.png`: test pattern at the input size, numbered coloured tiles with white edges.

Verify: play the PNG in Resolume with the XML loaded; every numbered tile must appear once, on the right module of the wall, edges touching, none cut. Arena versions differ: open the XML, look at the slices, re-save from Arena. No rotation (orientation 0 only) and no soft-edge: set those in Arena.
Test: `python scripts/test_export_slices.py`.
