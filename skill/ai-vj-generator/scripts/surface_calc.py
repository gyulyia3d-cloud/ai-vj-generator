#!/usr/bin/env python3
"""Derived numbers for a VJ surface: turn what the user says ("10 m x 4 m LED, P3.9") into the
pixel map, the projector blend, the loop length and the legibility limits, so the interview can read
the numbers back and the project is built on the real surface.

usage: python surface_calc.py <command> [options] [--json]

  led          cabinets / physical size + pitch  ->  pixel map, aspect, processor ports, viewing distance
  projection   projector + throw + surface       ->  image size, projectors needed, px per metre, light
  blend        N projectors + overlap            ->  content canvas, crop offsets, ramp (Bourke)
  loop         bpm + bars + fps                  ->  exact frames, every fps/bars that closes, refresh judder
  aspect       w x h                             ->  ratio, family, 1080-unit scale k, strip modules
  legibility   pitch + distance                  ->  minimum text height and line weight in pixels
  pixelmap     pixel count (bars, tubes, strips) ->  DMX / Art-Net / sACN universes and bandwidth
  ramp         overlap width                     ->  edge-blend alpha ramp lookup table

Pure standard library. Every number is a planning figure: confirm it against the venue's own
documents (processor map, projector sheet) before delivery; the output says which assumptions it made.
"""
import argparse
import json
import math
import sys

if hasattr(sys.stdout, "reconfigure"):          # Windows pipes default to cp1252; the JSON and notes are UTF-8
    sys.stdout.reconfigure(encoding="utf-8")

FPS_OK = (24, 25, 30, 50, 60)
BARS_OK = (1, 2, 4, 8, 16, 32)

# Rules of thumb (labelled as such in the output)
PORT_PX = 650_000          # pixels a 1 GbE LED-processor port carries at 8 bit / 60 Hz (typical; datasheets vary)
UHD_PX = 3840 * 2160
ARTNET_PX_PER_UNIVERSE = 170   # 510 of 512 slots at 3 channels per pixel
ARTNET_BYTES = 530             # packet size on the wire per universe (header + 512 slots + UDP/IP/Eth)
SACN_BYTES = 638


# ---------------------------------------------------------------- helpers
def need(cmd, **vals):
    """Exit with a clear message when a required quantity is not a positive number."""
    for k, v in vals.items():
        if v is None or not (v > 0):
            sys.exit(f"{cmd}: --{k.replace('_', '-')} must be greater than 0 (got {v})")


def gcd(a, b):
    while b:
        a, b = b, a % b
    return a


def ratio(w, h):
    g = gcd(int(w), int(h)) or 1
    return int(w) // g, int(h) // g


def aspect_family(w, h):
    r = w / h
    if r >= 8:
        return "ultra-wide strip"
    if r >= 2.6:
        return "wide panorama (32:9 class)"
    if r >= 2.0:
        return "wide (2:1 to 21:9)"
    if r >= 1.6:
        return "landscape standard (16:9 / 16:10)"
    if r >= 1.15:
        return "near-square landscape (4:3 / 5:4)"
    if r >= 0.85:
        return "square"
    if r >= 0.5:
        return "portrait (9:16 class)"
    if r > 0.125:
        return "ultra-tall"
    return "ultra-tall strip"


def unit_scale(w, h):
    """Engine 1080-unit scale k (engine.html): min(H, W*9/16) / 1080."""
    return min(h, w * 9 / 16) / 1080


