#!/usr/bin/env python3
"""Creative IR (phase 5): the compiler from intention to a structured plan, before any generator is chosen.

  python creative_ir.py brief.json        # prints the Creative IR of a brief

brief -> requirements -> concept -> visual verbs -> motifs -> composition and animation strategy -> generator families -> parameter ranges.
The data (32 verbs, 16 concepts, mood weights, arcs) is registry/creative.json, shared with the browser (app/creative.js); both give the same IR
(scripts/creative_check.mjs). Concept weighs three times more than mood: a mood alone never drives the choice of generators.
"""
import json, os, re, sys, unicodedata

HERE = os.path.dirname(os.path.abspath(__file__))
with open(os.path.join(HERE, "..", "registry", "creative.json"), encoding="utf-8") as f:
    DATA = json.load(f)
VERBS = {v["id"]: v for v in DATA["verbs"]}
VERB_ORDER = {v["id"]: i for i, v in enumerate(DATA["verbs"])}
W = DATA["weights"]


def py_round(x, nd=0):
    return round(x, nd) if nd else int(round(x))


def norm(s):
    return "".join(c for c in unicodedata.normalize("NFD", str(s).lower()) if not unicodedata.combining(c))


def tokens(s):
    return [t for t in re.split(r"[^a-z0-9]+", norm(s)) if t]


def _rank(scores, order):
    """highest score first; ties by the fixed order of the data file"""
    return [k for k in sorted(scores, key=lambda k: (-scores[k], order.index(k))) if scores[k] > 0]


def _pad(picked, order, n):
    out = list(picked[:n])
    for k in order:
        if len(out) >= n:
            break
        if k not in out:
            out.append(k)
    return out


def compile_ir(brief):
    text = str(brief.get("concept", "")) + " " + (brief["focalEvent"] if isinstance(brief.get("focalEvent"), str) else "")
    toks = tokens(text)
    matched = []
    for c in DATA["concepts"]:
        hits = sum(1 for stem in c["stems"] if any(t.startswith(stem) for t in toks))
        if hits:
            matched.append((c, min(3, hits)))
    explicit = []
    for v in brief.get("verbs") or []:
        if v in VERBS and v not in explicit:
            explicit.append(v)
    scores = {}
    for c, s in matched:
        for v, w in c["verbs"].items():
            scores[v] = scores.get(v, 0) + s * w * W["concept"]
    for v in explicit:
        scores[v] = scores.get(v, 0) + W["explicitVerb"]
    for m in (brief.get("mood") or [])[:3]:
        for v, w in DATA["moods"].get(m, {}).items():
            scores[v] = scores.get(v, 0) + w
    drives = bool(matched or explicit)
    order = list(VERB_ORDER)
    top = _rank(scores, order)[: W["topVerbs"]]
    total = sum(scores[v] for v in top)
    concept = None
    if matched:
        concept = sorted(matched, key=lambda cs: (-cs[1], [c["id"] for c in DATA["concepts"]].index(cs[0]["id"])))[0][0]["id"]

    def mean(f):
        acc = 0  # plain left-to-right sum: Python 3.12+ sum() compensates floats, the browser does not, and the two must agree to the last bit
        for v in top:
            acc += scores[v] * f(VERBS[v])
        return acc / total

    ir = {"version": 1, "drives": drives, "concept": concept, "concepts": [c["id"] for c, s in matched], "visualVerbs": top, "verbScores": {v: scores[v] for v in top}}
    fam = {t: sum(scores[v] * VERBS[v]["families"].get(t, 0) for v in top) for t in DATA["heroTypes"]}
    shd = {p: sum(scores[v] * (len(VERBS[v]["shaders"]) - VERBS[v]["shaders"].index(p)) for v in top if p in VERBS[v]["shaders"]) for p in DATA["shaderOrder"]}
    stc = {t: sum(scores[v] * (len(VERBS[v]["structure"]) - VERBS[v]["structure"].index(t)) for v in top if t in VERBS[v]["structure"]) for t in DATA["structureOrder"]}
    ir["hierarchy"] = {"hero": _pad(_rank(fam, DATA["heroTypes"]), DATA["heroTypes"], 3), "structure": _pad(_rank(stc, DATA["structureOrder"]), DATA["structureOrder"], 2),
                       "ground": _pad(_rank(shd, DATA["shaderOrder"]), DATA["shaderOrder"], 3)}
    if top:
        ir["visualMotifs"] = [m for i, m in enumerate(VERBS[v]["motif"] for v in top) if m not in [VERBS[x]["motif"] for x in top[:i]]]
        axes = {k: py_round(mean(lambda v, k=k: v["axes"][k]), 3) for k in ("energy", "elasticity", "anticipation", "continuity", "rhythm")}
        ir["motion"] = {"axes": axes}
        ir["density"] = py_round(mean(lambda v: v["density"]), 2)
        ir["rhythm"] = axes["rhythm"]
        tally = {}
        for v in top:
            tally[VERBS[v]["scale"]] = tally.get(VERBS[v]["scale"], 0) + scores[v]
        ir["scale"] = sorted(tally, key=lambda k: (-tally[k], ["large", "medium", "small"].index(k)))[0]
        arc = DATA["arcs"][VERBS[top[0]]["arc"]]
        ir["arc"] = {"id": VERBS[top[0]]["arc"], "sequence": list(arc["sequence"]), "energy": list(arc["energy"]), "description": arc["description"]}
        two = top[:2]
        ir["spatialBehavior"] = "; ".join(VERBS[v]["spatial"] for v in two)
        ir["temporalBehavior"] = arc["description"] + "; " + VERBS[top[0]]["temporal"]
        ir["materialBehavior"] = "; ".join(VERBS[v]["material"] for v in two)
        ir["audioRole"] = VERBS[top[0]]["audio"]
        ir["compositionStrategy"] = "; ".join(VERBS[v]["composition"] for v in two)
        ir["animationStrategy"] = "; ".join(VERBS[v]["motion"] + " (" + VERBS[v]["transition"] + ")" for v in two)
    else:
        ir.update(visualMotifs=[], motion={"axes": {"energy": 0.5, "elasticity": 0.3, "anticipation": 0.3, "continuity": 0.8, "rhythm": 0.3}}, density=1.0, rhythm=0.3, scale="medium",
                  arc={"id": None, "sequence": ["ESTABLISH", "BUILD", "PEAK", "RELEASE", "TURN", "CODA"], "energy": [0.4, 0.7, 1.0, 0.5, 0.8, 0.3], "description": "establish, build, peak, release"},
                  spatialBehavior="", temporalBehavior="", materialBehavior="", audioRole="", compositionStrategy="", animationStrategy="")
    ir["audienceEffect"] = str(brief.get("audienceEffect") or str(brief.get("concept", "")).strip()[:140])
    ir["semioticIntent"] = f"{concept or 'mood'}: " + " + ".join(top)
    banned = brief.get("banned") or []
    ir["forbiddenMotifs"] = list(banned) if isinstance(banned, list) else [str(banned)]
    ir["novelty"] = None
    ir["colorLogic"] = ""
    return ir


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    print(json.dumps(compile_ir(json.load(open(sys.argv[1], encoding="utf-8"))), ensure_ascii=False, indent=1))
