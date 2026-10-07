#!/usr/bin/env python3
"""Measure an image so a reference can be turned into principles, not copied.

usage: python analyze_image.py image.(png|jpg|webp) [--json] [--k 6]

Needs Pillow and numpy (pip install pillow numpy). Prints a readable report;
--json prints the raw measurements. Every number is a measurement of the file,
not a judgement: read it together with the image itself.
"""
import json
import os
import math
import sys

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("error: this script needs Pillow and numpy (pip install pillow numpy)")


def load(path, max_side=384):
    im = Image.open(path)
    if im.mode in ("RGBA", "LA", "P"):
        im = im.convert("RGBA")
        bg = Image.new("RGBA", im.size, (0, 0, 0, 255))
        im = Image.alpha_composite(bg, im)
    im = im.convert("RGB")
    w, h = im.size
    s = max_side / max(w, h)
    small = im.resize((max(8, int(w * s)), max(8, int(h * s))), Image.LANCZOS) if s < 1 else im
    return im.size, np.asarray(small, dtype=np.float32) / 255.0


def srgb_to_lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def to_oklab(rgb):
    lin = srgb_to_lin(rgb)
    r, g, b = lin[..., 0], lin[..., 1], lin[..., 2]
    l = np.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b)
    m = np.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b)
    s = np.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b)
    return np.stack([0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
                     1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
                     0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s], axis=-1)


def hexof(rgb):
    r, g, b = (int(round(float(np.clip(v, 0, 1)) * 255)) for v in rgb)
    return f"#{r:02X}{g:02X}{b:02X}"


def kmeans(x, k, iters=18, seed=7):
    rng = np.random.default_rng(seed)
    centers = x[rng.choice(len(x), size=k, replace=False)]
    for _ in range(iters):
        d = ((x[:, None, :] - centers[None]) ** 2).sum(-1)
        lab = d.argmin(1)
        for i in range(k):
            pts = x[lab == i]
            if len(pts):
                centers[i] = pts.mean(0)
    d = ((x[:, None, :] - centers[None]) ** 2).sum(-1)
    return centers, d.argmin(1)


def palette(rgb, k=6):
    px = rgb.reshape(-1, 3)
    if len(px) > 6000:
        px = px[np.random.default_rng(3).choice(len(px), 6000, replace=False)]
    lab = to_oklab(px)
    centers, lbl = kmeans(lab, min(k, len(px)))
    out = []
    for i in range(len(centers)):
        sel = px[lbl == i]
        if not len(sel):
            continue
        mean = sel.mean(0)
        L, a, b = to_oklab(mean)
        out.append({"hex": hexof(mean), "share": round(float(len(sel) / len(px)), 3), "lightness": round(float(L), 3),
                    "chroma": round(float(math.hypot(a, b)), 3), "hue": round(float(math.degrees(math.atan2(b, a)) % 360), 1)})
    out.sort(key=lambda c: -c["share"])
    return out


def roles(pal):
    """Suggest palette roles. These are suggestions to check against the concept."""
    if not pal:
        return {}
    bg = min(pal[:3], key=lambda c: c["lightness"])
    rest = [c for c in pal if c is not bg]
    big = [c for c in rest if c["share"] >= 0.08] or rest
    primary = max(big, key=lambda c: c["lightness"]) if big else bg
    accent_pool = [c for c in rest if c is not primary and c["chroma"] > 0.06]
    accent = max(accent_pool, key=lambda c: c["chroma"]) if accent_pool else None
    secondary = next((c for c in rest if c is not primary and c is not accent), None)
    return {"background": bg["hex"], "primary": primary["hex"],
            "secondary": secondary["hex"] if secondary else None, "accent": accent["hex"] if accent else None}


def gray(rgb):
    return rgb @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)


def gradients(g):
    gx = np.zeros_like(g)
    gy = np.zeros_like(g)
    gx[:, 1:-1] = (g[:, 2:] - g[:, :-2]) * 0.5
    gy[1:-1, :] = (g[2:, :] - g[:-2, :]) * 0.5
    return gx, gy