# ---------------------------------------------------------------- commands
def calc_led(a):
    out = {"assumptions": [], "warnings": []}
    need("led", pitch=a.pitch, cab_w=a.cab_w, cab_h=a.cab_h)
    cab_w, cab_h = a.cab_w, a.cab_h
    pitch = a.pitch
    cab_px_w = a.cab_px_w or round(cab_w / pitch)
    cab_px_h = a.cab_px_h or (a.cab_px_w if a.cab_px_w else round(cab_h / pitch))
    eff_pitch = cab_w / cab_px_w
    if not a.cab_px_w and abs(eff_pitch - pitch) / pitch > 0.02:
        out["assumptions"].append(
            f"cabinet {cab_w:g} mm at nominal P{pitch:g} -> {cab_px_w} px, so the real pitch is {eff_pitch:.3f} mm; "
            "use the cabinet's real pixel count from its datasheet if you have it")
    if (a.cols is not None and a.cols < 1) or (a.rows is not None and a.rows < 1):
        sys.exit("led: --cols and --rows must be at least 1")
    if a.cols and a.rows:
        cols, rows = a.cols, a.rows
    elif a.width_m and a.height_m:
        cols = max(1, round(a.width_m * 1000 / cab_w))
        rows = max(1, round(a.height_m * 1000 / cab_h))
        out["assumptions"].append(
            f"{a.width_m:g} x {a.height_m:g} m rounded to whole cabinets: {cols} x {rows} "
            f"({cols * cab_w / 1000:g} x {rows * cab_h / 1000:g} m)")
    else:
        sys.exit("led: give --cols and --rows, or --width-m and --height-m")
    w_px, h_px = cols * cab_px_w, rows * cab_px_h
    total = w_px * h_px
    out.update({
        "cabinet_px": [cab_px_w, cab_px_h], "cabinets": [cols, rows], "cabinet_count": cols * rows,
        "pixel_map": [w_px, h_px], "total_pixels": total,
        "size_m": [round(cols * cab_w / 1000, 3), round(rows * cab_h / 1000, 3)],
        "area_m2": round(cols * cab_w * rows * cab_h / 1e6, 2),
        "effective_pitch_mm": round(eff_pitch, 3),
        "aspect": f"{ratio(w_px, h_px)[0]}:{ratio(w_px, h_px)[1]}", "aspect_decimal": round(w_px / h_px, 3),
        "family": aspect_family(w_px, h_px),
        "ports_1gbe": math.ceil(total / PORT_PX),
        "fits_one_uhd_output": total <= UHD_PX and w_px <= 3840 and h_px <= 2160,
        "viewing_distance_m": {"minimum": round(eff_pitch, 1), "comfortable": [round(2 * eff_pitch, 1), round(3 * eff_pitch, 1)]},
        "unit_scale_k": round(unit_scale(w_px, h_px), 4),
    })
    out["assumptions"].append(f"ports: ~{PORT_PX:,} px per 1 GbE port at 8 bit / 60 Hz is a typical figure; check the processor")
    if not out["fits_one_uhd_output"]:
        out["warnings"].append(
            f"{w_px}x{h_px} ({total / 1e6:.2f} MP) exceeds one 3840x2160 output: plan a canvas split across several "
            "outputs / a media-server mapping, or confirm the processor accepts it as one input")
    if w_px / h_px >= 8:
        out["warnings"].append("ultra-wide strip: compose in modules (see aspect-ratios.md), never stretch a 16:9")
    return out


def calc_projection(a):
    out = {"assumptions": [], "warnings": []}
    need("projection", lumens=a.lumens)
    pw, ph = a.res
    if a.image_width:
        img_w = a.image_width
        out["assumptions"].append(f"image width given: {img_w:g} m")
    elif a.throw and a.dist:
        img_w = a.dist / a.throw
        out["assumptions"].append(f"image width = distance / throw ratio = {a.dist:g} / {a.throw:g}")
    else:
        sys.exit("projection: give --image-width, or --throw and --dist")
    img_h = img_w * ph / pw
    px_per_m = pw / img_w
    out.update({"projector_px": [pw, ph], "image_size_m": [round(img_w, 2), round(img_h, 2)],
                "px_per_metre": round(px_per_m, 1), "mm_per_pixel": round(1000 / px_per_m, 2)})
    area = img_w * img_h
    lux = a.lumens / area
    out["illuminance_lux"] = round(lux)
    if a.ambient is not None:
        out["contrast_ratio_est"] = round(1 + lux / max(a.ambient, 0.01), 1)
        cr = out["contrast_ratio_est"]
        out["contrast_verdict"] = ("washed out: only bright, simple light forms will read" if cr < 3 else
                                   "usable for bold forms; avoid dark detail" if cr < 10 else
                                   "good: gradients and dark detail survive" if cr < 40 else "excellent (dark room)")
    if a.reflectance is not None:
        out["apparent_luminance_nits"] = round(lux * a.reflectance / math.pi)
    out["assumptions"].append("lux = lumens / image area (ideal, gain 1); contrast = 1 + projected lux / ambient lux; "
                              "nits = lux x reflectance / pi (Lambertian). Real surfaces, lens and age lower these.")
    if a.surface:
        sw, sh = a.surface
        ov = a.overlap
        step_w = img_w * (1 - ov)
        n_x = max(1, math.ceil((sw - img_w * ov) / step_w)) if sw > img_w else 1
        n_y = max(1, math.ceil((sh - img_h * ov) / (img_h * (1 - ov)))) if sh > img_h else 1
        out["surface_m"] = [sw, sh]
        out["projectors"] = {"x": n_x, "y": n_y, "total": n_x * n_y, "overlap_fraction": ov}
        out["master_canvas_px"] = [round(n_x * pw - (n_x - 1) * ov * pw), round(n_y * ph - (n_y - 1) * ov * ph)]
        out["assumptions"].append(f"tiling assumes {ov * 100:g}% overlap and the projector images placed edge to edge")
        if n_x * n_y > 1:
            out["warnings"].append("several projectors: use 'blend' for crop offsets and make every projector the same model/refresh rate (tearing)")
    return out


