#!/usr/bin/env python3
"""Turn a structured brief into a complete project JSON with NO AI: rules, colour theory and the engine's own generators.

  python brief_to_project.py brief.json [--out project.aivj.json]

Same brief + same seed = same project. The result passes validate_project.py and opens in the engine; edit it by hand
or hand it to any AI to refine (the contract fields are filled so an AI can continue from them).
What it decides, and from what:
  hue / scheme   brief.palette (exact colours or hue) > mood table. The palette comes from scripts/palette.py (OKLCH).
  layers         6-7 named layers per composition in tiers: ground, hero, structure, instrument, information, event, finish.
                 Generators come from the mood table; each composition rotates the choices, so a set is varied, not repeated.
  motion         a motion profile (energy, elasticity, anticipation, continuity, rhythm; scripts/motion_profiles.py) is played on the hero
                 and, with follow-through, on the structure as a layer.mod 'spring' curve. Mood picks the profile, the brief can override it.
  art bible      meta.artBible: thesis, material, space, motion, dramaturgy, color, typography, audio, banned (references/art-bible.md).
  audio          audio.strategy scales how much the music drives the picture (none ... full).
Names of compositions are placeholders (MOOD + roman numeral): rename them for the piece.
"""
import json, os, random, subprocess, sys, zlib

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import schema_check  # noqa: E402
import motion_profiles as mp  # noqa: E402

