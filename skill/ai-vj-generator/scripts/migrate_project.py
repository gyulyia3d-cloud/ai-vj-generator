#!/usr/bin/env python3
"""Project migration (phase 19): brings an older project up to the current FORMAT.

  python migrate_project.py project.json                # prints what would change (no write)
  python migrate_project.py project.json --out new.json # writes the migrated project
  python migrate_project.py project.json --in-place     # overwrites the file

A project keeps the version of its FORMAT in meta.formatVersion (absent = 0, a project from before the pipeline). The steps are declarative (registry/versions.json, `steps`, in order)
and run on a COPY: the input is never touched. Each step is idempotent. A project whose format is NEWER than this tool's is not refused or rewritten: it opens with a warning,
because unknown fields are ignored, never deleted. Rule for later phases: an additive change (a new field with a default) needs no step; a change that renames, moves or removes
a field adds a step to versions.json and raises format.current.
The browser engine runs the same steps (app/migrate.js); both give the same result and the same report (scripts/migrate_check.mjs). Docs: references/migration.md.
"""
import copy, json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "registry", "versions.json"), encoding="utf-8") as f:
    DATA = json.load(f)
KEY = DATA["format"]["key"].split(".")
CUR = DATA["format"]["current"]


def get_ver(o):
    v = o
    for k in KEY:
        v = v.get(k) if isinstance(v, dict) else None
    return v if isinstance(v, int) and not isinstance(v, bool) and v >= 0 else DATA["format"]["unversioned"]


def set_ver(o, n):
    if not isinstance(o.get("meta"), dict):
        o["meta"] = {}
    o["meta"][KEY[-1]] = n


def rename_capability(o, step, note):
    cap = o.get("capabilities")
    if not isinstance(cap, dict):
        return
    for frm, to in step["map"].items():
        if frm not in cap:
            continue
        items = cap[frm] if isinstance(cap[frm], list) else []
        dest = cap[to] if isinstance(cap.get(to), list) else []
        for it in items:
            if it not in dest:
                dest.append(it)
        cap[to] = dest
        del cap[frm]
        note(f"capabilities.{frm} -> capabilities.{to}")


def remap_archetype(o, step, note):
    meta = o.get("meta")
    spec = meta.get("spec") if isinstance(meta, dict) else None
    if not isinstance(spec, dict) or "archetype" not in spec:
        return
    was = spec["archetype"] if isinstance(spec["archetype"], list) else [spec["archetype"]]
    out = []
    for a in was:
        if isinstance(a, str) and a in step["map"]:
            tgt = step["map"][a]
            note(f"meta.spec.archetype {a} -> {'(removido)' if tgt is None else tgt}")
            if tgt is not None and tgt not in out:
                out.append(tgt)
        elif a not in out:
            out.append(a)
    if out == was:
        return
    if not out:
        del spec["archetype"]
    else:
        spec["archetype"] = out if isinstance(spec["archetype"], list) else out[0]


OPS = {"renameCapability": rename_capability, "remapArchetype": remap_archetype}


def migrate(project):
    """-> {project, from, to, applied: [{id, changes}], newer}"""
    o = copy.deepcopy(project)
    frm = get_ver(o)
    applied = []
    if frm > CUR:
        return {"project": o, "from": frm, "to": frm, "applied": applied, "newer": True}
    for step in DATA["steps"]:
        if step["to"] <= frm:
            continue
        changes = []
        OPS[step["op"]](o, step, changes.append)
        applied.append({"id": step["id"], "changes": changes})
    set_ver(o, CUR)
    return {"project": o, "from": frm, "to": CUR, "applied": applied, "newer": False}


def describe(r):
    if r["newer"]:
        return [f"o projeto é do formato {r['from']}, mais novo que o deste motor ({CUR}): abre sem mudança, campos desconhecidos são ignorados"]
    return [f"migrado ({a['id']}): {'; '.join(a['changes'])}" for a in r["applied"] if a["changes"]]


def main(argv):
    if not argv or argv[0].startswith("-"):
        print(__doc__)
        return 2
    path = argv[0]
    with open(path, encoding="utf-8") as f:
        project = json.load(f)
    r = migrate(project)
    for line in describe(r) or ["nada a migrar" if r["from"] == CUR else f"formato {r['from']} -> {r['to']}, sem mudança de campos"]:
        print(line)
    out = argv[argv.index("--out") + 1] if "--out" in argv else (path if "--in-place" in argv else None)
    if out and not r["newer"]:
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            json.dump(r["project"], f, ensure_ascii=False, indent=1)
            f.write("\n")
        print("escrito:", out)
    return 0


if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.exit(main(sys.argv[1:]))