def calc_blend(a):
    need("blend", n=a.n, overlap=a.overlap)
    W, H = a.proj
    n, ov = a.n, a.overlap
    vertical = a.axis == "y"
    L = H if vertical else W
    if ov >= L:
        sys.exit("blend: overlap must be smaller than the projector size along the axis")
    raster = n * L
    visible = n * L - (n - 1) * ov
    discard = (n - 1) * ov / 2
    crops = [round(discard + i * (L - ov)) for i in range(n)]
    pairs = [{"projector": i + 1, "start": crops[i], "end": crops[i] + L} for i in range(n)]
    other = W if vertical else H
    out = {
        "axis": a.axis, "projector_px": [W, H], "n": n, "overlap_px": ov, "overlap_pct": round(100 * ov / L, 1),
        "content_full_raster_px": [other, raster] if vertical else [raster, other],
        "content_visible_px": [other, visible] if vertical else [visible, other],
        "discard_each_outer_edge_px": discard,
        "crop_ranges_in_full_raster": pairs,
        "assumptions": ["Bourke / TouchDesigner method: overlap pixels are doubled, so visible content = n*L - (n-1)*overlap; "
                        "discarding half the total overlap budget from each outer edge keeps the blend at the canvas centre",
                        "start with an overlap near 10% of the projector size, rounded to a power of two (e.g. 192 -> 256) and tune on site"],
        "warnings": [],
    }
    if ov / L < 0.08 or ov / L > 0.25:
        out["warnings"].append(f"overlap is {ov / L * 100:.0f}% of the projector: usual range is 10-20%")
    out["warnings"].append("never put text, faces or logos in the discarded outer edges or in the blend zone")
    if n == 1:
        out["warnings"].append("n = 1: a single projector has no blend zone; the overlap is ignored")
    return out


def ramp_table(overlap_px, gamma=2.2, power=2.0, steps=9):
    """Edge-blend alpha ramp (Bourke): smooth S curve, then the projector's inverse gamma so light adds linearly."""
    rows = []
    for i in range(steps):
        x = i / (steps - 1)
        a = 0.5 * (2 * x) ** power if x < 0.5 else 1 - 0.5 * (2 * (1 - x)) ** power
        rows.append({"x_px": round(x * overlap_px), "alpha_linear": round(a, 4), "alpha_gamma_corrected": round(a ** (1 / gamma), 4)})
    return rows


def calc_ramp(a):
    need("ramp", overlap=a.overlap, gamma=a.gamma, power=a.power)
    return {"overlap_px": a.overlap, "gamma": a.gamma, "power": a.power, "table": ramp_table(a.overlap, a.gamma, a.power),
            "assumptions": ["alpha_gamma_corrected = alpha_linear ^ (1 / gamma): multiply the projector whose image rises across the zone by this; "
                            "the neighbour that falls uses (1 - alpha_linear) ^ (1 / gamma); lift the black level of the non-overlapping area to match"]}


