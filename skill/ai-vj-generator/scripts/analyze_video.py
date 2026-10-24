#!/usr/bin/env python3
"""Turn a reference video into key frames plus measurements of how it moves.

usage: python analyze_video.py video.mp4 [--out DIR] [--frames 12] [--flow auto|opencv|numpy] [--json]

Needs ffmpeg and ffprobe on PATH, plus Pillow and numpy. It writes DIR/frames/*.jpg
and DIR/contact_sheet.jpg (open them with the image viewer: you must LOOK at the
frames) and prints measurements: resolution, fps, duration, cut density, motion
energy, dominant motion direction, brightness over time, palette of the sampled frames,
and the optical flow: how much of the frame moves, how fast, in which direction, and
whether the motion is a pan, a zoom, a rotation or local (inside the frame).

--flow: opencv uses Farneback from opencv-python (pip install opencv-python-headless);
numpy uses a pyramidal Lucas-Kanade written here (no extra install); auto (default)
takes opencv when it imports, otherwise numpy, and the report says which one ran.
"""
import json
import os
import re
import subprocess
import sys
import tempfile

try:
    import numpy as np
    from PIL import Image
except ImportError:
    sys.exit("error: this script needs Pillow and numpy (pip install pillow numpy)")

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import analyze_image as AI  # noqa: E402


def run(cmd):
    p = subprocess.run(cmd, capture_output=True, text=True, encoding="utf-8", errors="replace")
    if p.returncode != 0:
        sys.exit(f"error: {cmd[0]} failed: {p.stderr.strip()[-400:]}")
    return p


def probe(path):
    out = run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries",
               "stream=width,height,r_frame_rate,codec_name,nb_frames:format=duration", "-of", "json", path]).stdout
    j = json.loads(out)
    st = j["streams"][0]
    num, den = (st["r_frame_rate"].split("/") + ["1"])[:2]
    fps = float(num) / float(den) if float(den) else 0.0
    return {"width": st["width"], "height": st["height"], "fps": round(fps, 3), "codec": st.get("codec_name"),
            "duration_s": round(float(j["format"]["duration"]), 3)}


def scene_cuts(path, thr=0.32):
    p = subprocess.run(["ffmpeg", "-hide_banner", "-i", path, "-vf", f"select='gt(scene,{thr})',showinfo", "-an", "-f", "null", "-"],
                       capture_output=True, text=True, encoding="utf-8", errors="replace")
    return [round(float(t), 2) for t in re.findall(r"pts_time:([0-9.]+)", p.stderr)]


def sample_gray(path, fps_s=8, side=96):
    """Low-res gray frames at fps_s for motion analysis, via raw rawvideo pipe."""
    meta = probe(path)
    w = side
    h = max(8, int(round(side * meta["height"] / meta["width"] / 2)) * 2)
    cmd = ["ffmpeg", "-v", "error", "-i", path, "-vf", f"fps={fps_s},scale={w}:{h},format=gray", "-f", "rawvideo", "-"]
    raw = subprocess.run(cmd, capture_output=True).stdout
    n = len(raw) // (w * h)
    return np.frombuffer(raw[: n * w * h], dtype=np.uint8).reshape(n, h, w).astype(np.float32) / 255.0


def phase_shift(a, b):
    """Global translation of b relative to a (pixels), by phase correlation."""
    win = np.outer(np.hanning(a.shape[0]), np.hanning(a.shape[1]))
    fa, fb = np.fft.fft2(a * win), np.fft.fft2(b * win)
    r = fa * np.conj(fb)
    r /= np.abs(r) + 1e-9
    c = np.fft.ifft2(r).real
    iy, ix = np.unravel_index(c.argmax(), c.shape)
    h, w = a.shape
    dy = iy - h if iy > h // 2 else iy
    dx = ix - w if ix > w // 2 else ix
    return float(dx), float(dy), float(c.max())


