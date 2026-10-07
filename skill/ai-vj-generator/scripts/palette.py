#!/usr/bin/env python3
"""Perceptual palette helper (OKLab / OKLCH). It builds and checks palettes; it never chooses the hue for you:
the hue comes from the briefing's concept (semiotics, `references/color-science.md`), so there is no default palette.

usage: python palette.py <command> [options] [--json]

  convert HEX                     sRGB hex -> OKLab, OKLCH, linear RGB, relative luminance
  ramp --hue H --chroma C --from L0 --to L1 [--steps N]
                                  a lightness ramp at constant hue, gamut-mapped by reducing chroma
  scheme --hue H --scheme S [--chroma C] [--surface led|projection|screen]
                                  the four roles (bg, primary, secondary, accent) + field, for S in
                                  mono | analogous | complement | split | triad | tetrad
  check --bg HEX --primary HEX --secondary HEX --accent HEX [--surface ...]
                                  contrast ratios, lightness gaps and surface rules

OKLCH: L 0..1 perceptual lightness, C chroma (0 grey, ~0.37 max), h hue in degrees (30 red, 110 yellow,
145 green, 195 cyan, 265 blue, 330 magenta). Equal L means equal perceived lightness, unlike HSL.
"""
import argparse
import json
import math
import sys

if hasattr(sys.stdout, "reconfigure"):          # Windows pipes default to cp1252; the JSON and notes are UTF-8
    sys.stdout.reconfigure(encoding="utf-8")

SURFACES = {
    # bg L max, primary L max, min primary:bg contrast, note
    "led": {"bg_l": 0.12, "primary_l": 0.95, "min_cr": 7.0, "note": "black is off; keep white below clipping; flat colour reads, subtle gradients vanish"},
    "projection": {"bg_l": 0.10, "primary_l": 0.97, "min_cr": 7.0, "note": "projector black is grey: avoid large dark-grey fields, use true black and light forms"},
    "screen": {"bg_l": 0.20, "primary_l": 0.98, "min_cr": 4.5, "note": "free; keep readable contrast"},
}


# ------------------------------------------------------------ colour maths
def srgb_to_lin(c):
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lin_to_srgb(c):
    c = max(0.0, c)
    return 12.92 * c if c <= 0.0031308 else 1.055 * c ** (1 / 2.4) - 0.055


