#!/usr/bin/env python3
"""Surface IR (phase 9): what is known about the surface, how sure we are, and what it forces on the composition.

  python surface_ir.py brief.json            # reads brief["surface"]
  python surface_ir.py project.json          # reads canvas (size, folds, displays) and meta.spec.confirmed
  python surface_ir.py surface.json regions.csv   # adds regions from a CSV (name,x,y,w,h)

The surface is input, constraint and context: never a 3D environment and never mapping. The IR analyses what the author gave (size, folds, regions from a CSV
or a mask, LED pitch, viewing distance) and labels every fact with a confidence:

  EXPLICIT  declared by the author (or exact arithmetic on what was declared)
  DETECTED  measured on a shape the author delivered (mask, region geometry): layout, symmetry, active area
  INFERRED  a rule-based guess from other facts; may be wrong, so it only advises
  UNKNOWN   the datum is missing and no honest rule exists: kept as a question, never guessed

The strength of a constraint follows its confidence: EXPLICIT and DETECTED are `hard` (the Composition IR obeys them), INFERRED is `soft` (advice),
UNKNOWN restricts nothing. Data: registry/surface.json, shared with the browser (app/surface-ir.js); both give the same IR (scripts/surface_ir_check.mjs).
Pure standard library.
"""
import csv
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "registry", "surface.json"), encoding="utf-8") as f:
    DATA = json.load(f)
N = DATA["grid"]
HARD = DATA["strength"]["hardFrom"]
r3 = lambda x: round(x, 3)
r2 = lambda x: round(x, 2)


def aspect_class(w, h):
    r = w / h
    return "ultrawide" if r >= 3 else "wide" if r >= 1.5 else "standard" if r > 0.8 else "tall" if r > 0.4 else "ultratall"


def _num(v):
    return isinstance(v, (int, float)) and not isinstance(v, bool) and math.isfinite(v)


def clean_regions(raw, W, H):
    """Keeps the rectangles that have a positive area, clipped to the canvas, in the order given."""
    out = []
    for r in raw or []:
        if not (isinstance(r, dict) and all(_num(r.get(k)) for k in ("x", "y", "w", "h"))):
            continue
        x0, y0 = max(0, r["x"]), max(0, r["y"])
        x1, y1 = min(W, r["x"] + r["w"]), min(H, r["y"] + r["h"])
        if x1 - x0 > 0 and y1 - y0 > 0:
            out.append({"x": x0, "y": y0, "w": x1 - x0, "h": y1 - y0, "source": r.get("source")})
    return out


def _groups(vals, gap):
    vs = sorted(vals)
    return 1 + sum(1 for a, b in zip(vs, vs[1:]) if b - a > gap)


def layout_of(rs):
    n = len(rs)
    if n == 1:
        return "single"
    mh, mw = sum(r["h"] for r in rs) / n, sum(r["w"] for r in rs) / n
    rows = _groups([r["y"] + r["h"] / 2 for r in rs], DATA["layoutGap"] * mh)
    cols = _groups([r["x"] + r["w"] / 2 for r in rs], DATA["layoutGap"] * mw)
    if rows == 1 and cols == 1:
        return "single"
    if rows == 1:
        return "row"
    if cols == 1:
        return "column"
    return "grid" if n >= DATA["gridFill"] * rows * cols else "scattered"


def coverage(rs, W, H):
    g = []
    for r in range(N):
        row = []
        for c in range(N):
            x0, x1, y0, y1 = c * W / N, (c + 1) * W / N, r * H / N, (r + 1) * H / N
            area = sum(max(0, min(x1, q["x"] + q["w"]) - max(x0, q["x"])) * max(0, min(y1, q["y"] + q["h"]) - max(y0, q["y"])) for q in rs)
            row.append(r2(min(1.0, area / ((x1 - x0) * (y1 - y0)))))
        g.append(row)
    return g


def symmetry(g, vertical):
    num = den = 0.0
    for r in range(N):
        for c in range(N):
            a, b = g[r][c], (g[N - 1 - r][c] if vertical else g[r][N - 1 - c])
            num += abs(a - b)
            den += a + b
    return r2(1 - num / den) if den else 1.0


