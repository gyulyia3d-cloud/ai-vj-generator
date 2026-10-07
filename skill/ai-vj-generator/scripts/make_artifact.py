#!/usr/bin/env python3
"""Embed a PROJECT JSON into the AI VJ Generator engine.

usage: python make_artifact.py project.json [--out file.html] [--artifact] [--assets pasta]

--assets pasta embute imagens e fontes da pasta em project.assets (pasta/logos/* vira máscara
branca com alpha ao abrir). Mesma regra do assets.mjs.
"""
import base64
import json
import re
import sys
from pathlib import Path

MARK = "/*__PROJECT_JSON__*/"
HERE = Path(__file__).resolve().parent
ENGINE = HERE.parent / "assets" / "engine.html"


IMG = {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp", ".gif": "image/gif", ".svg": "image/svg+xml"}
FNT = {".ttf": "font/ttf", ".otf": "font/otf", ".woff": "font/woff", ".woff2": "font/woff2"}


def collect_assets(folder):
    assets, total = {}, 0
    for p in sorted(Path(folder).rglob("*")):
        if not p.is_file():
            continue
        ext = p.suffix.lower()
        kind = "image" if ext in IMG else "font" if ext in FNT else None
        if not kind:
            print(f"aviso: ignorado (formato não suportado): {p.name}")
            continue
        raw = p.read_bytes()
        total += len(raw)
        key = p.name if kind == "image" else re.sub(r"[^w -]", "", p.stem)
        rel = p.relative_to(folder).as_posix()
        assets[key] = {"kind": kind, "data": f"data:{IMG.get(ext) or FNT[ext]};base64," + base64.b64encode(raw).decode()}
        if kind == "image" and (re.search(r"(^|/)logos?(/|$)", rel, re.I) or p.name.lower().startswith("logo")):
            assets[key]["logo"] = True
        if kind == "image" and len(raw) > 3 * 1048576:
            print(f"aviso: imagem pesada ({len(raw) / 1048576:.1f} MB): {rel}")
    if total > 12 * 1048576:
        print(f"aviso: arquivos somam {total / 1048576:.1f} MB; o Artifact aceita 16 MB por página (base64 pesa +33%).")
    print(f"assets: {len(assets)} arquivo(s), {total / 1048576:.1f} MB")
    return assets


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    out = None
    assets_dir = None
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
        args = [a for a in args if a != out]
    if "--assets" in argv:
        assets_dir = argv[argv.index("--assets") + 1]
        args = [a for a in args if a != assets_dir]
    if not args:
        sys.exit(__doc__)
    project = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    comps = project.get("compositions")
    if not isinstance(comps, list) or not comps:
        sys.exit("error: project has no compositions")
    for c in comps:
        if not isinstance(c.get("layers"), list):
            sys.exit(f"error: composition {c.get('name')!r} has no layers")

    if assets_dir:
        project["assets"] = {**project.get("assets", {}), **collect_assets(assets_dir)}
    html = ENGINE.read_text(encoding="utf-8")
    if MARK not in html:
        sys.exit("error: marker not found in engine.html")
    payload = json.dumps(project, ensure_ascii=False, separators=(",", ":"))
    payload = re.sub(r"</(script)", r"<\\/\1", payload, flags=re.I)
    html = html.replace(MARK, payload, 1)
    name = str(project.get("meta", {}).get("name") or "").strip()
    if name:
        title = name.title() if name.isupper() else name
        title = title.replace("&", "&amp;").replace("<", "&lt;")
        html = html.replace("<title>AI VJ Generator</title>", f"<title>{title}</title>", 1)

    if "--artifact" in argv:
        head = re.search(r"<head>([\s\S]*?)</head>", html, re.I).group(1)
        head = re.sub(r"<meta[^>]*>\s*", "", head, flags=re.I)
        body = re.search(r"<body>([\s\S]*?)</body>", html, re.I).group(1)
        html = head.strip() + "\n" + body.strip() + "\n"

    dest = Path(out or Path(args[0]).with_suffix(".html"))
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_text(html, encoding="utf-8")
    print(f"ok -> {dest} ({len(html) // 1024} KB)")


if __name__ == "__main__":
    main(sys.argv[1:])
