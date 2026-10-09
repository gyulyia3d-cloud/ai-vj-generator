# Temporal layer (`temporal`)

Effects whose result depends on earlier frames, computed on the GPU. Category Efeito, type Tempo. It reads the layers below (like `fx`), so place it above what it should change.

| Preset | What it does | Parameters |
|---|---|---|
| `TRILHA` | keeps the brightest value per pixel of the last frames; the trail fades | p1 persistence (0 to 0.96), p2 trail brightness |
| `FEEDBACK` | the previous output comes back zoomed, rotated and drifted, under the new image | p1 persistence, p2 zoom, p3 rotation (deg), p4 drift (px) |
| `SLIT SCAN` | each column (or row) shows a different past frame, from now to N-1 frames ago | p1 frames (2 to 24), p2 axis (0 X, 1 Y), p3 invert, p4 curve |
| `DESLOCAR` | the difference between this frame and the previous one displaces the picture | p1 amount (px), p2 gain |

## Determinism
The output of a frame depends only on the frames before it, never on what was played earlier. Playing in order continues the history; any jump (scrubbing, opening, export) clears it and rebuilds it by rendering the previous frames (a window where the persistence falls below 1/255; at most 40 frames, or N-1 for slit scan). Each step loses 1.5/255, so trails reach zero instead of sticking at a low value. The loop closes: frames before 0 are the end of the loop. Rendering the same frame twice gives the same image; playing in order and jumping agree within 3/255 (`rendergraph_check.mjs`).

## Cost
One GPU pass per frame plus a copy. Slit scan holds N frames in a GPU texture array (width x height x 4 x N bytes at the layer's internal resolution): at 4500x800 and 24 frames use `res` 0.5 or less. The history is freed when the layer disappears or stops being drawn.

## Limits
Temporal layers inside the replay of another temporal layer start cold; the error fades inside the outer window. Shader uniforms during a replay use the target frame. Preview: dragging the timeline replays up to 40 frames on each jump.
