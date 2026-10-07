#!/usr/bin/env python3
"""Make a depth map (white = near) for the `parallax` layer from a still image.

  python depth_estimate.py photo.jpg [--out photo.depth.png] [--method auto|model|luma] [--invert]

model: an open monocular depth model through Hugging Face `transformers` (default `depth-anything/Depth-Anything-V2-Small-hf`,
       Apache-2.0; the larger V2 checkpoints are CC-BY-NC, do not use them for paid work). Needs `pip install torch transformers pillow`.
       Weights download on first use (about 100 MB) and are NOT part of this repository. Not exercised by the automatic tests of this repo.
luma:  no model. Heuristic depth from blurred luminance, a soft "lower in the frame is nearer" ramp and a centre bias. Crude, but
       it gives a believable parallax for photos with a bright subject; always usable offline.
auto:  model when torch and transformers import, otherwise luma (it says which one ran).
Any other tool works too: save a grey PNG the same aspect as the image, white = near, import it as the depth map of the layer.
"""
import argparse, os, sys

sys.stdout.reconfigure(encoding="utf-8")


def luma_depth(img):
    import numpy as np
    from PIL import Image, ImageFilter
    g = np.asarray(img.convert("L"), dtype=np.float32) / 255.0
    h, w = g.shape
    blur = np.asarray(Image.fromarray((g * 255).astype("uint8")).filter(ImageFilter.GaussianBlur(max(2, w // 40))), dtype=np.float32) / 255.0
    yy = np.linspace(0.0, 1.0, h, dtype=np.float32)[:, None]
    xx = np.linspace(-1.0, 1.0, w, dtype=np.float32)[None, :]
    centre = 1.0 - 0.35 * np.abs(xx)
    d = 0.55 * blur + 0.30 * yy + 0.15 * centre
    d = (d - d.min()) / max(1e-6, d.max() - d.min())
    return Image.fromarray((d * 255).astype("uint8"), "L")


def model_depth(img, name):
    from transformers import pipeline
    pipe = pipeline("depth-estimation", model=name)
    out = pipe(img.convert("RGB"))["depth"]
    return out.convert("L")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("image")
    ap.add_argument("--out")
    ap.add_argument("--method", default="auto", choices=["auto", "model", "luma"])
    ap.add_argument("--model", default="depth-anything/Depth-Anything-V2-Small-hf")
    ap.add_argument("--invert", action="store_true", help="flip near/far if the model output is the other way round")
    a = ap.parse_args()
    try:
        from PIL import Image, ImageOps
    except ImportError:
        sys.exit("needs pillow and numpy: pip install pillow numpy")
    if not os.path.exists(a.image):
        sys.exit(f"file not found: {a.image}")
    img = ImageOps.exif_transpose(Image.open(a.image))
    method = a.method
    if method in ("auto", "model"):
        try:
            import torch, transformers  # noqa: F401
        except ImportError:
            if method == "model":
                sys.exit("method model needs: pip install torch transformers")
            method = "luma"
        else:
            method = "model"
    d = model_depth(img, a.model) if method == "model" else luma_depth(img)
    if d.size != img.size:
        d = d.resize(img.size)
    if a.invert:
        d = ImageOps.invert(d)
    d = ImageOps.autocontrast(d)
    out = a.out or os.path.splitext(a.image)[0] + ".depth.png"
    d.save(out)
    print(f"method: {method}" + ("  (crude heuristic: install torch + transformers for a real model)" if method == "luma" else f"  ({a.model})"))
    print("wrote", out, "- import it in the MÍDIA tab and select it as the depth map of the parallax layer (white = near)")


if __name__ == "__main__":
    main()
