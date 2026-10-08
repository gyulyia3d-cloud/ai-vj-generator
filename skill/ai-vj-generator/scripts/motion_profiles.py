#!/usr/bin/env python3
"""Motion profiles: five numbers become an executable curve.

  python motion_profiles.py show --energy 0.7 --elasticity 0.8 --anticipation 0.4 --continuity 0.9 --rhythm 0.5 --bars 4
  python motion_profiles.py curve --json ... [--n 32]      # sample the curve (for plots and tests)
  python motion_profiles.py moods                           # the profile each mood uses

The five axes (all 0..1):
  energy        how big the move is and how fast the spring rings.
  elasticity    0 = critically damped (one smooth bump), 1 = rings several times before it settles.
  anticipation  0 = none, 1 = a clear dip right before the hit (wind-up).
  continuity    0 = stepped, quantised in time (interface), 1 = fully smooth (matter).
  rhythm        0 = one move per bar, 1 = eight per bar. Always a whole number of cycles per loop, so the loop closes.

The curve is a "kick and ring": it starts at 0 on the beat, rises, rings out and is back to 0 before the next beat,
with an optional dip just before it (anticipation). It is a pure function of the loop phase, so it is deterministic
and closes the loop. The engine implements the same function (`motionCurve` in app/index.html, shape "spring" of
`layer.mod`); tests/motion_check.mjs compares the two numerically.
"""
import argparse, json, math, sys

sys.stdout.reconfigure(encoding="utf-8")

AXES = ("energy", "elasticity", "anticipation", "continuity", "rhythm")
PER_BAR = (1, 2, 4, 8)

# mood -> (elasticity, anticipation, continuity, rhythm). Energy always comes from the brief.
MOODS = {
    "industrial": (0.15, 0.10, 0.15, 0.55), "organic": (0.55, 0.55, 1.00, 0.20), "cosmic": (0.40, 0.30, 1.00, 0.10),
    "urban": (0.20, 0.25, 0.20, 0.60), "ritual": (0.30, 0.65, 0.90, 0.15), "glitch": (0.05, 0.00, 0.05, 0.90),
    "minimal": (0.10, 0.20, 1.00, 0.10), "liquid": (0.70, 0.40, 1.00, 0.25), "crystalline": (0.10, 0.10, 0.25, 0.50),
    "retro": (0.10, 0.05, 0.10, 0.60), "aggressive": (0.35, 0.50, 0.10, 0.85), "calm": (0.45, 0.35, 1.00, 0.05),
}
DEFAULT = (0.30, 0.30, 0.80, 0.30)


def clamp(x, lo=0.0, hi=1.0):
    return lo if x < lo else hi if x > hi else x


def profile(energy=0.5, elasticity=0.3, anticipation=0.3, continuity=0.8, rhythm=0.3, bars=4):
    """Five axes -> numbers the curve and the engine use. Pure and deterministic."""
    e, el, an, co, rh = (clamp(float(v)) for v in (energy, elasticity, anticipation, continuity, rhythm))
    zeta = round(1.0 - 0.88 * el, 4)                      # 1.0 (smooth) .. 0.12 (rings a lot)
    wn = round(7.0 + 11.0 * e, 3)                         # rad per unit of the move; more energy = faster ring
    ta = round(0.14 * an, 4)                              # fraction of the cycle spent winding up
    depth = round(0.30 * an, 4)                           # how far the wind-up dips (fraction of the peak)
    steps = 0 if co >= 0.85 else int(round(4 + 28 * co))  # 0 = smooth; otherwise the phase is quantised to `steps` per cycle
    per_bar = PER_BAR[min(3, int(round(rh * 3)))]
    cycles = max(1, int(bars) * per_bar)
    amp = round(0.10 + 0.50 * e, 4)                       # peak size of the move, as a fraction of the parameter
    return dict(zeta=zeta, wn=wn, ta=ta, depth=depth, steps=steps, cycles=cycles, amp=amp,
                overshoot=overshoot(zeta), axes=dict(energy=e, elasticity=el, anticipation=an, continuity=co, rhythm=rh))