# mood -> hue, scheme, motion, hero generators (type, params), shader presets, structure, whether a data/HUD tier suits
MOODS = {
    "industrial": dict(hue=250, scheme="analogous", motion="step", info=True, why="cold steel and signal blue",
        hero=[("tunnel", {"shape": "rect", "count": 14, "cycles": 1}), ("lines", {"dir": "v", "count": 36, "weight": 3, "stepped": True}), ("bitfield", {"form": 5, "cell": 18, "levels": 2})],
        shader=["GRADE SDF", "FAIXAS", "INTERFERÊNCIA"], structure=[("structure", {"grid": 120}), ("lines", {"dir": "h", "count": 18, "weight": 2})]),
    "organic": dict(hue=145, scheme="analogous", motion="smooth", info=False, why="living green, soft growth",
        hero=[("organism", {"size": 1.1, "points": 2400}), ("sim", {"kind": "reaction", "feed": 0.037, "kill": 0.06}), ("flow", {"count": 900, "trail": 10})],
        shader=["CAMPO FBM", "FLUXO WARP", "CÉLULAS"], structure=[("shape", {"kind": "ring", "layout": "radial", "count": 12, "size": 90, "spread": 300}), ("lines", {"dir": "d", "count": 20, "weight": 1.5})]),
    "cosmic": dict(hue=290, scheme="split", motion="smooth", info=True, why="deep violet and a cold accent",
        hero=[("organism", {"size": 1.3, "points": 3600, "dot": 0.8}), ("sim", {"kind": "ink", "dissipate": 0.998}), ("flow", {"count": 1400, "trail": 14, "amp": 0.2})],
        shader=["KALEIDO", "CAMPO FBM", "ANÉIS SDF"], structure=[("tunnel", {"shape": "circle", "count": 10, "cycles": 1}), ("shape", {"kind": "circle", "layout": "radial", "count": 24, "size": 14, "spread": 380})]),
    "urban": dict(hue=60, scheme="complement", motion="step", info=True, why="sodium yellow against dark asphalt",
        hero=[("typewall", {"rows": 3, "weight": 800}), ("lines", {"dir": "h", "count": 22, "weight": 8, "stepped": True}), ("tunnel", {"shape": "rect", "count": 9})],
        shader=["FAIXAS", "GRADE SDF", "CÉLULAS"], structure=[("structure", {"grid": 90}), ("lines", {"dir": "v", "count": 14, "weight": 4})]),
    "ritual": dict(hue=25, scheme="mono", motion="smooth", info=False, why="ember and bone, a single warm family",
        hero=[("tunnel", {"shape": "circle", "count": 12, "cycles": 1, "weight": 4}), ("organism", {"size": 1.0}), ("shape", {"kind": "ring", "layout": "radial", "count": 8, "size": 150, "spread": 260})],
        shader=["ANÉIS SDF", "KALEIDO", "CAMPO FBM"], structure=[("shape", {"kind": "hex", "layout": "radial", "count": 6, "size": 120, "spread": 330}), ("lines", {"dir": "d", "count": 16, "weight": 2})]),
    "glitch": dict(hue=330, scheme="triad", motion="step", info=True, why="magenta fault lines on black",
        hero=[("bitfield", {"form": 3, "cell": 12, "levels": 4}), ("lines", {"dir": "v", "count": 60, "weight": 2, "stepped": True}), ("typewall", {"rows": 2, "weight": 900})],
        shader=["FAIXAS", "INTERFERÊNCIA", "GRADE SDF"], structure=[("structure", {"grid": 60}), ("shape", {"kind": "square", "layout": "grid", "count": 48, "size": 30, "spread": 520})]),
    "minimal": dict(hue=230, scheme="mono", motion="smooth", info=False, why="one cool hue, large quiet fields",
        hero=[("shape", {"kind": "circle", "layout": "single", "size": 220}), ("lines", {"dir": "h", "count": 8, "weight": 2}), ("tunnel", {"shape": "circle", "count": 5, "weight": 10})],
        shader=["CAMPO FBM", "FAIXAS", "ANÉIS SDF"], structure=[("lines", {"dir": "v", "count": 5, "weight": 1.5}), ("shape", {"kind": "line", "layout": "linear", "count": 3, "size": 400})]),
    "liquid": dict(hue=205, scheme="analogous", motion="smooth", info=False, why="water cyan sliding into deep blue",
        hero=[("sim", {"kind": "ink", "flow": 1.4}), ("flow", {"count": 1100, "trail": 18, "amp": 0.16}), ("organism", {"size": 0.9, "breathe": 0.9})],
        shader=["FLUXO WARP", "CAMPO FBM", "INTERFERÊNCIA"], structure=[("lines", {"dir": "d", "count": 14, "weight": 2}), ("shape", {"kind": "ring", "layout": "radial", "count": 7, "size": 110, "spread": 280})]),
    "crystalline": dict(hue=190, scheme="split", motion="step", info=True, why="ice cyan, hard facets",
        hero=[("tunnel", {"shape": "hex", "count": 12}), ("bitfield", {"form": 6, "cell": 16}), ("lines", {"dir": "d", "count": 30, "weight": 2})],
        shader=["CÉLULAS", "KALEIDO", "GRADE SDF"], structure=[("structure", {"grid": 100, "spiral": False}), ("shape", {"kind": "triangle", "layout": "radial", "count": 9, "size": 100, "spread": 340})]),
    "retro": dict(hue=140, scheme="mono", motion="step", info=True, why="phosphor green, scanline texture",
        hero=[("data", {"rows": 40}), ("lines", {"dir": "h", "count": 40, "weight": 2, "stepped": True}), ("bitfield", {"form": 1, "cell": 10})],
        shader=["INTERFERÊNCIA", "FAIXAS", "GRADE SDF"], structure=[("structure", {"grid": 80}), ("hud", {})]),
    "aggressive": dict(hue=28, scheme="complement", motion="step", info=True, why="alarm orange against cold black",
        hero=[("typewall", {"rows": 2, "weight": 900, "outline": "alt"}), ("tunnel", {"shape": "rect", "count": 16, "pulseAmt": 2}), ("lines", {"dir": "v", "count": 24, "weight": 10, "stepped": True})],
        shader=["FAIXAS", "GRADE SDF", "INTERFERÊNCIA"], structure=[("structure", {"grid": 140}), ("shape", {"kind": "cross", "layout": "grid", "count": 24, "size": 40, "spread": 500})]),
    "calm": dict(hue=215, scheme="analogous", motion="smooth", info=False, why="slow blue, long breaths",
        hero=[("sim", {"kind": "ink", "flow": 0.6}), ("organism", {"size": 1.0, "spin": 0.4}), ("flow", {"count": 500, "trail": 24, "amp": 0.08})],
        shader=["CAMPO FBM", "FLUXO WARP", "ANÉIS SDF"], structure=[("shape", {"kind": "ring", "layout": "single", "size": 260}), ("lines", {"dir": "h", "count": 6, "weight": 1.5})]),
}
# quiet parameters per shader preset (p1..p4): the ground must stay a ground, so fills and contrast are low
QUIET = {"GRADE SDF": [5, 1, 0.3, 0.06], "FAIXAS": [8, 1, 0.35, 0.15], "INTERFERÊNCIA": [6, 1, 0.25, 0.3], "CÉLULAS": [4, 1, 0.25, 0.08], "ANÉIS SDF": [6, 1, 0.2, 0.35],
         "KALEIDO": [6, 2.5, 0.4, 0.3], "CAMPO FBM": [1.6, 0.5, 0.7, 1.0], "FLUXO WARP": [1.2, 0.8, 0.4, 1.0]}