def composition(g):
    h, w = g.shape
    gx, gy = gradients(g)
    mag = np.hypot(gx, gy)
    wgt = g + 1e-6
    ys, xs = np.mgrid[0:h, 0:w]
    cx = float((wgt * xs).sum() / wgt.sum() / w)
    cy = float((wgt * ys).sum() / wgt.sum() / h)
    left, right = wgt[:, : w // 2].sum(), wgt[:, w - w // 2:].sum()
    top, bottom = wgt[: h // 2].sum(), wgt[h - h // 2:].sum()
    def corr(a, b):
        if a.std() < 1e-6 or b.std() < 1e-6:
            return 1.0  # flat image: trivially symmetric
        return float(np.corrcoef(a.ravel(), b.ravel())[0, 1])

    sym_h = corr(g, g[:, ::-1])
    sym_v = corr(g, g[::-1])
    # absolute threshold: share of pixels with almost no local change (flat areas, empty ground)
    negative = float((mag < 0.012).mean())
    ang = (np.degrees(np.arctan2(gy, gx)) % 180)[mag > mag.mean()]
    hist = np.histogram(ang, bins=4, range=(0, 180), weights=mag[mag > mag.mean()])[0] if len(ang) else np.zeros(4)
    hist = hist / hist.sum() if hist.sum() else hist
    # gradient direction 0° = vertical edges (horizontal gradient)
    orient = {"vertical_edges": float(hist[0] + hist[3]) if len(hist) == 4 else 0.0,
              "diagonal_edges": float(hist[1] + hist[2]) if len(hist) == 4 else 0.0}
    third = {}
    for name, (px, py) in {"left_third": (1 / 6, 0.5), "right_third": (5 / 6, 0.5)}.items():
        third[name] = round(float(wgt[:, int(px * w) - w // 6: int(px * w) + w // 6].sum() / wgt.sum()), 3)
    return {"visual_weight_center": [round(cx, 3), round(cy, 3)],
            "horizontal_balance_left_vs_right": round(float(left / max(right, 1e-9)), 3),
            "vertical_balance_top_vs_bottom": round(float(top / max(bottom, 1e-9)), 3),
            "symmetry_mirror_horizontal": round(sym_h, 3), "symmetry_mirror_vertical": round(sym_v, 3),
            "flat_area_share": round(negative, 3),
            "edge_density": round(float(mag.mean() / (g.std() + 1e-6)), 3),
            "edge_orientation": {k: round(v, 3) for k, v in orient.items()}, "thirds_weight": third}


def spectrum(g):
    h, w = g.shape
    win = np.outer(np.hanning(h), np.hanning(w))
    f = np.abs(np.fft.fftshift(np.fft.fft2((g - g.mean()) * win))) ** 2
    cy, cx = h // 2, w // 2
    yy, xx = np.mgrid[0:h, 0:w]
    r = np.hypot((yy - cy) / h, (xx - cx) / w)
    tot = f.sum() + 1e-9
    bands = {"coarse_shapes": f[r < 0.04].sum() / tot, "medium_structure": f[(r >= 0.04) & (r < 0.15)].sum() / tot,
             "fine_detail": f[r >= 0.15].sum() / tot}
    mask = (r > 0.015)
    fm = np.where(mask, f, 0)
    iy, ix = np.unravel_index(fm.argmax(), fm.shape)
    peak = float(fm.max() / (fm[mask].mean() + 1e-9))
    dx, dy = (ix - cx) / w, (iy - cy) / h
    freq = math.hypot(dx, dy)
    return {"energy_share": {k: round(float(v), 3) for k, v in bands.items()},
            "periodicity": {"strength": round(peak, 1), "period_px_at_analysis_size": round(1 / freq, 1) if freq else None,
                            "angle_deg": round(math.degrees(math.atan2(dy, dx)) % 180, 1),
                            "note": "strength > ~60 suggests a regular grating or grid"}}


def analyze(path, k=6):
    size, rgb = load(path)
    g = gray(rgb)
    lab = to_oklab(rgb.reshape(-1, 3))
    warm = float(((lab[:, 1] + 0.4 * lab[:, 2]) > 0).mean())
    pal = palette(rgb, k)
    return {"file": path, "size_px": list(size), "aspect": round(size[0] / size[1], 3),
            "luminance": {"mean": round(float(g.mean()), 3), "contrast_std": round(float(g.std()), 3),
                          "dark_share_below_0.12": round(float((g < 0.12).mean()), 3),
                          "bright_share_above_0.85": round(float((g > 0.85).mean()), 3)},
            "color": {"palette": pal, "suggested_roles": roles(pal), "warm_share": round(warm, 3),
                      "mean_chroma": round(float(np.hypot(lab[:, 1], lab[:, 2]).mean()), 3)},
            "composition": composition(g), "frequency": spectrum(g)}


def report(r):
    c, comp, fq = r["color"], r["composition"], r["frequency"]
    L = [f"IMAGE {r['file']}  {r['size_px'][0]}x{r['size_px'][1]}  aspect {r['aspect']}",
         "", "LUMINANCE", f"  mean {r['luminance']['mean']}  contrast(std) {r['luminance']['contrast_std']}  "
         f"dark {r['luminance']['dark_share_below_0.12']}  bright {r['luminance']['bright_share_above_0.85']}",
         "", "COLOR (OKLab k-means; share, lightness, chroma, hue)"]
    L += [f"  {p['hex']}  share {p['share']:<5} L {p['lightness']:<5} C {p['chroma']:<5} h {p['hue']}" for p in c["palette"]]
    L += [f"  suggested roles: {c['suggested_roles']}", f"  warm share {c['warm_share']}  mean chroma {c['mean_chroma']}",
          "", "COMPOSITION", f"  visual-weight center {comp['visual_weight_center']} (0..1, origin top-left)",
          f"  left/right weight {comp['horizontal_balance_left_vs_right']}  top/bottom weight {comp['vertical_balance_top_vs_bottom']}",
          f"  mirror symmetry  horizontal {comp['symmetry_mirror_horizontal']}  vertical {comp['symmetry_mirror_vertical']}",
          f"  flat areas (no local change; empty ground OR plateaus of a pattern) {comp['flat_area_share']}  edge density {comp['edge_density']}",
          f"  edge orientation {comp['edge_orientation']}", "", "FREQUENCY",
          f"  energy {fq['energy_share']}", f"  periodicity {fq['periodicity']}"]
    return "\n".join(L)


if __name__ == "__main__":
    args = [a for a in sys.argv[1:] if not a.startswith("-")]
    if not args or "-h" in sys.argv[1:] or "--help" in sys.argv[1:]:
        sys.exit(__doc__)
    if not os.path.isfile(args[0]):
        sys.exit(f"error: file not found: {args[0]}")
    k = int(sys.argv[sys.argv.index("--k") + 1]) if "--k" in sys.argv else 6
    args = [a for a in args if a != str(k)] if "--k" in sys.argv else args
    res = analyze(args[0], k)
    print(json.dumps(res, indent=2, ensure_ascii=False) if "--json" in sys.argv else report(res))
