#!/usr/bin/env python3
"""Embed a PROJECT JSON into the AI VJ Generator engine.

usage: python make_artifact.py project.json [--out file.html] [--artifact]
"""
import json
import re
import sys
from pathlib import Path

MARK = "/*__PROJECT_JSON__*/"
HERE = Path(__file__).resolve().parent
ENGINE = HERE.parent / "assets" / "engine.html"


def main(argv):
    args = [a for a in argv if not a.startswith("--")]
    out = None
    if "--out" in argv:
        out = argv[argv.index("--out") + 1]
        args = [a for a in args if a != out]
    if not args:
        sys.exit(__doc__)
    project = json.loads(Path(args[0]).read_text(encoding="utf-8"))
    comps = project.get("compositions")
    if not isinstance(comps, list) or not comps:
        sys.exit("error: project has no compositions")
    for c in comps:
        if not isinstance(c.get("layers"), list):
            sys.exit(f"error: composition {c.get('name')!r} has no layers")

    html = ENGINE.read_text(encoding="utf-8")
    if MARK not in html:
        sys.exit("error: marker not found in engine.html")
    payload = json.dumps(project, ensure_ascii=False, separators=(",", ":"))
    payload = re.sub(r"</(script)", r"<\\/\1", payload, flags=re.I)
    html = html.replace(MARK, payload, 1)

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
