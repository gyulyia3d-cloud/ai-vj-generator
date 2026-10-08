# The `blobs` layer: find regions in the image below and mark them

Reads the stack **below it** (like `fx`), finds connected regions, numbers them and draws boxes, a centre cross, a label with the area and links to the nearest neighbour. The idea is the one of blob tracking (find regions, give each a number, connect them); the source is the composition itself, not a camera, and the code is written for this project. Use it as an information layer (a "vision system" look) or to make an image read as measured.

```json
{ "type": "blobs", "name": "RASTREIO", "role": "information: the bright regions of the field below, measured",
  "on": true, "opacity": 1, "blend": "normal", "p": { "mode": "brilho", "thr": 0.55, "max": 10, "links": true, "ids": true } }
```

## How regions are found (`mode`)
| Mode | Finds | Sliders |
|---|---|---|
| `brilho` | luminance above the threshold | `thr` |
| `contraste` | edges: local gradient above the threshold | `thr` |
| `cor` | hue near a target (`hue` 0 to 1: 0 red, 0.33 green, 0.67 blue) with minimum saturation | `hue`, `tol`, `sat` |
| `zonas` | the image split into `zones` luminance bands; picks band `zone` (0 darkest) | `zones`, `zone` |

Common: `minArea` (fraction of the image; drops specks), `max` (how many to keep, largest first), `grid` (analysis columns: 128 is fast and enough), `fill` paints the region, `box`, `ids`, `cross`, `links`, `weight`, `pad`, `color`, `hot` (the largest region uses the accent).

## Rules and limits
- **Order is meaning**, as in `fx`: only layers underneath are analysed. Put it above the field it should measure and below type.
- **Stateless and deterministic**: the same frame gives the same regions, numbers and drawing; the loop closes when the image below closes. `B01` is the largest region **in this frame**: numbers follow area, so a region that grows past another changes number. Real tracking (an identity that survives from frame to frame, trails, speed) needs history; it is in `docs/PROXIMOS-PASSOS.md` with the `fx` history block.
- Works on any image below: a shader, an imported video, a 3D object, a photo. On LED, prefer `grid` 64 to 96 and `weight` at least the pixel pitch.
- Analysis happens at `grid` columns, so tiny details do not become regions; raise `grid` for fine work (cost grows with the square).

## Tested
`blobs_check.mjs`: synthetic scenes with a known answer for each mode (count, order by area, centre, box, specks dropped, red versus blue, bright band versus dark band), and the layer (draws, deterministic, closes the loop, sees only what is below, changes with the mode).
