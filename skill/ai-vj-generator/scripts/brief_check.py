#!/usr/bin/env python3
"""Check a structured brief and say what to ask next. Works for a person, a web form or any AI.

  python brief_check.py brief.json [--json]

1. Structure: validated against schema/brief.schema.json (no pip packages needed).
2. Completeness: a 0-100 score from the fields that change the result most, and up to 4 questions to ask next,
   highest value first (worded in the brief's language: lang "pt" or "en").
Exit code 0 = usable as it is, 1 = structure errors, 2 = cannot read the file.
The questions are short on purpose: the full interview protocol is references/briefing/diagnosis.md.
"""
import json, os, sys

sys.stdout.reconfigure(encoding="utf-8")
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import schema_check  # noqa: E402

# (weight, key path, EN question, PT question). Only asked when the field is missing.
FIELDS = [
    (14, "surface.type", "What is the surface: LED wall, projection, mapped object, or a plain screen?", "Qual é a superfície: parede de LED, projeção, objeto mapeado ou tela comum?"),
    (14, "surface.viewingDistanceM", "From what nearest and farthest distance is it seen (in metres)?", "De que distância mínima e máxima a tela é vista (em metros)?"),
    (12, "mood", "Pick 1-3 mood words (industrial, organic, cosmic, urban, ritual, glitch, minimal, liquid, crystalline, retro, aggressive, calm).", "Escolha 1 a 3 palavras de clima (industrial, organic, cosmic, urban, ritual, glitch, minimal, liquid, crystalline, retro, aggressive, calm)."),
    (10, "focalEvent", "What is the ONE thing the eye must land on in each piece?", "Qual é a ÚNICA coisa em que o olho precisa pousar em cada peça?"),
    (10, "audio.strategy", "How much does the music drive the picture: none, subtle, structural, rhythmic or full?", "O quanto a música comanda a imagem: none, subtle, structural, rhythmic ou full?"),
    (8, "palette", "Is there a colour already (a brand, a hue) or should the concept choose it?", "Já existe uma cor (marca, matiz) ou o conceito deve escolher?"),
    (8, "banned", "Name 3 effects that must NOT appear (so the piece avoids the default look).", "Cite 3 efeitos que NÃO podem aparecer (para a peça fugir do visual padrão)."),
    (6, "energy", "Energy from 0 (calm) to 1 (relentless)?", "Energia de 0 (calma) a 1 (implacável)?"),
    (6, "surface.fps", "Output frame rate (24, 25, 30, 50 or 60)?", "Taxa de quadros da saída (24, 25, 30, 50 ou 60)?"),
    (6, "output.mode", "Deliver coloured (rgb), with alpha, or white-on-alpha to colour in the media server?", "Entregar colorido (rgb), com alpha, ou branco sobre alpha para colorir no media server?"),
    (4, "text.words", "Any exact words, names or logos on screen? (they must be supplied)", "Há palavras, nomes ou logos exatos na tela? (precisam ser fornecidos)"),
    (2, "density", "Sparse, balanced or dense?", "Rarefeito, equilibrado ou denso?"),
]


def get(d, path):
    for k in path.split("."):
        if not isinstance(d, dict) or k not in d:
            return None
        d = d[k]
    return d


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    if len(args) != 1:
        print(__doc__)
        sys.exit(2)
    try:
        brief = json.load(open(args[0], encoding="utf-8"))
        schema = json.load(open(os.path.join(HERE, "..", "schema", "brief.schema.json"), encoding="utf-8"))
    except (OSError, json.JSONDecodeError) as ex:
        print(f"cannot read: {ex}")
        sys.exit(2)
    errs = schema_check.validate(schema, brief)
    pt = brief.get("lang") == "pt" if isinstance(brief, dict) else False
    total = sum(f[0] for f in FIELDS)
    got = sum(f[0] for f in FIELDS if isinstance(brief, dict) and get(brief, f[1]) not in (None, "", [], {}))
    base = 40
    score = round(base + (100 - base) * got / total) if not errs else 0
    missing = sorted([f for f in FIELDS if not (isinstance(brief, dict) and get(brief, f[1]) not in (None, "", [], {}))], key=lambda f: -f[0])[:4]
    ask = [(f[3] if pt else f[2]) for f in missing]
    if "--json" in sys.argv:
        print(json.dumps({"valid": not errs, "errors": errs, "score": score, "ask": ask}, ensure_ascii=False, indent=2))
    else:
        for e in errs:
            print("ERROR", e)
        print(f"structure: {'valid' if not errs else str(len(errs)) + ' problem(s)'}  ·  completeness: {score}/100")
        if ask:
            print("ask next:" if not pt else "pergunte agora:")
            for i, q in enumerate(ask, 1):
                print(f"  {i}. {q}")
        else:
            print("nothing important is missing" if not pt else "nada importante falta")
    sys.exit(1 if errs else 0)


if __name__ == "__main__":
    main()
