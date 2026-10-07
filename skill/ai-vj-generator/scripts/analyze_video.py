#!/usr/bin/env python3
"""Turn a reference video into key frames plus measurements of how it moves.

usage: python analyze_video.py video.mp4 [--out DIR] [--frames 12] [--json]

Needs ffmpeg and ffprobe on PATH, plus Pillow and numpy. It writes DIR/frames/*.jpg
and DIR/contact_sheet.jpg (open them with the image viewer: you must LOOK at the
frames) and prints measurements: resolution, fps, duration, cut density, motion
energy, dominant motion direction, brightness over time, palette of the sampled frames.
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


def analyze(path, out, n):
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
            "motion": motion(g, fps_s), "palette_all_frames": pal, "suggested_roles": AI.roles(pal),
            "middle_frame_composition": mid["composition"], "middle_frame_frequency": mid["frequency"],
            "outputs": {"frames": files, "contact_sheet": sheet}}


def report(r):
    v, c, m = r["video"], r["cuts"], r["motion"]
    L = [f"VIDEO {r['file']}", f"  {v['width']}x{v['height']}  {v['fps']} fps  {v['duration_s']} s  codec {v['codec']}", "",
         f"CUTS  {c['count']} detected  ({c['per_minute']}/min)  average shot {c['average_shot_length_s']} s", f"  times {c['times_s']}", "",
         "MOTION"]
    L += [f"  {k}: {v2}" for k, v2 in m.items()]
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
    res = analyze(path, out, n)
    print(json.dumps(res, indent=2, ensure_ascii=False) if "--json" in argv else report(res))
