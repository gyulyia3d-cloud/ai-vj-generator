#!/usr/bin/env python3
"""Static validation of a PROJECT JSON before it is built or delivered.

usage: python validate_project.py project.aivj.json [--assets pasta]

--assets pasta  conta os arquivos dessa pasta como ja embutidos (a mesma pasta de make-artifact --assets).

Checks what the engine would silently ignore or only report once the interface
is open: unknown layer types, misspelled or out-of-range parameters, illegal FPS
and loop lengths, GLSL ES 1.00 pitfalls in custom shaders, and signs that the
project was not generated from its own briefing (generic composition names, a
stock palette, an example's name, near-identical compositions). For schema
ai-vj-generator/2 it also checks the creative contract (meta.contract), layer
roles, the audio hierarchy (at most 3 reactive layers per composition) and the
honesty of the capabilities block (OSC, NDI, Spout, Syphon, SDI, MIDI and WebSocket are out of scope).

Exit code 1 when there are errors. It cannot compile GLSL: open the HTML and read
the validation panel for that. It reads the parameter registry from ../assets/engine.html.
"""
import json, os
import re
import shutil
import subprocess
import sys
from pathlib import Path

ENGINE = Path(__file__).resolve().parent.parent / "assets" / "engine.html"
BLENDS = {"normal", "add", "screen", "multiply", "difference", "overlay", "lighten"}
GENERIC = {"structure", "flow", "density", "rhythm", "transformation", "estrutura", "fluxo", "densidade",
           "ritmo", "transformação", "transformacao", "composition", "composição", "comp"}
EXAMPLE_NAMES = {"noite filotaxia", "passagem de turno", "pergunta e resposta", "régua do turno", "órbita", "deriva", "maré", "espiral", "resíduo",
                 "prensa", "calor", "malha", "golpe", "fratura", "exemplo de formato v4", "régua vazia", "acúmulo", "rompimento"}
COLOR_WORDS = {"bg", "primary", "secondary", "accent", "field", "none", "auto"}
# camada de código: mesmo filtro do motor (não é uma caixa de areia, é para pegar erro e relógio real)
CODE_LINT = [
    (r"\bMath\s*\.\s*random\b", "Math.random is forbidden: rendering must be deterministic. Use K.rand(i, k) or K.rng(seed)."),
    (r"\b(Date|performance|setTimeout|setInterval|requestAnimationFrame)\b", "real-time clocks are forbidden: use K.t (frame, loop phase, beat)."),
    (r"\b(window|document|globalThis|fetch|XMLHttpRequest|WebSocket|localStorage|sessionStorage|indexedDB|navigator|Worker|importScripts|postMessage|WebAssembly|SharedArrayBuffer)\b", "page, network and storage access is forbidden in a code layer."),
    (r"\b(self|parent|top|location|opener|frames)\s*[.\[]", "access to self/parent/top/location is forbidden."),
    (r"\beval\b|\bFunction\b|\bimport\b|\brequire\b|\bprocess\b|\bReflect\b|\bProxy\b", "eval, Function, import, Reflect and Proxy are forbidden."),
    (r"\bconstructor\b|__proto__|\bprototype\b|\bgetPrototypeOf\b", "constructor, prototype and __proto__ are forbidden."),
]
VAR_TYPES = {"n", "s", "b", "c", "t"}
ASSET_KEYS = re.compile(r"^media\d?$")


def load_registry():
    src = ENGINE.read_text(encoding="utf-8")
    reg = {}

    def parse_params(text):
        params = {}
        for m in re.finditer(r"N\('(\w+)',\s*'[^']*',\s*(-?[\d.]+),\s*(-?[\d.]+),\s*(-?[\d.]+)", text):
            params[m.group(1)] = ("n", float(m.group(3)), float(m.group(4)))
        for m in re.finditer(r"S\('(\w+)',\s*'[^']*',\s*(?:'[^']*'),\s*\[([^\]]*)\]", text):
            opts = re.findall(r"'([^']*)'", m.group(2))
            params[m.group(1)] = ("s", opts)
        for m in re.finditer(r"([SCBT])\('(\w+)'", text):
            params.setdefault(m.group(2), {"S": ("s", None), "C": ("c",), "B": ("b",), "T": ("t",)}[m.group(1)])
        return params

    common = {}
    cm = re.search(r"const COMMON = \{(.*?)\n\};", src, re.S)
    if cm:
        common = parse_params(cm.group(1))
    media = {}
    mm = re.search(r"const MEDIA_P = \[(.*?)\];", src, re.S)
    if mm:
        media = parse_params(mm.group(1))
    for m in re.finditer(r"reg\('(\w+)',\s*'[^']*',\s*'\w+',\s*\[(.*?)\],\s*\(c, R\)\s*=>", src, re.S):
        body = m.group(2)
        p = parse_params(body)
        if "...MEDIA_P" in body:
            p.update(media)
        reg[m.group(1)] = p
    pal = []
    for m in re.finditer(r"bg: '(#\w+)', primary: '(#\w+)', secondary: '(#\w+)', accent: '(#\w+)'", src):
        pal.append(tuple(x.upper() for x in m.groups()))
    return reg, common, pal


GLSL_LIB = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "references", "glsl-lib", "lib.glsl")