def hex_to_rgb(h):
    raw = h
    h = h.strip().lstrip("#")
    if len(h) == 3:
        h = "".join(ch * 2 for ch in h)
    try:
        if len(h) != 6:
            raise ValueError
        return tuple(int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    except ValueError:
        sys.exit(f"bad colour {raw!r}: use #RRGGBB or #RGB")


def rgb_to_hex(rgb):
    return "#" + "".join(f"{round(min(1, max(0, c)) * 255):02X}" for c in rgb)


def lin_to_oklab(r, g, b):
    l = 0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b
    m = 0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b
    s = 0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b
    l_, m_, s_ = (math.copysign(abs(x) ** (1 / 3), x) for x in (l, m, s))
    return (0.2104542553 * l_ + 0.7936177850 * m_ - 0.0040720468 * s_,
            1.9779984951 * l_ - 2.4285922050 * m_ + 0.4505937099 * s_,
            0.0259040371 * l_ + 0.7827717662 * m_ - 0.8086757660 * s_)


def oklab_to_lin(L, a, b):
    l_ = L + 0.3963377774 * a + 0.2158037573 * b
    m_ = L - 0.1055613458 * a - 0.0638541728 * b
    s_ = L - 0.0894841775 * a - 1.2914855480 * b
    l, m, s = l_ ** 3, m_ ** 3, s_ ** 3
    return (4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
            -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
            -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s)


def hex_to_oklch(h):
    r, g, b = (srgb_to_lin(c) for c in hex_to_rgb(h))
    L, a, bb = lin_to_oklab(r, g, b)
    return L, math.hypot(a, bb), math.degrees(math.atan2(bb, a)) % 360


def in_gamut(lin, eps=1e-4):
    return all(-eps <= c <= 1 + eps for c in lin)


def oklch_to_hex(L, C, h):
    """Gamut-map by reducing chroma (hue and lightness are kept)."""
    L = min(1.0, max(0.0, L))
    hr = math.radians(h)
    lo, hi = 0.0, C
    lin = oklab_to_lin(L, C * math.cos(hr), C * math.sin(hr))
    if not in_gamut(lin):
        for _ in range(24):
            mid = (lo + hi) / 2
            if in_gamut(oklab_to_lin(L, mid * math.cos(hr), mid * math.sin(hr))):
                lo = mid
            else:
                hi = mid
        C = lo
        lin = oklab_to_lin(L, C * math.cos(hr), C * math.sin(hr))
    return rgb_to_hex(tuple(lin_to_srgb(c) for c in lin)), C


def luminance(h):
    r, g, b = (srgb_to_lin(c) for c in hex_to_rgb(h))
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(h1, h2):
    a, b = sorted((luminance(h1), luminance(h2)), reverse=True)
    return (a + 0.05) / (b + 0.05)


# ------------------------------------------------------------ commands
def cmd_convert(a):
    L, C, h = hex_to_oklch(a.hex)
    r, g, b = (srgb_to_lin(c) for c in hex_to_rgb(a.hex))
    return {"hex": a.hex.upper(), "oklch": {"L": round(L, 4), "C": round(C, 4), "h": round(h, 1)},
            "oklab": [round(x, 4) for x in lin_to_oklab(r, g, b)], "linear_rgb": [round(x, 4) for x in (r, g, b)],
            "relative_luminance": round(luminance(a.hex), 4)}


def cmd_ramp(a):
    steps = [a.__dict__["from"] + (a.to - a.__dict__["from"]) * i / (a.steps - 1) for i in range(a.steps)]
    out = []
    for L in steps:
        hx, C = oklch_to_hex(L, a.chroma, a.hue)
        out.append({"L": round(L, 3), "C": round(C, 3), "hex": hx})
    return {"ramp": out}


def hues_for(scheme, h0):
    return {"mono": [h0], "analogous": [h0, h0 + 30, h0 - 30], "complement": [h0, h0 + 180],
            "split": [h0, h0 + 150, h0 + 210], "triad": [h0, h0 + 120, h0 + 240],
            "tetrad": [h0, h0 + 90, h0 + 180, h0 + 270]}[scheme]


def cmd_scheme(a):
    S = SURFACES[a.surface]
    hs = hues_for(a.scheme, a.hue)
    acc_h = hs[1] if len(hs) > 1 else a.hue + 40       # mono: a near-hue accent so it still separates by chroma
    roles = {
        "bg": (0.07 if a.surface != "screen" else 0.12, 0.015, a.hue, "tinted black: the ground, never decoration"),
        "primary": (min(S["primary_l"], 0.93), 0.02, a.hue, "figure: highest lightness, near white but below clipping"),
        "secondary": (0.62, 0.05, hs[2] if len(hs) > 2 else a.hue, "support: mid lightness, low chroma, a different tier from the figure"),
        "accent": (0.72, a.chroma, acc_h, "event: the one saturated note; use sparingly"),
    }
    out, report = {}, []
    for k, (L, C, h, why) in roles.items():
        hx, C2 = oklch_to_hex(L, C, h)
        out[k] = {"hex": hx, "oklch": [round(L, 3), round(C2, 3), round(h % 360, 1)], "why": why}
    fl, _ = oklch_to_hex((roles["bg"][0] + roles["primary"][0]) * 0.43 + 0.0, 0.01, a.hue)
    out["field"] = {"hex": fl, "why": "plane behind a figure that belongs to another layer"}
    if len(hs) > 3:
        hx, C2 = oklch_to_hex(0.66, a.chroma * 0.8, hs[3])
        out["accent2"] = {"hex": hx, "oklch": [0.66, round(C2, 3), round(hs[3] % 360, 1)], "why": "second event colour (tetrad)"}
    out["checks"] = run_checks({k: out[k]["hex"] for k in ("bg", "primary", "secondary", "accent")}, a.surface)
    return out


def run_checks(p, surface):
    S = SURFACES[surface]
    res = {"contrast": {}, "warnings": [], "surface_note": S["note"]}
    for k in ("primary", "secondary", "accent"):
        res["contrast"][f"{k}:bg"] = round(contrast(p[k], p["bg"]), 2)
    res["contrast"]["primary:secondary"] = round(contrast(p["primary"], p["secondary"]), 2)
    Lb, Cb, _ = hex_to_oklch(p["bg"])
    Lp, _, _ = hex_to_oklch(p["primary"])
    Ls, _, _ = hex_to_oklch(p["secondary"])
    La, Ca, _ = hex_to_oklch(p["accent"])
    if Lb > S["bg_l"]:
        res["warnings"].append(f"bg lightness {Lb:.2f} is above {S['bg_l']} for {surface}: the ground should read as black")
    if Lp > S["primary_l"]:
        res["warnings"].append(f"primary lightness {Lp:.2f} is above {S['primary_l']}: may clip or glare on {surface}")
    if res["contrast"]["primary:bg"] < S["min_cr"]:
        res["warnings"].append(f"primary:bg contrast {res['contrast']['primary:bg']} is below {S['min_cr']}:1 for {surface}")
    if res["contrast"]["accent:bg"] < 4.5:
        res["warnings"].append("accent:bg contrast under 4.5:1: the accent will not read from distance")
    if abs(Lp - Ls) < 0.15:
        res["warnings"].append("primary and secondary are within 0.15 of lightness: the tiers merge; separate them by lightness, not hue")
    if abs(La - Lp) < 0.08 and Ca > 0.05:
        res["warnings"].append("accent and primary have similar lightness: they separate only by hue and vanish for colour-blind viewers or in greyscale")
    if Ca < 0.06:
        res["warnings"].append("accent chroma is under 0.06: it reads as grey, not as an event")
    if surface in ("led", "projection") and Cb > 0.04:
        res["warnings"].append("bg is clearly coloured: on LED / projection a coloured ground washes the whole surface")
    return res


def cmd_check(a):
    return run_checks({"bg": a.bg, "primary": a.primary, "secondary": a.secondary, "accent": a.accent}, a.surface)


COMMANDS = {"convert": cmd_convert, "ramp": cmd_ramp, "scheme": cmd_scheme, "check": cmd_check}


def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true", help="accepted for symmetry; output is always JSON")
    sub = p.add_subparsers(dest="cmd", required=True)
    _add = sub.add_parser
    sub.add_parser = lambda *a, **k: _add(*a, parents=[common], **k)
    s = sub.add_parser("convert"); s.add_argument("hex")
    s = sub.add_parser("ramp"); s.add_argument("--hue", type=float, required=True); s.add_argument("--chroma", type=float, default=0.1)
    s.add_argument("--from", dest="from", type=float, default=0.1); s.add_argument("--to", type=float, default=0.95); s.add_argument("--steps", type=int, default=7)
    s = sub.add_parser("scheme"); s.add_argument("--hue", type=float, required=True, help="no default: derive it from the concept")
    s.add_argument("--scheme", choices=("mono", "analogous", "complement", "split", "triad", "tetrad"), required=True)
    s.add_argument("--chroma", type=float, default=0.17); s.add_argument("--surface", choices=tuple(SURFACES), default="screen")
    s = sub.add_parser("check")
    for k in ("bg", "primary", "secondary", "accent"):
        s.add_argument("--" + k, required=True)
    s.add_argument("--surface", choices=tuple(SURFACES), default="screen")
    return p


def main(argv=None):
    a = build_parser().parse_args(argv)
    d = COMMANDS[a.cmd](a)
    print(json.dumps(d, indent=2, ensure_ascii=False))
    return d


if __name__ == "__main__":
    main()
