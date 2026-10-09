#!/usr/bin/env python3
"""Animation IR (phase 7): how things move. The behaviour of each layer over the loop, in musical time.

  python animation_ir.py brief.json [index]     # prints the Animation IR of composition `index` (default 0)

It reads the Creative IR (verbs and the five motion axes), the Composition IR (the five phases and the movement axis) and the clock (bpm, bars, fps).
Data: registry/animation.json, shared with the browser (app/animation.js); both give the same IR (scripts/animation_check.mjs).
The IR chooses one of eight motion archetypes (pulse, breathe, glide, surge, stutter, orbit, ripple, settle) and says, per tier, who leads, who follows
and how late (lags in sixteenth notes of the loop), the easing, the anticipation and the settle in frames, when the five events land on the beat grid
and how phases change. It is applied to the layers as `layer.mod` curves and `p.phase` lags, always in whole cycles, so the loop closes.
The generator, the composition and the animation are independent: changing the archetype changes how the same figures in the same places move.
"""
import json, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import motion_profiles as mp  # noqa: E402
import composition_ir as comp_ir  # noqa: E402

with open(os.path.join(HERE, "..", "registry", "animation.json"), encoding="utf-8") as f:
    DATA = json.load(f)
ARCH = DATA["archetypes"]
r2 = lambda x: round(x, 2)
r3 = lambda x: round(x, 3)
r4 = lambda x: round(x, 4)
AXES = ("energy", "elasticity", "anticipation", "continuity", "rhythm")


def rank_archetypes(ir, axes, forced=None):
    """The verbs vote (as a share of their total weight); with no verbs the axes pick one. A forced archetype (brief.motionArchetype) takes the first slot."""
    order = DATA["archetypeOrder"]
    acc = {a: 0 for a in order}
    total = sum(ir["verbScores"][v] for v in ir.get("visualVerbs", []))
    for v in ir.get("visualVerbs", []):
        for a, w in DATA["verbArchetypes"].get(v, {}).items():
            acc[a] += ir["verbScores"][v] * w
    scores = {a: (DATA["weights"]["verb"] * acc[a] / total if total else 0) for a in order}
    ranked = [a for a in sorted(scores, key=lambda a: (-scores[a], order.index(a))) if scores[a] > 0]
    if not ranked:
        fb = DATA["fallback"]
        ranked = [fb["stepped"] if axes["continuity"] < 0.5 else fb["springy"] if axes["elasticity"] >= 0.3 else fb["smooth"]]
    if forced in ARCH:
        ranked = [forced] + [a for a in ranked if a != forced]
    return ranked