def glsl_modules():
    mods, cur = {}, None
    try:
        lines = open(GLSL_LIB, encoding="utf-8").read().replace("\r\n", "\n").split("\n")
    except OSError:
        return mods
    for line in lines:
        m = re.match(r"^//@module\s+(\S+)(?:\s+requires\s+(.+))?$", line)
        if m:
            cur = mods[m.group(1)] = {"req": re.split(r"[\s,]+", m.group(2).strip()) if m.group(2) else [], "src": []}
        elif cur is not None and not line.startswith("//@doc") and line.strip():
            cur["src"].append(line.strip())
    return mods


def expand_includes(code, where, out):
    """#include name pulls a module from references/glsl-lib/lib.glsl (same expansion as the engine)."""
    pat = re.compile(r"^[ \t]*#include[ \t]+([\w.]+)[ \t]*$", re.M)
    want = pat.findall(code)
    if not want:
        return code
    mods, seen, body = glsl_modules(), set(), []

    def add(n):
        if n in seen:
            return
        seen.add(n)
        if n not in mods:
            out["errors"].append(f"{where}: unknown GLSL module '{n}' (known: {', '.join(sorted(mods))})")
            return
        for r in mods[n]["req"]:
            add(r)
        body.append(" ".join(mods[n]["src"]))
    for n in want:
        add(n)
    first = [True]

    def sub(_):
        if first[0]:
            first[0] = False
            return " ".join(body)
        return ""
    return pat.sub(sub, code)


def lint_glsl(code, where, out):
    code = expand_includes(code, where, out)
    e, w = out["errors"], out["warnings"]
    if not re.search(r"void\s+main\s*\(\s*\)", code):
        e.append(f"{where}: no void main()")
    if "gl_FragColor" not in code:
        e.append(f"{where}: never writes gl_FragColor (use outc(color, coverage))")
    if code.count("{") != code.count("}"):
        e.append(f"{where}: unbalanced braces")
    if code.count("(") != code.count(")"):
        e.append(f"{where}: unbalanced parentheses")
    if re.search(r"#version|texture2D|sampler2D|\bin\s+vec|\bout\s+vec|\blayout\b", code):
        e.append(f"{where}: not WebGL 1 / GLSL ES 1.00 (#version, texture2D, sampler, in/out qualifiers are not available)")
    if re.search(r"(?<![\w.])\d+\s*%\s*\d+|\b\w+\s%\s\w+", code):
        e.append(f"{where}: integer '%' does not exist in GLSL ES 1.00; use mod(x, y) with floats")
    for m in re.finditer(r"\bfloat\s+\w+\s*=\s*-?\d+\s*;", code):
        e.append(f"{where}: '{m.group(0)}' assigns an int literal to a float; write it with a decimal point (e.g. 1.0)")
    for m in re.finditer(r"for\s*\(\s*int\s+\w+\s*=\s*[^;]+;\s*\w+\s*[<>=!]+\s*([^;]+);", code):
        bound = m.group(1).strip()
        if re.search(r"\bu[A-Z]\w*|\buP\b", bound):
            e.append(f"{where}: loop bound '{bound}' depends on a uniform; ES 1.00 loops need constant bounds")
    if re.search(r"\w+\[\s*[a-z]\w*\s*\]", code) and "for" not in code:
        w.append(f"{where}: dynamic array indexing is restricted in ES 1.00")
    if re.search(r"\buT\b", code):
        w.append(f"{where}: uses uT (seconds); motion driven by uT does not close the loop. Use uPh times a whole number, or loopv(r)")
    if re.search(r"\b(random|Math\.random|rand\s*\()", code):
        w.append(f"{where}: unseeded randomness; use hash(...) with uSeed so the piece is reproducible")
    if not re.search(r"\b(outc|uAlpha)\b", code):
        w.append(f"{where}: does not use outc(); alpha export may not be transparent")
    if re.search(r"\buSeed\b", code) is None and re.search(r"\bhash\s*\(|\bnoise\s*\(|\bfbm\s*\(", code):
        w.append(f"{where}: uses hash/noise/fbm without uSeed; the same project will look identical across seeds")
    if len(code) > 6000:
        w.append(f"{where}: shader is {len(code)} characters; long shaders are costly on a large canvas")