def overshoot(zeta):
    """Classic second-order overshoot of the step response, as a fraction (0 when critically damped)."""
    if zeta >= 1:
        return 0.0
    return round(math.exp(-math.pi * zeta / math.sqrt(1 - zeta * zeta)), 4)


def smoothstep(a, b, x):
    t = clamp((x - a) / (b - a))
    return t * t * (3 - 2 * t)


def curve(f, zeta, wn, ta=0.0, depth=0.0, steps=0):
    """Value of the kick-and-ring curve at loop phase f (any real; only the fractional part counts).
    Starts at 0, peaks at 1, rings (negative lobes when zeta < 1), is 0 again at the end of the cycle.
    The wind-up dip lives in the last `ta` of the cycle. Identical to `motionCurve` in the engine."""
    f = f - math.floor(f)
    if steps and steps > 0:
        f = math.floor(f * steps) / steps
    if ta > 0 and f >= 1 - ta:
        return -depth * math.sin(math.pi * (f - (1 - ta)) / ta)
    x = f / (1 - ta) if ta > 0 else f
    z = min(zeta, 1.0)
    if z < 1:
        wd = wn * math.sqrt(1 - z * z)
        xs = math.atan2(wd, z * wn) / wd
        peak = math.exp(-z * wn * xs) * math.sin(wd * xs)
        h = math.exp(-z * wn * x) * math.sin(wd * x) / peak
    else:
        peak = math.exp(-1) / wn
        h = x * math.exp(-wn * x) / peak
    return h * (1 - smoothstep(0.75, 1.0, x))


def to_mod(prof, k, mode="mul", amp=None):
    """A `layer.mod` entry that plays the profile on parameter `k`. With mode mul the parameter is scaled by 1 + amp*curve."""
    a = prof["amp"] if amp is None else amp
    lo, hi = (1.0, round(1.0 + a, 4)) if mode == "mul" else (0.0, round(a, 4))
    m = dict(k=k, src="lfo", shape="spring", cycles=prof["cycles"], zeta=prof["zeta"], wn=prof["wn"], min=lo, max=hi, mode=mode)
    if prof["ta"]:
        m.update(ta=prof["ta"], depth=prof["depth"])
    if prof["steps"]:
        m["steps"] = prof["steps"]
    return m


def mood_profile(mood, energy, bars=4):
    el, an, co, rh = MOODS.get(mood, DEFAULT)
    return profile(energy, el, an, co, rh, bars)


def _args(a):
    return dict(energy=a.energy, elasticity=a.elasticity, anticipation=a.anticipation, continuity=a.continuity, rhythm=a.rhythm, bars=a.bars)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("cmd", choices=["show", "curve", "moods"])
    for ax in AXES:
        ap.add_argument(f"--{ax}", type=float, default=dict(energy=0.5, elasticity=0.3, anticipation=0.3, continuity=0.8, rhythm=0.3)[ax])
    ap.add_argument("--bars", type=int, default=4)
    ap.add_argument("--n", type=int, default=32)
    ap.add_argument("--json", action="store_true")
    a = ap.parse_args()
    if a.cmd == "moods":
        for m, v in MOODS.items():
            print(f"{m:12s} elasticity {v[0]:.2f}  anticipation {v[1]:.2f}  continuity {v[2]:.2f}  rhythm {v[3]:.2f}")
        return
    p = profile(**_args(a))
    if a.cmd == "show":
        print(json.dumps(p, indent=2) if a.json else "\n".join(f"{k:10s} {v}" for k, v in p.items() if k != "axes"))
        return
    ys = [curve(i / a.n, p["zeta"], p["wn"], p["ta"], p["depth"], p["steps"]) for i in range(a.n)]
    print(json.dumps(ys) if a.json else " ".join(f"{y:+.2f}" for y in ys))


if __name__ == "__main__":
    main()
