#!/usr/bin/env python3
"""Monta skill/ai-vj-generator/isf-library/ (shaders ISF + manifest.json) a partir de repositórios clonados.

Uso: python scripts/curate_isf.py <pasta-com-clones> [--originals <pasta>]
Regras (as mesmas do docs/ISF-LIBRARY.md):
  - só repositórios com licença MIT declarada (Vidvox/ISF-Files, ProjectileObjects/MiscISFShaders, ...);
  - só geradores de um passe que o importador aceita (isf.py check);
  - fora: texto com 'noncommercial', Creative Commons, Shadertoy, GLSL Sandbox ou sem autor identificável;
  - o CREDIT do cabeçalho e a origem ficam no manifesto e na camada importada.
O resultado é versionado; este script existe para a proveniência ser reproduzível, não para rodar sempre.
"""
import hashlib, json, os, re, shutil, sys
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, "..", "skill", "ai-vj-generator", "scripts"))
import isf  # noqa: E402

LIB = os.path.join(HERE, "..", "skill", "ai-vj-generator", "isf-library")
REPOS = {  # pasta clonada -> (url, licença)
    "Vidvox_ISF-Files": ("https://github.com/Vidvox/ISF-Files", "MIT"),
    "ProjectileObjects_MiscISFShaders": ("https://github.com/ProjectileObjects/MiscISFShaders", "MIT"),
    "Gnomalab_VDMX-ISF-Effects-Suite": ("https://github.com/Gnomalab/VDMX-ISF-Effects-Suite", "MIT"),
    "daitomanabe_isf-shaders-for-vj": ("https://github.com/daitomanabe/isf-shaders-for-vj", "MIT"),
    "mobile-bungalow_tweak_shader": ("https://github.com/mobile-bungalow/tweak_shader", "MIT"),
    "icalvin102_ISF": ("https://github.com/icalvin102/ISF", "MIT"),
    "Fauli_shaders": ("https://github.com/Fauli/shaders", "MIT"),
}
BAD = re.compile(r"(?i)non-?commercial|creative commons|cc[ -]by|shadertoy|glslsandbox|glsl sandbox|all rights reserved|gpl")
DROP = {"Color Test Grid", "Solid Color", "Random Characters", "VDMX MTC Display", "VDMX Time Display",
        "Brick Pattern", "PerlinNoiseShader", "Zebra_Lines_ProjectileObjects",   # licença do autor original incerta
        "Bordered Box", "Color Bars", "Color Organ Polyphonic", "LaserCircle v2", "LaserCircle v3", "LaserShader_02", "Line Group"}  # não compilam em WebGL1 (GLSL ES 3)  # utilitários sem interesse visual ou que dependem de fonte
CREDIT_FIX = {"Poly Star": "VIDVOX"}  # arquivo sem CREDIT no repositório MIT da Vidvox; autoria da coleção


def slug(s):
    return re.sub(r"[^a-z0-9]+", "-", s.lower()).strip("-")


