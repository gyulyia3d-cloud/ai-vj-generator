# Depth parallax and 3D splats (V7)

Both turn captured or generated 3D material into a layer the 2D engine can loop. Licences first: use only material you may use; do not ship third-party models or weights in a project.

## `parallax`: a still with depth (2.5D)

A photo or render plus a depth map becomes depth bands that slide at different speeds as the camera sways: portraits, architecture, paintings, product shots on a wall.

1. Make the depth map (white = near, same aspect as the image):
   ```bash
   python scripts/depth_estimate.py photo.jpg                # auto: model if installed, else luminance heuristic
   python scripts/depth_estimate.py photo.jpg --method model # needs: pip install torch transformers pillow
   ```
   The model path uses `depth-anything/Depth-Anything-V2-Small-hf` (Apache-2.0; weights download from Hugging Face on first run, about 100 MB, not stored here; the Base/Large checkpoints are non-commercial: do not use them for paid work). The model path was written to the library's documented API and is **not exercised by this repo's tests**; the heuristic is. Any other source works (Marigold, a 3D render's Z pass, Photoshop/Blender): save a grey PNG.
2. Import the image and the map in the MÍDIA tab, add a `parallax` layer, set `media` and `mediad` (empty = luminance as depth).
3. Play: `orbit` `sway` (side to side), `circle`, `dolly` (push in and out); `amp` is the travel as a fraction of the width, `cycles` whole sways per loop (closes), `hitPush` adds a push on the bass hit.

Limits: depth bands, not a mesh. Large `amp` shows stretched fills behind near edges (the far backdrop covers holes); keep `amp` under about 0.06 for faces. Not a replacement for a real 3D scan.

## `splat`: Gaussian splats and point clouds (`.ply`)

Drag a `.ply` onto the view (or Mídia → *Splat / nuvem*): 3D Gaussian Splatting exports (`f_dc_*`, `opacity`, `scale_*`) and plain point clouds (xyz, optional rgb) in binary little-endian or ASCII. The engine reduces it to at most 60 000 points on import (stored compactly inside the project JSON), then draws each splat as a soft disc sorted back to front, with the radius from the splat scale. This is an isotropic approximation, not the full anisotropic splat rasteriser: expect a glittering volumetric look, not photographic reconstruction. For photographic quality, render the splat in a dedicated viewer and import the video.

`colorMode` `palette` (default: depth and brightness mapped between `color` and `hot`, keeps the set in its palette) or `source` (the capture colours). `turns` whole orbits per loop, `tilt`, `dist`, `depthFade`, `dot` (point size), `max` (points drawn; lower it if the preview stutters), `hitPulse`.

Making splats: capture with a phone app that exports `.ply` (Polycam, Luma, Scaniverse), or train with the open 3DGS code (research licence: non-commercial) or a commercial-friendly tool. Check the licence of what you capture and of the tool.
