#!/usr/bin/env python3
"""Cut a long stageview canvas into output-sized rows and write a Resolume Advanced Output XML (+ test pattern).

  python export_slices.py project.aivj.json [--out-size 3840x2160] [--name NAME] [--out DIR]
  python export_slices.py --size 10400x416 --folds 3744,7488 --out-size 3840x2160 --out DIR

Why: a media server or LED processor takes 3840x2160 (or 1920x1080), but a stage wall can be 4500x800 or 10400x416.
The canvas is split at the project's `canvas.folds` (physical corners first), any piece wider than the output is
split again, and the pieces are packed row by row into the output raster (extra Screens when one is full).
Files written:
  <name>.slices.xml   Resolume Arena "Advanced Output" file (File > Advanced Output > Load). Layout facts follow the
                      structure of files that Arena itself saves: one Slice per piece, InputRect = whole input,
                      OutputRect = the input rectangle moved so the wanted piece lands in place, SliceMask = the piece.
  <name>.map.json     the same mapping as data (input rect -> output screen/position) for any other tool
  <name>.stageview.png  test pattern at the INPUT size: coloured tiles with the slice number, edge ticks, the folds
Check with the pattern before the show: play stageview.png in Resolume, every tile must land on its own place.
Limits: orientation 0 only (no 90-degree rotation); Arena versions differ, so open the XML once, look at the
slices and re-save it from Arena. Always verify on the real wall.
"""
import argparse, json, os, re, struct, sys, zlib

sys.stdout.reconfigure(encoding="utf-8")


def parse_size(s):
    m = re.fullmatch(r"(\d+)\s*[x×]\s*(\d+)", s.strip())
    if not m:
        sys.exit(f"bad size {s!r}, expected WxH")
    return int(m.group(1)), int(m.group(2))