def cycles_of(rule, prof, bars):
    return prof["cycles"] if rule == "profile" else 1 if rule == "one" else int(bars) if rule == "bar" else max(1, int(bars) // 2)


def adjust(prof, a, cycles):
    """The spring numbers of the profile, bent by the archetype: stutter forces steps and no ring, settle forces a damped landing."""
    zeta = max(prof["zeta"], a["zetaMin"])
    steps = a["steps"] or prof["steps"]
    return {"zeta": zeta, "wn": prof["wn"], "ta": r4(prof["ta"] * a["taMul"]), "depth": r4(prof["depth"] * a["taMul"]), "steps": steps, "cycles": cycles}


def compile_animation(brief, ir, cmp, i, axes=None):
    tm = brief.get("time") or {}
    bpm, bars = tm.get("bpm", 120), tm.get("bars", 4)
    fps = (brief.get("surface") or {}).get("fps", 30)
    ax = dict(axes or ir["motion"]["axes"])
    prof = mp.profile(ax["energy"], ax["elasticity"], ax["anticipation"], ax["continuity"], ax["rhythm"], bars)
    top = rank_archetypes(ir, ax, brief.get("motionArchetype"))[: DATA["weights"]["setSize"]]
    aid = top[i % len(top)]
    a = ARCH[aid]
    cyc = cycles_of(a["cycles"], prof, bars)
    sp = adjust(prof, a, cyc)
    amp = max(DATA["weights"]["ampFloor"], r4(prof["amp"] * a["ampMul"]))
    sp["amp"] = amp
    sp["overshoot"] = mp.overshoot(sp["zeta"])
    loop_frames = int(round(bars * 240 * fps / bpm))
    sixteenths = bars * 16
    fpc = r2(loop_frames / cyc)
    settle = r3(min(1.0, 4 / (sp["zeta"] * sp["wn"])))
    lag = lambda steps: {"steps": steps, "lag": r4(steps / sixteenths), "frames": r2(steps * loop_frames / sixteenths)}
    soft = mp.profile(ax["energy"] * 0.7, ax["elasticity"] * 0.5, 0, ax["continuity"], ax["rhythm"], 1)
    ssp = adjust(soft, a, cyc)
    h_struct = {"behavior": a["structure"], "shape": a["shape"], "cycles": cyc, "drive": "rot" if a["structure"] == "counter" else a["drive"], "amp": r4(amp * 0.5),
                "spring": {"zeta": ssp["zeta"], "wn": ssp["wn"], "ta": 0, "depth": 0, "steps": ssp["steps"]}, "lag": lag(a["lag"]["structure"] if a["structure"] != "counter" else 0)}
    phases = cmp["temporal"]["phases"]
    choreo = [{"name": ph["name"], "at": ph["at"], "lead": a["phaseLead"][k], "energy": ph["motion"], "transition": a["transition"]} for k, ph in enumerate(phases)]
    events = []
    for ev in DATA["events"]:
        beat = int(round(ev["phase"] / 5 * bars * 4))  # snapped to the beat grid
        events.append({"name": ev["name"], "phase": phases[ev["phase"]]["name"], "beat": beat, "at": r4(beat / (bars * 4))})
    return {
        "version": 1, "archetype": aid, "archetypeSet": top, "axes": {k: ax[k] for k in AXES},
        "timing": {"bpm": bpm, "bars": bars, "fps": fps, "loopFrames": loop_frames, "cyclesPerLoop": cyc, "framesPerCycle": fpc, "beatsPerCycle": r3(bars * 4 / cyc), "sixteenthFrames": r2(loop_frames / sixteenths)},
        "easing": {"id": a["easing"], "description": DATA["easings"][a["easing"]]},
        "spring": sp,
        "anticipation": {"fraction": sp["ta"], "frames": r2(sp["ta"] * fpc)},
        "settle": {"fraction": settle, "frames": r2(settle * fpc)},
        "hold": a["hold"],
        "hierarchy": {
            "hero": {"behavior": "lead", "shape": a["shape"], "cycles": cyc, "drive": a["drive"], "amp": amp, "spring": {k: sp[k] for k in ("zeta", "wn", "ta", "depth", "steps")}, "lag": lag(0)},
            "structure": h_struct,
            "ground": {"behavior": a["ground"], "lag": lag(a["lag"]["ground"])},
            "instrument": {"behavior": "accent"},
            "text": {"behavior": "reveal"},
        },
        "choreography": choreo, "events": events,
        "transitions": {"phases": a["transition"], "description": DATA["transitions"][a["transition"]]},
        "loop": {"closes": True, "wholeCycles": True, "seamless": True},
        "description": a["description"],
    }


def tier_of(L):
    """hero and structure as in the Composition IR; ground = the shader fields (name CAMPO / ATMOSFERA, or a role that starts with ground / atmosphere)."""
    t = comp_ir.tier_of(L)
    if t:
        return t
    nm, role = str(L.get("name", "")).upper(), str(L.get("role", "")).strip().lower()
    if L.get("type") in DATA["groundTypes"] and (nm.startswith("CAMPO") or nm.startswith("ATMOSFERA") or role.startswith("ground") or role.startswith("atmosphere")):
        return "ground"
    return None


def make_mod(key, spec, rot_sign=1):
    """One `layer.mod` entry: the archetype's curve on parameter `key`. Rotation sweeps a whole turn per cycle (mode add); everything else scales the parameter (mode mul)."""
    mode = "add" if key == "rot" else "mul"
    lo, hi = (0, 360 * rot_sign) if key == "rot" else (1.0, r4(1.0 + spec["amp"]))
    if spec["shape"] == "spring":
        sp = spec["spring"]
        m = dict(k=key, src="lfo", shape="spring", cycles=spec["cycles"], zeta=sp["zeta"], wn=sp["wn"], min=lo, max=hi, mode=mode)
        if sp["ta"]:
            m.update(ta=sp["ta"], depth=sp["depth"])
        if sp["steps"]:
            m["steps"] = sp["steps"]
        return m
    return dict(k=key, src="lfo", shape=spec["shape"], cycles=spec["cycles"], min=lo, max=hi, mode=mode)


def _own(m, keys):
    return m.get("src") == "lfo" and m.get("shape") != "env" and m.get("k") is not None and m.get("k") in keys


def apply_animation(layers, an):
    """Plays the Animation IR on the layers of one composition. Hero: the archetype's curve on its target (or on rotation). Structure: follows (softer, late),
    counters (the other way) or holds. Ground: lags. Only the lfo curves on the driven keys are replaced; `env` phases and audio modulation stay."""
    H = an["hierarchy"]
    hero_type = None
    for L in layers:
        if tier_of(L) == "hero":
            hero_type = L["type"]
            break
    for L in layers:
        t, tier = L["type"], tier_of(L)
        if tier not in ("hero", "structure", "ground"):
            continue
        p = L.setdefault("p", {})
        if tier == "ground":
            if H["ground"]["lag"]["lag"] > 0:
                p["phase"] = H["ground"]["lag"]["lag"]
            continue
        mods = L.setdefault("mod", [])
        spec = H[tier]
        tgt = (DATA["heroTarget"] if tier == "hero" else DATA["structTarget"]).get(t)
        key = "rot" if spec["drive"] == "rot" else tgt
        mods[:] = [m for m in mods if not _own(m, {tgt, "rot"})]  # replace our own lfo curves; applying twice must not stack them
        if tier == "structure" and spec["behavior"] in ("hold",):
            continue
        if tier == "structure" and spec["behavior"] == "follow" and t == hero_type:
            continue  # the same generator as the hero: one move is enough
        if key is None:
            continue
        if key == "rot":
            p.setdefault("rot", 0)
        elif key not in p:
            p[key] = DATA["shapeSizeDefault"] if (t == "shape" and key == "size") else DATA["targetDefault"][key]
        mods.append(make_mod(key, spec, -1 if spec["behavior"] == "counter" else 1))
        if tier == "structure" and spec["lag"]["lag"] > 0:
            p["phase"] = spec["lag"]["lag"]
    return layers


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    import creative_ir as cir  # noqa: E402
    b = json.load(open(sys.argv[1], encoding="utf-8"))
    ir = cir.compile_ir(b)
    i = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    print(json.dumps(compile_animation(b, ir, comp_ir.compile_composition(b, ir, i), i), ensure_ascii=False, indent=1))