INSTR = {"low": ["rings", "radar", "scope"], "high": ["bars", "radial", "heat"]}
ARC = ["ESTABLISH", "BUILD", "PEAK", "RELEASE", "TURN", "CODA"]
ROMAN = ["I", "II", "III", "IV", "V", "VI"]
ARCH = {"led": "stage-led", "projection": "facade-mapping", "mapping": "installation", "multi": "led-architecture", "screen": "clip-pack"}
# parameter the motion profile plays on, per generator (all numeric, default > 0, so a 'mul' modulation scales them)
HERO_TARGET = {"tunnel": "size", "lines": "weight", "shape": "size", "organism": "breathe", "flow": "amp", "typewall": "fill"}
STRUCT_TARGET = {"tunnel": "size", "lines": "weight", "shape": "size"}
TARGET_DEFAULT = {"size": 1, "weight": 2, "breathe": 0.5, "amp": 0.12, "fill": 0.82}  # engine defaults, written into p so the modulation base is explicit
TENSION = lambda e: "relaxed" if e < 0.35 else ("balanced" if e < 0.7 else "assertive")


def palette(brief, mood):
    pal, surf = brief.get("palette") or {}, (brief.get("surface") or {}).get("type", "screen")
    if pal.get("colors"):
        bg, pr, se, ac = pal["colors"]
        return dict(bg=bg, primary=pr, secondary=se, accent=ac), "exact colours supplied in the brief"
    hue = pal.get("hue", mood["hue"] if mood else zlib.crc32(brief["concept"].encode()) % 360)
    scheme = pal.get("scheme", mood["scheme"] if mood else "analogous")
    r = subprocess.run([sys.executable, os.path.join(HERE, "palette.py"), "scheme", "--hue", str(hue), "--scheme", scheme, "--surface", "led" if surf in ("led", "multi") else ("projection" if surf in ("projection", "mapping") else "screen"), "--json"],
                       capture_output=True, text=True, encoding="utf-8")
    if r.returncode != 0:
        sys.exit("palette.py failed: " + r.stderr.strip()[:200])
    d = json.loads(r.stdout)
    why = (mood or {}).get("why", "hue taken from the concept text")
    return {k: d[k]["hex"] for k in ("bg", "primary", "secondary", "accent")}, f"{scheme} scheme, OKLCH hue {round(hue)} ({why})"


def cap_lines(p, W, H, share=0.3):
    """Stripes must leave room: coverage = count * weight * unit / span. Keep it under `share` by thinning the count (never below 3)."""
    u = min(H, W * 0.5625) / 1080
    span = {"v": W, "h": H}.get(p.get("dir", "h"), (W * W + H * H) ** 0.5 * 1.2)
    cov = p.get("count", 24) * p.get("weight", 2) * u / span * (1 + 0.6 * p.get("pulseAmt", 0.6))   # the beat pulse swells the stroke
    if cov > share:
        p["count"] = max(3, int(p["count"] * share / cov))
    return p


def layer(t, name, role, p=None, opacity=1, blend="normal"):
    L = {"type": t, "name": name, "on": True, "opacity": opacity, "blend": blend, "role": role}
    if p is not None:
        L["p"] = p
    return L