def check_code(L, where, out):
    e, w = out["errors"], out["warnings"]
    src = str((L.get("p") or {}).get("src", ""))
    if not src.strip():
        e.append(f"{where}: code layer with no p.src draws the engine's default sample; write the body of draw(c, K)")
        return
    for pat, msg in CODE_LINT:
        if re.search(pat, src):
            e.append(f"{where}.src: {msg}")
    node = shutil.which("node")
    if node and not out["errors"]:
        js = "const s=require('fs').readFileSync(0,'utf8');try{new Function('c','K','Math','\"use strict\";\\n'+s)}catch(e){console.log(e.message);process.exit(1)}"
        r = subprocess.run([node, "-e", js], input=src, capture_output=True, text=True)
        if r.returncode:
            e.append(f"{where}.src: syntax error: {r.stdout.strip() or r.stderr.strip()[:200]}")
    if len(src) > 12000:
        w.append(f"{where}.src: {len(src)} characters; long drawing code is hard to tune. Split it across layers.")
    if not re.search(r"K\.(t|walls|v)\b", src):
        w.append(f"{where}.src: never reads K.t, K.walls or K.v; the layer is static and ignores the BPM and the wall geometry")
    vars_ = L.get("vars") or []
    if not isinstance(vars_, list):
        e.append(f"{where}.vars must be a list")
        return
    seen = set()
    for v in vars_:
        k = v.get("k") if isinstance(v, dict) else None
        if not k or not re.fullmatch(r"[A-Za-z_]\w*", str(k)):
            e.append(f"{where}.vars: invalid key {k!r}")
            continue
        if k in seen:
            e.append(f"{where}.vars: duplicate key {k!r}")
        seen.add(k)
        if v.get("t", "n") not in VAR_TYPES:
            e.append(f"{where}.vars.{k}: t must be one of {sorted(VAR_TYPES)}")
        if v.get("t", "n") == "n" and not all(isinstance(v.get(x), (int, float)) for x in ("d", "min", "max")):
            w.append(f"{where}.vars.{k}: numeric variable needs d, min and max")
    for k in (L.get("p") or {}):
        if k.startswith("v_") and k[2:] not in seen:
            w.append(f"{where}.p.{k}: no variable '{k[2:]}' is declared in vars")


def check_param(reg_def, key, val, where, out):
    e, w = out["errors"], out["warnings"]
    d = reg_def.get(key)
    if d is None:
        w.append(f"{where}: unknown parameter '{key}' (the engine ignores it silently; check the spelling in project-schema.md)")
        return
    kind = d[0]
    if kind == "n":
        if not isinstance(val, (int, float)) or isinstance(val, bool):
            e.append(f"{where}.{key}: expected a number, got {val!r}")
        elif not (d[1] <= val <= d[2]):
            w.append(f"{where}.{key}: {val} is outside the UI range {d[1]}..{d[2]} (the engine accepts it, but the slider will clamp when the user touches it)")
    elif kind == "s" and d[1]:
        if str(val) not in d[1]:
            e.append(f"{where}.{key}: {val!r} is not one of {d[1]}")
    elif kind == "b" and not isinstance(val, bool):
        e.append(f"{where}.{key}: expected true/false, got {val!r}")
    elif kind == "c":
        if not (isinstance(val, str) and (val in COLOR_WORDS or re.fullmatch(r"#[0-9a-fA-F]{6}", val))):
            e.append(f"{where}.{key}: color must be bg/primary/secondary/accent or #RRGGBB, got {val!r}")


SCHEMAS = ("ai-vj-generator/1", "ai-vj-generator/2")
AUDIO_UNIFORMS = re.compile(r"\b(uBass|uMid|uHigh|uRms|uHit|uAud|uMidHit|uHighHit|uBassT|uMidT|uHighT|uAudT|uPres|uOnBeat|uBSin|uBSin2|uBSin4|uBTri)\b")
MOD_SRC = {"bass", "mid", "high", "rms", "hit", "mhit", "hhit", "pres", "kick", "onset", "flux", "onbeat", "bsin", "bsin2", "bsin4", "btri", "lfo"}
MOD_FREE = {"lfo", "onbeat", "bsin", "bsin2", "bsin4", "btri"}
DEFAULT_LAYER_NAMES = {"SHADER", "FORMA", "TEXTO", "IMAGEM", "VÍDEO", "VIDEO", "FUNDO", "LAYER", "CAMADA", "SHAPE", "TEXT", "IMAGE"}
CONTRACT_KEYS = ("concept", "audienceEffect", "semioticIntent", "visualLanguage", "formLanguage", "materialLanguage",
                 "colorLogic", "spatialLogic", "motionLanguage", "typographyLanguage", "temporalArc", "loopGrammar",
                 "technicalStrategy", "forbiddenShortcuts", "layerBudget", "audioStrategyReason", "focalEvent", "releaseZone", "banned", "tension", "imperfection")
CONTRACT_REQUIRED = ("concept", "audienceEffect", "semioticIntent", "visualLanguage", "colorLogic", "spatialLogic",
                     "motionLanguage", "temporalArc", "loopGrammar", "technicalStrategy", "forbiddenShortcuts")
LOOP_GRAMMARS = ("cyclic", "morphological", "continuous", "event", "evolutionary")
# outside the product scope (references/capabilities.md): may only appear under notSupported
OUT_OF_SCOPE = {"osc", "ndi", "spout", "syphon", "sdi", "midi", "websocket", "hap", "mapping", "projectionmapping", "pixelmapgeneration", "blueprintgeneration"}
# legacy labels (schema 2 before 3.1): accepted, treated as notSupported, reported as deprecated
LEGACY_CAP = {"requiresBridge": "notSupported", "conceptual": "notSupported"}


ART_BIBLE_KEYS = ("thesis", "material", "space", "motion", "dramaturgy", "color", "typography", "audio", "banned")
ART_BIBLE_OPTIONAL = ("motionProfile", "density")
MOTION_AXES = ("energy", "elasticity", "anticipation", "continuity", "rhythm")


