#!/usr/bin/env python3
"""Audio semantics (phase 10): every layer declares a temporal behavior; only some layers listen to the audio.

  python audio_semantics.py project.json [index]     # prints the declarations the strategy gives composition `index` (default 0), without writing

Behaviors (registry/audio.json): still, drift, beat (do not listen: the audio never reaches the layer) and follow, accent, section (listen to the bands they
declare). The strategy sets the budget of listening layers (none 0, subtle 1, structural 2, rhythmic 3, full 3) and which tier carries which story: the hero
the bass, the structure the mid, a ground field the high, an event mark the hits. Everything else keeps time with the loop and the BPM. The engine honours the
declaration (a layer that does not listen gets no band at all) and the validator checks it. The instrument is the meter and is outside the budget.
Data: registry/audio.json, shared with the browser (app/audio-sem.js); both give the same declarations (scripts/audio_check.mjs).
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import animation_ir as anim_ir  # noqa: E402

with open(os.path.join(HERE, "..", "registry", "audio.json"), encoding="utf-8") as f:
    DATA = json.load(f)
BEHAVIORS = DATA["behaviors"]
DEFAULT_AUDIO = 0.5


def tier_of(L):
    """hero / structure / ground as in the Animation IR, then the other tiers by their role prefix ("event: ...", "information: ...", "finish: ...")."""
    t = L.get("type")
    if t == "bg":
        return "background"
    if t == "instrument":
        return "instrument"
    if t == "post":
        return "finish"
    tier = anim_ir.tier_of(L)
    if tier:
        return tier
    role = str(L.get("role", "")).strip().lower()
    for key in DATA["tiers"]:
        if role.startswith(key):
            return DATA["tiers"][key]
    return None


def reactive(behavior):
    return bool(BEHAVIORS.get(behavior, {}).get("reactive"))


def _reason(behavior, tier):
    R = DATA["reasons"]
    return R.get(f"{behavior}.{tier}") or R.get(behavior) or BEHAVIORS[behavior]["description"]


def declare(layers, strategy="rhythmic", archetype=None):
    """Writes `temporal` ({behavior, listens, reason}) on every layer of one composition and returns the summary for meta.audioSemantics.
    One layer carries each story: a slot of the strategy's plan goes to the first visible layer of its tier. A layer that does not listen loses p.audio;
    a listening layer outside the shader family gets a default p.audio, so the declaration is connected to something."""
    plan = DATA["plan"].get(strategy, DATA["plan"]["rhythmic"])
    slot_of = {}
    for slot in plan:
        for L in layers:
            if L.get("on", True) and id(L) not in slot_of and tier_of(L) == slot["tier"]:
                slot_of[id(L)] = slot
                break
    rows = []
    for L in layers:
        tier = tier_of(L)
        slot = slot_of.get(id(L))
        if tier == "background":
            behavior, listens = DATA["background"], []
        elif tier == "instrument":
            behavior, listens = DATA["instrument"]["behavior"], list(DATA["instrument"]["listens"])
        elif slot:
            acc = slot.get("accent") if archetype in DATA["accentArchetypes"] else None
            behavior = acc or slot["behavior"]
            listens = list(slot["accentListens"] if acc else slot["listens"])
        else:
            behavior, listens = DATA["fallback"].get(tier, "drift"), []
        L["temporal"] = {"behavior": behavior, "listens": listens, "reason": _reason(behavior, tier)}
        p = L.setdefault("p", {})
        if reactive(behavior):
            if L.get("type") not in ("shader", "instrument") and not (isinstance(p.get("audio"), (int, float)) and p["audio"] > 0):
                p["audio"] = DEFAULT_AUDIO
        elif "audio" in p:
            del p["audio"]
        rows.append({"name": L.get("name"), "tier": tier or "other", "behavior": behavior, "listens": listens})
    n = sum(1 for L, r in zip(layers, rows) if reactive(r["behavior"]) and r["tier"] not in DATA["exempt"] and L.get("on", True))
    return {"version": 1, "strategy": strategy, "budget": DATA["budget"].get(strategy, 3), "archetype": archetype, "reactive": n, "layers": rows}


def audit(layers, strategy):
    """Rules of the declaration for one composition: (errors, warnings). Layers with no declaration are legacy projects: the old rule (every shader listens) applies."""
    e, w = [], []
    budget = DATA["budget"].get(strategy, 3)
    n = 0
    for L in layers:
        if not L.get("on", True):
            continue
        tp, nm = L.get("temporal"), L.get("name") or L.get("type")
        if tp is None:
            if L.get("type") != "bg":
                w.append(f"{nm}: no `temporal` declaration; declare still, drift, beat, follow, accent or section (references/audio-semantics.md)")
            continue
        if not isinstance(tp, dict) or tp.get("behavior") not in BEHAVIORS:
            e.append(f"{nm}.temporal.behavior: must be one of {', '.join(BEHAVIORS)}")
            continue
        b, ls = tp["behavior"], tp.get("listens", [])
        if not isinstance(ls, list) or any(c not in DATA["classes"] for c in ls):
            e.append(f"{nm}.temporal.listens: a list of {', '.join(DATA['classes'])}")
            continue
        if not str(tp.get("reason", "")).strip():
            w.append(f"{nm}.temporal.reason: say why the layer behaves like this")
        if reactive(b):
            if not ls:
                e.append(f"{nm}: behavior {b!r} listens to the audio, so `listens` needs at least one of {', '.join(DATA['classes'])}")
            if L.get("type") not in DATA["exempt"]:
                n += 1
        else:
            if ls:
                e.append(f"{nm}: behavior {b!r} does not listen to the audio, but `listens` is {ls}")
            p = L.get("p") or {}
            if isinstance(p.get("audio"), (int, float)) and p["audio"] > 0:
                w.append(f"{nm}.p.audio is {p['audio']} but the layer is {b!r}: the engine closes the gate, so the value is ignored")
            for m in L.get("mod") or []:
                if isinstance(m, dict) and m.get("src") in DATA["sources"]:
                    w.append(f"{nm}.mod: source {m['src']!r} on a {b!r} layer is closed by the gate")
        if reactive(b) and L.get("type") != "shader":
            p = L.get("p") or {}
            wired = isinstance(p.get("audio"), (int, float)) and p["audio"] > 0
            wired = wired or any(isinstance(m, dict) and DATA["sources"].get(m.get("src")) in ls for m in L.get("mod") or [])
            if L.get("type") not in DATA["exempt"] and not wired:
                w.append(f"{nm}: declared {b!r} but nothing connects it to the audio (p.audio is 0 and no band modulation)")
    if n > budget:
        e.append(f"{n} layers listen to the audio but strategy {strategy!r} allows {budget}: the rest keep time with the loop (drift or beat)")
    if n > 3:
        e.append(f"{n} layers listen to the audio: one layer per story (bass, mid, high), at most 3")
    return e, w


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    P = json.load(open(sys.argv[1], encoding="utf-8"))
    i = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    arch = ((P.get("meta") or {}).get("animationIR") or [{}] * (i + 1))[i].get("archetype")
    layers = json.loads(json.dumps(P["compositions"][i]["layers"]))
    print(json.dumps(declare(layers, (P.get("audio") or {}).get("strategy", "rhythmic"), arch), ensure_ascii=False, indent=1))
