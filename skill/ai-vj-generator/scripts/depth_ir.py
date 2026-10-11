#!/usr/bin/env python3
"""Depth IR (phase 11, 2.5D): the generated layers sit on depth planes and one camera moves them.

  python depth_ir.py project.json [index]     # prints the Depth IR of composition `index` (default 0), without writing

A 2.5D scene has no mesh: each layer gets a depth `z` (-1 far, +1 near) and the composition gets one `camera`. The camera moves the planes against each other
(parallax), pushes them in and out (perspective), dims and desaturates the far ones (atmospheric fog) and blurs the planes away from the focus plane (depth of field).
Text, meters, the ground colour and the finish stay on the screen plane. The camera always runs in whole cycles of the loop, so the loop closes, and it never listens
to the audio. The archetype of the Animation IR chooses the camera (pulse and breathe dolly, glide and stutter sway, orbit orbits, ripple pulls focus, settle cranes);
a hard fold or active-area constraint of the Surface IR leaves only the focus pull, so nothing slides or grows across a seam.
Data: registry/depth.json, shared with the browser (app/depth.js); both give the same IR and the same transforms (scripts/depth_check.mjs).
This is not 3D: for a real camera in a real scene use the 3D phase. The `parallax` layer (a photo with a depth map) and `splat` stay as they are.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import audio_semantics as audio_sem  # noqa: E402
import composition_ir as comp_ir  # noqa: E402

with open(os.path.join(HERE, "..", "registry", "depth.json"), encoding="utf-8") as f:
    DATA = json.load(f)
CAMERAS = DATA["cameras"]
r2 = lambda x: round(x, 2)
r3 = lambda x: round(x, 3)
r4 = lambda x: round(x, 4)
clamp = lambda x, lo, hi: min(hi, max(lo, x))


def tier_of(L):
    """The tier of a layer (hero, structure, ground, event, instrument, information, finish, background), as the audio semantics read it."""
    return audio_sem.tier_of(L)


def surface_unit(W, H):
    """The reference length of the parallax: the short side as a 16:9 frame would have it (the engine's own unit times 1080)."""
    return min(H, W * 0.5625)


def assign_planes(layers):
    """z per visible layer: the layers of one tier are spread over the tier's range, bottom layer farthest. Returns {index: (tier, z)}."""
    by = {}
    for i, L in enumerate(layers):
        if not L.get("on", True):
            continue
        t = tier_of(L)
        if t in DATA["planes"]:
            by.setdefault(t, []).append(i)
    out = {}
    for t, idx in by.items():
        lo, hi = DATA["planes"][t]["range"]
        for j, i in enumerate(idx):
            z = (lo + hi) / 2 if len(idx) == 1 else lo + (hi - lo) * j / (len(idx) - 1)
            out[i] = (t, r2(z))
    return out


def plane_effect(cam, z, S, focus=None):
    """Static fog and blur of a plane for a given focus: the numbers the IR reports, and the same formula the engine uses every frame."""
    f = cam["focus"] if focus is None else focus
    fog = cam["fog"] * clamp((f - z) / DATA["fogSpan"], 0.0, 1.0)
    blur = cam["dof"] * S * max(0.0, abs(z - f) - DATA["deadzone"])
    return {"fog": r3(fog), "blurPx": r2(blur)}


def compile_depth(layers, an, cmp, sx, W, H):
    """The Depth IR of one composition: camera, planes, focus, the parallax numbers on this surface and the seam rule."""
    arch = (an or {}).get("archetype")
    cam_id = DATA["archetypeCamera"].get(arch, "sway")
    axis = (cmp or {}).get("movementAxis")
    cam_id = DATA["axisSwap"].get(axis, {}).get(cam_id, cam_id)
    seam = None
    if sx and (comp_ir.hard(sx, "foldBands") or comp_ir.hard(sx, "activeArea")):
        if CAMERAS[cam_id]["moves"]:
            seam = {"hard": True, "rule": DATA["seamReason"], "from": cam_id}
            cam_id = DATA["seamSafe"]
        else:
            seam = {"hard": True, "rule": None, "from": cam_id}
    c = CAMERAS[cam_id]
    planes = assign_planes(layers)
    hz = [z for (t, z) in planes.values() if t == "hero"]
    focus = r2(sum(hz) / len(hz)) if hz else DATA["focusDefault"]
    bars = ((an or {}).get("timing") or {}).get("bars", 4)
    rule = DATA["cycles"][cam_id]
    cycles = 0 if rule == "none" else max(1, int(bars) // 2) if rule == "half" else 1
    energy = ((an or {}).get("axes") or {}).get("energy", 0.5)
    amp = r4(c["amp"] * (DATA["energy"]["lo"] + DATA["energy"]["span"] * energy)) if cam_id != "still" else 0
    if cam_id == "rack":
        amp = min(1.0, amp)
    cam = {"move": cam_id, "amp": amp, "cycles": cycles, "phase": 0, "focus": focus,
           "fog": DATA["fog"].get(cam_id, DATA["fog"]["default"]), "dof": DATA["dof"].get(cam_id, DATA["dof"]["default"])}
    steps = DATA["archetypeSteps"].get(arch) if cam_id == "sway" else None
    if steps:
        cam["steps"] = steps
    S = surface_unit(W, H)
    rows, far = [], 0.0
    for i, (t, z) in sorted(planes.items()):
        e = plane_effect(cam, z, S)
        rows.append({"name": layers[i].get("name"), "tier": t, "z": z, "fog": e["fog"], "blurPx": e["blurPx"]})
        far = max(far, abs(z - focus))
    ax = c["axes"]
    shift_x = r2(amp * S * far) if "x" in ax else 0
    shift_y = r2(amp * S * far * (0.5 if "x" in ax else 1)) if "y" in ax else 0
    scale = r2(amp * 100 * max([(z + 1) / 2 for (t, z) in planes.values()] or [0])) if "scale" in ax else 0
    screen = [layers[i].get("name") for i, L in enumerate(layers) if L.get("on", True) and i not in planes]
    return {
        "version": 1, "archetype": arch, "camera": cam, "description": DATA["reasons"].get(arch, c["description"]) if not (seam and seam["rule"]) else seam["rule"],
        "focus": {"z": focus, "tier": DATA["focusTier"] if hz else "default"},
        "planes": rows, "screen": screen,
        "parallax": {"shiftXPx": shift_x, "shiftYPx": shift_y, "scalePct": scale, "unitPx": r2(S),
                     "blurMaxPx": max([r["blurPx"] for r in rows] or [0]), "fogMax": max([r["fog"] for r in rows] or [0])},
        "seam": seam or {"hard": False, "rule": None, "from": cam_id},
        "loop": {"closes": True, "wholeCycles": True, "audio": False},
    }


def apply_depth(comp, layers, ir):
    """Writes `z` on the layers of the planes (and removes it from every other layer) and the camera on the composition. Idempotent."""
    planes = assign_planes(layers)
    for i, L in enumerate(layers):
        if i in planes:
            L["z"] = planes[i][1]
        else:
            L.pop("z", None)
    comp["camera"] = json.loads(json.dumps(ir["camera"]))
    return comp


# ---- the runtime transform (the engine's formulas; the browser has the same in app/depth.js) ----

def camera_state(cam, ph):
    """The camera at loop phase `ph` in [0, 1): x and y offsets (fractions of the unit), dolly (fraction of scale) and the focus plane."""
    still = {"cx": 0.0, "cy": 0.0, "dz": 0.0, "focus": cam["focus"]}
    if cam["move"] == "still" or not cam.get("cycles"):
        return still
    s = cam["cycles"] * ph + cam.get("phase", 0)
    steps = cam.get("steps")
    if steps:
        s = math.floor(s * steps) / steps
    phi = 2 * math.pi * s
    a, m = cam["amp"], cam["move"]
    if m == "sway":
        return {**still, "cx": a * math.sin(phi)}
    if m == "crane":
        return {**still, "cy": a * math.sin(phi)}
    if m == "orbit":
        return {**still, "cx": a * math.sin(phi), "cy": 0.5 * a * math.cos(phi)}
    if m == "dolly":
        return {**still, "dz": a * math.sin(phi)}
    if m == "rack":
        return {**still, "focus": clamp(cam["focus"] + a * math.sin(phi), DATA["zRange"][0], DATA["zRange"][1])}
    return still


def layer_transform(cam, st, z, S):
    """What the camera does to a layer on plane z: offsets in pixels, scale, blur radius in pixels, opacity and saturation factors."""
    f0, f = cam["focus"], st["focus"]
    d = z - f
    fog = cam["fog"] * clamp((f - z) / DATA["fogSpan"], 0.0, 1.0)
    return {"dx": -st["cx"] * S * (z - f0), "dy": -st["cy"] * S * (z - f0), "scale": 1 + st["dz"] * (z + 1) / 2,
            "blur": cam["dof"] * S * max(0.0, abs(d) - DATA["deadzone"]), "alpha": 1 - fog, "sat": 1 - DATA["fogSat"] * fog}


def audit(comp, canvas):
    """Rules of the camera and the planes for one composition: (errors, warnings). A composition with no camera and no z is a legacy project: nothing is applied."""
    e, w = [], []
    cam, layers = comp.get("camera"), comp.get("layers") or []
    zs = [(L, L.get("z")) for L in layers if "z" in L]
    for L, z in zs:
        nm = L.get("name") or L.get("type")
        if isinstance(z, bool) or not isinstance(z, (int, float)) or not (DATA["zRange"][0] <= z <= DATA["zRange"][1]):
            e.append(f"{nm}.z: a number from {DATA['zRange'][0]} (far) to {DATA['zRange'][1]} (near)")
            continue
        t = tier_of(L)
        if t in DATA["screenSpace"]:
            w.append(f"{nm}: a {t} layer should stay on the screen plane (no z): {DATA['screenWhy']}")
    if cam is None:
        if zs:
            w.append("layers have `z` but the composition has no `camera`: the planes do nothing until the camera exists (depth_ir.py or plan_ir.py --apply)")
        return e, w
    if not isinstance(cam, dict) or cam.get("move") not in CAMERAS:
        e.append(f"camera.move: must be one of {', '.join(CAMERAS)}")
        return e, w
    c = CAMERAS[cam["move"]]
    num = lambda k, lo, hi: isinstance(cam.get(k), (int, float)) and not isinstance(cam.get(k), bool) and lo <= cam[k] <= hi
    if not num("amp", 0, 1.0 if cam["move"] == "rack" else 0.25):
        e.append(f"camera.amp: a number from 0 to {1.0 if cam['move'] == 'rack' else 0.25} (a fraction of the unit; the focus travel for rack)")
    if not num("focus", DATA["zRange"][0], DATA["zRange"][1]):
        e.append("camera.focus: a plane from -1 to 1")
    if not num("fog", 0, 1):
        e.append("camera.fog: from 0 to 1")
    if not num("dof", 0, 0.1):
        e.append("camera.dof: from 0 to 0.1")
    if "phase" in cam and not num("phase", 0, 1):
        e.append("camera.phase: from 0 to 1")
    if "steps" in cam and not (isinstance(cam["steps"], int) and not isinstance(cam["steps"], bool) and 2 <= cam["steps"] <= 32):
        e.append("camera.steps: a whole number from 2 to 32")
    if cam["move"] != "still":
        cy = cam.get("cycles")
        if not (isinstance(cy, int) and not isinstance(cy, bool) and cy >= 1):
            e.append("camera.cycles: a whole number of cycles per loop (at least 1), otherwise the loop does not close")
    if c["moves"] and (canvas or {}).get("folds"):
        e.append(f"camera.move {cam['move']!r} moves layers across the declared folds: use rack or still on a folded surface")
    if not zs:
        w.append("the composition has a camera but no layer has `z`: nothing sits on a plane")
    elif isinstance(cam.get("amp"), (int, float)) and c["moves"] and cam["move"] != "dolly":
        far = max((abs(z - cam.get("focus", 0)) for L, z in zs if isinstance(z, (int, float))), default=0)
        if cam["amp"] * far > DATA["maxShift"]:
            w.append(f"camera: the farthest plane shifts {cam['amp'] * far:.3f} of the unit (above {DATA['maxShift']}): the parallax may show stretched edges")
    return e, w


if __name__ == "__main__":
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    sys.stdout.reconfigure(encoding="utf-8")
    P = json.load(open(sys.argv[1], encoding="utf-8"))
    i = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    meta = P.get("meta") or {}
    an = (meta.get("animationIR") or [None] * (i + 1))[i]
    cmp = (meta.get("compositionIR") or [None] * (i + 1))[i]
    sx = meta.get("surfaceIR")
    cv = P["canvas"]
    print(json.dumps(compile_depth(P["compositions"][i]["layers"], an, cmp, sx, cv["w"], cv["h"]), ensure_ascii=False, indent=1))
