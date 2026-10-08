# Rendering without screen capture: MP4 and PNG sequence

The engine never records the viewport. Every output is a **deterministic frame**: the project, the seed and the frame number give the same picture, so a render can be repeated, resumed and compared.

| Output | Where | What it is |
|---|---|---|
| PNG sequence (alpha or RGB), per composition or per layer, ZIP in parts, manifest with SHA-256 | Export tab, `Renderizar e baixar ZIP` | the format that keeps alpha; Resolume's Alley turns it into DXV3/HAP |
| **MP4 (H.264)** | Export tab, section `Vídeo MP4`, button `Renderizar e baixar MP4` | frame by frame, encoded with WebCodecs, no alpha |
| MP4 or PNG by command line | `node scripts/render.mjs <project> --out <dir> --format mp4\|png` | headless Chrome/Edge, no interface |

No WebM, no `MediaRecorder`, no screen recording: that path stalled the video renders.

## MP4 in the browser
Uses the composition, resolution, FPS, bars and frame range chosen above it. Quality: `Alta`, `Média`, `Leve` (bits per pixel: 0.25, 0.14, 0.07). The file has the index at the start (`moov` before `mdat`), constant frame rate and a keyframe every 2 seconds. Measured on a laptop GPU: 4500x800 at about 20 frames per second including encoding; 1920x1080 at about 18.
If the browser refuses the size (`H.264 em WxH`), lower the resolution (most encoders accept up to 4096 wide) or export the PNG sequence and encode with `ffmpeg`. The message says which.

## Command line
```bash
node scripts/render.mjs projeto.aivj.json --out saida --format mp4 --comp all --quality high
node scripts/render.mjs projeto.aivj.json --out saida --format png --comp 0 --alpha --start 0 --end 119
```
Options: `--comp N|all`, `--scale 1`, `--fps 30`, `--bars N`, `--start`, `--end`, `--quality high|mid|low`, `--alpha` (PNG only). `AIVJ_GPU=1` uses the graphics card (without it Chrome renders in software: slower, same pixels up to rounding). MP4 files are named `<project>_<NN>_<W>x<H>_<fps>fps.mp4`; PNG frames go to `<project>_<NN>/000000.png`.

## ProRes, HAP, DXV, GIF from the PNG sequence
```bash
ffmpeg -framerate 30 -i %06d.png -c:v prores_ks -profile:v 4444 -pix_fmt yuva444p10le saida.mov
ffmpeg -framerate 30 -i %06d.png -c:v hap -format hap_alpha saida.mov
```
DXV3 only through Resolume Alley (proprietary).

## What is checked
`mp4_check.mjs` opens the file with `ffprobe`/`ffmpeg`: codec h264, size, frame count, frame rate, first frame not black and close to the PNG of the same frame, last frame different from the first (it animates), plus the box structure and the CLI.

## Cost model (why the render is fast)
`node scripts/bench.mjs project.aivj.json` measures ms per frame by layer type on the export path. In the reference run most of the frame time is the encoder, not the layers; see `docs/historico/RELATORIO-V9-githubs3.md`, section "Motor GPU / WebGL2".