def main():
    root = sys.argv[1]
    orig = sys.argv[sys.argv.index("--originals") + 1] if "--originals" in sys.argv else None
    glslop = sys.argv[sys.argv.index("--glslop") + 1] if "--glslop" in sys.argv else None
    top = int(sys.argv[sys.argv.index("--top") + 1]) if "--top" in sys.argv else 45
    exfile = os.path.join(LIB, "exclude.txt")
    exclude = set(open(exfile, encoding="utf-8").read().split()) if os.path.exists(exfile) else set()
    if os.path.isdir(os.path.join(LIB, "third-party")):
        shutil.rmtree(os.path.join(LIB, "third-party"))
    os.makedirs(os.path.join(LIB, "third-party"), exist_ok=True)
    items, seen = [], set()
    for repo, (url, lic) in REPOS.items():
        base = os.path.join(root, repo)
        for dp, _, files in os.walk(base):
            for f in sorted(files):
                if not f.endswith(".fs"):
                    continue
                p = os.path.join(dp, f)
                text = isf.read(p)
                try:
                    h, body = isf.parse_isf(text)
                except Exception:
                    continue
                name = os.path.splitext(f)[0]
                if isf.blockers(h, body) or BAD.search(text) or name in DROP or name.lower() in exclude:
                    continue
                key = hashlib.md5(re.sub(r"\s+", "", text).encode()).hexdigest()
                if key in seen:
                    continue
                seen.add(key)
                credit = re.sub(r"^by\s+", "", (h.get("CREDIT") or "").strip(), flags=re.I) or CREDIT_FIX.get(name, "")
                if not credit:
                    continue
                s = slug(name)
                if any(i["id"] == s for i in items):
                    s = s + "-" + repo.split("_")[0].lower()
                with open(os.path.join(LIB, "third-party", s + ".fs"), "w", encoding="utf-8", newline=chr(10)) as out:
                    out.write(text.replace(chr(13)+chr(10), chr(10)))
                rel = os.path.relpath(p, base).replace("\\", "/")
                items.append({"id": s, "name": name, "file": "third-party/" + s + ".fs", "origin": "third-party", "credit": credit,
                              "license": lic, "source": url + " (" + rel + ")", "description": (h.get("DESCRIPTION") or "")[:160],
                              "categories": h.get("CATEGORIES") or []})
    if glslop:
        meta = json.load(open(os.path.join(glslop, "meta.json"), encoding="utf-8"))
        cand = []
        for gid, m in meta.items():
            p = os.path.join(glslop, gid + ".fs")
            if gid in exclude or not os.path.exists(p) or m.get("license") != "CC0-1.0" or m.get("compile_ok") is False:
                continue
            text = isf.read(p)
            if len(text) > 14000:
                continue
            try:
                h, body = isf.parse_isf(text)
            except Exception:
                continue
            if isf.blockers(h, body):
                continue
            st = m.get("stats") or {}
            cand.append((st.get("slops", 0) * 3 + st.get("views", 0), gid, m, h, text))
        cand.sort(key=lambda c: (-c[0], c[1]))
        for _, gid, m, h, text in cand[:top]:
            s = "glslop-" + gid
            with open(os.path.join(LIB, "third-party", s + ".fs"), "w", encoding="utf-8", newline=chr(10)) as out:
                out.write(text.replace(chr(13)+chr(10), chr(10)))
            items.append({"id": s, "name": m.get("title") or gid, "file": "third-party/" + s + ".fs", "origin": "third-party",
                          "credit": (m.get("author") or "anon") + " (glslop.com)", "license": "CC0-1.0", "source": "https://glslop.com/api/v1/shaders/" + gid,
                          "description": ((h.get("DESCRIPTION") or "") or ", ".join(m.get("tags") or []))[:160], "categories": h.get("CATEGORIES") or []})
    if orig:
        for f in sorted(os.listdir(orig)):
            if not f.endswith(".fs"):
                continue
            h, _ = isf.parse_isf(isf.read(os.path.join(orig, f)))
            s = os.path.splitext(f)[0]
            items.append({"id": "aivj-" + s, "name": "AIVJ " + s.replace("-", " ").title(), "file": "original/" + f, "origin": "original",
                          "credit": "ai-vj-generator (original)", "license": "MIT", "source": "este repositório", "description": h.get("DESCRIPTION", "")[:160],
                          "categories": h.get("CATEGORIES") or []})
    items.sort(key=lambda i: (i["origin"] != "original", i["name"].lower()))
    with open(os.path.join(LIB, "manifest.json"), "w", encoding="utf-8", newline="\n") as f:
        json.dump({"version": 1, "count": len(items), "items": items}, f, ensure_ascii=False, indent=1)
    print(len(items), "shaders (", sum(1 for i in items if i["origin"] == "original"), "originais )")


if __name__ == "__main__":
    main()