def check_art_bible(meta, out):
    """Phase 2: the one-page art bible (references/art-bible.md) and the motion profile that executes its 'motion' line."""
    e, w = out["errors"], out["warnings"]
    b = meta.get("artBible")
    if b is None:
        w.append("no meta.artBible: write the art bible (thesis, material, space, motion, dramaturgy, color, typography, audio, banned) from the contract (references/art-bible.md)")
        return
    if not isinstance(b, dict):
        e.append("meta.artBible must be an object")
        return
    for k in b:
        if k not in ART_BIBLE_KEYS + ART_BIBLE_OPTIONAL:
            w.append(f"meta.artBible.{k}: unknown field (known: {', '.join(ART_BIBLE_KEYS + ART_BIBLE_OPTIONAL)})")
    for k in ART_BIBLE_KEYS:
        v = b.get(k)
        if not isinstance(v, str) or not v.strip():
            w.append(f"meta.artBible.{k} is empty")
        elif len(v.strip().split()) < 3:
            w.append(f"meta.artBible.{k}: '{v.strip()}' is too thin; say what and why in a sentence")
    if b.get("density") is not None and b["density"] not in ("sparse", "balanced", "dense"):
        e.append("meta.artBible.density: must be sparse, balanced or dense")
    mp = b.get("motionProfile")
    if mp is not None:
        if not isinstance(mp, dict):
            e.append("meta.artBible.motionProfile must be an object")
        else:
            for ax in MOTION_AXES:
                v = mp.get(ax)
                if not isinstance(v, (int, float)) or isinstance(v, bool) or not (0 <= v <= 1):
                    e.append(f"meta.artBible.motionProfile.{ax}: must be a number 0..1")


def check_typeset(L, where, out):
    """typeset reveals title, caption and data in a cascade that must finish before the exit starts, or the text is never fully on screen."""
    w, p = out["warnings"], L.get("p") or {}
    lv = sum(1 for k in ("title", "caption", "data") if str(p.get(k, "TÍTULO" if k == "title" else "")).strip())
    if lv == 0:
        w.append(f"{where}: typeset has no text (title, caption and data are all empty)")
        return
    if p.get("reveal", "glyph") == "none":
        return
    t_in, t_len, t_out, cas = (p.get(k, d) for k, d in (("inAt", 0.08), ("inLen", 0.18), ("outLen", 0.16), ("cascade", 0.07)))
    last_full = t_in + cas * (lv - 1) + t_len
    if last_full > 1 - t_out:
        w.append(f"{where}: the last level is fully on only at {last_full:.2f} of the loop but the exit starts at {1 - t_out:.2f}; lower inAt, inLen or cascade, or shorten outLen")
    if p.get("path") == "circle" and p.get("drift") not in (None, 0) and float(p["drift"]) != int(p["drift"]):
        w.append(f"{where}: drift must be a whole number of turns per loop, or the loop does not close (the engine rounds it)")


def check_contract(meta, out):
    """Schema 2: the creative contract written before the code (references/creative-contract.md)."""
    e, w = out["errors"], out["warnings"]
    c = meta.get("contract")
    if c is None:
        w.append("schema 2 project has no meta.contract: write the creative contract (references/creative-contract.md) before the layers")
        return
    if not isinstance(c, dict):
        e.append("meta.contract must be an object")
        return
    for k in c:
        if k not in CONTRACT_KEYS:
            w.append(f"meta.contract.{k}: unknown field (known: {', '.join(CONTRACT_KEYS)})")
    for k in CONTRACT_REQUIRED:
        v = c.get(k)
        txt = " ".join(v) if isinstance(v, list) else str(v or "")
        if not txt.strip():
            w.append(f"meta.contract.{k} is empty")
        elif len(txt.strip()) < 12:
            w.append(f"meta.contract.{k}: '{txt.strip()}' is too thin to trace a decision to; say what and why for this briefing")
    lg = str(c.get("loopGrammar", "")).lower()
    if lg and not any(g in lg for g in LOOP_GRAMMARS):
        w.append(f"meta.contract.loopGrammar should name one of {', '.join(LOOP_GRAMMARS)}")
    if not str(c.get("banned", "")).strip() and not c.get("banned"):
        w.append("meta.contract.banned is empty: list the effects this piece must NOT use (references/tension-and-release.md §4)")
    if not str(c.get("focalEvent", "")).strip():
        w.append("meta.contract.focalEvent is empty: name the one dominant event of the piece (references/tension-and-release.md §1)")


def check_capabilities(cap, out):
    """Capability honesty (references/capabilities.md): supported, exportable, inputOnly, notSupported."""
    e, w = out["errors"], out["warnings"]
    if cap is None:
        return
    if not isinstance(cap, dict):
        e.append("capabilities must be an object with supported / exportable / inputOnly / notSupported lists")
        return
    for k, v in cap.items():
        if k in LEGACY_CAP:
            w.append(f"capabilities.{k}: deprecated label, read as {LEGACY_CAP[k]} (migration: move the items to capabilities.notSupported)")
        elif k not in ("supported", "exportable", "inputOnly", "notSupported"):
            w.append(f"capabilities.{k}: unknown label (use supported, exportable, inputOnly, notSupported)")
        if not isinstance(v, list):
            e.append(f"capabilities.{k} must be a list")
            continue
        if k in ("supported", "exportable", "inputOnly"):
            for item in v:
                n = str(item).lower().replace("-", "").replace("_", "").replace(" ", "")
                if n in OUT_OF_SCOPE:
                    e.append(f"capabilities.{k}: '{item}' is outside the product scope; list it under notSupported or remove it")