def legibility(pitch, dist):
    L = DATA["legibility"]
    cap_mm = dist * 1000 * math.tan(math.radians(L["capDeg"]))
    line_mm = dist * 1000 * math.tan(math.radians(L["lineArcmin"] / 60))
    return {"capPx": max(max(1, round(cap_mm / pitch)), L["minCapPx"]), "linePx": max(L["minLinePx"], round(line_mm / pitch))}


def compile_surface(sf):
    W, H = sf["w"], sf["h"]
    cls = aspect_class(W, H)
    facts, constraints = [], []
    fact = lambda i, v, c, b: facts.append({"id": i, "value": v, "confidence": c, "basis": b})
    strength = lambda c: "hard" if c in HARD else "soft"

    fact("size", [W, H], "EXPLICIT", "declared canvas size in pixels")
    fact("aspect", r3(W / H), "EXPLICIT", "exact arithmetic on the declared size")

    edges = sorted({f for f in (sf.get("folds") or []) if _num(f) and 0 < f < W})
    pts = [0] + edges + [W]
    walls = [{"from": r3(a / W), "to": r3(b / W)} for a, b in zip(pts, pts[1:])]
    if edges:
        fact("walls", len(walls), "EXPLICIT", "folds declared by the author")
        hw = DATA["foldHalfWidth"]
        constraints.append({"id": "foldBands", "kind": "seam", "strength": "hard", "confidence": "EXPLICIT",
                            "bands": [{"at": r3(e / W), "from": r3(e / W - hw), "to": r3(e / W + hw)} for e in edges],
                            "rule": "hero, structure and support zones do not straddle a fold; text keeps off the fold"})
    else:
        fact("walls", 1, "INFERRED", "no folds declared: one wall is assumed")

    rs = clean_regions(sf.get("regions"), W, H)
    regions = grid = None
    if rs:
        conf = "DETECTED" if rs[0].get("source") == "mask" else "EXPLICIT"
        grid = coverage(rs, W, H)
        share = r3(min(1.0, sum(q["w"] * q["h"] for q in rs) / (W * H)))
        x0, y0 = min(q["x"] for q in rs), min(q["y"] for q in rs)
        x1, y1 = max(q["x"] + q["w"] for q in rs), max(q["y"] + q["h"] for q in rs)
        bbox = {"x": r3(x0 / W), "y": r3(y0 / H), "w": r3((x1 - x0) / W), "h": r3((y1 - y0) / H)}
        lay, sym = layout_of(rs), {"h": symmetry(grid, False), "v": symmetry(grid, True)}
        regions = {"count": len(rs), "source": "mask" if conf == "DETECTED" else "list", "activeShare": share, "bbox": bbox, "layout": lay, "symmetry": sym}
        fact("activeArea", share, conf, "regions given by the author" if conf == "EXPLICIT" else "regions measured on the mask the author gave")
        fact("layout", lay, "DETECTED", "measured on the geometry of the regions")
        fact("symmetry", sym, "DETECTED", "measured on an 8x8 coverage grid of the regions")
        constraints.append({"id": "activeArea", "kind": "region", "strength": strength(conf), "confidence": conf, "minCoverage": DATA["minCoverage"],
                            "rule": "the centre of each zone sits on a grid cell whose coverage is at least minCoverage"})
        i = DATA["safeInset"]
        safe = {"x": r3(bbox["x"] + bbox["w"] * i), "y": r3(bbox["y"] + bbox["h"] * i), "w": r3(bbox["w"] * (1 - 2 * i)), "h": r3(bbox["h"] * (1 - 2 * i))}
        constraints.append({"id": "safeArea", "kind": "margin", "strength": strength(conf), "confidence": conf, "value": safe, "rule": "inset of the bounding box of the active regions"})
    else:
        fact("activeArea", 1.0, "INFERRED", "no regions given: the whole canvas is treated as surface")
        fact("layout", None, "UNKNOWN", "no regions to measure")
        fact("symmetry", None, "UNKNOWN", "no regions to measure")
        constraints.append({"id": "safeArea", "kind": "margin", "strength": "soft", "confidence": "INFERRED", "value": dict(DATA["defaultSafe"]), "rule": "default margin: no regions to measure"})

    ra = DATA["readingAxis"]
    axis = "x" if W / H >= ra["wideFrom"] else "y" if W / H <= ra["tallTo"] else "none"
    fact("readingAxis", axis, "INFERRED", "the long side of the canvas is where the eye travels")
    constraints.append({"id": "readingAxis", "kind": "advice", "strength": "soft", "confidence": "INFERRED", "value": axis, "rule": "movement along the long side reads better than across it"})

    pitch, dist = sf.get("pitchMm"), (sf.get("viewingDistanceM") or [None, None])[-1]
    unknowns = [{"id": u["id"], "why": u["why"], "ask": u["ask"]} for u in DATA["unknowns"]]
    miss = DATA["unknownsIfMissing"]
    if _num(pitch) and pitch > 0:
        fact("pitch", pitch, "EXPLICIT", "declared by the author")
    else:
        pitch = None
        fact("pitch", None, "UNKNOWN", miss["pitch"]["why"])
        unknowns.append({"id": "pitch", **miss["pitch"]})
    if _num(dist) and dist > 0:
        fact("viewingDistance", dist, "EXPLICIT", "declared by the author (the farthest viewer)")
    else:
        dist = None
        fact("viewingDistance", None, "UNKNOWN", miss["distance"]["why"])
        unknowns.append({"id": "viewingDistance", **miss["distance"]})
    if pitch and dist:
        lg = legibility(pitch, dist)
        fact("legibility", lg, "INFERRED", "visual-angle rules of thumb applied to the declared pitch and distance")
        constraints.append({"id": "legibility", "kind": "advice", "strength": "soft", "confidence": "INFERRED", "value": lg, "rule": "smallest text and stroke that read, in pixels (rules of thumb)"})
    else:
        fact("legibility", None, "UNKNOWN", "needs the LED pitch and the viewing distance")
    if not rs:
        unknowns.append({"id": "regions", **miss["regions"]})

    summary = {k: 0 for k in DATA["confidence"]["order"]}
    for x in facts:
        summary[x["confidence"]] += 1
    return {"version": 1, "canvas": {"w": W, "h": H, "aspect": r3(W / H), "aspectClass": cls, "orientation": "wide" if W > H * 1.1 else "tall" if H > W * 1.1 else "square"},
            "facts": facts, "walls": walls, "regions": regions, "grid": grid, "constraints": constraints, "unknowns": unknowns, "summary": summary}


