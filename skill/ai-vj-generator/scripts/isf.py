#!/usr/bin/env python3
"""ISF bridge: export engine shader layers as ISF (.fs) and import ISF generators as shader layers.

  python isf.py export <project.json> [--comp N] [--out DIR]
  python isf.py import <file.fs> [--project P.json --comp N] [--bars 4] [--bpm 120] [--out layer.json]
  python isf.py check  <file.fs>        # says whether an ISF can be imported

ISF is the shader format that Resolume (Arena, Wire), VDMX, MadMapper and Synesthesia-like hosts load.
Export: every shader layer becomes one .fs. `phase` is the loop phase (0..1): automate it with a linear
envelope or BPM sync in the host so the loop closes exactly like in the engine.
Import: single-pass generators only (no input image, no audio texture, no PASSES). The result is a
`shader` layer with its inputs mapped to p1..p4 / colours; an audio hook is added so it obeys the
"every shader reacts to audio" rule. Keep the ISF author's CREDIT (it is copied into the layer role).
"""
import argparse, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
ENGINE = os.path.join(HERE, "..", "assets", "engine.html")
ENGINE_ALT = os.path.join(HERE, "..", "..", "..", "app", "index.html")


def read(path):
    with open(path, encoding="utf-8", newline="") as f:
        return f.read()


def engine_text():
    for p in (ENGINE, ENGINE_ALT):
        if os.path.exists(p):
            return read(p).replace("\r\n", "\n")
    sys.exit("engine.html not found (run from the skill folder)")


def engine_helpers(t):
    """GLSL helpers (hash, noise, fbm, loopv, outc, vj*...) copied from the engine so exported shaders match."""
    m = re.search(r"const GL_HEAD = `(.*?)`;", t, re.S)
    if not m:
        sys.exit("GL_HEAD not found in engine")
    lines = m.group(1).split("\n")
    i = next(k for k, l in enumerate(lines) if l.startswith("uniform vec2 uRes"))
    return "\n".join(lines[i + 1:])  # drops the precision and uniform lines; the ISF prelude replaces them


def presets(t):
    out = {}
    for m in re.finditer(r"'([^']+)': \{ labels: \[(.*?)\], d: \[(.*?)\], src:\s*\n`(.*?)` \}", t, re.S):
        out[m.group(1)] = {"d": [float(x) for x in m.group(3).split(",")], "src": m.group(4)}
    return out


PRELUDE = """// ISF prelude: maps the engine uniforms onto ISF inputs
#define uRes RENDERSIZE
#define uT TIME
#define uPh phase
#define uP vec4(p1,p2,p3,p4)
#define uC1 c1.rgb
#define uC2 c2.rgb
#define uBg cbg.rgb
#define uAlpha 1.0
#define uSeed {seed}
#define uBpm (bpm/100.0)
#define uBeat floor(phase*loopBeats)
#define uBp fract(phase*loopBeats)
#define uOnBeat exp(-uBp*8.0)
#define uPulse exp(-uBp*5.0)
#define uBass bass
#define uMid mid
#define uHigh high
#define uRms rms
#define uHit hit
#define uMidHit midhit
#define uHighHit highhit
#define uPres pres
#define uAud bass
#define uBassT (phase*loopBars)
#define uMidT (phase*loopBars)
#define uHighT (phase*loopBars)
#define uAudT (phase*loopBars)
#define uBSin (0.5+0.5*sin(TAU*phase*loopBeats))
#define uBSin2 (0.5+0.5*sin(0.5*TAU*phase*loopBeats))
#define uBSin4 (0.5+0.5*sin(0.25*TAU*phase*loopBeats))
#define uBTri (1.0-abs(2.0*fract(phase*loopBeats)-1.0))
"""


def isf_header(p, bpm, bars, desc):
    f = lambda n, lab, d, lo, hi: {"NAME": n, "LABEL": lab, "TYPE": "float", "DEFAULT": d, "MIN": lo, "MAX": hi}
    inputs = [
        f("phase", "Loop phase (0-1, automate)", 0.0, 0.0, 1.0),
        f("loopBars", "Bars per loop", float(bars), 1.0, 64.0),
        f("bpm", "BPM", float(bpm), 40.0, 240.0),
        f("p1", "P1", float(p[0]), -40.0, 40.0), f("p2", "P2", float(p[1]), -40.0, 40.0),
        f("p3", "P3", float(p[2]), -40.0, 40.0), f("p4", "P4", float(p[3]), -40.0, 40.0),
        {"NAME": "c1", "LABEL": "Colour 1", "TYPE": "color", "DEFAULT": [1, 1, 1, 1]},
        {"NAME": "c2", "LABEL": "Colour 2", "TYPE": "color", "DEFAULT": [1, 0.2, 0.2, 1]},
        {"NAME": "cbg", "LABEL": "Background", "TYPE": "color", "DEFAULT": [0, 0, 0, 1]},
    ]
    for n, d in (("bass", 0.0), ("mid", 0.0), ("high", 0.0), ("rms", 0.0), ("hit", 0.0), ("midhit", 0.0), ("highhit", 0.0), ("pres", 0.0)):
        inputs.append(f(n, "Audio " + n + " (map from host audio)", d, 0.0, 1.5))
    return {"DESCRIPTION": desc, "CREDIT": "ai-vj-generator", "ISFVSN": "2.0", "CATEGORIES": ["Generator", "Audio Reactive"], "INPUTS": inputs}