def build_comp(i, n, brief, mood, strat, rnd, prof=None):
    e = float(brief.get("energy", 0.5))
    dens = {"sparse": 0.6, "balanced": 1.0, "dense": 1.5}.get(brief.get("density", "balanced"), 1.0)
    surf = (brief.get("surface") or {}).get("type", "screen")
    led = surf in ("led", "multi", "projection", "mapping")
    m = mood or MOODS["minimal"]
    tag = (brief.get("mood") or ["composition"])[i % max(1, len(brief.get("mood") or [1]))].upper()
    reactive = strat != "none"
    hero_t, hero_p = m["hero"][i % len(m["hero"])]
    hero_p = dict(hero_p)
    texture = None
    if hero_t == "bitfield":
        # a bit field fills about half of the frame by nature: it is texture, not a figure. It takes the structure slot and the next generator becomes the hero.
        texture = hero_p
        alt = [h for h in m["hero"] if h[0] != "bitfield"]
        hero_t, hero_p = alt[i % len(alt)] if alt else ("tunnel", {"shape": "rect", "count": 10})
        hero_p = dict(hero_p)
    if led:
        # a wall is read from far away: heavier strokes, fewer hairlines (references/aspect-ratios.md)
        for k, f in (("weight", 3), ("stroke", 3)):
            if hero_t in ("tunnel", "lines", "shape") and k in hero_p and isinstance(hero_p[k], (int, float)):
                hero_p[k] = round(hero_p[k] * f, 1)
        if hero_t == "tunnel":
            hero_p.setdefault("weight", 9)
        if hero_t == "bitfield":
            hero_p["cell"] = int(hero_p.get("cell", 14) * 2)
    for k in ("count", "points", "rows"):
        if k in hero_p and isinstance(hero_p[k], (int, float)):
            hero_p[k] = max(1, round(hero_p[k] * dens))
    if reactive and hero_t not in ("sim", "data", "hud"):
        hero_p.update(audio=round(0.45 + 0.4 * e, 2), band="bass")
    if hero_t == "sim":
        hero_p.setdefault("threshold", 0.5)   # a reaction field covers about half of the frame at the default threshold; a figure needs room around it
        hero_p.setdefault("soft", 0.15)
    if hero_t == "organism":
        hero_p["dot"] = max(hero_p.get("dot", 1), 2.2)   # fine dust vanishes at distance and at preview size; a hero needs mass
    if hero_t == "flow":
        hero_p.update(width=max(hero_p.get("width", 1.2), 2.4), alpha=0.9)
    if hero_t == "lines":
        cap_lines(hero_p, brief["surface"]["w"], brief["surface"]["h"], 0.1)
    sh = m["shader"][i % len(m["shader"])]
    st_t, st_p = m["structure"][i % len(m["structure"])]
    st_p = dict(st_p)
    st_op = 0.3
    if texture is not None:
        st_t, st_p, st_op = "bitfield", dict(texture, levels=2), 0.1
    if st_t == "lines":
        cap_lines(st_p, brief["surface"]["w"], brief["surface"]["h"], 0.15)
    if reactive and st_t in ("lines", "structure", "tunnel") and hero_t != st_t:
        st_p.update(audio=0.5, band="high")
    kinds = INSTR["high" if e >= 0.5 else "low"]
    words = (brief.get("text") or {}).get("words") or []
    title = (brief.get("text") or {}).get("title", "")
    L = [layer("bg", "FUNDO", "ground colour of the piece; the quiet reference everything else is read against", {"grain": 0 if led else 0.4})]
    L.append(layer("shader", f"CAMPO {tag} {ROMAN[i]}", "ground field: slow matter that gives the figure something to cut against", {"preset": sh, "p1": QUIET[sh][0], "p2": QUIET[sh][1], "p3": QUIET[sh][2], "p4": QUIET[sh][3], "c1": "secondary", "c2": "secondary", "res": 0.5 if led else 1, "alphaMode": "alpha"}, 0.3 if dens <= 1 else 0.22))
    L.append(layer("shader", f"ATMOSFERA {ROMAN[i]}", "atmosphere: a second, fainter field in the accent that adds depth without competing with the hero", {"preset": m["shader"][(i + 1) % len(m["shader"])], "p1": QUIET[m["shader"][(i + 1) % len(m["shader"])]][0], "p2": QUIET[m["shader"][(i + 1) % len(m["shader"])]][1], "p3": QUIET[m["shader"][(i + 1) % len(m["shader"])]][2], "p4": QUIET[m["shader"][(i + 1) % len(m["shader"])]][3], "c1": "accent", "c2": "accent", "res": 0.5, "alphaMode": "alpha"}, 0.12 if dens <= 1 else 0.18, "add"))
    hero_op = 1
    L.append(layer(hero_t, f"HERÓI {tag} {ROMAN[i]}", f"hero: the single dominant figure of this composition ({brief.get('focalEvent', 'the focal event')})", hero_p, hero_op))
    hero_L = L[-1]
    if prof and hero_t in HERO_TARGET:
        hero_p.setdefault(HERO_TARGET[hero_t], TARGET_DEFAULT[HERO_TARGET[hero_t]] if not (hero_t == "shape" and HERO_TARGET[hero_t] == "size") else 160)
        hero_L["mod"] = [mp.to_mod(prof, HERO_TARGET[hero_t])]
    L.append(layer(st_t, f"ESTRUTURA {ROMAN[i]}", "structure: the grid or rhythm the eye measures the hero against", st_p, st_op))
    if prof and st_t in STRUCT_TARGET and st_t != hero_t:
        # follow-through: the structure answers the hero with a softer, quieter version of the same move (same cycles, so they stay locked)
        ax = prof["axes"]
        soft = mp.profile(ax["energy"] * 0.7, ax["elasticity"] * 0.5, 0, ax["continuity"], ax["rhythm"], 1)
        soft["cycles"] = prof["cycles"]
        st_p.setdefault(STRUCT_TARGET[st_t], 160 if st_t == "shape" else TARGET_DEFAULT[STRUCT_TARGET[st_t]])
        L[-1]["mod"] = [mp.to_mod(soft, STRUCT_TARGET[st_t], amp=round(prof["amp"] * 0.5, 4))]
    L.append(layer("instrument", f"INSTRUMENTO {ROMAN[i]}", "instrument: shows the real signal that drives the picture (cause and effect)", {"kind": kinds[i % len(kinds)], "size": 0.28, "cx": 0.5, "cy": 0.5 if kinds[i % len(kinds)] in ("rings", "radar", "radial") else 0.86, "n": 36, "weight": 3}, 0.8))
    if words:
        L.append(layer("typewall", f"PALAVRA {ROMAN[i]}", "event: the exact words, one per phase, large and few", {"words": "|".join(words), "rows": 1, "weight": 800, "hit": True}, 0.9, "difference" if m["motion"] == "step" else "normal"))
    elif title and ((brief.get("text") or {}).get("caption") or (brief.get("text") or {}).get("data")):
        tx = brief["text"]
        tp = {"title": title, "caption": tx.get("caption", ""), "data": tx.get("data", ""), "size": 150 if not led else 190, "font": "archivo", "reveal": "glyph", "path": tx.get("path", "none"), "cy": 0.5 if not led else 0.5}
        if m["motion"] == "step" or (prof and prof["axes"]["continuity"] < 0.5):
            tp.update(reveal="word", stagger=0.2)
        L.append(layer("typeset", f"TIPOGRAFIA {ROMAN[i]}", "event: title, caption and data as one hierarchy; reveals on the build and clears before the loop ends", tp, 0.95))
    elif m["info"]:
        L.append(layer("hud", f"INFORMAÇÃO {ROMAN[i]}", "information: small, calm, always the same place; it tells the viewer the system is alive", {"title": title or str(brief["name"]).upper()}, 0.8))
    else:
        L.append(layer("shape", f"MARCA {ROMAN[i]}", "event: one clean mark that appears on the hit and gives the loop a landmark", {"kind": "ring", "layout": "single", "size": 120 + 40 * i, "pulseAmt": 0.4}, 0.9))
    L.append(layer("post", "ACABAMENTO", "finish: vignette and a touch of tension; scanlines only where the surface is a screen", {"scan": 0 if led else 0.2, "vig": 0.35, "prob": 0.1 + 0.3 * e}))
    arc = ARC[min(i, len(ARC) - 1)] if n > 1 else "ESTABLISH"
    return {"name": f"{tag} {ROMAN[i]}", "hypothesis": f"{arc}: {brief['concept'].strip()[:140]}", "motion": ("step" if prof["axes"]["continuity"] < 0.5 else "smooth") if prof else m["motion"], "layers": L}