def motion(g, fps_s):
    if len(g) < 3:
        return {"note": "too few samples"}
    diffs = np.abs(np.diff(g, axis=0)).mean(axis=(1, 2))
    shifts = [phase_shift(g[i], g[i + 1]) for i in range(len(g) - 1)]
    sx = np.array([s[0] for s in shifts])
    sy = np.array([s[1] for s in shifts])
    conf = np.array([s[2] for s in shifts])
    ok = conf > 0.08
    w = g.shape[2]
    vx = float(sx[ok].mean() * fps_s / w) if ok.any() else 0.0
    vy = float(sy[ok].mean() * fps_s / w) if ok.any() else 0.0
    peaks = [round(float(i / fps_s), 2) for i in np.argsort(diffs)[-3:][::-1]]
    br = g.mean(axis=(1, 2))
    return {"motion_energy_mean": round(float(diffs.mean()), 4), "motion_energy_peak": round(float(diffs.max()), 4),
            "motion_peak_times_s": peaks, "motion_energy_variation": round(float(diffs.std() / (diffs.mean() + 1e-9)), 2),
            "global_translation_widths_per_s": {"x": round(vx, 3), "y": round(vy, 3),
                                                  "note": "positive x = content moves left; positive y = content moves up; near 0 means no camera move (motion is inside the frame)"},
            "brightness_over_time": [round(float(v), 3) for v in br[:: max(1, len(br) // 12)]],
            "brightness_range": [round(float(br.min()), 3), round(float(br.max()), 3)]}


def _box(a, r):
    """Mean over a (2r+1)^2 window, edges replicated (cumulative sums, no scipy)."""
    k = 2 * r + 1
    p = np.pad(a, r, mode="edge")
    for ax in (0, 1):
        c = np.cumsum(p, axis=ax, dtype=np.float64)
        z = np.zeros_like(np.take(c, [0], axis=ax))
        c = np.concatenate([z, c], axis=ax)
        p = (np.take(c, range(k, c.shape[ax]), axis=ax) - np.take(c, range(0, c.shape[ax] - k), axis=ax))
    return (p / (k * k)).astype(np.float32)


def _down(a):
    h, w = a.shape
    return a[: h // 2 * 2, : w // 2 * 2].reshape(h // 2, 2, w // 2, 2).mean(axis=(1, 3))


def _sample(img, x, y):
    h, w = img.shape
    x = np.clip(x, 0, w - 1)
    y = np.clip(y, 0, h - 1)
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    x1, y1 = np.minimum(x0 + 1, w - 1), np.minimum(y0 + 1, h - 1)
    fx, fy = x - x0, y - y0
    return (img[y0, x0] * (1 - fx) * (1 - fy) + img[y0, x1] * fx * (1 - fy)
            + img[y1, x0] * (1 - fx) * fy + img[y1, x1] * fx * fy)


def lk_flow(a, b, levels=2, win=4, iters=4):
    """Pyramidal Lucas-Kanade, dense: (u, v) in pixels such that b(x + u, y + v) ~ a(x, y),
    i.e. how far the content at each pixel of `a` travelled to reach `b` (u > 0 = right, v > 0 = down).
    Two levels, not three: measured on known zooms, the coarsest level of a 96 px frame overshoots small flows. Tracks up to ~8 px per step
    (about 0.08 widths per step, 0.7 widths/s at 8 fps); faster motion is not tracked and reads as noise."""
    pa, pb = [a.astype(np.float32)], [b.astype(np.float32)]
    for _ in range(levels - 1):
        if min(pa[-1].shape) < 16:
            break
        pa.append(_down(pa[-1]))
        pb.append(_down(pb[-1]))
    u = v = None
    for A, B in zip(reversed(pa), reversed(pb)):
        h, w = A.shape
        if u is None:
            u, v = np.zeros((h, w), np.float32), np.zeros((h, w), np.float32)
        else:
            def up(f):
                f = np.repeat(np.repeat(f, 2, 0), 2, 1) * 2
                return np.pad(f, ((0, max(0, h - f.shape[0])), (0, max(0, w - f.shape[1]))), mode="edge")[:h, :w]
            u, v = up(u), up(v)
        yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
        gy, gx = np.gradient(A)
        lim = 2 * win + 1
        for _ in range(iters):
            Bw = _sample(B, xx + u, yy + v)
            by, bx = np.gradient(Bw)
            ix, iy = (gx + bx) / 2, (gy + by) / 2          # gradient of both images: symmetric, less biased on zoom and rotation
            it = Bw - A
            sxx, syy, sxy = _box(ix * ix, win) + 1e-5, _box(iy * iy, win) + 1e-5, _box(ix * iy, win)
            det = sxx * syy - sxy * sxy
            flat = (sxx + syy) < 3e-5
            sxt, syt = _box(ix * it, win), _box(iy * it, win)
            du = -(syy * sxt - sxy * syt) / det
            dv = -(sxx * syt - sxy * sxt) / det
            du[flat], dv[flat] = 0, 0
            u = u + np.clip(du, -lim, lim)
            v = v + np.clip(dv, -lim, lim)
    return u, v


def flow_backend(choice="auto"):
    """('opencv', cv2) or ('numpy', None). An explicit opencv request without cv2 is an error, not a silent switch."""
    if choice in ("auto", "opencv"):
        try:
            import cv2  # noqa: WPS433
            return "opencv", cv2
        except ImportError:
            if choice == "opencv":
                sys.exit("error: --flow opencv needs opencv-python (pip install opencv-python-headless)")
    return "numpy", None


def dense_flow(a, b, backend, cv2=None):
    if backend == "opencv":
        f = cv2.calcOpticalFlowFarneback((a * 255).astype(np.uint8), (b * 255).astype(np.uint8), None, 0.5, 3, 15, 3, 5, 1.2, 0)
        return f[..., 0], f[..., 1]
    return lk_flow(a, b)


DIRS = ["right", "down-right", "down", "down-left", "left", "up-left", "up", "up-right"]


def flow_motion(g, fps_s, cuts=(), choice="auto"):
    """Optical flow between consecutive sampled frames, summarised as numbers an Animation IR can use.
    Convention here (differs from `motion`): content moves right = +x, down = +y. Pairs that straddle a cut are skipped."""
    backend, cv2 = flow_backend(choice)
    if len(g) < 2:
        return {"backend": backend, "note": "too few samples"}
    h, w = g.shape[1:]
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float64)
    xc, yc = (xx - (w - 1) / 2) / w, (yy - (h - 1) / 2) / w          # centred, in widths
    design = np.stack([np.ones(h * w), xc.ravel(), yc.ravel()], 1)
    pairs = [i for i in range(len(g) - 1) if not any(i / fps_s <= c <= (i + 1) / fps_s for c in cuts)]
    if not pairs:
        return {"backend": backend, "note": "every sampled pair straddles a cut"}
    rows = []
    hist = np.zeros(8)
    for i in pairs:
        u, v = dense_flow(g[i], g[i + 1], backend, cv2)
        u, v = np.asarray(u, np.float64) / w, np.asarray(v, np.float64) / w   # widths per sampled step
        mag = np.hypot(u, v)
        cu, *_ = np.linalg.lstsq(design, u.ravel(), rcond=None)
        cv_, *_ = np.linalg.lstsq(design, v.ravel(), rcond=None)
        res = np.hypot(u.ravel() - design @ cu, v.ravel() - design @ cv_)
        tot = float(np.sqrt((mag ** 2).mean())) + 1e-12
        mv = mag > 0.004
        ang = (np.arctan2(v, u)[mv] / (np.pi / 4)).round().astype(int) % 8
        np.add.at(hist, ang, mag[mv])
        rows.append({"speed": float(mag.mean()), "moving": float(mv.mean()), "pan": (cu[0], cv_[0]),
                     "zoom": (cu[1] + cv_[2]) / 2, "rot": (cv_[1] - cu[2]) / 2,
                     "local": float(np.sqrt((res ** 2).mean()) / tot), "mean": (float(u.mean()), float(v.mean()))})
    f = lambda k: float(np.mean([r[k] for r in rows]))
    pan = np.mean([r["pan"] for r in rows], 0) * fps_s
    zoom, rot = f("zoom") * fps_s, f("rot") * fps_s
    local = min(1.0, f("local"))
    speed = f("speed") * fps_s
    mean_vec = np.mean([r["mean"] for r in rows], 0)
    coherence = float(np.hypot(*mean_vec) / (f("speed") + 1e-12))
    effects = {"pan": float(np.hypot(*pan)), "zoom": abs(zoom) * 0.5, "rotation": abs(rot) * 0.5}  # all as widths/s at the frame edge
    if speed < 0.01:
        label = "static (no camera or content motion)"
    elif f("moving") < 0.6 or (local > 0.7 and max(effects.values()) < 0.6 * speed):   # part of the frame stays still, or nothing global explains it
        label = "local (motion inside the frame, no pan, zoom or rotation)"
    else:
        names = {"pan": "pan: content moves " + DIRS[int(round(np.arctan2(pan[1], pan[0]) / (np.pi / 4))) % 8],
                 "zoom": "zoom in (content expands)" if zoom > 0 else "zoom out (content shrinks)",
                 "rotation": "rotation clockwise" if rot > 0 else "rotation counter-clockwise"}
        ranked = sorted(effects, key=effects.get, reverse=True)
        label = names[ranked[0]]
        # a zoom about a frame corner reads as a pan plus a zoom: name the second effect when it is comparable
        label += "".join(" + " + names[k] for k in ranked[1:] if effects[k] >= 0.6 * effects[ranked[0]])
    sp = [r["speed"] * fps_s for r in rows]
    return {"backend": backend, "pairs_used": len(pairs), "pairs_skipped_at_cuts": len(g) - 1 - len(pairs),
            "dominant_motion": label,
            "speed_mean_widths_per_s": round(speed, 3), "speed_peak_widths_per_s": round(max(sp), 3),
            "moving_share": round(f("moving"), 3),
            "pan_widths_per_s": {"x": round(float(pan[0]), 3), "y": round(float(pan[1]), 3), "note": "content moves right = +x, down = +y"},
            "zoom_per_s": round(zoom, 3), "zoom_note": "fractional scale change per second; + = content expands (camera moves in)",
            "rotation_deg_per_s": round(float(np.degrees(rot)), 1), "rotation_note": "+ = clockwise on screen",
            "coherence": round(coherence, 2), "coherence_note": "1 = every pixel goes the same way, near 0 = directions cancel (radial, turbulent)",
            "local_share": round(local, 2), "local_note": "share of motion left over after removing pan, zoom and rotation; high = things move inside the frame",
            "direction_histogram": {d: round(float(x / (hist.sum() + 1e-12)), 2) for d, x in zip(DIRS, hist)},
            "speed_over_time": [round(s, 3) for s in sp[:: max(1, len(sp) // 12)]]}


def extract_frames(path, out, n, duration):
    fdir = os.path.join(out, "frames")
    os.makedirs(fdir, exist_ok=True)
    files = []
    for i in range(n):
        t = duration * (i + 0.5) / n
        f = os.path.join(fdir, f"frame_{i + 1:02d}_{t:06.2f}s.jpg")
        run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.3f}", "-i", path, "-frames:v", "1", "-vf", "scale=768:-2", "-q:v", "3", f])
        files.append(f)
    return files


def contact_sheet(files, out):
    ims = [Image.open(f).convert("RGB") for f in files]
    cols = 4 if len(ims) > 6 else 3
    rows = (len(ims) + cols - 1) // cols
    tw = 384
    th = int(ims[0].height * tw / ims[0].width)
    sheet = Image.new("RGB", (cols * tw, rows * th), (0, 0, 0))
    for i, im in enumerate(ims):
        sheet.paste(im.resize((tw, th)), ((i % cols) * tw, (i // cols) * th))
    p = os.path.join(out, "contact_sheet.jpg")
    sheet.save(p, quality=88)
    return p


def analyze(path, out, n, flow="auto"):
    meta = probe(path)
    cuts = scene_cuts(path)
    files = extract_frames(path, out, n, meta["duration_s"])
    sheet = contact_sheet(files, out)
    fps_s = 8
    g = sample_gray(path, fps_s)
    pix = np.concatenate([np.asarray(Image.open(f).convert("RGB").resize((96, 54)), dtype=np.float32).reshape(-1, 3) / 255.0 for f in files])
    pal = AI.palette(pix.reshape(-1, 1, 3), 6)
    mid = AI.analyze(files[len(files) // 2], 4)
    return {"file": path, "video": meta, "cuts": {"count": len(cuts), "times_s": cuts[:40],
                                                  "per_minute": round(len(cuts) / max(meta["duration_s"], 1e-6) * 60, 1),
                                                  "average_shot_length_s": round(meta["duration_s"] / (len(cuts) + 1), 2)},
            "motion": motion(g, fps_s), "optical_flow": flow_motion(g, fps_s, cuts, flow), "palette_all_frames": pal, "suggested_roles": AI.roles(pal),
            "middle_frame_composition": mid["composition"], "middle_frame_frequency": mid["frequency"],
            "outputs": {"frames": files, "contact_sheet": sheet}}


def report(r):
    v, c, m = r["video"], r["cuts"], r["motion"]
    L = [f"VIDEO {r['file']}", f"  {v['width']}x{v['height']}  {v['fps']} fps  {v['duration_s']} s  codec {v['codec']}", "",
         f"CUTS  {c['count']} detected  ({c['per_minute']}/min)  average shot {c['average_shot_length_s']} s", f"  times {c['times_s']}", "",
         "MOTION"]
    L += [f"  {k}: {v2}" for k, v2 in m.items()]
    L += ["", f"OPTICAL FLOW ({r['optical_flow'].get('backend')})"] + [f"  {k}: {v2}" for k, v2 in r["optical_flow"].items() if k != "backend"]
    L += ["", "PALETTE (all sampled frames)"] + [f"  {p['hex']}  share {p['share']}  L {p['lightness']}  C {p['chroma']}  h {p['hue']}" for p in r["palette_all_frames"]]
    L += [f"  suggested roles: {r['suggested_roles']}", "", "MIDDLE FRAME", f"  composition {r['middle_frame_composition']}",
          f"  frequency {r['middle_frame_frequency']}", "", "NOW LOOK AT THESE FILES (the numbers do not replace seeing them):",
          f"  {r['outputs']['contact_sheet']}"] + [f"  {f}" for f in r["outputs"]["frames"]]
    return "\n".join(L)


if __name__ == "__main__":
    argv = sys.argv[1:]
    if not argv or argv[0].startswith("-"):
        sys.exit(__doc__)
    path = argv[0]
    if not os.path.isfile(path):
        sys.exit(f"error: file not found: {path}")
    import shutil
    if not (shutil.which("ffmpeg") and shutil.which("ffprobe")):
        sys.exit("error: ffmpeg and ffprobe must be on PATH (winget install Gyan.FFmpeg, or brew / apt install ffmpeg)")
    n = int(argv[argv.index("--frames") + 1]) if "--frames" in argv else 12
    out = argv[argv.index("--out") + 1] if "--out" in argv else tempfile.mkdtemp(prefix="aivj_video_")
    os.makedirs(out, exist_ok=True)
    flow = argv[argv.index("--flow") + 1] if "--flow" in argv else "auto"
    if flow not in ("auto", "opencv", "numpy"):
        sys.exit("error: --flow must be auto, opencv or numpy")
    res = analyze(path, out, n, flow)
    print(json.dumps(res, indent=2, ensure_ascii=False) if "--json" in argv else report(res))
