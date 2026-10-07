# Surface model

The target surface is part of the composition, not a delivery note. Source composition space and output space are different things. This file defines how the surface is described in the project and how each target changes the art direction. The fold, gutter, wall and code-layer mechanics are in `walls-code-assets.md`; the per-target checklists are in `output-targets.md`.

## How the surface is declared (schema 2)

```json
"canvas": {
  "w": 5120, "h": 500, "fps": 30, "target": "led",
  "safe": 0.05,
  "folds": [2560],
  "gutter": 90,
  "pitch": 3.9, "dist": 15,
  "displays": [{ "x": 0, "y": 0, "w": 2560, "h": 500 }, { "x": 2560, "y": 0, "w": 2560, "h": 500 }]
}
```

| Concept | Where it lives | Notes |
|---|---|---|
| Native canvas | `canvas.w`, `canvas.h` | The real pixel map. Never a stretched 16:9 |
| Surfaces (planes / walls) | `canvas.folds` (x, px) | N folds make N+1 walls; generators receive `wall.near`, `wall.sw` |
| Gutter / fold exclusion | `canvas.gutter` (1080-units) | Nothing readable inside it |
| Safe area | `canvas.safe` | Fraction of the canvas kept free of content |
| Slices / outputs | `canvas.displays` | Cropped output windows per display or slice |
| Physical scale | `canvas.pitch` (mm), `canvas.dist` (m) | Drives legibility and moiré warnings |
| Output transform | Resolume / MadMapper side | Declare it in the delivery notes; this engine renders the source space |

Levels of precision, from coarse to exact: **1** flat output map; **2** polygon / fold map; **3** 2.5D surface with a camera; **4** real 3D stage geometry. This engine implements 1 and 2. Levels 3–4 are a `code` layer with an explicit projection, or work in another tool. If the user only has a photo of the architecture, do not invent millimetre geometry: build an editable 2D approximation, mark uncertain regions, and say it is approximate.

## Folds

A fold is a structural boundary, not just an edge.

- Faces, logos and exact text stay inside one wall and out of the gutter.
- Lines, colour fields and wipes may bridge a fold when the concept uses it.
- Anchor positions to the fold (`wall.near(f)`) when two walls must answer each other.
- Keep separate safe zones: content, type, logo, fold/gutter exclusion, edge bleed.
- A cut-out (a hole drawn in one layer) only works inside its own layer; in white-alpha use the 43% field.

## How each target changes the design

**LED.** Design on the exact pixel grid. Account for pixel pitch, viewing distance, brightness, contrast, seams and bezels, and camera moiré. Large forms survive distance; hairlines, scanlines and micro-HUD do not. Grain 0 and no scanlines on LED. Never compose a normal 16:9 and stretch it across an ultra-wide wall: a 5120×500 wall is a different compositional space.

**Projection.** Black in the content is not black on the wall: ambient light and projector optics set the floor. Account for warp, edge blending, spill, surface colour and texture. Keep important content away from blended edges. Do not rely on very dark detail.

**Architectural mapping.** Planes, corners, polygons, UV regions, gutters, cross-plane relationships. Export per layer in alpha so masks can be applied in the mapping tool.

**Multi-screen.** Document source coordinates, slice coordinates, output coordinates, the transform and the crop / fit policy.

**Resolume.** Validate dimensions, fps, alpha mode, codec or sequence format, loop length, performance and routing. Slices, Input Selection and Output Transformation are routing concepts, not reasons to hard-code a layout. For white-alpha content, colour it in the software.

## The preview helps you see the surface

The interface shows safe area, grid, fold guides (red) with the gutter, and displays cut-outs, without changing the render. Use them while looking at the contact sheets; the contact sheet marks folds and gutters too.

## Questions the surface must answer

Which wall is each element on? What crosses a fold, and why? What is readable at the viewing distance? What changes when this is projected instead of LED?