def make_profile(brief, mood_name, energy, bars):
    """Mood table gives the four soft axes, the brief's energy gives the fifth; brief.motionProfile overrides any of them."""
    p = mp.mood_profile(mood_name, energy, bars)
    ov = brief.get("motionProfile") or {}
    if ov:
        ax = dict(p["axes"])
        ax.update({k: v for k, v in ov.items() if k in mp.AXES})
        p = mp.profile(bars=bars, **ax)
    return p


def motion_sentence(p, bars):
    ax = p["axes"]
    feel = "stepped, quantised to the beat grid" if ax["continuity"] < 0.5 else "smooth, eased"
    ring = "critically damped (no overshoot)" if p["zeta"] >= 1 or ax["elasticity"] < 0.1 else f"springy (zeta {p['zeta']}, {round(p['overshoot'] * 100)}% overshoot)"
    wind = "with a wind-up dip before each hit" if p["ta"] else "with no wind-up"
    return f"Profile: {feel}; {ring}; {wind}; {p['cycles']} move(s) per loop of {bars} bar(s), so the loop closes. Played as layer.mod spring curves (scripts/motion_profiles.py)."


AUDIO_LINE = {"none": "the picture ignores the music.", "subtle": "the music only breathes the ground.", "structural": "the music drives structure and scale, never every hit.",
              "rhythmic": "kick drives the hero, hats drive the structure, at most three reactive layers.", "full": "the music drives most layers; the instrument layer shows the signal."}


