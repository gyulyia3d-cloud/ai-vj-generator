#!/bin/bash
# usage: mk.sh  -> rebuild json, html, contact sheet
cd /c/Users/gyuly/Claude/Projects/ai-vj-generator/fachada-bioma
S=~/.claude/skills/ai-vj-generator
(cd build && python build.py) || exit 1
python -X utf8 $S/scripts/make_artifact.py diario.aivj.json --out diario.html --assets assets | tail -1
rm -rf contato; node $S/scripts/contact_sheet.mjs diario.html contato 2>&1 | grep -E "ERROR|WARNING|OPTIM|PNG|\[" | head -40
