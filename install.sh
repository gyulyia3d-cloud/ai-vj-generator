#!/usr/bin/env sh
# AI VJ Generator - instala as skills (ai-vj-generator, vj, vj-reference, vj-critique)
# em ~/.claude/skills (ou em $CLAUDE_SKILLS_DIR). Os comandos /vj, /vj-reference e
# /vj-critique apontam para a skill principal na pasta ao lado, entao instale todas juntas.
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/skill"
BASE="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}"

if [ ! -f "$SRC/ai-vj-generator/SKILL.md" ]; then
  echo "Erro: rode este script de dentro da pasta ai-vj-generator." >&2
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  node "$HERE/scripts/sync-skill.mjs" >/dev/null
fi
mkdir -p "$BASE"
for d in "$SRC"/*/; do
  name="$(basename "$d")"
  rm -rf "$BASE/$name"
  mkdir -p "$BASE/$name"
  cp -R "$d." "$BASE/$name/"
  echo "  instalada: $name"
done
echo "Skills em $BASE"
echo "Reinicie o Claude Code e digite: /vj <seu briefing>"
echo "Analise de imagem e video (opcional): pip install pillow numpy  (video tambem precisa de ffmpeg)"
echo "Gerador sem Claude: abra $HERE/app/index.html"