SPEC_KEYS = ("archetype", "confirmed", "derived", "zones", "assumed", "show", "risks")
SPEC_ARCHETYPES = ("stage-led", "led-architecture", "facade-mapping", "clip-pack",
                   "broadcast-xr", "installation", "corporate", "social")
# archetypes removed from the product scope (3.1): old projects still open, with a warning
LEGACY_ARCHETYPES = {"object-mapping": "object mapping", "immersive": "immersive room or dome", "dooh": "DOOH"}
PHYSICAL_TARGETS = ("led", "projection", "mapping", "multi")


def check_spec(meta, cv, tm, out):
    """Schema 2: the production spec written by the brief diagnosis (references/briefing/diagnosis.md)."""
    e, w, n = out["errors"], out["warnings"], out["notes"]
    s = meta.get("spec")
    if s is None:
        if cv.get("target") in PHYSICAL_TARGETS:
            w.append(f"canvas.target is '{cv.get('target')}' but the project has no meta.spec: run the brief diagnosis "
                     "(references/briefing/diagnosis.md) and record the confirmed and assumed surface facts")
        return
    if not isinstance(s, dict):
        e.append("meta.spec must be an object")
        return
    for k in s:
        if k not in SPEC_KEYS:
            w.append(f"meta.spec.{k}: unknown field (known: {', '.join(SPEC_KEYS)})")
    arch = s.get("archetype", [])
    arch = [arch] if isinstance(arch, str) else arch
    if not isinstance(arch, list) or not arch:
        w.append("meta.spec.archetype should name at least one of: " + ", ".join(SPEC_ARCHETYPES))
    else:
        for a in arch:
            if a in LEGACY_ARCHETYPES:
                w.append(f"meta.spec.archetype '{a}' ({LEGACY_ARCHETYPES[a]}) is outside the product scope since 3.1; pick one of: {', '.join(SPEC_ARCHETYPES)}")
            elif a not in SPEC_ARCHETYPES:
                w.append(f"meta.spec.archetype '{a}' is not one of: {', '.join(SPEC_ARCHETYPES)}")
    conf = s.get("confirmed", {})
    if not isinstance(conf, dict):
        e.append("meta.spec.confirmed must be an object")
        conf = {}
    pm = conf.get("pixelMap")
    if pm is not None:
        if not (isinstance(pm, list) and len(pm) == 2 and all(isinstance(x, int) and x > 0 for x in pm)):
            e.append("meta.spec.confirmed.pixelMap must be [width, height] in whole pixels")
        elif cv.get("w") and cv.get("h") and (pm[0] != cv["w"] or pm[1] != cv["h"]):
            e.append(f"meta.spec.confirmed.pixelMap {pm[0]}x{pm[1]} disagrees with canvas {cv['w']}x{cv['h']}: "
                     "the canvas must be the confirmed pixel map (for blended projectors, the visible content size)")
    pitch = conf.get("pitchMm")
    if pitch is not None and cv.get("pitch") is not None and abs(float(cv["pitch"]) - float(pitch)) > 0.05:
        w.append(f"meta.spec.confirmed.pitchMm {pitch} differs from canvas.pitch {cv['pitch']}")
    dist = conf.get("viewingDistanceM")
    if dist is not None and pitch:
        far = max(dist) if isinstance(dist, list) else dist
        near = min(dist) if isinstance(dist, list) else dist
        if near < float(pitch):
            w.append(f"nearest viewing distance {near} m is under 1 m per mm of pitch ({pitch} mm): pixels will show")
        n.append(f"spec: farthest read {far} m at {pitch} mm pitch; run scripts/surface_calc.py legibility for the minimum text and line weight")
    zones = s.get("zones", {})
    if zones and not isinstance(zones, dict):
        e.append("meta.spec.zones must be an object of named {x, y, w, h} rectangles (fractions of the canvas)")
    elif isinstance(zones, dict):
        for name, z in zones.items():
            for zz in (z if isinstance(z, list) else [z]):
                if name == "ignore" and not zz:
                    continue
                if not (isinstance(zz, dict) and all(isinstance(zz.get(k), (int, float)) and 0 <= zz.get(k) <= 1 for k in ("x", "y", "w", "h"))):
                    e.append(f"meta.spec.zones.{name}: needs x, y, w, h as fractions 0..1 of the canvas")
                    break
    asm = s.get("assumed", [])
    if asm and not isinstance(asm, list):
        e.append("meta.spec.assumed must be a list of {field, value, why, risk}")
    elif isinstance(asm, list):
        for a in asm:
            if not isinstance(a, dict) or not a.get("field") or not a.get("why"):
                w.append("meta.spec.assumed entries need a field and a why (and ideally a risk)")
                break
        if asm:
            n.append(f"spec: {len(asm)} assumption(s) recorded; confirm them with the user or the venue")
    show = s.get("show", {})
    if isinstance(show, dict) and isinstance(show.get("bpm"), list) and len(show["bpm"]) == 2 and tm.get("bpm"):
        lo, hi = show["bpm"]
        if not (lo - 1 <= tm["bpm"] <= hi + 1):
            w.append(f"time.bpm {tm['bpm']} is outside spec.show.bpm {lo}-{hi}")
    if isinstance(show, dict) and isinstance(show.get("bpm"), list) and len(show["bpm"]) == 2 and show["bpm"][0] != show["bpm"][1]:
        n.append("spec: the show spans a BPM range; prefer a tempo-independent loop (phase-driven motion, loops that close at any tempo)")