def pieces(W, folds, max_w):
    cuts = sorted({0, W, *[f for f in folds if 0 < f < W]})
    out = []
    for a, b in zip(cuts, cuts[1:]):
        n = -(-(b - a) // max_w)
        step = -(-(b - a) // n)
        x = a
        while x < b:
            out.append((x, min(step, b - x)))
            x += step
    return out


def pack(pcs, H, OW, OH):
    """row by row; returns list of (screen, in_x, w, out_x, out_y)."""
    if H > OH:
        sys.exit(f"canvas height {H} does not fit the output height {OH}: rotate/split the content or use a taller output")
    res, screen, x, y = [], 0, 0, 0
    for ix, w in pcs:
        if x + w > OW:
            x, y = 0, y + H
        if y + H > OH:
            screen, x, y = screen + 1, 0, 0
        res.append((screen, ix, w, x, y))
        x += w
    return res


def v(x, y, ind):
    return f'{ind}<v x="{x}" y="{y}"/>\n'


def rect_pts(x, y, w, h, ind):
    return v(x, y, ind) + v(x + w, y, ind) + v(x + w, y + h, ind) + v(x, y + h, ind)


RANGE = lambda n, d, val, lo, hi, ind: f'{ind}<ParamRange name="{n}" default="{d}" value="{val}"><ValueRange name="defaultRange" min="{lo}" max="{hi}"/></ParamRange>\n'


def slice_xml(uid, name, W, H, ix, w, ox, oy):
    dx, dy = ox - ix, oy
    I = " " * 24
    s = f'                    <Slice uniqueId="{uid}">\n'
    s += '                        <Params name="Common">\n' + f'{I}<Param name="Name" default="Layer" value="{name}"/>\n' + f'{I}<Param name="Enabled" default="1" value="1"/>\n                        </Params>\n'
    s += '                        <Params name="Input">\n' + f'{I}<ParamChoice name="Input Source" default="0:1" value="0:1" storeChoices="0"/>\n{I}<Param name="Input Opacity" default="1" value="1"/>\n{I}<Param name="Input Bypass/Solo" default="1" value="1"/>\n{I}<Param name="SoftEdgeEnable" default="0" value="0"/>\n                        </Params>\n'
    s += '                        <Params name="Output">\n' + f'{I}<Param name="Flip" default="0" value="0"/>\n'
    for n in ("Brightness", "Contrast", "Red", "Green", "Blue"):
        s += RANGE(n, 0, 0, -1, 1, I)
    s += f'{I}<Param name="Is Key" default="0" value="0"/>\n{I}<Param name="Black BG" default="0" value="0"/>\n'
    for n in ("BRed", "BGreen", "BBlue"):
        s += RANGE(n, 0, 0, 0, 0.4, I)
    s += '                        </Params>\n'
    s += '                        <InputRect orientation="0">\n' + rect_pts(0, 0, W, H, " " * 28) + '                        </InputRect>\n'
    s += '                        <OutputRect orientation="0">\n' + rect_pts(dx, dy, W, H, " " * 28) + '                        </OutputRect>\n'
    s += '                        <Warper>\n                            <Params name="Warper"><ParamChoice name="Point Mode" default="PM_LINEAR" value="PM_LINEAR" storeChoices="0"/></Params>\n'
    s += '                            <BezierWarper controlWidth="4" controlHeight="4">\n                                <vertices>\n'
    for j in range(4):
        for i in range(4):
            s += v(round(dx + W * i / 3), round(dy + H * j / 3), " " * 36)
    s += '                                </vertices>\n                            </BezierWarper>\n                            <Homography>\n                                <src>\n' + rect_pts(0, 0, W, H, " " * 36)
    s += '                                </src>\n                                <dst>\n' + rect_pts(dx, dy, W, H, " " * 36) + '                                </dst>\n                            </Homography>\n                        </Warper>\n'
    s += '                        <SliceMask>\n                            <Params name="Input Mask">\n' + f'{I}<Param name="Name" default="Mask" value="Mask"/>\n{I}<Param name="Enabled" default="1" value="1"/>\n{I}<Param name="Invert" default="1" value="1"/>\n                            </Params>\n'
    s += '                            <ShapeObject>\n                                <Params name="Shape">\n                                    <ParamChoice name="Point Mode" default="PM_LINEAR" value="PM_LINEAR" storeChoices="0"/>\n                                </Params>\n'
    s += '                                <Rect orientation="0">\n' + rect_pts(ix, 0, w, H, " " * 36) + '                                </Rect>\n'
    s += '                                <Shape>\n                                    <Contour closed="1">\n                                        <points>\n' + v(ix, 0, " " * 44) + v(ix, H, " " * 44) + v(ix + w, H, " " * 44) + v(ix + w, 0, " " * 44)
    s += '                                        </points>\n                                        <segments>LLLL</segments>\n                                    </Contour>\n                                </Shape>\n                            </ShapeObject>\n                        </SliceMask>\n                    </Slice>\n'
    return s


def build_xml(name, W, H, OW, OH, placed):
    screens = sorted({p[0] for p in placed})
    x = f'<?xml version="1.0" encoding="utf-8"?>\n<XmlState name="{name}">\n    <versionInfo name="Resolume Arena" majorVersion="5" minorVersion="0" microVersion="0" revision="00000"/>\n'
    x += '    <ScreenSetup name="ScreenSetup">\n        <Params name="ScreenSetupParams"/>\n        <sizing>\n            <inputs>\n' + f'                <InputSize name="0:1" width="{W}" height="{H}"/>\n            </inputs>\n        </sizing>\n        <screens>\n'
    uid = 1000
    for sc in screens:
        x += f'            <Screen name="Output #{sc + 1}" uniqueId="{14150 + sc}">\n                <Params name="Params">\n                    <Param name="Name" default="" value="Output #{sc + 1}"/>\n                    <Param name="Enabled" default="1" value="1"/>\n                    <Param name="Hidden" default="0" value="0"/>\n                </Params>\n'
        x += '                <Params name="Output">\n' + RANGE("Opacity", 1, 1, 0, 1, " " * 20) + "".join(RANGE(n, 0, 0, -1, 1, " " * 20) for n in ("Brightness", "Contrast", "Red", "Green", "Blue")) + '                </Params>\n                <layers>\n'
        for k, (s_, ix, w, ox, oy) in enumerate(placed):
            if s_ != sc:
                continue
            uid += 1000
            x += slice_xml(uid, f"{name} {k + 1:02d}", W, H, ix, w, ox, oy)
        x += '                </layers>\n                <OutputDevice>\n' + f'                    <OutputDeviceVirtual name="Virtual" deviceId="Virtual" idHash="0" width="{OW}" height="{OH}">\n                        <Params name="Params">\n'
        x += RANGE("Width", 1920, OW, 1, 32768, " " * 28) + RANGE("Height", 1080, OH, 1, 32768, " " * 28) + '                        </Params>\n                    </OutputDeviceVirtual>\n                </OutputDevice>\n            </Screen>\n'
    x += '        </screens>\n        <SoftEdging>\n            <Params name="Soft Edge">\n'
    x += RANGE("Gamma Red", 2, 2, 1, 3, " " * 16) + RANGE("Gamma Green", 2, 2, 1, 3, " " * 16) + RANGE("Gamma Blue", 2, 2, 1, 3, " " * 16) + RANGE("Gamma", 1, 1, 0, 1, " " * 16) + RANGE("Luminance", 0.5, 0.5, 0, 1, " " * 16) + RANGE("Power", 2, 2, 0.1, 7, " " * 16)
    return x + '            </Params>\n        </SoftEdging>\n    </ScreenSetup>\n</XmlState>\n'


FONT = {"0": "111101101101111", "1": "010110010010111", "2": "111001111100111", "3": "111001111001111", "4": "101101111001001", "5": "111100111001111", "6": "111100111101111", "7": "111001001001001", "8": "111101111101111", "9": "111101111001111"}
PAL = [(230, 57, 70), (42, 157, 143), (244, 162, 97), (69, 123, 157), (168, 218, 220), (233, 196, 106), (131, 56, 236), (6, 214, 160)]


def write_png(path, w, h, rows):
    raw = b"".join(b"\x00" + bytes(r) for r in rows)
    def ch(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xFFFFFFFF)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + ch(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 2, 0, 0, 0)) + ch(b"IDAT", zlib.compress(raw, 6)) + ch(b"IEND", b""))