def calc_loop(a):
    need("loop", bpm=a.bpm, bars=a.bars, fps=a.fps)
    out = {"bpm": a.bpm, "bars": a.bars, "fps": a.fps, "warnings": []}
    if a.fps not in FPS_OK:
        out["warnings"].append(f"fps {a.fps} is not one of {FPS_OK}: the engine renders only those")
    if a.bars not in BARS_OK:
        out["warnings"].append(f"{a.bars} bars is not one of {BARS_OK}: the engine loops whole bars in that set")
    seconds = 60 / a.bpm * 4 * a.bars
    frames = seconds * a.fps
    out.update({"seconds": round(seconds, 4), "frames_exact": round(frames, 3), "frames_rounded": round(frames),
                "frame_error": round(round(frames) - frames, 3), "frames_per_beat": round(a.fps * 60 / a.bpm, 3),
                "frames_per_bar": round(a.fps * 240 / a.bpm, 3)})
    if abs(out["frame_error"]) > 0.02:
        out["warnings"].append(
            f"{a.bars} bars at {a.bpm:g} BPM / {a.fps} fps is {frames:.3f} frames: the loop closes by phase, "
            "and Resolume BPM Sync absorbs the sub-frame difference; do not change fps or bars to chase an integer")
    closes = []
    for f in FPS_OK:
        for b in BARS_OK:
            fr = 60 / a.bpm * 4 * b * f
            if abs(fr - round(fr)) < 0.01:
                closes.append({"fps": f, "bars": b, "frames": round(fr), "seconds": round(60 / a.bpm * 4 * b, 3)})
    out["integer_frame_options"] = closes
    if a.refresh:
        hz = a.refresh
        if hz % a.fps == 0:
            out["refresh"] = f"{hz} Hz is a whole multiple of {a.fps} fps: even cadence"
        else:
            ok = [f for f in FPS_OK if hz % f == 0]
            out["refresh"] = (f"{hz} Hz is not a multiple of {a.fps} fps: uneven cadence (judder). "
                              f"Allowed fps that divide {hz} evenly: {ok or 'none'}")
            out["warnings"].append(out["refresh"])
        out["tip"] = "if the media server shows each frame for 2 refreshes, 30 fps on 60 Hz is stable; check 'FPS is half refresh' style options"
    return out


def calc_aspect(a):
    need("aspect", w=a.w, h=a.h)
    w, h = a.w, a.h
    rw, rh = ratio(w, h)
    k = unit_scale(w, h)
    out = {"size_px": [w, h], "ratio": f"{rw}:{rh}", "decimal": round(w / h, 4), "family": aspect_family(w, h),
           "megapixels": round(w * h / 1e6, 2), "unit_scale_k": round(k, 4), "warnings": []}
    out["line_weight_for_2px_units"] = round(2 / k, 1)
    out["text_scale_hint"] = f"1 unit = {k:.3f} px; a 4-unit line is {4 * k:.1f} px"
    if w / h >= 2.6:
        mod = h
        out["strip_modules"] = {"module_px": mod, "count": round(w / mod, 2),
                                "hero_modules": "1-3 modules wide; never the whole strip; repeat with phase offsets"}
    if h / w >= 2.6:
        out["strip_modules"] = {"module_px": w, "count": round(h / w, 2), "hero_modules": "one idea per module, cascade vertically"}
    if k < 0.5:
        out["warnings"].append(f"k = {k:.2f}: units shrink to under half; use line weights >= {2 / k:.0f} units and large type")
    if w > 3840 or h > 2160:
        out["warnings"].append("beyond one UHD output: confirm how the pixel map reaches the processor (split outputs / mosaic)")
    return out


