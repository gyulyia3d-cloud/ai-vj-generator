#!/usr/bin/env python3
"""Tested math / physics recipes as ready layers.

usage:
  python recipes.py list
  python recipes.py show <id>                      the source and the meaning of one recipe
  python recipes.py layer <id> [--set k=v ...] [--name N] [--role R] [--blend B] [--opacity O]
                                                   print one layer JSON to paste into a composition
  python recipes.py gallery --out gallery.aivj.json [--canvas 1920x1080] [--ids a,b] [--seed 12345]
                                                   a throw-away project with one composition per recipe, to look at
                                                   the recipes with scripts/contact_sheet.mjs (not a deliverable)

A recipe is vocabulary: adapt it to the briefing (numbers, palette roles, audio mapping, name, role) before use.
Code recipes become `code` layers (their sliders are the `vars`); shader recipes become `shader` layers (p1..p4).
"""
import argparse
import json
import sys
from pathlib import Path

if hasattr(sys.stdout, "reconfigure"):          # Windows pipes default to cp1252; the JSON and notes are UTF-8
    sys.stdout.reconfigure(encoding="utf-8")

ROOT = Path(__file__).resolve().parent.parent / "references" / "recipes"


def load():
    return json.loads((ROOT / "manifest.json").read_text(encoding="utf-8"))["recipes"]


def get(rid):
    for r in load():
        if r["id"] == rid:
            return r
    sys.exit(f"unknown recipe '{rid}'. try: python recipes.py list")


def source(r):
    return (ROOT / r["file"]).read_text(encoding="utf-8")


def make_layer(r, sets=None, name=None, role=None, blend="normal", opacity=1.0):
    sets = sets or {}
    if r["kind"] == "code":
        v = {x["k"]: x["d"] for x in r["vars"]}
        spec = {x["k"]: x for x in r["vars"]}
        for k, val in sets.items():
            if k not in v:
                sys.exit(f"recipe {r['id']} has no variable '{k}' (has: {', '.join(v)})")
            v[k] = check_number(r["id"], k, val, spec[k].get("min"), spec[k].get("max"))
        p = {"src": source(r)}
        for k, val in v.items():
            if val != next(x["d"] for x in r["vars"] if x["k"] == k):
                p["v_" + k] = val
        L = {"type": "code", "name": name or r["title"].upper(), "on": True, "opacity": opacity, "blend": blend,
             "role": role or f"TODO: why this layer exists in this briefing ({r['title']})", "vars": r["vars"], "p": p}
    else:
        p = dict(r["p"])
        for k, val in sets.items():
            if k not in p:
                sys.exit(f"recipe {r['id']} has no parameter '{k}' (has: {', '.join(p)})")
            lo, hi = (r.get("ranges", {}).get(k) or [None, None])
            p[k] = check_number(r["id"], k, val, lo, hi)
        p.update({"src": source(r), "alphaMode": "alpha", "res": 1, "c1": "primary", "c2": "accent"})
        L = {"type": "shader", "name": name or r["title"].upper(), "on": True, "opacity": opacity, "blend": blend,
             "role": role or f"TODO: why this layer exists in this briefing ({r['title']})", "p": p}
    return L


def check_number(rid, k, val, lo, hi):
    """Numeric sliders take numbers; a value outside the slider range still works but would jump when nudged."""
    if isinstance(val, str):
        sys.exit(f"recipe {rid}: '{k}' must be a number (got {val!r})")
    if (lo is not None and val < lo) or (hi is not None and val > hi):
        print(f"warning: {rid}.{k} = {val} is outside the recommended range {lo}..{hi}", file=sys.stderr)
    return val


def cast(s):
    try:
        return int(s)
    except ValueError:
        try:
            return float(s)
        except ValueError:
            return s


def cmd_list(_):
    for r in load():
        print(f"{r['id']:18s} {r['kind']:7s} {r['tier']:20s} loop: {r['loop'][:46]}")
        print(f"{'':18s} means: {', '.join(r['means'][:3])}")


def cmd_show(a):
    r = get(a.id)
    print(json.dumps({k: v for k, v in r.items() if k not in ("file",)}, indent=2, ensure_ascii=False))
    print("\n--- source ---\n" + source(r))


def cmd_layer(a):
    sets = {}
    for kv in a.set or []:
        k, _, v = kv.partition("=")
        sets[k] = cast(v)
    print(json.dumps(make_layer(get(a.id), sets, a.name, a.role, a.blend, a.opacity), indent=2, ensure_ascii=False))


def cmd_gallery(a):
    w, h = (int(x) for x in a.canvas.lower().split("x"))
    ids = a.ids.split(",") if a.ids else [r["id"] for r in load()]
    comps = []
    for rid in ids:
        r = get(rid)
        comps.append({"name": r["title"].upper(), "hypothesis": "GALERIA — " + r["principle"][:90], "layers": [
            {"type": "bg", "name": "CHÃO", "role": "ground for the gallery", "p": {"grain": 0}},
            make_layer(r, name=r["title"].upper(), role="the recipe under test"),
            {"type": "post", "name": "ACABAMENTO", "role": "finish for the gallery", "p": {"scan": 0, "prob": 0}}]})
    P = {"schema": "ai-vj-generator/2", "id": "recipe-gallery", "seed": a.seed,
         "meta": {"name": "GALERIA DE RECEITAS", "brief": "throw-away gallery for looking at recipes"},
         "canvas": {"w": w, "h": h, "fps": 30, "target": "screen"}, "time": {"bpm": 128, "bars": 4},
         "palette": {"bg": "#07080B", "primary": "#E9E4D8", "secondary": "#7B8794", "accent": "#FF5A1F"},
         "compositions": comps}
    Path(a.out).write_text(json.dumps(P, ensure_ascii=False), encoding="utf-8")
    print(f"wrote {a.out}: {len(comps)} compositions at {w}x{h}")


def main():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    s = p.add_subparsers(dest="cmd", required=True)
    s.add_parser("list").set_defaults(f=cmd_list)
    x = s.add_parser("show"); x.add_argument("id"); x.set_defaults(f=cmd_show)
    x = s.add_parser("layer"); x.add_argument("id"); x.add_argument("--set", action="append"); x.add_argument("--name")
    x.add_argument("--role"); x.add_argument("--blend", default="normal"); x.add_argument("--opacity", type=float, default=1.0)
    x.set_defaults(f=cmd_layer)
    x = s.add_parser("gallery"); x.add_argument("--out", required=True); x.add_argument("--canvas", default="1920x1080")
    x.add_argument("--ids"); x.add_argument("--seed", type=int, default=184729); x.set_defaults(f=cmd_gallery)
    a = p.parse_args()
    a.f(a)


if __name__ == "__main__":
    main()