STRATEGIES = ("none", "subtle", "structural", "rhythmic", "full")
AUDIO_STRATEGY = "rhythmic"
LAYER_MIN = 5


def validate(path, extra_assets=()):
    global AUDIO_STRATEGY, LAYER_MIN
    out = {"errors": [], "warnings": [], "notes": []}
    e, w = out["errors"], out["warnings"]
    reg, common, stock = load_registry()
    if not reg:
        sys.exit("error: could not read the generator registry from engine.html")
    try:
        P = json.loads(Path(path).read_text(encoding="utf-8"))
    except Exception as ex:
        e.append(f"JSON does not parse: {ex}")
        return out
    AUDIO_STRATEGY, LAYER_MIN = "rhythmic", 5
    strat = (P.get("audio") or {}).get("strategy")
    if strat is not None:
        if strat not in STRATEGIES:
            e.append(f"audio.strategy {strat!r} is not one of {', '.join(STRATEGIES)}")
        else:
            AUDIO_STRATEGY = strat
            if strat == "none" and not str(((P.get("meta") or {}).get("contract") or {}).get("audioStrategyReason", "")).strip():
                w.append("audio.strategy is 'none': say why in meta.contract.audioStrategyReason (a deliberate silent piece is fine, an accidental one is not)")
    lb = ((P.get("meta") or {}).get("contract") or {}).get("layerBudget")
    if isinstance(lb, dict) and isinstance(lb.get("min"), int) and 1 <= lb["min"] <= 10:
        LAYER_MIN = lb["min"]
        w.append(f"meta.contract.layerBudget.min = {lb['min']}: fewer layers than the default 5-6 is a declared choice; the hierarchy still has to read")
    schema = P.get("schema")
    if schema not in SCHEMAS:
        e.append(f"schema must be 'ai-vj-generator/2' (or the older /1), got {schema!r}")
    v2 = schema == "ai-vj-generator/2"
    if v2:
        check_contract(P.get("meta", {}), out)
        check_art_bible(P.get("meta", {}), out)
        check_capabilities(P.get("capabilities"), out)
    cv, tm = P.get("canvas", {}), P.get("time", {})
    if v2:
        check_spec(P.get("meta", {}), cv, tm, out)
    for k in ("w", "h"):
        if not isinstance(cv.get(k), int) or not (16 <= cv[k] <= 16384):
            e.append(f"canvas.{k} must be an integer from 16 to 16384 (the real pixel map)")
    fps = cv.get("fps", 30)
    if fps not in (24, 25, 30, 50, 60):
        e.append(f"canvas.fps {fps} is not 24, 25, 30, 50 or 60")
    bpm, bars = tm.get("bpm", 120), tm.get("bars", 4)
    if not (isinstance(bpm, (int, float)) and 40 <= bpm <= 240):
        e.append(f"time.bpm {bpm} is outside 40..240")
    if bars not in (1, 2, 4, 8, 16, 32):
        e.append(f"time.bars {bars} must be 1, 2, 4, 8, 16 or 32 (whole bars)")
    elif isinstance(bpm, (int, float)):
        frames = round(60 / bpm * 4 * bars * fps)
        out["notes"].append(f"loop = {bars} bars = {60 / bpm * 4 * bars:.3f} s = {frames} frames at {fps} fps")
        if cv.get("w") and cv.get("h"):
            mp = cv["w"] * cv["h"] * frames / 1e6
            if mp * 0.9 > 1800:  # same estimate as the interface: alpha PNG ~0.9 MB per megapixel
                w.append(f"export estimate ~{mp * 0.9 / 1024:.1f} GB in memory; plan a smaller scale or fewer bars")
    pal = P.get("palette", {})
    white = pal.get("mode") == "white-alpha"
    if pal.get("mode") not in (None, "white-alpha"):
        e.append(f"palette.mode {pal.get('mode')!r} must be 'white-alpha' or absent")
    for k in ("bg", "primary", "secondary", "accent") if not white else ():
        if not re.fullmatch(r"#[0-9a-fA-F]{6}", str(pal.get(k, ""))):
            e.append(f"palette.{k} must be #RRGGBB")
    if "field" in pal and not re.fullmatch(r"#[0-9a-fA-F]{6}", str(pal["field"])):
        e.append("palette.field must be #RRGGBB")
    if white:
        out["notes"].append("palette.mode white-alpha: figure 100% / support 72% / field 43%; export with 'Branco alpha (luma)'. Colour it in Resolume.")
    folds = cv.get("folds", [])
    if not isinstance(folds, list) or not all(isinstance(x, (int, float)) and 0 < x < (cv.get("w") or 0) for x in folds):
        e.append("canvas.folds must be a list of x positions in canvas pixels, each between 0 and canvas.w")
    elif folds:
        out["notes"].append(f"{len(folds) + 1} walls, folds at x = {sorted(folds)} px; gutter {cv.get('gutter', 90)} units")
    if "gutter" in cv and not (isinstance(cv["gutter"], (int, float)) and 0 <= cv["gutter"] <= 600):
        e.append("canvas.gutter must be 0..600 (units of the 1080 base height)")
    assets = P.get("assets", {})
    if assets:
        tot = 0
        for nm, a in assets.items():
            if not isinstance(a, dict) or a.get("kind") not in ("image", "font", "model") or not str(a.get("data", "")).startswith("data:"):
                e.append(f"assets.{nm}: needs kind 'image', 'font' or 'model' and a data: URL")
                continue
            tot += len(a["data"])
        if tot > 12 * 1048576:
            w.append(f"assets weigh {tot / 1048576:.1f} MB as base64; the Artifact page limit is 16 MB")
    if not white and tuple(str(pal.get(k, "")).upper() for k in ("bg", "primary", "secondary", "accent")) in stock:
        w.append("palette is identical to a palette that ships with the engine; derive the palette from this briefing instead")
    name = str(P.get("meta", {}).get("name", "")).strip()
    if not name:
        w.append("meta.name is empty")
    if name.lower() in EXAMPLE_NAMES:
        w.append(f"project name '{name}' is an example project's name; every project is derived from its own briefing")
    comps = P.get("compositions")
    if not isinstance(comps, list) or not comps:
        e.append("compositions must be a non-empty list")
        return out
    if len(comps) > 5:
        w.append(f"{len(comps)} compositions; 3-5 distinct ones inside one world usually argue better than many")
    elif len(comps) < 3:
        out["notes"].append(f"{len(comps)} composition(s); a set normally has 3-5 (exactly 5 when the user asked for five)")
    names, sigs = [], []
    for ci, c in enumerate(comps):
        cn = str(c.get("name", "")).strip()
        where = f"composition {ci + 1} '{cn}'"
        if not cn:
            e.append(f"composition {ci + 1} has no name")
        names.append(cn.lower())
        if cn.lower() in GENERIC or re.fullmatch(r"(comp|composition|composição)\s*\d*", cn.lower()):
            w.append(f"{where}: generic name; name it from the briefing's own words")
        if cn.lower() in EXAMPLE_NAMES:
            w.append(f"{where}: name belongs to an example project")
        if not str(c.get("hypothesis", "")).strip():
            w.append(f"{where}: no hypothesis (one sentence of the rule)")
        layers = c.get("layers")
        if not isinstance(layers, list) or not layers:
            e.append(f"{where}: no layers")
            continue
        active = []
        reactive = 0
        for li, L in enumerate(layers):
            t = L.get("type")
            lw = f"{where} / layer {li} '{L.get('name', t)}'"
            if t not in reg:
                e.append(f"{lw}: unknown layer type {t!r}")
                continue
            if L.get("on", True):
                if t == "shader":
                    # custom GLSL (or a different preset) is a different technique, whatever the layer type is
                    pp = L.get("p") or {}
                    active.append(("shader", hash(pp.get("src") or pp.get("preset") or "CAMPO FBM")))
                elif t == "code":
                    active.append(("code", hash((L.get("p") or {}).get("src") or "")))
                else:
                    active.append(t)
            if v2 and L.get("on", True) and t not in ("bg", "post") and not str(L.get("role", "")).strip():
                w.append(f"{lw}: no role; say in one sentence why this layer exists (traces to meta.contract)")
            lp = L.get("p") or {}
            mods = L.get("mod")
            if mods is not None:
                if not isinstance(mods, list):
                    e.append(f"{lw}.mod: expected a list of modulators")
                else:
                    for mi, m in enumerate(mods):
                        mw = f"{lw}.mod[{mi}]"
                        if not isinstance(m, dict) or not m.get("k"):
                            e.append(f"{mw}: needs 'k' (parameter name)")
                            continue
                        if m.get("src") not in MOD_SRC:
                            e.append(f"{mw}.src: {m.get('src')!r} is not one of {sorted(MOD_SRC)}")
                        if m.get("mode", "set") not in ("set", "add", "mul"):
                            e.append(f"{mw}.mode: must be set, add or mul")
                        if m.get("src") == "lfo" and not float(m.get("cycles", 1)).is_integer():
                            e.append(f"{mw}.cycles: must be a whole number or the loop does not close")
                        if m.get("shape", "sin") not in ("sin", "tri", "saw", "bounce", "rubber", "shake", "jello", "tada", "heartbeat", "swing", "wobble", "pulse", "spring"):
                            e.append(f"{mw}.shape: must be sin, tri, saw, bounce, rubber, shake, jello, tada, heartbeat, swing, wobble, pulse or spring")
                        if m.get("shape") == "spring":
                            if m.get("src") != "lfo":
                                e.append(f"{mw}: shape spring needs src lfo")
                            for fk, lo, hi in (("zeta", 0.05, 3), ("wn", 1, 60), ("ta", 0, 0.4), ("depth", 0, 1), ("steps", 0, 128)):
                                fv = m.get(fk)
                                if fv is not None and (not isinstance(fv, (int, float)) or not (lo <= fv <= hi)):
                                    e.append(f"{mw}.{fk}: must be a number in {lo}..{hi}")
                        if m.get("k") not in lp and t != "shader":
                            w.append(f"{mw}.k: {m.get('k')!r} is not set in p; the modulation starts from the default value")
                        if m.get("src") not in MOD_FREE and L.get("on", True) and t != "shader":
                            w.append(f"{mw}: audio-driven modulation counts toward the 3 reactive layers per composition")
            if L.get("on", True) and t != "shader" and isinstance(lp.get("audio"), (int, float)) and lp["audio"] > 0:
                reactive += 1
            op = L.get("opacity", 1)
            if not isinstance(op, (int, float)) or not (0 <= op <= 1):
                e.append(f"{lw}: opacity must be 0..1")
            if L.get("blend", "normal") not in BLENDS:
                e.append(f"{lw}: blend {L.get('blend')!r} is not one of {sorted(BLENDS)}")
            allowed = dict(common)
            allowed.update(reg[t])
            if t == "code":
                check_code(L, lw, out)
            if t == "typeset" and L.get("on", True):
                check_typeset(L, lw, out)
            for k, v in (L.get("p") or {}).items():
                if t == "code" and (k == "src" or k.startswith("v_")):
                    continue
                if ASSET_KEYS.match(k) and v and v not in (P.get("assets") or {}) and v not in extra_assets:
                    w.append(f"{lw}.{k}: '{v}' is not in assets; the user has to import it in the Media tab")
                if t == "shader" and k == "src":
                    if v and v.strip():
                        lint_glsl(v, lw + ".src", out)
                    continue
                check_param(allowed, k, v, lw, out)
            if t == "shader" and AUDIO_STRATEGY != "none":
                sp = L.get("p") or {}
                if L.get("on", True) and isinstance(sp.get("audio"), (int, float)) and sp["audio"] <= 0:
                    e.append(f"{lw}: shader with p.audio = 0. Every shader must be audio-reactive (references/audio-bus.md); remove the key or use 0.35..1")
                src_ = sp.get("src") or ""
                if src_.strip() and not AUDIO_UNIFORMS.search(src_):
                    e.append(f"{lw}.src: the shader never reads uBass, uMid, uHigh, uRms, uHit or uAud. Every shader must react to the audio: give each band a role (references/glsl-recipes.md)")
                elif not src_.strip():
                    pass
            if t == "shader" and not (L.get("p") or {}).get("src") and (L.get("p") or {}).get("preset") is None:
                w.append(f"{lw}: shader with no src and no preset renders the default CAMPO FBM preset")
        # craft rules: layered, named, with a hero (references/craft-and-finish.md)
        body = [x for x in layers if x.get("on", True) and x.get("type") not in ("bg", "post")]
        if v2 and len(body) < LAYER_MIN:
            e.append(f"{where}: only {len(body)} visible layer(s) besides bg/post. A composition needs 6-10 (5 is the minimum): tiers ground, hero, structure, instruments, information, event, finish (references/craft-and-finish.md)")
        elif len(body) < max(6, LAYER_MIN):
            w.append(f"{where}: {len(body)} visible layers besides bg/post; 6-10 is the target so the piece can be played and rebalanced (references/craft-and-finish.md)")
        default_names = [x.get("name") for x in body if str(x.get("name", "")).strip().upper() in DEFAULT_LAYER_NAMES]
        if default_names:
            w.append(f"{where}: layers still named {default_names}; name each layer for its job in this piece")
        if reactive > 3:
            w.append(f"{where}: {reactive} non-shader layers respond to audio; keep 1-3 so the music has a hierarchy (references/audio-bus.md)")
        sigs.append(frozenset(t for t in active if t not in ("bg", "post")))
        if not sigs[-1]:
            w.append(f"{where}: no visible layer other than bg/post")
    if len(set(names)) != len(names):
        w.append("two compositions share a name")
    for i in range(len(sigs)):
        for j in range(i + 1, len(sigs)):
            if sigs[i] and sigs[i] == sigs[j]:
                names_ = sorted(str(x[0] if isinstance(x, tuple) else x) for x in sigs[i])
                w.append(f"compositions {i + 1} and {j + 1} use the same layers {names_} with the same shader code; "
                         "if their parameters are the only difference, they are not conceptually distinct (check the technique)")
    return out


if __name__ == "__main__":
    try:
        sys.stdout.reconfigure(encoding="utf-8")  # accented names on Windows consoles
    except Exception:
        pass
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    names = ()
    if "--assets" in sys.argv:
        d = Path(sys.argv[sys.argv.index("--assets") + 1])
        names = {q.name for q in d.rglob("*") if q.is_file()}
    r = validate(sys.argv[1], names)
    for n in r["notes"]:
        print("NOTE     ", n)
    for m in r["errors"]:
        print("ERROR    ", m)
    for m in r["warnings"]:
        print("WARNING  ", m)
    if not r["errors"] and not r["warnings"]:
        print("OK       no problems found (GLSL still has to compile in the interface)")
    sys.exit(1 if r["errors"] else 0)