def calc_legibility(a):
    need("legibility", pitch=a.pitch, dist=a.dist)
    out = {"pitch_mm": a.pitch, "distance_m": a.dist, "assumptions": [
        "cap height needs a visual angle of ~0.3 deg minimum (short words, high contrast), ~0.6 deg comfortable; "
        "a line is seen reliably from ~3 arcminutes; both are rules of thumb"], "warnings": []}

    def px(angle_deg):
        mm = a.dist * 1000 * math.tan(math.radians(angle_deg))
        return round(mm), max(1, round(mm / a.pitch))

    mn_mm, mn_px = px(0.3)
    cf_mm, cf_px = px(0.6)
    line_mm = a.dist * 1000 * math.tan(math.radians(3 / 60))
    line_px = max(2, round(line_mm / a.pitch))
    # spatial frequency of a pattern with period P mm seen from D m: f = D*1000 / (57.2958 * P) cycles per degree.
    # contrast sensitivity peaks near 3-5 cpd and the eye resolves about 30 cpd at best, so:
    cpd = lambda f: a.dist * 1000 / (57.2958 * f)           # period in mm for a target frequency
    best_mm, limit_mm = cpd(4), cpd(30)
    out["pattern_period"] = {"best_read_px": max(1, round(best_mm / a.pitch)), "best_read_mm": round(best_mm),
                             "invisible_below_px": max(1, round(limit_mm / a.pitch)),
                             "note": "bold forms read best near 4 cycles/degree; periods under ~30 cycles/degree vanish or shimmer (moire on camera)"}
    out.update({"cap_height_min": {"mm": mn_mm, "px": max(mn_px, 7)}, "cap_height_comfortable": {"mm": cf_mm, "px": max(cf_px, 9)},
                "line_weight_min_px": line_px, "hairline_rule": "nothing under 2 px; anything near the pixel frequency moirés on camera"})
    if a.dist < a.pitch:
        out["warnings"].append(f"{a.dist:g} m is closer than 1 m per mm of pitch ({a.pitch:g} mm): individual pixels will show")
    if a.k:
        out["line_weight_units"] = round(line_px / a.k, 1)
        out["cap_height_comfortable_units"] = round(max(cf_px, 9) / a.k, 1)
    return out


def calc_pixelmap(a):
    need("pixelmap", px=a.px, fps=a.fps)
    if a.channels not in (3, 4):
        sys.exit("pixelmap: --channels must be 3 (RGB) or 4 (RGBW)")
    ch = a.channels
    per_u = 510 // ch if ch == 3 else 512 // ch
    universes = math.ceil(a.px / per_u)
    byts = ARTNET_BYTES if a.protocol == "artnet" else SACN_BYTES
    mbps = universes * byts * 8 * a.fps / 1e6
    out = {"pixels": a.px, "channels_per_pixel": ch, "pixels_per_universe": per_u, "universes": universes,
           "protocol": a.protocol, "fps": a.fps, "wire_mbps": round(mbps, 2), "gbe_headroom_pct": round(100 * (1 - mbps / 1000), 1),
           "payload_mbps": round(a.px * ch * 8 * a.fps / 1e6, 2), "warnings": [], "assumptions": [
               "one universe = 512 slots; 3-channel pixels use 510 (170 pixels) so no pixel splits across universes",
               "a full 512-slot DMX frame refreshes at most ~44 Hz on the wire: output 30 fps unless the controller buffers"]}
    if a.fps > 44:
        out["warnings"].append("above 44 fps only works with controllers that decouple network rate from the LED refresh")
    if mbps > 400:
        out["warnings"].append("more than 40% of a gigabit link: split the universes over several network ports / controllers")
    return out


COMMANDS = {"led": calc_led, "projection": calc_projection, "blend": calc_blend, "loop": calc_loop,
            "aspect": calc_aspect, "legibility": calc_legibility, "pixelmap": calc_pixelmap, "ramp": calc_ramp}


# ---------------------------------------------------------------- CLI
def size_pair(s):
    try:
        w, h = s.lower().replace("×", "x").split("x")
        return float(w), float(h)
    except Exception:
        raise argparse.ArgumentTypeError("expected WxH, e.g. 1920x1080")


def res_pair(s):
    w, h = size_pair(s)
    return int(w), int(h)


