#!/usr/bin/env python3
"""Plan the intention and the composition of a piece: the Creative IR and one Composition IR per composition.

  python plan_ir.py brief.json                       # prints both IRs as JSON (read them, then choose generators)
  python plan_ir.py brief.json --apply project.json  # writes meta.creativeIR and meta.compositionIR into the project and, when the
                                                     # Creative IR drives, places its layers (hero, structure, instrument, text) by it

IR = Intermediate Representation: a structured plan that sits between the briefing (words) and the generators (code). Instead of jumping from
"cold, contemplative" to an effect, the piece is described first (concept, visual verbs, where things go, how they move) and the generators are
chosen to carry that plan. See references/creative-ir.md and references/composition-ir.md.

For `--apply` the layers must say their tier: a layer whose `role` starts with "hero:" is the hero, one that starts with "structure:" is the
structure (or the names start with HERÓI / ESTRUTURA). Instrument and typeset layers are found by their type. The number of compositions is the
one in the project; the brief gives the concept, mood and surface.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import creative_ir as cir  # noqa: E402
import composition_ir as comp_ir  # noqa: E402


def plan(brief, n):
    ir = cir.compile_ir(brief)
    return ir, [comp_ir.compile_composition(brief, ir, i) for i in range(n)]


def main():
    args = sys.argv[1:]
    if not args or args[0].startswith("-"):
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    brief = json.load(open(args[0], encoding="utf-8"))
    if "surface" not in brief:
        sys.exit("the brief needs `surface` ({w, h}) so the composition can be planned")
    target = args[args.index("--apply") + 1] if "--apply" in args else None
    if not target:
        n = int(brief.get("compositions", 3))
        ir, cs = plan(brief, n)
        print(json.dumps({"creativeIR": ir, "compositionIR": cs}, ensure_ascii=False, indent=1))
        return
    proj = json.load(open(target, encoding="utf-8"))
    comps = proj.get("compositions") or []
    ir, cs = plan(brief, len(comps))
    ir["colorLogic"] = ir.get("colorLogic") or "one accent used for events only"
    proj.setdefault("meta", {})
    proj["meta"]["creativeIR"] = ir
    proj["meta"]["compositionIR"] = cs
    placed = 0
    if ir["drives"]:
        W, H = proj["canvas"]["w"], proj["canvas"]["h"]
        for c, ci in zip(comps, cs):
            comp_ir.apply_composition(c["layers"], ci, W, H)
            placed += 1
    with open(target, "w", encoding="utf-8", newline="\n") as f:
        json.dump(proj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {target}: concept {ir['concept']}, verbs {', '.join(ir['visualVerbs']) or 'none'}, grammars {', '.join(c['grammar'] for c in cs)}; "
          + (f"{placed} composition(s) placed by the plan" if ir["drives"] else "the plan does not drive (no recognised concept or verbs): recorded only, nothing moved"))
    if not ir["drives"]:
        print("tip: add `verbs` to the brief (registry/creative.json lists the 32) or use the words of the concept lexicon, then run again")


if __name__ == "__main__":
    main()