def hexrgb(h):
    h = h.lstrip("#")
    return [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)] + [1]


def cmd_export(a):
    t = engine_text()
    helpers = engine_helpers(t)
    pre = presets(t)
    proj = json.loads(read(a.project))
    bpm, bars = proj.get("time", {}).get("bpm", 120), proj.get("time", {}).get("bars", 4)
    pal = proj.get("palette", {})
    comps = proj.get("compositions", [])
    todo = [(i, c) for i, c in enumerate(comps) if a.comp is None or i == a.comp]
    os.makedirs(a.out, exist_ok=True)
    n = 0
    for ci, c in todo:
        for li, L in enumerate(c.get("layers", [])):
            if L.get("type") != "shader":
                continue
            p = L.get("p", {})
            src = (p.get("src") or "").strip()
            d = [2.2, 0.7, 0.9, 1.4]
            if not src:
                pr = pre.get(p.get("preset", "CAMPO FBM")) or pre["CAMPO FBM"]
                src, d = pr["src"], pr["d"]
            vals = [p.get(k, d[i]) for i, k in enumerate(("p1", "p2", "p3", "p4"))]
            hdr = isf_header(vals, bpm, bars, f"{proj.get('meta', {}).get('name', 'project')} / {c.get('name', ci)} / {L.get('name', li)}")
            col = lambda key, dflt: hexrgb(pal.get(p.get(key, dflt), p.get(key, dflt))) if str(p.get(key, dflt)).startswith("#") or p.get(key, dflt) in pal else hexrgb("#FFFFFF")
            for inp in hdr["INPUTS"]:
                if inp["NAME"] == "c1": inp["DEFAULT"] = col("c1", "primary")
                if inp["NAME"] == "c2": inp["DEFAULT"] = col("c2", "accent")
                if inp["NAME"] == "cbg": inp["DEFAULT"] = col("cbg", "bg")
            body = "/*" + json.dumps(hdr, indent=2) + "*/\n#define TAU 6.28318530718\n"
            body += PRELUDE.format(seed="%.3f" % ((proj.get("seed", 1) % 997) * 0.173)) + "#define loopBeats (loopBars*4.0)\n"
            body += helpers.replace("#define TAU 6.28318530718\n", "") + "\n" + src + "\n"
            name = re.sub(r"[^A-Za-z0-9._ -]+", "_", f"{proj.get('meta', {}).get('name', 'project')} {c.get('name', ci)} {L.get('name', li)}").strip() + ".fs"
            with open(os.path.join(a.out, name), "w", encoding="utf-8", newline="\n") as f:
                f.write(body)
            n += 1
            print("wrote", os.path.join(a.out, name))
    if not n:
        sys.exit("no shader layer found")
    print(f"\n{n} ISF file(s). Copy to the host's ISF folder (Resolume: Documents/Resolume Arena/ISF). Automate `phase` 0->1 over {bars} bars.")


HEAD_RE = re.compile(r"/\*\s*(\{.*?\})\s*\*/", re.S)


def parse_isf(text):
    m = HEAD_RE.match(text.lstrip("﻿").lstrip())
    if not m:
        raise ValueError("no ISF JSON header")
    h = json.loads(m.group(1))
    body = text.lstrip("﻿").lstrip()[m.end():]
    return h, body


def blockers(h, body):
    why = []
    if h.get("PASSES"):
        why.append("multi-pass / persistent buffers (PASSES): needs the V7 `sim` layer, not available yet")
    for i in h.get("INPUTS", []):
        if i.get("TYPE") in ("image", "audio", "audioFFT"):
            why.append(f"input {i.get('NAME')} is {i.get('TYPE')} (filters and audio textures are not supported; generators only)")
    if h.get("IMPORTED"):
        why.append("IMPORTED images")
    if re.search(r"\bIMG_\w+\s*\(|\bsampler2D\b|\btexture2D\b", body):
        why.append("samples textures")
    return why


def cmd_check(a):
    h, body = parse_isf(read(a.file))
    why = blockers(h, body)
    print(("NOT importable: " if why else "importable. ") + "; ".join(why))
    return 1 if why else 0


