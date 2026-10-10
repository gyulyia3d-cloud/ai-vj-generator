#!/usr/bin/env python3
"""Composition IR (phase 6): where things go, how much room they take, where nothing goes, and how that changes over the loop.

  python composition_ir.py brief.json [index]     # prints the Composition IR of composition `index` (default 0)

It reads the Creative IR (verbs) and the surface (size and aspect). Data: registry/composition.json, shared with the browser (app/composition.js);
both give the same IR (scripts/composition_check.mjs). The IR is also applied to the layers: position and scale of the hero and the structure,
the centre of the instrument and of the text, the direction of lines, and a five-phase envelope (establish, develop, transform, peak, release)
played as `env` modulation. The generator and the composition are independent: changing the grammar moves the same generators somewhere else.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import creative_ir as cir  # noqa: E402
import surface_ir as sir  # noqa: E402

with open(os.path.join(HERE, "..", "registry", "composition.json"), encoding="utf-8") as f:
    DATA = json.load(f)
G = {g["id"]: g for g in DATA["grammars"]}
ENGINE_DEFAULT = {"contrast": 1, "speed": 1, "rot": 0, "sx": 1, "sy": 1}
r3 = lambda x: round(x, 3)
r2 = lambda x: round(x, 2)


def aspect_class(w, h):
    r = w / h
    return "ultrawide" if r >= 3 else "wide" if r >= 1.5 else "standard" if r > 0.8 else "tall" if r > 0.4 else "ultratall"


def rank_grammars(ir, cls):
    # the concept (verbs, as a share of their total weight) and the shape of the surface vote together; the surface wins the first slot, the concept shapes the rest of the set
    acc = {g: 0 for g in DATA["grammarOrder"]}
    total = sum(ir["verbScores"][v] for v in ir.get("visualVerbs", []))
    for v in ir.get("visualVerbs", []):
        for g, w in DATA["verbGrammars"].get(v, {}).items():
            acc[g] += ir["verbScores"][v] * w
    scores = {g: (DATA["weights"]["verb"] * acc[g] / total if total else 0) for g in acc}
    for g, w in DATA["aspectClasses"][cls].items():
        scores[g] += DATA["weights"]["aspect"] * w
    order = DATA["grammarOrder"]
    return [g for g in sorted(scores, key=lambda g: (-scores[g], order.index(g))) if scores[g] > 0]


def rect(cx, cy, size, W, H):
    short = min(W, H)
    w = min(1.0, size * short / W)
    h = min(1.0, size * short / H)
    x = min(max(cx - w / 2, 0.0), 1.0 - w)
    y = min(max(cy - h / 2, 0.0), 1.0 - h)
    return {"x": r3(x), "y": r3(y), "w": r3(w), "h": r3(h)}


def center(z):
    return (z["x"] + z["w"] / 2, z["y"] + z["h"] / 2)


def inside(z, px, py):
    return z["x"] <= px <= z["x"] + z["w"] and z["y"] <= py <= z["y"] + z["h"]


def hard(sx, cid):
    return next((c for c in sx["constraints"] if c["id"] == cid and c["strength"] == "hard"), None)


def fit_zone(z, sx, name, log):
    """Surface IR constraints on a zone. Only `hard` constraints (EXPLICIT or DETECTED facts) move anything; INFERRED advice and UNKNOWN never do."""
    ac = hard(sx, "activeArea")
    if ac:
        cx, cy = center(z)
        grid, n = sx["grid"], len(sx["grid"])
        if grid[min(int(cy * n), n - 1)][min(int(cx * n), n - 1)] < ac["minCoverage"]:
            cells = [((c + 0.5) / n - cx, (r + 0.5) / n - cy, r, c) for r in range(n) for c in range(n) if grid[r][c] >= ac["minCoverage"]]
            if cells:
                _, r, c = min((dx * dx + dy * dy, r, c) for dx, dy, r, c in cells)
                nx, ny = (c + 0.5) / n, (r + 0.5) / n
                z = {"x": r3(min(max(nx - z["w"] / 2, 0.0), 1.0 - z["w"])), "y": r3(min(max(ny - z["h"] / 2, 0.0), 1.0 - z["h"])), "w": z["w"], "h": z["h"]}
                log.append({"zone": name, "rule": "activeArea"})
    fb = hard(sx, "foldBands")
    if fb and any(z["x"] < b["to"] and z["x"] + z["w"] > b["from"] for b in fb["bands"]):
        cx = center(z)[0]
        wall = next((w for w in sx["walls"] if w["from"] <= cx <= w["to"]), sx["walls"][-1])
        m = sir.DATA["foldMargin"]
        x = min(max(z["x"], wall["from"] + m), wall["to"] - z["w"] - m) if wall["to"] - wall["from"] >= z["w"] + 2 * m else (wall["from"] + wall["to"]) / 2 - z["w"] / 2
        x = r3(min(max(x, 0.0), 1.0 - z["w"]))
        if x != z["x"]:
            z = {"x": x, "y": z["y"], "w": z["w"], "h": z["h"]}
            log.append({"zone": name, "rule": "foldBands"})
    return z


def fit_text(a, sx, log):
    fb = hard(sx, "foldBands")
    if not fb:
        return a
    cx = a[0]
    wall = next((w for w in sx["walls"] if w["from"] <= cx <= w["to"]), sx["walls"][-1])
    tm = sir.DATA["textFoldMargin"]
    if (wall["from"] > 0 and cx - wall["from"] < tm) or (wall["to"] < 1 and wall["to"] - cx < tm):
        log.append({"zone": "text", "rule": "foldBands"})
        return [r2((wall["from"] + wall["to"]) / 2), a[1], a[2]]
    return a


def compile_composition(brief, ir, i):
    sf = brief["surface"]
    W, H = sf["w"], sf["h"]
    cls = aspect_class(W, H)
    top = rank_grammars(ir, cls)[: DATA["weights"]["setSize"]]
    g = G[top[i % len(top)]]
    hero = rect(g["hero"][0], g["hero"][1], g["hero"][2], W, H)
    sec = rect(g["secondary"][0], g["secondary"][1], g["secondary"][2], W, H)
    sup = rect(g["support"][0], g["support"][1], 0.3, W, H)
    sx = sir.compile_surface(sf)
    log = []
    hero, sec, sup = (fit_zone(z, sx, nm, log) for z, nm in ((hero, "hero"), (sec, "secondary"), (sup, "support")))
    text = fit_text(g["text"], sx, log)
    neg = {"x": g["negative"][0], "y": g["negative"][1], "w": g["negative"][2], "h": g["negative"][3], "why": "left empty on purpose: nothing is placed here"}
    hm = g["heroMass"]
    sm = r2((1 - hm) * 0.6)
    mass = {"hero": hm, "secondary": sm, "support": r2(1 - hm - sm)}
    hc, sc, pc = center(hero), center(sec), center(sup)
    vx = mass["hero"] * hc[0] + mass["secondary"] * sc[0] + mass["support"] * pc[0]
    vy = mass["hero"] * hc[1] + mass["secondary"] * sc[1] + mass["support"] * pc[1]
    dmap = []
    for r in range(3):
        row = []
        for c in range(3):
            px, py = (c + 0.5) / 3, (r + 0.5) / 3
            row.append(0.9 if inside(hero, px, py) else 0.55 if inside(sec, px, py) else 0.05 if inside(neg, px, py) else 0.25)
        dmap.append(row)
    arc_id = (ir.get("arc") or {}).get("id") or "drift"
    prof = DATA["phaseProfiles"][arc_id]
    phases = []
    for k, name in enumerate(DATA["phaseNames"]):
        phases.append({"name": name, "at": r2(k / 5), "heroScale": prof["heroScale"][k], "density": prof["density"][k], "contrast": prof["contrast"][k], "rotation": prof["rotation"][k], "motion": prof["motion"][k]})
    base = DATA["weights"]["baseHeroSize"]
    seams = [{"x": b["from"], "y": 0, "w": r3(b["to"] - b["from"]), "h": 1, "why": "fold seam: nothing straddles it"} for b in (hard(sx, "foldBands") or {"bands": []})["bands"]]
    sa = hard(sx, "safeArea")
    out = {
        "version": 1, "grammar": g["id"], "grammarSet": top, "aspectClass": cls,
        "canvas": {"w": W, "h": H, "aspect": r3(W / H), "orientation": "wide" if W > H * 1.1 else "tall" if H > W * 1.1 else "square"},
        "hierarchy": {"primary": "hero", "secondary": "structure", "tertiary": "ground"},
        "zones": {"hero": hero, "secondary": sec, "support": sup, "background": {"x": 0, "y": 0, "w": 1, "h": 1}},
        "negativeSpace": [neg] + seams, "focalPoint": {"x": r3(hc[0]), "y": r3(hc[1])},
        "visualMass": mass, "balance": {"type": g["balance"], "centre": {"x": r3(vx), "y": r3(vy)}},
        "alignment": g["alignment"], "movementAxis": g["axis"], "densityMap": dmap,
        "scaleHierarchy": {"hero": r2(g["hero"][2] / base), "secondary": r2(g["secondary"][2] / base), "support": 0.4},
        "depthHierarchy": {"hero": "foreground", "secondary": "midground", "support": "midground", "background": "background"},
        "safeAreas": sa["value"] if sa else {"x": 0.05, "y": 0.05, "w": 0.9, "h": 0.9}, "edgeBehavior": g["edge"],
        "textAnchor": {"cx": text[0], "cy": text[1], "align": text[2]},
        "temporal": {"arc": arc_id, "phases": phases}, "description": g["description"],
    }
    if hard(sx, "activeArea") or hard(sx, "foldBands"):
        out["surface"] = {"hard": [c["id"] + ":" + c["confidence"] for c in sx["constraints"] if c["strength"] == "hard"], "adjusted": log}
    return out


def env_mod(k, raw, mode):
    lo, hi = min(raw), max(raw)
    if hi - lo < 1e-9:
        return None
    return {"k": k, "src": "lfo", "shape": "env", "cycles": 1, "min": round(lo, 4), "max": round(hi, 4), "mode": mode, "keys": [round((x - lo) / (hi - lo), 4) for x in raw]}


def tier_of(L):
    """The tier of a layer: by its name (HERÓI, ESTRUTURA, as the generator writes) or by its role, which must start with the tier ("hero: ...", "structure: ...")."""
    nm, role = str(L.get("name", "")).upper(), str(L.get("role", "")).strip().lower()
    return "hero" if nm.startswith("HER") or role.startswith("hero") else "structure" if nm.startswith("ESTRUTURA") or role.startswith("structure") else None


def line_dir(comp):
    return DATA["lineDir"].get(comp["movementAxis"])


def apply_composition(layers, comp, W, H):
    """Places the layers of one composition by its Composition IR. Layer names tell the tier (HERÓI, ESTRUTURA, INSTRUMENTO, TIPOGRAFIA)."""
    placeable = DATA["placeable"]
    z = comp["zones"]
    ph = comp["temporal"]["phases"]
    col = lambda key: [p[key] for p in ph]
    for L in layers:
        t = L["type"]
        tier = tier_of(L)
        p = L.setdefault("p", {})
        if tier == "hero":
            if t in placeable:
                c = center(z["hero"])
                p["x"] = round((c[0] - 0.5) * W)
                p["y"] = round((c[1] - 0.5) * H)
                p["sx"] = p["sy"] = comp["scaleHierarchy"]["hero"]
            mods = L.setdefault("mod", [])
            mods[:] = [m for m in mods if m.get("shape") != "env"]  # applying the plan twice must not stack envelopes
            specs = [("contrast", col("contrast"), "mul"), ("speed", col("motion"), "mul")]
            if t in placeable:
                specs = [("sx", col("heroScale"), "mul"), ("sy", col("heroScale"), "mul"), ("rot", col("rotation"), "add")] + specs
            if isinstance(p.get("count"), (int, float)):
                specs.append(("count", col("density"), "mul"))
            for k, raw, mode in specs:
                m = env_mod(k, raw, mode)
                if m:
                    p.setdefault(k, ENGINE_DEFAULT.get(k, 1))  # the modulation starts from a value that is written down, not from a hidden default
                    mods.append(m)
        elif tier == "structure":
            if t in placeable:
                c = center(z["secondary"])
                p["x"] = round((c[0] - 0.5) * W)
                p["y"] = round((c[1] - 0.5) * H)
                p["sx"] = p["sy"] = comp["scaleHierarchy"]["secondary"]
        elif t == "instrument":
            c = center(z["support"])
            p["cx"] = r2(min(max(c[0], 0.1), 0.9))
            p["cy"] = r2(min(max(c[1], 0.1), 0.9))
        elif t == "typeset":
            a = comp["textAnchor"]
            p["cx"], p["cy"], p["align"] = a["cx"], a["cy"], a["align"]
    return layers


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    b = json.load(open(sys.argv[1], encoding="utf-8"))
    print(json.dumps(compile_composition(b, cir.compile_ir(b), int(sys.argv[2]) if len(sys.argv) > 2 else 0), ensure_ascii=False, indent=1))
