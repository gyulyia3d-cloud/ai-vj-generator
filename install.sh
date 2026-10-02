#!/usr/bin/env sh
# AI VJ Generator — instala a skill em ~/.claude/skills (ou em $CLAUDE_SKILLS_DIR)
set -e
HERE="$(cd "$(dirname "$0")" && pwd)"
SRC="$HERE/skill/ai-vj-generator"
DEST="${CLAUDE_SKILLS_DIR:-$HOME/.claude/skills}/ai-vj-generator"

if [ ! -f "$SRC/SKILL.md" ]; then
  echo "Erro: rode este script de dentro da pasta ai-vj-generator." >&2
  exit 1
fi
if command -v node >/dev/null 2>&1; then
  node "$HERE/scripts/sync-skill.mjs" >/dev/null
fi
mkdir -p "$DEST"
cp -R "$SRC/." "$DEST/"
echo "Skill instalada em $DEST"
echo "Reinicie o Claude Code e peça: \"quero visuais para meu set\"."
echo "Gerador sem Claude: abra $HERE/app/index.html"