def cmd_import(a):
    text = read(a.file)
    h, body = parse_isf(text)
    why = blockers(h, body)
    if why:
        sys.exit("cannot import: " + "; ".join(why))
    secs = a.bars * 4 * 60.0 / a.bpm
    decl, setv, floats, colors, notes = [], [], [], [], []
    for i in h.get("INPUTS", []):
        n, ty, d = i["NAME"], i.get("TYPE"), i.get("DEFAULT")
        if ty == "float":
            if len(floats) < 4:
                floats.append((n, 0.0 if d is None else float(d), i)); decl.append(f"float {n};"); setv.append(f"{n}=uP.{'xyzw'[len(floats) - 1]};")
            else:
                decl.append(f"float {n};"); setv.append(f"{n}={float(d if d is not None else 0.0)};"); notes.append(f"{n} fixed at default (only p1..p4 are playable)")
        elif ty == "long":
            v = int(d if d is not None else (i.get("VALUES") or [0])[0]); decl.append(f"int {n};"); setv.append(f"{n}={v};")
        elif ty == "bool":
            decl.append(f"bool {n};"); setv.append(f"{n}={'true' if d else 'false'};")
        elif ty == "event":
            decl.append(f"bool {n};"); setv.append(f"{n}=false;")
        elif ty == "color":
            d = d or [1, 1, 1, 1]; decl.append(f"vec4 {n};")
            if len(colors) < 2:
                setv.append(f"{n}=vec4({'uC1' if not colors else 'uC2'},1.0);"); colors.append(n)
            else:
                setv.append(f"{n}=vec4({d[0]},{d[1]},{d[2]},{d[3] if len(d) > 3 else 1.0});")
        elif ty == "point2D":
            d = d or [0.5, 0.5]; decl.append(f"vec2 {n};"); setv.append(f"{n}=vec2({float(d[0])},{float(d[1])});")
        else:
            notes.append(f"input {n} of type {ty} ignored")
    sub = {
        r"\bTIME\b": f"(uPh*{secs:.6f})", r"\bTIMEDELTA\b": "(1.0/30.0)", r"\bRENDERSIZE\b": "uRes",
        r"\bFRAMEINDEX\b": f"int(floor(uPh*{secs * 30:.3f}))", r"\bPASSINDEX\b": "0", r"\b(isf|vv)_FragNormCoord\b": "(gl_FragCoord.xy/uRes)",
    }
    body = re.sub(r"^[ \t]*#define[ \t]+TAU\b.*$", "", body, flags=re.M)
    for k, v in sub.items():
        body = re.sub(k, v, body)
    body, nmain = re.subn(r"\bvoid\s+main\s*\(\s*(?:void)?\s*\)", "void isfMain()", body, count=1)
    if not nmain:
        sys.exit("no main() in the ISF")
    if re.search(r"\bgl_FragCoord\b", body) is None and "uRes" not in body:
        notes.append("shader does not read the pixel position")
    if re.search(r"\bfor\s*\([^;]*;[^;]*[<>=]\s*[A-Za-z_]", body):
        notes.append("a `for` loop bound may be a variable: WebGL1 needs constant bounds; the validator will tell")
    hook = "\nvoid main(){ " + " ".join(setv) + " isfMain(); float a=1.0+.25*uBass+.12*uMid+.1*uHigh+.2*uHit; gl_FragColor.rgb*=a; }\n"
    src = "\n".join(decl) + "\n" + body + hook
    credit = (h.get("CREDIT") or "unknown author").strip()
    layer = {"type": "shader", "name": os.path.splitext(os.path.basename(a.file))[0].upper()[:28],
             "role": f"Imported ISF generator ({h.get('DESCRIPTION', 'no description')[:80]}). Credit: {credit}. Audio hook added by the importer.",
             "on": True, "opacity": 1, "blend": "add",
             "p": {"src": src, "alphaMode": "opaque", "c1": "primary", "c2": "accent",
                   **{f"p{k + 1}": v[1] for k, v in enumerate(floats)}}}
    out = {"layer": layer, "notes": notes, "inputs_mapped": [{"isf": n, "to": f"p{k + 1}", "min": i.get("MIN"), "max": i.get("MAX"), "default": d} for k, (n, d, i) in enumerate(floats)]}
    if a.project:
        proj = json.loads(read(a.project))
        proj["compositions"][a.comp]["layers"].append(layer)
        with open(a.project, "w", encoding="utf-8", newline="\n") as f:
            json.dump(proj, f, ensure_ascii=False, indent=2)
        print(f"layer appended to {a.project} composition {a.comp}")
    path = a.out or os.path.splitext(a.file)[0] + ".layer.json"
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
    print("wrote", path)
    for n in notes:
        print("note:", n)
    print("input -> param:", ", ".join(f"{m['isf']}->{m['to']}" for m in out["inputs_mapped"]) or "none")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    sp = ap.add_subparsers(dest="cmd", required=True)
    e = sp.add_parser("export"); e.add_argument("project"); e.add_argument("--comp", type=int); e.add_argument("--out", default="isf-out")
    i = sp.add_parser("import"); i.add_argument("file"); i.add_argument("--project"); i.add_argument("--comp", type=int, default=0)
    i.add_argument("--bars", type=int, default=4); i.add_argument("--bpm", type=float, default=120); i.add_argument("--out")
    c = sp.add_parser("check"); c.add_argument("file")
    a = ap.parse_args()
    try:
        r = {"export": cmd_export, "import": cmd_import, "check": cmd_check}[a.cmd](a)
    except FileNotFoundError as ex:
        sys.exit(f"file not found: {ex.filename}")
    except (ValueError, json.JSONDecodeError) as ex:
        sys.exit(f"invalid file: {ex}")
    sys.exit(r or 0)


if __name__ == "__main__":
    main()
