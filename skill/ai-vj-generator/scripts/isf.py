#!/usr/bin/env python3
"""ISF import: ISF generators become shader layers (the engine ships an 84-shader ISF library).

  python isf.py import <file.fs> [--project P.json --comp N] [--bars 4] [--bpm 120] [--out layer.json]
  python isf.py check  <file.fs>        # says whether an ISF can be imported

ISF is a GLSL shader format with a JSON header. Import: single-pass generators only (no input image, no audio texture, no PASSES). The result is a
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


HEAD_RE = re.compile(r"/\*\s*(\{.*?\})\s*\*/", re.S)


def parse_isf(text):
    m = HEAD_RE.match(text.lstrip("﻿").lstrip())
    if not m:
        raise ValueError("no ISF JSON header")
    h = json.loads(m.group(1))
    body = text.lstrip("﻿").lstrip()[m.end():]
    return h, body


def reserved_names():
    """Names the engine already declares (hash, noise, fbm, uPulse...): an ISF that declares the same name gets isf_<name>."""
    m = re.search(r"const GL_HEAD = `(.*?)`;", engine_text(), re.S)
    head = m.group(1) if m else ""
    out = set()
    for u in re.finditer(r"uniform\s+\w+\s+([\w,\s]+);", head):
        out.update(n.strip() for n in u.group(1).split(","))
    out.update(re.findall(r"^\s*(?:float|vec\d|mat\d|int|bool)\s+(\w+)\s*\(", head, re.M))
    return out


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
    # inputs with the engine's own names (the ones `export` writes) are wired to the engine, not to p1..p4
    named = {"phase": "uPh", "loopBars": f"{float(a.bars)}", "bpm": f"{float(a.bpm)}", "bass": "uBass", "mid": "uMid", "high": "uHigh", "rms": "uRms",
             "hit": "uHit", "midhit": "uMidHit", "highhit": "uHighHit", "pres": "uPres"}
    named_col = {"c1": "uC1", "c2": "uC2", "cbg": "uBg"}
    res = reserved_names()
    for i in h.get("INPUTS", []):
        n0, ty, d = i["NAME"], i.get("TYPE"), i.get("DEFAULT")
        n = "isf_" + n0 if n0 in res else n0
        if ty == "float" and n0 in named:
            decl.append(f"float {n};"); setv.append(f"{n}={named[n0]};")
        elif ty == "color" and n0 in named_col:
            decl.append(f"vec4 {n};"); setv.append(f"{n}=vec4({named_col[n0]},1.0);")
        elif ty == "float":
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
    body = re.sub(r"^[ \t]*(?:const\s+)?float\s+TAU\s*=[^;]*;", "", body, flags=re.M)
    if res:
        body = re.sub(r"\b(" + "|".join(sorted(res)) + r")\b", r"isf_\1", body)
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
    i = sp.add_parser("import"); i.add_argument("file"); i.add_argument("--project"); i.add_argument("--comp", type=int, default=0)
    i.add_argument("--bars", type=int, default=4); i.add_argument("--bpm", type=float, default=120); i.add_argument("--out")
    c = sp.add_parser("check"); c.add_argument("file")
    a = ap.parse_args()
    try:
        r = {"import": cmd_import, "check": cmd_check}[a.cmd](a)
    except FileNotFoundError as ex:
        sys.exit(f"file not found: {ex.filename}")
    except (ValueError, json.JSONDecodeError) as ex:
        sys.exit(f"invalid file: {ex}")
    sys.exit(r or 0)


if __name__ == "__main__":
    main()
