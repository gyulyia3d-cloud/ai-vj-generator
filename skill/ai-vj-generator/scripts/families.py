#!/usr/bin/env python3
"""Families of generators, recipes and GLSL modules (references/families.json).

  python families.py check                         the manifest matches the engine: nothing missing, nothing unknown
  python families.py list [--family F] [--surface S] [--cost low|medium|high] [--maturity stable|beta|experimental]
  python families.py sync-cost                     copy the measured cost classes (references/families-cost.json, from layer_cost.mjs) into the manifest
  python families.py markdown [--write]            print (or write) references/families.md

Use `list --surface led --cost low` to pick what suits a wall; the generator and the AI both read the same manifest.
"""
import json, re, sys
from pathlib import Path

sys.stdout.reconfigure(encoding="utf-8")
HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
REF = HERE.parent / "references"
SECTIONS = (("generators", "Generators (layer types)"), ("recipes", "Recipes"), ("glslModules", "GLSL modules"))


def load():
    return json.loads((REF / "families.json").read_text(encoding="utf-8"))


def actual():
    import validate_project
    reg = validate_project.load_registry()[0]
    recipes = [r["id"] for r in json.loads((REF / "recipes" / "manifest.json").read_text(encoding="utf-8"))["recipes"]]
    mods = re.findall(r"^//@module ([\w.]+)", (REF / "glsl-lib" / "lib.glsl").read_text(encoding="utf-8"), re.M)
    return {"generators": sorted(reg), "recipes": sorted(recipes), "glslModules": sorted(mods)}


def cost_class(ms):
    return "low" if ms < 8 else "medium" if ms < 20 else "high"


def measured():
    p = REF / "families-cost.json"
    if not p.exists():
        return {}
    return {k: cost_class(v["ms"]) for k, v in json.loads(p.read_text(encoding="utf-8"))["ms"].items()}


def sync_cost():
    m, n = load(), 0
    for k, c in measured().items():
        if k in m["generators"] and m["generators"][k]["cost"] != c:
            m["generators"][k]["cost"] = c
            n += 1
    (REF / "families.json").write_text(json.dumps(m, ensure_ascii=False, indent=1) + "\n", encoding="utf-8", newline="\n")
    print(f"{n} cost class(es) updated from the measurement")


def check():
    m, a, bad = load(), actual(), []
    for sec, _ in SECTIONS:
        have, want = set(m[sec]), set(a[sec])
        bad += [f"{sec}: '{x}' exists in the engine but has no family" for x in sorted(want - have)]
        bad += [f"{sec}: '{x}' is in the manifest but not in the engine" for x in sorted(have - want)]
        for k, v in m[sec].items():
            if v["family"] not in m["families"]:
                bad.append(f"{sec}.{k}: unknown family '{v['family']}'")
            if v["cost"] not in ("low", "medium", "high", "unmeasured"):
                bad.append(f"{sec}.{k}: cost must be low, medium, high or unmeasured")
            if v["maturity"] not in ("stable", "beta", "experimental"):
                bad.append(f"{sec}.{k}: maturity must be stable, beta or experimental")
            if not v["surfaces"]:
                bad.append(f"{sec}.{k}: no surfaces")
    for k, c in measured().items():
        if k in m["generators"] and m["generators"][k]["cost"] != c:
            bad.append(f"generators.{k}: cost is '{m['generators'][k]['cost']}' but layer_cost.mjs measured '{c}' (run: python families.py sync-cost)")
    if bad:
        print("\n".join(bad))
        sys.exit(1)
    print(f"ok: {sum(len(m[s]) for s, _ in SECTIONS)} items in {len(m['families'])} families match the engine")


def items(m):
    for sec, _ in SECTIONS:
        for k, v in m[sec].items():
            yield sec, k, v


def lst(args):
    m, opt = load(), {a[2:]: args[i + 1] for i, a in enumerate(args) if a.startswith("--") and i + 1 < len(args)}
    for sec, k, v in items(m):
        if opt.get("family") and v["family"] != opt["family"]:
            continue
        if opt.get("surface") and opt["surface"] not in v["surfaces"]:
            continue
        if opt.get("cost") and v["cost"] != opt["cost"]:
            continue
        if opt.get("maturity") and v["maturity"] != opt["maturity"]:
            continue
        print(f"{v['family']:12s} {k:16s} {v['cost']:6s} {v['maturity']:7s} {v['role']}")


def markdown():
    m = load()
    L = ["# Families", "", "Generated from `families.json` by `python scripts/families.py markdown --write`. " + m["note"], ""]
    kind = {"generators": "generator", "recipes": "recipe", "glslModules": "GLSL"}
    for fam, desc in m["families"].items():
        rows = [(sec, k, v) for sec, k, v in items(m) if v["family"] == fam]
        if not rows:
            continue
        L += [f"## {fam}", "", desc + ".", "", "| Item | Kind | What it is | Surfaces | Cost | Maturity | Note |", "|---|---|---|---|---|---|---|"]
        for sec, k, v in rows:
            L.append(f"| `{k}` | {kind[sec]} | {v['role']} | {', '.join(v['surfaces']) if len(v['surfaces']) < 5 else 'any'} | {v['cost']} | {v['maturity']} | {v['note']} |")
        L.append("")
    return "\n".join(L)


def main():
    a = sys.argv[1:]
    if not a or a[0] not in ("check", "list", "markdown", "sync-cost"):
        print(__doc__)
        sys.exit(2)
    if a[0] == "check":
        check()
    elif a[0] == "sync-cost":
        sync_cost()
    elif a[0] == "list":
        lst(a[1:])
    else:
        md = markdown()
        if "--write" in a:
            (REF / "families.md").write_text(md, encoding="utf-8", newline="\n")
            print("wrote references/families.md")
        else:
            print(md)


if __name__ == "__main__":
    main()