def make_art_bible(brief, tags, contract, prof, strat, led):
    """One page that turns the contract into decisions every layer can be checked against (references/art-bible.md)."""
    mood = ", ".join(tags) or "minimal"
    txt = brief.get("text") or {}
    return {
        "thesis": brief["concept"].strip()[:200],
        "material": f"Light on a dark ground ({mood}); additive matter, no fake materials, no gradients that pretend to be objects.",
        "space": ("Read from far away: heavy strokes, large forms, the hero on the focal third, information at the edge." if led else "Read at arm's length: fine detail allowed, the hero on the focal third, information at the edge."),
        "motion": contract["motionLanguage"],
        "dramaturgy": contract["temporalArc"] + f" Tension: {contract['tension']}; one dominant figure per composition; the ground field is the release.",
        "color": contract["colorLogic"],
        "typography": ("Uppercase, one family, exact words from the brief only; a calm hierarchy: title, caption at 0.4x, data at 0.16x; revealed by glyph on the build and cleared before the loop ends." if (txt.get("words") or txt.get("title"))
                       else "No text unless the brief supplies exact words; if added: uppercase, one family, three sizes at most."),
        "audio": f"Strategy {strat}: " + AUDIO_LINE[strat],
        "banned": contract["banned"],
        "motionProfile": dict(prof["axes"]),
        "density": brief.get("density", "balanced"),
    }