def from_project(proj):
    c = proj["canvas"]
    cf = ((proj.get("meta") or {}).get("spec") or {}).get("confirmed") or {}
    sf = {"w": c["w"], "h": c["h"]}
    if c.get("folds"):
        sf["folds"] = list(c["folds"])
    if c.get("displays"):
        sf["regions"] = [dict(d) for d in c["displays"]]
    if cf.get("pitchMm"):
        sf["pitchMm"] = cf["pitchMm"]
    if cf.get("viewingDistanceM"):
        sf["viewingDistanceM"] = cf["viewingDistanceM"]
    return sf


def read_csv(path):
    out = []
    with open(path, encoding="utf-8") as f:
        for row in csv.reader(f):
            tail = row[-4:]
            try:
                x, y, w, h = (float(v) for v in tail)
            except ValueError:
                continue
            out.append({"name": row[0] if len(row) == 5 else f"M{len(out) + 1:02d}", "x": x, "y": y, "w": w, "h": h})
    return out


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    d = json.load(open(sys.argv[1], encoding="utf-8"))
    s = from_project(d) if "canvas" in d else d["surface"] if "surface" in d else d
    if len(sys.argv) > 2:
        s = dict(s, regions=read_csv(sys.argv[2]))
    print(json.dumps(compile_surface(s), ensure_ascii=False, indent=1))