def pattern(path, W, H, placed):
    img = [[(18, 18, 18)] * W for _ in range(H)]
    scale = max(2, min(H // 12, 48) // 5)
    for k, (_, ix, w, _, _) in enumerate(placed):
        c = PAL[k % len(PAL)]
        for y in range(H):
            row = img[y]
            for x in range(ix, ix + w):
                edge = x - ix < 4 or ix + w - x <= 4 or y < 4 or H - y <= 4
                row[x] = (255, 255, 255) if edge else tuple(int(v * (0.55 if (x // 40 + y // 40) % 2 else 0.7)) for v in c)
        txt = str(k + 1)
        gx, gy = ix + 12, 12
        for di, d in enumerate(txt):
            for r in range(5):
                for q in range(3):
                    if FONT[d][r * 3 + q] == "1":
                        for yy in range(scale):
                            for xx in range(scale):
                                px, py = gx + (di * 4 + q) * scale + xx, gy + r * scale + yy
                                if px < W and py < H:
                                    img[py][px] = (255, 255, 255)
    write_png(path, W, H, [bytes(c for px in row for c in px) for row in img])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("project", nargs="?")
    ap.add_argument("--size"); ap.add_argument("--folds", default="")
    ap.add_argument("--out-size", default="3840x2160"); ap.add_argument("--name"); ap.add_argument("--out", default="slices-out")
    a = ap.parse_args()
    if a.project:
        pr = json.load(open(a.project, encoding="utf-8"))
        c = pr.get("canvas", {})
        W, H, folds = int(c.get("w", 1920)), int(c.get("h", 1080)), [int(x) for x in c.get("folds", [])]
        name = a.name or pr.get("meta", {}).get("name", "project")
    elif a.size:
        W, H = parse_size(a.size); folds = [int(x) for x in a.folds.split(",") if x.strip()]; name = a.name or "stageview"
    else:
        ap.error("give a project file or --size")
    name = re.sub(r'[<>&"]', "", name)
    OW, OH = parse_size(a.out_size)
    pcs = pieces(W, folds, OW)
    placed = pack(pcs, H, OW, OH)
    assert sum(p[2] for p in placed) == W
    os.makedirs(a.out, exist_ok=True)
    base = os.path.join(a.out, re.sub(r"[^\w.-]+", "_", name))
    open(base + ".slices.xml", "w", encoding="utf-8", newline="\n").write(build_xml(name, W, H, OW, OH, placed))
    mp = [{"slice": k + 1, "screen": s + 1, "input": {"x": ix, "y": 0, "w": w, "h": H}, "output": {"x": ox, "y": oy}} for k, (s, ix, w, ox, oy) in enumerate(placed)]
    json.dump({"input": [W, H], "output": [OW, OH], "folds": folds, "slices": mp}, open(base + ".map.json", "w", encoding="utf-8"), indent=2)
    pattern(base + ".stageview.png", W, H, placed)
    scr = len({p[0] for p in placed})
    print(f"input {W}x{H} -> {len(placed)} slice(s) on {scr} output screen(s) of {OW}x{OH}")
    for m in mp:
        print(f"  slice {m['slice']:02d}  input x {m['input']['x']}..{m['input']['x'] + m['input']['w']}  ->  screen {m['screen']} at ({m['output']['x']}, {m['output']['y']})")
    print(f"pixels: input {W * H}, output used {sum(p[2] * H for p in placed)} of {scr * OW * OH}")
    print("wrote", base + ".slices.xml", base + ".map.json", base + ".stageview.png")


if __name__ == "__main__":
    main()