def build(brief):
    errs = schema_check.validate(json.load(open(os.path.join(HERE, "..", "schema", "brief.schema.json"), encoding="utf-8")), brief)
    if errs:
        sys.exit("the brief is not valid:\n  " + "\n  ".join(errs))
    seed = brief.get("seed", zlib.crc32(brief["name"].encode()) % 900000 + 1000)
    rnd = random.Random(seed)
    tags = brief.get("mood") or []
    mood = MOODS[tags[0]] if tags else None
    pal, color_why = palette(brief, mood)
    sf, tm = brief["surface"], brief["time"]
    surf = sf.get("type", "screen")
    strat = (brief.get("audio") or {}).get("strategy", "rhythmic")
    n = int(brief.get("compositions", 3))
    e = float(brief.get("energy", 0.5))
    bars = tm.get("bars", 4)
    profs = [make_profile(brief, tags[i % len(tags)] if tags else None, e, bars) for i in range(n)]
    comps = [build_comp(i, n, brief, MOODS[tags[i % len(tags)]] if tags else None, strat, rnd, profs[i]) for i in range(n)]
    prof0 = profs[0]
    pt = brief.get("lang") == "pt"
    contract = {
        "concept": brief["concept"],
        "audienceEffect": ("O público deve sentir " if pt else "The audience should feel ") + brief["concept"][:100],
        "semioticIntent": f"Mood {', '.join(tags) or 'unspecified'}: " + brief["concept"][:100],
        "visualLanguage": f"Generator tiers from the mood table ({', '.join(tags) or 'minimal'}); one dominant figure per composition over a quiet ground.",
        "formLanguage": "Forms follow the hero generator of each composition; the structure layer keeps one module and one grid.",
        "materialLanguage": "Light on a dark ground: additive matter, no fake materials.",
        "colorLogic": color_why + "; one accent used for events only.",
        "spatialLogic": f"Canvas {sf['w']}x{sf['h']} ({surf}); the hero sits on the focal zone, structure on the grid, information at the edge.",
        "motionLanguage": motion_sentence(prof0, bars),
        "typographyLanguage": "Uppercase, one family; text only when the brief supplies exact words.",
        "temporalArc": f"Each composition: establish, evolve, peak, release over {bars} bars; the set follows {', '.join(ARC[:min(n, len(ARC))]).lower()}.",
        "loopGrammar": "cyclic: the loop closes on whole bars and every layer moves in whole cycles",
        "technicalStrategy": "Generated without AI by brief_to_project.py from the structured brief; native pixels, deterministic seed, engine generators only.",
        "forbiddenShortcuts": ", ".join(brief.get("banned") or []) or "Do not stretch 16:9 across another aspect; no unseeded randomness; no effect without a reason in the contract.",
        "focalEvent": brief.get("focalEvent") or "One dominant figure per composition; everything else supports or releases it.",
        "releaseZone": "The ground field and the empty third of the frame; no layer fills it.",
        "banned": ", ".join(brief.get("banned") or []) or "shockwave rings on every hit; particle bursts; neon glow everywhere",
        "tension": TENSION(e),
    }
    art_bible = make_art_bible(brief, tags, contract, prof0, strat, led=surf in ("led", "multi", "projection", "mapping"))
    if strat == "none":
        contract["audioStrategyReason"] = (brief.get("audio") or {}).get("reason") or "The brief asks for a silent, music-independent piece."
    spec = {"archetype": [ARCH.get(surf, "clip-pack")], "confirmed": {"pixelMap": [sf["w"], sf["h"]]}, "assumed": [{"field": "surface", "why": "generated from the brief without AI; the facts are the brief's own", "risk": "confirm the pixel map and distances with the venue before delivery"}]}
    if sf.get("pitchMm"):
        spec["confirmed"]["pitchMm"] = sf["pitchMm"]
    if sf.get("viewingDistanceM"):
        spec["confirmed"]["viewingDistanceM"] = sf["viewingDistanceM"]
    canvas = {"w": sf["w"], "h": sf["h"], "fps": sf.get("fps", 30), "target": surf if surf in ("screen", "led", "projection", "mapping", "multi") else "screen"}
    if sf.get("folds"):
        canvas["folds"] = sf["folds"]
    proj = {"schema": "ai-vj-generator/2", "id": "".join(c if c.isalnum() else "-" for c in str(brief["name"]).lower()).strip("-") or "project", "seed": seed,
            "meta": {"name": str(brief["name"]).upper(), "lang": brief.get("lang", "en"), "brief": brief["concept"], "contract": contract, "artBible": art_bible, "spec": spec},
            "canvas": canvas, "time": {"bpm": tm["bpm"], "bars": bars, "loop": True, "seamless": True, "mode": "loop", "transition": "fade" if prof0["axes"]["continuity"] >= 0.5 else "wipe"},
            "audio": {"reactive": strat != "none", "sens": 1, "smooth": 0.7, "strategy": strat},
            "palette": {**pal, **({"mode": "white-alpha"} if (brief.get("output") or {}).get("mode") == "white-alpha" else {})}, "compositions": comps}
    return proj


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
    if out and out in args:
        args.remove(out)
    if len(args) != 1:
        print(__doc__)
        sys.exit(2)
    try:
        brief = json.load(open(args[0], encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as ex:
        sys.exit(f"cannot read the brief: {ex}")
    proj = build(brief)
    path = out or os.path.splitext(args[0])[0].replace(".brief", "") + ".aivj.json"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(proj, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"wrote {path}: {len(proj['compositions'])} composition(s), seed {proj['seed']}, palette {proj['palette']['primary']} on {proj['palette']['bg']}")
    print("next: python validate_project.py", path, " then open it in the engine (or: node make-artifact.mjs", path, ")")


if __name__ == "__main__":
    main()