def build_parser():
    p = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    common = argparse.ArgumentParser(add_help=False)
    common.add_argument("--json", action="store_true", help="print JSON instead of text")
    sub = p.add_subparsers(dest="cmd", required=True)
    _add = sub.add_parser
    sub.add_parser = lambda *a, **k: _add(*a, parents=[common], **k)

    s = sub.add_parser("led")
    s.add_argument("--pitch", type=float, required=True, help="nominal pixel pitch in mm, e.g. 3.91")
    s.add_argument("--cab-w", type=float, default=500, help="cabinet width in mm (default 500)")
    s.add_argument("--cab-h", type=float, default=500, help="cabinet height in mm (default 500)")
    s.add_argument("--cab-px-w", type=int, help="real pixels per cabinet (width), from the datasheet")
    s.add_argument("--cab-px-h", type=int)
    s.add_argument("--cols", type=int)
    s.add_argument("--rows", type=int)
    s.add_argument("--width-m", type=float)
    s.add_argument("--height-m", type=float)

    s = sub.add_parser("projection")
    s.add_argument("--res", type=res_pair, default=(1920, 1080), help="projector native WxH")
    s.add_argument("--throw", type=float, help="throw ratio (distance / image width)")
    s.add_argument("--dist", type=float, help="projector to surface distance in m")
    s.add_argument("--image-width", type=float, help="image width in m (instead of throw + dist)")
    s.add_argument("--lumens", type=float, default=10000, help="ANSI lumens")
    s.add_argument("--ambient", type=float, help="ambient lux on the surface (street lamps 5-50, dark room 1)")
    s.add_argument("--reflectance", type=float, help="surface reflectance 0-1 (white plaster 0.7, brick 0.25, glass 0.05)")
    s.add_argument("--surface", type=size_pair, help="surface size WxH in m, to count projectors")
    s.add_argument("--overlap", type=float, default=0.15, help="overlap fraction between projectors (default 0.15)")

    s = sub.add_parser("blend")
    s.add_argument("--proj", type=res_pair, default=(1920, 1080))
    s.add_argument("--n", type=int, default=2)
    s.add_argument("--overlap", type=int, required=True, help="overlap in px along the axis")
    s.add_argument("--axis", choices=("x", "y"), default="x")

    s = sub.add_parser("ramp")
    s.add_argument("--overlap", type=int, required=True)
    s.add_argument("--gamma", type=float, default=2.2)
    s.add_argument("--power", type=float, default=2.0, help="ramp steepness, 1 = linear (default 2)")

    s = sub.add_parser("loop")
    s.add_argument("--bpm", type=float, required=True)
    s.add_argument("--bars", type=int, default=4)
    s.add_argument("--fps", type=int, default=30)
    s.add_argument("--refresh", type=int, help="display refresh in Hz, to check cadence")

    s = sub.add_parser("aspect")
    s.add_argument("--w", type=int, required=True)
    s.add_argument("--h", type=int, required=True)

    s = sub.add_parser("legibility")
    s.add_argument("--pitch", type=float, required=True, help="mm per pixel at the surface")
    s.add_argument("--dist", type=float, required=True, help="farthest viewing distance in m")
    s.add_argument("--k", type=float, help="engine 1080-unit scale (from 'aspect') to also print units")

    s = sub.add_parser("pixelmap")
    s.add_argument("--px", type=int, required=True)
    s.add_argument("--channels", type=int, default=3, help="3 = RGB, 4 = RGBW")
    s.add_argument("--fps", type=int, default=30)
    s.add_argument("--protocol", choices=("artnet", "sacn"), default="artnet")
    return p


def render_text(cmd, d, indent=0):
    pad = "  " * indent
    lines = []
    for k, v in d.items():
        if k in ("assumptions", "warnings"):
            continue
        if isinstance(v, dict):
            lines.append(f"{pad}{k}:")
            lines.extend(render_text(cmd, v, indent + 1))
        elif isinstance(v, list) and v and isinstance(v[0], dict):
            lines.append(f"{pad}{k}:")
            for it in v:
                lines.append(f"{pad}  - " + ", ".join(f"{a}={b}" for a, b in it.items()))
        else:
            lines.append(f"{pad}{k}: {v}")
    return lines


def main(argv=None):
    a = build_parser().parse_args(argv)
    d = COMMANDS[a.cmd](a)
    if a.json:
        print(json.dumps(d, indent=2, ensure_ascii=False))
        return d
    print(f"== {a.cmd}")
    print("\n".join(render_text(a.cmd, d)))
    for w in d.get("warnings", []):
        print(f"WARNING  {w}")
    for s in d.get("assumptions", []):
        print(f"assumed  {s}")
    return d


if __name__ == "__main__":
    main()
